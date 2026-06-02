import imapSimple from "imap-simple"

const t0 = Date.now()
const lap = (label) => console.log(`[${((Date.now() - t0) / 1000).toFixed(2)}s] ${label}`)

const config = {
  imap: {
    user: "abusadordoamin@thesuaky.shop",
    password: process.env.IMAP_PASS || "",
    host: "imap.forwardemail.net",
    port: 993,
    tls: true,
    authTimeout: 30000,
    connTimeout: 30000,
    keepalive: true,
    tlsOptions: {
      servername: "imap.forwardemail.net",
      rejectUnauthorized: false,
      minVersion: "TLSv1.2",
    },
  },
}

function openInbox(connection) {
  return new Promise((resolve, reject) => {
    connection.imap.openBox("INBOX", true, (err, box) => {
      if (err) return reject(err)
      resolve({ total: box?.messages?.total ?? 0 })
    })
  })
}

function fetchHeadersBySeq(connection, range) {
  return new Promise((resolve, reject) => {
    const results = []
    const fetch = connection.imap.seq.fetch(range, { bodies: "HEADER.FIELDS (TO FROM SUBJECT DATE DELIVERED-TO X-ORIGINAL-TO)", struct: false })
    fetch.on("message", (msg) => {
      let uid = 0
      let headerText = ""
      msg.on("body", (stream) => {
        let buf = ""
        stream.on("data", (chunk) => (buf += chunk.toString("utf8")))
        stream.on("end", () => (headerText = buf))
      })
      msg.once("attributes", (attrs) => (uid = attrs.uid))
      msg.once("end", () => results.push({ uid, headerText }))
    })
    fetch.once("error", reject)
    fetch.once("end", () => resolve(results))
  })
}

try {
  lap("connecting...")
  const connection = await imapSimple.connect(config)
  lap("connected")

  const r1 = await openInbox(connection)
  lap(`COLD openBox, total=${r1.total}`)

  const total = r1.total

  // Fetch last 5 headers (small)
  let start = Math.max(1, total - 4)
  lap(`fetch last 5 headers ${start}:${total}...`)
  const h1 = await fetchHeadersBySeq(connection, `${start}:${total}`)
  lap(`  -> got ${h1.length} headers`)

  // Fetch last 5 AGAIN on warm connection
  lap(`fetch last 5 headers again...`)
  const h2 = await fetchHeadersBySeq(connection, `${start}:${total}`)
  lap(`  -> got ${h2.length} headers`)

  // Fetch last 50 headers
  start = Math.max(1, total - 49)
  lap(`fetch last 50 headers ${start}:${total}...`)
  const h3 = await fetchHeadersBySeq(connection, `${start}:${total}`)
  lap(`  -> got ${h3.length} headers`)

  connection.end()
  lap("done")
  process.exit(0)
} catch (err) {
  lap(`ERROR: ${err?.message || err}`)
  process.exit(1)
}
