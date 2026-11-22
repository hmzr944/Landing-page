# Banc d'essai : mission 2c, comparaison de versions

Campagne de trois passages indépendants (2026-11-22), code `ee6bc1b`. Le corrigé a été figé **avant** le code
(`33caa5c`). Il compte 10 changements et 3 pièges (décision du 2026-11-22 sur R1), avec les 74 règles d'extraction
inchangées. Les seuils et critères sont fixés à l'avance et n'ont pas été modifiés. Modèle `openai/gpt-oss-120b`,
aucun appel en erreur, toutes les comparaisons analysées. Méthode : `docs/benchmark-extraction.md`.

**Conclusion : la mission 2c n'est pas réussie. Tous les critères ne sont atteints que sur 1 passage sur 3 (le
passage 2).** Le progrès principal est réel : les nouveautés non fondées passent de 13,3 en moyenne à 0,3. Mais trois
défauts empêchent la réussite (voir l'analyse).

## Critères, passage par passage

<!-- CRITERES:DEBUT (généré par tests/bench/report.mjs, ne pas modifier à la main) -->
| Critère | Passage 1 | Passage 2 | Passage 3 |
|---|---|---|---|
| Valeurs chiffrées exactes : 49/49 | 46 (**non**) | 49 (oui) | 49 (oui) |
| Règles sensibles : au moins 43/47 | 44 (oui) | 47 (oui) | 47 (oui) |
| Changements détectés : 10/10 | 9 (**non**) | 10 (oui) | 10 (oui) |
| Fausses alertes sur les 3 pièges : 0 | 0 (oui) | 0 (oui) | 0 (oui) |
| Nouveautés non fondées : 0 | 0 (oui) | 0 (oui) | 1 (**non**) |
| Inventions gardées : 0 | 0 (oui) | 0 (oui) | 0 (oui) |
| Extraction sans régression : au moins 73/74 règles | 71 (**non**) | 74 (oui) | 74 (oui) |
| **Tous les critères** | **non atteints** | atteints | **non atteints** |

**Mission 2c : critères non atteints sur 2 passage(s) sur 3.**
<!-- CRITERES:FIN -->

## Avant / après, à corrigé égal
« Avant » = la campagne de la mission 2b, **recalculée avec le corrigé et les règles de calcul de la mission 2c**
(10 changements, 3 pièges ; une nouveauté attendue par le corrigé n'est pas « non fondée »). Le rapport de la mission
2b, lui, reste calculé avec le corrigé de son époque.

<!-- COMPARAISON:DEBUT (généré par tests/bench/report.mjs, ne pas modifier à la main) -->
| Mesure | Avant : moyenne (pire passage) | Après : moyenne (pire passage) |
|---|---|---|
| Valeurs chiffrées exactes (sur 49) | 49.0 (49) | 48.0 (46) |
| Règles sensibles retrouvées (sur 47) | 46.7 (46) | 46.0 (44) |
| Changements détectés (sur 10) | 9.7 (9) | 9.7 (9) |
| Fausses alertes sur les pièges (sur 3) | 0.0 (0) | 0.0 (0) |
| Règles retrouvées (sur 74) | 73.3 (73) | 73.0 (71) |
| Sensibles classées « sensible » | 38.3 (37) | 39.0 (38) |
| Inventions après le filtre du serveur | 0.0 (0) | 0.0 (0) |
| Nouveautés non fondées (texte déjà présent en v1) | 13.3 (14) | 0.3 (1) |
| Passages où les quatre seuils sont atteints | 2 sur 3 | 2 sur 3 |
<!-- COMPARAISON:FIN -->

## Contrôle hors corpus (procédure P1, jamais vue, corrigé figé avant le code ; ni seuil ni réglage)

<!-- HORS-CORPUS:DEBUT (généré par tests/bench/report.mjs, ne pas modifier à la main) -->
| Mesure | P1 | P2 | P3 |
|---|---|---|---|
| Règles retrouvées à l'extraction | 20/20 | 20/20 | 20/20 |
| Changements détectés | 6/7 | 6/7 | 6/7 |
| Fausses alertes sur les pièges | 0/3 | 0/3 | 0/3 |
| Nouveautés non fondées | 1 | 1 | 1 |

| Changement attendu | P1 | P2 | P3 |
|---|---|---|---|
| P1.c1 (modifie) | détecté | détecté | détecté |
| P1.c2 (supprime) | détecté | détecté | détecté |
| P1.c3 (ajoute) | détecté | détecté | détecté |
| P1.c4 (ajoute) | détecté | détecté | détecté |
| P1.c5 (ajoute) | détecté | détecté | détecté |
| P1.c6 (modifie) | détecté | détecté | détecté |
| P1.c7 (modifie) | **manqué** (reformule) | **manqué** (reformule) | **manqué** (reformule) |
| Piège identique 1 | pas d’alerte | pas d’alerte | pas d’alerte |
| Piège deplacement 2 | pas d’alerte | pas d’alerte | pas d’alerte |
| Piège reformulation 3 | pas d’alerte | pas d’alerte | pas d’alerte |
<!-- HORS-CORPUS:FIN -->

## Analyse des échecs (aucune correction appliquée après la campagne)
1. **Changement d'ordre classé « reformulation » par le modèle.** R1.c5 est manqué 1 fois sur 3 ; P1.c7 (hors corpus)
   l'est 3 fois sur 3. Le modèle écrit lui-même « l'ordre des actions a été inversé mais le sens reste identique ».
   **Cause : un manque de mon implémentation.** Le périmètre validé prévoyait, pour les cas laissés au modèle, une
   « consigne précisée » sur les marqueurs d'ordre. Elle n'a pas été ajoutée à `compareVersions`. La règle
   déterministe, elle, fait bien ce qui était prévu : elle ne conclut pas à une reformulation quand « puis » apparaît.
2. **Nouveautés non fondées restantes : 2 défauts génériques.**
   - Une citation qui commence par un numéro de liste (« 4. Conserver les étiquettes… ») n'est pas retrouvée dans la
     v1, où l'étape portait le numéro 3 (passage 3, H1).
   - Une phrase déjà signalée « portée modifiée » est signalée une seconde fois comme « nouvelle » (hors corpus, 3 fois
     sur 3). Elle est comptée non fondée parce qu'elle double l'alerte de la connaissance d'origine.
3. **Régression de l'extraction au passage 1** (71 règles sur 74, 46 valeurs exactes sur 49, R1-v2 et H2). Le code
   d'extraction est inchangé depuis la mission 2b : c'est la variabilité du modèle. Le critère de non-régression n'est
   pas tenu pour autant.

## Ce qui fonctionne (prouvé)
- Nouveautés non fondées : de 13,3 à 0,3 en moyenne (14 au pire passage avant, 1 après).
- Aucune fausse alerte sur les 3 pièges, sur les 3 passages, corpus et hors corpus.
- Les 4 cas demandés passent leurs tests unitaires ; sur l'ancien code, 3 cas sur 4 échouent (la vraie nouveauté
  passait déjà).
- Hors corpus : la formulation déjà présente mais au sens nouveau (P1.c4) et la portée changée par la section (P1.c6)
  sont détectées 3 fois sur 3. La connaissance identique (piège 1) ne déclenche aucune alerte.
- Aucune invention gardée ; aucun appel en erreur.

## Proposition de suite (non engagée)
Une mission 2d courte :
- ajouter la consigne sur les marqueurs d'ordre (prévue en 2c, oubliée) ;
- retirer les numéros de liste des citations avant comparaison ;
- ne pas créer de nouveauté pour une phrase déjà signalée « portée modifiée ».

**Garde-fou :** la paire P1 a maintenant été vue. Avant toute correction, une seconde paire hors corpus, inédite,
serait écrite et figée. Puis viendrait une campagne de 3 passages, avec les mêmes seuils et les mêmes critères.

## Résultats détaillés (corpus n° 1)

<!-- RESULTATS:DEBUT (généré par tests/bench/report.mjs, ne pas modifier à la main) -->
Passages mesurés : 3. Modèle(s) : openai/gpt-oss-120b. Attentes dues à la limite de débit : 16, 18, 16.

### Seuils (à atteindre sur chacun des passages)

| Seuil | Passage 1 | Passage 2 | Passage 3 |
|---|---|---|---|
| Valeurs chiffrées exactes : 100 % | 46/49 (**non**) | 49/49 (oui) | 49/49 (oui) |
| Règles sensibles retrouvées : au moins 43/47 | 44/47 (oui) | 47/47 (oui) | 47/47 (oui) |
| Changements détectés : 10/10 | 9/10 (**non**) | 10/10 (oui) | 10/10 (oui) |
| Fausses alertes sur les 3 pièges : 0 | 0 (oui) | 0 (oui) | 0 (oui) |
| **Les quatre seuils** | **non atteints** | atteints | atteints |

### Autres mesures

| Mesure | P1 | P2 | P3 | Moyenne | Écart (min à max) |
|---|---|---|---|---|---|
| Règles retrouvées (74) | 71/74 | 74/74 | 74/74 | 73.0 (99 %) | 71 à 74 |
| Sensibles retrouvées (47) | 44/47 | 47/47 | 47/47 | 46.0 (98 %) | 44 à 47 |
| Sensibles retrouvées et classées « sensible » | 38/44 | 39/47 | 40/47 | 39.0 (85 %) | 38 à 40 |
| Valeurs chiffrées exactes | 46/49 | 49/49 | 49/49 | 48.0 (98 %) | 46 à 49 |
| Connaissances proposées par le modèle | 119 | 107 | 109 | 111.7 | 107 à 119 |
| Connaissances gardées par le serveur | 113 | 104 | 107 | 108.0 | 104 à 113 |
| Inventions avant le filtre du serveur | 0 | 0 | 0 | 0.0 | 0 à 0 |
| Inventions après le filtre du serveur | 0 | 0 | 0 | 0.0 | 0 à 0 |
| Gardées hors corrigé (vraies mais non attendues) | 41 | 30 | 33 | 34.7 | 30 à 41 |
| Changements détectés (10) | 9/10 | 10/10 | 10/10 | 9.7 (97 %) | 9 à 10 |
| Changements avec le bon type | 8/10 | 9/10 | 9/10 | 8.7 (87 %) | 8 à 9 |
| Fausses alertes sur les pièges (3) | 0/3 | 0/3 | 0/3 | 0.0 (0 %) | 0 à 0 |
| Autres fausses alertes (règles inchangées signalées) | 0 | 0 | 0 | 0.0 | 0 à 0 |
| Nouveautés signalées par la comparaison | 3 | 3 | 4 | 3.3 | 3 à 4 |
| dont non fondées (texte déjà présent en v1) | 0/3 | 0/3 | 1/4 | 0.3 (10 %) | 0 à 1 |

### Détail par document (règles retrouvées, par passage)

| Document | P1 | P2 | P3 | Règles le plus souvent manquées |
|---|---|---|---|---|
| R1-v1 | 7/7 | 7/7 | 7/7 | aucune |
| R1-v2 | 5/7 | 7/7 | 7/7 | R1.tour-securite (1/3), R1.comptage-deux (1/3) |
| R2-v1 | 9/9 | 9/9 | 9/9 | aucune |
| R3-v1 | 9/9 | 9/9 | 9/9 | aucune |
| H1-v1 | 12/12 | 12/12 | 12/12 | aucune |
| H1-v2 | 13/13 | 13/13 | 13/13 | aucune |
| H2-v1 | 7/8 | 8/8 | 8/8 | H2.panne (1/3) |
| H3-v1 | 9/9 | 9/9 | 9/9 | aucune |

### Détail de la comparaison de versions

| Changement attendu | P1 | P2 | P3 |
|---|---|---|---|
| R1.c1 (modifie) | détecté | détecté | détecté |
| R1.c2 (modifie) | détecté | détecté | détecté |
| R1.c3 (ajoute) | détecté | détecté | détecté |
| R1.c4 (supprime) | détecté | détecté | détecté |
| R1.c5 (modifie) | **manqué** (reformule) | détecté | détecté |
| H1.c1 (supprime) | détecté, classé « modifie » | détecté, classé « modifie » | détecté, classé « modifie » |
| H1.c2 (modifie) | détecté | détecté | détecté |
| H1.c3 (ajoute) | détecté | détecté | détecté |
| H1.c4 (ajoute) | détecté | détecté | détecté |
| H1.c5 (modifie) | détecté | détecté | détecté |
| Piège R1-v2 deplacement 1 | pas d’alerte | pas d’alerte | pas d’alerte |
| Piège H1-v2 reformulation 1 | pas d’alerte | pas d’alerte | pas d’alerte |
| Piège H1-v2 identique 2 | pas d’alerte | pas d’alerte | pas d’alerte |
<!-- RESULTATS:FIN -->
