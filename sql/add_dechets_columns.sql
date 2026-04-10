ALTER TABLE devis ADD COLUMN IF NOT EXISTS dechets_nature TEXT;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS dechets_quantite TEXT;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS dechets_responsable TEXT;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS dechets_tri TEXT;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS dechets_collecte_nom TEXT;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS dechets_collecte_adresse TEXT;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS dechets_collecte_type TEXT;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS dechets_cout NUMERIC;

CREATE TABLE IF NOT EXISTS points_collecte (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  nom TEXT NOT NULL,
  adresse TEXT,
  type_installation TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE points_collecte ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own points_collecte" ON points_collecte;
CREATE POLICY "Users can manage their own points_collecte"
  ON points_collecte FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE devis DROP COLUMN IF EXISTS type_dechets;
ALTER TABLE devis DROP COLUMN IF EXISTS point_collecte;
ALTER TABLE devis DROP COLUMN IF EXISTS volume_m3;
ALTER TABLE devis DROP COLUMN IF EXISTS cout_ttc_m3;
