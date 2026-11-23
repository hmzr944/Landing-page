# Jeu de mesure pédagogique (mission 3a) : version de relecture

Statut : **proposition corrigée, à relire et valider avant toute mesure**. Généré par `docs/pedagogie/assembler.js` à partir des sources relues ; ne pas modifier ce fichier à la main.

La bonne réponse est marquée ✔ (ordre des choix mélangé). Les participants voient les questions sans cette marque.

Chaque question porte un classement « évalue », **écrit et relu dans les sources** (pas deviné par un programme) : **application** (décider ou calculer dans un cas concret nouveau), **compréhension** (expliquer une cause ou un mécanisme) ou **restitution** (redonner une définition, un nom ou un chiffre appris, donc de la mémorisation).

Règles de composition, vérifiées par `tests/jeu-de-mesure.js` : compréhension immédiate, au moins 2 questions sur 3 en application ou compréhension ; rappel à J+2, 3 restitutions (mesure de mémorisation) et 1 application ; déblocage, 2 questions préparées à l'avance (sujets : 1 application, 1 compréhension ; procédures : 2 applications), posées seulement après la seconde explication, chacune avec les critères qui permettent de noter la justification.

Procédures métier : chaque question cite la phrase de la procédure qui justifie la bonne réponse (« Appui dans la procédure »). Aucune raison non écrite dans la procédure n'est attendue : quand la procédure ne donne pas la raison d'une règle, la question porte sur son application.

## Bilan : ce que les questions évaluent

| Bloc | Application | Compréhension | Restitution (mémorisation) |
|---|---|---|---|
| Compréhension immédiate (69 questions) | 29 | 38 | 2 |
| Rappel à J+2 (92 questions) | 23 | 0 | 69 |
| Déblocage (46 questions) | 26 | 20 | 0 |

## Bilan : longueur des réponses

Une bonne réponse plus longue que les autres est un indice qui permet de réussir sans comprendre. Au hasard, on attend environ 25 % de questions où la bonne réponse est la plus longue, et autant où elle est la plus courte. Seuils vérifiés par `tests/jeu-de-mesure.js` : entre 10 % et 35 % pour chacune, rapport moyen entre 0,85 et 1,15.

| Bloc | Questions | Bonne réponse la plus longue | Bonne réponse la plus courte | Longueur moyenne bonne réponse / mauvaises |
|---|---|---|---|---|
| Compréhension immédiate | 69 | 11 (15,9 %) | 18 (26,1 %) | 0,98 |
| Rappel à J+2 | 92 | 6 (6,5 %) | 24 (26,1 %) | 0,90 |
| Déblocage | 46 | 9 (19,6 %) | 7 (15,2 %) | 0,99 |
| **Total** | 207 | 26 (12,6 %) | 49 (23,7 %) | 0,94 |

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
| S09 L'ADN | 0 / 3 / 0 | 1 / 0 / 3 | 1 / 1 |
| S10 Le vaccin | 0 / 3 / 0 | 1 / 0 / 3 | 1 / 1 |
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
| P-R1 Ouverture et fermeture du magasin (R1 v2, corpus métier n° 1, fictif) | 2 / 0 / 1 | 1 / 0 / 3 | 2 / 0 |
| P-H1 Réception des livraisons (H1 v2, corpus métier n° 1, fictif) | 2 / 0 / 1 | 1 / 0 / 3 | 2 / 0 |
| P-R3 Tenue de la caisse (R3, corpus métier n° 1, fictif) | 3 / 0 / 0 | 1 / 0 / 3 | 2 / 0 |

## S01 · Le protocole IP

*Domaine : numérique*

**Glossaire (termes à surveiller) :** adresse IP, paquet, routeur, réseau, protocole, en-tête, Internet

**Compréhension immédiate**

1. Pourquoi un fichier envoyé sur Internet est-il découpé en paquets ? *(évalue : compréhension)*
   - Pour être chiffré automatiquement pendant le trajet
   - Pour prendre moins de place une fois enregistré sur le disque
   - Parce qu'un câble ne transporte qu'une lettre à la fois
   - ✔ Pour voyager en petits morceaux, chacun par le meilleur chemin
2. Un routeur reçoit un paquet adressé à un ordinateur situé dans un autre pays. Que fait-il ? *(évalue : application)*
   - Il ouvre le paquet pour lire le message avant de l'envoyer
   - Il le garde jusqu'à ce que le destinataire vienne le réclamer
   - ✔ Il lit l'adresse de destination et le passe au routeur suivant
   - Il le renvoie à l'expéditeur, qui doit choisir lui-même la route
3. Un câble est coupé sur le trajet habituel entre deux villes, mais la vidéo continue d'arriver. Pourquoi ? *(évalue : compréhension)*
   - ✔ Les routeurs font passer les paquets par un autre chemin
   - Les paquets attendent la réparation du câble, puis repartent
   - Le câble coupé continue de transmettre les paquets à moitié
   - La vidéo était déjà entièrement stockée dans le câble coupé

**Situation de transfert :** Pendant un appel vidéo, l'image se fige une seconde puis repart, sans que l'appel soit coupé.

> Avec ce que tu sais des paquets, explique ce qui a pu se passer.

*Réponse attendue :* Certains paquets ont été retardés ou perdus en route (chemin encombré) ; les suivants sont arrivés et l'appel a continué.

**Déblocage** *(seulement si la compréhension immédiate donne moins de 2 sur 3, ou si la personne se dit bloquée ; posé après le transfert et la seconde explication ; notation : `grille-reformulation.md`, partie 2)*

1. Tu envoies une photo à un ami. Combien d'adresses de destination différentes portent ses paquets ? *(évalue : application)*
   - Aucune : c'est le routeur qui devine la destination
   - Une par routeur traversé, qui change à chaque étape
   - Une différente par paquet, pour répartir le trafic
   - ✔ Une seule : celle de l'ami, écrite sur chaque paquet
   - *Justification juste si elle contient :* Tous les paquets vont au même destinataire et portent donc tous son adresse ; c'est le chemin qui peut changer, pas l'adresse.
   - *Exemple juste (2 points avec le bon choix) :* « Tous les paquets vont chez mon ami, donc ils ont tous son adresse. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Une seule, c'est comme ça. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Une seule, parce que tous les paquets prennent le même chemin. »
2. Pourquoi n'a-t-on pas besoin de réserver un chemin fixe avant d'envoyer des paquets ? *(évalue : compréhension)*
   - Parce qu'Internet ne possède qu'un seul chemin entre deux villes
   - Parce qu'on envoie toujours le fichier en un seul morceau
   - Parce que chaque paquet connaît à l'avance tout son trajet
   - ✔ Chaque paquet porte son adresse et chaque routeur choisit la suite
   - *Justification juste si elle contient :* L'adresse écrite sur chaque paquet suffit : chaque routeur décide du pas suivant, au fur et à mesure.
   - *Exemple juste (2 points avec le bon choix) :* « Chaque routeur lit l'adresse et envoie plus loin, donc pas besoin de prévoir tout le trajet. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Parce que les paquets se débrouillent. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Parce qu'il n'y a qu'un seul chemin possible. »

**Rappel à J+2**

1. Sur un paquet IP, qu'est-ce qui permet de savoir où il doit aller ? *(évalue : restitution (mémorisation))*
   - L'heure à laquelle il a été envoyé
   - Le poids du paquet en octets
   - Le nom du fichier envoyé
   - ✔ L'adresse IP de destination
2. Deux paquets d'un même message prennent-ils forcément le même chemin ? *(évalue : restitution (mémorisation))*
   - ✔ Non, ils peuvent passer par des routeurs différents
   - Oui, le chemin est réservé au début de l'envoi
   - Oui, sinon le message ne pourrait pas être reconstitué
   - Non, chaque paquet va directement au destinataire, sans routeur
3. Quel appareil fait passer un paquet d'un réseau à un autre ? *(évalue : restitution (mémorisation))*
   - ✔ Le routeur
   - La carte mémoire
   - Le disque dur
   - Le processeur
4. Un message est découpé en 10 paquets ; le 4e arrive après le 7e. Que faut-il pour reconstituer le message ? *(évalue : application)*
   - Renvoyer tout le message depuis le début
   - Jeter le 4e paquet, arrivé trop tard
   - Rien : les paquets arrivent toujours dans l'ordre
   - ✔ Les remettre dans l'ordre à l'arrivée

**Reformulation, idée centrale :** Les données voyagent en petits paquets portant une adresse de destination, que des routeurs font avancer de proche en proche.

**Éléments clés :** découpage en paquets ; adresse lue par les routeurs pour acheminer

## S02 · La mémoire de l'ordinateur (RAM)

*Domaine : numérique*

**Glossaire (termes à surveiller) :** mémoire vive, RAM, stockage, disque, volatile, processeur, programme

**Compréhension immédiate**

1. Pourquoi un document non enregistré est-il perdu si l'ordinateur s'éteint brutalement ? *(évalue : compréhension)*
   - L'écran garde le document et s'éteint en même temps que lui
   - ✔ Il n'était que dans la mémoire vive, qui s'efface sans courant
   - Le disque se vide entièrement quand le courant est coupé
   - Le processeur supprime les fichiers ouverts pour se protéger
2. Pourquoi un ordinateur ralentit-il quand on ouvre beaucoup de programmes ? *(évalue : compréhension)*
   - L'écran doit afficher trop d'images à la fois et il chauffe
   - Chaque programme ouvert vide un peu la batterie du processeur
   - ✔ La mémoire vive est pleine et le disque, plus lent, prend le relais
   - Le disque se remplit de programmes et devient inutilisable
3. Tu dois garder des photos de vacances pendant des années. Où faut-il les enregistrer ? *(évalue : application)*
   - Dans la mémoire vive, qui est la plus rapide
   - Dans le processeur, qui garde les calculs récents
   - ✔ Sur le disque ou une clé USB
   - Sur le bureau de l'écran, sans les enregistrer

**Situation de transfert :** Tu prépares un exposé au tableau blanc pendant que tes fiches sont rangées dans un classeur.

> Si tu compares à un ordinateur, que représentent le tableau et le classeur, et pourquoi ?

*Réponse attendue :* Le tableau = la mémoire vive (on travaille dessus, rapide, effacé à la fin) ; le classeur = le disque (on y range pour garder).

**Déblocage** *(seulement si la compréhension immédiate donne moins de 2 sur 3, ou si la personne se dit bloquée ; posé après le transfert et la seconde explication ; notation : `grille-reformulation.md`, partie 2)*

1. Une coupure de courant survient pendant que tu écris. Qu'est-ce qui sera conservé ? *(évalue : application)*
   - ✔ Ce qui était déjà enregistré sur le disque
   - Tout ce qui était affiché à l'écran au moment de la coupure
   - Rien du tout, même ce qui était enregistré
   - Seulement ce qui était dans la mémoire vive
   - *Justification juste si elle contient :* Seul le disque garde les données sans courant ; ce qui n'était qu'en mémoire vive est perdu.
   - *Exemple juste (2 points avec le bon choix) :* « Ce qui est sauvegardé est sur le disque, et le disque garde tout sans électricité. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Ce qui était enregistré, c'est tout. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Ce qui était enregistré, parce que la mémoire vive le sauvegarde toute seule. »
2. Pourquoi un ordinateur utilise-t-il de la mémoire vive au lieu de tout faire directement sur le disque ? *(évalue : compréhension)*
   - Elle garde les données plus longtemps que le disque
   - Le disque ne sait lire que les photos, pas les programmes
   - Elle coûte moins cher et prend moins de place
   - ✔ Elle est bien plus rapide que le disque pour travailler
   - *Justification juste si elle contient :* La mémoire vive est beaucoup plus rapide : le disque sert à garder, la mémoire vive à travailler.
   - *Exemple juste (2 points avec le bon choix) :* « Travailler sur le disque serait trop lent, la mémoire vive va beaucoup plus vite. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Parce que c'est mieux. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Parce qu'elle garde les fichiers même quand l'ordinateur est éteint. »

**Rappel à J+2**

1. La mémoire vive garde-t-elle les données quand l'ordinateur est éteint ? *(évalue : restitution (mémorisation))*
   - Oui, pendant quelques semaines
   - Oui, tout ce qu'elle contient est conservé
   - ✔ Non, elle s'efface sans courant
   - Seulement les photos et les vidéos
2. Où faut-il enregistrer un fichier pour le retrouver le lendemain ? *(évalue : restitution (mémorisation))*
   - ✔ Sur le disque (le stockage)
   - Dans la mémoire de l'écran
   - Dans la mémoire vive
   - Dans le processeur
3. Ajouter de la mémoire vive aide surtout à… *(évalue : restitution (mémorisation))*
   - ✔ ouvrir plus de programmes à la fois
   - avoir un écran plus grand et plus net
   - se connecter plus vite à Internet
   - garder plus de photos et de vidéos pour toujours
4. Ton ordinateur est très lent avec 30 onglets ouverts, mais son disque est presque vide. Quelle est la cause la plus probable ? *(évalue : application)*
   - Le processeur est neuf et pas encore rodé
   - ✔ La mémoire vive est pleine
   - Le disque est trop vide pour fonctionner
   - L'écran est trop petit pour 30 onglets

**Reformulation, idée centrale :** La mémoire vive est l'espace de travail rapide mais temporaire de l'ordinateur ; ce qui doit durer va sur le disque.

**Éléments clés :** rapide et effacée sans courant ; différence avec le stockage durable

## S03 · Le chiffrement d'un message

*Domaine : numérique*

**Glossaire (termes à surveiller) :** chiffrer, déchiffrer, clé, message chiffré, algorithme, confidentialité

**Compréhension immédiate**

1. Pourquoi un message chiffré intercepté est-il inutile pour un espion qui n'a pas la clé ? *(évalue : compréhension)*
   - Il est trop long pour être recopié
   - ✔ Il est illisible sans la clé
   - Il est écrit dans une langue étrangère
   - Il s'efface dès qu'il est intercepté
2. Quelqu'un a volé la clé de ta messagerie chiffrée. Quel est le risque ? *(évalue : application)*
   - Tous les messages déjà envoyés sont effacés
   - ✔ Il peut lire les messages chiffrés avec cette clé
   - Aucun : un message chiffré reste toujours secret
   - La clé se change toute seule après le vol
3. Deux personnes utilisent la même méthode de chiffrement connue de tous. Qu'est-ce qui garde leurs messages secrets ? *(évalue : compréhension)*
   - La langue dans laquelle elles écrivent
   - ✔ La clé, qu'elles seules connaissent
   - Le secret de la méthode, connue de tous
   - La longueur des messages qu'elles s'envoient

**Situation de transfert :** Deux amies s'écrivent en décalant chaque lettre de trois rangs dans l'alphabet (A devient D).

> Qu'est-ce qui joue ici le rôle de la clé, et que doit savoir l'autre amie pour lire le mot ?

*Réponse attendue :* La clé est le décalage de 3 ; il faut le connaître pour décaler chaque lettre dans l'autre sens.

**Déblocage** *(seulement si la compréhension immédiate donne moins de 2 sur 3, ou si la personne se dit bloquée ; posé après le transfert et la seconde explication ; notation : `grille-reformulation.md`, partie 2)*

1. Tu reçois « EBUF », chiffré avec un décalage de 1. Quel était le mot ? *(évalue : application)*
   - ✔ DATE
   - CATE
   - EBUF
   - FCVG
   - *Justification juste si elle contient :* Chaque lettre a été avancée d'un rang ; pour déchiffrer, on recule chaque lettre d'un rang (E→D, B→A, U→T, F→E).
   - *Exemple juste (2 points avec le bon choix) :* « J'ai reculé chaque lettre d'une place : E devient D, B devient A… »
   - *Exemple insuffisant (1 point avec le bon choix) :* « C'est DATE parce que ça fait un vrai mot. »
   - *Exemple faux (0 point, même avec le bon choix) :* « DATE, parce qu'on remplace la première lettre par un D. »
2. Pourquoi faut-il transmettre la clé autrement que par le même canal que le message ? *(évalue : compréhension)*
   - Parce que la clé est trop longue pour tenir dans le message
   - Parce que la loi interdit d'envoyer une clé par Internet
   - ✔ Qui intercepte les deux peut tout lire
   - Parce que la clé s'abîme si elle voyage avec le message
   - *Justification juste si elle contient :* Si la clé voyage avec le message, celui qui intercepte l'envoi a les deux et peut déchiffrer.
   - *Exemple juste (2 points avec le bon choix) :* « Si un espion attrape le message et la clé ensemble, il lit tout. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Par sécurité. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Parce que la clé est trop grosse. »

**Rappel à J+2**

1. Chiffrer un message, c'est… *(évalue : restitution (mémorisation))*
   - ✔ le rendre illisible sans la clé
   - le traduire dans une autre langue
   - le raccourcir pour l'envoyer plus vite
   - le copier en plusieurs exemplaires
2. Ce qui doit rester secret avant tout, c'est… *(évalue : restitution (mémorisation))*
   - ✔ la clé
   - la longueur du message
   - le nom de la méthode
   - l'heure d'envoi
3. Déchiffrer, c'est… *(évalue : restitution (mémorisation))*
   - envoyer le message à plusieurs personnes
   - inventer une clé pour chaque message
   - supprimer le message après l'avoir lu
   - ✔ retrouver le message lisible grâce à la clé
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
   - Parce qu'un triangle sans angle droit n'a pas d'hypoténuse mesurable
   - ✔ La relation entre les carrés n'est vraie qu'avec un angle droit
   - Parce que le calcul serait trop long sans angle droit
   - On peut : le théorème vaut pour tous les triangles
3. Un triangle a des côtés 5, 12 et 13. Est-il rectangle ? *(évalue : application)*
   - On ne peut pas savoir sans mesurer les angles
   - ✔ Oui, car 5² + 12² = 13²
   - Non, aucun triangle ne peut avoir ces côtés
   - Non, car 5 + 12 n'est pas égal à 13

**Situation de transfert :** Une échelle de 5 m est posée contre un mur ; son pied est à 3 m du mur, sur un sol plat.

> À quelle hauteur l'échelle touche-t-elle le mur ? Explique ton raisonnement.

*Réponse attendue :* 4 m : le mur et le sol font un angle droit, 5² = 3² + h², donc h² = 16 et h = 4.

**Déblocage** *(seulement si la compréhension immédiate donne moins de 2 sur 3, ou si la personne se dit bloquée ; posé après le transfert et la seconde explication ; notation : `grille-reformulation.md`, partie 2)*

1. Un écran a 30 cm de large et 40 cm de haut. Combien mesure sa diagonale ? *(évalue : application)*
   - 70 cm
   - 35 cm
   - ✔ 50 cm
   - 60 cm
   - *Justification juste si elle contient :* Largeur et hauteur forment un angle droit : 30² + 40² = 900 + 1 600 = 2 500, et la racine de 2 500 est 50 (ou : c'est le triangle 3-4-5 multiplié par 10).
   - *Exemple juste (2 points avec le bon choix) :* « 30 au carré plus 40 au carré, ça fait 2 500, donc la diagonale fait 50. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « J'ai calculé. »
   - *Exemple faux (0 point, même avec le bon choix) :* « 30 + 40 = 70, et on enlève 20. »
2. Pourquoi l'hypoténuse est-elle toujours le plus grand côté ? *(évalue : compréhension)*
   - Ce n'est vrai que si les deux autres côtés sont égaux
   - Parce qu'elle est toujours tracée à l'horizontale, en bas
   - ✔ Son carré est la somme des deux autres carrés, donc plus grand
   - Par simple convention, sans raison mathématique
   - *Justification juste si elle contient :* Le carré de l'hypoténuse est égal à la somme des carrés des deux autres côtés : il est donc plus grand que chacun d'eux, et l'hypoténuse aussi.
   - *Exemple juste (2 points avec le bon choix) :* « Son carré, c'est les deux autres carrés additionnés, donc elle est forcément plus longue. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Parce que c'est la plus longue. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Parce qu'elle est en bas du triangle. »

**Rappel à J+2**

1. Le théorème relie… *(évalue : restitution (mémorisation))*
   - les aires de deux cercles de même centre
   - les trois angles de n'importe quel triangle
   - ✔ les côtés d'un triangle rectangle
   - le périmètre et l'aire d'un carré
2. Où se trouve l'hypoténuse ? *(évalue : restitution (mémorisation))*
   - ✔ En face de l'angle droit
   - Le long du côté le plus court
   - Au milieu du triangle
   - Entre les deux plus petits côtés
3. À quels triangles s'applique le théorème ? *(évalue : restitution (mémorisation))*
   - Aux triangles dont les trois côtés sont égaux
   - Aux triangles dont deux côtés sont égaux
   - ✔ Aux triangles rectangles
   - À tous les triangles, sans exception
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
   - ✔ Plus on coupe le tout en parts, plus chaque part est petite
   - Le chiffre du bas indique combien de parts on prend
   - Ils sont égaux : seul le nombre de parts change
   - C'est une exception qu'il faut apprendre par cœur
3. Pourquoi 2/4 et 1/2 représentent-ils la même quantité ? *(évalue : compréhension)*
   - ✔ 2 parts sur 4 couvrent autant que 1 part sur 2
   - Parce que 4 est le double de 2, donc tout double
   - Ce n'est pas la même quantité : 2/4 est plus grand
   - Parce que leurs numérateurs sont tous les deux petits

**Situation de transfert :** Une recette pour 4 personnes demande 3/4 de litre de lait ; tu cuisines pour 2 personnes.

> Quelle quantité de lait faut-il, et comment le sais-tu ?

*Réponse attendue :* 3/8 de litre : deux fois moins de personnes, donc la moitié de 3/4.

**Déblocage** *(seulement si la compréhension immédiate donne moins de 2 sur 3, ou si la personne se dit bloquée ; posé après le transfert et la seconde explication ; notation : `grille-reformulation.md`, partie 2)*

1. Une bouteille d'1 litre est remplie aux 3/4. Combien de quarts de litre manque-t-il pour la remplir ? *(évalue : application)*
   - 4
   - 2
   - ✔ 1
   - 3
   - *Justification juste si elle contient :* Une bouteille pleine fait 4/4 ; il y en a 3/4, il manque donc 4/4 − 3/4 = 1/4.
   - *Exemple juste (2 points avec le bon choix) :* « Il faut 4 quarts pour la remplir, il y en a 3, donc il en manque 1. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « 1, c'est évident. »
   - *Exemple faux (0 point, même avec le bon choix) :* « 1, parce qu'il manque 1 litre. »
2. Pourquoi peut-on remplacer 6/9 par 2/3 ? *(évalue : compréhension)*
   - Parce que 2/3 est un peu plus grand que 6/9
   - ✔ On regroupe les parts par 3 : la quantité ne change pas
   - Parce que 6 et 9 sont trop grands pour être utilisés
   - On ne peut pas : ce sont deux quantités différentes
   - *Justification juste si elle contient :* 6/9 et 2/3 représentent la même part : en divisant le haut et le bas par 3, on regroupe les parts sans changer la quantité.
   - *Exemple juste (2 points avec le bon choix) :* « 6 et 9 se divisent par 3, ça donne 2/3, c'est la même part avec des morceaux plus gros. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Parce que c'est plus simple. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Parce qu'on enlève 4 en haut et 6 en bas. »

**Rappel à J+2**

1. Dans 3/5, le nombre du bas indique… *(évalue : restitution (mémorisation))*
   - ✔ en combien de parts égales le tout est coupé
   - combien de parts il reste après partage
   - combien de parts on a prises dans le tout
   - le résultat de la division de 3 par 5
2. 4/8 est égal à… *(évalue : restitution (mémorisation))*
   - 8/4
   - ✔ 1/2
   - 2/3
   - 1/4
3. Lequel est le plus petit : 1/3 ou 1/10 ? *(évalue : restitution (mémorisation))*
   - 1/3
   - On ne peut pas savoir
   - Ils sont égaux
   - ✔ 1/10
4. Tu as mangé 2/6 d'une tarte et ton ami 1/3. Qui en a mangé le plus ? *(évalue : application)*
   - Ton ami, car 3 est plus petit que 6
   - On ne peut pas comparer des sixièmes et des tiers
   - Toi, car 2 est plus grand que 1
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
   - La banque ajoute 1 € de frais de gestion la 2e année
   - C'est un arrondi, le vrai résultat est 120 €
   - ✔ La 2e année, les 10 € d'intérêts rapportent aussi
   - Le taux passe automatiquement à 11 % la 2e année
3. Pour un même taux, pourquoi placer tôt rapporte-t-il plus ? *(évalue : compréhension)*
   - Les banques accordent un meilleur taux aux jeunes clients
   - ✔ Les intérêts ont plus d'années pour rapporter à leur tour
   - Ce n'est pas vrai : seule la somme de départ compte
   - Le taux augmente chaque année tant qu'on ne retire rien

**Situation de transfert :** Une dette de carte de crédit non remboursée augmente chaque mois avec des intérêts sur les intérêts.

> Pourquoi cette dette peut-elle grossir de plus en plus vite ?

*Réponse attendue :* Les intérêts s'ajoutent à la dette, puis portent eux-mêmes des intérêts : la base grossit chaque mois.

**Déblocage** *(seulement si la compréhension immédiate donne moins de 2 sur 3, ou si la personne se dit bloquée ; posé après le transfert et la seconde explication ; notation : `grille-reformulation.md`, partie 2)*

1. Tu places 200 € à 10 % par an, composés. Combien as-tu au bout d'un an, puis de deux ans ? *(évalue : application)*
   - ✔ 220 €, puis 242 €
   - 200 €, puis 220 €
   - 210 €, puis 220 €
   - 220 €, puis 240 €
   - *Justification juste si elle contient :* 1re année : 200 + 10 % = 220 €. 2e année, les 10 % portent sur 220 € : 220 + 22 = 242 €.
   - *Exemple juste (2 points avec le bon choix) :* « La deuxième année on gagne 10 % de 220, donc 22 €, ça fait 242. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « J'ai fait le calcul. »
   - *Exemple faux (0 point, même avec le bon choix) :* « 242, parce qu'on ajoute 20 € puis 22 € de frais. »
2. Si tu retires chaque année les intérêts gagnés, y a-t-il encore un effet « composé » ? *(évalue : compréhension)*
   - Oui, c'est exactement le même effet qu'en les laissant
   - Oui, et l'effet est même plus fort qu'en les laissant
   - ✔ Non, les intérêts ne restent pas pour rapporter à leur tour
   - Seulement si le taux est supérieur à 10 % par an
   - *Justification juste si elle contient :* L'effet composé vient des intérêts laissés sur le placement, qui rapportent ensuite ; si on les retire, chaque année rapporte sur la même somme de départ.
   - *Exemple juste (2 points avec le bon choix) :* « Non, les intérêts partis ne peuvent plus rapporter, on gagne toujours sur la même somme. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Non, ça ne marche plus. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Non, parce que la banque baisse le taux. »

**Rappel à J+2**

1. Avec les intérêts composés, les intérêts de l'an 1 rapportent-ils en l'an 2 ? *(évalue : restitution (mémorisation))*
   - Seulement s'ils sont retirés
   - Non
   - ✔ Oui
   - Seulement si le taux dépasse 10 %
2. Le capital, c'est… *(évalue : restitution (mémorisation))*
   - les intérêts gagnés
   - ✔ la somme placée au départ
   - la durée du placement
   - le taux d'intérêt annuel
3. Qu'est-ce qui distingue les intérêts composés ? *(évalue : restitution (mémorisation))*
   - ✔ Les intérêts rapportent à leur tour des intérêts
   - Les intérêts sont calculés sur la somme de départ seulement
   - Le taux baisse un peu chaque année
   - On ne touche les intérêts qu'à la fin du placement
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
   - Elle manque d'air frais et finit par s'étouffer lentement
   - ✔ Sans lumière, elle ne produit plus sa nourriture
   - Il fait trop froid dans un placard fermé
   - La terre sèche plus vite dans le noir
2. Une plante d'intérieur bien arrosée, posée loin de toute fenêtre, pousse mal. Que changer en priorité ? *(évalue : application)*
   - Lui donner de l'engrais chaque semaine
   - L'arroser davantage pour compenser
   - ✔ La rapprocher d'une fenêtre
   - Couper ses feuilles pour qu'elle repousse
3. D'où vient l'essentiel de la matière qui fait grossir un arbre ? *(évalue : compréhension)*
   - Presque uniquement de la terre absorbée par les racines
   - ✔ Du dioxyde de carbone de l'air, transformé grâce à la lumière
   - Des minéraux du sol, transformés grâce à la chaleur
   - Presque uniquement de l'eau de pluie stockée dans le bois

**Situation de transfert :** Dans une serre fermée et éclairée, on ajoute du dioxyde de carbone dans l'air.

> Que peut-on attendre pour la croissance des plantes, et pourquoi ?

*Réponse attendue :* Elles peuvent pousser plus vite : plus de dioxyde de carbone disponible pour fabriquer leur nourriture, tant qu'il y a lumière et eau.

**Déblocage** *(seulement si la compréhension immédiate donne moins de 2 sur 3, ou si la personne se dit bloquée ; posé après le transfert et la seconde explication ; notation : `grille-reformulation.md`, partie 2)*

1. Une salade pousse sous une lampe éclairant 4 heures par jour au lieu de 12. Que prévoir ? *(évalue : application)*
   - Aucun effet, si elle est bien arrosée chaque jour
   - ✔ Elle produira moins de nourriture et grandira moins
   - Elle grandira plus vite pour aller chercher la lumière
   - Elle produira plus d'oxygène pour compenser
   - *Justification juste si elle contient :* Moins de lumière, donc moins de photosynthèse : la plante fabrique moins de sucre pour grandir.
   - *Exemple juste (2 points avec le bon choix) :* « Avec moins de lumière elle fabrique moins de nourriture, donc elle pousse moins. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Elle a moins de lumière. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Elle poussera moins car elle aura moins d'eau. »
2. Pourquoi dit-on que les plantes « nourrissent » presque tous les êtres vivants ? *(évalue : compréhension)*
   - Elles absorbent les restes des animaux et les recyclent
   - Elles produisent l'eau que boivent tous les êtres vivants
   - ✔ Elles fabriquent du sucre que mangent ensuite les animaux
   - Elles fabriquent les vitamines de l'air que l'on respire
   - *Justification juste si elle contient :* Grâce à la lumière, les plantes fabriquent leur matière (sucre) ; les herbivores les mangent, puis d'autres animaux mangent les herbivores.
   - *Exemple juste (2 points avec le bon choix) :* « Les plantes font leur nourriture avec le soleil, et les animaux mangent les plantes ou ceux qui mangent les plantes. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Parce qu'on mange des légumes. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Parce qu'elles prennent leur nourriture dans la terre et la donnent aux animaux. »

**Rappel à J+2**

1. La photosynthèse a lieu surtout dans… *(évalue : restitution (mémorisation))*
   - ✔ les feuilles
   - les fleurs
   - les graines
   - les racines profondes
2. Le pigment vert qui capte la lumière s'appelle… *(évalue : restitution (mémorisation))*
   - pigment brun (mélanine)
   - ✔ chlorophylle
   - glucose
   - hémoglobine
3. La photosynthèse produit… *(évalue : restitution (mémorisation))*
   - de l'eau et de l'azote
   - de la terre et des minéraux
   - ✔ du sucre et de l'oxygène
   - du sucre et du dioxyde de carbone
4. Dans un aquarium éclairé, des bulles se forment sur les feuilles des plantes. Que contiennent-elles surtout ? *(évalue : application)*
   - Du dioxyde de carbone
   - ✔ De l'oxygène
   - De l'azote dissous
   - De la vapeur d'eau

**Reformulation, idée centrale :** Grâce à la lumière, la plante fabrique son sucre à partir d'eau et de dioxyde de carbone, et rejette de l'oxygène.

**Éléments clés :** besoins : lumière, eau, CO2 ; produits : sucre et oxygène

## S08 · Le système immunitaire

*Domaine : sciences de la vie*

**Glossaire (termes à surveiller) :** système immunitaire, microbe, globule blanc, anticorps, infection, mémoire immunitaire

**Compréhension immédiate**

1. Pourquoi tombe-t-on rarement deux fois malade de la varicelle ? *(évalue : compréhension)*
   - ✔ Le corps garde la mémoire de ce microbe et réagit vite
   - Le microbe de la varicelle disparaît après la maladie
   - Les enfants deviennent résistants à tout en grandissant
   - La première maladie détruit tous les microbes du corps
2. Des anticorps contre la grippe protègent-ils contre la varicelle ? *(évalue : compréhension)*
   - Oui, mais seulement pendant l'hiver qui suit
   - ✔ Non : un anticorps reconnaît un microbe précis
   - Seulement chez l'adulte, dont l'immunité est complète
   - Oui, un anticorps protège contre tous les virus
3. Après une coupure, la peau autour devient rouge et chaude pendant un jour. Que se passe-t-il le plus probablement ? *(évalue : application)*
   - ✔ Le corps combat des microbes entrés par la plaie
   - C'est une allergie au métal de l'objet qui a coupé
   - Le sang s'est infecté et la maladie se répand dans le corps
   - La peau brûle les cellules mortes pour refermer la plaie

**Situation de transfert :** Une personne dont les défenses sont affaiblies par un traitement attrape facilement des infections banales.

> Explique pourquoi, avec ce que tu sais du système immunitaire.

*Réponse attendue :* Son système immunitaire réagit moins ou moins vite : les microbes ne sont plus repérés et éliminés à temps.

**Déblocage** *(seulement si la compréhension immédiate donne moins de 2 sur 3, ou si la personne se dit bloquée ; posé après le transfert et la seconde explication ; notation : `grille-reformulation.md`, partie 2)*

1. Un voyageur est infecté par un microbe qu'il n'a jamais rencontré et contre lequel il n'est pas vacciné. À quoi faut-il s'attendre ? *(évalue : application)*
   - Ses anticorps contre d'autres microbes le protégeront
   - ✔ Sa défense mettra plus de temps à se mettre en place
   - Sa défense sera aussi rapide que pour un microbe connu
   - Son corps ne pourra pas du tout se défendre seul
   - *Justification juste si elle contient :* Le corps n'a aucune mémoire de ce microbe : il doit d'abord apprendre à le reconnaître avant de produire les bonnes défenses.
   - *Exemple juste (2 points avec le bon choix) :* « Son corps ne le connaît pas, il doit d'abord apprendre à le reconnaître, donc c'est plus lent. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Parce qu'il est nouveau. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Parce que les microbes étrangers sont toujours plus forts. »
2. Pourquoi le système immunitaire n'attaque-t-il pas, en temps normal, nos propres cellules ? *(évalue : compréhension)*
   - Nos cellules produisent un poison qui le repousse
   - ✔ Il distingue ce qui vient du corps de ce qui vient d'ailleurs
   - Nos cellules sont trop petites pour que les globules blancs les voient
   - Il ne fonctionne que lorsqu'on a de la fièvre
   - *Justification juste si elle contient :* Le système immunitaire reconnaît nos propres cellules et ne s'attaque qu'à ce qui est étranger.
   - *Exemple juste (2 points avec le bon choix) :* « Il sait reconnaître ce qui est à nous et ce qui vient de l'extérieur. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Parce que ce serait dangereux. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Parce qu'il ne voit que les gros microbes. »

**Rappel à J+2**

1. Les globules blancs servent à… *(évalue : restitution (mémorisation))*
   - digérer les graisses
   - transporter l'oxygène dans le sang
   - faire coaguler le sang après une coupure
   - ✔ combattre les microbes
2. La mémoire immunitaire permet… *(évalue : restitution (mémorisation))*
   - de reconnaître tous les microbes avant de les rencontrer
   - de produire des anticorps contre toutes les maladies
   - de garder les microbes dans le corps pour s'entraîner
   - ✔ de réagir plus vite à un microbe déjà rencontré
3. Un anticorps est efficace contre… *(évalue : restitution (mémorisation))*
   - les microbes déjà détruits seulement
   - ✔ un microbe précis
   - tous les microbes à la fois
   - les virus, mais jamais les bactéries
4. Deux enfants attrapent le même virus ; l'un l'a déjà eu l'an dernier. Lequel guérira probablement le plus vite ? *(évalue : application)*
   - Aucun des deux ne pourra guérir seul
   - Les deux pareil, car c'est le même virus
   - ✔ Celui qui l'a déjà eu
   - Celui qui ne l'a jamais eu, car il est plus résistant

**Reformulation, idée centrale :** Le système immunitaire repère et détruit les microbes, et garde en mémoire ceux qu'il a déjà rencontrés pour réagir plus vite.

**Éléments clés :** défense contre les microbes ; mémoire d'une rencontre passée

## S09 · L'ADN

*Domaine : sciences de la vie*

**Glossaire (termes à surveiller) :** ADN, gène, cellule, chromosome, hérédité, noyau

**Compréhension immédiate**

1. Pourquoi un enfant ressemble-t-il à ses deux parents à la fois ? *(évalue : compréhension)*
   - Il imite leurs expressions en grandissant
   - Il reçoit tout l'ADN de son père, et les traits de sa mère
   - Il mange la même chose qu'eux depuis sa naissance
   - ✔ Il reçoit une partie de l'ADN de chacun
2. On peut trouver l'ADN d'une personne dans un cheveu ou une goutte de salive. Pourquoi ? *(évalue : compréhension)*
   - L'ADN se dépose sur le corps à partir de l'air respiré
   - L'ADN est fabriqué uniquement par la bouche et par les cheveux
   - Ce n'est pas possible : l'ADN n'est que dans le sang
   - ✔ Ils contiennent des cellules, qui portent presque toutes l'ADN
3. Pourquoi des vrais jumeaux ont-ils le même ADN, mais pas des frères et sœurs ordinaires ? *(évalue : compréhension)*
   - Ils ont grandi ensemble et mangé les mêmes repas
   - Ils sont nés le même jour, des mêmes parents
   - Les frères et sœurs ont tous le même ADN aussi
   - ✔ Ils viennent d'un seul œuf qui s'est séparé en deux

**Situation de transfert :** Sur une scène de vol, les enquêteurs retrouvent un cheveu et le comparent à l'ADN de suspects.

> Pourquoi cette comparaison peut-elle désigner une personne ?

*Réponse attendue :* L'ADN est présent dans les cellules du cheveu et il est propre à chaque personne (sauf vrais jumeaux).

**Déblocage** *(seulement si la compréhension immédiate donne moins de 2 sur 3, ou si la personne se dit bloquée ; posé après le transfert et la seconde explication ; notation : `grille-reformulation.md`, partie 2)*

1. Une cellule de peau et une cellule du foie d'une même personne ont-elles le même ADN ? *(évalue : application)*
   - Non, chaque organe possède son propre ADN
   - Non, l'ADN change selon le rôle de la cellule
   - Seulement si la personne est encore jeune
   - ✔ Oui, presque toutes ses cellules ont le même ADN
   - *Justification juste si elle contient :* Toutes les cellules d'une personne viennent de la même cellule de départ et portent le même ADN ; elles n'en utilisent pas les mêmes parties.
   - *Exemple juste (2 points avec le bon choix) :* « Oui, toutes nos cellules ont le même ADN, elles viennent toutes du même œuf. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Oui, c'est la même personne. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Oui, parce que la peau et le foie font le même travail. »
2. Pourquoi deux frères et sœurs, qui ne sont pas jumeaux, ne se ressemblent-ils pas exactement ? *(évalue : compréhension)*
   - ✔ Chacun reçoit une combinaison différente de l'ADN des parents
   - L'ADN des parents change un peu chaque année
   - Ils ont exactement le même ADN, mais ne grandissent pas au même endroit
   - Ils ne mangent pas la même chose en grandissant
   - *Justification juste si elle contient :* Chaque enfant reçoit la moitié de l'ADN de chaque parent, mais pas la même moitié : la combinaison est différente pour chacun.
   - *Exemple juste (2 points avec le bon choix) :* « Chacun reçoit un mélange différent des gènes du père et de la mère. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Parce que chacun est unique. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Parce que l'aîné reçoit plus d'ADN du père. »

**Rappel à J+2**

1. L'ADN contient… *(évalue : restitution (mémorisation))*
   - les microbes qui protègent la cellule
   - ✔ les informations qui guident la cellule
   - l'énergie dont la cellule a besoin
   - les réserves de sucre et de graisse de la cellule
2. On reçoit son ADN… *(évalue : restitution (mémorisation))*
   - uniquement de sa mère
   - de l'air qu'on respire
   - ✔ de ses deux parents
   - de ce qu'on mange enfant
3. Un gène est… *(évalue : restitution (mémorisation))*
   - une cellule spéciale du sang
   - une maladie que les parents transmettent à leurs enfants
   - ✔ un morceau d'ADN qui porte une information
   - une protéine qui détruit les microbes
4. Deux suspects ont laissé des traces ; un seul ADN correspond au cheveu trouvé. Que peut-on conclure ? *(évalue : application)*
   - Les deux suspects sont forcément coupables
   - Le cheveu ne permet de rien conclure du tout
   - Le cheveu vient forcément d'un vrai jumeau
   - ✔ Le cheveu vient probablement de ce suspect

**Reformulation, idée centrale :** L'ADN, présent dans nos cellules, porte les informations héritées de nos parents qui guident le fonctionnement du corps.

**Éléments clés :** dans les cellules ; transmis par les parents

## S10 · Le vaccin

*Domaine : santé*

**Glossaire (termes à surveiller) :** vaccin, immunité, microbe, anticorps, rappel, système immunitaire

**Compréhension immédiate**

1. Comment un vaccin aide-t-il le corps à se protéger ? *(évalue : compréhension)*
   - Il tue d'avance tous les microbes présents dans le corps
   - ✔ Il fait connaître au corps, sans danger, un élément du microbe
   - Il soigne une maladie déjà installée en détruisant le microbe
   - Il dépose dans le sang des anticorps qui restent pour toujours
2. Pourquoi, pour certaines maladies, faut-il un rappel quelques années plus tard ? *(évalue : compréhension)*
   - Le rappel soigne les effets secondaires de la première dose
   - Le microbe a forcément changé depuis, et la première dose ne sert plus à rien
   - ✔ La protection peut baisser avec le temps ; le rappel la relance
   - Le premier vaccin n'a pas fonctionné et doit être recommencé
3. Dans une ville, beaucoup de gens sont vaccinés contre une maladie contagieuse. Pourquoi un bébé trop jeune pour être vacciné y est-il moins exposé ? *(évalue : compréhension)*
   - ✔ La maladie circule moins, donc il risque moins de la croiser
   - Il n'est pas moins exposé : seuls les vaccinés sont protégés
   - Le vaccin des autres se transmet à lui par l'air qu'il respire chaque jour
   - Les bébés ne peuvent pas attraper les maladies contagieuses

**Situation de transfert :** Une personne vaccinée contre une maladie l'attrape quand même, mais de façon légère.

> Est-ce que cela veut dire que le vaccin n'a servi à rien ? Explique.

*Réponse attendue :* Non : aucun vaccin ne protège à 100 %, mais le corps, déjà entraîné, réagit plus vite, ce qui rend souvent la maladie moins grave.

**Déblocage** *(seulement si la compréhension immédiate donne moins de 2 sur 3, ou si la personne se dit bloquée ; posé après le transfert et la seconde explication ; notation : `grille-reformulation.md`, partie 2)*

1. Une épidémie de grippe est annoncée pour dans un mois. Quand vaut-il mieux se faire vacciner ? *(évalue : application)*
   - Au pic de l'épidémie, quand le risque est le plus fort
   - Après l'épidémie, pour être prêt l'année suivante
   - ✔ Dès maintenant, avant l'arrivée de l'épidémie
   - Au premier symptôme, pour soigner la grippe plus vite
   - *Justification juste si elle contient :* Le corps a besoin de temps pour apprendre à reconnaître le microbe ; le vaccin prépare, il ne soigne pas une maladie déjà là.
   - *Exemple juste (2 points avec le bon choix) :* « Maintenant, parce que le corps met du temps à apprendre à se défendre. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Maintenant, c'est mieux avant. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Maintenant, parce que le vaccin tue le virus dès qu'il arrive. »
2. Pourquoi une personne vaccinée réagit-elle plus vite si elle rencontre le vrai microbe ? *(évalue : compréhension)*
   - Le vaccin reste dans le sang et agit comme un médicament
   - ✔ Son système immunitaire le reconnaît déjà grâce au vaccin
   - Elle ne réagit pas plus vite, elle est juste plus résistante
   - Le microbe devient plus faible chez une personne vaccinée
   - *Justification juste si elle contient :* Le vaccin a laissé une mémoire : le corps reconnaît le microbe et produit ses défenses beaucoup plus vite.
   - *Exemple juste (2 points avec le bon choix) :* « Son corps a déjà vu le microbe grâce au vaccin, il le reconnaît et se défend vite. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Parce qu'elle est vaccinée. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Parce que le vaccin reste dans le sang et tue le microbe. »

**Rappel à J+2**

1. Un vaccin entraîne surtout… *(évalue : restitution (mémorisation))*
   - la mémoire du cerveau
   - les muscles du bras piqué
   - la digestion des aliments
   - ✔ le système immunitaire
2. Un rappel sert à… *(évalue : restitution (mémorisation))*
   - changer de groupe sanguin
   - ✔ entretenir la protection
   - guérir une maladie déjà là
   - remplacer le premier vaccin raté
3. Un vaccin agit surtout… *(évalue : restitution (mémorisation))*
   - ✔ avant que la maladie survienne
   - seulement après la guérison
   - une fois que la maladie est déjà installée
   - uniquement sur les bactéries
4. Un adulte n'a pas fait le rappel conseillé depuis longtemps. Quel est le risque le plus probable ? *(évalue : application)*
   - ✔ Sa protection a pu baisser
   - Son ancien vaccin peut le rendre malade
   - Il est sûrement malade en ce moment
   - Il reste protégé à vie, quoi qu'il arrive

**Reformulation, idée centrale :** Un vaccin fait rencontrer au corps, sans danger, un élément du microbe (ou de quoi le fabriquer), pour qu'il apprenne à le reconnaître et se défende plus vite plus tard.

**Éléments clés :** apprendre sans faire la maladie ; protection qui peut diminuer et demander des rappels

## S11 · Le cycle de l'eau

*Domaine : sciences de la Terre*

**Glossaire (termes à surveiller) :** évaporation, condensation, précipitations, vapeur d'eau, nuage, ruissellement, nappe souterraine

**Compréhension immédiate**

1. Pourquoi se forme-t-il des gouttes sur un verre d'eau très froide en été ? *(évalue : compréhension)*
   - Le soleil fait fondre une fine couche de glace
   - L'eau froide traverse lentement la paroi du verre
   - ✔ La vapeur d'eau de l'air se condense au contact du froid
   - Le froid fabrique de l'eau à la surface du verre
2. Tu veux que ton linge mouillé sèche le plus vite possible. Où l'étendre ? *(évalue : application)*
   - Dans une salle de bain fermée et humide
   - Dans un placard sombre, à l'abri de l'air
   - ✔ Dehors, au soleil et au vent
   - Au sous-sol, là où il fait le plus frais
3. L'eau d'une flaque disparaît sans couler nulle part. Où est-elle partie ? *(évalue : compréhension)*
   - Elle s'est transformée en nuage directement sur place
   - Elle a été absorbée entièrement par le goudron
   - Elle a été détruite par la chaleur du soleil
   - ✔ Elle s'est évaporée dans l'air sous forme de vapeur

**Situation de transfert :** Le matin, la vitre de la salle de bain est couverte de buée après une douche chaude.

> Quelles étapes du cycle de l'eau retrouves-tu ici ?

*Réponse attendue :* L'eau chaude s'évapore (vapeur), puis la vapeur se condense en gouttelettes sur la vitre froide.

**Déblocage** *(seulement si la compréhension immédiate donne moins de 2 sur 3, ou si la personne se dit bloquée ; posé après le transfert et la seconde explication ; notation : `grille-reformulation.md`, partie 2)*

1. Une casserole d'eau bouillante a un couvercle ; des gouttes coulent sous le couvercle. Que s'est-il passé ? *(évalue : application)*
   - La vapeur a traversé le métal du couvercle et coulé
   - La chaleur fabrique de l'eau à partir de l'air
   - ✔ L'eau s'est évaporée puis condensée sur le couvercle
   - Le couvercle laisse passer l'eau par de petits trous
   - *Justification juste si elle contient :* L'eau chauffée devient vapeur ; la vapeur touche le couvercle plus froid et redevient liquide (condensation).
   - *Exemple juste (2 points avec le bon choix) :* « L'eau s'évapore, la vapeur monte, refroidit sur le couvercle et redevient de l'eau. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « C'est la vapeur. »
   - *Exemple faux (0 point, même avec le bon choix) :* « L'eau saute en gouttes jusqu'au couvercle quand elle bout. »
2. Pourquoi la quantité d'eau sur Terre reste-t-elle à peu près la même malgré la pluie et l'évaporation ? *(évalue : compréhension)*
   - Les océans produisent de l'eau en continu au fond des mers
   - ✔ L'eau change d'état et de place, mais n'est pas détruite
   - Il pleut chaque jour exactement autant qu'il s'évapore
   - Les nuages fabriquent de l'eau nouvelle à partir de l'air
   - *Justification juste si elle contient :* L'eau ne disparaît pas : elle passe d'un état (liquide, vapeur, glace) et d'un endroit à l'autre, en cycle.
   - *Exemple juste (2 points avec le bon choix) :* « L'eau qui s'évapore revient en pluie, elle ne fait que changer de forme et de place. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Parce que c'est un cycle. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Parce que les nuages créent de l'eau. »

**Rappel à J+2**

1. Le passage de l'eau liquide à la vapeur s'appelle… *(évalue : restitution (mémorisation))*
   - précipitation
   - ✔ évaporation
   - solidification
   - condensation
2. Les nuages sont faits de… *(évalue : restitution (mémorisation))*
   - ✔ fines gouttelettes ou cristaux d'eau
   - vapeur d'eau invisible, sans aucune goutte
   - gaz carbonique refroidi
   - fumée et poussières
3. Pluie, neige et grêle sont des… *(évalue : restitution (mémorisation))*
   - ✔ précipitations
   - ruissellements
   - condensations
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
   - Le Soleil enverrait beaucoup moins de lumière vers la Terre
   - Elle ne serait pas plus froide, seulement plus sèche
   - Les océans gèleraient d'abord et refroidiraient l'air
   - ✔ La chaleur du sol repartirait presque toute vers l'espace
2. Pourquoi l'ajout de gaz à effet de serre réchauffe-t-il le climat ? *(évalue : compréhension)*
   - ✔ Ils retiennent davantage la chaleur émise par la Terre
   - Ils détruisent la couche d'ozone
   - Ils laissent entrer plus de lumière venue du Soleil
   - Ils produisent eux-mêmes de la chaleur en brûlant
3. Une ville remplace ses bus au gazole par des bus électriques alimentés par une électricité peu carbonée. Quel effet sur l'effet de serre ? *(évalue : application)*
   - ✔ Moins de dioxyde de carbone émis, effet de serre moins renforcé
   - Aucun effet : un bus reste un bus
   - Plus d'effet de serre, car l'électricité réchauffe l'air de la ville
   - L'effet de serre disparaît totalement dans cette ville

**Situation de transfert :** Une voiture garée au soleil, vitres fermées, devient très chaude à l'intérieur.

> En quoi cela ressemble-t-il à l'effet de serre, et quelle est la limite de la comparaison ?

*Réponse attendue :* La chaleur entre et reste en partie piégée ; mais dans la voiture c'est surtout l'air enfermé, alors que pour la Terre ce sont des gaz qui retiennent le rayonnement de chaleur.

**Déblocage** *(seulement si la compréhension immédiate donne moins de 2 sur 3, ou si la personne se dit bloquée ; posé après le transfert et la seconde explication ; notation : `grille-reformulation.md`, partie 2)*

1. Une nuit nuageuse est souvent moins froide qu'une nuit sans nuages. Avec quelle idée de l'effet de serre cela s'accorde-t-il ? *(évalue : application)*
   - ✔ Les nuages retiennent une partie de la chaleur du sol
   - Les nuages produisent de la chaleur en se formant
   - Aucune : les nuages n'ont rien à voir avec la chaleur
   - Les nuages renvoient la lumière de la Lune vers le sol
   - *Justification juste si elle contient :* Comme les gaz à effet de serre, les nuages empêchent une partie de la chaleur émise par le sol de repartir vers l'espace.
   - *Exemple juste (2 points avec le bon choix) :* « Les nuages font comme une couverture qui garde la chaleur du sol, comme les gaz à effet de serre. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Les nuages protègent. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Les nuages chauffent parce qu'ils sont plus près du Soleil. »
2. Pourquoi parle-t-on d'effet de serre « renforcé » plutôt que d'effet de serre tout court pour le changement climatique ? *(évalue : compréhension)*
   - C'est la même chose, le mot « renforcé » ne change rien
   - ✔ L'effet existe naturellement ; l'activité humaine l'augmente
   - Les serres agricoles réchauffent l'atmosphère
   - L'effet de serre n'existait pas avant la naissance de l'industrie
   - *Justification juste si elle contient :* Un effet de serre naturel existe et rend la Terre habitable ; le problème vient de son augmentation par les gaz ajoutés par les activités humaines.
   - *Exemple juste (2 points avec le bon choix) :* « Il y en a déjà un naturel, utile ; l'homme ajoute des gaz qui le rendent plus fort. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Parce que c'est plus fort. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Parce que l'effet de serre est entièrement créé par l'homme. »

**Rappel à J+2**

1. L'effet de serre naturel est… *(évalue : restitution (mémorisation))*
   - provoqué uniquement par les activités humaines
   - toujours néfaste pour le climat
   - dû à la chaleur de la Lune
   - ✔ indispensable à la vie sur Terre
2. Un gaz à effet de serre important émis par les activités humaines est… *(évalue : restitution (mémorisation))*
   - l'azote de l'air
   - l'oxygène que l'on respire
   - l'hélium des ballons
   - ✔ le dioxyde de carbone
3. Renforcer l'effet de serre conduit à… *(évalue : restitution (mémorisation))*
   - plus de lumière sur Terre
   - un refroidissement du climat
   - aucun changement mesurable
   - ✔ un réchauffement du climat
4. Une personne fait chaque jour 20 km en voiture à essence pour aller travailler. Quel changement réduit le plus ses émissions de gaz à effet de serre ? *(évalue : application)*
   - ✔ Prendre le train ou le bus
   - Rouler toujours vitres ouvertes
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
   - Elle est trop lourde pour flotter dans l'air
   - ✔ La Terre l'attire vers elle
   - Le vent la pousse toujours vers le sol
2. Sur la Lune, un astronaute pèse moins que sur Terre. Pourquoi ? *(évalue : compréhension)*
   - Il a perdu de la masse pendant le voyage
   - ✔ La Lune, moins massive, l'attire moins fort
   - Sa combinaison spatiale le rend plus léger
   - Il n'y a pas d'air sur la Lune pour l'écraser vers le sol
3. Une balance indique 60 kg sur Terre. Sur la Lune, la même personne aurait-elle moins de matière ? *(évalue : application)*
   - Oui, elle perdrait une partie de sa matière
   - Oui, elle aurait seulement 10 kg de matière
   - Non, elle aurait plus de matière qu'avant
   - ✔ Non : même masse, mais poids plus faible

**Situation de transfert :** Un satellite tourne autour de la Terre sans moteur allumé.

> Pourquoi ne s'éloigne-t-il pas dans l'espace et ne tombe-t-il pas tout droit ?

*Réponse attendue :* La Terre l'attire en permanence, mais il va assez vite sur le côté : il « tombe » autour de la Terre en restant en orbite.

**Déblocage** *(seulement si la compréhension immédiate donne moins de 2 sur 3, ou si la personne se dit bloquée ; posé après le transfert et la seconde explication ; notation : `grille-reformulation.md`, partie 2)*

1. Sur une planète deux fois plus massive que la Terre, mais de même taille, un sac de 10 kg serait… *(évalue : application)*
   - de 20 kg de matière
   - exactement aussi lourd
   - moins lourd à porter
   - ✔ plus lourd à porter
   - *Justification juste si elle contient :* À taille égale, une planète plus massive attire plus fort : le poids augmente, mais la masse (10 kg) ne change pas.
   - *Exemple juste (2 points avec le bon choix) :* « La planète a plus de masse, donc elle attire plus fort et le sac pèse plus, même s'il fait toujours 10 kg. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Plus lourd, parce que c'est une autre planète. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Plus lourd, parce que le sac contient plus de matière là-bas. »
2. Pourquoi un satellite trop lent finit-il par retomber sur Terre ? *(évalue : compréhension)*
   - Il devient plus lourd en perdant de la vitesse
   - Il ne retombe jamais, puisque la gravité n'existe pas dans l'espace
   - La Terre le repousse quand il ralentit trop
   - ✔ Sa vitesse ne compense plus l'attraction de la Terre
   - *Justification juste si elle contient :* La Terre l'attire en permanence ; c'est sa vitesse sur le côté qui le fait « tomber autour » de la Terre. Trop lent, il tombe vers elle.
   - *Exemple juste (2 points avec le bon choix) :* « Il ne va plus assez vite pour tourner autour, donc l'attraction de la Terre le fait tomber. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Parce qu'il ralentit. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Parce qu'en ralentissant il devient plus lourd. »

**Rappel à J+2**

1. Deux objets ayant une masse… *(évalue : restitution (mémorisation))*
   - ✔ s'attirent
   - se repoussent
   - s'ignorent
   - s'annulent
2. Le poids d'un objet dépend… *(évalue : restitution (mémorisation))*
   - de sa forme seulement
   - de la température de l'air
   - ✔ de l'astre où il se trouve
   - de sa couleur
3. Une orbite, c'est… *(évalue : restitution (mémorisation))*
   - un nuage de poussière dans l'espace
   - la surface visible d'une planète
   - ✔ le trajet d'un objet autour d'un astre
   - une étoile qui tourne très vite sur elle-même
4. Mars est moins massive que la Terre. Un sac de 10 kg y serait… *(évalue : application)*
   - plus lourd à porter, car l'air de Mars est plus épais
   - impossible à soulever
   - ✔ moins lourd à porter, avec la même masse
   - de 5 kg de matière seulement

**Reformulation, idée centrale :** Tout objet ayant une masse attire les autres ; c'est ce qui nous fait tomber vers la Terre et ce qui garde la Lune en orbite.

**Éléments clés :** attraction entre masses ; explique la chute et les orbites

## S14 · Tension et intensité électriques

*Domaine : physique*

**Glossaire (termes à surveiller) :** tension, volt, intensité, ampère, circuit, courant électrique, générateur

**Compréhension immédiate**

1. On compare souvent un circuit à de l'eau dans des tuyaux. Dans cette image, à quoi correspond la tension ? *(évalue : compréhension)*
   - À la longueur totale du tuyau
   - ✔ À la différence de pression qui fait circuler l'eau
   - À la quantité d'eau qui passe chaque seconde
   - Au diamètre du tuyau, selon qu'il est large ou très étroit
2. Pourquoi une lampe ne s'allume-t-elle pas si le circuit est ouvert ? *(évalue : compréhension)*
   - La lampe n'est plus assez près de la pile
   - La pile se vide dès qu'on ouvre le circuit
   - La tension devient trop forte pour la lampe
   - ✔ Le courant ne peut plus circuler
3. Une lampe prévue pour 6 V est branchée sur une pile de 1,5 V. Que se passe-t-il le plus probablement ? *(évalue : application)*
   - Elle grille immédiatement
   - Elle brille plus fort que prévu
   - ✔ Elle brille faiblement, ou pas du tout
   - Elle brille normalement, comme sur une pile de 6 V

**Situation de transfert :** Une pile de 1,5 V fait briller faiblement une petite lampe prévue pour 4,5 V.

> Pourquoi la lampe brille-t-elle peu, et que faudrait-il changer ?

*Réponse attendue :* La tension est trop faible pour la faire fonctionner normalement ; il faut une tension proche de 4,5 V (par exemple trois piles de 1,5 V en série).

**Déblocage** *(seulement si la compréhension immédiate donne moins de 2 sur 3, ou si la personne se dit bloquée ; posé après le transfert et la seconde explication ; notation : `grille-reformulation.md`, partie 2)*

1. Pour obtenir 4,5 V avec des piles de 1,5 V, combien faut-il en mettre à la suite (en série) ? *(évalue : application)*
   - 2
   - ✔ 3
   - 1
   - 4
   - *Justification juste si elle contient :* En série, les tensions s'additionnent : 1,5 + 1,5 + 1,5 = 4,5 V.
   - *Exemple juste (2 points avec le bon choix) :* « Trois fois 1,5 ça fait 4,5, et en série les volts s'ajoutent. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « 3, j'ai compté. »
   - *Exemple faux (0 point, même avec le bon choix) :* « 3, parce qu'il faut une pile pour chaque volt et demi de la lampe et que les piles se partagent le courant. »
2. Quelle est la limite de l'image de l'eau dans les tuyaux pour l'électricité ? *(évalue : compréhension)*
   - ✔ Un fil coupé ne « fuit » pas : le courant s'arrête net
   - Il n'y en a aucune : le courant est vraiment de l'eau
   - Le courant électrique va beaucoup moins vite que l'eau
   - Les fils électriques contiennent un liquide comme les tuyaux
   - *Justification juste si elle contient :* Dans un tuyau coupé, l'eau s'échappe ; dans un fil coupé, rien ne sort : le circuit est ouvert et le courant s'arrête. L'image aide, mais n'est pas la réalité.
   - *Exemple juste (2 points avec le bon choix) :* « Quand on coupe un tuyau l'eau coule partout, mais un fil coupé ne laisse rien sortir, le courant s'arrête. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Parce que l'électricité, ce n'est pas de l'eau. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Parce que l'électricité va plus lentement que l'eau. »

**Rappel à J+2**

1. La tension se mesure en… *(évalue : restitution (mémorisation))*
   - watts
   - ✔ volts
   - ampères
   - ohms
2. L'intensité se mesure en… *(évalue : restitution (mémorisation))*
   - watts
   - ✔ ampères
   - kilowattheures
   - volts
3. Pour qu'un courant circule, le circuit doit être… *(évalue : restitution (mémorisation))*
   - ouvert
   - ✔ fermé
   - coupé
   - mouillé
4. Un interrupteur est ouvert dans un circuit avec une pile et une lampe. Quelle est l'intensité du courant dans la lampe ? *(évalue : application)*
   - La même que lorsque le circuit est fermé
   - Maximale, car rien ne freine le courant
   - Faible, mais pas tout à fait nulle
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
   - Ton salaire baisse avec les prix
   - Les magasins vendent moins de produits
   - Les banques retirent un peu de ton argent
3. Ton salaire augmente de 2 % et les prix de 5 % la même année. Ton pouvoir d'achat… *(évalue : application)*
   - monte
   - double
   - ne change pas
   - ✔ baisse

**Situation de transfert :** Ta grand-mère raconte qu'une baguette coûtait beaucoup moins cher dans sa jeunesse.

> Est-ce que cela veut forcément dire que le pain était plus « accessible » à l'époque ? Explique.

*Réponse attendue :* Pas forcément : il faut comparer au salaire de l'époque ; l'inflation fait monter les prix mais aussi, souvent, les salaires.

**Déblocage** *(seulement si la compréhension immédiate donne moins de 2 sur 3, ou si la personne se dit bloquée ; posé après le transfert et la seconde explication ; notation : `grille-reformulation.md`, partie 2)*

1. Tu gardes 1 000 € dans un tiroir pendant un an avec 5 % d'inflation. Que peux-tu acheter avec à la fin ? *(évalue : application)*
   - Rien : l'argent a perdu toute sa valeur
   - ✔ Un peu moins qu'au début
   - Exactement la même chose qu'au début
   - Un peu plus qu'au début, grâce à la hausse
   - *Justification juste si elle contient :* La somme reste de 1 000 €, mais les prix ont monté d'environ 5 % : les mêmes 1 000 € achètent moins.
   - *Exemple juste (2 points avec le bon choix) :* « Les prix ont augmenté de 5 % alors que j'ai toujours 1 000 €, donc j'achète un peu moins. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Moins, à cause de l'inflation. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Moins, parce que les billets perdent 5 % de leur montant dans le tiroir. »
2. Pourquoi une hausse des salaires égale à l'inflation garde-t-elle le pouvoir d'achat à peu près stable ? *(évalue : compréhension)*
   - Il ne reste pas stable : il baisse toujours
   - Les prix finissent par redescendre
   - L'inflation disparaît quand les salaires montent
   - ✔ Revenus et prix montent au même rythme
   - *Justification juste si elle contient :* Le pouvoir d'achat dépend du rapport entre revenu et prix ; si les deux montent du même pourcentage, ce rapport ne change pas.
   - *Exemple juste (2 points avec le bon choix) :* « Si je gagne 5 % de plus et que tout coûte 5 % de plus, j'achète pareil. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Parce que ça s'équilibre. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Parce que les prix baissent ensuite. »

**Rappel à J+2**

1. L'inflation désigne… *(évalue : restitution (mémorisation))*
   - une baisse générale des salaires
   - ✔ une hausse générale et durable des prix
   - un impôt prélevé sur les achats
   - la forte hausse du prix d'un seul produit, comme l'essence
2. Le pouvoir d'achat, c'est… *(évalue : restitution (mémorisation))*
   - la somme d'argent sur un compte
   - le prix moyen d'un panier de courses
   - ✔ ce qu'on peut acheter avec son revenu
   - le taux d'intérêt fixé chaque année par la banque centrale
3. L'inflation concerne… *(évalue : restitution (mémorisation))*
   - ✔ l'ensemble des prix
   - les prix d'un seul magasin
   - uniquement les salaires
   - uniquement les loyers
4. Seul le prix des fraises double en hiver ; les autres prix ne bougent pas. Est-ce de l'inflation ? *(évalue : application)*
   - On ne peut jamais le savoir sans les salaires
   - ✔ Non : la hausse ne touche qu'un produit
   - Oui, toute hausse de prix est de l'inflation
   - Oui, si la hausse dure plus d'un mois

**Reformulation, idée centrale :** L'inflation est la hausse générale des prix : avec la même somme, on achète moins, sauf si les revenus suivent.

**Éléments clés :** hausse générale des prix ; effet sur le pouvoir d'achat

## S16 · L'offre et la demande

*Domaine : économie*

**Glossaire (termes à surveiller) :** offre, demande, prix d'équilibre, pénurie, surplus, marché

**Compréhension immédiate**

1. Après une très bonne récolte de tomates, que devient en général leur prix ? *(évalue : application)*
   - Il a tendance à monter
   - ✔ Il a tendance à baisser
   - Il double, car il y a plus de travail
   - Il reste fixé par la loi
2. Pourquoi un produit rare et très demandé devient-il souvent plus cher ? *(évalue : compréhension)*
   - ✔ Beaucoup d'acheteurs se disputent peu d'exemplaires
   - Les vendeurs sont moins nombreux à vouloir le vendre
   - Ce n'est pas le cas : la rareté fait baisser le prix
   - L'État impose un prix plus élevé aux produits rares
3. Au « prix d'équilibre », pourquoi n'y a-t-il ni pénurie ni invendus ? *(évalue : compréhension)*
   - C'est le prix où plus personne ne veut acheter
   - ✔ Les vendeurs proposent autant que les acheteurs veulent
   - C'est le prix que l'État fixe pour tous les marchés
   - C'est le prix où le vendeur gagne le plus d'argent possible

**Situation de transfert :** Les billets d'un concert très attendu sont revendus bien plus cher que leur prix initial.

> Explique ce phénomène avec l'offre et la demande.

*Réponse attendue :* Le nombre de places est limité (offre faible) et beaucoup veulent y aller (demande forte) : le prix de revente monte.

**Déblocage** *(seulement si la compréhension immédiate donne moins de 2 sur 3, ou si la personne se dit bloquée ; posé après le transfert et la seconde explication ; notation : `grille-reformulation.md`, partie 2)*

1. Un nouveau téléphone est vendu trop cher : il en reste des milliers en stock. Que fait souvent le vendeur ? *(évalue : application)*
   - Il ne change rien et attend la demande
   - Il arrête de vendre et détruit le stock
   - Il augmente le prix pour gagner plus par vente
   - ✔ Il baisse son prix pour écouler le stock
   - *Justification juste si elle contient :* À ce prix, l'offre dépasse la demande ; baisser le prix attire plus d'acheteurs.
   - *Exemple juste (2 points avec le bon choix) :* « Trop de téléphones et pas assez d'acheteurs, donc il baisse le prix pour en vendre plus. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Pour vendre. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Parce que les vieux téléphones coûtent moins cher à fabriquer. »
2. Pourquoi le prix des billets d'avion monte-t-il souvent pendant les vacances scolaires ? *(évalue : compréhension)*
   - Le prix ne monte pas, c'est une impression
   - Les compagnies paient leurs employés deux fois plus en vacances
   - Les avions consomment plus de carburant en été
   - ✔ Beaucoup plus de gens veulent voyager aux mêmes dates
   - *Justification juste si elle contient :* La demande augmente fortement aux mêmes dates alors que le nombre de places est limité : le prix monte.
   - *Exemple juste (2 points avec le bon choix) :* « Tout le monde part en même temps et les places sont limitées, donc c'est plus cher. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Parce que c'est les vacances. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Parce que le carburant coûte plus cher l'été. »

**Rappel à J+2**

1. Une pénurie, c'est quand… *(évalue : restitution (mémorisation))*
   - ✔ la demande dépasse l'offre
   - l'offre dépasse la demande
   - personne ne veut plus acheter
   - le prix baisse fortement
2. Si l'offre augmente et la demande ne change pas, le prix… *(évalue : restitution (mémorisation))*
   - ne peut pas changer du tout
   - a tendance à monter
   - double rapidement
   - ✔ a tendance à baisser
3. La demande représente… *(évalue : restitution (mémorisation))*
   - ce que les vendeurs proposent
   - le nombre de magasins ouverts
   - ✔ ce que les acheteurs veulent acheter
   - le prix que fixent ensemble les magasins du quartier
4. En été, beaucoup de gens veulent des ventilateurs et les magasins en manquent. Que va-t-il probablement se passer pour leur prix ? *(évalue : application)*
   - Il va baisser
   - Il ne bougera pas, c'est un prix fixé
   - Il deviendra presque gratuit
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
   - L'usine la paie entièrement à sa place
   - Personne ne la paie vraiment, elle s'annule
   - ✔ Elle est dans le prix qu'il paie, et il ne peut pas la récupérer
   - Le magasin la rembourse au client chaque mois, sur son ticket de caisse
3. Un article est affiché 60 € TTC avec une TVA de 20 %. Quel est son prix hors taxe ? *(évalue : application)*
   - 40 €
   - 48 €
   - ✔ 50 €
   - 72 €

**Situation de transfert :** Une entreprise achète un ordinateur 1 200 € TTC (TVA 20 %) pour son activité.

> Quel est le prix hors taxe, et pourquoi l'entreprise s'intéresse-t-elle surtout à ce montant ?

*Réponse attendue :* 1 000 € HT ; l'entreprise peut en général récupérer la TVA payée, son coût réel est donc le prix hors taxe.

**Déblocage** *(seulement si la compréhension immédiate donne moins de 2 sur 3, ou si la personne se dit bloquée ; posé après le transfert et la seconde explication ; notation : `grille-reformulation.md`, partie 2)*

1. Un livre coûte 10 € HT avec une TVA de 5,5 %. Combien paie le client ? *(évalue : application)*
   - 12 €
   - ✔ 10,55 €
   - 10,05 €
   - 15,50 €
   - *Justification juste si elle contient :* 5,5 % de 10 € = 0,55 € ; le client paie le prix hors taxe plus la TVA : 10 + 0,55 = 10,55 €.
   - *Exemple juste (2 points avec le bon choix) :* « 5,5 % de 10, c'est 0,55, que j'ajoute aux 10 €. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « J'ai fait le calcul. »
   - *Exemple faux (0 point, même avec le bon choix) :* « On ajoute 0,55 € parce que la TVA des livres est toujours de 55 centimes. »
2. Pourquoi deux magasins qui affichent le même prix TTC payent-ils la même TVA sur cet article ? *(évalue : compréhension)*
   - ✔ Même taux, donc même part de taxe incluse
   - Ce n'est pas vrai : chaque magasin fixe sa TVA
   - Parce que les magasins ne paient jamais de TVA
   - Parce qu'ils sont situés dans la même ville
   - *Justification juste si elle contient :* La TVA est un pourcentage fixé par la loi selon le produit : à prix TTC égal et taux égal, la part de TVA incluse est la même.
   - *Exemple juste (2 points avec le bon choix) :* « Le taux est le même pour tout le monde, donc dans le même prix il y a la même TVA. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Parce que c'est la loi. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Parce que les deux magasins ont le même fournisseur. »

**Rappel à J+2**

1. TTC veut dire… *(évalue : restitution (mémorisation))*
   - ✔ toutes taxes comprises
   - total temporaire calculé
   - tarif toujours constant
   - taxe très chère
2. « Hors taxe » signifie… *(évalue : restitution (mémorisation))*
   - un prix soldé
   - un prix sans aucun bénéfice
   - le prix TVA ajoutée
   - ✔ le prix avant ajout de la TVA
3. La TVA est une taxe sur… *(évalue : restitution (mémorisation))*
   - les maisons uniquement
   - les bénéfices des entreprises
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
   - ✔ Le CDD a une fin prévue, adaptée à un besoin temporaire
   - Le CDD n'impose aucune règle à l'employeur
   - Le CDD permet de payer le salarié moins que le salaire minimum
   - Le CDI est interdit pour les besoins de moins d'un an
2. À quoi sert la période d'essai, pour le salarié comme pour l'employeur ? *(évalue : compréhension)*
   - Permettre à l'employeur seul de changer le salaire
   - Faire travailler le salarié sans le payer au début
   - ✔ Vérifier que le poste convient, avec une rupture plus simple
   - Former le salarié, sans contrat, avant de signer le vrai contrat de travail
3. Un salarié en CDI veut démissionner. Que doit-il en général respecter ? *(évalue : application)*
   - Il doit rembourser sa formation à l'employeur
   - Il doit obtenir l'accord écrit de son employeur et de l'inspection du travail
   - Rien : il peut toujours partir le jour même
   - ✔ Un préavis, selon la convention, l'usage ou le contrat

**Situation de transfert :** Une entreprise embauche une personne pour remplacer une salariée en congé maternité pendant six mois.

> Quel type de contrat est le plus adapté, et pourquoi ?

*Réponse attendue :* Un CDD (de remplacement) : le besoin est temporaire, avec une fin prévisible, le retour de la salariée.

**Déblocage** *(seulement si la compréhension immédiate donne moins de 2 sur 3, ou si la personne se dit bloquée ; posé après le transfert et la seconde explication ; notation : `grille-reformulation.md`, partie 2)*

1. Une boulangerie embauche quelqu'un pour un poste permanent, sans date de fin. Quel contrat est le plus adapté ? *(évalue : application)*
   - Un CDD renouvelé chaque mois
   - Aucun contrat écrit
   - ✔ Un CDI
   - Un contrat de prestation
   - *Justification juste si elle contient :* Le poste est permanent, sans fin prévue : c'est la situation du CDI ; le CDD est réservé aux besoins temporaires.
   - *Exemple juste (2 points avec le bon choix) :* « Le poste ne s'arrête pas, il n'y a pas de fin prévue : c'est un CDI. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Un CDI, c'est le plus normal. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Un CDI, parce que le CDD est réservé aux étudiants. »
2. Pourquoi un CDD doit-il préciser sa fin, par une date ou un événement ? *(évalue : compréhension)*
   - Pour que le salarié ne soit payé qu'à la fin
   - Ce n'est pas nécessaire pour un CDD
   - Pour qu'il puisse durer toute la vie du salarié
   - ✔ Il répond à un besoin temporaire, qui a un terme
   - *Justification juste si elle contient :* Le CDD n'est permis que pour un besoin temporaire ; sa fin (une date, ou un événement comme le retour d'une personne remplacée) doit donc être prévue.
   - *Exemple juste (2 points avec le bon choix) :* « C'est pour un besoin qui ne dure pas, donc on doit savoir quand ça s'arrête, par une date ou un événement. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Parce que c'est un CDD. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Pour savoir quand on paie le salarié. »

**Rappel à J+2**

1. CDI signifie… *(évalue : restitution (mémorisation))*
   - contrat d'insertion
   - contrat de droit international
   - contrat à durée imposée
   - ✔ contrat à durée indéterminée
2. Pendant la période d'essai, la rupture du contrat est… *(évalue : restitution (mémorisation))*
   - ✔ plus simple qu'après
   - interdite aux deux parties
   - automatique au bout d'un mois
   - payante pour le salarié
3. Un CDD prend fin… *(évalue : restitution (mémorisation))*
   - ✔ à la date ou à l'événement prévu
   - quand le salarié le décide seul
   - jamais, sauf démission
   - au bout de six mois, toujours
4. Un magasin embauche des vendeurs supplémentaires pour les fêtes de fin d'année. Quel contrat est le plus adapté ? *(évalue : application)*
   - Aucun contrat
   - ✔ Un CDD
   - Un CDI
   - Un contrat de vente

**Reformulation, idée centrale :** Le contrat de travail fixe la relation entre employeur et salarié ; le CDD a une fin prévue (date ou événement), le CDI non, et la période d'essai permet de vérifier que le poste convient.

**Éléments clés :** CDD temporaire avec une fin prévue, CDI sans fin prévue ; rôle de la période d'essai

## S19 · Le RGPD

*Domaine : droit, numérique*

**Glossaire (termes à surveiller) :** RGPD, donnée personnelle, consentement, responsable de traitement, droit d'accès, droit à l'effacement

**Compréhension immédiate**

1. Lequel de ces éléments est une donnée personnelle ? *(évalue : application)*
   - Le prix moyen d'une baguette de pain dans toute la France
   - La température moyenne du jour à Lyon
   - ✔ Une adresse e-mail au nom d'une personne
   - Le nombre d'habitants d'une ville
2. Pourquoi une organisation doit-elle indiquer à quoi serviront les données qu'elle collecte ? *(évalue : compréhension)*
   - ✔ Pour qu'elle sache leur usage et puisse exercer ses droits
   - Ce n'est pas obligatoire, c'est seulement une politesse
   - Pour pouvoir les revendre plus cher à d'autres entreprises
   - Pour pouvoir ensuite les utiliser librement pour tout autre usage
3. Un client demande à un magasin quelles informations il détient sur lui. De quel droit s'agit-il ? *(évalue : application)*
   - ✔ Le droit d'accès
   - Le droit de propriété
   - Le droit à l'image
   - Le droit de rectification

**Situation de transfert :** Une boulangerie demande l'adresse e-mail de ses clients pour leur envoyer une carte de fidélité numérique.

> Que doit-elle faire pour respecter le RGPD ?

*Réponse attendue :* Dire à quoi servira l'adresse et ne l'utiliser que pour ce but ; pour un autre usage (publicité par exemple), en informer les clients et respecter leur droit de refuser ; protéger les données ; répondre aux demandes d'accès ou de suppression.

**Déblocage** *(seulement si la compréhension immédiate donne moins de 2 sur 3, ou si la personne se dit bloquée ; posé après le transfert et la seconde explication ; notation : `grille-reformulation.md`, partie 2)*

1. Un site collecte la date de naissance pour « vérifier l'âge ». Peut-il ensuite l'utiliser librement pour autre chose ? *(évalue : application)*
   - ✔ Non : un nouvel usage doit être annoncé et justifié
   - Oui, si le site supprime la donnée au bout d'un an
   - Oui, une fois collectée, elle peut servir à tout ce que le site veut
   - Oui, à condition que personne ne s'en aperçoive
   - *Justification juste si elle contient :* Les données ne servent qu'au but annoncé ; un autre usage demande d'informer la personne et d'avoir une base légale (par exemple son consentement).
   - *Exemple juste (2 points avec le bon choix) :* « Non, on l'a donnée pour vérifier l'âge, pas pour autre chose ; pour un autre usage il faut prévenir et en avoir le droit. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Non, c'est interdit. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Non, parce qu'une date de naissance n'est jamais utile. »
2. Pourquoi une liste de numéros de clients est-elle une donnée personnelle, même sans les noms ? *(évalue : compréhension)*
   - Ce n'en est pas une, puisqu'il n'y a pas de nom
   - Parce que les chiffres d'un numéro sont secrets
   - Parce que la liste contient plus de cent numéros
   - ✔ Un numéro permet souvent de retrouver la personne
   - *Justification juste si elle contient :* Une donnée est personnelle si elle permet d'identifier quelqu'un, même indirectement : un numéro de téléphone mène à une personne précise.
   - *Exemple juste (2 points avec le bon choix) :* « Avec un numéro on peut retrouver qui c'est, même sans le nom. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Parce que c'est privé. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Parce que tous les chiffres sont des données personnelles. »

**Rappel à J+2**

1. Le RGPD protège… *(évalue : restitution (mémorisation))*
   - les brevets des inventions
   - les prix des produits
   - les logiciels des entreprises
   - ✔ les données personnelles
2. Le droit à l'effacement permet de… *(évalue : restitution (mémorisation))*
   - faire oublier son mot de passe
   - ✔ demander la suppression de ses données
   - effacer une facture impayée
   - supprimer l'historique de son ordinateur à distance
3. Une donnée personnelle permet… *(évalue : restitution (mémorisation))*
   - de calculer le prix d'un produit
   - de prévoir la météo locale
   - de mesurer, sans savoir qui, l'audience globale d'un site
   - ✔ d'identifier une personne, directement ou non
4. Une salle de sport garde le numéro de téléphone de ses membres pour les prévenir d'une fermeture. Peut-elle le vendre à une autre entreprise sans les en informer ? *(évalue : application)*
   - Oui, à condition de ne pas vendre les noms avec
   - Oui, une fois collectées, les données lui appartiennent
   - Oui, si l'entreprise acheteuse est dans la même ville
   - ✔ Non : ce n'est pas l'usage annoncé aux membres

**Reformulation, idée centrale :** Le RGPD encadre l'usage des données qui identifient une personne : on doit l'informer, n'utiliser ses données que pour un but annoncé et légitime, et respecter ses droits.

**Éléments clés :** données qui identifient une personne, directement ou non ; information et droits (accès, effacement)

## S20 · La chaîne du froid

*Domaine : hygiène*

**Glossaire (termes à surveiller) :** chaîne du froid, denrée périssable, température, rupture de la chaîne du froid, bactérie, décongélation

**Compréhension immédiate**

1. Pourquoi garde-t-on la viande au froid ? *(évalue : compréhension)*
   - Le froid empêche la viande de sécher à l'air
   - ✔ Le froid ralentit la plupart des bactéries
   - Le froid tue toutes les bactéries présentes
   - Le froid garde le goût de la viande intact
2. Pourquoi ne recongèle-t-on pas un produit décongelé tel quel, sans l'avoir cuit ? *(évalue : compréhension)*
   - Le produit deviendrait trop dur une fois recongelé
   - ✔ Les bactéries ont pu se multiplier ; le froid ne les tuera pas
   - Le congélateur ne peut pas refroidir correctement un produit qui est déjà froid
   - Il changerait de couleur et serait moins appétissant
3. Au supermarché, quand vaut-il mieux prendre les surgelés et les produits frais ? *(évalue : application)*
   - ✔ À la fin des courses, juste avant de payer
   - Au début des courses, quand on a le plus de place
   - Après avoir rangé les autres sacs dans la voiture
   - N'importe quand : quelques minutes ne changent rien

**Situation de transfert :** Après les courses, des surgelés restent deux heures dans le coffre d'une voiture en plein été.

> Quel est le risque, et que faut-il faire ?

*Réponse attendue :* Ils ont pu commencer à décongeler (rupture de la chaîne du froid), et les bactéries se multiplient : il ne faut pas les recongeler tels quels ; en cas de doute sur leur température, il faut les jeter.

**Déblocage** *(seulement si la compréhension immédiate donne moins de 2 sur 3, ou si la personne se dit bloquée ; posé après le transfert et la seconde explication ; notation : `grille-reformulation.md`, partie 2)*

1. Pour un pique-nique d'été, comment transporter des salades au poulet ? *(évalue : application)*
   - Comme on veut : le poulet cuit ne craint rien
   - Dans un sac ordinaire, à l'ombre si possible
   - ✔ Dans un sac isotherme avec des pains de glace
   - Dans le coffre, puisque le trajet est court
   - *Justification juste si elle contient :* Ces salades sont périssables : le froid doit être maintenu pendant tout le trajet, sinon les bactéries se multiplient, même dans un aliment cuit.
   - *Exemple juste (2 points avec le bon choix) :* « Il faut que ça reste froid tout le temps, sinon les bactéries se développent, même si le poulet est cuit. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Pour que ce soit frais. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Pour que la mayonnaise ne fonde pas. »
2. Pourquoi cuire un produit décongelé permet-il ensuite de le congeler à nouveau ? *(évalue : compréhension)*
   - On ne peut jamais recongeler un aliment, même cuit
   - La cuisson refroidit l'aliment plus vite ensuite
   - ✔ La cuisson détruit la plupart des bactéries apparues
   - Un plat cuit ne contient plus jamais de bactéries
   - *Justification juste si elle contient :* Pendant la décongélation, des bactéries se sont multipliées ; une cuisson suffisante en détruit la plupart, et on repart d'un plat sain qu'on peut congeler.
   - *Exemple juste (2 points avec le bon choix) :* « En cuisant, on tue les bactéries qui se sont développées, donc on peut congeler le plat cuit. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Parce que c'est cuit. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Parce que le plat cuit est plus froid. »

**Rappel à J+2**

1. Quel est l'effet du froid sur la plupart des bactéries des aliments ? *(évalue : restitution (mémorisation))*
   - Il n'a aucun effet sur elles
   - ✔ Il les ralentit
   - Il les rend plus fortes
   - Il les tue toutes
2. Un produit décongelé, non cuit, doit être… *(évalue : restitution (mémorisation))*
   - gardé au réfrigérateur encore une semaine au moins, sans risque
   - ✔ consommé rapidement, sans être recongelé tel quel
   - recongelé aussitôt pour stopper les bactéries
   - laissé à température ambiante pour finir
3. La chaîne du froid concerne… *(évalue : restitution (mémorisation))*
   - seulement le congélateur de la maison
   - seulement le transport, dans le camion frigorifique du livreur
   - seulement la vitrine du magasin
   - ✔ tout le trajet, de la fabrication à l'assiette
4. Ton réfrigérateur est resté ouvert toute la nuit. Que faire du poisson frais qu'il contenait ? *(évalue : application)*
   - Le manger cru le jour même, vite
   - Le remettre au frais et le garder deux jours de plus
   - Le recongeler aussitôt pour le sauver
   - ✔ Le jeter s'il est resté au chaud

**Reformulation, idée centrale :** Un produit périssable doit rester au froid sans interruption de sa fabrication à sa consommation, car le froid ralentit les bactéries sans les tuer.

**Éléments clés :** froid continu sur tout le trajet ; rupture = les bactéries se multiplient

## P-R1 · Ouverture et fermeture du magasin (R1 v2, corpus métier n° 1, fictif)

*Domaine : commerce de détail*

**Glossaire (termes à surveiller) :** fond de caisse, télésurveillance, issues de secours, défibrillateur, enveloppe scellée, coffre

**Compréhension immédiate**

1. Il est 9 h 05. Tu es seul devant le magasin ; ton collègue n'arrivera qu'à 9 h 20. Que fais-tu ? *(évalue : application)*
   - J'appelle la télésurveillance pour ouvrir à distance
   - J'ouvre seul, puisque le public n'arrive qu'à 9 h 30
   - ✔ J'attends mon collègue : on ouvre au moins à deux
   - J'entre seul et je désactive l'alarme en l'attendant
   - *Appui dans la procédure :* « Le magasin est ouvert par deux personnes au minimum, présentes dès 9 h 00. »
2. Combien de temps as-tu pour désactiver l'alarme en arrivant ? *(évalue : restitution (mémorisation))*
   - 45 secondes
   - ✔ 30 secondes
   - 2 minutes
   - Pas de délai fixé
   - *Appui dans la procédure :* « Désactiver l’alarme dans les 30 secondes avec son code personnel. »
3. Le voyant du défibrillateur n'est pas vert à l'ouverture. Que fais-tu ? *(évalue : application)*
   - Je débranche l'appareil puis je le rebranche
   - ✔ Je préviens le responsable avant l'ouverture
   - Rien : le voyant ne compte qu'à la fermeture
   - J'ouvre et je le signale en fin de journée
   - *Appui dans la procédure :* « Vérifier que le voyant du défibrillateur est vert ; sinon prévenir le responsable avant l’ouverture. »

**Situation de transfert :** Un dimanche soir, ton collègue doit partir plus tôt et te propose de fermer seul.

> Que dit la procédure, et que fais-tu ?

*Réponse attendue :* La fermeture se fait toujours à deux (comptage et sortie) : je ne ferme pas seul et je préviens le responsable.

**Déblocage** *(seulement si la compréhension immédiate donne moins de 2 sur 3, ou si la personne se dit bloquée ; posé après le transfert et la seconde explication ; notation : `grille-reformulation.md`, partie 2)*

1. Pendant le tour de sécurité du matin, une issue de secours est bloquée par des cartons. Que fais-tu avant d'ouvrir ? *(évalue : application)*
   - ✔ Je la dégage et je vérifie qu'elle est déverrouillée
   - Je laisse : seul le responsable s'occupe des issues
   - Je la verrouille pour éviter les vols pendant la journée
   - J'ouvre, et je la dégagerai pendant la pause de midi
   - *Appui dans la procédure :* « Faire le tour de sécurité : issues de secours dégagées et déverrouillées, extincteurs à leur place. »
   - *Justification juste si elle contient :* La procédure demande, au tour de sécurité d'avant l'ouverture, des issues de secours dégagées et déverrouillées.
   - *Exemple juste (2 points avec le bon choix) :* « Au tour de sécurité, les issues doivent être dégagées et déverrouillées avant d'ouvrir, c'est dans la procédure. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Parce que c'est mieux comme ça. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Je la dégage parce que les clients doivent pouvoir entrer par là. »
2. Ce soir, tu as compté ta caisse seul pendant que ton collègue rangeait la réserve. Est-ce conforme à la procédure ? *(évalue : application)*
   - Oui, le comptage à deux ne vaut que le dimanche
   - ✔ Non : les caisses se comptent à deux personnes
   - Oui, si le montant compté correspond au ticket
   - Non : seul le responsable a le droit de compter
   - *Appui dans la procédure :* « Compter les caisses à deux personnes et placer l’enveloppe scellée dans le coffre. »
   - *Justification juste si elle contient :* La procédure de fermeture impose de compter les caisses à deux personnes, sans exception écrite.
   - *Exemple juste (2 points avec le bon choix) :* « Non, à la fermeture le comptage des caisses se fait à deux, c'est écrit dans la procédure. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Non, ce n'est pas bien. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Non, parce que seul le responsable peut compter la caisse. »

**Rappel à J+2**

1. Le fond de caisse compté à l'ouverture est de… *(évalue : restitution (mémorisation))*
   - 150 €
   - 100 €
   - ✔ 200 €
   - 300 €
   - *Appui dans la procédure :* « Compter le fond de caisse de 200 € en présence du responsable et signaler tout écart. »
2. L'alarme se déclenche par erreur. Qui appelles-tu ? *(évalue : restitution (mémorisation))*
   - ✔ La télésurveillance, au numéro affiché dans le bureau
   - La police, en composant le 17 depuis le magasin
   - Le responsable du magasin, sur son téléphone personnel, puis la police
   - Personne : l'alarme s'arrête seule
   - *Appui dans la procédure :* « En cas de déclenchement de l’alarme par erreur, appeler la télésurveillance au numéro affiché dans le bureau et donner le mot de passe du site. »
3. Le comptage des caisses le soir se fait… *(évalue : restitution (mémorisation))*
   - ✔ à deux personnes
   - le lendemain matin
   - par le responsable seul
   - par le vendeur de la caisse
   - *Appui dans la procédure :* « Compter les caisses à deux personnes et placer l’enveloppe scellée dans le coffre. »
4. Il est 18 h 45. Quelle étape de la fermeture dois-tu faire maintenant ? *(évalue : application)*
   - ✔ Annoncer aux clients la fermeture
   - Compter les caisses à deux personnes
   - Fermer les issues de secours
   - Activer l'alarme et sortir à deux
   - *Appui dans la procédure :* « Annoncer la fermeture aux clients 15 minutes avant. » « Fermer les portes à 19 h 00 et accompagner les derniers clients vers la sortie. »

**Reformulation, idée centrale :** On ouvre et on ferme toujours à deux, en sécurisant l'alarme, les issues et l'argent à chaque étape.

**Éléments clés :** jamais seul (ouverture, comptage, fermeture) ; contrôles de sécurité : alarme 30 s, issues, défibrillateur

## P-H1 · Réception des livraisons (H1 v2, corpus métier n° 1, fictif)

*Domaine : hôtellerie-restauration*

**Glossaire (termes à surveiller) :** thermomètre sonde, date limite de consommation, bon de livraison, traçabilité, chambre froide, tolérance

**Compréhension immédiate**

1. Une livraison de viande hachée arrive à + 4 °C. Que fais-tu ? *(évalue : application)*
   - ✔ Je la refuse, je l'écris sur le bon et je préviens le chef
   - Je l'accepte : la limite des viandes est de + 4 °C
   - Je l'accepte et je la range tout de suite au congélateur
   - Je la refuse sans rien noter, puis je la rends directement au livreur
   - *Appui dans la procédure :* « Viandes hachées : + 2 °C. » « Si une température dépasse le maximum, refuser le produit, l’écrire sur le bon de livraison et prévenir le chef. »
2. Qui peut réceptionner une livraison de boissons ? *(évalue : restitution (mémorisation))*
   - Le livreur, qui range lui-même
   - ✔ Le chef ou son second
   - N'importe quel commis présent
   - Le plongeur, s'il est disponible
   - *Appui dans la procédure :* « Les livraisons sont reçues entre 7 h et 10 h par le chef ou son second. » « Cette règle vaut pour toutes les livraisons, boissons et épicerie sèche comprises. »
3. Des escalopes de volaille arrivent à + 3 °C. Que fais-tu ? *(évalue : application)*
   - Je les refuse : la limite des volailles est de + 2 °C
   - ✔ Je les accepte et je les range en chambre froide sous 15 minutes
   - Je les refuse et je préviens le chef, par précaution
   - Je les accepte, puis je les laisse en cuisine jusqu'au début du service
   - *Appui dans la procédure :* « Viandes de volaille et préparations de viandes : + 4 °C. » « Ranger les produits acceptés en chambre froide dans les 15 minutes. »

**Situation de transfert :** Pendant le déchargement, un carton de glaces affiche – 16 °C en surface ; il était à – 18 °C dans le camion.

> Acceptes-tu le carton ? Justifie avec la procédure.

*Réponse attendue :* Oui, si c'est bref et pendant le déchargement : un écart de 3 °C au plus en surface est admis ; je le range vite au froid.

**Déblocage** *(seulement si la compréhension immédiate donne moins de 2 sur 3, ou si la personne se dit bloquée ; posé après le transfert et la seconde explication ; notation : `grille-reformulation.md`, partie 2)*

1. Une livraison de préparations culinaires élaborées à l'avance arrive à + 5 °C. Que fais-tu ? *(évalue : application)*
   - Je l'accepte : les préparations sont admises jusqu'à + 6 °C
   - Je la refuse, sans rien noter ni photographier, pour ne pas retarder le livreur
   - Je l'accepte et je la range tout de suite en chambre froide
   - ✔ Je la refuse, je le note sur le bon et je photographie les preuves
   - *Appui dans la procédure :* « Préparations culinaires élaborées à l’avance : + 3 °C. » « Si une température dépasse le maximum, refuser le produit, l’écrire sur le bon de livraison et prévenir le chef. » « Photographier le thermomètre et le bon de livraison pour chaque produit refusé, et joindre les photos au registre. »
   - *Justification juste si elle contient :* Le maximum est de + 3 °C pour ces préparations : à + 5 °C, refus, mention sur le bon, chef prévenu, photos du thermomètre et du bon jointes au registre.
   - *Exemple juste (2 points avec le bon choix) :* « La limite est de + 3 °C, c'est trop chaud, donc je refuse, je l'écris sur le bon et je prends les photos. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Je refuse parce que ce n'est pas bon. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Je refuse parce que la limite est de 0 °C. »
2. Une livraison de boissons arrive à 8 h ; seul un commis est en cuisine. Que fait-il ? *(évalue : application)*
   - ✔ Il ne la réceptionne pas : c'est le rôle du chef ou du second
   - Il la réceptionne, puisque les boissons ne sont pas des produits périssables
   - Il la réceptionne et fait signer le bon au livreur
   - Il la réceptionne s'il prend les photos des produits
   - *Appui dans la procédure :* « Les livraisons sont reçues entre 7 h et 10 h par le chef ou son second. » « Cette règle vaut pour toutes les livraisons, boissons et épicerie sèche comprises. »
   - *Justification juste si elle contient :* Toutes les livraisons, boissons comprises, sont reçues par le chef ou son second : un commis ne réceptionne pas.
   - *Exemple juste (2 points avec le bon choix) :* « Non, même pour les boissons, c'est le chef ou son second qui réceptionne. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Non, il n'a pas le droit. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Non, parce que les livraisons n'arrivent qu'après 10 h. »

**Rappel à J+2**

1. Il doit rester au moins combien de jours avant la date limite pour les viandes et poissons ? *(évalue : restitution (mémorisation))*
   - 7 jours
   - 1 jour
   - 3 jours
   - ✔ 4 jours
   - *Appui dans la procédure :* « Contrôler la date limite de consommation : il doit rester au moins 4 jours pour les viandes et les poissons. »
2. Pour un produit refusé, que faut-il en plus de la mention sur le bon ? *(évalue : restitution (mémorisation))*
   - Appeler le fournisseur pour demander un remplacement le jour même
   - ✔ Photographier le thermomètre et le bon de livraison
   - Faire signer le livreur sur le registre des températures
   - Rien d'autre : la mention sur le bon suffit
   - *Appui dans la procédure :* « Photographier le thermomètre et le bon de livraison pour chaque produit refusé, et joindre les photos au registre. »
3. Comment mesure-t-on la température d'un produit emballé ? *(évalue : restitution (mémorisation))*
   - ✔ Sonde entre deux emballages, sans les percer
   - À la main, en touchant l'emballage
   - Thermomètre posé à l'air libre, près du carton
   - Sonde plantée au cœur du produit, à travers l'emballage
   - *Appui dans la procédure :* « Mesurer la température avec le thermomètre sonde, placé entre deux emballages, sans les percer. »
4. Du saumon frais arrive à + 3 °C. Que fais-tu ? *(évalue : application)*
   - Je l'accepte : le poisson frais tolère jusqu'à + 4 °C
   - ✔ Je le refuse, je le note sur le bon et préviens le chef
   - Je l'accepte et je le mets aussitôt en chambre froide
   - Je l'accepte si sa date limite de consommation est dans plus de 4 jours
   - *Appui dans la procédure :* « Produits de la pêche frais : + 2 °C. » « Si une température dépasse le maximum, refuser le produit, l’écrire sur le bon de livraison et prévenir le chef. »

**Reformulation, idée centrale :** À la réception, le chef ou son second contrôle températures, dates et emballages, refuse ce qui n'est pas conforme en gardant une preuve, et range vite au froid.

**Éléments clés :** contrôles et seuils de température ; refus documenté (bon, photos) et rangement en 15 minutes

## P-R3 · Tenue de la caisse (R3, corpus métier n° 1, fictif)

*Domaine : commerce de détail*

**Glossaire (termes à surveiller) :** fond de caisse, plafond de paiement en espèces, détecteur de faux billets, prélèvement, fiche d'écart, domicile fiscal

**Compréhension immédiate**

1. Un client domicilié en France veut payer 1 200 € en espèces. Que fais-tu ? *(évalue : application)*
   - J'accepte, le plafond n'existe que pour les entreprises
   - Je refuse et j'appelle le responsable pour un contrôle
   - ✔ Je refuse les espèces : le plafond est de 1 000 €
   - J'accepte s'il paie la moitié en pièces de monnaie
   - *Appui dans la procédure :* « Un client dont le domicile fiscal est en France ne peut pas payer en espèces un achat de plus de 1 000 €. »
2. Un client veut payer 30 € uniquement en pièces de 1 centime. Es-tu obligé d'accepter ? *(évalue : application)*
   - Oui, toute pièce en euros doit être acceptée
   - ✔ Non : au-delà de 50 pièces, je peux refuser
   - Non, les pièces de 1 centime sont interdites
   - Oui, si le client compte les pièces lui-même
   - *Appui dans la procédure :* « Le vendeur n’est pas tenu d’accepter plus de 50 pièces pour un même paiement. »
3. Ton tiroir contient 850 € en espèces. Que se passe-t-il ? *(évalue : application)*
   - Tu déposes toi-même l'excédent à la banque
   - Tu rends la monnaie en billets
   - ✔ Le responsable fait un prélèvement vers le coffre
   - Rien, le plafond du tiroir est de 1 000 €
   - *Appui dans la procédure :* « Quand le tiroir contient plus de 800 € en espèces, le responsable fait un prélèvement vers le coffre. »

**Situation de transfert :** Le détecteur signale qu'un billet de 50 € est douteux ; le client s'énerve et réclame son billet.

> Que fais-tu, et pourquoi ?

*Réponse attendue :* Je reste courtois et je n'accuse pas le client ; le billet présumé faux ne doit pas être remis en circulation (il n'est jamais rendu en monnaie) ; j'appelle le responsable, qui le remet à la Banque de France, à un commissariat ou à une gendarmerie.

**Déblocage** *(seulement si la compréhension immédiate donne moins de 2 sur 3, ou si la personne se dit bloquée ; posé après le transfert et la seconde explication ; notation : `grille-reformulation.md`, partie 2)*

1. Un client dont le domicile fiscal est à l'étranger veut payer 1 500 € en espèces. Que fais-tu ? *(évalue : application)*
   - ✔ J'appelle le responsable : son plafond est plus élevé
   - Je refuse : 1 000 € est le plafond pour tous les clients
   - J'accepte sans rien vérifier, la règle ne le concerne pas
   - J'accepte s'il paie 500 € par carte et le reste en espèces
   - *Appui dans la procédure :* « Pour un client dont le domicile fiscal est à l’étranger, le plafond est plus élevé : appeler le responsable. » « Un client dont le domicile fiscal est en France ne peut pas payer en espèces un achat de plus de 1 000 €. »
   - *Justification juste si elle contient :* Le plafond de 1 000 € vise les clients dont le domicile fiscal est en France ; pour un domicile fiscal à l'étranger, le plafond est plus élevé et la procédure demande d'appeler le responsable.
   - *Exemple juste (2 points avec le bon choix) :* « Il a son domicile à l'étranger, donc la limite n'est pas 1 000 € ; la procédure dit d'appeler le responsable. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « J'appelle le responsable parce que c'est beaucoup d'argent. »
   - *Exemple faux (0 point, même avec le bon choix) :* « J'appelle le responsable parce que les touristes ne peuvent pas payer en espèces. »
2. En partant en pause, un vendeur laisse sa session de caisse ouverte pour son collègue. Est-ce conforme ? *(évalue : application)*
   - Oui, si le collègue travaille dans le même rayon
   - Oui, à condition que la pause dure moins de dix minutes
   - ✔ Non : une session ne doit jamais rester ouverte
   - Non : seul le responsable a le droit d'ouvrir une session
   - *Appui dans la procédure :* « Chaque vendeur se connecte à la caisse avec son identifiant personnel et ne laisse jamais sa session ouverte. »
   - *Justification juste si elle contient :* Chaque vendeur utilise son propre identifiant et ne laisse jamais sa session ouverte, même pour un collègue.
   - *Exemple juste (2 points avec le bon choix) :* « Non, chacun a son identifiant et on ne laisse jamais sa session ouverte, même pour un collègue. »
   - *Exemple insuffisant (1 point avec le bon choix) :* « Non, ce n'est pas prudent. »
   - *Exemple faux (0 point, même avec le bon choix) :* « Non, parce que les pauses sont interdites pendant l'ouverture. »

**Rappel à J+2**

1. Le fond de caisse est de… *(évalue : restitution (mémorisation))*
   - 50 €
   - 150 €
   - ✔ 200 €
   - 800 €
   - *Appui dans la procédure :* « Le fond de caisse est de 200 €. »
2. Au-delà de quel écart en fin de journée faut-il une fiche signée ? *(évalue : restitution (mémorisation))*
   - 1 €
   - ✔ 10 €
   - 50 €
   - Aucun : tout écart est accepté
   - *Appui dans la procédure :* « Tout écart de plus de 10 € en fin de journée fait l’objet d’une fiche d’écart signée par le vendeur et le responsable. »
3. À partir de quelle valeur vérifie-t-on les billets au détecteur ? *(évalue : restitution (mémorisation))*
   - 100 € et plus seulement
   - Tous les billets
   - ✔ 50 € et plus
   - Seulement les billets neufs
   - *Appui dans la procédure :* « Vérifier chaque billet de 50 € et plus au détecteur. »
4. En fin de journée, il manque 15 € dans ta caisse. Que fais-tu ? *(évalue : application)*
   - Je complète la caisse avec mon propre argent
   - ✔ Je remplis une fiche d'écart, signée avec le responsable
   - Rien : un écart de moins de 20 € est toléré
   - Je note l'écart et je le reporte sur la caisse de demain matin
   - *Appui dans la procédure :* « Tout écart de plus de 10 € en fin de journée fait l’objet d’une fiche d’écart signée par le vendeur et le responsable. »

**Reformulation, idée centrale :** La caisse se tient avec des règles d'argent strictes : plafonds en espèces, vérification des billets, prélèvements et écarts tracés.

**Éléments clés :** règles légales (1 000 €, 50 pièces, billet suspect) ; règles internes (prélèvement, fiche d'écart)

