"use client"

import { Loader2 } from "lucide-react"

export const SUPPORTED_DOMAINS = [
  "@sukospot.shop",
  "@sukodocursor.shop",
  "@sukoultra.shop",
  "@sukov0dev.shop",
] as const

interface EmailInputProps {
  email: string
  error: string | null
  onEmailChange: (value: string) => void
  onSubmit: () => void
  loading: boolean
}

export function EmailInput({
  email,
  error,
  onEmailChange,
  onSubmit,
  loading,
}: EmailInputProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-lg">
      <h2 className="mb-1 text-xl font-bold text-card-foreground">Access Your Mailbox</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Enter your full email address to check your inbox
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1.5">
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && email.trim()) onSubmit()
            }}
            placeholder="Enter full email address (e.g., user@sukospot.shop)"
            className={`w-full rounded-lg border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 ${
              error ? "border-destructive" : "border-border"
            }`}
            aria-label="Full email address"
            aria-invalid={!!error}
            aria-describedby={error ? "email-error" : undefined}
          />
          {error && (
            <p id="email-error" className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <button
          onClick={onSubmit}
          disabled={!email.trim() || loading}
          className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
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
