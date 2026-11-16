# Arbor v51 : parcours, simplicité, compréhension (décision D15)

Mission produit centrée sur l'expérience : montrer la valeur avant de demander de configurer, une action principale
par écran, un vocabulaire Arbor expliqué. Les moteurs (FSRS, preuves, compétences, provenance, RLS) ne changent pas.

## Sources d'inspiration (principes retenus, rien de copié)
- **skills.sh** : `onboarding-ux` (jezweb/claude-skills) et `check-onboarding` (phrazzld/claude-config) ; grille
  utilisée : premier lancement, temps jusqu'à la première valeur, frictions, états vides, aide contextuelle.
- **Parcours « valeur d'abord »** (Twine, Insivia, Chameleon) : entrer dans le produit avec un exemple qui marche,
  configurer ensuite, au moment utile ; préremplir ce qui est déjà connu.
- **Écran de retour d'un apprenant** (ScreensDesign, flux Duolingo et Codecademy sur Lazyweb) : la carte principale
  dépend de l'état de retour (reprendre, réviser, recommencer), un seul bouton principal.
- **Benchmark demandé** : NotebookLM (la ressource est le point de départ), Quizlet (entrée directe), StudyFetch
  (importer une fois), Knowt (richesse sans surcharge), Beedeez et 360Learning (rôles séparés, aide au bon moment).

## 1. Audit : problèmes relevés

| # | Problème | Pourquoi c'est une friction | Impact | Modification | Priorité |
|---|---|---|---|---|---|
| 1 | Créer un espace Business commence par un formulaire (nom, secteur) puis l'import d'un document et la validation de connaissances | Le manager configure avant d'avoir vu ce que fait Arbor | Abandon avant la première valeur | Découverte : une situation, une simulation jouable, un débrief, puis la configuration | P0 |
| 2 | Le Client Mystère exige 3 connaissances validées | Impossible de montrer une simulation à un nouveau client | Valeur repoussée après la configuration complète | Simulation de démonstration sans organisation (serveur, tâches `decouverte_*`) | P0 |
| 3 | Accueil Student : environ dix actions de même poids (Commencer, 2 min, Focus, méthode, plan, trois missions, cinq portes) | Choix à faire avant d'apprendre | Hésitation, mauvaise action | Un état, une action principale ; le reste accessible plus bas | P0 |
| 4 | Le statut « fragile » se déclenche après une seule mauvaise réponse | Une erreur isolée peut prendre toute la place | Accueil anxiogène, faux signal | La difficulté mise en avant exige une confusion ouverte, deux oublis ou une fausse certitude récente | P0 |
| 5 | Les missions répètent l'action du panneau principal (« Reprendre » deux fois) | Deux boutons pour la même chose | Doute sur la différence | Plus de doublon ; deux missions au plus quand une action principale existe | P1 |
| 6 | « À valider / Validée » : le même mot pour une connaissance extraite et une règle confirmée ; rien pour les règles supposées par l'IA | Le manager ne sait pas ce qui est fiable | Risque de prendre une extraction pour une règle | Trois niveaux : confirmée, extraite (à confirmer), suggérée par l'IA (jamais enregistrée) | P0 |
| 7 | Termes Arbor sans explication (Canopée, Cordées, Arbor League, Pousse) | Il faut deviner | Rubriques ignorées | Dico-miroir : nom conservé, explication en infobulle et en sous-titre | P1 |
| 8 | Après la découverte, la mise en route redemande le secteur et ne sait pas ce qui a été choisi | Information demandée deux fois | Rupture de parcours | Contexte transmis : secteur coché, choix ouvert (règle, document) ou étape sautée | P1 |
| 9 | « Tout valider » au cœur de la mise en route | Ressemble à une validation en bloc imposée | Pression pendant l'inscription | « Tout confirmer » facultatif, avec « plus tard depuis la Base de savoir » | P1 |
| 10 | Pas de moyen évident de choisir autre chose que l'action proposée | Sentiment de perdre le contrôle | Frustration | « Choisir autre chose » mène aux cinq portes, toujours au même endroit | P1 |

Constat d'audit sans modification : les écrans de révision, de leçon, de diagnostic et le shell Business (v49) sont
cohérents et n'ont pas été touchés. Les portes Student restent toutes accessibles.

## 2. Parcours avant / après

**Business (manager qui découvre)**
- Avant : Créer une organisation → nom et secteur → importer un document ou écrire une règle → relire et valider des
  cartes → compétences → première expérience. La première simulation arrive après la configuration.
- Après : Créer une organisation → **secteur et une situation** (exemple proposé) → **simulation** (6 réponses au plus,
  « Démonstration » affiché, rien d'enregistré) → **débrief** (décisions, points forts cités mot pour mot, oublis,
  pistes, compétences) → « Rendez cette simulation fidèle à vos procédures » : importer, écrire une règle ou continuer
  sans document → nom de l'espace (secteur déjà coché) → étape choisie déjà ouverte, situation et règles suggérées
  rappelées. « Créer directement mon espace » reste disponible à la première étape.

**Student (retour sur l'accueil)**
| État | Condition | Action principale |
|---|---|---|
| Réviser | des révisions sont dues (FSRS, inchangé) | « Lancer mon défi du jour » (la session existante) |
| Difficulté | confusion ouverte, deux oublis ou fausse certitude récente | « On reprend ce point ensemble ? » → la notion (explication, exercices, Pousse) |
| Reprendre | notion ouverte il y a moins de 14 jours, ou leçon suivante | « Reprendre mon apprentissage » |
| Continuer | seulement de nouvelles cartes ou des notions à peine fragiles | « Reprendre mon apprentissage » (session) |
| Explorer | tout est à jour | « Explorer mes cours » (la carte) ; les cinq portes mises en avant |
Aucune déduction tirée de l'heure ni de l'appareil. Les portes restent à la même place (compactes, ou ouvertes en
exploration) ; « Choisir autre chose » y conduit.

## 3. Trois niveaux de connaissance
| Niveau | Origine | Où | Utilisée pour l'entraînement |
|---|---|---|---|
| Confirmée | validée par une personne habilitée, extrait retrouvé dans le document (009) | Base de savoir | oui |
| Extraite · à confirmer | retrouvée dans un document, pas encore confirmée | Base de savoir, mise en route | non |
| Suggérée par l'IA | supposée par la simulation de découverte | découverte et rappel dans la mise en route | jamais ; jamais enregistrée |
Les contrôles existants (provenance 009, rôles, sensible réservé aux managers) sont inchangés : seule leur
présentation change.

## 4. Choix techniques (strictement nécessaires)
- **Serveur** : `supabase/functions/tutor/decouverte.ts` (tâches `decouverte_start`, `decouverte_tour`,
  `decouverte_fin`). Raison : le Client Mystère existant exige une organisation et 3 connaissances validées ; sans
  ajout, aucune simulation n'est possible avant la configuration. Sans état, sans base, sans preuve ; connexion et
  quota du Client Mystère (journal `mystere`, donc **aucune migration**). Un point fort sans citation exacte est écarté.
  **La fonction `tutor` doit être redéployée** pour activer la découverte ; avant cela, l'écran le dit et propose la
  création directe.
- **Client** : `js/org-discover.js` (nouveau), `js/org-setup.js` (contexte repris, libellés), `js/app.js` (accueil),
  `js/mastery.js` (`struggling`, lecture seule des données existantes), `js/org-docs.js`, `js/league.js`, `js/org.js`
  (libellés et infobulles), `styles.css`.

## 5. Fonctionnalités conservées volontairement
Les cinq portes Student, Focus, « 2 min », le plan, les missions, la carte ; la mise en route en 3 étapes
(désormais après la découverte), l'assistant détaillé ; « Tout confirmer » (facultatif) ; Canopée, Cordées, Arbor
League et Pousse gardent leur nom.

## 6. Limites et suites (par priorité)
- **P0** : redéployer `tutor` puis jouer la découverte avec un vrai compte (non vérifiable ici).
- **P0** : tests avec des personnes qui ne connaissent pas Arbor (5 managers, 5 étudiants) : temps jusqu'à la
  première simulation, hésitations, abandons. Les objectifs (15 s, 30 s, 85 %) sont des cibles, pas des mesures.
- **P1** : rejouer la situation de découverte une fois les règles confirmées (« voici la même scène avec vos règles »).
- **P1** : Cockpit vide : proposer la découverte aux responsables d'un espace sans données.
- **P2** : harmoniser « Valider » restant dans d'autres écrans (relations du graphe) avec « Confirmer ».
