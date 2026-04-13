'use client'

import { useState, useEffect } from 'react'

/**
 * Bandeau de consentement cookies — OBLIGATOIRE en France (RGPD / CNIL)
 * Affiche un bandeau en bas de page tant que l'utilisateur n'a pas fait son choix.
 * Si l'utilisateur refuse, Google Analytics ne se charge pas.
 */
export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    try {
      const consent = localStorage.getItem('nexartis-cookie-consent')
      // Afficher le bandeau uniquement si aucun choix n'a été fait
      if (!consent) {
        setIsVisible(true)
      }
    } catch {
      // localStorage non disponible
    }
  }, [])

  const handleChoice = (accepted: boolean) => {
    try {
      localStorage.setItem('nexartis-cookie-consent', accepted ? 'accepted' : 'rejected')
      // Notifier le composant GoogleAnalytics
      window.dispatchEvent(new Event('cookie-consent-changed'))
    } catch {}
    setIsVisible(false)

    // Si accepté, recharger pour que GA se charge
    if (accepted) {
      window.location.reload()
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-gray-900/95 backdrop-blur-sm text-white p-4 sm:p-5 shadow-2xl border-t border-gray-700">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 pr-4">
          <p className="font-semibold text-sm mb-1">Cookies & vie privée</p>
          <p className="text-xs text-gray-300 leading-relaxed">
            Nexartis utilise Google Analytics pour améliorer votre expérience.
            Vos données sont anonymisées et ne sont jamais vendues.
            Vous pouvez refuser sans impact sur l&apos;utilisation du site.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={() => handleChoice(false)}
            className="px-4 py-2 text-xs font-medium border border-gray-500 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Refuser
          </button>
          <button
            onClick={() => handleChoice(true)}
            className="px-4 py-2 text-xs font-medium bg-[#e87a2a] rounded-lg hover:bg-[#d06a1e] transition-colors"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  )
}
