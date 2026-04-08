-- Migration : colonnes client libre + civilité dans la table devis
-- À exécuter dans Supabase Dashboard > SQL Editor

ALTER TABLE devis ADD COLUMN IF NOT EXISTS client_civilite TEXT;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS client_nom TEXT;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS client_adresse TEXT;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS client_telephone TEXT;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS client_email TEXT;
