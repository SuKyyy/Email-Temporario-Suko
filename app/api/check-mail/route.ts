import { NextRequest, NextResponse } from "next/server"
import imapSimple from "imap-simple"
import { simpleParser } from "mailparser"

function formatRelativeTime(date: Date): string {
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return "Agora mesmo"
  if (diffMin < 60) return `${diffMin} min atras`

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours} hora${diffHours > 1 ? "s" : ""} atras`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} dia${diffDays > 1 ? "s" : ""} atras`
}

// IMAP account configuration
interface ImapAccount {
  name: string // "cursor" or "ultra"
  user: string
  pass: string
}

type ParsedEmail = {
  id: string
  from: string
  subject: string
  date: string
  body: string
  attachments: Array<{ filename: string; contentType: string; size: number; content: string }>
  account: string
  uid: number
  parsedDate: Date | null
}

// Open INBOX via the raw connection so we can read the total message count,
// which lets us fetch by sequence number instead of doing a slow full-mailbox
// SINCE search (critical when the mailbox has many messages).
function openInbox(connection: Awaited<ReturnType<typeof imapSimple.connect>>): Promise<{ total: number }> {
  return new Promise((resolve, reject) => {
    connection.imap.openBox("INBOX", true, (err: Error | null, box: { messages?: { total?: number } }) => {
      if (err) return reject(err)
      resolve({ total: box?.messages?.total ?? 0 })
    })
  })
}

// Fetch only the HEADER for a sequence range (e.g. "980:1000"). This never scans
// the whole mailbox; it grabs just the most recent N messages.
function fetchHeadersBySeq(
  connection: Awaited<ReturnType<typeof imapSimple.connect>>,
  range: string
): Promise<Array<{ uid: number; headerText: string }>> {
  return new Promise((resolve, reject) => {
    const results: Array<{ uid: number; headerText: string }> = []
    const fetch = connection.imap.seq.fetch(range, { bodies: "HEADER", struct: false })

    fetch.on("message", (msg: NodeJS.EventEmitter) => {
      let uid = 0
      let headerText = ""
      msg.on("body", (stream: NodeJS.ReadableStream) => {
        let buf = ""
        stream.on("data", (chunk: Buffer) => (buf += chunk.toString("utf8")))
        stream.on("end", () => (headerText = buf))
      })
      msg.once("attributes", (attrs: { uid: number }) => (uid = attrs.uid))
      msg.once("end", () => results.push({ uid, headerText }))
    })
    fetch.once("error", reject)
    fetch.once("end", () => resolve(results))
  })
}

async function fetchEmailsFromAccount(
  account: ImapAccount,
  targetAddress: string,
  imapHost: string,
  imapPort: number
): Promise<ParsedEmail[]> {
  const matchedEmails: ParsedEmail[] = []
  let connection: Awaited<ReturnType<typeof imapSimple.connect>> | null = null

  try {
    const config = {
      imap: {
        user: account.user,
        password: account.pass,
        host: imapHost,
        port: imapPort,
        tls: true,
        authTimeout: 10000,
        connTimeout: 10000,
        keepalive: false,
        tlsOptions: {
          // SNI servername is required by Forward Email's TLS endpoint,
          // otherwise the handshake is reset (ECONNRESET).
          servername: imapHost,
          rejectUnauthorized: false,
          minVersion: "TLSv1.2",
        },
      },
    }

    connection = await imapSimple.connect(config)

    // Prevent unhandled 'error' events from crashing the server as uncaughtException
    connection.imap.on("error", (err: unknown) => {
      console.error(`[IMAP] Connection error on ${account.name}:`, err)
    })

    // Open INBOX and read total message count (no full-mailbox scan).
    const { total } = await openInbox(connection)

    const targetLower = targetAddress.toLowerCase()
    const matchingUids: number[] = []

    if (total > 0) {
      // Only look at the most recent 40 messages by sequence number.
      const start = Math.max(1, total - 39)
      const range = `${start}:${total}`

      // First pass: fetch just the headers for that range and match by recipient.
      const headerResults = await fetchHeadersBySeq(connection, range)

      // Newest first
      headerResults.reverse()

      for (const { uid, headerText } of headerResults) {
        if (matchingUids.length >= 10) break // Stop early once we have enough
        if (headerText.toLowerCase().includes(targetLower)) {
          matchingUids.push(uid)
        }
      }
    }

    // Second pass: fetch full bodies for ALL matching emails in a SINGLE batch
    // search (one round-trip) instead of one search per UID.
    if (matchingUids.length > 0) {
      const fullFetchOptions = {
        bodies: [""],
        markSeen: false,
      }

      try {
        const fullMessages = await connection.search(
          [["UID", matchingUids.join(",")]],
          fullFetchOptions
        )

        for (const message of fullMessages) {
          try {
            const uid = message.attributes.uid
            const allBody = message.parts.find((part: { which: string }) => part.which === "")
            const rawEmail = allBody?.body || ""

            const parsed = await simpleParser(rawEmail)
            const fromAddress = parsed.from?.value?.[0]

            matchedEmails.push({
              id: parsed.messageId || `msg-${account.name}-${uid}`,
              from: fromAddress?.name || fromAddress?.address || "Remetente desconhecido",
              subject: parsed.subject || "(Sem assunto)",
              date: parsed.date ? formatRelativeTime(parsed.date) : "Desconhecido",
              body: parsed.html || parsed.textAsHtml || `<p>${parsed.text || "Sem conteudo"}</p>`,
              attachments: (parsed.attachments || []).map((att) => ({
                filename: att.filename || "attachment",
                contentType: att.contentType || "application/octet-stream",
                size: att.size || 0,
                content: att.content.toString("base64"),
              })),
              account: account.name,
              uid: uid,
              parsedDate: parsed.date || null,
            })
          } catch {
            // Skip unparseable messages
          }
        }
      } catch {
        // If the batch fetch fails, return whatever we have
      }
    }

    connection.end()
  } catch (err) {
    console.error(`[IMAP] Error fetching from ${account.name}:`, err)
    // Don't throw - allow other account to still return results
  } finally {
    if (connection) {
      try {
        connection.end()
      } catch {
        // Ignore close errors
      }
    }
  }

  return matchedEmails
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const user = searchParams.get("user")
  const rawDomain = searchParams.get("domain")

  if (!user || !rawDomain) {
    return NextResponse.json(
      { error: "Parametros 'user' e 'domain' sao obrigatorios" },
      { status: 400 }
    )
  }

  // Normalize domain: ensure it starts with "@"
  const normalizedDomain = rawDomain.startsWith("@") ? rawDomain : `@${rawDomain}`
  const fullAddress = `${user}${normalizedDomain}`

  // HARDCODED Forward Email IMAP settings - do NOT use env vars
  const imapHost = "imap.forwardemail.net"
  const imapPort = 993
  const imapUser = "abusadordoamin@thesuaky.shop"
  const imapPass = process.env.IMAP_PASS || ""

  // Define the account to fetch from
  const accounts: ImapAccount[] = []
  if (imapPass) {
    accounts.push({ name: "main", user: imapUser, pass: imapPass })
  }

  if (accounts.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma credencial IMAP configurada. Verifique IMAP_PASS." },
      { status: 500 }
    )
  }

  // Hard timeout so a slow/hung IMAP server never makes the inbox spin forever.
  const withTimeout = (promise: Promise<ParsedEmail[]>, ms: number): Promise<ParsedEmail[]> =>
    Promise.race([
      promise,
      new Promise<ParsedEmail[]>((resolve) => setTimeout(() => resolve([]), ms)),
    ])

  try {
    // Fetch from all accounts simultaneously, each capped at 20s
    const results = await Promise.allSettled(
      accounts.map((account) =>
        withTimeout(fetchEmailsFromAccount(account, fullAddress, imapHost, imapPort), 20000)
      )
    )

    // Combine emails from all successful fetches
    const allEmails: ParsedEmail[] = []
    for (const result of results) {
      if (result.status === "fulfilled") {
        allEmails.push(...result.value)
      }
    }

    // Sort by date (newest first) and deduplicate by id
    allEmails.sort((a, b) => {
      if (a.parsedDate && b.parsedDate) {
        return b.parsedDate.getTime() - a.parsedDate.getTime()
      }
      return 0
    })

    // Deduplicate by message ID
    const seen = new Set<string>()
    const uniqueEmails = allEmails.filter((email) => {
      if (seen.has(email.id)) return false
      seen.add(email.id)
      return true
    })

    // Take top 10 and remove internal fields
    const emails = uniqueEmails.slice(0, 10).map(({ uid, parsedDate, ...email }) => email)

    return NextResponse.json(
      { emails, user, domain: normalizedDomain },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    )
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `Erro ao buscar emails: ${errorMessage}` },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    )
  }
}
