-- ============================================
-- ARTIDOC — Row Level Security Policies
-- Exécuter dans Supabase SQL Editor APRÈS schema.sql
-- Ordre : 1) schema.sql  2) rls.sql
-- ============================================


-- ============================================
-- TABLE: entreprises
-- ============================================
ALTER TABLE entreprises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entreprise"
ON entreprises FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entreprise"
ON entreprises FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entreprise"
ON entreprises FOR UPDATE
USING (auth.uid() = user_id);


-- ============================================
-- TABLE: clients
-- ============================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clients"
ON clients FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients"
ON clients FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients"
ON clients FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients"
ON clients FOR DELETE
USING (auth.uid() = user_id);


-- ============================================
-- TABLE: fournisseurs
-- ============================================
ALTER TABLE fournisseurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fournisseurs"
ON fournisseurs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fournisseurs"
ON fournisseurs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fournisseurs"
ON fournisseurs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fournisseurs"
ON fournisseurs FOR DELETE
USING (auth.uid() = user_id);


-- ============================================
-- TABLE: intervenants
-- ============================================
ALTER TABLE intervenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own intervenants"
ON intervenants FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own intervenants"
ON intervenants FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own intervenants"
ON intervenants FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own intervenants"
ON intervenants FOR DELETE
USING (auth.uid() = user_id);


-- ============================================
-- TABLE: prestations
-- ============================================
ALTER TABLE prestations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prestations"
ON prestations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prestations"
ON prestations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prestations"
ON prestations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prestations"
ON prestations FOR DELETE
USING (auth.uid() = user_id);


-- ============================================
-- TABLE: chantiers
-- ============================================
ALTER TABLE chantiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chantiers"
ON chantiers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chantiers"
ON chantiers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chantiers"
ON chantiers FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chantiers"
ON chantiers FOR DELETE
USING (auth.uid() = user_id);


-- ============================================
-- TABLE: devis
-- ============================================
ALTER TABLE devis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own devis"
ON devis FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devis"
ON devis FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devis"
ON devis FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own devis"
ON devis FOR DELETE
USING (auth.uid() = user_id);


-- ============================================
-- TABLE: devis_lignes
-- (pas de user_id direct — sécurisé via le devis parent)
-- ============================================
ALTER TABLE devis_lignes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own devis_lignes"
ON devis_lignes FOR SELECT
USING (devis_id IN (SELECT id FROM devis WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own devis_lignes"
ON devis_lignes FOR INSERT
WITH CHECK (devis_id IN (SELECT id FROM devis WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own devis_lignes"
ON devis_lignes FOR UPDATE
USING (devis_id IN (SELECT id FROM devis WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own devis_lignes"
ON devis_lignes FOR DELETE
USING (devis_id IN (SELECT id FROM devis WHERE user_id = auth.uid()));


-- ============================================
-- TABLE: factures
-- ============================================
ALTER TABLE factures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own factures"
ON factures FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own factures"
ON factures FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own factures"
ON factures FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own factures"
ON factures FOR DELETE
USING (auth.uid() = user_id);


-- ============================================
-- TABLE: facture_lignes
-- (pas de user_id direct — sécurisé via la facture parent)
-- ============================================
ALTER TABLE facture_lignes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own facture_lignes"
ON facture_lignes FOR SELECT
USING (facture_id IN (SELECT id FROM factures WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own facture_lignes"
ON facture_lignes FOR INSERT
WITH CHECK (facture_id IN (SELECT id FROM factures WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own facture_lignes"
ON facture_lignes FOR UPDATE
USING (facture_id IN (SELECT id FROM factures WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own facture_lignes"
ON facture_lignes FOR DELETE
USING (facture_id IN (SELECT id FROM factures WHERE user_id = auth.uid()));


-- ============================================
-- TABLE: paiements
-- ============================================
ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own paiements"
ON paiements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own paiements"
ON paiements FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own paiements"
ON paiements FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own paiements"
ON paiements FOR DELETE
USING (auth.uid() = user_id);


-- ============================================
-- TABLE: planning_interventions
-- ============================================
ALTER TABLE planning_interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own planning"
ON planning_interventions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own planning"
ON planning_interventions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own planning"
ON planning_interventions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own planning"
ON planning_interventions FOR DELETE
USING (auth.uid() = user_id);


-- ============================================
-- TABLE: achats
-- ============================================
ALTER TABLE achats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achats"
ON achats FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achats"
ON achats FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own achats"
ON achats FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own achats"
ON achats FOR DELETE
USING (auth.uid() = user_id);


-- ============================================
-- TABLE: documents
-- ============================================
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
ON documents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
ON documents FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
ON documents FOR DELETE
USING (auth.uid() = user_id);


-- ============================================
-- TABLE: relances
-- ============================================
ALTER TABLE relances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own relances"
ON relances FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own relances"
ON relances FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own relances"
ON relances FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own relances"
ON relances FOR DELETE
USING (auth.uid() = user_id);
