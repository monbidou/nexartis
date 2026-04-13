import type { MetadataRoute } from 'next'

/**
 * robots.txt dynamique pour nexartis.fr
 * Indique aux moteurs de recherche quelles pages indexer et lesquelles ignorer.
 * Accessible à : https://nexartis.fr/robots.txt
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',    // Espace privé des utilisateurs
          '/api/',          // Routes API
          '/login',         // Pages d'auth
          '/register',
          '/auth/',
          '/onboarding',
          '/reset-password',
          '/forgot-password',
          '/subscription-expired',
          '/signer/',       // Pages de signature (privées par token)
          '/_next/',        // Assets internes Next.js
        ],
      },
    ],
    sitemap: 'https://nexartis.fr/sitemap.xml',
  }
}
