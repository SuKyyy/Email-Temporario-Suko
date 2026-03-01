"use client"

import { useEffect, useState } from "react"
import { Rocket } from "lucide-react"

const NEW_URL = "https://tempmailsuko.shop/"

export default function RedirectPage() {
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          window.location.href = NEW_URL
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/20">
            <Rocket className="h-10 w-10 text-primary" />
          </div>

          <h1 className="mb-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Mudamos de Endereço!
          </h1>

          <p className="mb-8 text-muted-foreground">
            O painel de E-mail Temporário da SuKoShop mudou para um servidor mais rápido e estável.
          </p>

          <a
            href={NEW_URL}
            className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-lg font-semibold text-primary-foreground transition-all hover:brightness-110"
          >
            <Rocket className="h-5 w-5" />
            Acessar Novo Site
          </a>

          <p className="text-sm text-muted-foreground">
            Redirecionando automaticamente em{" "}
            <span className="font-mono font-bold text-accent">{countdown}</span>{" "}
            {countdown === 1 ? "segundo" : "segundos"}...
          </p>
        </div>
      </div>
    </div>
  )
}
