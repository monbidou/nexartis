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
import { useFactures, useClients, deleteRow, LoadingSkeleton, ErrorBanner } from '@/lib/hooks'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

type FactureFilter = 'Toutes' | 'Encaissées' | 'Partielles' | 'En attente' | 'En retard'

const FILTER_OPTIONS: string[] = ['Toutes', 'Encaissées', 'Partielles', 'En attente', 'En retard']

function getFactureCategory(f: Record<string, unknown>): FactureFilter {
  const statut = (f.statut as string) ?? ''
  if (statut === 'payee') return 'Encaissées'
  if (statut === 'partielle') return 'Partielles'
  if (statut === 'en_retard') return 'En retard'
  return 'En attente'
}

function formatCurrency(n: number): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' \u20AC'
}

function formatDate(iso: string | null): string {
  if (!iso) return '\u2014'
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

function daysOverdue(dateEcheance: string | null): number {
  if (!dateEcheance) return 0
  const diff = Date.now() - new Date(dateEcheance).getTime()
  return Math.max(0, Math.floor(diff / 86400000))
}

// -------------------------------------------------------------------
// Page
// -------------------------------------------------------------------

export default function FacturesListPage() {
  const router = useRouter()
  const { data: factures, loading: loadingF, error: errorF, refetch: refetchF } = useFactures()
  const { data: clients, loading: loadingC } = useClients()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Toutes')
  const [openActions, setOpenActions] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const loading = loadingF || loadingC

  // Build a client map for quick lookup
  const clientMap = new Map<string, string>()
  for (const c of clients) {
    const nom = [c.nom, c.prenom].filter(Boolean).join(' ') || (c.raison_sociale as string) || ''
    clientMap.set(c.id as string, nom)
  }

  type EnrichedFacture = Record<string, unknown> & { paidPercent: number; overdue: number; category: FactureFilter; clientName: string; montantTtc: number; montantPaye: number }
  const enriched: EnrichedFacture[] = factures.map((f) => {
    const montantTtc = (f.montant_ttc as number) ?? 0
    const montantPaye = (f.montant_paye as number) ?? 0
    const paidPercent = montantTtc > 0 ? Math.round((montantPaye / montantTtc) * 100) : 0
    const overdue = daysOverdue(f.date_echeance as string | null)
    const category = getFactureCategory(f)
    const clientName = clientMap.get(f.client_id as string) ?? '\u2014'
    return { ...f, paidPercent, overdue, category, clientName, montantTtc, montantPaye } as EnrichedFacture
  })

  const filtered = enriched.filter((f) => {
    if (filter !== 'Toutes' && f.category !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        ((f.numero as string) ?? '').toLowerCase().includes(q) ||
        f.clientName.toLowerCase().includes(q) ||
        ((f.objet as string) ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  // Compute stats
  const totalCount = enriched.length
  const totalHT = enriched.reduce((s, f) => s + ((f.montant_ht as number) ?? 0), 0)
  const encaissees = enriched.filter((f) => f.category === 'Encaissées')
  const encaisseesHT = encaissees.reduce((s, f) => s + ((f.montant_ht as number) ?? 0), 0)
  const resteList = enriched.filter((f) => f.category === 'Partielles' || f.category === 'En attente')
  const resteHT = resteList.reduce((s, f) => s + ((f.montant_ht as number) ?? 0), 0)
  const retardList = enriched.filter((f) => f.category === 'En retard')
  const retardHT = retardList.reduce((s, f) => s + ((f.montant_ht as number) ?? 0), 0)

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette facture ?')) return
    setDeleting(id)
    try {
      await deleteRow('factures', id)
      refetchF()
    } catch (err) {
      alert('Erreur lors de la suppression : ' + (err as Error).message)
    } finally {
      setDeleting(null)
      setOpenActions(null)
    }
  }

  if (errorF) {
    return <ErrorBanner message={errorF} onRetry={refetchF} />
  }

  if (loading) {
    return <LoadingSkeleton rows={6} />
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<FileText size={20} />} label="Toutes" value={String(totalCount)} sub={`${formatCurrency(totalHT)} HT`} accent="#5ab4e0" />
        <StatCard icon={<CheckCircle2 size={20} />} label="Encaissées" value={String(encaissees.length)} sub={`${formatCurrency(encaisseesHT)} HT`} accent="#22c55e" />
        <StatCard icon={<Clock size={20} />} label="Reste à encaisser" value={String(resteList.length)} sub={`${formatCurrency(resteHT)} HT`} accent="#e87a2a" />
        <StatCard icon={<AlertTriangle size={20} />} label="En retard" value={String(retardList.length)} sub={`${formatCurrency(retardHT)} HT`} accent="#ef4444" bg="bg-red-50" />
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
            {filtered.map((facture, idx) => {
              const id = facture.id as string
              const restant = facture.montantTtc - facture.montantPaye
              const restantLabel = facture.paidPercent > 0 && facture.paidPercent < 100
                ? `${formatCurrency(restant)} restants`
                : undefined
              const retardLabel = facture.category === 'En retard' && facture.overdue > 0
                ? `En retard ${facture.overdue}j`
                : undefined

              return (
                <tr
                  key={id}
                  onClick={() => router.push(`/dashboard/factures/${id}`)}
                  className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                    idx % 2 === 1 ? 'bg-[#f8f9fa]' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-sm font-manrope font-semibold text-[#1a1a2e]">
                    {(facture.numero as string) ?? '\u2014'}
                  </td>
                  <td className="px-4 py-3">
                    <PaymentBar percent={facture.paidPercent} restant={restantLabel} retard={retardLabel} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-manrope font-medium text-[#1a1a2e]">{facture.clientName}</div>
                    <div className="text-xs font-manrope text-gray-500">{(facture.objet as string) ?? ''}</div>
                  </td>
                  <td className="px-4 py-3 text-sm font-manrope text-gray-600">{formatDate(facture.updated_at as string | null)}</td>
                  <td className="px-4 py-3 text-sm font-manrope text-gray-600">{formatDate(facture.date_facture as string | null)}</td>
                  <td className="px-4 py-3 text-sm font-manrope font-bold text-[#1a1a2e]">{formatCurrency(facture.montantTtc)}</td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenActions(openActions === id ? null : id)
                        }}
                        className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                      >
                        <MoreHorizontal size={16} className="text-gray-500" />
                      </button>
                      {openActions === id && (
                        <div className="absolute right-0 top-8 z-20 w-44 bg-white rounded-lg shadow-xl border border-gray-200 py-1 overflow-hidden">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenActions(null)
                              router.push(`/dashboard/factures/${id}`)
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
                              router.push(`/dashboard/factures/${id}/modifier`)
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-manrope hover:bg-gray-50 transition-colors text-[#1a1a2e]"
                          >
                            <Pencil size={14} />
                            Modifier
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenActions(null)
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-manrope hover:bg-gray-50 transition-colors text-[#1a1a2e]"
                          >
                            <Copy size={14} />
                            Dupliquer
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenActions(null)
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-manrope hover:bg-gray-50 transition-colors text-[#1a1a2e]"
                          >
                            <SendHorizonal size={14} />
                            Envoyer
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(id)
                            }}
                            disabled={deleting === id}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-manrope hover:bg-gray-50 transition-colors text-red-600"
                          >
                            <Trash2 size={14} />
                            {deleting === id ? 'Suppression...' : 'Supprimer'}
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
