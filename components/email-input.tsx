"use client"

import { ChevronDown, Loader2 } from "lucide-react"

export const DOMAINS = [
  "@sukospot.shop",
  "@sukodocursor.shop",
  "@sukoultra.shop",
  "@sukov0dev.shop",
] as const

export type Domain = (typeof DOMAINS)[number]

interface EmailInputProps {
  username: string
  selectedDomain: Domain
  onUsernameChange: (value: string) => void
  onDomainChange: (value: Domain) => void
  onSubmit: () => void
  loading: boolean
}

export function EmailInput({
  username,
  selectedDomain,
  onUsernameChange,
  onDomainChange,
  onSubmit,
  loading,
}: EmailInputProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-lg">
      <h2 className="mb-1 text-xl font-bold text-card-foreground">Access Your Mailbox</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Enter your desired email address to check your inbox
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex flex-1 items-center overflow-hidden rounded-lg border border-border bg-secondary">
          <input
            type="text"
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && username.trim()) onSubmit()
            }}
            placeholder="Enter your desired email address"
            className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            aria-label="Email username"
          />
          <div className="relative shrink-0 border-l border-border bg-muted">
            <select
              value={selectedDomain}
              onChange={(e) => onDomainChange(e.target.value as Domain)}
              className="appearance-none bg-transparent py-3 pl-3 pr-8 text-xs font-medium text-muted-foreground focus:outline-none"
              aria-label="Select email domain"
            >
              {DOMAINS.map((domain) => (
                <option key={domain} value={domain} className="bg-card text-foreground">
                  {domain}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <button
          onClick={onSubmit}
          disabled={!username.trim() || loading}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Access mailbox"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            "Access Mailbox"
          )}
        </button>
      </div>
    </div>
  )
}
