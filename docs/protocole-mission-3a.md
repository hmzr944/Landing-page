# Mission 3a : protocole de mesure pédagogique

**Statut (2026-11-22) :** les 20 sujets et les 3 procédures sont validés. Le jeu de mesure complet
(`docs/pedagogie/jeu-de-mesure.md`, version lisible de `jeu-de-mesure.json`) et la grille de reformulation
(`docs/pedagogie/grille-reformulation.md`) sont **à relire et valider avant toute mesure**. Aucune modification du moteur
pédagogique.

**But :** mesurer, avant toute modification du moteur, ce que l'explication actuelle d'Arbor permet réellement :
comprendre, reformuler avec ses mots, appliquer dans une situation différente. Ce protocole sera rejoué à
l'identique après la mission 3b. Une amélioration ne sera annoncée que si elle apparaît dans les deux mesures.

**Règle de lecture :** les résultats techniques (partie A, automatiques) et les résultats auprès de vrais apprenants
(partie B) sont rapportés séparément. Une explication conforme au format n'est pas une explication comprise. Si la
partie B n'a pas lieu, ses résultats sont écrits « non mesuré », jamais estimés.

## 1. Le jeu de mesure (figé avant la mesure, versionné)
Fichier prévu : `docs/pedagogie/jeu-de-mesure.json`. Rien n'y est généré par Arbor : tout est écrit à l'avance, puis
relu par vous.

**20 sujets pour débutants**, variés, sans prérequis :

| # | Sujet | # | Sujet |
|---|---|---|---|
| 1 | Le protocole IP | 11 | Le contrat de travail |
| 2 | La photosynthèse | 12 | La TVA |
| 3 | L'inflation | 13 | Les intérêts composés |
| 4 | Le théorème de Pythagore | 14 | Le RGPD |
| 5 | Le cycle de l'eau | 15 | La chaîne du froid |
| 6 | Le système immunitaire | 16 | L'effet de serre |
| 7 | Les fractions | 17 | L'ADN |
| 8 | Tension et intensité électriques | 18 | La gravitation |
| 9 | Le chiffrement d'un message | 19 | Le vaccin |
| 10 | L'offre et la demande | 20 | La mémoire de l'ordinateur (RAM) |

**3 procédures métier** du corpus n° 1 : ouverture et fermeture (R1 v2), réception des livraisons (H1 v2), tenue de
la caisse (R3).

Pour chaque sujet et chaque procédure, le fichier contient (questions à 4 choix, ordre des choix mélangé avec une graine fixe pour qu'aucune position ne soit toujours la bonne) :
- 5 à 10 **termes techniques** à repérer (pour la mesure du jargon) ;
- 3 **questions de compréhension**, avec leurs réponses ;
- 1 **situation de transfert**, différente de tout exemple qu'Arbor pourrait donner, avec la réponse attendue ;
- 3 **questions de rappel**, posées 2 jours plus tard, différentes des premières ;
- la **grille de reformulation** (voir B2).

## 2. Partie A : mesures techniques (automatiques, sans juge IA)
On mesure les trois chemins actuels : sujet libre sans compte (fiche Wikipédia, `course.js`), sujet libre avec le
serveur (`rediger_cours`), et le dialogue avec Pousse sur une notion. Chaque chemin qui appelle l'IA est joué 3 fois,
car les réponses varient.

| Mesure | Définition opérationnelle | Indicateur |
|---|---|---|
| A1 Situation avant définition | position du premier marqueur de situation (« imagine », « par exemple », « quand tu », un cas chiffré) comparée au premier marqueur de définition (« est un », « désigne », « on appelle », « se définit ») | % d'explications où la situation vient d'abord |
| A2 Jargon non expliqué | terme du glossaire employé sans explication dans la même phrase ou la suivante (« c'est-à-dire », « autrement dit », parenthèse, deux-points) | nombre par explication, objectif 0 |
| A3 Lisibilité | longueur moyenne des phrases ; % de phrases de plus de 25 mots ; score de lisibilité adapté au français (Kandel et Moles) | valeurs brutes |
| A4 Historique non demandé | phrases avec une année, « siècle », « inventé », « découvert par », « histoire » | nombre par explication |
| A5 Vérification | présence d'au moins une question qui fait vérifier la compréhension | oui ou non |
| A6 Changement de méthode | scénario scripté : l'apprenant se trompe deux fois, ou exprime une confusion ; la réponse suivante change-t-elle de méthode (nouvel exemple, image, étapes) ou répète-t-elle un indice ? | % de changements de méthode |

**Limite déclarée :** ces repérages sont des heuristiques. Pour connaître leur fiabilité, 20 % des explications
seront aussi annotées à la main par deux personnes, et l'accord entre heuristique et annotation sera publié.

## 3. Partie B : compréhension réelle (vrais apprenants)
- **Participants :** 5 à 8 débutants volontaires, extérieurs au projet, recrutés par le responsable produit, avec leur
  consentement. Ils sont pseudonymisés, et aucune donnée nominative n'est enregistrée.
- **Matériel :** 4 sujets tirés au sort parmi les 20, et 1 procédure, avec l'explication actuelle d'Arbor.
- **Durée :** environ 25 minutes par personne, plus 5 minutes deux jours plus tard.

| Mesure | Comment | Note |
|---|---|---|
| B1 Compréhension immédiate | les 3 questions préparées, juste après l'explication | sur 3 |
| B2 Reformulation | « explique-le à un ami, avec tes mots », écrit ou oral transcrit, notée par **deux correcteurs indépendants, en aveugle** (sans savoir quelle version du moteur la personne a vue), avec la grille commune `docs/pedagogie/grille-reformulation.md` | sur 4, avec l'accord entre correcteurs (pourcentage et kappa) publié avant toute discussion |
| B3 Transfert | la situation nouvelle préparée à l'avance | sur 2 |
| B4 Déblocage | si B1 donne moins de 2 sur 3 : seconde explication d'Arbor (aujourd'hui, l'indice de Pousse), puis 2 nouvelles questions | % de personnes débloquées |
| B5 Rappel à 2 jours | 3 questions différentes de B1 | sur 3 |
| B6 Ressenti (secondaire) | clarté perçue de 1 à 5, et mots non compris cités par la personne | brut |

**Analyse :** moyennes, médianes et dispersion par mesure. Avec moins de 10 personnes, aucun test statistique ne sera
présenté comme une preuve : on rapporte les écarts et leur variabilité. Pour la mission 3b, le même protocole
comparera l'ancien et le nouveau moteur, présentés dans un ordre alterné d'une personne à l'autre.

## 4. Critères de sortie de la mission 3a
1. Jeu de mesure figé et validé par vous.
2. Script de la partie A reproductible, avec les réponses brutes enregistrées, et un test CI qui recalcule les
   résultats, comme pour le banc d'essai de l'extraction.
3. Rapport de départ en deux parties séparées : technique, et apprenants (ou « non mesuré »).
4. Aucune modification du moteur pédagogique.

## 5. Décisions attendues
- Valider ou modifier la liste des 20 sujets.
- Qui recrute les participants, et qui sont les deux correcteurs de la reformulation.
- Accord pour enregistrer les réponses écrites des participants, pseudonymisées, dans le dépôt, ou seulement les
  notes.
