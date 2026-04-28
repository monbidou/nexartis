import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog Nexartis — Conseils pratiques pour artisans',
  description:
    'Guides, astuces et actualités pour les artisans de tous corps de métier. Devis, facturation, planning, TVA, Factur-X 2026.',
  alternates: {
    canonical: '/blog',
  },
}

const posts = [
  {
    category: 'Actualité',
    title: 'Facture électronique 2026 : ce que chaque artisan doit savoir',
    excerpt:
      'La loi change en septembre 2026. Voici ce que vous devez préparer dès maintenant pour être conforme.',
    date: '15 mars 2026',
    time: '5 min',
  },
  {
    category: 'Guide',
    title: 'Comment faire un devis artisan conforme en 2026',
    excerpt:
      'Les 12 mentions obligatoires, les erreurs à éviter, et un modèle gratuit à télécharger.',
    date: '8 mars 2026',
    time: '8 min',
  },
  {
    category: 'Astuce',
    title: '5 astuces pour être payé plus vite par vos clients',
    excerpt:
      'Relances automatiques, acomptes, conditions de paiement claires : voici comment réduire vos délais de paiement.',
    date: '1 mars 2026',
    time: '4 min',
  },
  {
    category: 'Guide',
    title: 'Artisan auto-entrepreneur : comment facturer sans TVA',
    excerpt:
      'La mention obligatoire, les seuils à connaître, et comment Nexartis vous simplifie la vie.',
    date: '22 février 2026',
    time: '6 min',
  },
  {
    category: 'Actualité',
    title: 'TVA à taux réduit : les travaux concernés en 2026',
    excerpt:
      '5.5%, 10%, 20% : quel taux pour quel type de travaux ? Le guide complet pour ne plus se tromper.',
    date: '15 février 2026',
    time: '7 min',
  },
  {
    category: 'Astuce',
    title: 'Organiser ses chantiers sans stress avec un planning digital',
    excerpt:
      'Comment passer du carnet papier à un planning intelligent en moins de 10 minutes.',
    date: '8 février 2026',
    time: '4 min',
  },
]

const categoryColors: Record<string, string> = {
  Guide: 'bg-[#5ab4e0]/15 text-[#5ab4e0]',
  Actualité: 'bg-[#e87a2a]/15 text-[#e87a2a]',
  Astuce: 'bg-[#f5c842]/20 text-[#0f1a3a]',
}

export default function BlogPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-[#0f1a3a] py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h1 className="font-syne text-4xl font-extrabold text-white md:text-5xl lg:text-6xl">
            Le blog des artisans malins
          </h1>
          <p className="mx-auto mt-6 max-w-2xl font-manrope text-lg text-gray-300 md:text-xl">
            Guides pratiques, astuces et actualités pour bien gérer votre
            activité artisanale.
          </p>
        </div>
      </section>

      {/* Blog grid */}
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, i) => (
              <a
                key={i}
                href="/register"
                className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-md transition hover:shadow-lg"
              >
                <span
                  className={`inline-block self-start rounded-full px-3 py-1 text-xs font-semibold ${categoryColors[post.category]}`}
                >
                  {post.category}
                </span>

                <h2 className="mt-4 font-syne text-lg font-bold text-[#0f1a3a] md:text-xl">
                  {post.title}
                </h2>

                <p className="mt-3 flex-1 font-manrope text-sm leading-relaxed text-gray-600">
                  {post.excerpt}
                </p>

                <div className="mt-5 flex items-center gap-3 text-xs text-gray-400">
                  <span>{post.date}</span>
                  <span className="h-1 w-1 rounded-full bg-gray-300" />
                  <span>{post.time} de lecture</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#f0ede4] py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-syne text-2xl font-extrabold text-[#0f1a3a] md:text-3xl">
            Prêt à simplifier votre quotidien&nbsp;?
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-manrope text-gray-600">
            Rejoignez les artisans qui gagnent du temps avec Nexartis.
          </p>
          <a
            href="/register"
            className="mt-8 inline-block rounded-xl bg-[#e87a2a] px-8 py-4 font-syne text-lg font-bold text-white transition hover:bg-[#f09050]"
          >
            Essayez Nexartis gratuitement
          </a>
        </div>
      </section>
    </>
  )
}
