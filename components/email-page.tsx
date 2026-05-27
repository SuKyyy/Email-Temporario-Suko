"use client"

import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { Trash2, RefreshCw, Copy, Mail } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Inbox, type Email } from "@/components/mail-inbox"
import type { Dictionary } from "@/lib/i18n"

const STORAGE_KEY = "suko_saved_emails"

interface SavedEmail {
  address: string
  addedAt: number
}

interface EmailPageProps {
  dict: Dictionary
  lang: string
}

export function EmailPage({ dict, lang }: EmailPageProps) {
  const [inputEmail, setInputEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [savedEmails, setSavedEmails] = useState<SavedEmail[]>([])
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Load saved emails from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          setSavedEmails(JSON.parse(stored))
        } catch {
          // Invalid JSON, reset
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

  const fetchEmails = useCallback(async (fullAddress: string) => {
    const atIndex = fullAddress.lastIndexOf("@")
    if (atIndex === -1) throw new Error(dict.errors.invalidFormat)
    
    const user = fullAddress.slice(0, atIndex)
    const domain = fullAddress.slice(atIndex)

    const res = await fetch(
      `/api/check-mail?user=${encodeURIComponent(user)}&domain=${encodeURIComponent(domain)}`
    )
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || dict.errors.fetchError)
    }
    return dedupeEmails(data.emails as Email[])
  }, [dict.errors.invalidFormat, dict.errors.fetchError, dedupeEmails])

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
      // Fetch emails for this address
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
      // Add to saved emails
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
    // Update localStorage
    const remaining = savedEmails.filter(e => e.address !== address)
    if (remaining.length === 0) {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [selectedEmail, savedEmails])

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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader lang={lang} />

      <main className="flex flex-1 flex-col">
        {/* Header with title and input */}
        <div className="border-b border-border bg-card px-4 py-6">
          <div className="mx-auto max-w-7xl">
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {dict.hero.title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {dict.hero.subtitle}
              </p>
            </div>

            {/* Tutorial Section */}
            <div className="mx-auto max-w-2xl rounded-lg border border-border bg-background p-3 text-sm mb-4">
              <h3 className="mb-2 font-semibold text-foreground">{dict.hero.tutorialTitle}</h3>
              <ul className="space-y-1 text-muted-foreground">
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
            <div className="mx-auto max-w-xl">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inputEmail}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={dict.emailInput.placeholder}
                  className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label={dict.emailInput.ariaLabel}
                />
                <button
                  onClick={handleAddEmail}
                  disabled={loading || !inputEmail.trim()}
                  className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? dict.emailInput.loading : dict.emailInput.submit}
                </button>
              </div>
              {error && (
                <p className="mt-2 text-sm text-destructive">{error}</p>
              )}
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="flex flex-1 flex-col lg:flex-row">
          {/* Left Sidebar - Saved Emails */}
          <div className="w-full border-b border-border bg-card lg:w-80 lg:border-b-0 lg:border-r">
            <div className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                {dict.sidebar.title}
              </h2>
              
              {savedEmails.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center">
                  <Mail className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {dict.sidebar.noSavedEmails}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {dict.sidebar.addEmailPrompt}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedEmails.map((saved) => (
                    <div
                      key={saved.address}
                      className={`group relative rounded-lg border p-3 transition-colors cursor-pointer ${
                        selectedEmail === saved.address
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                      onClick={() => handleSelectEmail(saved.address)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {saved.address}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {dict.sidebar.online}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2 flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopyEmail(saved.address)
                          }}
                          className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label={dict.emailInput.copyAriaLabel}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectEmail(saved.address)
                          }}
                          className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label={dict.sidebar.recheck}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveEmail(saved.address)
                          }}
                          className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label={dict.sidebar.remove}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Inbox */}
          <div className="flex-1 p-4">
            {selectedEmail ? (
              <div className="h-full">
                {/* Selected Email Header */}
                <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyEmail(selectedEmail)}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label={dict.emailInput.copyAriaLabel}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                      aria-label={dict.inbox.refreshAriaLabel}
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* Status Message */}
                {statusMessage && (
                  <div className="mb-4 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                    {statusMessage}
                  </div>
                )}

                {/* Inbox */}
                <Inbox
                  emails={emails}
                  activeEmail={selectedEmail.split("@")[0]}
                  activeDomain={"@" + selectedEmail.split("@")[1]}
                  hasSearched={true}
                  isLoading={loading}
                  isRefreshing={refreshing}
                  isPolling={false}
                  statusMessage={null}
                  countdown={0}
                  onRefresh={handleRefresh}
                  dict={dict}
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Mail className="mx-auto h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-4 text-lg font-medium text-muted-foreground">
                    {dict.inbox.noEmailSelected}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground/70">
                    {dict.inbox.enterEmailPrompt}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        <p>{dict.footer.text}</p>
      </footer>
    </div>
  )
}
