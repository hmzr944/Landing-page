# Serveur du tuteur Pousse (Supabase)

Le site reste statique sur GitHub Pages et marche sans compte. Supabase sert au tuteur et à la génération de contenu
(points clés d'un PDF, rédaction d'un cours) ; aucune clé d'IA n'est jamais dans le navigateur (voir `docs/architecture.md`, D3) :
connexion par e-mail, quota mensuel, appel au modèle avec la clé gardée côté serveur, mesure de l'usage.
Le modèle est open source et gratuit : `openai/gpt-oss-120b` (github.com/openai/gpt-oss, Apache 2.0), avec
`llama-3.3-70b-versatile` (Meta) en secours, servis par l'offre gratuite de Groq. Toute API compatible OpenAI convient.
Aucun cours ni aucune réponse n'est stocké sur le serveur : seulement des compteurs (appels, jetons, coût).

Projet : `https://nnqtgwgwalbbhqzceged.supabase.co` (adresse et clé publiable dans `js/tutor.js`, publiques par conception).

## Mise en place (une fois, dans le tableau de bord Supabase)

1. **Base de données** : *SQL Editor* → nouvelle requête → coller `migrations/001_tutor.sql` → *Run*, puis de même `migrations/002_generation.sql`
   et `migrations/003_organizations.sql` (espace Business : organisations, rôles, invitations, sources versionnées,
   connaissances traçables, compétences, preuves en ajout seul, journal d'audit, stockage privé « org-sources »).
   Crée `ai_usage` et `ai_calls` (RLS activé : chacun ne lit que ses lignes, personne n'écrit depuis le navigateur)
   et la fonction `ai_record_call`, réservée au serveur.
2. **Connexion par e-mail** : *Authentication* → *URL Configuration*
   - *Site URL* : `https://hmzr944.github.io/Landing-page/`
   - *Redirect URLs* : ajouter `https://hmzr944.github.io/Landing-page/`
   - Facultatif : *Authentication* → *Email Templates* → *Magic Link*, ajouter `Ton code : {{ .Token }}` pour pouvoir se connecter avec le code à 6 chiffres (utile quand le lien s'ouvre dans un autre navigateur).
3. **Fonction** : *Edge Functions* → *Deploy a new function* → *Via Editor*, nom **`tutor`**, puis créer les trois fichiers
   `index.ts`, `handler.ts`, `generate.ts` et `model.ts` avec le contenu de `functions/tutor/` (le fichier de test n'est pas à déployer).
   Laisser *Verify JWT* activé.
   Avec la ligne de commande, c'est équivalent : `supabase functions deploy tutor --project-ref nnqtgwgwalbbhqzceged`.
4. **Secrets** : *Edge Functions* → *Secrets*
   - `AI_API_KEY` : ta clé Groq (gratuite, sans carte bancaire : console.groq.com → *API Keys*). À saisir toi-même ici, jamais ailleurs.
   - Facultatifs : `AI_MODEL` (par défaut `openai/gpt-oss-120b`), `AI_FALLBACK_MODEL` (par défaut `llama-3.3-70b-versatile`),
     `AI_BASE_URL` (par défaut `https://api.groq.com/openai/v1` ; OpenRouter, Cerebras, Ollama ou vLLM marchent aussi),
     `TUTOR_MONTHLY_LIMIT` (dialogue, 60 par défaut), `GEN_MONTHLY_LIMIT` (génération, 150 par défaut),
     `TUTOR_ORIGINS` (par défaut `https://hmzr944.github.io`).

Pour coller la fonction en une fois dans l'éditeur du tableau de bord, `index.ts`, `handler.ts` et `model.ts`
peuvent être assemblés en un seul fichier (imports relatifs retirés).

## Coût

Zéro avec l'offre gratuite de Groq. Ses limites s'appliquent au compte entier (pas par élève) : de l'ordre de
1 000 requêtes et 200 000 jetons par jour pour gpt-oss-120b (à vérifier sur console.groq.com/settings/limits).
Un échange consomme environ 2 000 à 3 500 jetons : compter une soixantaine d'échanges par jour au total.
Quand le modèle principal est saturé (429), la fonction bascule seule sur le modèle de secours.
Si un jour tu passes à une offre payante, `AI_PRICE_INPUT` et `AI_PRICE_OUTPUT` (dollars par million de jetons)
font apparaître le coût réel dans `ai_calls`.

## Tests

Base de données (règles d'accès et cloisonnement, sur un PostgreSQL local avec un bouchon des fonctions Supabase) :

```
node tests/db-rls.js
```
54 vérifications : chaque organisation ne voit que ses données, invitations liées à l'adresse e-mail et à usage unique,
connaissances proposées invisibles des collaborateurs, information sensible validée par admin ou manager seulement,
preuves écrites par le serveur uniquement et jamais modifiées, personne membre de deux organisations sans fuite entre elles.
Non couvert localement : les règles du module Storage (fichiers), à vérifier sur le vrai projet.

Fonction serveur :

```
deno test --allow-net --allow-env --allow-read supabase/functions/tutor/
```
19 tests : génération ancrée sur le texte source (inventions écartées), quotas séparés, citations inventées retirées, connexion exigée, quota vérifié avant l'appel, refus et pannes,
CORS, bornes des entrées, schéma JSON strict, bascule sur le modèle de secours (faux serveur compatible OpenAI local).
Côté site, `node tests/tutor.js` déroule le scénario complet avec un Supabase simulé.
