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
  X,
  Trash2,
} from 'lucide-react'
import {
  useIntervenants,
  insertRow,
  deleteRow,
  LoadingSkeleton,
  ErrorBanner,
} from '@/lib/hooks'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

type EquipeTab = 'employes' | 'interimaires' | 'sous-traitants' | 'materiels'

interface Intervenant {
  id: string
  user_id: string
  prenom: string
  nom: string
  telephone: string
  email: string
  metier: string
  type_contrat: 'cdi' | 'cdd' | 'apprenti' | 'interimaire' | 'sous-traitant'
  taux_horaire: number
  niveau_acces: 'proprietaire' | 'compagnon'
  couleur: string
  actif: boolean
  created_at?: string
}

const TAB_OPTIONS: { key: EquipeTab; label: string; icon: typeof Users }[] = [
  { key: 'employes', label: 'Employés', icon: Users },
  { key: 'interimaires', label: 'Intérimaires', icon: HardHat },
  { key: 'sous-traitants', label: 'Sous-traitants', icon: Hammer },
  { key: 'materiels', label: 'Matériels', icon: Wrench },
]

const EMPTY_LABELS: Record<string, string> = {
  interimaires: 'intérimaire',
  'sous-traitants': 'sous-traitant',
  materiels: 'matériel',
}

const CONTRAT_LABELS: Record<string, string> = {
  cdi: 'CDI',
  cdd: 'CDD',
  apprenti: 'Apprenti',
  interimaire: 'Intérimaire',
  'sous-traitant': 'Sous-traitant',
}

const AVATAR_COLORS = [
  'bg-[#5ab4e0]',
  'bg-emerald-500',
  'bg-[#e87a2a]',
  'bg-violet-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-cyan-500',
  'bg-indigo-500',
]

function getInitials(prenom: string, nom: string): string {
  return `${(prenom || '')[0] || ''}${(nom || '')[0] || ''}`.toUpperCase()
}

function getAvatarColor(couleur: string | null, id: string): string {
  if (couleur) return couleur
  const index = Math.abs(id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

// -------------------------------------------------------------------
// Page
// -------------------------------------------------------------------

export default function EquipePage() {
  const [activeTab, setActiveTab] = useState<EquipeTab>('employes')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data: intervenants, loading, error, refetch } = useIntervenants()

  // Filter by tab type_contrat mapping
  const tabContratMap: Record<EquipeTab, string[] | null> = {
    employes: ['cdi', 'cdd', 'apprenti'],
    interimaires: ['interimaire'],
    'sous-traitants': ['sous-traitant'],
    materiels: null,
  }

  const tabData = (intervenants as unknown as Intervenant[]).filter((e) => {
    const contrats = tabContratMap[activeTab]
    if (!contrats) return false
    return contrats.includes(e.type_contrat)
  })

  const filteredEmployes = tabData.filter((e) => {
    if (search) {
      const q = search.toLowerCase()
      const fullName = `${e.prenom} ${e.nom}`.toLowerCase()
      return (
        fullName.includes(q) ||
        e.metier.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q)
      )
    }
    return true
  })

  // ------- Modal form state -------
  const [form, setForm] = useState({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    metier: '',
    type_contrat: 'cdi' as Intervenant['type_contrat'],
    niveau_acces: 'compagnon' as Intervenant['niveau_acces'],
    taux_horaire: '',
  })

  const resetForm = () =>
    setForm({ prenom: '', nom: '', email: '', telephone: '', metier: '', type_contrat: 'cdi', niveau_acces: 'compagnon', taux_horaire: '' })

  const handleCreate = async () => {
    setSaving(true)
    try {
      await insertRow('intervenants', {
        prenom: form.prenom,
        nom: form.nom,
        email: form.email,
        telephone: form.telephone,
        metier: form.metier,
        type_contrat: form.type_contrat,
        niveau_acces: form.niveau_acces,
        taux_horaire: form.taux_horaire ? parseFloat(form.taux_horaire) : null,
        couleur: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
        actif: true,
      })
      refetch()
      setShowModal(false)
      resetForm()
    } catch {
      // error handled silently
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteRow('intervenants', id)
      refetch()
    } catch {
      // error handled silently
    } finally {
      setDeleteConfirm(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton rows={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <ErrorBanner message={error} onRetry={refetch} />
      </div>
    )
  }

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

      {activeTab !== 'materiels' ? (
        <>
          {/* Action bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un employé..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-200 pl-9 pr-4 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none transition-colors"
              />
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-[#e87a2a] hover:bg-[#f09050] text-white text-sm font-syne font-bold transition-colors"
            >
              <Plus size={16} />
              Nouvel employé
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gray-50">
                  {['Nom', 'Rôle', 'Contrat', 'Métier', 'Email', 'Téléphone', ''].map((col, i) => (
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
                        <div className={`w-8 h-8 rounded-full ${getAvatarColor(employe.couleur, employe.id)} flex items-center justify-center text-white text-xs font-syne font-bold`}>
                          {getInitials(employe.prenom, employe.nom)}
                        </div>
                        <span className="text-sm font-manrope font-semibold text-[#1a1a2e]">{employe.prenom} {employe.nom}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-manrope font-medium ${
                        employe.niveau_acces === 'proprietaire'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {employe.niveau_acces === 'proprietaire' ? 'Propriétaire' : 'Compagnon'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-manrope text-gray-600">{CONTRAT_LABELS[employe.type_contrat] || employe.type_contrat}</td>
                    <td className="px-4 py-3 text-sm font-manrope text-gray-600">{employe.metier}</td>
                    <td className="px-4 py-3 text-sm font-manrope text-gray-600">{employe.email}</td>
                    <td className="px-4 py-3 text-sm font-manrope text-gray-600">{employe.telephone}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {employe.niveau_acces === 'compagnon' && (
                          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#5ab4e0] text-[#5ab4e0] hover:bg-[#5ab4e0] hover:text-white text-xs font-syne font-bold transition-colors">
                            <UserPlus size={13} />
                            Inviter
                          </button>
                        )}
                        {deleteConfirm === employe.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(employe.id)}
                              className="px-2 py-1 rounded bg-red-500 text-white text-xs font-syne font-bold hover:bg-red-600 transition-colors"
                            >
                              Confirmer
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 rounded bg-gray-200 text-gray-600 text-xs font-syne font-bold hover:bg-gray-300 transition-colors"
                            >
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(employe.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredEmployes.length === 0 && (
              <div className="py-12 text-center">
                <Users size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-manrope text-gray-500">Aucun employé trouvé</p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Empty state for materiels tab */
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Wrench size={32} className="text-gray-400" />
          </div>
          <p className="text-sm font-manrope text-[#6b7280] mb-4">
            Aucun {EMPTY_LABELS[activeTab]} enregistré
          </p>
          <button className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-[#e87a2a] hover:bg-[#f09050] text-white text-sm font-syne font-bold transition-colors">
            <Plus size={16} />
            Ajouter
          </button>
        </div>
      )}

      {/* Modal: Nouvel employé */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-syne font-bold text-[#0f1a3a]">Nouvel employé</h2>
              <button onClick={() => { setShowModal(false); resetForm() }} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-manrope font-semibold text-gray-500 mb-1">Prénom</label>
                <input
                  type="text"
                  value={form.prenom}
                  onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-manrope font-semibold text-gray-500 mb-1">Nom</label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-manrope font-semibold text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-manrope font-semibold text-gray-500 mb-1">Téléphone</label>
                <input
                  type="text"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-manrope font-semibold text-gray-500 mb-1">Métier</label>
              <input
                type="text"
                value={form.metier}
                onChange={(e) => setForm({ ...form, metier: e.target.value })}
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-manrope font-semibold text-gray-500 mb-1">Contrat</label>
                <select
                  value={form.type_contrat}
                  onChange={(e) => setForm({ ...form, type_contrat: e.target.value as Intervenant['type_contrat'] })}
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
                >
                  <option value="cdi">CDI</option>
                  <option value="cdd">CDD</option>
                  <option value="apprenti">Apprenti</option>
                  <option value="interimaire">Intérimaire</option>
                  <option value="sous-traitant">Sous-traitant</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-manrope font-semibold text-gray-500 mb-1">Rôle</label>
                <select
                  value={form.niveau_acces}
                  onChange={(e) => setForm({ ...form, niveau_acces: e.target.value as Intervenant['niveau_acces'] })}
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
                >
                  <option value="compagnon">Compagnon</option>
                  <option value="proprietaire">Propriétaire</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-manrope font-semibold text-gray-500 mb-1">Taux horaire</label>
                <input
                  type="number"
                  value={form.taux_horaire}
                  onChange={(e) => setForm({ ...form, taux_horaire: e.target.value })}
                  placeholder="€/h"
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowModal(false); resetForm() }}
                className="h-10 px-5 rounded-lg border border-gray-200 text-sm font-syne font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.prenom || !form.nom}
                className="h-10 px-5 rounded-lg bg-[#e87a2a] hover:bg-[#f09050] disabled:opacity-50 text-white text-sm font-syne font-bold transition-colors"
              >
                {saving ? 'Enregistrement...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
