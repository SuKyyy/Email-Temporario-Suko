"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import { AlertTriangle, ExternalLink, X } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { EmailInput } from "@/components/email-input"
import { Inbox, type Email } from "@/components/mail-inbox"

const NEW_URL = "https://tempmailsuko.shop/"
const CF_INBOX_API = "https://inbox-api.izukisukinho.workers.dev/inbox"

// Hardcoded Portuguese dictionary for standalone page
const dict = {
  header: {
    brand: "SuKo Shop",
    selectLanguage: "Selecionar idioma",
  },
  hero: {
    title: "Email Temporário SuKo",
    subtitle: "Receba emails instantaneamente nos seus domínios.",
    tutorialTitle: "Como usar",
    tutorialStep1: "Digite o email do produto que voce comprou para receber codigos de verificacao ou fazer alteracoes na conta.",
    tutorialStep2: "Voce pode remover o email da sua conta se quiser, mas isso causara a perda da garantia do produto.",
  },
  emailInput: {
    heading: "Acesse sua Caixa de Entrada",
    description: "Digite seu email completo para verificar sua caixa de entrada",
    placeholder: "Digite seu email (ex: kratos@sub.sukospot.shop)",
    ariaLabel: "Endereço de email completo",
    copyAriaLabel: "Copiar email",
    accessAriaLabel: "Acessar email",
    submit: "Acessar Email",
    loading: "Carregando...",
    copiedToast: "Email copiado para a área de transferência!",
    copyErrorToast: "Não foi possível copiar.",
  },
  inbox: {
    title: "Caixa de Entrada",
    checking: "Verificando...",
    updatesIn: "Atualiza em ",
    seconds: "s",
    refresh: "Atualizar",
    refreshing: "Atualizando...",
    refreshAriaLabel: "Atualizar caixa de entrada",
    warning: "Emails podem levar de 15 a 30 segundos para chegar devido ao processamento do servidor. Se não encontrar, aguarde um momento e clique em Atualizar.",
    searching: "Buscando emails...",
    noEmailsFound: "Nenhum email encontrado",
    noEmailSelected: "Nenhum email selecionado",
    emptyInbox: "Sua caixa de entrada está vazia. Novas mensagens aparecerão aqui automaticamente.",
    enterEmailPrompt: "Digite um email acima e clique em 'Acessar Email' para verificar sua caixa de entrada.",
    attachment: "anexo",
    attachments: "anexos",
  },
  errors: {
    fetchError: "Erro ao buscar emails. Tente novamente.",
    invalidFormat: "Formato de email inválido. Use usuario@dominio.sukospot.shop",
    noUsername: "Digite um nome de usuário antes do @",
    unsupportedDomain: "Domínio não suportado. Use subdomínios de:",
    genericError: "Erro ao buscar emails.",
    updateError: "Erro ao atualizar.",
  },
  status: {
    inboxUpdated: "Caixa de entrada atualizada",
    checkingNewEmails: "Verificando novos emails...",
  },
  notifications: {
    newEmailBrowser: "Novo email recebido!",
    from: "De",
    newEmailToastOne: "1 novo email!",
    newEmailToastMany: "{count} novos emails!",
  },
  footer: {
    text: "SuKo Shop · Serviço de email temporário · Todas as mensagens são excluídas automaticamente após 24 horas",
  },
  metadata: {
    title: "SuKo Shop - Email Temporário",
    description: "Acesse sua caixa de entrada temporária nos domínios SuKo",
  },
  sidebar: {
    title: "Emails Salvos",
    noSavedEmails: "Nenhum email salvo",
    addEmailPrompt: "Adicione emails usando o campo acima",
    remove: "Remover",
    online: "Online",
    recheck: "Verificar",
  },
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = "sine"
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  } catch {
    // Audio not supported or blocked
  }
}

function requestNotificationPermission() {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
    Notification.requestPermission()
  }
}

function showBrowserNotification(subject: string, from: string) {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    new Notification(dict.notifications.newEmailBrowser, {
      body: `${dict.notifications.from}: ${from}\n${subject}`,
      icon: "/favicon.ico",
    })
  }
}

// Migration Modal Component
function MigrationModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 text-white rounded-xl p-6 max-w-md w-full text-center relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="flex justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
        </div>
        
        <h2 className="text-xl font-bold mb-2">Mudamos de Endereço!</h2>
        <p className="text-zinc-400 mb-6">
          O painel de E-mail Temporário da SuKoShop mudou para um link oficial mais rápido. Salve o novo link!
        </p>
        
        <a
          href={NEW_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white w-full py-3 rounded-lg font-medium transition-colors mb-3"
        >
          <ExternalLink className="h-4 w-4" />
          Acessar Novo Site
        </a>
        
        <button
          onClick={onClose}
          className="w-full py-3 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors font-medium"
        >
          Continuar no site antigo
        </button>
      </div>
    </div>
  )
}

export default function Page() {
  const [showModal, setShowModal] = useState(true)
  const [email, setEmail] = useState("")
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activeUser, setActiveUser] = useState<string | null>(null)
  const [activeDomain, setActiveDomain] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    requestNotificationPermission()
  }, [])

  const extractBody = (raw: string): string => {
    const crlfIdx = raw.indexOf("\r\n\r\n")
    const lfIdx = raw.indexOf("\n\n")
    const sep = crlfIdx !== -1 && (lfIdx === -1 || crlfIdx < lfIdx) ? crlfIdx + 4 : lfIdx !== -1 ? lfIdx + 2 : -1
    return sep !== -1 ? raw.slice(sep).trim() : raw.trim()
  }

  const fetchEmails = useCallback(async (fullAddress: string): Promise<Email[]> => {
    const res = await fetch(
      `${CF_INBOX_API}/${fullAddress}`,
      { cache: "no-store" }
    )
    if (!res.ok) throw new Error(`Erro ao buscar emails (${res.status})`)
    const data = await res.json()
    return (Array.isArray(data) ? data : []).map(
      (item: { from?: string; subject?: string; date?: string; text?: string }, i: number) => {
        const bodyText = item.text ? extractBody(item.text) : ""
        return {
          id: `cf-${fullAddress}-${i}-${item.date ?? i}`,
          from: item.from ?? "Desconhecido",
          subject: item.subject ?? "(Sem assunto)",
          date: item.date ?? "",
          body: bodyText || "<p>(Sem conteúdo)</p>",
          attachments: [],
        }
      }
    )
  }, [])

  const checkForNewEmails = useCallback((prev: Email[], next: Email[]) => {
    const prevIds = new Set(prev.map((e) => e.id))
    const newEmails = next.filter((e) => !prevIds.has(e.id))
    if (newEmails.length > 0) {
      playNotificationSound()
      const first = newEmails[0]
      showBrowserNotification(first.subject, first.from)
      const msg =
        newEmails.length === 1
          ? dict.notifications.newEmailToastOne
          : dict.notifications.newEmailToastMany.replace("{count}", String(newEmails.length))
      toast.success(msg, { description: first.subject })
    }
    return newEmails.length > 0
  }, [])

  const handleCheckMail = useCallback(async () => {
    const trimmed = email.trim()
    if (!trimmed) return

    const atIndex = trimmed.lastIndexOf("@")
    if (atIndex === -1) { setFetchError(dict.errors.invalidFormat); return }

    const user = trimmed.slice(0, atIndex)
    const domain = trimmed.slice(atIndex)
    if (!user) { setFetchError(dict.errors.noUsername); return }

    setFetchError(null)
    setLoading(true)
    setStatusMessage(null)

    try {
      const result = await fetchEmails(trimmed)
      setHasSearched(true)
      setEmails(result)
      setActiveUser(user)
      setActiveDomain(domain)
      setStatusMessage(dict.status.inboxUpdated)
      setTimeout(() => setStatusMessage(null), 3000)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : dict.errors.genericError)
      setEmails([])
    } finally {
      setLoading(false)
    }
  }, [email, fetchEmails])

  const handleManualRefresh = useCallback(async () => {
    if (!activeUser || !activeDomain) return

    setRefreshing(true)
    setStatusMessage(dict.status.checkingNewEmails)

    try {
      const result = await fetchEmails(`${activeUser}${activeDomain}`)
      checkForNewEmails(emails, result)
      setEmails(result)
      setFetchError(null)
      setStatusMessage(dict.status.inboxUpdated)
      setTimeout(() => setStatusMessage(null), 3000)
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : dict.errors.updateError)
      setTimeout(() => setStatusMessage(null), 5000)
    } finally {
      setRefreshing(false)
    }
  }, [activeUser, activeDomain, fetchEmails, emails, checkForNewEmails])

  const handleEmailChange = useCallback((value: string) => {
    setEmail(value)
    if (fetchError) setFetchError(null)
  }, [fetchError])

  const activeAddress = activeUser && activeDomain ? `${activeUser}${activeDomain}` : null

  return (
    <div className="flex min-h-screen flex-col">
      {showModal && <MigrationModal onClose={() => setShowModal(false)} />}
      
      <SiteHeader lang="pt" />

      <main className="flex flex-1 items-start justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center">
            <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {dict.hero.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {dict.hero.subtitle}
            </p>
          </div>

          <EmailInput
            email={email}
            error={fetchError}
            activeAddress={activeAddress}
            onEmailChange={handleEmailChange}
            onSubmit={handleCheckMail}
            loading={loading}
            dict={dict}
          />

          <Inbox
            emails={emails}
            activeEmail={activeUser}
            activeDomain={activeDomain}
            hasSearched={hasSearched}
            isLoading={loading}
            isRefreshing={refreshing}
            isPolling={false}
            statusMessage={statusMessage}
            countdown={0}
            fetchError={fetchError}
            onRefresh={handleManualRefresh}
            dict={dict}
          />
        </div>
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        <p>{dict.footer.text}</p>
      </footer>
    </div>
  )
}
