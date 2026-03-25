"use client"

import { useState, useRef, useEffect } from "react"
import {
  ChevronDown,
  Clock,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  Mail,
  MailOpen,
  Paperclip,
  RefreshCw,
  User,
} from "lucide-react"
import type { Dictionary } from "@/lib/i18n"

export interface Attachment {
  filename: string
  contentType: string
  size: number
  content: string
}

export interface Email {
  id: string
  from: string
  subject: string
  date: string
  body: string
  attachments?: Attachment[]
  account?: string // "cursor" or "ultra" - identifies which mailbox the email came from
}

interface InboxProps {
  emails: Email[]
  activeEmail: string | null
  activeDomain: string | null
  hasSearched: boolean
  isLoading: boolean
  isRefreshing: boolean
  isPolling: boolean
  statusMessage: string | null
  countdown: number
  onRefresh: () => void
  dict: Dictionary
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getFileIcon(contentType: string) {
  if (contentType.startsWith("image/")) return ImageIcon
  return FileText
}

function downloadAttachment(att: Attachment) {
  const byteChars = atob(att.content)
  const byteNumbers = new Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: att.contentType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = att.filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function SafeHtmlContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || typeof window === "undefined") return

    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")

    doc
      .querySelectorAll("script,iframe,object,embed,form,input,textarea")
      .forEach((el) => el.remove())

    doc.querySelectorAll("*").forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        if (
          attr.name.startsWith("on") ||
          attr.value.trim().toLowerCase().startsWith("javascript:")
        ) {
          el.removeAttribute(attr.name)
        }
      })
    })

    doc.querySelectorAll("a").forEach((link) => {
      link.setAttribute("target", "_blank")
      link.setAttribute("rel", "noopener noreferrer")
    })

    ref.current.innerHTML = doc.body.innerHTML
  }, [html])

  return (
    <div
      ref={ref}
      className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed text-card-foreground/80 [&_a]:text-accent [&_a]:underline [&_img]:max-w-full [&_img]:rounded-md"
    />
  )
}

function AttachmentList({ attachments, dict }: { attachments: Attachment[]; dict: Dictionary }) {
  if (!attachments.length) return null
  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Paperclip className="h-3 w-3" />
        {attachments.length}{" "}
        {attachments.length > 1 ? dict.inbox.attachments : dict.inbox.attachment}
      </div>
      <div className="flex flex-col gap-2">
        {attachments.map((att, i) => {
          const Icon = getFileIcon(att.contentType)
          return (
            <button
              key={i}
              onClick={() => downloadAttachment(att)}
              className="flex items-center gap-3 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-left transition-colors hover:bg-secondary"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/20">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-card-foreground">
                  {att.filename}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatBytes(att.size)}
                </p>
              </div>
              <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function EmptyState({ hasSearched, dict }: { hasSearched: boolean; dict: Dictionary }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
        <Mail className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-card-foreground">
        {hasSearched ? dict.inbox.noEmailsFound : dict.inbox.noEmailSelected}
      </h3>
      <p className="max-w-xs text-sm text-muted-foreground">
        {hasSearched
          ? dict.inbox.emptyInbox
          : dict.inbox.enterEmailPrompt}
      </p>
    </div>
  )
}

function EmailItem({ email, dict }: { email: Email; dict: Dictionary }) {
  const [expanded, setExpanded] = useState(false)
  const hasAttachments = email.attachments && email.attachments.length > 0

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
            <span className="truncate text-sm font-semibold text-card-foreground">
              {email.from}
            </span>
            <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              {hasAttachments && <Paperclip className="h-3 w-3" />}
              <Clock className="h-3 w-3" />
              <span>{email.date}</span>
            </div>
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {email.subject}
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && (
        <div className="border-t border-border bg-secondary/30 px-5 py-4">
          <SafeHtmlContent html={email.body} />
          {hasAttachments && <AttachmentList attachments={email.attachments!} dict={dict} />}
        </div>
      )}
    </div>
  )
}

export function Inbox({
  emails,
  activeEmail,
  activeDomain,
  hasSearched,
  isLoading,
  isRefreshing,
  isPolling,
  statusMessage,
  countdown,
  onRefresh,
  dict,
}: InboxProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <h3 className="text-sm font-semibold text-card-foreground">
          {dict.inbox.title}
        </h3>
        {activeEmail && activeDomain && (
          <span className="rounded-full bg-secondary px-3 py-0.5 font-mono text-xs text-muted-foreground">
            {activeEmail}
            {activeDomain}
          </span>
        )}
        {emails.length > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
            {emails.length}
          </span>
        )}
        {activeEmail && (
          <div className="ml-auto flex items-center gap-3">
            {statusMessage ? (
              <span className="text-xs text-muted-foreground">
                {statusMessage}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {isPolling ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-accent" />
                    <span>{dict.inbox.checking}</span>
                  </>
                ) : (
                  <>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                    </span>
                    {`${dict.inbox.updatesIn} `}
                    {countdown}
                    {dict.inbox.seconds}
                  </>
                )}
              </span>
            )}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={dict.inbox.refreshAriaLabel}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">
                {isRefreshing ? dict.inbox.refreshing : dict.inbox.refresh}
              </span>
            </button>
          </div>
        )}
      </div>

      {activeEmail && (
        <div className="flex items-start gap-2.5 border-b border-border bg-amber-950/30 px-5 py-3">
          <span className="mt-0.5 shrink-0 text-sm text-amber-400" aria-hidden="true">
            {"⚠"}
          </span>
          <p className="text-xs leading-relaxed text-amber-200/80">
            {dict.inbox.warning}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{dict.inbox.searching}</p>
        </div>
      ) : emails.length === 0 ? (
        <EmptyState hasSearched={hasSearched} dict={dict} />
      ) : (
        <div className="divide-y divide-border">
          {emails.map((email, index) => (
            <EmailItem key={`${email.id}-${index}`} email={email} dict={dict} />
          ))}
        </div>
      )}
    </div>
  )
}
