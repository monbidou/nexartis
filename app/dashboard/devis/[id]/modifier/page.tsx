'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Trash2, Plus, ArrowLeft } from 'lucide-react'
import { useSupabaseRecord, useDevisLignes, useEntreprise, updateRow, insertRow, LoadingSkeleton } from '@/lib/hooks'
import { computeHierarchicalNumbers } from '@/lib/numerotation'

interface LineItem { id: number; designation: string; qty: number; unit: string; priceHT: number; type: 'line' | 'section' | 'subsection' | 'text' }
interface DevisRecord { id: string; numero: string; statut: string; date_emission?: string; date_validite?: string; date_debut_travaux?: string; duree_estimee?: string; description?: string; objet?: string; conditions_paiement?: string; notes_internes?: string; notes_client?: string; montant_ht?: number; montant_tva?: number; montant_ttc?: number }
interface LigneRecord { id: string; designation: string; quantite: number; unite: string; prix_unitaire_ht: number; taux_tva: number; ordre: number; type?: string; niveau?: number }

const UNIT_SUGGESTIONS = ['U', 'm²', 'm', 'ml', 'cm', 'kg', 't', 'h', 'jour', 'demi-journée', 'forfait', 'ensemble', 'lot', 'm³']
let nextId = 1000

function formatCurrency(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

const inputCls = 'w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope outline-none focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] transition-colors placeholder:text-gray-400'

export default function ModifierDevisPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: devis, loading: loadingDevis } = useSupabaseRecord<DevisRecord>('devis', id)
  const { data: lignesRaw, loading: loadingLignes } = useDevisLignes(id)
  const { entreprise } = useEntreprise()

  const [lines, setLines] = useState<LineItem[]>([])
  const [globalTvaRate, setGlobalTvaRate] = useState(10)
  const [showTvaOnDevis, setShowTvaOnDevis] = useState(true)
  const [autoEntrepreneur, setAutoEntrepreneur] = useState(false)

  useEffect(() => {
    const fj = (entreprise?.forme_juridique || '').toLowerCase()
    const estMicro = fj.includes('micro') || fj === 'ei' || fj.includes('entreprise individuelle')
    if (entreprise?.franchise_tva === true || estMicro) {
      setAutoEntrepreneur(true)
    }
  }, [entreprise?.franchise_tva, entreprise?.forme_juridique])

  const [dateDevis, setDateDevis] = useState('')
  const [dateValidite, setDateValidite] = useState('')
  const [dateTravaux, setDateTravaux] = useState('')
  const [duree, setDuree] = useState('')
  const [description, setDescription] = useState('')
  const [conditions, setConditions] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!devis || loaded) return
    setDateDevis(devis.date_emission || '')
    setDateValidite(devis.date_validite || '')
    setDateTravaux(devis.date_debut_travaux || '')
    setDuree(devis.duree_estimee || '')
    setDescription(devis.objet || devis.description || '')
    setConditions(devis.conditions_paiement || '')
    setNotes(devis.notes_internes || '')
    setLoaded(true)
  }, [devis, loaded])

  useEffect(() => {
    if (!lignesRaw || lignesRaw.length === 0 || lines.length > 0) return
    const raw = lignesRaw as unknown as LigneRecord[]
    setLines(raw.map((l, i) => {
      const reactType: LineItem['type'] = l.type === 'section' ? 'section' : l.type === 'sous_section' ? 'subsection' : l.type === 'commentaire' ? 'text' : 'line'
      return { id: nextId + i, designation: l.designation || '', qty: l.quantite || 1, unit: l.unite || 'U', priceHT: l.prix_unitaire_ht || 0, type: reactType }
    }))
    nextId += raw.length
    if (raw.length > 0 && raw[0].taux_tva != null) {
      const tva = raw[0].taux_tva
      setGlobalTvaRate(tva)
      if (tva === 0) setAutoEntrepreneur(true)
    }
  }, [lignesRaw, lines.length])

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
    setLines(prev => [...prev, { id: nextId++, designation: '', qty: type === 'line' ? 1 : 0, unit: 'U', priceHT: 0, type }])
  }

  const effectiveTva = autoEntrepreneur ? 0 : globalTvaRate
  let totalHT = 0
  lines.forEach(l => { if (l.type === 'line') totalHT += l.qty * l.priceHT })
  const totalTVA = effectiveTva > 0 ? totalHT * (effectiveTva / 100) : 0
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

  const handleSave = useCallback(async (action: 'brouillon' | 'enregistrer' | 'envoyer') => {
    if (!devis) return
    setSaving(true)
    setError(null)
    const wasSharedWithClient = devis.statut === 'envoye' || devis.statut === 'signe'
    let nouveauStatut: string
    if (action === 'brouillon') {
      nouveauStatut = 'brouillon'
    } else if (action === 'enregistrer') {
      nouveauStatut = wasSharedWithClient ? 'brouillon' : 'finalise'
    } else {
      nouveauStatut = 'finalise'
    }
    try {
      await updateRow('devis', devis.id, {
        statut: nouveauStatut,
        date_emission: dateDevis || null,
        date_validite: dateValidite || null,
        date_debut_travaux: dateTravaux || null,
        duree_estimee: duree || null,
        objet: description || null,
        description: description || null,
        conditions_paiement: conditions || null,
        notes_internes: notes || null,
        montant_ht: totalHT,
        montant_tva: totalTVA,
        montant_ttc: totalTTC,
      })
      const supabase = (await import('@/lib/supabase/client')).createClient()
      await supabase.from('devis_lignes').delete().eq('devis_id', devis.id)
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
        await insertRow('devis_lignes', {
          devis_id: devis.id,
          designation: l.designation,
          quantite: l.qty,
          unite: l.unit,
          prix_unitaire_ht: l.priceHT,
          taux_tva: effectiveTva,
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
        router.push(`/dashboard/devis/${devis.id}`)
      }
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }, [devis, dateDevis, dateValidite, dateTravaux, duree, description, conditions, notes, totalHT, totalTVA, totalTTC, effectiveTva, lines, router])

  if (loadingDevis || loadingLignes) return <div className="p-6"><LoadingSkeleton rows={8} /></div>
  if (!devis) return <div className="p-6"><p className="text-sm text-gray-500">Devis introuvable.</p></div>

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10 py-3 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/devis/${id}`} className="p-1.5 rounded-md hover:bg-gray-100"><ArrowLeft size={18} className="text-[#6b7280]" /></Link>
          <h2 className="font-syne font-bold text-lg text-[#1a1a2e]">Modifier {devis.numero}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleSave('brouillon')} disabled={saving} className="h-9 px-3 rounded-lg border border-gray-300 text-sm font-manrope text-[#6b7280] hover:bg-gray-50 disabled:opacity-50">Brouillon</button>
          <button onClick={() => handleSave('enregistrer')} disabled={saving} className="h-9 px-3 rounded-lg bg-emerald-600 text-white text-sm font-syne font-bold hover:bg-emerald-700 disabled:opacity-50">Enregistrer</button>
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <button onClick={() => handleSave('envoyer')} disabled={saving} className="h-9 px-3 rounded-lg bg-[#e87a2a] text-white text-sm font-syne font-bold hover:bg-[#f09050] disabled:opacity-50">Envoyer</button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"><p className="text-sm text-red-600 font-manrope">{error}</p></div>}

        {/* Dates */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div><label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Date</label><input type="date" value={dateDevis} onChange={e => setDateDevis(e.target.value)} className={inputCls} /></div>
          <div><label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Validité</label><input type="date" value={dateValidite} onChange={e => setDateValidite(e.target.value)} className={inputCls} /></div>
          <div><label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Durée</label><input type="text" value={duree} onChange={e => setDuree(e.target.value)} placeholder="Ex. : 3 jours" className={inputCls} /></div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Description / Chantier</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} className={inputCls} />
        </div>

        {/* Auto-entrepreneur */}
        <label className="flex items-center gap-2 text-sm font-manrope cursor-pointer">
          <input type="checkbox" checked={autoEntrepreneur} onChange={e => { setAutoEntrepreneur(e.target.checked); if (e.target.checked) setGlobalTvaRate(0) }} className="w-4 h-4 rounded border-gray-300 text-[#5ab4e0]" />
          Auto-entrepreneur (sans TVA)
        </label>

        {/* Lines table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-[#5ab4e0] text-white grid grid-cols-[55px_1fr_70px_90px_100px_100px_36px] items-center px-4 py-3 text-xs font-manrope font-semibold uppercase">
            <span className="text-center">N°</span><span>Désignation</span><span className="text-center">Qté</span><span className="text-center">Unité</span><span className="text-right">Prix U. HT</span><span className="text-right">Total HT</span><span />
          </div>
          {lines.map(line => (
            <div key={line.id} className={`grid grid-cols-[55px_1fr_70px_90px_100px_100px_36px] items-start px-4 py-2 border-b border-gray-100 ${line.type === 'section' ? 'bg-[#dceefa] border-l-4 border-l-[#5ab4e0]' : line.type === 'subsection' ? 'bg-[#e8f4fb] border-l-2 border-l-[#5ab4e0]/60' : ''}`}>
              <span className={`text-xs text-center mt-2 block ${line.type === 'section' ? 'font-bold text-[#0f3d63]' : line.type === 'subsection' ? 'font-semibold text-[#1a6fb5]' : 'text-gray-400'}`}>{liveNumbers[line.id] || ''}</span>
              <textarea value={line.designation} onChange={e => { updateLine(line.id, 'designation', e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }} className={`text-sm font-manrope border-0 outline-none bg-transparent px-1 resize-none overflow-hidden min-h-[38px] ${line.type === 'section' ? 'font-bold text-[#1a6fb5]' : line.type === 'subsection' ? 'font-semibold text-[#0f1a3a]' : ''}`} placeholder={line.type === 'section' ? 'Nom de la section...' : line.type === 'subsection' ? 'Nom de la sous-section...' : line.type === 'text' ? 'Texte libre...' : 'Désignation...'} rows={1} />
              {(line.type === 'section' || line.type === 'subsection') ? (<><span /><span /><span /><span className="text-sm font-bold text-right mt-1.5 text-[#1a6fb5]">{formatCurrency(computeSubtotal(lines.indexOf(line)))}</span></>) : line.type === 'line' ? (<>
                <input type="number" value={line.qty} onChange={e => updateLine(line.id, 'qty', Number(e.target.value))} className="text-sm text-center border-0 outline-none bg-transparent mt-1.5" min={0} />
                <select value={line.unit} onChange={e => updateLine(line.id, 'unit', e.target.value)} className="text-sm text-center border-0 outline-none bg-transparent mt-1.5 w-full">
                  {UNIT_SUGGESTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <input type="number" value={line.priceHT} onChange={e => updateLine(line.id, 'priceHT', Number(e.target.value))} className="text-sm text-right border-0 outline-none bg-transparent mt-1.5" min={0} step={0.01} />
                <span className="text-sm font-semibold text-right mt-1.5">{line.priceHT > 0 ? formatCurrency(line.qty * line.priceHT) : '--'}</span>
              </>) : <><span /><span /><span /><span /></>}
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
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-manrope font-medium">Taux TVA :</label>
            <select value={globalTvaRate} onChange={e => setGlobalTvaRate(Number(e.target.value))} disabled={autoEntrepreneur} className="h-9 rounded-lg border border-gray-200 px-3 text-sm font-manrope bg-white cursor-pointer disabled:opacity-50">
              <option value={0}>Sans TVA</option><option value={5.5}>5,5%</option><option value={10}>10%</option><option value={20}>20%</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm font-manrope cursor-pointer">
            <input type="checkbox" checked={showTvaOnDevis} onChange={e => setShowTvaOnDevis(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-[#5ab4e0]" />
            Afficher TVA sur le devis
          </label>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="bg-white rounded-xl border border-gray-200 p-6 w-80">
            <div className="flex justify-between py-2 text-sm font-manrope"><span className="text-[#6b7280]">Total HT</span><span className="font-medium">{formatCurrency(totalHT)}</span></div>
            {showTvaOnDevis && effectiveTva > 0 && <div className="flex justify-between py-2 text-sm font-manrope"><span className="text-[#6b7280]">TVA {effectiveTva}%</span><span className="font-medium">{formatCurrency(totalTVA)}</span></div>}
            <div className="border-t mt-2 pt-2 flex justify-between py-2"><span className="text-[#6b7280]">{showTvaOnDevis && effectiveTva > 0 ? 'Total TTC' : 'Total'}</span><span className="font-semibold">{formatCurrency(showTvaOnDevis ? totalTTC : totalHT)}</span></div>
            {autoEntrepreneur && <p className="text-xs text-[#6b7280] italic mt-1">TVA non applicable, art. 293 B du CGI</p>}
          </div>
        </div>

        {/* Conditions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div><label className="block text-sm font-manrope font-medium mb-1">Conditions de paiement</label><textarea value={conditions} onChange={e => setConditions(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-manrope outline-none focus:border-[#5ab4e0] resize-none" /></div>
          <div><label className="block text-sm font-manrope font-medium mb-1">Notes internes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-manrope outline-none focus:border-[#5ab4e0] resize-none" /></div>
        </div>

        {/* Bottom buttons */}
        <div className="flex flex-wrap items-center gap-3 justify-end pb-8">
          <button onClick={() => handleSave('brouillon')} disabled={saving} className="h-12 px-6 rounded-lg border border-gray-300 text-sm font-manrope text-[#6b7280] hover:bg-gray-50 disabled:opacity-50">Brouillon</button>
          <button onClick={() => handleSave('enregistrer')} disabled={saving} className="h-12 px-6 rounded-lg bg-emerald-600 text-white font-syne font-bold text-sm hover:bg-emerald-700 disabled:opacity-50">Enregistrer</button>
          <div className="w-px h-8 bg-gray-200 mx-1" />
          <button onClick={() => handleSave('envoyer')} disabled={saving} className="h-12 px-8 rounded-lg bg-[#e87a2a] text-white font-syne font-bold text-sm hover:bg-[#f09050] disabled:opacity-50">Envoyer</button>
        </div>
      </div>

      {toastMsg && <div className="fixed bottom-6 right-6 bg-[#1a1a2e] text-white px-4 py-2 rounded-lg shadow-lg text-sm font-manrope z-50">{toastMsg}</div>}
    </div>
  )
}
