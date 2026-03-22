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
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold tracking-tight text-white">SuKo Shop</span>
      </div>

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
    </header>
  )
}
