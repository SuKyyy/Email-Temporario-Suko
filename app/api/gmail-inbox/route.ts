import { type NextRequest, NextResponse } from "next/server"
import Imap from "imap"
import { simpleParser } from "mailparser"

export const runtime = "nodejs"
export const maxDuration = 30

interface ParsedEmail {
  id: string
  from: string
  subject: string
  date: string
  body: string
}

function searchImapForAddress(targetEmail: string): Promise<ParsedEmail[]> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: process.env.GMAIL_IMAP_USER ?? "",
      password: process.env.GMAIL_IMAP_PASS ?? "",
      host: "imap.forwardemail.net",
      port: 993,
      tls: true,
      tlsOptions: {
        host: "imap.forwardemail.net",
        servername: "imap.forwardemail.net",
        rejectUnauthorized: false,
      },
      connTimeout: 20000,
      authTimeout: 15000,
    })

    const results: ParsedEmail[] = []

    imap.once("error", (err: Error) => {
      reject(err)
    })

    imap.once("ready", () => {
      imap.openBox("INBOX", true, (err, _box) => {
        if (err) {
          imap.end()
          return reject(err)
        }

        // Search for messages delivered to this address
        // Forward Email uses the X-Original-To and Delivered-To headers
        const searchCriteria = [
          ["OR",
            ["HEADER", "X-Original-To", targetEmail],
            ["OR",
              ["HEADER", "Delivered-To", targetEmail],
              ["TO", targetEmail],
            ],
          ],
        ]

        imap.search(searchCriteria, (searchErr, uids) => {
          if (searchErr) {
            imap.end()
            return reject(searchErr)
          }

          if (!uids || uids.length === 0) {
            imap.end()
            return resolve([])
          }

          // Fetch latest 20 messages max, most recent first
          const toFetch = uids.slice(-20).reverse()

          const fetch = imap.fetch(toFetch, { bodies: "" })
          const parsePromises: Promise<void>[] = []

          fetch.on("message", (msg, seqno) => {
            const parsePromise = new Promise<void>((res) => {
              const buffers: Buffer[] = []

              msg.on("body", (stream) => {
                stream.on("data", (chunk: Buffer) => buffers.push(chunk))
                stream.once("end", async () => {
                  try {
                    const raw = Buffer.concat(buffers)
                    const parsed = await simpleParser(raw)

                    // Extract body: prefer html, fall back to text
                    let body = ""
                    if (parsed.html) {
                      body = parsed.html
                    } else if (parsed.text) {
                      body = `<pre style="white-space:pre-wrap;font-family:inherit">${parsed.text}</pre>`
                    }

                    const fromAddr =
                      parsed.from?.text ??
                      parsed.from?.value?.[0]?.address ??
                      "Desconhecido"

                    results.push({
                      id: `gmail-${seqno}-${parsed.date?.getTime() ?? Date.now()}`,
                      from: fromAddr,
                      subject: parsed.subject ?? "(Sem assunto)",
                      date: parsed.date?.toISOString() ?? new Date().toISOString(),
                      body,
                    })
                  } catch {
                    // Skip malformed messages
                  }
                  res()
                })
              })
            })
            parsePromises.push(parsePromise)
          })

          fetch.once("error", (fetchErr: Error) => {
            imap.end()
            reject(fetchErr)
          })

          fetch.once("end", async () => {
            await Promise.all(parsePromises)
            imap.end()
            // Sort newest first
            results.sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            )
            resolve(results)
          })
        })
      })
    })

    imap.connect()
  })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get("email")?.trim().toLowerCase()

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email invalido" }, { status: 400 })
  }

  if (!process.env.GMAIL_IMAP_USER || !process.env.GMAIL_IMAP_PASS) {
    return NextResponse.json(
      { error: "Credenciais IMAP nao configuradas" },
      { status: 500 }
    )
  }

  try {
    const emails = await searchImapForAddress(email)
    return NextResponse.json(emails)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
