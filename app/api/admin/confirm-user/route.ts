import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import {
  getAdminUser, isValidUUID,
  secureJson, secureError, forbiddenError,
} from '@/lib/api-security'

/**
 * POST /api/admin/confirm-user
 * Confirme manuellement un compte utilisateur (utile si l'email de confirmation n'a pas été reçu)
 * ✅ SÉCURITÉ : Accessible uniquement aux admins
 */
export async function POST(request: Request) {
  const admin = await getAdminUser()
  if (!admin) return forbiddenError()

  const { user_id } = await request.json()
  if (!user_id) return secureError('user_id requis')

  // ✅ SÉCURITÉ : Valider le format UUID
  if (!isValidUUID(user_id)) return secureError('user_id invalide')

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
    email_confirm: true,
  })

  if (error) return secureError('Erreur lors de la confirmation', 500)

  return secureJson({ success: true })
}
