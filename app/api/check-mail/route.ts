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
        user: process.env.IMAP_USER_SUKODOCURSOR || "",
        password: process.env.IMAP_PASS_SUKODOCURSOR || "",
      }
    case "@sukoultra.shop":
      return {
        user: process.env.IMAP_USER_SUKOULTRA || "",
        password: process.env.IMAP_PASS_SUKOULTRA || "",
      }
    case "@sukov0dev.shop":
      return {
        user: process.env.IMAP_USER_SUKOV0DEV || "",
        password: process.env.IMAP_PASS_SUKOV0DEV || "",
      }
    default:
      return null
  }
}

function formatRelativeTime(date: Date): string {
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return "Just now"
  if (diffMin < 60) return `${diffMin} min ago`

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const user = searchParams.get("user")
  const domain = searchParams.get("domain") as SupportedDomain | null

  if (!user || !domain) {
    return NextResponse.json(
      { error: "Both 'user' and 'domain' parameters are required" },
      { status: 400 }
    )
  }

  if (!SUPPORTED_DOMAINS.includes(domain)) {
    return NextResponse.json({ error: "Unsupported domain" }, { status: 400 })
  }

  const credentials = getCredentials(domain)
  if (!credentials || !credentials.user || !credentials.password) {
    return NextResponse.json(
      { error: "Email credentials are not configured for this domain" },
      { status: 500 }
    )
  }

  const imapHost = process.env.IMAP_HOST || "imap.titan.email"
  const fullAddress = `${user}${domain}`

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

    connection = await imapSimple.connect(config)
    await connection.openBox("INBOX")

    const searchCriteria = [["TO", fullAddress]]
    const fetchOptions = {
      bodies: ["HEADER", ""],
      markSeen: false,
      struct: true,
    }

    const messages = await connection.search(searchCriteria, fetchOptions)

    // Take the last 10 messages (most recent)
    const recentMessages = messages.slice(-10).reverse()

    const emails = await Promise.all(
      recentMessages.map(async (message, index) => {
        try {
          const allBody = message.parts.find((part: { which: string }) => part.which === "")
          const rawEmail = allBody?.body || ""

          const parsed = await simpleParser(rawEmail)

          const fromAddress = parsed.from?.value?.[0]
          const fromName = fromAddress?.name || fromAddress?.address || "Unknown Sender"
          const subject = parsed.subject || "(No Subject)"
          const date = parsed.date ? formatRelativeTime(parsed.date) : "Unknown"
          const body = parsed.html || parsed.textAsHtml || `<p>${parsed.text || "No content"}</p>`

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
            from: "Unknown",
            subject: "(Could not parse email)",
            date: "Unknown",
            body: "<p>This email could not be parsed.</p>",
          }
        }
      })
    )

    return NextResponse.json({ emails, user, domain })
  } catch (err) {
    console.error("IMAP connection error:", err)
    return NextResponse.json(
      { error: "Failed to connect to the email server. Please try again." },
      { status: 500 }
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
