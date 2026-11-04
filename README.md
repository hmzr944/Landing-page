# 🌳 Arbor : apprendre en arborescence

Arbor est une application web pour apprendre en découpant n'importe quel sujet en **parties**, puis en **sous-parties** de plus en plus petites, jusqu'à ce que chaque morceau soit facile à retenir.

## Pourquoi Arbor

La plupart des étudiants relisent et surlignent. Ça donne l'impression d'apprendre, mais ce sont les méthodes les moins efficaces (Dunlosky et al., 2013 ; Karpicke et al., 2009). Arbor est construit sur ce que la recherche en sciences cognitives montre vraiment :

| Ce qui bloque | Ce que dit la recherche | Ce que fait Arbor |
|---|---|---|
| Relire donne l'illusion de savoir | Se tester est la technique la plus efficace | Révision active : rappel libre ou phrase à compléter, réponse cachée |
| On oublie avant l'examen | Espacer les révisions bat le bachotage | Répétition espacée FSRS-5 : chaque partie revient juste avant d'être oubliée |
| On n'ose pas répondre faux | Tenter une réponse, même fausse, aide à retenir si on voit la correction | Tu écris ta réponse avant de retourner la carte |
| On apprend par cœur sans comprendre | S'expliquer avec ses mots aide à comprendre | Zone « Explique-le simplement » dans chaque fiche |
| On croit savoir | Nos impressions de maîtrise sont mal calibrées | Tu notes ta confiance, Arbor te dit si tu te surestimes |
| Le téléphone, la procrastination | Distraction et procrastination vont souvent ensemble | Mode Focus, objectif quotidien, série de jours |
| Les cours sont énormes | (choix de conception) | Chaque sujet découpé en petites parties, une idée par feuille |

La page **Méthode** de l'application détaille chaque point avec ses sources et son niveau de preuve.

### Ce qu'Arbor fait de tes propres données de révision

- **Fiabilité de ta confiance** : le pourcentage de bonnes réponses quand tu te dis « certain ». Sous 80 %, Arbor te prévient que tu te surestimes.
- **Illusion de maîtrise** : quand tu te dis certain puis oublies, la partie est notée et la mascotte te le signale.
- **Points faibles** : les parties les plus souvent oubliées, ou crues sues à tort, s'affichent sur l'accueil.
- **Parties difficiles** : une partie oubliée 3 fois est signalée dans sa fiche, avec deux remèdes : la découper en sous-parties, ou l'expliquer avec tes mots.
- **Mémoire moyenne par sujet**, calculée à partir de la probabilité de rappel de chaque partie.
- **Le surlignage devient des questions** : chaque passage `==surligné==` de tes notes peut être tiré en phrase à compléter pendant les révisions.
- **Deviner avant de lire** : sur une partie jamais révisée, les points clés restent floutés tant que tu n'as pas essayé de les deviner (effet de prétest).
- **Découvrir dans l'ordre, réviser en mélangeant** : les nouvelles parties arrivent dans l'ordre du cours, sujet par sujet ; seules les révisions sont mélangées, car l'entrelacement aide sur la durée mais gêne la première découverte.

### Pour celles et ceux qui ont du mal à se concentrer (TDAH, attention)

Études récentes (2023 à 2026), et ce qu'Arbor en fait. Les preuves restent minces pour les étudiants avec un TDAH ; la page Méthode indique le niveau de preuve de chaque point.

| Ce que montre la recherche | Ce que fait Arbor |
|---|---|
| Se tester aide aussi les étudiants avec un TDAH, mais ils l'utilisent moins seuls ([Minear et al., 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10397724/)) | Arbor pilote la session : un bouton, les cartes arrivent au bon moment |
| Le point faible est la première mémorisation : moins de stratégies « profondes » ([même étude](https://pmc.ncbi.nlm.nih.gov/articles/PMC10397724/)) | Leçon guidée par module : une idée par écran, 2 ou 3 points à retenir, une question juste après ; une erreur revient à la fin |
| Réciter un ensemble tient mieux que section par section ; rappel moins organisé avec un TDAH ([2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10715433/)) | Carte « Rappel de la branche » : retrouver les sous-parties dans l'ordre |
| Démarrer est le principal obstacle ([2026](https://link.springer.com/article/10.1186/s40359-026-04221-1)) ; les plans « quand… alors… » aident ([642 tests, 2024](https://kops.uni-konstanz.de/handle/123456789/69905)) | « Juste 2 minutes » (5 cartes), plan quotidien avec rappel dans l'agenda (.ics) |
| Réapprendre jusqu'à réussir rend les souvenirs durables ([Rawson et Dunlosky, 2022](https://journals.sagepub.com/doi/full/10.1177/09637214221100484)) | Une carte oubliée revient dans la session jusqu'à être retrouvée |
| Mélanger les types d'exercices : 61 % contre 38 % un mois plus tard ([Rohrer et al.](https://Www.Gwern.net/doc/psychology/spaced-repetition/2019-rohrer.pdf)) | Exercices avec méthode dans chaque fiche, mélangés en révision |
| Une IA qui donne les réponses fait perdre 17 % une fois retirée ; avec garde-fous, non ([Bastani et al., PNAS 2025](https://papers.ssrn.com/abstract=4895486)) | Indices progressifs qui ne donnent pas la réponse et plafonnent la note ; l'IA n'écrit pas tes ancrages |
| On se note mal soi-même | Plus de « Maîtrisé » manuel : tu coches ce que tu as retrouvé, Arbor propose la note, le statut vient de la mémoire mesurée |
| La ludification a un effet faible sur la motivation ([2024](https://repository.hku.hk/handle/10722/348034)) | XP pour l'effort, pas pour cliquer « Bien » ; mode calme sans confettis ni mouvement |
| Travailler en présence de quelqu'un : données préliminaires ([2025](https://arxiv.org/abs/2509.12153)) | Pendant le Focus, Pousse lit en silence à côté de toi |

## Fonctionnalités

- **Aujourd'hui** : les cartes à revoir et les nouvelles cartes du jour, l'objectif quotidien, la série et l'activité de la semaine.
- **Révision du jour** : tous les sujets sont mélangés (entrelacement). Quatre types de questions : phrase à compléter, rappel libre, rappel de la branche, exercice. Tu écris ta réponse, tu peux demander un indice, tu indiques ta confiance, tu vois la correction et tu coches ce que tu avais retrouvé ; Arbor propose une note (Oublié, Difficile, Bien ou Facile) que tu peux changer. L'intervalle avant le prochain passage s'affiche sous chaque bouton. Raccourcis clavier : Entrée et 1 à 4. Sur mobile, glisse la carte à droite ou à gauche.
- **Sujets en arbre** : parties et sous-parties à profondeur illimitée, glisser-déposer, plan collé.
- **Fiche par partie** : jauge de mémoire (probabilité de t'en souvenir maintenant), points clés, notes en markdown, leçon guidée dès qu'une partie a des sous-parties, exercices avec méthode, bouton pour réviser cette partie. Le statut (à apprendre, en cours, maîtrisé) se calcule à partir de la mémoire mesurée.
- **Parcours de modules** : importe un programme ou une liste de sujets (PDF, ou plan collé) et Arbor crée un module par sujet, réparti jusqu'à ton examen (20 % du temps gardé pour réviser l'ensemble). Arbor **rédige le cours de chaque sujet** à partir de son seul titre : gratuitement, une **fiche de départ** tirée de l'article Wikipédia en français le plus pertinent (introduction, sections explicatives d'abord, points clés, source citée, licence CC BY-SA ; c'est encyclopédique, pas pédagogique), ou un **vrai cours** avec Claude qui cherche sur le web et rédige un cours avec exemples, exercices corrigés et sources. Le bouton « Rédiger le cours » existe aussi sur n'importe quelle partie vide. Chaque module suit 2 étapes : une **leçon guidée** (pour chaque notion : « Découvre » l'idée clé, « Retiens » 2 ou 3 points, « Vérifie » une question à toucher : phrase à rattacher à sa notion ou mot manquant ; une question ratée revient à la fin), puis la révision espacée. Le contenu de la leçon est tiré automatiquement du cours : les phrases qui se comprennent seules et qui parlent de la notion passent en premier. Un module n'entre en révision qu'une fois la leçon faite. Le « module du jour » s'affiche sur l'accueil.
- **Plan et examen** : plan quotidien « quand… alors… » avec rappel dans l'agenda, date d'examen par sujet avec le nombre de nouvelles parties à voir chaque jour, démarrage « Juste 2 minutes », mode calme.
- **Un cours entier à partir de simples thématiques** (programme, plan « Étape 1 — … » avec ses points), gratuitement et sans clé, avec une méthode inspirée de STORM (Stanford) :
  1. pour chaque notion, des recherches dans **Wikilivres** (manuels), **Wikiversité** (cours) et **Wikipédia** : la notion dans le contexte de son module, puis seule ; une notion « A et B » est cherchée en deux concepts ; le verbe d'action est retiré (« Installer Debian » → « Debian ») ;
  2. les pages sont filtrées par le vocabulaire du parcours (tous ses titres) : une page qui ne contient pas la notion, ou qui parle d'un autre module (Linux dans un module Windows), est écartée ;
  3. les pages sont découpées en passages rédigés (pas de code ni de légendes), classés par pertinence (BM25, bonus aux définitions) avec un critère de diversité ;
  4. chaque notion est rédigée à partir de **ses** meilleurs passages : reformulés en cours par l'IA locale si elle est activée, sinon assemblés avec les phrases clés surlignées, une question d'explication et, pour une notion d'action (« Configurer… »), un exercice de mise en pratique ; sources citées (CC BY-SA) ;
  5. chaque module reçoit une introduction tirée des sources ; un thème sans notions reçoit d'abord un plan, tiré des sections de la meilleure source.
  Les requêtes sont espacées et réessayées si Wikimedia demande de ralentir. Une notion sans source fiable reste vide plutôt que remplie de hors-sujet.
- **IA locale gratuite** (Réglages) : un modèle open source (Qwen 2.5 3B par défaut, Apache 2.0) tourne directement dans le navigateur grâce à WebLLM. Pas de compte, pas de clé, rien ne quitte l'appareil. Il faut WebGPU (Chrome, Edge ou Safari récents) ; le modèle (1 à 3 Go) se télécharge une fois puis reste en cache ; la variante f32 est choisie automatiquement si la carte graphique ne gère pas f16. Pour rédiger un cours, il reformule un texte de référence (Wikipédia) en explications, exemples, points clés et questions corrigées, plutôt que d'inventer. Sur un PDF, il garde le texte du document et ajoute des points clés et des questions à chaque partie.
- **Import PDF** : analyse rapide, IA locale, ou Claude avec ta clé API. L'analyse locale charge les polices pour repérer le gras et l'italique, relit les pages à deux colonnes dans l'ordre, retire en-têtes, pieds et numéros de page, déduit les niveaux de titres de la numérotation et du style, transforme les blocs « Définition », « Théorème », « Règle »… en points clés, les « Exercice N » et la section « Exercices » en exercices, la section « À retenir » en points clés du sujet. Elle lit aussi les tableaux à deux colonnes (une ligne « cellule : cellule »), les encadrés avec une colonne latérale (« Objectif »), les titres sur deux lignes, ignore le sommaire, garde chaque liste avec sa phrase d'introduction, et transforme les QCM (« Question 1 — … », choix « ○ », « Bonne réponse : … ») en exercices corrigés, une carte de révision par question. Un document rédigé qui contient un plan (« Étape 1 — … » suivie de puces) propose d'en faire un parcours : une étape = un module, ses puces = ses notions, son objectif repris dans le module. Pour un programme, « Chapitre 3 — Sujet : a, b, c » donne un module et ses notions ; les lignes administratives (responsable, ECTS, modalités, bibliographie) sont écartées.
- **Carte mentale** de chaque sujet.
- **Focus** : minuteur de concentration (15 à 50 minutes) avec pauses fixes, son et notification à la fin, et une pastille visible partout.
- **Application mobile** : installable (PWA), elle fonctionne hors connexion, avec une barre de navigation en bas. Elle a été testée de 320 px à 1440 px de large, en portrait et en paysage.
- **Pousse, la mascotte** : un petit jouet vivant.
  - Attrape-la et lance-la : elle rebondit. Caresse-la avec la souris : elle fait des cœurs.
  - Seule, elle danse, fait l'hélicoptère avec ses feuilles ou bâille.
  - Elle a soif quand des cartes attendent. Elle met un bandeau pendant le Focus.
  - Elle grandit avec ton niveau.
- Fond flou abstrait aux couleurs du sujet, thème automatique, clair ou sombre, sauvegarde locale avec export et import.

## Design

Le design applique les skills de [skills.sh](https://skills.sh) : `frontend-design` (Anthropic), `design-taste-frontend` (taste-skill), `ui-ux-pro-max`, `emil-design-eng`, `review-animations`, `find-animation-opportunities`, `improve-animations` et `animation-performance` (Emil Kowalski), `web-design-guidelines` (Vercel), `motion-background` et `svg-animation` (iart-ai), `svg-logo-designer`, `page-mascot`, `microinteractions`, `better-typography` (titres, graisses), `ux-writing` et `humanizer` (textes).

- **Typographie** : [Satoshi](https://www.fontshare.com/fonts/satoshi) pour les titres et les chiffres, [Chillax](https://www.fontshare.com/fonts/chillax) pour les textes (polices Fontshare), avec une échelle de 1,25. Deux graisses par police : Satoshi 700 pour les titres de page et 500 pour les titres de section ; Chillax 400 pour le texte et 500 pour les boutons. La hiérarchie passe par la taille, pas par le gras.
- **Niveaux et trophées** (page Trophées, via la pastille de niveau) :
  - niveaux progressifs (60 XP, puis 100, 140… par niveau), regroupés en 8 rangs : Graine, Pousse, Tige, Arbuste, Arbre, Grand chêne, Forêt, Forêt ancienne ; le rang fait grandir Pousse ;
  - 10 familles de trophées à 4 paliers (bronze, argent, or, platine : +10, +25, +60, +150 XP) : Réviseur, Régularité, Objectif du jour, Élève (leçons terminées), Concentration, Mémoire durable, Persévérance (oubli rattrapé), Lucidité (« certain » juste), Bâtisseur, Explorateur ; et 4 trophées uniques (premier import, premier parcours, « Juste 2 minutes », retour après 3 jours) ;
  - ils récompensent l'effort et la régularité, jamais le fait de se noter « Bien » ; le retour après une pause est récompensé, pas puni ;
  - « Presque » : les 3 trophées les plus proches (« Plus que 4 cartes ») ; médailles métalliques animées, célébration discrète en haut de l'écran qui ne bloque pas la révision (regroupée si plusieurs arrivent d'un coup) ; calme en mode calme.
- **Logo** : le « a » d'Arbor est une graine (bol bleu, contre-forme ouverte) dont le jambage monte, verdit et devient une pousse à deux feuilles ; ensemble, ils dessinent « ar ». Animation d'entrée (le bol rebondit, la tige pousse, les feuilles se déplient), feuilles qui ondulent au survol, teintes éclaircies en mode sombre. Favicon et icônes de l'application régénérés.
- **Pousse évolue** (style à plat : aplats, une ombre et un reflet, grands yeux simples, feuilles bicolores). À chaque rang, il grandit, change de couleur et gagne un détail visible : graine caramel, puis pousse vert tendre avec un bout de coque, feuille sur le ventre, bras en feuilles et bouton de fleur, racines et petit arbre en fleurs, écorce, sourcils et glands, mousse, champignon et oiseau, puis corps de jade, médaillon d'or et couronne. Avec la régularité : étincelles, disque doré, lucioles, anneau qui change de couleur. Bleu nuit en mode sombre.
- **Animation d'évolution** : Pousse devient une silhouette blanche qui scintille, des rayons tournent derrière lui, un anneau et des feuilles jaillissent, puis la nouvelle forme apparaît avec un rebond.
- **Index des évolutions** (toucher Pousse) : carrousel horizontal des 8 formes ; les formes débloquées en couleur, la forme actuelle marquée « Toi », les autres en silhouette noire enchaînée avec un cadenas (toucher : les chaînes tremblent et affichent les niveaux restants) ; les éclats de régularité à débloquer en dessous.
- **Pousse la nuit** : en mode sombre, la mascotte passe en bleu nuit aux feuilles cyan, avec un léger halo, et change de couleur en douceur.
- **Design bento en verre** : tuiles de tailles variées (grille bento), matériau translucide inspiré du « Liquid Glass » d'Apple (approximation web : flou d'arrière-plan, reflets, bordures superposées, reflet qui suit le pointeur), coins de 28 px et boutons en pilule. Formes abstraites animées dans les couleurs du logo (taches qui changent de forme, anneau qui tourne), anneaux de progression et chiffres animés, entrée des tuiles en ressort. Peu de texte : un chiffre ou une icône et une phrase par tuile, le détail s'ouvre à la demande, les longues notes sont repliées. Tout le mouvement s'arrête en mode calme ou avec « réduire les animations » ; surface opaque avec « réduire la transparence ».
- **Textes** : titres sans numérotation (« 1. », « 2.1 » sont retirés, y compris à l'import d'un PDF), sans icône décorative, en minuscules sauf la première lettre ; boutons de la forme « verbe + objet » ; gras réservé aux termes à retenir.
- **Couleurs** : fond neutre froid. Chaque sujet a sa propre couleur, qui teinte toute sa vue. Les couleurs des statuts sont réservées (gris, ambre, vert).
- **Logo** : une marque vectorielle abstraite, faite de trois feuilles translucides qui se superposent et se déploient en éventail.
- **Icônes** : [Phosphor](https://phosphoricons.com), sans emoji en guise d'icône.
- **Espacements** : grille de 4 px. Rayons : 10 px pour les contrôles, 16 px pour les panneaux.
- **Mouvement** : animations courtes (300 ms au maximum, courbes ease-out), seulement les propriétés transform et opacity, et respect du réglage « réduire les animations ». Les confettis sont réservés au moment où tu maîtrises une partie.
- **Accessibilité** : focus visible, labels, notifications annoncées aux lecteurs d'écran, cibles tactiles de 44 px.

## Lancer l'application

Aucune installation n'est nécessaire : il suffit d'ouvrir `index.html` dans un navigateur. Pour installer l'application sur ton téléphone et l'utiliser hors connexion, il faut la servir en HTTPS, par exemple avec GitHub Pages.

Pour l'avoir en ligne, active **GitHub Pages** (Settings → Pages → branche `main`, dossier `/`).

## Structure

| Fichier | Rôle |
|---|---|
| `index.html` | Squelette de la page |
| `styles.css` | Design, thèmes et animations |
| `js/store.js` | Modèle de données, sauvegarde, outils d'arbre |
| `js/app.js` | Interface : accueil, arbre, fiche, carte, révision, modales |
| `js/pdf-import.js` | Analyse locale des PDF (avec pdf.js) |
| `js/ai.js` | Structuration d'un PDF et rédaction de cours par Claude (optionnelles) |
| `js/local-ai.js` | IA locale : modèle open source Qwen qui tourne dans le navigateur avec [WebLLM](https://github.com/mlc-ai/web-llm) |
| `js/pousse-dex.js` | Index des évolutions de Pousse |
| `js/trophies.js` | Niveaux, rangs et trophées |
| `js/storm.js` | Rédaction d'un cours entier à partir de thématiques, méthode inspirée de [STORM](https://github.com/stanford-oval/storm) (Stanford, MIT) |
| `js/course.js` | Rédaction d'un cours à partir d'un sujet, via Wikipédia |
| `js/markdown.js` | Rendu markdown minimal |
| `js/fx.js` | Confettis et notifications |
| `js/mascot.js` | Pousse, la mascotte animée (SVG) |
| `js/srs.js` | Répétition espacée (FSRS-5) et statistiques |
| `js/pwa.js`, `sw.js`, `manifest.webmanifest`, `icons/` | Application installable et hors connexion |

> 🔐 La clé API Claude est stockée uniquement dans ton navigateur et n'est envoyée qu'à l'API d'Anthropic. Ne l'enregistre pas sur un ordinateur partagé.
