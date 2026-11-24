# Mission 3a : protocole de mesure pédagogique

**Statut (2026-11-24) :** quatrième version, corrigée après les relectures du 2026-11-22, du 2026-11-23 et du 2026-11-24. Les 20 sujets et les 3 procédures
sont validés. Le jeu de mesure (`docs/pedagogie/jeu-de-mesure.md`, version lisible de `jeu-de-mesure.json`), les grilles
(`docs/pedagogie/grille-reformulation.md`) et ce protocole sont **à valider avant toute mesure**. Le détail des
corrections est dans `docs/pedagogie/corrections-3a-2026-11-22.md`, `docs/pedagogie/corrections-3a-2026-11-23.md` et `docs/pedagogie/corrections-3a-2026-11-24.md`. Aucune modification du moteur pédagogique ; aucune
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
- 2 **questions de déblocage** (B4), préparées à l'avance (sujets : 1 d'application, 1 de compréhension ; procédures :
  2 d'application), chacune avec ses critères de notation de la justification ;
- 4 **questions de rappel à J+2** (B5) : 3 de restitution (mesure de mémorisation) et 1 d'application ;
- l'idée centrale et les 2 éléments clés de la **reformulation** (B2).

Chaque question porte un classement explicite (« evalue » : application, compréhension ou restitution), écrit dans
les sources et relu, jamais deviné par un programme. Les règles de composition sont vérifiées par
`tests/jeu-de-mesure.js` (contrôles J1 à J32, nommés J pour ne pas les confondre avec les mesures A1 à A6 de la
partie A).

**Procédures métier :** chaque question, et chaque situation de transfert, cite la phrase de la procédure qui
justifie la bonne réponse ; un contrôle vérifie que la phrase existe mot pour mot dans la procédure. Aucune raison
non écrite dans la procédure n'est attendue : les questions « pourquoi » ont été remplacées par des questions
d'application.

**Biais de longueur, corrigé le 2026-11-23 :** la bonne réponse était le choix le plus long dans 167 questions sur
207. Les choix ont été réécrits : elle l'est maintenant dans 26 questions (12,6 %) et elle est la plus courte dans 49
(23,7 %), pour environ 25 % attendus au hasard. Des contrôles automatiques (J16 à J20) empêchent le biais de revenir,
ou de s'inverser. Le tableau « Bilan : longueur des réponses » de `jeu-de-mesure.md` donne les chiffres par bloc.

**Cohérence vérifiée automatiquement :** une question « pourquoi » est classée compréhension, une phrase à compléter
sans cas chiffré est classée restitution, une question de décision (« Que fais-tu ? ») est classée application ; 30
réponses chiffrées sont recalculées (calculs, seuils des procédures) ; aucune bonne réponse n'est répétée dans un même
élément (J21 à J29). Les critères de notation des transferts, les transferts chiffrés et la répartition 3a / 3b sont
aussi vérifiés (J30 à J32).

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
| B3 Transfert | la situation nouvelle préparée à l'avance, réponse libre, notée par les deux correcteurs en aveugle avec la grille commune (`grille-reformulation.md`, partie 2) : décision et raison écrites à l'avance pour chaque situation, avec un exemple de réponse à 2, 1 et 0 point | sur 2, avec l'accord entre correcteurs (% d'accord exact et kappa pondéré) |
| B4 Déblocage | si B1 < 2 sur 3 ou si la personne se dit bloquée, **après B2 et B3** : seconde explication d'Arbor (aujourd'hui, l'indice de Pousse), puis les 2 questions de déblocage préparées, chacune avec une phrase de justification | chaque question notée 0, 1 ou 2 avec ses critères écrits ; somme sur 4 : débloqué (3-4), partiellement (2), non débloqué (0-1) (`grille-reformulation.md`, partie 3) ; % de personnes débloquées |
| B5 Rappel à 2 jours | 4 questions : 3 de restitution (mémorisation) et 1 d'application | mémorisation sur 3 et application sur 1, rapportées séparément |
| B6 Ressenti (secondaire) | clarté perçue de 1 à 5, et mots non compris cités par la personne | brut |

**Analyse :** moyennes, médianes et dispersion par mesure. Avec moins de 10 personnes, aucun test statistique ne sera
présenté comme une preuve : on rapporte les écarts et leur variabilité.

## 4. Répartition des sujets entre 3a et 3b
But : qu'aucune personne ne voie deux fois le même sujet (effet d'apprentissage), et que l'ancien et le nouveau moteur
soient comparés sur des sujets, des domaines et des positions équilibrés.

1. **Deux moitiés de 10 sujets**, fixées avant toute séance, **équilibrées par grand domaine** (3 + 2 + 2 + 3 sujets
   de chaque côté) :
   - **Moitié 1 (mesure 3a, moteur actuel) :** S01, S07, S15, S11, S05, S03, S10, S18, S14, S20.
   - **Moitié 2 (mesure 3b, comparaison) :** S02, S08, S16, S12, S04, S09, S17, S13, S06, S19.

   | Grand domaine | Moitié 1 | Moitié 2 |
   |---|---|---|
   | informatique et mathématiques | 3 : S01, S03 (informatique) ; S05 (mathématiques) | 3 : S02 (informatique) ; S04, S06 (mathématiques) |
   | sciences de la vie | 2 : S07, S10 | 2 : S08, S09 |
   | sciences de la Terre, physique | 2 : S11, S14 | 2 : S12, S13 |
   | économie, droit, fiscalité, hygiène | 3 : S15 (économie), S18 (droit du travail), S20 (hygiène) | 3 : S16 (économie), S19 (droit, RGPD), S17 (fiscalité) |

   **L'équilibre est obtenu au niveau des grands domaines, pas des sous-domaines.** Il y a 3 sujets d'informatique et
   3 de mathématiques : chacun ne peut pas être coupé en deux parts égales. Les deux sous-domaines sont donc regroupés,
   et leurs écarts se compensent (informatique 2 contre 1, mathématiques 1 contre 2). De même, dans le dernier groupe,
   la fiscalité (S17) n'est que dans la moitié 2 et l'hygiène (S20) que dans la moitié 1. Ces écarts restants sont
   publiés avec les résultats, et les résultats seront aussi donnés par grand domaine.

   *Correction du 2026-11-24 :* S19 (RGPD) et S20 (chaîne du froid) ont été échangés entre les deux moitiés. Avant
   l'échange, les deux sujets de droit (S18, S19) étaient dans la moitié 1 et aucun dans la moitié 2. Les positions dans
   la table d'affectation ne changent pas, donc l'équilibre des moteurs et des positions reste le même.
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
   | P03 | S14, S20, S01, S07 ; P-R3 | S06 (actuel), S19 (nouveau), S02 (actuel), S08 (nouveau) ; P-R1 (actuel), P-H1 (nouveau) |
   | P04 | S15, S11, S05, S03 ; P-R1 | S16 (nouveau), S12 (actuel), S04 (nouveau), S09 (actuel) ; P-H1 (nouveau), P-R3 (actuel) |
   | P05 | S10, S18, S14, S20 ; P-H1 | S17 (actuel), S13 (nouveau), S06 (actuel), S19 (nouveau) ; P-R1 (actuel), P-R3 (nouveau) |
   | P06 | S01, S07, S15, S11 ; P-R3 | S02 (nouveau), S08 (actuel), S16 (nouveau), S12 (actuel) ; P-R1 (nouveau), P-H1 (actuel) |
   | P07 | S05, S03, S10, S18 ; P-R1 | S04 (actuel), S09 (nouveau), S17 (actuel), S13 (nouveau) ; P-H1 (actuel), P-R3 (nouveau) |
   | P08 | S14, S20, S01, S07 ; P-H1 | S06 (nouveau), S19 (actuel), S02 (nouveau), S08 (actuel) ; P-R1 (nouveau), P-R3 (actuel) |

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
  pas de séance.
- **Retrait et suppression : trois périodes, les mêmes dans ce protocole et dans le formulaire.**
  1. **Jusqu'à la date de regroupement des résultats** (inscrite sur le formulaire de chaque personne avant la séance,
     voir ci-dessous) : la personne peut arrêter ou se retirer sans justification. Toutes ses réponses sont supprimées
     et elle est exclue des résultats.
  2. **Après cette date, tant que la clé de correspondance existe** (au plus tard 6 mois après la première séance) :
     ses réponses brutes sont supprimées sur demande, mais les résultats d'ensemble déjà calculés ne sont pas refaits.
     Ils ne contiennent ni son nom ni ses textes.
  3. **Après la destruction de la clé** : plus personne ne peut relier des réponses à une personne. Aucune suppression
     ciblée n'est possible, et aucune n'est nécessaire, puisque les données ne permettent plus de l'identifier.
- **Date de regroupement des résultats :** pour la mesure 3a, **14 jours après la dernière séance de rappel à J+2** ;
  de même pour la mesure 3b. La date exacte est fixée avant la première séance et écrite sur chaque formulaire. Si la
  dernière séance est retardée, la date reste celle écrite sur le formulaire de chaque personne, jamais plus tôt.
- **Avant tout recrutement**, le responsable de l'étude complète ces champs ; tant qu'un champ est vide, le
  formulaire ne peut pas être distribué :
  - nom ou fonction du responsable de l'étude, et moyen de le contacter (adresse e-mail dédiée à l'étude de
    préférence, pas une adresse personnelle) ;
  - date de regroupement des résultats ;
  - espace de stockage privé retenu.

  Je ne remplis pas ces champs : ce sont des informations que seul le responsable du projet peut fournir.
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
> **Responsable de l'étude :** [nom ou fonction, à compléter avant toute distribution]
> **Contact :** [adresse e-mail dédiée à l'étude, à compléter avant toute distribution]
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
> **Vous retirer ou faire supprimer vos réponses :**
> - **jusqu'au [date de regroupement des résultats, à compléter]** : vous pouvez arrêter ou vous retirer sans
>   justification ; toutes vos réponses sont supprimées et ne comptent pas dans les résultats ;
> - **après cette date, et au plus tard 6 mois après la première séance de l'étude** : vos réponses sont supprimées sur demande, mais
>   les résultats d'ensemble déjà calculés (des moyennes, sans votre nom ni vos textes) ne sont pas refaits ;
> - **ensuite**, le lien entre votre nom et votre code est détruit : vos réponses ne peuvent plus être reliées à vous.
>
> **Conservation :** le lien entre votre nom et votre code est détruit au plus tard 6 mois après la première séance de
> l'étude ; vos réponses, au plus tard 12 mois après. Seuls des résultats d'ensemble, sans vos textes, sont publiés.
>
> **Vos droits :** la participation est volontaire. Pour toute question, ou pour accéder à vos réponses ou les faire
> supprimer dans les délais ci-dessus, écrivez au contact indiqué en haut de ce formulaire.
>
> ☐ J'accepte de participer et que mes réponses soient utilisées comme décrit ci-dessus.
> Code participant : ______ Date : ______ Signature :

## 7. Décisions attendues
- Valider ou modifier les corrections (récapitulatif joint).
- Valider les choix réécrits, les critères de déblocage et les appuis des procédures (récapitulatif du 2026-11-23).
- Qui sont les deux correcteurs, les deux annotateurs de la partie A, et la personne qui garde la clé de
  correspondance.
- Espace de stockage privé retenu, contact de l'étude et date de regroupement des résultats : les trois champs à
  compléter avant tout recrutement (section 6).
- Valider la grille du transfert (B3), les réponses attendues des procédures, la question S20 réécrite et l'échange
  S19 / S20 entre les moitiés (récapitulatif du 2026-11-24).
