# Rapport de mission 3b-0 : format de fiche pédagogique, validateur, non-chevauchement

**Branche :** `mission-3b-0`, partie de `main` (`5be606a`, v53). **Non fusionnée.**

**Périmètre :**
- format de fiche v1 et sa spécification ;
- validateur ;
- contrôle de non-chevauchement avec le jeu de mesure 3a ;
- empreinte et statuts ;
- fiches d'essai fabriquées ;
- outil de rapport ;
- tests.

**Aucun fichier chargé par l'application n'est modifié.** Rien ne change pour les utilisateurs de Student ou de
Business, et la v53 reste telle quelle.

## 1. Ce qui a été modifié

| Fichier | Nature |
|---|---|
| `js/pedagogie/fiche-validateur.js` | nouveau : validateur, 39 règles bloquantes et 3 avertissements |
| `js/pedagogie/chevauchement.js` | nouveau : normalisation, règles NC1 à NC5, rapport des plus proches voisins |
| `js/pedagogie/fiche-empreinte.js` | nouveau : SHA-256 en JavaScript pur, JSON canonique, statuts et transitions |
| `docs/pedagogie/fiche-v1.md` | nouveau : spécification ; chaque règle a son identifiant |
| `tools/fiche-verifier.js` | nouveau : rapport de vérification d'une fiche (ou d'un lot), à joindre à chaque lot de relecture |
| `tests/fiche.js` | nouveau : 32 contrôles (F00 à F31) |
| `tests/fixtures/fiches/*.json` | nouveaux : 4 fiches d'essai **fabriquées** (fermentation et levier, hors du jeu 3a ; chaîne du froid et Pythagore, sur des notions du jeu 3a, écrites sans en reprendre les éléments) |
| `tests/fixtures/chevauchements.json` | nouveau : jeu d'essai du non-chevauchement (28 reprises, 9 reformulations difficiles, 15 questions légitimes) |
| `tests/fixtures/jeu-3a/jeu-de-mesure.json` | nouveau : copie à l'identique de `mission-3a` (`523f730`), empreinte vérifiée (`3abd95eb…2443257`) ; `mission-3a` n'est pas fusionnée |
| `.github/workflows/ci.yml` | **fichier existant modifié (1 sur 2)** : ajout de la suite `fiche` au groupe `student` |
| `tests/ai-server.js` | **fichier existant modifié (2 sur 2)**, test uniquement : le contrôle « aucune clé d'IA dans les fichiers servis » lisait chaque entrée de `js/` comme un fichier et plantait sur le nouveau dossier `js/pedagogie/` (EISDIR). Il parcourt maintenant les sous-dossiers ; les fichiers existants sont contrôlés comme avant, et les nouveaux modules le sont aussi |
| `docs/rapport-mission-3b-0.md` | ce rapport |

Les nouveaux modules ne sont chargés par aucune page : ni `index.html`, ni `sw.js` ne les citent (contrôle F29).

## 2. Pourquoi

3b-0 pose le format sur lequel reposeront :
- les fiches de référence, écrites par lots et validées par vous (3b-1) ;
- le moteur (3b-2).

Le validateur rend contrôlables, avant toute relecture humaine :
- l'ordre situation → explication ;
- la cohérence des confusions et de leurs remèdes ;
- le classement des questions ;
- le biais de longueur ;
- l'indépendance avec le jeu de mesure 3a.

L'empreinte rend toute modification d'une fiche validée visible et bloquante.

**Décision Q7, enregistrée pour 3b-4** (non mise en œuvre ici, hors périmètre). État « Mémorisée et exercée », lu
ainsi :
- la mémoire est acquise (Mastery « maîtrisée ») ;
- au moins 2 questions d'application réussies, chacune un jour différent ;
- au moins 1 question de transfert réussie, un jour différent de ces deux applications.

Le niveau de preuve reste 3. L'état est distinct de « Maîtrisée » (niveau 4).
**À confirmer :** j'ai lu « à des jours différents » comme 3 jours distincts. C'est la lecture la plus stricte.

## 3. Ce qui fonctionne réellement

- **Le validateur :**
  - les 4 fiches d'essai passent sans bloquant ;
  - chacune des 39 règles bloquantes est déclenchée par sa mutation (F12) ;
  - 80 mutations tirées au hasard rendent toutes la fiche inutilisable, avec la bonne règle (F23) ;
  - 60 fiches valides produites par le générateur de test sont toutes acceptées (F22) ;
  - il est déterministe et ne modifie jamais la fiche lue (F27).
- **Les statuts :**
  - une fiche « brouillon » n'est jamais utilisable ;
  - une fiche « reference » validée l'est ;
  - **un seul caractère modifié après validation la rend inutilisable** (F09, CA3) ;
  - les transitions interdites sont refusées (F05).
- **L'empreinte :**
  - le SHA-256 en JavaScript pur est identique à celui de Node ;
  - elle est stable si l'ordre des clés, les espaces, le statut ou la validation changent ;
  - elle change dès qu'un caractère du contenu change.
- **Le non-chevauchement**, sur le jeu d'essai (§ 5) :
  - 28 reprises plantées sur 28 détectées, chaque règle NC1 à NC5 en détectant au moins une ;
  - 0 faux positif sur 15 questions légitimes et sur les 4 fiches d'essai ;
  - 0 paire signalée entre deux éléments différents du jeu 3a, sur environ 800 000 comparaisons ;
  - un jeu 3a modifié d'un seul caractère rend le contrôle « non vérifiable » (F20).
- **Le rapport des plus proches voisins** donne 3 éléments du jeu 3a distincts par élément de fiche (F21).
  `tools/fiche-verifier.js` produit ce rapport en Markdown.
- **Le contrôle a déjà servi en écrivant les fiches d'essai.** Il a trouvé une vraie reprise dans ma propre fiche
  Pythagore : « Un triangle rectangle a deux côtés de 9 cm et 12 cm autour de l'angle droit. Combien mesure le grand
  côté ? » reprenait le gabarit et les mots de S04.c1, avec d'autres nombres. Je l'ai réécrite, et le cas est gardé
  dans le jeu d'essai (R27).

## 4. Ce qui échoue encore, ou reste limité

- **Les reformulations libres ne sont pas détectées : 7 sur 9 des cas « difficiles » passent** (§ 5.2).
  - Le contrôle repère les reprises littérales ou proches, pas les reformulations avec d'autres mots.
  - **La relecture humaine par lots reste indispensable**, appuyée sur le rapport des plus proches voisins.
- **Un même gabarit de question écrit avec d'autres mots n'est pas détecté.** Exemple : D09, « Une livraison de
  beurre arrive à + 9 °C. Que fais-tu ? », face à P-H1.c1.
- **Le jeu d'essai a été écrit par la même personne que les règles** (moi). Le taux de 28 sur 28 est donc
  probablement **optimiste**. Un jeu d'essai écrit par quelqu'un d'autre serait un meilleur test.
- **Les seuils sont à l'essai, pas validés** (votre décision). Leur réglage repose sur seulement 15 questions
  légitimes et 4 fiches.
- **Deux règles ont dû être corrigées pendant la mission**, après de fausses alertes sur mes fiches légitimes. Les
  premiers essais signalaient à tort 9 éléments de la fiche « chaîne du froid » et environ 20 de la fiche
  « Pythagore » :
  - NC5 comptait le vocabulaire de la notion (« triangle rectangle », « chaîne du froid ») comme objets du scénario.
    Il est maintenant exclu.
  - NC3 comparait les choix courts, qui énoncent forcément le même contresens avec les mots de la notion. Les choix
    ne sont plus soumis qu'à NC1 et NC2.

  Ces corrections ont été faites **avant** de mesurer sur le jeu de reprises. Elles sont expliquées dans la
  spécification.
- **Biais de longueur d'une fiche isolée.** Les bornes J16 à J19 n'ont pas de sens sur 15 questions. Une fiche est
  donc contrôlée par V-longueur-01 et 02, et les bornes complètes s'appliquent au catalogue (`biaisCatalogue`).
  - Sur les 4 fiches d'essai : bonne réponse la plus longue 17 fois sur 60, la plus courte 5 fois sur 60, rapport
    1,07.
  - La part « la plus courte » (8 %) serait **sous** le seuil de 10 % du catalogue. À corriger dans les fiches de
    référence de 3b-1, pas dans ces fiches d'essai.
- **V-ordre-01 et 02 sont des contrôles de surface :**
  - ils reconnaissent le nom de la notion et des marqueurs forts de définition ;
  - ils ne prouvent pas qu'une situation est vraiment concrète ni bien choisie.
- **Premier passage de l'intégration continue en échec** (run 45396023841) : seule la suite `ai-server` échouait,
  à cause du nouveau dossier `js/pedagogie/` (voir § 1, `tests/ai-server.js`). Ce n'était pas une régression de
  l'application, mais un test qui supposait que `js/` ne contenait que des fichiers. Corrigé dans le commit `bcca3df`.
- **V-sources** (ancrage lexical d'une fiche générée dans ses sources) n'est pas mis en œuvre : prévu en 3b-5. 3b-0
  vérifie seulement la forme du bloc `sources`.

## 5. Résultats des tests techniques

### 5.1 `node tests/fiche.js`
32 contrôles, F00 à F31 : **tous passés**, exécutés localement (Node 22.23.4), en environ 32 secondes.

**Informations affichées par la suite :**
- reformulations difficiles détectées : 2 sur 9 (D06, D09) ;
- biais de longueur des fiches d'essai : 17/60, 5/60, rapport 1,07.

**F31, périmètre de la branche :** vérifié en local. En intégration continue, la copie du dépôt est superficielle
(sans l'historique de `main`), donc F31 y est marqué **SKIPPED** avec sa raison. F30 y vérifie l'essentiel : les 71
fichiers de l'application sont identiques, octet pour octet, à ceux de `main`.

### 5.2 Non-chevauchement : exemples, faux positifs, faux négatifs

**Exemples détectés** (28 sur 28) :

| Cas | Reprise | Règles |
|---|---|---|
| R01 à R03 | S01.c1 copié, en majuscules sans accents, ou avec d'autres mots grammaticaux | NC1 |
| R06, R08 | une suite de mots reprise de S12.r4 ou de S01.c2 | NC2 |
| R10 à R13, R23, R26 | reformulations proches de S20.c2, S19.c2, S15.c2, S17.c2, S03.c3, S13.d2 | NC3 (et NC2) |
| R14 à R19 | même cas chiffré : 3 et 4 ; 60 € et 20 % ; 100 €, 10 % et 2 ans ; 30 et 40 cm ; 2/6 et 1/3 ; 6 V et 1,5 V | NC4 |
| R20, R21 | même scénario, reformulé : surgelés dans le coffre, cheveu et ADN | NC5 |
| R27 | gabarit et mots de S04.c1, autres nombres (cas réel trouvé dans ma fiche d'essai) | NC2, NC3, NC5 |

**Faux négatifs connus** (7 cas « difficiles » sur 9 non détectés) :

| Cas | Élément du jeu 3a | Pourquoi il échappe |
|---|---|---|
| D01 | S08.c1 (varicelle) | synonymes : « rare » au lieu de « rarement », « attraper » au lieu de « tomber malade » |
| D02 | S12, transfert (voiture au soleil) | tous les noms changés (auto, fenêtres, brûlante) |
| D03 | P-R1, transfert (fermer seul le dimanche) | reformulation libre |
| D04 | S04.r3 (à quels triangles…) | même fait, tournure inversée, 3 mots seulement |
| D05 | S20.r1 (effet du froid) | « froid » remplacé par « température basse » ; cas trouvé en écrivant la fiche d'essai |
| D07 | S01.c3 (câble coupé) | réécriture complète |
| D08 | S15.r4 (prix des fraises) | réécriture complète |

Deux cas difficiles sont détectés : D06 (S10.c2, rappel de vaccin) et D09 (P-H1.c1, même gabarit).

**Faux positifs mesurés :** 0 sur 15 questions légitimes, 0 sur 4 fiches d'essai, 0 paire entre éléments différents
du jeu 3a.

**Balayage des seuils** (NC3 : Jaccard des reformulations ; NC5 : Jaccard des scénarios) :

| NC3 | NC5 | Reprises | Difficiles | Légitimes signalées | Fiches d'essai signalées |
|---|---|---|---|---|---|
| 0,35 à 0,5 | 0,2 | 28/28 | 4/9 | 2 à 3/15 | 2/4 |
| 0,35 à 0,5 | 0,25 | 28/28 | 2/9 | 1 à 2/15 | 1/4 |
| 0,35 à 0,4 | 0,3 | 28/28 | 2/9 | 1/15 | 1/4 |
| **0,45 à 0,5 (retenu : 0,5)** | **0,3 (retenu)** | **28/28** | **2/9** | **0/15** | **0/4** |
| 0,6 | 0,2 | 28/28 | 2/9 | 2/15 | 2/4 |
| 0,6 | 0,25 à 0,3 | 28/28 | 0/9 | 0 à 1/15 | 0 à 1/4 |

**Lecture :**
- Abaisser NC5 à 0,2 rattrape 2 reformulations difficiles de plus, au prix de fausses alertes sur des questions et
  des fiches légitimes.
- Monter NC3 à 0,6 perd les 2 cas difficiles détectés.
- 0,5 et 0,3 donnent ici le meilleur compromis. **Ce compromis n'est démontré que sur ce petit jeu d'essai.**

### 5.3 Non-régression des suites existantes (exécution locale)
Toutes les suites du dépôt ont été relancées localement sur la branche (commit `bcca3df`) :

| Groupe | Suites | Résultat |
|---|---|---|
| Student | welcome, onboarding, student-path, home-adaptive, learning-flow, foundations, explore, motion, responsive, fiche | OK |
| Documents | pdf-structure, pdf-mixed | OK ; pdf-mixed : 1 SKIPPED (documents privés absents, déjà le cas sur `main`) |
| Moteurs et données | data-safety, engines, corpus-metier, benchmark | OK |
| Business | org, org-setup, org-learn, org-engines, org-docs, org-onboarding, org-shell, org-desktop, org-insight | OK |
| Autres | tutor, league, feedback | OK |
| Serveur IA | ai-server | OK ; 1 NON VÉRIFIÉ en local (D3 demande l'accès réseau à Wikimedia, bloqué ici ; vérifié en CI) |
| Deno, base de données | deno, db-rls | OK |

### 5.4 Intégration continue
- Run 45396023841 (commit `c64a636`) : **échec** de `ai-server` seulement (EISDIR, voir § 4). Les autres groupes
  avaient réussi.
- Run 45397967400 (commit `bcca3df`) : **réussi**. Les 6 jobs sont en succès : base de données (RLS, PostgreSQL 16), fonction
  tutor (Deno), navigateur student, business, import et serveur-simulé. La suite `fiche` y affiche « réussi pour ce qui
  a été exécuté ; 1 SKIPPED » : F31 (périmètre) ne peut pas s'exécuter sur une copie superficielle du dépôt. F30
  (71 fichiers de l'application identiques à `main`) y est exécuté et réussi.

**Une CI verte n'est pas une validation fonctionnelle** : elle montre qu'aucun test existant ne casse et que les
fichiers de l'application sont identiques à ceux de `main` (F30). Elle ne dit rien de la qualité pédagogique.

## 6. Résultats des campagnes d'IA réelles
**Aucune.** 3b-0 n'appelle aucun modèle : le validateur et le contrôle de non-chevauchement sont déterministes.
Aucune fiche n'a été générée par une IA.

## 7. Limites et risques restants

| Risque | État | Suite |
|---|---|---|
| Reformulations libres du jeu 3a non détectées | réel (7 sur 9 dans le jeu d'essai) | relecture humaine par lots, avec le rapport des plus proches voisins ; un jeu d'essai écrit par une autre personne si vous le souhaitez |
| Seuils réglés sur un petit jeu d'essai, écrit par l'auteur des règles | réel | seuils à l'essai ; à réévaluer avec le premier lot de 3b-1 (les fiches réelles serviront de nouveaux cas légitimes) |
| Format v1 mal adapté au moteur (3b-2) ou à l'écriture des fiches (3b-1) | possible | version du format ; évolutions ajoutées en v1.x |
| Durée de la suite (environ 32 secondes, surtout la comparaison exhaustive du jeu 3a avec lui-même) | acceptable | à optimiser si la CI devient lente |
| Copie du jeu 3a qui diverge de `mission-3a` | maîtrisé | empreinte vérifiée (F00, F20) |
| Duplication des règles de classement et de longueur entre `mission-3a` et 3b-0 | maîtrisé | mêmes règles, réécrites et testées ; mise en commun à envisager à la fusion de `mission-3a` |

**Retour arrière.**
- **Avant fusion :** rien à faire.
- **Après fusion :** un commit qui annule la fusion, sans réécrire l'historique. Aucun fichier chargé par
  l'application n'étant touché, l'annulation est sans effet pour les utilisateurs.
