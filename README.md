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

## Fonctionnalités

- **Aujourd'hui** : les cartes à revoir et les nouvelles cartes du jour, l'objectif quotidien, la série et l'activité de la semaine.
- **Révision du jour** : tous les sujets sont mélangés (entrelacement). Pour chaque carte, tu écris ta réponse, tu indiques ta confiance, tu vois la correction, puis tu choisis Oublié, Difficile, Bien ou Facile. L'intervalle avant le prochain passage s'affiche sous chaque bouton. Raccourcis clavier : Entrée et 1 à 4. Sur mobile, glisse la carte à droite ou à gauche.
- **Sujets en arbre** : parties et sous-parties à profondeur illimitée, glisser-déposer, plan collé.
- **Fiche par partie** : jauge de mémoire (probabilité de t'en souvenir maintenant), points clés, notes en markdown, « Explique-le simplement », bouton pour réviser cette partie.
- **Import PDF** : analyse locale, ou par Claude avec ta clé API.
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
| `js/ai.js` | Structuration d'un PDF par Claude (optionnelle) |
| `js/markdown.js` | Rendu markdown minimal |
| `js/fx.js` | Confettis et notifications |
| `js/mascot.js` | Pousse, la mascotte animée (SVG) |
| `js/srs.js` | Répétition espacée (FSRS-5) et statistiques |
| `js/pwa.js`, `sw.js`, `manifest.webmanifest`, `icons/` | Application installable et hors connexion |

> 🔐 La clé API Claude est stockée uniquement dans ton navigateur et n'est envoyée qu'à l'API d'Anthropic. Ne l'enregistre pas sur un ordinateur partagé.
