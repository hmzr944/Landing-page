# 🌳 Arbor : apprendre en arborescence

Arbor est une application web pour apprendre en découpant n'importe quel sujet en **parties**, puis en **sous-parties** de plus en plus petites, jusqu'à ce que chaque morceau soit facile à retenir.

## Fonctionnalités

- **Sujets en arbre** : chaque sujet est un arbre de parties à profondeur illimitée. On peut ajouter, renommer, monter ou descendre une partie, la supprimer, ou la glisser-déposer sur une autre pour l'y ranger.
- **Fiche par partie** : des points clés ⭐, des notes en markdown simple (`**gras**`, `*italique*`, `==surligné==`, listes, titres) et un statut (À apprendre / En cours / Maîtrisé).
- **Coller un plan** : colle une liste indentée et Arbor crée toute l'arborescence d'un coup.
- **Import PDF** 📄 :
  - *Analyse locale* (gratuite, rien ne quitte ton ordinateur) : Arbor repère les titres (taille de police, gras, numérotation 1. / 1.1 / I. / A.), regroupe le texte par partie, extrait les définitions et les phrases importantes comme points clés, et les surligne dans les notes.
  - *Analyse par Claude* (optionnelle) : ajoute ta clé API dans ⚙️ Réglages. Claude lit le PDF et rédige un cours structuré avec des résumés et des points clés.
- **Carte mentale** 🗺️ : une vue graphique de tout l'arbre, colorée selon le statut de chaque partie.
- **Révision** 🃏 : des cartes à retourner. Réponds « Je maîtrise » ou « À revoir ». Tu gagnes de l'XP, tu montes de niveau, et il y a des confettis 🎉.
- **Pousse, la mascotte** : ses yeux suivent ton curseur, elle cligne et respire. Elle saute de joie quand tu maîtrises une partie et t'encourage quand une carte est à revoir. Elle s'endort si tu ne fais rien et grandit avec ton niveau (une nouvelle feuille, puis un bourgeon, puis une fleur). Clique dessus pour avoir une astuce, mais pas trop vite… Tu peux la masquer dans les réglages.
- Fond flou abstrait aux couleurs du sujet ouvert, thème automatique, clair ou sombre, et affichage adapté au mobile.
- **Sauvegarde automatique** dans le navigateur (localStorage), avec export et import en JSON.

## Design

Le design applique les skills de [skills.sh](https://skills.sh) : `frontend-design` (Anthropic), `design-taste-frontend` (taste-skill), `ui-ux-pro-max`, `emil-design-eng`, `review-animations`, `find-animation-opportunities`, `improve-animations` et `animation-performance` (Emil Kowalski), `web-design-guidelines` (Vercel), `motion-background` et `svg-animation` (iart-ai), `svg-logo-designer`, `page-mascot` et `microinteractions`.

- **Typographie** : une seule famille, Plus Jakarta Sans, avec une échelle de 1,25.
- **Couleurs** : fond neutre froid. Chaque sujet a sa propre couleur, qui teinte toute sa vue. Les couleurs des statuts sont réservées (gris, ambre, vert).
- **Logo** : une marque vectorielle abstraite, faite de trois feuilles translucides qui se superposent et se déploient en éventail.
- **Icônes** : [Phosphor](https://phosphoricons.com), sans emoji en guise d'icône.
- **Espacements** : grille de 4 px. Rayons : 10 px pour les contrôles, 16 px pour les panneaux.
- **Mouvement** : animations courtes (300 ms au maximum, courbes ease-out), seulement les propriétés transform et opacity, et respect du réglage « réduire les animations ». Les confettis sont réservés au moment où tu maîtrises une partie.
- **Accessibilité** : focus visible, labels, notifications annoncées aux lecteurs d'écran, cibles tactiles de 44 px.

## Lancer l'application

Aucune installation n'est nécessaire : il suffit d'ouvrir `index.html` dans un navigateur.

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

> 🔐 La clé API Claude est stockée uniquement dans ton navigateur et n'est envoyée qu'à l'API d'Anthropic. Ne l'enregistre pas sur un ordinateur partagé.
