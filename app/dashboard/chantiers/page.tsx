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
import { useChantiers, useClients, deleteRow, LoadingSkeleton, ErrorBanner } from '@/lib/hooks'

// -------------------------------------------------------------------
// Types & Helpers
// -------------------------------------------------------------------

type ChantierFilter = 'Tous' | 'En cours' | 'Terminés' | 'Archivés'

const FILTER_OPTIONS: string[] = ['Tous', 'En cours', 'Terminés', 'Archivés']

function statutToFilter(statut: string): ChantierFilter {
  switch (statut) {
    case 'en_cours': return 'En cours'
    case 'livre':
    case 'cloture': return 'Terminés'
    case 'archive': return 'Archivés'
    default: return 'En cours'
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014'
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatMoney(amount: number | null): string {
  if (amount == null) return '0 \u20ac'
  return amount.toLocaleString('fr-FR') + ' \u20ac'
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

// -------------------------------------------------------------------
// Page
// -------------------------------------------------------------------

export default function ChantiersListPage() {
  const router = useRouter()
  const { data: chantiers, loading, error, refetch } = useChantiers()
  const { data: clients } = useClients()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Tous')
  const [openActions, setOpenActions] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const clientMap = new Map(clients.map((c) => [c.id as string, c]))

  const filtered = chantiers.filter((c: Record<string, unknown>) => {
    const displayFilter = statutToFilter(c.statut as string)
    if (filter !== 'Tous' && displayFilter !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      const client = clientMap.get(c.client_id as string)
      const clientName = client ? `${client.prenom ?? ''} ${client.nom ?? ''}`.trim() : ''
      return (
        clientName.toLowerCase().includes(q) ||
        (c.titre as string || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  function getProgressColor(percent: number) {
    if (percent >= 75) return 'bg-green-500'
    if (percent >= 25) return 'bg-[#5ab4e0]'
    return 'bg-[#e87a2a]'
  }

  function computeAvancement(c: Record<string, unknown>): number {
    const devis = (c.montant_devis_total as number) || 0
    const facture = (c.montant_facture as number) || 0
    if (devis === 0) return 0
    return Math.min(100, Math.round((facture / devis) * 100))
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce chantier ?')) return
    setDeleting(id)
    try {
      await deleteRow('chantiers', id)
      refetch()
    } catch (err) {
      alert('Erreur lors de la suppression : ' + (err as Error).message)
    } finally {
      setDeleting(null)
      setOpenActions(null)
    }
  }

  if (loading) return <div className="space-y-6"><LoadingSkeleton rows={6} /></div>
  if (error) return <div className="space-y-6"><ErrorBanner message={error} onRetry={refetch} /></div>

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-syne font-bold text-[#0f1a3a]">Chantiers</h1>
          <span className="text-sm font-manrope text-gray-500">({chantiers.length})</span>
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
              {['Client / Chantier', 'Avancement', 'Date d\u00e9but', 'Statut', 'Devis\u00e9 TTC', 'Factur\u00e9 TTC', 'Encaiss\u00e9', '\u00c9quipe', 'Actions'].map((col) => (
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
            {filtered.map((chantier: Record<string, unknown>, idx: number) => {
              const client = clientMap.get(chantier.client_id as string)
              const clientName = client ? `${client.prenom ?? ''} ${client.nom ?? ''}`.trim() : '\u2014'
              const avancement = computeAvancement(chantier)
              const initials = clientName !== '\u2014' ? getInitials(clientName) : '?'

              return (
                <tr
                  key={chantier.id as string}
                  onClick={() => router.push(`/dashboard/chantiers/${chantier.id}`)}
                  className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                    idx % 2 === 1 ? 'bg-[#f8f9fa]' : ''
                  } ${avancement === 100 ? 'bg-green-50/30' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="text-sm font-manrope font-medium text-[#1a1a2e]">{clientName}</div>
                    <div className="text-xs font-manrope text-gray-500">{chantier.titre as string}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="min-w-[100px]">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${getProgressColor(avancement)}`} style={{ width: `${avancement}%` }} />
                        </div>
                        <span className="text-xs font-manrope text-gray-500 whitespace-nowrap">{avancement}%</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-manrope text-gray-600">{formatDate(chantier.date_debut as string)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-manrope font-medium ${
                      statutToFilter(chantier.statut as string) === 'En cours' ? 'bg-blue-50 text-blue-700' :
                      statutToFilter(chantier.statut as string) === 'Termin\u00e9s' ? 'bg-green-50 text-green-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {statutToFilter(chantier.statut as string)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-manrope font-medium text-[#1a1a2e]">{formatMoney(chantier.montant_devis_total as number)}</td>
                  <td className="px-4 py-3 text-sm font-manrope font-medium text-[#1a1a2e]">{formatMoney(chantier.montant_facture as number)}</td>
                  <td className="px-4 py-3 text-sm font-manrope font-medium text-[#1a1a2e]">{formatMoney(chantier.montant_encaisse as number)}</td>
                  <td className="px-4 py-3">
                    <div className="flex -space-x-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-manrope font-bold border-2 border-white"
                        style={{ backgroundColor: (chantier.couleur as string) || '#5ab4e0' }}
                        title={initials}
                      >
                        {initials}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenActions(openActions === (chantier.id as string) ? null : (chantier.id as string))
                        }}
                        className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                      >
                        <MoreHorizontal size={16} className="text-gray-500" />
                      </button>
                      {openActions === (chantier.id as string) && (
                        <div className="absolute right-0 top-8 z-20 w-44 bg-white rounded-lg shadow-xl border border-gray-200 py-1 overflow-hidden">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenActions(null)
                              router.push(`/dashboard/chantiers/${chantier.id}`)
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-manrope hover:bg-gray-50 transition-colors text-[#1a1a2e]"
                          >
                            <Eye size={14} />
                            Voir
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenActions(null)
                              router.push(`/dashboard/chantiers/${chantier.id}`)
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-manrope hover:bg-gray-50 transition-colors text-[#1a1a2e]"
                          >
                            <Pencil size={14} />
                            Modifier
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(chantier.id as string)
                            }}
                            disabled={deleting === (chantier.id as string)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-manrope hover:bg-gray-50 transition-colors text-red-600"
                          >
                            <Trash2 size={14} />
                            {deleting === (chantier.id as string) ? 'Suppression...' : 'Supprimer'}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <HardHat size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-manrope text-gray-500">Aucun chantier trouv\u00e9</p>
          </div>
        )}
      </div>
    </div>
  )
}
