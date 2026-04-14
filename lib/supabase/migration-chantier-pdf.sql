-- ============================================================
-- MIGRATION PDF CHANTIER — Ajouter les colonnes necessaires
-- A executer dans Supabase SQL Editor
-- ============================================================

-- 1. Ajouter la visibilite des notes dans le PDF client
-- Par defaut: FALSE (les notes existantes restent privees pour l'artisan)
ALTER TABLE chantier_notes
  ADD COLUMN IF NOT EXISTS visible_in_pdf BOOLEAN DEFAULT FALSE;

-- 2. Ajouter les infos d'acces au chantier (stationnement, code portail, etc.)
ALTER TABLE chantiers
  ADD COLUMN IF NOT EXISTS acces_info TEXT;

-- 3. Description cote client (optionnel, resume des travaux)
ALTER TABLE chantiers
  ADD COLUMN IF NOT EXISTS description_client TEXT;

-- 4. Index pour acceder rapidement aux notes visibles d'un chantier
CREATE INDEX IF NOT EXISTS idx_chantier_notes_visible
  ON chantier_notes(chantier_id, visible_in_pdf)
  WHERE visible_in_pdf = TRUE;

-- Verification : afficher les nouvelles colonnes
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name IN ('chantiers', 'chantier_notes')
-- AND column_name IN ('visible_in_pdf', 'acces_info', 'description_client');
