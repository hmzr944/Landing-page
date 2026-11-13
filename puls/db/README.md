# Base de données et serveur PULS (Supabase)

Projet : `https://wqqxthpcqczmwigokhus.supabase.co` (dédié à PULS, distinct du projet d'Arbor).
L'adresse et la clé *publishable* figurent dans `puls/config.js` : elles sont publiques par conception.
**Ne jamais** mettre la clé serveur (*secret* / *service_role*) ni la clé OpenAI dans un fichier du dépôt.

## 1. Installer la base (une fois)

**Le plus simple** : le fichier `setup.sql` regroupe les trois migrations. Tableau de bord Supabase, puis **SQL Editor**,
puis **New query** : coller tout le contenu de `setup.sql`, puis **Run**. Message attendu : « Success. No rows returned ».
À n'exécuter qu'une fois : une seconde exécution échoue (« type already exists ») sans rien abîmer.

Détail des migrations regroupées, dans l'ordre :

1. `migrations/001_configuration_engine.sql` : entreprises, rôles, organisation, catalogue, établissements, transporteurs, stocks, politiques versionnées, dossiers, actions, journal d'audit, RLS.
2. `migrations/002_onboarding.sql` : création d'entreprise, gestion des membres, configuration de démonstration.
3. `migrations/003_ai_calls.sql` : journal des appels d'IA (métadonnées seulement).

Vérification : la page de connexion du site, puis « Créer un compte », puis l'écran « Créer votre entreprise ».

## 2. Authentification

**Authentication**, puis **URL Configuration** :
- *Site URL* : l'adresse publique du site, par exemple `https://hmzr944.github.io/Landing-page/puls/connexion.html`.
- *Redirect URLs* : la même adresse, et pour le développement `http://localhost:8765/connexion.html`.

Sans ces réglages, le lien de confirmation reçu par e-mail renvoie vers `localhost:3000`.
Les e-mails de confirmation passent par le service d'envoi intégré de Supabase, limité en volume : pour un pilote réel,
configurer un SMTP (**Authentication**, puis **SMTP Settings**).

## 3. Fonction serveur « ai » (OpenAI)

```bash
cd puls
supabase functions deploy ai --project-ref wqqxthpcqczmwigokhus
supabase secrets set --project-ref wqqxthpcqczmwigokhus \
  OPENAI_API_KEY=... AI_MODEL=... PULS_ORIGINS=https://hmzr944.github.io
```

- `AI_MODEL` est obligatoire : la fonction ne devine aucun modèle et répond « service non configuré » sans lui.
- `AI_PROVIDER` (facultatif, `openai` par défaut) : changer de fournisseur se fait dans `supabase/functions/_shared/ai/registry.ts`, sans toucher au reste.
- `AI_MONTHLY_LIMIT` (facultatif, 2000) : appels par entreprise et par mois.

## 4. Tests

```bash
puls/db/test/run.sh     # PostgreSQL local : migrations sur base jetable, 60 tests d'isolation et de permissions
npm run test:ai         # (depuis puls/) fonction IA avec fournisseur simulé, 9 tests
```

Les tests SQL simulent la couche d'authentification de Supabase (`db/test/supabase_stub.sql`).
