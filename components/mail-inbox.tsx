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
  fetchError: string | null
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
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(400)
  const blobUrl = useRef<string | null>(null)

  const isHtml = /<html|<body|<div|<table|<p\b/i.test(html)

  useEffect(() => {
    if (!isHtml) return
    const iframe = iframeRef.current
    if (!iframe) return

    // Revoke previous blob URL
    if (blobUrl.current) URL.revokeObjectURL(blobUrl.current)

    // Strip only scripts and event handlers; keep all styles so email renders correctly
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/\son\w+="[^"]*"/gi, "")
      .replace(/\son\w+='[^']*'/gi, "")
      .replace(/href="javascript:[^"]*"/gi, 'href="#"')

    const blob = new Blob([stripped], { type: "text/html; charset=utf-8" })
    const url  = URL.createObjectURL(blob)
    blobUrl.current = url
    iframe.src = url

    const onLoad = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document
        if (doc?.body) {
          setHeight(Math.max(300, doc.body.scrollHeight + 40))
        }
      } catch { /* cross-origin guard */ }
    }

    iframe.addEventListener("load", onLoad)
    return () => {
      iframe.removeEventListener("load", onLoad)
      URL.revokeObjectURL(url)
    }
  }, [html, isHtml])

  if (!isHtml) {
    return (
      <div className="overflow-hidden rounded-lg bg-muted p-4">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
          {html}
        </pre>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <iframe
        ref={iframeRef}
        style={{ width: "100%", height, border: "none", display: "block" }}
        title="Email content"
      />
    </div>
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

function EmptyState({ hasSearched }: { hasSearched: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className="mb-4 flex h-20 w-20 items-center justify-center rounded-full"
        style={{ background: "#0ff1", boxShadow: "0 0 20px #0ff3" }}
      >
        <Mail className="h-10 w-10" style={{ color: "#0ff", filter: "drop-shadow(0 0 6px #0ff)" }} />
      </div>
      <h3 className="mb-2 text-base font-bold" style={{ color: "#0ff" }}>
        {hasSearched ? "Nenhum email ainda" : "Nenhum email selecionado"}
      </h3>
      <p className="max-w-xs text-sm text-muted-foreground">
        {hasSearched
          ? "Manda um email de teste pro endereco acima e clique em Atualizar."
          : "Digite um email e clique em Acessar Email para ver a inbox."}
      </p>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className="mb-4 flex h-20 w-20 items-center justify-center rounded-full"
        style={{ background: "#f0f1", boxShadow: "0 0 20px #f0f3" }}
      >
        <Mail className="h-10 w-10" style={{ color: "#f0f", filter: "drop-shadow(0 0 6px #f0f)" }} />
      </div>
      <h3 className="mb-2 text-base font-bold" style={{ color: "#f0f" }}>
        Erro ao carregar emails
      </h3>
      <p className="mb-4 max-w-xs text-sm text-muted-foreground">{message}</p>
      <button
        onClick={onRetry}
        className="rounded-md border px-4 py-1.5 text-xs font-semibold transition-colors hover:opacity-80"
        style={{ borderColor: "#f0f", color: "#f0f", boxShadow: "0 0 8px #f0f4" }}
      >
        Tentar novamente
      </button>
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
  statusMessage,
  fetchError,
  onRefresh,
  dict,
}: InboxProps) {
  return (
    <div
      className="overflow-hidden rounded-xl bg-card shadow-lg"
      style={{ border: "1px solid #0ff4", boxShadow: "0 0 18px #0ff1" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3"
        style={{ borderBottom: "1px solid #0ff3" }}
      >
        <h3
          className="text-sm font-bold tracking-wide"
          style={{ color: "#0ff", textShadow: "0 0 8px #0ff8" }}
        >
          {dict.inbox.title}
        </h3>
        {activeEmail && activeDomain && (
          <span
            className="rounded-full px-3 py-0.5 font-mono text-xs"
            style={{ background: "#0ff1", color: "#0ff", border: "1px solid #0ff4" }}
          >
            {activeEmail}{activeDomain}
          </span>
        )}
        {emails.length > 0 && (
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
            style={{ background: "#0ff", color: "#000" }}
          >
            {emails.length}
          </span>
        )}
        {activeEmail && (
          <div className="ml-auto flex items-center gap-3">
            {statusMessage && (
              <span className="text-xs text-muted-foreground">{statusMessage}</span>
            )}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-80"
              style={{ border: "1px solid #0ff6", color: "#0ff", boxShadow: "0 0 6px #0ff3" }}
              aria-label={dict.inbox.refreshAriaLabel}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">
                {isRefreshing ? dict.inbox.refreshing : dict.inbox.refresh}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Loader2
            className="mb-4 h-10 w-10 animate-spin"
            style={{ color: "#0ff", filter: "drop-shadow(0 0 6px #0ff)" }}
          />
          <p className="text-sm" style={{ color: "#0ff9" }}>{dict.inbox.searching}</p>
        </div>
      ) : fetchError ? (
        <ErrorState message={fetchError} onRetry={onRefresh} />
      ) : emails.length === 0 ? (
        <EmptyState hasSearched={hasSearched} />
      ) : (
        <div className="divide-y" style={{ borderColor: "#0ff2" }}>
          {emails.map((email, index) => (
            <EmailItem key={`${email.id}-${index}`} email={email} dict={dict} />
          ))}
        </div>
      )}
    </div>
  )
}
