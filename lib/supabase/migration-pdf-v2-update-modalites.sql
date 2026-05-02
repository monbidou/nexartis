-- ============================================================
-- MIGRATION : Adoucir le template par défaut des Modalités d'intervention
-- ============================================================
-- Le template initial parlait d'horaires fixes 8h-17h, ce qui est trop strict
-- (un chantier peut commencer/finir à toute heure selon les contraintes).
-- On le remplace par un texte plus flexible pour TOUS les comptes qui
-- avaient encore le template initial (texte exact identique).
-- ============================================================

UPDATE entreprises
SET modalites_intervention_default = E'Horaires d''intervention : généralement entre 8h et 18h, en semaine\nLes horaires peuvent varier selon les contraintes du chantier (livraisons, contraintes techniques, météo)\nEn cas de retard ou modification, vous serez prévenu(e) au plus tôt'
WHERE modalites_intervention_default = E'Horaires : 8h - 17h, du lundi au vendredi\nPause déjeuner : 12h - 13h\nPas d''intervention les week-ends et jours fériés\nInformation préalable en cas de retard ou modification';

-- Compte des entreprises mises à jour : ne devrait pas dépasser le nombre de
-- comptes existants au moment de la migration PDF V2.
-- SELECT COUNT(*) FROM entreprises WHERE modalites_intervention_default LIKE '%généralement entre 8h et 18h%';
