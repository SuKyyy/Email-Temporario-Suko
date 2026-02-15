"use client"

import { useState } from "react"
import { ChevronDown, Globe } from "lucide-react"

const languages = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(languages[0])

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
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setSelected(lang)
                  setOpen(false)
                }}
                className={`flex w-full items-center px-3 py-2 text-sm transition-colors hover:bg-secondary ${
                  selected.code === lang.code ? "text-accent" : "text-card-foreground"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
