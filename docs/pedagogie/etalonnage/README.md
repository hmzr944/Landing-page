# Exercice d'étalonnage des correcteurs (mission 3a)

**But :** vérifier, avant toute mesure avec des participants, que deux correcteurs indépendants appliquent les grilles
B2 (reformulation), B3 (transfert) et B4 (déblocage) de la même façon.

**Règles de l'exercice :**
- Toutes les réponses sont **fabriquées** : aucune donnée de participant.
- Rien n'est mesuré tant que deux personnes n'ont pas noté. Je n'ai simulé aucune note.
- Les grilles, le jeu de mesure et le protocole de la version `523f730` ne sont **pas modifiés** (contrôle E20). Les
  améliorations possibles sont proposées à part, dans `propositions-clarification.md`.

## Contenu du dossier

| Fichier | Pour qui | Contenu |
|---|---|---|
| `copie-correcteur-A.md`, `copie-correcteur-B.md` | chaque correcteur, **la sienne seulement** | les 47 réponses, dans un ordre propre à chaque copie, avec le matériel de la grille (attendus du jeu de mesure) |
| `feuille-correcteur-A.csv`, `feuille-correcteur-B.csv` | chaque correcteur, **la sienne seulement** | feuille de notes vide : une ligne par code |
| `reponses-fictives.js` | coordinateur seulement | **la clé** : types de réponses, notes prévues par le concepteur, raisons, cas limites |
| `etalonnage.js`, `generer.js`, `rapport.js` | coordinateur | génération des copies, calcul de l'accord, rapport |
| `rapport-etalonnage.md` | coordinateur, puis vous | rapport ; « NON MESURÉ » tant que les feuilles ne sont pas rendues |
| `propositions-clarification.md` | vous | points de grille jugés ambigus, avec une proposition pour chacun, **non appliqués** |

**Les correcteurs ne doivent pas avoir accès à ce dossier, ni à la branche.** La clé, la raison de chaque réponse et
le rapport y sont lisibles. Le coordinateur leur remet seulement trois documents, sous forme de fichiers ou
imprimés :
- `grille-reformulation.md` ;
- leur copie ;
- leur feuille.

Les codes des réponses (« E-7GJ9 ») ne révèlent ni la grille, ni le numéro, ni le type de réponse.

## Déroulement

1. **Coordinateur :** une personne qui n'est pas correcteur, par exemple celle qui gardera la clé de correspondance
   de la mission 3a. Les correcteurs sont les deux personnes prévues pour la mesure. Leurs noms ne sont écrits nulle
   part dans le dépôt : on parle seulement de « correcteur A » et « correcteur B ».
2. **Étalonnage à blanc :** chaque correcteur lit la grille et note seul les copies d'ancrage de son annexe A. Il
   compare ensuite ses notes aux notes données dans l'annexe. Il ne discute pas encore avec l'autre correcteur.
3. **Notation :** chacun note les 47 réponses de sa copie, seul, sans échanger. Comptez environ 1 h 30.
   - En cas de doute entre deux notes, il met la plus basse.
   - Il écrit le critère concerné dans la colonne `hesitation` (par exemple `C4`, `B3`, `Q2`, ou `C2;C4`).
   - La colonne `commentaire` est libre.
4. **Remise et gel :** le coordinateur enregistre les deux feuilles telles quelles sous
   `notes/notes-correcteur-A.csv` et `notes/notes-correcteur-B.csv`, puis les enregistre dans le dépôt **avant toute
   discussion**. Le rapport affiche l'empreinte SHA-256 de chaque feuille, qui prouve qu'elle n'a pas changé ensuite.
5. **Calcul :** `node docs/pedagogie/etalonnage/rapport.js` donne :
   - les notes des deux correcteurs ;
   - le pourcentage d'accord exact et le kappa pondéré quadratique, avec leur intervalle de confiance : pour B2 sur
     C1, C2, C3, C4 et le total ; pour B3 sur la note ; pour B4 sur Q1, Q2 et la décision ;
   - les désaccords par critère et les réponses qui ont le plus fait hésiter.

   Une feuille incomplète ou une note hors de 0, 1, 2 est signalée, et rien n'est calculé.
6. **Discussion :** les correcteurs relisent ensemble leurs désaccords et écrivent leurs explications dans
   `notes/discussion.md`. Le rapport les reprend. **Les feuilles individuelles ne sont jamais modifiées.**
7. **Décision, par vous :**
   - Un critère est jugé **utilisable** si son kappa pondéré est au moins de 0,6 et son accord exact au moins de 80 %.
   - Sinon, il est **ambigu** : on retient ou on adapte une proposition de `propositions-clarification.md`, vous la
     validez, puis on refait l'exercice avec de **nouvelles** réponses fictives, car les correcteurs connaîtraient
     déjà les premières.

## Ce que l'exercice ne dit pas
- Avec 47 réponses, les intervalles de confiance des kappas restent larges. Un bon accord ici est une condition
  nécessaire, pas une preuve que les correcteurs s'accorderont sur de vraies réponses.
- La « note prévue » du concepteur n'est pas une correction de référence : je ne suis pas correcteur, et j'ai écrit
  les attendus. Elle sert à discuter les désaccords, pas à départager les correcteurs.

## Contrôles automatiques
`node tests/jeu-de-mesure.js` vérifie le jeu de mesure ; `node tests/etalonnage.js` vérifie l'exercice, contrôles E1
à E20.
- **Couverture :** tous les types de réponses demandés sont présents ; chaque critère est prévu à 0, 1 et 2 ; les trois
  décisions de déblocage sont représentées.
- **Copies :** même contenu dans les deux, dans un ordre différent ; aucune fuite de la clé dans les copies ou les
  feuilles.
- **Calcul du kappa :** vérifié sur un exemple calculé à la main, puis comparé à une seconde méthode de calcul
  indépendante sur 50 jeux de notes.
- **Chaîne complète :** des feuilles de test, écrites dans un dossier temporaire puis supprimées, passent par le calcul
  de bout en bout.
- **Gel :** la grille, le jeu de mesure et le protocole sont identiques à la version `523f730`.
