-- Ajoute la colonne médiateur de la consommation à la table entreprises
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS mediateur TEXT;
