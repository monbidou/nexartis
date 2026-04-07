'use client'

import { useState } from 'react'
import {
  Search,
  Plus,
  ChevronDown,
  X,
  AlertTriangle,
  BookOpen,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
} from 'lucide-react'

// -------------------------------------------------------------------
// Types & Data
// -------------------------------------------------------------------

type Categorie = 'Toutes' | 'Fournitures' | "Main d'œuvre" | 'Ouvrages' | 'Déplacements'
type CategorieValue = 'Fournitures' | "Main d'œuvre" | 'Ouvrages' | 'Déplacements'

interface Prestation {
  id: string
  designation: string
  unite: string
  prixHT: number
  tva: number
  categorie: CategorieValue
  utilisations: number
  derniereMAJ: string
}

const DEMO_PRESTATIONS: Prestation[] = [
  { id: '1', designation: 'Fourniture et pose chauffe-eau thermodynamique 200L', unite: 'U', prixHT: 650, tva: 10, categorie: 'Ouvrages', utilisations: 8, derniereMAJ: '01/04/2026' },
  { id: '2', designation: 'Dépose ancien chauffe-eau + évacuation', unite: 'Fft', prixHT: 180, tva: 10, categorie: "Main d'œuvre", utilisations: 5, derniereMAJ: '15/03/2026' },
  { id: '3', designation: 'Remplacement robinetterie standard', unite: 'U', prixHT: 85, tva: 10, categorie: 'Fournitures', utilisations: 12, derniereMAJ: '01/04/2026' },
  { id: '4', designation: 'Débouchage canalisation', unite: 'Fft', prixHT: 220, tva: 20, categorie: "Main d'œuvre", utilisations: 15, derniereMAJ: '20/03/2026' },
  { id: '5', designation: 'Pose carrelage sol 60x60', unite: 'm²', prixHT: 45, tva: 10, categorie: "Main d'œuvre", utilisations: 22, derniereMAJ: '10/03/2026' },
  { id: '6', designation: 'Carrelage grès cérame (fourniture)', unite: 'm²', prixHT: 35, tva: 20, categorie: 'Fournitures', utilisations: 18, derniereMAJ: '10/03/2026' },
  { id: '7', designation: 'Peinture acrylique 2 couches', unite: 'm²', prixHT: 18, tva: 10, categorie: "Main d'œuvre", utilisations: 30, derniereMAJ: '25/02/2026' },
  { id: '8', designation: 'Câblage électrique standard', unite: 'ml', prixHT: 12, tva: 10, categorie: 'Fournitures', utilisations: 25, derniereMAJ: '01/03/2026' },
  { id: '9', designation: 'Déplacement et mise en place', unite: 'Fft', prixHT: 80, tva: 20, categorie: 'Déplacements', utilisations: 45, derniereMAJ: '01/04/2026' },
  { id: '10', designation: 'Raccordement plomberie', unite: 'U', prixHT: 120, tva: 10, categorie: "Main d'œuvre", utilisations: 10, derniereMAJ: '15/03/2026' },
]

const CATEGORY_FILTERS: Categorie[] = ['Toutes', 'Fournitures', "Main d'œuvre", 'Ouvrages', 'Déplacements']

const CATEGORY_STYLES: Record<CategorieValue, string> = {
  'Fournitures': 'bg-blue-50 text-blue-700',
  "Main d'œuvre": 'bg-green-50 text-green-700',
  'Ouvrages': 'bg-violet-50 text-violet-700',
  'Déplacements': 'bg-orange-50 text-orange-700',
}

function isOlderThan6Months(dateStr: string): boolean {
  const [day, month, year] = dateStr.split('/').map(Number)
  const date = new Date(year, month - 1, day)
  const sixMonthsAgo = new Date(2026, 3, 7) // April 7, 2026
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  return date < sixMonthsAgo
}

// -------------------------------------------------------------------
// Page
// -------------------------------------------------------------------

export default function BibliothequePage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Categorie>('Toutes')
  const [showModal, setShowModal] = useState(false)
  const [openActionId, setOpenActionId] = useState<string | null>(null)

  // Modal state
  const [modalDesignation, setModalDesignation] = useState('')
  const [modalUnite, setModalUnite] = useState('U')
  const [modalPrix, setModalPrix] = useState('')
  const [modalTva, setModalTva] = useState('10')
  const [modalCategorie, setModalCategorie] = useState<CategorieValue>('Fournitures')
  const [modalTags, setModalTags] = useState('')

  const resetModal = () => {
    setModalDesignation('')
    setModalUnite('U')
    setModalPrix('')
    setModalTva('10')
    setModalCategorie('Fournitures')
    setModalTags('')
  }

  const filtered = DEMO_PRESTATIONS.filter((p) => {
    if (filter !== 'Toutes' && p.categorie !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        p.designation.toLowerCase().includes(q) ||
        p.categorie.toLowerCase().includes(q)
      )
    }
    return true
  })

  const needsUpdate = DEMO_PRESTATIONS.filter((p) => isOlderThan6Months(p.derniereMAJ)).length

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une prestation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 rounded-lg border border-gray-200 pl-9 pr-4 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none transition-colors"
          />
        </div>

        {/* Filter */}
        <div className="relative">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Categorie)}
            className="h-10 rounded-lg border border-gray-200 px-3 pr-8 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none appearance-none bg-white cursor-pointer"
          >
            {CATEGORY_FILTERS.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* New prestation button */}
        <button
          onClick={() => { resetModal(); setShowModal(true) }}
          className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-[#e87a2a] hover:bg-[#f09050] text-white text-sm font-syne font-bold transition-colors"
        >
          <Plus size={16} />
          Nouvelle prestation
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <BookOpen size={16} className="text-[#5ab4e0]" />
          <span className="text-sm font-manrope font-semibold text-[#0f1a3a]">147 prestations</span>
        </div>
        {needsUpdate > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50">
            <AlertTriangle size={14} className="text-amber-500" />
            <span className="text-sm font-manrope font-medium text-amber-700">{needsUpdate} à mettre à jour</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="bg-gray-50">
              {['Désignation', 'Unité', 'Prix HT', 'TVA', 'Catégorie', 'Utilisations', 'Dernière MAJ', 'Actions'].map((col) => (
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
            {filtered.map((prestation, idx) => {
              const outdated = isOlderThan6Months(prestation.derniereMAJ)
              return (
                <tr
                  key={prestation.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    idx % 2 === 1 ? 'bg-[#f8f9fa]' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-sm font-manrope font-semibold text-[#1a1a2e] max-w-[300px]">
                    {prestation.designation}
                  </td>
                  <td className="px-4 py-3 text-sm font-manrope text-gray-600">{prestation.unite}</td>
                  <td className="px-4 py-3 text-sm font-manrope font-semibold text-[#1a1a2e]">{prestation.prixHT.toLocaleString('fr-FR')}&nbsp;€</td>
                  <td className="px-4 py-3 text-sm font-manrope text-gray-600">{prestation.tva}%</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-manrope font-medium ${CATEGORY_STYLES[prestation.categorie]}`}>
                      {prestation.categorie}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-manrope text-gray-600">{prestation.utilisations}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-manrope text-gray-600">{prestation.derniereMAJ}</span>
                      {outdated && (
                        <span className="flex items-center gap-1 text-amber-500" title="Prix à vérifier">
                          <AlertTriangle size={14} />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <button
                        onClick={() => setOpenActionId(openActionId === prestation.id ? null : prestation.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {openActionId === prestation.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-10 py-1 w-36">
                          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm font-manrope text-gray-600 hover:bg-gray-50">
                            <Pencil size={14} />
                            Modifier
                          </button>
                          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm font-manrope text-gray-600 hover:bg-gray-50">
                            <Copy size={14} />
                            Dupliquer
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
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-manrope text-gray-500">Aucune prestation trouvée</p>
          </div>
        )}
      </div>

      {/* Add prestation modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-5">
            {/* Modal header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-syne font-bold text-[#0f1a3a]">Nouvelle prestation</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Désignation */}
            <div>
              <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Désignation</label>
              <input
                type="text"
                value={modalDesignation}
                onChange={(e) => setModalDesignation(e.target.value)}
                placeholder="Ex: Fourniture et pose chauffe-eau"
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
              />
            </div>

            {/* Unité + Prix HT */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Unité</label>
                <select
                  value={modalUnite}
                  onChange={(e) => setModalUnite(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
                >
                  <option value="U">U (Unité)</option>
                  <option value="Fft">Fft (Forfait)</option>
                  <option value="m²">m²</option>
                  <option value="ml">ml (Mètre linéaire)</option>
                  <option value="h">h (Heure)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Prix HT</label>
                <input
                  type="number"
                  value={modalPrix}
                  onChange={(e) => setModalPrix(e.target.value)}
                  placeholder="0,00 €"
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
                />
              </div>
            </div>

            {/* TVA + Catégorie */}
            <div className="grid grid-cols-2 gap-3">
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
              <div>
                <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Catégorie</label>
                <select
                  value={modalCategorie}
                  onChange={(e) => setModalCategorie(e.target.value as CategorieValue)}
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
                >
                  <option value="Fournitures">Fournitures</option>
                  <option value="Main d'œuvre">Main d&apos;œuvre</option>
                  <option value="Ouvrages">Ouvrages</option>
                  <option value="Déplacements">Déplacements</option>
                </select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Tags</label>
              <input
                type="text"
                value={modalTags}
                onChange={(e) => setModalTags(e.target.value)}
                placeholder="Ex: plomberie, chauffage"
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
              />
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
