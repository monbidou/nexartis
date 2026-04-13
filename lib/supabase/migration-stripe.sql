-- ============================================================
-- MIGRATION STRIPE — Ajouter les colonnes Stripe a la table entreprises
-- A executer dans Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 1. Ajouter les colonnes Stripe
ALTER TABLE entreprises
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- 2. Index pour retrouver rapidement une entreprise par son stripe_customer_id
CREATE INDEX IF NOT EXISTS idx_entreprises_stripe_customer
  ON entreprises(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- 3. Index pour retrouver une entreprise par son subscription_id (utilise par les webhooks)
CREATE INDEX IF NOT EXISTS idx_entreprises_stripe_subscription
  ON entreprises(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- 4. Verification : lister les colonnes de la table entreprises
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'entreprises' ORDER BY ordinal_position;
