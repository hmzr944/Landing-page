# Banc d'essai de l'extraction Business (mission 2)

Mesure de la capacité réelle d'Arbor à comprendre des procédures et à détecter leurs évolutions, sur le corpus métier
n° 1 (8 documents fabriqués, voir `docs/corpus-metier/README.md`). Mesures du 2026-11-18.

**Conclusion : aucun des quatre seuils n'est atteint, sur aucun des trois passages.** Le moteur n'invente rien
(le filtre du serveur écarte toutes les citations inventées), mais il **oublie** trop de règles, en particulier des
règles sensibles, et ses résultats varient fortement d'un passage à l'autre.

## Ce qui a été mesuré, et comment
- **Code mesuré : celui de la production.** La tâche `extraire` passe par `handle()` (handler.ts) : relecture du PDF par
  le serveur, vérification des passages, appel au modèle, filtre `cleanGen`. La comparaison passe par `compareVersions()`
  (engines.ts). Seuls la base de données et le stockage sont simulés en mémoire.
- **Modèle : celui de la production**, `openai/gpt-oss-120b` chez Groq, offre gratuite.
- **Passages envoyés : exactement ceux du navigateur** (`OrgDocs.readPages` puis `OrgDocs.batches`), enregistrés dans
  `docs/benchmark/passages.json`.
- **Comparaison de versions :** les connaissances « validées » de la v1 sont toutes les consignes de la v1 (texte exact
  du corrigé). On mesure ainsi la comparaison seule, sans les erreurs de l'extraction.
- **Limite de débit :** l'offre gratuite autorise 8 000 jetons par minute. Le banc attend le délai indiqué par Groq puis
  réessaie le même modèle, pour mesurer la qualité et non le débit (10 à 14 attentes par passage).
- **Calcul des scores, sans IA** (`tests/bench/score.mjs`, règles écrites en tête du fichier) :
  - **règle retrouvée** : au moins 50 % de ses suites de 4 mots figurent dans l'extrait d'une connaissance gardée ;
  - **valeur exacte** : tous les nombres de la règle, signe compris, figurent dans le titre ou le texte de la
    connaissance ; un nombre écrit en lettres compte (« quinze » = 15) ;
  - **invention** : extrait absent du document, ou nombre du texte absent du document ;
  - **changement détecté** : la connaissance concernée est classée « modifiée » ou « supprimée », ou une nouvelle
    connaissance reprend la règle ajoutée ;
  - **fausse alerte sur un piège** : une connaissance du piège classée « modifiée » ou « supprimée », ou une nouvelle
    connaissance créée pour une simple reformulation.
- **Reproductible :** chaque réponse brute du modèle est enregistrée dans `docs/benchmark/runs/passage-N.json`. Le
  tableau ci-dessous est recalculé à partir de ces fichiers. La CI (`tests/benchmark.js`) vérifie, sans appel à l'IA,
  que ce tableau correspond exactement aux réponses enregistrées.

## Résultats

<!-- RESULTATS:DEBUT (généré par tests/bench/report.mjs, ne pas modifier à la main) -->
Passages mesurés : 3. Modèle(s) : openai/gpt-oss-120b. Attentes dues à la limite de débit : 12, 14, 10.

### Seuils (à atteindre sur chacun des passages)

| Seuil | Passage 1 | Passage 2 | Passage 3 |
|---|---|---|---|
| Valeurs chiffrées exactes : 100 % | 35/49 (**non**) | 31/49 (**non**) | 24/49 (**non**) |
| Règles sensibles retrouvées : au moins 43/47 | 32/47 (**non**) | 31/47 (**non**) | 24/47 (**non**) |
| Changements détectés : 9/9 | 8/9 (**non**) | 7/9 (**non**) | 6/9 (**non**) |
| Fausses alertes sur les 4 pièges : 0 | 0 (oui) | 1 (**non**) | 0 (oui) |
| **Les quatre seuils** | **non atteints** | **non atteints** | **non atteints** |

### Autres mesures

| Mesure | P1 | P2 | P3 | Moyenne | Écart (min à max) |
|---|---|---|---|---|---|
| Règles retrouvées (74) | 55/74 | 50/74 | 39/74 | 48.0 (65 %) | 39 à 55 |
| Sensibles retrouvées (47) | 32/47 | 31/47 | 24/47 | 29.0 (62 %) | 24 à 32 |
| Sensibles retrouvées et classées « sensible » | 4/32 | 6/31 | 4/24 | 4.7 (16 %) | 4 à 6 |
| Valeurs chiffrées exactes | 35/49 | 31/49 | 24/49 | 30.0 (61 %) | 24 à 35 |
| Connaissances proposées par le modèle | 69 | 63 | 47 | 59.7 | 47 à 69 |
| Connaissances gardées par le serveur | 62 | 58 | 42 | 54.0 | 42 à 62 |
| Inventions avant le filtre du serveur | 7 | 5 | 3 | 5.0 | 3 à 7 |
| Inventions après le filtre du serveur | 0 | 0 | 0 | 0.0 | 0 à 0 |
| Gardées hors corrigé (vraies mais non attendues) | 11 | 9 | 6 | 8.7 | 6 à 11 |
| Changements détectés (9) | 8/9 | 7/9 | 6/9 | 7.0 (78 %) | 6 à 8 |
| Changements avec le bon type | 8/9 | 6/9 | 5/9 | 6.3 (70 %) | 5 à 8 |
| Fausses alertes sur les pièges (4) | 0/4 | 1/4 | 0/4 | 0.3 (8 %) | 0 à 1 |
| Autres fausses alertes (règles inchangées signalées) | 0 | 0 | 0 | 0.0 | 0 à 0 |

### Détail par document (règles retrouvées, par passage)

| Document | P1 | P2 | P3 | Règles le plus souvent manquées |
|---|---|---|---|---|
| R1-v1 | 7/7 | 7/7 | 1/7 | R1.alarme-delai (1/3), R1.tour-securite (1/3), R1.fond-caisse (1/3), R1.annonce (1/3) |
| R1-v2 | 2/7 | 4/7 | 1/7 | R1.annonce (3/3), R1.comptage-deux (3/3), R1.alarme-delai (2/3), R1.tour-securite (2/3) |
| R2-v1 | 6/9 | 5/9 | 5/9 | R2.reparer-remplacer (3/3), R2.jamais-refuser (2/3), R2.especes-150 (2/3), R2.delai-30 (2/3) |
| R3-v1 | 6/9 | 9/9 | 4/9 | R3.faux-remise (2/3), R3.prelevement (2/3), R3.ecart (2/3), R3.detecteur (1/3) |
| H1-v1 | 4/12 | 8/12 | 8/12 | H1.rangement (3/3), H1.tracabilite (3/3), H1.t-preparations (2/3), H1.t-glaces (2/3) |
| H1-v2 | 13/13 | 4/13 | 3/13 | H1.t-peche (2/3), H1.t-volaille (2/3), H1.t-preparations (2/3), H1.t-glaces (2/3) |
| H2-v1 | 8/8 | 4/8 | 8/8 | H2.jeter (1/3), H2.maintien (1/3), H2.remise (1/3), H2.panne (1/3) |
| H3-v1 | 9/9 | 9/9 | 9/9 | aucune |

### Détail de la comparaison de versions

| Changement attendu | P1 | P2 | P3 |
|---|---|---|---|
| R1.c1 (modifie) | détecté | détecté | détecté |
| R1.c2 (modifie) | détecté | détecté | détecté |
| R1.c3 (ajoute) | détecté | détecté | **manqué** (absent) |
| R1.c4 (supprime) | détecté | détecté | détecté |
| H1.c1 (supprime) | détecté | détecté, classé « modifie » | détecté, classé « modifie » |
| H1.c2 (modifie) | détecté | détecté | détecté |
| H1.c3 (ajoute) | détecté | **manqué** (absent) | **manqué** (absent) |
| H1.c4 (ajoute) | **manqué** (absent) | **manqué** (absent) | **manqué** (absent) |
| H1.c5 (modifie) | détecté | détecté | détecté |
| Piège R1-v2 reformulation 1 | pas d’alerte | pas d’alerte | pas d’alerte |
| Piège R1-v2 deplacement 2 | pas d’alerte | pas d’alerte | pas d’alerte |
| Piège H1-v2 reformulation 1 | pas d’alerte | **fausse alerte** | pas d’alerte |
| Piège H1-v2 identique 2 | pas d’alerte | pas d’alerte | pas d’alerte |
<!-- RESULTATS:FIN -->

## Analyse

### 1. L'extraction oublie des règles (65 % retrouvées en moyenne, de 39 à 55 sur 74)
- **La consigne plafonne le rappel.** Elle demande « 3 à 10 connaissances, les plus utiles », et le serveur en garde 14
  au plus par lot. Or H1 contient 12 ou 13 règles dans un seul lot. Le modèle doit donc choisir, et il laisse souvent
  de côté les consignes de fin de liste (rangement, traçabilité, comptage à deux).
- **Les listes sont regroupées puis rejetées.** Le modèle regroupe souvent plusieurs étapes en une seule connaissance,
  avec une citation raccourcie par « … ». Ce n'est plus une citation exacte : le serveur l'écarte, à juste titre, et ces
  étapes sont perdues. Il recolle aussi parfois un titre de section à une ligne (« Températures maximales à réception
  Produits de la pêche frais… »), ce qui la rend introuvable telle quelle.
- **La variation est forte.** Le même document H1-v2 donne 13 règles sur 13, puis 4, puis 3 ; R1-v1 donne 7, 7, puis 1.
  On ne peut pas se fier à une seule extraction.

### 2. Les règles sensibles sont mal signalées (16 % classées « sensible »)
Parmi les règles sensibles retrouvées, seules 4 à 6 sont classées « sensible » par le modèle ou par la détection du
serveur. Or c'est ce classement qui réserve la validation aux managers. **C'est le défaut le plus grave pour la
sécurité** : une règle d'alarme, d'allergie ou de température peut être validée par un simple expert.

### 3. Rien n'est inventé dans ce qui est gardé
Le modèle propose 3 à 7 connaissances non conformes par passage. Le filtre du serveur (citation exacte, texte appuyé sur
le passage) les écarte toutes : **0 invention après le filtre**, sur les trois passages. Quatre connaissances gardées
portent toutefois un nombre différent de la règle qu'elles reprennent.

### 4. La comparaison détecte bien les modifications, mal les ajouts
- Les modifications de chiffres et les suppressions sont détectées à chaque passage (fond de caisse, alarme, DLC,
  rangement). La suppression de l'exception du commis est parfois classée « modifiée » : elle est détectée quand même.
- Les **règles ajoutées** sont souvent manquées : photos des refus (0 sur 3), tolérance de 3 °C (1 sur 3), défibrillateur
  (2 sur 3).
- Au passage 2, l'appel de comparaison H1 a échoué deux fois (erreur 400 de Groq, réponse hors du format demandé). Le
  serveur s'est alors replié sur « tout ce qui n'est pas retrouvé mot pour mot est à revoir par un humain ». C'est ce
  repli qui produit la seule fausse alerte sur un piège. Le repli est prudent, mais sans analyse.

### 5. Le score de confiance ne mesure rien
Les 162 connaissances gardées ont toutes une confiance déclarée entre 0,98 et 1. Parmi elles, 4 portent une valeur
chiffrée fausse, et 30 ne correspondent à aucune règle du corrigé (des informations vraies, mais non attendues). Le
score ne distingue donc rien. Son affichage (« confiance X % ») est retiré dans cette mission. À la place, la fiche
d'une connaissance affiche l'origine et la date de l'extraction, puis la date de confirmation par une personne.

## Défauts constatés hors du périmètre (mesurés, non corrigés)
| Défaut | Preuve | Effet en production |
|---|---|---|
| Le modèle de secours `llama-3.3-70b-versatile` n'existe plus chez Groq (404) | `docs/benchmark/runs/preuve-limite-debit.json` | dès que la limite de 8 000 jetons par minute est atteinte, la requête échoue (502) au lieu d'attendre : 4 documents sur 8 en échec lors d'un premier essai sans attente |
| Pas d'attente ni de nouvel essai sur une erreur 429 dans `model.ts` | même fichier | envoyer plusieurs documents à la suite échoue |
| Erreur 400 de Groq (réponse hors format) sans nouvel essai | passage 2, comparaison H1 | comparaison sans analyse, tout part en revue humaine |
| Consigne « 3 à 10 connaissances » et limite de 14 par lot | détail par document | rappel plafonné sur les documents riches |
| Classement « sensible » rare | 16 % | validation réservée aux managers contournée |
| Ajouts mal détectés par `comparer_versions` | photos 0/3 | une nouvelle obligation peut passer inaperçue |

## Limites de cette mesure
- Huit documents courts et fabriqués ; aucune procédure réelle d'entreprise.
- Trois passages seulement ; la variation observée justifierait davantage de passages pour une moyenne fiable.
- Le calcul de correspondance (50 % des suites de 4 mots) est un choix documenté. Il peut compter comme retrouvée une
  règle noyée dans une connaissance qui en regroupe plusieurs (les cinq températures de H1-v2 en une seule).
- La comparaison est mesurée avec des connaissances v1 parfaites. En production, elle hérite aussi des oublis de
  l'extraction.
- Le banc appelle le vrai modèle : il n'est pas lancé par la CI, qui n'a pas de clé. La CI recalcule et vérifie les
  scores à partir des réponses enregistrées.

## Relancer le banc
```
node tests/bench/passages.js                                       # passages du navigateur (si le lecteur change)
AI_API_KEY=proxy-injected deno run -A tests/bench/run.ts 1         # puis 2, puis 3 : vrais appels au modèle
node tests/bench/report.mjs                                        # recalcule le tableau de ce rapport
node tests/benchmark.js                                            # vérifications sans IA (aussi en CI)
```
La clé Groq n'est jamais lue ni écrite par ces scripts. Dans l'environnement de travail, le proxy l'ajoute lui-même aux
requêtes vers Groq ; ailleurs, `AI_API_KEY` doit être fournie par l'environnement, jamais dans un fichier.
