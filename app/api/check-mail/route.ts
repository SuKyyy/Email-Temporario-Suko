import { NextRequest, NextResponse } from "next/server"
import imapSimple from "imap-simple"
import { simpleParser } from "mailparser"

const SUPPORTED_DOMAINS = [
  "@sukospot.shop",
  "@sukodocursor.shop",
  "@sukoultra.shop",
  "@sukov0dev.shop",
] as const

type SupportedDomain = (typeof SUPPORTED_DOMAINS)[number]

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
  const normalizedDomain = (rawDomain.startsWith("@") ? rawDomain : `@${rawDomain}`) as SupportedDomain

  if (!SUPPORTED_DOMAINS.includes(normalizedDomain)) {
    return NextResponse.json({ error: `Dominio nao suportado: ${normalizedDomain}` }, { status: 400 })
  }

  // Central inbox credentials — all domains are forwarded here via Cloudflare Email Routing
  const centralUser = process.env.IMAP_CENTRAL_USER || ""
  const centralPass = process.env.IMAP_CENTRAL_PASS || ""
  const imapHost = process.env.IMAP_HOST || "imap.titan.email"
  const imapPort = parseInt(process.env.IMAP_PORT || "993", 10)

  if (!centralUser || !centralPass) {
    console.error("[v0] Central IMAP credentials missing. Set IMAP_CENTRAL_USER and IMAP_CENTRAL_PASS.")
    return NextResponse.json(
      { error: "Credenciais do servidor de email nao configuradas." },
      { status: 500 }
    )
  }

  // The full address the user wants to check — Cloudflare preserves this in the TO header
  const fullAddress = `${user}${normalizedDomain}`

  console.log("[v0] IMAP lookup - host:", imapHost, "port:", imapPort, "central_user:", centralUser, "target_to:", fullAddress)

  let connection: Awaited<ReturnType<typeof imapSimple.connect>> | null = null

  try {
    const config = {
      imap: {
        user: centralUser,
        password: centralPass,
        host: imapHost,
        port: imapPort,
        tls: true,
        authTimeout: 10000,
        tlsOptions: { rejectUnauthorized: false },
      },
    }

    connection = await imapSimple.connect(config)
    await connection.openBox("INBOX")

    const searchCriteria = [["TO", fullAddress]]
    const fetchOptions = {
      bodies: ["HEADER", ""],
      markSeen: false,
      struct: true,
    }

    const messages = await connection.search(searchCriteria, fetchOptions)

    // Take the last 10 messages (safe against spam bursts)
    const recentMessages = messages.slice(-10).reverse()

    const emails = await Promise.all(
      recentMessages.map(async (message, index) => {
        try {
          const allBody = message.parts.find((part: { which: string }) => part.which === "")
          const rawEmail = allBody?.body || ""

          const parsed = await simpleParser(rawEmail)

          const fromAddress = parsed.from?.value?.[0]
          const fromName = fromAddress?.name || fromAddress?.address || "Remetente desconhecido"
          const subject = parsed.subject || "(Sem assunto)"
          const date = parsed.date ? formatRelativeTime(parsed.date) : "Desconhecido"
          const body = parsed.html || parsed.textAsHtml || `<p>${parsed.text || "Sem conteudo"}</p>`

          return {
            id: parsed.messageId || `msg-${index}`,
            from: fromName,
            subject,
            date,
            body,
          }
        } catch {
          return {
            id: `msg-${index}`,
            from: "Desconhecido",
            subject: "(Nao foi possivel processar o email)",
            date: "Desconhecido",
            body: "<p>Este email nao pode ser processado.</p>",
          }
        }
      })
    )

    // --- Automatic Cleanup: delete messages older than 30 minutes ---
    try {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000)
      // IMAP BEFORE date uses "DD-Mon-YYYY" format and matches dates strictly before that day.
      // For intra-day granularity, we search ALL messages and filter by parsed date instead.
      const allCriteria = [["TO", fullAddress]]
      const headerFetch = { bodies: ["HEADER"], markSeen: false }

      const allMessages = await connection.search(allCriteria, headerFetch)

      const uidsToDelete: number[] = []
      for (const msg of allMessages) {
        const header = msg.parts.find((p: { which: string }) => p.which === "HEADER")
        const dateHeader = header?.body?.date?.[0]
        if (dateHeader) {
          const msgDate = new Date(dateHeader)
          if (msgDate.getTime() < thirtyMinAgo.getTime()) {
            uidsToDelete.push(msg.attributes.uid)
          }
        }
      }

      if (uidsToDelete.length > 0) {
        console.log(`[v0] Cleanup: deleting ${uidsToDelete.length} messages older than 30 min`)
        await connection.addFlags(uidsToDelete, "\\Deleted")
        await new Promise<void>((resolve, reject) => {
          connection!.imap.expunge((err: Error | null) => {
            if (err) reject(err)
            else resolve()
          })
        })
        console.log("[v0] Cleanup: expunge complete")
      }
    } catch (cleanupErr) {
      // Cleanup failure must NOT block the user response
      console.error("[v0] Cleanup failed (non-blocking):", cleanupErr instanceof Error ? cleanupErr.message : cleanupErr)
    }

    // Close connection after cleanup is done
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
    console.error("[v0] IMAP full error object:", JSON.stringify(err, Object.getOwnPropertyNames(err as object), 2))
    return NextResponse.json(
      { error: `Erro ao conectar. Verifique o email e tente novamente. (${errorMessage})` },
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
