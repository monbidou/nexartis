-- ============================================================
-- MIGRATION : Notes par intervention (client + artisan privé)
-- ============================================================
-- Permet à l'artisan d'ajouter des notes datées sur chaque intervention
-- planifiée. 5 types pour couvrir tous les cas :
--
--   • note_client          → note générale visible par le client (PDF)
--   • presence_requise     → "votre présence est souhaitée ce jour"
--   • presence_obligatoire → "votre présence est OBLIGATOIRE" (réception, etc.)
--   • preparation          → "préparer X pour ce jour"
--   • note_artisan         → note PRIVÉE de l'artisan (rappel, todo, jamais
--                             affichée au client). Ex: "appeler le client la veille".
--
-- Les 4 premiers types apparaissent dans le PDF chantier section
-- "À noter pour vous". Le type 'note_artisan' apparaît UNIQUEMENT dans
-- le dashboard de l'artisan (widget "À faire" + panel intervention).
-- ============================================================

-- ── Table intervention_notes_client ─────────────────────────────────
CREATE TABLE IF NOT EXISTS intervention_notes_client (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  intervention_id UUID REFERENCES planning_interventions(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'note_client',
    'presence_requise',
    'presence_obligatoire',
    'preparation',
    'note_artisan'
  )),
  texte TEXT NOT NULL CHECK (char_length(texte) <= 300),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE intervention_notes_client IS
  'Notes datées attachées à chaque intervention planifiée. 5 types : 4 visibles client (PDF), 1 privée artisan (dashboard uniquement).';

-- ── Index pour les requêtes fréquentes ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_intervention_notes_intervention
  ON intervention_notes_client(intervention_id);

CREATE INDEX IF NOT EXISTS idx_intervention_notes_user
  ON intervention_notes_client(user_id);

-- Index utile pour le widget "À faire" (rappels J-1) qui filtre sur le type artisan
CREATE INDEX IF NOT EXISTS idx_intervention_notes_artisan
  ON intervention_notes_client(user_id, type)
  WHERE type = 'note_artisan';

-- ── RLS : un user ne voit que SES notes ─────────────────────────────
ALTER TABLE intervention_notes_client ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_own_notes_select" ON intervention_notes_client;
CREATE POLICY "user_own_notes_select" ON intervention_notes_client
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_own_notes_insert" ON intervention_notes_client;
CREATE POLICY "user_own_notes_insert" ON intervention_notes_client
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_own_notes_update" ON intervention_notes_client;
CREATE POLICY "user_own_notes_update" ON intervention_notes_client
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_own_notes_delete" ON intervention_notes_client;
CREATE POLICY "user_own_notes_delete" ON intervention_notes_client
  FOR DELETE USING (auth.uid() = user_id);

-- ── Trigger updated_at ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_intervention_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS intervention_notes_updated_at ON intervention_notes_client;
CREATE TRIGGER intervention_notes_updated_at
  BEFORE UPDATE ON intervention_notes_client
  FOR EACH ROW
  EXECUTE FUNCTION update_intervention_notes_updated_at();
