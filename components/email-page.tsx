"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import { AlertTriangle, ExternalLink, X } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { EmailInput, ROOT_DOMAINS, isSupportedDomain } from "@/components/email-input"
import { Inbox, type Email } from "@/components/mail-inbox"
import type { Dictionary } from "@/lib/i18n"

const POLL_SECONDS = 10

// Generate a short notification sound using Web Audio API
function playNotificationSound() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = "sine"
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  } catch {
    // Audio not supported or blocked
  }
}

function requestNotificationPermission() {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
    Notification.requestPermission()
  }
}

const NEW_URL = "https://tempmailsuko.shop/"

function MigrationModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 text-white rounded-xl p-6 max-w-md w-full text-center relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="flex justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
        </div>
        
        <h2 className="text-xl font-bold mb-2">Mudamos de Endereco!</h2>
        <p className="text-zinc-400 mb-6">
          O painel de E-mail Temporario da SuKoShop mudou para um link oficial mais rapido. Salve o novo link!
        </p>
        
        <a
          href={NEW_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white w-full py-3 rounded-lg font-medium transition-colors mb-3"
        >
          <ExternalLink className="h-4 w-4" />
          Acessar Novo Site
        </a>
        
        <button
          onClick={onClose}
          className="w-full py-3 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors font-medium"
        >
          Continuar no site antigo
        </button>
      </div>
    </div>
  )
}

interface EmailPageProps {
  dict: Dictionary
  lang: string
}

export function EmailPage({ dict, lang }: EmailPageProps) {
  const [showModal, setShowModal] = useState(true)
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [activeUser, setActiveUser] = useState<string | null>(null)
  const [activeDomain, setActiveDomain] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(POLL_SECONDS)

  // Refs to avoid stale closures in the interval
  const activeUserRef = useRef(activeUser)
  const activeDomainRef = useRef(activeDomain)
  const emailsRef = useRef(emails)
  const fetchingRef = useRef(false)
  const dictRef = useRef(dict)

  useEffect(() => { activeUserRef.current = activeUser }, [activeUser])
  useEffect(() => { activeDomainRef.current = activeDomain }, [activeDomain])
  useEffect(() => { emailsRef.current = emails }, [emails])
  useEffect(() => { dictRef.current = dict }, [dict])

  // Ask for notification permission once
  useEffect(() => {
    requestNotificationPermission()
  }, [])

  function showBrowserNotification(subject: string, from: string) {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification(dict.notifications.newEmailBrowser, {
        body: `${dict.notifications.from}: ${from}\n${subject}`,
        icon: "/favicon.ico",
      })
    }
  }

  const fetchEmails = useCallback(async (user: string, domain: string) => {
    const res = await fetch(
      `/api/check-mail?user=${encodeURIComponent(user)}&domain=${encodeURIComponent(domain)}`
    )
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || dict.errors.fetchError)
    }
    return data.emails as Email[]
  }, [dict.errors.fetchError])

  // Check for new emails and notify
  const checkForNewEmails = useCallback((prev: Email[], next: Email[]) => {
    const prevIds = new Set(prev.map((e) => e.id))
    const newEmails = next.filter((e) => !prevIds.has(e.id))

    if (newEmails.length > 0) {
      playNotificationSound()
      const first = newEmails[0]
      showBrowserNotification(first.subject, first.from)
      const msg =
        newEmails.length === 1
          ? dictRef.current.notifications.newEmailToastOne
          : dictRef.current.notifications.newEmailToastMany.replace("{count}", String(newEmails.length))
      toast.success(msg, {
        description: first.subject,
      })
    }

    return newEmails.length > 0
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dict])

  // Auto-poll: countdown every second, fetch when it reaches 0
  useEffect(() => {
    if (!activeUser || !activeDomain) return

    setCountdown(POLL_SECONDS)

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (!fetchingRef.current && activeUserRef.current && activeDomainRef.current) {
            fetchingRef.current = true
            setIsPolling(true)
            fetchEmails(activeUserRef.current, activeDomainRef.current)
              .then((result) => {
                const currentIds = emailsRef.current.map((e) => e.id).join(",")
                const newIds = result.map((e) => e.id).join(",")
                if (currentIds !== newIds) {
                  checkForNewEmails(emailsRef.current, result)
                  setEmails(result)
                }
              })
              .catch(() => {
                // Silent fail on background poll
              })
              .finally(() => {
                fetchingRef.current = false
                setIsPolling(false)
              })
          }
          return POLL_SECONDS
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [activeUser, activeDomain, fetchEmails, checkForNewEmails])

  const handleCheckMail = useCallback(async () => {
    const trimmed = email.trim()
    if (!trimmed) return

    const atIndex = trimmed.lastIndexOf("@")
    if (atIndex === -1) {
      setError(dict.errors.invalidFormat)
      return
    }

    const user = trimmed.slice(0, atIndex)
    const domain = trimmed.slice(atIndex)

    if (!user) {
      setError(dict.errors.noUsername)
      return
    }

    if (!isSupportedDomain(domain)) {
      setError(
        `${dict.errors.unsupportedDomain} ${ROOT_DOMAINS.map((d) => `@${d}`).join(", ")}`
      )
      return
    }

    setError(null)
    setLoading(true)
    setStatusMessage(null)

    try {
      const result = await fetchEmails(user, domain)
      setLoading(false)
      setHasSearched(true)
      setEmails(result)
      setActiveUser(user)
      setActiveDomain(domain)
      setStatusMessage(dict.status.inboxUpdated)
      setTimeout(() => setStatusMessage(null), 3000)
    } catch (err) {
      setLoading(false)
      setError(err instanceof Error ? err.message : dict.errors.genericError)
      setEmails([])
    }
  }, [email, fetchEmails, dict])

  const handleManualRefresh = useCallback(async () => {
    if (!activeUser || !activeDomain) return

    setRefreshing(true)
    setCountdown(POLL_SECONDS)
    setStatusMessage(dict.status.checkingNewEmails)

    try {
      const result = await fetchEmails(activeUser, activeDomain)
      setRefreshing(false)
      checkForNewEmails(emails, result)
      setEmails(result)
      setStatusMessage(dict.status.inboxUpdated)
      setTimeout(() => setStatusMessage(null), 3000)
    } catch (err) {
      setRefreshing(false)
      setStatusMessage(err instanceof Error ? err.message : dict.errors.updateError)
      setTimeout(() => setStatusMessage(null), 5000)
    }
  }, [activeUser, activeDomain, fetchEmails, emails, checkForNewEmails, dict])

  const handleEmailChange = useCallback((value: string) => {
    setEmail(value)
    if (error) setError(null)
  }, [error])

  const activeAddress = activeUser && activeDomain ? `${activeUser}${activeDomain}` : null

  return (
    <div className="flex min-h-screen flex-col">
      {showModal && <MigrationModal onClose={() => setShowModal(false)} />}
      <SiteHeader lang={lang} />

      <main className="flex flex-1 items-start justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center">
            <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {dict.hero.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {dict.hero.subtitle}
            </p>
          </div>

          <EmailInput
            email={email}
            error={error}
            activeAddress={activeAddress}
            onEmailChange={handleEmailChange}
            onSubmit={handleCheckMail}
            loading={loading}
            dict={dict}
          />

          <Inbox
            emails={emails}
            activeEmail={activeUser}
            activeDomain={activeDomain}
            hasSearched={hasSearched}
            isLoading={loading}
            isRefreshing={refreshing}
            isPolling={isPolling}
            statusMessage={statusMessage}
            countdown={countdown}
            onRefresh={handleManualRefresh}
            dict={dict}
          />
        </div>
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        <p>{dict.footer.text}</p>
      </footer>
    </div>
  )
}
