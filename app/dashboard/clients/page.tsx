'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  Users,
  Plus,
  ChevronDown,
} from 'lucide-react'

// -------------------------------------------------------------------
// Types & Data
// -------------------------------------------------------------------

type ClientType = 'Particulier' | 'Professionnel'

interface Client {
  id: string
  nom: string
  type: ClientType
  email: string
  telephone: string
  modifie: string
  creation: string
  resume: string
  solde: number
}

const DEMO_CLIENTS: Client[] = [
  { id: '1', nom: 'M. Jean Dupont', type: 'Particulier', email: 'jean.dupont@email.fr', telephone: '06 12 34 56 78', modifie: '07/04', creation: '15/01', resume: '1 chantier \u00b7 0 facture en attente', solde: 2695 },
  { id: '2', nom: 'Mme Sophie Martin', type: 'Particulier', email: 's.martin@email.fr', telephone: '06 23 45 67 89', modifie: '06/04', creation: '10/12', resume: '1 chantier \u00b7 0 en attente', solde: 0 },
  { id: '3', nom: 'M. Pierre Bernard', type: 'Particulier', email: 'p.bernard@gmail.com', telephone: '06 34 56 78 90', modifie: '04/04', creation: '05/02', resume: '1 chantier \u00b7 0 en attente', solde: 0 },
  { id: '4', nom: 'SARL Renov33', type: 'Professionnel', email: 'contact@renov33.fr', telephone: '05 56 00 00 00', modifie: '02/04', creation: '20/11', resume: '1 chantier \u00b7 1 en attente', solde: 4675 },
  { id: '5', nom: 'Mme Claire Girard', type: 'Particulier', email: 'c.girard@email.fr', telephone: '06 45 67 89 01', modifie: '01/04', creation: '08/01', resume: '1 chantier \u00b7 1 en attente', solde: 2464 },
  { id: '6', nom: 'M. Thomas Petit', type: 'Particulier', email: 't.petit@email.fr', telephone: '06 56 78 90 12', modifie: '28/03', creation: '15/11', resume: '1 chantier \u00b7 0 en attente', solde: 0 },
  { id: '7', nom: 'M. Marc Leroy', type: 'Particulier', email: 'm.leroy@email.fr', telephone: '06 67 89 01 23', modifie: '25/03', creation: '03/03', resume: '1 chantier \u00b7 1 en attente', solde: 13200 },
  { id: '8', nom: 'Mme Anne Moreau', type: 'Particulier', email: 'a.moreau@email.fr', telephone: '06 78 90 12 34', modifie: '20/03', creation: '22/02', resume: '1 chantier \u00b7 0 en attente', solde: 0 },
]

const FILTER_OPTIONS = ['Tous', 'Particuliers', 'Professionnels', 'Archiv\u00e9s']

// -------------------------------------------------------------------
// Page
// -------------------------------------------------------------------

export default function ClientsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Tous')

  const filtered = DEMO_CLIENTS.filter((c) => {
    if (filter === 'Particuliers' && c.type !== 'Particulier') return false
    if (filter === 'Professionnels' && c.type !== 'Professionnel') return false
    if (filter === 'Archiv\u00e9s') return false
    if (search) {
      const q = search.toLowerCase()
      return (
        c.nom.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.telephone.includes(q)
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex gap-1 border-b border-gray-200">
        <Link
          href="/dashboard/clients"
          className="px-4 py-2.5 text-sm font-syne font-bold text-[#0f1a3a] border-b-2 border-[#5ab4e0] -mb-px"
        >
          Clients
        </Link>
        <Link
          href="/dashboard/fournisseurs"
          className="px-4 py-2.5 text-sm font-syne font-bold text-[#6b7280] hover:text-[#1a1a2e] border-b-2 border-transparent -mb-px transition-colors"
        >
          Fournisseurs
        </Link>
      </div>

      {/* Action bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 rounded-lg border border-gray-200 pl-9 pr-4 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none transition-colors"
          />
        </div>

        {/* Filter */}
        <div className="relative">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 px-3 pr-8 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none appearance-none bg-white cursor-pointer"
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* New client button */}
        <button
          className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-[#e87a2a] hover:bg-[#f09050] text-white text-sm font-syne font-bold transition-colors"
        >
          <Plus size={16} />
          Nouveau client
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead>
            <tr className="bg-gray-50">
              {['Nom', 'Type', 'Email', 'T\u00e9l\u00e9phone', 'Modifi\u00e9', 'Cr\u00e9ation', 'R\u00e9sum\u00e9', 'Solde'].map((col) => (
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
            {filtered.map((client, idx) => (
              <tr
                key={client.id}
                onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                  idx % 2 === 1 ? 'bg-[#f8f9fa]' : ''
                }`}
              >
                <td className="px-4 py-3 text-sm font-manrope font-semibold text-[#1a1a2e]">
                  {client.nom}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-manrope font-medium ${
                    client.type === 'Professionnel'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {client.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-manrope text-gray-600">{client.email}</td>
                <td className="px-4 py-3 text-sm font-manrope text-gray-600">{client.telephone}</td>
                <td className="px-4 py-3 text-sm font-manrope text-gray-600">{client.modifie}</td>
                <td className="px-4 py-3 text-sm font-manrope text-gray-600">{client.creation}</td>
                <td className="px-4 py-3 text-sm font-manrope text-gray-500">{client.resume}</td>
                <td className="px-4 py-3 text-sm font-manrope font-bold">
                  {client.solde === 0 ? (
                    <span className="text-green-600">Sold\u00e9</span>
                  ) : client.solde >= 10000 ? (
                    <span className="text-red-600">{client.solde.toLocaleString('fr-FR')}\u00a0\u20ac</span>
                  ) : (
                    <span className="text-[#e87a2a]">{client.solde.toLocaleString('fr-FR')}\u00a0\u20ac</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <Users size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-manrope text-gray-500">Aucun client trouv\u00e9</p>
          </div>
        )}
      </div>
    </div>
  )
}
