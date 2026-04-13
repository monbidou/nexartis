import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'admin@nexartis.fr'

/** Vérifie que le requérant est bien l'admin */
async function getAdminUser() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
      },
    },
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL ? user : null
}

/** Supabase admin client (bypass RLS) */
function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

// -------------------------------------------------------------------
// GET /api/admin/users — liste tous les utilisateurs
// -------------------------------------------------------------------
export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const supabaseAdmin = adminSupabase()

  // Récupérer toutes les entreprises (tous les utilisateurs)
  const { data: entreprises, error } = await supabaseAdmin
    .from('entreprises')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Récupérer les emails auth pour chaque user
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()

  const authMap: Record<string, { email: string; last_sign_in_at: string | null; email_confirmed_at: string | null; user_metadata: Record<string, unknown> }> = {}
  for (const u of authUsers?.users ?? []) {
    authMap[u.id] = {
      email: u.email ?? '',
      last_sign_in_at: u.last_sign_in_at ?? null,
      email_confirmed_at: u.email_confirmed_at ?? null,
      user_metadata: (u.user_metadata as Record<string, unknown>) ?? {},
    }
  }

  const users = (entreprises ?? []).map(e => {
    const auth = authMap[e.user_id]
    return {
      ...e,
      auth_email: auth?.email ?? e.email ?? '',
      last_sign_in_at: auth?.last_sign_in_at ?? null,
      email_confirmed_at: auth?.email_confirmed_at ?? null,
      // Récupérer nom/prénom depuis auth metadata si pas dans entreprise
      auth_prenom: (auth?.user_metadata?.prenom as string) || '',
      auth_nom: (auth?.user_metadata?.nom as string) || '',
      auth_entreprise: (auth?.user_metadata?.entreprise as string) || '',
    }
  })

  // Filtrer pour exclure le compte admin lui-même
  const filtered = users.filter(u => u.auth_email !== ADMIN_EMAIL)

  return NextResponse.json({ users: filtered })
}

// -------------------------------------------------------------------
// PATCH /api/admin/users — modifier l'abonnement d'un utilisateur
// -------------------------------------------------------------------
export async function PATCH(request: Request) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const body = await request.json()
  const { entreprise_id, abonnement_type, notes_admin, abonnement_expire_at } = body

  if (!entreprise_id || !abonnement_type) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const supabaseAdmin = adminSupabase()

  const updates: Record<string, unknown> = { abonnement_type }
  if (notes_admin !== undefined) updates.notes_admin = notes_admin
  if (abonnement_expire_at !== undefined) updates.abonnement_expire_at = abonnement_expire_at

  // Si on passe en lifetime, on supprime la date d'expiration
  if (abonnement_type === 'lifetime') {
    updates.abonnement_expire_at = null
  }

  const { error } = await supabaseAdmin
    .from('entreprises')
    .update(updates)
    .eq('id', entreprise_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

// -------------------------------------------------------------------
// DELETE /api/admin/users — supprimer un compte utilisateur complet
// -------------------------------------------------------------------
export async function DELETE(request: Request) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')
  const entrepriseId = searchParams.get('entreprise_id')

  if (!userId || !entrepriseId) {
    return NextResponse.json({ error: 'user_id et entreprise_id requis' }, { status: 400 })
  }

  const supabaseAdmin = adminSupabase()

  // 1. Supprimer toutes les données liées dans les tables
  const tablesToClean = [
    'chantier_notes',
    'planning_interventions',
    'facture_lignes',
    'devis_lignes',
    'factures',
    'devis',
    'chantiers',
    'clients',
    'fournisseurs',
    'intervenants',
    'entreprises',
  ]

  for (const table of tablesToClean) {
    const { error } = await supabaseAdmin.from(table).delete().eq('user_id', userId)
    if (error) {
      console.error(`Error deleting from ${table}:`, error.message)
      // Continue — on essaie de tout nettoyer
    }
  }

  // 2. Supprimer le compte auth Supabase
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (authError) {
    console.error('Auth delete error:', authError)
    return NextResponse.json({ error: `Données supprimées mais erreur auth: ${authError.message}` }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
