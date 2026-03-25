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
        authTimeout: 15000,
        tlsOptions: { rejectUnauthorized: false },
      },
    }

    connection = await imapSimple.connect(config)
    await connection.openBox("INBOX")

    const fetchOptions = {
      bodies: ["HEADER", ""],
      markSeen: false,
      struct: true,
    }

    const allMessages = await connection.search(["ALL"], fetchOptions)
    const recentBatch = allMessages.slice(-30).reverse()

    const targetLower = targetAddress.toLowerCase()

    for (let i = 0; i < recentBatch.length; i++) {
      const message = recentBatch[i]
      try {
        const allBody = message.parts.find((part: { which: string }) => part.which === "")
        const headerPart = message.parts.find((part: { which: string }) => part.which === "HEADER")
        const rawEmail = allBody?.body || ""

        // Check all possible headers for the target address
        const toHeader = (headerPart?.body?.to || []).join(" ").toLowerCase()
        const xOrigTo = (headerPart?.body?.["x-original-to"] || []).join(" ").toLowerCase()
        const deliveredTo = (headerPart?.body?.["delivered-to"] || []).join(" ").toLowerCase()
        const ccHeader = (headerPart?.body?.cc || []).join(" ").toLowerCase()
        const xForwardedTo = (headerPart?.body?.["x-forwarded-to"] || []).join(" ").toLowerCase()
        const rawLower = typeof rawEmail === "string" ? rawEmail.substring(0, 3000).toLowerCase() : ""

        const matchesTarget =
          toHeader.includes(targetLower) ||
          xOrigTo.includes(targetLower) ||
          deliveredTo.includes(targetLower) ||
          ccHeader.includes(targetLower) ||
          xForwardedTo.includes(targetLower) ||
          rawLower.includes(targetLower)

        if (!matchesTarget) continue

        const parsed = await simpleParser(rawEmail)
        const fromAddress = parsed.from?.value?.[0]
        matchedEmails.push({
          id: parsed.messageId || `msg-${account.name}-${i}`,
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
          uid: message.attributes.uid,
          parsedDate: parsed.date || null,
        })
      } catch {
        // Skip unparseable messages
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

  const imapHost = process.env.IMAP_HOST || "imap.titan.email"
  const imapPort = parseInt(process.env.IMAP_PORT || "993", 10)

  // Define the two accounts to fetch from
  const accounts: ImapAccount[] = []

  // Account 1: ademinsukocursor@sukodocursor.shop
  const cursorUser = process.env.IMAP_USER_CURSOR || "ademinsukocursor@sukodocursor.shop"
  const cursorPass = process.env.IMAP_PASS_CURSOR || ""
  if (cursorPass) {
    accounts.push({ name: "cursor", user: cursorUser, pass: cursorPass })
  }

  // Account 2: sukoademirultra@sukoultra.shop (may be blocked, but try anyway)
  const ultraUser = process.env.IMAP_USER_ULTRA || "sukoademirultra@sukoultra.shop"
  const ultraPass = process.env.IMAP_PASS_ULTRA || ""
  if (ultraPass) {
    accounts.push({ name: "ultra", user: ultraUser, pass: ultraPass })
  }

  if (accounts.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma credencial IMAP configurada. Verifique IMAP_PASS_CURSOR e IMAP_PASS_ULTRA." },
      { status: 500 }
    )
  }

  try {
    // Fetch from both accounts simultaneously
    const results = await Promise.allSettled(
      accounts.map((account) =>
        fetchEmailsFromAccount(account, fullAddress, imapHost, imapPort)
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

    // Take top 15 and remove internal fields
    const emails = uniqueEmails.slice(0, 15).map(({ uid, parsedDate, ...email }) => email)

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
