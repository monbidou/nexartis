'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Upload,
  Check,
  Users,
  FileText,
  Receipt,
  BookOpen,
} from 'lucide-react'

// -------------------------------------------------------------------
// Types & constants
// -------------------------------------------------------------------

interface SourceOption {
  id: string
  name: string
  format: string
}

const SOURCES: SourceOption[] = [
  { id: 'obat', name: 'Obat', format: 'Format CSV Obat' },
  { id: 'tolteck', name: 'Tolteck', format: 'Format CSV Tolteck' },
  { id: 'batappli', name: 'Batappli', format: 'Format CSV/Excel' },
  { id: 'henrri', name: 'Henrri', format: 'Format CSV' },
  { id: 'excel', name: 'Excel / CSV', format: 'Import générique' },
]

const STEP_LABELS = ['Source', 'Fichiers', 'Vérification']

const SIMULATED_FILES = [
  { name: 'clients.csv', size: '47 Ko' },
  { name: 'devis.csv', size: '183 Ko' },
  { name: 'factures.csv', size: '94 Ko' },
  { name: 'prestations.csv', size: '67 Ko' },
]

const SUMMARY_CARDS = [
  { count: 47, label: 'clients', Icon: Users },
  { count: 183, label: 'devis', Icon: FileText },
  { count: 94, label: 'factures', Icon: Receipt },
  { count: 67, label: 'prestations', Icon: BookOpen },
]

// -------------------------------------------------------------------
// Step indicator
// -------------------------------------------------------------------

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEP_LABELS.map((label, i) => {
        const step = i + 1
        const isActive = step === currentStep
        const isCompleted = step < currentStep

        return (
          <div key={label} className="flex items-center">
            {/* connector line before (not for first) */}
            {i > 0 && (
              <div
                className={`w-16 sm:w-24 h-0.5 ${
                  isCompleted || isActive ? 'bg-[#5ab4e0]' : 'bg-gray-200'
                }`}
              />
            )}

            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-syne font-bold transition-colors ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isActive
                      ? 'bg-[#5ab4e0] text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? <Check size={18} /> : step}
              </div>
              <span
                className={`text-xs font-manrope font-medium ${
                  isActive ? 'text-[#1a1a2e]' : 'text-[#6b7280]'
                }`}
              >
                {step}. {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// -------------------------------------------------------------------
// Step 1 — Source selection
// -------------------------------------------------------------------

function Step1({
  selectedSource,
  onSelect,
  onNext,
}: {
  selectedSource: string | null
  onSelect: (id: string) => void
  onNext: () => void
}) {
  return (
    <div>
      <h2 className="font-syne font-bold text-2xl text-[#1a1a2e] mb-2">
        D&apos;où venez-vous ?
      </h2>
      <p className="font-manrope text-[#6b7280] mb-8">
        Sélectionnez votre logiciel actuel pour importer vos données
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {SOURCES.map((src) => {
          const selected = selectedSource === src.id
          return (
            <button
              key={src.id}
              onClick={() => onSelect(src.id)}
              className={`bg-white rounded-xl border-2 p-8 text-center cursor-pointer transition-all duration-200 hover:border-[#5ab4e0] ${
                selected
                  ? 'border-[#5ab4e0] bg-[#5ab4e0]/5'
                  : 'border-gray-200'
              }`}
            >
              <div className="w-14 h-14 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
                <FileText size={24} className="text-[#6b7280]" />
              </div>
              <p className="font-syne font-bold text-[#1a1a2e] mb-1">
                {src.name}
              </p>
              <p className="font-manrope text-sm text-[#6b7280]">{src.format}</p>
            </button>
          )
        })}
      </div>

      <div className="flex justify-end">
        <button
          disabled={!selectedSource}
          onClick={onNext}
          className={`h-12 px-8 rounded-lg font-syne font-bold text-white transition-colors ${
            selectedSource
              ? 'bg-[#e87a2a] hover:bg-[#f09050] cursor-pointer'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          Suivant &rarr;
        </button>
      </div>
    </div>
  )
}

// -------------------------------------------------------------------
// Step 2 — File upload
// -------------------------------------------------------------------

function Step2({
  selectedSource,
  uploadedFiles,
  onUpload,
  onNext,
  onBack,
}: {
  selectedSource: string | null
  uploadedFiles: boolean
  onUpload: () => void
  onNext: () => void
  onBack: () => void
}) {
  return (
    <div>
      <h2 className="font-syne font-bold text-2xl text-[#1a1a2e] mb-2">
        Déposez vos fichiers
      </h2>

      {selectedSource === 'obat' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="font-manrope text-sm text-blue-800 font-medium mb-2">
            Exportez depuis Obat &rarr; Paramètres &rarr; Exporter mes données
          </p>
          <p className="font-manrope text-sm text-blue-700">
            Fichiers attendus : clients.csv, devis.csv, factures.csv, prestations.csv
          </p>
        </div>
      )}

      {!uploadedFiles ? (
        <div
          onClick={onUpload}
          className="border-2 border-dashed border-gray-300 rounded-xl p-16 text-center cursor-pointer hover:border-[#5ab4e0] transition-colors mb-8"
        >
          <Upload size={48} className="mx-auto mb-4 text-[#6b7280]" />
          <p className="font-manrope text-[#1a1a2e] font-medium mb-2">
            Glissez vos fichiers ici
          </p>
          <p className="font-manrope text-sm text-[#6b7280] mb-2">ou</p>
          <span className="font-manrope text-sm text-[#5ab4e0] font-medium cursor-pointer hover:underline">
            Parcourir
          </span>
          <p className="font-manrope text-xs text-[#6b7280] mt-4">
            Formats acceptés : .csv, .xlsx, .xls
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="space-y-3">
            {SIMULATED_FILES.map((f) => (
              <div
                key={f.name}
                className="flex items-center gap-3 font-manrope text-sm"
              >
                <span className="text-green-500">&#10003;</span>
                <span className="text-[#1a1a2e] font-medium">{f.name}</span>
                <span className="text-[#6b7280]">&mdash; {f.size}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="h-12 px-8 rounded-lg font-syne font-bold text-[#6b7280] border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          &larr; Retour
        </button>
        <button
          disabled={!uploadedFiles}
          onClick={onNext}
          className={`h-12 px-8 rounded-lg font-syne font-bold text-white transition-colors ${
            uploadedFiles
              ? 'bg-[#e87a2a] hover:bg-[#f09050] cursor-pointer'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          Suivant &rarr;
        </button>
      </div>
    </div>
  )
}

// -------------------------------------------------------------------
// Step 3 — Verification & import
// -------------------------------------------------------------------

function Step3({
  importing,
  importComplete,
  onImport,
  onBack,
}: {
  importing: boolean
  importComplete: boolean
  onImport: () => void
  onBack: () => void
}) {
  const [importMode, setImportMode] = useState<'all' | 'partial'>('all')
  const [duplicateChecked, setDuplicateChecked] = useState(false)

  if (importComplete) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500 mx-auto mb-4 flex items-center justify-center">
          <Check size={32} className="text-white" />
        </div>
        <h3 className="font-syne font-bold text-xl text-green-800 mb-2">
          Import terminé avec succès
        </h3>
        <p className="font-manrope text-green-700 mb-6">
          47 clients &middot; 183 devis &middot; 94 factures &middot; 67 prestations importés
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 font-syne font-bold text-[#5ab4e0] hover:underline"
        >
          Accéder à mes données &rarr;
        </Link>
      </div>
    )
  }

  if (importing) {
    return (
      <div className="text-center py-12">
        <p className="font-syne font-bold text-lg text-[#1a1a2e] mb-6">
          Import en cours...
        </p>
        <div className="w-full max-w-md mx-auto h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#e87a2a] rounded-full animate-import-progress"
            style={{
              animation: 'importProgress 3s ease-in-out forwards',
            }}
          />
        </div>
        <style jsx>{`
          @keyframes importProgress {
            from {
              width: 0%;
            }
            to {
              width: 100%;
            }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div>
      <h2 className="font-syne font-bold text-2xl text-[#1a1a2e] mb-6">
        Vérification et import
      </h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {SUMMARY_CARDS.map((card) => {
          const Icon = card.Icon
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-gray-200 p-6 text-center"
            >
              <Icon size={28} className="mx-auto mb-2 text-[#5ab4e0]" />
              <p className="font-syne font-bold text-2xl text-[#1a1a2e]">
                {card.count}
              </p>
              <p className="font-manrope text-sm text-[#6b7280]">
                {card.label}
              </p>
            </div>
          )
        })}
      </div>

      {/* Duplicate check */}
      <div className="mb-6">
        <button
          onClick={() => setDuplicateChecked(true)}
          className="h-10 px-6 rounded-lg font-manrope text-sm font-medium border border-gray-200 text-[#1a1a2e] hover:bg-gray-50 transition-colors"
        >
          Vérifier les doublons
        </button>
        {duplicateChecked && (
          <span className="ml-3 font-manrope text-sm text-green-600 font-medium">
            Aucun doublon détecté &#10003;
          </span>
        )}
      </div>

      {/* Import mode */}
      <div className="mb-8">
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="importMode"
              checked={importMode === 'all'}
              onChange={() => setImportMode('all')}
              className="w-4 h-4 accent-[#5ab4e0]"
            />
            <span className="font-manrope text-sm text-[#1a1a2e]">
              Importer tout
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="importMode"
              checked={importMode === 'partial'}
              onChange={() => setImportMode('partial')}
              className="w-4 h-4 accent-[#5ab4e0]"
            />
            <span className="font-manrope text-sm text-[#1a1a2e]">
              Sélection partielle
            </span>
          </label>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="h-12 px-8 rounded-lg font-syne font-bold text-[#6b7280] border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          &larr; Retour
        </button>
        <button
          onClick={onImport}
          className="h-14 px-10 rounded-lg font-syne font-bold text-white bg-[#e87a2a] hover:bg-[#f09050] transition-colors text-lg"
        >
          Lancer l&apos;import
        </button>
      </div>
    </div>
  )
}

// -------------------------------------------------------------------
// Main page
// -------------------------------------------------------------------

export default function ImportPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importComplete, setImportComplete] = useState(false)

  function handleImport() {
    setImporting(true)
    setTimeout(() => {
      setImporting(false)
      setImportComplete(true)
    }, 3000)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <StepIndicator currentStep={currentStep} />

      {currentStep === 1 && (
        <Step1
          selectedSource={selectedSource}
          onSelect={setSelectedSource}
          onNext={() => setCurrentStep(2)}
        />
      )}

      {currentStep === 2 && (
        <Step2
          selectedSource={selectedSource}
          uploadedFiles={uploadedFiles}
          onUpload={() => setUploadedFiles(true)}
          onNext={() => setCurrentStep(3)}
          onBack={() => setCurrentStep(1)}
        />
      )}

      {currentStep === 3 && (
        <Step3
          importing={importing}
          importComplete={importComplete}
          onImport={handleImport}
          onBack={() => setCurrentStep(2)}
        />
      )}
    </div>
  )
}
