import Stripe from 'stripe'

/**
 * Client Stripe cote serveur (Node.js)
 * La cle secrete ne doit JAMAIS etre exposee cote client.
 * Initialisation lazy pour eviter le crash au build sans STRIPE_SECRET_KEY.
 */
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY manquante - les paiements ne fonctionneront pas')
    }
    _stripe = new Stripe(key, {
      apiVersion: '2026-03-25.dahlia',
      typescript: true,
    })
  }
  return _stripe
}

/** @deprecated Use getStripe() instead — kept for backward compatibility */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as any)[prop]
  },
})

/**
 * Recupere ou cree un client Stripe pour un utilisateur Nexartis.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name: string,
  existingStripeCustomerId?: string | null,
): Promise<string> {
  const s = getStripe()

  // Si on a deja un customer ID, verifier qu'il existe encore
  if (existingStripeCustomerId) {
    try {
      const customer = await s.customers.retrieve(existingStripeCustomerId)
      if (!customer.deleted) return existingStripeCustomerId
    } catch {
      // Customer supprime ou invalide, on en cree un nouveau
    }
  }

  // Creer un nouveau client Stripe
  const customer = await s.customers.create({
    email,
    name,
    metadata: {
      nexartis_user_id: userId,
    },
  })

  return customer.id
}
