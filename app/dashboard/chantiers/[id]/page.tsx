'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Pencil, User, Phone, Calendar, HardHat,
  FileText, Receipt, Clock, Plus, Download,
  ChevronLeft, ChevronRight, Check, X, Users, Zap,
} from 'lucide-react'
import {
  useSupabaseRecord, useClients, useIntervenants, useDevis, useFactures,
  usePlanning, useAchats, useChantierNotes, useSousTraitantPaiements,
  insertRow, updateRow, deleteRow, LoadingSkeleton,
} from '@/lib/hooks'
import { createClient } from '@/lib/supabase/client'
import { createFactureFromDevis } from '@/lib/services/devis-automatisms'

// -------------------------------------------------------------------
// Types & helpers
// -------------------------------------------------------------------
type R = Record<string, unknown>
type TabKey = 'resume' | 'devis' | 'factures' | 'planning'

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'resume', label: 'Vue générale', icon: HardHat },
  { key: 'devis', label: 'Devis', icon: FileText },
  { key: 'factures', label: 'Factures', icon: Receipt },
  { key: 'planning', label: 'Planning', icon: Clock },
]

const NOTE_CATS = [
  { value: 'urgent', label: "Aujourd'hui", cls: 'bg-[#e87a2a] text-white' },
  { value: 'rappel', label: 'Demain', cls: 'bg-[#e8f4fb] text-[#2d8bc9]' },
  { value: 'info', label: 'Info', cls: 'bg-[#f6f8fb] text-[#7b8ba3]' },
]

const PALETTE_HEX = ['#5ab4e0', '#e87a2a', '#22c55e', '#7c3aed', '#f5c842', '#ef4444']
const PALETTE_BG = ['bg-[#eef7fc]', 'bg-[#fef5ee]', 'bg-[#effbf2]', 'bg-[#f3effe]', 'bg-[#fefce8]', 'bg-[#fef2f2]']

function formatEur(n: number) { return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + '€' }
function formatDate(d: string | undefined) { if (!d) return '—'; return new Date(d).toLocaleDateString('fr-FR') }
function initials(name: string) { return name.split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) }

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function getMonday(d: Date): Date {
  const date = new Date(d); const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff); date.setHours(0, 0, 0, 0); return date
}
function fmtISO(d: Date): string { return d.toISOString().split('T')[0] }
function isSameDay(d1: Date, d2: Date) { return fmtISO(d1) === fmtISO(d2) }

// -------------------------------------------------------------------
// Page
// -------------------------------------------------------------------

export default function ChantierDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  // Data
  const { data: chantier, loading: l1 } = useSupabaseRecord<R>('chantiers', id)
  const { data: clients } = useClients()
  const { data: intervenants } = useIntervenants()
  const { data: allDevis } = useDevis()
  const { data: allFactures } = useFactures()
  const { data: allPlanning, refetch: refetchPlanning } = usePlanning()
  const { data: allAchats } = useAchats()
  const { data: chantierNotes, refetch: refetchNotes } = useChantierNotes(id)
  const { data: stPaiements, refetch: refetchST } = useSousTraitantPaiements(id)

  // State
  const [activeTab, setActiveTab] = useState<TabKey>('resume')
  const [ganttStart, setGanttStart] = useState(() => getMonday(new Date()))
  const [newNote, setNewNote] = useState('')
  const [newNoteCat, setNewNoteCat] = useState('info')
  const [toast, setToast] = useState<string | null>(null)

  // Equipe du chantier
  const [equipe, setEquipe] = useState<R[]>([])
  const [showAddEquipe, setShowAddEquipe] = useState(false)
  const [addEquipeIv, setAddEquipeIv] = useState('')
  const [addEquipeDate, setAddEquipeDate] = useState('')
  const [equipeAdding, setEquipeAdding] = useState(false)
  const [factureCreating, setFactureCreating] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }, [])

  // Fetch equipe assignee au chantier
  const fetchEquipe = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('chantier_intervenants')
        .select('*')
        .eq('chantier_id', id)
        .order('date_assignation', { ascending: true })
      setEquipe(data ?? [])
    } catch (_) { /* table optionnelle */ }
  }, [id])

  useEffect(() => { fetchEquipe() }, [fetchEquipe])

  // ── Derived data ──
  const client = useMemo(() => {
    if (!chantier?.client_id) return null
    return (clients.find(c => (c as R).id === chantier.client_id) as R) ?? null
  }, [clients, chantier])

  const chantierDevis = useMemo(() =>
    allDevis.filter(d => (d as R).chantier_id === id) as R[],
  [allDevis, id])

  const chantierFactures = useMemo(() =>
    allFactures.filter(f => (f as R).chantier_id === id) as R[],
  [allFactures, id])

  const chantierInterventions = useMemo(() =>
    allPlanning.filter(p => (p as R).chantier_id === id) as R[],
  [allPlanning, id])

  const chantierAchats = useMemo(() =>
    allAchats.filter(a => (a as R).chantier_id === id) as R[],
  [allAchats, id])

  // Maps
  const intervenantMap = useMemo(() => {
    const map = new Map<string, R>()
    intervenants.forEach(iv => { const r = iv as R; map.set(r.id as string, r) })
    return map
  }, [intervenants])

  const colorMap = useMemo(() => {
    const map = new Map<string, number>()
    intervenants.forEach((iv, i) => map.set((iv as R).id as string, i % PALETTE_HEX.length))
    return map
  }, [intervenants])

  // ── Finances ──
  const finances = useMemo(() => {
    const deviseTotal = Number(chantier?.montant_devis_total ?? 0)
    const factureTotal = Number(chantier?.montant_facture ?? 0)
    const encaisse = Number(chantier?.montant_encaisse ?? 0)
    const reste = deviseTotal - factureTotal

    const devisCount = chantierDevis.length
    const devisFactures = chantierDevis.filter(d => d.statut === 'facture' || d.statut === 'signe').length
    const pctDevis = devisCount > 0 ? Math.round((devisFactures / devisCount) * 100) : 0
    const pctValeur = deviseTotal > 0 ? Math.round((factureTotal / deviseTotal) * 100) : 0
    const pctEncaissement = deviseTotal > 0 ? Math.round((encaisse / deviseTotal) * 100) : 0

    const totalST = (stPaiements as R[]).reduce((sum, p) => sum + Number(p.montant_prevu ?? 0), 0)
    const totalAchats = chantierAchats.reduce((sum, a) => sum + Number(a.montant_ttc ?? a.montant_ht ?? 0), 0)
    const depenses = totalST + totalAchats
    const marge = factureTotal - depenses
    const margePct = factureTotal > 0 ? Math.round((marge / factureTotal) * 100) : 0

    return { deviseTotal, factureTotal, encaisse, reste, devisCount, devisFactures, pctDevis, pctValeur, pctEncaissement, totalST, totalAchats, depenses, marge, margePct }
  }, [chantier, chantierDevis, stPaiements, chantierAchats])

  // ── Gantt data ──
  const ganttDays = useMemo(() => {
    const days: { label: string; date: Date; dateStr: string; isToday: boolean }[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(ganttStart); d.setDate(d.getDate() + i)
      days.push({ label: DAYS[i], date: d, dateStr: fmtISO(d), isToday: isSameDay(d, new Date()) })
    }
    return days
  }, [ganttStart])

  // Group interventions by intervenant for Gantt
  const ganttPhases = useMemo(() => {
    const map = new Map<string, R[]>()
    chantierInterventions.forEach(pi => {
      const ivId = pi.intervenant_id as string
      if (!ivId) return
      if (!map.has(ivId)) map.set(ivId, [])
      map.get(ivId)!.push(pi)
    })
    return Array.from(map.entries()).map(([ivId, interventions]) => {
      const iv = intervenantMap.get(ivId) as R | undefined
      const colorIdx = colorMap.get(ivId) ?? 0
      return { ivId, iv, interventions, colorIdx }
    })
  }, [chantierInterventions, intervenantMap, colorMap])

  // ── Notes CRUD ──
  const addNote = async () => {
    if (!newNote.trim()) return
    await insertRow('chantier_notes', { chantier_id: id, texte: newNote, categorie: newNoteCat })
    setNewNote(''); refetchNotes(); showToast('Note ajoutée ✓')
  }
  const toggleNote = async (noteId: string, fait: boolean) => {
    await updateRow('chantier_notes', noteId, { fait: !fait, fait_le: !fait ? new Date().toISOString() : null })
    refetchNotes()
  }
  const removeNote = async (noteId: string) => {
    await deleteRow('chantier_notes', noteId)
    refetchNotes(); showToast('Note supprimée')
  }

  // ── Equipe handlers ──
  const handleAddEquipe = async () => {
    if (!addEquipeIv || !addEquipeDate || equipeAdding || !chantier) return
    setEquipeAdding(true)
    try {
      const supabase = createClient()
      await supabase.from('chantier_intervenants').insert({
        chantier_id: id,
        intervenant_id: addEquipeIv,
        date_assignation: new Date().toISOString(),
      })
      const iv = intervenantMap.get(addEquipeIv) as R | undefined
      await supabase.from('planning_interventions').insert({
        user_id: chantier.user_id,
        chantier_id: id,
        client_id: chantier.client_id,
        titre: `Intervention — ${iv ? `${iv.prenom ?? ''} ${iv.nom ?? ''}`.trim() : 'Intervenant'}`,
        date_debut: addEquipeDate,
        heure_debut: '08:00',
        heure_fin: '17:00',
        intervenant_id: addEquipeIv,
        statut: 'planifie',
      })
      await fetchEquipe()
      await refetchPlanning()
      setShowAddEquipe(false)
      setAddEquipeIv('')
      setAddEquipeDate('')
      showToast('Intervenant assigné + planning créé ✓')
    } catch (_err) {
      showToast("Erreur lors de l'assignation")
    } finally {
      setEquipeAdding(false)
    }
  }

  // ── Facturation handler ──
  const handleCreateFacture = async (devisId: string) => {
    setFactureCreating(devisId)
    try {
      const facture = await createFactureFromDevis(devisId)
      showToast('Facture créée ✓')
      const factureId = String((facture as R).id ?? '')
      router.push(`/dashboard/factures/${factureId}`)
    } catch (_err) {
      showToast('Erreur création facture')
    } finally {
      setFactureCreating(null)
    }
  }

  // ── Loading ──
  if (l1) return <div className="p-8"><LoadingSkeleton /></div>
  if (!chantier) return (
    <div className="p-8">
      <Link href="/dashboard/chantiers" className="flex items-center gap-2 text-sm text-[#64748b] hover:text-[#0f1a3a] mb-4"><ArrowLeft className="w-4 h-4" />Retour</Link>
      <p className="text-sm text-[#7b8ba3]">Chantier introuvable.</p>
    </div>
  )

  const statutLabel = (chantier.statut as string) === 'en_cours' ? 'En cours' : (chantier.statut as string) === 'signe' ? 'Signé' : (chantier.statut as string) ?? '—'
  const statutCls = (chantier.statut as string) === 'en_cours' ? 'bg-[#e8f4fb] text-[#2d8bc9]' : (chantier.statut as string) === 'livre' ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fef9e7] text-[#b45309]'

  // ===================================================================
  // RENDER
  // ===================================================================

  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      {/* ── HEADER ── */}
      <header className="bg-white border-b border-[#e6ecf2] px-6 py-4 sticky top-0 z-30 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/chantiers')} className="flex items-center gap-1.5 text-sm text-[#64748b] hover:text-[#0f1a3a] transition-colors font-medium mr-1">
            <ArrowLeft className="w-4 h-4" />Retour
          </button>
          <h1 className="text-xl font-extrabold text-[#0f1a3a] tracking-tight font-jakarta">
            {String(chantier.titre ?? '')}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-[#e6ecf2] rounded-xl text-sm font-semibold text-[#1e293b] hover:border-[#5ab4e0] hover:text-[#5ab4e0] transition-all">
            <Download className="w-4 h-4" />Exporter PDF
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-[#e6ecf2] rounded-xl text-sm font-semibold text-[#1e293b] hover:border-[#5ab4e0] hover:text-[#5ab4e0] transition-all">
            <Pencil className="w-4 h-4" />Modifier
          </button>
        </div>
      </header>

      <div className="px-6 py-5">
        {/* ── HERO ── */}
        <div className="bg-white border border-[#e6ecf2] rounded-2xl p-6 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${statutCls}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />{statutLabel}
            </span>
            <div className="flex bg-[#f6f8fb] rounded-xl p-1 gap-0.5">
              {TABS.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === t.key ? 'bg-white text-[#0f1a3a] shadow-sm' : 'text-[#64748b] hover:text-[#0f1a3a]'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <h2 className="text-[22px] font-extrabold text-[#0f1a3a] tracking-tight mt-2">
            {String(chantier.titre ?? '')} — {client ? String(`${client.prenom ?? ''} ${client.nom ?? ''}`).trim() : 'Client'}
          </h2>
          <div className="text-sm text-[#7b8ba3] font-medium mb-4">
            {String(chantier.description ?? '')} • {String(chantier.adresse_chantier ?? '')}, {String(chantier.ville_chantier ?? '')}
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="flex items-center gap-2 text-[13px] text-[#64748b]">
              <Calendar className="w-4 h-4 text-[#7b8ba3] flex-shrink-0" />
              Début : <strong className="text-[#0f1a3a]">{formatDate(chantier.date_debut as string)}</strong>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-[#64748b]">
              <Clock className="w-4 h-4 text-[#7b8ba3] flex-shrink-0" />
              Fin prévue : <strong className="text-[#0f1a3a]">{formatDate(chantier.date_fin_prevue as string)}</strong>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-[#64748b]">
              <User className="w-4 h-4 text-[#7b8ba3] flex-shrink-0" />
              Client : <strong className="text-[#0f1a3a]">{client ? String(`${client.prenom ?? ''} ${client.nom ?? ''}`).trim() : '—'}</strong>
            </div>
            {(() => { const tel = client?.telephone as string | undefined; return tel ? (
              <div className="flex items-center gap-2 text-[13px] text-[#64748b]">
                <Phone className="w-4 h-4 text-[#7b8ba3] flex-shrink-0" />
                Tél : <a href={`tel:${tel}`} className="text-[#5ab4e0] font-semibold hover:underline">{tel}</a>
              </div>
            ) : null })()}
          </div>
        </div>

        {/* ── FINANCE ROW ── */}
        <div className="grid grid-cols-4 gap-3.5 mb-5">
          {[
            { label: 'Devisé TTC', value: formatEur(finances.deviseTotal) },
            { label: 'Facturé TTC', value: formatEur(finances.factureTotal) },
            { label: 'Encaissé', value: formatEur(finances.encaisse), cls: 'text-[#22c55e]' },
            { label: 'Reste à facturer', value: formatEur(finances.reste), cls: 'text-[#e87a2a]' },
          ].map((f, i) => (
            <div key={i} className="text-center py-4 px-4 bg-[#f6f8fb] rounded-xl">
              <div className={`text-xl font-extrabold tracking-tight ${f.cls ?? 'text-[#0f1a3a]'}`}>{f.value}</div>
              <div className="text-[11px] text-[#7b8ba3] font-medium mt-1">{f.label}</div>
            </div>
          ))}
        </div>

        {/* ── PROGRESS BARS ── */}
        <div className="bg-white border border-[#e6ecf2] rounded-2xl p-5 mb-5 space-y-4">
          <ProgressBar label="Avancement par devis" value={`${finances.devisFactures} / ${finances.devisCount} devis • ${finances.pctDevis}%`} pct={finances.pctDevis} color="bg-[#5ab4e0]" sub={`${finances.devisFactures} devis facturés / ${finances.devisCount} total`} />
          <ProgressBar label="Avancement en valeur" value={`${formatEur(finances.factureTotal)} / ${formatEur(finances.deviseTotal)} • ${finances.pctValeur}%`} pct={finances.pctValeur} color="bg-[#e87a2a]" sub={`${formatEur(finances.factureTotal)} facturés / ${formatEur(finances.deviseTotal)} TTC`} />
          <ProgressBar label="Encaissement" value={`${formatEur(finances.encaisse)} / ${formatEur(finances.deviseTotal)} • ${finances.pctEncaissement}%`} pct={finances.pctEncaissement} color="bg-[#22c55e]" sub={`${formatEur(finances.encaisse)} encaissés / ${formatEur(finances.deviseTotal)} TTC`} />
        </div>

        {/* ── GANTT CHART ── */}
        <div className="bg-white border border-[#e6ecf2] rounded-2xl overflow-hidden mb-5">
          <div className="px-5 py-4 border-b border-[#e6ecf2] flex items-center justify-between">
            <h3 className="text-[15px] font-extrabold text-[#0f1a3a] tracking-tight">Planning des phases</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => { const d = new Date(ganttStart); d.setDate(d.getDate() - 7); setGanttStart(d) }}
                className="w-8 h-8 flex items-center justify-center border border-[#e6ecf2] rounded-lg text-[#64748b] hover:text-[#5ab4e0] hover:border-[#5ab4e0] transition-all">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-semibold text-[#0f1a3a] min-w-[100px] text-center">
                {ganttStart.getDate()} — {new Date(ganttStart.getTime() + 6 * 86400000).getDate()} {MONTHS[ganttStart.getMonth()]}
              </span>
              <button onClick={() => { const d = new Date(ganttStart); d.setDate(d.getDate() + 7); setGanttStart(d) }}
                className="w-8 h-8 flex items-center justify-center border border-[#e6ecf2] rounded-lg text-[#64748b] hover:text-[#5ab4e0] hover:border-[#5ab4e0] transition-all">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="px-5 py-4">
            {/* Header */}
            <div className="grid grid-cols-[220px_repeat(7,1fr)] mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7b8ba3]">Phase / Intervenant</span>
              {ganttDays.map(d => (
                <span key={d.dateStr} className={`text-[10px] font-bold uppercase tracking-wider text-center ${d.isToday ? 'text-[#5ab4e0] font-extrabold' : 'text-[#7b8ba3]'}`}>
                  {d.label} {d.date.getDate()}
                </span>
              ))}
            </div>

            {/* Phases */}
            {ganttPhases.length === 0 && (
              <div className="py-8 text-center text-sm text-[#7b8ba3]">Aucune intervention planifiée pour ce chantier</div>
            )}
            {ganttPhases.map(phase => {
              const ivName = phase.iv ? `${phase.iv.prenom ?? ''} ${(phase.iv.nom as string)?.charAt(0) ?? ''}.` : '—'
              const metier = phase.iv?.metier as string ?? ''
              const hex = PALETTE_HEX[phase.colorIdx]
              // Which days have interventions
              const dayMap = new Map<string, R>()
              phase.interventions.forEach(pi => {
                const d = (pi.date_debut as string)?.split('T')[0]
                if (d) dayMap.set(d, pi)
              })
              // Status
              const allDone = phase.interventions.every(pi => pi.statut === 'termine')
              const anyInProgress = phase.interventions.some(pi => pi.statut === 'en_cours')
              const statusLabel = allDone ? 'Terminé' : anyInProgress ? 'En cours' : 'À venir'
              const statusCls = allDone ? 'bg-[#dcfce7] text-[#166534]' : anyInProgress ? 'bg-[#e8f4fb] text-[#2d8bc9]' : 'bg-[#f6f8fb] text-[#7b8ba3]'

              // Devis linked
              const linkedDevis = chantierDevis.find(d => phase.interventions.some(pi => (pi.description_travaux as string)?.includes(d.objet as string ?? '__')))
              const devisRef = linkedDevis ? `D-${String(linkedDevis.numero ?? '').slice(-4)}` : ''
              const devisAmt = linkedDevis ? formatEur(Number(linkedDevis.montant_ttc ?? 0)) : ''

              return (
                <div key={phase.ivId} className="grid grid-cols-[220px_repeat(7,1fr)] mb-1.5 min-h-[68px] items-stretch">
                  {/* Label */}
                  <div className="py-2 pr-3 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm font-bold text-[#1e293b]">
                      <span className="w-2.5 h-2.5 rounded flex-shrink-0" style={{ background: hex }} />
                      {metier || ivName}
                    </div>
                    <div className="text-[11px] text-[#7b8ba3] pl-[18px]">{ivName} {devisRef && `• ${devisRef} : ${devisAmt}`}</div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded w-fit ml-[18px] ${statusCls}`}>{statusLabel}</span>
                  </div>

                  {/* Day cells */}
                  {ganttDays.map((day, di) => {
                    const intervention = dayMap.get(day.dateStr)
                    if (!intervention) {
                      return <div key={day.dateStr} className={`border-r border-[#e6ecf2]/30 min-h-[68px] relative ${day.isToday ? 'bg-[#5ab4e0]/[.03]' : ''}`}>
                        {day.isToday && <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-[#ef4444] z-10"><span className="absolute -top-1 -left-[3px] w-2 h-2 bg-[#ef4444] rounded-full" /></div>}
                      </div>
                    }

                    // Check continuity (is prev/next day also filled?)
                    const prevDay = di > 0 ? ganttDays[di - 1] : null
                    const nextDay = di < 6 ? ganttDays[di + 1] : null
                    const hasPrev = prevDay && dayMap.has(prevDay.dateStr)
                    const hasNext = nextDay && dayMap.has(nextDay.dateStr)
                    const radius = hasPrev && hasNext ? 'rounded-none' : hasPrev ? 'rounded-r-lg rounded-l-none' : hasNext ? 'rounded-l-lg rounded-r-none' : 'rounded-lg'
                    const margin = hasPrev ? 'ml-0' : 'ml-0.5'
                    const marginR = hasNext ? 'mr-0' : 'mr-0.5'

                    return (
                      <div key={day.dateStr} className={`border-r border-[#e6ecf2]/30 min-h-[68px] relative ${day.isToday ? 'bg-[#5ab4e0]/[.03]' : ''}`}>
                        <div className={`absolute top-1 bottom-1 ${margin} ${marginR} ${radius} flex flex-col justify-center px-3 text-white cursor-pointer hover:brightness-105 transition-all`}
                          style={{ background: hex, left: hasPrev ? '-1px' : '2px', right: hasNext ? '-1px' : '2px', outline: '2px solid rgba(255,255,255,.15)', outlineOffset: '-2px' }}>
                          <div className="text-[12px] font-bold truncate">{ivName}</div>
                          <div className="text-[10px] font-medium opacity-85 truncate">{String(intervention.titre ?? '')}</div>
                        </div>
                        {day.isToday && <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-[#ef4444] z-10"><span className="absolute -top-1 -left-[3px] w-2 h-2 bg-[#ef4444] rounded-full" /></div>}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── EQUIPE DU CHANTIER ── */}
        <div className="bg-white border border-[#e6ecf2] rounded-2xl overflow-hidden mb-5">
          <div className="px-5 py-4 border-b border-[#e6ecf2] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#5ab4e0]" />
              <h3 className="text-[15px] font-extrabold text-[#0f1a3a]">Équipe du chantier</h3>
              {equipe.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#e8f4fb] text-[#2d8bc9] text-[11px] font-bold">{equipe.length}</span>
              )}
            </div>
            <button onClick={() => setShowAddEquipe(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e6ecf2] text-xs font-semibold text-[#64748b] hover:border-[#5ab4e0] hover:text-[#5ab4e0] transition-all">
              <Plus className="w-3 h-3" />Ajouter intervenant
            </button>
          </div>

          {/* Formulaire d'ajout */}
          {showAddEquipe && (
            <div className="px-5 py-4 border-b border-[#e6ecf2] bg-[#f6f8fb] flex gap-3 items-end flex-wrap">
              <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#7b8ba3]">Intervenant</label>
                <select value={addEquipeIv} onChange={e => setAddEquipeIv(e.target.value)}
                  className="px-3 py-2 border border-[#e6ecf2] rounded-lg text-[13px] font-medium text-[#1e293b] bg-white outline-none focus:border-[#5ab4e0] transition-all">
                  <option value="">-- Sélectionner --</option>
                  {intervenants.map(iv => {
                    const r = iv as R
                    return (
                      <option key={r.id as string} value={r.id as string}>
                        {String(r.prenom ?? '')} {String(r.nom ?? '')} — {String(r.metier ?? '')}
                      </option>
                    )
                  })}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#7b8ba3]">Date de début</label>
                <input type="date" value={addEquipeDate} onChange={e => setAddEquipeDate(e.target.value)}
                  className="px-3 py-2 border border-[#e6ecf2] rounded-lg text-[13px] font-medium text-[#1e293b] bg-white outline-none focus:border-[#5ab4e0] transition-all" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowAddEquipe(false); setAddEquipeIv(''); setAddEquipeDate('') }}
                  className="px-3 py-2 border border-[#e6ecf2] rounded-lg text-[13px] font-semibold text-[#64748b] hover:border-[#ef4444] hover:text-[#ef4444] transition-all">
                  Annuler
                </button>
                <button onClick={handleAddEquipe} disabled={equipeAdding || !addEquipeIv || !addEquipeDate}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#5ab4e0] to-[#2d8bc9] text-white rounded-lg text-[13px] font-bold hover:shadow-md transition-all disabled:opacity-50">
                  <Zap className="w-3.5 h-3.5" />
                  {equipeAdding ? 'Assignation...' : 'Assigner + créer planning'}
                </button>
              </div>
            </div>
          )}

          {/* Liste équipe */}
          <div className="divide-y divide-[#e6ecf2]">
            {equipe.length === 0 && (
              <div className="px-5 py-8 text-center">
                <div className="w-10 h-10 bg-[#f6f8fb] rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Users className="w-5 h-5 text-[#7b8ba3]" />
                </div>
                <div className="text-sm text-[#7b8ba3] font-medium">Aucun intervenant assigné</div>
                <div className="text-xs text-[#7b8ba3] mt-1">Cliquez sur &quot;Ajouter intervenant&quot; pour assigner l&apos;équipe et générer le planning automatiquement</div>
              </div>
            )}
            {equipe.map((e: R) => {
              const iv = intervenantMap.get(e.intervenant_id as string) as R | undefined
              const colorIdx = colorMap.get(e.intervenant_id as string) ?? (equipe.indexOf(e) % PALETTE_HEX.length)
              return (
                <div key={e.id as string} className="flex items-center gap-4 px-5 py-4 hover:bg-[#f6f8fb]/50 transition-all">
                  <div className="w-10 h-10 rounded-xl text-white text-[13px] font-bold flex items-center justify-center flex-shrink-0"
                    style={{ background: PALETTE_HEX[colorIdx] }}>
                    {iv ? initials(`${iv.prenom ?? ''} ${iv.nom ?? ''}`) : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-[#1e293b]">{iv ? `${iv.prenom ?? ''} ${iv.nom ?? ''}`.trim() : '—'}</div>
                    <div className="text-[11px] text-[#7b8ba3] mt-0.5">
                      {String(iv?.metier ?? '')} • Assigné le {formatDate(e.date_assignation as string)}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#e8f4fb] text-[#2d8bc9]">
                    <Zap className="w-2.5 h-2.5" />Planning créé
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── NOTES + SOUS-TRAITANTS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          {/* Notes */}
          <div className="bg-white border border-[#e6ecf2] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e6ecf2] flex items-center justify-between">
              <h3 className="text-[15px] font-extrabold text-[#0f1a3a]">Notes & rappels</h3>
              <span className="text-[11px] text-[#7b8ba3] font-semibold">{(chantierNotes as R[]).filter(n => !n.fait).length} tâches</span>
            </div>
            <div className="px-5 py-3">
              {(chantierNotes as R[]).map(note => {
                const cat = NOTE_CATS.find(c => c.value === note.categorie) ?? NOTE_CATS[2]
                return (
                  <div key={note.id as string} className="flex gap-2.5 py-2.5 border-b border-[#e6ecf2] last:border-b-0 items-start group">
                    <button onClick={() => toggleNote(note.id as string, note.fait as boolean)}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${Boolean(note.fait) ? 'bg-[#22c55e] border-[#22c55e] text-white' : 'border-[#e6ecf2] hover:border-[#5ab4e0]'}`}>
                      {Boolean(note.fait) && <Check className="w-3 h-3" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[13px] font-medium leading-snug ${Boolean(note.fait) ? 'line-through text-[#7b8ba3]' : 'text-[#1e293b]'}`}>{String(note.texte ?? '')}</div>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#7b8ba3]">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${cat.cls}`}>{cat.label}</span>
                        {Boolean(note.fait_le) && <span>Fait le {formatDate(note.fait_le as string)}</span>}
                      </div>
                    </div>
                    <button onClick={() => removeNote(note.id as string)}
                      className="w-5 h-5 rounded flex items-center justify-center text-[#7b8ba3] opacity-0 group-hover:opacity-100 hover:bg-[#fee2e2] hover:text-[#ef4444] transition-all">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )
              })}
              {/* Add note */}
              <div className="flex gap-2 pt-2.5 items-center">
                <select value={newNoteCat} onChange={e => setNewNoteCat(e.target.value)}
                  className="px-2.5 py-2 border border-[#e6ecf2] rounded-lg text-xs font-semibold text-[#64748b] bg-white outline-none">
                  {NOTE_CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <input type="text" value={newNote} onChange={e => setNewNote(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addNote() }}
                  placeholder="Ajouter une note ou un rappel..."
                  className="flex-1 px-3 py-2 border-2 border-dashed border-[#e6ecf2] rounded-lg text-[13px] focus:border-[#5ab4e0] focus:bg-[#5ab4e0]/[.03] outline-none transition-all placeholder:text-[#7b8ba3]" />
                <button onClick={addNote} className="px-3 py-2 bg-gradient-to-r from-[#e87a2a] to-[#f09050] text-white rounded-lg text-xs font-bold hover:shadow-md transition-all">+</button>
              </div>
            </div>
          </div>

          {/* Sous-traitants */}
          <div className="bg-white border border-[#e6ecf2] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e6ecf2] flex items-center justify-between">
              <h3 className="text-[15px] font-extrabold text-[#0f1a3a]">Sous-traitants</h3>
              <button className="flex items-center gap-1 text-xs text-[#64748b] font-semibold hover:text-[#5ab4e0] transition-all">
                <Plus className="w-3 h-3" />Ajouter
              </button>
            </div>
            <table className="w-full">
              <thead className="bg-[#f6f8fb]">
                <tr>
                  <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#7b8ba3] text-left border-b border-[#e6ecf2]">Intervenant</th>
                  <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#7b8ba3] text-left border-b border-[#e6ecf2]">Prévu</th>
                  <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#7b8ba3] text-left border-b border-[#e6ecf2]">Payé</th>
                  <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#7b8ba3] text-left border-b border-[#e6ecf2]">Statut</th>
                  <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#7b8ba3] text-left border-b border-[#e6ecf2]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(stPaiements as R[]).length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-6 text-center text-sm text-[#7b8ba3]">Aucun sous-traitant enregistré</td></tr>
                )}
                {(stPaiements as R[]).map(st => {
                  const iv = intervenantMap.get(st.intervenant_id as string) as R | undefined
                  const colorIdx = colorMap.get(st.intervenant_id as string) ?? 0
                  const statut = st.statut as string
                  const statutCls = statut === 'paye' ? 'bg-[#dcfce7] text-[#166534]' : statut === 'partiel' ? 'bg-[#fef9e7] text-[#b45309]' : 'bg-[#fee2e2] text-[#991b1b]'
                  const statutLbl = statut === 'paye' ? 'Payé' : statut === 'partiel' ? 'Partiel' : 'À payer'
                  return (
                    <tr key={st.id as string} className="hover:bg-[#f6f8fb]/60">
                      <td className="px-5 py-3 border-b border-[#e6ecf2]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg text-white text-[10px] font-bold flex items-center justify-center" style={{ background: PALETTE_HEX[colorIdx] }}>
                            {iv ? initials(`${iv.prenom ?? ''} ${iv.nom ?? ''}`) : '?'}
                          </div>
                          <div>
                            <div className="text-[13px] font-semibold">{iv ? `${iv.prenom ?? ''} ${iv.nom ?? ''}`.trim() : '—'}</div>
                            <div className="text-[11px] text-[#7b8ba3]">{String(iv?.metier ?? '')}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 border-b border-[#e6ecf2] text-[13px] font-bold text-[#0f1a3a]">{formatEur(Number(st.montant_prevu ?? 0))}</td>
                      <td className="px-5 py-3 border-b border-[#e6ecf2] text-[13px] font-bold text-[#0f1a3a]">{formatEur(Number(st.montant_paye ?? 0))}</td>
                      <td className="px-5 py-3 border-b border-[#e6ecf2]">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${statutCls}`}>{statutLbl}</span>
                      </td>
                      <td className="px-5 py-3 border-b border-[#e6ecf2]">
                        <div className="flex gap-1">
                          {statut !== 'paye' && (
                            <button onClick={async () => {
                              await updateRow('sous_traitant_paiements', st.id as string, { montant_paye: st.montant_prevu, statut: 'paye' })
                              refetchST(); showToast('Paiement enregistré ✓')
                            }} className="px-2.5 py-1 text-[11px] font-semibold border border-[#22c55e] text-[#22c55e] bg-[#dcfce7] rounded-md hover:bg-[#22c55e] hover:text-white transition-all">
                              Payer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── DEVIS LIES + FACTURATION ── */}
        {chantierDevis.length > 0 && (
          <div className="bg-white border border-[#e6ecf2] rounded-2xl overflow-hidden mb-5">
            <div className="px-5 py-4 border-b border-[#e6ecf2] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#e87a2a]" />
                <h3 className="text-[15px] font-extrabold text-[#0f1a3a]">Devis & Facturation</h3>
              </div>
              <span className="text-[11px] text-[#7b8ba3] font-semibold">
                {chantierDevis.filter(d => d.statut === 'facture').length} / {chantierDevis.length} devis facturés
              </span>
            </div>
            <div className="divide-y divide-[#e6ecf2]">
              {chantierDevis.map(d => {
                const isFacture = d.statut === 'facture'
                const linkedFactures = chantierFactures.filter(f => (f as R).devis_id === d.id)
                return (
                  <div key={d.id as string} className="flex items-center gap-4 px-5 py-4 hover:bg-[#f6f8fb]/50 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-[#fff7f0] flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-[#e87a2a]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-bold text-[#7b8ba3] bg-[#f6f8fb] px-2 py-0.5 rounded">
                          D-{String(d.numero ?? '').slice(-4)}
                        </span>
                        <span className="text-[13px] font-bold text-[#1e293b] truncate">{String(d.objet ?? '—')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#7b8ba3]">
                        <span className="font-bold text-[#0f1a3a]">{formatEur(Number(d.montant_ttc ?? 0))} TTC</span>
                        {linkedFactures.length > 0 && (
                          <span>• {linkedFactures.length} facture{linkedFactures.length > 1 ? 's' : ''} liée{linkedFactures.length > 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                    {!isFacture ? (
                      <button
                        onClick={() => handleCreateFacture(d.id as string)}
                        disabled={factureCreating === (d.id as string)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white rounded-xl text-[12px] font-bold hover:shadow-md transition-all disabled:opacity-50 flex-shrink-0">
                        {factureCreating === (d.id as string) ? (
                          <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Création...</>
                        ) : (
                          <><Plus className="w-3.5 h-3.5" />Créer facture</>
                        )}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-[#dcfce7] text-[#166534] flex-shrink-0">
                        <Check className="w-3 h-3" />Facturé
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── MARGE NETTE ── */}
        <div className="bg-white border border-[#e6ecf2] rounded-2xl overflow-hidden mb-5">
          <div className="px-5 py-4 border-b border-[#e6ecf2]">
            <h3 className="text-[15px] font-extrabold text-[#0f1a3a]">Rentabilité du chantier</h3>
          </div>
          <div className="grid grid-cols-3 border-b border-[#e6ecf2]">
            <div className="text-center py-5 px-4 border-r border-[#e6ecf2]">
              <div className="text-[22px] font-extrabold text-[#22c55e] tracking-tight">{formatEur(finances.factureTotal)}</div>
              <div className="text-[11px] text-[#7b8ba3] font-medium mt-1">Facturé client (TTC)</div>
            </div>
            <div className="text-center py-5 px-4 border-r border-[#e6ecf2]">
              <div className="text-[22px] font-extrabold text-[#ef4444] tracking-tight">- {formatEur(finances.depenses)}</div>
              <div className="text-[11px] text-[#7b8ba3] font-medium mt-1">Dépenses (ST + achats)</div>
            </div>
            <div className="text-center py-5 px-4">
              <div className="text-[22px] font-extrabold text-[#0f1a3a] tracking-tight">{formatEur(finances.marge)} <span className="text-sm font-bold text-[#7b8ba3]">({finances.margePct}%)</span></div>
              <div className="text-[11px] text-[#7b8ba3] font-medium mt-1">Marge nette</div>
            </div>
          </div>

          {/* Achats fournisseurs */}
          <div className="px-5 py-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#7b8ba3] mb-2">Achats fournisseurs</div>
            {chantierAchats.length === 0 && <div className="text-sm text-[#7b8ba3] py-3">Aucun achat enregistré</div>}
            {chantierAchats.map(achat => (
              <div key={achat.id as string} className="flex items-center justify-between py-2.5 border-b border-[#e6ecf2] last:border-b-0 text-[13px]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#1e293b]">{String(achat.description ?? '—')}</span>
                  <span className="text-[11px] text-[#7b8ba3]">{formatDate(achat.date_achat as string)}</span>
                </div>
                <span className="font-bold text-[#ef4444]">- {formatEur(Number(achat.montant_ttc ?? achat.montant_ht ?? 0))}</span>
              </div>
            ))}
            <div className="pt-2.5 text-center">
              <button className="text-xs text-[#5ab4e0] font-semibold flex items-center gap-1 mx-auto hover:underline">
                <Plus className="w-3 h-3" />Ajouter un achat
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0f1a3a] text-white px-7 py-3.5 rounded-xl text-sm font-semibold shadow-lg z-[999] flex items-center gap-2.5 animate-[slideUp_.4s_ease]">
          <Check className="w-5 h-5 text-[#22c55e]" />
          {toast}
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp { from { transform: translateX(-50%) translateY(100px) } to { transform: translateX(-50%) translateY(0) } }
      `}</style>
    </div>
  )
}

// -------------------------------------------------------------------
// Sub-component: ProgressBar
// -------------------------------------------------------------------

function ProgressBar({ label, value, pct, color, sub }: {
  label: string; value: string; pct: number; color: string; sub: string
}) {
  return (
    <div>
      <div className="flex justify-between mb-1.5 text-xs">
        <span className="font-semibold text-[#1e293b]">{label}</span>
        <span className="font-bold text-[#0f1a3a]">{value}</span>
      </div>
      <div className="h-[7px] bg-[#e6ecf2] rounded-full overflow-hidden relative">
        <div className={`h-full rounded-full transition-all duration-700 relative ${color}`} style={{ width: `${Math.min(pct, 100)}%` }}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_2s_infinite]" />
        </div>
      </div>
      <div className="flex justify-between mt-1 text-[11px] text-[#7b8ba3]">
        <span>{sub.split('/')[0]}</span>
        <span>/ {sub.split('/')[1]}</span>
      </div>
    </div>
  )
}
