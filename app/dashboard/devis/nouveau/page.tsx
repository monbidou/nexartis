'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Trash2, Plus, ArrowLeft, Mic, MicOff, X } from 'lucide-react'
import { useClients, useChantiers, useEntreprise, insertRow, LoadingSkeleton } from '@/lib/hooks'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface LineItem {
  id: number
  designation: string
  qty: number
  unit: string
  priceHT: number
  tva: number
  type: 'line' | 'section' | 'text'
}

interface ClientRecord { id: string; nom: string; adresse?: string; telephone?: string; email?: string }
interface ChantierRecord { id: string; nom: string; description?: string }

// -------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------

const UNIT_SUGGESTIONS = ['U', 'h', 'm²', 'm', 'ml', 'm³', 'kg', 'forfait', 'jour', '1/2 journée']
const TVA_RATES = [0, 5.5, 10, 20]

const PAYMENT_OPTIONS = [
  { id: 'p30', label: '30% à la commande, solde à la réception' },
  { id: 'p50', label: '50% à la commande, solde à la réception' },
  { id: 'comptant', label: 'Paiement comptant à la réception' },
  { id: 'j30', label: 'Paiement à 30 jours' },
  { id: 'reception', label: 'Paiement à réception de facture' },
  { id: 'virement', label: 'Virement bancaire uniquement' },
  { id: 'cheque', label: 'Chèque accepté' },
  { id: 'penalites', label: 'Pénalités de retard : 3 fois le taux légal' },
]

let nextId = 100

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function formatCurrency(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

const inputCls = 'w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope outline-none focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] transition-colors placeholder:text-gray-400'

// -------------------------------------------------------------------
// Voice Modal
// -------------------------------------------------------------------

function VoiceModal({ open, onClose, onResult }: {
  open: boolean
  onClose: () => void
  onResult: (data: Record<string, unknown>) => void
}) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  const supported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const startListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) return
    const recognition = new SR()
    recognition.lang = 'fr-FR'
    recognition.continuous = true
    recognition.interimResults = true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      let text = ''
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript
      setTranscript(text)
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
    setTranscript('')
    setError(null)
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setListening(false)
  }

  const handleSubmit = async () => {
    if (!transcript.trim()) return
    setProcessing(true)
    setError(null)
    try {
      const res = await fetch('/api/voice-devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      })
      const data = await res.json()
      if (data.error) {
        setError("L'IA n'a pas pu analyser la dictée. Vérifiez les informations pré-remplies et corrigez si nécessaire.")
      }
      // Show partial data even on error
      onResult(data)
      onClose()
    } catch {
      setError("L'IA n'a pas pu analyser la dictée. Vérifiez les informations pré-remplies et corrigez si nécessaire.")
    }
    setProcessing(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-syne font-bold text-xl text-[#1a1a2e]">Dictée vocale</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>

        {!supported ? (
          <p className="text-sm font-manrope text-red-500">La dictée vocale nécessite Chrome ou Safari.</p>
        ) : (
          <>
            <div className="flex justify-center mb-6">
              <button
                onClick={listening ? stopListening : startListening}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${listening ? 'bg-red-500 animate-pulse' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                {listening ? <MicOff size={32} className="text-white" /> : <Mic size={32} className="text-[#1a1a2e]" />}
              </button>
            </div>
            <p className="text-center text-xs font-manrope text-gray-400 mb-4">{listening ? 'Parlez maintenant...' : 'Cliquez sur le micro pour commencer'}</p>
            {transcript && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-40 overflow-y-auto">
                <p className="text-sm font-manrope text-[#1a1a2e]">{transcript}</p>
              </div>
            )}
            {error && <p className="text-sm font-manrope text-red-500 mb-4">{error}</p>}
            <div className="flex gap-3 justify-end">
              <button onClick={onClose} className="h-10 px-6 rounded-lg border border-gray-200 text-sm font-manrope hover:bg-gray-50">Annuler</button>
              <button
                onClick={handleSubmit}
                disabled={!transcript.trim() || processing}
                className="h-10 px-6 rounded-lg bg-[#e87a2a] text-white text-sm font-syne font-bold hover:bg-[#f09050] disabled:opacity-50"
              >
                {processing ? 'Traitement...' : 'Terminer et pré-remplir'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// -------------------------------------------------------------------
// Page
// -------------------------------------------------------------------

export default function NouveauDevisPageWrapper() {
  return <Suspense fallback={<div className="p-6"><LoadingSkeleton rows={8} /></div>}><NouveauDevisPage /></Suspense>
}

function NouveauDevisPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: clientsRaw, loading: loadingClients } = useClients()
  const { data: chantiersRaw } = useChantiers()
  const { entreprise } = useEntreprise()
  const clients = clientsRaw as unknown as ClientRecord[]
  const chantiers = chantiersRaw as unknown as ChantierRecord[]

  // Client fields (free text)
  const [clientCivilite, setClientCivilite] = useState('')
  const [clientNom, setClientNom] = useState('')
  const [clientAdresse, setClientAdresse] = useState('')
  const [clientTelephone, setClientTelephone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)

  // Chantier (free text)
  const [chantierDesc, setChantierDesc] = useState('')
  const [chantierDropdownOpen, setChantierDropdownOpen] = useState(false)

  // Lines
  const [lines, setLines] = useState<LineItem[]>([{ id: 1, designation: '', qty: 1, unit: 'U', priceHT: 0, tva: 10, type: 'line' }])
  const [autoEntrepreneur, setAutoEntrepreneur] = useState(false)
  const [globalTvaRate, setGlobalTvaRate] = useState(10)
  const [showTvaOnDevis, setShowTvaOnDevis] = useState(true)
  const [useForfait, setUseForfait] = useState(false)
  const [forfaitHT, setForfaitHT] = useState(0)

  // Dates
  const [dateDevis, setDateDevis] = useState(new Date().toISOString().slice(0, 10))
  const [dateValidite, setDateValidite] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10) })
  const [dateTravaux, setDateTravaux] = useState('')
  const [duree, setDuree] = useState('')

  // Conditions
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set(['p30']))
  const [acomptePercent, setAcomptePercent] = useState('')
  const [conditionsLibres, setConditionsLibres] = useState('')
  const [notes, setNotes] = useState('')

  // UI state
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [voiceOpen, setVoiceOpen] = useState(false)

  // --- Auto-open voice modal from URL ---
  useEffect(() => {
    if (searchParams.get('voice') === '1') setVoiceOpen(true)
  }, [searchParams])

  // --- Auto-entrepreneur toggle ---
  useEffect(() => {
    if (autoEntrepreneur) {
      setLines(prev => prev.map(l => ({ ...l, tva: 0 })))
      setGlobalTvaRate(0)
    }
  }, [autoEntrepreneur])

  // --- Line operations ---
  function updateLine(id: number, field: keyof LineItem, value: string | number) {
    setLines(prev => prev.map(l => (l.id === id ? { ...l, [field]: value } : l)))
  }
  function removeLine(id: number) { setLines(prev => prev.filter(l => l.id !== id)) }
  function addLine(type: 'line' | 'section' | 'text' = 'line') {
    setLines(prev => [...prev, {
      id: nextId++,
      designation: type === 'section' ? '--- Section ---' : '',
      qty: type === 'line' ? 1 : 0,
      unit: 'U',
      priceHT: 0,
      tva: autoEntrepreneur ? 0 : 10,
      type,
    }])
  }

  // --- Computations ---
  const tvaGroups: Record<number, { ht: number; tva: number }> = {}
  let totalHT = 0

  const effectiveTva = autoEntrepreneur ? 0 : globalTvaRate

  if (useForfait) {
    totalHT = forfaitHT
  } else {
    lines.forEach(l => {
      if (l.type !== 'line') return
      const lineTotal = l.qty * l.priceHT
      totalHT += lineTotal
    })
  }
  if (effectiveTva > 0) {
    tvaGroups[effectiveTva] = { ht: totalHT, tva: totalHT * (effectiveTva / 100) }
  }

  const totalTVA = Object.values(tvaGroups).reduce((s, g) => s + g.tva, 0)
  const totalTTC = totalHT + totalTVA

  // --- Build conditions string ---
  const conditionsStr = [
    ...Array.from(selectedPayments).map(id => {
      if (id === 'acompte') return `Acompte de ${acomptePercent || '...'}%`
      return PAYMENT_OPTIONS.find(p => p.id === id)?.label || ''
    }).filter(Boolean),
    conditionsLibres,
  ].filter(Boolean).join('\n')

  // --- Autosave ---
  const autosaveTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const handleSave = useCallback(async (action: 'brouillon' | 'enregistrer' | 'envoyer') => {
    setSaving(true)
    setError(null)

    // Map action to statut values matching the DB CHECK constraint
    const statutMap = { brouillon: 'brouillon', enregistrer: 'finalise', envoyer: 'envoye' } as const
    const statut = statutMap[action]

    // Generate devis number: D-YYYY-NNNNN
    const now = new Date()
    const numero = `D-${now.getFullYear()}-${String(Date.now()).slice(-5)}`

    try {
      const devis = await insertRow('devis', {
        numero,
        statut,
        date_emission: dateDevis,
        date_validite: dateValidite,
        date_debut_travaux: dateTravaux || null,
        duree_estimee: duree || null,
        objet: chantierDesc || null,
        description: chantierDesc || null,
        conditions_paiement: conditionsStr,
        notes_internes: notes || null,
        notes_client: `${clientCivilite ? clientCivilite + ' ' : ''}${clientNom || ''}${clientAdresse ? ` | ${clientAdresse}` : ''}${clientTelephone ? ` | ${clientTelephone}` : ''}${clientEmail ? ` | ${clientEmail}` : ''}`.trim() || null,
        montant_ht: totalHT,
        montant_tva: totalTVA,
        montant_ttc: totalTTC,
      })
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i]
        if (l.type !== 'line' && !l.designation) continue
        await insertRow('devis_lignes', {
          devis_id: (devis as { id: string }).id,
          designation: l.designation,
          quantite: l.qty,
          unite: l.unit,
          prix_unitaire_ht: l.priceHT,
          taux_tva: effectiveTva,
          ordre: i + 1,
        })
      }
      if (action === 'brouillon') {
        setToastMsg('Brouillon sauvegardé')
        setTimeout(() => setToastMsg(null), 3000)
        setSaving(false)
      } else {
        router.push(`/dashboard/devis/${(devis as { id: string }).id}`)
      }
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }, [clientCivilite, clientNom, clientAdresse, clientTelephone, clientEmail, dateDevis, dateValidite, dateTravaux, duree, chantierDesc, conditionsStr, notes, totalHT, totalTVA, totalTTC, effectiveTva, lines, router])

  useEffect(() => {
    autosaveTimer.current = setInterval(() => { handleSave('brouillon') }, 60000)
    return () => { if (autosaveTimer.current) clearInterval(autosaveTimer.current) }
  }, [handleSave])

  // --- Voice result handler ---
  const handleVoiceResult = (data: Record<string, unknown>) => {
    if (data.client_civilite) setClientCivilite(data.client_civilite as string)
    if (data.client_nom) setClientNom(data.client_nom as string)
    if (data.client_adresse) setClientAdresse(data.client_adresse as string)
    if (data.client_telephone) setClientTelephone(data.client_telephone as string)
    if (data.client_email) setClientEmail(data.client_email as string)
    if (data.chantier) setChantierDesc(data.chantier as string)
    if (data.conditions_paiement) setConditionsLibres(data.conditions_paiement as string)
    if (data.notes) setNotes(data.notes as string)
    if (data.tva_taux != null) setGlobalTvaRate(data.tva_taux as number)
    const voiceLines = data.lignes as Array<{ designation: string; quantite: number; unite: string; prix_unitaire: number }> | null
    if (voiceLines && voiceLines.length > 0) {
      setLines(voiceLines.map((vl, i) => ({
        id: nextId + i, designation: vl.designation, qty: vl.quantite || 1, unit: vl.unite || 'U', priceHT: vl.prix_unitaire || 0, tva: autoEntrepreneur ? 0 : 10, type: 'line' as const,
      })))
      nextId += voiceLines.length
    }
  }

  // --- Toggle payment chip ---
  const togglePayment = (id: string) => {
    setSelectedPayments(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // ===================================================================
  // PREVIEW MODE
  // ===================================================================
  if (showPreview) {
    return (
      <div className="min-h-screen">
        <TopBar showPreview setShowPreview={setShowPreview} saving={saving} onDraft={() => handleSave('brouillon')} onFinish={() => handleSave('enregistrer')} onSend={() => handleSave('envoyer')} />
        <div className="p-6 flex justify-center">
          <div className="max-w-[800px] w-full bg-white shadow-xl rounded-xl p-12">
            <div className="flex justify-between items-start mb-10">
              <div>
                {Boolean(entreprise?.logo_url) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entreprise?.logo_url as string} alt="Logo" className="h-12 w-auto object-contain mb-2" />
                )}
                <h2 className="font-syne font-bold text-xl text-[#0f1a3a]">{(entreprise?.nom as string) || 'Mon Entreprise'}</h2>
                <p className="text-sm font-manrope text-[#6b7280] mt-1 leading-relaxed">
                  {Boolean(entreprise?.adresse) && <>{entreprise?.adresse as string}<br /></>}
                  {Boolean(entreprise?.code_postal || entreprise?.ville) && <>{entreprise?.code_postal as string} {entreprise?.ville as string}<br /></>}
                  {Boolean(entreprise?.siret) && <>SIRET : {entreprise?.siret as string}<br /></>}
                  {Boolean(entreprise?.telephone) && <>Tél. : {entreprise?.telephone as string}</>}
                </p>
              </div>
              <div className="text-right">
                <h3 className="font-syne font-bold text-lg text-[#0f1a3a]">DEVIS</h3>
                <p className="text-sm font-manrope text-[#6b7280] mt-1">
                  Date : {new Date(dateDevis).toLocaleDateString('fr-FR')}<br />
                  Validité : {new Date(dateValidite).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs font-manrope font-semibold uppercase tracking-wider text-[#6b7280] mb-1">Client</p>
              <p className="text-sm font-manrope text-[#1a1a2e] font-medium">{clientCivilite ? `${clientCivilite} ` : ''}{clientNom || 'Non renseigné'}</p>
              {clientAdresse && <p className="text-sm font-manrope text-[#6b7280]">{clientAdresse}</p>}
            </div>
            {chantierDesc && (
              <div className="mb-8"><p className="text-xs font-manrope font-semibold uppercase tracking-wider text-[#6b7280] mb-1">Chantier</p><p className="text-sm font-manrope text-[#1a1a2e]">{chantierDesc}</p></div>
            )}

            <table className="w-full mb-8">
              <thead><tr className="bg-[#5ab4e0] text-white">
                <th className="px-3 py-2.5 text-left text-xs font-manrope font-semibold uppercase">Désignation</th>
                <th className="px-3 py-2.5 text-center text-xs font-manrope font-semibold uppercase">Qté</th>
                <th className="px-3 py-2.5 text-center text-xs font-manrope font-semibold uppercase">Unité</th>
                <th className="px-3 py-2.5 text-right text-xs font-manrope font-semibold uppercase">Prix U. HT</th>
                <th className="px-3 py-2.5 text-right text-xs font-manrope font-semibold uppercase">Total HT</th>
              </tr></thead>
              <tbody>
                {lines.filter(l => l.designation || l.priceHT > 0).map((l, i) => (
                  <tr key={l.id} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                    <td className="px-3 py-2.5 text-sm font-manrope text-[#1a1a2e] whitespace-pre-wrap">{l.designation}</td>
                    <td className="px-3 py-2.5 text-sm font-manrope text-center">{l.type === 'line' ? l.qty : ''}</td>
                    <td className="px-3 py-2.5 text-sm font-manrope text-center text-[#6b7280]">{l.type === 'line' ? l.unit : ''}</td>
                    <td className="px-3 py-2.5 text-sm font-manrope text-right">{l.type === 'line' && l.priceHT > 0 ? formatCurrency(l.priceHT) : l.type === 'line' ? '--' : ''}</td>
                    <td className="px-3 py-2.5 text-sm font-manrope text-right font-semibold">{l.type === 'line' && l.priceHT > 0 ? formatCurrency(l.qty * l.priceHT) : l.type === 'line' ? '--' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end mb-8">
              <div className="w-72">
                <div className="flex justify-between py-2 text-sm font-manrope"><span className="text-[#6b7280]">Total HT</span><span className="font-medium">{formatCurrency(totalHT)}</span></div>
                {!autoEntrepreneur && Object.entries(tvaGroups).filter(([r]) => Number(r) > 0).sort(([a], [b]) => Number(a) - Number(b)).map(([rate, group]) => (
                  <div key={rate} className="flex justify-between py-2 text-sm font-manrope"><span className="text-[#6b7280]">TVA {rate}%</span><span className="font-medium">{formatCurrency(group.tva)}</span></div>
                ))}
                <div className="border-t mt-2 pt-2 flex justify-between py-2"><span className="text-[#6b7280]">Total TTC</span><span className="font-semibold">{formatCurrency(totalTTC)}</span></div>
                {autoEntrepreneur && <p className="text-xs text-[#6b7280] italic mt-1">TVA non applicable, art. 293 B du CGI</p>}
              </div>
            </div>

            {conditionsStr && <div className="mb-8"><h4 className="font-manrope font-semibold text-sm text-[#1a1a2e] mb-2">Conditions de paiement</h4><p className="text-sm font-manrope text-[#6b7280] whitespace-pre-wrap">{conditionsStr}</p></div>}

            <div className="grid grid-cols-2 gap-6 mt-10">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center"><p className="text-sm font-manrope text-[#6b7280]">Signature du client</p><div className="h-20" /></div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <p className="text-sm font-manrope text-[#6b7280]">Signature de l&apos;artisan</p>
                {Boolean(entreprise?.signature_base64) ? (
                  <div className="h-20 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={entreprise?.signature_base64 as string} alt="Signature" className="max-h-full max-w-full object-contain" />
                  </div>
                ) : <div className="h-20" />}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ===================================================================
  // EDIT MODE
  // ===================================================================
  return (
    <div className="min-h-screen">
      <TopBar showPreview={false} setShowPreview={setShowPreview} saving={saving} onDraft={() => handleSave('brouillon')} onFinish={() => handleSave('enregistrer')} onSend={() => handleSave('envoyer')} />

      <div className="p-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"><p className="text-sm text-red-600 font-manrope">{error}</p></div>}

        {/* Voice button */}
        <button onClick={() => setVoiceOpen(true)} className="flex items-center gap-2 bg-[#e87a2a] text-white rounded-xl px-6 py-3 font-syne font-bold text-sm hover:bg-[#f09050] transition-colors">
          <Mic size={18} /> Créer un devis par la voix
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Dates */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div><label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Date</label><input type="date" value={dateDevis} onChange={e => setDateDevis(e.target.value)} className={inputCls} /></div>
            <div><label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Valable jusqu&apos;au</label><input type="date" value={dateValidite} onChange={e => setDateValidite(e.target.value)} className={inputCls} /></div>
            <div><label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Début des travaux</label><input type="date" value={dateTravaux} onChange={e => setDateTravaux(e.target.value)} className={inputCls} /></div>
            <div><label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Durée estimée</label><input type="text" value={duree} onChange={e => setDuree(e.target.value)} placeholder="Ex. : 3 jours" className={inputCls} /></div>
          </div>

          {/* Right: Client + Chantier */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            {/* Client */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-manrope font-medium text-[#1a1a2e]">Client</label>
                <div className="relative">
                  <button onClick={() => setClientDropdownOpen(!clientDropdownOpen)} className="text-xs font-manrope text-[#5ab4e0] hover:underline">👤 Clients précédents</button>
                  {clientDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-20 w-72 max-h-48 overflow-y-auto">
                      {clients.map(c => (
                        <button key={c.id} onClick={() => {
                          setClientNom(c.nom); setClientAdresse(c.adresse || ''); setClientTelephone(c.telephone || ''); setClientEmail(c.email || ''); setClientDropdownOpen(false)
                        }} className="w-full text-left px-3 py-2 text-sm font-manrope hover:bg-gray-50 border-b border-gray-100 last:border-0">
                          <span className="font-medium">{c.nom}</span>
                          {c.adresse && <span className="text-[#6b7280]"> — {c.adresse}</span>}
                        </button>
                      ))}
                      {clients.length === 0 && <p className="px-3 py-3 text-sm text-[#6b7280]">Aucun client enregistré</p>}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex gap-2">
                  <select value={clientCivilite} onChange={e => setClientCivilite(e.target.value)} className="w-24 h-10 rounded-lg border border-gray-200 px-2 text-sm font-manrope outline-none focus:border-[#5ab4e0] bg-white">
                    <option value="">—</option>
                    <option value="M.">M.</option>
                    <option value="Mme">Mme</option>
                    <option value="Société">Société</option>
                  </select>
                  <input type="text" value={clientNom} onChange={e => setClientNom(e.target.value)} placeholder="Nom / Prénom" className={inputCls} />
                </div>
                <input type="text" value={clientAdresse} onChange={e => setClientAdresse(e.target.value)} placeholder="Adresse" className={inputCls} />
                <input type="tel" value={clientTelephone} onChange={e => setClientTelephone(e.target.value)} placeholder="Téléphone" className={inputCls} />
                <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="Email" className={inputCls} />
              </div>
            </div>

            {/* Chantier */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-manrope font-medium text-[#1a1a2e]">Chantier / Prestation</label>
                <div className="relative">
                  <button onClick={() => setChantierDropdownOpen(!chantierDropdownOpen)} className="text-xs font-manrope text-[#5ab4e0] hover:underline">🏗️ Chantiers précédents</button>
                  {chantierDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-20 w-72 max-h-48 overflow-y-auto">
                      {chantiers.map(c => (
                        <button key={c.id} onClick={() => { setChantierDesc((c.nom || '') + (c.description ? ` — ${c.description}` : '')); setChantierDropdownOpen(false) }} className="w-full text-left px-3 py-2 text-sm font-manrope hover:bg-gray-50 border-b border-gray-100 last:border-0">{c.nom}</button>
                      ))}
                      {chantiers.length === 0 && <p className="px-3 py-3 text-sm text-[#6b7280]">Aucun chantier enregistré</p>}
                    </div>
                  )}
                </div>
              </div>
              <input type="text" value={chantierDesc} onChange={e => setChantierDesc(e.target.value)} placeholder="Description de la prestation / chantier..." className={inputCls} />
            </div>
          </div>
        </div>

        {/* Auto-entrepreneur toggle */}
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-manrope cursor-pointer">
            <input type="checkbox" checked={autoEntrepreneur} onChange={e => setAutoEntrepreneur(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-[#5ab4e0] focus:ring-[#5ab4e0]" />
            Auto-entrepreneur (sans TVA)
          </label>
        </div>

        {/* LINES TABLE */}
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-[#5ab4e0] text-white grid grid-cols-[1fr_70px_90px_100px_100px_36px] items-center px-4 py-3 text-xs font-manrope font-semibold uppercase">
                <span>Désignation</span><span className="text-center">Qté</span><span className="text-center">Unité</span><span className="text-right">Prix U. HT</span><span className="text-right">Total HT</span><span />
              </div>
              {lines.map(line => (
                <div key={line.id} className="grid grid-cols-[1fr_70px_90px_100px_100px_36px] items-start px-4 py-2 border-b border-gray-100">
                  <textarea
                    value={line.designation}
                    onChange={e => { updateLine(line.id, 'designation', e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                    className="text-sm font-manrope border-0 outline-none bg-transparent px-1 resize-none overflow-hidden min-h-[38px]"
                    placeholder="Désignation..."
                    rows={1}
                  />
                  {line.type === 'line' ? (
                    <>
                      <input type="number" value={line.qty} onChange={e => updateLine(line.id, 'qty', Number(e.target.value))} className="text-sm text-center border-0 outline-none bg-transparent mt-1.5" min={0} />
                      <input type="text" value={line.unit} onChange={e => updateLine(line.id, 'unit', e.target.value)} list="unit-suggestions" className="text-sm text-center border-0 outline-none bg-transparent mt-1.5" />
                      <input type="number" value={line.priceHT} onChange={e => updateLine(line.id, 'priceHT', Number(e.target.value))} className="text-sm text-right border-0 outline-none bg-transparent mt-1.5" min={0} step={0.01} />
                      <span className="text-sm font-semibold text-right mt-1.5">{line.priceHT > 0 ? formatCurrency(line.qty * line.priceHT) : '--'}</span>
                    </>
                  ) : <><span /><span /><span /><span /></>}
                  <button onClick={() => removeLine(line.id)} className="p-1 text-gray-300 hover:text-red-500 mt-1.5"><Trash2 size={14} /></button>
                </div>
              ))}
              <datalist id="unit-suggestions">{UNIT_SUGGESTIONS.map(u => <option key={u} value={u} />)}</datalist>
              <div className="flex flex-wrap gap-2 p-4">
                <button onClick={() => addLine('line')} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm font-manrope hover:bg-gray-100"><Plus size={14} /> Ajouter une ligne</button>
                <button onClick={() => addLine('section')} className="flex items-center gap-1.5 px-4 py-2 text-sm font-manrope text-[#6b7280] hover:text-[#1a1a2e]"><Plus size={14} /> Section</button>
                <button onClick={() => addLine('text')} className="flex items-center gap-1.5 px-4 py-2 text-sm font-manrope text-[#6b7280] hover:text-[#1a1a2e]"><Plus size={14} /> Texte libre</button>
              </div>
            </div>

            {/* Global TVA selector */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-manrope font-medium text-[#1a1a2e]">Taux de TVA applicable :</label>
                <select value={globalTvaRate} onChange={e => setGlobalTvaRate(Number(e.target.value))} disabled={autoEntrepreneur} className="h-9 rounded-lg border border-gray-200 px-3 text-sm font-manrope outline-none focus:border-[#5ab4e0] bg-white cursor-pointer disabled:opacity-50">
                  <option value={0}>Sans TVA</option><option value={5.5}>5,5%</option><option value={10}>10%</option><option value={20}>20%</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm font-manrope cursor-pointer">
                <input type="checkbox" checked={showTvaOnDevis} onChange={e => setShowTvaOnDevis(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-[#5ab4e0] focus:ring-[#5ab4e0]" />
                Afficher TVA sur le devis
              </label>
            </div>
          {/* Forfait option */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-manrope cursor-pointer">
              <input type="checkbox" checked={useForfait} onChange={e => setUseForfait(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-[#5ab4e0] focus:ring-[#5ab4e0]" />
              Appliquer un prix forfaitaire global
            </label>
            {useForfait && (
              <div className="flex items-center gap-2">
                <input type="number" value={forfaitHT} onChange={e => setForfaitHT(Number(e.target.value))} className="w-32 h-9 rounded-lg border border-gray-200 px-3 text-sm font-manrope outline-none focus:border-[#5ab4e0] text-right" min={0} step={0.01} />
                <span className="text-sm font-manrope text-[#6b7280]">€ HT</span>
              </div>
            )}
          </div>
          </>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="bg-white rounded-xl border border-gray-200 p-6 w-80">
            <div className="flex justify-between py-2 text-sm font-manrope"><span className="text-[#6b7280]">Total HT</span><span className="font-medium">{formatCurrency(totalHT)}</span></div>
            {showTvaOnDevis && !autoEntrepreneur && Object.entries(tvaGroups).filter(([r]) => Number(r) > 0).sort(([a], [b]) => Number(a) - Number(b)).map(([rate, group]) => (
              <div key={rate} className="flex justify-between py-2 text-sm font-manrope"><span className="text-[#6b7280]">TVA {rate}%</span><span className="font-medium">{formatCurrency(group.tva)}</span></div>
            ))}
            <div className="border-t mt-2 pt-2 flex justify-between py-2"><span className="text-[#6b7280]">{showTvaOnDevis && !autoEntrepreneur ? 'Total TTC' : 'Total'}</span><span className="font-semibold">{formatCurrency(showTvaOnDevis ? totalTTC : totalHT)}</span></div>
            {autoEntrepreneur && <p className="text-xs text-[#6b7280] italic mt-1">TVA non applicable, art. 293 B du CGI</p>}
            <div className="bg-[#5ab4e0] text-white rounded-lg p-3 mt-3 flex justify-between items-center">
              <span className="font-syne font-bold text-sm">NET A PAYER</span><span className="font-syne font-bold text-lg">{formatCurrency(showTvaOnDevis ? totalTTC : totalHT)}</span>
            </div>
          </div>
        </div>

        {/* Conditions de paiement */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <label className="block text-sm font-manrope font-medium text-[#1a1a2e]">Conditions de paiement</label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_OPTIONS.map(opt => (
              <button key={opt.id} onClick={() => togglePayment(opt.id)} className={`px-3 py-1.5 rounded-full text-sm font-manrope border transition-colors ${selectedPayments.has(opt.id) ? 'bg-[#5ab4e0]/10 border-[#5ab4e0] text-[#5ab4e0] font-medium' : 'border-gray-200 text-[#6b7280] hover:border-gray-400'}`}>
                {selectedPayments.has(opt.id) ? '✓ ' : '☐ '}{opt.label}
              </button>
            ))}
            <button onClick={() => togglePayment('acompte')} className={`px-3 py-1.5 rounded-full text-sm font-manrope border transition-colors ${selectedPayments.has('acompte') ? 'bg-[#5ab4e0]/10 border-[#5ab4e0] text-[#5ab4e0] font-medium' : 'border-gray-200 text-[#6b7280] hover:border-gray-400'}`}>
              {selectedPayments.has('acompte') ? '✓ ' : '☐ '}Acompte de
              <input type="text" value={acomptePercent} onChange={e => setAcomptePercent(e.target.value)} className="w-10 mx-1 text-center border-b border-current bg-transparent outline-none" placeholder="..." />%
            </button>
          </div>
          <div><label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Conditions personnalisées (optionnel)</label><textarea value={conditionsLibres} onChange={e => setConditionsLibres(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-manrope outline-none focus:border-[#5ab4e0] resize-none" /></div>
          <div><label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Notes internes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notes visibles uniquement par vous" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-manrope outline-none focus:border-[#5ab4e0] resize-none" /></div>
        </div>

        {/* Bottom buttons */}
        <div className="flex flex-wrap items-center gap-3 justify-end pb-8">
          <button onClick={() => handleSave('brouillon')} disabled={saving} className="h-12 px-6 rounded-lg border border-gray-300 text-sm font-manrope font-medium text-[#6b7280] hover:bg-gray-50 disabled:opacity-50">💾 Brouillon</button>
          <button onClick={() => handleSave('enregistrer')} disabled={saving} className="h-12 px-6 rounded-lg bg-emerald-600 text-white font-syne font-bold text-sm hover:bg-emerald-700 disabled:opacity-50">✅ Enregistrer</button>
          <div className="w-px h-8 bg-gray-200 mx-1" />
          <button onClick={() => handleSave('envoyer')} disabled={saving} className="h-12 px-8 rounded-lg bg-[#e87a2a] text-white font-syne font-bold text-sm hover:bg-[#f09050] disabled:opacity-50">📤 Envoyer</button>
        </div>
      </div>

      {/* Toast */}
      {toastMsg && <div className="fixed bottom-6 right-6 bg-[#1a1a2e] text-white px-4 py-2 rounded-lg shadow-lg text-sm font-manrope z-50">{toastMsg}</div>}

      {/* Voice Modal */}
      <VoiceModal open={voiceOpen} onClose={() => setVoiceOpen(false)} onResult={handleVoiceResult} />
    </div>
  )
}

// -------------------------------------------------------------------
// Top Bar
// -------------------------------------------------------------------

function TopBar({ showPreview, setShowPreview, saving, onDraft, onFinish, onSend }: {
  showPreview: boolean; setShowPreview: (v: boolean) => void; saving: boolean; onDraft: () => void; onFinish: () => void; onSend: () => void
}) {
  return (
    <div className="sticky top-0 bg-white border-b border-gray-200 z-10 py-3 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/devis" className="p-1.5 rounded-md hover:bg-gray-100"><ArrowLeft size={18} className="text-[#6b7280]" /></Link>
        <h2 className="font-syne font-bold text-lg text-[#1a1a2e]">Nouveau devis</h2>
      </div>
      <div className="hidden sm:flex items-center bg-gray-100 rounded-lg p-0.5">
        <button onClick={() => setShowPreview(false)} className={`px-4 py-1.5 rounded-md text-sm font-manrope font-medium transition-colors ${!showPreview ? 'bg-white shadow-sm text-[#1a1a2e]' : 'text-[#6b7280]'}`}>Édition</button>
        <button onClick={() => setShowPreview(true)} className={`px-4 py-1.5 rounded-md text-sm font-manrope font-medium transition-colors ${showPreview ? 'bg-white shadow-sm text-[#1a1a2e]' : 'text-[#6b7280]'}`}>Aperçu</button>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onDraft} disabled={saving} className="h-9 px-3 rounded-lg border border-gray-300 text-sm font-manrope text-[#6b7280] hover:bg-gray-50 disabled:opacity-50">💾 Brouillon</button>
        <button onClick={onFinish} disabled={saving} className="h-9 px-3 rounded-lg bg-emerald-600 text-white text-sm font-syne font-bold hover:bg-emerald-700 disabled:opacity-50">✅ Enregistrer</button>
        <div className="w-px h-6 bg-gray-200 mx-1" />
        <button onClick={onSend} disabled={saving} className="h-9 px-3 rounded-lg bg-[#e87a2a] text-white text-sm font-syne font-bold hover:bg-[#f09050] disabled:opacity-50">📤 Envoyer</button>
      </div>
    </div>
  )
}
