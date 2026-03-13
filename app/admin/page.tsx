"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Lock } from "lucide-react"
import { toast } from "sonner"

const VALID_USERNAME = "sukoadminpika"
const VALID_PASSWORD = "TOnyEnzO123!?"

export default function AdminLoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async () => {
    setError(null)

    if (!username.trim()) {
      setError("Digite o nome de usuario")
      return
    }
    if (!password.trim()) {
      setError("Digite a senha")
      return
    }

    setLoading(true)
    
    // Simulate authentication delay
    await new Promise((resolve) => setTimeout(resolve, 1000))
    
    // Mock credential validation
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      localStorage.setItem("admin_auth", "true")
      toast.success("Login realizado com sucesso!")
      router.push("/admin/dashboard")
    } else {
      setError("Usuario ou senha incorretos")
    }
    
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#121212]">
      {/* Navbar */}
      <header className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: "#6b46c1" }}>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-white">SuKo Shop</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="rounded-xl border border-neutral-800 bg-[#1e1e1e] p-8 shadow-lg">
            <div className="flex flex-col items-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/20 mb-4">
                <Lock className="h-8 w-8 text-purple-500" />
              </div>
              <h1 className="text-2xl font-bold text-white">Admin SuKo</h1>
              <p className="mt-1 text-sm text-neutral-400">
                Acesso restrito para administradores
              </p>
            </div>

            <div className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-neutral-300 mb-2">
                  Usuario
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    setError(null)
                  }}
                  placeholder="Digite o nome de usuario"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-neutral-300 mb-2">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && username.trim() && password.trim()) handleLogin()
                  }}
                  placeholder="Digite a senha"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>

              <button
                onClick={handleLogin}
                disabled={!username.trim() || !password.trim() || loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Login"
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
