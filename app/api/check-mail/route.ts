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

function getCredentials(domain: SupportedDomain): { user: string; password: string } | null {
  switch (domain) {
    case "@sukospot.shop":
      return {
        user: process.env.IMAP_USER_SUKOSPOT || "",
        password: process.env.IMAP_PASS_SUKOSPOT || "",
      }
    case "@sukodocursor.shop":
      return {
        user: process.env.IMAP_USER_CURSOR || "",
        password: process.env.IMAP_PASS_CURSOR || "",
      }
    case "@sukoultra.shop":
      return {
        user: process.env.IMAP_USER_ULTRA || "",
        password: process.env.IMAP_PASS_ULTRA || "",
      }
    case "@sukov0dev.shop":
      return {
        user: process.env.IMAP_USER_V0 || "",
        password: process.env.IMAP_PASS_V0 || "",
      }
    default:
      return null
  }
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

  console.log("[v0] Raw query params - user:", user, "domain:", rawDomain)

  if (!user || !rawDomain) {
    return NextResponse.json(
      { error: "Parametros 'user' e 'domain' sao obrigatorios" },
      { status: 400 }
    )
  }

  // Normalize domain: ensure it starts with "@" whether passed as "@sukospot.shop" or "sukospot.shop"
  const normalizedDomain = (rawDomain.startsWith("@") ? rawDomain : `@${rawDomain}`) as SupportedDomain

  console.log("[v0] Normalized domain:", normalizedDomain)

  if (!SUPPORTED_DOMAINS.includes(normalizedDomain)) {
    console.log("[v0] Domain not in supported list. Supported:", SUPPORTED_DOMAINS)
    return NextResponse.json({ error: `Dominio nao suportado: ${normalizedDomain}` }, { status: 400 })
  }

  const credentials = getCredentials(normalizedDomain)

  console.log("[v0] Credentials lookup for", normalizedDomain, "- user env:", credentials?.user ? "(set)" : "(EMPTY)", "- pass env:", credentials?.password ? "(set)" : "(EMPTY)")

  if (!credentials || !credentials.user || !credentials.password) {
    console.log("[v0] Missing credentials. Check that env vars are set for domain:", normalizedDomain)
    return NextResponse.json(
      { error: `Dominio nao configurado no sistema: ${normalizedDomain}` },
      { status: 500 }
    )
  }

  const imapHost = process.env.IMAP_HOST || "imap.titan.email"
  const fullAddress = `${user}${normalizedDomain}`

  console.log("[v0] IMAP connection attempt - host:", imapHost, "port: 993", "tls: true", "imap_user:", credentials.user, "target_address:", fullAddress)

  let connection: Awaited<ReturnType<typeof imapSimple.connect>> | null = null

  try {
    const config = {
      imap: {
        user: credentials.user,
        password: credentials.password,
        host: imapHost,
        port: 993,
        tls: true,
        authTimeout: 10000,
        tlsOptions: { rejectUnauthorized: false },
      },
    }

    console.log("[v0] Connecting to IMAP server...")
    connection = await imapSimple.connect(config)
    console.log("[v0] IMAP connected successfully")
    await connection.openBox("INBOX")

    const searchCriteria = [["TO", fullAddress]]
    const fetchOptions = {
      bodies: ["HEADER", ""],
      markSeen: false,
      struct: true,
    }

    const messages = await connection.search(searchCriteria, fetchOptions)

    // Take the last 5 messages (most recent) for speed
    const recentMessages = messages.slice(-5).reverse()

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
