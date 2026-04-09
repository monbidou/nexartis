-- Migration: ajouter les champs légaux obligatoires à la table entreprises
-- À exécuter dans Supabase SQL Editor

ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS forme_juridique TEXT;
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS capital_social TEXT;
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS rcs_rm TEXT;
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS assurance_nom TEXT;
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS assurance_zone TEXT;

-- Commentaires pour clarifier l'usage
COMMENT ON COLUMN entreprises.forme_juridique IS 'Forme juridique: EI, EURL, SARL, SAS, SASU, auto-entrepreneur...';
COMMENT ON COLUMN entreprises.capital_social IS 'Capital social (ex: 10 000 €). Vide si EI ou auto-entrepreneur.';
COMMENT ON COLUMN entreprises.rcs_rm IS 'N° RCS ou RM + ville (ex: RM Bordeaux 123456789)';
COMMENT ON COLUMN entreprises.assurance_nom IS 'Nom de l''assureur décennale (ex: AXA, MAAF, SMABTP...)';
COMMENT ON COLUMN entreprises.assurance_zone IS 'Zone géographique couverte par la décennale (ex: France entière)';
