'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Trash2, Plus, ArrowLeft, Mic, MicOff, X } from 'lucide-react'
import { useClients, useChantiers, useEntreprise, usePointsCollecte, insertRow, LoadingSkeleton } from '@/lib/hooks'
import { createClient } from '@/lib/supabase/client'

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

interface ClientRecord { id: string; nom: string; prenom?: string; adresse?: string; telephone?: string; email?: string; code_postal?: string; ville?: string }
interface ChantierRecord { id: string; nom: string; description?: string }

// -------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------

const UNIT_SUGGESTIONS = ['U', 'm²', 'm', 'ml', 'cm', 'kg', 't', 'h', 'jour', 'demi-journée', 'forfait', 'ensemble', 'lot', 'm³']
const TVA_RATES = [0, 5.5, 10, 20]

// Liste de prestations intégrées (toujours disponibles, même sans données en base)
const PRESTATIONS_INTEGREES = [
  'Installation tableau électrique', 'Remplacement tableau électrique', 'Mise aux normes électriques',
  'Installation prises de courant', 'Installation interrupteurs', 'Câblage / tirage de câbles',
  'Installation éclairage intérieur', 'Installation éclairage extérieur', 'Pose spots encastrés',
  'Installation VMC (ventilation)', 'Installation chauffe-eau électrique', 'Installation radiateurs électriques',
  'Domotique / automatisation', 'Borne de recharge véhicule électrique', 'Mise à la terre',
  'Diagnostic électrique', 'Installation alarme / sécurité', 'Sonette / interphone / visiophone',
  'Installation sanitaires (WC, lavabo, douche)', 'Remplacement robinetterie', 'Débouchage canalisations',
  'Réparation fuite d\'eau', 'Installation chauffe-eau', 'Remplacement chaudière',
  'Construction mur / cloison', 'Démolition mur / cloison', 'Ouverture de mur porteur',
  'Coulage dalle béton', 'Ragréage sol', 'Enduit / crépi extérieur', 'Isolation thermique',
  'Pose fenêtres double vitrage', 'Pose porte d\'entrée', 'Pose porte intérieure',
  'Installation volets roulants', 'Pose parquet', 'Construction terrasse bois', 'Pose pergola',
  'Peinture intérieure', 'Peinture extérieure', 'Pose papier peint', 'Pose carrelage / faïence',
  'Ravalement de façade', 'Travaux de plomberie générale', 'Travaux de charpente',
  'Fourniture et pose de matériel', 'Main d\'œuvre', 'Déplacement et frais de chantier',
  'Nettoyage fin de chantier', 'Dépose / évacuation gravats', 'Visite et diagnostic',
  'Salle de bain', 'Cuisine', 'Rénovation complète', 'Mise en conformité',
]

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

const inputCls = 'w-full h-11 rounded-xl border-2 border-gray-200 px-3 text-sm font-manrope outline-none focus:border-[#5ab4e0] focus:ring-2 focus:ring-[#5ab4e0]/20 transition-all bg-white placeholder:text-gray-400'

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
  const { data: pointsCollecteRaw } = usePointsCollecte()
  const clients = clientsRaw as unknown as ClientRecord[]
  const chantiers = chantiersRaw as unknown as ChantierRecord[]
  const pointsCollecte = pointsCollecteRaw as unknown as { id: string; nom: string; adresse?: string; type_installation?: string }[]

  // Client fields (free text)
  const [clientCivilite, setClientCivilite] = useState('')
  const [clientNom, setClientNom] = useState('')
  const [clientPrenom, setClientPrenom] = useState('')
  const [clientAdresse, setClientAdresse] = useState('')
  const [clientTelephone, setClientTelephone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientCodePostal, setClientCodePostal] = useState('')
  const [clientVille, setClientVille] = useState('')
  const [clientSuggestions, setClientSuggestions] = useState<ClientRecord[]>([])
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)

  // Chantier (free text + autocomplete)
  const [chantierDesc, setChantierDesc] = useState('')
  const [chantierSuggestions, setChantierSuggestions] = useState<string[]>([])
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

  // Gestion des déchets (loi AGEC — 4 mentions obligatoires)
  const [dechetsNature, setDechetsNature] = useState('Déchets non dangereux (câbles, emballages)')
  const [dechetsQuantite, setDechetsQuantite] = useState('')
  const [dechetsResponsable, setDechetsResponsable] = useState('L\'entreprise')
  const [dechetsTri, setDechetsTri] = useState('Tri sur le chantier')
  const [dechetsCollecteNom, setDechetsCollecteNom] = useState('')
  const [dechetsCollecteAdresse, setDechetsCollecteAdresse] = useState('')
  const [dechetsCollecteType, setDechetsCollecteType] = useState('Déchetterie')
  const [dechetsCout, setDechetsCout] = useState('')
  const [dechetsInclureCout, setDechetsInclureCout] = useState(false)
  const [dechetteriesProches, setDechetteriesProches] = useState<{nom:string;adresse:string;code_postal:string;commune:string;distance_km:number;accepte_pro:string;accepte_construction:boolean;accepte_deee:boolean}[]>([])
  const [loadingDechetteries, setLoadingDechetteries] = useState(false)

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

  // --- Chargement des déchetteries proches (API ADEME) ---
  useEffect(() => {
    if (!entreprise) return
    const cp = (entreprise as Record<string, unknown>).code_postal as string
    if (!cp) return
    setLoadingDechetteries(true)
    fetch(`/api/dechetteries?cp=${encodeURIComponent(cp)}`)
      .then(r => r.json())
      .then(data => {
        if (data.dechetteries) setDechetteriesProches(data.dechetteries)
      })
      .catch(() => { /* ignore — on retombe sur la saisie manuelle */ })
      .finally(() => setLoadingDechetteries(false))
  }, [entreprise])

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
  const dechetsCoutNum = dechetsCout ? parseFloat(dechetsCout) : 0
  const totalTTC = totalHT + totalTVA + (dechetsInclureCout ? dechetsCoutNum : 0)
  const acomptePct = (() => {
    if (selectedPayments.has('p30')) return 30
    if (selectedPayments.has('p50')) return 50
    if (selectedPayments.has('acompte') && acomptePercent) return parseFloat(acomptePercent)
    return 0
  })()
  const acompteMontant = acomptePct > 0 ? totalTTC * (acomptePct / 100) : 0
  const resteAPayer = totalTTC - acompteMontant

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
    const statutMap = { brouillon: 'brouillon', enregistrer: 'envoye', envoyer: 'envoye' } as const
    const statut = statutMap[action]

    // Generate devis number: D-YYYY-NNNNN
    const now = new Date()
    const numero = `D-${now.getFullYear()}-${String(Date.now()).slice(-5)}`

    try {
      const clientDisplay = `${clientCivilite ? clientCivilite + ' ' : ''}${clientPrenom ? clientPrenom + ' ' : ''}${clientNom || ''}`.trim()
      const devisData: Record<string, unknown> = {
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
        notes_client: `${clientDisplay}${clientAdresse ? ` | ${clientAdresse}` : ''}${clientCodePostal || clientVille ? ` | ${clientCodePostal} ${clientVille}`.trim() : ''}${clientTelephone ? ` | ${clientTelephone}` : ''}${clientEmail ? ` | ${clientEmail}` : ''}`.trim() || null,
        acompte_pourcent: acomptePct > 0 ? acomptePct : null,
        montant_ht: totalHT,
        montant_tva: totalTVA,
        montant_ttc: totalTTC,
        dechets_nature: dechetsNature || null,
        dechets_quantite: dechetsQuantite || null,
        dechets_responsable: dechetsResponsable || null,
        dechets_tri: dechetsTri || null,
        dechets_collecte_nom: dechetsCollecteNom || null,
        dechets_collecte_adresse: dechetsCollecteAdresse || null,
        dechets_collecte_type: dechetsCollecteType || null,
        dechets_cout: dechetsCout ? parseFloat(dechetsCout) : null,
        dechets_inclure_cout: dechetsInclureCout,
      }
      const devis = await insertRow('devis', devisData)
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
      // Sauvegarder/mettre à jour le client + chantier dans la base de données
      if (clientNom.trim() || chantierDesc.trim()) {
        try {
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            // Sauvegarder le client
            if (clientNom.trim()) {
              const { data: existing } = await supabase
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
              // Ajouter civilite seulement si la valeur est définie
              if (clientCivilite) clientData.civilite = clientCivilite
              if (!existing) {
                const { error: insertErr } = await supabase.from('clients').insert({ ...clientData, type: 'particulier', actif: true })
                if (insertErr) console.error('Erreur sauvegarde client:', insertErr.message)
              } else {
                const { error: updateErr } = await supabase.from('clients').update(clientData).eq('id', existing.id)
                if (updateErr) console.error('Erreur mise à jour client:', updateErr.message)
              }
            }
            // Sauvegarder le chantier/prestation (indépendamment du client)
            if (chantierDesc.trim()) {
              const { data: existingChantier } = await supabase
                .from('chantiers')
                .select('id')
                .eq('user_id', user.id)
                .ilike('nom', chantierDesc.trim())
                .maybeSingle()
              if (!existingChantier) {
                await supabase.from('chantiers').insert({ nom: chantierDesc.trim(), user_id: user.id })
              }
            }
            // Sauvegarder le point de collecte pour réutilisation future
            if (dechetsCollecteNom.trim()) {
              const { data: existingPoint } = await supabase
                .from('points_collecte')
                .select('id')
                .eq('user_id', user.id)
                .ilike('nom', dechetsCollecteNom.trim())
                .maybeSingle()
              if (!existingPoint) {
                await supabase.from('points_collecte').insert({
                  nom: dechetsCollecteNom.trim(),
                  adresse: dechetsCollecteAdresse || null,
                  type_installation: dechetsCollecteType || null,
                  user_id: user.id,
                })
              }
            }
          }
        } catch (err) { console.error('Erreur sauvegarde client/chantier:', err) }
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
  }, [clientCivilite, clientNom, clientPrenom, clientAdresse, clientCodePostal, clientVille, clientTelephone, clientEmail, dateDevis, dateValidite, dateTravaux, duree, chantierDesc, conditionsStr, notes, totalHT, totalTVA, totalTTC, effectiveTva, lines, router, acomptePct, dechetsNature, dechetsQuantite, dechetsResponsable, dechetsTri, dechetsCollecteNom, dechetsCollecteAdresse, dechetsCollecteType, dechetsCout, dechetsInclureCout])

  useEffect(() => {
    autosaveTimer.current = setInterval(() => { handleSave('brouillon') }, 60000)
    return () => { if (autosaveTimer.current) clearInterval(autosaveTimer.current) }
  }, [handleSave])

  // --- Voice result handler ---
  const handleVoiceResult = (data: Record<string, unknown>) => {
    if (data.client_civilite) setClientCivilite(data.client_civilite as string)
    if (data.client_nom) setClientNom(data.client_nom as string)
    if (data.client_prenom) setClientPrenom(data.client_prenom as string)
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

  // --- Client autocomplete ---
  const handleClientNomChange = (value: string) => {
    setClientNom(value)
    if (value.length >= 1 && clients && clients.length > 0) {
      const q = value.toLowerCase().trim()
      const filtered = clients.filter(c => {
        const nom = String(c.nom || '').toLowerCase()
        const prenom = String(c.prenom || '').toLowerCase()
        const civilite = String((c as unknown as Record<string,string>).civilite || '').toLowerCase()
        return nom.includes(q) || prenom.includes(q) || (prenom + ' ' + nom).includes(q) || civilite.includes(q)
      })
      setClientSuggestions(filtered.slice(0, 8))
      setClientDropdownOpen(filtered.length > 0)
    } else {
      setClientSuggestions([])
      setClientDropdownOpen(false)
    }
  }

  const selectClientSuggestion = (c: ClientRecord) => {
    setClientCivilite((c as unknown as Record<string,string>).civilite || '')
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

  // --- Chantier autocomplete (DB + liste intégrée) ---
  const handleChantierDescChange = (value: string) => {
    setChantierDesc(value)
    if (value.length >= 1) {
      const q = value.toLowerCase()
      // Résultats depuis la base de données
      const fromDB = chantiers
        .map(c => c.nom || '')
        .filter(nom => nom.toLowerCase().includes(q))
      // Résultats depuis la liste intégrée (non déjà dans DB)
      const fromDB_set = new Set(fromDB.map(n => n.toLowerCase()))
      const fromBuiltin = PRESTATIONS_INTEGREES.filter(p =>
        p.toLowerCase().includes(q) && !fromDB_set.has(p.toLowerCase())
      )
      // Fusionner : DB en premier, puis suggestions intégrées
      const merged = [...fromDB, ...fromBuiltin].slice(0, 10)
      setChantierSuggestions(merged)
      setChantierDropdownOpen(merged.length > 0)
    } else {
      setChantierSuggestions([])
      setChantierDropdownOpen(false)
    }
  }

  // --- Toggle payment chip ---
  const togglePayment = (id: string) => {
    setSelectedPayments(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        // p30 / p50 sont des conditions indépendantes, pas besoin d'activer acompte séparé
        if (id === 'p30') { setAcomptePercent('') }
        if (id === 'p50') { setAcomptePercent('') }
      }
      return next
    })
  }

  // ===================================================================
  // PREVIEW MODE
  // ===================================================================
  if (showPreview) {
    return (
      <div className="min-h-screen">
        <TopBar showPreview setShowPreview={setShowPreview} saving={saving} onDraft={() => handleSave('brouillon')} onFinish={() => handleSave('enregistrer')} />
        <div className="p-6 flex justify-center">
          <div className="max-w-[800px] w-full bg-white shadow-xl rounded-xl p-12">
            <div className="flex justify-between items-start mb-10">
              <div>
                {Boolean(entreprise?.logo_url) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entreprise?.logo_url as string} alt="Logo" className="h-16 w-auto object-contain mb-2" style={{ mixBlendMode: 'multiply', maxWidth: 160 }} />
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
              {(clientCodePostal || clientVille) && <p className="text-sm font-manrope text-[#6b7280]">{clientCodePostal} {clientVille}</p>}
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
      <TopBar showPreview={false} setShowPreview={setShowPreview} saving={saving} onDraft={() => handleSave('brouillon')} onFinish={() => handleSave('enregistrer')} />

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
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 shadow-sm space-y-3">
              <label className="block text-sm font-manrope font-semibold text-[#1a1a2e]">Client</label>

              {/* Ligne 1 : Civilité + Nom (pleine largeur) + autocomplete */}
              <div className="relative">
                <div className="flex gap-2">
                  <select value={clientCivilite} onChange={e => setClientCivilite(e.target.value)} className="w-24 h-11 shrink-0 rounded-xl border-2 border-gray-200 px-2 text-sm font-manrope outline-none focus:border-[#5ab4e0] bg-white">
                    <option value="">—</option>
                    <option value="M.">M.</option>
                    <option value="Mme">Mme</option>
                    <option value="Société">Société</option>
                  </select>
                  <input
                    type="text"
                    value={clientNom}
                    onChange={e => handleClientNomChange(e.target.value)}
                    onBlur={() => setTimeout(() => { setClientDropdownOpen(false); setClientSuggestions([]) }, 200)}
                    placeholder="Nom (tapez pour rechercher un client)"
                    className={inputCls}
                    autoComplete="off"
                  />
                </div>
                {/* Dropdown autocomplete — pleine largeur, au-dessus des autres champs */}
                {clientDropdownOpen && clientSuggestions.length > 0 && (
                  <div className="absolute left-0 top-full mt-1 bg-white rounded-xl border-2 border-[#5ab4e0] shadow-2xl z-50 w-full max-h-60 overflow-y-auto">
                    {clientSuggestions.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={e => { e.preventDefault(); selectClientSuggestion(c) }}
                        className="w-full text-left px-4 py-3 font-manrope hover:bg-[#eef7fc] border-b border-gray-100 last:border-0 transition-colors"
                      >
                        <span className="font-semibold text-[#1a1a2e] text-sm">
                          {c.prenom ? `${c.prenom} ${c.nom}` : c.nom}
                        </span>
                        {c.adresse && (
                          <span className="text-[#6b7280] text-xs block mt-0.5">
                            {c.adresse}{c.code_postal || c.ville ? ` · ${c.code_postal ?? ''} ${c.ville ?? ''}`.trim() : ''}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Ligne 2 : Prénom */}
              <input type="text" value={clientPrenom} onChange={e => setClientPrenom(e.target.value)} placeholder="Prénom" className={inputCls} />

              {/* Ligne 3 : Adresse */}
              <input type="text" value={clientAdresse} onChange={e => setClientAdresse(e.target.value)} placeholder="Adresse" className={inputCls} />

              {/* Ligne 4 : Code postal + Ville */}
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={clientCodePostal} onChange={e => setClientCodePostal(e.target.value)} placeholder="Code postal" className={inputCls} />
                <input type="text" value={clientVille} onChange={e => setClientVille(e.target.value)} placeholder="Ville" className={inputCls} />
              </div>

              {/* Ligne 5 : Téléphone + Email */}
              <div className="grid grid-cols-2 gap-2">
                <input type="tel" value={clientTelephone} onChange={e => setClientTelephone(e.target.value)} placeholder="Téléphone" className={inputCls} />
                <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="Email" className={inputCls} />
              </div>
            </div>

            {/* Chantier / Prestation avec autocomplete */}
            <div>
              <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Chantier / Prestation</label>
              <div className="relative">
                <input
                  type="text"
                  value={chantierDesc}
                  onChange={e => handleChantierDescChange(e.target.value)}
                  onBlur={() => setTimeout(() => setChantierDropdownOpen(false), 150)}
                  placeholder="Description de la prestation / chantier..."
                  className={inputCls}
                  autoComplete="off"
                />
                {chantierDropdownOpen && chantierSuggestions.length > 0 && (
                  <div className="absolute left-0 top-full mt-1 bg-white rounded-xl border-2 border-[#5ab4e0] shadow-2xl z-50 w-full max-h-56 overflow-y-auto">
                    {chantierSuggestions.map((nom, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={e => {
                          e.preventDefault()
                          setChantierDesc(nom)
                          setChantierSuggestions([])
                          setChantierDropdownOpen(false)
                        }}
                        className="w-full text-left px-4 py-3 text-sm font-manrope hover:bg-[#eef7fc] border-b border-gray-100 last:border-0 transition-colors text-[#1a1a2e] font-medium"
                      >
                        {nom}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
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
                      <select value={line.unit} onChange={e => updateLine(line.id, 'unit', e.target.value)} className="text-sm text-center border-0 outline-none bg-transparent mt-1.5 w-full">
                        {UNIT_SUGGESTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <input type="number" value={line.priceHT} onChange={e => updateLine(line.id, 'priceHT', Number(e.target.value))} className="text-sm text-right border-0 outline-none bg-transparent mt-1.5" min={0} step={0.01} />
                      <span className="text-sm font-semibold text-right mt-1.5">{line.priceHT > 0 ? formatCurrency(line.qty * line.priceHT) : '--'}</span>
                    </>
                  ) : <><span /><span /><span /><span /></>}
                  <button onClick={() => removeLine(line.id)} className="p-1 text-gray-300 hover:text-red-500 mt-1.5"><Trash2 size={14} /></button>
                </div>
              ))}
              {/* Units are now in select dropdowns */}
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

        {/* Déchets + Totaux — côte à côte */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
          {/* Gestion des déchets (loi AGEC) */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <label className="text-sm font-manrope font-medium text-[#1a1a2e]">Gestion des déchets</label>
              <span className="text-[9px] font-manrope text-[#e87a2a] border border-[#e87a2a]/40 px-1.5 py-0.5 rounded uppercase tracking-wide font-semibold">Loi AGEC</span>
            </div>
            {/* Nature + Quantité */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-manrope text-[#6b7280] mb-1">Nature des déchets</label>
                <select value={dechetsNature} onChange={e => setDechetsNature(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-manrope outline-none focus:border-[#5ab4e0]">
                  <option value="Déchets non dangereux (câbles, emballages)">Déchets non dangereux (câbles, emballages)</option>
                  <option value="Déchets d'équipements électriques (DEEE)">DEEE (équipements électriques)</option>
                  <option value="Déchets inertes (gravats, plâtre, béton)">Déchets inertes (gravats, plâtre)</option>
                  <option value="Mélange non dangereux">Mélange non dangereux</option>
                  <option value="Déchets dangereux (amiante, peintures)">Déchets dangereux (amiante, peintures)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-manrope text-[#6b7280] mb-1">Quantité estimée</label>
                <input type="text" value={dechetsQuantite} onChange={e => setDechetsQuantite(e.target.value)} placeholder="Ex : 0.5 tonne, 2 m³" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-manrope outline-none focus:border-[#5ab4e0]" />
              </div>
            </div>
            {/* Enlèvement + Tri + Coût */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-manrope text-[#6b7280] mb-1">Enlèvement par</label>
                <select value={dechetsResponsable} onChange={e => setDechetsResponsable(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-manrope outline-none focus:border-[#5ab4e0]">
                  <option value="L'entreprise">L&apos;entreprise</option>
                  <option value="Le client (maître d'ouvrage)">Le client</option>
                  <option value="Prestataire externe">Prestataire externe</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-manrope text-[#6b7280] mb-1">Tri</label>
                <select value={dechetsTri} onChange={e => setDechetsTri(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-manrope outline-none focus:border-[#5ab4e0]">
                  <option value="Tri sur le chantier">Tri sur le chantier</option>
                  <option value="Collecte séparée">Collecte séparée</option>
                  <option value="Évacuation en mélange">Évacuation en mélange</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-manrope text-[#6b7280] mb-1">Coût estimé TTC (€)</label>
                <input type="number" value={dechetsCout} onChange={e => setDechetsCout(e.target.value)} placeholder="0.00" min={0} step={0.01} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-manrope outline-none focus:border-[#5ab4e0]" />
                <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer">
                  <input type="checkbox" checked={dechetsInclureCout} onChange={e => setDechetsInclureCout(e.target.checked)} className="w-3.5 h-3.5 rounded border-gray-300 text-[#5ab4e0] focus:ring-[#5ab4e0]" />
                  <span className="text-[10px] font-manrope text-[#6b7280]">Inclure dans le total</span>
                </label>
              </div>
            </div>
            {/* Point de collecte */}
            <div>
              <label className="block text-[11px] font-manrope text-[#6b7280] mb-1">Point de collecte</label>
              {!dechetsCollecteNom && (pointsCollecte?.length > 0 || dechetteriesProches.length > 0) && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {pointsCollecte?.map(p => (
                    <button key={p.id} type="button" onClick={() => { setDechetsCollecteNom(p.nom); setDechetsCollecteAdresse(p.adresse || ''); setDechetsCollecteType(p.type_installation || 'Déchetterie') }}
                      className="px-2.5 py-1 rounded-full text-[11px] font-manrope bg-[#5ab4e0]/10 border border-[#5ab4e0]/30 text-[#5ab4e0] hover:bg-[#5ab4e0]/20 transition-colors font-medium">
                      ★ {p.nom}
                    </button>
                  ))}
                  {dechetteriesProches.slice(0, 5).map((d, i) => (
                    <button key={`api-${i}`} type="button" onClick={() => { setDechetsCollecteNom(d.nom); setDechetsCollecteAdresse(`${d.adresse}, ${d.code_postal} ${d.commune}`); setDechetsCollecteType('Déchetterie') }}
                      className="px-2.5 py-1 rounded-full text-[11px] font-manrope border border-gray-200 text-[#6b7280] hover:border-gray-400 transition-colors">
                      {d.nom} <span className="text-[#e87a2a]">({d.distance_km} km)</span>
                    </button>
                  ))}
                </div>
              )}
              {loadingDechetteries && !dechetsCollecteNom && <p className="text-[11px] font-manrope text-[#9ca3af] mb-2 animate-pulse">Recherche des déchetteries proches...</p>}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <input type="text" value={dechetsCollecteNom} onChange={e => setDechetsCollecteNom(e.target.value)} placeholder="Nom / raison sociale" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-manrope outline-none focus:border-[#5ab4e0]" />
                  {dechetsCollecteNom && (
                    <button type="button" onClick={() => { setDechetsCollecteNom(''); setDechetsCollecteAdresse(''); setDechetsCollecteType('') }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={14} /></button>
                  )}
                </div>
                <input type="text" value={dechetsCollecteAdresse} onChange={e => setDechetsCollecteAdresse(e.target.value)} placeholder="Adresse" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-manrope outline-none focus:border-[#5ab4e0]" />
                <select value={dechetsCollecteType} onChange={e => setDechetsCollecteType(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-manrope outline-none focus:border-[#5ab4e0]">
                  <option value="Déchetterie">Déchetterie</option>
                  <option value="Centre de tri">Centre de tri</option>
                  <option value="Plateforme de recyclage">Plateforme de recyclage</option>
                  <option value="Collecteur agréé">Collecteur agréé</option>
                </select>
              </div>
            </div>
          </div>

          {/* Totaux */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex justify-between py-2 text-sm font-manrope"><span className="text-[#6b7280]">Total HT</span><span className="font-medium">{formatCurrency(totalHT)}</span></div>
            {showTvaOnDevis && !autoEntrepreneur && Object.entries(tvaGroups).filter(([r]) => Number(r) > 0).sort(([a], [b]) => Number(a) - Number(b)).map(([rate, group]) => (
              <div key={rate} className="flex justify-between py-2 text-sm font-manrope"><span className="text-[#6b7280]">TVA {rate}%</span><span className="font-medium">{formatCurrency(group.tva)}</span></div>
            ))}
            {dechetsInclureCout && dechetsCoutNum > 0 && (
              <div className="flex justify-between py-2 text-sm font-manrope"><span className="text-[#e87a2a]">Gestion déchets TTC</span><span className="font-medium text-[#e87a2a]">{formatCurrency(dechetsCoutNum)}</span></div>
            )}
            <div className="border-t mt-2 pt-2 flex justify-between py-2"><span className="text-[#6b7280]">{showTvaOnDevis && !autoEntrepreneur ? 'Total TTC' : 'Total'}</span><span className="font-semibold">{formatCurrency(showTvaOnDevis ? totalTTC : totalHT)}</span></div>
            {autoEntrepreneur && <p className="text-xs text-[#6b7280] italic mt-1">TVA non applicable, art. 293 B du CGI</p>}
            {acompteMontant > 0 && (
              <>
                <div className="flex justify-between py-1.5 text-sm font-manrope border-t mt-1 pt-2">
                  <span className="text-[#5ab4e0] font-medium">Acompte à verser ({acomptePct}%)</span>
                  <span className="text-[#5ab4e0] font-semibold">{formatCurrency(acompteMontant)}</span>
                </div>
                <div className="flex justify-between py-1.5 text-sm font-manrope">
                  <span className="text-[#6b7280]">Reste à facturer</span>
                  <span className="font-semibold text-[#1a1a2e]">{formatCurrency(resteAPayer)}</span>
                </div>
              </>
            )}
            <div className="bg-[#5ab4e0] text-white rounded-lg p-3 mt-3 flex justify-between items-center">
              <span className="font-syne font-bold text-sm">NET À PAYER</span><span className="font-syne font-bold text-lg">{formatCurrency(showTvaOnDevis ? totalTTC : totalHT)}</span>
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
            <div
              onClick={() => togglePayment('acompte')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-manrope border transition-colors cursor-pointer select-none ${selectedPayments.has('acompte') ? 'bg-[#5ab4e0]/10 border-[#5ab4e0] text-[#5ab4e0] font-medium' : 'border-gray-200 text-[#6b7280] hover:border-gray-400'}`}>
              <span className="shrink-0">{selectedPayments.has('acompte') ? '✓' : '☐'}</span>
              <span className="shrink-0">Acompte de</span>
              <input
                type="number"
                value={acomptePercent}
                onChange={e => { e.stopPropagation(); setAcomptePercent(e.target.value); if (!selectedPayments.has('acompte')) togglePayment('acompte') }}
                onClick={e => e.stopPropagation()}
                onFocus={e => e.stopPropagation()}
                className="w-12 text-center bg-transparent outline-none border-b border-current cursor-text"
                placeholder="..."
                min={0} max={100} step={1}
              />
              <span className="shrink-0">%</span>
            </div>
          </div>
          <div><label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Conditions personnalisées (optionnel)</label><textarea value={conditionsLibres} onChange={e => setConditionsLibres(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-manrope outline-none focus:border-[#5ab4e0] resize-none" /></div>
          <div><label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Notes internes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notes visibles uniquement par vous" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-manrope outline-none focus:border-[#5ab4e0] resize-none" /></div>
        </div>


        {/* Bottom buttons */}
        <div className="flex flex-wrap items-center gap-3 justify-end pb-8">
          <button onClick={() => handleSave('brouillon')} disabled={saving}
            className="h-12 px-6 rounded-xl border-2 border-gray-300 text-sm font-syne font-semibold text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-all flex items-center gap-2 disabled:opacity-50">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Brouillon
          </button>
          <button onClick={() => handleSave('enregistrer')} disabled={saving}
            className="h-12 px-8 rounded-xl bg-emerald-600 text-white font-syne font-bold text-sm hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Enregistrer
          </button>
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

function TopBar({ showPreview, setShowPreview, saving, onDraft, onFinish }: {
  showPreview: boolean; setShowPreview: (v: boolean) => void; saving: boolean; onDraft: () => void; onFinish: () => void
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
        <button onClick={onDraft} disabled={saving}
          className="h-9 px-4 rounded-xl border-2 border-gray-300 text-sm font-syne font-semibold text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-all flex items-center gap-2 disabled:opacity-50">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Brouillon
        </button>
        <button onClick={onFinish} disabled={saving}
          className="h-9 px-4 rounded-xl bg-emerald-600 text-white font-syne font-bold text-sm hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Enregistrer
        </button>
      </div>
    </div>
  )
}
