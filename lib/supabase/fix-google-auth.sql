-- ============================================
-- FIX: Erreur "Database error saving new user" lors de la connexion Google
-- Exécuter dans Supabase SQL Editor
-- ============================================

-- Le trigger handle_new_user() plante quand un utilisateur Google
-- se reconnecte car l'entreprise existe déjà (violation UNIQUE sur user_id).
-- Solution : ON CONFLICT DO NOTHING

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
