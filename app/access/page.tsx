"use client"

import { useSearchParams } from "next/navigation"
import { CheckCircle, XCircle, Copy, Check, ExternalLink } from "lucide-react"
import { useState, Suspense } from "react"
import { toast } from "sonner"

const DEFAULT_PASSWORD = "SUKO2026!?"

function AccessContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const email = searchParams.get("email")
  
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [copiedPassword, setCopiedPassword] = useState(false)

  const isValid = token && email

  const handleCopy = async (text: string, type: "email" | "password") => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === "email") {
        setCopiedEmail(true)
        setTimeout(() => setCopiedEmail(false), 2000)
      } else {
        setCopiedPassword(true)
        setTimeout(() => setCopiedPassword(false), 2000)
      }
      toast.success("Copiado!")
    } catch {
      toast.error("Erro ao copiar")
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#121212]">
      {/* Navbar */}
      <header className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: "#6b46c1" }}>
        <div className="flex items-center gap-6">
          <span className="text-xl font-bold tracking-tight text-white">SuKo Shop</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {isValid ? (
            // Success State
            <div className="rounded-xl border border-neutral-800 bg-[#1e1e1e] p-8 shadow-lg text-center">
              <div className="flex justify-center mb-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20">
                  <CheckCircle className="h-10 w-10 text-emerald-500" />
                </div>
              </div>

              <h1 className="text-2xl font-bold text-emerald-500 mb-2">
                Acesso Liberado!
              </h1>
              <p className="text-neutral-400 mb-8">
                Use as credenciais abaixo para acessar o Claude.
              </p>

              <div className="space-y-4 text-left">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    Email
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={email}
                      readOnly
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white focus:outline-none cursor-default"
                    />
                    <button
                      onClick={() => handleCopy(email, "email")}
                      className="flex shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
                      aria-label="Copiar email"
                    >
                      {copiedEmail ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    Senha
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={DEFAULT_PASSWORD}
                      readOnly
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white font-mono focus:outline-none cursor-default"
                    />
                    <button
                      onClick={() => handleCopy(DEFAULT_PASSWORD, "password")}
                      className="flex shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
                      aria-label="Copiar senha"
                    >
                      {copiedPassword ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <a
                href="https://claude.ai/login"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-4 text-base font-semibold text-white transition-all hover:bg-emerald-700 mt-8"
              >
                <ExternalLink className="h-5 w-5" />
                Ir para o Claude
              </a>
            </div>
          ) : (
            // Error State
            <div className="rounded-xl border border-neutral-800 bg-[#1e1e1e] p-8 shadow-lg text-center">
              <div className="flex justify-center mb-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20">
                  <XCircle className="h-10 w-10 text-red-500" />
                </div>
              </div>

              <h1 className="text-2xl font-bold text-red-500 mb-2">
                Acesso Negado
              </h1>
              <p className="text-neutral-400 mb-8">
                Token invalido ou expirado. Por favor, gere um novo link de acesso.
              </p>

              <a
                href="/pt/claude"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 px-6 py-4 text-base font-semibold text-white transition-all hover:bg-neutral-700"
              >
                Voltar para Acesso Claude
              </a>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function AccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#121212]">
        <div className="text-neutral-400">Carregando...</div>
      </div>
    }>
      <AccessContent />
    </Suspense>
  )
}
