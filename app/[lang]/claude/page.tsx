"use client"
import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function ClaudeAcesso() {
  const [emailPrefix, setEmailPrefix] = useState("")
  const [codigo, setCodigo] = useState("")
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState("")
  const [erro, setErro] = useState("")

  const gerarLink = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setErro("")
    setResultado("")

    const { data, error } = await supabase.from('codigos').select('*').eq('codigo', codigo.trim()).single()

    if (error || !data) {
      setErro("Código inválido ou não encontrado.")
      setLoading(false)
      return
    }

    if (data.status === 'usado') {
      setErro("Este código já foi utilizado.")
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase.from('codigos').update({ status: 'usado' }).eq('id', data.id)

    if (updateError) {
      setErro("Erro interno ao validar. Tente novamente.")
    } else {
      const tokenUnico = Math.random().toString(36).substring(2, 15)
      setResultado(`https://tempmailsuko.shop/access?token=${tokenUnico}&email=${emailPrefix}@sukisukic1.shop`)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col items-center pt-20 px-4 text-white">
      <div className="max-w-xl w-full text-center space-y-2 mb-8">
        <h1 className="text-4xl font-bold">Acesso Claude SuKo</h1>
        <p className="text-gray-400">Gere seu link de acesso único e seguro.</p>
      </div>

      <div className="bg-[#1e1e1e] p-6 rounded-xl border border-neutral-800 w-full max-w-xl shadow-xl">
        <h2 className="text-xl font-bold mb-1">Gerar Link de Acesso</h2>
        <p className="text-sm text-gray-400 mb-6">Digite o prefixo do email e o código fornecido pelo admin.</p>

        <form onSubmit={gerarLink} className="space-y-4">
          <div className="flex bg-neutral-950 border border-neutral-800 rounded overflow-hidden">
            <input 
              type="text" 
              required
              placeholder="usuario"
              value={emailPrefix}
              onChange={e => setEmailPrefix(e.target.value.replace(/\s+/g, ''))}
              className="bg-transparent p-3 w-full outline-none"
            />
            <span className="p-3 text-gray-500 bg-neutral-900 border-l border-neutral-800">@sukisukic1.shop</span>
          </div>

          <input 
            type="text" 
            required
            placeholder="Código de Acesso (Ex: SUKO-K2RDDZ24)"
            value={codigo}
            onChange={e => setCodigo(e.target.value.toUpperCase().trim())}
            className="bg-neutral-950 border border-neutral-800 rounded p-3 w-full outline-none uppercase font-mono"
          />

          {erro && <div className="p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">{erro}</div>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 py-3 rounded font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Validando..." : "Gerar Link"}
          </button>
        </form>

        {resultado && (
          <div className="mt-6 p-4 bg-neutral-950 border border-emerald-600/30 rounded-lg">
            <p className="text-xs text-red-400 font-bold mb-2 uppercase">Aviso: Este link expira no primeiro uso. Não abra em 2 navegadores.</p>
            <div className="flex gap-2">
              <input type="text" readOnly value={resultado} className="bg-black border border-neutral-800 rounded p-2 w-full text-sm text-emerald-400 outline-none" />
              <button onClick={() => navigator.clipboard.writeText(resultado)} className="bg-neutral-800 px-3 rounded text-sm hover:bg-neutral-700">Copiar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}