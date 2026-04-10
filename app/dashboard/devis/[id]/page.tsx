'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
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
  updateRow,
  softDeleteRow,
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
  dechets_nature?: string
  dechets_quantite?: string
  dechets_responsable?: string
  dechets_tri?: string
  dechets_collecte_nom?: string
  dechets_collecte_adresse?: string
  dechets_collecte_type?: string
  dechets_cout?: number
  dechets_inclure_cout?: boolean
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

const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  signe: 'Accepté',
  refuse: 'Refusé',
  expire: 'Expiré',
  facture: 'Facturé',
  finalise: 'Envoyé',
}

const STATUT_STYLES: Record<string, string> = {
  brouillon: 'bg-gray-100 text-gray-600',
  envoye: 'bg-blue-50 text-blue-700',
  signe: 'bg-green-50 text-green-700',
  refuse: 'bg-red-50 text-red-700',
  expire: 'bg-orange-50 text-orange-700',
  facture: 'bg-purple-50 text-purple-700',
  finalise: 'bg-blue-50 text-blue-700',
}

// -------------------------------------------------------------------
// Print styles
// -------------------------------------------------------------------

const printStyles = `
@page { margin: 7mm 9mm; size: A4 portrait; }
@media print {
  nav, header, aside, .no-print, [class*="lg:w-80"],
  [class*="no-print"], button, a[href] { display: none !important; }
  body { background: white !important; margin: 0 !important; padding: 0 !important; }
  html, body { height: auto !important; overflow: visible !important; }
  .min-h-screen { min-height: 0 !important; height: auto !important; }
  .print-zone {
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    width: 100% !important;
  }
  .flex-col, .lg\\:flex-row { flex-direction: column !important; }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; page-break-after: auto; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  .grid { display: block !important; }
  .grid-cols-2, .grid-cols-1 { display: grid !important; grid-template-columns: 1fr 1fr !important; }
  p, div { orphans: 3; widows: 3; }

  /* ── Compactage titre ── */
  .print-header-block { margin-bottom: 6px !important; }
  .print-devis-title { font-size: 24px !important; letter-spacing: 2px !important; }

  /* ── Compactage dates ── */
  .print-dates { margin-bottom: 8px !important; padding: 4px 0 !important; gap: 12px !important; font-size: 12px !important; }
  .print-dates span { font-size: 12px !important; }

  /* ── Compactage cadres artisan/client ── */
  .print-info-box { padding: 8px !important; }
  .print-info-box > div:first-child { margin-bottom: 4px !important; font-size: 9px !important; }
  .print-info-box > div:nth-child(2) { font-size: 13px !important; margin-bottom: 2px !important; }
  .print-info-lines { line-height: 1.45 !important; font-size: 11.5px !important; }
  .print-info-lines div { font-size: 11.5px !important; line-height: 1.45 !important; }

  /* ── Compactage objet ── */
  .print-zone .mb-4.p-3 { margin-bottom: 6px !important; padding: 5px 8px !important; }

  /* ── Compactage tableau ── */
  .print-table { margin-bottom: 6px !important; }
  .print-table th, .print-table td { padding-top: 3px !important; padding-bottom: 3px !important; padding-left: 6px !important; padding-right: 6px !important; font-size: 11px !important; line-height: 1.3 !important; }
  .print-table thead tr th { padding-top: 4px !important; padding-bottom: 4px !important; font-size: 9.5px !important; }

  /* ── Compactage bas de page ── */
  .print-bottom { gap: 8px !important; margin-bottom: 4px !important; }
  .print-bottom .py-2 { padding-top: 4px !important; padding-bottom: 4px !important; }
  .print-bottom .py-1\\.5 { padding-top: 3px !important; padding-bottom: 3px !important; }
  .print-bottom .mt-2 { margin-top: 4px !important; }
  .print-bottom .mt-3 { margin-top: 6px !important; }
  .print-bottom .pt-2 { padding-top: 4px !important; }
  .print-bottom h4 { font-size: 11px !important; margin-bottom: 2px !important; }
  .print-bottom p { font-size: 11px !important; line-height: 1.4 !important; }
  .print-bottom span { font-size: 11px !important; }
  .print-bottom .text-lg { font-size: 13px !important; }
  .print-bottom .p-3 { padding: 5px 8px !important; }

  /* ── Compactage signatures ── */
  .print-sigs { margin-top: 6px !important; gap: 8px !important; }
  .print-sig-box { min-height: 52px !important; padding: 6px !important; }
  .print-sig-box .mt-8 { margin-top: 12px !important; }
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

  const loading = loadingDevis || loadingLignes || loadingClient

  const searchParams = useSearchParams()
  const { entreprise } = useEntreprise()
  const [actionsOpen, setActionsOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [convertTriggered, setConvertTriggered] = useState(false)
  const [relanceTriggered, setRelanceTriggered] = useState(false)

  // Auto-ouvrir modal envoi si ?relance=1 (depuis widget "À faire")
  useEffect(() => {
    if (searchParams.get('relance') === '1' && !loading && devis && !relanceTriggered) {
      setRelanceTriggered(true)
      setSendModalOpen(true)
    }
  }, [searchParams, loading, devis, relanceTriggered])

  // Auto-conversion quand ?convert=1 est dans l'URL (depuis la liste devis)
  useEffect(() => {
    if (searchParams.get('convert') === '1' && devis && !loading && !convertTriggered) {
      setConvertTriggered(true)
      handleConvertToFacture(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devis, loading, searchParams, convertTriggered])

  async function handleConvertToFacture(skipConfirm = false) {
    if (!devis) return
    if (!skipConfirm && !confirm('Convertir ce devis en facture ?')) return
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
      // Marquer le devis comme "Facturé"
      await updateRow('devis', devis.id, { statut: 'facture' })
      router.push(`/dashboard/factures/${factureId}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err)
      alert('Erreur conversion : ' + msg)
    }
  }

  async function handleChangeStatut(newStatut: string) {
    if (!devis) return
    try {
      await updateRow('devis', devis.id, { statut: newStatut })
      setToastMsg(`Statut mis à jour : ${STATUT_LABELS[newStatut] ?? newStatut}`)
      setTimeout(() => setToastMsg(null), 3000)
      // Recharger la page pour mettre à jour l'affichage
      window.location.reload()
    } catch (err) {
      alert('Erreur : ' + (err instanceof Error ? err.message : 'Échec'))
    }
  }

  async function handleDeleteDevis() {
    if (!devis || !confirm('Envoyer ce devis à la corbeille ?')) return
    try {
      await softDeleteRow('devis', devis.id)
      router.push('/dashboard/devis')
    } catch (err) {
      alert('Erreur : ' + (err instanceof Error ? err.message : 'Échec'))
    }
  }

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
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 no-print">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/devis" className="p-1.5 rounded-md hover:bg-gray-100 transition-colors">
            <ArrowLeft size={18} className="text-[#6b7280]" />
          </Link>
          <h1 className="font-syne font-bold text-xl text-[#1a1a2e]">Devis {devis.numero}</h1>
          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-manrope font-medium ${statutStyle}`}>
            {STATUT_LABELS[devis.statut] ?? devis.statut}
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
          <button onClick={() => setActionsOpen(!actionsOpen)} className="flex items-center gap-2 px-4 py-2 text-sm font-syne font-bold bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[#1a1a2e]">
            Actions <ChevronDown size={14} />
          </button>
          {actionsOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20">
              {[
                { label: 'Modifier', icon: Pencil, action: () => router.push(`/dashboard/devis/${id}/modifier`), danger: false },
                { label: 'Convertir en facture', icon: FileText, action: () => handleConvertToFacture(false), danger: false },
                { label: 'Envoyer par email', icon: SendHorizonal, action: () => setSendModalOpen(true), danger: false },
                { label: 'Supprimer', icon: Trash2, action: handleDeleteDevis, danger: true },
              ].map((action) => (
                <button key={action.label} onClick={() => { action.action(); setActionsOpen(false) }} className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-manrope hover:bg-gray-50 transition-colors ${action.danger ? 'text-red-600' : 'text-[#1a1a2e]'}`}>
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
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14}}>
              {/* Logo à gauche — imposant */}
              <div style={{flex:'0 0 auto', marginRight: 16}}>
                {Boolean(entreprise?.logo_url) && (
                  <img src={entreprise?.logo_url as string} alt="Logo" style={{ height: 120, maxWidth: 280, objectFit: 'contain', mixBlendMode: 'multiply' }} />
                )}
              </div>
              {/* DEVIS + Numéro centré */}
              <div style={{textAlign:'center', flex:1}}>
                <div className="print-devis-title" style={{fontSize:38, fontWeight:900, color:'#2563eb', letterSpacing:4, textTransform:'uppercase'}}>DEVIS</div>
                <div style={{fontSize:14, color:'#374151', marginTop:4}}>N° <strong>{devis.numero}</strong></div>
              </div>
              {/* Espace symétrique pour centrer le titre */}
              <div style={{flex:'0 0 auto', width: Boolean(entreprise?.logo_url) ? 280 : 0}} />
            </div>

            {/* Ligne dégradé */}
            <div style={{height:3, background:'linear-gradient(90deg,#2563eb,#93c5fd)', borderRadius:2, marginBottom:14}} />

            {/* Dates — sous le trait bleu, au-dessus des cadres */}
            <div className="print-dates" style={{display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'20px', marginBottom:20, padding:'10px 0'}}>
              <span style={{fontSize:15, color:'#374151'}}>Date : <strong style={{color:'#1a1a2e'}}>{formatDate(devis.date_emission || devis.created_at)}</strong></span>
              {devis.date_validite && <span style={{fontSize:15, color:'#374151'}}>Valide jusqu&apos;au : <strong style={{color:'#1a1a2e'}}>{formatDate(devis.date_validite)}</strong></span>}
              {devis.date_debut_travaux && <span style={{fontSize:15, color:'#374151'}}>Début travaux : <strong style={{color:'#1a1a2e'}}>{formatDate(devis.date_debut_travaux)}</strong></span>}
              {devis.duree_estimee && <span style={{fontSize:15, color:'#374151'}}>Durée : <strong style={{color:'#1a1a2e'}}>{devis.duree_estimee}</strong></span>}
            </div>

            {/* 2 CADRES : artisan gauche, client droite — bordures complètes colorées */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:18, alignItems:'stretch'}}>
              {/* Cadre artisan — bordure bleue complète */}
              <div className="print-info-box" style={{border:'2px solid #2563eb', borderRadius:10, padding:16, display:'flex', flexDirection:'column'}}>
                <div style={{fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'#2563eb', marginBottom:10}}>Artisan</div>
                <div style={{fontSize:16, fontWeight:700, color:'#111', marginBottom:6}}>{(entreprise?.nom as string) || 'Mon Entreprise'}</div>
                <div className="print-info-lines" style={{fontSize:14, color:'#6b7280', lineHeight:2}}>
                  {Boolean(entreprise?.adresse) && <div>{entreprise?.adresse as string}</div>}
                  {Boolean(entreprise?.code_postal || entreprise?.ville) && <div>{entreprise?.code_postal as string} {entreprise?.ville as string}</div>}
                  {Boolean(entreprise?.siret) && <div>SIRET : {entreprise?.siret as string}</div>}
                  {Boolean(entreprise?.telephone) && <div>Tél : {entreprise?.telephone as string}</div>}
                </div>
              </div>
              {/* Cadre client — bordure verte complète */}
              <div className="print-info-box" style={{border:'2px solid #10b981', borderRadius:10, padding:16, display:'flex', flexDirection:'column'}}>
                <div style={{fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'#10b981', marginBottom:10}}>Client</div>
                <div className="print-info-lines" style={{lineHeight:2}}>
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
              <table className="w-full mb-8 print-table">
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

            {/* ═══ GESTION DES DÉCHETS (loi AGEC) ═══ */}
            {(devis.dechets_nature || devis.dechets_quantite || devis.dechets_collecte_nom) && (
              <div className="mb-4 p-4 bg-[#fef9f0] rounded-lg border border-[#e87a2a]/30">
                <h4 className="font-manrope font-semibold text-[#e87a2a] mb-3 uppercase tracking-wider" style={{fontSize:11}}>Gestion des déchets (loi AGEC)</h4>
                <div className="space-y-1.5">
                  {devis.dechets_nature && (
                    <div>
                      <span className="text-xs font-manrope text-[#6b7280]">Nature : </span>
                      <span className="text-sm font-manrope text-[#1a1a2e]">{devis.dechets_nature}</span>
                    </div>
                  )}
                  {devis.dechets_quantite && (
                    <div>
                      <span className="text-xs font-manrope text-[#6b7280]">Quantité estimée : </span>
                      <span className="text-sm font-manrope text-[#1a1a2e]">{devis.dechets_quantite}</span>
                    </div>
                  )}
                  {devis.dechets_responsable && (
                    <div>
                      <span className="text-xs font-manrope text-[#6b7280]">Enlèvement par : </span>
                      <span className="text-sm font-manrope text-[#1a1a2e]">{devis.dechets_responsable}</span>
                    </div>
                  )}
                  {devis.dechets_tri && (
                    <div>
                      <span className="text-xs font-manrope text-[#6b7280]">Tri : </span>
                      <span className="text-sm font-manrope text-[#1a1a2e]">{devis.dechets_tri}</span>
                    </div>
                  )}
                  {devis.dechets_collecte_nom && (
                    <div>
                      <span className="text-xs font-manrope text-[#6b7280]">Point de collecte : </span>
                      <span className="text-sm font-manrope text-[#1a1a2e]">
                        {devis.dechets_collecte_nom}
                        {devis.dechets_collecte_adresse && ` — ${devis.dechets_collecte_adresse}`}
                        {devis.dechets_collecte_type && ` (${devis.dechets_collecte_type})`}
                      </span>
                    </div>
                  )}
                  {devis.dechets_cout != null && devis.dechets_cout > 0 && (
                    <div>
                      <span className="text-xs font-manrope text-[#6b7280]">Coût estimé : </span>
                      <span className="text-sm font-manrope font-medium text-[#1a1a2e]">{formatCurrency(devis.dechets_cout)} TTC</span>
                      <span className="text-[10px] font-manrope ml-2 px-1.5 py-0.5 rounded bg-gray-100 text-[#6b7280]">{devis.dechets_inclure_cout ? 'Inclus dans le total' : 'À titre informatif'}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══ BAS DE PAGE : 2 colonnes ═══ */}
            <div className="print-bottom grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              {/* Gauche : conditions + mentions légales */}
              <div className="space-y-4">
                {devis.conditions_paiement && (
                  <div>
                    <h4 className="font-manrope font-semibold text-sm text-[#1a1a2e] mb-2">Conditions de paiement</h4>
                    <p className="text-sm font-manrope text-[#6b7280] leading-relaxed">{devis.conditions_paiement}</p>
                  </div>
                )}
                {/* Mentions légales obligatoires */}
                <div className="border-t border-gray-100 pt-3">
                  <h4 className="font-manrope font-semibold text-[11px] text-[#9ca3af] uppercase tracking-wider mb-2">Mentions légales</h4>
                  <div className="space-y-1.5 text-[11px] font-manrope text-[#6b7280] leading-relaxed">
                    {(entreprise?.assurance_nom || entreprise?.decennale_numero) && (
                      <p>
                        <span className="font-medium text-[#1a1a2e]">Assurance décennale :</span>{' '}
                        {entreprise?.assurance_nom as string}
                        {entreprise?.decennale_numero && ` — Police n° ${entreprise?.decennale_numero as string}`}
                        {entreprise?.assurance_zone && ` — Zone : ${entreprise?.assurance_zone as string}`}
                      </p>
                    )}
                    {entreprise?.mediateur && (
                      <p>
                        <span className="font-medium text-[#1a1a2e]">Médiateur de la consommation :</span>{' '}
                        {entreprise?.mediateur as string}
                      </p>
                    )}
                    <p>Le client dispose d&apos;un délai de rétractation de 14 jours à compter de la signature du devis pour les travaux conclus hors établissement (art. L221-18 du Code de la consommation).</p>
                  </div>
                </div>
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
            <div className="print-sigs grid grid-cols-2 gap-4 mt-3">
              <div className="print-sig-box border border-dashed border-gray-300 rounded-lg p-2.5" style={{ minHeight: 55 }}>
                <div className="text-[9px] font-bold tracking-widest uppercase text-[#9ca3af] mb-1">Signature artisan</div>
                {Boolean(entreprise?.signature_base64) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entreprise?.signature_base64 as string} alt="Signature" style={{ height: 38, objectFit: 'contain' }} />
                )}
              </div>
              <div className="print-sig-box border border-dashed border-gray-300 rounded-lg p-2.5" style={{ minHeight: 55 }}>
                <div className="text-[9px] font-bold tracking-widest uppercase text-[#9ca3af] mb-1">Bon pour accord — Signature client</div>
                <div className="mt-5 border-t border-gray-200 pt-1 text-[10px] text-[#9ca3af]">...... / ...... / ..........</div>
              </div>
            </div>

            {/* ═══ FOOTER LÉGAL ═══ */}
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: '0.5px solid #e5e7eb', fontSize: 9.5, color: '#9ca3af', textAlign: 'center', lineHeight: 1.5, pageBreakBefore: 'avoid', breakBefore: 'avoid' }}>
              {entreprise?.nom as string} — {entreprise?.adresse as string}, {entreprise?.code_postal as string} {entreprise?.ville as string}
              {Boolean(entreprise?.siret) && ` — SIRET : ${entreprise?.siret as string}`}
              {Boolean(entreprise?.email) && ` — Email : ${entreprise?.email as string}`}
              <br /><span style={{ color: '#d1d5db' }}>Généré via Nexartis — nexartis.fr</span>
            </div>

          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-6 lg:sticky lg:top-24 lg:self-start no-print">
          {/* Infos */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-manrope text-[#6b7280]">Statut</span>
              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-manrope font-medium ${statutStyle}`}>
                {STATUT_LABELS[devis.statut] ?? devis.statut}
              </span>
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

          {/* Changer le statut manuellement */}
          {devis.statut !== 'facture' && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-manrope font-semibold text-[#6b7280] uppercase tracking-wider mb-3">Changer le statut</p>
              <div className="space-y-2">
                {devis.statut !== 'signe' && (
                  <button
                    onClick={() => handleChangeStatut('signe')}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-green-200 bg-green-50 text-green-700 text-sm font-manrope hover:bg-green-100 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                    Marquer Accepté
                  </button>
                )}
                {devis.statut !== 'refuse' && (
                  <button
                    onClick={() => handleChangeStatut('refuse')}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-manrope hover:bg-red-100 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                    Marquer Refusé
                  </button>
                )}
                {devis.statut !== 'envoye' && devis.statut !== 'brouillon' && (
                  <button
                    onClick={() => handleChangeStatut('envoye')}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-manrope hover:bg-blue-100 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    Remettre en Envoyé
                  </button>
                )}
              </div>
            </div>
          )}
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
