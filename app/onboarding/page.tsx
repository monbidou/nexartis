'use client'

import { Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const METIER_OPTIONS = [
  'Plombier',
  'Électricien',
  'Maçon',
  'Menuisier',
  'Peintre',
  'Couvreur',
  'Carreleur',
  'Chauffagiste',
  'Paysagiste',
  'Plaquiste',
  'Multi-services',
  'Autre',
]

const UNIT_OPTIONS = ['Unité', 'Heure', 'Jour', 'm²', 'm³', 'ml', 'Forfait', 'Lot']

const TVA_OPTIONS = ['0', '5.5', '10', '20']

const STEP_LABELS = [
  'Métier',
  'Entreprise',
  'Banque',
  'Import',
  'Prestation',
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  // Step 1
  const [metier, setMetier] = useState('')

  // Step 2
  const [nomEntreprise, setNomEntreprise] = useState('')
  const [siret, setSiret] = useState('')
  const [rue, setRue] = useState('')
  const [codePostal, setCodePostal] = useState('')
  const [ville, setVille] = useState('')
  const [telephone, setTelephone] = useState('')

  // Step 3
  const [iban, setIban] = useState('')
  const [bic, setBic] = useState('')

  // Step 5
  const [designation, setDesignation] = useState('')
  const [unite, setUnite] = useState('')
  const [prixHT, setPrixHT] = useState('')
  const [tva, setTva] = useState('20')

  const inputClasses =
    'w-full h-12 rounded-lg border border-gray-200 px-4 font-manrope text-sm text-[#1a1a2e] placeholder:text-gray-400 focus:border-sky focus:ring-1 focus:ring-sky outline-none transition'

  const next = () => setStep((s) => Math.min(s + 1, 5))
  const prev = () => setStep((s) => Math.max(s - 1, 1))

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-7 h-7 bg-sky rounded-md" />
          <span className="font-syne font-extrabold text-3xl text-navy">Artidoc</span>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-1 mb-10">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className={`w-full h-2 rounded-full transition ${
                  i + 1 <= step ? 'bg-sky' : 'bg-gray-200'
                }`}
              />
              <span
                className={`text-xs font-manrope ${
                  i + 1 <= step ? 'text-sky font-medium' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white shadow-lg rounded-2xl p-10 border border-gray-100">
          {/* Step 1 */}
          {step === 1 && (
            <div>
              <h1 className="font-syne font-bold text-2xl text-[#1a1a2e] mb-8">
                Quel est votre métier ?
              </h1>
              <select
                value={metier}
                onChange={(e) => setMetier(e.target.value)}
                className={`${inputClasses} h-14 text-base ${!metier ? 'text-gray-400' : ''}`}
              >
                <option value="" disabled>
                  Sélectionnez votre métier
                </option>
                {METIER_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div>
              <h1 className="font-syne font-bold text-2xl text-[#1a1a2e] mb-8">
                Informations de votre entreprise
              </h1>
              <div className="space-y-5">
                <div>
                  <label className="block font-manrope font-medium text-sm text-gray-700 mb-1.5">
                    Nom de l&apos;entreprise
                  </label>
                  <input
                    type="text"
                    value={nomEntreprise}
                    onChange={(e) => setNomEntreprise(e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className="block font-manrope font-medium text-sm text-gray-700 mb-1.5">
                    SIRET
                  </label>
                  <input
                    type="text"
                    value={siret}
                    onChange={(e) => setSiret(e.target.value)}
                    placeholder="123 456 789 00012"
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className="block font-manrope font-medium text-sm text-gray-700 mb-1.5">
                    Adresse (rue)
                  </label>
                  <input
                    type="text"
                    value={rue}
                    onChange={(e) => setRue(e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-manrope font-medium text-sm text-gray-700 mb-1.5">
                      Code postal
                    </label>
                    <input
                      type="text"
                      value={codePostal}
                      onChange={(e) => setCodePostal(e.target.value)}
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label className="block font-manrope font-medium text-sm text-gray-700 mb-1.5">
                      Ville
                    </label>
                    <input
                      type="text"
                      value={ville}
                      onChange={(e) => setVille(e.target.value)}
                      className={inputClasses}
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-manrope font-medium text-sm text-gray-700 mb-1.5">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    placeholder="06 12 34 56 78"
                    className={inputClasses}
                  />
                </div>
                {/* Logo upload */}
                <div>
                  <label className="block font-manrope font-medium text-sm text-gray-700 mb-1.5">
                    Logo
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:border-sky transition cursor-pointer">
                    <Upload size={32} className="text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 font-manrope">
                      Glissez votre logo ici ou{' '}
                      <span className="text-sky font-medium">parcourir</span>
                    </p>
                    <p className="text-xs text-gray-400 font-manrope mt-1">
                      PNG, JPG jusqu&apos;à 2 Mo
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div>
              <h1 className="font-syne font-bold text-2xl text-[#1a1a2e] mb-8">
                Coordonnées bancaires
              </h1>
              <div className="space-y-5">
                <div>
                  <label className="block font-manrope font-medium text-sm text-gray-700 mb-1.5">
                    IBAN
                  </label>
                  <input
                    type="text"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    placeholder="FR76 1234 5678 9012 3456 7890 123"
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className="block font-manrope font-medium text-sm text-gray-700 mb-1.5">
                    BIC
                  </label>
                  <input
                    type="text"
                    value={bic}
                    onChange={(e) => setBic(e.target.value)}
                    placeholder="BNPAFRPPXXX"
                    className={inputClasses}
                  />
                </div>
                <p className="text-sm text-gray-500 font-manrope bg-gray-50 rounded-lg px-4 py-3">
                  Ces informations apparaîtront sur vos factures.
                </p>
              </div>
            </div>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <div>
              <h1 className="font-syne font-bold text-2xl text-[#1a1a2e] mb-8">
                Importez vos données
              </h1>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Depuis Obat', desc: 'Importez vos données Obat' },
                  { label: 'Depuis Excel', desc: 'Fichier .xlsx ou .csv' },
                  { label: 'Je commence de zéro', desc: 'Démarrer un nouveau projet' },
                ].map((option) => (
                  <button
                    key={option.label}
                    onClick={next}
                    className="border border-gray-200 rounded-xl p-6 text-center hover:border-sky hover:bg-sky/5 transition flex flex-col items-center gap-2"
                  >
                    <span className="font-syne font-bold text-sm text-[#1a1a2e]">
                      {option.label}
                    </span>
                    <span className="text-xs text-gray-500 font-manrope">
                      {option.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5 */}
          {step === 5 && (
            <div>
              <h1 className="font-syne font-bold text-2xl text-[#1a1a2e] mb-8">
                Créez votre première prestation
              </h1>
              <div className="space-y-5">
                <div>
                  <label className="block font-manrope font-medium text-sm text-gray-700 mb-1.5">
                    Désignation
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="Ex: Pose de carrelage au sol"
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className="block font-manrope font-medium text-sm text-gray-700 mb-1.5">
                    Unité
                  </label>
                  <select
                    value={unite}
                    onChange={(e) => setUnite(e.target.value)}
                    className={`${inputClasses} ${!unite ? 'text-gray-400' : ''}`}
                  >
                    <option value="" disabled>
                      Sélectionnez une unité
                    </option>
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-manrope font-medium text-sm text-gray-700 mb-1.5">
                      Prix HT
                    </label>
                    <input
                      type="number"
                      value={prixHT}
                      onChange={(e) => setPrixHT(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label className="block font-manrope font-medium text-sm text-gray-700 mb-1.5">
                      Taux de TVA
                    </label>
                    <select
                      value={tva}
                      onChange={(e) => setTva(e.target.value)}
                      className={inputClasses}
                    >
                      {TVA_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t} %
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-10">
            {step > 1 ? (
              <button
                onClick={prev}
                className="font-manrope font-medium text-sm text-gray-500 hover:text-[#1a1a2e] transition"
              >
                &larr; Retour
              </button>
            ) : (
              <div />
            )}

            {step < 5 && step !== 4 && (
              <button
                onClick={next}
                className="h-[52px] px-8 bg-[#e87a2a] hover:bg-[#f09050] text-white font-syne font-bold text-base rounded-xl transition"
              >
                Suivant &rarr;
              </button>
            )}

            {step === 5 && (
              <button
                onClick={() => router.push('/dashboard')}
                className="h-[52px] px-8 bg-[#e87a2a] hover:bg-[#f09050] text-white font-syne font-bold text-base rounded-xl transition"
              >
                Accéder à mon espace &rarr;
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
