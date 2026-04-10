-- ============================================================
-- Migration : Ajouter civilite à la table clients
-- À exécuter dans Supabase → SQL Editor
-- ============================================================

ALTER TABLE clients ADD COLUMN IF NOT EXISTS civilite TEXT DEFAULT NULL;
