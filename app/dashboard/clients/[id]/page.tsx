'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Pencil,
  FileText,
  HardHat,
  Receipt,
  History,
  Plus,
} from 'lucide-react'

// -------------------------------------------------------------------
// Demo data for M. Jean Dupont
// -------------------------------------------------------------------

const CLIENT = {
  id: '1',
  nom: 'M. Jean Dupont',
  type: 'Particulier' as const,
  email: 'jean.dupont@email.fr',
  telephone: '06 12 34 56 78',
  adresse: '12 rue des Lilas, 33000 Bordeaux',
  caTotal: '2 695 \u20ac',
  chantiers: 1,
  devis: 1,
}

const CHANTIERS = [
  { id: 'ch1', nom: 'R\u00e9novation SDB', statut: 'En cours', progression: 15 },
]

const DEVIS = [
  { id: 'd089', numero: 'D2026-089', statut: 'Envoy\u00e9', date: '07/04', totalTTC: '2 695 \u20ac' },
]

const FACTURES: { id: string; numero: string; statut: string; date: string; totalTTC: string }[] = []

const TABS = [
  { key: 'chantiers', label: 'Chantiers', icon: HardHat },
  { key: 'devis', label: 'Devis', icon: FileText },
  { key: 'factures', label: 'Factures', icon: Receipt },
  { key: 'historique', label: 'Historique', icon: History },
]

// -------------------------------------------------------------------
// Page
// -------------------------------------------------------------------

export default function ClientDetailPage() {
  const [activeTab, setActiveTab] = useState('chantiers')

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center gap-1.5 text-sm font-manrope text-[#6b7280] hover:text-[#1a1a2e] transition-colors"
      >
        <ArrowLeft size={16} />
        Retour aux clients
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-syne font-bold text-[#0f1a3a]">{CLIENT.nom}</h1>
          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-manrope font-medium bg-gray-100 text-gray-600">
            {CLIENT.type}
          </span>
        </div>
        <button className="inline-flex items-center gap-2 h-10 px-5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-syne font-bold text-[#1a1a2e] transition-colors">
          <Pencil size={14} />
          Modifier
        </button>
      </div>

      {/* Info + Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-syne font-bold text-[#0f1a3a] uppercase tracking-wider">Coordonn\u00e9es</h2>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 text-sm font-manrope text-[#1a1a2e]">
              <MapPin size={16} className="text-[#6b7280] flex-shrink-0" />
              {CLIENT.adresse}
            </div>
            <div className="flex items-center gap-2.5 text-sm font-manrope text-[#1a1a2e]">
              <Mail size={16} className="text-[#6b7280] flex-shrink-0" />
              {CLIENT.email}
            </div>
            <div className="flex items-center gap-2.5 text-sm font-manrope text-[#1a1a2e]">
              <Phone size={16} className="text-[#6b7280] flex-shrink-0" />
              {CLIENT.telephone}
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-syne font-bold text-[#0f1a3a] uppercase tracking-wider">Chiffres</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-manrope text-[#6b7280]">CA total</p>
              <p className="text-xl font-syne font-bold text-[#1a1a2e]">{CLIENT.caTotal}</p>
            </div>
            <div>
              <p className="text-xs font-manrope text-[#6b7280]">Chantiers</p>
              <p className="text-xl font-syne font-bold text-[#1a1a2e]">{CLIENT.chantiers}</p>
            </div>
            <div>
              <p className="text-xs font-manrope text-[#6b7280]">Devis</p>
              <p className="text-xl font-syne font-bold text-[#1a1a2e]">{CLIENT.devis}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tabs & content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Tab bar */}
          <div className="flex gap-1 border-b border-gray-200">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-syne font-bold -mb-px border-b-2 transition-colors ${
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

          {/* Tab content */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {activeTab === 'chantiers' && (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    {['Chantier', 'Statut', 'Progression'].map((col) => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-manrope font-semibold uppercase tracking-wider text-gray-500">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CHANTIERS.map((ch) => (
                    <tr key={ch.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-manrope font-semibold text-[#1a1a2e]">{ch.nom}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-manrope font-medium bg-blue-50 text-blue-700">
                          {ch.statut}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#5ab4e0] rounded-full"
                              style={{ width: `${ch.progression}%` }}
                            />
                          </div>
                          <span className="text-xs font-manrope text-[#6b7280]">{ch.progression}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'devis' && (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    {['Num\u00e9ro', 'Statut', 'Date', 'Total TTC'].map((col) => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-manrope font-semibold uppercase tracking-wider text-gray-500">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DEVIS.map((d) => (
                    <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-manrope font-semibold text-[#1a1a2e]">{d.numero}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-manrope font-medium bg-blue-50 text-blue-700">
                          {d.statut}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-manrope text-gray-600">{d.date}</td>
                      <td className="px-4 py-3 text-sm font-manrope font-bold text-[#1a1a2e]">{d.totalTTC}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'factures' && (
              <div className="py-12 text-center">
                <Receipt size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-manrope text-gray-500">Aucune donn\u00e9e</p>
              </div>
            )}

            {activeTab === 'historique' && (
              <div className="py-12 text-center">
                <History size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-manrope text-gray-500">Aucune donn\u00e9e</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Quick actions */}
        <div className="space-y-3">
          <h2 className="text-sm font-syne font-bold text-[#0f1a3a] uppercase tracking-wider">Actions rapides</h2>
          <button className="w-full flex items-center gap-2 h-10 px-4 rounded-lg bg-[#e87a2a] hover:bg-[#f09050] text-white text-sm font-syne font-bold transition-colors">
            <Plus size={16} />
            Cr\u00e9er un devis pour ce client
          </button>
          <a
            href={`tel:${CLIENT.telephone.replace(/\s/g, '')}`}
            className="w-full flex items-center gap-2 h-10 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-syne font-bold text-[#1a1a2e] transition-colors"
          >
            <Phone size={16} />
            Appeler
          </a>
          <a
            href={`mailto:${CLIENT.email}`}
            className="w-full flex items-center gap-2 h-10 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-syne font-bold text-[#1a1a2e] transition-colors"
          >
            <Mail size={16} />
            Envoyer un email
          </a>
        </div>
      </div>
    </div>
  )
}
