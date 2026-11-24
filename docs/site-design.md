# Site public d'Arbor : système de design « Clairière »

Refonte du site (`site/`) dans un style proche d'iOS, avec animations. Les skills de la bibliothèque
[skills.sh](https://skills.sh) utilisés ont été lus avant d'être appliqués :

| Skill (source) | Ce qu'il a apporté |
|---|---|
| `frontend-design` (anthropics/skills) | Plan en deux passes, une seule audace par page, la liste des tics de page générée à éviter (étiquettes en capitales, mot isolé en couleur, numéros décoratifs, cartes identiques, `·` entre méta-données, monospace en costume) |
| `emil-design-eng` (emilkowalski/skills) | Grammaire du mouvement : courbes `cubic-bezier(.23,1,.32,1)` et courbe « tiroir » iOS `(.32,.72,0,1)`, pression `scale(.97)`, jamais `scale(0)`, fondu avec flou pour les changements d'image, survols réservés aux pointeurs fins, mouvement réduit respecté |
| `ios-design`, `ui-taste` (uizze.sh) | Un seul accent verrouillé, une seule famille de gris, une échelle de rayons déclarée, pas d'emoji dans l'interface, pas de faux appareil dans l'application, images vérifiées dans la mise en page réelle |
| `canvas-design` (anthropics/skills) | La philosophie visuelle ci-dessous, appliquée aux dessins (arbre de savoir, image de partage) |

Les skills de génération d'images de skills.sh passent tous par des services payants. Conformément à la règle « aucune
dépense sans accord », aucun n'a été utilisé. Les visuels sont :
- des **captures réelles d'Arbor**, faites avec les données d'exemple des tests ;
- la **capture réelle du simulateur iPhone** ;
- des **dessins vectoriels** faits à la main dans le code.

## Couleurs : règle des trois couleurs (60 / 30 / 10)
| Part | Rôle | Clair | Sombre |
|---|---|---|---|
| 60 % | **Givre** : fonds, surfaces, texte | `#F5F5F7`, `#FFFFFF`, texte `#1D1D1F` / `#6E6E73` | `#000000`, `#1C1C1E`, texte `#F5F5F7` / `#98989D` |
| 30 % | **Sous-bois** : sections immersives, cadres d'appareils, pied de page | `#0B3B2E` | `#0B3B2E` |
| 10 % | **Canopée** : actions principales, état actif, notions maîtrisées | `#17874D` (sur clair) ; `#4CD787` sur Sous-bois | `#4CD787` |

- Une seule teinte d'accent (avec sa version claire pour les fonds sombres), une seule famille de gris (gris froids
  d'Apple).
- Les états des notions se lisent par la **forme**, pas par une quatrième couleur :
  - maîtrisée : disque plein ;
  - fragile : anneau en pointillé ;
  - à découvrir : contour seul.
- La feuille orange reste uniquement dans le logo, marque déposée de l'identité.

## Typographie
- Une seule famille : la police système d'Apple (SF Pro) sur Mac, iPhone et iPad. Ailleurs, **Inter**, qui en est
  très proche.
- Titres très gras, serrés (`-0.03em`), en grands blocs.
- Texte courant à 17 px, la taille de base d'iOS.
- Pas d'étiquettes en capitales, pas de monospace décoratif.

## Formes (échelle verrouillée)
| Élément | Rayon |
|---|---|
| Actions | pilule (`999px`) |
| Panneaux et cartes | `28px` |
| Éléments internes, champs | `14px` |
| Fenêtre d'ordinateur | `14px` |
| Téléphone | `48px` |

## Mouvement : un moment par section, toujours une raison
| Moment | Raison | Réglage |
|---|---|---|
| Arrivée sur l'accueil : titre net qui sort d'un léger flou, puis les appareils montent | Une seule séquence d'ouverture | 600 à 900 ms, ease-out fort, décalage de 80 à 140 ms |
| Récit « une notion, six moments » : l'écran du téléphone change selon l'étape lue | Explication | Fondu avec flou de 6 px, 350 ms |
| Arbre de savoir : les branches se dessinent avec le défilement, les notions s'allument | Explication | Lié au défilement |
| Sélecteur Ordinateur / Web / Téléphone | Retour d'action | Pastille glissante, courbe tiroir iOS, 300 ms ; image en fondu flou |
| Boutons | Retour d'action | `scale(.97)` en 120 ms |

- Pas d'apparition en glissé sur chaque section : c'est un tic de page générée.
- Avec « mouvement réduit », les déplacements disparaissent ; seuls les fondus restent.

## Philosophie visuelle des dessins : « Croissance mesurée »
Une connaissance ne s'affiche pas : elle se mesure, comme on relève la croissance d'un arbre. Les dessins d'Arbor
empruntent la langue des carnets de botanistes :
- des tracés fins et continus ;
- des nœuds parfaitement circulaires ;
- des espaces vides généreux, où chaque marque a été pesée.

Rien n'est décoratif. Chaque branche est un chapitre. Chaque nœud est une notion, son remplissage dit ce qui est
prouvé.

La couleur y est rare et donc lourde de sens :
- le Sous-bois porte le monde ;
- la Canopée signale ce qui est acquis.

Les formes répétées (anneaux, pointillés, contours) remplacent les légendes : celui qui regarde comprend avant de lire.
Le travail doit sembler patient, exécuté avec la minutie d'un graveur, chaque courbe ajustée jusqu'à tomber juste.

Le texte n'y figure qu'à l'état d'annotation :
- quelques mots fins, alignés comme les étiquettes d'un herbier ;
- jamais une phrase là où un tracé suffit.

Le résultat doit tenir la comparaison avec une planche scientifique soigneusement composée. C'est un document de
précision, qui prouve que l'on peut cartographier ce que l'on sait.
