import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import {
  getAdminUser, getClientIp, checkRateLimit, isValidUUID,
  secureJson, secureError, rateLimitError, forbiddenError,
} from '@/lib/api-security'

/** Supabase admin client (bypass RLS) */
function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

// -------------------------------------------------------------------
// GET /api/admin/users — liste TOUS les utilisateurs (auth + entreprises)
// -------------------------------------------------------------------
export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return forbiddenError()

  const supabaseAdmin = adminSupabase()

  // 1. Source de vérité : TOUS les comptes auth Supabase
  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  // 2. Récupérer les données entreprises pour enrichir
  const { data: entreprises } = await supabaseAdmin
    .from('entreprises')
    .select('*')

  // Index entreprises par user_id
  const entMap: Record<string, Record<string, unknown>> = {}
  for (const e of entreprises ?? []) {
    entMap[e.user_id] = e
  }

  // 3. Construire la liste combinée (auth = base, entreprise = enrichissement)
  const adminEmails = (process.env.ADMIN_EMAILS || 'admin@nexartis.fr').split(',').map(e => e.trim().toLowerCase())
  const users = (authUsers?.users ?? [])
    .filter(u => !u.email || !adminEmails.includes(u.email.toLowerCase())) // Exclure les admins
    .map(u => {
      const ent = entMap[u.id] || {}
      const meta = (u.user_metadata as Record<string, unknown>) ?? {}
      return {
        // IDs
        id: (ent.id as string) || u.id, // entreprise ID si existe, sinon auth ID
        user_id: u.id,
        has_entreprise: !!entMap[u.id], // utile pour savoir si le profil existe

        // Identité (priorité : entreprise > auth metadata)
        nom: (ent.nom as string) || (meta.entreprise as string) || '',
        prenom: (ent.prenom as string) || (meta.prenom as string) || '',
        auth_email: u.email ?? '',
        email: (ent.email as string) || u.email || '',
        telephone: (ent.telephone as string) || '',

        // Entreprise
        metier: (ent.metier as string) || '',
        ville: (ent.ville as string) || '',
        siret: (ent.siret as string) || '',
        adresse: (ent.adresse as string) || '',
        code_postal: (ent.code_postal as string) || '',
        forme_juridique: (ent.forme_juridique as string) || '',

        // Abonnement
        abonnement_type: (ent.abonnement_type as string) || 'trial',
        trial_started_at: (ent.trial_started_at as string) || u.created_at || '',
        abonnement_expire_at: (ent.abonnement_expire_at as string) || null,
        notes_admin: (ent.notes_admin as string) || null,

        // Dates
        created_at: u.created_at || (ent.created_at as string) || '',
        last_sign_in_at: u.last_sign_in_at ?? null,
        email_confirmed_at: u.email_confirmed_at ?? null,

        // Auth metadata (fallback pour nom/prénom)
        auth_prenom: (meta.prenom as string) || '',
        auth_nom: (meta.nom as string) || '',
        auth_entreprise: (meta.entreprise as string) || '',
      }
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return secureJson({ users })
}

// -------------------------------------------------------------------
// PATCH /api/admin/users — modifier l'abonnement d'un utilisateur
// -------------------------------------------------------------------
export async function PATCH(request: Request) {
  const admin = await getAdminUser()
  if (!admin) return forbiddenError()

  const body = await request.json()
  const { entreprise_id, abonnement_type, notes_admin, abonnement_expire_at } = body

  if (!entreprise_id || !abonnement_type) {
    return secureError('Paramètres manquants')
  }

  // ✅ SÉCURITÉ : Valider les inputs
  if (!isValidUUID(entreprise_id)) return secureError('ID entreprise invalide')
  const validTypes = ['trial', 'actif', 'suspendu', 'lifetime']
  if (!validTypes.includes(abonnement_type)) return secureError('Type d\'abonnement invalide')
  if (notes_admin && typeof notes_admin === 'string' && notes_admin.length > 500) return secureError('Notes trop longues (max 500 caractères)')

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

  if (error) return secureError(error.message, 500)

  return secureJson({ success: true })
}

// -------------------------------------------------------------------
// DELETE /api/admin/users — supprimer un compte utilisateur complet
// -------------------------------------------------------------------
export async function DELETE(request: Request) {
  const admin = await getAdminUser()
  if (!admin) return forbiddenError()

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')

  if (!userId) {
    return secureError('user_id requis')
  }

  // ✅ SÉCURITÉ : Valider le format UUID
  if (!isValidUUID(userId)) return secureError('user_id invalide')

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
    return secureError('Erreur lors de la suppression du compte', 500)
  }

  return secureJson({ success: true })
}
