import type { MetadataRoute } from 'next'

/**
 * Sitemap dynamique pour nexartis.fr
 * Génère automatiquement la liste de toutes les pages publiques indexables.
 * Accessible à : https://nexartis.fr/sitemap.xml
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://nexartis.fr'
  const lastModified = new Date('2026-04-13')

  // Pages publiques principales
  const mainPages = [
    { url: baseUrl, changeFrequency: 'daily' as const, priority: 1 },
    { url: `${baseUrl}/tarifs`, changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${baseUrl}/blog`, changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${baseUrl}/planning-chantier-intelligent`, changeFrequency: 'monthly' as const, priority: 0.9 },
    { url: `${baseUrl}/logiciel-devis-factures`, changeFrequency: 'monthly' as const, priority: 0.9 },
    { url: `${baseUrl}/logiciel-artisan-auto-entrepreneur`, changeFrequency: 'monthly' as const, priority: 0.8 },
  ]

  // Pages par métier (SEO local)
  const metierPages = [
    'electricien', 'plombier', 'chauffagiste', 'carreleur',
    'couvreur', 'menuisier', 'maconnerie', 'peintre', 'paysagiste',
  ].map(metier => ({
    url: `${baseUrl}/logiciel-devis-${metier}`,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  // Pages par ville (SEO géographique)
  const villePages = ['lyon', 'marseille', 'bordeaux'].map(ville => ({
    url: `${baseUrl}/logiciel-artisan-${ville}`,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...mainPages, ...metierPages, ...villePages].map(page => ({
    ...page,
    lastModified,
  }))
}
