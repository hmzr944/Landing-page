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
| `remise/correcteur-A/` | correcteur A, **ce dossier seulement** | `consignes.md`, `grille-reformulation.md` (copie exacte de la version 523f730), `copie-correcteur-A.md` (les 47 réponses dans son ordre), `feuille-correcteur-A.csv` (feuille vide) |
| `remise/correcteur-B/` | correcteur B, **ce dossier seulement** | les mêmes documents pour B, avec un ordre de réponses différent |
| `reponses-fictives.js` | coordinateur seulement | **la clé** : types de réponses, notes prévues par le concepteur, raisons, cas limites |
| `etalonnage.js` | coordinateur | lecture et contrôle des feuilles, kappa, intervalles de confiance, désaccords |
| `generer.js`, `rapport.js` | coordinateur | préparation des dossiers de remise ; rapport |
| `rapport-etalonnage.md` | coordinateur, puis vous | rapport ; « NON MESURÉ » tant que les feuilles ne sont pas rendues |
| `propositions-clarification.md` | vous | P7 tranchée (sans changement de grille) ; 11 propositions en attente des résultats |

**Les correcteurs ne doivent pas avoir accès au reste du dossier, ni à la branche.** La clé, la raison de chaque
réponse et le rapport y sont lisibles. Le coordinateur remet à chacun **uniquement son dossier `remise/correcteur-X/`**,
sous forme de fichiers ou imprimé. Les codes des réponses (« E-7GJ9 ») ne révèlent ni la grille, ni le numéro, ni le
type de réponse.

## Copies d'ancrage pour l'étalonnage à blanc (annexe A)
- **Où :** dans `grille-reformulation.md`, dernière section, **« Annexe A : copies d'ancrage (fabriquées, pas des
  participants) »** (lignes 150 à 159 de la version `523f730`).
- **Contenu :** 4 copies sur le sujet S20 (la chaîne du froid), avec leurs notes C1, C2, C3, C4 et leur total :
  3, 3, 8 et 6.
- **Remise :** cette grille, avec son annexe, est dans chaque dossier de remise, à l'identique (contrôle E28). Les
  consignes des correcteurs disent de noter ces 4 copies en cachant les notes, puis de comparer.
- **Limites, sans modifier la grille :**
  - L'annexe A ne couvre que la reformulation (B2). Pour le transfert (B3) et le déblocage (B4), il n'y a pas de copies
    d'ancrage séparées. Les exemples notés de chaque réponse (2, 1, 0 ; juste, insuffisant, faux), présents dans les
    copies, en tiennent lieu. Les consignes le disent.
  - Les copies d'ancrage portent sur S20, comme 3 des 14 reformulations de l'exercice (B2-01 à B2-03). B2-03 ressemble
    à la deuxième copie d'ancrage (« le froid tue les microbes »). L'accord sur ces 3 réponses peut donc être un peu
    meilleur que sur les autres. Le rapport donne les notes réponse par réponse, ce qui permet de le vérifier.

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
4. **Remise et gel :** le coordinateur enregistre les deux feuilles telles quelles, sans les ouvrir dans un tableur, sous
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

## Données invalides
Une feuille est refusée, avec la liste de ses erreurs, et **aucun accord n'est calculé**, si :
- une note est vide, n'est pas un entier 0, 1 ou 2 (« 3 », « 1,5 »), ou se trouve dans la colonne d'une autre grille ;
- un code est inconnu, présent deux fois ou absent ;
- la grille d'une ligne a été changée ;
- une colonne manque, ou une ligne a plus de valeurs que de colonnes.

**Rien n'est corrigé ni deviné.** Le correcteur reprend sa feuille et la renvoie entière. Le coordinateur note dans
`notes/discussion.md` qu'une feuille a été renvoyée, et pourquoi.

Une feuille enregistrée par un tableur réglé en français est acceptée : séparateur point-virgule, marque BOM, fins de
ligne Windows.

## Contrôles automatiques
`node tests/etalonnage.js` vérifie l'exercice (contrôles E1 à E28). `node tests/jeu-de-mesure.js` vérifie le jeu de
mesure.
- **Couverture :** tous les types de réponses demandés sont présents ; chaque critère est prévu à 0, 1 et 2 ; les trois
  décisions de déblocage sont représentées.
- **Dossiers de remise :** mêmes réponses dans un ordre différent ; aucune fuite de la clé ; grille identique à la
  version `523f730`, avec son annexe A.
- **Kappa :** exemple calculé à la main (0,75) ; accord parfait (1) ; désaccord systématique (négatif) ; notes sans
  variation (non calculable) ; comparaison avec une seconde méthode de calcul indépendante sur 50 jeux de notes.
- **Intervalles de confiance :** [1 ; 1] pour un accord parfait ; bornes ordonnées, encadrant le kappa observé et
  reproductibles ; non calculable quand les notes ne varient pas.
- **Données invalides :** 10 sortes de défauts sont signalées ; une feuille de tableur français est acceptée ; le
  rapport refuse de calculer sur une feuille invalide et calcule sur des feuilles valides.
- **Gel :** la grille, le jeu de mesure et le protocole sont identiques à la version `523f730`.

**Les feuilles utilisées par ces contrôles sont écrites dans un dossier temporaire, puis supprimées. Aucune n'est
enregistrée dans le dossier de l'exercice.**
