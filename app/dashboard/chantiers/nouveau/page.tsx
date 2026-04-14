'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useClients, useDevis, insertRow, updateRow, LoadingSkeleton } from '@/lib/hooks'

const STATUT_OPTIONS = ['prospection', 'signe', 'en_cours', 'livre', 'cloture', 'archive']
const STATUT_LABELS: Record<string, string> = {
  prospection: 'Prospection',
  signe: 'Signé',
  en_cours: 'En cours',
  livre: 'Livré',
  cloture: 'Clôturé',
  archive: 'Archivé',
}

export default function NouveauChantierPage() {
  const router = useRouter()
  const { data: clients, loading: loadingClients } = useClients()
  const { data: allDevis } = useDevis()

  const [nom, setNom] = useState('')
  const [clientId, setClientId] = useState('')
  const [adresse, setAdresse] = useState('')
  const [adresseManuallyEdited, setAdresseManuallyEdited] = useState(false)
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [statut, setStatut] = useState('prospection')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // BUG E FIX : auto-remplir l'adresse quand on choisit un client
  // (uniquement si l'utilisateur n'a pas déjà tapé une adresse manuellement)
  useEffect(() => {
    if (!clientId || adresseManuallyEdited) return
    const c = (clients as Array<Record<string, unknown>>).find((cl) => cl.id === clientId)
    if (!c) return
    const fullAdresse = [
      (c.adresse as string) || '',
      `${(c.code_postal as string) || ''} ${(c.ville as string) || ''}`.trim(),
    ].filter(Boolean).join(', ')
    if (fullAdresse) setAdresse(fullAdresse)
  }, [clientId, clients, adresseManuallyEdited])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nom.trim()) {
      setError('Le nom du chantier est requis.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const chantier = await insertRow('chantiers', {
        titre: nom.trim(),
        client_id: clientId || null,
        adresse_chantier: adresse || null,
        date_debut: dateDebut || null,
        date_fin_prevue: dateFin || null,
        statut,
        notes: notes || null,
      })
      const newChantierId = (chantier as { id: string }).id

      // BUG F FIX : auto-rattacher tous les devis signés/finalisés du même client
      // qui n'ont pas encore de chantier_id (statuts valides du schema:
      // brouillon, envoye, finalise, signe, refuse, expire, facture)
      if (clientId && allDevis) {
        const devisToLink = (allDevis as Array<Record<string, unknown>>).filter((d) =>
          d.client_id === clientId &&
          (d.statut === 'signe' || d.statut === 'finalise' || d.statut === 'envoye') &&
          !d.chantier_id
        )
        for (const d of devisToLink) {
          try {
            await updateRow('devis', d.id as string, { chantier_id: newChantierId })
          } catch { /* ignore les erreurs individuelles, on ne bloque pas */ }
        }
      }

      router.push(`/dashboard/chantiers/${newChantierId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création')
      setSaving(false)
    }
  }

  const inputClasses = 'w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none transition-colors'

  if (loadingClients) {
    return <div className="space-y-6"><LoadingSkeleton rows={6} /></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/chantiers" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <h1 className="text-2xl font-syne font-bold text-[#0f1a3a]">Nouveau chantier</h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-sm text-red-600 font-manrope">{error}</p>
          </div>
        )}

        {/* Nom du chantier */}
        <div>
          <label className="block text-xs font-manrope font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Nom du chantier *
          </label>
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex: Rénovation salle de bain"
            required
            className={inputClasses}
          />
        </div>

        {/* Client */}
        <div>
          <label className="block text-xs font-manrope font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Client
          </label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={inputClasses}
          >
            <option value="">Sélectionner un client...</option>
            {(clients as { id: string; prenom?: string; nom?: string }[]).map((c) => (
              <option key={c.id} value={c.id}>
                {`${c.prenom ?? ''} ${c.nom ?? ''}`.trim()}
              </option>
            ))}
          </select>
        </div>

        {/* Adresse */}
        <div>
          <label className="block text-xs font-manrope font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Adresse du chantier
          </label>
          <input
            type="text"
            value={adresse}
            onChange={(e) => { setAdresse(e.target.value); setAdresseManuallyEdited(true) }}
            placeholder="12 rue des Lilas, 33000 Bordeaux"
            className={inputClasses}
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-manrope font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Date de début
            </label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <label className="block text-xs font-manrope font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Date de fin prévue
            </label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className={inputClasses}
            />
          </div>
        </div>

        {/* Statut */}
        <div>
          <label className="block text-xs font-manrope font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Statut
          </label>
          <select
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
            className={inputClasses}
          >
            {STATUT_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUT_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-manrope font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Notes internes sur ce chantier..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none resize-none transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/dashboard/chantiers"
            className="h-10 px-5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-syne font-bold text-[#1a1a2e] transition-colors inline-flex items-center"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="h-10 px-5 rounded-lg bg-[#e87a2a] hover:bg-[#f09050] disabled:opacity-50 text-white text-sm font-syne font-bold transition-colors"
          >
            {saving ? 'Création...' : 'Créer le chantier'}
          </button>
        </div>
      </form>
    </div>
  )
}
