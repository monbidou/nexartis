'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  GripVertical,
  Trash2,
  Plus,
  ChevronDown,
  ArrowLeft,
} from 'lucide-react'

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
}

interface Client {
  id: string
  name: string
  address: string
}

// -------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------

const UNITS = ['m²', 'ml', 'U', 'h', 'Fft', 'kg', 'ens']
const TVA_RATES = [5.5, 10, 20]

const DEMO_CLIENTS: Client[] = [
  { id: '1', name: 'M. Jean Dupont', address: '45 allée des Pins, 33700 Mérignac' },
  { id: '2', name: 'Mme Sophie Martin', address: '12 rue des Lilas, 33000 Bordeaux' },
  { id: '3', name: 'M. Pierre Bernard', address: '8 avenue Thiers, 33100 Bordeaux' },
  { id: '4', name: 'Mme Claire Girard', address: '22 rue Sainte-Catherine, 33000 Bordeaux' },
  { id: '5', name: 'SARL Renov33', address: '150 cours de la Marne, 33800 Bordeaux' },
]

const INITIAL_LINES: LineItem[] = [
  { id: 1, designation: 'Fourniture et pose chauffe-eau thermodynamique 200L', qty: 1, unit: 'U', priceHT: 650, tva: 10 },
  { id: 2, designation: 'Dépose ancien chauffe-eau + évacuation', qty: 1, unit: 'Fft', priceHT: 180, tva: 10 },
  { id: 3, designation: 'Remplacement robinetterie', qty: 3, unit: 'U', priceHT: 85, tva: 10 },
  { id: 4, designation: 'Débouchage canalisation', qty: 1, unit: 'Fft', priceHT: 220, tva: 20 },
]

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function formatCurrency(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

let nextId = 100

// -------------------------------------------------------------------
// Page
// -------------------------------------------------------------------

export default function NouveauDevisPage() {
  const [showPreview, setShowPreview] = useState(false)
  const [lines, setLines] = useState<LineItem[]>(INITIAL_LINES)
  const [selectedClient, setSelectedClient] = useState<Client | null>(DEMO_CLIENTS[0])
  const [clientSearch, setClientSearch] = useState('')
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)
  const [showDescription, setShowDescription] = useState(false)
  const [description, setDescription] = useState('')
  const [dateDevis, setDateDevis] = useState('2026-04-07')
  const [dateValidite, setDateValidite] = useState('2026-05-07')
  const [dateTravaux, setDateTravaux] = useState('')
  const [duree, setDuree] = useState('')
  const [conditions, setConditions] = useState('30% à la commande, solde à la réception des travaux')
  const [paymentMethods, setPaymentMethods] = useState({ cheque: true, virement: true, cb: false })
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState('')

  // --- Line operations ---
  function updateLine(id: number, field: keyof LineItem, value: string | number) {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    )
  }

  function removeLine(id: number) {
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

  function addLine(defaults?: Partial<LineItem>) {
    const newLine: LineItem = {
      id: nextId++,
      designation: '',
      qty: 1,
      unit: 'U',
      priceHT: 0,
      tva: 10,
      ...defaults,
    }
    setLines((prev) => [...prev, newLine])
  }

  // --- Computations ---
  const tvaGroups: Record<number, { ht: number; tva: number }> = {}
  let totalHT = 0

  lines.forEach((l) => {
    const lineTotal = l.qty * l.priceHT
    totalHT += lineTotal
    if (!tvaGroups[l.tva]) tvaGroups[l.tva] = { ht: 0, tva: 0 }
    tvaGroups[l.tva].ht += lineTotal
    tvaGroups[l.tva].tva += lineTotal * (l.tva / 100)
  })

  const totalTVA = Object.values(tvaGroups).reduce((s, g) => s + g.tva, 0)
  const totalTTC = totalHT + totalTVA

  // --- Filtered clients ---
  const filteredClients = DEMO_CLIENTS.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  )

  // ===================================================================
  // PREVIEW MODE
  // ===================================================================
  if (showPreview) {
    return (
      <div className="min-h-screen">
        {/* Top bar */}
        <TopBar showPreview={showPreview} setShowPreview={setShowPreview} />

        <div className="p-6 flex justify-center">
          <div className="max-w-[800px] w-full bg-white shadow-xl rounded-xl p-12">
            {/* Header */}
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
                <h3 className="font-syne font-bold text-lg text-[#0f1a3a]">DEVIS N° D2026-090</h3>
                <p className="text-sm font-manrope text-[#6b7280] mt-1">
                  Date : {new Date(dateDevis).toLocaleDateString('fr-FR')}<br />
                  Validité : {new Date(dateValidite).toLocaleDateString('fr-FR')}<br />
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">Brouillon</span>
                </p>
              </div>
            </div>

            {/* Client */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs font-manrope font-semibold uppercase tracking-wider text-[#6b7280] mb-1">Client</p>
              <p className="text-sm font-manrope text-[#1a1a2e] font-medium">
                {selectedClient ? selectedClient.name : 'Non sélectionné'}
              </p>
              {selectedClient && (
                <p className="text-sm font-manrope text-[#6b7280]">{selectedClient.address}</p>
              )}
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
                {lines.map((l, i) => (
                  <tr key={l.id} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
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
              <p className="text-sm font-manrope text-[#6b7280]">{conditions}</p>
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
      </div>
    )
  }

  // ===================================================================
  // EDIT MODE
  // ===================================================================
  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <TopBar showPreview={showPreview} setShowPreview={setShowPreview} />

      <div className="p-6">
        {/* Document header — 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div>
              <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Numéro</label>
              <input
                type="text"
                readOnly
                value="D2026-090"
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope bg-gray-50 text-[#6b7280] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Date</label>
              <input
                type="date"
                value={dateDevis}
                onChange={(e) => setDateDevis(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope outline-none focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Valable jusqu&apos;au</label>
              <input
                type="date"
                value={dateValidite}
                onChange={(e) => setDateValidite(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope outline-none focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Début des travaux</label>
              <input
                type="date"
                value={dateTravaux}
                onChange={(e) => setDateTravaux(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope outline-none focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Durée estimée</label>
              <input
                type="text"
                value={duree}
                onChange={(e) => setDuree(e.target.value)}
                placeholder="Ex. : 3 jours"
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope outline-none focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] transition-colors placeholder:text-gray-400"
              />
            </div>
            {!showDescription ? (
              <button
                onClick={() => setShowDescription(true)}
                className="text-sm font-manrope text-[#5ab4e0] hover:underline"
              >
                + Ajouter une description
              </button>
            ) : (
              <div>
                <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-manrope outline-none focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] transition-colors resize-none"
                />
              </div>
            )}
          </div>

          {/* Right card — Client */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div>
              <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Client</label>
              <div className="relative">
                <input
                  type="text"
                  value={selectedClient ? '' : clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value)
                    setSelectedClient(null)
                    setClientDropdownOpen(true)
                  }}
                  onFocus={() => setClientDropdownOpen(true)}
                  placeholder="Rechercher un client..."
                  className={`w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope outline-none focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] transition-colors ${selectedClient ? 'hidden' : ''}`}
                />
                {selectedClient && (
                  <button
                    onClick={() => {
                      setSelectedClient(null)
                      setClientSearch('')
                      setClientDropdownOpen(true)
                    }}
                    className="w-full h-auto min-h-[40px] rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-manrope text-[#1a1a2e] hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <span className="font-medium">{selectedClient.name}</span>
                      <span className="text-[#6b7280]"> — {selectedClient.address}</span>
                    </div>
                    <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
                  </button>
                )}
                {clientDropdownOpen && !selectedClient && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-20 max-h-60 overflow-y-auto">
                    {filteredClients.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedClient(c)
                          setClientDropdownOpen(false)
                          setClientSearch('')
                        }}
                        className="w-full text-left px-3 py-2.5 text-sm font-manrope hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                      >
                        <span className="font-medium text-[#1a1a2e]">{c.name}</span>
                        <span className="text-[#6b7280]"> — {c.address}</span>
                      </button>
                    ))}
                    {filteredClients.length === 0 && (
                      <p className="px-3 py-3 text-sm font-manrope text-[#6b7280]">Aucun client trouvé</p>
                    )}
                  </div>
                )}
              </div>
              <button className="mt-2 text-sm font-manrope text-[#5ab4e0] hover:underline">
                + Nouveau client
              </button>
            </div>

            <div>
              <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Chantier</label>
              <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope outline-none focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] transition-colors appearance-none bg-white cursor-pointer">
                <option>Rénovation salle de bain</option>
                <option>Plomberie complète</option>
                <option>Installation chauffage</option>
              </select>
            </div>
          </div>
        </div>

        {/* Prestations table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-6">
          {/* Header */}
          <div className="bg-[#5ab4e0] text-white grid grid-cols-[40px_40px_1fr_80px_96px_112px_96px_112px_40px] items-center px-4 py-3">
            <span />
            <span className="text-xs font-manrope font-semibold uppercase">N°</span>
            <span className="text-xs font-manrope font-semibold uppercase">Désignation</span>
            <span className="text-xs font-manrope font-semibold uppercase text-center">Qté</span>
            <span className="text-xs font-manrope font-semibold uppercase text-center">Unité</span>
            <span className="text-xs font-manrope font-semibold uppercase text-right">Prix U. HT</span>
            <span className="text-xs font-manrope font-semibold uppercase text-center">TVA</span>
            <span className="text-xs font-manrope font-semibold uppercase text-right">Total HT</span>
            <span />
          </div>

          {/* Rows */}
          {lines.map((line, i) => (
            <div
              key={line.id}
              className="grid grid-cols-[40px_40px_1fr_80px_96px_112px_96px_112px_40px] items-center px-4 py-3 border-b border-gray-100"
            >
              <GripVertical size={16} className="text-gray-300 cursor-grab" />
              <span className="text-sm font-manrope text-[#6b7280]">{i + 1}</span>
              <input
                type="text"
                value={line.designation}
                onChange={(e) => updateLine(line.id, 'designation', e.target.value)}
                className="w-full text-sm font-manrope text-[#1a1a2e] border-0 outline-none focus:ring-0 bg-transparent px-1"
                placeholder="Désignation..."
              />
              <input
                type="number"
                value={line.qty}
                onChange={(e) => updateLine(line.id, 'qty', Number(e.target.value))}
                className="w-full text-sm font-manrope text-[#1a1a2e] text-center border-0 outline-none focus:ring-0 bg-transparent"
                min={0}
              />
              <select
                value={line.unit}
                onChange={(e) => updateLine(line.id, 'unit', e.target.value)}
                className="w-full text-sm font-manrope text-[#1a1a2e] text-center border-0 outline-none focus:ring-0 bg-transparent cursor-pointer appearance-none"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <input
                type="number"
                value={line.priceHT}
                onChange={(e) => updateLine(line.id, 'priceHT', Number(e.target.value))}
                className="w-full text-sm font-manrope text-[#1a1a2e] text-right border-0 outline-none focus:ring-0 bg-transparent"
                min={0}
                step={0.01}
              />
              <select
                value={line.tva}
                onChange={(e) => updateLine(line.id, 'tva', Number(e.target.value))}
                className="w-full text-sm font-manrope text-[#1a1a2e] text-center border-0 outline-none focus:ring-0 bg-transparent cursor-pointer appearance-none"
              >
                {TVA_RATES.map((r) => (
                  <option key={r} value={r}>{r}%</option>
                ))}
              </select>
              <span className="text-sm font-manrope font-semibold text-[#1a1a2e] text-right">
                {formatCurrency(line.qty * line.priceHT)}
              </span>
              <button
                onClick={() => removeLine(line.id)}
                className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          {/* Add buttons */}
          <div className="flex flex-wrap gap-2 p-4">
            <button
              onClick={() => addLine({ unit: 'U' })}
              className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm font-manrope text-[#1a1a2e] hover:bg-gray-100 transition-colors"
            >
              <Plus size={14} /> Fourniture
            </button>
            <button
              onClick={() => addLine({ unit: 'h' })}
              className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm font-manrope text-[#1a1a2e] hover:bg-gray-100 transition-colors"
            >
              <Plus size={14} /> Main d&apos;oeuvre
            </button>
            <button
              onClick={() => addLine({ unit: 'ens' })}
              className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm font-manrope text-[#1a1a2e] hover:bg-gray-100 transition-colors"
            >
              <Plus size={14} /> Ouvrage
            </button>
            <button
              onClick={() => addLine({ designation: '--- Section ---', qty: 0, priceHT: 0 })}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-manrope text-[#6b7280] hover:text-[#1a1a2e] transition-colors"
            >
              <Plus size={14} /> Section
            </button>
            <button
              onClick={() => addLine({ designation: '', qty: 0, priceHT: 0 })}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-manrope text-[#6b7280] hover:text-[#1a1a2e] transition-colors"
            >
              <Plus size={14} /> Texte libre
            </button>
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end mt-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 w-80">
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
              <span className="text-[#1a1a2e] font-semibold">{formatCurrency(totalTTC)}</span>
            </div>
            <div className="bg-[#5ab4e0] text-white rounded-lg p-3 mt-3 flex justify-between items-center">
              <span className="font-syne font-bold text-sm">NET A PAYER</span>
              <span className="font-syne font-bold text-lg">{formatCurrency(totalTTC)}</span>
            </div>
          </div>
        </div>

        {/* Conditions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6 space-y-4">
          <div>
            <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Conditions de paiement</label>
            <textarea
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-manrope outline-none focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] transition-colors resize-none"
            />
          </div>
          <div>
            <p className="text-sm font-manrope font-medium text-[#1a1a2e] mb-2">Méthodes de paiement</p>
            <div className="flex flex-wrap gap-4">
              {[
                { key: 'cheque' as const, label: 'Chèque' },
                { key: 'virement' as const, label: 'Virement' },
                { key: 'cb' as const, label: 'Carte bancaire' },
              ].map((m) => (
                <label key={m.key} className="flex items-center gap-2 text-sm font-manrope text-[#1a1a2e] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentMethods[m.key]}
                    onChange={(e) => setPaymentMethods({ ...paymentMethods, [m.key]: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-[#5ab4e0] focus:ring-[#5ab4e0]"
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
          {!showNotes ? (
            <button
              onClick={() => setShowNotes(true)}
              className="text-sm font-manrope text-[#5ab4e0] hover:underline"
            >
              + Ajouter des notes
            </button>
          ) : (
            <div>
              <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-manrope outline-none focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] transition-colors resize-none"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------------------
// Top Bar
// -------------------------------------------------------------------

function TopBar({
  showPreview,
  setShowPreview,
}: {
  showPreview: boolean
  setShowPreview: (v: boolean) => void
}) {
  return (
    <div className="sticky top-0 bg-white border-b border-gray-200 z-10 py-3 px-6 flex items-center justify-between">
      {/* Left */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/devis" className="p-1.5 rounded-md hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} className="text-[#6b7280]" />
        </Link>
        <h2 className="font-syne font-bold text-lg text-[#1a1a2e]">Nouveau devis</h2>
      </div>

      {/* Center — toggle */}
      <div className="hidden sm:flex items-center bg-gray-100 rounded-lg p-0.5">
        <button
          onClick={() => setShowPreview(false)}
          className={`px-4 py-1.5 rounded-md text-sm font-manrope font-medium transition-colors ${
            !showPreview ? 'bg-white shadow-sm text-[#1a1a2e]' : 'text-[#6b7280] hover:text-[#1a1a2e]'
          }`}
        >
          Edition
        </button>
        <button
          onClick={() => setShowPreview(true)}
          className={`px-4 py-1.5 rounded-md text-sm font-manrope font-medium transition-colors ${
            showPreview ? 'bg-white shadow-sm text-[#1a1a2e]' : 'text-[#6b7280] hover:text-[#1a1a2e]'
          }`}
        >
          Prévisualisation
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/devis"
          className="px-4 py-2 text-sm font-manrope text-[#6b7280] hover:text-[#1a1a2e] transition-colors"
        >
          Annuler
        </Link>
        <button className="px-4 py-2 text-sm font-syne font-bold bg-gray-200 text-[#6b7280] rounded-lg hover:bg-gray-300 transition-colors">
          Enregistrer
        </button>
        <button className="px-4 py-2 text-sm font-syne font-bold bg-[#22c55e] text-white rounded-lg hover:bg-[#16a34a] transition-colors">
          Finaliser et envoyer
        </button>
      </div>
    </div>
  )
}
