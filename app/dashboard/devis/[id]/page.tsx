'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ChevronDown,
  Pencil,
  SendHorizonal,
  Download,
  FileText,
  Trash2,
} from 'lucide-react'
import EnvoyerDevisModal from '@/components/dashboard/EnvoyerDevisModal'
import {
  useSupabaseRecord,
  useDevisLignes,
  useEntreprise,
  insertRow,
  deleteRow,
  LoadingSkeleton,
} from '@/lib/hooks'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface DevisRecord {
  id: string
  numero: string
  statut: string
  client_id: string
  chantier_id?: string
  date_emission?: string
  date_validite?: string
  date_debut_travaux?: string
  duree_estimee?: string
  conditions_paiement?: string
  acompte_pourcent?: number
  objet?: string
  description?: string
  notes_client?: string
  created_at: string
  updated_at?: string
}

interface ClientRecord {
  id: string
  nom: string
  prenom?: string
  adresse?: string
  code_postal?: string
  ville?: string
  telephone?: string
  email?: string
  client_type?: string
}

interface LigneRecord {
  id: string
  designation: string
  quantite: number
  unite: string
  prix_unitaire_ht: number
  taux_tva: number
  ordre: number
}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function formatCurrency(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function formatDate(d: string | undefined): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR')
}

const STATUT_STYLES: Record<string, string> = {
  'Brouillon': 'bg-gray-100 text-gray-600',
  'brouillon': 'bg-gray-100 text-gray-600',
  'Envoyé': 'bg-blue-50 text-blue-700',
  'envoye': 'bg-blue-50 text-blue-700',
  'Accepté': 'bg-green-50 text-green-700',
  'signe': 'bg-green-50 text-green-700',
  'Refusé': 'bg-red-50 text-red-700',
  'refuse': 'bg-red-50 text-red-700',
}

// -------------------------------------------------------------------
// Print styles
// -------------------------------------------------------------------

const printStyles = `@media print {
  nav, header, aside, .no-print, [class*="lg:w-80"] { display: none !important; }
  body { background: white !important; }
  .print-zone { box-shadow: none !important; border: none !important; }
  .min-h-screen { min-height: auto !important; }
}`

// -------------------------------------------------------------------
// Page
// -------------------------------------------------------------------

export default function DevisDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: devis, loading: loadingDevis } = useSupabaseRecord<DevisRecord>('devis', id)
  const { data: lignesRaw, loading: loadingLignes } = useDevisLignes(id)
  const { data: client, loading: loadingClient } = useSupabaseRecord<ClientRecord>('clients', devis?.client_id ?? null)

  const { entreprise } = useEntreprise()
  const [actionsOpen, setActionsOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [sendModalOpen, setSendModalOpen] = useState(false)

  async function handleConvertToFacture() {
    if (!devis) return
    if (!confirm('Convertir ce devis en facture ?')) return
    try {
      const now = new Date()
      const numero = `F-${now.getFullYear()}-${String(Date.now()).slice(-5)}`
      const facture = await insertRow('factures', {
        client_id: devis.client_id || null,
        devis_id: devis.id,
        numero,
        statut: 'brouillon',
        montant_ht: totalHT,
        montant_tva: totalTVA,
        montant_ttc: totalTTC,
        notes: devis.conditions_paiement || null,
        objet: devis.objet || devis.description || null,
        notes_client: devis.notes_client || null,
        client_nom: client?.nom || null,
        client_adresse: client?.adresse || null,
      })
      const factureId = (facture as Record<string,unknown>).id as string
      if (!factureId) throw new Error('ID facture manquant')
      for (const l of lignes) {
        await insertRow('facture_lignes', {
          facture_id: factureId,
          designation: l.designation,
          quantite: l.quantite,
          unite: l.unite,
          prix_unitaire_ht: l.prix_unitaire_ht,
          taux_tva: l.taux_tva || 10,
          ordre: l.ordre,
        })
      }
      router.push(`/dashboard/factures/${factureId}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err)
      alert('Erreur conversion : ' + msg)
    }
  }

  async function handleDeleteDevis() {
    if (!devis || !confirm('Supprimer ce devis ? Cette action est irréversible.')) return
    try {
      await deleteRow('devis', devis.id)
      router.push('/dashboard/devis')
    } catch (err) {
      alert('Erreur : ' + (err instanceof Error ? err.message : 'Échec'))
    }
  }

  const loading = loadingDevis || loadingLignes || loadingClient

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="p-6"><LoadingSkeleton rows={8} /></div>
      </div>
    )
  }

  const lignes = (lignesRaw ?? []) as unknown as LigneRecord[]

  if (!devis) {
    return (
      <div className="min-h-screen p-6">
        <Link href="/dashboard/devis" className="p-1.5 rounded-md hover:bg-gray-100 transition-colors inline-flex items-center gap-2 text-sm text-gray-500">
          <ArrowLeft size={18} /> Retour
        </Link>
        <p className="text-sm font-manrope text-gray-500 mt-4">Devis introuvable.</p>
      </div>
    )
  }

  // Computations
  const tvaGroups: Record<number, { ht: number; tva: number }> = {}
  let totalHT = 0
  lignes.forEach((l) => {
    const lineTotal = (l.quantite ?? 0) * (l.prix_unitaire_ht ?? 0)
    totalHT += lineTotal
    const rate = l.taux_tva ?? 10
    if (!tvaGroups[rate]) tvaGroups[rate] = { ht: 0, tva: 0 }
    tvaGroups[rate].ht += lineTotal
    tvaGroups[rate].tva += lineTotal * (rate / 100)
  })
  const totalTVA = Object.values(tvaGroups).reduce((s, g) => s + g.tva, 0)
  const totalTTC = totalHT + totalTVA
  const statutStyle = STATUT_STYLES[devis.statut] ?? 'bg-gray-100 text-gray-600'
  const clientNom = client?.nom ?? devis.notes_client?.split(' | ')[0] ?? 'Non renseigné'

  return (
    <div className="min-h-screen">
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 no-print">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/devis" className="p-1.5 rounded-md hover:bg-gray-100 transition-colors">
            <ArrowLeft size={18} className="text-[#6b7280]" />
          </Link>
          <h1 className="font-syne font-bold text-xl text-[#1a1a2e]">Devis {devis.numero}</h1>
          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-manrope font-medium ${statutStyle}`}>
            {devis.statut}
          </span>
        </div>

        <div className="flex items-center gap-2 relative">
          <button onClick={() => {
            const nomClient = client?.nom || devis.notes_client?.split(' | ')[0] || 'client'
            const originalTitle = document.title
            document.title = `Devis - ${nomClient}`
            window.print()
            setTimeout(() => { document.title = originalTitle }, 1500)
          }} className="flex items-center gap-2 px-4 py-2 text-sm font-manrope bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[#1a1a2e]">
            <Download size={14} /> Télécharger PDF
          </button>
          <button
            onClick={() => setActionsOpen(!actionsOpen)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-syne font-bold bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[#1a1a2e]"
          >
            Actions <ChevronDown size={14} />
          </button>
          {actionsOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20">
              {[
                { label: 'Modifier', icon: Pencil, action: () => router.push(`/dashboard/devis/${id}/modifier`), danger: false },
                { label: 'Convertir en facture', icon: FileText, action: handleConvertToFacture, danger: false },
                { label: 'Envoyer par email', icon: SendHorizonal, action: () => setSendModalOpen(true), danger: false },
                { label: 'Supprimer', icon: Trash2, action: handleDeleteDevis, danger: true },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => { action.action(); setActionsOpen(false) }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-manrope hover:bg-gray-50 transition-colors ${action.danger ? 'text-red-600' : 'text-[#1a1a2e]'}`}
                >
                  <action.icon size={14} className="text-[#6b7280]" />
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main -- preview card */}
        <div className="flex-1 min-w-0">
          <div className="bg-white shadow-xl rounded-xl p-8 lg:p-12 print-zone">

            {/* HEADER : titre DEVIS + numéro */}
            <div style={{textAlign:'center', marginBottom:14}}>
              <div style={{fontSize:36, fontWeight:900, color:'#2563eb', letterSpacing:3, textTransform:'uppercase'}}>DEVIS</div>
              <div style={{fontSize:14, color:'#374151', marginTop:4}}>N° <strong>{devis.numero}</strong></div>
            </div>

            {/* Ligne dégradé */}
            <div style={{height:3, background:'linear-gradient(90deg,#2563eb,#93c5fd)', borderRadius:2, marginBottom:14}} />

            {/* Dates — sous le trait bleu, au-dessus des cadres */}
            <div style={{display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'20px', marginBottom:20, padding:'10px 0'}}>
              <span style={{fontSize:15, color:'#374151'}}>Date : <strong style={{color:'#1a1a2e'}}>{formatDate(devis.date_emission || devis.created_at)}</strong></span>
              {devis.date_validite && <span style={{fontSize:15, color:'#374151'}}>Valide jusqu&apos;au : <strong style={{color:'#1a1a2e'}}>{formatDate(devis.date_validite)}</strong></span>}
              {devis.date_debut_travaux && <span style={{fontSize:15, color:'#374151'}}>Début travaux : <strong style={{color:'#1a1a2e'}}>{formatDate(devis.date_debut_travaux)}</strong></span>}
              {devis.duree_estimee && <span style={{fontSize:15, color:'#374151'}}>Durée : <strong style={{color:'#1a1a2e'}}>{devis.duree_estimee}</strong></span>}
            </div>

            {/* 2 CADRES : artisan gauche, client droite — bordures complètes colorées */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:18, alignItems:'stretch'}}>
              {/* Cadre artisan — bordure bleue complète */}
              <div style={{border:'2px solid #2563eb', borderRadius:10, padding:16, display:'flex', flexDirection:'column'}}>
                <div style={{fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'#2563eb', marginBottom:10}}>Artisan</div>
                <div style={{fontSize:16, fontWeight:700, color:'#111', marginBottom:6}}>{(entreprise?.nom as string) || 'Mon Entreprise'}</div>
                <div style={{fontSize:14, color:'#6b7280', lineHeight:2}}>
                  {Boolean(entreprise?.adresse) && <div>{entreprise?.adresse as string}</div>}
                  {Boolean(entreprise?.code_postal || entreprise?.ville) && <div>{entreprise?.code_postal as string} {entreprise?.ville as string}</div>}
                  {Boolean(entreprise?.siret) && <div>SIRET : {entreprise?.siret as string}</div>}
                  {Boolean(entreprise?.telephone) && <div>Tél : {entreprise?.telephone as string}</div>}
                </div>
              </div>
              {/* Cadre client — bordure verte complète */}
              <div style={{border:'2px solid #10b981', borderRadius:10, padding:16, display:'flex', flexDirection:'column'}}>
                <div style={{fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'#10b981', marginBottom:10}}>Client</div>
                <div style={{lineHeight:2}}>
                  {devis.notes_client ? (() => {
                    const parts = devis.notes_client.split(' | ')
                    return parts.map((info: string, i: number) => (
                      <div key={i} style={{fontWeight: i === 0 ? 700 : 400, color: i === 0 ? '#111' : '#6b7280', fontSize: i === 0 ? 16 : 14}}>
                        {info}
                      </div>
                    ))
                  })() : (
                    <>
                      <div style={{fontWeight:700, color:'#111', fontSize:16}}>{client?.prenom ? `${client.prenom} ${client.nom}` : (client?.nom ?? 'Non renseigné')}</div>
                      {client?.adresse && <div style={{color:'#6b7280', fontSize:14}}>{client.adresse}</div>}
                      {(client?.code_postal || client?.ville) && (
                        <div style={{color:'#6b7280', fontSize:14}}>{client?.code_postal ?? ''} {client?.ville ?? ''}</div>
                      )}
                      {client?.telephone && <div style={{color:'#6b7280', fontSize:14}}>{client.telephone}</div>}
                      {client?.email && <div style={{color:'#6b7280', fontSize:14}}>{client.email}</div>}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ═══ OBJET ═══ */}
            {devis.objet && (
              <div className="mb-4 p-3 bg-[#eff6ff] rounded-lg border-l-[3px] border-[#2563eb]">
                <span className="text-xs font-manrope font-bold text-[#2563eb] uppercase tracking-wider">Objet : </span>
                <span className="text-sm font-manrope text-[#374151]">{devis.objet}</span>
              </div>
            )}

            {/* ═══ TABLEAU (sans colonne TVA) ═══ */}
            {lignes.length > 0 && (
              <table className="w-full mb-8">
                <thead>
                  <tr className="bg-[#2563eb] text-white">
                    <th className="px-3 py-2.5 text-left text-xs font-manrope font-semibold uppercase w-10">N°</th>
                    <th className="px-3 py-2.5 text-left text-xs font-manrope font-semibold uppercase">Désignation</th>
                    <th className="px-3 py-2.5 text-center text-xs font-manrope font-semibold uppercase w-16">Qté</th>
                    <th className="px-3 py-2.5 text-center text-xs font-manrope font-semibold uppercase w-16">Unité</th>
                    <th className="px-3 py-2.5 text-right text-xs font-manrope font-semibold uppercase w-24">Prix U. HT</th>
                    <th className="px-3 py-2.5 text-right text-xs font-manrope font-semibold uppercase w-24">Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((l, i) => (
                    <tr key={l.id ?? i} className={i % 2 === 1 ? 'bg-[#f8faff]' : ''}>
                      <td className="px-3 py-2.5 text-sm font-manrope text-[#6b7280]">{i + 1}</td>
                      <td className="px-3 py-2.5 text-sm font-manrope text-[#1a1a2e]">{l.designation}</td>
                      <td className="px-3 py-2.5 text-sm font-manrope text-center text-[#1a1a2e]">{l.quantite}</td>
                      <td className="px-3 py-2.5 text-sm font-manrope text-center text-[#6b7280]">{l.unite}</td>
                      <td className="px-3 py-2.5 text-sm font-manrope text-right text-[#1a1a2e]">{formatCurrency(l.prix_unitaire_ht)}</td>
                      <td className="px-3 py-2.5 text-sm font-manrope text-right font-semibold text-[#1a1a2e]">{formatCurrency(l.quantite * l.prix_unitaire_ht)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* ═══ BAS DE PAGE : 2 colonnes ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Gauche : conditions */}
              <div>
                {devis.conditions_paiement && (
                  <div>
                    <h4 className="font-manrope font-semibold text-sm text-[#1a1a2e] mb-2">Conditions de paiement</h4>
                    <p className="text-sm font-manrope text-[#6b7280] leading-relaxed">{devis.conditions_paiement}</p>
                  </div>
                )}
              </div>
              {/* Droite : totaux */}
              <div>
                <div className="flex justify-between py-2 text-sm font-manrope">
                  <span className="text-[#6b7280]">Total HT</span>
                  <span className="text-[#1a1a2e] font-medium">{formatCurrency(totalHT)}</span>
                </div>
                {Object.entries(tvaGroups)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([rate, group]) => (
                    <div key={rate} className="flex justify-between py-1.5 text-sm font-manrope">
                      <span className="text-[#6b7280]">TVA {rate}%</span>
                      <span className="text-[#1a1a2e] font-medium">{formatCurrency(group.tva)}</span>
                    </div>
                  ))}
                <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between py-2 text-sm font-manrope">
                  <span className="text-[#1a1a2e] font-bold">Total TTC</span>
                  <span className="text-[#1a1a2e] font-bold">{formatCurrency(totalTTC)}</span>
                </div>
                {devis.acompte_pourcent && devis.acompte_pourcent > 0 && (() => {
                  const acompteMnt = totalTTC * (devis.acompte_pourcent / 100)
                  return (
                    <>
                      <div className="flex justify-between py-1.5 text-sm font-manrope border-t mt-1 pt-2">
                        <span className="text-[#2563eb] font-medium">Acompte à verser ({devis.acompte_pourcent}%)</span>
                        <span className="text-[#2563eb] font-semibold">{formatCurrency(acompteMnt)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 text-sm font-manrope">
                        <span className="text-[#6b7280]">Reste à facturer</span>
                        <span className="font-semibold">{formatCurrency(totalTTC - acompteMnt)}</span>
                      </div>
                    </>
                  )
                })()}
                <div className="bg-[#2563eb] text-white rounded-lg p-3 mt-3 flex justify-between items-center">
                  <span className="font-syne font-bold text-sm">NET À PAYER</span>
                  <span className="font-syne font-bold text-lg">{formatCurrency(totalTTC)}</span>
                </div>
              </div>
            </div>

            {/* ═══ SIGNATURES ═══ */}
            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="border border-dashed border-gray-300 rounded-lg p-4" style={{ minHeight: 80 }}>
                <div className="text-[10px] font-bold tracking-widest uppercase text-[#9ca3af] mb-2">Signature artisan</div>
                {Boolean(entreprise?.signature_base64) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entreprise?.signature_base64 as string} alt="Signature" style={{ height: 48, objectFit: 'contain' }} />
                )}
              </div>
              <div className="border border-dashed border-gray-300 rounded-lg p-4" style={{ minHeight: 80 }}>
                <div className="text-[10px] font-bold tracking-widest uppercase text-[#9ca3af] mb-2">Bon pour accord — Signature client</div>
                <div className="mt-10 border-t border-gray-200 pt-1 text-[11px] text-[#9ca3af]">...... / ...... / ..........</div>
              </div>
            </div>

            {/* ═══ FOOTER LÉGAL ═══ */}
            <div style={{ marginTop: 16, paddingTop: 10, borderTop: '0.5px solid #e5e7eb', fontSize: 9.5, color: '#9ca3af', textAlign: 'center', lineHeight: 1.7 }}>
              {entreprise?.nom as string} — {entreprise?.adresse as string}, {entreprise?.code_postal as string} {entreprise?.ville as string}
              {Boolean(entreprise?.siret) && ` — SIRET : ${entreprise?.siret as string}`}
              {Boolean(entreprise?.email) && ` — Email : ${entreprise?.email as string}`}
              <br /><span style={{ color: '#d1d5db' }}>Généré via Nexartis — nexartis.fr</span>
            </div>

          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-6 lg:sticky lg:top-24 lg:self-start no-print">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-manrope text-[#6b7280]">Statut</span>
              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-manrope font-medium ${statutStyle}`}>{devis.statut}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-manrope text-[#6b7280]">Client</span>
              <span className="text-sm font-manrope font-medium text-[#1a1a2e]">{clientNom}</span>
            </div>
            <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
              <span className="text-sm font-manrope text-[#6b7280]">Créé le</span>
              <span className="text-sm font-manrope text-[#1a1a2e]">{formatDate(devis.created_at)}</span>
            </div>
            <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
              <span className="text-sm font-manrope text-[#6b7280]">Total TTC</span>
              <span className="text-lg font-syne font-bold text-[#1a1a2e]">{formatCurrency(totalTTC)}</span>
            </div>
          </div>
        </div>
      </div>

      {toastMsg && <div className="fixed bottom-6 right-6 bg-[#1a1a2e] text-white px-4 py-2 rounded-lg shadow-lg text-sm font-manrope z-50">{toastMsg}</div>}

      {devis && (
        <EnvoyerDevisModal
          open={sendModalOpen}
          onClose={() => setSendModalOpen(false)}
          devisId={devis.id}
          numeroDevis={devis.numero}
          clientEmail={client?.email ?? (devis.notes_client?.split(' | ').find((s: string) => s.includes('@')) ?? '')}
          chantier={devis.objet || devis.description || ''}
          onSuccess={() => { setToastMsg('Email envoyé avec succès !'); setTimeout(() => setToastMsg(null), 3000) }}
        />
      )}
    </div>
  )
}
