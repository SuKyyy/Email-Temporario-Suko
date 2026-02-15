"use client"

import { useState, useCallback } from "react"
import { SiteHeader } from "@/components/site-header"
import { EmailInput, SUPPORTED_DOMAINS } from "@/components/email-input"
import { Inbox, type Email } from "@/components/inbox"

export default function Page() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activeUser, setActiveUser] = useState<string | null>(null)
  const [activeDomain, setActiveDomain] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

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
    setStatusMessage(null)

    try {
      const result = await fetchEmails(user, domain)
      setEmails(result)
      setActiveUser(user)
      setActiveDomain(domain)
      setStatusMessage("Caixa de entrada atualizada")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar emails.")
      setEmails([])
    } finally {
      setLoading(false)
      setTimeout(() => setStatusMessage(null), 3000)
    }
  }, [email, fetchEmails])

  const handleManualRefresh = useCallback(async () => {
    if (!activeUser || !activeDomain) return

    setRefreshing(true)
    setStatusMessage("Verificando novos emails...")

    try {
      const result = await fetchEmails(activeUser, activeDomain)
      setEmails(result)
      setStatusMessage("Caixa de entrada atualizada")
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Erro ao atualizar.")
    } finally {
      setRefreshing(false)
      setTimeout(() => setStatusMessage(null), 3000)
    }
  }, [activeUser, activeDomain, fetchEmails])

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
            isRefreshing={refreshing}
            statusMessage={statusMessage}
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
