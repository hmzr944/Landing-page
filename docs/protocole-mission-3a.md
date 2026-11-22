# Mission 3a : protocole de mesure pédagogique

**Statut (2026-11-22) :** seconde version, corrigée après la relecture du 2026-11-22. Les 20 sujets et les 3 procédures
sont validés. Le jeu de mesure (`docs/pedagogie/jeu-de-mesure.md`, version lisible de `jeu-de-mesure.json`), les grilles
(`docs/pedagogie/grille-reformulation.md`) et ce protocole sont **à valider avant toute mesure**. Le détail des
corrections est dans `docs/pedagogie/corrections-3a-2026-11-22.md`. Aucune modification du moteur pédagogique ; aucune
mesure lancée, ni technique ni avec des participants.

**But :** mesurer, avant toute modification du moteur, ce que l'explication actuelle d'Arbor permet réellement :
comprendre, reformuler avec ses mots, appliquer dans une situation différente, se débloquer. Le même protocole sert
de point de comparaison à la mission 3b.

**Règle de lecture :** les résultats techniques (partie A, automatiques puis contrôlés à la main) et les résultats
auprès de vrais apprenants (partie B) sont rapportés séparément. Une explication conforme au format n'est pas une
explication comprise. Si la partie B n'a pas lieu, ses résultats sont écrits « non mesuré », jamais estimés.

## 1. Le jeu de mesure (figé avant la mesure, versionné)
Fichier : `docs/pedagogie/jeu-de-mesure.json`, généré à partir de `sujets-1.json`, `sujets-2.json` et
`procedures.json`. Rien n'y est généré par Arbor : tout est écrit à l'avance, puis relu par vous.

**20 sujets pour débutants** (S01 à S20) et **3 procédures métier** du corpus n° 1 : ouverture et fermeture (R1 v2),
réception des livraisons (H1 v2), tenue de la caisse (R3).

Pour chaque élément (questions à 4 choix, ordre des choix mélangé avec une graine fixe) :
- 5 à 10 **termes techniques** à repérer (glossaire, pour A2) ;
- 3 **questions de compréhension immédiate** (B1), dont **au moins 2 d'application ou de compréhension** ;
- 1 **situation de transfert** (B3), différente de tout exemple du jeu, avec la réponse attendue ;
- 2 **questions de déblocage** (B4), préparées à l'avance : 1 d'application, 1 de compréhension ;
- 4 **questions de rappel à J+2** (B5) : 3 de restitution (mesure de mémorisation) et 1 d'application ;
- l'idée centrale et les 2 éléments clés de la **reformulation** (B2).

Chaque question porte un classement explicite (« evalue » : application, compréhension ou restitution), écrit dans
les sources et relu, jamais deviné par un programme. Les règles de composition sont vérifiées par
`tests/jeu-de-mesure.js` (contrôles A1 à A15).

**Biais connu, non corrigé dans cette version :** dans 167 questions sur 207, la bonne réponse est le choix le plus
long. Un participant qui choisit toujours la réponse la plus longue aurait un score élevé sans rien comprendre. Ce
défaut est à corriger (allonger ou préciser les mauvaises réponses) avant toute mesure ; voir le récapitulatif.

## 2. Partie A : mesures techniques
On mesure les trois chemins actuels : sujet libre sans compte (fiche Wikipédia, `course.js`), sujet libre avec le
serveur (`rediger_cours`), et le dialogue avec Pousse sur une notion. Chaque chemin qui appelle l'IA est joué 3 fois,
car les réponses varient. Les textes produits par Arbor sont enregistrés tels quels (ce ne sont pas des données de
participants).

### 2.1 Principe : un repère lexical n'est jamais une preuve
Chaque mesure a une **définition opérationnelle**, appliquée par une personne, et une **heuristique** automatique qui
ne fait qu'une pré-classification. Un mot (« imagine », « c'est-à-dire », « autrement dit ») ne prouve rien à lui
seul : seule la définition opérationnelle fait foi. L'heuristique n'est rapportée sur l'ensemble des textes que si le
contrôle manuel (2.3) montre qu'elle est fiable.

### 2.2 Définitions opérationnelles
| Mesure | Définition opérationnelle (fait foi) | Heuristique (pré-classification seulement) | Indicateur |
|---|---|---|---|
| **A1 Situation avant définition** | Une **situation** est un cas concret et identifiable : un acteur ou un objet de la vie courante, une action ou une quantité (« tu envoies une lettre à ta grand-mère », « 100 € placés à 5 % »), **lié à la notion** : l'explication qui suit s'y réfère ou s'en sert. Une **définition** est une phrase qui dit ce qu'est la notion en général, quels que soient les mots employés. A1 est vrai si la première situation vient avant la première définition. Ne compte pas comme situation : un exemple qui n'est qu'un nom ou une liste (« par exemple, les protocoles TCP et UDP »), ou une image qui n'est jamais reliée à la notion. | position du premier marqueur de situation (« imagine », « par exemple », « quand tu », un nombre) comparée au premier marqueur de définition (« est un », « désigne », « on appelle ») | % d'explications où une situation, au sens de la définition, précède la définition |
| **A2 Jargon non expliqué** | Un terme technique (du glossaire, ou repéré par l'annotateur comme inconnu d'un débutant) est **expliqué** si le texte en donne le sens avec des mots courants, à sa première apparition ou dans la phrase suivante. Ne comptent pas comme explication : un sigle simplement développé (« IP (Internet Protocol) »), un synonyme lui-même technique, une parenthèse qui ajoute un autre terme technique, un renvoi « on le verra plus loin ». | terme du glossaire sans connecteur explicatif (« c'est-à-dire », parenthèse, deux-points) dans la même phrase ou la suivante | nombre de termes non expliqués par explication ; objectif 0 |
| A3 Lisibilité | longueur moyenne des phrases ; % de phrases de plus de 25 mots ; score de Kandel et Moles | calcul direct (pas d'heuristique) | valeurs brutes |
| A4 Historique non demandé | phrase qui raconte l'origine ou l'histoire de la notion sans servir à la comprendre | année, « siècle », « inventé », « découvert par » | nombre par explication |
| A5 Vérification | au moins une question posée à l'apprenant qui demande d'utiliser la notion (pas « as-tu compris ? ») | phrase interrogative adressée à « tu » | oui ou non |
| **A6 Changement de méthode** | Scénario scripté : l'apprenant se trompe deux fois, ou dit ne pas comprendre. La réponse suivante est un **changement de méthode pertinent** si elle apporte un **contenu nouveau** (un exemple pas encore donné, une image ou comparaison, une décomposition en étapes, une question qui cherche l'origine de l'erreur, une autre représentation : chiffres, schéma décrit) **et** que ce contenu vise la confusion exprimée. Est une **répétition** : la même explication reformulée, le même exemple, un indice qui pointe vers la réponse, ou la réponse donnée directement. Un mot comme « imaginons » suivi du même contenu est une répétition. | part de noms nouveaux par rapport aux tours précédents, présence d'un marqueur d'exemple ou d'image | % de changements de méthode pertinents |

### 2.3 Contrôle manuel et journal des erreurs des heuristiques
- **Échantillon de 20 %** des explications pour A1 à A5 : tirage aléatoire stratifié par chemin et par élément, avec
  une graine fixée et publiée **avant** la production des textes. Pour A6, le volume est faible (23 éléments × 3
  passages) : **100 %** des réponses sont annotées.
- **Deux annotateurs indépendants**, qui ne voient pas la sortie de l'heuristique. Leur accord (pourcentage et kappa)
  est publié ; leurs désaccords sont tranchés ensemble pour former la **référence**. L'agent qui développe le moteur
  n'annote pas.
- **Journal des erreurs** (`docs/pedagogie/journal-heuristiques.md`, créé au moment de la mesure) : pour chaque texte de
  l'échantillon où l'heuristique diffère de la référence, une ligne avec le texte (identifiant), la mesure, la valeur
  de l'heuristique, celle de la référence, le type d'erreur (faux positif, faux négatif) et sa cause (marqueur sans
  contenu, exemple non relié, sigle développé compté comme explication…).
- **Rapport :** matrice de confusion, précision et rappel de chaque heuristique. **Règle de décision fixée à
  l'avance :** si la précision ou le rappel d'une heuristique est inférieur à 0,8, sa valeur sur l'ensemble des
  textes n'est pas publiée comme résultat ; seule la valeur de l'échantillon annoté est donnée, avec son intervalle
  de confiance. Les heuristiques ne sont pas corrigées après avoir vu les résultats de cette mesure.

## 3. Partie B : compréhension réelle (vrais apprenants)
- **Participants :** 5 à 8 débutants volontaires, extérieurs au projet, recrutés par le responsable produit, après
  consentement explicite (section 6). Ils sont désignés par un code (P01 à P08).
- **Matériel :** 4 sujets et 1 procédure par personne, répartis selon la section 4, avec l'explication actuelle
  d'Arbor.
- **Durée :** environ 30 minutes par personne, plus 5 minutes deux jours plus tard.

| Mesure | Comment | Note |
|---|---|---|
| B1 Compréhension immédiate | les 3 questions préparées, juste après l'explication | sur 3 |
| B2 Reformulation | « explique-le à un ami, avec tes mots », écrit ou oral transcrit, noté par **deux correcteurs indépendants, en aveugle**, avec `grille-reformulation.md` (partie 1) | sur 8, avec l'accord entre correcteurs : % d'accord exact et kappa pondéré quadratique, calculés sur les notes individuelles avant toute discussion |
| B3 Transfert | la situation nouvelle préparée à l'avance, réponse libre notée par les deux correcteurs | sur 2 |
| B4 Déblocage | si B1 < 2 sur 3 ou si la personne se dit bloquée : seconde explication d'Arbor (aujourd'hui, l'indice de Pousse), puis les 2 questions de déblocage préparées, chacune avec une phrase de justification | débloqué, partiellement débloqué ou non débloqué (`grille-reformulation.md`, partie 2) ; % de personnes débloquées |
| B5 Rappel à 2 jours | 4 questions : 3 de restitution (mémorisation) et 1 d'application | mémorisation sur 3 et application sur 1, rapportées séparément |
| B6 Ressenti (secondaire) | clarté perçue de 1 à 5, et mots non compris cités par la personne | brut |

**Analyse :** moyennes, médianes et dispersion par mesure. Avec moins de 10 personnes, aucun test statistique ne sera
présenté comme une preuve : on rapporte les écarts et leur variabilité.

## 4. Répartition des sujets entre 3a et 3b
But : qu'aucune personne ne voie deux fois le même sujet (effet d'apprentissage), et que l'ancien et le nouveau moteur
soient comparés sur des sujets, des domaines et des positions équilibrés.

1. **Deux moitiés de 10 sujets, de même composition par domaine**, fixées avant toute séance :
   - **Moitié 1 (mesure 3a, moteur actuel) :** S01, S07, S15, S11, S05, S03, S10, S18, S14, S19.
   - **Moitié 2 (mesure 3b, comparaison) :** S02, S08, S16, S12, S04, S09, S17, S13, S06, S20.

   | Domaine | Moitié 1 | Moitié 2 |
   |---|---|---|
   | informatique | S01, S03 | S02 |
   | mathématiques | S05 | S04, S06 |
   | sciences de la vie | S07, S10 | S08, S09 |
   | sciences de la Terre, physique | S11, S14 | S12, S13 |
   | économie, fiscalité, droit, hygiène | S15, S18, S19 | S16, S17, S20 |
2. **En 3a**, chaque personne voit 4 sujets consécutifs de la moitié 1 (liste circulaire ordonnée pour alterner les
   domaines) et 1 procédure, par rotation. Chaque sujet est vu 3 ou 4 fois.
3. **En 3b**, chaque personne voit 4 sujets **jamais vus** de la moitié 2 et les 2 procédures qu'elle n'a pas vues :
   la moitié avec le moteur actuel, la moitié avec le nouveau, **en alternance** (actuel, nouveau, actuel, nouveau
   pour les codes impairs ; l'inverse pour les codes pairs). Ainsi chaque sujet est expliqué par les deux moteurs selon
   les personnes, et aucun moteur n'est toujours présenté en premier. La personne ne sait pas quel moteur produit
   quelle explication.
4. **Comparaison retenue :** l'amélioration se juge **dans la mesure 3b**, chaque personne servant de propre témoin
   (moteur actuel contre nouveau, sur des sujets différents de difficulté équilibrée). La comparaison entre 3a
   (moitié 1) et 3b (moitié 2, moteur actuel) sert seulement à vérifier que le moteur actuel donne des résultats
   stables d'une moitié à l'autre ; elle ne prouve aucune amélioration.
5. **Table d'affectation**, fixée avant les séances (rotation déterministe, sans tirage après coup) :

   | Code | 3a : moteur actuel | 3b : moteur entre parenthèses |
   |---|---|---|
   | P01 | S01, S07, S15, S11 ; P-R1 | S02 (actuel), S08 (nouveau), S16 (actuel), S12 (nouveau) ; P-H1 (actuel), P-R3 (nouveau) |
   | P02 | S05, S03, S10, S18 ; P-H1 | S04 (nouveau), S09 (actuel), S17 (nouveau), S13 (actuel) ; P-R1 (nouveau), P-R3 (actuel) |
   | P03 | S14, S19, S01, S07 ; P-R3 | S06 (actuel), S20 (nouveau), S02 (actuel), S08 (nouveau) ; P-R1 (actuel), P-H1 (nouveau) |
   | P04 | S15, S11, S05, S03 ; P-R1 | S16 (nouveau), S12 (actuel), S04 (nouveau), S09 (actuel) ; P-H1 (nouveau), P-R3 (actuel) |
   | P05 | S10, S18, S14, S19 ; P-H1 | S17 (actuel), S13 (nouveau), S06 (actuel), S20 (nouveau) ; P-R1 (actuel), P-R3 (nouveau) |
   | P06 | S01, S07, S15, S11 ; P-R3 | S02 (nouveau), S08 (actuel), S16 (nouveau), S12 (actuel) ; P-R1 (nouveau), P-H1 (actuel) |
   | P07 | S05, S03, S10, S18 ; P-R1 | S04 (actuel), S09 (nouveau), S17 (actuel), S13 (nouveau) ; P-H1 (actuel), P-R3 (nouveau) |
   | P08 | S14, S19, S01, S07 ; P-H1 | S06 (nouveau), S20 (actuel), S02 (nouveau), S08 (actuel) ; P-R1 (nouveau), P-R3 (actuel) |

   Avec 8 personnes en 3b, 4 sujets sont vus 2 fois avec chaque moteur, les 6 autres 2 fois avec l'un et 1 fois avec
   l'autre. Avec moins de 8 personnes, les premiers codes sont utilisés dans l'ordre et le déséquilibre restant est
   publié. Si de nouvelles personnes participent à 3b, elles reçoivent les codes P09 et suivants, avec la même règle
   d'alternance sur la moitié 2.

## 5. Critères de sortie de la mission 3a
1. Jeu de mesure, grilles et protocole figés et validés par vous.
2. Script de la partie A reproductible, textes bruts d'Arbor enregistrés, et un test CI qui recalcule les résultats.
3. Contrôle manuel (2.3) réalisé, journal des erreurs des heuristiques publié.
4. Rapport de départ en deux parties séparées : technique, et apprenants (ou « non mesuré »).
5. Aucune modification du moteur pédagogique.

## 6. Données des participants
- **Consentement explicite, écrit**, recueilli avant la séance avec le formulaire de l'annexe A. Pas de consentement,
  pas de séance. La personne peut se retirer à tout moment, sans justification ; ses données sont alors supprimées,
  tant que les résultats n'ont pas été agrégés.
- **Minimisation :** sont collectés le code, les réponses aux questions, les reformulations et justifications, les
  durées, la clarté perçue. Ni nom, ni e-mail, ni âge, ni profession sur les feuilles de réponse. Les séances se font
  avec des comptes de test créés pour l'étude, jamais avec le compte personnel du participant ; ces comptes sont
  supprimés à la fin de la mesure.
- **Fournisseur d'IA :** ce que la personne tape dans le dialogue avec Pousse est envoyé au fournisseur d'IA d'Arbor
  pour produire la réponse. Le formulaire le dit, et la consigne demande de ne taper aucune information personnelle.
- **Stockage restreint et pseudonymisé, hors du dépôt Git :** les réponses brutes sont rangées dans un espace privé
  (dossier chiffré ou stockage privé) accessible seulement au responsable produit ; les correcteurs reçoivent des
  copies anonymisées (codes aléatoires, sans le code participant). **La clé de correspondance** (code ↔ identité et
  contact) est conservée séparément, par une personne qui ne corrige pas.
- **Durée de conservation :** la clé de correspondance et les coordonnées sont détruites à la fin de la séance de
  rappel de la mission 3b, ou au plus tard 6 mois après la première séance. Les réponses brutes pseudonymisées sont
  détruites 12 mois après la première séance. Chaque destruction est datée dans le rapport.
- **Dans le dépôt public, uniquement :** les résultats agrégés (moyennes, médianes, dispersion, accords entre
  correcteurs) et les notes numériques par code, sans aucun texte écrit par un participant ni caractéristique
  personnelle. **Jamais de réponse brute dans le dépôt.** Les copies d'exemple de la grille sont fabriquées.

### Annexe A : formulaire de consentement (proposition)
> **Étude sur la clarté des explications d'Arbor**
>
> Le but est de savoir si les explications d'Arbor aident vraiment à comprendre. **C'est Arbor qui est évalué, pas
> vous.**
>
> **Déroulement :** environ 30 minutes aujourd'hui (lire des explications, répondre à des questions, expliquer avec
> vos mots), puis 5 minutes dans deux jours.
>
> **Données recueillies :** vos réponses et vos explications écrites ou transcrites, les durées, votre avis sur la
> clarté. Vous êtes désigné par un code ; votre nom n'apparaît sur aucune réponse. Ce que vous tapez dans le dialogue
> avec l'assistant est envoyé au fournisseur d'intelligence artificielle d'Arbor pour produire la réponse : n'y tapez
> aucune information personnelle.
>
> **Qui y a accès :** le responsable de l'étude ; deux correcteurs qui ne voient que des réponses anonymisées.
>
> **Conservation :** le lien entre votre nom et votre code est détruit au plus tard 6 mois après la séance ; vos
> réponses, au plus tard 12 mois après. Seuls des résultats d'ensemble, sans vos textes, sont publiés.
>
> **Vos droits :** la participation est volontaire. Vous pouvez arrêter à tout moment, sans justification, et demander
> l'accès à vos réponses ou leur suppression en contactant : [contact du responsable, à compléter].
>
> ☐ J'accepte de participer et que mes réponses soient utilisées comme décrit ci-dessus.
> Date et signature :

## 7. Décisions attendues
- Valider ou modifier les corrections (récapitulatif joint).
- Correction du biais « réponse la plus longue » avant la mesure (proposé).
- Qui sont les deux correcteurs, les deux annotateurs de la partie A, et la personne qui garde la clé de
  correspondance.
- Espace de stockage privé retenu, et contact à indiquer sur le formulaire.
