"use client"

import { useState, useCallback } from "react"
import { SiteHeader } from "@/components/site-header"
import { EmailInput } from "@/components/email-input"
import { Inbox, type Email } from "@/components/inbox"

export default function Page() {
  const [username, setUsername] = useState("")
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(false)
  const [activeEmail, setActiveEmail] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleCheckMail = useCallback(async () => {
    if (!username.trim()) return

    setLoading(true)
    setHasSearched(true)

    try {
      const response = await fetch(`/api/check-mail?user=${encodeURIComponent(username.trim())}`)
      const data = await response.json()
      setEmails(data.emails || [])
      setActiveEmail(username.trim())
    } catch {
      setEmails([])
    } finally {
      setLoading(false)
    }
  }, [username])

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
              Receive emails instantly at your own @sukospot.shop address
            </p>
          </div>

          <EmailInput
            username={username}
            onUsernameChange={setUsername}
            onSubmit={handleCheckMail}
            loading={loading}
          />

          <Inbox emails={emails} activeEmail={activeEmail} hasSearched={hasSearched} />
        </div>
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        <p>SuKo Shop &middot; Temporary email service &middot; All messages are automatically deleted after 24 hours</p>
      </footer>
    </div>
  )
}
