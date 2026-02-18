"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import { SiteHeader } from "@/components/site-header"
import { EmailInput, ROOT_DOMAINS, isSupportedDomain } from "@/components/email-input"
import { Inbox, type Email } from "@/components/mail-inbox"

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

function showBrowserNotification(subject: string, from: string) {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    new Notification("Novo email recebido!", {
      body: `De: ${from}\n${subject}`,
      icon: "/favicon.ico",
    })
  }
}

export default function Page() {
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

  useEffect(() => { activeUserRef.current = activeUser }, [activeUser])
  useEffect(() => { activeDomainRef.current = activeDomain }, [activeDomain])
  useEffect(() => { emailsRef.current = emails }, [emails])

  // Ask for notification permission once
  useEffect(() => {
    requestNotificationPermission()
  }, [])

  const fetchEmails = useCallback(async (user: string, domain: string) => {
    const res = await fetch(
      `/api/check-mail?user=${encodeURIComponent(user)}&domain=${encodeURIComponent(domain)}`
    )
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || "Erro ao buscar emails. Tente novamente.")
    }
    return data.emails as Email[]
  }, [])

  // Check for new emails and notify
  const checkForNewEmails = useCallback((prev: Email[], next: Email[]) => {
    const prevIds = new Set(prev.map((e) => e.id))
    const newEmails = next.filter((e) => !prevIds.has(e.id))

    if (newEmails.length > 0) {
      playNotificationSound()
      const first = newEmails[0]
      showBrowserNotification(first.subject, first.from)
      toast.success(`${newEmails.length} novo${newEmails.length > 1 ? "s" : ""} email${newEmails.length > 1 ? "s" : ""}!`, {
        description: first.subject,
      })
    }

    return newEmails.length > 0
  }, [])

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
      setError("Formato de email invalido. Use usuario@dominio.sukospot.shop")
      return
    }

    const user = trimmed.slice(0, atIndex)
    const domain = trimmed.slice(atIndex)

    if (!user) {
      setError("Digite um nome de usuario antes do @")
      return
    }

    if (!isSupportedDomain(domain)) {
      setError(
        `Dominio nao suportado. Use subdominos de: ${ROOT_DOMAINS.map((d) => `@${d}`).join(", ")}`
      )
      return
    }

    setError(null)
    setLoading(true)
    setHasSearched(true)
    setStatusMessage(null)

    try {
      const result = await fetchEmails(user, domain)
      setLoading(false)
      setEmails(result)
      setActiveUser(user)
      setActiveDomain(domain)
      setStatusMessage("Caixa de entrada atualizada")
      setTimeout(() => setStatusMessage(null), 3000)
    } catch (err) {
      setLoading(false)
      setError(err instanceof Error ? err.message : "Erro ao buscar emails.")
      setEmails([])
    }
  }, [email, fetchEmails])

  const handleManualRefresh = useCallback(async () => {
    if (!activeUser || !activeDomain) return

    setRefreshing(true)
    setCountdown(POLL_SECONDS)
    setStatusMessage("Verificando novos emails...")

    try {
      const result = await fetchEmails(activeUser, activeDomain)
      setRefreshing(false)
      checkForNewEmails(emails, result)
      setEmails(result)
      setStatusMessage("Caixa de entrada atualizada")
      setTimeout(() => setStatusMessage(null), 3000)
    } catch (err) {
      setRefreshing(false)
      setStatusMessage(err instanceof Error ? err.message : "Erro ao atualizar.")
      setTimeout(() => setStatusMessage(null), 5000)
    }
  }, [activeUser, activeDomain, fetchEmails, emails, checkForNewEmails])

  const handleEmailChange = useCallback((value: string) => {
    setEmail(value)
    if (error) setError(null)
  }, [error])

  const activeAddress = activeUser && activeDomain ? `${activeUser}${activeDomain}` : null

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex flex-1 items-start justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center">
            <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Email Temporario SuKo
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Receba emails instantaneamente nos seus dominios.
            </p>
          </div>

          <EmailInput
            email={email}
            error={error}
            activeAddress={activeAddress}
            onEmailChange={handleEmailChange}
            onSubmit={handleCheckMail}
            loading={loading}
          />

          <Inbox
            emails={emails}
            activeEmail={activeUser}
            activeDomain={activeDomain}
            hasSearched={hasSearched}
            isRefreshing={refreshing}
            isPolling={isPolling}
            statusMessage={statusMessage}
            countdown={countdown}
            onRefresh={handleManualRefresh}
          />
        </div>
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        <p>SuKo Shop &middot; Servico de email temporario &middot; Todas as mensagens sao excluidas automaticamente apos 24 horas</p>
      </footer>
    </div>
  )
}
