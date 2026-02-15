"use client"

import { Loader2 } from "lucide-react"

interface EmailInputProps {
  username: string
  onUsernameChange: (value: string) => void
  onSubmit: () => void
  loading: boolean
}

export function EmailInput({ username, onUsernameChange, onSubmit, loading }: EmailInputProps) {
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
            className="flex-1 bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            aria-label="Email username"
          />
          <span className="shrink-0 border-l border-border bg-muted px-3 py-3 text-xs font-medium text-muted-foreground">
            @sukospot.shop
          </span>
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
