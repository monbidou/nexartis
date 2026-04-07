'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  FileText,
  CheckCircle2,
  Send,
  Clock,
  ChevronDown,
  MoreHorizontal,
  Eye,
  Pencil,
  Copy,
  SendHorizonal,
  Trash2,
  Plus,
} from 'lucide-react'

// -------------------------------------------------------------------
// Types & Data
// -------------------------------------------------------------------

type DevisStatus = 'Brouillon' | 'Envoyé' | 'Finalisé' | 'Signé' | 'Refusé' | 'Expiré'

interface Devis {
  id: string
  numero: string
  statut: DevisStatus
  client: string
  chantier: string
  modifie: string
  date: string
  valable: string
  totalHT: string
  totalTTC: string
}

const DEMO_DEVIS: Devis[] = [
  { id: '089', numero: 'D2026-089', statut: 'Envoyé', client: 'M. Dupont', chantier: 'Rénovation SDB', modifie: '07/04', date: '07/04', valable: '07/05', totalHT: '2 450 €', totalTTC: '2 695 €' },
  { id: '088', numero: 'D2026-088', statut: 'Signé', client: 'Mme Girard', chantier: 'Électricité cuisine', modifie: '05/04', date: '03/04', valable: '03/05', totalHT: '3 200 €', totalTTC: '3 520 €' },
  { id: '087', numero: 'D2026-087', statut: 'Brouillon', client: 'M. Moreau', chantier: 'Peinture façade', modifie: '04/04', date: '04/04', valable: '-', totalHT: '1 950 €', totalTTC: '2 145 €' },
  { id: '086', numero: 'D2026-086', statut: 'Envoyé', client: 'SARL Renov33', chantier: 'Extension', modifie: '02/04', date: '01/04', valable: '01/05', totalHT: '8 500 €', totalTTC: '9 350 €' },
  { id: '085', numero: 'D2026-085', statut: 'Signé', client: 'Mme Martin', chantier: 'Plomberie complète', modifie: '28/03', date: '25/03', valable: '25/04', totalHT: '4 800 €', totalTTC: '5 280 €' },
  { id: '084', numero: 'D2026-084', statut: 'Refusé', client: 'M. Leroy', chantier: 'Toiture', modifie: '25/03', date: '20/03', valable: '20/04', totalHT: '12 000 €', totalTTC: '13 200 €' },
  { id: '083', numero: 'D2026-083', statut: 'Signé', client: 'M. Bernard', chantier: 'Carrelage', modifie: '22/03', date: '18/03', valable: '18/04', totalHT: '3 100 €', totalTTC: '3 410 €' },
  { id: '082', numero: 'D2026-082', statut: 'Expiré', client: 'Mme Petit', chantier: 'Isolation', modifie: '15/03', date: '10/03', valable: '10/04', totalHT: '6 200 €', totalTTC: '6 820 €' },
]

const STATUS_STYLES: Record<DevisStatus, string> = {
  Brouillon: 'bg-gray-100 text-gray-600',
  Envoyé: 'bg-blue-50 text-blue-700',
  Finalisé: 'bg-violet-50 text-violet-700',
  Signé: 'bg-green-50 text-green-700',
  Refusé: 'bg-red-50 text-red-700',
  Expiré: 'bg-orange-50 text-orange-700',
}

const FILTER_OPTIONS: DevisStatus[] | ['Tous'] = ['Tous', 'Brouillon', 'Envoyé', 'Signé', 'Refusé', 'Expiré'] as any
const SORT_OPTIONS = ['Date', 'Montant', 'Client']

// -------------------------------------------------------------------
// Page
// -------------------------------------------------------------------

export default function DevisListPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Tous')
  const [sort, setSort] = useState('Date')
  const [openActions, setOpenActions] = useState<string | null>(null)

  const filtered = DEMO_DEVIS.filter((d) => {
    if (filter !== 'Tous' && d.statut !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        d.numero.toLowerCase().includes(q) ||
        d.client.toLowerCase().includes(q) ||
        d.chantier.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<FileText size={20} />} label="Tous" value="24" accent="#5ab4e0" />
        <StatCard icon={<Send size={20} />} label="Envoyés" value="8" sub="18 200 €" accent="#5ab4e0" />
        <StatCard icon={<CheckCircle2 size={20} />} label="Signés" value="12" sub="42 300 €" accent="#22c55e" />
        <StatCard icon={<Clock size={20} />} label="En attente" value="4" sub="9 800 €" accent="#e87a2a" />
      </div>

      {/* Action bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un devis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 rounded-lg border border-gray-200 pl-9 pr-4 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none transition-colors"
          />
        </div>

        {/* Filter */}
        <div className="relative">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 px-3 pr-8 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none appearance-none bg-white cursor-pointer"
          >
            {(FILTER_OPTIONS as string[]).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 px-3 pr-8 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none appearance-none bg-white cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* New button */}
        <Link
          href="/dashboard/devis/nouveau"
          className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-[#e87a2a] hover:bg-[#f09050] text-white text-sm font-syne font-bold transition-colors"
        >
          <Plus size={16} />
          Nouveau devis
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-gray-50">
              {['Numéro', 'Statut', 'Client / Chantier', 'Modifié', 'Date', 'Valable jusqu\'au', 'Total HT', 'Total TTC', 'Actions'].map((col) => (
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
            {filtered.map((devis, idx) => (
              <tr
                key={devis.id}
                onClick={() => router.push(`/dashboard/devis/${devis.id}`)}
                className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                  idx % 2 === 1 ? 'bg-[#f8f9fa]' : ''
                }`}
              >
                <td className="px-4 py-3 text-sm font-manrope font-semibold text-[#1a1a2e]">
                  {devis.numero}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-manrope font-medium ${STATUS_STYLES[devis.statut]}`}>
                    {devis.statut}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-manrope font-medium text-[#1a1a2e]">{devis.client}</div>
                  <div className="text-xs font-manrope text-gray-500">{devis.chantier}</div>
                </td>
                <td className="px-4 py-3 text-sm font-manrope text-gray-600">{devis.modifie}</td>
                <td className="px-4 py-3 text-sm font-manrope text-gray-600">{devis.date}</td>
                <td className="px-4 py-3 text-sm font-manrope text-gray-600">{devis.valable}</td>
                <td className="px-4 py-3 text-sm font-manrope font-medium text-[#1a1a2e]">{devis.totalHT}</td>
                <td className="px-4 py-3 text-sm font-manrope font-bold text-[#1a1a2e]">{devis.totalTTC}</td>
                <td className="px-4 py-3">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenActions(openActions === devis.id ? null : devis.id)
                      }}
                      className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <MoreHorizontal size={16} className="text-gray-500" />
                    </button>
                    {openActions === devis.id && (
                      <div className="absolute right-0 top-8 z-20 w-44 bg-white rounded-lg shadow-xl border border-gray-200 py-1 overflow-hidden">
                        {[
                          { label: 'Voir', icon: Eye },
                          { label: 'Modifier', icon: Pencil },
                          { label: 'Dupliquer', icon: Copy },
                          { label: 'Envoyer', icon: SendHorizonal },
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
            <FileText size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-manrope text-gray-500">Aucun devis trouvé</p>
          </div>
        )}
      </div>
    </div>
  )
}

// -------------------------------------------------------------------
// StatCard
// -------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  accent: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      <div
        className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: accent + '15', color: accent }}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs font-manrope text-gray-500">{label}</p>
        <p className="text-xl font-syne font-bold text-[#1a1a2e]">{value}</p>
        {sub && <p className="text-xs font-manrope text-gray-500">{sub}</p>}
      </div>
    </div>
  )
}
