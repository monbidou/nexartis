'use client'

import { useState } from 'react'
import {
  Search,
  Users,
  Plus,
  UserPlus,
  Wrench,
  HardHat,
  Hammer,
} from 'lucide-react'

// -------------------------------------------------------------------
// Types & Data
// -------------------------------------------------------------------

type EquipeTab = 'employes' | 'interimaires' | 'sous-traitants' | 'materiels'

interface Employe {
  id: string
  nom: string
  initiales: string
  couleurAvatar: string
  role: 'Propri\u00e9taire' | 'Compagnon'
  contrat: string
  metier: string
  email: string
  telephone: string
  modifie: string
  hasAccount: boolean
}

const DEMO_EMPLOYES: Employe[] = [
  { id: '1', nom: 'Jean Dupont', initiales: 'JD', couleurAvatar: 'bg-[#5ab4e0]', role: 'Propri\u00e9taire', contrat: 'CDI', metier: 'Plombier', email: 'jean@artidoc-plomberie.fr', telephone: '06 12 34 56 78', modifie: '07/04', hasAccount: true },
  { id: '2', nom: 'Michel Renaud', initiales: 'MR', couleurAvatar: 'bg-emerald-500', role: 'Compagnon', contrat: 'CDI', metier: 'Plombier-chauffagiste', email: 'michel.r@email.fr', telephone: '06 11 22 33 44', modifie: '05/04', hasAccount: false },
  { id: '3', nom: 'Thomas Blanc', initiales: 'TB', couleurAvatar: 'bg-[#e87a2a]', role: 'Compagnon', contrat: 'CDI', metier: '\u00c9lectricien', email: 'thomas.b@email.fr', telephone: '06 22 33 44 55', modifie: '03/04', hasAccount: false },
  { id: '4', nom: 'Lucas Demont', initiales: 'LD', couleurAvatar: 'bg-violet-500', role: 'Compagnon', contrat: 'Apprenti', metier: 'Peintre', email: 'lucas.d@email.fr', telephone: '06 33 44 55 66', modifie: '01/04', hasAccount: false },
]

const TAB_OPTIONS: { key: EquipeTab; label: string; icon: typeof Users }[] = [
  { key: 'employes', label: 'Employ\u00e9s', icon: Users },
  { key: 'interimaires', label: 'Int\u00e9rimaires', icon: HardHat },
  { key: 'sous-traitants', label: 'Sous-traitants', icon: Hammer },
  { key: 'materiels', label: 'Mat\u00e9riels', icon: Wrench },
]

const EMPTY_LABELS: Record<string, string> = {
  interimaires: 'int\u00e9rimaire',
  'sous-traitants': 'sous-traitant',
  materiels: 'mat\u00e9riel',
}

// -------------------------------------------------------------------
// Page
// -------------------------------------------------------------------

export default function EquipePage() {
  const [activeTab, setActiveTab] = useState<EquipeTab>('employes')
  const [search, setSearch] = useState('')

  const filteredEmployes = DEMO_EMPLOYES.filter((e) => {
    if (search) {
      const q = search.toLowerCase()
      return (
        e.nom.toLowerCase().includes(q) ||
        e.metier.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-syne font-bold -mb-px border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'text-[#0f1a3a] border-[#5ab4e0]'
                : 'text-[#6b7280] border-transparent hover:text-[#1a1a2e]'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'employes' ? (
        <>
          {/* Action bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un employ\u00e9..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-200 pl-9 pr-4 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none transition-colors"
              />
            </div>
            <button className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-[#e87a2a] hover:bg-[#f09050] text-white text-sm font-syne font-bold transition-colors">
              <Plus size={16} />
              Nouvel employ\u00e9
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gray-50">
                  {['Nom', 'R\u00f4le', 'Contrat', 'M\u00e9tier', 'Email', 'T\u00e9l\u00e9phone', 'Modifi\u00e9', ''].map((col, i) => (
                    <th
                      key={`${col}-${i}`}
                      className="px-4 py-3 text-left text-xs font-manrope font-semibold uppercase tracking-wider text-gray-500"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEmployes.map((employe, idx) => (
                  <tr
                    key={employe.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      idx % 2 === 1 ? 'bg-[#f8f9fa]' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full ${employe.couleurAvatar} flex items-center justify-center text-white text-xs font-syne font-bold`}>
                          {employe.initiales}
                        </div>
                        <span className="text-sm font-manrope font-semibold text-[#1a1a2e]">{employe.nom}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-manrope font-medium ${
                        employe.role === 'Propri\u00e9taire'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {employe.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-manrope text-gray-600">{employe.contrat}</td>
                    <td className="px-4 py-3 text-sm font-manrope text-gray-600">{employe.metier}</td>
                    <td className="px-4 py-3 text-sm font-manrope text-gray-600">{employe.email}</td>
                    <td className="px-4 py-3 text-sm font-manrope text-gray-600">{employe.telephone}</td>
                    <td className="px-4 py-3 text-sm font-manrope text-gray-600">{employe.modifie}</td>
                    <td className="px-4 py-3">
                      {employe.role === 'Compagnon' && !employe.hasAccount && (
                        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#5ab4e0] text-[#5ab4e0] hover:bg-[#5ab4e0] hover:text-white text-xs font-syne font-bold transition-colors">
                          <UserPlus size={13} />
                          Inviter
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredEmployes.length === 0 && (
              <div className="py-12 text-center">
                <Users size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-manrope text-gray-500">Aucun employ\u00e9 trouv\u00e9</p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Empty state for other tabs */
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            {activeTab === 'interimaires' && <HardHat size={32} className="text-gray-400" />}
            {activeTab === 'sous-traitants' && <Hammer size={32} className="text-gray-400" />}
            {activeTab === 'materiels' && <Wrench size={32} className="text-gray-400" />}
          </div>
          <p className="text-sm font-manrope text-[#6b7280] mb-4">
            Aucun {EMPTY_LABELS[activeTab]} enregistr\u00e9
          </p>
          <button className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-[#e87a2a] hover:bg-[#f09050] text-white text-sm font-syne font-bold transition-colors">
            <Plus size={16} />
            Ajouter
          </button>
        </div>
      )}
    </div>
  )
}
