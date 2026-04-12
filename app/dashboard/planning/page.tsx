'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  Plus, ChevronLeft, ChevronRight, CalendarDays, X, FileText,
  Search, AlertTriangle, Users, Briefcase, Clock,
  MapPin, Eye, Maximize2, Minimize2, Check
} from 'lucide-react'
import {
  usePlanning, useIntervenants, useClients, useChantiers, useDevis,
  insertRow, updateRow, LoadingSkeleton,
} from '@/lib/hooks'
import { useRouter } from 'next/navigation'

// ===================================================================
// Types & Constants
// ===================================================================

type R = Record<string, unknown>
type ViewPreset = 'complete' | 'planning' | 'annual'
type Creneau = 'matin' | 'apres_midi' | 'journee'
type FilterType = 'all' | 'client' | 'chantier' | 'conflict'

const CRENEAUX: { value: Creneau; label: string; heures: string }[] = [
  { value: 'journee', label: 'Journée', heures: '8h-17h' },
  { value: 'matin', label: 'Matin', heures: '8h-12h' },
  { value: 'apres_midi', label: 'Après-midi', heures: '13h-17h' },
]

const PALETTE = [
  { key: 'sky', bg: 'bg-[#eef7fc]', border: 'border-l-[#5ab4e0]', text: 'text-[#1a6fb5]', badge: 'bg-[#5ab4e0]', hex: '#5ab4e0' },
  { key: 'orange', bg: 'bg-[#fef5ee]', border: 'border-l-[#e87a2a]', text: 'text-[#b85c1a]', badge: 'bg-[#e87a2a]', hex: '#e87a2a' },
  { key: 'green', bg: 'bg-[#effbf2]', border: 'border-l-[#22c55e]', text: 'text-[#166534]', badge: 'bg-[#22c55e]', hex: '#22c55e' },
  { key: 'violet', bg: 'bg-[#f3effe]', border: 'border-l-[#7c3aed]', text: 'text-[#5b21b6]', badge: 'bg-[#7c3aed]', hex: '#7c3aed' },
  { key: 'gold', bg: 'bg-[#fefce8]', border: 'border-l-[#f5c842]', text: 'text-[#854d0e]', badge: 'bg-[#f5c842]', hex: '#f5c842' },
  { key: 'red', bg: 'bg-[#fef2f2]', border: 'border-l-[#ef4444]', text: 'text-[#991b1b]', badge: 'bg-[#ef4444]', hex: '#ef4444' },
]

const STATUTS = [
  { value: 'planifie', label: 'Planifié', color: 'bg-amber-100 text-amber-700' },
  { value: 'en_cours', label: 'En cours', color: 'bg-sky-100 text-sky-700' },
  { value: 'termine', label: 'Terminé', color: 'bg-green-100 text-green-700' },
  { value: 'annule', label: 'Annulé', color: 'bg-red-100 text-red-700' },
]

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
const DAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']

// ===================================================================
// Helpers
// ===================================================================

function getMonday(d: Date): Date {
  const date = new Date(d); const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff); date.setHours(0, 0, 0, 0); return date
}
function fmtISO(d: Date): string { return d.toISOString().split('T')[0] }
function initials(name: string) { return name.split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) }
function isSameDay(d1: Date, d2: Date) { return fmtISO(d1) === fmtISO(d2) }
function creneauLabel(c: string) { return CRENEAUX.find(cr => cr.value === c)?.label ?? c }

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function getFirstDayOffset(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1 // Monday = 0
}

// ===================================================================
// Page
// ===================================================================

export default function PlanningPage() {
  const router = useRouter()
  const { data: planningData, loading: l1, refetch } = usePlanning()
  const { data: intervenants, loading: l2 } = useIntervenants()
  const { data: clients, loading: l3 } = useClients()
  const { data: chantiers } = useChantiers()
  const { data: devisData } = useDevis()

  // ── State ──
  const [viewPreset, setViewPreset] = useState<ViewPreset>('complete')
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [annualCollapsed, setAnnualCollapsed] = useState(false)
  const [detailCollapsed, setDetailCollapsed] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const [panelIntervention, setPanelIntervention] = useState<R | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [isSociete, setIsSociete] = useState(true)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverCell, setDragOverCell] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  // Modal state
  const [mDevis, setMDevis] = useState('')
  const [mClient, setMClient] = useState('')
  const [mIntervenant, setMIntervenant] = useState('')
  const [mChantier, setMChantier] = useState('')
  const [mDate, setMDate] = useState('')
  const [mDateFin, setMDateFin] = useState('')
  const [mCreneau, setMCreneau] = useState<Creneau>('journee')
  const [mObjet, setMObjet] = useState('')
  const [mNotes, setMNotes] = useState('')
  const [mStatut, setMStatut] = useState('planifie')
  const [submitting, setSubmitting] = useState(false)

  const loading = l1 || l2 || l3

  // ── View preset effects ──
  useEffect(() => {
    if (viewPreset === 'planning') { setAnnualCollapsed(true); setDetailCollapsed(false) }
    else if (viewPreset === 'annual') { setAnnualCollapsed(false); setDetailCollapsed(true) }
    else { setAnnualCollapsed(false); setDetailCollapsed(false) }
  }, [viewPreset])

  // ── Toast ──
  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }, [])

  // ── Click outside search ──
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ── Maps ──
  const clientMap = useMemo(() => {
    const map = new Map<string, R>()
    clients.forEach(c => { const r = c as R; map.set(r.id as string, r) })
    return map
  }, [clients])

  const intervenantMap = useMemo(() => {
    const map = new Map<string, R>()
    intervenants.forEach(iv => { const r = iv as R; map.set(r.id as string, r) })
    return map
  }, [intervenants])

  const chantierMap = useMemo(() => {
    const map = new Map<string, R>()
    chantiers.forEach(ch => { const r = ch as R; map.set(r.id as string, r) })
    return map
  }, [chantiers])

  const devisMap = useMemo(() => {
    const map = new Map<string, R>()
    devisData.forEach(d => { const r = d as R; map.set(r.id as string, r) })
    return map
  }, [devisData])

  // ── Devis acceptés (signés) ──
  const acceptedDevis = useMemo(() => {
    return devisData.filter(d => (d as R).statut === 'signe') as R[]
  }, [devisData])

  // ── Devis non planifiés (acceptés sans intervention liée) ──
  const unplannedDevis = useMemo(() => {
    const plannedDevisIds = new Set(
      planningData.map(p => (p as R).devis_id as string).filter(Boolean)
    )
    return acceptedDevis.filter(d => !plannedDevisIds.has(d.id as string))
  }, [acceptedDevis, planningData])

  const colorMap = useMemo(() => {
    const map = new Map<string, typeof PALETTE[0]>()
    intervenants.forEach((iv, i) => { map.set((iv as R).id as string, PALETTE[i % PALETTE.length]) })
    return map
  }, [intervenants])

  // ── Planning indexed by date string ──
  const planningByDate = useMemo(() => {
    const map = new Map<string, R[]>()
    for (const item of planningData) {
      const rec = item as R
      const dateDebut = rec.date_debut as string
      if (!dateDebut) continue
      const dateStr = dateDebut.split('T')[0]
      if (!map.has(dateStr)) map.set(dateStr, [])
      map.get(dateStr)!.push(rec)
    }
    return map
  }, [planningData])

  // ── Planning map: key = intervenantId__dateStr ──
  const planningMap = useMemo(() => {
    const map = new Map<string, R[]>()
    for (const item of planningData) {
      const rec = item as R
      const ivId = rec.intervenant_id as string
      const dateDebut = rec.date_debut as string
      if (!dateDebut || !ivId) continue
      const dateStr = dateDebut.split('T')[0]
      const key = `${ivId}__${dateStr}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(rec)
    }
    return map
  }, [planningData])

  // ── Conflicts detection ──
  const conflicts = useMemo(() => {
    const set = new Set<string>()
    const byIntervenantDate = new Map<string, R[]>()
    for (const item of planningData) {
      const rec = item as R
      const key = `${rec.intervenant_id}__${(rec.date_debut as string)?.split('T')[0]}`
      if (!byIntervenantDate.has(key)) byIntervenantDate.set(key, [])
      byIntervenantDate.get(key)!.push(rec)
    }
    byIntervenantDate.forEach((items) => {
      if (items.length > 1) {
        const hasJournee = items.some(i => (i.creneau as string) === 'journee')
        const hasMatin = items.filter(i => (i.creneau as string) === 'matin').length > 1
        const hasAm = items.filter(i => (i.creneau as string) === 'apres_midi').length > 1
        if ((hasJournee && items.length > 1) || hasMatin || hasAm) {
          items.forEach(i => set.add(i.id as string))
        }
      }
    })
    return set
  }, [planningData])

  // ── Stats ──
  const weekDaysForStats = useMemo(() => {
    const days: string[] = []
    for (let i = 0; i < 5; i++) {
      const d = new Date(weekStart); d.setDate(d.getDate() + i)
      days.push(fmtISO(d))
    }
    return days
  }, [weekStart])

  const stats = useMemo(() => {
    const weekInterventions = planningData.filter(p => {
      const d = (p as R).date_debut as string
      if (!d) return false
      return weekDaysForStats.includes(d.split('T')[0])
    })
    const activeChantiers = new Set(weekInterventions.map(p => (p as R).chantier_id).filter(Boolean))
    const totalSlots = (isSociete ? intervenants.length : 1) * 5
    const occupation = totalSlots > 0 ? Math.round((weekInterventions.length / totalSlots) * 100) : 0
    return {
      interventions: weekInterventions.length,
      chantiers: activeChantiers.size,
      occupation: Math.min(occupation, 100),
      conflicts: conflicts.size,
    }
  }, [planningData, weekDaysForStats, intervenants, isSociete, conflicts])

  // ── Search ──
  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return []
    const q = searchQuery.toLowerCase()
    const results: { type: string; label: string; id: string; sub?: string }[] = []
    clients.forEach(c => {
      const r = c as R
      const name = `${r.prenom ?? ''} ${r.nom ?? ''}`.trim().toLowerCase()
      if (name.includes(q)) results.push({ type: 'Client', label: `${r.prenom ?? ''} ${r.nom ?? ''}`.trim(), id: r.id as string })
    })
    chantiers.forEach(ch => {
      const r = ch as R
      if ((r.titre as string)?.toLowerCase().includes(q)) results.push({ type: 'Chantier', label: r.titre as string, id: r.id as string })
    })
    intervenants.forEach(iv => {
      const r = iv as R
      const name = `${r.prenom ?? ''} ${r.nom ?? ''}`.trim().toLowerCase()
      if (name.includes(q)) results.push({ type: 'Intervenant', label: `${r.prenom ?? ''} ${r.nom ?? ''}`.trim(), id: r.id as string, sub: r.metier as string })
    })
    return results.slice(0, 8)
  }, [searchQuery, clients, chantiers, intervenants])

  // ── Filter ──
  const isFiltered = (intervention: R): boolean => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'conflict') return conflicts.has(intervention.id as string)
    return true
  }

  // ── Week nav ──
  const goToWeek = (date: Date) => setWeekStart(getMonday(date))
  const prevWeeks = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(getMonday(d)) }
  const nextWeeks = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(getMonday(d)) }
  const goToday = () => setWeekStart(getMonday(new Date()))

  // ── Panel ──
  const openPanel = (intervention: R) => { setPanelIntervention(intervention); setShowPanel(true) }
  const closePanel = () => { setShowPanel(false); setPanelIntervention(null) }

  // ── Modal ──
  const openModal = (dateStr?: string, intervenantId?: string, devisId?: string) => {
    setMDevis(''); setMClient(''); setMIntervenant(intervenantId ?? ''); setMChantier('')
    setMDate(dateStr ?? fmtISO(new Date())); setMDateFin(dateStr ?? fmtISO(new Date()))
    setMCreneau('journee'); setMObjet(''); setMNotes(''); setMStatut('planifie')
    // Auto-fill from devis if provided
    if (devisId) {
      setMDevis(devisId)
      const devis = devisMap.get(devisId) as R | undefined
      if (devis) {
        if (devis.client_id) setMClient(devis.client_id as string)
        if (devis.chantier_id) setMChantier(devis.chantier_id as string)
        if (devis.objet) setMObjet(String(devis.objet))
      }
    }
    setShowModal(true)
  }

  // ── Handle devis selection in modal ──
  const handleDevisChange = (devisId: string) => {
    setMDevis(devisId)
    if (devisId) {
      const devis = devisMap.get(devisId) as R | undefined
      if (devis) {
        if (devis.client_id) setMClient(devis.client_id as string)
        if (devis.chantier_id) setMChantier(devis.chantier_id as string)
        if (devis.objet) setMObjet(String(devis.objet))
      }
    } else {
      // Reset when deselecting devis
      setMClient(''); setMChantier(''); setMObjet('')
    }
  }

  const submitIntervention = async () => {
    if (!mIntervenant || !mDate || !mObjet) return
    setSubmitting(true)
    try {
      const startTime = mCreneau === 'apres_midi' ? '13:00' : '08:00'
      const endTime = mCreneau === 'matin' ? '12:00' : '17:00'
      await insertRow('planning_interventions', {
        intervenant_id: mIntervenant,
        client_id: mClient || null,
        chantier_id: mChantier || null,
        devis_id: mDevis || null,
        titre: mObjet,
        description_travaux: mObjet,
        date_debut: `${mDate}T${startTime}:00`,
        date_fin: `${mDateFin || mDate}T${endTime}:00`,
        heure_debut: startTime,
        heure_fin: endTime,
        creneau: mCreneau,
        statut: mStatut,
        notes: mNotes || null,
      })
      setShowModal(false)
      refetch()
      showToast('Intervention créée ✓')
    } catch {
      showToast('Erreur lors de la création')
    } finally { setSubmitting(false) }
  }

  // ── Drag & Drop ──
  const handleDragStart = (id: string) => setDraggedId(id)
  const handleDragEnd = () => { setDraggedId(null); setDragOverCell(null) }
  const handleDrop = async (intervenantId: string, dateStr: string) => {
    if (!draggedId) return
    setDragOverCell(null)
    const intervention = planningData.find(p => (p as R).id === draggedId) as R
    if (!intervention) return
    const startTime = (intervention.creneau as string) === 'apres_midi' ? '13:00' : '08:00'
    const endTime = (intervention.creneau as string) === 'matin' ? '12:00' : '17:00'
    try {
      await updateRow('planning_interventions', draggedId, {
        intervenant_id: intervenantId,
        date_debut: `${dateStr}T${startTime}:00`,
        date_fin: `${dateStr}T${endTime}:00`,
      })
      refetch()
      showToast('Intervention déplacée ✓')
    } catch {
      showToast('Erreur lors du déplacement')
    }
    setDraggedId(null)
  }

  // ── Intervenants list ──
  const displayedIntervenants = useMemo(() => {
    if (isSociete) return intervenants.filter(iv => (iv as R).actif !== false)
    return intervenants.slice(0, 1)
  }, [intervenants, isSociete])

  // ── Name helpers ──
  const ivName = (id: string) => {
    const iv = intervenantMap.get(id) as R | undefined
    return iv ? `${iv.prenom ?? ''} ${String(iv.nom ?? '').charAt(0)}.` : '—'
  }
  const ivFullName = (id: string) => {
    const iv = intervenantMap.get(id) as R | undefined
    return iv ? `${iv.prenom ?? ''} ${iv.nom ?? ''}`.trim() : '—'
  }
  const clName = (id: string) => {
    const cl = clientMap.get(id) as R | undefined
    return cl ? `${cl.prenom ?? ''} ${cl.nom ?? ''}`.trim() : ''
  }

  // ── 12 months for annual view ──
  const annualMonths = useMemo(() => {
    const today = new Date()
    const months: { year: number; month: number; label: string; shortLabel: string }[] = []
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
      months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
        shortLabel: `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() !== today.getFullYear() ? d.getFullYear() : ''}`.trim(),
      })
    }
    return months
  }, [])

  // ── 5 weeks for detail view ──
  const detailWeeks = useMemo(() => {
    const weeks: { start: Date; days: { label: string; date: Date; dateStr: string; isToday: boolean }[] }[] = []
    for (let w = 0; w < 5; w++) {
      const start = new Date(weekStart)
      start.setDate(start.getDate() + w * 7)
      const days: typeof weeks[0]['days'] = []
      for (let d = 0; d < 5; d++) {
        const date = new Date(start)
        date.setDate(date.getDate() + d)
        days.push({ label: DAYS[d], date, dateStr: fmtISO(date), isToday: isSameDay(date, new Date()) })
      }
      weeks.push({ start, days })
    }
    return weeks
  }, [weekStart])

  // ── Loading ──
  if (loading) return <div className="p-8"><LoadingSkeleton /></div>

  const today = new Date()
  const todayStr = fmtISO(today)

  // ===================================================================
  // RENDER
  // ===================================================================

  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      {/* ── HEADER ── */}
      <header className="bg-white border-b border-[#e6ecf2] px-6 py-3.5 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-extrabold text-[#0f1a3a] tracking-tight font-jakarta">
              {isSociete ? 'Planning' : 'Mon planning'}
            </h1>
            {/* Profile toggle */}
            <div className="flex items-center gap-2 bg-[#f6f8fb] rounded-full px-3 py-1.5 text-xs font-semibold text-[#64748b]">
              <span className={!isSociete ? 'text-[#0f1a3a]' : ''}>Solo</span>
              <button onClick={() => setIsSociete(!isSociete)}
                className={`w-9 h-5 rounded-full relative transition-colors ${isSociete ? 'bg-[#e87a2a]' : 'bg-[#5ab4e0]'}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${isSociete ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
              <span className={isSociete ? 'text-[#0f1a3a]' : ''}>Société</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View preset */}
            <div className="flex bg-[#f6f8fb] rounded-xl p-1 gap-0.5">
              {([
                { key: 'complete' as ViewPreset, label: 'Complète' },
                { key: 'planning' as ViewPreset, label: '5 semaines' },
                { key: 'annual' as ViewPreset, label: 'Annuel' },
              ]).map(v => (
                <button key={v.key} onClick={() => setViewPreset(v.key)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewPreset === v.key ? 'bg-white text-[#0f1a3a] shadow-sm' : 'text-[#64748b] hover:text-[#0f1a3a]'}`}>
                  {v.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div ref={searchRef} className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7b8ba3] pointer-events-none" />
              <input type="text" placeholder="Rechercher..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); if (e.target.value.length >= 2) setSearchOpen(true); else setSearchOpen(false) }}
                onFocus={() => { if (searchQuery.length >= 2) setSearchOpen(true) }}
                className="w-full pl-10 pr-4 py-2 border border-[#e6ecf2] rounded-xl text-sm font-medium text-[#1e293b] bg-[#f6f8fb] focus:border-[#5ab4e0] focus:bg-white focus:ring-2 focus:ring-[#5ab4e0]/10 outline-none transition-all placeholder:text-[#7b8ba3]" />
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute top-full mt-1.5 left-0 right-0 bg-white border border-[#e6ecf2] rounded-xl shadow-lg max-h-72 overflow-y-auto z-50">
                  {searchResults.map((r, i) => (
                    <button key={i} className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#f6f8fb] transition-colors text-left border-b border-[#e6ecf2] last:border-b-0"
                      onClick={() => setSearchOpen(false)}>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${r.type === 'Client' ? 'bg-[#e8f4fb] text-[#2d8bc9]' : r.type === 'Chantier' ? 'bg-[#fef3e8] text-[#e87a2a]' : 'bg-[#ede9fe] text-[#7c3aed]'}`}>{r.type}</span>
                      <div>
                        <div className="text-sm font-semibold text-[#1e293b]">{r.label}</div>
                        {r.sub && <div className="text-xs text-[#7b8ba3]">{r.sub}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* New intervention */}
            <button onClick={() => openModal()}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#e87a2a] to-[#f09050] text-white rounded-xl text-sm font-semibold shadow-[0_4px_15px_rgba(232,122,42,.3)] hover:shadow-[0_6px_20px_rgba(232,122,42,.4)] hover:-translate-y-0.5 transition-all">
              <Plus className="w-4 h-4" />Nouvelle intervention
            </button>
          </div>
        </div>

        {/* Stats + Filters row */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-4">
            <MiniStat icon={<CalendarDays className="w-4 h-4" />} label="Interventions" value={stats.interventions} color="text-[#5ab4e0]" />
            <MiniStat icon={<Briefcase className="w-4 h-4" />} label="Chantiers" value={stats.chantiers} color="text-[#e87a2a]" />
            {isSociete && <MiniStat icon={<Clock className="w-4 h-4" />} label="Occupation" value={`${stats.occupation}%`} color="text-[#22c55e]" />}
            {unplannedDevis.length > 0 && <MiniStat icon={<FileText className="w-4 h-4" />} label="À planifier" value={unplannedDevis.length} color="text-[#7c3aed]" />}
            {isSociete && stats.conflicts > 0 && <MiniStat icon={<AlertTriangle className="w-4 h-4" />} label="Conflits" value={stats.conflicts} color="text-[#ef4444]" />}
          </div>
          {isSociete && (
            <div className="flex items-center gap-1.5">
              {([
                { key: 'all' as FilterType, label: 'Tous' },
                { key: 'conflict' as FilterType, label: 'Conflits' },
              ]).map(f => (
                <button key={f.key} onClick={() => setActiveFilter(f.key)}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${activeFilter === f.key ? 'bg-[#5ab4e0] text-white border-[#5ab4e0]' : 'bg-white text-[#64748b] border-[#e6ecf2] hover:border-[#5ab4e0]'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="px-6 py-4 space-y-4">

        {/* ══════════════════════════════════════════════════════════════
            BANNIÈRE "À PLANIFIER" — Devis acceptés non planifiés
        ══════════════════════════════════════════════════════════════ */}
        {unplannedDevis.length > 0 && (
          <div className="bg-gradient-to-r from-[#7c3aed]/[.06] to-[#5ab4e0]/[.06] border border-[#7c3aed]/20 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#7c3aed]/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#7c3aed]" />
                <h2 className="text-[14px] font-extrabold text-[#0f1a3a]">Devis acceptés — À planifier</h2>
                <span className="text-[11px] font-bold bg-[#7c3aed] text-white px-2 py-0.5 rounded-full">{unplannedDevis.length}</span>
              </div>
            </div>
            <div className="p-4 flex gap-3 overflow-x-auto">
              {unplannedDevis.map(devis => {
                const cl = clientMap.get(devis.client_id as string) as R | undefined
                const clientName = cl
                  ? `${cl.prenom ?? ''} ${cl.nom ?? ''}`.trim()
                  : (devis.notes_client as string)?.split(' | ')[0]?.trim() || (devis.objet as string)?.split(' ').slice(0, 4).join(' ') || 'Sans client'
                const ch = chantierMap.get(devis.chantier_id as string) as R | undefined
                return (
                  <div key={devis.id as string}
                    className="min-w-[260px] bg-white rounded-xl border border-[#e6ecf2] p-4 flex flex-col gap-2 shadow-sm hover:shadow-md hover:border-[#7c3aed]/40 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#7c3aed] bg-[#7c3aed]/10 px-2 py-0.5 rounded-full">
                        {String(devis.numero ?? '')}
                      </span>
                      <span className="text-[11px] font-bold text-[#22c55e]">
                        {Number(devis.montant_ttc ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </span>
                    </div>
                    <div className="text-[13px] font-bold text-[#0f1a3a]">{clientName}</div>
                    <div className="text-[11px] text-[#64748b] leading-snug line-clamp-2">{String(devis.objet ?? '')}</div>
                    {ch && <div className="flex items-center gap-1 text-[10px] text-[#7b8ba3]">
                      <MapPin className="w-3 h-3" />{String(ch.adresse_chantier ?? ch.ville_chantier ?? ch.titre ?? '')}
                    </div>}
                    <button onClick={() => openModal(undefined, undefined, devis.id as string)}
                      className="mt-1 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-lg text-[11px] font-bold transition-all shadow-sm">
                      <CalendarDays className="w-3.5 h-3.5" />Planifier
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            PANNEAU ANNUEL — 12 MOIS
        ══════════════════════════════════════════════════════════════ */}
        {!annualCollapsed && (
          <div className="bg-white border border-[#e6ecf2] rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-[#e6ecf2] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#5ab4e0]" />
                <h2 className="text-[15px] font-extrabold text-[#0f1a3a]">Vue annuelle — 12 prochains mois</h2>
              </div>
              <button onClick={() => setAnnualCollapsed(true)} className="flex items-center gap-1 text-xs text-[#64748b] hover:text-[#5ab4e0] transition-all font-semibold">
                <Minimize2 className="w-3.5 h-3.5" />Réduire
              </button>
            </div>

            <div className="p-4 grid grid-cols-4 gap-3">
              {annualMonths.map(m => {
                const days = getDaysInMonth(m.year, m.month)
                const offset = getFirstDayOffset(m.year, m.month)
                const isCurrentMonth = m.year === today.getFullYear() && m.month === today.getMonth()

                return (
                  <div key={`${m.year}-${m.month}`} className={`rounded-xl border p-3 transition-all ${isCurrentMonth ? 'border-[#5ab4e0] bg-[#5ab4e0]/[.03]' : 'border-[#e6ecf2] hover:border-[#5ab4e0]/40'}`}>
                    <div className="text-[12px] font-bold text-[#0f1a3a] mb-2">{m.label}</div>
                    {/* Day labels */}
                    <div className="grid grid-cols-7 gap-px mb-1">
                      {DAYS_SHORT.map((d, i) => (
                        <div key={i} className="text-[9px] font-bold text-[#7b8ba3] text-center">{d}</div>
                      ))}
                    </div>
                    {/* Day cells */}
                    <div className="grid grid-cols-7 gap-px">
                      {Array.from({ length: offset }).map((_, i) => <div key={`empty-${i}`} className="h-[18px]" />)}
                      {days.map(day => {
                        const dateStr = fmtISO(day)
                        const dayInterventions = planningByDate.get(dateStr) ?? []
                        const count = dayInterventions.length
                        const isToday = dateStr === todayStr
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6

                        // Heat color
                        let bgCls = ''
                        if (count === 0) bgCls = isWeekend ? 'bg-[#f1f5f9]' : 'bg-white'
                        else if (count === 1) bgCls = 'bg-[#dcf0fa]'
                        else if (count === 2) bgCls = 'bg-[#93d1f0]'
                        else if (count <= 4) bgCls = 'bg-[#e87a2a]/30'
                        else bgCls = 'bg-[#ef4444]/30'

                        return (
                          <button key={dateStr}
                            onClick={() => { goToWeek(day); if (viewPreset === 'annual') setViewPreset('complete') }}
                            className={`h-[18px] rounded-[3px] flex items-center justify-center text-[8px] font-bold transition-all hover:ring-1 hover:ring-[#5ab4e0] ${bgCls} ${isToday ? 'ring-2 ring-[#5ab4e0] text-[#5ab4e0]' : 'text-[#64748b]'}`}
                            title={count > 0 ? `${count} intervention${count > 1 ? 's' : ''}` : undefined}>
                            {day.getDate()}
                          </button>
                        )
                      })}
                    </div>
                    {/* Monthly summary */}
                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className="text-[#7b8ba3] font-medium">
                        {(() => {
                          const monthDays = days.map(d => fmtISO(d))
                          const total = monthDays.reduce((sum, ds) => sum + (planningByDate.get(ds)?.length ?? 0), 0)
                          return `${total} intervention${total !== 1 ? 's' : ''}`
                        })()}
                      </span>
                      <button onClick={() => openModal(fmtISO(new Date(m.year, m.month, 15)))}
                        className="flex items-center gap-0.5 text-[#5ab4e0] hover:text-[#2d8bc9] font-semibold transition-all">
                        <Plus className="w-3 h-3" />Ajouter
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="px-5 pb-3 flex items-center gap-4 text-[10px] text-[#7b8ba3] font-medium">
              <span>Charge :</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-white border border-[#e6ecf2]" />Libre</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#dcf0fa]" />1</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#93d1f0]" />2</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#e87a2a]/30" />3-4</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#ef4444]/30" />5+</span>
            </div>
          </div>
        )}

        {/* Collapsed annual bar */}
        {annualCollapsed && viewPreset === 'complete' && (
          <button onClick={() => setAnnualCollapsed(false)}
            className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-[#e6ecf2] rounded-xl text-xs font-semibold text-[#64748b] hover:border-[#5ab4e0] hover:text-[#5ab4e0] transition-all">
            <Maximize2 className="w-3.5 h-3.5" />Afficher la vue annuelle
          </button>
        )}

        {/* ══════════════════════════════════════════════════════════════
            PANNEAU DÉTAIL — 5 SEMAINES
        ══════════════════════════════════════════════════════════════ */}
        {!detailCollapsed && (
          <div className="bg-white border border-[#e6ecf2] rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-[#e6ecf2] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#e87a2a]" />
                  <h2 className="text-[15px] font-extrabold text-[#0f1a3a]">Planning détaillé</h2>
                </div>
                <span className="text-xs text-[#7b8ba3] font-medium">
                  Semaine {getWeekNumber(weekStart)} → {getWeekNumber(detailWeeks[4]?.start ?? weekStart)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={goToday} className="px-3 py-1 text-[11px] font-semibold text-[#5ab4e0] bg-[#e8f4fb] rounded-lg hover:bg-[#5ab4e0] hover:text-white transition-all">
                  Aujourd&apos;hui
                </button>
                <button onClick={prevWeeks} className="w-7 h-7 flex items-center justify-center border border-[#e6ecf2] rounded-lg text-[#64748b] hover:border-[#5ab4e0] hover:text-[#5ab4e0] transition-all">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button onClick={nextWeeks} className="w-7 h-7 flex items-center justify-center border border-[#e6ecf2] rounded-lg text-[#64748b] hover:border-[#5ab4e0] hover:text-[#5ab4e0] transition-all">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                {viewPreset === 'complete' && (
                  <button onClick={() => setDetailCollapsed(true)} className="flex items-center gap-1 text-xs text-[#64748b] hover:text-[#5ab4e0] transition-all font-semibold ml-2">
                    <Minimize2 className="w-3.5 h-3.5" />Réduire
                  </button>
                )}
              </div>
            </div>

            {/* 5 weeks grid */}
            <div className="divide-y divide-[#e6ecf2] overflow-x-auto">
              {detailWeeks.map((week, wi) => {
                const weekNum = getWeekNumber(week.start)
                const weekEnd = new Date(week.start)
                weekEnd.setDate(weekEnd.getDate() + 4)
                const isCurrentWeek = week.days.some(d => d.isToday)

                return (
                  <div key={wi}>
                    {/* Week header */}
                    <div className={`px-4 py-2 flex items-center gap-2 text-xs font-bold ${isCurrentWeek ? 'bg-[#5ab4e0]/[.06] text-[#5ab4e0]' : 'bg-[#f6f8fb] text-[#7b8ba3]'}`}>
                      <span>S{weekNum}</span>
                      <span className="font-medium">{week.start.getDate()} — {weekEnd.getDate()} {MONTHS[weekEnd.getMonth()]}</span>
                      {isCurrentWeek && <span className="text-[10px] bg-[#5ab4e0] text-white px-2 py-0.5 rounded-full font-bold">Cette semaine</span>}
                    </div>

                    {/* Grid: intervenants × days */}
                    <div className={`grid min-w-max ${isSociete ? 'grid-cols-[150px_repeat(5,1fr)]' : 'grid-cols-[150px_repeat(5,1fr)]'}`}>
                      {/* Day headers */}
                      <div className="bg-[#f6f8fb]/50 border-r border-[#e6ecf2]" />
                      {week.days.map(day => (
                        <div key={day.dateStr} className={`px-2 py-1.5 text-center border-r border-[#e6ecf2] last:border-r-0 ${day.isToday ? 'bg-[#5ab4e0]/[.04]' : ''}`}>
                          <div className={`text-[10px] font-bold uppercase tracking-wider ${day.isToday ? 'text-[#5ab4e0]' : 'text-[#7b8ba3]'}`}>
                            {day.label} {day.date.getDate()}
                          </div>
                        </div>
                      ))}

                      {/* Intervenant rows */}
                      {displayedIntervenants.map(iv => {
                        const r = iv as R
                        const ivId = r.id as string
                        const color = colorMap.get(ivId) ?? PALETTE[0]

                        return (
                          <div key={`${wi}-${ivId}`} className="contents">
                            {/* Label */}
                            <div className="px-2.5 py-2 border-r border-b border-[#e6ecf2] bg-[#f6f8fb]/30 flex items-center gap-2">
                              <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0" style={{ background: color.hex }}>
                                {initials(`${r.prenom ?? ''} ${r.nom ?? ''}`)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-[11px] font-bold text-[#0f1a3a] truncate">
                                  {isSociete ? `${String(r.prenom ?? '')} ${String(r.nom ?? '').charAt(0)}.` : 'Moi'}
                                </div>
                                <div className="text-[9px] text-[#7b8ba3] font-medium truncate">{String(r.metier ?? '')}</div>
                              </div>
                            </div>

                            {/* Day cells */}
                            {week.days.map(day => {
                              const cellKey = `${ivId}__${day.dateStr}`
                              const interventions = planningMap.get(cellKey) ?? []
                              const isDragOver = dragOverCell === cellKey

                              return (
                                <div key={cellKey}
                                  className={`min-h-[60px] px-1 py-1 border-r border-b border-[#e6ecf2] last:border-r-0 relative group transition-all ${day.isToday ? 'bg-[#5ab4e0]/[.03]' : ''} ${isDragOver ? 'bg-[#5ab4e0]/10 outline-2 outline-dashed outline-[#5ab4e0] outline-offset-[-2px]' : ''}`}
                                  onDragOver={e => { e.preventDefault(); setDragOverCell(cellKey) }}
                                  onDragLeave={() => setDragOverCell(null)}
                                  onDrop={e => { e.preventDefault(); handleDrop(ivId, day.dateStr) }}>

                                  {interventions.filter(isFiltered).map(item => {
                                    const rec = item as R
                                    const isConflict = conflicts.has(rec.id as string)
                                    const isDragged = draggedId === rec.id as string
                                    const statut = STATUTS.find(s => s.value === rec.statut)

                                    return (
                                      <div key={rec.id as string}
                                        draggable
                                        onDragStart={() => handleDragStart(rec.id as string)}
                                        onDragEnd={handleDragEnd}
                                        onClick={() => openPanel(rec)}
                                        className={`p-1.5 rounded-md mb-1 cursor-grab active:cursor-grabbing transition-all border-l-[3px] text-[10px] leading-snug ${color.bg} ${color.border} ${color.text}
                                          ${isDragged ? 'opacity-30' : ''} ${isConflict ? 'ring-1 ring-[#ef4444]' : ''} hover:shadow-md`}>
                                        {statut && (
                                          <span className={`text-[8px] font-extrabold px-1 py-0.5 rounded ${statut.color} float-right ml-1`}>
                                            {statut.label}
                                          </span>
                                        )}
                                        <div className="text-[9px] font-bold uppercase tracking-wider opacity-60">
                                          {creneauLabel(rec.creneau as string)}
                                        </div>
                                        {Boolean(rec.client_id) && <div className="font-extrabold text-[10px] mt-0.5">{clName(rec.client_id as string)}</div>}
                                        <div className="text-[9px] font-medium opacity-75 mt-0.5 pr-8 line-clamp-1">{String(rec.titre ?? rec.description_travaux ?? '—')}</div>
                                      </div>
                                    )
                                  })}

                                  {/* Add button */}
                                  <button onClick={() => openModal(day.dateStr, ivId)}
                                    className="w-full h-6 border border-dashed border-[#5ab4e0]/20 rounded text-[#5ab4e0] text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[#5ab4e0]/[.06] hover:border-[#5ab4e0] transition-all pointer-events-none group-hover:pointer-events-auto">
                                    +
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Collapsed detail bar */}
        {detailCollapsed && viewPreset === 'complete' && (
          <button onClick={() => setDetailCollapsed(false)}
            className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-[#e6ecf2] rounded-xl text-xs font-semibold text-[#64748b] hover:border-[#5ab4e0] hover:text-[#5ab4e0] transition-all">
            <Maximize2 className="w-3.5 h-3.5" />Afficher le planning détaillé
          </button>
        )}
      </div>

      {/* ── SIDE PANEL ── */}
      {showPanel && panelIntervention && (
        <>
          <div className="fixed inset-0 bg-[#0f1a3a]/20 z-40" onClick={closePanel} />
          <aside className="fixed top-0 right-0 w-full sm:w-[420px] h-full bg-white shadow-[-8px_0_40px_rgba(15,26,58,.12)] z-50 flex flex-col animate-[slideIn_.3s_ease]">
            <div className="px-5 py-4 border-b border-[#e6ecf2] flex items-center justify-between flex-shrink-0">
              <h2 className="text-base font-extrabold text-[#0f1a3a]">Détail intervention</h2>
              <button onClick={closePanel} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#f6f8fb] text-[#64748b] hover:bg-[#fee2e2] hover:text-[#ef4444] transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {/* Chantier */}
              {Boolean(panelIntervention.chantier_id) && (() => {
                const ch = chantierMap.get(panelIntervention.chantier_id as string) as R | undefined
                if (!ch) return null
                return (
                  <div className="px-5 py-4 border-b border-[#e6ecf2]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#7b8ba3] mb-3">Chantier</div>
                    <div className="text-[17px] font-extrabold text-[#0f1a3a]">{String(ch.titre ?? '')}</div>
                    {Boolean(ch.adresse_chantier) && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-[13px] text-[#64748b]">
                        <MapPin className="w-3.5 h-3.5 text-[#7b8ba3]" />
                        {String(ch.adresse_chantier ?? '')}, {String(ch.ville_chantier ?? '')}
                      </div>
                    )}
                    <button onClick={() => { closePanel(); router.push(`/dashboard/chantiers/${ch.id}`) }}
                      className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#5ab4e0] text-white rounded-xl text-sm font-semibold hover:bg-[#2d8bc9] transition-all">
                      <Eye className="w-4 h-4" />Voir le chantier
                    </button>
                  </div>
                )
              })()}
              {/* Client */}
              {Boolean(panelIntervention.client_id) && (() => {
                const cl = clientMap.get(panelIntervention.client_id as string) as R | undefined
                if (!cl) return null
                return (
                  <div className="px-5 py-4 border-b border-[#e6ecf2]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#7b8ba3] mb-3">Client</div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#0f1a3a] text-white flex items-center justify-center text-sm font-bold">
                        {initials(`${cl.prenom ?? ''} ${cl.nom ?? ''}`)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#0f1a3a]">{String(cl.prenom ?? '')} {String(cl.nom ?? '')}</div>
                        {Boolean(cl.telephone) && (
                          <a href={`tel:${String(cl.telephone)}`} className="text-[13px] text-[#5ab4e0] font-medium hover:underline">{String(cl.telephone)}</a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}
              {/* Intervention details */}
              <div className="px-5 py-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#7b8ba3] mb-3">Intervention</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] text-[#7b8ba3] mb-1">Intervenant</div>
                    <span className="text-[13px] font-semibold">{ivFullName(panelIntervention.intervenant_id as string)}</span>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#7b8ba3] mb-1">Créneau</div>
                    <div className="text-[13px] font-semibold">{creneauLabel(panelIntervention.creneau as string)}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[11px] text-[#7b8ba3] mb-1">Travaux</div>
                    <div className="text-[13px] leading-relaxed">{String(panelIntervention.titre ?? panelIntervention.description_travaux ?? '—')}</div>
                  </div>
                  {Boolean(panelIntervention.notes) && (
                    <div className="col-span-2">
                      <div className="text-[11px] text-[#7b8ba3] mb-1">Notes</div>
                      <div className="text-[13px] leading-relaxed text-[#64748b]">{String(panelIntervention.notes)}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* ── MODAL: New Intervention ── */}
      {showModal && (
        <div className="fixed inset-0 bg-[#0f1a3a]/35 z-50 flex items-center justify-center" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-white rounded-2xl w-full max-w-[540px] mx-4 max-h-[85vh] overflow-y-auto shadow-lg animate-[modalIn_.3s_ease]">
            <div className="px-6 py-5 border-b border-[#e6ecf2] flex items-center justify-between">
              <h3 className="text-[17px] font-extrabold text-[#0f1a3a]">Nouvelle intervention</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#f6f8fb] text-[#64748b] hover:bg-[#fee2e2] hover:text-[#ef4444] transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Devis lié — sélection auto-remplit client, chantier, description */}
              <div>
                <label className="text-xs font-bold text-[#7c3aed] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />Lier à un devis accepté
                </label>
                <select value={mDevis} onChange={e => handleDevisChange(e.target.value)} className="w-full px-3.5 py-2.5 border border-[#7c3aed]/30 rounded-xl text-sm bg-[#7c3aed]/[.03] focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10 outline-none transition-all">
                  <option value="">— Intervention sans devis (saisie libre)</option>
                  {acceptedDevis.map(d => {
                    const cl = clientMap.get(d.client_id as string) as R | undefined
                    const clientLabel = cl ? `${cl.prenom ?? ''} ${cl.nom ?? ''}`.trim() : ''
                    return <option key={d.id as string} value={d.id as string}>{String(d.numero ?? '')} — {clientLabel} — {String(d.objet ?? '')}</option>
                  })}
                </select>
                {mDevis && (() => {
                  const devis = devisMap.get(mDevis) as R | undefined
                  if (!devis) return null
                  const cl = clientMap.get(devis.client_id as string) as R | undefined
                  const ch = chantierMap.get(devis.chantier_id as string) as R | undefined
                  return (
                    <div className="mt-2 bg-[#7c3aed]/[.04] border border-[#7c3aed]/15 rounded-lg px-3.5 py-2.5 space-y-1">
                      {cl && <div className="flex items-center gap-1.5 text-[12px]">
                        <Users className="w-3 h-3 text-[#7c3aed]" />
                        <span className="font-bold text-[#0f1a3a]">{String(cl.prenom ?? '')} {String(cl.nom ?? '')}</span>
                        {Boolean(cl.telephone) && <span className="text-[#64748b] ml-1">— {String(cl.telephone)}</span>}
                      </div>}
                      {ch && <div className="flex items-center gap-1.5 text-[12px]">
                        <MapPin className="w-3 h-3 text-[#7c3aed]" />
                        <span className="text-[#64748b]">{String(ch.adresse_chantier ?? '')} {String(ch.ville_chantier ?? '')}</span>
                      </div>}
                      <div className="flex items-center gap-1.5 text-[12px]">
                        <Briefcase className="w-3 h-3 text-[#7c3aed]" />
                        <span className="text-[#64748b]">{String(devis.objet ?? '')}</span>
                      </div>
                      <div className="text-[11px] font-bold text-[#22c55e]">
                        {Number(devis.montant_ttc ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Intervenant + Créneau */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5">Intervenant *</label>
                  <select value={mIntervenant} onChange={e => setMIntervenant(e.target.value)} className="w-full px-3.5 py-2.5 border border-[#e6ecf2] rounded-xl text-sm bg-white focus:border-[#5ab4e0] focus:ring-2 focus:ring-[#5ab4e0]/10 outline-none transition-all" required>
                    <option value="">— Choisir</option>
                    {intervenants.map(iv => { const r = iv as R; return <option key={r.id as string} value={r.id as string}>{String(r.prenom ?? '')} {String(r.nom ?? '')} — {String(r.metier ?? '')}</option> })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5">Créneau</label>
                  <select value={mCreneau} onChange={e => setMCreneau(e.target.value as Creneau)} className="w-full px-3.5 py-2.5 border border-[#e6ecf2] rounded-xl text-sm bg-white focus:border-[#5ab4e0] focus:ring-2 focus:ring-[#5ab4e0]/10 outline-none transition-all">
                    {CRENEAUX.map(c => <option key={c.value} value={c.value}>{c.label} ({c.heures})</option>)}
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5">Date début *</label>
                  <input type="date" value={mDate} onChange={e => { setMDate(e.target.value); if (!mDateFin || mDateFin < e.target.value) setMDateFin(e.target.value) }} className="w-full px-3.5 py-2.5 border border-[#e6ecf2] rounded-xl text-sm focus:border-[#5ab4e0] focus:ring-2 focus:ring-[#5ab4e0]/10 outline-none transition-all" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5">Date fin</label>
                  <input type="date" value={mDateFin} onChange={e => setMDateFin(e.target.value)} min={mDate} className="w-full px-3.5 py-2.5 border border-[#e6ecf2] rounded-xl text-sm focus:border-[#5ab4e0] focus:ring-2 focus:ring-[#5ab4e0]/10 outline-none transition-all" />
                </div>
              </div>

              {/* Client — auto-rempli si devis sélectionné, sinon saisie manuelle */}
              {!mDevis && (
                <div>
                  <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5">Client</label>
                  <select value={mClient} onChange={e => setMClient(e.target.value)} className="w-full px-3.5 py-2.5 border border-[#e6ecf2] rounded-xl text-sm bg-white focus:border-[#5ab4e0] focus:ring-2 focus:ring-[#5ab4e0]/10 outline-none transition-all">
                    <option value="">— Sélectionner (optionnel)</option>
                    {clients.map(cl => { const r = cl as R; return <option key={r.id as string} value={r.id as string}>{String(r.prenom ?? '')} {String(r.nom ?? '')}</option> })}
                  </select>
                </div>
              )}

              {/* Description — auto-remplie si devis, sinon saisie */}
              {!mDevis && (
                <div>
                  <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5">Description des travaux *</label>
                  <input type="text" value={mObjet} onChange={e => setMObjet(e.target.value)} placeholder="Ex: Pose tableau électrique + câblage" className="w-full px-3.5 py-2.5 border border-[#e6ecf2] rounded-xl text-sm focus:border-[#5ab4e0] focus:ring-2 focus:ring-[#5ab4e0]/10 outline-none transition-all placeholder:text-[#7b8ba3]" required />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5">Statut</label>
                <select value={mStatut} onChange={e => setMStatut(e.target.value)} className="w-full px-3.5 py-2.5 border border-[#e6ecf2] rounded-xl text-sm bg-white focus:border-[#5ab4e0] focus:ring-2 focus:ring-[#5ab4e0]/10 outline-none transition-all">
                  {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5">Notes</label>
                <input type="text" value={mNotes} onChange={e => setMNotes(e.target.value)} placeholder="Notes optionnelles..." className="w-full px-3.5 py-2.5 border border-[#e6ecf2] rounded-xl text-sm focus:border-[#5ab4e0] focus:ring-2 focus:ring-[#5ab4e0]/10 outline-none transition-all placeholder:text-[#7b8ba3]" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#e6ecf2] flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-[#e6ecf2] rounded-xl text-sm font-semibold text-[#1e293b] hover:border-[#5ab4e0] hover:text-[#5ab4e0] transition-all">Annuler</button>
              <button onClick={submitIntervention} disabled={submitting || !mIntervenant || !mDate || !mObjet}
                className="px-5 py-2.5 bg-gradient-to-r from-[#e87a2a] to-[#f09050] text-white rounded-xl text-sm font-semibold shadow-[0_4px_15px_rgba(232,122,42,.3)] hover:shadow-[0_6px_20px_rgba(232,122,42,.4)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? 'Création...' : "Créer l'intervention"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0f1a3a] text-white px-7 py-3.5 rounded-xl text-sm font-semibold shadow-lg z-[999] flex items-center gap-2.5 animate-[slideUp_.4s_ease]">
          <Check className="w-5 h-5 text-[#22c55e]" />
          {toast}
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
        @keyframes modalIn { from { opacity: 0; transform: scale(.95) translateY(10px) } to { opacity: 1; transform: scale(1) translateY(0) } }
        @keyframes slideUp { from { transform: translateX(-50%) translateY(100px) } to { transform: translateX(-50%) translateY(0) } }
      `}</style>
    </div>
  )
}

// ===================================================================
// Sub-components
// ===================================================================

function MiniStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-2 bg-white border border-[#e6ecf2] rounded-lg px-3 py-1.5">
      <span className={color}>{icon}</span>
      <span className="text-[11px] text-[#7b8ba3] font-medium">{label}</span>
      <span className={`text-sm font-extrabold ${color}`}>{value}</span>
    </div>
  )
}
