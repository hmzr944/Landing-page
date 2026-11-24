# Fiche pédagogique : format v1 (mission 3b-0)

**Mise en œuvre :**

| Fichier | Rôle |
|---|---|
| `js/pedagogie/fiche-validateur.js` | validateur |
| `js/pedagogie/chevauchement.js` | non-chevauchement avec le jeu 3a |
| `js/pedagogie/fiche-empreinte.js` | empreinte et statuts |
| `tools/fiche-verifier.js` | rapport à joindre à chaque lot de fiches |
| `tests/fiche.js` | tests |

**État :** aucune page de l'application ne charge ces modules. Ils ne changent rien pour les utilisateurs.

**Ce que le validateur garantit :** la structure, l'ordre (situation avant définition), la cohérence des confusions,
le classement des questions, le biais de longueur et le non-chevauchement mesurable avec le jeu de mesure 3a.

**Ce qu'il ne garantit pas :** la justesse pédagogique. C'est le rôle de la relecture humaine par lots (statut
`reference`), puis de la mesure.

## 1. Structure

Une fiche est un objet JSON :

| Champ | Contenu |
|---|---|
| `format` | `"fiche-v1"` |
| `meta` | `id` (minuscules, chiffres, tirets), `notion`, `version` (entier ≥ 1), `langue` (`"fr"`), `statut`, `origine` (`humaine`, `serveur`, `ia_locale`), `domaine`, `essai` (vrai pour une fiche fabriquée pour les tests) |
| `validation` | `null`, ou pour une fiche `reference` : `{ date, lot, version, empreinte, role }`. Le rôle (par exemple « responsable produit ») est écrit, **jamais un nom**. |
| `sources` | `[{ id, titre, url, licence, extrait }]` |
| `prerequis` | 0 à 3 `{ notion, question }` |
| `situation` | `{ texte, question_ouverture }` |
| `explication` | `{ simple: { texte, ancre_situation }, standard: { texte, ancre_situation } }` |
| `idee_centrale`, `elements_cles` | une phrase, et exactement 2 éléments |
| `representations` | `[{ id, type, texte, limite? }]`, avec `type` parmi `exemple`, `etapes`, `analogie`, `contre_exemple`, `schema` |
| `confusions` | `[{ id, libelle, description, remede, controle }]` : `remede` est l'identifiant d'une représentation, `controle` est une question |
| `questions` | les ensembles ci-dessous |
| `glossaire` | `[{ terme, explication }]` |

**Une question** : `{ id, evalue, q, choix }`.
- `evalue` vaut `application`, `compréhension` ou `restitution`.
- `choix` compte exactement 4 éléments `{ texte, juste?, confusion? }`.
- **Une seule** bonne réponse (`juste: true`).
- Un mauvais choix **peut** porter l'identifiant d'une confusion (`confusion`). Ce n'est jamais obligatoire.

**Ensembles de questions** (nombre exact) :

| Ensemble | Nombre |
|---|---|
| `comprehension` | 3 |
| `comprehension_reserve` | 2 |
| `application` | 2 |
| `application_reserve` | 1 |
| `transfert` | 1 |
| `transfert_reserve` | 1 |
| `rappel` | 3 |

Les ensembles « réserve » servent à la remédiation. **Le moteur n'invente jamais de question** : quand la réserve est
vide, il s'arrête.

## 2. Règles bloquantes

Une fiche est **utilisable** seulement si aucune règle bloquante n'échoue **et** si son statut est `reference` ou
`generee_validee`.

| Règle | Vérifie |
|---|---|
| V-forme-01 | `format` vaut `fiche-v1` |
| V-forme-02 | bloc `meta` complet et typé |
| V-forme-03 | sources complètes : titre, licence, extrait d'au moins 20 caractères ; au moins une si la fiche n'est pas d'origine humaine |
| V-forme-04 | situation : texte d'au moins 80 caractères, question d'ouverture d'au moins 10 |
| V-forme-05 | deux niveaux d'explication, chacun avec un texte d'au moins 120 caractères et un ancrage d'au moins 10 |
| V-forme-06 | idée centrale d'au moins 20 caractères ; exactement 2 éléments clés |
| V-forme-07 | glossaire de 5 à 10 termes distincts, chacun expliqué |
| V-forme-08 | ensembles de questions présents, avec le nombre exact |
| V-forme-09 | chaque question : identifiant, classement reconnu, énoncé d'au moins 10 caractères, 4 choix distincts, une seule bonne réponse |
| V-forme-10 | prérequis : 0 à 3, chacun avec sa notion et une question valide |
| V-forme-11 | identifiants uniques (questions, représentations, confusions) |
| V-ordre-01 | la situation ne nomme pas la notion : ni le nom entier, ni un mot de 6 lettres ou plus de ce nom |
| V-ordre-02 | la situation ne contient pas de marqueur de définition fort (« on appelle », « se définit », « désigne », « définition ») |
| V-ordre-03 | chaque explication contient son ancrage, et cet ancrage partage au moins 2 mots porteurs de sens avec la situation |
| V-ordre-04 | dans chaque explication, l'ancrage vient avant la première mention de la notion |
| V-confusions-01 | 1 à 3 confusions, chacune complète |
| V-confusions-02 | le remède d'une confusion est une représentation existante |
| V-confusions-03 | la question de contrôle est valide, et au moins un de ses mauvais choix porte cette confusion |
| V-confusions-04 | un choix ne porte qu'une confusion existante ; la bonne réponse n'en porte jamais |
| V-representations-01 | au moins 3 représentations, d'au moins 2 types reconnus |
| V-representations-02 | une analogie a toujours sa limite |
| V-representations-03 | chaque représentation a un texte d'au moins 60 caractères |
| V-questions-01 | compréhension : au moins 2 des 3 questions principales ne sont pas de la restitution |
| V-questions-02 | application (principales et réserve) classées « application » |
| V-questions-03 | transfert jamais classé « restitution » |
| V-questions-04 | rappel classé « restitution » |
| V-questions-05 | une question qui contient « pourquoi » est classée « compréhension » (comme J21) |
| V-questions-06 | une phrase à compléter (« … » final) sans nombre est classée « restitution » (comme J22) |
| V-questions-07 | « que fais-tu », « que fait-il », « est-ce conforme » : classée « application » (comme J23) |
| V-questions-08 | aucun énoncé en double ; aucune bonne réponse de plus de 6 caractères répétée |
| V-questions-09 | le transfert n'est pas le scénario de la situation (même test que NC5, appliqué à l'intérieur de la fiche) |
| V-longueur-01 | aucune bonne réponse plus longue que tous les mauvais choix de plus de 1,5 fois **et** de plus de 15 signes (comme J20) |
| V-longueur-02 | bonne réponse strictement la plus longue dans 35 % des questions de la fiche au plus |
| V-statut-01 | statut parmi `brouillon`, `en_relecture`, `reference`, `a_corriger`, `rejetee`, `generee_validee` |
| V-statut-02 | `reference` : origine humaine, validation complète, version validée = version de la fiche, **empreinte validée = empreinte actuelle** |
| V-statut-03 | `generee_validee` : origine serveur ou IA locale, avec des sources |
| V-statut-04 | en mode catalogue : une fiche d'essai (`meta.essai`) n'est jamais utilisable |
| V-chevauchement-00 | jeu 3a fourni, à l'empreinte `3abd95eb…2443257` (version `523f730`) ; sinon le contrôle n'est pas vérifiable et la fiche n'est pas utilisable |
| V-chevauchement-01 | aucun chevauchement avec le jeu 3a (NC1 à NC5, § 4) |

**Biais de longueur, adaptation assumée :**
- Sur les 15 à 18 questions d'une fiche, les bornes statistiques de J16 à J19 n'ont pas de sens. Pour une fiche
  isolée, on applique donc V-longueur-01 et V-longueur-02 (bloquantes) et V-longueur-03 (avertissement).
- Les bornes complètes de J16 à J19 (10 % à 35 %, rapport 0,85 à 1,15) s'appliquent à **l'ensemble des fiches de
  référence**, par `biaisCatalogue`.

## 3. Avertissements (non bloquants)

| Règle | Vérifie |
|---|---|
| V-lisibilite-01 | phrase de plus de 25 mots dans une explication |
| V-lisibilite-02 | terme du glossaire absent des explications et des représentations |
| V-longueur-03 | rapport moyen bonne réponse / mauvaises hors de 0,85 à 1,15 (peu de questions : simple signal) |

## 4. Non-chevauchement avec le jeu de mesure 3a

**Ce qui est comparé :**
- **côté fiche :** situation, question d'ouverture, toutes les questions (énoncé, question complète, choix),
  questions de contrôle et de prérequis, représentations de type `exemple` et `contre_exemple` ;
- **côté jeu 3a :** questions de compréhension, de rappel et de déblocage (énoncé, question complète, choix), et les
  trois textes du transfert.

La reformulation attendue (idée centrale, éléments clés) n'est pas comparée : elle décrit la notion elle-même, qu'une
fiche enseigne forcément.

**Normalisation :**
- minuscules, sans accents ni ponctuation ;
- sans mots grammaticaux ;
- mots réduits à leurs 6 premières lettres ;
- nombres extraits à part (« 1 200 » donne 1200, « 5,5 » donne 5.5, « 3/4 » reste 3/4).

| Règle | Détecte | Seuil (à l'essai) |
|---|---|---|
| NC1 | même texte après normalisation | au moins 3 mots |
| NC2 | une suite de 5 mots porteurs de sens reprise | 5 |
| NC3 | reformulation proche : recouvrement des mots (indice de Jaccard). **Ne s'applique pas aux choix** : un même contresens s'écrit forcément avec les mots de la notion ; NC1 et NC2 suffisent pour les choix. | Jaccard ≥ 0,5, au moins 4 mots de chaque côté |
| NC4 | même cas chiffré : même ensemble d'au moins 2 nombres, sur un sujet proche | égalité des ensembles, et Jaccard ≥ 0,15 |
| NC5 | même scénario : au moins 2 noms d'objets ou d'acteurs communs (5 lettres ou plus), **hors vocabulaire de la notion** (son nom, son glossaire, son idée centrale, ses éléments clés) | 2 noms, et Jaccard ≥ 0,3 |

**Les seuils sont à l'essai, pas validés.** Le rapport de mission 3b-0 donne :
- leurs résultats sur le jeu d'essai `tests/fixtures/chevauchements.json` : détections, faux négatifs connus, faux
  positifs ;
- un balayage d'autres seuils.

**Rapport des plus proches voisins.** Pour chaque élément de la fiche (sauf les choix), les 3 éléments du jeu 3a les
plus proches sont donnés avec leur score, même sous les seuils. La relecture humaine s'en sert pour juger ce que les
règles ne voient pas.

**Limite.** Une reformulation qui change la plupart des mots peut ne pas être détectée : 7 des 9 cas « difficiles »
du jeu d'essai ne le sont pas. Un même gabarit de question écrit avec d'autres mots non plus. La relecture par lots
reste indispensable.

## 5. Empreinte et statuts

- **Empreinte :** SHA-256 du JSON canonique, avec les clés triées et les espaces des textes normalisés.
  - **Sans** le bloc `validation`.
  - **Sans** `meta.statut`, pour que passer de « en relecture » à « référence » ne change pas le contenu validé.
- **Toute modification du contenu** change l'empreinte. Une fiche `reference` modifiée n'est plus utilisable
  (V-statut-02) jusqu'à une nouvelle validation.
- **Transitions permises :**
  - `brouillon` → `en_relecture` (humaine), `generee_validee` (générée) ou `rejetee` ;
  - `en_relecture` → `reference` (humaine), `a_corriger` ou `rejetee` ;
  - `a_corriger` → `brouillon` ;
  - `reference` → `brouillon` ;
  - `generee_validee` → `brouillon` ou `rejetee` ;
  - `rejetee` : état final.
