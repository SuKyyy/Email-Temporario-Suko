"use client"

import { Loader2 } from "lucide-react"

// Root domains — any subdomain of these is also valid
// e.g. @sub.sukospot.shop, @anything.sukoultra.shop
export const ROOT_DOMAINS = [
  "sukospot.shop",
  "sukodocursor.shop",
  "sukoultra.shop",
  "sukov0dev.shop",
] as const

export function isSupportedDomain(domain: string): boolean {
  // domain comes in as "@something.sukospot.shop" or "@sukospot.shop"
  const bare = domain.startsWith("@") ? domain.slice(1) : domain
  return ROOT_DOMAINS.some(
    (root) => bare === root || bare.endsWith(`.${root}`)
  )
}

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
      <h2 className="mb-1 text-xl font-bold text-card-foreground">Acesse sua Caixa de Entrada</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Digite seu email completo para verificar sua caixa de entrada
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
            placeholder="Digite seu email (ex: kratos@sub.sukospot.shop)"
            className={`w-full rounded-lg border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 ${
              error ? "border-destructive" : "border-border"
            }`}
            aria-label="Endereco de email completo"
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
          aria-label="Acessar email"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </>
          ) : (
            "Acessar Email"
          )}
        </button>
      </div>
    </div>
  )
}
