'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  HardHat,
  ChevronDown,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Plus,
} from 'lucide-react'

// -------------------------------------------------------------------
// Types & Data
// -------------------------------------------------------------------

type ChantierFilter = 'Tous' | 'En cours' | 'Terminés' | 'Archivés'

interface Chantier {
  id: string
  client: string
  chantier: string
  avancement: number
  dateDebut: string
  devis: string
  factures: string
  deviseTTC: string
  factureTTC: string
  encaisse: string
  equipe: { initials: string; color: string }[]
  statut: ChantierFilter
}

const AVATAR_COLORS: Record<string, string> = {
  MR: '#5ab4e0',
  TB: '#e87a2a',
  LD: '#8b5cf6',
}

const DEMO_CHANTIERS: Chantier[] = [
  {
    id: 'dupont-sdb',
    client: 'M. Dupont',
    chantier: 'Rénovation SDB',
    avancement: 15,
    dateDebut: '07/04/2026',
    devis: '1 devis',
    factures: '0 factures',
    deviseTTC: '2 695 €',
    factureTTC: '0 €',
    encaisse: '0 €',
    equipe: [{ initials: 'MR', color: AVATAR_COLORS.MR }],
    statut: 'En cours',
  },
  {
    id: 'martin-plomberie',
    client: 'Mme Martin',
    chantier: 'Plomberie complète',
    avancement: 100,
    dateDebut: '10/03/2026',
    devis: '1 devis',
    factures: '1 facture',
    deviseTTC: '5 280 €',
    factureTTC: '5 280 €',
    encaisse: '5 280 €',
    equipe: [{ initials: 'TB', color: AVATAR_COLORS.TB }],
    statut: 'Terminés',
  },
  {
    id: 'bernard-carrelage',
    client: 'M. Bernard',
    chantier: 'Pose carrelage',
    avancement: 60,
    dateDebut: '18/03/2026',
    devis: '1 devis',
    factures: '1 facture',
    deviseTTC: '3 410 €',
    factureTTC: '3 410 €',
    encaisse: '3 410 €',
    equipe: [{ initials: 'MR', color: AVATAR_COLORS.MR }],
    statut: 'En cours',
  },
  {
    id: 'renov33-extension',
    client: 'SARL Renov33',
    chantier: 'Extension',
    avancement: 35,
    dateDebut: '01/04/2026',
    devis: '1 devis',
    factures: '1 facture',
    deviseTTC: '9 350 €',
    factureTTC: '9 350 €',
    encaisse: '4 675 €',
    equipe: [
      { initials: 'MR', color: AVATAR_COLORS.MR },
      { initials: 'TB', color: AVATAR_COLORS.TB },
    ],
    statut: 'En cours',
  },
  {
    id: 'girard-electricite',
    client: 'Mme Girard',
    chantier: 'Électricité cuisine',
    avancement: 45,
    dateDebut: '03/04/2026',
    devis: '1 devis',
    factures: '1 facture',
    deviseTTC: '3 520 €',
    factureTTC: '3 520 €',
    encaisse: '1 056 €',
    equipe: [{ initials: 'TB', color: AVATAR_COLORS.TB }],
    statut: 'En cours',
  },
  {
    id: 'petit-terrasse',
    client: 'M. Petit',
    chantier: 'Extension terrasse',
    avancement: 85,
    dateDebut: '15/03/2026',
    devis: '1 devis',
    factures: '1 facture',
    deviseTTC: '5 610 €',
    factureTTC: '5 610 €',
    encaisse: '5 610 €',
    equipe: [{ initials: 'LD', color: AVATAR_COLORS.LD }],
    statut: 'En cours',
  },
]

const FILTER_OPTIONS: string[] = ['Tous', 'En cours', 'Terminés', 'Archivés']

// -------------------------------------------------------------------
// Page
// -------------------------------------------------------------------

export default function ChantiersListPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Tous')
  const [openActions, setOpenActions] = useState<string | null>(null)

  const filtered = DEMO_CHANTIERS.filter((c) => {
    if (filter !== 'Tous' && c.statut !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        c.client.toLowerCase().includes(q) ||
        c.chantier.toLowerCase().includes(q)
      )
    }
    return true
  })

  function getProgressColor(percent: number) {
    if (percent >= 75) return 'bg-green-500'
    if (percent >= 25) return 'bg-[#5ab4e0]'
    return 'bg-[#e87a2a]'
  }

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-syne font-bold text-[#0f1a3a]">Chantiers</h1>
          <span className="text-sm font-manrope text-gray-500">({DEMO_CHANTIERS.length})</span>
        </div>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 h-10 rounded-lg border border-gray-200 pl-9 pr-4 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none transition-colors"
          />
        </div>

        {/* Filter */}
        <div className="relative">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 px-3 pr-8 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none appearance-none bg-white cursor-pointer"
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* New button */}
        <Link
          href="/dashboard/chantiers/nouveau"
          className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-[#e87a2a] hover:bg-[#f09050] text-white text-sm font-syne font-bold transition-colors"
        >
          <Plus size={16} />
          Nouveau chantier
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="bg-gray-50">
              {['Client / Chantier', 'Avancement', 'Date début', 'Devis', 'Factures', 'Devisé TTC', 'Facturé TTC', 'Encaissé', 'Équipe', 'Actions'].map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-manrope font-semibold uppercase tracking-wider text-gray-500"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((chantier, idx) => (
              <tr
                key={chantier.id}
                onClick={() => router.push(`/dashboard/chantiers/${chantier.id}`)}
                className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                  idx % 2 === 1 ? 'bg-[#f8f9fa]' : ''
                } ${chantier.avancement === 100 ? 'bg-green-50/30' : ''}`}
              >
                <td className="px-4 py-3">
                  <div className="text-sm font-manrope font-medium text-[#1a1a2e]">{chantier.client}</div>
                  <div className="text-xs font-manrope text-gray-500">{chantier.chantier}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="min-w-[100px]">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${getProgressColor(chantier.avancement)}`} style={{ width: `${chantier.avancement}%` }} />
                      </div>
                      <span className="text-xs font-manrope text-gray-500 whitespace-nowrap">{chantier.avancement}%</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-manrope text-gray-600">{chantier.dateDebut}</td>
                <td className="px-4 py-3 text-sm font-manrope text-gray-600">{chantier.devis}</td>
                <td className="px-4 py-3 text-sm font-manrope text-gray-600">{chantier.factures}</td>
                <td className="px-4 py-3 text-sm font-manrope font-medium text-[#1a1a2e]">{chantier.deviseTTC}</td>
                <td className="px-4 py-3 text-sm font-manrope font-medium text-[#1a1a2e]">{chantier.factureTTC}</td>
                <td className="px-4 py-3 text-sm font-manrope font-medium text-[#1a1a2e]">{chantier.encaisse}</td>
                <td className="px-4 py-3">
                  <div className="flex -space-x-2">
                    {chantier.equipe.map((member, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-manrope font-bold border-2 border-white"
                        style={{ backgroundColor: member.color }}
                        title={member.initials}
                      >
                        {member.initials}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenActions(openActions === chantier.id ? null : chantier.id)
                      }}
                      className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <MoreHorizontal size={16} className="text-gray-500" />
                    </button>
                    {openActions === chantier.id && (
                      <div className="absolute right-0 top-8 z-20 w-44 bg-white rounded-lg shadow-xl border border-gray-200 py-1 overflow-hidden">
                        {[
                          { label: 'Voir', icon: Eye },
                          { label: 'Modifier', icon: Pencil },
                          { label: 'Supprimer', icon: Trash2, danger: true },
                        ].map((action) => (
                          <button
                            key={action.label}
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenActions(null)
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-manrope hover:bg-gray-50 transition-colors ${
                              action.danger ? 'text-red-600' : 'text-[#1a1a2e]'
                            }`}
                          >
                            <action.icon size={14} />
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <HardHat size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-manrope text-gray-500">Aucun chantier trouvé</p>
          </div>
        )}
      </div>
    </div>
  )
}
