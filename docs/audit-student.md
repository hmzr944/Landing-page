# Audit Student de bout en bout (décision D16)

Audit réalisé en pilotant le vrai navigateur sur l'application, **sans données simulées** : trois vrais PDF importés par
l'interface (analyse rapide, sans compte, le cas d'un nouvel étudiant), une vraie leçon, puis des sessions de révision
réelles en avançant l'horloge du navigateur (J0, J+1, J+3, J+8, J+20). Les notes données en révision suivent un motif
fixe (environ 70 % « Bien », 30 % « À revoir ») ; elles servent à faire vivre l'algorithme, pas à mesurer un élève.

Documents : une formation TCP-IP (34 pages, cours rédigé), un cours de droit des contrats (6 pages, essentiellement
un plan), un chapitre de cytogénétique (12 pages, deux colonnes). Les PDF personnels ne sont pas dans le dépôt.

## Ce qui fonctionne bien
- Écran d'accueil clair, un bouton principal ; import en 1 à 2 secondes ; aperçu du plan avant de créer le cours ;
  passages hors cours (annexes) mis de côté avec la page d'origine.
- Leçon guidée jouable de bout en bout (Découvre, Retiens, Vérifie), question ratée reposée en fin de leçon.
- FSRS cohérent dans le temps : intervalles qui s'allongent (nouvelle carte 10 min / 1 j / 3 j / 16 j), note suggérée,
  réussite de 75 à 85 % avec le motif de notes, 6 notions maîtrisées sur 15 à J+20.
- Aucune erreur JavaScript sur tout le parcours.

## Défauts constatés et état

| # | Défaut (preuve) | Gravité | État |
|---|---|---|---|
| 1 | Après « Un PDF » dans l'introduction, l'introduction fermée restait invisible au-dessus de tout et interceptait les clics : impossible de choisir son fichier ou de cliquer « Analyser » (`.onb { display:flex }` écrasait `[hidden]`) | **P0 bloquant** | Corrigé, test A2-A3 |
| 2 | Accueil v51 : « Reprendre » pointait 14 jours vers la leçon déjà terminée ; le bouton principal ne lançait jamais la session : **0 carte révisée en 20 jours** | **P0** (régression v51) | Corrigé : leçon suivante et session d'abord ; test B1 |
| 3 | Import : toute partie de plus de 6 000 caractères coupée sans prévenir (5 parties sur 15 du cours TCP-IP ; 73 400 caractères gardés sur ~96 000) | **P0 perte de contenu** | Corrigé : 91 700 gardés ; test A5 |
| 4 | Mots coupés par des espaces dans les PDF dont le texte est en morceaux (« P rophase », « c ycle », titre « Divisions cellulaire s ») | **P0 lisibilité** | Corrigé (espace seulement s'il y a un vrai blanc) ; test A6 |
| 5 | « Commencer » ouvre la création de compte ; « Essayer sans compte » était sous la ligne de flottaison (872 px pour un écran de 844) | P1 | Corrigé : lien remonté sous les boutons ; test A1 |
| 6 | Guillemets LaTeX affichés « ✭✭ géré ✮✮ » ; symboles Wingdings bruts (``, ``, ``) | P1 | Corrigé (« », et les seuls codes vérifiés •, ✓, →) ; les autres codes de cette zone, dont ceux de la police Symbol (≥, α…), restent intacts pour ne jamais effacer de sens ; tests A7, C1-C3 |
| 7 | L'accueil annonçait « Ta prochaine leçon » mais lançait une session de révision ; titre de leçon répété dans « ensuite » | P1 | Corrigé ; test B1-B2 |
| 8 | Une notion difficile restait l'action principale chaque jour, même rouverte, et bloquait la progression | P1 | Corrigé (rouverte depuis moins de 12 h : on passe à la suite) ; test B4 |
| 9 | Leçon « Découvre » : phrases qui dépendent du contexte (« Dans ce cas, le processus… est le suivant ») | P1 | Amélioré (4 sur 5 correctes sur le cours TCP-IP) |
| 10 | « Mot manquant » avec des leurres grammaticaux absurdes (« puisque » à la place d'un nom) | P1 | Corrigé (mots grammaticaux exclus) |
| 11 | Carte de révision « Tiré de ton surlignage » alors que l'étudiant n'a rien surligné | P2 | Corrigé : « Phrase clé de ton cours » |
| 12 | « z z Z » de Pousse lu comme du texte par les lecteurs d'écran | P2 | Corrigé (`aria-hidden`) |
| 13 | Cours en deux colonnes pris pour un « programme » ; lignes des deux colonnes mélangées, bouts de phrase pris pour des titres (« On assiste à un appariement progressif des ») | **P1** | **Non corrigé** : refonte de la lecture des colonnes à prévoir |
| 14 | Notions trop grosses en analyse rapide (15 notions pour 34 pages, jusqu'à 15 000 caractères) : une carte « Rappel libre » pour toute une section | **P1** | **Non corrigé** : découper par sous-titres et paragraphes |
| 15 | Questions « De quelle notion parle cette phrase ? » majoritaires (3 sur 5) : elles testent l'emplacement, et le mot-clé est souvent dans la phrase | P1 | Non corrigé |
| 16 | Unique question de l'introduction posée sur une phrase sans contenu (« Nous nous intéressons ici uniquement au protocole IPV4. ») et notée fausse pour une réponse défendable | P1 | Non corrigé |
| 17 | Neuf écrans avant d'apprendre (porte, objectifs, précisions, source, import, récapitulatif, question, fin) | P2 | Non corrigé |
| 18 | Les nouvelles cartes d'une leçon attendent la fin de toutes les leçons avant leur premier rappel | P2 | Non corrigé |

Correction d'un constat intermédiaire : le terme « MSS », cité un moment comme perdu, n'existe dans le PDF TCP-IP que
dans une figure ; il ne fait pas partie de la perte de contenu.

## Parcours après corrections (même étudiant, même PDF)
Premier lancement → « Essayer sans compte » visible → introduction → import cliquable (1,7 s) → cours créé →
leçon « La couche de liens d'internet » → accueil : leçon suivante → J0 et J+1 : leçons « Le protocole IP »,
« TCP et UDP » → J+3 : nouvelles cartes → J+8, J+20 : révisions dues ; à J+20 les 15 notions sont travaillées
(6 maîtrisées, 6 en cours, 3 fragiles). Avant correction : bloqué à l'import depuis l'introduction, puis aucune révision.

## Limites
- Analyse rapide seulement (sans compte) : l'analyse avancée par le serveur et Pousse n'ont pas été jouées.
- Motif de notes artificiel ; aucun test avec de vrais étudiants.
- Outils de l'audit (scripts Playwright) gardés hors du dépôt ; les défauts corrigés sont verrouillés par
  `tests/student-path.js` (vérifié : il échoue sur l'ancien code).
