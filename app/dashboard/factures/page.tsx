'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
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

type FactureFilter = 'Toutes' | 'Encaissées' | 'Partielles' | 'En attente' | 'En retard'

interface Facture {
  id: string
  numero: string
  paidPercent: number
  client: string
  chantier: string
  modifie: string
  date: string
  netAPayer: string
  netValue: number
  restant?: string
  retard?: string
}

const DEMO_FACTURES: Facture[] = [
  { id: '067', numero: 'F2026-067', paidPercent: 100, client: 'Mme Martin', chantier: 'Plomberie complète', modifie: '06/04', date: '28/03', netAPayer: '5 280 €', netValue: 5280 },
  { id: '066', numero: 'F2026-066', paidPercent: 100, client: 'M. Petit', chantier: 'Extension terrasse', modifie: '05/04', date: '25/03', netAPayer: '5 610 €', netValue: 5610 },
  { id: '065', numero: 'F2026-065', paidPercent: 50, client: 'SARL Renov33', chantier: 'Extension', modifie: '04/04', date: '20/03', netAPayer: '9 350 €', netValue: 9350, restant: '4 675 € restants' },
  { id: '064', numero: 'F2026-064', paidPercent: 0, client: 'M. Leroy', chantier: 'Toiture', modifie: '02/04', date: '15/03', netAPayer: '13 200 €', netValue: 13200, retard: 'En retard 23j' },
  { id: '063', numero: 'F2026-063', paidPercent: 100, client: 'M. Bernard', chantier: 'Carrelage', modifie: '01/04', date: '10/03', netAPayer: '3 410 €', netValue: 3410 },
  { id: '062', numero: 'F2026-062', paidPercent: 30, client: 'Mme Girard', chantier: 'Électricité', modifie: '28/03', date: '05/03', netAPayer: '3 520 €', netValue: 3520 },
  { id: '061', numero: 'F2026-061', paidPercent: 0, client: 'M. Dupont', chantier: 'SDB', modifie: '25/03', date: '01/03', netAPayer: '2 695 €', netValue: 2695, retard: 'En retard 37j' },
  { id: '060', numero: 'F2026-060', paidPercent: 100, client: 'M. Moreau', chantier: 'Peinture', modifie: '20/03', date: '25/02', netAPayer: '2 145 €', netValue: 2145 },
]

const FILTER_OPTIONS: string[] = ['Toutes', 'Encaissées', 'Partielles', 'En attente', 'En retard']

function getFactureCategory(f: Facture): FactureFilter {
  if (f.paidPercent === 100) return 'Encaissées'
  if (f.retard) return 'En retard'
  if (f.paidPercent > 0) return 'Partielles'
  return 'En attente'
}

// -------------------------------------------------------------------
// Page
// -------------------------------------------------------------------

export default function FacturesListPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Toutes')
  const [openActions, setOpenActions] = useState<string | null>(null)

  const filtered = DEMO_FACTURES.filter((f) => {
    if (filter !== 'Toutes' && getFactureCategory(f) !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        f.numero.toLowerCase().includes(q) ||
        f.client.toLowerCase().includes(q) ||
        f.chantier.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<FileText size={20} />} label="Toutes" value="18" sub="62 400 € HT" accent="#5ab4e0" />
        <StatCard icon={<CheckCircle2 size={20} />} label="Encaissées" value="12" sub="41 200 € HT" accent="#22c55e" />
        <StatCard icon={<Clock size={20} />} label="Reste à encaisser" value="4" sub="16 800 € HT" accent="#e87a2a" />
        <StatCard icon={<AlertTriangle size={20} />} label="En retard" value="2" sub="4 400 € HT" accent="#ef4444" bg="bg-red-50" />
      </div>

      {/* Action bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une facture..."
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
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* New button */}
        <Link
          href="/dashboard/factures/nouveau"
          className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-[#e87a2a] hover:bg-[#f09050] text-white text-sm font-syne font-bold transition-colors"
        >
          <Plus size={16} />
          Nouvelle facture
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-gray-50">
              {['Numéro', 'Règlements', 'Client / Chantier', 'Modifié', 'Date', 'Net à payer', 'Actions'].map((col) => (
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
            {filtered.map((facture, idx) => (
              <tr
                key={facture.id}
                onClick={() => router.push(`/dashboard/factures/${facture.id}`)}
                className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                  idx % 2 === 1 ? 'bg-[#f8f9fa]' : ''
                }`}
              >
                <td className="px-4 py-3 text-sm font-manrope font-semibold text-[#1a1a2e]">
                  {facture.numero}
                </td>
                <td className="px-4 py-3">
                  <PaymentBar percent={facture.paidPercent} restant={facture.restant} retard={facture.retard} />
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-manrope font-medium text-[#1a1a2e]">{facture.client}</div>
                  <div className="text-xs font-manrope text-gray-500">{facture.chantier}</div>
                </td>
                <td className="px-4 py-3 text-sm font-manrope text-gray-600">{facture.modifie}</td>
                <td className="px-4 py-3 text-sm font-manrope text-gray-600">{facture.date}</td>
                <td className="px-4 py-3 text-sm font-manrope font-bold text-[#1a1a2e]">{facture.netAPayer}</td>
                <td className="px-4 py-3">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenActions(openActions === facture.id ? null : facture.id)
                      }}
                      className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <MoreHorizontal size={16} className="text-gray-500" />
                    </button>
                    {openActions === facture.id && (
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
            <p className="text-sm font-manrope text-gray-500">Aucune facture trouvée</p>
          </div>
        )}
      </div>
    </div>
  )
}

// -------------------------------------------------------------------
// PaymentBar
// -------------------------------------------------------------------

function PaymentBar({ percent, restant, retard }: { percent: number; restant?: string; retard?: string }) {
  let barColor = 'bg-gray-300'
  if (percent === 100) barColor = 'bg-green-500'
  else if (percent > 0) barColor = 'bg-[#5ab4e0]'

  return (
    <div className="min-w-[120px]">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${percent}%` }} />
        </div>
        <span className="text-xs font-manrope text-gray-500 whitespace-nowrap">{percent}%</span>
      </div>
      {restant && <p className="text-xs font-manrope text-[#5ab4e0]">{restant}</p>}
      {retard && <p className="text-xs font-manrope text-red-500 font-medium">{retard}</p>}
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
  bg,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  accent: string
  bg?: string
}) {
  return (
    <div className={`${bg || 'bg-white'} rounded-xl border border-gray-200 p-4 flex items-center gap-3`}>
      <div
        className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: accent + '15', color: accent }}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs font-manrope text-gray-500">{label}</p>
        <p className="text-lg font-syne font-bold text-[#1a1a2e]">{value}</p>
        {sub && <p className="text-xs font-manrope text-gray-500">{sub}</p>}
      </div>
    </div>
  )
}
