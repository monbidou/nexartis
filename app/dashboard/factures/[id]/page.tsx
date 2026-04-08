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
  Building,
} from 'lucide-react'
import {
  useSupabaseRecord,
  useFactureLignes,
  useEntreprise,
  LoadingSkeleton,
} from '@/lib/hooks'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface FactureRecord {
  id: string
  numero: string
  statut: string
  client_id: string
  chantier_id?: string
  date_facture?: string
  date_echeance?: string
  total_ht?: number
  total_tva?: number
  total_ttc?: number
  total_paye?: number
  created_at: string
  updated_at?: string
}

interface ClientRecord {
  id: string
  nom: string
  adresse?: string
  telephone?: string
  email?: string
}

interface LigneRecord {
  id: string
  designation: string
  unite: string
  quantite: number
  prix_unitaire_ht: number
  total_ht: number
  ordre: number
}

const STATUT_STYLES: Record<string, string> = {
  'Encaissée': 'bg-green-50 text-green-700 border-green-200',
  'Partiellement payée': 'bg-blue-50 text-blue-700 border-blue-200',
  'En attente': 'bg-orange-50 text-orange-700 border-orange-200',
  'En retard': 'bg-red-50 text-red-700 border-red-200',
}

// -------------------------------------------------------------------
// Page
// -------------------------------------------------------------------

export default function FactureDetailPage() {
  const params = useParams()
  const id = params.id as string

  const { data: facture, loading: loadingFacture } = useSupabaseRecord<FactureRecord>('factures', id)
  const { data: lignesRaw, loading: loadingLignes } = useFactureLignes(id)
  const { data: client, loading: loadingClient } = useSupabaseRecord<ClientRecord>('clients', facture?.client_id ?? null)
  const { entreprise } = useEntreprise()

  const [activeAction, setActiveAction] = useState<string | null>(null)

  const loading = loadingFacture || loadingLignes || loadingClient

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton rows={8} />
      </div>
    )
  }

  if (!facture) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/factures"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors inline-flex items-center gap-2 text-sm text-gray-500"
        >
          <ArrowLeft size={20} /> Retour
        </Link>
        <p className="text-sm font-manrope text-gray-500">Facture introuvable.</p>
      </div>
    )
  }

  const lignes = lignesRaw as unknown as LigneRecord[]
  const totalHT = facture.total_ht ?? lignes.reduce((s, l) => s + (l.total_ht ?? 0), 0)
  const totalTVA = facture.total_tva ?? 0
  const totalTTC = facture.total_ttc ?? totalHT + totalTVA
  const totalPaye = facture.total_paye ?? 0
  const resteAPayer = totalTTC - totalPaye
  const paymentPercent = totalTTC > 0 ? Math.round((totalPaye / totalTTC) * 100) : 0

  const statutStyle = STATUT_STYLES[facture.statut] ?? 'bg-gray-100 text-gray-600 border-gray-200'

  function formatDate(d: string | undefined) {
    if (!d) return ''
    return new Date(d).toLocaleDateString('fr-FR')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/factures"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-syne font-bold text-[#0f1a3a]">
                Facture {facture.numero}
              </h1>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-manrope font-medium border ${statutStyle}`}>
                {facture.statut}
              </span>
            </div>
            <p className="text-sm font-manrope text-gray-500 mt-1">
              {client?.nom ?? 'Client inconnu'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-manrope text-[#1a1a2e] transition-colors">
            <Download size={14} />
            Télécharger PDF
          </button>
          <button className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-manrope text-[#1a1a2e] transition-colors">
            <Send size={14} />
            Envoyer
          </button>
          <button className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-manrope text-[#1a1a2e] transition-colors">
            <RotateCcw size={14} />
            Avoir
          </button>
          <button className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 text-sm font-manrope text-orange-700 transition-colors">
            <AlertTriangle size={14} />
            Relancer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main: Invoice preview */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            {/* Invoice header */}
            <div className="flex justify-between mb-8">
              <div>
                {Boolean(entreprise?.logo_url) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entreprise?.logo_url as string} alt="Logo" className="h-10 w-auto object-contain mb-2" />
                )}
                <h2 className="text-lg font-syne font-bold text-[#0f1a3a]">{(entreprise?.nom as string) || 'Mon Entreprise'}</h2>
                <p className="text-sm font-manrope text-gray-500 mt-1">
                  {Boolean(entreprise?.adresse) && <>{entreprise?.adresse as string}, </>}
                  {(entreprise?.code_postal as string) || ''} {(entreprise?.ville as string) || ''}
                </p>
              </div>
              <div className="text-right">
                <h3 className="text-2xl font-syne font-bold text-[#0f1a3a]">FACTURE</h3>
                <p className="text-sm font-manrope text-gray-600 mt-1">N° {facture.numero}</p>
                <p className="text-sm font-manrope text-gray-600">Date : {formatDate(facture.date_facture || facture.created_at)}</p>
                {facture.date_echeance && (
                  <p className="text-sm font-manrope text-gray-600">Échéance : {formatDate(facture.date_echeance)}</p>
                )}
              </div>
            </div>

            {/* Client */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-xs font-manrope text-gray-500 uppercase tracking-wider mb-1">Facturé à</p>
              <p className="text-sm font-manrope font-semibold text-[#1a1a2e]">{client?.nom ?? 'N/A'}</p>
              {client?.adresse && <p className="text-sm font-manrope text-gray-600">{client.adresse}</p>}
            </div>

            {/* Lines table */}
            {lignes.length > 0 && (
              <table className="w-full mb-6">
                <thead>
                  <tr className="border-b-2 border-[#0f1a3a]">
                    <th className="text-left py-2 text-xs font-manrope font-semibold uppercase text-gray-500">Désignation</th>
                    <th className="text-center py-2 text-xs font-manrope font-semibold uppercase text-gray-500">Unité</th>
                    <th className="text-center py-2 text-xs font-manrope font-semibold uppercase text-gray-500">Qté</th>
                    <th className="text-right py-2 text-xs font-manrope font-semibold uppercase text-gray-500">P.U. HT</th>
                    <th className="text-right py-2 text-xs font-manrope font-semibold uppercase text-gray-500">Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((ligne, i) => (
                    <tr key={ligne.id ?? i} className="border-b border-gray-100">
                      <td className="py-2.5 text-sm font-manrope text-[#1a1a2e]">{ligne.designation}</td>
                      <td className="py-2.5 text-sm font-manrope text-gray-500 text-center">{ligne.unite}</td>
                      <td className="py-2.5 text-sm font-manrope text-gray-500 text-center">{ligne.quantite}</td>
                      <td className="py-2.5 text-sm font-manrope text-gray-600 text-right">{(ligne.prix_unitaire_ht ?? 0).toLocaleString('fr-FR')} \u20ac</td>
                      <td className="py-2.5 text-sm font-manrope font-medium text-[#1a1a2e] text-right">{(ligne.total_ht ?? 0).toLocaleString('fr-FR')} \u20ac</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm font-manrope">
                  <span className="text-gray-500">Total HT</span>
                  <span className="text-[#1a1a2e] font-medium">{totalHT.toLocaleString('fr-FR')} \u20ac</span>
                </div>
                <div className="flex justify-between text-sm font-manrope">
                  <span className="text-gray-500">TVA</span>
                  <span className="text-[#1a1a2e] font-medium">{totalTVA.toLocaleString('fr-FR')} \u20ac</span>
                </div>
                <div className="flex justify-between text-sm font-manrope pt-2 border-t-2 border-[#0f1a3a]">
                  <span className="font-bold text-[#0f1a3a]">Total TTC</span>
                  <span className="font-bold text-[#0f1a3a] text-lg">{totalTTC.toLocaleString('fr-FR')} \u20ac</span>
                </div>
              </div>
            </div>

            {/* Payment info */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs font-manrope text-gray-500">
                Conditions de règlement : 30 jours date de facture. En cas de retard de paiement, une pénalité de 3 fois le taux d&apos;intérêt légal sera appliquée.
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Metadata */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="text-sm font-syne font-bold text-[#0f1a3a] uppercase tracking-wider">Informations</h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-manrope text-gray-500">Date de facture</p>
                  <p className="text-sm font-manrope font-medium text-[#1a1a2e]">{formatDate(facture.date_facture || facture.created_at)}</p>
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
              <div className="flex items-start gap-3">
                <User size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-manrope text-gray-500">Client</p>
                  <p className="text-sm font-manrope font-medium text-[#1a1a2e]">{client?.nom ?? 'N/A'}</p>
                </div>
              </div>
              {client?.adresse && (
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-manrope text-gray-500">Adresse</p>
                    <p className="text-sm font-manrope font-medium text-[#1a1a2e]">{client.adresse}</p>
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
                <span className="font-medium text-[#1a1a2e]">{totalHT.toLocaleString('fr-FR')} \u20ac</span>
              </div>
              <div className="flex justify-between text-sm font-manrope">
                <span className="text-gray-500">TVA</span>
                <span className="font-medium text-[#1a1a2e]">{totalTVA.toLocaleString('fr-FR')} \u20ac</span>
              </div>
              <div className="flex justify-between text-sm font-manrope pt-2 border-t border-gray-100">
                <span className="font-bold text-[#0f1a3a]">Total TTC</span>
                <span className="font-bold text-[#0f1a3a]">{totalTTC.toLocaleString('fr-FR')} \u20ac</span>
              </div>
            </div>
          </div>

          {/* Payment tracking */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="text-sm font-syne font-bold text-[#0f1a3a] uppercase tracking-wider">Paiements</h3>

            {/* Progress */}
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
                <span className="font-medium text-[#1a1a2e]">{totalTTC.toLocaleString('fr-FR')} \u20ac</span>
              </div>
              <div className="flex justify-between text-sm font-manrope">
                <span className="text-gray-500">Payé</span>
                <span className="font-medium text-green-600">{totalPaye.toLocaleString('fr-FR')} \u20ac</span>
              </div>
              <div className="flex justify-between text-sm font-manrope">
                <span className="text-gray-500">Reste</span>
                <span className="font-medium text-[#1a1a2e]">{resteAPayer.toLocaleString('fr-FR')} \u20ac</span>
              </div>
            </div>

            <button className="w-full h-9 rounded-lg bg-[#e87a2a] hover:bg-[#f09050] text-white text-sm font-syne font-bold transition-colors">
              Enregistrer un paiement
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
