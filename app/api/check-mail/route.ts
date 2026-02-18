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

  // Central inbox credentials — all domains are forwarded here via Cloudflare Email Routing
  // Fallback: you can hardcode credentials here if env vars are not working
  const FALLBACK_USER = "" // e.g. "sukoademirultra@sukoultra.shop"
  const FALLBACK_PASS = "" // e.g. "your-password-here"

  const centralUser = process.env.IMAP_CENTRAL_USER || FALLBACK_USER
  const centralPass = process.env.IMAP_CENTRAL_PASS || FALLBACK_PASS
  const imapHost = process.env.IMAP_HOST || "imap.titan.email"
  const imapPort = parseInt(process.env.IMAP_PORT || "993", 10)

  console.log("[v0] Connecting to", centralUser || "(EMPTY)", "on", imapHost + ":" + imapPort)
  console.log("[v0] IMAP_CENTRAL_USER from env:", process.env.IMAP_CENTRAL_USER ? "SET" : "MISSING")
  console.log("[v0] IMAP_CENTRAL_PASS from env:", process.env.IMAP_CENTRAL_PASS ? "SET" : "MISSING")

  if (!centralUser || !centralPass) {
    return NextResponse.json(
      {
        error: `Variavel de ambiente ausente. IMAP_CENTRAL_USER: ${centralUser ? "OK" : "VAZIO"}, IMAP_CENTRAL_PASS: ${centralPass ? "OK" : "VAZIO"}. Adicione as variaveis no painel Vars do v0.`,
      },
      { status: 500 }
    )
  }

  // The full address the user wants to check — Cloudflare preserves this in the TO header
  const fullAddress = `${user}${normalizedDomain}`

  let connection: Awaited<ReturnType<typeof imapSimple.connect>> | null = null

  try {
    const config = {
      imap: {
        user: centralUser,
        password: centralPass,
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
    // --- FETCH & FILTER STRATEGY ---
    // Titan/HostGator IMAP SEARCH TO is unreliable for forwarded emails.
    // Instead: fetch last 30 messages, then filter locally by TO / X-Original-To header.
    console.log("[v0] Fetching last 30 emails from INBOX for local filtering...")

    const allCriteria = ["ALL"]
    const fetchOptions = {
      bodies: ["HEADER", ""],
      markSeen: false,
      struct: true,
    }

    const allMessages = await connection.search(allCriteria, fetchOptions)
    console.log("[v0] Total messages in INBOX:", allMessages.length)

    // Take the last 30 (most recent), then filter locally
    const recentBatch = allMessages.slice(-30).reverse()
    const targetLower = fullAddress.toLowerCase()

    // Phase 1: Parse and filter by TO header locally
    const matchedEmails: Array<{
      id: string
      from: string
      subject: string
      date: string
      body: string
      attachments: Array<{ filename: string; contentType: string; size: number; content: string }>
      uid: number
      parsedDate: Date | null
    }> = []

    for (let i = 0; i < recentBatch.length; i++) {
      const message = recentBatch[i]
      try {
        const allBody = message.parts.find((part: { which: string }) => part.which === "")
        const headerPart = message.parts.find((part: { which: string }) => part.which === "HEADER")
        const rawEmail = allBody?.body || ""

        // Quick header check first: does TO or X-Original-To match?
        const toHeader = (headerPart?.body?.to || []).join(" ").toLowerCase()
        const xOrigTo = (headerPart?.body?.["x-original-to"] || []).join(" ").toLowerCase()
        const deliveredTo = (headerPart?.body?.["delivered-to"] || []).join(" ").toLowerCase()
        const ccHeader = (headerPart?.body?.cc || []).join(" ").toLowerCase()

        const matchesTarget =
          toHeader.includes(targetLower) ||
          xOrigTo.includes(targetLower) ||
          deliveredTo.includes(targetLower) ||
          ccHeader.includes(targetLower)

        if (!matchesTarget) continue

        // Full parse only for matching messages
        const parsed = await simpleParser(rawEmail)

        const fromAddress = parsed.from?.value?.[0]
        const fromName = fromAddress?.name || fromAddress?.address || "Remetente desconhecido"
        const subject = parsed.subject || "(Sem assunto)"
        const date = parsed.date ? formatRelativeTime(parsed.date) : "Desconhecido"
        const body = parsed.html || parsed.textAsHtml || `<p>${parsed.text || "Sem conteudo"}</p>`

        const attachments = (parsed.attachments || []).map((att) => ({
          filename: att.filename || "attachment",
          contentType: att.contentType || "application/octet-stream",
          size: att.size || 0,
          content: att.content.toString("base64"),
        }))

        matchedEmails.push({
          id: parsed.messageId || `msg-${i}`,
          from: fromName,
          subject,
          date,
          body,
          attachments,
          uid: message.attributes.uid,
          parsedDate: parsed.date || null,
        })
      } catch {
        // Skip unparseable messages silently
      }
    }

    console.log("[v0] Found", matchedEmails.length, "matches locally for", fullAddress)

    // Take top 10 matches
    const emails = matchedEmails.slice(0, 10).map(({ uid, parsedDate, ...email }) => email)

    // --- Automatic Cleanup: delete matched messages older than 30 minutes ---
    try {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000)
      const uidsToDelete = matchedEmails
        .filter((e) => e.parsedDate && e.parsedDate.getTime() < thirtyMinAgo.getTime())
        .map((e) => e.uid)

      if (uidsToDelete.length > 0) {
        console.log("[v0] Cleanup: deleting", uidsToDelete.length, "messages older than 30 min")
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
      userMessage = `Falha na autenticacao IMAP. Verifique IMAP_CENTRAL_USER e IMAP_CENTRAL_PASS. (${errorMessage})`
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
