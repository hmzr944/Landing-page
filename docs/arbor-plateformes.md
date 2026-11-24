# Arbor : trois expériences, un même socle (cahier des charges)

**Statut :** décision produit validée le 24 novembre 2026 ; mise en œuvre sur `arbor-2`.
Ce document complète `docs/arbor-2-vision.md`. Il fixe le rôle de chaque support et la règle qui les relie.

## 1. Règle fondamentale (exigence)
> **Aucune fonctionnalité pédagogique importante n'est réservée à l'application installée.**
> Le Desktop peut offrir davantage de confort et de capacités ; le Web reste un véritable produit d'apprentissage.

Conséquences pour tout développement :
1. Une fonction d'apprentissage se développe dans le socle commun (`index.html`, `js/`), jamais dans `desktop/`.
   - `desktop/` ne contient que l'enveloppe native : fenêtre, notifications, raccourcis, liens externes.
   - `js/desktop.js` ne fait qu'ajouter du confort quand Tauri est présent.
2. Toute nouvelle fonction est testée dans le navigateur (suites Playwright). Le Desktop est essayé à part (workflow
   « Desktop »).
3. Une différence entre supports doit être une **adaptation d'interface** (taille d'écran, clavier, notifications
   natives), jamais une **privation pédagogique**.
4. Il n'y a pas trois produits à maintenir : un seul socle applicatif et pédagogique, et trois présentations.

## 2. Les trois expériences
| | Desktop | Web | Mobile |
|---|---|---|---|
| Rôle | L'expérience complète : l'espace de travail approfondi | L'accès universel, sans installation | L'apprentissage au quotidien |
| Supports | Windows, macOS (Tauri 2) | Tout navigateur récent | Téléphone : application Web installable aujourd'hui, application iPhone en préparation |
| Priorités | Créer et organiser, importer et étudier, Studio pédagogique, simulations, arbre de connaissance, compagnon, progression, Business | Les six fonctions ci-dessous | Sessions courtes, révisions, questions spontanées, notifications, scénarios rapides, consultation, terrain Business |
| Confort propre | Fenêtre dédiée, raccourcis, rappels natifs, instance unique | Aucune installation, poste partagé, lien direct | Plein écran, hors ligne, barre du bas |

## 3. Arbor Web : six fonctions
| Fonction | Utilité | État sur `arbor-2` |
|---|---|---|
| Découvrir Arbor | Présentation, inscription, connexion | **Site public** `site/` : accueil, télécharger, mobile, documentation (15 pages). Inscription et connexion dans l'application. |
| Mon espace | Retrouver ses apprentissages et sa progression | Fait (Mon espace, Progression et mémoire) |
| Apprendre | Consulter ses cours, continuer un parcours | Fait (Mon apprentissage, parcours, révisions) |
| Créer | Démarrer un apprentissage, importer des ressources | Fait (Explorer : sujet, question, objectif ; PDF ; photo) |
| Partager | Accéder à un apprentissage partagé | **Nouveau** : partage d'un parcours par lien (`js/partage.js`), sans serveur. Collaboratif en temps réel : non. |
| Business | Environnement professionnel selon les droits | Fait (mêmes écrans, droits appliqués par la base) |

Usages visés : un étudiant sur un ordinateur d'université, un salarié sur son poste professionnel, un formateur qui
partage un parcours, une consultation rapide, une entreprise qui administre ses espaces.

## 4. Matrice de parité (état réel)
| Fonction | Web | Desktop | Téléphone (Web installé) |
|---|---|---|---|
| Parcours à partir d'un sujet libre | ✅ | ✅ (1) | ✅ |
| Import PDF, photo | ✅ | ✅ | ✅ |
| Fiches, pratique, vérification, révisions FSRS | ✅ | ✅ | ✅ |
| Compagnon (recherche locale) | ✅ | ✅ | ✅ |
| Compagnon rédigé, jugement des explications | ✅ | ✅ (1) | ✅ |
| Partage par lien | ✅ | ✅ | ✅ |
| Business | ✅ | ✅ (1) | ✅ vue simplifiée |
| Raccourcis clavier | ✅ | ✅ | — (sans objet) |
| Rappels natifs | ❌ (2) | ✅ | ❌ (2) |
| Synchronisation entre appareils | ❌ (3) | ❌ (3) | ❌ (3) |

1. Sur Desktop, les fonctions qui passent par la fonction serveur `tutor` attendent la mise à jour de `TUTOR_ORIGINS`
   par le propriétaire (`docs/desktop-origines-et-synchronisation.md`).
2. Pas de notifications push Web : elles demandent un service d'envoi (VAPID) et un consentement. C'est du confort,
   pas une privation pédagogique : l'accueil affiche ce qui est dû. Rappels natifs prévus dans l'application iPhone.
3. C'est la seule vraie limite de l'expérience « un même compte, même progression ». La proposition est prête
   (`docs/desktop-origines-et-synchronisation.md`, section 2), avec trois décisions en attente. En attendant :
   sauvegarde exportée puis importée, documentée sur le site.

## 5. Site public (`site/`)
- **Pages :**
  - accueil : positionnement, six temps de l'apprentissage, trois expériences, socle partagé, journée type, sources, organisations ;
  - télécharger ;
  - mobile ;
  - documentation (15 pages).
- **Style :** même système de design qu'Arbor 2 (Outfit, Inter, JetBrains Mono ; vert Canopée, ambre ; clair et
  sombre). Arbre animé, respect de `prefers-reduced-motion`.
- **Génération :** `node tools/build-site.js` assemble `site/src/` dans le gabarit commun. La CI vérifie que les
  pages sont à jour (`--check`).
- **Honnêteté :** chaque fonction non disponible est marquée « en préparation ». Pas de faux badge App Store.
- **Page Télécharger :**
  - elle lit la dernière version **publiée** des releases GitHub ;
  - tant qu'aucune n'existe, aucun bouton n'est actif et Arbor Web est proposé ;
  - les empreintes SHA-256 sont affichées.
- **Hébergement :**
  - aujourd'hui GitHub Pages depuis `main` ; une fois fusionné, le site sera à `/site/` et l'application reste à la racine ;
  - les installations existantes de l'application Web et les liens déjà partagés continuent donc de fonctionner.
- **Décision à prendre plus tard :**
  - un nom de domaine (`arbor.…` pour le site, `app.arbor.…` pour l'application) ;
  - c'est une dépense, donc à ta décision.

## 6. Publication des installateurs
- **Workflow « Desktop » :**
  - à chaque envoi sur `arbor-2`, construction et **essai réel** (installation, lancement, capture) sur Windows et macOS ;
  - artefacts privés au run.
- **Étiquette `vX.Y.Z` poussée par le propriétaire :**
  - un **brouillon** de release est créé, avec les installateurs et `SHA256SUMS.txt` ;
  - un brouillon n'est visible de personne d'autre : la publication reste un geste manuel ;
  - la page Télécharger se met alors à jour seule.
- **Avant une diffusion large :**
  - signature Windows et notarisation Apple (payantes) ;
  - mises à jour automatiques (`tauri-plugin-updater`, paire de clés).

## 7. Mobile : plan vers l'App Store
**Aujourd'hui**
- L'application Web s'installe sur l'écran d'accueil (manifest, service worker, hors ligne). Elle est documentée.

**Essai technique réussi (gratuit, 24 novembre 2026, run `45472457579`)**
- Arbor compilé pour iOS, installé et lancé sur le simulateur iPhone 17 Pro, toujours ouvert après 25 s ; la capture montre l'accueil d'Arbor, au même style. Elle est publiée sur la page Mobile du site, présentée comme capture de simulateur.
- Non vérifié : appareil réel, connexion, notifications, navigation au doigt.
- Le même projet Tauri 2 compile pour iOS.
- Le workflow « Mobile (essai iOS) » génère le projet Xcode, compile pour le simulateur, installe, lance et capture
  l'écran.
- Les greffons propres à l'ordinateur (instance unique, état de fenêtre) sont exclus sur iPhone.

**Avant soumission (décisions et accès du propriétaire)**
| Point | Pourquoi | Coût, effort |
|---|---|---|
| Compte Apple Developer | Signer, TestFlight, App Store | 99 USD par an : **dépense à valider** |
| Identifiant d'application | `app.arbor.desktop` ne convient pas à l'iPhone : prévoir par exemple `app.arbor.mobile` (irréversible une fois publié) | décision |
| Valeur native | Les règles d'Apple (4.2, fonctionnalité minimale) refusent un simple site emballé ; il faut au moins les rappels de révision natifs, le hors ligne et la photo de page | 2 à 4 jours |
| Suppression du compte dans l'application | Exigée par Apple (5.1.1 v) pour toute application qui permet de créer un compte | **absente aujourd'hui** : à ajouter (fonction serveur + écran) |
| Fiche de confidentialité App Store | Déclarer les données collectées : e-mail, contenus envoyés au serveur pour la génération | rédaction |
| Connexion | Code par e-mail (fonctionne) ; lien magique et Google demandent un lien profond | décision |

## 8. Exemple de référence (à rendre vrai)
1. Un étudiant commence un parcours de cybersécurité sur Desktop.
2. Il révise sur son téléphone.
3. Il reprend sur Arbor Web à l'université.
4. Il retrouve tout le soir sur Desktop.

Ce scénario est **la cible**. Il est réalisable aujourd'hui par sauvegarde manuelle. Il ne sera automatique qu'avec la
synchronisation. Le site le présente avec cette mention.
