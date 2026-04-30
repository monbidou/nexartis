'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Trash2, Plus, ArrowLeft } from 'lucide-react'
import { useSupabaseRecord, useEntreprise, updateRow, insertRow, LoadingSkeleton } from '@/lib/hooks'
import { createClient } from '@/lib/supabase/client'
import { computeHierarchicalNumbers } from '@/lib/numerotation'

interface LineItem { id: number; designation: string; qty: number; unit: string; priceHT: number; taux_tva: number; type: 'line' | 'section' | 'subsection' | 'text' }
interface FactureRecord { id: string; numero: string; statut: string; type?: string; date_emission?: string; date_echeance?: string; notes?: string; montant_ht?: number; montant_tva?: number; montant_ttc?: number; client_id?: string; devis_id?: string }
interface LigneRecord { id: string; designation: string; quantite: number; unite: string; prix_unitaire_ht: number; taux_tva: number; ordre: number; type?: string }

const UNIT_SUGGESTIONS = ['U', 'm²', 'm', 'ml', 'cm', 'kg', 't', 'h', 'jour', 'demi-journée', 'forfait', 'ensemble', 'lot', 'm³']
let nextId = 1000

function formatCurrency(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

const inputCls = 'w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope outline-none focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] transition-colors placeholder:text-gray-400'

export default function ModifierFacturePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: facture, loading: loadingFacture } = useSupabaseRecord<FactureRecord>('factures', id)
  const { entreprise } = useEntreprise()

  const [lines, setLines] = useState<LineItem[]>([])
  const [globalTvaRate, setGlobalTvaRate] = useState(10)
  const [autoEntrepreneur, setAutoEntrepreneur] = useState(false)
  const [dateEmission, setDateEmission] = useState('')
  const [dateEcheance, setDateEcheance] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [loadingLignes, setLoadingLignes] = useState(true)

  useEffect(() => {
    if (!facture || loaded) return
    setDateEmission(facture.date_emission || '')
    setDateEcheance(facture.date_echeance || '')
    setNotes(facture.notes || '')
    setLoaded(true)
  }, [facture, loaded])

  useEffect(() => {
    if (!id || lines.length > 0) return
    const supabase = createClient()
    supabase.from('facture_lignes').select('*').eq('facture_id', id).order('ordre').then(({ data }) => {
      if (data && data.length > 0) {
        const raw = data as unknown as LigneRecord[]
        setLines(raw.map((l, i) => {
          const reactType: LineItem['type'] = l.type === 'section' ? 'section' : l.type === 'sous_section' ? 'subsection' : l.type === 'commentaire' ? 'text' : 'line'
          return {
            id: nextId + i,
            designation: l.designation || '',
            qty: l.quantite || 1,
            unit: l.unite || 'U',
            priceHT: l.prix_unitaire_ht || 0,
            taux_tva: l.taux_tva || 10,
            type: reactType,
          }
        }))
        nextId += raw.length
        if (raw.length > 0 && raw[0].taux_tva != null) {
          const tva = raw[0].taux_tva
          setGlobalTvaRate(tva)
          if (tva === 0) setAutoEntrepreneur(true)
        }
      }
      setLoadingLignes(false)
    })
  }, [id, lines.length])

  function updateLine(lid: number, field: keyof LineItem, value: string | number) {
    setLines(prev => prev.map(l => (l.id === lid ? { ...l, [field]: value } : l)))
  }
  function removeLine(lid: number) { setLines(prev => prev.filter(l => l.id !== lid)) }
  function computeSubtotal(idx: number): number {
    const current = lines[idx]
    if (!current || (current.type !== 'section' && current.type !== 'subsection')) return 0
    let subtotal = 0
    for (let i = idx + 1; i < lines.length; i++) {
      const l = lines[i]
      if (current.type === 'section' && l.type === 'section') break
      if (current.type === 'subsection' && (l.type === 'section' || l.type === 'subsection')) break
      if (l.type === 'line') subtotal += l.qty * l.priceHT
    }
    return subtotal
  }
  function addLine(type: 'line' | 'section' | 'subsection' | 'text' = 'line') {
    setLines(prev => [...prev, { id: nextId++, designation: '', qty: type === 'line' ? 1 : 0, unit: 'U', priceHT: 0, taux_tva: globalTvaRate, type }])
  }

  const effectiveTva = autoEntrepreneur ? 0 : globalTvaRate

  let totalHT = 0
  const tvaGroups: Record<number, number> = {}
  lines.forEach(l => {
    if (l.type === 'line') {
      const lineHT = l.qty * l.priceHT
      totalHT += lineHT
      const tva = autoEntrepreneur ? 0 : (l.taux_tva || globalTvaRate)
      if (tva > 0) {
        tvaGroups[tva] = (tvaGroups[tva] || 0) + lineHT * (tva / 100)
      }
    }
  })
  const totalTVA = Object.values(tvaGroups).reduce((s, v) => s + v, 0)
  const totalTTC = totalHT + totalTVA

  // Numerotation live pour affichage dans l'editeur
  const liveNumbers = useMemo(() => {
    type MappedLine = { type: 'section' | 'sous_section' | 'prestation' | 'commentaire'; lineId: number }
    const mapped: MappedLine[] = lines.map(l => ({
      type: (l.type === 'section' ? 'section' : l.type === 'subsection' ? 'sous_section' : l.type === 'text' ? 'commentaire' : 'prestation') as MappedLine['type'],
      lineId: l.id,
    }))
    const numbered = computeHierarchicalNumbers(mapped)
    const result: Record<number, string> = {}
    numbered.forEach(n => { result[n.lineId] = n.numero })
    return result
  }, [lines])

  const handleSave = useCallback(async (action: 'brouillon' | 'enregistrer') => {
    if (!facture) return
    setSaving(true)
    setError(null)
    try {
      await updateRow('factures', facture.id, {
        statut: action === 'brouillon' ? 'brouillon' : facture.statut === 'brouillon' ? 'brouillon' : facture.statut,
        date_emission: dateEmission || null,
        date_echeance: dateEcheance || null,
        notes: notes || null,
        montant_ht: totalHT,
        montant_tva: totalTVA,
        montant_ttc: totalTTC,
      })
      const supabase = createClient()
      await supabase.from('facture_lignes').delete().eq('facture_id', facture.id)
      const lignesFiltrees = lines.filter(l => l.type === 'line' || !!l.designation)
      const lignesPourNumero = lignesFiltrees.map(l => ({
        type: (l.type === 'section' ? 'section' : l.type === 'subsection' ? 'sous_section' : l.type === 'text' ? 'commentaire' : 'prestation') as 'section' | 'sous_section' | 'prestation' | 'commentaire',
        _orig: l,
      }))
      const lignesAvecNumero = computeHierarchicalNumbers(lignesPourNumero)
      for (let i = 0; i < lignesAvecNumero.length; i++) {
        const item = lignesAvecNumero[i]
        const l = item._orig as typeof lines[0]
        const dbType = item.type
        const dbNiveau = dbType === 'section' ? 1 : dbType === 'sous_section' ? 2 : 3
        await insertRow('facture_lignes', {
          facture_id: facture.id,
          designation: l.designation,
          quantite: l.qty,
          unite: l.unit,
          prix_unitaire_ht: l.priceHT,
          taux_tva: autoEntrepreneur ? 0 : l.taux_tva,
          ordre: i + 1,
          type: dbType,
          niveau: dbNiveau,
          numero: item.numero || null,
        })
      }
      if (action === 'brouillon') {
        setToastMsg('Modifications sauvegardées')
        setTimeout(() => setToastMsg(null), 3000)
        setSaving(false)
      } else {
        router.push('/dashboard/factures/' + facture.id)
      }
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }, [facture, dateEmission, dateEcheance, notes, totalHT, totalTVA, totalTTC, autoEntrepreneur, lines, router])

  if (loadingFacture || loadingLignes) return <div className="p-6"><LoadingSkeleton rows={8} /></div>
  if (!facture) return <div className="p-6"><p className="text-sm text-gray-500">Facture introuvable.</p></div>

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10 py-3 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={'/dashboard/factures/' + id} className="p-1.5 rounded-md hover:bg-gray-100"><ArrowLeft size={18} className="text-[#6b7280]" /></Link>
          <h2 className="font-syne font-bold text-lg text-[#1a1a2e]">Modifier {facture.numero}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleSave('brouillon')} disabled={saving} className="h-9 px-3 rounded-lg border border-gray-300 text-sm font-manrope text-[#6b7280] hover:bg-gray-50 disabled:opacity-50">Brouillon</button>
          <button onClick={() => handleSave('enregistrer')} disabled={saving} className="h-9 px-3 rounded-lg bg-emerald-600 text-white text-sm font-syne font-bold hover:bg-emerald-700 disabled:opacity-50">Enregistrer</button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"><p className="text-sm text-red-600 font-manrope">{error}</p></div>}

        {/* Dates */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Date d&apos;émission</label><input type="date" value={dateEmission} onChange={e => setDateEmission(e.target.value)} className={inputCls} /></div>
          <div><label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Date d&apos;échéance</label><input type="date" value={dateEcheance} onChange={e => setDateEcheance(e.target.value)} className={inputCls} /></div>
        </div>

        {/* Auto-entrepreneur */}
        <label className="flex items-center gap-2 text-sm font-manrope cursor-pointer">
          <input type="checkbox" checked={autoEntrepreneur} onChange={e => { setAutoEntrepreneur(e.target.checked); if (e.target.checked) setGlobalTvaRate(0) }} className="w-4 h-4 rounded border-gray-300 text-[#5ab4e0]" />
          Auto-entrepreneur (sans TVA)
        </label>

        {/* Lines table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-[#5ab4e0] text-white grid grid-cols-[55px_1fr_70px_90px_100px_80px_100px_36px] items-center px-4 py-3 text-xs font-manrope font-semibold uppercase">
            <span className="text-center">N°</span><span>Désignation</span><span className="text-center">Qté</span><span className="text-center">Unité</span><span className="text-right">Prix U. HT</span><span className="text-center">TVA</span><span className="text-right">Total HT</span><span />
          </div>
          {lines.map(line => (
            <div key={line.id} className={`grid grid-cols-[55px_1fr_70px_90px_100px_80px_100px_36px] items-start px-4 py-2 border-b border-gray-100 ${line.type === 'section' ? 'bg-[#dceefa] border-l-4 border-l-[#5ab4e0]' : line.type === 'subsection' ? 'bg-[#e8f4fb] border-l-2 border-l-[#5ab4e0]/60' : ''}`}>
              <span className={`text-xs text-center mt-2 block ${line.type === 'section' ? 'font-bold text-[#0f3d63]' : line.type === 'subsection' ? 'font-semibold text-[#1a6fb5]' : 'text-gray-400'}`}>{liveNumbers[line.id] || ''}</span>
              <textarea value={line.designation} onChange={e => { updateLine(line.id, 'designation', e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }} className={`text-sm font-manrope border-0 outline-none bg-transparent px-1 resize-none overflow-hidden min-h-[38px] ${line.type === 'section' ? 'font-bold text-[#1a6fb5]' : line.type === 'subsection' ? 'font-semibold text-[#0f1a3a]' : ''}`} placeholder={line.type === 'section' ? 'Nom de la section...' : line.type === 'subsection' ? 'Nom de la sous-section...' : line.type === 'text' ? 'Texte libre...' : 'Désignation...'} rows={1} />
              {(line.type === 'section' || line.type === 'subsection') ? (<><span /><span /><span /><span className="text-sm font-bold text-right mt-1.5 text-[#1a6fb5]">{formatCurrency(computeSubtotal(lines.indexOf(line)))}</span><span /></>) : line.type === 'line' ? (<>
                <input type="number" value={line.qty} onChange={e => updateLine(line.id, 'qty', Number(e.target.value))} className="text-sm text-center border-0 outline-none bg-transparent mt-1.5" min={0} />
                <select value={line.unit} onChange={e => updateLine(line.id, 'unit', e.target.value)} className="text-sm text-center border-0 outline-none bg-transparent mt-1.5 w-full">
                  {UNIT_SUGGESTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <input type="number" value={line.priceHT} onChange={e => updateLine(line.id, 'priceHT', Number(e.target.value))} className="text-sm text-right border-0 outline-none bg-transparent mt-1.5" min={0} step={0.01} />
                <select value={line.taux_tva} onChange={e => updateLine(line.id, 'taux_tva', Number(e.target.value))} disabled={autoEntrepreneur} className="text-sm text-center border-0 outline-none bg-transparent mt-1.5 w-full disabled:opacity-50">
                  <option value={0}>0%</option><option value={5.5}>5,5%</option><option value={10}>10%</option><option value={20}>20%</option>
                </select>
                <span className="text-sm font-semibold text-right mt-1.5">{line.priceHT > 0 ? formatCurrency(line.qty * line.priceHT) : '--'}</span>
              </>) : <><span /><span /><span /><span /><span /></>}
              <button onClick={() => removeLine(line.id)} className="p-1 text-gray-300 hover:text-red-500 mt-1.5"><Trash2 size={14} /></button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 p-4">
            <button onClick={() => addLine('line')} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm font-manrope hover:bg-gray-100"><Plus size={14} /> Ajouter une ligne</button>
            <button onClick={() => addLine('section')} className="flex items-center gap-1.5 px-4 py-2 text-sm font-manrope text-[#1a6fb5] bg-[#dceefa] border border-[#5ab4e0]/30 rounded-lg hover:bg-[#cde4f5]"><Plus size={14} /> Section</button>
            <button onClick={() => addLine('subsection')} className="flex items-center gap-1.5 px-4 py-2 text-sm font-manrope text-[#1a6fb5] bg-[#e8f4fb] border border-[#5ab4e0]/20 rounded-lg hover:bg-[#dceefa]"><Plus size={14} /> Sous-section</button>
          </div>
        </div>

        {/* TVA global */}
        {!autoEntrepreneur && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-manrope font-medium">TVA par défaut :</label>
              <select value={globalTvaRate} onChange={e => { const v = Number(e.target.value); setGlobalTvaRate(v); setLines(prev => prev.map(l => ({ ...l, taux_tva: v }))) }} className="h-9 rounded-lg border border-gray-200 px-3 text-sm font-manrope bg-white cursor-pointer">
                <option value={5.5}>5,5%</option><option value={10}>10%</option><option value={20}>20%</option>
              </select>
            </div>
            <p className="text-xs text-gray-400 font-manrope">Chaque ligne peut avoir son propre taux TVA</p>
          </div>
        )}

        {/* Totals */}
        <div className="flex justify-end">
          <div className="bg-white rounded-xl border border-gray-200 p-6 w-80">
            <div className="flex justify-between py-2 text-sm font-manrope"><span className="text-[#6b7280]">Total HT</span><span className="font-medium">{formatCurrency(totalHT)}</span></div>
            {Object.entries(tvaGroups).sort((a, b) => Number(a[0]) - Number(b[0])).map(([rate, amount]) => (
              <div key={rate} className="flex justify-between py-1 text-sm font-manrope"><span className="text-[#6b7280]">TVA {rate}%</span><span className="font-medium">{formatCurrency(amount)}</span></div>
            ))}
            {totalTVA > 0 && <div className="flex justify-between py-1 text-sm font-manrope border-t mt-1 pt-1"><span className="text-[#6b7280]">Total TVA</span><span className="font-medium">{formatCurrency(totalTVA)}</span></div>}
            <div className="border-t mt-2 pt-2 flex justify-between py-2"><span className="font-semibold text-[#1a1a2e]">Total TTC</span><span className="font-bold text-lg">{formatCurrency(totalTTC)}</span></div>
            {autoEntrepreneur && <p className="text-xs text-[#6b7280] italic mt-1">TVA non applicable, art. 293 B du CGI</p>}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-manrope font-medium mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-manrope outline-none focus:border-[#5ab4e0] resize-none" placeholder="Notes visibles sur la facture..." />
        </div>

        {/* Bottom buttons */}
        <div className="flex flex-wrap items-center gap-3 justify-end pb-8">
          <button onClick={() => handleSave('brouillon')} disabled={saving} className="h-12 px-6 rounded-lg border border-gray-300 text-sm font-manrope text-[#6b7280] hover:bg-gray-50 disabled:opacity-50">Brouillon</button>
          <button onClick={() => handleSave('enregistrer')} disabled={saving} className="h-12 px-6 rounded-lg bg-emerald-600 text-white font-syne font-bold text-sm hover:bg-emerald-700 disabled:opacity-50">Enregistrer</button>
        </div>
      </div>

      {toastMsg && <div className="fixed bottom-6 right-6 bg-[#1a1a2e] text-white px-4 py-2 rounded-lg shadow-lg text-sm font-manrope z-50">{toastMsg}</div>}
    </div>
  )
}
