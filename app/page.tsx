"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import useSWR from "swr"
import { SiteHeader } from "@/components/site-header"
import { EmailInput, SUPPORTED_DOMAINS } from "@/components/email-input"
import { Inbox, type Email } from "@/components/inbox"

const POLL_INTERVAL = 5

interface MailApiResponse {
  emails: Email[]
  user: string
  domain: string
  error?: string
}

const fetcher = async (url: string): Promise<MailApiResponse> => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || "Erro ao buscar emails. Tente novamente.")
  }
  return data
}

export default function Page() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeUser, setActiveUser] = useState<string | null>(null)
  const [activeDomain, setActiveDomain] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [countdown, setCountdown] = useState(POLL_INTERVAL)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // SWR key: only fetch when we have an active user+domain
  const swrKey =
    activeUser && activeDomain
      ? `/api/check-mail?user=${encodeURIComponent(activeUser)}&domain=${encodeURIComponent(activeDomain)}`
      : null

  const { data, error: swrError, isValidating, mutate } = useSWR<MailApiResponse>(
    swrKey,
    fetcher,
    {
      refreshInterval: POLL_INTERVAL * 1000,
      revalidateOnFocus: false,
      dedupingInterval: 2000,
    }
  )

  // Countdown timer that resets every POLL_INTERVAL seconds
  useEffect(() => {
    if (!swrKey) {
      setCountdown(POLL_INTERVAL)
      return
    }

    // Reset countdown
    setCountdown(POLL_INTERVAL)

    if (countdownRef.current) clearInterval(countdownRef.current)

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return POLL_INTERVAL
        return prev - 1
      })
    }, 1000)

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [swrKey, data])

  // Surface SWR errors to the error state
  useEffect(() => {
    if (swrError) {
      setError(swrError.message)
    }
  }, [swrError])

  const emails: Email[] = data?.emails || []

  const handleCheckMail = useCallback(async () => {
    const trimmed = email.trim()
    if (!trimmed) return

    const atIndex = trimmed.lastIndexOf("@")
    if (atIndex === -1) {
      setError("Formato de email invalido. Use @dominio.shop")
      return
    }

    const user = trimmed.slice(0, atIndex)
    const domain = trimmed.slice(atIndex)

    if (!user) {
      setError("Digite um nome de usuario antes do @")
      return
    }

    if (!SUPPORTED_DOMAINS.includes(domain as (typeof SUPPORTED_DOMAINS)[number])) {
      setError(
        `Dominio nao suportado. Disponiveis: ${SUPPORTED_DOMAINS.join(", ")}`
      )
      return
    }

    setError(null)
    setLoading(true)
    setHasSearched(true)

    // Set the active user/domain so SWR starts fetching
    setActiveUser(user)
    setActiveDomain(domain)

    try {
      // First fetch immediately via SWR mutate
      await mutate()
    } catch {
      // SWR error handler above will catch this
    } finally {
      setLoading(false)
    }
  }, [email, mutate])

  const handleManualRefresh = useCallback(async () => {
    if (!swrKey) return
    setCountdown(POLL_INTERVAL)
    await mutate()
  }, [swrKey, mutate])

  const handleEmailChange = useCallback((value: string) => {
    setEmail(value)
    if (error) setError(null)
  }, [error])

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
            onEmailChange={handleEmailChange}
            onSubmit={handleCheckMail}
            loading={loading}
          />

          <Inbox
            emails={emails}
            activeEmail={activeUser}
            activeDomain={activeDomain}
            hasSearched={hasSearched}
            isRefreshing={isValidating}
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
