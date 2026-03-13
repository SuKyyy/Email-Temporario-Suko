"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { ChevronDown, Globe, Copy, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

const languages = [
  { code: "en", label: "English" },
  { code: "pt", label: "Português" },
  { code: "ru", label: "Русский" },
]

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  )
}

export default function ClaudeAccessPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const [langOpen, setLangOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Extract lang from pathname - now the route is /[lang]/claude
  const currentLang = pathname.split("/")[1] || "pt"
  const selected = languages.find((l) => l.code === currentLang) ?? languages[1]

  const switchLocale = (code: string) => {
    const newPath = pathname.replace(/^\/(en|pt|ru)\//, `/${code}/`)
    router.push(newPath)
    setLangOpen(false)
  }

  const handleGenerateLink = async () => {
    if (!email.trim()) {
      toast.error("Digite um email válido")
      return
    }

    setLoading(true)
    
    // Simulate API call - in production, this would call your backend
    await new Promise((resolve) => setTimeout(resolve, 1500))
    
    // Generate a mock token
    const token = crypto.randomUUID()
    const link = `https://tempmailsuko.shop/access?token=${token}`
    
    setGeneratedLink(link)
    setLoading(false)
    toast.success("Link gerado com sucesso!")
  }

  const handleCopy = async () => {
    if (!generatedLink) return
    try {
      await navigator.clipboard.writeText(generatedLink)
      setCopied(true)
      toast.success("Link copiado!")
      setTimeout(() => setCopied(false), 2000)
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
          <nav className="flex items-center gap-4">
            <a
              href={`/${currentLang}`}
              className="text-sm font-medium text-white/80 transition-colors hover:text-white"
            >
              Inbox
            </a>
            <a
              href={`/${currentLang}/claude`}
              className="text-sm font-medium text-white/80 transition-colors hover:text-white"
            >
              Acesso Claude
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://t.me/sukodeuva"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center rounded-lg px-3 py-1.5 text-white/90 transition-colors hover:bg-white/10"
            aria-label="Telegram"
          >
            <TelegramIcon className="h-4 w-4" />
          </a>

          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
              aria-label="Select language"
            >
              <Globe className="h-4 w-4" />
              <span>{selected.label}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${langOpen ? "rotate-180" : ""}`} />
            </button>

            {langOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 shadow-xl">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => switchLocale(l.code)}
                    className={`flex w-full items-center px-3 py-2 text-sm transition-colors hover:bg-neutral-800 ${
                      selected.code === l.code ? "text-emerald-500" : "text-neutral-200"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-start justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-2xl space-y-6">
          {/* Title Section */}
          <div className="text-center">
            <h1 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Acesso Claude SuKo
            </h1>
            <p className="mt-2 text-sm text-neutral-400">
              Gere seu link de acesso unico e seguro.
            </p>
          </div>

          {/* Card */}
          <div className="rounded-xl border border-neutral-800 bg-[#1e1e1e] p-6 shadow-lg">
            <h2 className="mb-1 text-xl font-bold text-white">Gerar Link de Acesso</h2>
            <p className="mb-5 text-sm text-neutral-400">
              Digite o email da conta para receber o link temporario.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && email.trim()) handleGenerateLink()
                }}
                placeholder="usuario@sukisukic1.shop"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                aria-label="Email da conta"
              />

              <button
                onClick={handleGenerateLink}
                disabled={!email.trim() || loading}
                className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  "Gerar Link"
                )}
              </button>
            </div>

            {/* Generated Link Section */}
            {generatedLink && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 p-3">
                  <code className="flex-1 truncate text-sm text-emerald-400">
                    {generatedLink}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="flex shrink-0 items-center justify-center rounded-md p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
                    aria-label="Copiar link"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-sm font-medium text-amber-400">
                    Aviso: Este link expira imediatamente apos o primeiro uso. Nao abra em dois navegadores.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
