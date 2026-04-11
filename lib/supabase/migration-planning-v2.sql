-- ============================================
-- NEXARTIS — Migration Planning V2
-- Tables: chantier_notes, sous_traitant_paiements
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- ============================================
-- TABLE: chantier_notes
-- Notes / rappels attachés à un chantier
-- ============================================
CREATE TABLE IF NOT EXISTS chantier_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  chantier_id UUID REFERENCES chantiers(id) ON DELETE CASCADE NOT NULL,
  texte TEXT NOT NULL,
  categorie TEXT CHECK (categorie IN ('urgent', 'rappel', 'demain', 'info')) DEFAULT 'info',
  fait BOOLEAN DEFAULT FALSE,
  fait_le TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chantier_notes_user ON chantier_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_chantier_notes_chantier ON chantier_notes(user_id, chantier_id);

-- RLS
ALTER TABLE chantier_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chantier_notes_select" ON chantier_notes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "chantier_notes_insert" ON chantier_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chantier_notes_update" ON chantier_notes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "chantier_notes_delete" ON chantier_notes
  FOR DELETE USING (auth.uid() = user_id);


-- ============================================
-- TABLE: sous_traitant_paiements
-- Suivi des paiements sous-traitants par chantier
-- ============================================
CREATE TABLE IF NOT EXISTS sous_traitant_paiements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  chantier_id UUID REFERENCES chantiers(id) ON DELETE CASCADE NOT NULL,
  intervenant_id UUID REFERENCES intervenants(id) ON DELETE SET NULL,
  montant_prevu NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_paye NUMERIC(12,2) NOT NULL DEFAULT 0,
  statut TEXT CHECK (statut IN ('a_payer', 'partiel', 'paye')) DEFAULT 'a_payer',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_st_paiements_user ON sous_traitant_paiements(user_id);
CREATE INDEX IF NOT EXISTS idx_st_paiements_chantier ON sous_traitant_paiements(user_id, chantier_id);

-- RLS
ALTER TABLE sous_traitant_paiements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "st_paiements_select" ON sous_traitant_paiements
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "st_paiements_insert" ON sous_traitant_paiements
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "st_paiements_update" ON sous_traitant_paiements
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "st_paiements_delete" ON sous_traitant_paiements
  FOR DELETE USING (auth.uid() = user_id);
