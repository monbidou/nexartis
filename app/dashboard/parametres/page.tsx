'use client'

import { useState } from 'react'
import {
  Building2,
  FileText,
  Receipt,
  Bell,
  User,
  CreditCard,
  Camera,
} from 'lucide-react'

// -------------------------------------------------------------------
// Types & constants
// -------------------------------------------------------------------

type Section =
  | 'entreprise'
  | 'documents'
  | 'facturation'
  | 'notifications'
  | 'compte'
  | 'abonnement'

interface NavItem {
  id: Section
  label: string
  icon: React.ElementType
}

const NAV_ITEMS: NavItem[] = [
  { id: 'entreprise', label: 'Entreprise', icon: Building2 },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'facturation', label: 'Facturation', icon: Receipt },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'compte', label: 'Compte', icon: User },
  { id: 'abonnement', label: 'Abonnement', icon: CreditCard },
]

// -------------------------------------------------------------------
// Shared components
// -------------------------------------------------------------------

function InputField({
  label,
  defaultValue = '',
  type = 'text',
  readOnly = false,
  placeholder = '',
}: {
  label: string
  defaultValue?: string
  type?: string
  readOnly?: boolean
  placeholder?: string
}) {
  return (
    <div>
      <label className="block font-manrope font-medium text-sm text-gray-700 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        defaultValue={defaultValue}
        readOnly={readOnly}
        placeholder={placeholder}
        className={`w-full h-12 rounded-lg border border-gray-200 px-4 font-manrope text-sm text-[#1a1a2e] focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none transition-colors ${
          readOnly ? 'bg-gray-50 cursor-not-allowed' : ''
        }`}
      />
    </div>
  )
}

function ToggleSwitch({
  label,
  defaultChecked = false,
}: {
  label: string
  defaultChecked?: boolean
}) {
  const [checked, setChecked] = useState(defaultChecked)
  return (
    <div className="flex items-center justify-between py-3">
      <span className="font-manrope text-sm text-[#1a1a2e]">{label}</span>
      <button
        type="button"
        onClick={() => setChecked(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? 'bg-[#5ab4e0]' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

function TextAreaField({
  label,
  defaultValue = '',
  rows = 3,
}: {
  label: string
  defaultValue?: string
  rows?: number
}) {
  return (
    <div>
      <label className="block font-manrope font-medium text-sm text-gray-700 mb-1.5">
        {label}
      </label>
      <textarea
        defaultValue={defaultValue}
        rows={rows}
        className="w-full rounded-lg border border-gray-200 px-4 py-3 font-manrope text-sm text-[#1a1a2e] focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none transition-colors resize-none"
      />
    </div>
  )
}

// -------------------------------------------------------------------
// Sections
// -------------------------------------------------------------------

function EntrepriseSection() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <h2 className="font-syne font-bold text-xl text-[#1a1a2e] mb-6">
        Informations de l&apos;entreprise
      </h2>

      {/* Logo upload */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
          <Camera size={24} className="text-[#6b7280]" />
        </div>
        <button className="font-manrope text-sm text-[#5ab4e0] font-medium hover:underline">
          Modifier le logo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField label="Nom de l'entreprise" defaultValue="SARL Plomberie Martin" />
        <InputField label="SIRET" defaultValue="123 456 789 00012" />
        <InputField label="N° TVA intracommunautaire" placeholder="FR 12 345678901" />
        <InputField label="Code NAF" placeholder="4322A" />
        <InputField label="Adresse" defaultValue="12 rue des Artisans" />
        <InputField label="Code postal" defaultValue="33000" />
        <InputField label="Ville" defaultValue="Bordeaux" />
        <InputField label="Téléphone" defaultValue="06 12 34 56 78" />
        <InputField label="Email" defaultValue="contact@plomberie-martin.fr" />
        <InputField label="IBAN" type="password" defaultValue="FR7630001007941234567890185" />
        <InputField label="N° assurance décennale" placeholder="POL-2024-XXXXX" />
        <div className="flex items-end">
          <ToggleSwitch label="Certification RGE" defaultChecked={false} />
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button className="h-12 px-8 rounded-lg font-syne font-bold text-white bg-[#e87a2a] hover:bg-[#f09050] transition-colors">
          Enregistrer les modifications
        </button>
      </div>
    </div>
  )
}

function DocumentsSection() {
  const [docColor, setDocColor] = useState('#5ab4e0')

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <h2 className="font-syne font-bold text-xl text-[#1a1a2e] mb-6">
        Documents
      </h2>

      <div className="space-y-6">
        {/* Numérotation devis */}
        <div>
          <label className="block font-manrope font-medium text-sm text-gray-700 mb-1.5">
            Numérotation devis
          </label>
          <div className="flex items-center gap-3">
            <span className="font-manrope text-sm text-[#6b7280]">Préfixe :</span>
            <input
              type="text"
              defaultValue="D"
              className="w-20 h-12 rounded-lg border border-gray-200 px-4 font-manrope text-sm text-[#1a1a2e] text-center focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
            />
            <span className="font-manrope text-sm text-[#6b7280]">Format :</span>
            <input
              type="text"
              defaultValue="YYYY-NNNNN"
              className="w-40 h-12 rounded-lg border border-gray-200 px-4 font-manrope text-sm text-[#1a1a2e] focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
            />
          </div>
        </div>

        {/* Numérotation factures */}
        <div>
          <label className="block font-manrope font-medium text-sm text-gray-700 mb-1.5">
            Numérotation factures
          </label>
          <div className="flex items-center gap-3">
            <span className="font-manrope text-sm text-[#6b7280]">Préfixe :</span>
            <input
              type="text"
              defaultValue="F"
              className="w-20 h-12 rounded-lg border border-gray-200 px-4 font-manrope text-sm text-[#1a1a2e] text-center focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
            />
            <span className="font-manrope text-sm text-[#6b7280]">Format :</span>
            <input
              type="text"
              defaultValue="YYYY-NNNNN"
              className="w-40 h-12 rounded-lg border border-gray-200 px-4 font-manrope text-sm text-[#1a1a2e] focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
            />
          </div>
        </div>

        <TextAreaField
          label="Conditions de paiement par défaut"
          defaultValue="Paiement à 30 jours à compter de la date de facturation."
        />

        <TextAreaField
          label="Mentions légales personnalisées"
          defaultValue=""
        />

        {/* Couleur principale */}
        <div>
          <label className="block font-manrope font-medium text-sm text-gray-700 mb-1.5">
            Couleur principale documents
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={docColor}
              onChange={(e) => setDocColor(e.target.value)}
              className="w-10 h-10 rounded-full border border-gray-200 cursor-pointer p-0.5"
            />
            <span className="font-manrope text-sm text-[#6b7280]">{docColor}</span>
          </div>
        </div>

        <ToggleSwitch label="Logo sur les documents" defaultChecked={true} />
      </div>

      <div className="mt-8 flex justify-end">
        <button className="h-12 px-8 rounded-lg font-syne font-bold text-white bg-[#e87a2a] hover:bg-[#f09050] transition-colors">
          Enregistrer les modifications
        </button>
      </div>
    </div>
  )
}

function FacturationSection() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <h2 className="font-syne font-bold text-xl text-[#1a1a2e] mb-6">
        Facturation
      </h2>

      <div className="space-y-6">
        {/* TVA par défaut */}
        <div>
          <label className="block font-manrope font-medium text-sm text-gray-700 mb-1.5">
            TVA par défaut
          </label>
          <select
            defaultValue="20"
            className="w-full h-12 rounded-lg border border-gray-200 px-4 font-manrope text-sm text-[#1a1a2e] focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none bg-white"
          >
            <option value="5.5">5,5 %</option>
            <option value="10">10 %</option>
            <option value="20">20 %</option>
          </select>
        </div>

        {/* Délai de paiement */}
        <div>
          <label className="block font-manrope font-medium text-sm text-gray-700 mb-1.5">
            Délai de paiement par défaut
          </label>
          <select
            defaultValue="30"
            className="w-full h-12 rounded-lg border border-gray-200 px-4 font-manrope text-sm text-[#1a1a2e] focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none bg-white"
          >
            <option value="0">À réception</option>
            <option value="15">15 jours</option>
            <option value="30">30 jours</option>
            <option value="45">45 jours</option>
          </select>
        </div>

        <InputField
          label="Pénalités de retard"
          defaultValue="3 fois le taux d'intérêt légal"
        />

        <InputField
          label="Indemnité forfaitaire"
          defaultValue="40 €"
        />

        <InputField
          label="Escompte"
          defaultValue="Aucun escompte accordé"
        />
      </div>

      <div className="mt-8 flex justify-end">
        <button className="h-12 px-8 rounded-lg font-syne font-bold text-white bg-[#e87a2a] hover:bg-[#f09050] transition-colors">
          Enregistrer les modifications
        </button>
      </div>
    </div>
  )
}

function NotificationsSection() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <h2 className="font-syne font-bold text-xl text-[#1a1a2e] mb-6">
        Notifications
      </h2>

      <div className="divide-y divide-gray-100">
        <ToggleSwitch label="Devis signé" defaultChecked={true} />
        <ToggleSwitch label="Facture payée" defaultChecked={true} />
        <ToggleSwitch label="Rappel impayé" defaultChecked={true} />
        <ToggleSwitch label="Modification planning" defaultChecked={true} />
        <ToggleSwitch label="Nouveau message équipe" defaultChecked={true} />
        <ToggleSwitch label="Rapport hebdomadaire par email" defaultChecked={false} />
      </div>

      <div className="mt-8 flex justify-end">
        <button className="h-12 px-8 rounded-lg font-syne font-bold text-white bg-[#e87a2a] hover:bg-[#f09050] transition-colors">
          Enregistrer les modifications
        </button>
      </div>
    </div>
  )
}

function CompteSection() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <h2 className="font-syne font-bold text-xl text-[#1a1a2e] mb-6">
        Compte
      </h2>

      <div className="space-y-6">
        <InputField
          label="Email"
          defaultValue="jean.dupont@email.fr"
          readOnly
        />

        <div>
          <button className="h-12 px-8 rounded-lg font-syne font-bold text-[#1a1a2e] border border-gray-200 hover:bg-gray-50 transition-colors">
            Modifier le mot de passe
          </button>
        </div>
      </div>

      <div className="mt-16 pt-6 border-t border-gray-100">
        <button className="font-manrope text-sm text-red-500 hover:text-red-700 hover:underline transition-colors">
          Supprimer mon compte
        </button>
      </div>
    </div>
  )
}

function AbonnementSection() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <h2 className="font-syne font-bold text-xl text-[#1a1a2e] mb-6">
        Abonnement
      </h2>

      <div className="border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-syne font-bold text-lg text-[#1a1a2e]">
              Artidoc &mdash; 25 &euro; / mois HT
            </h3>
            <p className="font-manrope text-sm text-[#6b7280] mt-1">
              Toutes les fonctionnalités incluses
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 font-manrope text-xs font-medium">
            Actif
          </span>
        </div>

        <p className="font-manrope text-sm text-[#6b7280] mb-4">
          Prochaine facturation : 07/05/2026
        </p>

        <div className="flex flex-col gap-3">
          <button className="font-manrope text-sm text-[#5ab4e0] font-medium hover:underline text-left">
            Modifier le moyen de paiement
          </button>
          <button className="font-manrope text-sm text-red-500 hover:text-red-700 hover:underline text-left">
            Résilier l&apos;abonnement
          </button>
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------------------
// Main page
// -------------------------------------------------------------------

export default function ParametresPage() {
  const [activeSection, setActiveSection] = useState<Section>('entreprise')

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 flex-shrink-0">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <nav className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const active = activeSection === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-manrope font-medium transition-colors whitespace-nowrap w-full text-left ${
                    active
                      ? 'bg-[#5ab4e0]/10 text-[#5ab4e0] border-l-0 md:border-l-[3px] border-b-[3px] md:border-b-0 border-[#5ab4e0]'
                      : 'text-[#6b7280] hover:bg-gray-50'
                  }`}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Content area */}
      <div className="flex-1 min-w-0">
        {activeSection === 'entreprise' && <EntrepriseSection />}
        {activeSection === 'documents' && <DocumentsSection />}
        {activeSection === 'facturation' && <FacturationSection />}
        {activeSection === 'notifications' && <NotificationsSection />}
        {activeSection === 'compte' && <CompteSection />}
        {activeSection === 'abonnement' && <AbonnementSection />}
      </div>
    </div>
  )
}
