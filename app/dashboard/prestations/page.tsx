'use client'

import { useState } from 'react'
import { Search, Wrench, Plus, X } from 'lucide-react'
import { useChantiers, LoadingSkeleton, ErrorBanner } from '@/lib/hooks'
import { createClient } from '@/lib/supabase/client'

interface PrestationRow {
  id: string
  nom: string
  description?: string
  created_at: string
}

export default function PrestationsPage() {
  const { data, loading, error, refetch } = useChantiers()
  const prestations = data as unknown as PrestationRow[]

  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [nom, setNom] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const filtered = prestations.filter(p =>
    !search || p.nom.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async () => {
    if (!nom.trim()) return
    setSaving(true)
    setFormError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non connecté')
      await supabase.from('chantiers').insert({ nom: nom.trim(), user_id: user.id })
      setShowModal(false)
      setNom('')
      refetch()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Supprimer la prestation "${label}" ? Elle ne sera plus proposée en autocomplétion.`)) return
    const supabase = createClient()
    await supabase.from('chantiers').delete().eq('id', id)
    refetch()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une prestation..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 rounded-lg border border-gray-200 pl-9 pr-4 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none transition-colors"
          />
        </div>
        <button
          onClick={() => { setNom(''); setFormError(null); setShowModal(true) }}
          className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-[#e87a2a] hover:bg-[#f09050] text-white text-sm font-syne font-bold transition-colors"
        >
          <Plus size={16} />
          Nouvelle prestation
        </button>
      </div>

      {loading && <LoadingSkeleton rows={5} />}
      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {!loading && !error && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                {['Désignation / Prestation', 'Ajouté le', 'Actions'].map(col => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-manrope font-semibold uppercase tracking-wider text-gray-500">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => (
                <tr key={p.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${idx % 2 === 1 ? 'bg-[#f8f9fa]' : ''}`}>
                  <td className="px-4 py-3 text-sm font-manrope font-semibold text-[#1a1a2e]">
                    {p.nom}
                  </td>
                  <td className="px-4 py-3 text-sm font-manrope text-gray-500">
                    {new Date(p.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-sm font-manrope">
                    <button
                      onClick={() => handleDelete(p.id, p.nom)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-14 text-center">
              <Wrench size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-manrope text-gray-500 mb-1">Aucune prestation enregistrée</p>
              <p className="text-xs font-manrope text-gray-400">
                Les prestations sont automatiquement sauvegardées lorsque vous créez un devis.<br />
                Vous pouvez aussi en ajouter manuellement ci-dessus.
              </p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-syne font-bold text-[#0f1a3a]">Nouvelle prestation</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {formError && <ErrorBanner message={formError} />}
              <div>
                <label className="block text-xs font-manrope font-semibold text-gray-500 uppercase tracking-wider mb-1">Désignation</label>
                <input
                  type="text"
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  placeholder="Ex. : Salle de bain, Pose carrelage, Électricité..."
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setShowModal(false)} className="h-10 px-5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-syne font-bold text-[#1a1a2e] transition-colors">
                Annuler
              </button>
              <button onClick={handleCreate} disabled={saving || !nom.trim()} className="h-10 px-5 rounded-lg bg-[#e87a2a] hover:bg-[#f09050] disabled:opacity-50 text-white text-sm font-syne font-bold transition-colors">
                {saving ? 'Enregistrement...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
