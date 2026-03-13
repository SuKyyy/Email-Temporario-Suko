"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export default function AdminDashboard() {
  const [quantidade, setQuantidade] = useState(8)
  const [codigos, setCodigos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchCodigos()
  }, [])

  const fetchCodigos = async () => {
    const { data } = await supabase.from("codigos").select("*").order("created_at", { ascending: false })
    if (data) setCodigos(data)
  }

  const gerarCodigos = async () => {
    setLoading(true)
    const novos = Array.from({ length: quantidade }, () => 
      'SUKO-' + Math.random().toString(36).substring(2, 10).toUpperCase()
    )
    
    const inserts = novos.map(c => ({ codigo: c, status: 'ativo' }))
    await supabase.from("codigos").insert(inserts)
    
    await fetchCodigos()
    setLoading(false)
  }

  const copiarTudo = () => {
    const ativos = codigos.filter(c => c.status === 'ativo').map(c => c.codigo).join("\n")
    navigator.clipboard.writeText(ativos)
    alert("Códigos ativos copiados!")
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Painel Admin - Códigos</h1>
        
        <div className="bg-[#1e1e1e] p-6 rounded-xl border border-neutral-800 flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-400">Quantidade</label>
            <input 
              type="number" 
              value={quantidade} 
              onChange={e => setQuantidade(Number(e.target.value))}
              className="bg-neutral-950 border border-neutral-800 rounded p-2 text-white w-24 outline-none"
            />
          </div>
          <button 
            onClick={gerarCodigos} 
            disabled={loading}
            className="bg-emerald-600 px-4 py-2 rounded font-bold hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? "Gerando..." : "Gerar Novos Códigos"}
          </button>
          <button onClick={copiarTudo} className="bg-neutral-700 px-4 py-2 rounded font-bold hover:bg-neutral-600 ml-auto">
            Copiar Ativos
          </button>
        </div>

        <div className="bg-[#1e1e1e] rounded-xl border border-neutral-800 overflow-hidden">
          {codigos.map((c: any) => (
            <div key={c.id} className="flex justify-between items-center p-4 border-b border-neutral-800 last:border-0">
              <span className="font-mono text-sm">{c.codigo}</span>
              <span className={`px-2 py-1 rounded text-xs font-bold ${c.status === 'ativo' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                {c.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}