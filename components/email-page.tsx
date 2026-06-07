"use client"

import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { Trash2, RefreshCw, Copy, Mail, Send, FileCode, ExternalLink, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Inbox, type Email } from "@/components/mail-inbox"
import type { Dictionary } from "@/lib/i18n"

const STORAGE_KEY = "suko_saved_emails"

// Links
const TELEGRAM_LINK = "https://t.me/sukodeuva"
const GGMAX_LINK = "https://ggmax.com.br/perfil/SuKyNhoul"
const METHODS_LINK = "#" // Placeholder - update when ready

interface SavedEmail {
  address: string
  addedAt: number
}

interface EmailPageProps {
  dict: Dictionary
  lang: string
}

interface ParsedEmailItem {
  id: string
  from: string
  subject: string
  date: string
  body: string
}

export function EmailPage({ dict, lang }: EmailPageProps) {
  const [inputEmail, setInputEmail] = useState("")
  const [headerInputEmail, setHeaderInputEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [savedEmails, setSavedEmails] = useState<SavedEmail[]>([])
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false)
  const [headerDropdownOpen, setHeaderDropdownOpen] = useState(false)

  // Load saved emails from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          setSavedEmails(JSON.parse(stored))
        } catch {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    }
  }, [])

  // Save to localStorage when savedEmails changes
  useEffect(() => {
    if (typeof window !== "undefined" && savedEmails.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedEmails))
    }
  }, [savedEmails])

  // Deduplicate emails by id
  const dedupeEmails = useCallback((emailList: Email[]): Email[] => {
    const seen = new Set<string>()
    return emailList.filter((e) => {
      if (seen.has(e.id)) return false
      seen.add(e.id)
      return true
    })
  }, [])

  const fetchImapEmails = useCallback(async (fullAddress: string): Promise<Email[]> => {
    const res = await fetch(
      `/api/gmail-inbox?email=${encodeURIComponent(fullAddress)}`,
      { cache: "no-store" }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error ?? `Erro ao buscar emails Gmail (${res.status})`)
    if (!Array.isArray(data)) return []
    return data.map((item: ParsedEmailItem) => ({
      id: item.id,
      from: item.from ?? "Desconhecido",
      subject: item.subject ?? "(Sem assunto)",
      date: item.date ?? "",
      body: item.body || `<p style="color:#888;font-size:13px">Sem conteudo.</p>`,
      attachments: [],
    }))
  }, [])

  const fetchEmails = useCallback(async (fullAddress: string) => {
    // All addresses go through IMAP (Forward Email handles all our domains + Gmail forwards).
    // KV is used as fallback only if IMAP returns empty results.
    const imapResults = await fetchImapEmails(fullAddress)
    if (imapResults.length > 0) return imapResults

    // Fallback: Cloudflare KV (legacy, may have truncated bodies for older emails)
    const res = await fetch(
      `https://inbox-api.izukisukinho.workers.dev/inbox/${fullAddress}`,
      { cache: "no-store" }
    )

    if (!res.ok) {
      throw new Error(`Erro ao buscar emails (${res.status})`)
    }

    const data = await res.json()

    // MIME parser: recursively extracts text/html or text/plain from any MIME structure.
    // Works even when the outer envelope headers are huge (Gmail forwarded via Cloudflare)
    // and the text field has no blank-line header/body separator.
    const parseMime = (rawInput: string): string => {
      // Normalize line endings once
      const raw = rawInput.replace(/\r\n/g, "\n").replace(/\r/g, "\n")

      function decodeB64(s: string) {
        try {
          const bin   = atob(s.replace(/\s/g, ""))
          const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
          return new TextDecoder("utf-8").decode(bytes)
        } catch { return "" }
      }

      function decodeQP(s: string) {
        return s
          .replace(/=\n/g, "")
          .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => {
            try { return decodeURIComponent("%" + h) } catch { return "" }
          })
      }

      function decodePart(body: string, encoding: string) {
        if (encoding.includes("base64"))           return decodeB64(body)
        if (encoding.includes("quoted-printable")) return decodeQP(body)
        return body
      }

      // Robustly extract header value handling folded lines (RFC 2822 folding)
      function getHeader(block: string, name: string): string {
        const re = new RegExp(`^${name}:\\s*([\\s\\S]*?)(?=\\n[^\\t ]|$)`, "im")
        const m  = block.match(re)
        if (!m) return ""
        // unfold: remove newline + whitespace
        return m[1].replace(/\n[\t ]+/g, " ").trim()
      }

      // Split a MIME block into {headerBlock, body} at the FIRST blank line
      function splitBlock(block: string): { headerBlock: string; body: string } {
        const idx = block.indexOf("\n\n")
        if (idx === -1) return { headerBlock: block, body: "" }
        return { headerBlock: block.slice(0, idx), body: block.slice(idx + 2) }
      }

      function getBoundary(headerBlock: string): string | null {
        const ct = getHeader(headerBlock, "content-type")
        const m  = ct.match(/boundary=(?:"([^"]+)"|'([^']+)'|(\S+))/i)
        if (!m) return null
        return (m[1] ?? m[2] ?? m[3]).replace(/^["']|["']$/g, "").trim()
      }

      // Recursively extract html/plain from a single MIME part block
      function extract(block: string): { html: string; plain: string } {
        const { headerBlock, body } = splitBlock(block)
        const ct       = getHeader(headerBlock, "content-type").toLowerCase()
        const encoding = getHeader(headerBlock, "content-transfer-encoding").toLowerCase()
        const boundary = getBoundary(headerBlock)

        if (boundary || ct.includes("multipart/")) {
          // Find boundary — may be in a deeper scan if headers were truncated
          const bnd = boundary ?? raw.match(/boundary=(?:"([^"]+)"|'([^']+)'|(\S+))/i)
            ?.slice(1).find(Boolean)?.replace(/^["']|["']$/g, "").trim()
          if (!bnd) return { html: "", plain: "" }

          const esc   = bnd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          const parts = body.split(new RegExp(`--${esc}(?:--)?`))
          let html = "", plain = ""
          for (const part of parts) {
            const t = part.trim()
            if (!t || t === "--") continue
            const r = extract(t)
            if (r.html  && !html)  html  = r.html
            if (r.plain && !plain) plain = r.plain
          }
          return { html, plain }
        }

        const decoded = decodePart(body, encoding).trim()
        if (ct.includes("text/html"))  return { html: decoded, plain: "" }
        if (ct.includes("text/plain")) return { html: "", plain: decoded }
        return { html: "", plain: "" }
      }

      // First try: full structured parse
      const { html, plain } = extract(raw)
      if (html)  return html
      if (plain) return `<pre style="white-space:pre-wrap;font-family:inherit">${plain}</pre>`

      // Fallback: scan the raw for any boundary and try to parse from the first --boundary line
      // This handles emails where outer headers are truncated (Worker 12k char limit)
      const anyBoundary = raw.match(/boundary=(?:"([^"]+)"|'([^']+)'|(\S+))/i)
      if (anyBoundary) {
        const bnd  = (anyBoundary[1] ?? anyBoundary[2] ?? anyBoundary[3]).replace(/^["']|["']$/g, "").trim()
        const esc  = bnd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        // Find first occurrence of --boundary in the raw and parse from there
        const startIdx = raw.indexOf(`--${bnd}`)
        if (startIdx !== -1) {
          const mimeBody = raw.slice(startIdx)
          const parts    = mimeBody.split(new RegExp(`--${esc}(?:--)?`))
          let html2 = "", plain2 = ""
          for (const part of parts) {
            const t = part.trim()
            if (!t || t === "--") continue
            const r = extract(t)
            if (r.html  && !html2)  html2  = r.html
            if (r.plain && !plain2) plain2 = r.plain
          }
          if (html2)  return html2
          if (plain2) return `<pre style="white-space:pre-wrap;font-family:inherit">${plain2}</pre>`
        }
      }

      return ""
    }

    const mapped: Email[] = (Array.isArray(data) ? data : []).map(
      (item: { from?: string; subject?: string; date?: string; text?: string }, i: number) => {
        const rawText = item.text ?? ""
        // parseMime handles full MIME; if it returns empty (plain text body with no MIME headers),
        // fall back to rendering the raw text directly as <pre>
        const parsedBody = rawText ? parseMime(rawText) : ""
        const bodyText = parsedBody || (rawText.trim()
          ? `<pre style="white-space:pre-wrap;word-break:break-word;font-family:inherit;font-size:14px;line-height:1.6">${rawText
              .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`
          : "")
        return {
          id: `cf-${fullAddress}-${i}-${item.date ?? i}`,
          from: item.from ?? "Desconhecido",
          subject: item.subject ?? "(Sem assunto)",
          date: item.date ?? "",
          body: bodyText || `<p style="color:#a0a0a0;font-size:13px;font-style:italic">Sem conteudo.</p>`,
          attachments: [],
        }
      }
    )

    return dedupeEmails(mapped)
  }, [dedupeEmails, fetchImapEmails])

  const handleAddEmail = useCallback(async () => {
    const trimmed = inputEmail.trim().toLowerCase()
    if (!trimmed) return

    const atIndex = trimmed.lastIndexOf("@")
    if (atIndex === -1) {
      setError(dict.errors.invalidFormat)
      return
    }

    const user = trimmed.slice(0, atIndex)
    if (!user) {
      setError(dict.errors.noUsername)
      return
    }

    // Check if already saved
    if (savedEmails.some(e => e.address === trimmed)) {
      setSelectedEmail(trimmed)
      setInputEmail("")
      setLoading(true)
      try {
        const result = await fetchEmails(trimmed)
        setEmails(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : dict.errors.genericError)
      } finally {
        setLoading(false)
      }
      return
    }

    setError(null)
    setLoading(true)

    try {
      const result = await fetchEmails(trimmed)
      setSavedEmails(prev => [...prev, { address: trimmed, addedAt: Date.now() }])
      setSelectedEmail(trimmed)
      setEmails(result)
      setInputEmail("")
      setStatusMessage(dict.status.inboxUpdated)
      setTimeout(() => setStatusMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.errors.genericError)
      setEmails([])
    } finally {
      setLoading(false)
    }
  }, [inputEmail, savedEmails, fetchEmails, dict])

  const handleSelectEmail = useCallback(async (address: string) => {
    if (selectedEmail === address) return
    
    setSelectedEmail(address)
    setLoading(true)
    setEmails([])
    setError(null)

    try {
      const result = await fetchEmails(address)
      setEmails(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.errors.genericError)
    } finally {
      setLoading(false)
    }
  }, [selectedEmail, fetchEmails, dict.errors.genericError])

  const handleRemoveEmail = useCallback((address: string) => {
    setSavedEmails(prev => prev.filter(e => e.address !== address))
    if (selectedEmail === address) {
      setSelectedEmail(null)
      setEmails([])
    }
    const remaining = savedEmails.filter(e => e.address !== address)
    if (remaining.length === 0) {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [selectedEmail, savedEmails])

  const handleRemoveAllEmails = useCallback(() => {
    setSavedEmails([])
    setSelectedEmail(null)
    setEmails([])
    localStorage.removeItem(STORAGE_KEY)
    toast.success("Todos os emails removidos")
  }, [])

  const handleRefresh = useCallback(async () => {
    if (!selectedEmail) return

    setRefreshing(true)
    setStatusMessage(dict.status.checkingNewEmails)

    try {
      const result = await fetchEmails(selectedEmail)
      setEmails(result)
      setStatusMessage(dict.status.inboxUpdated)
      setTimeout(() => setStatusMessage(null), 3000)
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : dict.errors.updateError)
      setTimeout(() => setStatusMessage(null), 5000)
    } finally {
      setRefreshing(false)
    }
  }, [selectedEmail, fetchEmails, dict])

  const handleCopyEmail = useCallback(async (address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      toast.success(dict.emailInput.copiedToast)
    } catch {
      toast.error(dict.emailInput.copyErrorToast)
    }
  }, [dict])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputEmail(e.target.value)
    if (error) setError(null)
  }, [error])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddEmail()
    }
  }, [handleAddEmail])

  const handleHeaderInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setHeaderInputEmail(e.target.value)
  }, [])

  const handleHeaderAddEmail = useCallback(async () => {
    const trimmed = headerInputEmail.trim().toLowerCase()
    if (!trimmed) return

    const atIndex = trimmed.lastIndexOf("@")
    if (atIndex === -1) {
      toast.error(dict.errors.invalidFormat)
      return
    }

    const user = trimmed.slice(0, atIndex)
    if (!user) {
      toast.error(dict.errors.noUsername)
      return
    }

    // Check if already saved
    if (savedEmails.some(e => e.address === trimmed)) {
      setSelectedEmail(trimmed)
      setHeaderInputEmail("")
      setLoading(true)
      try {
        const result = await fetchEmails(trimmed)
        setEmails(result)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : dict.errors.genericError)
      } finally {
        setLoading(false)
      }
      return
    }

    setLoading(true)

    try {
      const result = await fetchEmails(trimmed)
      setSavedEmails(prev => [...prev, { address: trimmed, addedAt: Date.now() }])
      setSelectedEmail(trimmed)
      setEmails(result)
      setHeaderInputEmail("")
      toast.success("Email adicionado")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.errors.genericError)
    } finally {
      setLoading(false)
    }
  }, [headerInputEmail, savedEmails, fetchEmails, dict])

  const handleHeaderKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleHeaderAddEmail()
    }
  }, [handleHeaderAddEmail])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader lang={lang} />

      {/* Header Input - shows when left sidebar is collapsed (md+) */}
      {leftSidebarCollapsed && (
        <div className="hidden md:block border-b border-border bg-card/50 px-4 py-2">
          <div className="mx-auto max-w-lg">
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={headerInputEmail}
                onChange={handleHeaderInputChange}
                onKeyDown={handleHeaderKeyDown}
                placeholder={dict.emailInput.placeholder}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleHeaderAddEmail}
                disabled={loading || !headerInputEmail.trim()}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {loading ? "..." : dict.emailInput.submit}
              </button>
              {savedEmails.length > 0 && (
                <button
                  onClick={() => setHeaderDropdownOpen(!headerDropdownOpen)}
                  className="rounded-lg border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {headerDropdownOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              )}
            </div>
            
            {/* Dropdown with saved emails */}
            {headerDropdownOpen && savedEmails.length > 0 && (
              <div className="mt-2 rounded-lg border border-border bg-card p-2 shadow-lg">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Emails Salvos</span>
                  <button
                    onClick={handleRemoveAllEmails}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Limpar todos
                  </button>
                </div>
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {savedEmails.map((saved) => (
                    <div
                      key={saved.address}
                      className={`flex items-center justify-between rounded-md px-2 py-1.5 text-xs cursor-pointer transition-colors ${
                        selectedEmail === saved.address
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted text-foreground"
                      }`}
                      onClick={() => {
                        handleSelectEmail(saved.address)
                        setHeaderDropdownOpen(false)
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                        <span className="truncate">{saved.address}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopyEmail(saved.address)
                          }}
                          className="rounded p-0.5 hover:bg-muted"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveEmail(saved.address)
                          }}
                          className="rounded p-0.5 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="flex flex-1 flex-col md:flex-row relative">
        {/* Left Column - Title, Tutorial, Input, Saved Emails */}
        <div className={`relative border-b md:border-b-0 md:border-r border-border bg-card transition-all duration-300 ${
          leftSidebarCollapsed ? "hidden" : "w-full md:w-80 lg:w-96 shrink-0"
        }`}>
          {/* Collapse button inside sidebar - only on md+ */}
          {!leftSidebarCollapsed && (
            <button
              onClick={() => setLeftSidebarCollapsed(true)}
              className="absolute right-2 top-2 z-10 hidden md:block rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div className="p-4">
            {/* Title */}
            <div className="mb-4">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {dict.hero.title}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {dict.hero.subtitle}
              </p>
            </div>

            {/* Tutorial Section */}
            <div className="mb-4 rounded-lg border border-border bg-background p-3 text-xs">
              <h3 className="mb-2 font-semibold text-foreground">{dict.hero.tutorialTitle}</h3>
              <ul className="space-y-1.5 text-muted-foreground">
                <li className="flex gap-2">
                  <span className="shrink-0 font-medium text-primary">1.</span>
                  <span>{dict.hero.tutorialStep1}</span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 font-medium text-amber-500">2.</span>
                  <span className="text-amber-500/90">{dict.hero.tutorialStep2}</span>
                </li>
              </ul>
            </div>

            {/* Email Input */}
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inputEmail}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={dict.emailInput.placeholder}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label={dict.emailInput.ariaLabel}
                />
                <button
                  onClick={handleAddEmail}
                  disabled={loading || !inputEmail.trim()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {loading ? "..." : dict.emailInput.submit}
                </button>
              </div>
              {error && (
                <p className="mt-2 text-xs text-destructive">{error}</p>
              )}
            </div>

            {/* Saved Emails */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  {dict.sidebar.title}
                </h2>
                {savedEmails.length > 0 && (
                  <button
                    onClick={handleRemoveAllEmails}
                    className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                    Remover todos
                  </button>
                )}
              </div>
              
              {savedEmails.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-3 text-center">
                  <Mail className="mx-auto h-6 w-6 text-muted-foreground/50" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {dict.sidebar.noSavedEmails}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {savedEmails.map((saved) => (
                    <div
                      key={saved.address}
                      className={`group relative rounded-lg border p-2.5 transition-colors cursor-pointer ${
                        selectedEmail === saved.address
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                      onClick={() => handleSelectEmail(saved.address)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-foreground">
                            {saved.address}
                          </p>
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {dict.sidebar.online}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopyEmail(saved.address)
                            }}
                            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelectEmail(saved.address)
                            }}
                            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveEmail(saved.address)
                            }}
                            className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center - Inbox */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Expand left sidebar button - only on md+ */}
          {leftSidebarCollapsed && (
            <button
              onClick={() => setLeftSidebarCollapsed(false)}
              className="absolute left-2 top-2 z-10 hidden md:block rounded-lg border border-border bg-card p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
          
          {/* Expand right sidebar button - only on xl+ */}
          {rightSidebarCollapsed && (
            <button
              onClick={() => setRightSidebarCollapsed(false)}
              className="absolute right-2 top-2 z-10 hidden xl:block rounded-lg border border-border bg-card p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex-1 p-2 sm:p-4 w-full overflow-x-hidden">
            {selectedEmail ? (
              <div className="h-full">
                {/* Selected Email Header */}
                <div className="mb-3 flex items-center justify-between rounded-lg border border-border bg-card p-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                      {selectedEmail.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {dict.sidebar.online}
                        </span>
                        <button
                          onClick={handleRefresh}
                          disabled={refreshing}
                          className="text-xs text-primary hover:underline disabled:opacity-50"
                        >
                          {dict.sidebar.recheck}
                        </button>
                      </div>
                      <p className="text-sm font-medium text-foreground">{selectedEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopyEmail(selectedEmail)}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>

                {statusMessage && (
                  <div className="mb-3 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    {statusMessage}
                  </div>
                )}

                <Inbox
                  emails={emails}
                  activeEmail={selectedEmail.split("@")[0]}
                  activeDomain={"@" + selectedEmail.split("@")[1]}
                  hasSearched={true}
                  isLoading={loading}
                  isRefreshing={refreshing}
                  isPolling={false}
                  statusMessage={statusMessage}
                  countdown={0}
                  fetchError={error}
                  onRefresh={handleRefresh}
                  dict={dict}
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Mail className="mx-auto h-10 w-10 text-muted-foreground/30" />
                  <p className="mt-3 text-sm font-medium text-muted-foreground">
                    {dict.inbox.noEmailSelected}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {dict.inbox.enterEmailPrompt}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Ads Section */}
          <div className="border-t border-border bg-muted/30 p-4">
            <div className="w-full">
              <div className="rounded-lg border border-dashed border-border bg-background p-6 text-center">
                <p className="text-xs text-muted-foreground">Espaco para Anuncios</p>
                {/* Ad code will go here */}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Links (TG, GGMax, Methods) - only xl+ */}
        <div className={`border-t md:border-t-0 md:border-l border-border bg-card transition-all duration-300 ${
          rightSidebarCollapsed ? "hidden" : "hidden xl:block w-56 shrink-0"
        }`}>
          <div className="relative p-4">
            {/* Collapse button */}
            <button
              onClick={() => setRightSidebarCollapsed(true)}
              className="absolute right-2 top-2 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            
            <h3 className="mb-3 text-sm font-semibold text-foreground">Links</h3>
          
          {/* Telegram */}
          <a
            href={TELEGRAM_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary/50 hover:bg-muted/50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10">
              <Send className="h-5 w-5 text-sky-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Telegram</p>
              <p className="text-xs text-muted-foreground">@sukodeuva</p>
            </div>
            <ExternalLink className="ml-auto h-4 w-4 text-muted-foreground" />
          </a>

          {/* GGMax */}
          <a
            href={GGMAX_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary/50 hover:bg-muted/50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <span className="text-lg font-bold text-emerald-500">GG</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">GGMax</p>
              <p className="text-xs text-muted-foreground">SuKyNhoul</p>
            </div>
            <ExternalLink className="ml-auto h-4 w-4 text-muted-foreground" />
          </a>

          {/* Methods/HTMLs */}
          <a
            href={METHODS_LINK}
            className={`flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors ${
              METHODS_LINK === "#" 
                ? "opacity-50 cursor-not-allowed" 
                : "hover:border-primary/50 hover:bg-muted/50"
            }`}
            onClick={(e) => METHODS_LINK === "#" && e.preventDefault()}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
              <FileCode className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Metodos</p>
              <p className="text-xs text-muted-foreground">
                {METHODS_LINK === "#" ? "Em breve..." : "HTMLs e mais"}
              </p>
            </div>
            {METHODS_LINK !== "#" && (
              <ExternalLink className="ml-auto h-4 w-4 text-muted-foreground" />
            )}
          </a>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-3 text-center text-xs text-muted-foreground">
        <p>{dict.footer.text}</p>
      </footer>

    </div>
  )
}
