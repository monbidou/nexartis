'use client'

import { useEffect, useState } from 'react'

// -------------------------------------------------------------------
// Sélecteur de thème de couleur pour la sidebar.
//
// L'utilisateur choisit parmi 8 couleurs préfabriquées (palette curatée
// pour rester pro et lisible). Le choix est stocké en localStorage sous
// la clé `nexartis-sidebar-theme` puis injecté en CSS variable
// `--nexartis-accent` sur <html>, ce qui change instantanément :
//   • la couleur du bouton "Créer" en haut de la sidebar
//   • la barre verticale d'item actif
//   • la couleur de l'item actif dans la nav mobile
// -------------------------------------------------------------------

// Palette de 7 thèmes principaux pour la sidebar.
// Choix volontairement limité à des couleurs lisibles sur fond clair.
// Le blanc est exclu (illisible sur fond blanc), le noir est rendu en
// "ardoise" (slate-700) pour rester sobre sans être agressif.
export const SIDEBAR_THEMES = [
  { id: 'orange', label: 'Orange (défaut)', color: '#e87a2a' },
  { id: 'blue', label: 'Bleu', color: '#2563eb' },
  { id: 'red', label: 'Rouge', color: '#dc2626' },
  { id: 'yellow', label: 'Jaune', color: '#ca8a04' },
  { id: 'green', label: 'Vert', color: '#059669' },
  { id: 'violet', label: 'Violet', color: '#8b5cf6' },
  { id: 'black', label: 'Noir', color: '#1e293b' },
] as const

export type SidebarThemeId = typeof SIDEBAR_THEMES[number]['id']

const STORAGE_KEY = 'nexartis-sidebar-theme'
const DEFAULT_THEME: SidebarThemeId = 'orange'

/** Lit le thème stocké et l'applique sur <html>. À appeler au mount du dashboard. */
export function applySidebarTheme(themeId: SidebarThemeId | null = null): void {
  if (typeof window === 'undefined') return
  const id = themeId || (localStorage.getItem(STORAGE_KEY) as SidebarThemeId) || DEFAULT_THEME
  const theme = SIDEBAR_THEMES.find(t => t.id === id) || SIDEBAR_THEMES[0]
  document.documentElement.style.setProperty('--nexartis-accent', theme.color)
}

/** Sauvegarde + applique un nouveau thème. */
export function setSidebarTheme(themeId: SidebarThemeId): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, themeId)
  applySidebarTheme(themeId)
}

/** Composant React : grille de boutons couleur à mettre dans la page Paramètres. */
export default function ThemeSelector() {
  const [current, setCurrent] = useState<SidebarThemeId>(DEFAULT_THEME)

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as SidebarThemeId) || DEFAULT_THEME
    setCurrent(stored)
    applySidebarTheme(stored)
  }, [])

  const onSelect = (id: SidebarThemeId) => {
    setCurrent(id)
    setSidebarTheme(id)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h3 className="font-syne font-bold text-base text-[#1a1a2e]">Couleur d&apos;accent de la sidebar</h3>
        <p className="text-xs text-[#6b7280] font-manrope mt-0.5">
          Personnalise la couleur du bouton &laquo; Créer &raquo; et des éléments actifs de ta navigation.
          Le choix est sauvegardé sur ton appareil.
        </p>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
        {SIDEBAR_THEMES.map(theme => {
          const isActive = current === theme.id
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onSelect(theme.id)}
              title={theme.label}
              aria-label={`Choisir le thème ${theme.label}`}
              className={`
                relative aspect-square rounded-xl border-2 transition-all
                ${isActive
                  ? 'border-[#1a1a2e] shadow-md scale-105'
                  : 'border-transparent hover:border-gray-300 hover:scale-105'}
              `}
              style={{ backgroundColor: theme.color }}
            >
              {isActive && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white drop-shadow" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              )}
            </button>
          )
        })}
      </div>
      <p className="text-[11px] text-[#9ca3af] font-manrope mt-3 italic">
        Thème actuel : <span className="font-semibold text-[#1a1a2e]">{SIDEBAR_THEMES.find(t => t.id === current)?.label}</span>
      </p>
    </div>
  )
}
