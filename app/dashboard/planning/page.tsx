'use client'

import { useState } from 'react'
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'

// -------------------------------------------------------------------
// Types & Data
// -------------------------------------------------------------------

type ViewMode = 'Jour' | 'Semaine' | 'Mois'
type Creneau = 'Matin 8h-12h' | 'Après-midi 13h-17h' | 'Journée 8h-17h'

interface Intervention {
  client: string
  objet: string
  horaires: string
  bgClass: string
  borderClass: string
}

interface TeamMember {
  name: string
  initials: string
  color: string
  interventions: Record<number, Intervention | undefined>
}

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const DATES = [7, 8, 9, 10, 11, 12, 13]

const TEAM: TeamMember[] = [
  {
    name: 'Michel R.',
    initials: 'MR',
    color: 'bg-emerald-500',
    interventions: {
      0: { client: 'M. Dupont', objet: 'Instal. chauffe-eau', horaires: '8h-17h', bgClass: 'bg-sky-50', borderClass: 'border-l-4 border-[#5ab4e0]' },
      2: { client: 'M. Bernard', objet: 'Pose carrelage', horaires: '8h-12h', bgClass: 'bg-emerald-50', borderClass: 'border-l-4 border-emerald-500' },
    },
  },
  {
    name: 'Thomas B.',
    initials: 'TB',
    color: 'bg-[#e87a2a]',
    interventions: {
      1: { client: 'Mme Martin', objet: 'Rénov. salle de bain', horaires: '8h-17h', bgClass: 'bg-orange-50', borderClass: 'border-l-4 border-[#e87a2a]' },
      4: { client: 'Mme Girard', objet: 'Électricité cuisine', horaires: '8h-12h', bgClass: 'bg-rose-50', borderClass: 'border-l-4 border-rose-500' },
    },
  },
  {
    name: 'Lucas D.',
    initials: 'LD',
    color: 'bg-violet-500',
    interventions: {
      2: { client: 'Mme Moreau', objet: 'Peinture façade', horaires: '13h-17h', bgClass: 'bg-purple-50', borderClass: 'border-l-4 border-purple-500' },
      3: { client: 'M. Petit', objet: 'Extension terrasse', horaires: '8h-17h', bgClass: 'bg-amber-50', borderClass: 'border-l-4 border-amber-500' },
    },
  },
]

const CLIENTS_LIST = ['M. Dupont', 'Mme Martin', 'M. Bernard', 'Mme Girard', 'Mme Moreau', 'M. Petit']

// -------------------------------------------------------------------
// Page
// -------------------------------------------------------------------

export default function PlanningPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('Semaine')
  const [showModal, setShowModal] = useState(false)
  const [modalClient, setModalClient] = useState('')
  const [modalIntervenant, setModalIntervenant] = useState('')
  const [modalDate, setModalDate] = useState('')
  const [modalCreneau, setModalCreneau] = useState<Creneau>('Journée 8h-17h')
  const [modalObjet, setModalObjet] = useState('')
  const [conflictStatus, setConflictStatus] = useState<'none' | 'ok' | 'conflict'>('none')

  const resetModal = () => {
    setModalClient('')
    setModalIntervenant('')
    setModalDate('')
    setModalCreneau('Journée 8h-17h')
    setModalObjet('')
    setConflictStatus('none')
  }

  const openModal = () => {
    resetModal()
    setShowModal(true)
  }

  const checkConflicts = () => {
    setConflictStatus('ok')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* View toggle */}
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
          {(['Jour', 'Semaine', 'Mois'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 text-sm font-syne font-bold transition-colors ${
                viewMode === mode
                  ? 'bg-gray-100 text-[#0f1a3a]'
                  : 'bg-white text-[#6b7280] hover:text-[#1a1a2e]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2 flex-1 justify-center">
          <button className="inline-flex items-center gap-1 px-3 py-2 text-sm font-manrope text-[#6b7280] hover:text-[#1a1a2e] transition-colors">
            <ChevronLeft size={16} />
            Sem. précédente
          </button>
          <span className="flex items-center gap-1.5 px-3 py-2 text-sm font-syne font-bold text-[#0f1a3a]">
            <CalendarDays size={16} className="text-[#5ab4e0]" />
            Sem. du 7 au 11 avril 2026
          </span>
          <button className="inline-flex items-center gap-1 px-3 py-2 text-sm font-manrope text-[#6b7280] hover:text-[#1a1a2e] transition-colors">
            Sem. suivante
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Add button */}
        <button
          onClick={openModal}
          className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-[#e87a2a] hover:bg-[#f09050] text-white text-sm font-syne font-bold transition-colors"
        >
          <Plus size={16} />
          Ajouter une intervention
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-manrope font-semibold uppercase tracking-wider text-gray-500 w-[140px] border-r border-gray-200">
                Équipe
              </th>
              {DAYS.map((day, i) => (
                <th
                  key={day}
                  className="px-3 py-3 text-center text-xs font-syne font-semibold text-gray-500 border-r border-gray-100 last:border-r-0"
                >
                  <span className="block text-[#0f1a3a] font-bold text-sm">{day} {DATES[i]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TEAM.map((member, mIdx) => (
              <tr
                key={member.name}
                className={`border-b border-gray-100 ${mIdx % 2 === 1 ? 'bg-[#f8f9fa]' : ''}`}
              >
                {/* Name column */}
                <td className="px-4 py-3 border-r border-gray-200">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full ${member.color} flex items-center justify-center text-white text-xs font-syne font-bold`}>
                      {member.initials}
                    </div>
                    <span className="text-sm font-manrope font-semibold text-[#1a1a2e]">{member.name}</span>
                  </div>
                </td>
                {/* Day columns */}
                {DAYS.map((_, dayIdx) => {
                  const intervention = member.interventions[dayIdx]
                  return (
                    <td
                      key={dayIdx}
                      className="px-2 py-2 border-r border-gray-100 last:border-r-0 min-h-[100px] h-[100px] align-top"
                    >
                      {intervention ? (
                        <div className={`rounded-lg p-2.5 ${intervention.bgClass} ${intervention.borderClass} cursor-pointer hover:shadow-sm transition-shadow`}>
                          <p className="text-[15px] font-manrope font-bold text-[#0f1a3a] leading-tight">{intervention.client}</p>
                          <p className="text-[13px] font-manrope text-[#5ab4e0] mt-0.5">{intervention.objet}</p>
                          <p className="text-[12px] font-manrope text-[#6b7280] mt-0.5">{intervention.horaires}</p>
                        </div>
                      ) : (
                        <div className="group h-full min-h-[80px] rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                          <button
                            onClick={openModal}
                            className="text-gray-300 group-hover:text-[#5ab4e0] transition-colors"
                          >
                            <Plus size={20} />
                          </button>
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add intervention modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-5">
            {/* Modal header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-syne font-bold text-[#0f1a3a]">Nouvelle intervention</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Client */}
            <div>
              <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Client</label>
              <select
                value={modalClient}
                onChange={(e) => setModalClient(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
              >
                <option value="">Sélectionner un client...</option>
                {CLIENTS_LIST.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Intervenant */}
            <div>
              <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Intervenant</label>
              <select
                value={modalIntervenant}
                onChange={(e) => setModalIntervenant(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
              >
                <option value="">Sélectionner un intervenant...</option>
                {TEAM.map((m) => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Date</label>
              <input
                type="date"
                value={modalDate}
                onChange={(e) => setModalDate(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
              />
            </div>

            {/* Créneau */}
            <div>
              <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Créneau</label>
              <div className="flex gap-2">
                {(['Matin 8h-12h', 'Après-midi 13h-17h', 'Journée 8h-17h'] as Creneau[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setModalCreneau(c)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-manrope transition-colors ${
                      modalCreneau === c
                        ? 'border-[#5ab4e0] bg-sky-50 text-[#0f1a3a] font-medium'
                        : 'border-gray-200 text-[#6b7280] hover:border-gray-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Objet */}
            <div>
              <label className="block text-sm font-manrope font-medium text-[#1a1a2e] mb-1">Objet des travaux</label>
              <input
                type="text"
                value={modalObjet}
                onChange={(e) => setModalObjet(e.target.value)}
                placeholder="Ex: Installation chauffe-eau"
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-manrope focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
              />
            </div>

            {/* Conflict check */}
            <div>
              <button
                onClick={checkConflicts}
                className="text-sm font-manrope font-medium text-[#5ab4e0] hover:text-[#0f1a3a] transition-colors"
              >
                Vérifier les conflits
              </button>
              {conflictStatus === 'ok' && (
                <div className="flex items-center gap-1.5 mt-2 text-sm font-manrope text-green-600">
                  <CheckCircle2 size={16} />
                  Aucun conflit
                </div>
              )}
              {conflictStatus === 'conflict' && (
                <div className="flex items-center gap-1.5 mt-2 text-sm font-manrope text-red-600">
                  <AlertTriangle size={16} />
                  Conflit détecté
                </div>
              )}
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
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
