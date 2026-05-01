-- ============================================================
-- MIGRATION PDF V2 — Champs pour le nouveau PDF chantier
-- ============================================================
-- Ajoute les champs nécessaires aux nouvelles sections du PDF
-- planification de chantier (Inclus/Non inclus, Préparation,
-- Modalités, Engagements, Pacte de chantier).
-- A executer dans Supabase SQL Editor.
-- ============================================================

-- ── 1. Table chantiers : champs propres au chantier ─────────────────
ALTER TABLE chantiers
  ADD COLUMN IF NOT EXISTS preparation_client TEXT,
  ADD COLUMN IF NOT EXISTS non_inclus TEXT,
  ADD COLUMN IF NOT EXISTS modalites_personnalisees TEXT,
  ADD COLUMN IF NOT EXISTS pacte_chantier_texte TEXT;

COMMENT ON COLUMN chantiers.preparation_client IS
  'Liste des choses que le client doit préparer avant le démarrage (ex: vider la pièce, couper l''eau). Affiché dans le PDF section "Préparation à votre charge".';
COMMENT ON COLUMN chantiers.non_inclus IS
  'Ce qui n''est PAS inclus dans le forfait pour éviter les litiges (ex: peinture portail, évacuation gravats hors démolition). Affiché dans le PDF section "Périmètre — Non inclus".';
COMMENT ON COLUMN chantiers.modalites_personnalisees IS
  'Modalités spécifiques à ce chantier qui écrasent les modalités par défaut du profil (ex: chantier en extérieur, on bosse 7h-15h pour cause de chaleur). Si NULL, on utilise entreprises.modalites_intervention_default.';
COMMENT ON COLUMN chantiers.pacte_chantier_texte IS
  'Texte personnalisé du Pacte de chantier (page de garde signée). Pré-rempli automatiquement à la première édition, modifiable par l''artisan.';

-- ── 2. Table entreprises : paramètres par défaut du profil ──────────
ALTER TABLE entreprises
  ADD COLUMN IF NOT EXISTS modalites_intervention_default TEXT,
  ADD COLUMN IF NOT EXISTS engagements_default TEXT;

COMMENT ON COLUMN entreprises.modalites_intervention_default IS
  'Modalités par défaut pour TOUS les chantiers (horaires, jours, week-ends). Affiché dans le PDF chantier section "Modalités d''intervention". Écrasable au cas par cas via chantiers.modalites_personnalisees.';
COMMENT ON COLUMN entreprises.engagements_default IS
  'Engagements qualité par défaut pour TOUS les chantiers (photos quotidiennes, site nettoyé, réponse 24h). Affiché dans le PDF section "Nos engagements".';

-- ── 3. Pré-remplir avec un template par défaut pour les comptes existants ─
UPDATE entreprises
SET modalites_intervention_default = E'Horaires : 8h - 17h, du lundi au vendredi\nPause déjeuner : 12h - 13h\nPas d''intervention les week-ends et jours fériés\nInformation préalable en cas de retard ou modification'
WHERE modalites_intervention_default IS NULL;

UPDATE entreprises
SET engagements_default = E'• Site nettoyé chaque fin de journée\n• Photos d''avancement envoyées régulièrement\n• Réponse à vos questions sous 24h ouvrées\n• Information immédiate par SMS en cas d''imprévu\n• Respect des dates communiquées (sauf intempéries documentées)'
WHERE engagements_default IS NULL;

-- ── 4. Vérification ─────────────────────────────────────────────────
-- SELECT column_name, data_type, col_description((table_schema||'.'||table_name)::regclass, ordinal_position) AS commentaire
-- FROM information_schema.columns
-- WHERE table_name IN ('chantiers', 'entreprises')
--   AND column_name IN (
--     'preparation_client', 'non_inclus', 'modalites_personnalisees', 'pacte_chantier_texte',
--     'modalites_intervention_default', 'engagements_default'
--   )
-- ORDER BY table_name, ordinal_position;
