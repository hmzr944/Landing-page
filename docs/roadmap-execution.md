# Feuille de route d'exécution

Ce document suit le travail sur le dépôt mission par mission. Chaque mission a un objectif, des livrables et un
critère de sortie. **Aucune modification du code n'est faite sans qu'une mission la demande**, et rien n'arrive sur
`main` (donc en production) sans validation explicite.

## Règles de travail
- Une mission = une branche de travail. La branche est gardée jusqu'à validation, jamais supprimée avant.
- Fusion dans `main` seulement après : lecture du diff, toutes les suites de tests passées sur le dernier commit,
  validation explicite.
- `main` est la production : GitHub Pages publie `main` sur https://hmzr944.github.io/Landing-page/.
  Pousser une autre branche ne publie rien.
- Un résultat n'est annoncé que s'il a été exécuté ou vérifié. Ce qui n'a pas pu l'être est marqué « NON VÉRIFIÉ ».
- Aucune donnée inventée : un jeu de test fabriqué est toujours présenté comme tel.
- Aucun document personnel, aucune clé secrète dans le dépôt.

## État de `main` (vérifié le 2026-11-16)
| Point | Constat |
|---|---|
| Dernier commit | `5c9a5e5`, fusion de `student-audit` (v52) |
| Arbre de travail | propre, aucun fichier modifié |
| Version publiée | `arbor-v52` : `sw.js` et `index.html` en ligne identiques octet pour octet à ceux de `main` |
| Tests | 26 suites navigateur, 55 tests Deno, 232 contrôles RLS passés sur `4bc0f60`, dont l'arbre de fichiers est identique à celui de `5c9a5e5` |
| Intégration continue | aucune sur `main` avant cette mission |

## Cartographie des branches (2026-11-16)
| Branche | Dernier commit | État | Décision |
|---|---|---|---|
| `main` | `5c9a5e5` | production v52 | point de référence |
| `ux-v51` | `e528cdb` | fusionnée | gardée |
| `student-audit` | `4bc0f60` | fusionnée | gardée |
| `desktop-experience` | `3e3044e` | fusionnée | gardée |
| `claude/eager-clarke-db7g6z` | `791417a` | **non fusionnée** : produit PULS (dossier `puls/`, 75 fichiers, et son flux de tests) | à séparer du dépôt, voir plus bas |
| `ux-multisupport-v52` | `5770281` | **non fusionnée** : un seul document, `docs/multisupport-v1.md` (stratégie multi-supports) | à relire avant toute décision |
| `diag-push` | `ab72cc6` | **non fusionnée** : essai d'envoi d'une ligne, sans valeur produit | candidate à la suppression, sur validation |

### Sauvegardes
Les étiquettes git (tags) sont refusées par l'accès git de l'environnement de travail. Les sauvegardes sont donc des
branches en lecture seule par convention, à ne jamais modifier :

| Sauvegarde | Pointe sur |
|---|---|
| `sauvegarde/puls-2026-11-16` | `791417a` (PULS) |
| `sauvegarde/ux-multisupport-v52-2026-11-16` | `5770281` |
| `sauvegarde/diag-push-2026-11-16` | `ab72cc6` |
| `sauvegarde/main-v52-2026-11-16` | `5c9a5e5` (dernier état de production connu) |

Revenir à la production v52 si besoin : `git checkout -b retour sauvegarde/main-v52-2026-11-16`.

## Plan de séparation de PULS
PULS est un autre produit. Il n'existe que sur la branche `claude/eager-clarke-db7g6z`. Il ne doit pas être fusionné
dans ce dépôt : `main` est publié tel quel par GitHub Pages, une fusion rendrait `/puls/` public.

1. **Propriétaire** : créer un dépôt privé dédié (par exemple `puls`). L'agent ne crée pas de dépôt lui-même.
2. **Agent** : y pousser l'historique de PULS seul (`git subtree split --prefix=puls` depuis la sauvegarde ; essai à
   blanc réussi le 2026-11-16 : 75 fichiers, 6 commits), et adapter le flux de tests (`puls.yml`) au dossier racine.
3. **Vérification** : tests de PULS verts dans le nouveau dépôt, nombre de fichiers identique (75).
4. **Propriétaire, après vérification** : suppression de la branche `claude/eager-clarke-db7g6z` d'Arbor.
   La branche `sauvegarde/puls-2026-11-16` est gardée tant que le nouveau dépôt n'a pas été validé.

## Intégration continue
Fichier `.github/workflows/ci.yml`, déclenché à chaque envoi, sur chaque demande de fusion et à la demande.
- Fonction `tutor` : `deno test` sur `supabase/functions/tutor/`.
- Base : `tests/db-rls.js` rejoue les migrations sur un PostgreSQL 16 local au runner.
- Navigateur : les 26 suites Playwright (1.63.0, Chromium) en 4 groupes parallèles (student, import, business,
  serveur simulé).
- Exclus : `tests/production.js` (vise le site en ligne) et `tests/desktop-shots.js` (captures, pas un test).
- Ne déploie rien : permissions en lecture seule, aucun secret utilisé. La publication GitHub Pages ne change pas.
- Statut honnête de chaque suite, aussi dans le résumé GitHub : « réussi » ; « réussi pour ce qui a été exécuté ; N
  SKIPPED » (contrôles ignorés volontairement, avec leur raison : les PDF personnels, exécutés seulement en local avec
  `ARBOR_PRIVATE_DIR`) ; « PARTIEL » si un contrôle « NON VÉRIFIÉ » n'a pas pu s'exécuter (réseau…) ; « ÉCHEC ».
  PARTIEL et ÉCHEC font échouer la CI : un contrôle non exécuté n'est jamais compté comme réussi.
- Une CI verte ne prouve pas la qualité fonctionnelle : celle de l'extraction se mesure par le banc d'essai
  (`docs/benchmark-extraction.md`).

## Missions
| Mission | Objectif | Critère de sortie | État |
|---|---|---|---|
| 0. Sécurisation | branches cartographiées, PULS sauvegardé et plan de séparation, CI sans déploiement, état de `main` identifié, ce document | dépôt sécurisé, tests exécutables, aucune modification non autorisée de la production | validée et fusionnée dans `main` (`e6bb6c1`) |
| 1. Premier corpus métier | 5 à 8 documents (retail : ouverture et fermeture, retour client, caisse ; hôtellerie-restauration : réception de livraison, réclamation, chaîne du froid), sources publiques ou jeux de test fabriqués clairement distingués, au moins 2 procédures en v1 et v2 | corpus fabriqué et signalé comme tel ; règles réglementaires vérifiées à une source publique ; corrigé des changements v1 → v2 ; lecture réelle par l'espace Business vérifiée par un test | validée et fusionnée dans `main` (`60aa465`) |
| 2. Fiabilité de l'extraction | lecture des ligatures (navigateur et serveur), « confiance % » remplacée par des informations vérifiables, banc d'essai reproductible, rapport | 4 seuils sur chacun de 3 passages ; CI sans « NON VÉRIFIÉ » | livrée sur la branche `mission-2` : lecture corrigée ; **seuils non atteints** (voir `docs/benchmark-extraction.md`) ; en attente de validation |
| 2b. Fiabilisation de l'extraction | consigne exhaustive, granularité, classement « sensible », modèle de secours, limite de débit et nouveaux essais, erreurs de format ; nouvelle campagne de 3 passages | mêmes 4 seuils sur chacun des 3 passages | livrée sur la branche `mission-2b` : 3 seuils sur 4 tenus sur chaque passage, **pièges : 1 passage sur 3** (voir `docs/benchmark-extraction-2b.md`) ; en attente de validation |

Suite envisagée, à découper en missions au moment voulu : stabiliser v52, extraction des documents métier, qualité
de l'évaluation, prototype du moteur d'impact des connaissances, essai sur un vrai changement de procédure.

## Points ouverts
- Défauts mesurés par le banc d'essai, hors périmètre de la mission 2 : voir `docs/benchmark-extraction.md` (modèle de secours disparu, pas d'attente sur la limite de débit, rappel plafonné, classement « sensible » rare, ajouts mal détectés).
- Défauts connus de v52 non corrigés : voir `docs/audit-student.md` (points 13 à 18).
- Lecture des PDF métier (`OrgDocs.readPages`) sans analyse de la mise en page.
- Fournisseur d'IA pour le Business (contrat de traitement des données, hébergement européen) : décision à prendre.
- Aucun pilote réel encore mené ; aucune procédure métier réelle disponible.
