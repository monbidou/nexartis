-- Migration : Ajout colonnes pour mentions légales automatiques
-- À exécuter dans Supabase SQL Editor

-- Franchise TVA (true = non assujetti, mention "art. 293 B du CGI")
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS franchise_tva BOOLEAN DEFAULT false;

-- Qualification professionnelle (obligatoire pour métiers réglementés : électricité, plomberie, etc.)
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS qualification_pro TEXT;

-- Vérifier que mentions_legales_custom existe déjà (normalement oui)
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS mentions_legales_custom TEXT;
