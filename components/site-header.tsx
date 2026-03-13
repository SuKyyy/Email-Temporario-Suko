"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { ChevronDown, Globe } from "lucide-react"

const languages = [
  { code: "en", label: "English" },
  { code: "pt", label: "Portugu\u00eas" },
  { code: "ru", label: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439" },
]

interface SiteHeaderProps {
  lang: string
}

export function SiteHeader({ lang }: SiteHeaderProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const selected = languages.find((l) => l.code === lang) ?? languages[0]

  const switchLocale = (code: string) => {
    // Replace the current locale segment in the path
    const newPath = pathname.replace(/^\/(en|pt|ru)/, `/${code}`)
    router.push(newPath)
    setOpen(false)
  }

  return (
    <header className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: "#6b46c1" }}>
      <div className="flex items-center gap-6">
        <span className="text-xl font-bold tracking-tight text-white">SuKo Shop</span>
        <nav className="flex items-center gap-4">
          <a
            href={`/${lang}`}
            className="text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            Inbox
          </a>
          <a
            href={`/${lang}/claude`}
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
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
        </a>

        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
            aria-label="Select language"
          >
          <Globe className="h-4 w-4" />
          <span>{selected.label}</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-lg border border-border bg-card shadow-xl">
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => switchLocale(l.code)}
                className={`flex w-full items-center px-3 py-2 text-sm transition-colors hover:bg-secondary ${
                  selected.code === l.code ? "text-accent" : "text-card-foreground"
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
  )
}
