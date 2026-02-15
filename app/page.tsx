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
  const [activeEmail, setActiveEmail] = useState<string | null>(null)
  const [activeDomain, setActiveDomain] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleCheckMail = useCallback(async () => {
    const trimmed = email.trim()
    if (!trimmed) return

    // Validate "@" presence
    const atIndex = trimmed.lastIndexOf("@")
    if (atIndex === -1) {
      setError("Invalid email format")
      return
    }

    const user = trimmed.slice(0, atIndex)
    const domain = trimmed.slice(atIndex) // includes the "@"

    // Validate user part is not empty
    if (!user) {
      setError("Please enter a username before the @ symbol")
      return
    }

    // Validate domain against supported list
    if (!SUPPORTED_DOMAINS.includes(domain as (typeof SUPPORTED_DOMAINS)[number])) {
      setError(
        `Unsupported domain. Supported: ${SUPPORTED_DOMAINS.join(", ")}`
      )
      return
    }

    setError(null)
    setLoading(true)
    setHasSearched(true)

    try {
      const response = await fetch(
        `/api/check-mail?user=${encodeURIComponent(user)}&domain=${encodeURIComponent(domain)}`
      )
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to fetch emails. Please try again.")
        setEmails([])
        return
      }

      setEmails(data.emails || [])
      setActiveEmail(user)
      setActiveDomain(domain)
    } catch {
      setError("Network error. Please check your connection and try again.")
      setEmails([])
    } finally {
      setLoading(false)
    }
  }, [email])

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
              Temporary Email Inbox
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Receive emails instantly at your temporary address
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
            activeEmail={activeEmail}
            activeDomain={activeDomain}
            hasSearched={hasSearched}
          />
        </div>
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        <p>SuKo Shop &middot; Temporary email service &middot; All messages are automatically deleted after 24 hours</p>
      </footer>
    </div>
  )
}
