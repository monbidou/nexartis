'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser, useEntreprise } from '@/lib/hooks'
import {
  Home,
  LayoutGrid,
  FilePenLine,
  Banknote,
  ShoppingBag,
  CalendarDays,
  UserRound,
  Warehouse,
  UsersRound,
  Library,
  TrendingUp,
  ArrowDownToLine,
  SlidersHorizontal,
  Search,
  Bell,
  Menu,
  X,
  MoreHorizontal,
  LogOut,
  ChevronDown,
  FileText,
  Receipt,
  Calendar,
} from 'lucide-react'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

// -------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------

const NAV_GROUPS: NavItem[][] = [
  [{ label: 'Accueil', href: '/dashboard', icon: Home }],
  [
    { label: 'Chantiers', href: '/dashboard/chantiers', icon: LayoutGrid },
    { label: 'Devis', href: '/dashboard/devis', icon: FilePenLine },
    { label: 'Factures', href: '/dashboard/factures', icon: Banknote },
    { label: 'Achats', href: '/dashboard/achats', icon: ShoppingBag },
    { label: 'Prestations', href: '/dashboard/prestations', icon: FileText },
  ],
  [{ label: 'Planning', href: '/dashboard/planning', icon: CalendarDays }],
  [
    { label: 'Clients', href: '/dashboard/clients', icon: UserRound },
    { label: 'Fournisseurs', href: '/dashboard/fournisseurs', icon: Warehouse },
    { label: 'Mon\u00a0équipe', href: '/dashboard/equipe', icon: UsersRound },
  ],
  [{ label: 'Statistiques', href: '/dashboard/statistiques', icon: TrendingUp }],
  [
    { label: 'Importer', href: '/dashboard/import', icon: ArrowDownToLine },
    { label: 'Paramètres', href: '/dashboard/parametres', icon: SlidersHorizontal },
  ],
]

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Tableau de bord',
  '/dashboard/chantiers': 'Chantiers',
  '/dashboard/devis': 'Devis',
  '/dashboard/devis/nouveau': 'Nouveau devis',
  '/dashboard/factures': 'Factures',
  '/dashboard/factures/nouveau': 'Nouvelle facture',
  '/dashboard/achats': 'Achats',
  '/dashboard/planning': 'Planning',
  '/dashboard/clients': 'Clients',
  '/dashboard/fournisseurs': 'Fournisseurs',
  '/dashboard/equipe': 'Mon équipe',
  '/dashboard/bibliotheque': 'Bibliothèque',
  '/dashboard/statistiques': 'Statistiques',
  '/dashboard/import': 'Importer des données',
  '/dashboard/parametres': 'Paramètres',
}

const CREATE_OPTIONS = [
  { label: 'Nouveau devis', href: '/dashboard/devis/nouveau' },
  { label: 'Nouvelle facture', href: '/dashboard/factures/nouveau' },
  { label: 'Nouveau chantier', href: '/dashboard/chantiers/nouveau' },
  { label: 'Nouveau client', href: '/dashboard/clients/nouveau' },
  { label: '🎤 Devis par la voix', href: '/dashboard/devis/nouveau?voice=1' },
]

const BOTTOM_NAV: NavItem[] = [
  { label: 'Accueil', href: '/dashboard', icon: Home },
  { label: 'Devis', href: '/dashboard/devis', icon: FilePenLine },
  { label: 'Factures', href: '/dashboard/factures', icon: Banknote },
  { label: 'Planning', href: '/dashboard/planning', icon: CalendarDays },
  { label: 'Plus...', href: '#more', icon: MoreHorizontal },
]

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname.startsWith(href)
}

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  // Fallback: find the closest parent match
  const segments = pathname.split('/')
  while (segments.length > 1) {
    segments.pop()
    const parent = segments.join('/')
    if (PAGE_TITLES[parent]) return PAGE_TITLES[parent]
  }
  return 'Tableau de bord'
}

function getInitials(prenom?: string, nom?: string): string {
  const first = prenom?.charAt(0)?.toUpperCase() || ''
  const last = nom?.charAt(0)?.toUpperCase() || ''
  return first + last || '?'
}

function getDisplayName(prenom?: string, nom?: string, email?: string): string {
  if (prenom && nom) return `${prenom} ${nom}`
  if (prenom) return prenom
  if (nom) return nom
  return email || ''
}

// -------------------------------------------------------------------
// Sidebar component
// -------------------------------------------------------------------

function Sidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  pathname,
  userInitials,
  userName,
  entrepriseNom,
  entrepriseMetier,
  entrepriseLogo,
  userLoading,
}: {
  collapsed: boolean
  mobileOpen: boolean
  onCloseMobile: () => void
  pathname: string
  userInitials: string
  userName: string
  entrepriseNom: string
  entrepriseMetier: string
  entrepriseLogo: string
  userLoading: boolean
}) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const createRef = useRef<HTMLDivElement>(null)

  // Close create dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (createRef.current && !createRef.current.contains(e.target as Node)) {
        setCreateOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const w = collapsed ? 'w-16' : 'w-64'

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full bg-[#0f1a3a] flex flex-col overflow-y-auto overflow-x-hidden
          transition-all duration-200 ease-in-out
          ${w}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        {/* ---- Top: Logo + Nom entreprise ---- */}
        <div className={`flex flex-col items-center px-4 pt-6 pb-4 ${collapsed ? 'pt-4 pb-2' : ''}`}>
          {/* Logo centré */}
          <div className="flex items-center justify-center mb-3">
            {entrepriseLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={entrepriseLogo}
                alt={entrepriseNom || 'Logo'}
                style={{
                  height: collapsed ? 36 : 64,
                  maxWidth: collapsed ? 36 : 160,
                  objectFit: 'contain',
                  filter: 'brightness(0) invert(1)',
                }}
              />
            ) : (
              <Image
                src="/images/logo-nexartis.png"
                alt="Nexartis"
                width={64}
                height={64}
                quality={100}
                className="object-contain"
                style={{ height: collapsed ? 36 : 64, width: 'auto' }}
              />
            )}
          </div>

          {/* Nom entreprise centré, une seule fois, seulement si sidebar ouverte */}
          {!collapsed && !userLoading && (
            <p className="font-syne font-bold text-white text-sm text-center leading-tight truncate max-w-full">
              {entrepriseNom || 'Mon Entreprise'}
            </p>
          )}

          {/* Mobile close */}
          {mobileOpen && (
            <button
              onClick={onCloseMobile}
              className="absolute top-4 right-4 text-white/60 hover:text-white md:hidden"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* ---- Create button ---- */}
        <div className={`px-3 mb-2 ${collapsed ? 'px-2' : ''}`} ref={createRef}>
          <button
            onClick={() => setCreateOpen(!createOpen)}
            className={`
              w-full h-11 rounded-lg bg-[#e87a2a] hover:bg-[#f09050] text-white font-syne font-bold
              flex items-center justify-center gap-2 transition-colors duration-100
              ${collapsed ? 'px-0' : ''}
            `}
          >
            <span className="text-lg leading-none">+</span>
            {!collapsed && <span>Créer</span>}
          </button>

          {createOpen && (
            <div className="mt-1 rounded-lg bg-white shadow-xl border border-gray-200 overflow-hidden z-50 relative">
              {CREATE_OPTIONS.map((opt) => (
                <Link
                  key={opt.href}
                  href={opt.href}
                  onClick={() => {
                    setCreateOpen(false)
                    onCloseMobile()
                  }}
                  className="block px-4 py-2.5 text-sm text-[#1a1a2e] font-manrope hover:bg-gray-50 transition-colors duration-100"
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ---- Search bar ---- */}
        {!collapsed && (
          <div className="px-3 mb-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
              />
              <input
                type="text"
                placeholder="Accès rapide..."
                className="w-full h-10 rounded-lg bg-white/[0.08] pl-9 pr-3 text-sm text-white placeholder:text-white/40 outline-none focus:bg-white/[0.12] transition-colors duration-100"
              />
            </div>
          </div>
        )}

        {/* ---- Navigation ---- */}
        <nav className="flex-1 px-2 space-y-0.5">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {gi > 0 && <hr className="border-white/[0.06] my-1 mx-2.5" />}
              {group.map((item) => {
                const active = isActive(pathname, item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    title={collapsed ? item.label : undefined}
                    className={`
                      group/nav relative flex items-center rounded-lg text-[14px] font-jakarta font-medium
                      transition-all duration-150 ease-out
                      ${collapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-3 h-10 px-3 ml-1'}
                      ${
                        active
                          ? 'bg-[rgba(90,180,224,0.12)] text-white'
                          : 'text-white/60 hover:bg-white/[0.05] hover:text-white/85'
                      }
                    `}
                  >
                    {/* Active indicator bar */}
                    {active && !collapsed && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#e87a2a]" />
                    )}
                    <Icon
                      size={19}
                      strokeWidth={active ? 2.2 : 1.8}
                      className={`flex-shrink-0 transition-all duration-150 ${
                        active
                          ? 'text-white'
                          : 'text-white/50 group-hover/nav:text-white/75'
                      }`}
                    />
                    {!collapsed && (
                      <span className={`truncate ${active ? 'font-semibold' : ''}`}>
                        {item.label}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* ---- Bottom: User ---- */}
        <div className={`mt-auto border-t border-white/[0.08] p-4 ${collapsed ? 'flex flex-col items-center px-2' : ''}`}>
          <div className={`flex items-center gap-3 ${collapsed ? 'flex-col' : ''}`}>
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#5ab4e0] flex items-center justify-center">
              {userLoading ? (
                <div className="w-5 h-3 bg-white/30 rounded animate-pulse" />
              ) : (
                <span className="text-white text-sm font-syne font-bold">{userInitials}</span>
              )}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                {userLoading ? (
                  <div className="space-y-1 animate-pulse">
                    <div className="h-4 w-24 bg-white/10 rounded" />
                    <div className="h-3 w-20 bg-white/10 rounded" />
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-white font-medium truncate">{userName}</p>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors duration-100"
                    >
                      <LogOut size={12} />
                      Se déconnecter
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

// -------------------------------------------------------------------
// Header component
// -------------------------------------------------------------------

function DashboardHeader({
  title,
  onMenuClick,
  userInitials,
  userLoading,
}: {
  title: string
  onMenuClick: () => void
  userInitials: string
  userLoading: boolean
}) {
  return (
    <header className="sticky top-0 z-30 h-[60px] bg-white border-b border-gray-200 flex items-center px-4 lg:px-6">
      <button onClick={onMenuClick} className="p-1.5 rounded-md hover:bg-gray-100 md:hidden transition-colors mr-3">
        <Menu size={22} className="text-[#1a1a2e]" />
      </button>
      <h1 className="font-syne font-bold text-xl text-[#1a1a2e]">{title}</h1>
    </header>
  )
}

// -------------------------------------------------------------------
// Mobile bottom nav
// -------------------------------------------------------------------

function MobileBottomNav({
  pathname,
  onMoreClick,
}: {
  pathname: string
  onMoreClick: () => void
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 h-16 bg-white border-t border-gray-200 flex items-center justify-around md:hidden">
      {BOTTOM_NAV.map((item) => {
        const Icon = item.icon
        const active = item.href !== '#more' && isActive(pathname, item.href)
        const isMore = item.href === '#more'

        if (isMore) {
          return (
            <button
              key="more"
              onClick={onMoreClick}
              className="flex flex-col items-center gap-0.5 text-[#6b7280]"
            >
              <Icon size={22} />
              <span className="text-[10px] font-manrope">{item.label}</span>
            </button>
          )
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 ${
              active ? 'text-[#e87a2a]' : 'text-[#6b7280]'
            }`}
          >
            <Icon size={22} />
            <span className="text-[10px] font-manrope">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

// -------------------------------------------------------------------
// Layout
// -------------------------------------------------------------------

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [hovered, setHovered] = useState(false)

  const { user, loading: userLoading } = useUser()
  const { entreprise, loading: entrepriseLoading } = useEntreprise()

  const isLoading = userLoading || entrepriseLoading

  const userInitials = getInitials(
    user?.user_metadata?.prenom,
    user?.user_metadata?.nom
  )
  const userName = getDisplayName(
    user?.user_metadata?.prenom,
    user?.user_metadata?.nom,
    user?.email
  )
  const entrepriseNom = (entreprise?.nom as string) || ''
  const entrepriseMetier = (entreprise?.metier as string) || ''
  const entrepriseLogo = (entreprise?.logo_url as string) || ''

  // Determine responsive state
  // collapsed = true on tablet (768-1024), false on desktop
  useEffect(() => {
    function handleResize() {
      const w = window.innerWidth
      if (w >= 1024) {
        setCollapsed(false)
        setMobileOpen(false)
      } else if (w >= 768) {
        setCollapsed(true)
        setMobileOpen(false)
      } else {
        setCollapsed(false) // mobile uses full sidebar when open
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const sidebarCollapsed = collapsed && !hovered
  const sidebarWidth = sidebarCollapsed ? 64 : 256
  const pageTitle = getPageTitle(pathname)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar hover zone for tablet expand */}
      <div
        className="hidden md:block lg:hidden fixed top-0 left-0 z-50 h-full"
        style={{ width: hovered ? 256 : 64 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          mobileOpen={false}
          onCloseMobile={() => {}}
          pathname={pathname}
          userInitials={userInitials}
          userName={userName}
          entrepriseNom={entrepriseNom}
          entrepriseMetier={entrepriseMetier}
          entrepriseLogo={entrepriseLogo}
          userLoading={isLoading}
        />
      </div>

      {/* Sidebar for desktop (always visible) */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={false}
          mobileOpen={false}
          onCloseMobile={() => {}}
          pathname={pathname}
          userInitials={userInitials}
          userName={userName}
          entrepriseNom={entrepriseNom}
          entrepriseMetier={entrepriseMetier}
          entrepriseLogo={entrepriseLogo}
          userLoading={isLoading}
        />
      </div>

      {/* Sidebar for mobile (slide in) */}
      <div className="md:hidden">
        <Sidebar
          collapsed={false}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          pathname={pathname}
          userInitials={userInitials}
          userName={userName}
          entrepriseNom={entrepriseNom}
          entrepriseMetier={entrepriseMetier}
          entrepriseLogo={entrepriseLogo}
          userLoading={isLoading}
        />
      </div>

      {/* Main content */}
      <div
        className="transition-all duration-200 md:ml-16 lg:ml-64"
      >
        <DashboardHeader
          title={pageTitle}
          onMenuClick={() => setMobileOpen(true)}
          userInitials={userInitials}
          userLoading={isLoading}
        />

        {/* Bandeau profil incomplet */}
        {!isLoading && entreprise && (
          !entreprise.nom || entreprise.nom === 'Mon Entreprise' || !entreprise.siret
        ) && (
          <div className="bg-[#e87a2a] px-4 py-3 flex items-center justify-between gap-3 lg:px-6">
            <p className="font-manrope text-sm text-white">
              ⚠️ Complétez votre profil pour que vos devis et factures soient pré-remplis automatiquement
            </p>
            <Link
              href="/dashboard/parametres"
              className="shrink-0 rounded-lg bg-white px-4 py-1.5 font-syne text-sm font-bold text-[#e87a2a] hover:bg-gray-100 transition-colors"
            >
              Configurer maintenant
            </Link>
          </div>
        )}

        <main className="p-4 lg:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav
        pathname={pathname}
        onMoreClick={() => setMobileOpen(true)}
      />
    </div>
  )
}
