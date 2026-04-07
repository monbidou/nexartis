'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Search,
  Truck,
  Plus,
} from 'lucide-react'

// -------------------------------------------------------------------
// Types & Data
// -------------------------------------------------------------------

interface Fournisseur {
  id: string
  nom: string
  contact: string
  email: string
  telephone: string
  modifie: string
  achats: string
  totalHT: string
}

const DEMO_FOURNISSEURS: Fournisseur[] = [
  { id: '1', nom: 'Point.P Bordeaux', contact: 'M. Laurent', email: 'bordeaux@pointp.fr', telephone: '05 56 11 22 33', modifie: '05/04', achats: '12 achats', totalHT: '8 450 \u20ac' },
  { id: '2', nom: 'Cedeo M\u00e9rignac', contact: 'Mme Dubois', email: 'merignac@cedeo.fr', telephone: '05 56 22 33 44', modifie: '01/04', achats: '8 achats', totalHT: '5 200 \u20ac' },
  { id: '3', nom: 'Brossette', contact: 'M. Garcia', email: 'garcia@brossette.fr', telephone: '05 56 33 44 55', modifie: '28/03', achats: '5 achats', totalHT: '3 100 \u20ac' },
  { id: '4', nom: 'Leroy Merlin Pro', contact: 'Service Pro', email: 'pro@leroymerlin.fr', telephone: '05 56 44 55 66', modifie: '20/03', achats: '15 achats', totalHT: '4 800 \u20ac' },
]

// -------------------------------------------------------------------
// Page
// -------------------------------------------------------------------

export default function FournisseursPage() {
  const [search, setSearch] = useState('')

  const filtered = DEMO_FOURNISSEURS.filter((f) => {
    if (search) {
      const q = search.toLowerCase()
      return (
        f.nom.toLowerCase().includes(q) ||
        f.contact.toLowerCase().includes(q) ||
        f.email.toLowerCase().includes(q)
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
          className="px-4 py-2.5 text-sm font-syne font-bold text-[#6b7280] hover:text-[#1a1a2e] border-b-2 border-transparent -mb-px transition-colors"
        >
          Clients
        </Link>
        <Link
          href="/dashboard/fournisseurs"
          className="px-4 py-2.5 text-sm font-syne font-bold text-[#0f1a3a] border-b-2 border-[#5ab4e0] -mb-px"
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
            placeholder="Rechercher un fournisseur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 rounded-lg border border-gray-200 pl-9 pr-4 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none transition-colors"
          />
        </div>

        {/* New supplier button */}
        <button
          className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-[#e87a2a] hover:bg-[#f09050] text-white text-sm font-syne font-bold transition-colors"
        >
          <Plus size={16} />
          Nouveau fournisseur
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-gray-50">
              {['Nom', 'Contact', 'Email', 'T\u00e9l\u00e9phone', 'Modifi\u00e9', 'Achats', 'Total HT'].map((col) => (
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
            {filtered.map((fournisseur, idx) => (
              <tr
                key={fournisseur.id}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  idx % 2 === 1 ? 'bg-[#f8f9fa]' : ''
                }`}
              >
                <td className="px-4 py-3 text-sm font-manrope font-semibold text-[#1a1a2e]">
                  {fournisseur.nom}
                </td>
                <td className="px-4 py-3 text-sm font-manrope text-gray-600">{fournisseur.contact}</td>
                <td className="px-4 py-3 text-sm font-manrope text-gray-600">{fournisseur.email}</td>
                <td className="px-4 py-3 text-sm font-manrope text-gray-600">{fournisseur.telephone}</td>
                <td className="px-4 py-3 text-sm font-manrope text-gray-600">{fournisseur.modifie}</td>
                <td className="px-4 py-3 text-sm font-manrope text-gray-600">{fournisseur.achats}</td>
                <td className="px-4 py-3 text-sm font-manrope font-bold text-[#1a1a2e]">{fournisseur.totalHT}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <Truck size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-manrope text-gray-500">Aucun fournisseur trouv\u00e9</p>
          </div>
        )}
      </div>
    </div>
  )
}
