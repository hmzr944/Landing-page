# Serveur du tuteur Pousse (Supabase)

Le site reste statique sur GitHub Pages et marche sans compte. Supabase ne sert qu'au tuteur :
connexion par e-mail, quota mensuel, appel au modèle avec la clé gardée côté serveur, mesure du coût.
Aucun cours ni aucune réponse n'est stocké sur le serveur : seulement des compteurs (appels, jetons, coût).

Projet : `https://nnqtgwgwalbbhqzceged.supabase.co` (adresse et clé publiable dans `js/tutor.js`, publiques par conception).

## Mise en place (une fois, dans le tableau de bord Supabase)

1. **Base de données** : *SQL Editor* → nouvelle requête → coller `migrations/001_tutor.sql` → *Run*.
   Crée `ai_usage` et `ai_calls` (RLS activé : chacun ne lit que ses lignes, personne n'écrit depuis le navigateur)
   et la fonction `ai_record_call`, réservée au serveur.
2. **Connexion par e-mail** : *Authentication* → *URL Configuration*
   - *Site URL* : `https://hmzr944.github.io/Landing-page/`
   - *Redirect URLs* : ajouter `https://hmzr944.github.io/Landing-page/`
   - Facultatif : *Authentication* → *Email Templates* → *Magic Link*, ajouter `Ton code : {{ .Token }}` pour pouvoir se connecter avec le code à 6 chiffres (utile quand le lien s'ouvre dans un autre navigateur).
3. **Fonction** : *Edge Functions* → *Deploy a new function* → *Via Editor*, nom **`tutor`**, puis créer les trois fichiers
   `index.ts`, `handler.ts` et `model.ts` avec le contenu de `functions/tutor/` (le fichier de test n'est pas à déployer).
   Laisser *Verify JWT* activé.
   Avec la ligne de commande, c'est équivalent : `supabase functions deploy tutor --project-ref nnqtgwgwalbbhqzceged`.
4. **Secrets** : *Edge Functions* → *Secrets*
   - `ANTHROPIC_API_KEY` : ta clé de l'API Claude (console.anthropic.com). À saisir toi-même ici, jamais ailleurs.
   - `TUTOR_MONTHLY_LIMIT` : échanges par utilisateur et par mois (60 par défaut).
   - `TUTOR_ORIGINS` : facultatif, par défaut `https://hmzr944.github.io`.

## Coût

Modèle `claude-opus-5-5` (4 $ par million de jetons en entrée, 20 $ en sortie). Un échange de dialogue envoie
la notion, ses passages et l'historique récent : de l'ordre de 1 500 à 3 000 jetons en entrée et 300 à 600 en sortie,
soit environ 1 à 2,4 centimes. Le coût réel de chaque appel est enregistré dans `ai_calls` ; à consulter avant de fixer les quotas.
En cas de refus de sécurité, l'API rebascule automatiquement sur un autre modèle (`fallbacks: "default"`).

## Tests

```
deno test --allow-net --allow-env --allow-read supabase/functions/tutor/
```
11 tests : citations inventées retirées, connexion exigée, quota vérifié avant l'appel, refus et pannes,
CORS, bornes des entrées, et forme exacte de la requête envoyée par le vrai SDK (faux serveur Anthropic local).
Côté site, `node tests/tutor.js` déroule le scénario complet avec un Supabase simulé.
