import { NextRequest, NextResponse } from "next/server"
import imapSimple from "imap-simple"
import { simpleParser } from "mailparser"

const ROOT_DOMAINS = [
  "sukospot.shop",
  "sukodocursor.shop",
  "sukoultra.shop",
  "sukov0dev.shop",
] as const

function isSupportedDomain(domain: string): boolean {
  const bare = domain.startsWith("@") ? domain.slice(1) : domain
  return ROOT_DOMAINS.some(
    (root) => bare === root || bare.endsWith(`.${root}`)
  )
}

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

  if (!isSupportedDomain(normalizedDomain)) {
    return NextResponse.json(
      { error: `Dominio nao suportado: ${normalizedDomain}. Use subdominios de: ${ROOT_DOMAINS.map((d) => `@${d}`).join(", ")}` },
      { status: 400 }
    )
  }

  // Determine which IMAP account to connect to based on domain:
  // - sukospot.shop subdomains: Cloudflare Email Routing -> central inbox (IMAP_CENTRAL_USER)
  // - Other domains (sukodocursor, sukoultra, sukov0dev): Direct Titan accounts with own credentials
  const bareDomain = normalizedDomain.startsWith("@") ? normalizedDomain.slice(1) : normalizedDomain

  // Subdomains of sukospot.shop use Cloudflare Email Routing -> sukoademirultra@sukoultra.shop
  // Direct root domains each have their own Titan catch-all inbox
  const isSubdomainOfSukospot = bareDomain.endsWith(".sukospot.shop")

  let imapUser: string
  let imapPass: string
  let useLocalFilter: boolean

  if (isSubdomainOfSukospot) {
    // Cloudflare forwards *@*.sukospot.shop -> sukoademirultra@sukoultra.shop
    imapUser = process.env.IMAP_USER_ULTRA || ""
    imapPass = process.env.IMAP_PASS_ULTRA || ""
    useLocalFilter = true
  } else if (bareDomain === "sukospot.shop") {
    // Direct root sukospot.shop -> ademinsukospot@sukospot.shop
    imapUser = process.env.IMAP_USER_SUKOSPOT || ""
    imapPass = process.env.IMAP_PASS_SUKOSPOT || ""
    useLocalFilter = false
  } else if (bareDomain === "sukodocursor.shop") {
    imapUser = process.env.IMAP_USER_CURSOR || ""
    imapPass = process.env.IMAP_PASS_CURSOR || ""
    useLocalFilter = false
  } else if (bareDomain === "sukoultra.shop") {
    imapUser = process.env.IMAP_USER_ULTRA || ""
    imapPass = process.env.IMAP_PASS_ULTRA || ""
    useLocalFilter = false
  } else if (bareDomain === "sukov0dev.shop") {
    imapUser = process.env.IMAP_USER_V0 || ""
    imapPass = process.env.IMAP_PASS_V0 || ""
    useLocalFilter = false
  } else {
    return NextResponse.json({ error: "Dominio sem credenciais configuradas." }, { status: 400 })
  }

  const imapHost = process.env.IMAP_HOST || "imap.titan.email"
  const imapPort = parseInt(process.env.IMAP_PORT || "993", 10)

  console.log("[v0] Domain:", bareDomain, "| Subdomain forwarded:", isSubdomainOfSukospot, "| Connecting to:", imapUser || "(EMPTY)")

  if (!imapUser || !imapPass) {
    return NextResponse.json(
      { error: `Credenciais IMAP nao configuradas para ${bareDomain}. Verifique as variaveis de ambiente.` },
      { status: 500 }
    )
  }

  const fullAddress = `${user}${normalizedDomain}`

  let connection: Awaited<ReturnType<typeof imapSimple.connect>> | null = null

  try {
    const config = {
      imap: {
        user: imapUser,
        password: imapPass,
        host: imapHost,
        port: imapPort,
        tls: true,
        authTimeout: 15000,
        tlsOptions: { rejectUnauthorized: false },
      },
    }

    console.log("[v0] Attempting IMAP connection...")
    connection = await imapSimple.connect(config)
    console.log("[v0] Connected! Opening INBOX...")
    await connection.openBox("INBOX")

    const fetchOptions = {
      bodies: ["HEADER", ""],
      markSeen: false,
      struct: true,
    }

    const allMessages = await connection.search(["ALL"], fetchOptions)
    console.log("[v0] Total messages in INBOX:", allMessages.length)

    // Take the most recent messages
    const recentBatch = allMessages.slice(-30).reverse()

    type ParsedEmail = {
      id: string; from: string; subject: string; date: string; body: string
      attachments: Array<{ filename: string; contentType: string; size: number; content: string }>
      uid: number; parsedDate: Date | null
    }
    const matchedEmails: ParsedEmail[] = []

    if (useLocalFilter) {
      // --- CLOUDFLARE FORWARDED: fetch all, filter locally by headers ---
      const targetLower = fullAddress.toLowerCase()
      console.log("[v0] Using local filter for Cloudflare-forwarded domain. Target:", targetLower)

      for (let i = 0; i < recentBatch.length; i++) {
        const message = recentBatch[i]
        try {
          const allBody = message.parts.find((part: { which: string }) => part.which === "")
          const headerPart = message.parts.find((part: { which: string }) => part.which === "HEADER")
          const rawEmail = allBody?.body || ""

          // Check all possible headers + raw email for the target address
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
            id: parsed.messageId || `msg-${i}`,
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
            uid: message.attributes.uid,
            parsedDate: parsed.date || null,
          })
        } catch { /* skip */ }
      }
      console.log("[v0] Found", matchedEmails.length, "matches locally for", fullAddress)
    } else {
      // --- DIRECT TITAN: all emails in this inbox belong to this domain ---
      // No filtering needed -- just parse the most recent messages
      console.log("[v0] Direct Titan inbox for", bareDomain, "- returning all recent messages")

      for (let i = 0; i < Math.min(recentBatch.length, 10); i++) {
        const message = recentBatch[i]
        try {
          const allBody = message.parts.find((part: { which: string }) => part.which === "")
          const rawEmail = allBody?.body || ""

          const parsed = await simpleParser(rawEmail)
          const fromAddress = parsed.from?.value?.[0]
          matchedEmails.push({
            id: parsed.messageId || `msg-${i}`,
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
            uid: message.attributes.uid,
            parsedDate: parsed.date || null,
          })
        } catch { /* skip */ }
      }
      console.log("[v0] Parsed", matchedEmails.length, "emails from direct inbox")
    }

    // Take top 10 matches
    const emails = matchedEmails.slice(0, 10).map(({ uid, parsedDate, ...email }) => email)

    // --- Automatic Cleanup: delete messages older than 30 minutes ---
    try {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000)
      const uidsToDelete = matchedEmails
        .filter((e) => e.parsedDate && e.parsedDate.getTime() < thirtyMinAgo.getTime())
        .map((e) => e.uid)

      if (uidsToDelete.length > 0) {
        console.log("[v0] Cleanup: deleting", uidsToDelete.length, "old messages")
        await connection.addFlags(uidsToDelete, "\\Deleted")
        await new Promise<void>((resolve, reject) => {
          connection!.imap.expunge((err: Error | null) => {
            if (err) reject(err)
            else resolve()
          })
        })
      }
    } catch (cleanupErr) {
      console.error("[v0] Cleanup failed (non-blocking):", cleanupErr instanceof Error ? cleanupErr.message : cleanupErr)
    }

    connection.end()
    connection = null

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
    const errorStack = err instanceof Error ? err.stack : undefined
    console.error("[v0] IMAP error message:", errorMessage)
    console.error("[v0] IMAP error stack:", errorStack)

    // Classify the error for the user
    let userMessage: string
    const lowerMsg = errorMessage.toLowerCase()
    if (lowerMsg.includes("login") || lowerMsg.includes("auth") || lowerMsg.includes("credentials") || lowerMsg.includes("no")) {
      userMessage = `Falha na autenticacao IMAP para ${bareDomain}. Verifique usuario/senha. (${errorMessage})`
    } else if (lowerMsg.includes("timeout") || lowerMsg.includes("timed out")) {
      userMessage = `Timeout ao conectar ao servidor IMAP (${imapHost}:${imapPort}). Verifique IMAP_HOST e IMAP_PORT. (${errorMessage})`
    } else if (lowerMsg.includes("enotfound") || lowerMsg.includes("getaddrinfo") || lowerMsg.includes("econnrefused")) {
      userMessage = `Servidor IMAP nao encontrado: ${imapHost}:${imapPort}. Verifique IMAP_HOST. (${errorMessage})`
    } else {
      userMessage = `Erro IMAP: ${errorMessage}`
    }

    return NextResponse.json(
      { error: userMessage },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    )
  } finally {
    if (connection) {
      try {
        connection.end()
      } catch {
        // Ignore close errors
      }
    }
  }
}
