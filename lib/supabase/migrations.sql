-- ============================================
-- MIGRATIONS NEXARTIS — Liaisons modules
-- Exécuter dans Supabase SQL Editor
-- ============================================

-- 1) Ajouter colonnes manquantes pour soft delete (corbeille)
ALTER TABLE devis ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE factures ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index pour filtrer les éléments actifs
CREATE INDEX IF NOT EXISTS idx_devis_deleted ON devis(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_factures_deleted ON factures(user_id, deleted_at);

-- 2) Corriger planning_interventions : ajouter devis_id s'il manque
ALTER TABLE planning_interventions ADD COLUMN IF NOT EXISTS devis_id UUID REFERENCES devis(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_planning_devis ON planning_interventions(devis_id);

-- 3) Lier chantier_id à planning_interventions (pour retrouver devis -> chantier dans planning)
-- planning_interventions.chantier_id existe déjà
CREATE INDEX IF NOT EXISTS idx_planning_chantier ON planning_interventions(chantier_id);

-- 4) Ajouter colonnes de facturation sur chantier pour tracking automatique
-- (montant_devis_total, montant_facture, montant_encaisse existent déjà)

-- 5) Colonne pour tracer quel devis a généré quel chantier
ALTER TABLE chantiers ADD COLUMN IF NOT EXISTS devis_original_id UUID REFERENCES devis(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_chantiers_devis ON chantiers(devis_original_id);

-- 6) Sur facture_lignes : tracker origine (devis_ligne ou manual)
ALTER TABLE facture_lignes ADD COLUMN IF NOT EXISTS devis_ligne_id UUID REFERENCES devis_lignes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_facture_lignes_devis ON facture_lignes(devis_ligne_id);

-- 7) Sur planning_interventions : tracker les heures prévues vs réalisées pour facturation
ALTER TABLE planning_interventions ADD COLUMN IF NOT EXISTS heure_reelle_debut TIME DEFAULT NULL;
ALTER TABLE planning_interventions ADD COLUMN IF NOT EXISTS heure_reelle_fin TIME DEFAULT NULL;
ALTER TABLE planning_interventions ADD COLUMN IF NOT EXISTS validation_intervenant_date TIMESTAMPTZ DEFAULT NULL;

-- 8) Nouvelle table : liaison 1-N devis <-> chantiers (un devis peut générèr plusieurs chantiers OU un chantier peut avoir plusieurs devis)
CREATE TABLE IF NOT EXISTS chantier_devis (
  chantier_id UUID REFERENCES chantiers(id) ON DELETE CASCADE NOT NULL,
  devis_id UUID REFERENCES devis(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (chantier_id, devis_id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_chantier_devis_chantier ON chantier_devis(chantier_id);
CREATE INDEX idx_chantier_devis_devis ON chantier_devis(devis_id);

-- 9) Table d'événements pour tracer les changements de statut (audit + automations)
CREATE TABLE IF NOT EXISTS module_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entity_type TEXT NOT NULL, -- 'devis', 'facture', 'chantier', 'planning'
  entity_id UUID NOT NULL,
  old_statut TEXT,
  new_statut TEXT,
  triggered_by TEXT, -- 'user', 'system', 'api'
  action_type TEXT, -- 'status_change', 'created', 'deleted', etc.
  payload JSONB, -- données additionnelles pour automations
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_module_events_user ON module_events(user_id);
CREATE INDEX idx_module_events_entity ON module_events(entity_type, entity_id);
CREATE INDEX idx_module_events_statut ON module_events(user_id, new_statut);

-- 10) Ajouter colonnes pour tracking paiements sur chantier (déjà existantes mais confirmation)
-- montant_encaisse existe déjà sur chantiers

-- 11) Nouvelle table : equipe assignee a un chantier (1 artisan peut etre sur plusieurs chantiers)
CREATE TABLE IF NOT EXISTS chantier_intervenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chantier_id UUID REFERENCES chantiers(id) ON DELETE CASCADE NOT NULL,
  intervenant_id UUID REFERENCES intervenants(id) ON DELETE CASCADE NOT NULL,
  date_assignation TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(chantier_id, intervenant_id)
);
CREATE INDEX IF NOT EXISTS idx_chantier_intervenants_chantier ON chantier_intervenants(chantier_id);
CREATE INDEX IF NOT EXISTS idx_chantier_intervenants_intervenant ON chantier_intervenants(intervenant_id);

-- FIN MIGRATIONS
