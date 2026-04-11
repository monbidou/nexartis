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
  date_signature?: string
  signed_by?: string
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

  /* ── Forcer les backgrounds à l'impression (NET À PAYER bleu, etc.) ── */
  .print-zone { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  .print-net-payer { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; background: #2563eb !important; color: white !important; }

  /* ── Centrage titre DEVIS en print ── */
  .print-header-flex { display: flex !important; align-items: center !important; justify-content: center !important; }
  .print-header-flex .print-logo-col { flex: 0 0 auto !important; }
  .print-header-flex .print-title-col { flex: 1 !important; text-align: center !important; }
  .print-header-flex .print-spacer-col { display: none !important; }

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
            <div className="print-header-flex" style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14}}>
              {/* Logo à gauche — imposant */}
              <div className="print-logo-col" style={{flex:'0 0 auto', marginRight: 16}}>
                {Boolean(entreprise?.logo_url) && (
                  <img src={String(entreprise?.logo_url || '')} alt="Logo" style={{ height: 120, maxWidth: 280, objectFit: 'contain', mixBlendMode: 'multiply' }} />
                )}
              </div>
              {/* DEVIS + Numéro centré */}
              <div className="print-title-col" style={{textAlign:'center', flex:1}}>
                <div className="print-devis-title" style={{fontSize:38, fontWeight:900, color:'#2563eb', letterSpacing:4, textTransform:'uppercase'}}>DEVIS</div>
                <div style={{fontSize:14, color:'#374151', marginTop:4}}>N° <strong>{devis.numero}</strong></div>
              </div>
              {/* Espace symétrique pour centrer le titre — masqué en print */}
              <div className="print-spacer-col" style={{flex:'0 0 auto', width: Boolean(entreprise?.logo_url) ? 280 : 0}} />
            </div>

            {/* Ligne dégradé */}
            <div style={{height:3, background:'linear-gradient(90deg,#2563eb,#93c5fd)', borderRadius:2, marginBottom:14}} />

            {/* Dates — sous le trait bleu */}
            <div className="print-dates" style={{display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'16px', marginBottom:14, padding:'6px 0'}}>
              <span style={{fontSize:11, color:'#374151'}}>Date : <strong style={{color:'#1a1a2e'}}>{formatDate(devis.date_emission || devis.created_at)}</strong></span>
              {devis.date_validite && <span style={{fontSize:11, color:'#374151'}}>Valide jusqu&apos;au : <strong style={{color:'#1a1a2e'}}>{formatDate(devis.date_validite)}</strong></span>}
              {devis.date_debut_travaux && <span style={{fontSize:11, color:'#374151'}}>Début travaux : <strong style={{color:'#1a1a2e'}}>{formatDate(devis.date_debut_travaux)}</strong></span>}
              {devis.duree_estimee && <span style={{fontSize:11, color:'#374151'}}>Durée : <strong style={{color:'#1a1a2e'}}>{devis.duree_estimee}</strong></span>}
            </div>

            {/* 2 CADRES : artisan gauche, client droite */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12, alignItems:'stretch'}}>
              {/* Cadre artisan */}
              <div className="print-info-box" style={{border:'1.5px solid #2563eb', borderRadius:8, padding:10, display:'flex', flexDirection:'column'}}>
                <div style={{fontSize:9, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'#2563eb', marginBottom:6}}>Artisan</div>
                <div style={{fontSize:12, fontWeight:700, color:'#111', marginBottom:3}}>{String(entreprise?.nom || 'Mon Entreprise')}</div>
                <div className="print-info-lines" style={{fontSize:11, color:'#6b7280', lineHeight:1.7}}>
                  {Boolean(entreprise?.adresse) && <div>{String(entreprise?.adresse || '')}</div>}
                  {Boolean(entreprise?.code_postal || entreprise?.ville) && <div>{String(entreprise?.code_postal || '')} {String(entreprise?.ville || '')}</div>}
                  {Boolean(entreprise?.siret) && <div>SIRET : {String(entreprise?.siret || '')}</div>}
                  {Boolean(entreprise?.telephone) && <div>Tél : {String(entreprise?.telephone || '')}</div>}
                </div>
              </div>
              {/* Cadre client */}
              <div className="print-info-box" style={{border:'1.5px solid #10b981', borderRadius:8, padding:10, display:'flex', flexDirection:'column'}}>
                <div style={{fontSize:9, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'#10b981', marginBottom:6}}>Client</div>
                <div className="print-info-lines" style={{lineHeight:1.7}}>
                  {devis.notes_client ? (() => {
                    const parts = devis.notes_client.split(' | ')
                    return parts.map((info: string, i: number) => (
                      <div key={i} style={{fontWeight: i === 0 ? 700 : 400, color: i === 0 ? '#111' : '#6b7280', fontSize: i === 0 ? 12 : 11}}>
                        {info}
                      </div>
                    ))
                  })() : (
                    <>
                      <div style={{fontWeight:700, color:'#111', fontSize:12}}>{client?.prenom ? `${client.prenom} ${client.nom}` : (client?.nom ?? 'Non renseigné')}</div>
                      {client?.adresse && <div style={{color:'#6b7280', fontSize:11}}>{client.adresse}</div>}
                      {(client?.code_postal || client?.ville) && (
                        <div style={{color:'#6b7280', fontSize:11}}>{client?.code_postal ?? ''} {client?.ville ?? ''}</div>
                      )}
                      {client?.telephone && <div style={{color:'#6b7280', fontSize:11}}>{client.telephone}</div>}
                      {client?.email && <div style={{color:'#6b7280', fontSize:11}}>{client.email}</div>}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ═══ OBJET ═══ */}
            {devis.objet && (
              <div className="mb-3 p-2 bg-[#eff6ff] rounded-lg border-l-[3px] border-[#2563eb]">
                <span className="text-[10px] font-manrope font-bold text-[#2563eb] uppercase tracking-wider">Objet : </span>
                <span className="text-[11px] font-manrope text-[#374151]">{devis.objet}</span>
              </div>
            )}

            {/* ═══ TABLEAU — taille harmonisée avec le reste ═══ */}
            {lignes.length > 0 && (
              <table className="w-full mb-3 print-table">
                <thead>
                  <tr className="bg-[#2563eb] text-white">
                    <th className="px-2 py-1.5 text-left text-[10px] font-manrope font-semibold uppercase w-8">N°</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-manrope font-semibold uppercase">Désignation</th>
                    <th className="px-2 py-1.5 text-center text-[10px] font-manrope font-semibold uppercase w-14">Qté</th>
                    <th className="px-2 py-1.5 text-center text-[10px] font-manrope font-semibold uppercase w-14">Unité</th>
                    <th className="px-2 py-1.5 text-right text-[10px] font-manrope font-semibold uppercase w-20">Prix U. HT</th>
                    <th className="px-2 py-1.5 text-right text-[10px] font-manrope font-semibold uppercase w-20">Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((l, i) => (
                    <tr key={l.id ?? i} className={i % 2 === 1 ? 'bg-[#f8faff]' : ''}>
                      <td className="px-2 py-1.5 text-[11px] font-manrope text-[#6b7280]">{i + 1}</td>
                      <td className="px-2 py-1.5 text-[11px] font-manrope text-[#1a1a2e]">{l.designation}</td>
                      <td className="px-2 py-1.5 text-[11px] font-manrope text-center text-[#1a1a2e]">{l.quantite}</td>
                      <td className="px-2 py-1.5 text-[11px] font-manrope text-center text-[#6b7280]">{l.unite}</td>
                      <td className="px-2 py-1.5 text-[11px] font-manrope text-right text-[#1a1a2e]">{formatCurrency(l.prix_unitaire_ht)}</td>
                      <td className="px-2 py-1.5 text-[11px] font-manrope text-right font-semibold text-[#1a1a2e]">{formatCurrency(l.quantite * l.prix_unitaire_ht)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* ═══ CONDITIONS + TOTAUX : 2 colonnes côte à côte ═══ */}
            <div className="print-bottom grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
              {/* Gauche : conditions de paiement + mentions légales + déchets (discret en bas) */}
              <div className="space-y-2">
                {/* Conditions de paiement — en premier, c'est le plus important */}
                {devis.conditions_paiement && (
                  <div>
                    <h4 className="font-manrope font-semibold text-xs text-[#1a1a2e] mb-0.5">Conditions de paiement</h4>
                    <p className="text-xs font-manrope text-[#6b7280] leading-relaxed">{devis.conditions_paiement}</p>
                  </div>
                )}
                {/* Mentions légales obligatoires — générées automatiquement selon le statut */}
                <div className="border-t border-gray-100 pt-1.5">
                  <h4 className="font-manrope font-semibold text-[9px] text-[#9ca3af] uppercase tracking-wider mb-0.5">Mentions légales</h4>
                  <div className="space-y-0.5 text-[9px] font-manrope text-[#9ca3af] leading-relaxed">
                    {/* Assurance décennale */}
                    {Boolean(entreprise?.assurance_nom || entreprise?.decennale_numero) && (
                      <p>
                        Assurance décennale : {String(entreprise?.assurance_nom || '')}
                        {Boolean(entreprise?.decennale_numero) && ` — n° ${String(entreprise?.decennale_numero)}`}
                        {Boolean(entreprise?.assurance_zone) && ` — Zone : ${String(entreprise?.assurance_zone)}`}
                      </p>
                    )}
                    {/* Franchise TVA — auto-entrepreneur / micro-entreprise */}
                    {Boolean(entreprise?.franchise_tva) && (
                      <p className="font-semibold">TVA non applicable — art. 293 B du CGI.</p>
                    )}
                    {/* Forme juridique EI → mention obligatoire depuis mai 2022 */}
                    {(entreprise?.forme_juridique === 'EI' || entreprise?.forme_juridique === 'Micro-entreprise') && (
                      <p>{String(entreprise?.nom || '')} — {entreprise?.forme_juridique === 'Micro-entreprise' ? 'Entrepreneur individuel (Micro-entreprise)' : 'Entrepreneur individuel (EI)'}</p>
                    )}
                    {/* Capital social pour les sociétés */}
                    {Boolean(entreprise?.capital_social) && ['EURL', 'SARL', 'SAS', 'SASU'].includes(String(entreprise?.forme_juridique || '')) && (
                      <p>{String(entreprise?.forme_juridique)} au capital de {String(entreprise?.capital_social)}</p>
                    )}
                    {/* RCS / RM */}
                    {Boolean(entreprise?.rcs_rm) && (
                      <p>{String(entreprise?.rcs_rm)}</p>
                    )}
                    {/* Qualification professionnelle */}
                    {Boolean(entreprise?.qualification_pro) && (
                      <p>Qualification : {String(entreprise?.qualification_pro)}</p>
                    )}
                    {/* Médiateur */}
                    {Boolean(entreprise?.mediateur) && (
                      <p>Médiateur : {String(entreprise?.mediateur)}</p>
                    )}
                    {/* Rétractation — toujours affichée */}
                    <p>Rétractation 14 jours pour travaux hors établissement (art. L221-18 C. conso.).</p>
                    {/* Mentions personnalisées */}
                    {Boolean(entreprise?.mentions_legales_custom) && (
                      <p>{String(entreprise?.mentions_legales_custom)}</p>
                    )}
                  </div>
                </div>
                {/* Déchets — discret, grisé, tout en bas */}
                {(devis.dechets_nature || devis.dechets_quantite || devis.dechets_collecte_nom) && (
                  <div className="border-t border-gray-100 pt-1.5">
                    <h4 className="font-manrope font-semibold text-[9px] text-[#9ca3af] uppercase tracking-wider mb-0.5">Gestion des déchets (AGEC)</h4>
                    <div className="text-[9px] font-manrope text-[#9ca3af] leading-relaxed">
                      {devis.dechets_nature && <span>Nature : {devis.dechets_nature}</span>}
                      {devis.dechets_quantite && <span> · Qté : {devis.dechets_quantite}</span>}
                      {devis.dechets_responsable && <span> · {devis.dechets_responsable}</span>}
                      {devis.dechets_tri && <span> · Tri : {devis.dechets_tri}</span>}
                      {devis.dechets_collecte_nom && <span> · Collecte : {devis.dechets_collecte_nom}{devis.dechets_collecte_type && ` (${devis.dechets_collecte_type})`}</span>}
                      {devis.dechets_cout != null && devis.dechets_cout > 0 && <span> · Coût estimé : {formatCurrency(devis.dechets_cout)} TTC {devis.dechets_inclure_cout ? '(inclus)' : '(informatif)'}</span>}
                    </div>
                  </div>
                )}
              </div>
              {/* Droite : totaux — alignés en haut */}
              <div>
                <div className="flex justify-between py-1 text-xs font-manrope">
                  <span className="text-[#6b7280]">Total HT</span>
                  <span className="text-[#1a1a2e] font-medium">{formatCurrency(totalHT)}</span>
                </div>
                {Object.entries(tvaGroups)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([rate, group]) => (
                    <div key={rate} className="flex justify-between py-0.5 text-xs font-manrope">
                      <span className="text-[#6b7280]">TVA {rate}%</span>
                      <span className="text-[#1a1a2e] font-medium">{formatCurrency(group.tva)}</span>
                    </div>
                  ))}
                <div className="border-t border-gray-200 mt-1 pt-1 flex justify-between py-1 text-xs font-manrope">
                  <span className="text-[#1a1a2e] font-bold">Total TTC</span>
                  <span className="text-[#1a1a2e] font-bold">{formatCurrency(totalTTC)}</span>
                </div>
                {devis.acompte_pourcent && devis.acompte_pourcent > 0 && (() => {
                  const acompteMnt = totalTTC * (devis.acompte_pourcent / 100)
                  return (
                    <>
                      <div className="flex justify-between py-0.5 text-xs font-manrope border-t mt-0.5 pt-1">
                        <span className="text-[#2563eb] font-medium">Acompte à verser ({devis.acompte_pourcent}%)</span>
                        <span className="text-[#2563eb] font-semibold">{formatCurrency(acompteMnt)}</span>
                      </div>
                      <div className="flex justify-between py-0.5 text-xs font-manrope">
                        <span className="text-[#6b7280]">Reste à facturer</span>
                        <span className="font-semibold">{formatCurrency(totalTTC - acompteMnt)}</span>
                      </div>
                    </>
                  )
                })()}
                <div className="print-net-payer bg-[#2563eb] text-white rounded-lg p-2 mt-1.5 flex justify-between items-center">
                  <span className="font-syne font-bold text-xs">NET À PAYER</span>
                  <span className="font-syne font-bold text-base">{formatCurrency(totalTTC)}</span>
                </div>
                {/* ═══ SIGNATURES — sous NET À PAYER, 2 cadres identiques ═══ */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {/* Signature artisan */}
                  <div className="border border-gray-300 rounded p-2 flex flex-col items-center justify-center" style={{ height: 70 }}>
                    <div className="text-[8px] font-manrope font-bold text-[#9ca3af] uppercase tracking-widest mb-1">Artisan</div>
                    {(Boolean(entreprise?.signature_base64) || Boolean(entreprise?.tampon_base64)) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={String(entreprise?.signature_base64 || entreprise?.tampon_base64 || '')}
                        alt={entreprise?.signature_base64 ? 'Signature' : 'Tampon'}
                        className="max-w-full"
                        style={{ height: entreprise?.tampon_base64 && !entreprise?.signature_base64 ? 48 : 42, objectFit: 'contain' }}
                      />
                    ) : null}
                  </div>
                  {/* Signature client */}
                  <div className="border border-gray-300 rounded p-2 flex flex-col items-center justify-center" style={{ height: 70 }}>
                    <div className="text-[8px] font-manrope font-bold text-[#9ca3af] uppercase tracking-widest mb-1">Client</div>
                    {devis.date_signature ? (
                      <div className="text-center">
                        <div className="text-[9px] font-manrope font-semibold text-green-600">Signé</div>
                        <div className="text-[8px] font-manrope text-[#6b7280]">
                          {new Date(devis.date_signature).toLocaleDateString('fr-FR')}
                          {devis.signed_by && ` — ${devis.signed_by}`}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[8px] font-manrope text-[#c0c0c0] italic">En attente</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ FOOTER LÉGAL ═══ */}
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: '0.5px solid #e5e7eb', fontSize: 9.5, color: '#9ca3af', textAlign: 'center', lineHeight: 1.5, pageBreakBefore: 'avoid', breakBefore: 'avoid' }}>
              {String(entreprise?.nom || '')} — {String(entreprise?.adresse || '')}, {String(entreprise?.code_postal || '')} {String(entreprise?.ville || '')}
              {Boolean(entreprise?.siret) && ` — SIRET : ${String(entreprise?.siret || '')}`}
              {Boolean(entreprise?.email) && ` — Email : ${String(entreprise?.email || '')}`}
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
