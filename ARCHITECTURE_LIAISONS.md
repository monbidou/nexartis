# Architecture des Liaisons Nexartis

## Vue d'ensemble

Flux artisan complet : **Devis → Chantier → Planning → Facture → Paiement**

Chaque transition déclenche des automatismes pour garantir la cohérence des données et réduire les actions manuelles.

---

## 1. SCHÉMA DES LIAISONS

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENTS                             │
└─────────────────────────────────────────────────────────┘
                    ↓ client_id
┌─────────────────────────────────────────────────────────┐
│                      DEVIS                              │
│  id | client_id | chantier_id | statut | montant_ttc   │
│  'brouillon' → 'envoye' → 'signe' → 'facture'           │
└─────────────────────────────────────────────────────────┘
        ↓                            ↓
    devis_lignes              chantier_devis (relation N-N)
                                    ↓ chantier_id
                             ┌──────────────────────┐
                             │     CHANTIERS        │
                             │ client_id | statut   │
                             │ 'signe' → 'en_cours' │
                             │ 'livre' → 'cloture'  │
                             └──────────────────────┘
                                    ↓ chantier_id
                             ┌──────────────────────┐
                             │   INTERVENTIONS      │
                             │ intervenant_id       │
                             │ date_debut/fin       │
                             │ 'planifie' → 'en... │
                             │ 'termine'            │
                             └──────────────────────┘
                                    ↓
                        ┌───────────────────────┐
                        │  INTERVENANTS         │
                        │  (Mon équipe)         │
                        └───────────────────────┘

DEVIS → FACTURE (FK: devis_id)
        ↓
    facture_lignes (copie des devis_lignes)
        ↓
    PAIEMENTS (FK: facture_id)
```

---

## 2. COLONNES CLÉS (Existence + État)

| Table | Colonne | Existe ? | Fonction | FK ? |
|-------|---------|----------|----------|------|
| devis | id | ✓ | PK | - |
| devis | client_id | ✓ | Lien client | clients(id) |
| devis | chantier_id | ✓ | Lien chantier | chantiers(id) |
| devis | statut | ✓ | État | - |
| devis | deleted_at | **✗ → ADD** | Soft delete | - |
| devis | montant_ttc | ✓ | Budget devis | - |
| chantiers | id | ✓ | PK | - |
| chantiers | client_id | ✓ | Lien client | clients(id) |
| chantiers | devis_original_id | **✗ → ADD** | Tracer source | devis(id) |
| chantiers | statut | ✓ | État | - |
| chantiers | montant_devis_total | ✓ | Budget | - |
| chantiers | montant_facture | ✓ | Facturé | - |
| chantiers | montant_encaisse | ✓ | Payé | - |
| chantier_devis | chantier_id + devis_id | **✗ → CREATE** | Relation N-N | - |
| planning_interventions | id | ✓ | PK | - |
| planning_interventions | chantier_id | ✓ | Lien chantier | chantiers(id) |
| planning_interventions | intervenant_id | ✓ | Lien équipe | intervenants(id) |
| planning_interventions | devis_id | **✗ → ADD** | Lien devis | devis(id) |
| planning_interventions | statut | ✓ | État | - |
| planning_interventions | heure_reelle_debut | **✗ → ADD** | Heures réelles | - |
| planning_interventions | heure_reelle_fin | **✗ → ADD** | Heures réelles | - |
| planning_interventions | validation_intervenant_date | **✗ → ADD** | Validation | - |
| factures | id | ✓ | PK | - |
| factures | devis_id | ✓ | Lien devis | devis(id) |
| factures | chantier_id | ✓ | Lien chantier | chantiers(id) |
| factures | client_id | ✓ | Lien client | clients(id) |
| factures | deleted_at | **✗ → ADD** | Soft delete | - |
| facture_lignes | facture_id | ✓ | Lien facture | factures(id) |
| facture_lignes | devis_ligne_id | **✗ → ADD** | Tracer origine | devis_lignes(id) |
| module_events | id | **✗ → CREATE** | Audit + automations | - |

---

## 3. MIGRATIONS NÉCESSAIRES

Voir fichier : `lib/supabase/migrations.sql`

**Résumé** :
1. ✓ Ajouter `deleted_at` sur devis + factures
2. ✓ Ajouter `devis_id` sur planning_interventions (validation)
3. ✓ Ajouter `devis_original_id` sur chantiers
4. ✓ Ajouter heures réelles + validation sur planning
5. ✓ Créer table `chantier_devis` (relation N-N)
6. ✓ Créer table `facture_lignes.devis_ligne_id`
7. ✓ Créer table `module_events` (audit + orchestration)

---

## 4. FLUX AUTOMATIONS

### 4.1 Devis → Chantier

**Trigger** : `devis.statut = 'signe'` (user clique "Accepter")

**Automatismes** :
1. Récupérer le devis
2. Vérifier si `devis.chantier_id` existe
   - **OUI** → mettre à jour `chantier.statut = 'signe'` (en attente planning)
   - **NON** → proposer UI : créer nouveau chantier OU lier existant
3. Si création : insérer chantier avec `devis_original_id = devis.id`
4. Mettre à jour `devis.chantier_id`
5. Insérer relation dans `chantier_devis`
6. Logger event pour audit

**Service** : `lib/services/devis-automatisms.ts`
- `handleDevisSigne()` - orchestre le flux
- `createChantierFromDevis()` - crée chantier si nécessaire

---

### 4.2 Chantier → Planning

**Trigger** : User clique "À planifier" depuis chantier signé

**Automatismes** :
1. Récupérer chantier + devis lié
2. Proposer création intervention (titre, dates, intervenant)
3. Créer row `planning_interventions` avec :
   - `chantier_id` = ID chantier
   - `devis_id` = ID devis d'origine
   - `client_id` = ID client
   - `intervenant_id` = sélectionné par user
   - `statut = 'planifie'`
4. Logger event

**Service** : `lib/services/planning-automatisms.ts`
- `createPlanningFromChantier()` - crée intervention
- `getChantiersToPlan()` - récupère chantiers en attente

---

### 4.3 Planning → Termination & Validation

**Trigger** : User marque intervention comme "terminée"

**Automatismes** :
1. Récupérer intervention
2. Logger heures réelles optionnelles (heure_reelle_debut, fin)
3. Marquer `planning.statut = 'termine'`
4. Enregistrer `validation_intervenant_date = NOW()`
5. Logger event
6. **Ne pas créer facture automatiquement** (user le fait explicitement)

---

### 4.4 Chantier Livré → Facture

**Trigger** : User passe chantier à `statut = 'livre'`

**Automatismes** :
1. Proposer création facture (suggérer type standard/acompte/situation)
2. User clique "Créer facture"
3. Récupérer devis lié au chantier
4. Insérer facture avec :
   - `devis_id` = ID devis
   - `chantier_id` = ID chantier
   - `client_id` = ID client
   - Copier montants depuis devis
5. Copier lignes devis → facture (insérer `devis_ligne_id` dans facture_lignes)
6. Mettre à jour `devis.statut = 'facture'`
7. Logger event

**Service** : `devis-automatisms.ts`
- `createFactureFromDevis()` - crée facture + copie lignes

---

### 4.5 Facture Payée → Chantier Récap

**Trigger** : User enregistre paiement (facture → payee)

**Automatismes** :
1. Mettre à jour `facture.statut = 'payee'`
2. Récupérer somme paiements pour facture
3. Mettre à jour `chantier.montant_encaisse` (somme de tous les paiements lié)
4. Logger event

**Service** : `module-orchestrator.ts`
- `updateChantierPayment()` - recalcule encaissements

---

## 5. TABLE module_events (Audit + Orchestration)

```sql
CREATE TABLE module_events (
  id UUID PRIMARY KEY,
  user_id UUID,
  entity_type TEXT, -- 'devis' | 'chantier' | 'planning' | 'facture'
  entity_id UUID,
  old_statut TEXT,
  new_statut TEXT,
  action_type TEXT, -- 'status_change' | 'created' | 'deleted'
  triggered_by TEXT, -- 'user' | 'system'
  payload JSONB, -- données contextuelles
  created_at TIMESTAMPTZ
)
```

**Usages** :
1. **Audit** : Voir historique complet de chaque entité
2. **Automations** : Système de monitoring peut écouter les events (future : webhooks)
3. **Analytics** : Tracer le parcours complet artisan → chantier → facture → paiement

---

## 6. ORCHESTRATEUR GLOBAL

**Fichier** : `lib/services/module-orchestrator.ts`

**Point d'entrée unique** : `handleStatusChange(request)`

Dispatch automatique selon (entity_type, new_statut) :

```typescript
await handleStatusChange({
  entity_type: 'devis',
  entity_id: devis.id,
  new_statut: 'signe',
  user_id: user.id,
  triggered_by: 'user'
})
```

Gère tout le reste en background (créations, mises à jour, logs).

---

## 7. ORDRE IMPLÉMENTATION (Priorité)

### Phase 1 - CRITIQUE (Semaine 1)
- [ ] Migrations SQL
- [ ] Ajouter `deleted_at` sur devis/factures + soft delete dans hooks
- [ ] Service `devis-automatisms.ts` complet
- [ ] Composant UI pour "Créer chantier" après devis signé
- [ ] Test manuel : devis → chantier

### Phase 2 - IMPORTANT (Semaine 2)
- [ ] Service `planning-automatisms.ts`
- [ ] Composant "À planifier" avec création interventions
- [ ] Liaison planning → devis dans détail chantier
- [ ] Test : chantier → interventions

### Phase 3 - FACTURATION (Semaine 3)
- [ ] Service `createFactureFromDevis()` (copie lignes)
- [ ] Proposer création facture après "chantier livré"
- [ ] Mettre à jour `devis.statut = 'facture'`
- [ ] Test : chantier livré → facture avec lignes

### Phase 4 - PAIEMENTS & AUDIT (Semaine 4)
- [ ] Table `module_events` + logging systématique
- [ ] Mise à jour `chantier.montant_encaisse` après paiement
- [ ] Orchestrateur global `handleStatusChange()`
- [ ] Dashboard audit/historique

### Phase 5 - OPTIMISATIONS (Future)
- [ ] Webhooks pour notifications temps réel
- [ ] Automations avancées (relances auto, factures situations)
- [ ] Analytics sur cycle de vie chantier

---

## 8. POINTS CLÉ À RETENIR

1. **Soft delete** : Corbeille possible pour devis + factures
2. **Traçabilité** : Chaque entité sait d'où elle vient (devis_original_id, devis_ligne_id)
3. **Relation N-N** : Un chantier peut avoir plusieurs devis (acompte + situation + final)
4. **Intervention = linking pin** : Relie chantier + devis + intervenant + dates
5. **module_events** : Source de vérité pour automations futures + audit complet
6. **Pas de suppression en cascade** : Tout passe par soft delete ou archivage
7. **user_id** : Toujours présent pour RLS + multi-user

---

## 9. SERVICES À UTILISER DANS COMPOSANTS

### DevisDetail.tsx
```typescript
import { handleStatusChange } from '@/lib/services/module-orchestrator'
import { createChantierFromDevis } from '@/lib/services/devis-automatisms'

// Quand user accepte devis
const onAcceptDevis = async () => {
  const result = await handleStatusChange({
    entity_type: 'devis',
    entity_id: devis.id,
    new_statut: 'signe',
    user_id: user.id
  })
  if (result.details.status === 'awaiting_user_action') {
    // Proposer création chantier
    showModal('CreateChantierModal')
  }
}
```

### ChantierDetail.tsx
```typescript
import { suggestCreatePlanning } from '@/lib/services/module-orchestrator'

// Bouton "À planifier"
const onPlanChantier = async () => {
  const intervention = await suggestCreatePlanning(chantier.id, {
    titre: 'Intervention 1',
    date_debut: '2026-04-15'
  })
  // Refresh planning
}
```

### ChantierLivre.tsx
```typescript
import { suggestCreateFacture } from '@/lib/services/module-orchestrator'

// Bouton "Créer facture"
const onCreateFacture = async () => {
  const facture = await suggestCreateFacture(devis.id, 'standard')
  navigate(`/factures/${facture.id}`)
}
```

---

## Fichiers de configuration

- SQL migrations : `lib/supabase/migrations.sql`
- Services orchestration : `lib/services/module-orchestrator.ts`
- Services devis : `lib/services/devis-automatisms.ts`
- Services planning : `lib/services/planning-automatisms.ts`
- Hooks existants : `lib/hooks.tsx` (mise à jour nécessaire pour soft delete)

---

**Remarque finale** : L'enjeu n'est PAS la complexité du code, mais la **clarté du flux** artisan et l'**absence d'actions oubliées**. Chaque page doit proposer l'action suivante logique.
