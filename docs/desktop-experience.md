# Arbor Business sur ordinateur (décision D14)

Refonte de l'interface Business pour ordinateur : design system « Hybride Arbor », barre latérale ancrée, barre
supérieure contextuelle, recherche globale, Cockpit et pages métier. Version v49, branche `desktop-experience`
(non déployée : à valider avant fusion dans `main`).

## G1. Audit (état v48, avant refonte)

**Architecture constatée**
- Application sans framework : `index.html` (une barre `.topbar` Student commune), routeur par hash dans `js/app.js`
  (`#/org/<id>/<rubrique>/<sous-page>`), espace pro rendu par `js/org.js` → `OrgHub` (Cockpit, équipe, savoir,
  développer, apprentissage), `OrgShell` (intelligence, paramètres, cinq portes), `OrgDocs`, `OrgEngines`,
  `OrgLearn`, `League`, `OrgSetup`, `OrgOnboarding`.
- La navigation Business est une chaîne HTML (`head()` dans `org.js`) placée en tête de chaque écran ; sur ordinateur,
  du CSS la transformait en carte flottante.
- Thème : jetons CSS sur `:root` (clair) et `:root[data-theme='dark']` / `prefers-color-scheme` (sombre).
  Les composants (`.sec`, `.btn`, `.glass`, champs) lisent ces jetons : une palette peut s'appliquer sans les réécrire.
- Composants partagés Student / Business : `.topbar` (logo, sélecteur d'espace, réglages), `.sec`, `.btn`, `.glass`,
  modales, toasts, `.door` (cinq portes), mascotte, `Feedback`.
- PWA : `sw.js` (cache versionné `arbor-vNN`, liste explicite des fichiers).

**Cartographie des écrans Business**
| Rubrique | Routes | Rôles |
|---|---|---|
| Cockpit | `#/org/<id>` | admin, manager (expert : accueil ; collaborateur : accueil League) |
| Mon équipe | `/equipe`, `/suivi`, `/suivi/<user>`, `/apercu` | admin, manager |
| Base de savoir | `/savoir`, `/savoir/<source>`, `/documents/<source>`, `/competences` | admin, manager, expert |
| Développer | `/developper`, `/developper/entrainer`, `/intelligence`, `/scenarios` | admin, manager |
| Mon apprentissage | `/apprendre`, `/apprendre/<porte>`, `/diagnostic`, `/mystere`, `/resultats`, `/canopee` | tous |
| Paramètres | `/parametres`, `/configurer/<étape>` | admin |
| Mise en route | `#/org/nouvelle`, `/demarrer/<étape>`, `/bienvenue`, `#/rejoindre/<jeton>` | selon le cas |
| Modales | espaces, retour (avis), centre d'aide, réglages de l'app | tous |

**Défauts relevés (captures 1366 × 768, 1440 × 900, 1920 × 1080, données simulées)**
1. Barre latérale en carte flottante (marges, verre, ombre), décalée sous la barre Student, dans une mise en page
   centrée de 1400 px : sur 1920 px, elle flotte au milieu de l'écran.
2. Sélecteur d'espace en double : la puce de la barre Student et « Changer d'espace » dans la barre latérale.
3. Barre Student (logo, réglages) conservée dans l'espace pro, sans fil d'Ariane ni action contextuelle.
4. Matériau verre et dégradés partout (cartes, boutons, fond animé) : peu lisible, aspect « site ».
5. Cockpit : grandes cartes de même poids, pas de hiérarchie ni de colonne secondaire.
6. Mon équipe : liste sans recherche ni filtre ; formulaire de cordée affiché alors qu'il devait être replié.
7. Base de savoir : le formulaire d'envoi domine, la liste des documents ne montre ni statut ni connaissances ;
   barre de progression d'envoi affichée alors qu'elle était masquée.
8. **Bogue** : « Mon apprentissage » ouvert directement affichait une page vide (`OrgShell.doorsGrid` appelé avant
   l'initialisation de ses outils).
9. Aucune recherche globale.

Les défauts 6 (formulaire), 7 (barre) et 8 existaient en production v48 ; ils sont corrigés ici.

## G2. Design system « Hybride Arbor »

Portée : `html.in-org` à partir de 1024 px. **Student, le téléphone et la tablette en portrait gardent leur
apparence** (décision : la palette sombre est celle de l'outil de travail Business sur ordinateur ; elle ne remplace
pas le choix de thème de la personne dans son espace personnel).

**Jetons** (`styles.css`, bloc « v49 ») :
| Jeton | Valeur | Usage |
|---|---|---|
| `--bg` | #0B1412 | fond principal |
| `--side-bg`, `--top-bg` | #0F1A17 | barre latérale, barre supérieure |
| `--surface` | #14221E | cartes |
| `--surface-2`, `--surface-3` | #192923, #20332C | surfaces secondaires, survol |
| `--line`, `--line-strong` | rgba(255,255,255,.07 / .12) | bordures |
| `--accent`, `--accent-2` | #10B981, #2DD4BF | actions principales, états actifs, positif |
| `--accent-ink` | #34D399 | texte vert lisible sur fond sombre |
| `--on-accent` | #03140D | texte sur bouton vert (7,5:1) |
| `--text`, `--text-2`, `--text-3` | #E8F1EC, #9AADA3, #71877C | principal 14:1, secondaire 7:1, discret 4,9:1 |
| `--doing`, `--danger` | #F2B450, #F07A7A | à revalider, erreur |
| `--r-ctl`, `--r-panel` | 8 px, 12 px | contrôles, panneaux |
| `--ctl-h`, `--ctl-h-sm`, `--ctl-h-lg` | 36, 30, 42 px | hauteurs de boutons et champs |
| `--side-w` | 248 px (64 px replié) | barre latérale |
| `--top-h` | 52 px | barre supérieure |
| `--content-max` | 1440 px | largeur maximale du contenu |
| `--pad` | 28 px (40 px dès 1680 px) | marge latérale du contenu |

Le vert est réservé aux actions principales, aux états actifs et aux indicateurs positifs ; titres, icônes de
section et listes restent neutres. Surfaces mates : pas de verre, pas de dégradé de fond, ombres seulement pour ce
qui flotte (menus, modales, recherche).

**Composants harmonisés** : boutons primaire / secondaire (`.ghost`) / tertiaire (`.link-btn`), tailles `sm` et `big` ;
champs, listes déroulantes, fichiers ; cartes de contenu (`.sec`) ; cartes indicateurs (`.hub-kpi`) ; tableaux
(`.tb`) avec recherche (`.tb-search`) et filtres segmentés (`.seg`) ; étiquettes d'état (`.tb-tag`) ; listes
d'actions (`.ov-list`) ; barres de progression ; parcours en étapes (`.journey`) ; menus (`.desk-menu`) ; modales ;
notifications (toasts) ; états vides et de chargement existants ; focus visible ; mouvement réduit respecté.
Ces classes sont réutilisables par les futures fonctionnalités (Arbor League les utilise déjà).

## G3. Shell

- **Barre latérale** (`js/org-desk.js`, rendue dans l'en-tête de `org.js`) : ancrée à gauche sur toute la hauteur,
  fond mat, bordure fine. En-tête : logo et **sélecteur d'espace unique** (espace personnel, organisations, créer,
  rejoindre). Cinq rubriques (icône, libellé, actif teinté vert avec un trait). Pied : centre d'aide, donner mon avis,
  paramètres (administrateur), profil compact (réglages de l'app, espace personnel, déconnexion).
  Repli manuel à 64 px (libellés en infobulle et pour les lecteurs d'écran), mémorisé sur l'appareil ; jamais imposé.
- **Barre supérieure** (52 px) : fil d'Ariane (Arbor Business / organisation / rubrique / sous-page), recherche,
  action principale selon la rubrique : Cockpit « Inviter », Mon équipe « Ajouter un collaborateur », Base de savoir
  « Nouveau document », Développer « Nouveau scénario ». L'action ouvre l'écran et place le curseur dans le bon champ.
  « Créer une mission » n'existe pas comme fonction : les missions naissent d'un angle mort, d'un changement de
  procédure ou d'une activité corrective ; l'action proposée est donc « Nouveau scénario » (fonction réelle).
- **Notifications** : aucune, faute de système réel (pas de faux badge).
- **Recherche globale** (Ctrl + K, ⌘ + K) : pages, actions, et les données que la base renvoie à la personne :
  collaborateurs (responsables), documents, connaissances validées ou à valider (équipe de contenu), compétences
  (responsables). Un collaborateur ne déclenche aucune de ces lectures. Accents ignorés, clavier complet
  (↑ ↓ Entrée Échap), focus rendu à la fermeture, données mises en cache 2 minutes par organisation, échec signalé
  (« recherche limitée aux pages »). Limite : la recherche porte sur les titres, pas sur le texte des documents.

## G4. Cockpit

En-tête (titre, description, date et période), carte d'état des données, quatre indicateurs réels (compétences
démontrées, à renforcer, revalidations, activité sur 7 jours), puis grille asymétrique (≈ 65 / 35 dès 1200 px) :
colonne principale « À faire aujourd'hui », « Besoins de formation », « Évolutions des connaissances » ; colonne
secondaire « Activité récente », « Compétences à surveiller », « Progression collective ». Aucune valeur inventée :
sans données, chaque bloc le dit en une phrase.

## G5. Pages métier

- **Mon équipe** : tableau (personne, rang, compétences démontrées, progression, état, trophées, détail), recherche et
  filtres (en progression, à revalider, pas encore actifs) sur les lignes affichées ; invitations, cordées, mentorat
  et accès en dessous. Double voile : aucune erreur individuelle.
- **Base de savoir** : documents d'abord, en tableau (version, connaissances validées / à valider lues dans la base,
  date), puis l'ajout. L'extraction n'est pas détaillée par défaut.
- **Développer** : parcours Diagnostiquer → Comprendre → Entraîner → Mesurer. Chaque étape ouvre un écran existant
  (Intelligence, suivi par personne, scénarios et simulations, progression de l'équipe).
- **Mon apprentissage** : expérience inchangée, en-tête harmonisé.
- **Paramètres** : lignes avec action à droite.

## Limites et suites
- La palette sombre ne s'applique pas sur téléphone ni dans Student (choix délibéré, voir G2).
- Recherche sur les titres seulement ; pas de notifications (aucun système).
- Captures et tests réalisés avec des **données simulées** (`tests/fixtures/org-mock.js`) ; rien n'a été vérifié en
  production : la branche n'est pas déployée.
