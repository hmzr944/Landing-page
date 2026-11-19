# Banc d'essai de l'extraction Business : mission 2b

Nouvelle campagne de trois passages indépendants, sur le même corpus, avec les mêmes passages du navigateur, le même
calcul des scores et **les mêmes seuils que la mission 2** (aucun seuil modifié). Mesures du 2026-11-19, modèle de
production `openai/gpt-oss-120b`. Méthode complète : `docs/benchmark-extraction.md`.

**Conclusion : trois seuils sur quatre sont atteints sur chacun des trois passages. Le quatrième, aucune fausse alerte
sur les pièges, ne l'est que sur un passage sur trois. Les quatre seuils ensemble ne sont atteints que sur un passage
sur trois : la mission 2b n'est pas une réussite complète.**

## Avant / après (mission 2 → mission 2b)

<!-- COMPARAISON:DEBUT (généré par tests/bench/report.mjs, ne pas modifier à la main) -->
| Mesure | Avant : moyenne (pire passage) | Après : moyenne (pire passage) |
|---|---|---|
| Valeurs chiffrées exactes (sur 49) | 30.0 (24) | 49.0 (49) |
| Règles sensibles retrouvées (sur 47) | 29.0 (24) | 46.7 (46) |
| Changements détectés (sur 9) | 7.0 (6) | 9.0 (9) |
| Fausses alertes sur les pièges (sur 4) | 0.3 (1) | 0.7 (1) |
| Règles retrouvées (sur 74) | 48.0 (39) | 73.3 (73) |
| Sensibles classées « sensible » | 4.7 (4) | 38.3 (37) |
| Inventions après le filtre du serveur | 0.0 (0) | 0.0 (0) |
| Nouveautés non fondées (texte déjà présent en v1) | 8.0 (14) | 14.3 (15) |
| Passages où les quatre seuils sont atteints | 0 sur 3 | 1 sur 3 |
<!-- COMPARAISON:FIN -->

## Ce qui a été changé (et seulement cela)
| Correction | Fichier | Preuve |
|---|---|---|
| Plus de limite « 3 à 10 connaissances » : une connaissance par règle, étape ou valeur ; jusqu'à 40 par lot | `generate.ts` | règles retrouvées : 48 → 73,3 sur 74 en moyenne |
| Granularité : citation d'une seule ligne (20 à 300 caractères, au lieu de 40 à 200 qui forçait à coller les titres), sans « … », nombres gardés en chiffres | `generate.ts` | valeurs exactes 49/49 sur chaque passage ; 105 à 108 connaissances gardées sur 110 à 113 proposées |
| Texte réduit à une valeur (« + 2 °C ») : la citation exacte sert de texte au lieu d'écarter la connaissance | `generate.ts` | les 5 températures de H1-v2, perdues à l'essai intermédiaire, sont gardées ; test unitaire |
| Classement « sensible » : consigne plus précise, et vocabulaire serveur par catégories générales (racines et mots entiers), testé sur des phrases hors corpus | `generate.ts`, `sensible.test.ts` | 16 % → 82 % des règles sensibles classées « sensible » |
| Modèle de secours : `openai/gpt-oss-20b` (vérifié en direct le 2026-11-19), l'ancien `llama-3.3-70b-versatile` étant retiré | `index.ts`, `model.ts` | tests unitaires ; appel réel réussi en schéma strict |
| Limite de débit (429) : attente du délai indiqué puis même modèle, sous 25 s ; sinon modèle suivant ; tous saturés : « réessayez plus tard » | `model.ts` | tests unitaires (sans attente réelle) |
| Erreurs de format : réponse coupée réessayée avec deux fois plus de jetons ; JSON invalide ou erreur 400 réessayés une fois ; 404 ou modèle retiré : modèle suivant ; budget de jetons de l'extraction (6000) et de la comparaison (5000) relevé, le raisonnement de gpt-oss y étant compté | `model.ts`, `generate.ts`, `engines.ts` | 0 comparaison sans analyse sur 6 (1 sur 6 à la mission 2) |

## Ce qui reste à corriger (hors du périmètre de la mission 2b)
1. **Le piège « ordre inversé » de R1** est signalé comme une modification sur 2 passages sur 3. La v1 dit « Allumer
   l'éclairage et démarrer les caisses », la v2 « Démarrer les caisses, puis allumer l'éclairage ». Le modèle y voit un
   changement d'ordre des étapes. Le corrigé le classe comme une reformulation sans effet. **Ce classement du corrigé se
   discute** (« puis » impose un ordre que « et » n'imposait pas), mais il n'est pas modifié ici : changer le corrigé
   après avoir vu les résultats reviendrait à changer la règle du jeu. La décision vous revient.
2. **Nouveautés non fondées : 88 %.** La comparaison signale comme « nouvelles » 14 à 15 consignes dont le texte figurait
   déjà mot pour mot dans la v1 (92 % déjà à la mission 2, mesuré pour la première fois en mission 2b). Un responsable
   devrait les relire pour rien à chaque version. Correction possible et vérifiable sans IA : écarter une « nouveauté »
   dont le texte est retrouvé dans la version précédente.
3. **Classement exact du type de changement** : la suppression de l'exception du commis est classée « modifiée » au lieu
   de « supprimée » (détectée quand même, 3 sur 3).

Ces trois points touchent la comparaison de versions (`compareVersions`), qui n'était pas dans le périmètre de la
mission 2b. Je propose de les traiter dans une mission 2c courte, mesurée par une nouvelle campagne avec les mêmes seuils.

## Limites
- Même corpus de 8 documents fabriqués : ces résultats ne garantissent rien sur des procédures réelles, plus longues.
- 33 à 35 connaissances gardées par passage ne correspondent à aucune règle du corrigé. Elles sont vraies (citation
  exacte), mais plus fines que le corrigé (par exemple « ouverture à 9 h 30 »). À juger par un humain.
- Le banc attend lui-même le délai de la limite de débit avant de laisser `model.ts` réagir : la qualité mesurée est
  celle du modèle principal. Le comportement de `model.ts` face aux limites est prouvé par les tests unitaires, pas par
  le banc.
- Essai intermédiaire (code avant la dernière correction) conservé comme preuve : `docs/benchmark/runs-2b/essai-intermediaire-1.json`.

## Résultats détaillés

<!-- RESULTATS:DEBUT (généré par tests/bench/report.mjs, ne pas modifier à la main) -->
Passages mesurés : 3. Modèle(s) : openai/gpt-oss-120b. Attentes dues à la limite de débit : 7, 16, 10.

### Seuils (à atteindre sur chacun des passages)

| Seuil | Passage 1 | Passage 2 | Passage 3 |
|---|---|---|---|
| Valeurs chiffrées exactes : 100 % | 49/49 (oui) | 49/49 (oui) | 49/49 (oui) |
| Règles sensibles retrouvées : au moins 43/47 | 47/47 (oui) | 46/47 (oui) | 47/47 (oui) |
| Changements détectés : 9/9 | 9/9 (oui) | 9/9 (oui) | 9/9 (oui) |
| Fausses alertes sur les 4 pièges : 0 | 0 (oui) | 1 (**non**) | 1 (**non**) |
| **Les quatre seuils** | atteints | **non atteints** | **non atteints** |

### Autres mesures

| Mesure | P1 | P2 | P3 | Moyenne | Écart (min à max) |
|---|---|---|---|---|---|
| Règles retrouvées (74) | 74/74 | 73/74 | 73/74 | 73.3 (99 %) | 73 à 74 |
| Sensibles retrouvées (47) | 47/47 | 46/47 | 47/47 | 46.7 (99 %) | 46 à 47 |
| Sensibles retrouvées et classées « sensible » | 37/47 | 39/46 | 39/47 | 38.3 (82 %) | 37 à 39 |
| Valeurs chiffrées exactes | 49/49 | 49/49 | 49/49 | 49.0 (100 %) | 49 à 49 |
| Connaissances proposées par le modèle | 110 | 111 | 113 | 111.3 | 110 à 113 |
| Connaissances gardées par le serveur | 105 | 108 | 108 | 107.0 | 105 à 108 |
| Inventions avant le filtre du serveur | 0 | 0 | 0 | 0.0 | 0 à 0 |
| Inventions après le filtre du serveur | 0 | 0 | 0 | 0.0 | 0 à 0 |
| Gardées hors corrigé (vraies mais non attendues) | 31 | 35 | 35 | 33.7 | 31 à 35 |
| Changements détectés (9) | 9/9 | 9/9 | 9/9 | 9.0 (100 %) | 9 à 9 |
| Changements avec le bon type | 8/9 | 8/9 | 8/9 | 8.0 (89 %) | 8 à 8 |
| Fausses alertes sur les pièges (4) | 0/4 | 1/4 | 1/4 | 0.7 (17 %) | 0 à 1 |
| Autres fausses alertes (règles inchangées signalées) | 0 | 0 | 0 | 0.0 | 0 à 0 |
| Nouveautés signalées par la comparaison | 17 | 16 | 16 | 16.3 | 16 à 17 |
| dont non fondées (texte déjà présent en v1) | 15/17 | 14/16 | 14/16 | 14.3 (88 %) | 14 à 15 |

### Détail par document (règles retrouvées, par passage)

| Document | P1 | P2 | P3 | Règles le plus souvent manquées |
|---|---|---|---|---|
| R1-v1 | 7/7 | 7/7 | 7/7 | aucune |
| R1-v2 | 7/7 | 6/7 | 7/7 | R1.tour-securite (1/3) |
| R2-v1 | 9/9 | 9/9 | 8/9 | R2.pas-obligation (1/3) |
| R3-v1 | 9/9 | 9/9 | 9/9 | aucune |
| H1-v1 | 12/12 | 12/12 | 12/12 | aucune |
| H1-v2 | 13/13 | 13/13 | 13/13 | aucune |
| H2-v1 | 8/8 | 8/8 | 8/8 | aucune |
| H3-v1 | 9/9 | 9/9 | 9/9 | aucune |

### Détail de la comparaison de versions

| Changement attendu | P1 | P2 | P3 |
|---|---|---|---|
| R1.c1 (modifie) | détecté | détecté | détecté |
| R1.c2 (modifie) | détecté | détecté | détecté |
| R1.c3 (ajoute) | détecté | détecté | détecté |
| R1.c4 (supprime) | détecté | détecté | détecté |
| H1.c1 (supprime) | détecté, classé « modifie » | détecté, classé « modifie » | détecté, classé « modifie » |
| H1.c2 (modifie) | détecté | détecté | détecté |
| H1.c3 (ajoute) | détecté | détecté | détecté |
| H1.c4 (ajoute) | détecté | détecté | détecté |
| H1.c5 (modifie) | détecté | détecté | détecté |
| Piège R1-v2 reformulation 1 | pas d’alerte | **fausse alerte** | **fausse alerte** |
| Piège R1-v2 deplacement 2 | pas d’alerte | pas d’alerte | pas d’alerte |
| Piège H1-v2 reformulation 1 | pas d’alerte | pas d’alerte | pas d’alerte |
| Piège H1-v2 identique 2 | pas d’alerte | pas d’alerte | pas d’alerte |
<!-- RESULTATS:FIN -->
