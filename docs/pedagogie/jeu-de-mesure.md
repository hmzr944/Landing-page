# Jeu de mesure pédagogique (mission 3a) : version de relecture

Statut : **proposition corrigée, à relire et valider avant toute mesure**. Généré par `docs/pedagogie/assembler.js` à partir des sources relues ; ne pas modifier ce fichier à la main.

La bonne réponse est marquée ✔ (ordre des choix mélangé). Les participants voient les questions sans cette marque.

Chaque question porte un classement « évalue », **écrit et relu dans les sources** (pas deviné par un programme) : **application** (décider ou calculer dans un cas concret nouveau), **compréhension** (expliquer une cause ou un mécanisme) ou **restitution** (redonner une définition, un nom ou un chiffre appris, donc de la mémorisation).

Règles de composition, vérifiées par `tests/jeu-de-mesure.js` : compréhension immédiate, au moins 2 questions sur 3 en application ou compréhension ; rappel à J+2, 3 restitutions (mesure de mémorisation) et 1 application ; déblocage, 2 questions préparées à l'avance (1 application, 1 compréhension), posées seulement après une seconde explication.

## Bilan : ce que les questions évaluent

| Bloc | Application | Compréhension | Restitution (mémorisation) |
|---|---|---|---|
| Compréhension immédiate (69 questions) | 28 | 39 | 2 |
| Rappel à J+2 (92 questions) | 23 | 0 | 69 |
| Déblocage (46 questions) | 23 | 23 | 0 |

| Élément | Compréhension immédiate (app. / comp. / rest.) | Rappel J+2 (app. / comp. / rest.) | Déblocage (app. / comp.) |
|---|---|---|---|
| S01 Le protocole IP | 1 / 2 / 0 | 1 / 0 / 3 | 1 / 1 |
| S02 La mémoire de l'ordinateur (RAM) | 1 / 2 / 0 | 1 / 0 / 3 | 1 / 1 |
| S03 Le chiffrement d'un message | 1 / 2 / 0 | 1 / 0 / 3 | 1 / 1 |
| S04 Le théorème de Pythagore | 2 / 1 / 0 | 1 / 0 / 3 | 1 / 1 |
| S05 Les fractions | 1 / 2 / 0 | 1 / 0 / 3 | 1 / 1 |
| S06 Les intérêts composés | 1 / 2 / 0 | 1 / 0 / 3 | 1 / 1 |
| S07 La photosynthèse | 1 / 2 / 0 | 1 / 0 / 3 | 1 / 1 |
| S08 Le système immunitaire | 1 / 2 / 0 | 1 / 0 / 3 | 1 / 1 |
| S09 L'ADN | 1 / 2 / 0 | 1 / 0 / 3 | 1 / 1 |
| S10 Le vaccin | 1 / 2 / 0 | 1 / 0 / 3 | 1 / 1 |
| S11 Le cycle de l'eau | 1 / 2 / 0 | 1 / 0 / 3 | 1 / 1 |
| S12 L'effet de serre | 1 / 2 / 0 | 1 / 0 / 3 | 1 / 1 |
| S13 La gravitation | 1 / 2 / 0 | 1 / 0 / 3 | 1 / 1 |
| S14 Tension et intensité électriques | 1 / 2 / 0 | 1 / 0 / 3 | 1 / 1 |
| S15 L'inflation | 2 / 1 / 0 | 1 / 0 / 3 | 1 / 1 |
| S16 L'offre et la demande | 1 / 2 / 0 | 1 / 0 / 3 | 1 / 1 |
| S17 La TVA | 2 / 1 / 0 | 1 / 0 / 3 | 1 / 1 |
| S18 Le contrat de travail | 1 / 2 / 0 | 1 / 0 / 3 | 1 / 1 |
| S19 Le RGPD | 2 / 1 / 0 | 1 / 0 / 3 | 1 / 1 |
| S20 La chaîne du froid | 1 / 2 / 0 | 1 / 0 / 3 | 1 / 1 |
| P-R1 Ouverture et fermeture du magasin (R1 v2, corpus métier n° 1, fictif) | 1 / 1 / 1 | 1 / 0 / 3 | 1 / 1 |
| P-H1 Réception des livraisons (H1 v2, corpus métier n° 1, fictif) | 1 / 1 / 1 | 1 / 0 / 3 | 1 / 1 |
| P-R3 Tenue de la caisse (R3, corpus métier n° 1, fictif) | 2 / 1 / 0 | 1 / 0 / 3 | 1 / 1 |

## S01 · Le protocole IP

*Domaine : numérique*

**Glossaire (termes à surveiller) :** adresse IP, paquet, routeur, réseau, protocole, en-tête, Internet

**Compréhension immédiate**

1. Pourquoi un fichier envoyé sur Internet est-il découpé en paquets ? *(évalue : compréhension)*
   - Pour le rendre secret
   - Pour qu'il prenne moins de place sur le disque
   - Parce que la loi l'impose
   - ✔ Pour qu'il voyage par petits morceaux qui peuvent prendre des chemins différents
2. Un routeur reçoit un paquet adressé à un ordinateur situé dans un autre pays. Que fait-il ? *(évalue : application)*
   - Il ouvre le paquet pour lire le message
   - Il le garde jusqu'à ce que le destinataire le réclame
   - ✔ Il lit l'adresse de destination et l'envoie vers le routeur suivant le plus adapté
   - Il le renvoie à l'expéditeur
3. Un câble est coupé sur le trajet habituel entre deux villes, mais la vidéo continue d'arriver. Pourquoi ? *(évalue : compréhension)*
   - ✔ Les routeurs font passer les paquets par un autre chemin
   - Les paquets n'ont pas besoin de chemin
   - Le câble coupé fonctionne encore à moitié
   - La vidéo était déjà entièrement chargée dans le câble

**Situation de transfert :** Pendant un appel vidéo, l'image se fige une seconde puis repart, sans que l'appel soit coupé.

> Avec ce que tu sais des paquets, explique ce qui a pu se passer.

*Réponse attendue :* Certains paquets ont été retardés ou perdus en route (chemin encombré) ; les suivants sont arrivés et l'appel a continué.

**Déblocage** *(seulement si l'apprenant s'est déclaré bloqué : posé après la seconde explication ; grille dans `grille-reformulation.md`)*

1. Tu envoies une photo à un ami. Combien d'adresses de destination différentes portent ses paquets ? *(évalue : application)*
   - Une différente par paquet
   - Une par routeur traversé
   - Aucune
   - ✔ Une seule : celle de l'ami, sur chaque paquet
2. Pourquoi n'a-t-on pas besoin de réserver un chemin fixe avant d'envoyer des paquets ? *(évalue : compréhension)*
   - Parce qu'Internet n'a qu'un seul chemin
   - Parce qu'on envoie tout en un seul morceau
   - Parce que les paquets connaissent la carte du monde
   - ✔ Chaque paquet porte son adresse et chaque routeur décide du pas suivant

**Rappel à J+2**

1. Sur un paquet IP, qu'est-ce qui permet de savoir où il doit aller ? *(évalue : restitution (mémorisation))*
   - L'heure d'envoi
   - Le nom de l'ordinateur
   - ✔ L'adresse de destination
   - Son poids
2. Deux paquets d'un même message prennent-ils forcément le même chemin ? *(évalue : restitution (mémorisation))*
   - Oui, toujours
   - ✔ Non, ils peuvent passer par des routeurs différents
   - Seulement la nuit
   - Seulement sur un câble
3. Quel appareil fait passer un paquet d'un réseau à un autre ? *(évalue : restitution (mémorisation))*
   - L'écran
   - Le clavier
   - L'imprimante
   - ✔ Le routeur
4. Un message est découpé en 10 paquets ; le 4e arrive après le 7e. Que faut-il pour reconstituer le message ? *(évalue : application)*
   - Renvoyer tout le message
   - Jeter le 4e paquet
   - Rien, l'ordre n'a pas d'importance
   - ✔ Remettre les paquets dans le bon ordre à l'arrivée

**Reformulation, idée centrale :** Les données voyagent en petits paquets portant une adresse de destination, que des routeurs font avancer de proche en proche.

**Éléments clés :** découpage en paquets ; adresse lue par les routeurs pour acheminer

## S02 · La mémoire de l'ordinateur (RAM)

*Domaine : numérique*

**Glossaire (termes à surveiller) :** mémoire vive, RAM, stockage, disque, volatile, processeur, programme

**Compréhension immédiate**

1. Pourquoi un document non enregistré est-il perdu si l'ordinateur s'éteint brutalement ? *(évalue : compréhension)*
   - Parce que l'écran s'éteint
   - ✔ Parce qu'il était seulement dans la mémoire vive, qui s'efface sans courant
   - Parce que le disque se vide
   - Parce que le clavier est débranché
2. Pourquoi un ordinateur ralentit-il quand on ouvre beaucoup de programmes ? *(évalue : compréhension)*
   - L'écran fatigue
   - La souris consomme trop
   - ✔ La mémoire vive se remplit et l'ordinateur doit utiliser le disque, plus lent
   - Le disque devient plus rapide
3. Tu dois garder des photos de vacances pendant des années. Où faut-il les enregistrer ? *(évalue : application)*
   - Dans la mémoire vive
   - Dans le processeur
   - ✔ Sur le disque ou une clé, qui gardent les données sans courant
   - Dans l'écran

**Situation de transfert :** Tu prépares un exposé au tableau blanc pendant que tes fiches sont rangées dans un classeur.

> Si tu compares à un ordinateur, que représentent le tableau et le classeur, et pourquoi ?

*Réponse attendue :* Le tableau = la mémoire vive (on travaille dessus, rapide, effacé à la fin) ; le classeur = le disque (on y range pour garder).

**Déblocage** *(seulement si l'apprenant s'est déclaré bloqué : posé après la seconde explication ; grille dans `grille-reformulation.md`)*

1. Une coupure de courant survient pendant que tu écris. Qu'est-ce qui sera conservé ? *(évalue : application)*
   - ✔ Ce qui avait déjà été enregistré sur le disque
   - Tout ce qui était à l'écran
   - Rien du tout, même enregistré
   - Seulement ce qui était dans la mémoire vive
2. Pourquoi un ordinateur utilise-t-il de la mémoire vive au lieu de tout faire directement sur le disque ? *(évalue : compréhension)*
   - Parce qu'elle garde les données plus longtemps
   - Parce que le disque ne peut rien lire
   - Parce qu'elle est gratuite
   - ✔ Parce qu'elle est beaucoup plus rapide pour travailler

**Rappel à J+2**

1. La mémoire vive garde-t-elle les données quand l'ordinateur est éteint ? *(évalue : restitution (mémorisation))*
   - Seulement le week-end
   - ✔ Non
   - Oui
   - Seulement les photos
2. Où faut-il enregistrer un fichier pour le retrouver le lendemain ? *(évalue : restitution (mémorisation))*
   - Dans la mémoire vive
   - Dans l'écran
   - ✔ Sur le disque (stockage)
   - Dans le processeur
3. Ajouter de la mémoire vive aide surtout à… *(évalue : restitution (mémorisation))*
   - garder plus de photos pour toujours
   - avoir un écran plus grand
   - se connecter à Internet
   - ✔ faire tourner plus de programmes en même temps sans ralentir
4. Ton ordinateur est très lent avec 30 onglets ouverts, mais son disque est presque vide. Quelle est la cause la plus probable ? *(évalue : application)*
   - Le clavier est usé
   - ✔ La mémoire vive est pleine
   - Le disque est trop vide
   - L'écran est trop petit

**Reformulation, idée centrale :** La mémoire vive est l'espace de travail rapide mais temporaire de l'ordinateur ; ce qui doit durer va sur le disque.

**Éléments clés :** rapide et effacée sans courant ; différence avec le stockage durable

## S03 · Le chiffrement d'un message

*Domaine : numérique*

**Glossaire (termes à surveiller) :** chiffrer, déchiffrer, clé, message chiffré, algorithme, confidentialité

**Compréhension immédiate**

1. Pourquoi un message chiffré intercepté est-il inutile pour un espion qui n'a pas la clé ? *(évalue : compréhension)*
   - Parce qu'il est en anglais
   - ✔ Parce qu'il est illisible sans la clé
   - Parce qu'il est trop long
   - Parce qu'il est effacé
2. Quelqu'un a volé la clé de ta messagerie chiffrée. Quel est le risque ? *(évalue : application)*
   - Les messages disparaissent
   - ✔ Il peut lire les messages chiffrés avec cette clé
   - Aucun, le chiffrement protège toujours
   - La clé change toute seule
3. Deux personnes utilisent la même méthode de chiffrement connue de tous. Qu'est-ce qui garde leurs messages secrets ? *(évalue : compréhension)*
   - La langue utilisée
   - ✔ La clé, qu'elles seules connaissent
   - Le fait que la méthode soit connue
   - La longueur des messages

**Situation de transfert :** Deux amies s'écrivent en décalant chaque lettre de trois rangs dans l'alphabet (A devient D).

> Qu'est-ce qui joue ici le rôle de la clé, et que doit savoir l'autre amie pour lire le mot ?

*Réponse attendue :* La clé est le décalage de 3 ; il faut le connaître pour décaler chaque lettre dans l'autre sens.

**Déblocage** *(seulement si l'apprenant s'est déclaré bloqué : posé après la seconde explication ; grille dans `grille-reformulation.md`)*

1. Tu reçois « EBUF », chiffré avec un décalage de 1. Quel était le mot ? *(évalue : application)*
   - ✔ DATE
   - CATE
   - EBUF
   - FCVG
2. Pourquoi faut-il transmettre la clé autrement que par le même canal que le message ? *(évalue : compréhension)*
   - Parce que la clé est trop longue
   - Parce que la loi l'interdit
   - ✔ Si quelqu'un intercepte les deux, il peut tout lire
   - Ce n'est jamais nécessaire

**Rappel à J+2**

1. Chiffrer un message, c'est… *(évalue : restitution (mémorisation))*
   - ✔ le rendre illisible sans la clé
   - l'imprimer
   - le raccourcir
   - le traduire
2. Ce qui doit rester secret avant tout, c'est… *(évalue : restitution (mémorisation))*
   - la longueur du message
   - ✔ la clé
   - l'heure d'envoi
   - la langue
3. Déchiffrer, c'est… *(évalue : restitution (mémorisation))*
   - envoyer le message
   - copier le message
   - ✔ retrouver le message lisible avec la clé
   - supprimer le message
4. Avec un décalage de 1 dans l'alphabet, comment s'écrit le mot « OUI » chiffré ? *(évalue : application)*
   - QWK
   - NTH
   - OUI
   - ✔ PVJ

**Reformulation, idée centrale :** Chiffrer transforme un message en texte illisible que seule la personne qui a la clé peut remettre en clair.

**Éléments clés :** illisible sans la clé ; la clé doit rester secrète

## S04 · Le théorème de Pythagore

*Domaine : mathématiques*

**Glossaire (termes à surveiller) :** triangle rectangle, angle droit, hypoténuse, côté, carré d'un nombre, théorème

**Compréhension immédiate**

1. Dans un triangle rectangle de côtés 3 et 4 autour de l'angle droit, combien mesure le plus grand côté ? *(évalue : application)*
   - 7
   - 6
   - ✔ 5
   - 12
2. On ne peut pas utiliser le théorème pour calculer un côté d'un triangle sans angle droit. Pourquoi ? *(évalue : compréhension)*
   - Parce que ce triangle n'a pas de côtés
   - ✔ La relation entre les carrés des côtés n'est vraie qu'avec un angle droit
   - Parce que le calcul serait trop long
   - On peut l'utiliser pour tous les triangles
3. Un triangle a des côtés 5, 12 et 13. Est-il rectangle ? *(évalue : application)*
   - Non, aucun triangle n'a ces côtés
   - ✔ Oui, car 5² + 12² = 13²
   - On ne peut pas savoir
   - Non, car 5 + 12 ≠ 13

**Situation de transfert :** Une échelle de 5 m est posée contre un mur ; son pied est à 3 m du mur, sur un sol plat.

> À quelle hauteur l'échelle touche-t-elle le mur ? Explique ton raisonnement.

*Réponse attendue :* 4 m : le mur et le sol font un angle droit, 5² = 3² + h², donc h² = 16 et h = 4.

**Déblocage** *(seulement si l'apprenant s'est déclaré bloqué : posé après la seconde explication ; grille dans `grille-reformulation.md`)*

1. Un écran a 30 cm de large et 40 cm de haut. Combien mesure sa diagonale ? *(évalue : application)*
   - 70 cm
   - 35 cm
   - ✔ 50 cm
   - 60 cm
2. Pourquoi l'hypoténuse est-elle toujours le plus grand côté ? *(évalue : compréhension)*
   - Ce n'est pas toujours le cas
   - Parce qu'elle est toujours horizontale
   - ✔ Son carré est la somme des carrés des deux autres, donc plus grand que chacun
   - Par convention, sans raison

**Rappel à J+2**

1. Le théorème relie… *(évalue : restitution (mémorisation))*
   - les aires de deux cercles
   - ✔ les longueurs des côtés d'un triangle rectangle
   - les angles d'un triangle
   - le périmètre d'un carré
2. Où se trouve l'hypoténuse ? *(évalue : restitution (mémorisation))*
   - ✔ En face de l'angle droit
   - Au centre
   - Il n'y en a pas
   - Entre les deux petits côtés
3. À quels triangles s'applique le théorème ? *(évalue : restitution (mémorisation))*
   - Aux triangles dont les trois côtés sont égaux
   - Aux carrés
   - À tous les triangles
   - ✔ Aux triangles qui ont un angle droit
4. Triangle rectangle de côtés 6 et 8 autour de l'angle droit : le grand côté mesure… *(évalue : application)*
   - 14
   - 12
   - ✔ 10
   - 9

**Reformulation, idée centrale :** Dans un triangle rectangle, le carré du plus grand côté est égal à la somme des carrés des deux autres.

**Éléments clés :** seulement avec un angle droit ; permet de calculer un côté à partir des deux autres

## S05 · Les fractions

*Domaine : mathématiques*

**Glossaire (termes à surveiller) :** fraction, numérateur, dénominateur, part, simplifier, fractions égales

**Compréhension immédiate**

1. Une pizza est coupée en 8 parts ; tu en manges 3. Quelle fraction as-tu mangée ? *(évalue : application)*
   - ✔ 3/8
   - 3/5
   - 5/8
   - 8/3
2. Pourquoi 1/4 est-il plus petit que 1/2, alors que 4 est plus grand que 2 ? *(évalue : compréhension)*
   - ✔ Plus on coupe le tout en parts nombreuses, plus chaque part est petite
   - Parce que 1/4 a moins de chiffres
   - Ils sont égaux
   - C'est une exception à apprendre par cœur
3. Pourquoi 2/4 et 1/2 représentent-ils la même quantité ? *(évalue : compréhension)*
   - ✔ 2 parts sur 4 couvrent autant que 1 part sur 2
   - Parce que 4 est plus grand que 2
   - Ce n'est pas la même quantité
   - Parce qu'ils ont le même numérateur

**Situation de transfert :** Une recette pour 4 personnes demande 3/4 de litre de lait ; tu cuisines pour 2 personnes.

> Quelle quantité de lait faut-il, et comment le sais-tu ?

*Réponse attendue :* 3/8 de litre : deux fois moins de personnes, donc la moitié de 3/4.

**Déblocage** *(seulement si l'apprenant s'est déclaré bloqué : posé après la seconde explication ; grille dans `grille-reformulation.md`)*

1. Une bouteille d'1 litre est remplie aux 3/4. Combien de quarts de litre manque-t-il pour la remplir ? *(évalue : application)*
   - 4
   - 2
   - ✔ 1
   - 3
2. Pourquoi peut-on remplacer 6/9 par 2/3 ? *(évalue : compréhension)*
   - Parce que 2/3 est plus grand
   - ✔ On a regroupé les parts par 3 : la quantité reste la même
   - Parce que 6 et 9 sont trop grands
   - On ne peut pas

**Rappel à J+2**

1. Dans 3/5, le nombre du bas indique… *(évalue : restitution (mémorisation))*
   - ✔ en combien de parts égales on a coupé
   - le reste
   - combien de parts on prend
   - le résultat
2. 4/8 est égal à… *(évalue : restitution (mémorisation))*
   - 4
   - ✔ 1/2
   - 2/3
   - 1/4
3. Lequel est le plus petit : 1/3 ou 1/10 ? *(évalue : restitution (mémorisation))*
   - ✔ 1/10
   - On ne peut pas savoir
   - Égaux
   - 1/3
4. Tu as mangé 2/6 d'une tarte et ton ami 1/3. Qui en a mangé le plus ? *(évalue : application)*
   - Ton ami
   - On ne peut pas comparer
   - Toi
   - ✔ Autant l'un que l'autre

**Reformulation, idée centrale :** Une fraction indique combien de parts égales on prend (en haut) sur le nombre de parts du tout (en bas).

**Éléments clés :** rôle du nombre du bas et du haut ; plus il y a de parts, plus chacune est petite

## S06 · Les intérêts composés

*Domaine : mathématiques, finance*

**Glossaire (termes à surveiller) :** capital, taux d'intérêt, intérêts, intérêts composés, placement, durée

**Compréhension immédiate**

1. Tu places 100 € à 10 % par an, intérêts composés. Combien as-tu après 2 ans ? *(évalue : application)*
   - 110 €
   - ✔ 121 €
   - 200 €
   - 120 €
2. Pourquoi obtient-on 121 € et non 120 € dans la question précédente ? *(évalue : compréhension)*
   - Parce que la banque ajoute 1 € de cadeau
   - C'est une erreur de calcul
   - ✔ La 2e année, les 10 € d'intérêts gagnés rapportent aussi
   - Parce que le taux monte à 11 %
3. Pour un même taux, pourquoi placer tôt rapporte-t-il plus ? *(évalue : compréhension)*
   - Parce que le taux augmente avec l'âge
   - ✔ Les intérêts ont plus d'années pour s'ajouter et rapporter à leur tour
   - Ce n'est pas vrai
   - Parce que la banque offre un cadeau

**Situation de transfert :** Une dette de carte de crédit non remboursée augmente chaque mois avec des intérêts sur les intérêts.

> Pourquoi cette dette peut-elle grossir de plus en plus vite ?

*Réponse attendue :* Les intérêts s'ajoutent à la dette, puis portent eux-mêmes des intérêts : la base grossit chaque mois.

**Déblocage** *(seulement si l'apprenant s'est déclaré bloqué : posé après la seconde explication ; grille dans `grille-reformulation.md`)*

1. Tu places 200 € à 10 % par an, composés. Combien as-tu au bout d'un an, puis de deux ans ? *(évalue : application)*
   - ✔ 220 €, puis 242 €
   - 200 €, puis 220 €
   - 210 €, puis 220 €
   - 220 €, puis 240 €
2. Si tu retires chaque année les intérêts gagnés, y a-t-il encore un effet « composé » ? *(évalue : compréhension)*
   - Oui, c'est pareil
   - Oui, il est même plus fort
   - ✔ Non, les intérêts ne restent pas pour rapporter à leur tour
   - Seulement si le taux est élevé

**Rappel à J+2**

1. Avec les intérêts composés, les intérêts de l'an 1 rapportent-ils en l'an 2 ? *(évalue : restitution (mémorisation))*
   - Seulement s'ils sont retirés
   - Non
   - ✔ Oui
   - Seulement à 0 %
2. Le capital, c'est… *(évalue : restitution (mémorisation))*
   - la banque
   - ✔ la somme placée au départ
   - la durée
   - le taux
3. Qu'est-ce qui distingue les intérêts composés ? *(évalue : restitution (mémorisation))*
   - ✔ Les intérêts gagnés rapportent à leur tour des intérêts
   - Ils sont interdits
   - Le taux baisse chaque année
   - On ne touche rien avant la fin
4. 100 € à 50 % par an pendant 2 ans, intérêts composés : *(évalue : application)*
   - 150 €
   - 200 €
   - ✔ 225 €
   - 250 €

**Reformulation, idée centrale :** Avec les intérêts composés, les intérêts gagnés s'ajoutent au capital et rapportent à leur tour, ce qui accélère la croissance.

**Éléments clés :** intérêts sur les intérêts ; effet plus fort avec le temps

## S07 · La photosynthèse

*Domaine : sciences de la vie*

**Glossaire (termes à surveiller) :** photosynthèse, chlorophylle, dioxyde de carbone, oxygène, glucose, feuille, lumière

**Compréhension immédiate**

1. Pourquoi une plante laissée dans un placard sombre dépérit-elle ? *(évalue : compréhension)*
   - Parce qu'elle a trop d'eau
   - ✔ Sans lumière, elle ne peut plus fabriquer sa nourriture
   - Parce qu'elle a trop froid
   - Parce que le placard est petit
2. Une plante d'intérieur bien arrosée, posée loin de toute fenêtre, pousse mal. Que changer en priorité ? *(évalue : application)*
   - La mettre au réfrigérateur
   - L'arroser encore plus
   - ✔ La rapprocher de la lumière
   - Lui retirer ses feuilles
3. D'où vient l'essentiel de la matière qui fait grossir un arbre ? *(évalue : compréhension)*
   - Uniquement de la terre
   - ✔ Du dioxyde de carbone de l'air, transformé grâce à la lumière
   - Des insectes
   - Uniquement de l'eau de pluie

**Situation de transfert :** Dans une serre fermée et éclairée, on ajoute du dioxyde de carbone dans l'air.

> Que peut-on attendre pour la croissance des plantes, et pourquoi ?

*Réponse attendue :* Elles peuvent pousser plus vite : plus de dioxyde de carbone disponible pour fabriquer leur nourriture, tant qu'il y a lumière et eau.

**Déblocage** *(seulement si l'apprenant s'est déclaré bloqué : posé après la seconde explication ; grille dans `grille-reformulation.md`)*

1. Une salade pousse sous une lampe éclairant 4 heures par jour au lieu de 12. Que prévoir ? *(évalue : application)*
   - Aucun effet
   - ✔ Elle produira moins de nourriture et poussera moins vite
   - Elle poussera plus vite
   - Elle produira plus d'oxygène
2. Pourquoi dit-on que les plantes « nourrissent » presque tous les êtres vivants ? *(évalue : compréhension)*
   - Parce qu'elles mangent les animaux
   - Parce qu'elles produisent de l'eau
   - ✔ Elles fabriquent du sucre avec la lumière, que les animaux mangent ensuite
   - Ce n'est pas vrai

**Rappel à J+2**

1. La photosynthèse a lieu surtout dans… *(évalue : restitution (mémorisation))*
   - les racines
   - les graines
   - le sol
   - ✔ les feuilles
2. Le pigment vert qui capte la lumière s'appelle… *(évalue : restitution (mémorisation))*
   - sève
   - ✔ chlorophylle
   - glucose
   - oxygène
3. La photosynthèse produit… *(évalue : restitution (mémorisation))*
   - de la terre
   - de l'eau salée
   - ✔ du sucre et de l'oxygène
   - du sel et de l'azote
4. Dans un aquarium éclairé, des bulles se forment sur les feuilles des plantes. Que contiennent-elles surtout ? *(évalue : application)*
   - Du dioxyde de carbone
   - ✔ De l'oxygène
   - De l'azote
   - De la vapeur de sel

**Reformulation, idée centrale :** Grâce à la lumière, la plante fabrique son sucre à partir d'eau et de dioxyde de carbone, et rejette de l'oxygène.

**Éléments clés :** besoins : lumière, eau, CO2 ; produits : sucre et oxygène

## S08 · Le système immunitaire

*Domaine : sciences de la vie*

**Glossaire (termes à surveiller) :** système immunitaire, microbe, globule blanc, anticorps, infection, mémoire immunitaire

**Compréhension immédiate**

1. Pourquoi tombe-t-on rarement deux fois malade de la varicelle ? *(évalue : compréhension)*
   - ✔ Le corps garde la mémoire de ce microbe et réagit vite
   - Le microbe disparaît de la Terre
   - On grandit
   - Par hasard
2. Des anticorps contre la grippe protègent-ils contre la varicelle ? *(évalue : compréhension)*
   - Oui, mais seulement l'hiver
   - ✔ Non : un anticorps reconnaît un microbe précis
   - Seulement chez l'adulte
   - Oui, ils protègent contre tout
3. Après une coupure, la peau autour devient rouge et chaude pendant un jour. Que se passe-t-il le plus probablement ? *(évalue : application)*
   - ✔ Le système immunitaire combat des microbes entrés par la plaie
   - C'est toujours le signe d'une maladie grave
   - Le sang se transforme en eau
   - La peau fabrique de la chlorophylle

**Situation de transfert :** Une personne dont les défenses sont affaiblies par un traitement attrape facilement des infections banales.

> Explique pourquoi, avec ce que tu sais du système immunitaire.

*Réponse attendue :* Son système immunitaire réagit moins ou moins vite : les microbes ne sont plus repérés et éliminés à temps.

**Déblocage** *(seulement si l'apprenant s'est déclaré bloqué : posé après la seconde explication ; grille dans `grille-reformulation.md`)*

1. Un microbe nouveau, jamais rencontré, entre dans le corps. Pourquoi la défense est-elle plus lente que pour un microbe déjà connu ? *(évalue : application)*
   - La défense est toujours aussi rapide
   - ✔ Le corps doit d'abord apprendre à le reconnaître
   - Parce que les nouveaux microbes sont toujours plus gros
   - Le corps ne se défend jamais contre un nouveau microbe
2. Pourquoi le système immunitaire n'attaque-t-il pas, en temps normal, nos propres cellules ? *(évalue : compréhension)*
   - Il les attaque toujours
   - ✔ Il distingue ce qui appartient au corps de ce qui vient de l'extérieur
   - Parce que nos cellules sont trop petites
   - Parce qu'il ne fonctionne que la nuit

**Rappel à J+2**

1. Les globules blancs servent à… *(évalue : restitution (mémorisation))*
   - digérer
   - ✔ combattre les microbes
   - coaguler le sang
   - transporter l'oxygène
2. La mémoire immunitaire permet… *(évalue : restitution (mémorisation))*
   - de mieux dormir
   - de grandir
   - de voir mieux
   - ✔ de réagir plus vite à un microbe déjà rencontré
3. Un anticorps est efficace contre… *(évalue : restitution (mémorisation))*
   - les vitamines
   - tous les microbes à la fois
   - ✔ un microbe précis
   - aucun microbe
4. Deux enfants attrapent le même virus ; l'un l'a déjà eu l'an dernier. Lequel guérira probablement le plus vite ? *(évalue : application)*
   - Aucun des deux
   - Les deux pareil, toujours
   - ✔ Celui qui l'a déjà eu
   - Celui qui ne l'a jamais eu

**Reformulation, idée centrale :** Le système immunitaire repère et détruit les microbes, et garde en mémoire ceux qu'il a déjà rencontrés pour réagir plus vite.

**Éléments clés :** défense contre les microbes ; mémoire d'une rencontre passée

## S09 · L'ADN

*Domaine : sciences de la vie*

**Glossaire (termes à surveiller) :** ADN, gène, cellule, chromosome, hérédité, noyau

**Compréhension immédiate**

1. Pourquoi un enfant ressemble-t-il à ses deux parents à la fois ? *(évalue : compréhension)*
   - Il mange la même chose qu'eux
   - Il vit avec eux
   - Par hasard uniquement
   - ✔ Il reçoit une partie de l'ADN de chacun
2. On peut trouver l'ADN d'une personne dans un cheveu ou une goutte de salive. Pourquoi ? *(évalue : application)*
   - Parce que l'ADN flotte dans l'air
   - Parce que l'ADN est fabriqué par la bouche
   - C'est impossible
   - ✔ Ils contiennent des cellules, et presque toutes les cellules ont de l'ADN
3. Pourquoi des vrais jumeaux ont-ils le même ADN, mais pas des frères et sœurs ordinaires ? *(évalue : compréhension)*
   - Parce qu'ils se ressemblent
   - Parce qu'ils sont nés le même jour
   - Tous les frères et sœurs ont le même ADN
   - ✔ Les vrais jumeaux viennent d'un seul œuf qui s'est séparé

**Situation de transfert :** Sur une scène de vol, les enquêteurs retrouvent un cheveu et le comparent à l'ADN de suspects.

> Pourquoi cette comparaison peut-elle désigner une personne ?

*Réponse attendue :* L'ADN est présent dans les cellules du cheveu et il est propre à chaque personne (sauf vrais jumeaux).

**Déblocage** *(seulement si l'apprenant s'est déclaré bloqué : posé après la seconde explication ; grille dans `grille-reformulation.md`)*

1. Une cellule de peau et une cellule du foie d'une même personne ont-elles le même ADN ? *(évalue : application)*
   - Non, chaque organe a son ADN
   - Seulement le matin
   - Seulement si la personne est jeune
   - ✔ Oui, le même ADN dans presque toutes ses cellules
2. Pourquoi deux frères et sœurs, qui ne sont pas jumeaux, ne se ressemblent-ils pas exactement ? *(évalue : compréhension)*
   - ✔ Chacun reçoit une combinaison différente de l'ADN de ses parents
   - Parce que l'ADN change chaque année
   - Ils ont exactement le même ADN
   - Parce qu'ils ne mangent pas la même chose

**Rappel à J+2**

1. L'ADN contient… *(évalue : restitution (mémorisation))*
   - de l'eau
   - ✔ les informations qui guident le fonctionnement de la cellule
   - de l'énergie
   - des microbes
2. On reçoit son ADN… *(évalue : restitution (mémorisation))*
   - de l'alimentation
   - uniquement de sa mère
   - ✔ de ses deux parents
   - de l'air
3. Un gène est… *(évalue : restitution (mémorisation))*
   - un organe
   - une maladie
   - ✔ un morceau d'ADN qui porte une information
   - un vaccin
4. Deux suspects ont laissé des traces ; un seul ADN correspond au cheveu trouvé. Que peut-on conclure ? *(évalue : application)*
   - Les deux sont coupables
   - Le cheveu n'apprend rien
   - Le cheveu vient forcément d'un jumeau
   - ✔ Le cheveu vient probablement de ce suspect

**Reformulation, idée centrale :** L'ADN, présent dans nos cellules, porte les informations héritées de nos parents qui guident le fonctionnement du corps.

**Éléments clés :** dans les cellules ; transmis par les parents

## S10 · Le vaccin

*Domaine : santé*

**Glossaire (termes à surveiller) :** vaccin, immunité, microbe, anticorps, rappel, système immunitaire

**Compréhension immédiate**

1. Comment un vaccin aide-t-il le corps à se protéger ? *(évalue : compréhension)*
   - Il tue tous les microbes du corps
   - ✔ Il lui fait rencontrer, sans danger, un élément du microbe pour qu'il apprenne à le reconnaître
   - Il soigne une maladie déjà installée
   - Il remplace le sang
2. Pourquoi, pour certaines maladies, faut-il un rappel quelques années plus tard ? *(évalue : compréhension)*
   - Ce n'est jamais utile
   - Pour changer de maladie
   - ✔ La protection peut diminuer avec le temps ; le rappel la renforce
   - Parce que le premier vaccin était faux
3. Dans une ville, beaucoup de gens sont vaccinés contre une maladie contagieuse. Pourquoi un bébé trop jeune pour être vacciné y est-il moins exposé ? *(évalue : application)*
   - ✔ La maladie circule moins, donc il a moins de chances de la rencontrer
   - Il n'est pas moins exposé
   - Parce que le vaccin se transmet par l'air
   - Parce que les bébés ne tombent jamais malades

**Situation de transfert :** Une personne vaccinée contre une maladie l'attrape quand même, mais de façon légère.

> Est-ce que cela veut dire que le vaccin n'a servi à rien ? Explique.

*Réponse attendue :* Non : aucun vaccin ne protège à 100 %, mais le corps, déjà entraîné, réagit plus vite, ce qui rend souvent la maladie moins grave.

**Déblocage** *(seulement si l'apprenant s'est déclaré bloqué : posé après la seconde explication ; grille dans `grille-reformulation.md`)*

1. Pourquoi vaccine-t-on avant une épidémie plutôt que pendant qu'on est déjà malade ? *(évalue : application)*
   - Parce que c'est moins cher
   - Il n'y a aucune différence
   - ✔ Le corps a besoin de temps pour apprendre à reconnaître le microbe
   - Parce que le vaccin soigne mieux une fois malade
2. Pourquoi une personne vaccinée réagit-elle plus vite si elle rencontre le vrai microbe ? *(évalue : compréhension)*
   - Parce que le vaccin reste dans le sang comme un médicament
   - ✔ Son système immunitaire le reconnaît déjà grâce au vaccin
   - Elle ne réagit pas plus vite
   - Parce que le microbe est plus faible chez elle

**Rappel à J+2**

1. Un vaccin entraîne surtout… *(évalue : restitution (mémorisation))*
   - la mémoire scolaire
   - les muscles
   - la digestion
   - ✔ le système immunitaire
2. Un rappel sert à… *(évalue : restitution (mémorisation))*
   - changer de groupe sanguin
   - ✔ entretenir la protection
   - guérir une fracture
   - rien
3. Un vaccin agit surtout… *(évalue : restitution (mémorisation))*
   - ✔ avant que la maladie survienne
   - seulement la nuit
   - après la guérison
   - sur les plantes
4. Un adulte n'a pas fait le rappel conseillé depuis longtemps. Quel est le risque le plus probable ? *(évalue : application)*
   - ✔ Sa protection a pu baisser
   - Son vaccin le rend malade
   - Il est malade en ce moment
   - Il est protégé à vie quoi qu'il arrive

**Reformulation, idée centrale :** Un vaccin fait rencontrer au corps, sans danger, un élément du microbe (ou de quoi le fabriquer), pour qu'il apprenne à le reconnaître et se défende plus vite plus tard.

**Éléments clés :** apprendre sans faire la maladie ; protection qui peut diminuer et demander des rappels

## S11 · Le cycle de l'eau

*Domaine : sciences de la Terre*

**Glossaire (termes à surveiller) :** évaporation, condensation, précipitations, vapeur d'eau, nuage, ruissellement, nappe souterraine

**Compréhension immédiate**

1. Pourquoi se forme-t-il des gouttes sur un verre d'eau très froide en été ? *(évalue : compréhension)*
   - Le soleil chauffe le verre
   - Le verre fuit
   - ✔ La vapeur d'eau de l'air se condense au contact du froid
   - L'eau traverse le verre
2. Du linge mouillé sèche plus vite dehors par une journée chaude et venteuse. Pourquoi ? *(évalue : application)*
   - Le vent pousse l'eau dans le sol
   - Le soleil transforme l'eau en sel
   - ✔ La chaleur et le vent accélèrent l'évaporation de l'eau
   - Il ne sèche pas plus vite
3. L'eau d'une flaque disparaît sans couler nulle part. Où est-elle partie ? *(évalue : compréhension)*
   - Elle s'est transformée en nuage instantanément sur place
   - Elle a été détruite
   - Elle est devenue de la terre
   - ✔ Elle s'est évaporée dans l'air sous forme de vapeur

**Situation de transfert :** Le matin, la vitre de la salle de bain est couverte de buée après une douche chaude.

> Quelles étapes du cycle de l'eau retrouves-tu ici ?

*Réponse attendue :* L'eau chaude s'évapore (vapeur), puis la vapeur se condense en gouttelettes sur la vitre froide.

**Déblocage** *(seulement si l'apprenant s'est déclaré bloqué : posé après la seconde explication ; grille dans `grille-reformulation.md`)*

1. Une casserole d'eau bouillante a un couvercle ; des gouttes coulent sous le couvercle. Que s'est-il passé ? *(évalue : application)*
   - L'eau a traversé le métal
   - La casserole fabrique de l'eau
   - ✔ L'eau s'est évaporée puis condensée sur le couvercle plus froid
   - Le couvercle fuit
2. Pourquoi la quantité d'eau sur Terre reste-t-elle à peu près la même malgré la pluie et l'évaporation ? *(évalue : compréhension)*
   - Elle diminue chaque jour
   - ✔ L'eau change d'état et de place mais n'est pas détruite
   - Parce qu'il pleut toujours autant partout
   - Parce que les nuages fabriquent de l'eau

**Rappel à J+2**

1. Le passage de l'eau liquide à la vapeur s'appelle… *(évalue : restitution (mémorisation))*
   - précipitation
   - ✔ évaporation
   - fusion
   - condensation
2. Les nuages sont faits de… *(évalue : restitution (mémorisation))*
   - ✔ fines gouttelettes ou cristaux d'eau
   - fumée
   - gaz carbonique
   - poussière seulement
3. Pluie, neige et grêle sont des… *(évalue : restitution (mémorisation))*
   - ✔ précipitations
   - condensations
   - nappes
   - évaporations
4. Tu sors une bouteille du réfrigérateur un jour humide : elle se couvre de gouttes. Quelle étape du cycle est-ce ? *(évalue : application)*
   - ✔ La condensation
   - L'infiltration
   - Le ruissellement
   - L'évaporation

**Reformulation, idée centrale :** L'eau circule sans cesse : elle s'évapore, se condense en nuages, retombe en pluie puis rejoint rivières, sols et mers.

**Éléments clés :** évaporation puis condensation ; retour au sol et aux mers

## S12 · L'effet de serre

*Domaine : sciences de la Terre*

**Glossaire (termes à surveiller) :** effet de serre, gaz à effet de serre, atmosphère, rayonnement, dioxyde de carbone, réchauffement climatique

**Compréhension immédiate**

1. Pourquoi, sans aucun effet de serre naturel, la Terre serait-elle beaucoup plus froide ? *(évalue : compréhension)*
   - Parce que le Soleil s'éteindrait
   - Elle ne serait pas plus froide
   - Parce que l'eau gèlerait d'abord
   - ✔ La chaleur émise par le sol repartirait presque toute vers l'espace
2. Pourquoi l'ajout de gaz à effet de serre réchauffe-t-il le climat ? *(évalue : compréhension)*
   - ✔ Ils retiennent davantage la chaleur émise par la Terre
   - Ils bloquent toute la lumière
   - Ils rapprochent le Soleil
   - Ils font fondre le Soleil
3. Une ville remplace ses bus au gazole par des bus électriques alimentés par une électricité peu carbonée. Quel effet sur l'effet de serre ? *(évalue : application)*
   - ✔ Moins de dioxyde de carbone émis, donc moins de renforcement de l'effet de serre
   - Aucun effet
   - Plus d'effet de serre
   - L'effet de serre disparaît totalement

**Situation de transfert :** Une voiture garée au soleil, vitres fermées, devient très chaude à l'intérieur.

> En quoi cela ressemble-t-il à l'effet de serre, et quelle est la limite de la comparaison ?

*Réponse attendue :* La chaleur entre et reste en partie piégée ; mais dans la voiture c'est surtout l'air enfermé, alors que pour la Terre ce sont des gaz qui retiennent le rayonnement de chaleur.

**Déblocage** *(seulement si l'apprenant s'est déclaré bloqué : posé après la seconde explication ; grille dans `grille-reformulation.md`)*

1. Une nuit nuageuse est souvent moins froide qu'une nuit sans nuages. Avec quelle idée de l'effet de serre cela s'accorde-t-il ? *(évalue : application)*
   - ✔ Ce qui est au-dessus du sol retient une partie de la chaleur qu'il émet
   - Les nuages produisent de la chaleur
   - Aucune
   - La Lune réchauffe les nuages
2. Pourquoi parle-t-on d'effet de serre « renforcé » plutôt que d'effet de serre tout court pour le changement climatique ? *(évalue : compréhension)*
   - C'est la même chose
   - ✔ L'effet existe naturellement ; les activités humaines l'augmentent
   - Parce que les serres de jardin chauffent la Terre
   - Parce qu'il n'existait pas avant

**Rappel à J+2**

1. L'effet de serre naturel est… *(évalue : restitution (mémorisation))*
   - inexistant
   - toujours néfaste
   - dû à la Lune
   - ✔ indispensable à la vie sur Terre
2. Un gaz à effet de serre important émis par les activités humaines est… *(évalue : restitution (mémorisation))*
   - l'azote
   - l'oxygène
   - l'hélium
   - ✔ le dioxyde de carbone
3. Renforcer l'effet de serre conduit à… *(évalue : restitution (mémorisation))*
   - plus de lumière
   - un refroidissement
   - aucun changement
   - ✔ un réchauffement du climat
4. Une personne fait chaque jour 20 km en voiture à essence pour aller travailler. Quel changement réduit le plus ses émissions de gaz à effet de serre ? *(évalue : application)*
   - ✔ Faire le trajet en train ou en bus
   - Rouler vitres ouvertes
   - Changer la couleur de la voiture
   - Laver la voiture plus souvent

**Reformulation, idée centrale :** Certains gaz de l'atmosphère retiennent une partie de la chaleur de la Terre ; en en ajoutant, on renforce ce piège et le climat se réchauffe.

**Éléments clés :** effet naturel utile ; ajout humain de gaz qui renforce le réchauffement

## S13 · La gravitation

*Domaine : physique*

**Glossaire (termes à surveiller) :** gravitation, masse, force, attraction, poids, orbite

**Compréhension immédiate**

1. Pourquoi une pomme lâchée tombe-t-elle vers le sol ? *(évalue : compréhension)*
   - L'air la pousse vers le bas
   - Elle est trop mûre
   - ✔ La Terre l'attire
   - Le vent souffle
2. Sur la Lune, un astronaute pèse moins que sur Terre. Pourquoi ? *(évalue : compréhension)*
   - Il a perdu de la masse
   - ✔ La Lune, moins massive, l'attire moins fort
   - Sa combinaison est légère
   - Il n'y a pas d'air
3. Une balance indique 60 kg sur Terre. Sur la Lune, la même personne aurait-elle moins de matière ? *(évalue : application)*
   - Oui, elle perdrait de la matière
   - Elle aurait plus de matière
   - Elle n'aurait plus de masse
   - ✔ Non, la même masse, mais un poids plus faible

**Situation de transfert :** Un satellite tourne autour de la Terre sans moteur allumé.

> Pourquoi ne s'éloigne-t-il pas dans l'espace et ne tombe-t-il pas tout droit ?

*Réponse attendue :* La Terre l'attire en permanence, mais il va assez vite sur le côté : il « tombe » autour de la Terre en restant en orbite.

**Déblocage** *(seulement si l'apprenant s'est déclaré bloqué : posé après la seconde explication ; grille dans `grille-reformulation.md`)*

1. Sur une planète plus massive que la Terre, mais de même taille, un objet pèserait… *(évalue : application)*
   - rien
   - pareil
   - moins lourd
   - ✔ plus lourd
2. Pourquoi un satellite trop lent finit-il par retomber sur Terre ? *(évalue : compréhension)*
   - Parce qu'il devient plus lourd
   - Il ne retombe jamais
   - Parce que la Terre le repousse
   - ✔ Sa vitesse ne suffit plus à compenser l'attraction de la Terre

**Rappel à J+2**

1. Deux objets ayant une masse… *(évalue : restitution (mémorisation))*
   - ✔ s'attirent
   - se repoussent
   - s'ignorent
   - s'annulent
2. Le poids d'un objet dépend… *(évalue : restitution (mémorisation))*
   - de sa forme seulement
   - de l'heure
   - ✔ de l'astre sur lequel il se trouve
   - de sa couleur
3. Une orbite, c'est… *(évalue : restitution (mémorisation))*
   - un type de fusée
   - un nuage
   - ✔ le trajet d'un objet qui tourne autour d'un astre
   - une étoile
4. Mars est moins massive que la Terre. Un sac de 10 kg y serait… *(évalue : application)*
   - plus lourd à porter
   - impossible à soulever
   - ✔ moins lourd à porter, mais toujours de 10 kg de matière
   - de 5 kg de matière

**Reformulation, idée centrale :** Tout objet ayant une masse attire les autres ; c'est ce qui nous fait tomber vers la Terre et ce qui garde la Lune en orbite.

**Éléments clés :** attraction entre masses ; explique la chute et les orbites

## S14 · Tension et intensité électriques

*Domaine : physique*

**Glossaire (termes à surveiller) :** tension, volt, intensité, ampère, circuit, courant électrique, générateur

**Compréhension immédiate**

1. On compare souvent un circuit à de l'eau dans des tuyaux. Dans cette image, à quoi correspond la tension ? *(évalue : compréhension)*
   - À la couleur de l'eau
   - ✔ À la différence de pression qui fait circuler l'eau
   - À la longueur du tuyau
   - Au robinet fermé
2. Pourquoi une lampe ne s'allume-t-elle pas si le circuit est ouvert ? *(évalue : compréhension)*
   - Il fait jour
   - La lampe est trop loin
   - La tension devient trop forte
   - ✔ Le courant ne peut pas circuler
3. Une lampe prévue pour 6 V est branchée sur une pile de 1,5 V. Que se passe-t-il le plus probablement ? *(évalue : application)*
   - Elle explose
   - Elle brille plus fort que prévu
   - ✔ Elle brille faiblement ou pas du tout
   - La pile se recharge

**Situation de transfert :** Une pile de 1,5 V fait briller faiblement une petite lampe prévue pour 4,5 V.

> Pourquoi la lampe brille-t-elle peu, et que faudrait-il changer ?

*Réponse attendue :* La tension est trop faible pour la faire fonctionner normalement ; il faut une tension proche de 4,5 V (par exemple trois piles de 1,5 V en série).

**Déblocage** *(seulement si l'apprenant s'est déclaré bloqué : posé après la seconde explication ; grille dans `grille-reformulation.md`)*

1. Pour obtenir 4,5 V avec des piles de 1,5 V, combien faut-il en mettre à la suite (en série) ? *(évalue : application)*
   - 2
   - ✔ 3
   - 1
   - 4
2. Quelle est la limite de l'image de l'eau dans les tuyaux pour l'électricité ? *(évalue : compréhension)*
   - ✔ Un fil ne « fuit » pas quand on le coupe : le courant s'arrête, rien ne s'écoule
   - Il n'y en a aucune
   - Le courant électrique est plus lent que l'eau
   - Les fils contiennent vraiment de l'eau

**Rappel à J+2**

1. La tension se mesure en… *(évalue : restitution (mémorisation))*
   - watts
   - ✔ volts
   - ampères
   - mètres
2. L'intensité se mesure en… *(évalue : restitution (mémorisation))*
   - litres
   - ✔ ampères
   - degrés
   - volts
3. Pour qu'un courant circule, le circuit doit être… *(évalue : restitution (mémorisation))*
   - ouvert
   - ✔ fermé
   - coupé
   - mouillé
4. Un interrupteur est ouvert dans un circuit avec une pile et une lampe. Quelle est l'intensité du courant dans la lampe ? *(évalue : application)*
   - La même que circuit fermé
   - Maximale
   - Elle dépend de la couleur de la lampe
   - ✔ Nulle : aucun courant ne circule

**Reformulation, idée centrale :** La tension est ce qui fait circuler le courant dans un circuit fermé ; l'intensité indique combien de courant passe.

**Éléments clés :** tension = ce qui fait circuler (différence entre deux points) ; intensité = quantité qui passe, seulement si le circuit est fermé

## S15 · L'inflation

*Domaine : économie*

**Glossaire (termes à surveiller) :** inflation, prix, pouvoir d'achat, monnaie, taux d'inflation, salaire

**Compréhension immédiate**

1. S'il y a 10 % d'inflation sur un an, un panier qui coûtait 100 € coûte environ… *(évalue : application)*
   - 200 €
   - ✔ 110 €
   - 90 €
   - 100 €
2. Si ton salaire ne bouge pas alors que les prix montent, pourquoi peux-tu acheter moins ? *(évalue : compréhension)*
   - ✔ Chaque euro achète moins de choses qu'avant
   - Parce que ton salaire baisse automatiquement
   - Parce que les magasins ferment
   - Tu peux acheter autant
3. Ton salaire augmente de 2 % et les prix de 5 % la même année. Ton pouvoir d'achat… *(évalue : application)*
   - monte
   - double
   - ne change pas
   - ✔ baisse

**Situation de transfert :** Ta grand-mère raconte qu'une baguette coûtait beaucoup moins cher dans sa jeunesse.

> Est-ce que cela veut forcément dire que le pain était plus « accessible » à l'époque ? Explique.

*Réponse attendue :* Pas forcément : il faut comparer au salaire de l'époque ; l'inflation fait monter les prix mais aussi, souvent, les salaires.

**Déblocage** *(seulement si l'apprenant s'est déclaré bloqué : posé après la seconde explication ; grille dans `grille-reformulation.md`)*

1. Tu gardes 1 000 € dans un tiroir pendant un an avec 5 % d'inflation. Que peux-tu acheter avec à la fin ? *(évalue : application)*
   - Rien du tout
   - ✔ Un peu moins qu'au début
   - Exactement pareil
   - Plus qu'au début
2. Pourquoi une hausse des salaires égale à l'inflation garde-t-elle le pouvoir d'achat à peu près stable ? *(évalue : compréhension)*
   - Elle ne le garde pas stable
   - Parce que les prix baissent
   - Parce que l'inflation disparaît
   - ✔ Les revenus et les prix montent ensemble

**Rappel à J+2**

1. L'inflation désigne… *(évalue : restitution (mémorisation))*
   - une baisse des salaires
   - ✔ une hausse générale et durable des prix
   - un impôt
   - la hausse d'un seul produit
2. Le pouvoir d'achat, c'est… *(évalue : restitution (mémorisation))*
   - une monnaie étrangère
   - le prix d'un objet
   - ✔ ce qu'on peut acheter avec son revenu
   - le taux d'une banque
3. L'inflation concerne… *(évalue : restitution (mémorisation))*
   - ✔ l'ensemble des prix
   - un seul magasin
   - les seuls salaires
   - les seules actions
4. Seul le prix des fraises double en hiver ; les autres prix ne bougent pas. Est-ce de l'inflation ? *(évalue : application)*
   - On ne peut jamais savoir
   - ✔ Non : l'inflation est une hausse générale, pas celle d'un seul produit
   - Oui, forcément
   - Oui, si on aime les fraises

**Reformulation, idée centrale :** L'inflation est la hausse générale des prix : avec la même somme, on achète moins, sauf si les revenus suivent.

**Éléments clés :** hausse générale des prix ; effet sur le pouvoir d'achat

## S16 · L'offre et la demande

*Domaine : économie*

**Glossaire (termes à surveiller) :** offre, demande, prix d'équilibre, pénurie, surplus, marché

**Compréhension immédiate**

1. Après une très bonne récolte de tomates, que devient en général leur prix ? *(évalue : application)*
   - Il monte
   - ✔ Il a tendance à baisser
   - Il double
   - Il reste fixe par la loi
2. Pourquoi un produit rare et très demandé devient-il souvent plus cher ? *(évalue : compréhension)*
   - ✔ Beaucoup d'acheteurs se disputent peu d'exemplaires
   - Parce que les vendeurs sont moins nombreux à le vouloir
   - Ce n'est pas le cas
   - Parce que l'État l'impose
3. Au « prix d'équilibre », pourquoi n'y a-t-il ni pénurie ni invendus ? *(évalue : compréhension)*
   - Parce que l'État fixe le prix
   - ✔ La quantité que les vendeurs proposent égale celle que les acheteurs veulent
   - Parce que personne n'achète
   - Parce que le vendeur gagne le plus

**Situation de transfert :** Les billets d'un concert très attendu sont revendus bien plus cher que leur prix initial.

> Explique ce phénomène avec l'offre et la demande.

*Réponse attendue :* Le nombre de places est limité (offre faible) et beaucoup veulent y aller (demande forte) : le prix de revente monte.

**Déblocage** *(seulement si l'apprenant s'est déclaré bloqué : posé après la seconde explication ; grille dans `grille-reformulation.md`)*

1. Un nouveau téléphone est vendu trop cher : il en reste des milliers en stock. Que fait souvent le vendeur ? *(évalue : application)*
   - Il ne change rien
   - Il arrête de vendre
   - Il augmente le prix
   - ✔ Il baisse son prix pour écouler le stock
2. Pourquoi le prix des billets d'avion monte-t-il souvent pendant les vacances scolaires ? *(évalue : compréhension)*
   - Il ne monte jamais
   - Parce que le carburant est gratuit
   - Parce que les avions sont plus lourds
   - ✔ Beaucoup plus de gens veulent voyager aux mêmes dates

**Rappel à J+2**

1. Une pénurie, c'est quand… *(évalue : restitution (mémorisation))*
   - ✔ la demande dépasse l'offre
   - l'offre dépasse la demande
   - personne ne veut acheter
   - le prix baisse
2. Si l'offre augmente et la demande ne change pas, le prix… *(évalue : restitution (mémorisation))*
   - ne peut pas changer
   - monte
   - double
   - ✔ a tendance à baisser
3. La demande représente… *(évalue : restitution (mémorisation))*
   - ce que les vendeurs proposent
   - les salaires
   - ✔ ce que les acheteurs veulent acheter
   - les impôts
4. En été, beaucoup de gens veulent des ventilateurs et les magasins en manquent. Que va-t-il probablement se passer pour leur prix ? *(évalue : application)*
   - Il va baisser
   - Il ne bougera jamais
   - Il deviendra gratuit
   - ✔ Il va monter

**Reformulation, idée centrale :** Le prix d'un bien évolue selon l'équilibre entre ce que les vendeurs proposent et ce que les acheteurs veulent.

**Éléments clés :** rare et demandé = plus cher ; abondant = moins cher

## S17 · La TVA

*Domaine : fiscalité*

**Glossaire (termes à surveiller) :** TVA, taxe, hors taxe, toutes taxes comprises, taux, consommateur final

**Compréhension immédiate**

1. Un objet coûte 100 € hors taxe avec une TVA de 20 %. Son prix TTC est… *(évalue : application)*
   - 80 €
   - ✔ 120 €
   - 200 €
   - 100 €
2. Pourquoi dit-on que c'est le consommateur final qui supporte la TVA ? *(évalue : compréhension)*
   - Parce que l'usine la paie à sa place
   - Parce que la banque la rembourse
   - ✔ Elle est incluse dans le prix qu'il paie, et il ne peut pas la récupérer
   - Parce que personne ne la paie
3. Un article est affiché 60 € TTC avec une TVA de 20 %. Quel est son prix hors taxe ? *(évalue : application)*
   - 40 €
   - 48 €
   - ✔ 50 €
   - 72 €

**Situation de transfert :** Une entreprise achète un ordinateur 1 200 € TTC (TVA 20 %) pour son activité.

> Quel est le prix hors taxe, et pourquoi l'entreprise s'intéresse-t-elle surtout à ce montant ?

*Réponse attendue :* 1 000 € HT ; l'entreprise peut en général récupérer la TVA payée, son coût réel est donc le prix hors taxe.

**Déblocage** *(seulement si l'apprenant s'est déclaré bloqué : posé après la seconde explication ; grille dans `grille-reformulation.md`)*

1. Un livre coûte 10 € HT avec une TVA de 5,5 %. Combien paie le client ? *(évalue : application)*
   - 12 €
   - ✔ 10,55 €
   - 10,05 €
   - 15,50 €
2. Pourquoi deux magasins qui affichent le même prix TTC payent-ils la même TVA sur cet article ? *(évalue : compréhension)*
   - ✔ Le taux est le même, donc la part de taxe incluse dans le prix aussi
   - Ce n'est pas vrai
   - Parce qu'ils ne paient pas de TVA
   - Parce qu'ils sont dans la même rue

**Rappel à J+2**

1. TTC veut dire… *(évalue : restitution (mémorisation))*
   - ✔ toutes taxes comprises
   - tarif type commerce
   - total temporaire
   - taxe très chère
2. « Hors taxe » signifie… *(évalue : restitution (mémorisation))*
   - un prix soldé
   - un prix gratuit
   - le prix avec la TVA
   - ✔ le prix avant ajout de la TVA
3. La TVA est une taxe sur… *(évalue : restitution (mémorisation))*
   - les maisons uniquement
   - les voitures uniquement
   - ✔ la consommation
   - les salaires uniquement
4. Avec 20 % de TVA, 50 € HT deviennent… *(évalue : application)*
   - 55 €
   - ✔ 60 €
   - 50 €
   - 70 €

**Reformulation, idée centrale :** La TVA est une taxe ajoutée au prix hors taxe ; c'est le consommateur final qui la paie dans le prix TTC.

**Éléments clés :** HT + TVA = TTC ; payée au final par le consommateur

## S18 · Le contrat de travail

*Domaine : droit*

**Glossaire (termes à surveiller) :** contrat de travail, employeur, salarié, CDI, CDD, période d'essai, rupture

**Compréhension immédiate**

1. Pourquoi une entreprise propose-t-elle un CDD plutôt qu'un CDI pour un besoin de quelques mois ? *(évalue : compréhension)*
   - ✔ Le CDD prévoit sa fin (date ou événement), adaptée à un besoin temporaire
   - Parce que le CDD n'a pas de règles
   - Parce que le CDD n'a pas de salaire
   - Parce que le CDI est interdit
2. À quoi sert la période d'essai, pour le salarié comme pour l'employeur ? *(évalue : compréhension)*
   - Changer de métier
   - Travailler sans salaire
   - ✔ Vérifier que le poste convient, avec une rupture plus simple pendant cette période
   - Prolonger les vacances
3. Un salarié en CDI veut démissionner. Que doit-il en général respecter ? *(évalue : application)*
   - Il doit payer son employeur
   - Il ne peut jamais démissionner
   - Rien du tout, il part le jour même dans tous les cas
   - ✔ Un préavis prévu par le contrat, la convention ou l'usage

**Situation de transfert :** Une entreprise embauche une personne pour remplacer une salariée en congé maternité pendant six mois.

> Quel type de contrat est le plus adapté, et pourquoi ?

*Réponse attendue :* Un CDD (de remplacement) : le besoin est temporaire, avec une fin prévisible, le retour de la salariée.

**Déblocage** *(seulement si l'apprenant s'est déclaré bloqué : posé après la seconde explication ; grille dans `grille-reformulation.md`)*

1. Une boulangerie embauche quelqu'un pour un poste permanent, sans date de fin. Quel contrat est le plus adapté ? *(évalue : application)*
   - Un CDD de 2 jours
   - Un contrat de location
   - ✔ Un CDI
   - Aucun contrat
2. Pourquoi un CDD doit-il préciser sa fin, par une date ou un événement ? *(évalue : compréhension)*
   - Pour que le salarié ne soit jamais payé
   - Ce n'est pas nécessaire
   - Parce que c'est un contrat sans règles
   - ✔ Parce qu'il répond à un besoin temporaire dont on doit connaître le terme

**Rappel à J+2**

1. CDI signifie… *(évalue : restitution (mémorisation))*
   - contrat de droit international
   - contrat d'insertion
   - contrat de durée imposée
   - ✔ contrat à durée indéterminée
2. Pendant la période d'essai, la rupture du contrat est… *(évalue : restitution (mémorisation))*
   - ✔ plus simple qu'après
   - interdite
   - automatique
   - payante
3. Un CDD prend fin… *(évalue : restitution (mémorisation))*
   - ✔ à la date ou à l'événement prévu
   - au bout d'un jour
   - jamais
   - quand le salarié le décide seul
4. Un magasin embauche des vendeurs supplémentaires pour les fêtes de fin d'année. Quel contrat est le plus adapté ? *(évalue : application)*
   - Un contrat de vente
   - ✔ Un CDD
   - Un CDI
   - Aucun contrat

**Reformulation, idée centrale :** Le contrat de travail fixe la relation entre employeur et salarié ; le CDD a une fin prévue (date ou événement), le CDI non, et la période d'essai permet de vérifier que le poste convient.

**Éléments clés :** CDD temporaire avec une fin prévue, CDI sans fin prévue ; rôle de la période d'essai

## S19 · Le RGPD

*Domaine : droit, numérique*

**Glossaire (termes à surveiller) :** RGPD, donnée personnelle, consentement, responsable de traitement, droit d'accès, droit à l'effacement

**Compréhension immédiate**

1. Lequel de ces éléments est une donnée personnelle ? *(évalue : application)*
   - Le prix d'un pain
   - La température du jour
   - ✔ Une adresse e-mail au nom d'une personne
   - Le nom d'une ville seule
2. Pourquoi une organisation doit-elle indiquer à quoi serviront les données qu'elle collecte ? *(évalue : compréhension)*
   - ✔ Pour que la personne sache comment elles sont utilisées et puisse exercer ses droits
   - Ce n'est pas obligatoire
   - Pour payer moins d'impôts
   - Pour faire de la publicité
3. Un client demande à un magasin quelles informations il détient sur lui. De quel droit s'agit-il ? *(évalue : application)*
   - ✔ Le droit d'accès
   - Le droit de propriété
   - Le droit à l'image
   - Le droit de grève

**Situation de transfert :** Une boulangerie demande l'adresse e-mail de ses clients pour leur envoyer une carte de fidélité numérique.

> Que doit-elle faire pour respecter le RGPD ?

*Réponse attendue :* Dire à quoi servira l'adresse et ne l'utiliser que pour ce but ; pour un autre usage (publicité par exemple), en informer les clients et respecter leur droit de refuser ; protéger les données ; répondre aux demandes d'accès ou de suppression.

**Déblocage** *(seulement si l'apprenant s'est déclaré bloqué : posé après la seconde explication ; grille dans `grille-reformulation.md`)*

1. Un site collecte la date de naissance pour « vérifier l'âge ». Peut-il ensuite l'utiliser librement pour autre chose ? *(évalue : application)*
   - ✔ Non, pas sans respecter les règles : informer et avoir une base légale pour ce nouvel usage
   - Seulement si la date est ancienne
   - Oui, librement
   - Oui, si personne ne le remarque
2. Pourquoi une liste de numéros de clients est-elle une donnée personnelle, même sans les noms ? *(évalue : compréhension)*
   - Parce que la liste est longue
   - Parce que les chiffres sont secrets
   - Ce n'est pas une donnée personnelle
   - ✔ Un numéro de téléphone permet souvent de retrouver la personne

**Rappel à J+2**

1. Le RGPD protège… *(évalue : restitution (mémorisation))*
   - les brevets
   - les prix
   - les routes
   - ✔ les données personnelles
2. Le droit à l'effacement permet de… *(évalue : restitution (mémorisation))*
   - oublier son mot de passe
   - ✔ demander la suppression de ses données
   - effacer une facture
   - supprimer un site
3. Une donnée personnelle permet… *(évalue : restitution (mémorisation))*
   - de calculer un prix
   - de mesurer la météo
   - de rien
   - ✔ d'identifier une personne, directement ou non
4. Une salle de sport garde le numéro de téléphone de ses membres pour les prévenir d'une fermeture. Peut-elle le vendre à une autre entreprise sans les en informer ? *(évalue : application)*
   - Oui, seulement le dimanche
   - Oui, elle en fait ce qu'elle veut
   - Oui, si le numéro est court
   - ✔ Non, ce n'est pas le but annoncé et les personnes doivent être informées

**Reformulation, idée centrale :** Le RGPD encadre l'usage des données qui identifient une personne : on doit l'informer, n'utiliser ses données que pour un but annoncé et légitime, et respecter ses droits.

**Éléments clés :** données qui identifient une personne, directement ou non ; information et droits (accès, effacement)

## S20 · La chaîne du froid

*Domaine : hygiène*

**Glossaire (termes à surveiller) :** chaîne du froid, denrée périssable, température, rupture de la chaîne du froid, bactérie, décongélation

**Compréhension immédiate**

1. Pourquoi garde-t-on la viande au froid ? *(évalue : compréhension)*
   - Pour changer son goût
   - ✔ Le froid ralentit le développement de la plupart des bactéries
   - Le froid tue toutes les bactéries
   - Pour qu'elle soit plus lourde
2. Pourquoi ne recongèle-t-on pas un produit décongelé tel quel, sans l'avoir cuit ? *(évalue : compréhension)*
   - Il deviendrait trop dur
   - ✔ Les bactéries ont pu se multiplier pendant la décongélation, et le froid ne les détruit pas
   - C'est seulement une question de goût
   - Il changerait de couleur
3. Au supermarché, quand vaut-il mieux prendre les surgelés et les produits frais ? *(évalue : application)*
   - ✔ À la fin des courses, juste avant de payer
   - Au début des courses
   - Après être passé à la voiture
   - N'importe quand, cela ne change rien

**Situation de transfert :** Après les courses, des surgelés restent deux heures dans le coffre d'une voiture en plein été.

> Quel est le risque, et que faut-il faire ?

*Réponse attendue :* Ils ont pu commencer à décongeler (rupture de la chaîne du froid), et les bactéries se multiplient : il ne faut pas les recongeler tels quels ; en cas de doute sur leur température, il faut les jeter.

**Déblocage** *(seulement si l'apprenant s'est déclaré bloqué : posé après la seconde explication ; grille dans `grille-reformulation.md`)*

1. Pour un pique-nique d'été, comment transporter des salades au poulet ? *(évalue : application)*
   - Peu importe, c'est cuit
   - Dans un sac ordinaire au soleil
   - ✔ Dans un sac isotherme avec des pains de glace
   - Dans le coffre sans précaution
2. Pourquoi cuire un produit décongelé permet-il ensuite de le congeler à nouveau ? *(évalue : compréhension)*
   - On ne peut jamais
   - Parce que la cuisson rend l'aliment plus froid
   - ✔ La cuisson détruit une grande partie des bactéries qui se sont multipliées
   - Parce qu'un plat cuit ne contient jamais de bactéries

**Rappel à J+2**

1. Quel est l'effet du froid sur la plupart des bactéries des aliments ? *(évalue : restitution (mémorisation))*
   - Il les nourrit
   - ✔ Il les ralentit
   - Il n'a aucun effet
   - Il les tue toutes
2. Un produit décongelé, non cuit, doit être… *(évalue : restitution (mémorisation))*
   - laissé au soleil
   - ✔ consommé rapidement, sans être recongelé tel quel
   - recongelé aussitôt
   - gardé un mois
3. La chaîne du froid concerne… *(évalue : restitution (mémorisation))*
   - seulement le congélateur de la maison
   - seulement le magasin
   - seulement le camion
   - ✔ tout le trajet du produit, de la fabrication à l'assiette
4. Ton réfrigérateur est resté ouvert toute la nuit. Que faire du poisson frais qu'il contenait ? *(évalue : application)*
   - Le manger cru le jour même
   - Le laisser encore une journée
   - Le recongeler aussitôt
   - ✔ Ne pas prendre de risque : s'il est resté au chaud, le jeter

**Reformulation, idée centrale :** Un produit périssable doit rester au froid sans interruption de sa fabrication à sa consommation, car le froid ralentit les bactéries sans les tuer.

**Éléments clés :** froid continu sur tout le trajet ; rupture = les bactéries se multiplient

## P-R1 · Ouverture et fermeture du magasin (R1 v2, corpus métier n° 1, fictif)

*Domaine : commerce de détail*

**Glossaire (termes à surveiller) :** fond de caisse, télésurveillance, issues de secours, défibrillateur, enveloppe scellée, coffre

**Compréhension immédiate**

1. Pourquoi la procédure impose-t-elle d'être au moins deux pour ouvrir le magasin ? *(évalue : compréhension)*
   - Ce n'est pas imposé
   - Parce que la porte est lourde
   - ✔ Pour la sécurité des personnes et de l'argent : personne ne reste seul face à un incident
   - Pour aller plus vite
2. Combien de temps as-tu pour désactiver l'alarme en arrivant ? *(évalue : restitution (mémorisation))*
   - 45 secondes
   - ✔ 30 secondes
   - 2 minutes
   - Pas de limite
3. Le voyant du défibrillateur n'est pas vert à l'ouverture. Que fais-tu ? *(évalue : application)*
   - Je débranche l'appareil
   - ✔ Je préviens le responsable avant d'ouvrir
   - Je ne fais rien
   - J'ouvre et je verrai plus tard

**Situation de transfert :** Un dimanche soir, ton collègue doit partir plus tôt et te propose de fermer seul.

> Que dit la procédure, et que fais-tu ?

*Réponse attendue :* La fermeture se fait toujours à deux (comptage et sortie) : je ne ferme pas seul et je préviens le responsable.

**Déblocage** *(seulement si l'apprenant s'est déclaré bloqué : posé après la seconde explication ; grille dans `grille-reformulation.md`)*

1. Pendant le tour de sécurité du matin, une issue de secours est bloquée par des cartons. Que fais-tu avant d'ouvrir ? *(évalue : application)*
   - ✔ Je la dégage et je vérifie qu'elle est déverrouillée avant l'ouverture au public
   - Je laisse, ce n'est pas mon rôle
   - Je la verrouille pour éviter les vols
   - J'ouvre quand même, je m'en occuperai à midi
2. Pourquoi la caisse est-elle comptée à deux le soir plutôt que seul ? *(évalue : compréhension)*
   - Parce que la caisse est lourde
   - ✔ Pour que le comptage soit vérifié et qu'aucun écart ne repose sur une seule personne
   - Pour aller deux fois plus vite
   - Ce n'est pas nécessaire

**Rappel à J+2**

1. Le fond de caisse compté à l'ouverture est de… *(évalue : restitution (mémorisation))*
   - 150 €
   - 100 €
   - ✔ 200 €
   - 300 €
2. L'alarme se déclenche par erreur. Qui appelles-tu ? *(évalue : restitution (mémorisation))*
   - ✔ La télésurveillance, au numéro affiché dans le bureau
   - La police
   - Un client
   - Personne
3. Le comptage des caisses le soir se fait… *(évalue : restitution (mémorisation))*
   - ✔ à deux personnes
   - le lendemain
   - seul
   - par un client
4. À l'ouverture, ton collègue est en retard de vingt minutes. Que fais-tu ? *(évalue : application)*
   - ✔ J'attends qu'il arrive (ou un autre collègue) avant d'ouvrir, et je préviens le responsable
   - J'ouvre seul pour ne pas perdre de clients
   - Je désactive l'alarme et j'attends à l'intérieur seul
   - Je rentre chez moi

**Reformulation, idée centrale :** On ouvre et on ferme toujours à deux, en sécurisant l'alarme, les issues et l'argent à chaque étape.

**Éléments clés :** jamais seul (ouverture, comptage, fermeture) ; contrôles de sécurité : alarme 30 s, issues, défibrillateur

## P-H1 · Réception des livraisons (H1 v2, corpus métier n° 1, fictif)

*Domaine : hôtellerie-restauration*

**Glossaire (termes à surveiller) :** thermomètre sonde, date limite de consommation, bon de livraison, traçabilité, chambre froide, tolérance

**Compréhension immédiate**

1. Une livraison de viande hachée arrive à + 4 °C. Que fais-tu ? *(évalue : application)*
   - ✔ Je refuse le produit, je l'écris sur le bon et je préviens le chef
   - Je l'accepte, c'est presque bon
   - Je la mets au congélateur
   - Je la goûte
2. Qui peut réceptionner une livraison de boissons ? *(évalue : restitution (mémorisation))*
   - Le livreur seul
   - ✔ Le chef ou son second
   - N'importe quel commis
   - Un client
3. Pourquoi faut-il ranger les produits acceptés en chambre froide dans les 15 minutes ? *(évalue : compréhension)*
   - Pour libérer le quai plus vite
   - ✔ Pour limiter le temps hors du froid, pendant lequel les bactéries se multiplient
   - Pour que le chef puisse les goûter
   - Parce que le livreur l'exige

**Situation de transfert :** Pendant le déchargement, un carton de glaces affiche – 16 °C en surface ; il était à – 18 °C dans le camion.

> Acceptes-tu le carton ? Justifie avec la procédure.

*Réponse attendue :* Oui, si c'est bref et pendant le déchargement : un écart de 3 °C au plus en surface est admis ; je le range vite au froid.

**Déblocage** *(seulement si l'apprenant s'est déclaré bloqué : posé après la seconde explication ; grille dans `grille-reformulation.md`)*

1. Un carton de yaourts arrive écrasé et ouvert. Que fais-tu ? *(évalue : application)*
   - Je l'accepte et je trie plus tard
   - Je le range directement en chambre froide
   - Je le rends sans rien noter
   - ✔ Je le refuse, je l'écris sur le bon et je garde une preuve photo
2. Pourquoi garder une photo du thermomètre et du bon quand on refuse un produit ? *(évalue : compréhension)*
   - ✔ Pour prouver le motif du refus au fournisseur et assurer la traçabilité
   - Pour décorer le registre
   - Parce que le livreur aime les photos
   - Ce n'est pas utile

**Rappel à J+2**

1. Il doit rester au moins combien de jours avant la date limite pour les viandes et poissons ? *(évalue : restitution (mémorisation))*
   - 7 jours
   - 1 jour
   - 3 jours
   - ✔ 4 jours
2. Pour un produit refusé, que faut-il en plus de la mention sur le bon ? *(évalue : restitution (mémorisation))*
   - Rien
   - ✔ Photographier le thermomètre et le bon, et joindre les photos au registre
   - Appeler un client
   - Jeter le bon
3. Comment mesure-t-on la température d'un produit emballé ? *(évalue : restitution (mémorisation))*
   - ✔ Sonde entre deux emballages, sans les percer
   - Avec un thermomètre de cuisine dans l'air
   - À la main
   - En perçant l'emballage
4. Du poisson frais est livré avec une date limite dans 2 jours. Que fais-tu ? *(évalue : application)*
   - Je l'accepte, il n'est pas périmé
   - ✔ Je le refuse : il faut au moins 4 jours avant la date limite
   - Je le congèle tout de suite
   - Je change l'étiquette

**Reformulation, idée centrale :** À la réception, le chef ou son second contrôle températures, dates et emballages, refuse ce qui n'est pas conforme en gardant une preuve, et range vite au froid.

**Éléments clés :** contrôles et seuils de température ; refus documenté (bon, photos) et rangement en 15 minutes

## P-R3 · Tenue de la caisse (R3, corpus métier n° 1, fictif)

*Domaine : commerce de détail*

**Glossaire (termes à surveiller) :** fond de caisse, plafond de paiement en espèces, détecteur de faux billets, prélèvement, fiche d'écart, domicile fiscal

**Compréhension immédiate**

1. Un client domicilié en France veut payer 1 200 € en espèces. Que fais-tu ? *(évalue : application)*
   - J'accepte
   - J'appelle la police
   - ✔ Je refuse le paiement en espèces au-delà de 1 000 € et je propose un autre moyen
   - Je demande la moitié en pièces
2. Un client veut payer 30 € uniquement en pièces de 1 centime. Es-tu obligé d'accepter ? *(évalue : application)*
   - Oui, toujours
   - ✔ Non, pas plus de 50 pièces pour un même paiement
   - Non, jamais de pièces
   - Oui, si c'est le matin
3. Pourquoi le responsable fait-il un prélèvement vers le coffre quand le tiroir contient trop d'espèces ? *(évalue : compréhension)*
   - Pour rendre la monnaie plus vite
   - Parce que le tiroir ne ferme plus
   - ✔ Pour limiter l'argent exposé en caisse en cas de vol ou d'erreur
   - Pour payer les salaires

**Situation de transfert :** Le détecteur signale qu'un billet de 50 € est douteux ; le client s'énerve et réclame son billet.

> Que fais-tu, et pourquoi ?

*Réponse attendue :* Je reste courtois et je n'accuse pas le client ; le billet présumé faux ne doit pas être remis en circulation (il n'est jamais rendu en monnaie) ; j'appelle le responsable, qui le remet à la Banque de France, à un commissariat ou à une gendarmerie.

**Déblocage** *(seulement si l'apprenant s'est déclaré bloqué : posé après la seconde explication ; grille dans `grille-reformulation.md`)*

1. Un client paie avec un billet de 20 € qui te semble douteux au toucher. Que fais-tu ? *(évalue : application)*
   - ✔ Je le vérifie et, s'il est présumé faux, je ne le remets pas en circulation et j'appelle le responsable
   - Je le rends en monnaie à un autre client
   - Je le déchire
   - Je l'accepte sans regarder
2. Pourquoi un billet présumé faux ne doit-il jamais être rendu en monnaie ? *(évalue : compréhension)*
   - Parce qu'il est sale
   - Parce que le client ne le voudrait pas
   - ✔ Le remettre en circulation est interdit : il doit être remis aux autorités
   - Il peut être rendu

**Rappel à J+2**

1. Le fond de caisse est de… *(évalue : restitution (mémorisation))*
   - 50 €
   - 150 €
   - ✔ 200 €
   - 800 €
2. Au-delà de quel écart en fin de journée faut-il une fiche signée ? *(évalue : restitution (mémorisation))*
   - 1 €
   - ✔ 10 €
   - 50 €
   - Aucun écart n'est noté
3. À partir de quelle valeur vérifie-t-on les billets au détecteur ? *(évalue : restitution (mémorisation))*
   - 100 € seulement
   - Tous les billets
   - ✔ 50 € et plus
   - Jamais
4. En fin de journée, il manque 15 € dans ta caisse. Que fais-tu ? *(évalue : application)*
   - Je complète avec mon argent
   - ✔ Je remplis une fiche d'écart signée, car l'écart dépasse 10 €
   - Je ne dis rien
   - Je reporte l'écart au lendemain

**Reformulation, idée centrale :** La caisse se tient avec des règles d'argent strictes : plafonds en espèces, vérification des billets, prélèvements et écarts tracés.

**Éléments clés :** règles légales (1 000 €, 50 pièces, billet suspect) ; règles internes (prélèvement, fiche d'écart)

