'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'

/**
 * Composant Google Analytics 4
 * Ne se charge QUE si l'utilisateur a accepté les cookies (RGPD).
 * L'ID de mesure est lu depuis la variable d'environnement NEXT_PUBLIC_GA_ID.
 */
export default function GoogleAnalytics() {
  const [hasConsent, setHasConsent] = useState(false)

  useEffect(() => {
    // Vérifier le consentement cookies
    try {
      const consent = localStorage.getItem('nexartis-cookie-consent')
      if (consent === 'accepted') {
        setHasConsent(true)
      }
    } catch {
      // localStorage non disponible (mode privé, etc.)
    }

    // Écouter les changements de consentement
    const handleConsent = () => {
      try {
        const consent = localStorage.getItem('nexartis-cookie-consent')
        setHasConsent(consent === 'accepted')
      } catch {}
    }
    window.addEventListener('cookie-consent-changed', handleConsent)
    return () => window.removeEventListener('cookie-consent-changed', handleConsent)
  }, [])

  const measurementId = process.env.NEXT_PUBLIC_GA_ID

  // Ne rien charger si pas de consentement ou pas d'ID
  if (!hasConsent || !measurementId) return null

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}', {
              page_path: window.location.pathname,
              anonymize_ip: true,
              allow_google_signals: false,
              allow_ad_personalization: false,
            });
          `,
        }}
      />
    </>
  )
}
