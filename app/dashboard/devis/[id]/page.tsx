'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ChevronDown,
  Pencil,
  Copy,
  SendHorizonal,
  Download,
  FileText,
  MoreHorizontal,
} from 'lucide-react'

// -------------------------------------------------------------------
// Types & Data
// -------------------------------------------------------------------

interface LineItem {
  designation: string
  qty: number
  unit: string
  priceHT: number
  tva: number
}

const DEMO_LINES: LineItem[] = [
  { designation: 'Fourniture et pose chauffe-eau thermodynamique 200L', qty: 1, unit: 'U', priceHT: 650, tva: 10 },
  { designation: 'Dépose ancien chauffe-eau + évacuation', qty: 1, unit: 'Fft', priceHT: 180, tva: 10 },
  { designation: 'Remplacement robinetterie', qty: 3, unit: 'U', priceHT: 85, tva: 10 },
  { designation: 'Débouchage canalisation', qty: 1, unit: 'Fft', priceHT: 220, tva: 20 },
]

const HISTORY = [
  { date: '07/04/2026 14:30', text: 'Devis créé' },
  { date: '07/04/2026 14:45', text: 'Envoyé par email à jean.dupont@email.fr' },
  { date: '08/04/2026 09:12', text: 'Consulté par le client' },
]

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function formatCurrency(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

// -------------------------------------------------------------------
// Page
// -------------------------------------------------------------------

export default function DevisDetailPage() {
  const [actionsOpen, setActionsOpen] = useState(false)

  // Computations
  const tvaGroups: Record<number, { ht: number; tva: number }> = {}
  let totalHT = 0

  DEMO_LINES.forEach((l) => {
    const lineTotal = l.qty * l.priceHT
    totalHT += lineTotal
    if (!tvaGroups[l.tva]) tvaGroups[l.tva] = { ht: 0, tva: 0 }
    tvaGroups[l.tva].ht += lineTotal
    tvaGroups[l.tva].tva += lineTotal * (l.tva / 100)
  })

  const totalTVA = Object.values(tvaGroups).reduce((s, g) => s + g.tva, 0)
  const totalTTC = totalHT + totalTVA

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/devis" className="p-1.5 rounded-md hover:bg-gray-100 transition-colors">
            <ArrowLeft size={18} className="text-[#6b7280]" />
          </Link>
          <h1 className="font-syne font-bold text-xl text-[#1a1a2e]">Devis D2026-089</h1>
          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-manrope font-medium bg-blue-50 text-blue-700">
            Envoyé
          </span>
        </div>

        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => setActionsOpen(!actionsOpen)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-syne font-bold bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[#1a1a2e]"
          >
            Actions
            <ChevronDown size={14} />
          </button>
          {actionsOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20">
              {[
                { label: 'Modifier', icon: Pencil },
                { label: 'Dupliquer', icon: Copy },
                { label: 'Envoyer', icon: SendHorizonal },
                { label: 'Télécharger PDF', icon: Download },
                { label: 'Transformer en facture', icon: FileText },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => setActionsOpen(false)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-manrope text-[#1a1a2e] hover:bg-gray-50 transition-colors"
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
        {/* Main — preview card */}
        <div className="flex-1 min-w-0">
          <div className="bg-white shadow-xl rounded-xl p-8 lg:p-12">
            {/* Company / Devis header */}
            <div className="flex justify-between items-start mb-10">
              <div>
                <h2 className="font-syne font-bold text-xl text-[#0f1a3a]">SARL Plomberie Martin</h2>
                <p className="text-sm font-manrope text-[#6b7280] mt-1 leading-relaxed">
                  15 rue des Artisans<br />
                  33000 Bordeaux<br />
                  SIRET : 123 456 789 00012<br />
                  Tél. : 05 56 00 00 00
                </p>
              </div>
              <div className="text-right">
                <h3 className="font-syne font-bold text-lg text-[#0f1a3a]">DEVIS N° D2026-089</h3>
                <p className="text-sm font-manrope text-[#6b7280] mt-1">
                  Date : 07/04/2026<br />
                  Validité : 07/05/2026<br />
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">Envoyé</span>
                </p>
              </div>
            </div>

            {/* Client */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs font-manrope font-semibold uppercase tracking-wider text-[#6b7280] mb-1">Client</p>
              <p className="text-sm font-manrope text-[#1a1a2e] font-medium">M. Jean Dupont</p>
              <p className="text-sm font-manrope text-[#6b7280]">45 allée des Pins, 33700 Mérignac</p>
            </div>

            {/* Table */}
            <table className="w-full mb-8">
              <thead>
                <tr className="bg-[#5ab4e0] text-white">
                  <th className="px-3 py-2.5 text-left text-xs font-manrope font-semibold uppercase">N°</th>
                  <th className="px-3 py-2.5 text-left text-xs font-manrope font-semibold uppercase">Désignation</th>
                  <th className="px-3 py-2.5 text-center text-xs font-manrope font-semibold uppercase">Qté</th>
                  <th className="px-3 py-2.5 text-center text-xs font-manrope font-semibold uppercase">Unité</th>
                  <th className="px-3 py-2.5 text-right text-xs font-manrope font-semibold uppercase">Prix U. HT</th>
                  <th className="px-3 py-2.5 text-center text-xs font-manrope font-semibold uppercase">TVA</th>
                  <th className="px-3 py-2.5 text-right text-xs font-manrope font-semibold uppercase">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_LINES.map((l, i) => (
                  <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                    <td className="px-3 py-2.5 text-sm font-manrope text-[#6b7280]">{i + 1}</td>
                    <td className="px-3 py-2.5 text-sm font-manrope text-[#1a1a2e]">{l.designation}</td>
                    <td className="px-3 py-2.5 text-sm font-manrope text-center text-[#1a1a2e]">{l.qty}</td>
                    <td className="px-3 py-2.5 text-sm font-manrope text-center text-[#6b7280]">{l.unit}</td>
                    <td className="px-3 py-2.5 text-sm font-manrope text-right text-[#1a1a2e]">{formatCurrency(l.priceHT)}</td>
                    <td className="px-3 py-2.5 text-sm font-manrope text-center text-[#6b7280]">{l.tva}%</td>
                    <td className="px-3 py-2.5 text-sm font-manrope text-right font-semibold text-[#1a1a2e]">{formatCurrency(l.qty * l.priceHT)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-72">
                <div className="flex justify-between py-2 text-sm font-manrope">
                  <span className="text-[#6b7280]">Total HT</span>
                  <span className="text-[#1a1a2e] font-medium">{formatCurrency(totalHT)}</span>
                </div>
                {Object.entries(tvaGroups)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([rate, group]) => (
                    <div key={rate} className="flex justify-between py-2 text-sm font-manrope">
                      <span className="text-[#6b7280]">TVA {rate}%</span>
                      <span className="text-[#1a1a2e] font-medium">{formatCurrency(group.tva)}</span>
                    </div>
                  ))}
                <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between py-2 text-sm font-manrope">
                  <span className="text-[#6b7280]">Total TTC</span>
                  <span className="text-[#1a1a2e] font-medium">{formatCurrency(totalTTC)}</span>
                </div>
                <div className="bg-[#5ab4e0] text-white rounded-lg p-3 mt-3 flex justify-between items-center">
                  <span className="font-syne font-bold text-sm">NET A PAYER</span>
                  <span className="font-syne font-bold text-lg">{formatCurrency(totalTTC)}</span>
                </div>
              </div>
            </div>

            {/* Conditions */}
            <div className="mb-8">
              <h4 className="font-manrope font-semibold text-sm text-[#1a1a2e] mb-2">Conditions de paiement</h4>
              <p className="text-sm font-manrope text-[#6b7280]">30% à la commande, solde à la réception des travaux</p>
            </div>

            {/* Signature zone */}
            <div className="grid grid-cols-2 gap-6 mt-10">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <p className="text-sm font-manrope text-[#6b7280]">Signature du client</p>
                <div className="h-20" />
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <p className="text-sm font-manrope text-[#6b7280]">Bon pour accord</p>
                <div className="h-20" />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-6 lg:sticky lg:top-24 lg:self-start">
          {/* Metadata card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-manrope text-[#6b7280]">Statut</span>
              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-manrope font-medium bg-blue-50 text-blue-700">
                Envoyé
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-manrope text-[#6b7280]">Client</span>
              <span className="text-sm font-manrope font-medium text-[#1a1a2e]">M. Jean Dupont</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-manrope text-[#6b7280]">Chantier</span>
              <span className="text-sm font-manrope font-medium text-[#1a1a2e]">Rénovation salle de bain</span>
            </div>
            <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
              <span className="text-sm font-manrope text-[#6b7280]">Créé le</span>
              <span className="text-sm font-manrope text-[#1a1a2e]">07/04/2026</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-manrope text-[#6b7280]">Modifié le</span>
              <span className="text-sm font-manrope text-[#1a1a2e]">07/04/2026</span>
            </div>
            <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
              <span className="text-sm font-manrope text-[#6b7280]">Total TTC</span>
              <span className="text-lg font-syne font-bold text-[#1a1a2e]">{formatCurrency(totalTTC)}</span>
            </div>
          </div>

          {/* History card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-syne font-bold text-sm text-[#1a1a2e] mb-4">Historique</h3>
            <div className="space-y-0">
              {HISTORY.map((event, i) => (
                <div key={i} className="flex gap-3">
                  {/* Timeline dot + line */}
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${
                      i === 0 ? 'bg-[#5ab4e0]' : 'bg-gray-300'
                    }`} />
                    {i < HISTORY.length - 1 && (
                      <div className="w-px flex-1 bg-gray-200 my-1" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="pb-4">
                    <p className="text-xs font-manrope text-[#6b7280]">{event.date}</p>
                    <p className="text-sm font-manrope text-[#1a1a2e]">{event.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
