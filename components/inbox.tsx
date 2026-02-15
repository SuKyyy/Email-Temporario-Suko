"use client"

import { useState } from "react"
import { ChevronDown, Clock, Mail, MailOpen, User } from "lucide-react"

export interface Email {
  id: string
  from: string
  subject: string
  date: string
  body: string
}

interface InboxProps {
  emails: Email[]
  activeEmail: string | null
  hasSearched: boolean
}

function EmptyState({ hasSearched }: { hasSearched: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
        <Mail className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-card-foreground">
        {hasSearched ? "No Emails Found" : "No Email Address Selected"}
      </h3>
      <p className="max-w-xs text-sm text-muted-foreground">
        {hasSearched
          ? "This inbox is empty. New messages will appear here automatically."
          : "Enter an email address above and click 'Access Mailbox' to check your inbox."}
      </p>
    </div>
  )
}

function EmailItem({ email }: { email: Email }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary/60"
        aria-expanded={expanded}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20">
          {expanded ? (
            <MailOpen className="h-4 w-4 text-primary" />
          ) : (
            <User className="h-4 w-4 text-primary" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-card-foreground">{email.from}</span>
            <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{email.date}</span>
            </div>
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{email.subject}</p>
        </div>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="border-t border-border bg-secondary/30 px-5 py-4">
          <div className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed text-card-foreground/80">
            <div dangerouslySetInnerHTML={{ __html: email.body }} />
          </div>
        </div>
      )}
    </div>
  )
}

export function Inbox({ emails, activeEmail, hasSearched }: InboxProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h3 className="text-sm font-semibold text-card-foreground">Inbox</h3>
        {activeEmail && (
          <span className="rounded-full bg-secondary px-3 py-0.5 font-mono text-xs text-muted-foreground">
            {activeEmail}@sukospot.shop
          </span>
        )}
        {emails.length > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
            {emails.length}
          </span>
        )}
      </div>

      {emails.length === 0 ? (
        <EmptyState hasSearched={hasSearched} />
      ) : (
        <div className="divide-y divide-border">
          {emails.map((email) => (
            <EmailItem key={email.id} email={email} />
          ))}
        </div>
      )}
    </div>
  )
}
