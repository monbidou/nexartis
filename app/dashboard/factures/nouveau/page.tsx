'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useClients, useEntreprise, insertRow } from '@/lib/hooks'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────

interface LineItem {
  id: number
  designation: string
  qty: number
  unit: string
  priceHT: number
}

interface ClientRecord { id: string; nom: string; prenom?: string; civilite?: string; adresse?: string; telephone?: string; email?: string; code_postal?: string; ville?: string }

// ─── Constants ────────────────────────────────────────────────────────────

const UNIT_SUGGESTIONS = ['U', 'm²', 'm', 'ml', 'h', 'jour', 'forfait', 'lot', 'ensemble']
const TVA_RATES = [0, 5.5, 10, 20]
let nextId = 200

function formatCurrency(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

const inputCls = 'w-full h-11 rounded-xl border-2 border-gray-200 px-3 text-sm font-manrope outline-none focus:border-[#5ab4e0] focus:ring-2 focus:ring-[#5ab4e0]/20 transition-all bg-white placeholder:text-gray-400'

// ─── Page ─────────────────────────────────────────────────────────────────

export default function NouvelleFacturePage() {
  const router = useRouter()
  const { data: clientsRaw } = useClients()
  const { entreprise } = useEntreprise()
  const clients = clientsRaw as unknown as ClientRecord[]

  // Dates
  const today = new Date().toISOString().slice(0, 10)
  const inMonth = (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10) })()
  const [dateFacture, setDateFacture] = useState(today)
  const [dateEcheance, setDateEcheance] = useState(inMonth)

  // Client (texte libre ou sélection)
  const [clientNom, setClientNom] = useState('')
  const [clientPrenom, setClientPrenom] = useState('')
  const [clientCivilite, setClientCivilite] = useState('')
  const [clientAdresse, setClientAdresse] = useState('')
  const [clientCodePostal, setClientCodePostal] = useState('')
  const [clientVille, setClientVille] = useState('')
  const [clientTelephone, setClientTelephone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientSuggestions, setClientSuggestions] = useState<ClientRecord[]>([])
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)

  // Objet
  const [objet, setObjet] = useState('')

  // Lignes
  const [lines, setLines] = useState<LineItem[]>([{ id: 1, designation: '', qty: 1, unit: 'U', priceHT: 0 }])
  const [globalTvaRate, setGlobalTvaRate] = useState(10)

  // Conditions
  const [conditions, setConditions] = useState('')
  const [notes, setNotes] = useState('')

  // UI
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Client autocomplete ──
  const handleClientNomChange = (value: string) => {
    setClientNom(value)
    if (value.length >= 1 && clients && clients.length > 0) {
      const q = value.toLowerCase().trim()
      const filtered = clients.filter(c => {
        const nom = String(c.nom || '').toLowerCase()
        const prenom = String(c.prenom || '').toLowerCase()
        return nom.includes(q) || prenom.includes(q) || (prenom + ' ' + nom).includes(q)
      })
      setClientSuggestions(filtered.slice(0, 8))
      setClientDropdownOpen(filtered.length > 0)
    } else {
      setClientSuggestions([])
      setClientDropdownOpen(false)
    }
  }

  const selectClient = (c: ClientRecord) => {
    setClientCivilite((c as unknown as Record<string, string>).civilite || '')
    setClientNom(c.nom)
    setClientPrenom(c.prenom || '')
    setClientAdresse(c.adresse || '')
    setClientCodePostal(c.code_postal || '')
    setClientVille(c.ville || '')
    setClientTelephone(c.telephone || '')
    setClientEmail(c.email || '')
    setClientSuggestions([])
    setClientDropdownOpen(false)
  }

  // ── Line operations ──
  function updateLine(id: number, field: keyof LineItem, value: string | number) {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l))
  }
  function removeLine(id: number) { setLines(prev => prev.filter(l => l.id !== id)) }
  function addLine() {
    setLines(prev => [...prev, { id: nextId++, designation: '', qty: 1, unit: 'U', priceHT: 0 }])
  }

  // ── Computations ──
  let totalHT = 0
  lines.forEach(l => { totalHT += l.qty * l.priceHT })
  const totalTVA = globalTvaRate > 0 ? totalHT * (globalTvaRate / 100) : 0
  const totalTTC = totalHT + totalTVA

  // ── Save ──
  const handleSave = useCallback(async (statut: 'brouillon' | 'envoyee') => {
    setSaving(true)
    setError(null)
    try {
      const now = new Date()
      const numero = `F-${now.getFullYear()}-${String(Date.now()).slice(-5)}`
      const clientDisplay = `${clientCivilite ? clientCivilite + ' ' : ''}${clientPrenom ? clientPrenom + ' ' : ''}${clientNom}`.trim()

      const factureData: Record<string, unknown> = {
        numero,
        statut,
        date_emission: dateFacture,
        date_echeance: dateEcheance,
        objet: objet || null,
        notes: conditions || null,
        notes_client: clientDisplay
          ? `${clientDisplay}${clientAdresse ? ` | ${clientAdresse}` : ''}${clientCodePostal || clientVille ? ` | ${clientCodePostal} ${clientVille}`.trim() : ''}${clientTelephone ? ` | ${clientTelephone}` : ''}${clientEmail ? ` | ${clientEmail}` : ''}`
          : null,
        client_nom: clientNom || null,
        client_adresse: clientAdresse || null,
        montant_ht: totalHT,
        montant_tva: totalTVA,
        montant_ttc: totalTTC,
      }

      // Sauvegarder/mettre à jour le client dans la base de données
      if (clientNom.trim()) {
        try {
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: existingClient } = await supabase
              .from('clients')
              .select('id')
              .eq('user_id', user.id)
              .ilike('nom', clientNom.trim())
              .maybeSingle()

            const clientData: Record<string, unknown> = {
              nom: clientNom.trim(),
              prenom: clientPrenom.trim() || null,
              adresse: clientAdresse || null,
              code_postal: clientCodePostal || null,
              ville: clientVille || null,
              telephone: clientTelephone || null,
              email: clientEmail || null,
              user_id: user.id,
            }
            if (clientCivilite) clientData.civilite = clientCivilite

            if (existingClient) {
              factureData.client_id = existingClient.id
              // Mettre à jour les infos du client existant
              await supabase.from('clients').update(clientData).eq('id', existingClient.id)
            } else {
              // Créer le client automatiquement
              const { data: newClient } = await supabase
                .from('clients')
                .insert({ ...clientData, type: 'particulier', actif: true })
                .select('id')
                .single()
              if (newClient) factureData.client_id = newClient.id
            }
          }
        } catch (err) { console.error('Erreur sauvegarde client:', err) }
      }

      const facture = await insertRow('factures', factureData)
      const factureId = (facture as Record<string, unknown>).id as string

      for (let i = 0; i < lines.length; i++) {
        const l = lines[i]
        if (!l.designation && l.priceHT === 0) continue
        await insertRow('facture_lignes', {
          facture_id: factureId,
          designation: l.designation,
          quantite: l.qty,
          unite: l.unit,
          prix_unitaire_ht: l.priceHT,
          taux_tva: globalTvaRate,
          ordre: i + 1,
        })
      }

      router.push(`/dashboard/factures/${factureId}`)
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }, [clientCivilite, clientNom, clientPrenom, clientAdresse, clientCodePostal, clientVille, clientTelephone, clientEmail, dateFacture, dateEcheance, objet, conditions, totalHT, totalTVA, totalTTC, globalTvaRate, lines, router])

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10 py-3 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/factures" className="p-1.5 rounded-md hover:bg-gray-100">
            <ArrowLeft size={18} className="text-[#6b7280]" />
          </Link>
          <h2 className="font-syne font-bold text-lg text-[#1a1a2e]">Nouvelle facture</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleSave('brouillon')} disabled={saving}
            className="h-9 px-4 rounded-xl border-2 border-gray-300 text-sm font-syne font-semibold text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-all disabled:opacity-50">
            Brouillon
          </button>
          <button onClick={() => handleSave('envoyee')} disabled={saving}
            className="h-9 px-5 rounded-xl bg-[#e87a2a] text-white font-syne font-bold text-sm hover:bg-[#f09050] transition-all disabled:opacity-50">
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"><p className="text-sm text-red-600 font-manrope">{error}</p></div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dates */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div>
              <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Date de facture</label>
              <input type="date" value={dateFacture} onChange={e => setDateFacture(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Date d&apos;échéance</label>
              <input type="date" value={dateEcheance} onChange={e => setDateEcheance(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Objet / Chantier</label>
              <input type="text" value={objet} onChange={e => setObjet(e.target.value)} placeholder="Ex. : Salle de bain, Installation électrique..." className={inputCls} />
            </div>
          </div>

          {/* Client */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-sm font-manrope font-semibold text-[#1a1a2e] mb-3">Client</label>
            <div className="space-y-3">
              <div className="relative">
                <div className="flex gap-2">
                  <select value={clientCivilite} onChange={e => setClientCivilite(e.target.value)} className="w-24 h-11 shrink-0 rounded-xl border-2 border-gray-200 px-2 text-sm font-manrope outline-none focus:border-[#5ab4e0] bg-white">
                    <option value="">—</option>
                    <option value="M.">M.</option>
                    <option value="Mme">Mme</option>
                    <option value="Société">Société</option>
                  </select>
                  <input type="text" value={clientNom} onChange={e => handleClientNomChange(e.target.value)}
                    onBlur={() => setTimeout(() => { setClientDropdownOpen(false); setClientSuggestions([]) }, 200)}
                    placeholder="Nom (tapez pour rechercher)" className={inputCls} autoComplete="off" />
                </div>
                {clientDropdownOpen && clientSuggestions.length > 0 && (
                  <div className="absolute left-0 top-full mt-1 bg-white rounded-xl border-2 border-[#5ab4e0] shadow-2xl z-50 w-full max-h-60 overflow-y-auto">
                    {clientSuggestions.map(c => (
                      <button key={c.id} type="button" onMouseDown={e => { e.preventDefault(); selectClient(c) }}
                        className="w-full text-left px-4 py-3 font-manrope hover:bg-[#eef7fc] border-b border-gray-100 last:border-0 transition-colors">
                        <span className="font-semibold text-[#1a1a2e] text-sm">{c.prenom ? `${c.prenom} ${c.nom}` : c.nom}</span>
                        {c.adresse && <span className="text-[#6b7280] text-xs block mt-0.5">{c.adresse}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input type="text" value={clientPrenom} onChange={e => setClientPrenom(e.target.value)} placeholder="Prénom" className={inputCls} />
              <input type="text" value={clientAdresse} onChange={e => setClientAdresse(e.target.value)} placeholder="Adresse" className={inputCls} />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={clientCodePostal} onChange={e => setClientCodePostal(e.target.value)} placeholder="Code postal" className={inputCls} />
                <input type="text" value={clientVille} onChange={e => setClientVille(e.target.value)} placeholder="Ville" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="tel" value={clientTelephone} onChange={e => setClientTelephone(e.target.value)} placeholder="Téléphone" className={inputCls} />
                <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="Email" className={inputCls} />
              </div>
            </div>
          </div>
        </div>

        {/* Tableau des lignes */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-[#5ab4e0] text-white grid grid-cols-[1fr_70px_90px_100px_100px_36px] items-center px-4 py-3 text-xs font-manrope font-semibold uppercase">
            <span>Désignation</span><span className="text-center">Qté</span><span className="text-center">Unité</span><span className="text-right">Prix U. HT</span><span className="text-right">Total HT</span><span />
          </div>
          {lines.map(line => (
            <div key={line.id} className="grid grid-cols-[1fr_70px_90px_100px_100px_36px] items-center px-4 py-2 border-b border-gray-100">
              <input type="text" value={line.designation} onChange={e => updateLine(line.id, 'designation', e.target.value)}
                className="text-sm font-manrope border-0 outline-none bg-transparent px-1 h-9" placeholder="Désignation..." />
              <input type="number" value={line.qty} onChange={e => updateLine(line.id, 'qty', Number(e.target.value))}
                className="text-sm text-center border-0 outline-none bg-transparent" min={0} />
              <select value={line.unit} onChange={e => updateLine(line.id, 'unit', e.target.value)}
                className="text-sm text-center border-0 outline-none bg-transparent w-full">
                {UNIT_SUGGESTIONS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <input type="number" value={line.priceHT} onChange={e => updateLine(line.id, 'priceHT', Number(e.target.value))}
                className="text-sm text-right border-0 outline-none bg-transparent" min={0} step={0.01} />
              <span className="text-sm font-semibold text-right">{line.priceHT > 0 ? formatCurrency(line.qty * line.priceHT) : '—'}</span>
              <button onClick={() => removeLine(line.id)} className="p-1 text-gray-300 hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 p-4">
            <button onClick={addLine} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm font-manrope hover:bg-gray-100">
              <Plus size={14} /> Ajouter une ligne
            </button>
          </div>
        </div>

        {/* TVA */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-4">
          <label className="text-sm font-manrope font-medium text-[#1a1a2e]">Taux de TVA applicable :</label>
          <select value={globalTvaRate} onChange={e => setGlobalTvaRate(Number(e.target.value))}
            className="h-9 rounded-lg border border-gray-200 px-3 text-sm font-manrope outline-none focus:border-[#5ab4e0] bg-white cursor-pointer">
            {TVA_RATES.map(r => <option key={r} value={r}>{r === 0 ? 'Sans TVA' : `${r}%`}</option>)}
          </select>
        </div>

        {/* Totaux */}
        <div className="flex justify-end">
          <div className="bg-white rounded-xl border border-gray-200 p-6 w-80">
            <div className="flex justify-between py-2 text-sm font-manrope">
              <span className="text-[#6b7280]">Total HT</span><span className="font-medium">{formatCurrency(totalHT)}</span>
            </div>
            {globalTvaRate > 0 && (
              <div className="flex justify-between py-2 text-sm font-manrope">
                <span className="text-[#6b7280]">TVA {globalTvaRate}%</span><span className="font-medium">{formatCurrency(totalTVA)}</span>
              </div>
            )}
            <div className="border-t mt-2 pt-2 flex justify-between py-2 text-sm font-manrope">
              <span className="text-[#6b7280] font-bold">Total TTC</span><span className="font-bold">{formatCurrency(totalTTC)}</span>
            </div>
            <div className="bg-[#5ab4e0] text-white rounded-lg p-3 mt-3 flex justify-between items-center">
              <span className="font-syne font-bold text-sm">NET À PAYER</span>
              <span className="font-syne font-bold text-lg">{formatCurrency(totalTTC)}</span>
            </div>
          </div>
        </div>

        {/* Conditions + Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Conditions de paiement</label>
            <textarea value={conditions} onChange={e => setConditions(e.target.value)} rows={2}
              placeholder="Ex. : Paiement à 30 jours, virement bancaire..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-manrope outline-none focus:border-[#5ab4e0] resize-none" />
          </div>
          <div>
            <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Notes internes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Notes visibles uniquement par vous"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-manrope outline-none focus:border-[#5ab4e0] resize-none" />
          </div>
        </div>

        {/* Boutons bas de page */}
        <div className="flex flex-wrap items-center gap-3 justify-end pb-8">
          <button onClick={() => handleSave('brouillon')} disabled={saving}
            className="h-12 px-6 rounded-xl border-2 border-gray-300 text-sm font-syne font-semibold text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-all disabled:opacity-50">
            Sauvegarder en brouillon
          </button>
          <button onClick={() => handleSave('envoyee')} disabled={saving}
            className="h-12 px-8 rounded-xl bg-[#e87a2a] text-white font-syne font-bold text-sm hover:bg-[#f09050] shadow-md hover:shadow-lg transition-all disabled:opacity-50">
            {saving ? 'Enregistrement...' : 'Enregistrer la facture'}
          </button>
        </div>
      </div>
    </div>
  )
}
