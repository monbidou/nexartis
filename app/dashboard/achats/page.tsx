'use client'

import { useState } from 'react'
import {
  Search,
  Plus,
  ChevronDown,
  X,
  Upload,
  Paperclip,
  ShoppingCart,
  Euro,
  Building2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'

// -------------------------------------------------------------------
// Types & Data
// -------------------------------------------------------------------

type FilterPeriod = 'Tous' | 'Ce mois' | 'Ce trimestre'

interface Achat {
  id: string
  date: string
  fournisseur: string
  description: string
  montantHT: number
  tva: number
  montantTTC: number
  chantier: string
  justificatif: boolean
}

const DEMO_ACHATS: Achat[] = [
  { id: '1', date: '05/04/2026', fournisseur: 'Point.P', description: 'Tubes cuivre + raccords', montantHT: 320, tva: 20, montantTTC: 384, chantier: 'M. Dupont / SDB', justificatif: true },
  { id: '2', date: '03/04/2026', fournisseur: 'Cedeo', description: 'Chauffe-eau thermodynamique 200L', montantHT: 890, tva: 20, montantTTC: 1068, chantier: 'M. Dupont / SDB', justificatif: true },
  { id: '3', date: '01/04/2026', fournisseur: 'Leroy Merlin Pro', description: 'Carrelage grès cérame 25m²', montantHT: 450, tva: 20, montantTTC: 540, chantier: 'M. Bernard / Carrelage', justificatif: true },
  { id: '4', date: '28/03/2026', fournisseur: 'Point.P', description: 'Joint silicone + colle carrelage', montantHT: 85, tva: 20, montantTTC: 102, chantier: 'M. Bernard / Carrelage', justificatif: false },
  { id: '5', date: '25/03/2026', fournisseur: 'Brossette', description: 'Robinetterie salle de bain', montantHT: 210, tva: 20, montantTTC: 252, chantier: 'Mme Martin / SDB', justificatif: true },
  { id: '6', date: '20/03/2026', fournisseur: 'Cedeo', description: 'Tuyaux PVC évacuation', montantHT: 145, tva: 20, montantTTC: 174, chantier: 'Stock général', justificatif: false },
]

const FOURNISSEURS = ['Point.P', 'Cedeo', 'Leroy Merlin Pro', 'Brossette']
const CHANTIERS = ['M. Dupont / SDB', 'M. Bernard / Carrelage', 'Mme Martin / SDB', 'Stock général']

// -------------------------------------------------------------------
// Page
// -------------------------------------------------------------------

export default function AchatsPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterPeriod>('Tous')
  const [showModal, setShowModal] = useState(false)
  const [openActionId, setOpenActionId] = useState<string | null>(null)

  // Modal state
  const [modalFournisseur, setModalFournisseur] = useState('')
  const [modalDate, setModalDate] = useState('')
  const [modalMontant, setModalMontant] = useState('')
  const [modalTva, setModalTva] = useState('20')
  const [modalDescription, setModalDescription] = useState('')
  const [modalChantier, setModalChantier] = useState('')

  const resetModal = () => {
    setModalFournisseur('')
    setModalDate('')
    setModalMontant('')
    setModalTva('20')
    setModalDescription('')
    setModalChantier('')
  }

  const filtered = DEMO_ACHATS.filter((a) => {
    if (search) {
      const q = search.toLowerCase()
      return (
        a.fournisseur.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.chantier.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center">
              <ShoppingCart size={20} className="text-[#5ab4e0]" />
            </div>
            <div>
              <p className="text-xs font-manrope text-[#6b7280] uppercase tracking-wider">Dépenses ce mois</p>
              <p className="text-xl font-syne font-bold text-[#0f1a3a]">3 450 € HT</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Euro size={20} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-manrope text-[#6b7280] uppercase tracking-wider">Total année</p>
              <p className="text-xl font-syne font-bold text-[#0f1a3a]">28 200 € HT</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <Building2 size={20} className="text-[#e87a2a]" />
            </div>
            <div>
              <p className="text-xs font-manrope text-[#6b7280] uppercase tracking-wider">Fournisseurs actifs</p>
              <p className="text-xl font-syne font-bold text-[#0f1a3a]">4</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un achat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 rounded-lg border border-gray-200 pl-9 pr-4 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none transition-colors"
          />
        </div>

        {/* Filter */}
        <div className="relative">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterPeriod)}
            className="h-10 rounded-lg border border-gray-200 px-3 pr-8 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none appearance-none bg-white cursor-pointer"
          >
            <option value="Tous">Tous</option>
            <option value="Ce mois">Ce mois</option>
            <option value="Ce trimestre">Ce trimestre</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* New achat button */}
        <button
          onClick={() => { resetModal(); setShowModal(true) }}
          className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-[#e87a2a] hover:bg-[#f09050] text-white text-sm font-syne font-bold transition-colors"
        >
          <Plus size={16} />
          Nouvel achat
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="bg-gray-50">
              {['Date', 'Fournisseur', 'Description', 'Montant HT', 'TVA', 'Montant TTC', 'Chantier', 'Justificatif', 'Actions'].map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-manrope font-semibold uppercase tracking-wider text-gray-500"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((achat, idx) => (
              <tr
                key={achat.id}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  idx % 2 === 1 ? 'bg-[#f8f9fa]' : ''
                }`}
              >
                <td className="px-4 py-3 text-sm font-manrope text-gray-600">{achat.date}</td>
                <td className="px-4 py-3 text-sm font-manrope font-semibold text-[#1a1a2e]">{achat.fournisseur}</td>
                <td className="px-4 py-3 text-sm font-manrope text-gray-600">{achat.description}</td>
                <td className="px-4 py-3 text-sm font-manrope font-semibold text-[#1a1a2e]">{achat.montantHT.toLocaleString('fr-FR')}&nbsp;€</td>
                <td className="px-4 py-3 text-sm font-manrope text-gray-600">{achat.tva}%</td>
                <td className="px-4 py-3 text-sm font-manrope font-bold text-[#0f1a3a]">{achat.montantTTC.toLocaleString('fr-FR')}&nbsp;€</td>
                <td className="px-4 py-3">
                  <span className="inline-block px-2.5 py-1 rounded-full text-xs font-manrope font-medium bg-gray-100 text-gray-600">
                    {achat.chantier}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {achat.justificatif ? (
                    <span className="inline-flex items-center gap-1 text-[#5ab4e0]">
                      <Paperclip size={14} />
                    </span>
                  ) : (
                    <span className="text-sm text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="relative">
                    <button
                      onClick={() => setOpenActionId(openActionId === achat.id ? null : achat.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {openActionId === achat.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-10 py-1 w-36">
                        <button className="flex items-center gap-2 w-full px-3 py-2 text-sm font-manrope text-gray-600 hover:bg-gray-50">
                          <Pencil size={14} />
                          Modifier
                        </button>
                        <button className="flex items-center gap-2 w-full px-3 py-2 text-sm font-manrope text-red-600 hover:bg-red-50">
                          <Trash2 size={14} />
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <ShoppingCart size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-manrope text-gray-500">Aucun achat trouvé</p>
          </div>
        )}
      </div>

      {/* Add achat modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-5">
            {/* Modal header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-syne font-bold text-[#0f1a3a]">Nouvel achat</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Fournisseur */}
            <div>
              <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Fournisseur</label>
              <select
                value={modalFournisseur}
                onChange={(e) => setModalFournisseur(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
              >
                <option value="">Sélectionner un fournisseur...</option>
                {FOURNISSEURS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* Date + Montant HT */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Date</label>
                <input
                  type="date"
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Montant HT</label>
                <input
                  type="number"
                  value={modalMontant}
                  onChange={(e) => setModalMontant(e.target.value)}
                  placeholder="0,00 €"
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
                />
              </div>
            </div>

            {/* TVA */}
            <div>
              <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">TVA</label>
              <select
                value={modalTva}
                onChange={(e) => setModalTva(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
              >
                <option value="5.5">5,5%</option>
                <option value="10">10%</option>
                <option value="20">20%</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Description</label>
              <input
                type="text"
                value={modalDescription}
                onChange={(e) => setModalDescription(e.target.value)}
                placeholder="Ex: Tubes cuivre + raccords"
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
              />
            </div>

            {/* Chantier */}
            <div>
              <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Associer au chantier</label>
              <select
                value={modalChantier}
                onChange={(e) => setModalChantier(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
              >
                <option value="">Sélectionner un chantier...</option>
                {CHANTIERS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Upload justificatif */}
            <div>
              <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Justificatif</label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-[#5ab4e0] transition-colors cursor-pointer">
                <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm font-manrope text-[#6b7280]">Glisser un fichier ou <span className="text-[#5ab4e0] font-medium">parcourir</span></p>
                <p className="text-xs font-manrope text-gray-400 mt-1">PDF, JPG, PNG (max 5 Mo)</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 h-10 rounded-lg border border-gray-200 text-sm font-syne font-bold text-[#6b7280] hover:text-[#1a1a2e] hover:border-gray-300 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-5 h-10 rounded-lg bg-[#e87a2a] hover:bg-[#f09050] text-white text-sm font-syne font-bold transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
