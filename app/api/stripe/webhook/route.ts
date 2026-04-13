import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'

/**
 * POST /api/stripe/webhook
 * Recoit les evenements Stripe (paiement reussi, annulation, etc.)
 * IMPORTANT : Cette route ne doit PAS verifier l'auth utilisateur.
 * Elle verifie la signature Stripe a la place.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET non configure')
      return NextResponse.json({ error: 'Configuration webhook manquante' }, { status: 500 })
    }

    // Verifier la signature Stripe (empeche les faux webhooks)
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
    }

    // Client Supabase admin pour modifier la DB
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // Traiter les evenements
    switch (event.type) {
      // === PAIEMENT REUSSI ===
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.nexartis_user_id
        const entrepriseId = session.metadata?.nexartis_entreprise_id
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : (session.subscription as Stripe.Subscription)?.id

        if (entrepriseId) {
          await supabase
            .from('entreprises')
            .update({
              abonnement_type: 'actif',
              stripe_subscription_id: subscriptionId || null,
              stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
              abonnement_expire_at: null, // L'abonnement est gere par Stripe
            })
            .eq('id', entrepriseId)

          console.log(`[Stripe] Abonnement active pour entreprise ${entrepriseId}`)
        }
        break
      }

      // === FACTURE PAYEE (renouvellement mensuel) ===
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = (invoice as any).subscription as string | null

        if (subscriptionId) {
          // S'assurer que l'abonnement est toujours marque comme actif
          const { data: entreprise } = await supabase
            .from('entreprises')
            .select('id')
            .eq('stripe_subscription_id', subscriptionId)
            .single()

          if (entreprise) {
            await supabase
              .from('entreprises')
              .update({ abonnement_type: 'actif' })
              .eq('id', entreprise.id)
          }
        }
        break
      }

      // === PAIEMENT ECHOUE ===
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = (invoice as any).subscription as string | null

        if (subscriptionId) {
          const { data: entreprise } = await supabase
            .from('entreprises')
            .select('id')
            .eq('stripe_subscription_id', subscriptionId)
            .single()

          if (entreprise) {
            // Ne pas suspendre immediatement — Stripe reessaie automatiquement
            // Mais ajouter une note admin
            await supabase
              .from('entreprises')
              .update({
                notes_admin: `[Auto] Paiement echoue le ${new Date().toLocaleDateString('fr-FR')}`,
              })
              .eq('id', entreprise.id)

            console.warn(`[Stripe] Paiement echoue pour entreprise ${entreprise.id}`)
          }
        }
        break
      }

      // === ABONNEMENT ANNULE ===
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const { data: entreprise } = await supabase
          .from('entreprises')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .single()

        if (entreprise) {
          // Calculer la date de fin (fin de la periode payee)
          const periodEnd = new Date((subscription as any).current_period_end * 1000)

          await supabase
            .from('entreprises')
            .update({
              abonnement_type: 'suspendu',
              abonnement_expire_at: periodEnd.toISOString(),
              stripe_subscription_id: null,
            })
            .eq('id', entreprise.id)

          console.log(`[Stripe] Abonnement annule pour entreprise ${entreprise.id}, acces jusqu'au ${periodEnd.toLocaleDateString('fr-FR')}`)
        }
        break
      }

      // === ABONNEMENT MIS A JOUR ===
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const { data: entreprise } = await supabase
          .from('entreprises')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .single()

        if (entreprise) {
          const status = subscription.status
          let abonnementType = 'actif'
          if (status === 'past_due' || status === 'unpaid') abonnementType = 'suspendu'
          if (status === 'canceled') abonnementType = 'suspendu'
          if (status === 'active' || status === 'trialing') abonnementType = 'actif'

          await supabase
            .from('entreprises')
            .update({ abonnement_type: abonnementType })
            .eq('id', entreprise.id)
        }
        break
      }

      default:
        // Evenement non gere — c'est normal, on ignore
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Erreur webhook' }, { status: 500 })
  }
}
