import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe, getOrCreateStripeCustomer } from '@/lib/stripe'
import {
  getAuthenticatedUser, getClientIp, checkRateLimit,
  secureJson, secureError, rateLimitError, unauthorizedError,
} from '@/lib/api-security'

/**
 * POST /api/stripe/create-checkout-session
 * Cree une session Stripe Checkout pour l'abonnement mensuel.
 * L'utilisateur doit etre connecte.
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(req)
    if (!checkRateLimit(`stripe-checkout:${ip}`, 5, 60_000)) {
      return rateLimitError()
    }

    // Verifier l'authentification
    const user = await getAuthenticatedUser()
    if (!user || !user.email) return unauthorizedError()

    // Recuperer les infos entreprise
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const { data: entreprise } = await supabase
      .from('entreprises')
      .select('id, nom, stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!entreprise) {
      return secureError('Profil entreprise introuvable', 404)
    }

    // Recuperer ou creer le client Stripe
    const stripeCustomerId = await getOrCreateStripeCustomer(
      user.id,
      user.email,
      entreprise.nom || user.email,
      entreprise.stripe_customer_id,
    )

    // Sauvegarder le stripe_customer_id si c'est nouveau
    if (!entreprise.stripe_customer_id) {
      await supabase
        .from('entreprises')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', entreprise.id)
    }

    // Creer la session Checkout
    const priceId = process.env.STRIPE_PRICE_ID
    if (!priceId) {
      return secureError('Configuration Stripe incomplete (STRIPE_PRICE_ID manquant)', 500)
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nexartis.fr'

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/tarifs`,
      // Collecter le SIRET et la TVA (obligatoire en France)
      tax_id_collection: { enabled: true },
      // Appliquer la TVA automatiquement
      automatic_tax: { enabled: true },
      // Metadata pour le webhook
      metadata: {
        nexartis_user_id: user.id,
        nexartis_entreprise_id: entreprise.id,
      },
      subscription_data: {
        metadata: {
          nexartis_user_id: user.id,
          nexartis_entreprise_id: entreprise.id,
        },
      },
    })

    return secureJson({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return secureError('Erreur lors de la creation de la session de paiement', 500)
  }
}
