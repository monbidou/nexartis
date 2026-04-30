'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Download,
  Send,
  RotateCcw,
  AlertTriangle,
  CreditCard,
  Calendar,
  User,
  MapPin,
  Phone,
  Mail,
  X,
  Pencil,
} from 'lucide-react'
import EnvoyerFactureModal from '@/components/dashboard/EnvoyerFactureModal'
import {
  useSupabaseRecord,
  useFactureLignes,
  useEntreprise,
  updateRow,
  LoadingSkeleton,
} from '@/lib/hooks'

interface FactureRecord {
  id: string
  numero: string
  statut: string
  client_id: string
  chantier_id?: string
  devis_id?: string
  date_emission?: string
  date_echeance?: string
  date_envoi?: string
  montant_ht?: number
  montant_tva?: number
  montant_ttc?: number
  montant_paye?: number
  notes?: string
  objet?: string
  client_nom?: string
  client_adresse?: string
  client_telephone?: string
  client_email?: string
  notes_client?: string
  conditions_paiement?: string
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
  unite: string
  quantite: number
  prix_unitaire_ht: number
  total_ht: number
  taux_tva?: number
  ordre: number
  type?: string
  niveau?: number
  numero?: string
}

const STATUT_STYLES: Record<string, string> = {
  'Encaissée': 'bg-green-50 text-green-700 border-green-200',
  'payee': 'bg-green-50 text-green-700 border-green-200',
  'Partiellement payée': 'bg-blue-50 text-blue-700 border-blue-200',
  'partielle': 'bg-blue-50 text-blue-700 border-blue-200',
  'En attente': 'bg-orange-50 text-orange-700 border-orange-200',
  'En retard': 'bg-red-50 text-red-700 border-red-200',
  'en_retard': 'bg-red-50 text-red-700 border-red-200',
  'archivee': 'bg-gray-100 text-gray-500 border-gray-200',
  'brouillon': 'bg-gray-100 text-gray-600 border-gray-200',
}

const STATUT_LABELS: Record<string, string> = {
  'payee': 'Encaissée',
  'partielle': 'Partiellement payée',
  'en_retard': 'En retard',
  'archivee': 'Archivée',
  'brouillon': 'Brouillon',
  'En attente': 'En attente',
  'Encaissée': 'Encaissée',
}

export default function FactureDetailPage() {
  const params = useParams()
  const id = params.id as string

  const { data: facture, loading: loadingFacture } = useSupabaseRecord<FactureRecord>('factures', id)
  const { data: lignesRaw, loading: loadingLignes } = useFactureLignes(id)
  const { data: client, loading: loadingClient } = useSupabaseRecord<ClientRecord>('clients', facture?.client_id ?? null)
  const { data: devisSource } = useSupabaseRecord<{ notes_client?: string }>('devis', facture?.devis_id ?? null)
  const { entreprise } = useEntreprise()

  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [downloading, setDownloading] = useState(false)

  async function handleDownloadPdf() {
    if (!facture || downloading) return
    setDownloading(true)
    try {
      const res = await fetch('/api/download-facture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factureId: facture.id }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        alert('Erreur : ' + (data.error || 'Échec du téléchargement'))
        return
      }
      // Convert base64 to blob and download
      const byteCharacters = atob(data.pdfBase64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = data.filename || `Facture-${facture.numero}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      alert('Erreur : ' + (err instanceof Error ? err.message : 'Échec'))
    } finally {
      setDownloading(false)
    }
  }

  async function handleMarkPaid() {
    if (!facture || updating) return
    setUpdating(true)
    try {
      await updateRow('factures', facture.id, {
        statut: 'payee',
        montant_paye: facture.montant_ttc || 0,
        date_paiement: new Date().toISOString(),
      })
      setToastMsg('Facture marquée comme payée !')
      setTimeout(() => setToastMsg(null), 3000)
      window.location.reload()
    } catch (err) {
      alert('Erreur : ' + (err instanceof Error ? err.message : 'Échec'))
    } finally { setUpdating(false) }
  }

  async function handleArchive() {
    if (!facture || updating) return
    setUpdating(true)
    try {
      await updateRow('factures', facture.id, { statut: 'archivee', archivee: true })
      setToastMsg('Facture archivée !')
      setTimeout(() => setToastMsg(null), 3000)
      window.location.reload()
    } catch (err) {
      alert('Erreur : ' + (err instanceof Error ? err.message : 'Échec'))
    } finally { setUpdating(false) }
  }

  async function handleUnarchive() {
    if (!facture || updating) return
    setUpdating(true)
    try {
      await updateRow('factures', facture.id, { statut: 'payee', archivee: false })
      setToastMsg('Facture désarchivée !')
      setTimeout(() => setToastMsg(null), 3000)
      window.location.reload()
    } catch (err) {
      alert('Erreur : ' + (err instanceof Error ? err.message : 'Échec'))
    } finally { setUpdating(false) }
  }

  const loading = loadingFacture || loadingLignes || loadingClient

  if (loading) return <div className="space-y-6"><LoadingSkeleton rows={8} /></div>

  if (!facture) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/factures" className="p-2 rounded-lg hover:bg-gray-100 transition-colors inline-flex items-center gap-2 text-sm text-gray-500">
          <ArrowLeft size={20} /> Retour
        </Link>
        <p className="text-sm font-manrope text-gray-500">Facture introuvable.</p>
      </div>
    )
  }

  const lignes = lignesRaw as unknown as LigneRecord[]
  const resolvedClientName = client ? [client.prenom, client.nom].filter(Boolean).join(' ') : facture.client_nom || devisSource?.notes_client?.split(' | ')[0] || 'Non renseigné'
  const totalHT = facture.montant_ht ?? lignes.reduce((s, l) => s + (l.total_ht ?? 0), 0)
  const totalTVA = facture.montant_tva ?? 0
  const totalTTC = facture.montant_ttc ?? totalHT + totalTVA
  const totalPaye = facture.montant_paye ?? 0
  const resteAPayer = totalTTC - totalPaye
  const paymentPercent = totalTTC > 0 ? Math.round((totalPaye / totalTTC) * 100) : 0

  const statutLabel = STATUT_LABELS[facture.statut] ?? facture.statut
  const statutStyle = STATUT_STYLES[facture.statut] ?? 'bg-gray-100 text-gray-600 border-gray-200'

  const fmt = (val: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val || 0)
  const formatDate = (d: string | undefined) => d ? new Date(d).toLocaleDateString('fr-FR') : ''

  // TVA groups
  const tvaGroups: Record<number, { ht: number; tva: number }> = {}
  lignes.forEach(l => {
    if (l.designation?.startsWith('---')) return
    const rate = l.taux_tva ?? 10
    const ht = l.total_ht || (l.quantite ?? 0) * (l.prix_unitaire_ht ?? 0)
    if (!tvaGroups[rate]) tvaGroups[rate] = { ht: 0, tva: 0 }
    tvaGroups[rate].ht += ht
    tvaGroups[rate].tva += ht * rate / 100
  })

  const printStyles = `@media print {
    nav, header, aside, .no-print, .sidebar-col { display: none !important; }
    body { background: white !important; }
    .print-zone { box-shadow: none !important; border: none !important; margin: 0 !important; }
  }`

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/factures" className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0">
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-syne font-bold text-[#0f1a3a]">Facture {facture.numero}</h1>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-manrope font-medium border ${statutStyle}`}>{statutLabel}</span>
            </div>
            <p className="text-sm font-manrope text-gray-500 mt-1">{resolvedClientName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleDownloadPdf} disabled={downloading} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-manrope text-[#1a1a2e] transition-colors disabled:opacity-50">
            <Download size={14} /> {downloading ? 'Téléchargement...' : 'Télécharger PDF'}
          </button>
          <button onClick={() => setSendModalOpen(true)} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-manrope transition-colors">
            <Send size={14} /> Envoyer par email
          </button>
          <Link href={`/dashboard/factures/${facture.id}/modifier`} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-manrope text-[#1a1a2e] transition-colors">
            <Pencil size={14} /> Modifier
          </Link>
          {facture.statut !== 'payee' && facture.statut !== 'Encaissée' && facture.statut !== 'archivee' && (
            <button onClick={handleMarkPaid} disabled={updating} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 text-sm font-manrope text-green-700 transition-colors disabled:opacity-50">
              <CreditCard size={14} /> Marquer payée
            </button>
          )}
          {(facture.statut === 'payee' || facture.statut === 'Encaissée') && (
            <button onClick={handleArchive} disabled={updating} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-manrope text-[#1a1a2e] transition-colors disabled:opacity-50">
              <RotateCcw size={14} /> Archiver
            </button>
          )}
          {facture.statut === 'archivee' && (
            <button onClick={handleUnarchive} disabled={updating} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-sm font-manrope text-blue-700 transition-colors disabled:opacity-50">
              <RotateCcw size={14} /> Désarchiver
            </button>
          )}
          {facture.statut !== 'payee' && facture.statut !== 'Encaissée' && facture.statut !== 'archivee' && (
            <button onClick={() => setSendModalOpen(true)} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 text-sm font-manrope text-orange-700 transition-colors">
              <AlertTriangle size={14} /> Relancer
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main: Invoice preview */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-8 print-zone">

            {/* HEADER — Logo absolu à gauche, FACTURE centré au milieu (identique au devis) */}
            <div style={{position:'relative', marginBottom:10}}>
              {/* FACTURE + Numéro + Date — centré au milieu de la page */}
              <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', paddingTop:0, paddingBottom:0}}>
                <div style={{fontSize:38, fontWeight:900, color:'#2563eb', letterSpacing:4, textTransform:'uppercase', lineHeight:1}}>FACTURE</div>
                <div style={{fontSize:14, color:'#374151', marginTop:10, lineHeight:1}}>N° <strong>{facture.numero}</strong></div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                  {formatDate(facture.date_emission || facture.created_at)}
                  {facture.date_echeance && ` · Échéance ${formatDate(facture.date_echeance)}`}
                </div>
              </div>
              {/* Logo — positionné à gauche, hauteur = du haut de FACTURE au bas du numéro */}
              {Boolean(entreprise?.logo_url) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={String(entreprise?.logo_url || '')} alt="Logo" style={{ position:'absolute', left:0, top:0, height:'100%', width:'auto', maxWidth: 180, objectFit: 'contain', mixBlendMode: 'multiply' }} />
              )}
            </div>

            <div style={{height:3, background:'linear-gradient(90deg,#2563eb,#93c5fd)', borderRadius:2, marginBottom:14}} />

            {/* Cadres Artisan + Client — identiques au devis */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12, alignItems: 'stretch' }}>
              {/* Cadre artisan — fond bleu pale + bordure gauche bleue */}
              <div style={{ background: '#cde4f5', border: '1px solid #5ab4e0', borderLeft: '4px solid #5ab4e0', borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#1a6fb5', marginBottom: 6 }}>Artisan</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#111', marginBottom: 3 }}>{String(entreprise?.nom || 'Mon Entreprise')}</div>
                <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.7 }}>
                  {Boolean(entreprise?.adresse) && <div>{String(entreprise?.adresse || '')}</div>}
                  {Boolean(entreprise?.code_postal || entreprise?.ville) && <div>{String(entreprise?.code_postal || '')} {String(entreprise?.ville || '')}</div>}
                  {Boolean(entreprise?.siret) && <div>SIRET : {String(entreprise?.siret || '')}</div>}
                  {Boolean(entreprise?.telephone) && <div>Tel : {String(entreprise?.telephone || '')}</div>}
                </div>
              </div>
              {/* Cadre client — fond vert pale + bordure gauche verte */}
              <div style={{ background: '#c9efd5', border: '1px solid #22c55e', borderLeft: '4px solid #22c55e', borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#15803d', marginBottom: 6 }}>Client</div>
                <div style={{ lineHeight: 1.7 }}>
                  {facture.notes_client ? (() => {
                    const parts = facture.notes_client
                      .split(/\s*\|\s*/)
                      .flatMap((s: string) => s.split(/,(?=\s*\d{5}\b)/))
                      .map((s: string) => s.trim())
                      .filter(Boolean)
                    return parts.map((info: string, i: number) => (
                      <div key={i} style={{ fontWeight: i === 0 ? 700 : 400, color: i === 0 ? '#111' : '#6b7280', fontSize: i === 0 ? 12 : 11 }}>
                        {info}
                      </div>
                    ))
                  })() : (
                    <>
                      <div style={{ fontWeight: 700, color: '#111', fontSize: 12 }}>{resolvedClientName}</div>
                      {client?.adresse && <div style={{ color: '#6b7280', fontSize: 11 }}>{client.adresse}</div>}
                      {(client?.code_postal || client?.ville) && (
                        <div style={{ color: '#6b7280', fontSize: 11 }}>{client?.code_postal ?? ''} {client?.ville ?? ''}</div>
                      )}
                      {client?.telephone && <div style={{ color: '#6b7280', fontSize: 11 }}>{client.telephone}</div>}
                      {client?.email && <div style={{ color: '#6b7280', fontSize: 11 }}>{client.email}</div>}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* (titre FACTURE déplacé dans le header au-dessus) */}

            {/* Objet */}
            {(facture.objet || facture.notes_client?.includes('|')) && (
              <div style={{ marginBottom: 16, paddingLeft: 12, borderLeft: '3px solid #2563eb' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', marginBottom: 2 }}>Objet</div>
                <div style={{ fontSize: 13, color: '#1a1a2e', fontWeight: 500 }}>{facture.objet || ''}</div>
              </div>
            )}

            {/* TABLEAU */}
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
                  {lignes.map((ligne, i) => {
                    // Helper : calcule le sous-total d'une section ou sous-section
                    const subtotalAt = (idx: number): number => {
                      const cur = lignes[idx]
                      if (!cur || (cur.type !== 'section' && cur.type !== 'sous_section')) return 0
                      let sum = 0
                      for (let j = idx + 1; j < lignes.length; j++) {
                        const ll = lignes[j]
                        if (cur.type === 'section' && ll.type === 'section') break
                        if (cur.type === 'sous_section' && (ll.type === 'section' || ll.type === 'sous_section')) break
                        if (!ll.type || ll.type === 'prestation') sum += (ll.quantite ?? 0) * (ll.prix_unitaire_ht ?? 0)
                      }
                      return sum
                    }
                    if (ligne.type === 'section') {
                      return (
                        <tr key={ligne.id ?? i} className="bg-[#a8d4ec]">
                          <td className="px-2 py-1.5 text-[11px] font-manrope font-bold text-[#0f3d63]">{ligne.numero || ''}</td>
                          <td className="px-2 py-1.5 text-[11px] font-manrope font-bold text-[#0f1a3a]" colSpan={4}>{ligne.designation}</td>
                          <td className="px-2 py-1.5 text-[11px] font-manrope text-right font-bold text-[#0f3d63]">{fmt(subtotalAt(i))}</td>
                        </tr>
                      )
                    }
                    if (ligne.type === 'sous_section') {
                      return (
                        <tr key={ligne.id ?? i} className="bg-[#dceefa]">
                          <td className="px-2 py-1.5 text-[11px] font-manrope font-semibold text-[#1a6fb5]">{ligne.numero || ''}</td>
                          <td className="px-2 py-1.5 text-[11px] font-manrope font-semibold text-[#0f1a3a]" colSpan={4}>{ligne.designation}</td>
                          <td className="px-2 py-1.5 text-[11px] font-manrope text-right font-semibold text-[#1a6fb5]">{fmt(subtotalAt(i))}</td>
                        </tr>
                      )
                    }
                    if (ligne.type === 'commentaire') {
                      return (
                        <tr key={ligne.id ?? i}>
                          <td className="px-3 py-1.5 text-xs font-manrope text-[#6b7280]" />
                          <td className="px-3 py-1.5 text-xs font-manrope italic text-[#6b7280]" colSpan={5}>{ligne.designation}</td>
                        </tr>
                      )
                    }
                    if (ligne.type === 'saut_page') {
                      return <tr key={ligne.id ?? i}><td colSpan={6} className="py-1 border-t border-dashed border-gray-300" /></tr>
                    }
                    // backward compat : ancien format ---
                    const isLegacySection = !ligne.type && ligne.designation?.startsWith('---')
                    if (isLegacySection) {
                      return (
                        <tr key={ligne.id ?? i} className="bg-[#dceefa] border-l-4 border-[#5ab4e0]">
                          <td colSpan={6} className="px-3 py-2 text-sm font-manrope font-bold text-[#0f1a3a]">{ligne.designation.replace(/^---\s*/, '').replace(/\s*---$/, '')}</td>
                        </tr>
                      )
                    }
                    return (
                      <tr key={ligne.id ?? i} className={i % 2 === 1 ? 'bg-[#f8faff]' : ''}>
                        <td className="px-2 py-1.5 text-[11px] font-manrope text-[#6b7280]">{ligne.numero || ''}</td>
                        <td className="px-2 py-1.5 text-[11px] font-manrope text-[#1a1a2e]">{ligne.designation}</td>
                        <td className="px-2 py-1.5 text-[11px] font-manrope text-center text-[#1a1a2e]">{ligne.quantite}</td>
                        <td className="px-2 py-1.5 text-[11px] font-manrope text-center text-[#6b7280]">{ligne.unite}</td>
                        <td className="px-2 py-1.5 text-[11px] font-manrope text-right text-[#1a1a2e]">{fmt(ligne.prix_unitaire_ht ?? 0)}</td>
                        <td className="px-2 py-1.5 text-[11px] font-manrope text-right font-semibold text-[#1a1a2e]">{fmt(ligne.total_ht || (ligne.quantite ?? 0) * (ligne.prix_unitaire_ht ?? 0))}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}

            {/* TOTAUX */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                {(facture.conditions_paiement || facture.notes) && (
                  <div>
                    <h4 className="font-manrope font-semibold text-sm text-[#2563eb] mb-2">Conditions de paiement</h4>
                    <p className="text-sm font-manrope text-[#6b7280] leading-relaxed whitespace-pre-wrap">{facture.conditions_paiement || facture.notes}</p>
                  </div>
                )}
              </div>
              <div>
                <div className="flex justify-between py-2 text-sm font-manrope">
                  <span className="text-[#6b7280]">Total HT</span>
                  <span className="text-[#1a1a2e] font-medium">{fmt(totalHT)}</span>
                </div>
                {Object.entries(tvaGroups).filter(([r]) => Number(r) > 0).sort(([a], [b]) => Number(a) - Number(b)).map(([rate, group]) => (
                  <div key={rate} className="flex justify-between py-1.5 text-sm font-manrope">
                    <span className="text-[#6b7280]">TVA {rate}%</span>
                    <span className="text-[#1a1a2e] font-medium">{fmt(group.tva)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between py-2 text-sm font-manrope">
                  <span className="text-[#1a1a2e] font-bold">Total TTC</span>
                  <span className="text-[#1a1a2e] font-bold">{fmt(totalTTC)}</span>
                </div>
                <div className="bg-[#2563eb] text-white rounded-lg p-3 mt-3 flex justify-between items-center">
                  <span className="font-syne font-bold text-sm">NET À PAYER</span>
                  <span className="font-syne font-bold text-lg">{fmt(totalTTC)}</span>
                </div>
              </div>
            </div>

            {/* MENTIONS LÉGALES — générées automatiquement selon le statut */}
            <div style={{ marginTop: 12, paddingTop: 8, borderTop: '0.5px solid #e5e7eb' }}>
              <p style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Mentions légales</p>
              <div style={{ fontSize: 9, color: '#9ca3af', lineHeight: 1.6 }}>
                {Boolean(entreprise?.assurance_nom || entreprise?.decennale_numero) && (
                  <p>
                    Assurance décennale : {String(entreprise?.assurance_nom || '')}
                    {Boolean(entreprise?.decennale_numero) && ` — n° ${String(entreprise?.decennale_numero)}`}
                    {Boolean(entreprise?.assurance_zone) && ` — Zone : ${String(entreprise?.assurance_zone)}`}
                  </p>
                )}
                {Boolean(entreprise?.franchise_tva) && (
                  <p style={{ fontWeight: 600 }}>TVA non applicable — art. 293 B du CGI.</p>
                )}
                {(entreprise?.forme_juridique === 'EI' || entreprise?.forme_juridique === 'Micro-entreprise') && (
                  <p>{String(entreprise?.nom || '')} — {entreprise?.forme_juridique === 'Micro-entreprise' ? 'Entrepreneur individuel (Micro-entreprise)' : 'Entrepreneur individuel (EI)'}</p>
                )}
                {Boolean(entreprise?.capital_social) && ['EURL', 'SARL', 'SAS', 'SASU'].includes(String(entreprise?.forme_juridique || '')) && (
                  <p>{String(entreprise?.forme_juridique)} au capital de {String(entreprise?.capital_social)}</p>
                )}
                {Boolean(entreprise?.rcs_rm) && <p>{String(entreprise?.rcs_rm)}</p>}
                {Boolean(entreprise?.qualification_pro) && <p>Qualification : {String(entreprise?.qualification_pro)}</p>}
                {Boolean(entreprise?.mediateur) && <p>Médiateur : {String(entreprise?.mediateur)}</p>}
                {Boolean(entreprise?.mentions_legales_custom) && <p>{String(entreprise?.mentions_legales_custom)}</p>}
              </div>
            </div>

            {/* FOOTER COORDONNÉES */}
            <div style={{ marginTop: 16, paddingTop: 10, borderTop: '0.5px solid #e5e7eb', fontSize: 9.5, color: '#9ca3af', textAlign: 'center', lineHeight: 1.7 }}>
              {String(entreprise?.nom || '')} — {String(entreprise?.adresse || '')}, {String(entreprise?.code_postal || '')} {String(entreprise?.ville || '')}
              {Boolean(entreprise?.siret) && ` — SIRET : ${String(entreprise?.siret || '')}`}
              {Boolean(entreprise?.email) && ` — Email : ${String(entreprise?.email || '')}`}
              <br /><span style={{ color: '#d1d5db' }}>Généré via Nexartis — nexartis.fr</span>
            </div>

          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sidebar-col">
          {/* Metadata */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="text-sm font-syne font-bold text-[#0f1a3a] uppercase tracking-wider">Informations</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-manrope text-gray-500">Date de facture</p>
                  <p className="text-sm font-manrope font-medium text-[#1a1a2e]">{formatDate(facture.date_emission || facture.created_at)}</p>
                </div>
              </div>
              {facture.date_echeance && (
                <div className="flex items-start gap-3">
                  <Calendar size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-manrope text-gray-500">Échéance</p>
                    <p className="text-sm font-manrope font-medium text-[#1a1a2e]">{formatDate(facture.date_echeance)}</p>
                  </div>
                </div>
              )}
              {facture.date_envoi && (
                <div className="flex items-start gap-3">
                  <Send size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-manrope text-gray-500">Envoyée le</p>
                    <p className="text-sm font-manrope font-medium text-[#1a1a2e]">{formatDate(facture.date_envoi)}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <User size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-manrope text-gray-500">Client</p>
                  <p className="text-sm font-manrope font-medium text-[#1a1a2e]">{resolvedClientName}</p>
                </div>
              </div>
              {client?.adresse && (
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-manrope text-gray-500">Adresse</p>
                    <p className="text-sm font-manrope font-medium text-[#1a1a2e]">{client.adresse}{client.code_postal ? `, ${client.code_postal}` : ''} {client.ville || ''}</p>
                  </div>
                </div>
              )}
              {client?.telephone && (
                <div className="flex items-start gap-3">
                  <Phone size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-manrope text-gray-500">Téléphone</p>
                    <p className="text-sm font-manrope font-medium text-[#1a1a2e]">{client.telephone}</p>
                  </div>
                </div>
              )}
              {client?.email && (
                <div className="flex items-start gap-3">
                  <Mail size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-manrope text-gray-500">Email</p>
                    <p className="text-sm font-manrope font-medium text-[#1a1a2e]">{client.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Montants */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="text-sm font-syne font-bold text-[#0f1a3a] uppercase tracking-wider">Montants</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-manrope">
                <span className="text-gray-500">Total HT</span>
                <span className="font-medium text-[#1a1a2e]">{fmt(totalHT)}</span>
              </div>
              <div className="flex justify-between text-sm font-manrope">
                <span className="text-gray-500">TVA</span>
                <span className="font-medium text-[#1a1a2e]">{fmt(totalTVA)}</span>
              </div>
              <div className="flex justify-between text-sm font-manrope pt-2 border-t border-gray-100">
                <span className="font-bold text-[#0f1a3a]">Total TTC</span>
                <span className="font-bold text-[#0f1a3a]">{fmt(totalTTC)}</span>
              </div>
            </div>
          </div>

          {/* Payment tracking */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="text-sm font-syne font-bold text-[#0f1a3a] uppercase tracking-wider">Paiements</h3>
            <div>
              <div className="flex justify-between text-sm font-manrope mb-2">
                <span className="text-gray-500">Progression</span>
                <span className={`font-medium ${paymentPercent >= 100 ? 'text-green-600' : 'text-blue-600'}`}>{paymentPercent}%</span>
              </div>
              <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${paymentPercent >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(paymentPercent, 100)}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-manrope">
                <span className="text-gray-500">Total</span>
                <span className="font-medium text-[#1a1a2e]">{fmt(totalTTC)}</span>
              </div>
              <div className="flex justify-between text-sm font-manrope">
                <span className="text-gray-500">Payé</span>
                <span className="font-medium text-green-600">{fmt(totalPaye)}</span>
              </div>
              <div className="flex justify-between text-sm font-manrope">
                <span className="text-gray-500">Reste</span>
                <span className="font-medium text-[#1a1a2e]">{fmt(resteAPayer)}</span>
              </div>
            </div>
            {paymentPercent < 100 && (
              <button onClick={() => setPaymentModalOpen(true)} className="w-full h-9 rounded-lg bg-[#e87a2a] hover:bg-[#f09050] text-white text-sm font-syne font-bold transition-colors">
                Enregistrer un paiement
              </button>
            )}
            {paymentPercent >= 100 && (
              <div className="text-center py-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-manrope font-medium">
                  <CreditCard size={12} /> Intégralement payée
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-[#1a1a2e] text-white px-4 py-2 rounded-lg shadow-lg text-sm font-manrope z-50">{toastMsg}</div>
      )}

      {facture && (
        <EnvoyerFactureModal
          open={sendModalOpen}
          onClose={() => setSendModalOpen(false)}
          factureId={facture.id}
          numeroFacture={facture.numero}
          clientEmail={client?.email || facture.client_email || facture.notes_client?.split(' | ').find((p: string) => p.includes('@')) || devisSource?.notes_client?.split(' | ').find((p: string) => p.includes('@')) || ''}
          clientNom={resolvedClientName}
          montantTTC={fmt(totalTTC)}
          onSuccess={() => {
            setToastMsg('Facture envoyée avec succès !')
            setTimeout(() => { setToastMsg(null); window.location.reload() }, 2000)
          }}
        />
      )}

      {paymentModalOpen && facture && (
        <PaymentModal
          resteAPayer={resteAPayer}
          factureId={facture.id}
          currentPaye={totalPaye}
          totalTTC={totalTTC}
          onClose={() => setPaymentModalOpen(false)}
          onSuccess={() => {
            setToastMsg('Paiement enregistré !')
            setTimeout(() => setToastMsg(null), 3000)
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}

function PaymentModal({
  resteAPayer, factureId, currentPaye, totalTTC, onClose, onSuccess,
}: {
  resteAPayer: number; factureId: string; currentPaye: number; totalTTC: number; onClose: () => void; onSuccess: () => void
}) {
  const [montant, setMontant] = useState(resteAPayer.toFixed(2))
  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().split('T')[0])
  const [mode, setMode] = useState('Virement')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    const amount = parseFloat(montant)
    if (isNaN(amount) || amount <= 0) { setError('Montant invalide'); return }
    setSaving(true); setError(null)
    try {
      const newPaye = currentPaye + amount
      const newStatut = newPaye >= totalTTC ? 'payee' : 'partielle'
      await updateRow('factures', factureId, {
        montant_paye: Math.min(newPaye, totalTTC),
        date_paiement: datePaiement,
        mode_paiement: mode,
        statut: newStatut,
      })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
      setSaving(false)
    }
  }

  const fmtLocal = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-syne font-bold text-xl text-[#1a1a2e]">Enregistrer un paiement</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between text-sm font-manrope">
            <span className="text-gray-500">Reste à payer</span>
            <span className="font-bold text-[#1a1a2e]">{fmtLocal(resteAPayer)}</span>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Montant reçu</label>
            <input type="number" step="0.01" value={montant} onChange={(e) => setMontant(e.target.value)} className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope outline-none focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0]" />
          </div>
          <div>
            <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Date de paiement</label>
            <input type="date" value={datePaiement} onChange={(e) => setDatePaiement(e.target.value)} className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope outline-none focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0]" />
          </div>
          <div>
            <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Mode de paiement</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)} className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope outline-none focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0]">
              <option>Virement</option>
              <option>Chèque</option>
              <option>Espèces</option>
              <option>Carte bancaire</option>
            </select>
          </div>
        </div>
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-sm text-red-600 font-manrope">{error}</p>
          </div>
        )}
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose} className="h-10 px-6 rounded-lg border border-gray-200 text-sm font-manrope hover:bg-gray-50">Annuler</button>
          <button onClick={handleConfirm} disabled={saving} className="h-10 px-6 rounded-lg bg-[#e87a2a] text-white text-sm font-syne font-bold hover:bg-[#f09050] disabled:opacity-50 flex items-center gap-2">
            {saving ? 'Enregistrement...' : 'Confirmer le paiement'}
          </button>
        </div>
      </div>
    </div>
  )
}
