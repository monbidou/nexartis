-- ============================================================================
-- Migration : Hierarchie 3 niveaux pour devis_lignes et facture_lignes
-- Date : 2026-04-27
-- Objectif : permettre Section -> Sous-section -> Ligne avec sous-totaux
-- Idempotent : peut etre rejoue plusieurs fois sans erreur
-- Compatibilite : les lignes existantes restent valides (type='prestation', niveau=3, parent_id NULL)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) DEVIS_LIGNES : ajout de la hierarchie
-- ----------------------------------------------------------------------------

-- 1a) Etendre le CHECK constraint pour accepter 'sous_section'
ALTER TABLE devis_lignes
  DROP CONSTRAINT IF EXISTS devis_lignes_type_check;

ALTER TABLE devis_lignes
  ADD CONSTRAINT devis_lignes_type_check
  CHECK (type IN ('prestation', 'section', 'sous_section', 'commentaire', 'saut_page'));

-- 1b) Ajouter les colonnes hierarchie
ALTER TABLE devis_lignes
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES devis_lignes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS niveau SMALLINT DEFAULT 3 CHECK (niveau IN (1, 2, 3)),
  ADD COLUMN IF NOT EXISTS numero TEXT;

-- 1c) Index sur parent_id pour les requetes hierarchiques rapides
CREATE INDEX IF NOT EXISTS idx_devis_lignes_parent ON devis_lignes(parent_id);

-- 1d) Initialiser les lignes existantes : niveau 3 (ligne), pas de parent
UPDATE devis_lignes
SET niveau = 3
WHERE niveau IS NULL;

-- ----------------------------------------------------------------------------
-- 2) FACTURE_LIGNES : ajout du champ type ET de la hierarchie
-- ----------------------------------------------------------------------------

-- 2a) Ajouter la colonne type avec son CHECK
ALTER TABLE facture_lignes
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'prestation';

ALTER TABLE facture_lignes
  DROP CONSTRAINT IF EXISTS facture_lignes_type_check;

ALTER TABLE facture_lignes
  ADD CONSTRAINT facture_lignes_type_check
  CHECK (type IN ('prestation', 'section', 'sous_section', 'commentaire', 'saut_page'));

-- 2b) Ajouter les colonnes hierarchie
ALTER TABLE facture_lignes
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES facture_lignes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS niveau SMALLINT DEFAULT 3 CHECK (niveau IN (1, 2, 3)),
  ADD COLUMN IF NOT EXISTS numero TEXT;

-- 2c) Index sur parent_id
CREATE INDEX IF NOT EXISTS idx_facture_lignes_parent ON facture_lignes(parent_id);

-- 2d) Initialiser les lignes existantes
UPDATE facture_lignes
SET niveau = 3
WHERE niveau IS NULL;

-- ----------------------------------------------------------------------------
-- 3) FACTURES : ajout des champs pour les factures de situation
-- ----------------------------------------------------------------------------
-- pourcentage_situation existe deja, mais il manque les montants cumules

ALTER TABLE factures
  ADD COLUMN IF NOT EXISTS montant_situation_precedent_ht NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS montant_situation_precedent_ttc NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reste_a_facturer_ht NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reste_a_facturer_ttc NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS numero_situation SMALLINT DEFAULT 1;

-- ----------------------------------------------------------------------------
-- 4) Verification (logs informatifs en cas d'execution interactive)
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  nb_devis_lignes INTEGER;
  nb_facture_lignes INTEGER;
BEGIN
  SELECT COUNT(*) INTO nb_devis_lignes FROM devis_lignes;
  SELECT COUNT(*) INTO nb_facture_lignes FROM facture_lignes;
  RAISE NOTICE 'Migration appliquee. devis_lignes: % lignes, facture_lignes: % lignes', nb_devis_lignes, nb_facture_lignes;
END $$;
