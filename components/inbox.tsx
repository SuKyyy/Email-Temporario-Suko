"use client"

import { useState } from "react"
import { ChevronDown, Clock, Mail, MailOpen, RefreshCw, User } from "lucide-react"

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
  activeDomain: string | null
  hasSearched: boolean
  isRefreshing: boolean
  statusMessage: string | null
  countdown: number
  onRefresh: () => void
}

function EmptyState({ hasSearched }: { hasSearched: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
        <Mail className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-card-foreground">
        {hasSearched ? "Nenhum email encontrado" : "Nenhum email selecionado"}
      </h3>
      <p className="max-w-xs text-sm text-muted-foreground">
        {hasSearched
          ? "Sua caixa de entrada esta vazia. Novas mensagens aparecerao aqui automaticamente."
          : "Digite um email acima e clique em 'Acessar Email' para verificar sua caixa de entrada."}
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

export function Inbox({ emails, activeEmail, activeDomain, hasSearched, isRefreshing, statusMessage, countdown, onRefresh }: InboxProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <h3 className="text-sm font-semibold text-card-foreground">Caixa de Entrada</h3>
        {activeEmail && activeDomain && (
          <span className="rounded-full bg-secondary px-3 py-0.5 font-mono text-xs text-muted-foreground">
            {activeEmail}{activeDomain}
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
              <span className="text-xs text-muted-foreground">{statusMessage}</span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                </span>
                Atualiza em {countdown}s
              </span>
            )}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Atualizar caixa de entrada"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{isRefreshing ? "Atualizando..." : "Atualizar"}</span>
            </button>
          </div>
        )}
      </div>

      {activeEmail && (
        <div className="flex items-start gap-2.5 border-b border-border bg-amber-950/30 px-5 py-3">
          <span className="mt-0.5 shrink-0 text-sm text-amber-400" aria-hidden="true">&#9888;</span>
          <p className="text-xs leading-relaxed text-amber-200/80">
            Emails podem levar de 15 a 30 segundos para chegar devido ao processamento do servidor. Se nao encontrar, aguarde um momento e clique em Atualizar.
          </p>
        </div>
      )}

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
