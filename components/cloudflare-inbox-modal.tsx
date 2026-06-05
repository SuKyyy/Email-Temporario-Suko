"use client"

import { useState, useCallback } from "react"
import { X, RefreshCw, Mail, Loader2 } from "lucide-react"

const CF_API = "https://inbox-api.zukisukinho.workers.dev/inbox"

interface CfEmail {
  from: string
  subject: string
  date: string
  text: string
}

interface Props {
  email: string
  onClose: () => void
}

export function CloudflareInboxModal({ email, onClose }: Props) {
  const [emails, setEmails] = useState<CfEmail[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${CF_API}/${encodeURIComponent(email)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setEmails(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar")
    } finally {
      setLoading(false)
    }
  }, [email])

  // Load on first render
  useState(() => { load() })

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95"
      style={{ fontFamily: "monospace" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Rainbow border glow wrapper */}
      <div
        className="relative w-[94%] max-w-4xl rounded-xl"
        style={{
          background: "linear-gradient(135deg, #0ff, #f0f, #ff0, #0ff)",
          padding: "2px",
          boxShadow: "0 0 40px #0ff, 0 0 80px #f0f55",
        }}
      >
        <div
          className="flex max-h-[90vh] flex-col rounded-xl overflow-hidden"
          style={{ background: "#0a0a0a" }}
        >
          {/* Header */}
          <div
            className="flex shrink-0 items-center justify-between px-5 py-3"
            style={{
              background: "#0d0d0d",
              borderBottom: "1px solid #0ff3",
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Mail className="h-4 w-4 shrink-0" style={{ color: "#0ff" }} />
              <span className="text-sm font-bold" style={{ color: "#0ff" }}>
                INBOX:{" "}
              </span>
              <span
                className="truncate text-sm font-bold"
                style={{ color: "#ff0" }}
              >
                {email}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2 ml-3">
              <button
                onClick={load}
                disabled={loading}
                className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: "#0f0", color: "#000" }}
              >
                {loading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                ATUALIZAR
              </button>
              <button
                onClick={onClose}
                className="flex items-center gap-1 rounded px-3 py-1.5 text-xs font-bold transition-opacity hover:opacity-80"
                style={{ background: "#f00", color: "#fff" }}
              >
                <X className="h-3 w-3" />
                FECHAR
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading && !emails && (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2
                  className="h-10 w-10 animate-spin"
                  style={{ color: "#0ff" }}
                />
                <p className="mt-4 text-sm" style={{ color: "#ff0" }}>
                  Carregando emails...
                </p>
              </div>
            )}

            {error && (
              <p className="py-10 text-center text-sm" style={{ color: "#f00" }}>
                Erro ao carregar: {error}
              </p>
            )}

            {!loading && !error && emails !== null && emails.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Mail className="h-10 w-10 mb-4" style={{ color: "#0ff4" }} />
                <p className="text-sm" style={{ color: "#ff0" }}>
                  Nenhum email ainda.
                </p>
                <p className="mt-2 text-xs" style={{ color: "#888" }}>
                  Manda um email pra esse endereco e clica em ATUALIZAR.
                </p>
              </div>
            )}

            {emails && emails.length > 0 && (
              <div className="space-y-3">
                {emails.map((msg, i) => (
                  <EmailCard key={i} msg={msg} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function EmailCard({ msg }: { msg: CfEmail }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "#111",
        borderLeft: "4px solid #0ff",
      }}
    >
      <button
        className="w-full px-4 py-3 text-left transition-colors hover:bg-white/5"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-xs" style={{ color: "#aaa" }}>
              <span style={{ color: "#0ff" }}>De:</span>{" "}
              {msg.from || "Desconhecido"}
            </p>
            <p className="text-sm font-semibold" style={{ color: "#fff" }}>
              {msg.subject || "(sem assunto)"}
            </p>
          </div>
          <span
            className="shrink-0 text-xs"
            style={{ color: "#888" }}
          >
            {msg.date
              ? new Date(msg.date).toLocaleString("pt-BR")
              : ""}
          </span>
        </div>
      </button>

      {expanded && (
        <div
          className="border-t px-4 py-3"
          style={{ borderColor: "#0ff2" }}
        >
          <pre
            className="whitespace-pre-wrap break-words text-xs leading-relaxed"
            style={{
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "6px",
              color: "#0f0",
              maxHeight: "400px",
              overflowY: "auto",
              padding: "12px",
            }}
          >
            {msg.text || "Sem conteudo legivel"}
          </pre>
        </div>
      )}
    </div>
  )
}
