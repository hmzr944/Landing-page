# Arbor — Expérience multi-support v1 (v52)

Statut : cadrage produit et technique, avant implémentation.
Branche de travail : `ux-multisupport-v52`.
Principe directeur : un seul cerveau produit, trois expériences adaptées aux contextes d'usage.

## 1. Vision

Arbor ne doit pas afficher la même interface sur tous les appareils. Il doit adapter l'expérience à l'intention et aux contraintes du support, tout en conservant une continuité cognitive : retrouver le cours, la notion, les erreurs, le niveau de confiance, les preuves, les révisions dues et la prochaine action pertinente.

- Desktop : le Bureau du Savoir — créer, organiser, configurer, analyser et approfondir.
- Mobile : le Compagnon de Poche — agir rapidement, apprendre, réviser, simuler et capturer sur le terrain.
- Tablette : la Station de Lecture Active — lire, annoter, comparer et s'entraîner dans une disposition intermédiaire, notamment bi-panneau.

Un même compte, un même modèle de données, les mêmes règles métier et moteurs. Des compositions d'interface, priorités et interactions différentes.

## 2. Missions par support

### Desktop — Bureau du Savoir

Publics : étudiant, collaborateur, expert et manager, avec des besoins et droits distincts.

Student :
- organiser les matières, cours, chapitres et notions ;
- importer et gérer plusieurs sources ;
- lire et modifier une fiche avec une densité confortable ;
- explorer la carte de connaissances ;
- approfondir une discussion IA sur une source ou une notion ;
- préparer des examens longs ;
- consulter les diagnostics, historiques et statistiques détaillés.

Business :
- gérer documents, versions et connaissances ;
- configurer équipes et scénarios selon les droits ;
- analyser le Cockpit, les compétences et les preuves ;
- examiner les changements de sources et les réévaluations ;
- piloter l'activité sans exposer les données personnelles non nécessaires.

Principes UX :
- navigation latérale adaptée au contexte ;
- recherche globale et raccourcis clavier quand utiles ;
- zones de travail multi-panneaux ;
- densité d'information supérieure au mobile, sans surcharge ;
- aucune donnée ou action affichée si le rôle ne l'autorise pas.

### Mobile — Compagnon de Poche

Publics : apprenant et collaborateur en situation de mobilité ou sur le terrain.

Priorités :
- accueil orienté vers une seule prochaine action ;
- révisions FSRS en sessions courtes ;
- micro-leçons et exercices tactiles ;
- micro-missions ciblées sur les notions fragiles ;
- simulations courtes (dont Client Mystère IA lorsque le contexte et les droits le permettent) ;
- capture rapide photo/document (Snap & Learn) ;
- lecture ou écoute d'explications ;
- consultation des preuves personnelles et de leur statut ;
- accès hors ligne aux contenus explicitement téléchargés, avec synchronisation différée.

Principes UX :
- navigation basse simple ;
- une tâche principale à la fois ;
- grandes cibles tactiles, gestes non indispensables ;
- saisie minimale ;
- états réseau et synchronisation clairement visibles ;
- notifications utiles, configurables et non intrusives ;
- ne pas transposer le Cockpit desktop en petit écran.

### Tablette — Station de Lecture Active

Priorités :
- lecture d'un cours avec annotations ;
- cours et notes côte à côte ;
- support de stylet lorsque disponible ;
- examens et exercices dans une zone confortable ;
- carte de connaissances consultable et manipulable ;
- consultation des sources et explications en parallèle.

Principes UX :
- paysage et portrait ;
- bi-panneau seulement lorsque l'espace le permet ;
- pas de simple agrandissement du mobile ;
- adaptation aux dimensions et aux capacités réelles, pas à un user-agent supposé.

## 3. Continuité cognitive

La synchronisation doit préserver davantage que les fichiers et les scores.

Elle doit pouvoir retrouver, selon les données réellement disponibles :
- le cours, la source et sa version ;
- la notion étudiée ;
- la dernière activité et son état ;
- les réponses et erreurs utiles au diagnostic ;
- la confiance déclarée, lorsqu'elle a été mesurée ;
- les révisions dues et leur échéancier ;
- les observations et preuves produites ;
- les prochaines actions recommandées ;
- les changements de source qui affectent les connaissances ou preuves.

Exemple de parcours :
1. Sur PC, l'apprenant importe un document et travaille une notion.
2. Arbor détecte un signal de difficulté suffisamment étayé.
3. Sur mobile, Arbor propose une micro-mission adaptée au tactile sur cette notion précise.
4. L'apprenant réalise une épreuve ou simulation.
5. La preuve et le contexte sont enregistrés selon les règles existantes.
6. Sur PC, le dossier et les indicateurs autorisés reflètent le nouvel état.

Règles :
- ne jamais confondre synchronisation des données et validation d'une compétence ;
- ne jamais inventer une preuve lorsque le réseau ou un service est indisponible ;
- préserver les événements historiques ;
- gérer les conflits et les reprises après mode hors ligne ;
- respecter strictement les permissions et la séparation Student / Business ;
- expliquer les états en attente, synchronisé, en conflit ou en échec.

## 4. Architecture technique cible

Architecture progressive, non destructrice :

- Web : application responsive existante.
- PWA desktop : installation depuis le navigateur, fenêtre autonome et capacités compatibles avec les navigateurs.
- Desktop natif éventuel : Tauri uniquement si un besoin système démontré le justifie.
- Mobile : évaluer Capacitor comme enveloppe native autour de l'application web, après audit des APIs nécessaires. Ne pas s'engager avant d'avoir validé caméra, fichiers, notifications, stockage hors ligne, authentification et publication.
- Backend : Supabase et Edge Functions existants.
- Données locales : conserver le stockage actuel tant qu'il est fiable ; définir une stratégie explicite de cache, file d'attente et synchronisation.
- Moteurs métier : mutualisés, indépendants de la présentation et non réécrits pour le seul changement de support.

Ne pas lancer une migration React Native ou une réécriture générale sans preuve que l'architecture actuelle ne peut pas répondre aux besoins.

## 5. Principes non négociables

1. Préserver les parcours et fonctionnalités Student et Business existants.
2. Ne pas retirer une fonctionnalité uniquement parce qu'elle n'est pas prioritaire sur un support : la déplacer, la simplifier ou la rendre accessible autrement.
3. Ne pas créer trois applications métier séparées.
4. Ne pas coder une détection rigide « téléphone = mobile, ordinateur = desktop » si une adaptation responsive et au contexte est possible.
5. Ne pas modifier les moteurs FSRS, diagnostic, preuves, compétences, provenance, RLS ou scénarios dans un chantier purement UX.
6. Respecter les rôles, RLS, confidentialité et cloisonnement des espaces.
7. Ne pas inventer de données, notifications, capacités hors ligne ou statuts de synchronisation.
8. Accessibilité : clavier, focus visible, lecteurs d'écran, réduction des animations, contrastes et zones tactiles.
9. Performance : ne pas charger des ressources lourdes spécifiques à un support lorsqu'elles ne sont pas nécessaires.
10. Mesurer les parcours réels avant de conclure qu'une interface est meilleure.

## 6. État initial constaté dans le dépôt

Au moment du cadrage :
- `index.html` expose une application web unique et charge les modules Student et Business ;
- `manifest.webmanifest` existe avec `display: standalone`, mais impose actuellement `orientation: portrait` ;
- `sw.js` met en cache le shell de l'application ;
- `js/pwa.js` gère l'installation PWA et le service worker ;
- `index.html` possède déjà une navigation basse ;
- `js/org-desk.js` contient une expérience Business desktop avec sidebar, recherche clavier et barre contextuelle ;
- `styles.css` contient déjà des adaptations responsive ;
- le Student ne possède pas encore une séparation aussi explicite entre ses usages desktop, mobile et tablette.

Ces éléments doivent être revérifiés sur la branche cible avant chaque implémentation. Ce document ne prétend pas que les fonctionnalités natives iOS/Android sont déjà réalisées.

## 7. Prompt directeur pour l'agent de développement

Tu travailles sur le dépôt Arbor : https://github.com/hmzr944/Landing-page

Ta mission est de faire évoluer Arbor vers une expérience multi-support réellement adaptée à chaque appareil, sans réécrire le produit et sans casser les parcours existants.

### Vision produit
Arbor dispose d'un seul cerveau : mêmes comptes, données, moteurs métier, règles de progression, sources, compétences et preuves. En revanche, Desktop, Mobile et Tablette ont des missions, priorités, compositions d'écran et interactions différentes.

- Desktop = Bureau du Savoir : création, organisation, approfondissement et pilotage.
- Mobile = Compagnon de Poche : apprentissage rapide, révisions, micro-missions, simulations et capture terrain.
- Tablette = Station de Lecture Active : lecture, annotation, bi-panneau et examens.

La continuité cognitive est centrale : un apprenant doit retrouver sur chaque appareil son contexte d'apprentissage, et pas seulement une copie de ses fichiers ou un score.

### Règles de travail
- Commence par auditer le code réellement présent sur la branche de travail.
- Lis les documents produit existants et identifie les invariants.
- Distingue toujours ce qui existe, ce qui est partiel, ce qui manque et ce qui est seulement envisagé.
- Ne prétends jamais qu'un test a été exécuté s'il ne l'a pas été.
- Ne remplace pas une architecture existante sans démontrer le besoin.
- Ne modifie pas les moteurs métier, la base, les politiques RLS ou les fonctions Edge dans une mission de présentation sans nécessité démontrée.
- Ne supprime aucune fonctionnalité Student ou Business sans décision explicite.
- Réutilise les tokens, composants, conventions et styles déjà présents.
- Ne crée pas de fausses données ou de fausses notifications pour embellir les écrans.
- Respecte l'accessibilité, la confidentialité et les permissions.
- Travaille par petites étapes vérifiables et documente chaque décision.

### Phase 1 — Audit multi-support (aucune modification fonctionnelle)
Inspecte au minimum :
- `index.html`, `styles.css`, `manifest.webmanifest`, `sw.js`, `js/pwa.js` ;
- le shell et les routes Student dans `js/app.js` ;
- l'expérience Business dans `js/org-desk.js`, `js/org.js`, `js/org-shell.js` et modules associés ;
- les vues cours, leçons, révisions, progression, import, scanner/capture et simulations ;
- le stockage local, IndexedDB/localStorage, Supabase et les chemins de synchronisation ;
- les tests existants et les contraintes de déploiement GitHub Pages.

Produis :
1. une cartographie des écrans par rôle et par support ;
2. un inventaire des breakpoints et comportements responsive existants ;
3. une matrice fonctionnalité × Desktop/Mobile/Tablette ;
4. les problèmes UX et techniques classés P0/P1/P2 ;
5. les risques de régression ;
6. une recommandation d'architecture argumentée ;
7. une proposition de lots de développement et critères d'acceptation.

Ne commence pas une refonte avant d'avoir présenté cet audit.

### Phase 2 — Architecture de l'expérience
Définis un système de composition par support :
- navigation desktop, mobile et tablette ;
- accueil et prochaine action ;
- vues de cours et de leçons ;
- import et gestion des sources ;
- révisions et exercices ;
- discussion IA et simulations ;
- progression et dossier de preuves ;
- espace Business et Cockpit.

Définis les comportements par largeur, orientation, type d'entrée (tactile/clavier/souris), capacité réseau et rôle. Ne fais pas dépendre les décisions uniquement du user-agent.

### Phase 3 — Premier lot d'implémentation
Commence par un lot UX limité et réversible :
- rendre la navigation et le shell cohérents selon le support ;
- corriger les règles du manifeste PWA si nécessaire, sans casser l'installation ;
- distinguer les priorités Student Desktop et Student Mobile ;
- préserver l'expérience Business desktop existante ;
- définir la composition tablette sans forcer un bi-panneau sur les petits écrans.

N'ajoute pas encore Capacitor, Tauri ou une migration de framework avant validation de l'audit et du prototype web.

### Phase 4 — Continuité cognitive et hors ligne
Après validation du premier lot :
- cartographier les données locales et distantes ;
- définir les événements synchronisables ;
- définir les conflits, reprises et états réseau ;
- vérifier la reprise d'une activité sur un autre appareil ;
- tester la cohérence FSRS et les preuves sans doublons ;
- ne jamais créer de preuve définitive côté client sans validation serveur appropriée.

### Tests obligatoires
Tester au minimum :
- desktop 1440 px et 1280 px ;
- tablette portrait et paysage ;
- mobile 390 px et 360 px ;
- navigation clavier et tactile ;
- Student et Business avec les rôles autorisés ;
- import, lecture, leçon, révision et reprise ;
- PWA installée et navigateur normal ;
- perte réseau, retour réseau et conflits de synchronisation si le flux est implémenté ;
- aucune erreur JavaScript ni débordement horizontal.

Pour chaque lot, fournir :
- fichiers modifiés ;
- décisions prises ;
- fonctionnalités préservées ;
- tests réellement exécutés et résultats ;
- limites non vérifiées ;
- captures avant/après si disponibles ;
- risques résiduels.

### Définition du succès
Le succès n'est pas que le même écran rentre sur tous les écrans. Le succès est :
- Desktop rend la création et l'organisation efficaces ;
- Mobile permet de réaliser une action utile en quelques secondes ;
- Tablette facilite la lecture et l'application ;
- un apprenant retrouve son contexte sans rupture ;
- Business conserve ses capacités de pilotage ;
- aucune preuve, progression ou donnée privée n'est perdue ou exposée.

Commence uniquement par la Phase 1. Présente l'audit et attends validation avant toute modification fonctionnelle.
