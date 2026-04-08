import type { Metadata } from 'next'
import { Syne, Manrope } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

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

export const metadata: Metadata = {
  title: 'NexArtis — Logiciel devis facture artisan | 25€/mois tout inclus',
  description:
    'Créez vos devis et factures artisan en quelques minutes. Planning intelligent exclusif. Conforme Factur-X 2026. Essai gratuit 14 jours sans CB.',
  keywords:
    'logiciel devis artisan, logiciel facture artisan, logiciel artisan, application artisan',
  openGraph: {
    title: 'NexArtis — Logiciel devis facture artisan | 25€/mois tout inclus',
    description:
      'Créez vos devis et factures artisan en quelques minutes. Planning intelligent exclusif. Conforme Factur-X 2026.',
    type: 'website',
    locale: 'fr_FR',
    siteName: 'NexArtis',
    url: 'https://nexartis.fr',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${syne.variable} ${manrope.variable}`}>
      <body className="font-manrope bg-white">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
