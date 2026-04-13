import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import {
  getAuthenticatedUser, getClientIp, checkRateLimit,
  secureJson, secureError, rateLimitError, unauthorizedError,
} from '@/lib/api-security'

/**
 * POST /api/stripe/create-portal-session
 * Cree une session vers le portail client Stripe.
 * Permet a l'utilisateur de gerer son abonnement (changer de carte, annuler, etc.)
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!checkRateLimit(`stripe-portal:${ip}`, 5, 60_000)) {
      return rateLimitError()
    }

    const user = await getAuthenticatedUser()
    if (!user) return unauthorizedError()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const { data: entreprise } = await supabase
      .from('entreprises')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!entreprise?.stripe_customer_id) {
      return secureError('Aucun abonnement Stripe trouve', 404)
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nexartis.fr'

    const session = await stripe.billingPortal.sessions.create({
      customer: entreprise.stripe_customer_id,
      return_url: `${siteUrl}/dashboard/parametres`,
    })

    return secureJson({ url: session.url })
  } catch (error) {
    console.error('Stripe portal error:', error)
    return secureError('Erreur lors de la creation du portail', 500)
  }
}
