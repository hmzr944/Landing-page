# Arbor : transformation globale, rapport final (11 novembre 2026)

De plateforme d'apprentissage à système d'intelligence pédagogique. Ce rapport couvre les phases G0 à G5 ;
l'architecture détaillée est dans `docs/engines.md` (D11) et `docs/architecture.md`.

## 1. Architecture actualisée

Un noyau, deux contextes. Student garde ses données sur l'appareil ; Business vit dans Supabase, cloisonné par
organisation (RLS, clés composites `(id, org_id)`). Les cinq moteurs :

| Moteur | Où | Ce qu'il fait |
|---|---|---|
| Connaissances | `knowledge_nodes`, `knowledge_edges` (008), graphe local Student | Provenance (version, page, extrait vérifié), relations proposées par le serveur et validées par un humain |
| Preuves | `evidence_events` (+ `level`, `reliability`, `context`, `scenario_version_id`), `js/evidence.js` | 7 niveaux, 5 résultats distincts (juste, partiel, faux, insuffisant, non documenté), ajout seul |
| Scénarios | `scenarios`, `scenario_versions` (008), `engines.ts`, `org.ts` | Conçus à partir des connaissances validées, relus et publiés par un manager, versionnés ; évaluateur séparé, événements par tour, grille de comportements |
| Adaptatif | `js/adaptive.js` (partagé) | Prochaine action classée, chacune avec sa raison |
| Évolution (Live Policy Watchdog) | `policy_changes`, `policy_change_items`, `compareVersions` | Comparaison serveur de deux versions, décision humaine, impact, revalidation |

Intelligence d'équipe : Blind Spot Radar (`OrgInsight.radar`), Dynamic Onboarding Loop (`OrgInsight.pathway`),
Watchdog. Le cycle complet (apprendre, structurer, vérifier, repérer l'incertitude, proposer, observer, prouver,
actualiser, adapter) est réalisé par ces modules sans moteur dupliqué.

## 2. Rapport technique : décisions

- **Pas de `mastery_states` SQL** : l'état se recalcule à partir des preuves (source unique), par un moteur
  déterministe en JavaScript partagé ; une table dérivée aurait été un second moteur à synchroniser.
- **Vérification des extraits sur le PDF stocké** (point 1) : le serveur télécharge la version depuis `org-sources`,
  extrait le texte avec unpdf (pdf.js sans `canvas`, compatible Deno) et garde un passage seulement si 80 % de ses
  séquences de 4 mots se retrouvent à la page annoncée (± 1). Rien n'est extrait si aucun passage n'est vérifié (422).
- **Comparaison de versions** (point 2) : extrait retrouvé mot pour mot → `inchange` ; sinon le modèle classe
  (`reformule`, `modifie`, `supprime`) et son nouvel extrait doit être retrouvé dans le nouveau texte, sinon
  l'élément reste `modifie` avec la mention « extrait non retrouvé ». Panne du modèle → tout `modifie`, `analysed: false`.
- **Catégories distinctes** (point 3) : `non_documente` n'est jamais une erreur (exclu des états et du radar),
  `insuffisant` donne « à préciser ».
- **Simulations** (point 4) : comportements dédoublonnés par partie, événements injectés au bon tour, preuves avec
  contexte et version du scénario.
- **Diagnostic de repli** (point 5) : sans modèle, questions à trous tirées des extraits validés.
- **Persistance onboarding** (point 6), **erreurs de récupération de mot de passe** (point 7), **invitation par e-mail**
  (point 8, Brevo côté serveur, jeton vérifié par son empreinte, 5 envois max, 10 min d'écart), **RLS** sur toutes les
  nouvelles tables (point 9), **quotas et réseau** (point 10), **export et effacement** (point 11), **chemins de stockage**
  exacts (point 12).

## 3. Inventaire des fonctionnalités livrées

Business : onglet Scénarios (concevoir, relire, tester, publier), scénarios publiés jouables dans Client mystère,
situation et événements dans la conversation, débrief avec réponses trop peu étayées et événements ; panneau
« Changements de cette version » (avant / maintenant, sensible, impact, décision, revalidation) ; relations entre
connaissances ; Mon parcours (compétences du poste, niveau de preuve, plan expliqué, actions demandées, « Fait ») ;
Mes données (export JSON, effacement) ; Radar des angles morts avec activité corrective ; validation au poste ;
envoi de l'invitation par e-mail ; durée de conservation (administrateur).
Student : mode « Mise en situation » avec Pousse ; journal d'observations avec l'activité `situation`.

## 4. Migrations

`supabase/migrations/008_engines.sql` (nouvelle, **pas encore appliquée** sur le projet). Les migrations 001 à 007
sont appliquées (vérifié par sondage). Procédure : guide Supabase pas à pas (artefact), section « Mise à jour du
11 novembre (soir) ».

## 5. Résultats des tests (exécutés le 11 novembre 2026, sur ce dépôt)

Aucun résultat fictif : chaque ligne est la sortie réelle de la suite. Le serveur et la base sont simulés dans les tests
navigateur (contrats identiques), la logique serveur est testée par Deno, les règles d'accès sur un vrai PostgreSQL 16.

| Suite | Type | Vérifications | Résultat |
|---|---|---|---|
| `tests/db-rls.js` | SQL et RLS, plusieurs organisations, accès entre rôles (PostgreSQL 16 local) | 166 | toutes passent |
| `deno test` (`supabase/functions/tutor`) | fonctions Edge (dont lecture réelle d'un PDF par unpdf) | 43 | toutes passent |
| `tests/engines.js` | unitaires (niveaux de preuve, adaptatif, radar, parcours) | 29 | toutes passent |
| `tests/org-engines.js` | parcours Business des moteurs, repli sans 008 | 38 | toutes passent |
| `tests/org-learn.js` | diagnostic, simulation, suivi | 22 | toutes passent |
| `tests/org-docs.js` | import, validation, versions documentaires | 21 | toutes passent |
| `tests/org-insight.js` | états et recommandations | 14 | toutes passent |
| `tests/org-onboarding.js` | assistant Business, invitations | 39 | toutes passent |
| `tests/org.js` | espaces, rôles, cloisonnement personnel / pro | 26 | toutes passent |
| `tests/welcome.js` | authentification, récupération de mot de passe | 77 | toutes passent |
| `tests/onboarding.js` | 5 entrées Student (photo, oral, etc.), persistance | 57 | toutes passent |
| `tests/tutor.js` | dialogue, Enseigne-moi, mise en situation, quotas et réseau | 26 | toutes passent |
| `tests/learning-flow.js`, `foundations.js`, `explore.js` | régression Student | 20 + 14 + 18 | toutes passent |
| `tests/data-safety.js` | sauvegarde, export, persistance locale | 16 | toutes passent |
| `tests/pdf-mixed.js`, `pdf-structure.js` | import PDF | 45 + 14 | passent ; 1 cas NON VÉRIFIÉ (documents personnels absents de l'environnement) |
| `tests/ai-server.js` | génération côté serveur | 11 | passent ; 2 cas NON VÉRIFIÉS (Wikimedia inaccessible depuis l'environnement de test) |
| `tests/responsive.js` | 6 largeurs × 17 écrans | 2 (0 défaut, 0 erreur JS) | passent |
| `tests/motion.js` | animations | 12 | toutes passent |

Total : 710 vérifications passées (en comptant la suite responsive pour 2), 0 échec, 3 cas non vérifiables ici (ressources externes absentes).

### Scénarios obligatoires

| # | Scénario | Où c'est vérifié |
|---|---|---|
| 1 | Un étudiant apprend une notion à partir d'une photo | `tests/onboarding.js` F1-F2 (texte réellement lu par Tesseract.js dans le navigateur, sujet créé) |
| 2 | Un étudiant explique un sujet oralement | `tests/onboarding.js` E2-E9 (dictée, transcription jamais dans le profil, repli sans micro) ; tâche serveur `structurer` (Deno) |
| 3 | Échec puis progrès | `tests/engines.js` D1 (faux puis appliqué : niveau 4, historique conservé), A8 ; `tests/learning-flow.js` |
| 4 | Compétence démontrée dans deux contextes | `tests/engines.js` A5 (niveau 6 « transférée ») ; A4 (même contexte : 5 seulement) |
| 5 | Une entreprise importe une procédure | `tests/org-docs.js` A1-A8 ; Deno `extraire` (extraits vérifiés sur un vrai PDF lu par unpdf) |
| 6 | Un manager valide une connaissance | `tests/org-docs.js` B1-C1 ; `tests/db-rls.js` (sensible réservé admin / manager) |
| 7 | Un collaborateur réalise un diagnostic | `tests/org-learn.js` A1-A7 ; Deno (correction serveur, bonne réponse jamais envoyée avant) |
| 8 | Le collaborateur effectue une simulation | `tests/org-learn.js` C1-C4 ; `tests/org-engines.js` B2-B5 ; Deno (évaluateur séparé, catégories, événements) |
| 9 | Le manager consulte les fragilités collectives | `tests/org-learn.js` D1-D3 ; `tests/org-engines.js` C1-C3 ; `tests/engines.js` E1-E4 |
| 10 | Une procédure change, impacts identifiés | Deno Watchdog (avec et sans modèle) ; `tests/db-rls.js` Y (décision, sensible, impact) ; `tests/org-engines.js` C6-C8 |
| 11 | Une organisation tente d'accéder à une autre | `tests/db-rls.js` (S3, S4, K8, C2, P4 et section Y) |
| 12 | Un manager tente d'accéder aux données Student | Par construction : les données Student restent sur l'appareil (D1), aucune table serveur ne les contient ; `tests/org-learn.js` F1 (aucune donnée personnelle envoyée pendant tout le parcours Business, manager compris) ; `tests/org.js` B3 ; `tests/onboarding.js` E8 (la transcription n'entre jamais dans le profil serveur) |

## 6. Risques restants et ce qui n'est pas vérifié en conditions réelles

- **Migration 008 non appliquée** : tout ce qui en dépend est testé sur PostgreSQL 16 local avec un bouchon des
  fonctions Supabase, pas sur le projet réel. Les écrans se dégradent sans erreur tant qu'elle manque (testé).
- **Fonction `tutor` non redéployée** : la version en ligne n'a ni la vérification sur PDF, ni les moteurs.
- **unpdf en production** : testé dans Deno local sur un vrai PDF ; non testé dans le runtime Supabase Edge
  (limite mémoire possible sur de gros PDF).
- **Groq** : les tests utilisent un faux serveur compatible OpenAI ; la qualité réelle des scénarios, relations et
  comparaisons n'est pas mesurée. Quota gratuit partagé par tout le compte.
- **Brevo** : l'envoi d'invitation est testé avec une fonction d'envoi simulée ; aucun e-mail réel envoyé.
- **Stockage** : la règle « chemin exact d'une version existante » est vérifiée en SQL local ; le module Storage
  réel n'est pas reproduit localement.
- **ai-server** : 2 cas marqués NON VÉRIFIÉ (téléchargement Wikimedia inaccessible depuis l'environnement de test).
- **Statistiques du radar** : seuils fixes (3 observations, 2 personnes) ; sur de petites équipes, prudence affichée.
- **Effacement** : `erase_my_org_data` efface les preuves et simulations de la personne ; le journal d'audit garde la
  trace de l'effacement (sans contenu).

## 7. Documentation développeur

- Architecture et décisions : `docs/architecture.md` (D1 à D11), `docs/engines.md`, `docs/onboarding.md`.
- Serveur : `supabase/functions/tutor/` (`handler.ts` routage et quotas, `org.ts` tâches Business, `engines.ts`
  moteurs, `pdftext.ts` lecture et vérification des PDF, `generate.ts`, `model.ts`) ; fonctions pures avec dépendances
  injectées, testées par `deno test --allow-env --allow-net --allow-read`.
- Client : `js/evidence.js`, `js/adaptive.js` (UMD, testables sous Node), `js/org-insight.js`, `js/org-engines.js`.
- Tests : `node tests/<suite>.js` depuis la racine (Playwright pour les suites navigateur, PostgreSQL 16 pour `db-rls`).

## 8. Guide de déploiement

1. Appliquer `008_engines.sql` (SQL Editor). 2. Redéployer `tutor` (fichier unique fourni par le guide, qui inclut
`engines.ts` et `pdftext.ts`). 3. Facultatif : secrets `BREVO_API_KEY`, `MAIL_FROM`, `SITE_URL`. 4. Facultatif : tâche
Cron quotidienne `select public.purge_expired_transcripts();`. 5. Le site (GitHub Pages) est déjà publié en v43.
Détails : `supabase/README.md` et le guide pas à pas.

## 9. Bilan sécurité et confidentialité

- Aucune clé dans le navigateur (clé publiable seulement) ; clés Groq, Brevo et `service_role` uniquement en secrets serveur.
- RLS sur chaque nouvelle table ; les membres ne lisent ni la fiche complète d'un scénario (`spec`), ni les
  transcriptions ; les relations et changements proposés ne sont visibles que de l'équipe de contenu.
- Preuves en ajout seul (déclencheur) ; effacement RGPD seulement via une fonction dédiée, journalisée.
- Aucune auto-validation : `record_human_validation` refuse de se valider soi-même et exige un manager ou un administrateur.
- Sortie de modèle jamais validée automatiquement ; extrait vérifié contre le document stocké.
- Données Student jamais envoyées à une organisation ; profil serveur sans contenu d'apprentissage.
- Conservation configurable (30 à 3650 jours, 365 par défaut) ; export et effacement par la personne elle-même.
