"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Copy, Check, LogOut, Key } from "lucide-react"
import { toast } from "sonner"

interface AccessCode {
  id: string
  code: string
  status: "active" | "used" | "expired"
  createdAt: string
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export default function AdminDashboardPage() {
  const [codes, setCodes] = useState<AccessCode[]>([])
  const [quantity, setQuantity] = useState(8)
  const [lastBatch, setLastBatch] = useState<string[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const auth = localStorage.getItem("admin_auth")
    if (!auth) {
      router.push("/admin")
    }
  }, [router])

  const handleGenerateCodes = () => {
    const today = new Date().toISOString().split("T")[0]
    const newCodes: AccessCode[] = []
    const newBatch: string[] = []
    
    for (let i = 0; i < quantity; i++) {
      const code = `SUKO-${generateCode()}`
      newCodes.push({
        id: crypto.randomUUID(),
        code,
        status: "active",
        createdAt: today,
      })
      newBatch.push(code)
    }
    
    setCodes([...newCodes, ...codes])
    setLastBatch(newBatch)
    toast.success(`${quantity} codigo(s) gerado(s)!`)
  }

  const handleCopyAll = async () => {
    if (lastBatch.length === 0) {
      toast.error("Nenhum codigo para copiar")
      return
    }
    try {
      await navigator.clipboard.writeText(lastBatch.join("\n"))
      setCopiedAll(true)
      toast.success("Todos os codigos copiados!")
      setTimeout(() => setCopiedAll(false), 2000)
    } catch {
      toast.error("Erro ao copiar")
    }
  }

  const handleCopy = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedId(id)
      toast.success("Codigo copiado!")
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast.error("Erro ao copiar")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("admin_auth")
    router.push("/admin")
  }

  const getStatusBadge = (status: AccessCode["status"]) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
            Ativo
          </span>
        )
      case "used":
        return (
          <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-400">
            Usado
          </span>
        )
      case "expired":
        return (
          <span className="inline-flex items-center rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-medium text-red-400">
            Expirado
          </span>
        )
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#121212]">
      <header className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: "#6b46c1" }}>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-white">SuKo Shop</span>
          <span className="ml-2 rounded bg-white/20 px-2 py-0.5 text-xs font-medium text-white">
            Admin
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </header>

      <main className="flex flex-1 justify-center px-4 py-12">
        <div className="w-full max-w-3xl space-y-6">
          <div className="text-center">
            <h1 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Painel Administrativo
            </h1>
            <p className="mt-2 text-sm text-neutral-400">
              Gerencie os codigos de acesso para o sistema Claude.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-[#1e1e1e] p-6 shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Gerar Codigos de Acesso</h2>
                <p className="text-sm text-neutral-400">
                  Crie novos codigos para fornecer aos usuarios.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="quantity" className="text-sm text-neutral-400">
                    Quantidade:
                  </label>
                  <input
                    id="quantity"
                    type="number"
                    min={1}
                    max={50}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                    className="w-16 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>
                <button
                  onClick={handleGenerateCodes}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4" />
                  Gerar Novo Codigo
                </button>
              </div>
            </div>

            {lastBatch.length > 0 && (
              <div className="mt-4 pt-4 border-t border-neutral-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-400">
                    Ultimo lote: {lastBatch.length} codigo(s)
                  </span>
                  <button
                    onClick={handleCopyAll}
                    className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-neutral-700"
                  >
                    {copiedAll ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copiar Todos
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-neutral-800 bg-[#1e1e1e] p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Key className="h-5 w-5 text-purple-500" />
              <h2 className="text-lg font-bold text-white">Codigos Gerados</h2>
            </div>

            <div className="space-y-3">
              {codes.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-4"
                >
                  <div className="flex items-center gap-4">
                    <code className="rounded bg-neutral-800 px-3 py-1.5 font-mono text-sm text-emerald-400">
                      {item.code}
                    </code>
                    {getStatusBadge(item.status)}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-500">{item.createdAt}</span>
                    <button
                      onClick={() => handleCopy(item.code, item.id)}
                      className="flex items-center justify-center rounded-md p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
                      aria-label="Copiar codigo"
                    >
                      {copiedId === item.id ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {codes.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-neutral-500">Nenhum codigo gerado ainda.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
