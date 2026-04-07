-- ============================================
-- ARTIDOC — Schéma complet de la base de données
-- Exécuter dans Supabase SQL Editor
-- Ordre : 1) schema.sql  2) rls.sql
-- ============================================


-- ============================================
-- TABLE: entreprises
-- Profil de l'artisan / société
-- ============================================
CREATE TABLE IF NOT EXISTS entreprises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nom TEXT NOT NULL,
  siret TEXT,
  tva_intracommunautaire TEXT,
  code_naf TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  telephone TEXT,
  email TEXT,
  logo_url TEXT,
  iban TEXT,
  bic TEXT,
  conditions_paiement TEXT DEFAULT '30% à la commande, solde à la réception des travaux',
  mentions_legales_custom TEXT,
  couleur_principale TEXT DEFAULT '#5ab4e0',
  metier TEXT,
  rge BOOLEAN DEFAULT FALSE,
  decennale_numero TEXT,
  prefix_devis TEXT DEFAULT 'D',
  prefix_factures TEXT DEFAULT 'F',
  delai_paiement_defaut TEXT DEFAULT '30 jours',
  tva_defaut NUMERIC(4,2) DEFAULT 10.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_entreprises_user ON entreprises(user_id);


-- ============================================
-- TABLE: clients
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('particulier', 'professionnel')) DEFAULT 'particulier',
  prenom TEXT,
  nom TEXT NOT NULL,
  raison_sociale TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  email TEXT,
  telephone TEXT,
  siret TEXT,
  notes_internes TEXT,
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_user ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_nom ON clients(user_id, nom);


-- ============================================
-- TABLE: fournisseurs
-- ============================================
CREATE TABLE IF NOT EXISTS fournisseurs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nom TEXT NOT NULL,
  contact TEXT,
  email TEXT,
  telephone TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  siret TEXT,
  notes TEXT,
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fournisseurs_user ON fournisseurs(user_id);


-- ============================================
-- TABLE: intervenants (équipe)
-- ============================================
CREATE TABLE IF NOT EXISTS intervenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  telephone TEXT,
  email TEXT,
  metier TEXT,
  type_contrat TEXT CHECK (type_contrat IN ('cdi', 'cdd', 'apprenti', 'interimaire', 'sous-traitant')) DEFAULT 'cdi',
  taux_horaire NUMERIC(10,2),
  niveau_acces TEXT CHECK (niveau_acces IN ('proprietaire', 'compagnon')) DEFAULT 'compagnon',
  couleur TEXT,
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intervenants_user ON intervenants(user_id);


-- ============================================
-- TABLE: prestations (bibliothèque)
-- ============================================
CREATE TABLE IF NOT EXISTS prestations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  designation TEXT NOT NULL,
  unite TEXT CHECK (unite IN ('U', 'Fft', 'm²', 'ml', 'h', 'kg', 'ens', 'lot', 'j')) DEFAULT 'U',
  prix_unitaire_ht NUMERIC(10,2) NOT NULL DEFAULT 0,
  taux_tva NUMERIC(4,2) DEFAULT 10.00,
  categorie TEXT CHECK (categorie IN ('fournitures', 'main_oeuvre', 'ouvrages', 'deplacements')) DEFAULT 'ouvrages',
  tags TEXT[],
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prestations_user ON prestations(user_id);
CREATE INDEX IF NOT EXISTS idx_prestations_categorie ON prestations(user_id, categorie);


-- ============================================
-- TABLE: chantiers
-- ============================================
CREATE TABLE IF NOT EXISTS chantiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  titre TEXT NOT NULL,
  description TEXT,
  statut TEXT CHECK (statut IN ('prospection', 'signe', 'en_cours', 'livre', 'cloture', 'archive')) DEFAULT 'prospection',
  adresse_chantier TEXT,
  code_postal_chantier TEXT,
  ville_chantier TEXT,
  date_debut DATE,
  date_fin_prevue DATE,
  date_fin_reelle DATE,
  montant_devis_total NUMERIC(12,2) DEFAULT 0,
  montant_facture NUMERIC(12,2) DEFAULT 0,
  montant_encaisse NUMERIC(12,2) DEFAULT 0,
  cout_mo NUMERIC(12,2) DEFAULT 0,
  cout_materiaux NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  couleur TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chantiers_user ON chantiers(user_id);
CREATE INDEX IF NOT EXISTS idx_chantiers_client ON chantiers(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_chantiers_statut ON chantiers(user_id, statut);


-- ============================================
-- TABLE: devis
-- ============================================
CREATE TABLE IF NOT EXISTS devis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  chantier_id UUID REFERENCES chantiers(id) ON DELETE SET NULL,
  numero TEXT NOT NULL,
  date_emission DATE DEFAULT CURRENT_DATE,
  date_validite DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  date_debut_travaux DATE,
  duree_estimee TEXT,
  statut TEXT CHECK (statut IN ('brouillon', 'envoye', 'finalise', 'signe', 'refuse', 'expire', 'facture')) DEFAULT 'brouillon',
  objet TEXT,
  description TEXT,
  conditions_paiement TEXT,
  methodes_paiement TEXT[],
  montant_ht NUMERIC(12,2) DEFAULT 0,
  montant_tva NUMERIC(12,2) DEFAULT 0,
  montant_ttc NUMERIC(12,2) DEFAULT 0,
  acompte_pourcentage NUMERIC(5,2),
  notes_client TEXT,
  notes_internes TEXT,
  date_envoi TIMESTAMPTZ,
  date_signature TIMESTAMPTZ,
  signed_by TEXT,
  signature_url TEXT,
  pdf_url TEXT,
  consulte_par_client BOOLEAN DEFAULT FALSE,
  date_consultation TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devis_user ON devis(user_id);
CREATE INDEX IF NOT EXISTS idx_devis_client ON devis(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_devis_statut ON devis(user_id, statut);
CREATE UNIQUE INDEX idx_devis_numero ON devis(user_id, numero);


-- ============================================
-- TABLE: devis_lignes
-- ============================================
CREATE TABLE IF NOT EXISTS devis_lignes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  devis_id UUID REFERENCES devis(id) ON DELETE CASCADE NOT NULL,
  ordre INTEGER NOT NULL DEFAULT 0,
  type TEXT CHECK (type IN ('prestation', 'section', 'commentaire', 'saut_page')) DEFAULT 'prestation',
  designation TEXT,
  quantite NUMERIC(10,3) DEFAULT 1,
  unite TEXT DEFAULT 'U',
  prix_unitaire_ht NUMERIC(10,2) DEFAULT 0,
  taux_tva NUMERIC(4,2) DEFAULT 10.00,
  montant_ht NUMERIC(12,2) GENERATED ALWAYS AS (quantite * prix_unitaire_ht) STORED,
  optionnel BOOLEAN DEFAULT FALSE,
  prestation_id UUID REFERENCES prestations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devis_lignes_devis ON devis_lignes(devis_id);


-- ============================================
-- TABLE: factures
-- ============================================
CREATE TABLE IF NOT EXISTS factures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  chantier_id UUID REFERENCES chantiers(id) ON DELETE SET NULL,
  devis_id UUID REFERENCES devis(id) ON DELETE SET NULL,
  numero TEXT NOT NULL,
  type TEXT CHECK (type IN ('standard', 'acompte', 'situation', 'avoir')) DEFAULT 'standard',
  date_emission DATE DEFAULT CURRENT_DATE,
  date_echeance DATE,
  statut TEXT CHECK (statut IN ('brouillon', 'envoyee', 'partiellement_payee', 'payee', 'en_retard', 'annulee')) DEFAULT 'brouillon',
  montant_ht NUMERIC(12,2) DEFAULT 0,
  montant_tva NUMERIC(12,2) DEFAULT 0,
  montant_ttc NUMERIC(12,2) DEFAULT 0,
  montant_paye NUMERIC(12,2) DEFAULT 0,
  date_paiement TIMESTAMPTZ,
  pourcentage_situation NUMERIC(5,2),
  facturx_xml TEXT,
  pdf_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_factures_user ON factures(user_id);
CREATE INDEX IF NOT EXISTS idx_factures_client ON factures(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_factures_statut ON factures(user_id, statut);
CREATE UNIQUE INDEX idx_factures_numero ON factures(user_id, numero);


-- ============================================
-- TABLE: facture_lignes
-- ============================================
CREATE TABLE IF NOT EXISTS facture_lignes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facture_id UUID REFERENCES factures(id) ON DELETE CASCADE NOT NULL,
  ordre INTEGER NOT NULL DEFAULT 0,
  designation TEXT,
  quantite NUMERIC(10,3) DEFAULT 1,
  unite TEXT DEFAULT 'U',
  prix_unitaire_ht NUMERIC(10,2) DEFAULT 0,
  taux_tva NUMERIC(4,2) DEFAULT 10.00,
  montant_ht NUMERIC(12,2) GENERATED ALWAYS AS (quantite * prix_unitaire_ht) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facture_lignes_facture ON facture_lignes(facture_id);


-- ============================================
-- TABLE: paiements
-- ============================================
CREATE TABLE IF NOT EXISTS paiements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  facture_id UUID REFERENCES factures(id) ON DELETE CASCADE NOT NULL,
  montant NUMERIC(12,2) NOT NULL,
  date_paiement DATE DEFAULT CURRENT_DATE,
  methode TEXT CHECK (methode IN ('virement', 'cheque', 'cb', 'especes', 'autre')) DEFAULT 'virement',
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paiements_facture ON paiements(facture_id);


-- ============================================
-- TABLE: planning_interventions
-- ============================================
CREATE TABLE IF NOT EXISTS planning_interventions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  chantier_id UUID REFERENCES chantiers(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  intervenant_id UUID REFERENCES intervenants(id) ON DELETE SET NULL,
  titre TEXT,
  description_travaux TEXT,
  date_debut DATE NOT NULL,
  date_fin DATE,
  heure_debut TIME DEFAULT '08:00',
  heure_fin TIME DEFAULT '17:00',
  creneau TEXT CHECK (creneau IN ('matin', 'apres_midi', 'journee')) DEFAULT 'journee',
  statut TEXT CHECK (statut IN ('planifie', 'en_cours', 'termine', 'annule', 'reporte')) DEFAULT 'planifie',
  couleur TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planning_user ON planning_interventions(user_id);
CREATE INDEX IF NOT EXISTS idx_planning_date ON planning_interventions(user_id, date_debut);
CREATE INDEX IF NOT EXISTS idx_planning_intervenant ON planning_interventions(user_id, intervenant_id);


-- ============================================
-- TABLE: achats
-- ============================================
CREATE TABLE IF NOT EXISTS achats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fournisseur_id UUID REFERENCES fournisseurs(id) ON DELETE SET NULL,
  chantier_id UUID REFERENCES chantiers(id) ON DELETE SET NULL,
  date_achat DATE DEFAULT CURRENT_DATE,
  description TEXT,
  montant_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  taux_tva NUMERIC(4,2) DEFAULT 20.00,
  montant_ttc NUMERIC(12,2) GENERATED ALWAYS AS (montant_ht * (1 + taux_tva / 100)) STORED,
  justificatif_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_achats_user ON achats(user_id);
CREATE INDEX IF NOT EXISTS idx_achats_fournisseur ON achats(user_id, fournisseur_id);
CREATE INDEX IF NOT EXISTS idx_achats_chantier ON achats(user_id, chantier_id);


-- ============================================
-- TABLE: documents
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reference_type TEXT CHECK (reference_type IN ('chantier', 'devis', 'facture', 'client')) NOT NULL,
  reference_id UUID NOT NULL,
  nom_fichier TEXT NOT NULL,
  type_fichier TEXT,
  url TEXT NOT NULL,
  taille_octets BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_ref ON documents(reference_type, reference_id);


-- ============================================
-- TABLE: relances
-- ============================================
CREATE TABLE IF NOT EXISTS relances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  facture_id UUID REFERENCES factures(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('rappel', 'ferme', 'mise_en_demeure')) DEFAULT 'rappel',
  date_envoi TIMESTAMPTZ DEFAULT NOW(),
  statut TEXT CHECK (statut IN ('planifiee', 'envoyee', 'annulee')) DEFAULT 'planifiee',
  contenu TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_relances_facture ON relances(facture_id);


-- ============================================
-- FONCTION: mise à jour automatique de updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur toutes les tables avec updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON entreprises FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON fournisseurs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON intervenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON prestations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON chantiers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON devis FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON factures FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON planning_interventions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON achats FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================
-- FONCTION: numérotation automatique des devis
-- ============================================
CREATE OR REPLACE FUNCTION generate_devis_numero()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  year TEXT;
  seq INTEGER;
BEGIN
  SELECT COALESCE(e.prefix_devis, 'D') INTO prefix
  FROM entreprises e WHERE e.user_id = NEW.user_id;

  year := TO_CHAR(CURRENT_DATE, 'YYYY');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(d.numero FROM LENGTH(prefix) + 5) AS INTEGER)
  ), 0) + 1 INTO seq
  FROM devis d
  WHERE d.user_id = NEW.user_id
    AND d.numero LIKE prefix || year || '%';

  NEW.numero := prefix || year || LPAD(seq::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_numero_devis
BEFORE INSERT ON devis
FOR EACH ROW
WHEN (NEW.numero IS NULL OR NEW.numero = '')
EXECUTE FUNCTION generate_devis_numero();


-- ============================================
-- FONCTION: numérotation automatique des factures
-- ============================================
CREATE OR REPLACE FUNCTION generate_facture_numero()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  year TEXT;
  seq INTEGER;
BEGIN
  SELECT COALESCE(e.prefix_factures, 'F') INTO prefix
  FROM entreprises e WHERE e.user_id = NEW.user_id;

  year := TO_CHAR(CURRENT_DATE, 'YYYY');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(f.numero FROM LENGTH(prefix) + 5) AS INTEGER)
  ), 0) + 1 INTO seq
  FROM factures f
  WHERE f.user_id = NEW.user_id
    AND f.numero LIKE prefix || year || '%';

  NEW.numero := prefix || year || LPAD(seq::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_numero_facture
BEFORE INSERT ON factures
FOR EACH ROW
WHEN (NEW.numero IS NULL OR NEW.numero = '')
EXECUTE FUNCTION generate_facture_numero();


-- ============================================
-- FONCTION: créer l'entreprise à l'inscription
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO entreprises (user_id, nom, metier)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'entreprise', 'Mon entreprise'),
    COALESCE(NEW.raw_user_meta_data->>'metier', '')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();
