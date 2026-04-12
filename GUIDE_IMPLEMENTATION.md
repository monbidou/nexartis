# Guide Implémentation Étape par Étape

**Pour Jérem** : Sans code, juste les instructions concrètes.

---

## PHASE 1 : Migrations Database (30 min)

### Étape 1 : Exécuter migrations SQL
1. Ouvrir Supabase → SQL Editor
2. Copier/coller tout le fichier `lib/supabase/migrations.sql`
3. Cliquer "RUN"
4. Vérifier pas d'erreur rouge
5. Fermer

**Résultat** : Votre DB a maintenant toutes les colonnes manquantes.

---

## PHASE 2 : Soft Delete dans Hooks (15 min)

### Étape 2 : Mettre à jour le hook `useDevis()`

**Fichier** : `lib/hooks.tsx` ligne 273

**Avant** :
```typescript
function useDevis() { return useSupabaseQuery<Row>('devis', { orderBy: 'created_at' }) }
```

**Après** :
```typescript
function useDevis() { 
  return useSupabaseQuery<Row>('devis', { orderBy: 'created_at', includeDeleted: false })
}
```

(Même chose pour `useFactures()`)

### Étape 3 : Vérifier le système de corbeille

Le hook `useSupabaseQuery()` (ligne 18) a déjà la logique pour filtrer `deleted_at`.
→ **Rien à ajouter**, c'est déjà bon.

---

## PHASE 3 : Composant "Accepter Devis" (45 min)

### Étape 4 : Créer dialog "Créer chantier depuis devis"

**Fichier à créer** : `components/modals/CreateChantierModal.tsx`

```typescript
'use client'
import { useState } from 'react'
import { createChantierFromDevis } from '@/lib/services/devis-automatisms'
import { useRouter } from 'next/navigation'

interface Props {
  devis_id: string
  devis_numero: string
  client_nom: string
  open: boolean
  onClose: () => void
}

export function CreateChantierModal({ devis_id, devis_numero, client_nom, open, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    setLoading(true)
    try {
      const chantier = await createChantierFromDevis(devis_id)
      alert(`✓ Chantier créé : ${chantier.titre}`)
      onClose()
      router.refresh()
    } catch (err) {
      alert(`✗ Erreur : ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md">
        <h2 className="text-lg font-bold mb-4">Créer un chantier</h2>
        <p className="text-sm mb-6 text-gray-600">
          Devis <strong>D{devis_numero}</strong> accepté.<br/>
          Créer un chantier pour <strong>{client_nom}</strong> ?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Création...' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Étape 5 : Ajouter bouton "Accepter" dans DevisDetail

**Fichier** : trouvez `pages/devis/[id]/page.tsx` ou `DevisDetail.tsx`

Cherchez le bouton "Accepter devis" ou "Signer".

**Ajouter après le bouton** :

```typescript
const [showCreateChantier, setShowCreateChantier] = useState(false)

const handleAccept = async () => {
  try {
    // Mettre à jour devis statut
    await updateRow('devis', devis.id, { statut: 'signe' })
    
    // Proposer créer chantier
    setShowCreateChantier(true)
  } catch (err) {
    alert('Erreur : ' + err.message)
  }
}

return (
  <>
    {/* ... contenu devis ... */}
    <button onClick={handleAccept} className="...">
      ✓ Accepter le devis
    </button>

    <CreateChantierModal
      devis_id={devis.id}
      devis_numero={devis.numero}
      client_nom={devis.clients?.nom || '?'}
      open={showCreateChantier}
      onClose={() => setShowCreateChantier(false)}
    />
  </>
)
```

---

## PHASE 4 : Onglet "À Planifier" (1h)

### Étape 6 : Créer composant "Chantiers à planifier"

**Fichier à créer** : `components/PlanningQueue.tsx`

```typescript
'use client'
import { useEffect, useState } from 'react'
import { getChantierPlanningQueue } from '@/lib/services/module-orchestrator'
import { useUser } from '@/lib/hooks'
import { CreatePlanningModal } from './modals/CreatePlanningModal'

export function PlanningQueue() {
  const { user } = useUser()
  const [chantiers, setChantiers] = useState([])
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    async function load() {
      const data = await getChantierPlanningQueue(user.id)
      setChantiers(data)
    }
    load()
  }, [user?.id])

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">À planifier</h2>
      
      {chantiers.length === 0 ? (
        <p className="text-gray-500">Aucun chantier en attente</p>
      ) : (
        <div className="grid gap-4">
          {chantiers.map(c => (
            <div key={c.id} className="border p-4 rounded-lg hover:shadow-lg transition">
              <h3 className="font-bold">{c.titre}</h3>
              <p className="text-sm text-gray-600">{c.client?.nom}</p>
              <button
                onClick={() => {
                  setSelected(c)
                  setShowModal(true)
                }}
                className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Planifier interventions
              </button>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <CreatePlanningModal
          chantier={selected}
          open={showModal}
          onClose={() => {
            setShowModal(false)
            // Refresh queue
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
```

### Étape 7 : Créer modal "Créer intervention"

**Fichier à créer** : `components/modals/CreatePlanningModal.tsx`

```typescript
'use client'
import { useState } from 'react'
import { createPlanningFromChantier } from '@/lib/services/planning-automatisms'
import { useIntervenants } from '@/lib/hooks'

export function CreatePlanningModal({ chantier, open, onClose }) {
  const { data: intervenants } = useIntervenants()
  const [titre, setTitre] = useState('')
  const [date, setDate] = useState('')
  const [intervenant_id, setIntervenantId] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!titre || !date) {
      alert('Remplissez titre et date')
      return
    }
    setLoading(true)
    try {
      await createPlanningFromChantier(chantier.id, {
        titre,
        date_debut: date,
        intervenant_id: intervenant_id || undefined
      })
      alert('✓ Intervention créée')
      onClose()
    } catch (err) {
      alert('✗ ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-lg font-bold mb-4">Créer intervention</h2>
        <p className="text-sm text-gray-600 mb-4">Chantier : <strong>{chantier.titre}</strong></p>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Titre (ex: Pose fenêtres)"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />

          <select
            value={intervenant_id}
            onChange={(e) => setIntervenantId(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">-- Sélectionner intervenant (optionnel) --</option>
            {intervenants?.map(i => (
              <option key={i.id} value={i.id}>
                {i.prenom} {i.nom}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Création...' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Étape 8 : Ajouter "À planifier" dans menu principal

**Fichier** : Votre layout/sidebar

Ajouter lien vers `/planning-queue`

---

## PHASE 5 : Création Facture depuis Devis (45 min)

### Étape 9 : Ajouter bouton dans ChantierDetail

**Fichier** : `pages/chantiers/[id]/page.tsx` ou `ChantierDetail.tsx`

Quand `chantier.statut === 'livre'`, ajouter bouton :

```typescript
const handleCreateFacture = async () => {
  const confirmed = window.confirm('Créer une facture pour ce chantier ?')
  if (!confirmed) return

  try {
    const facture = await suggestCreateFacture(devis.id, 'standard')
    alert(`✓ Facture créée : F${facture.numero}`)
    router.push(`/factures/${facture.id}`)
  } catch (err) {
    alert(`✗ ${err.message}`)
  }
}

return (
  <>
    {/* ... affichage chantier ... */}
    {chantier.statut === 'livre' && (
      <button onClick={handleCreateFacture} className="...">
        📄 Créer facture
      </button>
    )}
  </>
)
```

**Import nécessaire** :
```typescript
import { suggestCreateFacture } from '@/lib/services/module-orchestrator'
```

---

## PHASE 6 : Tests Complets (30 min)

### Étape 10 : Test E2E manuel

**Scénario test** :

1. **Créer devis** 
   - Aller `/devis`
   - Créer devis "Installation électrique" client "Jean Martin"
   - Ajouter 2 lignes
   - Sauver (statut = brouillon)

2. **Accepter devis** 
   - Ouvrir le devis
   - Cliquer "Accepter"
   - Modal "Créer chantier" doit s'afficher
   - Cliquer "Créer"
   - **Vérifier** : Chantier créé, devis.chantier_id renseigné

3. **Planifier intervention**
   - Aller `/planning-queue`
   - Devis doit être dans "À planifier"
   - Cliquer "Planifier interventions"
   - Créer intervention avec date + intervenant
   - **Vérifier** : Intervention apparaît dans planning

4. **Créer facture**
   - Ouvrir chantier
   - Passer statut à "livre" (bouton/select)
   - Bouton "Créer facture" apparaît
   - Cliquer
   - **Vérifier** : Facture créée avec mêmes lignes que devis

5. **Vérifier tracabilité**
   - Dans la facture, voir `devis_id` renseigné
   - Dans les lignes facture, voir `devis_ligne_id` renseigné
   - ✓ Traçabilité OK

---

## PHASE 7 : Intégrations Futures (à faire après)

### Table module_events
- Créer page d'audit : voir historique complet d'un chantier
- Outil recherche : "Montrer moi tous les devis signés le mois dernier"

### Automations
- Quand facture payée → mettre à jour chantier.montant_encaisse
- Relances auto si facture pas payée après 30 jours

---

## Checklist Finale

- [ ] Migrations SQL exécutées ✓
- [ ] Hooks mis à jour pour soft delete ✓
- [ ] Modal CreateChantierModal créée ✓
- [ ] Bouton "Accepter" dans DevisDetail ✓
- [ ] Composant PlanningQueue créé ✓
- [ ] Modal CreatePlanningModal créée ✓
- [ ] Menu "À planifier" ajouté ✓
- [ ] Bouton "Créer facture" dans ChantierDetail ✓
- [ ] Test E2E : devis → chantier → planning → facture ✓

---

## En cas de blocage

**Q: Erreur "Cannot read property devis_original_id"**
A: Migrations SQL pas exécutées. Allez Supabase → SQL, relancez migrations.sql

**Q: Bouton "Accepter" ne propose pas modal**
A: Vérifiez import de CreateChantierModal, vérifiez state `showCreateChantier`

**Q: Planning vide après création**
A: Vérifiez `chantier.statut = 'signe'`, vérifiez que devis.chantier_id est bien renseigné

**Q: Facture ne copie pas les lignes**
A: Vérifiez que devis_lignes existent (Select * from devis_lignes where devis_id = '...')

---

**Démarrage recommandé** : lundi matin, PHASE 1 + PHASE 2 (test rapide), puis PHASE 3 (UI devis → chantier).
