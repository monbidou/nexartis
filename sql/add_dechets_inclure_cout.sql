-- Ajoute la colonne pour savoir si le coût déchets est inclus dans le total ou informatif
ALTER TABLE devis ADD COLUMN IF NOT EXISTS dechets_inclure_cout BOOLEAN DEFAULT false;
