# Mission 3b : proposition consolidée du moteur pédagogique

**Date :** 2026-11-24. **Statut :** proposition, **à valider avant tout code**.

**Entrées :**
- l'audit `docs/audit-moteur-pedagogique.md` (v53, commit `5be606a`) ;
- les quatre décisions du responsable produit, du 2026-11-24.

**Principe directeur :** ne plus demander à l'IA d'être pédagogue. C'est le **moteur** qui organise et contrôle
l'apprentissage : l'ordre des étapes, le niveau, le diagnostic, le changement de méthode, la preuve. L'IA peut
**produire** du contenu (une fiche), qui est **contrôlé** avant usage. Elle peut aussi **converser** (Pousse), en
complément. Elle ne **décide** jamais de la suite du parcours.

## 0. Rappel des décisions prises

| # | Décision | Conséquence pour la conception |
|---|---|---|
| 1 | Fiches humaines pour les 23 éléments de la mission 3a ; fiches générées puis contrôlées pour le reste ; une fiche qui échoue aux contrôles n'est pas utilisée comme support complet | un format de fiche unique, un **validateur** automatique, trois statuts de fiche |
| 2 | Sans compte : même philosophie (situation, explication adaptée, pratique, vérification) ; transparence pour un sujet sans fiche valide | le moteur tourne **entièrement dans le navigateur**, à partir de la fiche ; un **mode lecture** clairement signalé |
| 3 | Pousse garde un rôle de tuteur complémentaire ; le moteur fonctionne sans lui | aucune transition du parcours ne dépend d'une réponse de Pousse |
| 4 | Mastery (mémoire) et Evidence (application, transfert) ensemble dans Student, progressivement, sans casser Business | Evidence est lu côté Student sans modifier son code ; un état combiné ; Business inchangé |

## 1. La fiche pédagogique

### 1.1 Rôle
La fiche est la **donnée** dont le moteur a besoin pour enseigner une notion. Sans fiche valide, le moteur ne prétend
pas enseigner (voir 3.3). Une fiche est indépendante de l'apprenant : la même fiche sert à tout le monde, et c'est le
moteur qui choisit quoi en montrer.

### 1.2 Contenu (format v1)

| Bloc | Contenu | Obligatoire |
|---|---|---|
| `meta` | identifiant, notion, version, langue, **statut** (`reference`, `generee_validee`, `rejetee`), date, origine (humaine, serveur, IA locale) | oui |
| `sources` | sources utilisées : titre, adresse, licence, et l'extrait exact qui appuie chaque affirmation | oui (sauf fiche `reference`, où la relecture humaine en tient lieu) |
| `prerequis` | 0 à 3 notions préalables, chacune avec **une question de vérification** | non |
| `situation` | un cas concret et familier, qui pose le problème **sans nommer la notion**, et une **question d'ouverture** (prédiction : « que va-t-il se passer ? »), jamais notée | oui |
| `explication` | deux niveaux, `simple` et `standard`. Chacun **reprend la situation** (`ancre_situation`) avant de généraliser, puis donne l'idée centrale | oui, les deux |
| `idee_centrale`, `elements_cles` | comme dans le jeu de mesure (une phrase, deux éléments) | oui |
| `representations` | **au moins 3** autres façons d'expliquer, de types différents : `exemple`, `etapes`, `analogie` (avec sa **limite**, obligatoire), `contre_exemple`, `schema` (décrit en texte) | oui, au moins 3 de 2 types |
| `confusions` | 1 à 3 confusions typiques. Chacune a un libellé, une description, la **représentation qui y remédie** et une **question de contrôle** qui lui est propre | oui, au moins 1 |
| `questions` | voir 1.3 | oui |
| `glossaire` | 5 à 10 termes, chacun avec une explication en mots courants | oui |

### 1.3 Questions de la fiche

Elles suivent la classification validée pour la mission 3a : application, compréhension, restitution.

| Ensemble | Nombre | Règle |
|---|---|---|
| `comprehension` | 3 | au moins 2 qui ne sont pas de la restitution |
| `application` | 2 | cas concret nouveau |
| `transfert` | 1 ou 2 | même notion, **autre contexte** que la situation et l'explication |
| `rappel` | 3 | restitution (pour la révision espacée) |
| `controle_confusion` | 1 par confusion | elle révèle cette confusion précise |

**Chaque mauvaise réponse peut porter l'identifiant d'une confusion.** C'est la clé du diagnostic sans IA : choisir
ce distracteur, c'est montrer cette confusion. Exemple : dans S20, choisir « Le froid tue toutes les bactéries » révèle
la confusion `froid_tue`.

**Séparation avec la mesure (règle impérative).**
- Les questions d'une fiche ne doivent **jamais** reprendre les questions du jeu de mesure de la mission 3a, sinon
  la mesure 3b serait faussée : on testerait l'apprenant sur ce qu'il vient de pratiquer.
- La même règle vaut pour les situations de transfert du jeu de mesure.
- Un contrôle automatique compare les énoncés et refuse toute reprise.

### 1.4 Validateur (contrôles automatiques)

Une fiche n'est utilisable comme parcours complet que si **tous** les contrôles bloquants passent.

| Contrôle | Bloquant | Ce qu'il vérifie |
|---|---|---|
| Forme | oui | blocs obligatoires, nombres, types |
| Ordre | oui | la situation ne contient ni le nom de la notion ni sa définition ; chaque explication reprend la situation (`ancre_situation` non vide et présent dans le texte) |
| Confusions | oui | chaque confusion a sa représentation de remède (qui existe) et sa question de contrôle ; au moins un distracteur porte chaque confusion |
| Représentations | oui | au moins 3, de 2 types ; une analogie a toujours sa limite |
| Questions | oui | règles de composition (1.3) ; 4 choix distincts ; règles de classement (« pourquoi » = compréhension, etc.) |
| Biais de longueur | oui | mêmes seuils que J16 à J20 |
| Séparation avec la mesure | oui | aucune question ni situation reprise du jeu de mesure 3a |
| Sources (fiches générées) | oui | chaque affirmation de l'explication et des bonnes réponses est appuyée par un extrait source : même méthode que la génération actuelle (part des mots porteurs de sens présents dans la source) |
| Lisibilité | non (avertissement) | longueur des phrases, termes du glossaire expliqués |

**Limite à dire clairement :** le validateur garantit la **structure** et l'**ancrage dans les sources**, pas la
**justesse pédagogique**.
- Une situation peut être bien formée et mal choisie.
- Une confusion peut être réelle mais secondaire.

C'est pourquoi les 23 fiches de référence sont relues par un humain, et que la mesure 3a/3b reste l'arbitre.

### 1.5 Origine des fiches

| Origine | Où elle est produite | Statut si les contrôles passent | Statut sinon |
|---|---|---|---|
| Humaine (23 éléments de la mission 3a) | écrite dans le dépôt, relue et validée par vous | `reference` | non publiée tant qu'elle échoue |
| Serveur (avec compte) | génération à partir des sources (Wikipédia, Wikilivres, Wikiversité), puis validateur | `generee_validee` | `rejetee` : mode lecture |
| IA locale (sans compte) | même consigne, même validateur, dans le navigateur | `generee_validee` | `rejetee` : mode lecture |

Une génération qui échoue peut être **relancée une fois**. Au-delà, le sujet passe en mode lecture, avec le motif du
refus enregistré.

## 2. Le moteur de séquence

### 2.1 Un module sans interface, testable seul
Le moteur est une **fonction pure** : `état + événement → nouvel état + actions à afficher`.
- Il ne connaît ni l'interface, ni le réseau, ni l'IA.
- Toutes les règles ci-dessous y sont codées et testées. Aucune n'est confiée à une consigne de modèle.

### 2.2 Les phases d'une séance sur une notion

| Phase | Ce que voit l'apprenant | Ce qui est noté |
|---|---|---|
| P0 Prérequis (si la fiche en a) | une question par prérequis | non noté ; un prérequis manqué fait proposer de le revoir d'abord |
| P1 Situation | le cas concret et la question d'ouverture | jamais noté (une prédiction fausse est normale) |
| P2 Explication | le niveau choisi (2.3), qui reprend la situation | — |
| P3 Compréhension | 2 ou 3 questions de compréhension | oui ; diagnostic (2.4) |
| P4 Pratique | 1 ou 2 questions d'application | oui ; diagnostic |
| P5 Clôture | résumé (idée centrale, éléments clés) ; rappel programmé ; transfert annoncé pour plus tard | — |
| Plus tard | rappels espacés (FSRS, inchangé) ; question de transfert à la première révision après au moins 2 jours | oui ; preuve (section 4) |

**Invariant testé :** P1 vient toujours avant P2. P2 vient toujours avant toute question notée.

### 2.3 Choix du niveau d'explication
- **Par défaut :** le niveau `standard`.
- **`simple` d'emblée si :**
  - un prérequis est manqué en P0 ;
  - ou l'apprenant a choisi « je découvre ce domaine » (réglage local, sans compte).
- **Bascule en cours de séance :** voir la règle R3.
- **Le niveau est montré** (« explication simple ») et peut être changé par l'apprenant.

C'est une adaptation **simple et explicable**, sans « profil » caché.

### 2.4 Diagnostic, sans IA
À chaque réponse fausse :
- si le distracteur choisi porte une confusion, c'est la **confusion détectée** ;
- sinon, c'est une **erreur non diagnostiquée**.

Le diagnostic est donc **déterministe et vérifiable** : il dépend de la fiche, pas d'un jugement du modèle. Pousse peut
proposer une confusion dans une réponse libre, mais elle est enregistrée comme « proposée par Pousse », pas comme
détectée.

### 2.5 Règles de remédiation

Elles s'appliquent par notion et par séance. Ce sont des règles fixes, dans cet ordre de priorité.

| Règle | Déclencheur | Action |
|---|---|---|
| R1 Confusion | confusion C détectée | montrer la représentation qui remédie à C, puis la question de contrôle de C. Si elle est réussie, C est « levée pour cette séance ». |
| R2 Changement de méthode | 2 erreurs non diagnostiquées sur la notion, ou échec de la question de contrôle de R1 | montrer une représentation **pas encore vue**, d'un **autre type** que la dernière (ordre par défaut : exemple, étapes, analogie, contre-exemple), puis une question **nouvelle** de la même phase |
| R3 Niveau | en niveau `standard`, une remédiation R1 ou R2 a déjà eu lieu et une nouvelle erreur survient | passer en niveau `simple` et le dire |
| R4 Sortie de boucle | 3 remédiations dans la séance, ou plus aucune représentation ni question nouvelle | arrêter la pratique sur cette notion ; état « bloqué pour aujourd'hui » ; proposer : revoir un prérequis, en parler à Pousse (avec compte), ou y revenir plus tard ; révision rapprochée programmée |

**Garanties testées :**
- jamais deux fois la même représentation dans une séance ;
- jamais la même question deux fois ;
- au plus 3 remédiations ;
- la séance se termine toujours.

### 2.6 Rôle de Pousse
- Boutons, avec compte : « Explique autrement », « Donne-moi un exemple », « Mets-moi en situation ».
- Pousse reçoit la fiche (situation, explication, représentations déjà vues, confusion détectée), en plus des
  passages sources. Il garde les règles actuelles : citations vérifiées, pistes plutôt que réponses.
- **Ce que Pousse ne fait pas :** passer à la phase suivante, noter une question du moteur, changer l'état d'une
  notion. Une mise en situation réussie avec Pousse est enregistrée comme preuve **jugée par l'IA**, distincte des
  preuves du moteur (section 4).

## 3. Le parcours sans compte

### 3.1 Principe
La qualité pédagogique est la même avec ou sans compte : le moteur, les fiches et le diagnostic tournent dans le
navigateur. Le compte apporte :
- Pousse ;
- la génération de fiches par le serveur ;
- la reprise sur un autre appareil.

**Précision importante :** dans Student, les cours et la progression sont déjà enregistrés **sur l'appareil**, avec ou
sans compte. Sans compte, la persistance locale reste donc la même qu'aujourd'hui. Ce qui manque, c'est
l'enregistrement en ligne.

### 3.2 D'où vient la fiche, selon le cas

| Sujet | Sans compte | Avec compte |
|---|---|---|
| Un des 23 éléments de référence | fiche `reference`, livrée avec l'application (fonctionne hors ligne) | idem |
| Autre sujet, IA locale disponible | fiche générée dans le navigateur, puis validateur | serveur (ou IA locale) |
| Autre sujet, sans IA locale | **mode lecture** (3.3) | génération par le serveur, puis validateur |

### 3.3 Le mode lecture, transparent
Quand aucune fiche valide n'existe, Arbor l'affiche clairement : « Fiche de lecture : Arbor n'a pas encore de parcours
complet pour ce sujet. »
- **Ce qui reste proposé :** la fiche de lecture actuelle, puis le **rappel espacé** et les questions de la révision.
- **Ce qui n'est pas proposé :** situation, explications de rechange, diagnostic. Arbor ne prétend pas les offrir.

## 4. Mastery et Evidence dans Student

### 4.1 Deux questions distinctes

| Couche | Question | Source | Changement |
|---|---|---|---|
| **Mastery** (inchangée) | s'en souvient-il durablement ? | FSRS et rappels espacés (`mastery.js`, `srs.js`) | aucun |
| **Evidence** (nouvelle dans Student) | sait-il l'appliquer, et la transférer ? | journal des observations (`db.js`), lu par `evidence.js` **sans le modifier** | une table de correspondance entre activités Student et niveaux de preuve |

### 4.2 Correspondance des activités et des niveaux de preuve

| Activité Student | Niveau si juste | Commentaire |
|---|---|---|
| Question de compréhension, question de rappel à choix | 2 reconnue | QCM |
| Rappel tapé et juste, ou rappel coché | 3 restituée | comme aujourd'hui |
| Question d'application du moteur (choix) | 3 restituée, **plafonnée** | choisir la bonne décision n'est pas encore l'appliquer : prudence volontaire |
| Application avec justification juste, ou mise en situation jugée par Pousse | 4 appliquée | la preuve « jugée par l'IA » est signalée comme telle |
| Transfert juste dans un contexte différent | contexte compté pour le niveau 6 | `evidence.js` exige déjà 2 contextes différents |

**Choix à valider (Q2) :** compter une question d'application à choix comme niveau 3, et non 4. C'est plus strict que
ce qu'on pourrait vouloir, mais c'est honnête.

### 4.3 État affiché d'une notion

| État | Condition |
|---|---|
| **Maîtrisée** | Mastery « maîtrisée » **et** Evidence ≥ 4 (appliquée) |
| **Mémorisée, pas encore appliquée** | Mastery « maîtrisée », Evidence < 4 : le moteur propose une application ou un transfert |
| autres états | inchangés (non étudiée, découverte, en apprentissage, fragile, à réviser) |

**Conséquence pour les données existantes :** une notion aujourd'hui « maîtrisée » par les seuls rappels deviendra
« Mémorisée, pas encore appliquée ».
- Aucune donnée n'est perdue : c'est une lecture plus exigeante.
- Un message l'explique une fois.
- Décision à confirmer (Q3).

### 4.4 Business
- `evidence.js` et `adaptive.js` ne sont **pas modifiés**.
- Student les **lit** à travers une table de correspondance qui lui est propre.
- Les suites de tests `org-*` doivent rester vertes sans changement.

## 5. Événements enregistrés

### 5.1 Règles
- Les événements sont enregistrés dans le journal local existant (`db.js`).
- Ils sont envoyés au serveur **seulement** avec un compte, et seulement pour la reprise.
- **Aucun texte libre de l'apprenant** n'est enregistré par le moteur : seulement des identifiants (question, choix,
  confusion, représentation). Les réponses libres données à Pousse ne sont pas conservées, comme aujourd'hui.
- Pour la mesure 3a/3b, les données des participants suivent le protocole (stockage restreint, hors du dépôt).

### 5.2 Liste

| Événement | Champs | Sert à |
|---|---|---|
| `seance_debut` | notion, fiche (id, version, statut), mode (`complet` ou `lecture`), niveau | savoir ce qui a été montré |
| `phase` | phase (P0 à P5), représentation éventuelle | mesure A1 (situation avant définition), par construction |
| `reponse` | question, phase, classement (application, compréhension, restitution), choix, juste ou non, confusion éventuelle, indice, durée | preuve, diagnostic |
| `confusion` | confusion, origine (`distracteur` ou `pousse`) | état « fragile » (comme aujourd'hui) |
| `remediation` | règle (R1 à R4), représentation quittée, représentation montrée | mesure A6 (changement de méthode) |
| `niveau` | ancien niveau, nouveau, cause (choix de l'apprenant ou R3) | mesure de l'adaptation |
| `bloque` | notion, nombre de remédiations | suivi des blocages |
| `seance_fin` | issue (terminée, bloquée, abandonnée), durées | progression |
| `pousse` | type de demande (autre explication, exemple, situation) | rôle réel de Pousse |

## 6. Critères d'acceptation et tests

### 6.1 Techniques (CI)

| Domaine | Tests |
|---|---|
| Validateur | des fiches valides et invalides de chaque sorte, et des tests de mutation (comme J16 à J32) ; les 23 fiches de référence passent |
| Moteur de séquence | tests de propriétés sur des milliers de parcours simulés : ordre des phases ; jamais deux fois la même représentation ni la même question ; au plus 3 remédiations ; la séance se termine toujours ; R1 à R4 déclenchées exactement par leur déclencheur |
| Diagnostic | un distracteur portant une confusion entraîne R1 ; un distracteur sans confusion n'invente rien |
| Evidence et Mastery | table de correspondance ; état combiné ; une notion maîtrisée par les rappels seuls n'est pas « Maîtrisée » |
| Non-régression | toutes les suites actuelles (Student, Business, serveur, base) passent sans modification de leurs attendus, sauf ceux de l'état « Maîtrisée », listés et validés à part |
| Navigateur | sans compte : un sujet de référence parcouru de la situation à la clôture ; un sujet sans fiche affiché en mode lecture, avec la mention |
| Données | export et import de la sauvegarde avec les nouveaux champs ; ancienne sauvegarde relue sans perte |

### 6.2 Pédagogiques (hors CI)
- **Par construction, vérifiables dès la mise en place :**
  - A1 « situation avant définition » = 100 % des séances en mode complet ;
  - A6 « changement de méthode » = 100 % des cas qui répondent aux déclencheurs R1 et R2.
- **Par la mesure :** comparaison avec le protocole 3a, dans les conditions prévues (moteurs alternés, sujets de la
  moitié 2).
  - **À fixer avant la mesure, pas après :** les seuils de succès sur B1 (compréhension), B3 (transfert), B4
    (déblocage) et B5 (rappel à J+2).
  - **Réserve :** l'étalonnage n'a pas eu lieu, donc B2, B3 et B4 restent des notes non étalonnées.
- **Une CI verte ne valide rien de pédagogique.**

## 7. Plan de migration : étapes indépendantes

Chaque étape :
- a sa branche et son rapport en 7 sections ;
- est fusionnée seulement après votre validation ;
- est désactivable : un **interrupteur** de fonctionnalité garde le comportement v53 tant qu'il n'est pas activé.

| Étape | Contenu | Touche à l'interface ? | Dépend de |
|---|---|---|---|
| **3b-0** | Format de fiche v1 et validateur, en module pur, avec ses tests | non | — |
| **3b-1** | Les 23 fiches de référence, puis votre relecture pédagogique | non | 3b-0 |
| **3b-2** | Moteur de séquence, diagnostic et remédiation, en module pur, avec tests de propriétés | non | 3b-0 |
| **3b-3** | Lecteur de séance (interface), derrière l'interrupteur ; l'ancienne leçon reste pour les notions sans fiche | oui | 3b-1, 3b-2 |
| **3b-4** | Événements, et Evidence lu dans Student ; nouvel état affiché derrière l'interrupteur | oui | 3b-2 |
| **3b-5** | Génération de fiches (serveur et IA locale), validateur, mode lecture | oui | 3b-0 |
| **3b-6** | Pousse repositionné (boutons, contexte de la fiche, preuves « jugées par l'IA ») | oui | 3b-3 |
| **3b-7** | Mesure comparative 3a/3b avec des participants, selon le protocole | — | 3b-3, mesure 3a |

**Compatibilité des données.** Tout est **ajouté** :
- nouveaux champs ;
- fiches stockées à part ;
- nouveaux événements.

Les cours, les cartes FSRS et le journal existants ne sont ni modifiés ni migrés. Revenir en arrière consiste à couper
l'interrupteur.

**Ordre conseillé :**
- 3b-0, 3b-2 et 3b-1 en parallèle : le moteur peut être testé sur des fiches d'essai pendant que les 23 fiches sont
  écrites.
- Puis 3b-3 et 3b-4. La génération (3b-5) vient ensuite : elle n'est utile qu'une fois le parcours prouvé sur les
  fiches de référence.

## 8. Questions à trancher avant 3b-0

| # | Question | Ma recommandation |
|---|---|---|
| Q1 | Génération de fiches par le serveur **sans compte** ? Et partage des fiches validées entre utilisateurs (catalogue public, sans aucun lien avec qui a demandé le sujet) ? | Pas de génération anonyme pour l'instant (coût, abus). Un catalogue public de fiches validées, plus tard, après 3b-5. |
| Q2 | Une question d'application à choix compte comme niveau 3 (restituée) et non 4 ? | Oui, par prudence. |
| Q3 | Les notions « maîtrisées » par les seuls rappels deviennent « Mémorisées, pas encore appliquées » ? | Oui, avec un message explicatif unique. |
| Q4 | Qui relit pédagogiquement les 23 fiches de référence ? | Vous, sur des fiches que j'écris à partir du jeu de mesure validé, sans en reprendre les questions. |
| Q5 | La mesure 3a de référence (v53, avec participants) doit-elle précéder le développement de 3b ? | Non : 3b-0 à 3b-2 n'ont pas d'interface et peuvent avancer. Mais la mesure 3a doit avoir lieu **avant** que 3b soit activé pour qui que ce soit. |
| Q6 | Réponses libres (expliquer, justifier) sans compte : non notées ? | Oui : sans compte, le moteur ne note que des choix. La justification est demandée pour l'apprentissage, sans être notée. |

## 9. Ce que cette proposition ne promet pas
- **Pas d'adaptation fine** à chaque apprenant : deux niveaux d'explication et des règles explicables.
- **Pas de garantie de justesse** d'une fiche générée : la structure et les sources sont contrôlées, le fond ne l'est
  pas. C'est pourquoi les fiches de référence sont humaines et que le mode lecture existe.
- **Pas de preuve d'efficacité** avant la mesure 3a/3b.
