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

// -------------------------------------------------------------------
// Demo Data
// -------------------------------------------------------------------

const FACTURE_DATA = {
  id: '067',
  numero: 'F2026-067',
  statut: 'Encaissée' as const,
  client: {
    nom: 'Mme Martin',
    adresse: '12 rue des Lilas, 33000 Bordeaux',
    telephone: '06 12 34 56 78',
    email: 'martin.claire@email.fr',
  },
  chantier: 'Plomberie complète',
  dateFacture: '28/03/2026',
  dateEcheance: '28/04/2026',
  modifie: '06/04/2026',
  entreprise: {
    nom: 'Artidoc SARL',
    adresse: '45 avenue des Arts, 33700 Mérignac',
    siret: '123 456 789 00012',
    tva: 'FR12 345678900',
    telephone: '05 56 00 00 00',
  },
  lignes: [
    { designation: 'Dépose sanitaires existants', unite: 'forfait', quantite: 1, prixUnitaire: 450, totalHT: 450 },
    { designation: 'Fourniture et pose baignoire îlot', unite: 'u', quantite: 1, prixUnitaire: 1800, totalHT: 1800 },
    { designation: 'Tuyauterie cuivre DN15', unite: 'ml', quantite: 12, prixUnitaire: 45, totalHT: 540 },
    { designation: 'Raccordement évacuation PVC', unite: 'forfait', quantite: 1, prixUnitaire: 380, totalHT: 380 },
    { designation: 'Robinetterie thermostatique', unite: 'u', quantite: 2, prixUnitaire: 285, totalHT: 570 },
    { designation: 'Main d\'oeuvre installation', unite: 'h', quantite: 16, prixUnitaire: 55, totalHT: 880 },
    { designation: 'Finitions et tests étanchéité', unite: 'forfait', quantite: 1, prixUnitaire: 180, totalHT: 180 },
  ],
  totalHT: 4800,
  tva: 480,
  totalTTC: 5280,
  paiements: [
    { date: '02/04/2026', montant: 2640, mode: 'Virement', reference: 'VIR-2026-0412' },
    { date: '06/04/2026', montant: 2640, mode: 'Chèque', reference: 'CHQ-8834' },
  ],
  totalPaye: 5280,
  resteAPayer: 0,
}

const STATUT_STYLES = {
  Encaissée: 'bg-green-50 text-green-700 border-green-200',
  'Partiellement payée': 'bg-blue-50 text-blue-700 border-blue-200',
  'En attente': 'bg-orange-50 text-orange-700 border-orange-200',
  'En retard': 'bg-red-50 text-red-700 border-red-200',
}

// -------------------------------------------------------------------
// Page
// -------------------------------------------------------------------

export default function FactureDetailPage() {
  const params = useParams()
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const facture = FACTURE_DATA

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
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-manrope font-medium border ${STATUT_STYLES[facture.statut]}`}>
                {facture.statut}
              </span>
            </div>
            <p className="text-sm font-manrope text-gray-500 mt-1">
              {facture.client.nom} &mdash; {facture.chantier}
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
                <h2 className="text-lg font-syne font-bold text-[#0f1a3a]">{facture.entreprise.nom}</h2>
                <p className="text-sm font-manrope text-gray-500 mt-1">{facture.entreprise.adresse}</p>
                <p className="text-sm font-manrope text-gray-500">SIRET : {facture.entreprise.siret}</p>
                <p className="text-sm font-manrope text-gray-500">TVA : {facture.entreprise.tva}</p>
                <p className="text-sm font-manrope text-gray-500">Tél : {facture.entreprise.telephone}</p>
              </div>
              <div className="text-right">
                <h3 className="text-2xl font-syne font-bold text-[#0f1a3a]">FACTURE</h3>
                <p className="text-sm font-manrope text-gray-600 mt-1">N° {facture.numero}</p>
                <p className="text-sm font-manrope text-gray-600">Date : {facture.dateFacture}</p>
                <p className="text-sm font-manrope text-gray-600">Échéance : {facture.dateEcheance}</p>
              </div>
            </div>

            {/* Client */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-xs font-manrope text-gray-500 uppercase tracking-wider mb-1">Facturé à</p>
              <p className="text-sm font-manrope font-semibold text-[#1a1a2e]">{facture.client.nom}</p>
              <p className="text-sm font-manrope text-gray-600">{facture.client.adresse}</p>
            </div>

            {/* Objet */}
            <p className="text-sm font-manrope text-gray-600 mb-4">
              <span className="font-medium text-[#1a1a2e]">Objet :</span> {facture.chantier}
            </p>

            {/* Lines table */}
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
                {facture.lignes.map((ligne, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2.5 text-sm font-manrope text-[#1a1a2e]">{ligne.designation}</td>
                    <td className="py-2.5 text-sm font-manrope text-gray-500 text-center">{ligne.unite}</td>
                    <td className="py-2.5 text-sm font-manrope text-gray-500 text-center">{ligne.quantite}</td>
                    <td className="py-2.5 text-sm font-manrope text-gray-600 text-right">{ligne.prixUnitaire.toLocaleString('fr-FR')} €</td>
                    <td className="py-2.5 text-sm font-manrope font-medium text-[#1a1a2e] text-right">{ligne.totalHT.toLocaleString('fr-FR')} €</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm font-manrope">
                  <span className="text-gray-500">Total HT</span>
                  <span className="text-[#1a1a2e] font-medium">{facture.totalHT.toLocaleString('fr-FR')} €</span>
                </div>
                <div className="flex justify-between text-sm font-manrope">
                  <span className="text-gray-500">TVA (10%)</span>
                  <span className="text-[#1a1a2e] font-medium">{facture.tva.toLocaleString('fr-FR')} €</span>
                </div>
                <div className="flex justify-between text-sm font-manrope pt-2 border-t-2 border-[#0f1a3a]">
                  <span className="font-bold text-[#0f1a3a]">Total TTC</span>
                  <span className="font-bold text-[#0f1a3a] text-lg">{facture.totalTTC.toLocaleString('fr-FR')} €</span>
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
                  <p className="text-sm font-manrope font-medium text-[#1a1a2e]">{facture.dateFacture}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-manrope text-gray-500">Échéance</p>
                  <p className="text-sm font-manrope font-medium text-[#1a1a2e]">{facture.dateEcheance}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-manrope text-gray-500">Client</p>
                  <p className="text-sm font-manrope font-medium text-[#1a1a2e]">{facture.client.nom}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-manrope text-gray-500">Adresse</p>
                  <p className="text-sm font-manrope font-medium text-[#1a1a2e]">{facture.client.adresse}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-manrope text-gray-500">Téléphone</p>
                  <p className="text-sm font-manrope font-medium text-[#1a1a2e]">{facture.client.telephone}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-manrope text-gray-500">Email</p>
                  <p className="text-sm font-manrope font-medium text-[#1a1a2e]">{facture.client.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-manrope text-gray-500">Chantier</p>
                  <p className="text-sm font-manrope font-medium text-[#1a1a2e]">{facture.chantier}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Montants */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="text-sm font-syne font-bold text-[#0f1a3a] uppercase tracking-wider">Montants</h3>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-manrope">
                <span className="text-gray-500">Total HT</span>
                <span className="font-medium text-[#1a1a2e]">{facture.totalHT.toLocaleString('fr-FR')} €</span>
              </div>
              <div className="flex justify-between text-sm font-manrope">
                <span className="text-gray-500">TVA</span>
                <span className="font-medium text-[#1a1a2e]">{facture.tva.toLocaleString('fr-FR')} €</span>
              </div>
              <div className="flex justify-between text-sm font-manrope pt-2 border-t border-gray-100">
                <span className="font-bold text-[#0f1a3a]">Total TTC</span>
                <span className="font-bold text-[#0f1a3a]">{facture.totalTTC.toLocaleString('fr-FR')} €</span>
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
                <span className="font-medium text-green-600">100%</span>
              </div>
              <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-manrope">
                <span className="text-gray-500">Total</span>
                <span className="font-medium text-[#1a1a2e]">{facture.totalTTC.toLocaleString('fr-FR')} €</span>
              </div>
              <div className="flex justify-between text-sm font-manrope">
                <span className="text-gray-500">Payé</span>
                <span className="font-medium text-green-600">{facture.totalPaye.toLocaleString('fr-FR')} €</span>
              </div>
              <div className="flex justify-between text-sm font-manrope">
                <span className="text-gray-500">Reste</span>
                <span className="font-medium text-[#1a1a2e]">{facture.resteAPayer.toLocaleString('fr-FR')} €</span>
              </div>
            </div>

            {/* Paiement history */}
            <div className="pt-3 border-t border-gray-100 space-y-2">
              {facture.paiements.map((p, i) => (
                <div key={i} className="flex items-center gap-3 text-sm font-manrope">
                  <CreditCard size={14} className="text-green-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-[#1a1a2e] font-medium">{p.montant.toLocaleString('fr-FR')} € &mdash; {p.mode}</p>
                    <p className="text-xs text-gray-500">{p.date} &bull; {p.reference}</p>
                  </div>
                </div>
              ))}
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
