# ARTIDOC — CORRECTIONS CRITIQUES URGENTES
# Lis ce fichier en entier avant de toucher quoi que ce soit

---

## PRIORITÉ 1 — CRITIQUE SÉCURITÉ : ISOLATION DES DONNÉES

### Le problème
Chaque utilisateur connecté voit les données de TOUS les autres utilisateurs.
C'est une faille de sécurité majeure. Un artisan ne doit JAMAIS voir
les devis, factures, clients ou chantiers d'un autre artisan.

### Cause probable
Les données de démonstration ont été insérées en base sans
être liées à un user_id spécifique.
Les requêtes Supabase ne filtrent pas par user_id ou entreprise_id.

### Ce qu'il faut faire

ÉTAPE 1 — Supprimer toutes les données de démonstration
Dans Supabase, vider toutes les tables qui contiennent des données fictives :
- devis et devis_lignes
- factures
- chantiers
- clients
- fournisseurs
- prestations/bibliotheque
- intervenants/equipe
- achats

Garder uniquement la structure des tables (colonnes, contraintes).

ÉTAPE 2 — Vérifier que chaque table a une colonne user_id ou entreprise_id
Chaque table de données doit avoir :
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
  OU
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE

Si cette colonne manque → l'ajouter.

ÉTAPE 3 — Activer Row Level Security (RLS) sur Supabase
Pour CHAQUE table de données, activer RLS et créer ces policies :

-- Exemple pour la table "devis" :
ALTER TABLE devis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see only their own devis"
ON devis FOR ALL
USING (auth.uid() = user_id);

-- Même chose pour : factures, chantiers, clients,
-- fournisseurs, prestations, intervenants, achats,
-- planning_interventions, documents

ÉTAPE 4 — Corriger toutes les requêtes dans le code
Dans tous les fichiers qui font des requêtes Supabase :

AVANT (incorrect) :
const { data } = await supabase.from('devis').select('*')

APRÈS (correct) :
const { data: { user } } = await supabase.auth.getUser()
const { data } = await supabase
  .from('devis')
  .select('*')
  .eq('user_id', user.id)

Ou si RLS est bien configuré, la simple requête suffit car
Supabase filtre automatiquement via RLS :
const { data } = await supabase.from('devis').select('*')
// RLS garantit que seules les données du user connecté remontent

ÉTAPE 5 — Tester l'isolation
Créer deux comptes de test différents.
Vérifier que le compte A ne voit pas les données du compte B.
Vérifier qu'un nouveau compte commence avec 0 devis, 0 facture, 0 client.

ÉTAPE 6 — Dashboard vide pour un nouveau compte
Quand un artisan crée son compte et arrive sur le dashboard,
il doit voir :

Tableau de bord VIDE mais accueillant :
- Message de bienvenue : "Bienvenue sur Artidoc, [Prénom] !"
- Sous-titre : "Votre espace de travail est prêt. Commencez par créer votre premier devis."
- 3 boutons d'action rapide :
  [+ Créer mon premier devis]
  [+ Ajouter un client]
  [Configurer mon profil entreprise]
- Les métriques affichent 0 partout (pas de données fictives)
- Le planning est vide avec message "Aucune intervention planifiée"

---

## PRIORITÉ 2 — LOGO ARTIDOC

Le logo Artidoc est dans le fichier : Logo_Artidoc.png
(artisan avec clé + grand A + documents, fond bleu ciel arrondi)

### Où intégrer le logo

1. PAGE D'ACCUEIL (/) — Section Hero
Remplacer le texte "Artidoc" dans le header par :
Logo PNG 48px de hauteur + texte "Artidoc" en Syne 800 à côté

Dans la section hero, ajouter le logo en plus grand (80px) au dessus du H1.

2. PAGE LOGIN (/login)
Logo centré en haut de la carte de connexion
Taille : 96px de hauteur
Avec texte "Artidoc" en dessous en Syne 800 24px navy

3. PAGE REGISTER (/register)
Même chose que login

4. SIDEBAR du dashboard
Logo 40px + texte "Artidoc" en Syne 700 blanc, en haut de la sidebar

5. PAGE PARAMÈTRES — Section profil entreprise
Section "Logo de votre entreprise" avec aperçu + bouton upload

### Comment intégrer le fichier logo
Copier Logo_Artidoc.png dans public/images/logo-artidoc.png
L'utiliser avec <Image src="/images/logo-artidoc.png" ... />

Pour la sidebar (fond navy sombre) :
Utiliser le logo avec un fond transparent si possible
Ou appliquer un style : filter: brightness(0) invert(1) pour version blanche
Ou garder le logo tel quel avec son fond bleu ciel (il contraste bien sur navy)

---

## PRIORITÉ 3 — PAGE D'ACCUEIL VIDE (ONBOARDING)

Quand un nouvel artisan crée son compte et arrive sur /dashboard
pour la première fois (0 données) :

Afficher un état vide MOTIVANT, pas un dashboard vide et triste.

Composant EmptyDashboard :

┌─────────────────────────────────────────────────────┐
│  [Logo Artidoc grand]                               │
│                                                     │
│  Bienvenue sur Artidoc, [Prénom] !                  │
│  Votre espace professionnel est prêt.               │
│                                                     │
│  Pour commencer, que voulez-vous faire ?            │
│                                                     │
│  ┌──────────────────┐  ┌──────────────────┐        │
│  │ 📄 Créer mon     │  │ 👤 Ajouter un    │        │
│  │    premier devis │  │    client        │        │
│  └──────────────────┘  └──────────────────┘        │
│                                                     │
│  ┌──────────────────┐  ┌──────────────────┐        │
│  │ ⬇  Importer mes  │  │ ⚙  Configurer    │        │
│  │    données Obat  │  │    mon profil    │        │
│  └──────────────────┘  └──────────────────┘        │
│                                                     │
│  Ou découvrir Artidoc avec des données de démo →    │
└─────────────────────────────────────────────────────┘

---

## ORDRE D'EXÉCUTION

1. URGENT : Vider toutes les données de démo en base Supabase
2. URGENT : Activer RLS sur toutes les tables avec les bonnes policies
3. URGENT : Vérifier que toutes les requêtes filtrent par user_id
4. Ajouter le logo dans public/images/logo-artidoc.png
5. Intégrer le logo dans : header, login, register, sidebar
6. Créer le composant EmptyDashboard pour les nouveaux comptes
7. Tester avec 2 comptes différents que les données sont bien isolées
8. npm run build
9. vercel --prod

---

## TEST FINAL OBLIGATOIRE

Avant de déployer, vérifier ces 3 points :
☐ Créer compte A → ajouter un devis → se déconnecter
☐ Créer compte B → vérifier qu'on ne voit PAS le devis du compte A
☐ Nouveau compte → dashboard vide avec message de bienvenue
