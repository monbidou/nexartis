'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Building2,
  FileText,
  Receipt,
  Bell,
  User,
  CreditCard,
  Camera,
  PenTool,
} from 'lucide-react'
import {
  useEntreprise,
  useUser,
  LoadingSkeleton,
} from '@/lib/hooks'

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
  | 'signature'

interface NavItem {
  id: Section
  label: string
  icon: React.ElementType
}

const NAV_ITEMS: NavItem[] = [
  { id: 'entreprise', label: 'Entreprise', icon: Building2 },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'facturation', label: 'Facturation', icon: Receipt },
  { id: 'signature', label: 'Ma signature', icon: PenTool },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'compte', label: 'Compte', icon: User },
  { id: 'abonnement', label: 'Abonnement', icon: CreditCard },
]

// -------------------------------------------------------------------
// Shared components
// -------------------------------------------------------------------

function InputField({
  label,
  value = '',
  onChange,
  type = 'text',
  readOnly = false,
  placeholder = '',
}: {
  label: string
  value?: string
  onChange?: (v: string) => void
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
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
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
  checked = false,
  onChange,
}: {
  label: string
  checked?: boolean
  onChange?: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="font-manrope text-sm text-[#1a1a2e]">{label}</span>
      <button
        type="button"
        onClick={() => onChange?.(!checked)}
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
  value = '',
  onChange,
  rows = 3,
}: {
  label: string
  value?: string
  onChange?: (v: string) => void
  rows?: number
}) {
  return (
    <div>
      <label className="block font-manrope font-medium text-sm text-gray-700 mb-1.5">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        rows={rows}
        className="w-full rounded-lg border border-gray-200 px-4 py-3 font-manrope text-sm text-[#1a1a2e] focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none transition-colors resize-none"
      />
    </div>
  )
}

function SaveButton({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <div className="mt-8 flex justify-end">
      <button
        onClick={onClick}
        disabled={saving}
        className="h-12 px-8 rounded-lg font-syne font-bold text-white bg-[#e87a2a] hover:bg-[#f09050] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
      </button>
    </div>
  )
}

function SuccessMessage({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
      <p className="text-sm text-green-700 font-manrope">{message}</p>
    </div>
  )
}

function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
      <p className="text-sm text-red-600 font-manrope">{message}</p>
    </div>
  )
}

// -------------------------------------------------------------------
// Sections
// -------------------------------------------------------------------

function EntrepriseSection({
  entreprise,
  update,
}: {
  entreprise: Record<string, unknown>
  update: (v: Record<string, unknown>) => Promise<unknown>
}) {
  const [nom, setNom] = useState('')
  const [siret, setSiret] = useState('')
  const [tva, setTva] = useState('')
  const [naf, setNaf] = useState('')
  const [formeJuridique, setFormeJuridique] = useState('')
  const [capitalSocial, setCapitalSocial] = useState('')
  const [rcsRm, setRcsRm] = useState('')
  const [adresse, setAdresse] = useState('')
  const [codePostal, setCodePostal] = useState('')
  const [ville, setVille] = useState('')
  const [telephone, setTelephone] = useState('')
  const [email, setEmail] = useState('')
  const [iban, setIban] = useState('')
  const [bic, setBic] = useState('')
  const [assuranceNom, setAssuranceNom] = useState('')
  const [decennale, setDecennale] = useState('')
  const [assuranceZone, setAssuranceZone] = useState('')
  const [rge, setRge] = useState(false)
  const [metier, setMetier] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (entreprise) {
      setNom((entreprise.nom as string) ?? '')
      setSiret((entreprise.siret as string) ?? '')
      setTva((entreprise.tva_intracommunautaire as string) ?? '')
      setNaf((entreprise.code_naf as string) ?? '')
      setFormeJuridique((entreprise.forme_juridique as string) ?? '')
      setCapitalSocial((entreprise.capital_social as string) ?? '')
      setRcsRm((entreprise.rcs_rm as string) ?? '')
      setAdresse((entreprise.adresse as string) ?? '')
      setCodePostal((entreprise.code_postal as string) ?? '')
      setVille((entreprise.ville as string) ?? '')
      setTelephone((entreprise.telephone as string) ?? '')
      setEmail((entreprise.email as string) ?? '')
      setIban((entreprise.iban as string) ?? '')
      setBic((entreprise.bic as string) ?? '')
      setAssuranceNom((entreprise.assurance_nom as string) ?? '')
      setDecennale((entreprise.decennale_numero as string) ?? '')
      setAssuranceZone((entreprise.assurance_zone as string) ?? '')
      setRge(!!entreprise.rge)
      setMetier((entreprise.metier as string) ?? '')
    }
  }, [entreprise])

  const handleSave = async () => {
    setSaving(true)
    setSuccess(null)
    setErrorMsg(null)
    try {
      await update({
        nom, siret, tva_intracommunautaire: tva, code_naf: naf,
        forme_juridique: formeJuridique || null, capital_social: capitalSocial || null, rcs_rm: rcsRm || null,
        adresse, code_postal: codePostal, ville, telephone, email,
        iban, bic,
        assurance_nom: assuranceNom || null, decennale_numero: decennale, assurance_zone: assuranceZone || null,
        rge, metier,
      })
      setSuccess('Informations de l\'entreprise enregistrees avec succes.')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <h2 className="font-syne font-bold text-xl text-[#1a1a2e] mb-6">
        Informations de l&apos;entreprise
      </h2>

      {/* Logo upload with background removal */}
      <LogoUploadSection entreprise={entreprise} update={update} />

            {/* Identit\u00e9 de l'entreprise */}
      <p className="text-xs font-manrope text-gray-400 uppercase tracking-wider mb-3 mt-2">Identit\u00e9</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField label="Nom de l'entreprise" value={nom} onChange={setNom} />
        <div>
          <label className="block font-manrope font-medium text-sm text-gray-700 mb-1.5">Forme juridique</label>
          <select value={formeJuridique} onChange={e => setFormeJuridique(e.target.value)} className="w-full h-12 rounded-lg border border-gray-200 px-4 font-manrope text-sm text-[#1a1a2e] focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none transition-colors bg-white">
            <option value="">-- Choisir --</option>
            <option value="EI">EI (Entreprise Individuelle)</option>
            <option value="Micro-entreprise">Micro-entreprise (Auto-entrepreneur)</option>
            <option value="EURL">EURL</option>
            <option value="SARL">SARL</option>
            <option value="SAS">SAS</option>
            <option value="SASU">SASU</option>
          </select>
        </div>
        <InputField label="SIRET" value={siret} onChange={setSiret} placeholder="123 456 789 00012" />
        <InputField label="N\u00b0 TVA intracommunautaire" value={tva} onChange={setTva} placeholder="FR 12 345678901" />
        <InputField label="Code NAF" value={naf} onChange={setNaf} placeholder="4322A" />
        <InputField label="RCS / RM (n\u00b0 + ville)" value={rcsRm} onChange={setRcsRm} placeholder="RM Bordeaux 123456789" />
        <InputField label="Capital social" value={capitalSocial} onChange={setCapitalSocial} placeholder="10 000 \u20ac (laisser vide si EI)" />
        <InputField label="M\u00e9tier / activit\u00e9" value={metier} onChange={setMetier} />
      </div>

      {/* Coordonn\u00e9es */}
      <p className="text-xs font-manrope text-gray-400 uppercase tracking-wider mb-3 mt-8">Coordonn\u00e9es</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField label="Adresse" value={adresse} onChange={setAdresse} />
        <InputField label="Code postal" value={codePostal} onChange={setCodePostal} />
        <InputField label="Ville" value={ville} onChange={setVille} />
        <InputField label="T\u00e9l\u00e9phone" value={telephone} onChange={setTelephone} />
        <InputField label="Email" value={email} onChange={setEmail} />
      </div>

      {/* Assurance d\u00e9cennale */}
      <p className="text-xs font-manrope text-gray-400 uppercase tracking-wider mb-3 mt-8">Assurance d\u00e9cennale</p>
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
        <p className="text-sm text-amber-700 font-manrope">Obligatoire sur tous vos devis et factures (amende jusqu&apos;\u00e0 75 000 \u20ac). Ces informations appara\u00eetront automatiquement sur vos documents.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField label="Nom de l'assureur" value={assuranceNom} onChange={setAssuranceNom} placeholder="AXA, MAAF, SMABTP..." />
        <InputField label="N\u00b0 de police" value={decennale} onChange={setDecennale} placeholder="POL-2024-XXXXX" />
        <InputField label="Zone g\u00e9ographique couverte" value={assuranceZone} onChange={setAssuranceZone} placeholder="France enti\u00e8re" />
        <div className="flex items-end">
          <ToggleSwitch label="Certification RGE" checked={rge} onChange={setRge} />
        </div>
      </div>

      {/* Bancaire */}
      <p className="text-xs font-manrope text-gray-400 uppercase tracking-wider mb-3 mt-8">Informations bancaires</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField label="IBAN" type="password" value={iban} onChange={setIban} />
        <InputField label="BIC" value={bic} onChange={setBic} />
      </div>

      <SaveButton onClick={handleSave} saving={saving} />
      <SuccessMessage message={success} />
      <ErrorMessage message={errorMsg} />
    </div>
  )
}

function DocumentsSection({
  entreprise,
  update,
}: {
  entreprise: Record<string, unknown>
  update: (v: Record<string, unknown>) => Promise<unknown>
}) {
  const [prefixDevis, setPrefixDevis] = useState('D')
  const [prefixFactures, setPrefixFactures] = useState('F')
  const [conditionsPaiement, setConditionsPaiement] = useState('')
  const [mentionsLegales, setMentionsLegales] = useState('')
  const [docColor, setDocColor] = useState('#5ab4e0')
  const [logoOnDocs, setLogoOnDocs] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (entreprise) {
      setPrefixDevis((entreprise.prefix_devis as string) ?? 'D')
      setPrefixFactures((entreprise.prefix_factures as string) ?? 'F')
      setConditionsPaiement((entreprise.conditions_paiement as string) ?? '')
      setDocColor((entreprise.couleur_principale as string) ?? '#5ab4e0')
    }
  }, [entreprise])

  const handleSave = async () => {
    setSaving(true)
    setSuccess(null)
    setErrorMsg(null)
    try {
      await update({
        prefix_devis: prefixDevis,
        prefix_factures: prefixFactures,
        conditions_paiement: conditionsPaiement,
        couleur_principale: docColor,
      })
      setSuccess('Parametres de documents enregistres avec succes.')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <h2 className="font-syne font-bold text-xl text-[#1a1a2e] mb-6">
        Documents
      </h2>

      <div className="space-y-6">
        {/* Numerotation devis */}
        <div>
          <label className="block font-manrope font-medium text-sm text-gray-700 mb-1.5">
            Numerotation devis
          </label>
          <div className="flex items-center gap-3">
            <span className="font-manrope text-sm text-[#6b7280]">Prefixe :</span>
            <input
              type="text"
              value={prefixDevis}
              onChange={(e) => setPrefixDevis(e.target.value)}
              className="w-20 h-12 rounded-lg border border-gray-200 px-4 font-manrope text-sm text-[#1a1a2e] text-center focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
            />
            <span className="font-manrope text-sm text-[#6b7280]">Format :</span>
            <input
              type="text"
              defaultValue="YYYY-NNNNN"
              readOnly
              className="w-40 h-12 rounded-lg border border-gray-200 px-4 font-manrope text-sm text-[#1a1a2e] focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none bg-gray-50"
            />
          </div>
        </div>

        {/* Numerotation factures */}
        <div>
          <label className="block font-manrope font-medium text-sm text-gray-700 mb-1.5">
            Numerotation factures
          </label>
          <div className="flex items-center gap-3">
            <span className="font-manrope text-sm text-[#6b7280]">Prefixe :</span>
            <input
              type="text"
              value={prefixFactures}
              onChange={(e) => setPrefixFactures(e.target.value)}
              className="w-20 h-12 rounded-lg border border-gray-200 px-4 font-manrope text-sm text-[#1a1a2e] text-center focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none"
            />
            <span className="font-manrope text-sm text-[#6b7280]">Format :</span>
            <input
              type="text"
              defaultValue="YYYY-NNNNN"
              readOnly
              className="w-40 h-12 rounded-lg border border-gray-200 px-4 font-manrope text-sm text-[#1a1a2e] focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none bg-gray-50"
            />
          </div>
        </div>

        <TextAreaField
          label="Conditions de paiement par defaut"
          value={conditionsPaiement}
          onChange={setConditionsPaiement}
        />

        <TextAreaField
          label="Mentions legales personnalisees"
          value={mentionsLegales}
          onChange={setMentionsLegales}
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

        <ToggleSwitch label="Logo sur les documents" checked={logoOnDocs} onChange={setLogoOnDocs} />
      </div>

      <SaveButton onClick={handleSave} saving={saving} />
      <SuccessMessage message={success} />
      <ErrorMessage message={errorMsg} />
    </div>
  )
}

function FacturationSection({
  entreprise,
  update,
}: {
  entreprise: Record<string, unknown>
  update: (v: Record<string, unknown>) => Promise<unknown>
}) {
  const [tvaDefaut, setTvaDefaut] = useState('20')
  const [delaiPaiement, setDelaiPaiement] = useState('30')
  const [penalites, setPenalites] = useState("3 fois le taux d'interet legal")
  const [indemnite, setIndemnite] = useState('40 EUR')
  const [escompte, setEscompte] = useState('Aucun escompte accorde')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (entreprise) {
      setTvaDefaut(String(entreprise.tva_defaut ?? '20'))
      setDelaiPaiement(String(entreprise.delai_paiement_defaut ?? '30'))
    }
  }, [entreprise])

  const handleSave = async () => {
    setSaving(true)
    setSuccess(null)
    setErrorMsg(null)
    try {
      await update({
        tva_defaut: parseFloat(tvaDefaut),
        delai_paiement_defaut: parseInt(delaiPaiement, 10),
      })
      setSuccess('Parametres de facturation enregistres avec succes.')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <h2 className="font-syne font-bold text-xl text-[#1a1a2e] mb-6">
        Facturation
      </h2>

      <div className="space-y-6">
        {/* TVA par defaut */}
        <div>
          <label className="block font-manrope font-medium text-sm text-gray-700 mb-1.5">
            Taux de TVA par défaut
          </label>
          <select
            value={tvaDefaut}
            onChange={(e) => setTvaDefaut(e.target.value)}
            className="w-full h-12 rounded-lg border border-gray-200 px-4 font-manrope text-sm text-[#1a1a2e] focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none bg-white"
          >
            <option value="0">Sans TVA (auto-entrepreneur)</option>
            <option value="5.5">5,5 %</option>
            <option value="10">10 %</option>
            <option value="20">20 %</option>
          </select>
        </div>

        {/* Delai de paiement */}
        <div>
          <label className="block font-manrope font-medium text-sm text-gray-700 mb-1.5">
            Delai de paiement par defaut
          </label>
          <select
            value={delaiPaiement}
            onChange={(e) => setDelaiPaiement(e.target.value)}
            className="w-full h-12 rounded-lg border border-gray-200 px-4 font-manrope text-sm text-[#1a1a2e] focus:border-[#5ab4e0] focus:ring-1 focus:ring-[#5ab4e0] outline-none bg-white"
          >
            <option value="0">A reception</option>
            <option value="15">15 jours</option>
            <option value="30">30 jours</option>
            <option value="45">45 jours</option>
          </select>
        </div>

        <InputField
          label="Pénalités de retard"
          value={penalites}
          onChange={setPenalites}
        />

        <InputField
          label="Indemnite forfaitaire"
          value={indemnite}
          onChange={setIndemnite}
        />

        <InputField
          label="Escompte"
          value={escompte}
          onChange={setEscompte}
        />
      </div>

      <SaveButton onClick={handleSave} saving={saving} />
      <SuccessMessage message={success} />
      <ErrorMessage message={errorMsg} />
    </div>
  )
}

function NotificationsSection() {
  const [devisSigne, setDevisSigne] = useState(true)
  const [facturePayee, setFacturePayee] = useState(true)
  const [rappelImpaye, setRappelImpaye] = useState(true)
  const [modifPlanning, setModifPlanning] = useState(true)
  const [nouveauMessage, setNouveauMessage] = useState(true)
  const [rapportHebdo, setRapportHebdo] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <h2 className="font-syne font-bold text-xl text-[#1a1a2e] mb-6">
        Notifications
      </h2>

      <div className="divide-y divide-gray-100">
        <ToggleSwitch label="Devis signe" checked={devisSigne} onChange={setDevisSigne} />
        <ToggleSwitch label="Facture payee" checked={facturePayee} onChange={setFacturePayee} />
        <ToggleSwitch label="Rappel impaye" checked={rappelImpaye} onChange={setRappelImpaye} />
        <ToggleSwitch label="Modification planning" checked={modifPlanning} onChange={setModifPlanning} />
        <ToggleSwitch label="Nouveau message equipe" checked={nouveauMessage} onChange={setNouveauMessage} />
        <ToggleSwitch label="Rapport hebdomadaire par email" checked={rapportHebdo} onChange={setRapportHebdo} />
      </div>

      <div className="mt-8 flex justify-end">
        <button className="h-12 px-8 rounded-lg font-syne font-bold text-white bg-[#e87a2a] hover:bg-[#f09050] transition-colors">
          Enregistrer les modifications
        </button>
      </div>
    </div>
  )
}

function CompteSection({ userEmail }: { userEmail: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <h2 className="font-syne font-bold text-xl text-[#1a1a2e] mb-6">
        Compte
      </h2>

      <div className="space-y-6">
        <InputField
          label="Email"
          value={userEmail}
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

// -------------------------------------------------------------------
// Logo upload with background removal
// -------------------------------------------------------------------

function LogoUploadSection({
  entreprise,
  update,
}: {
  entreprise: Record<string, unknown>
  update: (v: Record<string, unknown>) => Promise<unknown>
}) {
  const [processing, setProcessing] = useState(false)
  const [originalPreview, setOriginalPreview] = useState<string | null>(null)
  const [removedBgPreview, setRemovedBgPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentLogo = entreprise.logo_url as string | undefined

  const removeBackground = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        const corners = [
          [data[0], data[1], data[2]],
          [data[(canvas.width - 1) * 4], data[(canvas.width - 1) * 4 + 1], data[(canvas.width - 1) * 4 + 2]],
          [data[(canvas.height - 1) * canvas.width * 4], data[(canvas.height - 1) * canvas.width * 4 + 1], data[(canvas.height - 1) * canvas.width * 4 + 2]],
          [data[((canvas.height - 1) * canvas.width + canvas.width - 1) * 4], data[((canvas.height - 1) * canvas.width + canvas.width - 1) * 4 + 1], data[((canvas.height - 1) * canvas.width + canvas.width - 1) * 4 + 2]],
        ]
        const bgR = Math.round(corners.reduce((s, c) => s + c[0], 0) / 4)
        const bgG = Math.round(corners.reduce((s, c) => s + c[1], 0) / 4)
        const bgB = Math.round(corners.reduce((s, c) => s + c[2], 0) / 4)
        const threshold = 40
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2]
          const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2)
          if (dist < threshold) data[i + 3] = 0
        }
        ctx.putImageData(imageData, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      }
      img.src = dataUrl
    })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      setOriginalPreview(dataUrl)
      setRemovedBgPreview(null)
      setProcessing(true)
      try {
        const result = await removeBackground(dataUrl)
        setRemovedBgPreview(result)
      } catch {
        // si echec, on garde l'original
      }
      setProcessing(false)
    }
    reader.readAsDataURL(file)
  }

  const saveLogo = async (dataUrl: string) => {
    setSaving(true)
    try {
      await update({ logo_url: dataUrl })
      setOriginalPreview(null)
      setRemovedBgPreview(null)
    } catch { /* ignored */ }
    setSaving(false)
  }

  return (
    <div className="mb-8">
      <label className="block font-manrope font-medium text-sm text-gray-700 mb-3">
        Logo de l&apos;entreprise
      </label>

      <div className="flex items-start gap-6">
        {/* Current logo */}
        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-white shrink-0">
          {currentLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentLogo} alt="Logo" className="w-full h-full object-contain" />
          ) : (
            <Camera size={24} className="text-[#6b7280]" />
          )}
        </div>

        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="font-manrope text-sm text-[#5ab4e0] font-medium hover:underline"
          >
            {currentLogo ? 'Modifier le logo' : 'Ajouter un logo'}
          </button>
          <p className="text-xs text-gray-400 mt-1">PNG, JPG ou WebP. Max 2 Mo.</p>
        </div>
      </div>

      {/* Processing / Preview */}
      {processing && (
        <div className="mt-4 flex items-center gap-3 bg-sky-50 border border-sky-200 rounded-lg px-4 py-3">
          <div className="w-5 h-5 border-2 border-[#5ab4e0] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#5ab4e0] font-manrope">Suppression du fond en cours...</p>
        </div>
      )}

      {originalPreview && !processing && !removedBgPreview && (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-manrope text-gray-500 mb-2">Aperçu</p>
            <div className="h-32 w-32 rounded-lg border border-gray-200 bg-white flex items-center justify-center p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={originalPreview} alt="Aperçu" className="max-h-full max-w-full object-contain" />
            </div>
          </div>
          <button
            onClick={() => saveLogo(originalPreview)}
            disabled={saving}
            className="h-10 px-6 rounded-lg font-syne font-bold text-white bg-[#e87a2a] hover:bg-[#f09050] transition-colors text-sm disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer le logo'}
          </button>
        </div>
      )}

      {originalPreview && removedBgPreview && !processing && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-manrope text-gray-500 mb-2">Original</p>
              <div className="h-32 rounded-lg border border-gray-200 bg-white flex items-center justify-center p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={originalPreview} alt="Original" className="max-h-full max-w-full object-contain" />
              </div>
            </div>
            <div>
              <p className="text-xs font-manrope text-gray-500 mb-2">Sans fond</p>
              <div className="h-32 rounded-lg border border-gray-200 flex items-center justify-center p-2" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect width=\'10\' height=\'10\' fill=\'%23f0f0f0\'/%3E%3Crect x=\'10\' y=\'10\' width=\'10\' height=\'10\' fill=\'%23f0f0f0\'/%3E%3Crect x=\'10\' width=\'10\' height=\'10\' fill=\'%23ffffff\'/%3E%3Crect y=\'10\' width=\'10\' height=\'10\' fill=\'%23ffffff\'/%3E%3C/svg%3E")' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={removedBgPreview} alt="Sans fond" className="max-h-full max-w-full object-contain" />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => saveLogo(removedBgPreview)}
              disabled={saving}
              className="h-10 px-6 rounded-lg font-syne font-bold text-white bg-[#e87a2a] hover:bg-[#f09050] transition-colors text-sm disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Garder sans fond'}
            </button>
            <button
              onClick={() => saveLogo(originalPreview)}
              disabled={saving}
              className="h-10 px-6 rounded-lg font-syne font-bold text-[#1a1a2e] border border-gray-200 hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
            >
              Garder original
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// -------------------------------------------------------------------
// Signature pad
// -------------------------------------------------------------------

function SignatureSection({
  entreprise,
  update,
}: {
  entreprise: Record<string, unknown>
  update: (v: Record<string, unknown>) => Promise<unknown>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasStrokes, setHasStrokes] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const currentSignature = entreprise.signature_base64 as string | undefined

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
    setHasStrokes(true)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.strokeStyle = '#0f1a3a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  const stopDrawing = () => setIsDrawing(false)

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
    setSuccess(null)
  }

  const saveSignature = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setSaving(true)
    setSuccess(null)
    try {
      const dataUrl = canvas.toDataURL('image/png')
      await update({ signature_base64: dataUrl })
      setSuccess('Signature enregistrée avec succès.')
    } catch { /* ignored */ }
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <h2 className="font-syne font-bold text-xl text-[#1a1a2e] mb-2">
        Ma signature
      </h2>
      <p className="font-manrope text-sm text-gray-500 mb-6">
        Cette signature apparaîtra automatiquement sur vos devis.
      </p>

      {/* Current saved signature */}
      {currentSignature && (
        <div className="mb-6">
          <p className="text-xs font-manrope text-gray-500 mb-2">Signature actuelle</p>
          <div className="h-20 w-64 rounded-lg border border-gray-200 bg-white flex items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentSignature} alt="Signature" className="max-h-full max-w-full object-contain" />
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={500}
          height={180}
          className="w-full max-w-[500px] h-[180px] rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasStrokes && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none max-w-[500px]">
            <p className="font-manrope text-sm text-gray-400">Dessinez votre signature ici</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <button
          onClick={saveSignature}
          disabled={!hasStrokes || saving}
          className="h-10 px-6 rounded-lg font-syne font-bold text-white bg-[#e87a2a] hover:bg-[#f09050] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer la signature'}
        </button>
        <button
          onClick={clearCanvas}
          className="h-10 px-6 rounded-lg font-syne font-bold text-[#1a1a2e] border border-gray-200 hover:bg-gray-50 transition-colors text-sm"
        >
          Effacer
        </button>
      </div>

      <SuccessMessage message={success} />

      {/* Tampon section */}
      <TamponUpload entreprise={entreprise} update={update} />
    </div>
  )
}

// -------------------------------------------------------------------
// Tampon upload
// -------------------------------------------------------------------

function TamponUpload({
  entreprise,
  update,
}: {
  entreprise: Record<string, unknown>
  update: (v: Record<string, unknown>) => Promise<unknown>
}) {
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const currentTampon = entreprise.tampon_base64 as string | undefined

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image (JPG, PNG)')
      return
    }

    setSaving(true)
    setSuccess(null)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const dataUrl = reader.result as string
        await update({ tampon_base64: dataUrl })
        setSuccess('Tampon enregistré avec succès.')
        setSaving(false)
      }
      reader.readAsDataURL(file)
    } catch {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    setSaving(true)
    try {
      await update({ tampon_base64: null })
      setSuccess('Tampon supprimé.')
    } catch { /* ignored */ }
    setSaving(false)
  }

  return (
    <div className="mt-8 pt-8 border-t border-gray-200">
      <h2 className="font-syne font-bold text-xl text-[#1a1a2e] mb-2">
        Mon tampon
      </h2>
      <p className="font-manrope text-sm text-gray-500 mb-6">
        Ce tampon apparaîtra à côté de votre signature sur les devis. Utilisez un PNG avec fond transparent pour un meilleur rendu.
      </p>

      {currentTampon && (
        <div className="mb-6">
          <p className="text-xs font-manrope text-gray-500 mb-2">Tampon actuel</p>
          <div className="h-24 w-48 rounded-lg border border-gray-200 bg-white flex items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentTampon} alt="Tampon" className="max-h-full max-w-full object-contain" />
          </div>
          <button
            onClick={handleRemove}
            disabled={saving}
            className="mt-2 text-xs text-red-500 hover:text-red-700 font-manrope"
          >
            Supprimer le tampon
          </button>
        </div>
      )}

      <label className="inline-flex items-center gap-2 h-10 px-5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-syne font-bold text-[#1a1a2e] cursor-pointer transition-colors">
        {saving ? 'Enregistrement...' : currentTampon ? 'Changer le tampon' : 'Uploader un tampon'}
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleUpload}
          className="hidden"
        />
      </label>

      <SuccessMessage message={success} />
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
              Nexartis &mdash; 25 &euro; / mois HT
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
            Resilier l&apos;abonnement
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
  const { entreprise, loading: loadingEntreprise, update } = useEntreprise()
  const { user, loading: loadingUser } = useUser()

  if (loadingEntreprise || loadingUser) {
    return (
      <div className="flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-64 flex-shrink-0">
          <LoadingSkeleton rows={6} />
        </aside>
        <div className="flex-1 min-w-0">
          <LoadingSkeleton rows={8} />
        </div>
      </div>
    )
  }

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
        {activeSection === 'entreprise' && entreprise && <EntrepriseSection entreprise={entreprise} update={update} />}
        {activeSection === 'documents' && entreprise && <DocumentsSection entreprise={entreprise} update={update} />}
        {activeSection === 'facturation' && entreprise && <FacturationSection entreprise={entreprise} update={update} />}
        {activeSection === 'signature' && entreprise && <SignatureSection entreprise={entreprise} update={update} />}
        {activeSection === 'notifications' && <NotificationsSection />}
        {activeSection === 'compte' && <CompteSection userEmail={user?.email ?? ''} />}
        {activeSection === 'abonnement' && <AbonnementSection />}
      </div>
    </div>
  )
}
