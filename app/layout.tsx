import type { Metadata } from 'next'
import { Syne, Manrope, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ConditionalLayout from '@/components/ConditionalLayout'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import CookieConsent from '@/components/CookieConsent'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
  weight: ['700', '800'],
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
  weight: ['400', '500', '600'],
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://nexartis.fr'),
  title: 'Nexartis — Logiciel devis facture artisan | 25€/mois tout inclus',
  description:
    'Créez vos devis et factures artisan en quelques minutes. Planning intelligent exclusif. Conforme Factur-X 2026. Essai gratuit 14 jours sans CB.',
  keywords:
    'logiciel devis artisan, logiciel facture artisan, logiciel artisan, application artisan, gestion artisan, devis en ligne, facturation artisan',
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
  },
  openGraph: {
    title: 'Nexartis — Logiciel devis facture artisan | 25€/mois tout inclus',
    description:
      'Créez vos devis et factures artisan en quelques minutes. Planning intelligent exclusif. Conforme Factur-X 2026.',
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Nexartis',
    url: 'https://nexartis.fr',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Nexartis - Logiciel de gestion pour artisans',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nexartis — Logiciel devis facture artisan',
    description: 'Gestion devis factures chantiers pour artisans. Essai gratuit 14 jours.',
  },
  alternates: {
    canonical: 'https://nexartis.fr',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${syne.variable} ${manrope.variable} ${jakarta.variable}`}>
      <body className="font-manrope bg-white">
        <GoogleAnalytics />
        <ConditionalLayout header={<Header />} footer={<Footer />}>
          {children}
        </ConditionalLayout>
        <CookieConsent />
      </body>
    </html>
  )
}
