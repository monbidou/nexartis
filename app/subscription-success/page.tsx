'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react'

/**
 * Page affichee apres un paiement Stripe reussi.
 * Redirige automatiquement vers le dashboard apres 5 secondes.
 */
export default function SubscriptionSuccess() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/dashboard')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10">
          {/* Icone de succes */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Bienvenue dans Nexartis !
          </h1>

          <p className="text-gray-600 mb-6 leading-relaxed">
            Votre abonnement est maintenant actif. Vous avez acces a toutes les
            fonctionnalites pour gerer vos devis, factures et chantiers.
          </p>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-green-800 font-medium">
              Votre abonnement est actif
            </p>
            <p className="text-xs text-green-600 mt-1">
              Vous pouvez gerer votre abonnement dans les parametres
            </p>
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-[#1a1a2e] text-white font-semibold py-3 px-6 rounded-xl hover:bg-[#2a2a4e] transition-colors flex items-center justify-center gap-2"
          >
            Acceder au dashboard
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Redirection automatique dans {countdown}s
          </p>
        </div>
      </div>
    </div>
  )
}
