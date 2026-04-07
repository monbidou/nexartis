'use client'

import Image from 'next/image'
import Link from 'next/link'

interface EmptyDashboardProps {
  userName?: string
}

const actionCards = [
  {
    icon: '📄',
    title: 'Créer mon premier devis',
    href: '/dashboard/devis/nouveau',
  },
  {
    icon: '👤',
    title: 'Ajouter un client',
    href: '/dashboard/clients?new=true',
  },
  {
    icon: '⬇️',
    title: 'Importer mes données',
    href: '/dashboard/import',
  },
  {
    icon: '⚙️',
    title: 'Configurer mon profil',
    href: '/dashboard/parametres',
  },
]

export default function EmptyDashboard({ userName }: EmptyDashboardProps) {
  return (
    <div className="min-h-screen bg-gray-50/50 flex items-start justify-center">
      <div className="max-w-2xl w-full mx-auto py-16 px-4 text-center">
        <Image
          src="/images/logo-artidoc.png"
          alt="Artidoc"
          width={80}
          height={80}
          className="h-20 w-auto mx-auto"
        />

        <h1 className="font-syne font-extrabold text-2xl text-[#1a1a2e] mt-6">
          Bienvenue sur Artidoc, {userName || 'et bienvenue'} !
        </h1>

        <p className="font-manrope text-[#6b7280] mt-2">
          Votre espace professionnel est prêt.
        </p>

        <p className="font-syne font-semibold text-[#1a1a2e] mt-6">
          Pour commencer, que souhaitez-vous faire ?
        </p>

        <div className="grid grid-cols-2 gap-4 mt-8">
          {actionCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="bg-white rounded-xl border border-gray-200 p-6 text-center hover:border-[#5ab4e0] hover:shadow-md transition cursor-pointer"
            >
              <span className="text-3xl">{card.icon}</span>
              <p className="font-syne font-semibold text-[#1a1a2e] mt-3">
                {card.title}
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/dashboard?demo=true"
            className="text-sm text-[#5ab4e0] hover:underline"
          >
            Ou découvrir Artidoc avec des données de démonstration →
          </Link>
        </div>
      </div>
    </div>
  )
}
