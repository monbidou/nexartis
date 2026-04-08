'use client'

import { useState } from 'react'
import { X, Send } from 'lucide-react'

interface EnvoyerDevisModalProps {
  open: boolean
  onClose: () => void
  devisId: string
  numeroDevis: string
  clientEmail?: string
  chantier?: string
  onSuccess?: () => void
}

export default function EnvoyerDevisModal({
  open,
  onClose,
  devisId,
  numeroDevis,
  clientEmail = '',
  chantier = '',
  onSuccess,
}: EnvoyerDevisModalProps) {
  const [email, setEmail] = useState(clientEmail)
  const [message, setMessage] = useState(
    `Veuillez trouver ci-dessous notre devis n° ${numeroDevis}${chantier ? ` pour ${chantier}` : ''}. N'hésitez pas à nous contacter pour toute question.`
  )
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  if (!open) return null

  const handleSend = async () => {
    if (!email.trim()) {
      setError('Veuillez saisir une adresse email.')
      return
    }
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/send-devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devisId,
          emailDestinataire: email,
          messagePersonnalise: message,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Erreur lors de l\'envoi')
        setSending(false)
        return
      }
      setSent(true)
      setSending(false)
      onSuccess?.()
      setTimeout(() => {
        setSent(false)
        onClose()
      }, 2000)
    } catch {
      setError('Erreur de connexion')
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-syne font-bold text-xl text-[#1a1a2e]">Envoyer le devis par email</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>

        {sent ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send size={28} className="text-emerald-600" />
            </div>
            <p className="font-syne font-bold text-lg text-[#1a1a2e]">Devis envoyé !</p>
            <p className="font-manrope text-sm text-gray-500 mt-1">Le devis n° {numeroDevis} a été envoyé à {email}</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">
                  Email du destinataire
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@email.com"
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope outline-none focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0]"
                />
              </div>

              <div>
                <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">
                  Message personnalisé
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-manrope outline-none focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] resize-none"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-sm text-red-600 font-manrope">{error}</p>
              </div>
            )}

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={onClose}
                className="h-10 px-6 rounded-lg border border-gray-200 text-sm font-manrope hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="h-10 px-6 rounded-lg bg-[#e87a2a] text-white text-sm font-syne font-bold hover:bg-[#f09050] disabled:opacity-50 flex items-center gap-2"
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Envoyer
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
