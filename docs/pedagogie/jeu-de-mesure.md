# Jeu de mesure pédagogique (mission 3a) : version de relecture

Statut : **proposition à relire et valider avant toute mesure**. Généré par `docs/pedagogie/assembler.js` à partir des sources relues ; ne pas modifier ce fichier à la main.

La bonne réponse est marquée ✔ (ordre des choix mélangé). Les participants voient les questions sans cette marque.

## S01 · Le protocole IP

*Domaine : numérique*

**Glossaire (termes à surveiller) :** adresse IP, paquet, routeur, réseau, protocole, en-tête, Internet

**Compréhension immédiate**

1. Pourquoi un fichier envoyé sur Internet est-il découpé en paquets ?
   - Pour le rendre secret
   - Pour qu'il prenne moins de place sur le disque
   - Parce que la loi l'impose
   - ✔ Pour qu'il voyage par petits morceaux qui peuvent prendre des chemins différents
2. À quoi sert l'adresse IP de destination écrite sur chaque paquet ?
   - ✔ À indiquer où le paquet doit arriver
   - À choisir la vitesse d'envoi
   - À vérifier que le paquet n'est pas abîmé
   - À donner le nom du fichier
3. Que fait un routeur quand il reçoit un paquet ?
   - Il l'ouvre et lit son contenu
   - Il le garde en mémoire
   - ✔ Il lit l'adresse de destination et le fait avancer vers elle
   - Il le renvoie à l'expéditeur

**Situation de transfert :** Pendant un appel vidéo, l'image se fige une seconde puis repart, sans que l'appel soit coupé.

> Avec ce que tu sais des paquets, explique ce qui a pu se passer.

*Réponse attendue :* Certains paquets ont été retardés ou perdus en route (chemin encombré) ; les suivants sont arrivés et l'appel a continué.

**Rappel à J+2**

1. Sur un paquet IP, qu'est-ce qui permet de savoir où il doit aller ?
   - L'heure d'envoi
   - Le nom de l'ordinateur
   - ✔ L'adresse de destination
   - Son poids
2. Deux paquets d'un même message prennent-ils forcément le même chemin ?
   - Oui, toujours
   - ✔ Non, ils peuvent passer par des routeurs différents
   - Seulement la nuit
   - Seulement sur un câble
3. Quel appareil fait passer un paquet d'un réseau à un autre ?
   - L'écran
   - Le clavier
   - L'imprimante
   - ✔ Le routeur

**Reformulation, idée centrale :** Les données voyagent en petits paquets portant une adresse de destination, que des routeurs font avancer de proche en proche.

**Éléments clés :** découpage en paquets ; adresse lue par les routeurs pour acheminer

## S02 · La mémoire de l'ordinateur (RAM)

*Domaine : numérique*

**Glossaire (termes à surveiller) :** mémoire vive, RAM, stockage, disque, volatile, processeur, programme

**Compréhension immédiate**

1. Pourquoi un document non enregistré est-il perdu si l'ordinateur s'éteint brutalement ?
   - Parce que l'écran s'éteint
   - ✔ Parce qu'il était seulement dans la mémoire vive, qui s'efface sans courant
   - Parce que le disque se vide
   - Parce que le clavier est débranché
2. Quelle est la principale différence entre la mémoire vive et le disque ?
   - ✔ La mémoire vive est rapide mais temporaire, le disque est plus lent mais garde les fichiers
   - Il n'y a aucune différence
   - La mémoire vive garde tout pour toujours
   - Le disque est plus rapide
3. Pourquoi un ordinateur ralentit-il quand on ouvre beaucoup de programmes ?
   - ✔ Parce que la mémoire vive se remplit et l'ordinateur doit utiliser le disque, plus lent
   - Parce que le disque devient plus rapide
   - Parce que l'écran fatigue
   - Parce que la souris consomme trop

**Situation de transfert :** Tu prépares un exposé au tableau blanc pendant que tes fiches sont rangées dans un classeur.

> Si tu compares à un ordinateur, que représentent le tableau et le classeur, et pourquoi ?

*Réponse attendue :* Le tableau = la mémoire vive (on travaille dessus, rapide, effacé à la fin) ; le classeur = le disque (on y range pour garder).

**Rappel à J+2**

1. La mémoire vive garde-t-elle les données quand l'ordinateur est éteint ?
   - Seulement le week-end
   - ✔ Non
   - Oui
   - Seulement les photos
2. Où faut-il enregistrer un fichier pour le retrouver le lendemain ?
   - Dans la mémoire vive
   - Dans l'écran
   - ✔ Sur le disque (stockage)
   - Dans le processeur
3. Ajouter de la mémoire vive aide surtout à…
   - garder plus de photos pour toujours
   - avoir un écran plus grand
   - se connecter à Internet
   - ✔ faire tourner plus de programmes en même temps sans ralentir

**Reformulation, idée centrale :** La mémoire vive est l'espace de travail rapide mais temporaire de l'ordinateur ; ce qui doit durer va sur le disque.

**Éléments clés :** rapide et effacée sans courant ; différence avec le stockage durable

## S03 · Le chiffrement d'un message

*Domaine : numérique*

**Glossaire (termes à surveiller) :** chiffrer, déchiffrer, clé, message chiffré, algorithme, confidentialité

**Compréhension immédiate**

1. Pourquoi un message chiffré intercepté est-il inutile pour un espion qui n'a pas la clé ?
   - Parce qu'il est en anglais
   - Parce qu'il est effacé
   - Parce qu'il est trop long
   - ✔ Parce qu'il est illisible sans la clé
2. Que faut-il pour retrouver le message d'origine ?
   - Une connexion plus rapide
   - Un écran plus grand
   - ✔ La bonne clé
   - Le nom de l'expéditeur
3. Si quelqu'un vole la clé, que se passe-t-il ?
   - La clé change toute seule
   - Rien, le chiffrement protège toujours
   - ✔ Il peut lire les messages chiffrés avec cette clé
   - Les messages disparaissent

**Situation de transfert :** Deux amies s'écrivent en décalant chaque lettre de trois rangs dans l'alphabet (A devient D).

> Qu'est-ce qui joue ici le rôle de la clé, et que doit savoir l'autre amie pour lire le mot ?

*Réponse attendue :* La clé est le décalage de 3 ; il faut le connaître pour décaler chaque lettre dans l'autre sens.

**Rappel à J+2**

1. Chiffrer un message, c'est…
   - ✔ le rendre illisible sans la clé
   - l'imprimer
   - le raccourcir
   - le traduire
2. Ce qui doit rester secret avant tout, c'est…
   - la longueur du message
   - ✔ la clé
   - l'heure d'envoi
   - la langue
3. Déchiffrer, c'est…
   - envoyer le message
   - copier le message
   - ✔ retrouver le message lisible avec la clé
   - supprimer le message

**Reformulation, idée centrale :** Chiffrer transforme un message en texte illisible que seule la personne qui a la clé peut remettre en clair.

**Éléments clés :** illisible sans la clé ; la clé doit rester secrète

## S04 · Le théorème de Pythagore

*Domaine : mathématiques*

**Glossaire (termes à surveiller) :** triangle rectangle, angle droit, hypoténuse, côté, carré d'un nombre, théorème

**Compréhension immédiate**

1. Dans un triangle rectangle de côtés 3 et 4 autour de l'angle droit, combien mesure le plus grand côté ?
   - 7
   - 6
   - ✔ 5
   - 12
2. À quels triangles s'applique le théorème ?
   - ✔ Aux triangles qui ont un angle droit
   - À tous les triangles
   - Aux triangles dont les trois côtés sont égaux
   - Aux carrés
3. Le plus grand côté d'un triangle rectangle est toujours…
   - le plus petit
   - collé à l'angle droit
   - égal aux deux autres réunis
   - ✔ en face de l'angle droit

**Situation de transfert :** Une échelle de 5 m est posée contre un mur ; son pied est à 3 m du mur, sur un sol plat.

> À quelle hauteur l'échelle touche-t-elle le mur ? Explique ton raisonnement.

*Réponse attendue :* 4 m : le mur et le sol font un angle droit, 5² = 3² + h², donc h² = 16 et h = 4.

**Rappel à J+2**

1. Le théorème relie…
   - les aires de deux cercles
   - ✔ les longueurs des côtés d'un triangle rectangle
   - les angles d'un triangle
   - le périmètre d'un carré
2. Triangle rectangle de côtés 6 et 8 autour de l'angle droit : le grand côté mesure…
   - ✔ 10
   - 12
   - 9
   - 14
3. Où se trouve l'hypoténuse ?
   - Au centre
   - Il n'y en a pas
   - ✔ En face de l'angle droit
   - Entre les deux petits côtés

**Reformulation, idée centrale :** Dans un triangle rectangle, le carré du plus grand côté est égal à la somme des carrés des deux autres.

**Éléments clés :** seulement avec un angle droit ; permet de calculer un côté à partir des deux autres

## S05 · Les fractions

*Domaine : mathématiques*

**Glossaire (termes à surveiller) :** fraction, numérateur, dénominateur, part, simplifier, fractions égales

**Compréhension immédiate**

1. Une pizza est coupée en 8 parts ; tu en manges 3. Quelle fraction as-tu mangée ?
   - ✔ 3/8
   - 3/5
   - 5/8
   - 8/3
2. Laquelle est la plus grande : 1/2 ou 1/4 ?
   - 1/4
   - ✔ 1/2
   - Elles sont égales
   - On ne peut pas savoir
3. Pourquoi 2/4 et 1/2 représentent-ils la même quantité ?
   - Parce qu'ils ont le même numérateur
   - Parce que 4 est plus grand que 2
   - Ce n'est pas la même quantité
   - ✔ Parce que 2 parts sur 4 couvrent autant que 1 part sur 2

**Situation de transfert :** Une recette pour 4 personnes demande 3/4 de litre de lait ; tu cuisines pour 2 personnes.

> Quelle quantité de lait faut-il, et comment le sais-tu ?

*Réponse attendue :* 3/8 de litre : deux fois moins de personnes, donc la moitié de 3/4.

**Rappel à J+2**

1. Dans 3/5, le nombre du bas indique…
   - ✔ en combien de parts égales on a coupé
   - le reste
   - combien de parts on prend
   - le résultat
2. 4/8 est égal à…
   - 4
   - ✔ 1/2
   - 2/3
   - 1/4
3. Lequel est le plus petit : 1/3 ou 1/10 ?
   - ✔ 1/10
   - On ne peut pas savoir
   - Égaux
   - 1/3

**Reformulation, idée centrale :** Une fraction indique combien de parts égales on prend (en haut) sur le nombre de parts du tout (en bas).

**Éléments clés :** rôle du nombre du bas et du haut ; plus il y a de parts, plus chacune est petite

## S06 · Les intérêts composés

*Domaine : mathématiques, finance*

**Glossaire (termes à surveiller) :** capital, taux d'intérêt, intérêts, intérêts composés, placement, durée

**Compréhension immédiate**

1. Tu places 100 € à 10 % par an, intérêts composés. Combien as-tu après 2 ans ?
   - 110 €
   - ✔ 121 €
   - 200 €
   - 120 €
2. Qu'est-ce qui distingue les intérêts composés ?
   - Le taux baisse chaque année
   - Ils sont interdits
   - ✔ Les intérêts gagnés rapportent à leur tour des intérêts
   - On ne touche rien avant la fin
3. Pour un même taux, pourquoi placer tôt rapporte-t-il plus ?
   - ✔ Parce que les intérêts ont plus d'années pour s'ajouter et rapporter à leur tour
   - Parce que le taux augmente avec l'âge
   - Ce n'est pas vrai
   - Parce que la banque offre un cadeau

**Situation de transfert :** Une dette de carte de crédit non remboursée augmente chaque mois avec des intérêts sur les intérêts.

> Pourquoi cette dette peut-elle grossir de plus en plus vite ?

*Réponse attendue :* Les intérêts s'ajoutent à la dette, puis portent eux-mêmes des intérêts : la base grossit chaque mois.

**Rappel à J+2**

1. Avec les intérêts composés, les intérêts de l'an 1 rapportent-ils en l'an 2 ?
   - Seulement s'ils sont retirés
   - Non
   - ✔ Oui
   - Seulement à 0 %
2. 100 € à 50 % par an pendant 2 ans, composés :
   - 150 €
   - ✔ 225 €
   - 250 €
   - 200 €
3. Le capital, c'est…
   - ✔ la somme placée au départ
   - la durée
   - le taux
   - la banque

**Reformulation, idée centrale :** Avec les intérêts composés, les intérêts gagnés s'ajoutent au capital et rapportent à leur tour, ce qui accélère la croissance.

**Éléments clés :** intérêts sur les intérêts ; effet plus fort avec le temps

## S07 · La photosynthèse

*Domaine : sciences de la vie*

**Glossaire (termes à surveiller) :** photosynthèse, chlorophylle, dioxyde de carbone, oxygène, glucose, feuille, lumière

**Compréhension immédiate**

1. De quoi une plante a-t-elle besoin pour fabriquer sa nourriture par photosynthèse ?
   - D'oxygène et de nuit
   - ✔ Lumière, eau et dioxyde de carbone
   - Seulement de terre
   - De sucre ajouté
2. Quel gaz la plante rejette-t-elle pendant la photosynthèse ?
   - Azote
   - ✔ Oxygène
   - Dioxyde de carbone
   - Hélium
3. Pourquoi une plante laissée dans un placard sombre dépérit-elle ?
   - ✔ Sans lumière, elle ne peut plus fabriquer sa nourriture
   - Parce qu'elle a trop froid
   - Parce que le placard est petit
   - Parce qu'elle a trop d'eau

**Situation de transfert :** Dans une serre fermée et éclairée, on ajoute du dioxyde de carbone dans l'air.

> Que peut-on attendre pour la croissance des plantes, et pourquoi ?

*Réponse attendue :* Elles peuvent pousser plus vite : plus de dioxyde de carbone disponible pour fabriquer leur nourriture, tant qu'il y a lumière et eau.

**Rappel à J+2**

1. La photosynthèse a lieu surtout dans…
   - les racines
   - les graines
   - le sol
   - ✔ les feuilles
2. Le pigment vert qui capte la lumière s'appelle…
   - sève
   - ✔ chlorophylle
   - glucose
   - oxygène
3. La photosynthèse produit…
   - de la terre
   - de l'eau salée
   - ✔ du sucre et de l'oxygène
   - du sel et de l'azote

**Reformulation, idée centrale :** Grâce à la lumière, la plante fabrique son sucre à partir d'eau et de dioxyde de carbone, et rejette de l'oxygène.

**Éléments clés :** besoins : lumière, eau, CO2 ; produits : sucre et oxygène

## S08 · Le système immunitaire

*Domaine : sciences de la vie*

**Glossaire (termes à surveiller) :** système immunitaire, microbe, globule blanc, anticorps, infection, mémoire immunitaire

**Compréhension immédiate**

1. Quel est le rôle principal du système immunitaire ?
   - Digérer les aliments
   - ✔ Défendre le corps contre les microbes
   - Faire circuler le sang
   - Produire de l'énergie
2. Pourquoi tombe-t-on rarement deux fois malade de la varicelle ?
   - Parce qu'on grandit
   - ✔ Parce que le corps garde la mémoire de ce microbe et réagit vite
   - Par hasard
   - Parce que le microbe disparaît de la Terre
3. Les anticorps sont…
   - des microbes
   - des vitamines
   - ✔ des molécules qui repèrent un microbe précis
   - des médicaments

**Situation de transfert :** Une personne dont les défenses sont affaiblies par un traitement attrape facilement des infections banales.

> Explique pourquoi, avec ce que tu sais du système immunitaire.

*Réponse attendue :* Son système immunitaire réagit moins ou moins vite : les microbes ne sont plus repérés et éliminés à temps.

**Rappel à J+2**

1. Les globules blancs servent à…
   - digérer
   - ✔ combattre les microbes
   - coaguler le sang
   - transporter l'oxygène
2. La mémoire immunitaire permet…
   - de mieux dormir
   - de grandir
   - de voir mieux
   - ✔ de réagir plus vite à un microbe déjà rencontré
3. Un anticorps est efficace contre…
   - les vitamines
   - tous les microbes à la fois
   - ✔ un microbe précis
   - aucun microbe

**Reformulation, idée centrale :** Le système immunitaire repère et détruit les microbes, et garde en mémoire ceux qu'il a déjà rencontrés pour réagir plus vite.

**Éléments clés :** défense contre les microbes ; mémoire d'une rencontre passée

## S09 · L'ADN

*Domaine : sciences de la vie*

**Glossaire (termes à surveiller) :** ADN, gène, cellule, chromosome, hérédité, noyau

**Compréhension immédiate**

1. Où trouve-t-on l'ADN dans le corps ?
   - ✔ Dans presque toutes les cellules
   - Seulement dans les os
   - Dans l'air
   - Seulement dans le sang
2. Pourquoi un enfant ressemble-t-il à ses parents ?
   - Parce qu'il vit avec eux
   - Parce qu'il mange la même chose
   - Par hasard uniquement
   - ✔ Parce qu'il reçoit une partie de l'ADN de chacun
3. Un gène est…
   - un organe
   - une maladie
   - un vaccin
   - ✔ un morceau d'ADN qui porte une information

**Situation de transfert :** Sur une scène de vol, les enquêteurs retrouvent un cheveu et le comparent à l'ADN de suspects.

> Pourquoi cette comparaison peut-elle désigner une personne ?

*Réponse attendue :* L'ADN est présent dans les cellules du cheveu et il est propre à chaque personne (sauf vrais jumeaux).

**Rappel à J+2**

1. L'ADN contient…
   - de l'eau
   - ✔ les informations qui guident le fonctionnement de la cellule
   - de l'énergie
   - des microbes
2. On reçoit son ADN…
   - de l'alimentation
   - uniquement de sa mère
   - ✔ de ses deux parents
   - de l'air
3. Deux personnes non jumelles ont-elles le même ADN ?
   - Seulement les frères
   - ✔ Non
   - Oui
   - Seulement les voisins

**Reformulation, idée centrale :** L'ADN, présent dans nos cellules, porte les informations héritées de nos parents qui guident le fonctionnement du corps.

**Éléments clés :** dans les cellules ; transmis par les parents

## S10 · Le vaccin

*Domaine : santé*

**Glossaire (termes à surveiller) :** vaccin, immunité, microbe, anticorps, rappel, système immunitaire

**Compréhension immédiate**

1. Comment un vaccin protège-t-il ?
   - Il tue tous les microbes du corps
   - ✔ Il apprend au corps à reconnaître un microbe sans tomber vraiment malade
   - Il soigne une maladie déjà là
   - Il remplace le sang
2. Pourquoi fait-on parfois un rappel ?
   - Ce n'est jamais utile
   - Pour changer de microbe
   - ✔ Pour réveiller la mémoire du corps qui faiblit avec le temps
   - Parce que le premier était faux
3. Pourquoi vacciner beaucoup de monde protège aussi ceux qui ne le sont pas ?
   - ✔ Parce que le microbe circule moins
   - Ce n'est pas vrai
   - Parce que le vaccin se transmet
   - Parce que l'air est filtré

**Situation de transfert :** Dans une école, presque tous les élèves sont vaccinés contre la rougeole, sauf un bébé de la crèche voisine, trop jeune.

> Pourquoi ce bébé est-il moins exposé qu'ailleurs ?

*Réponse attendue :* Le virus circule peu autour de lui car presque tout le monde est protégé : il a peu de chances d'être contaminé.

**Rappel à J+2**

1. Un vaccin entraîne…
   - la mémoire scolaire
   - les muscles
   - la digestion
   - ✔ le système immunitaire
2. Un rappel sert à…
   - changer de groupe sanguin
   - ✔ entretenir la protection
   - guérir une fracture
   - rien
3. Un vaccin agit surtout…
   - ✔ avant la maladie
   - seulement la nuit
   - après la guérison
   - sur les plantes

**Reformulation, idée centrale :** Un vaccin présente au corps un microbe rendu inoffensif ou une partie de celui-ci, pour qu'il apprenne à le reconnaître et se défende vite plus tard.

**Éléments clés :** apprendre sans être malade ; protection qui peut demander des rappels

## S11 · Le cycle de l'eau

*Domaine : sciences de la Terre*

**Glossaire (termes à surveiller) :** évaporation, condensation, précipitations, vapeur d'eau, nuage, ruissellement, nappe souterraine

**Compréhension immédiate**

1. D'où vient l'eau qui forme les nuages ?
   - De la pollution
   - Des étoiles
   - ✔ De l'eau évaporée des mers, lacs et sols
   - Uniquement des rivières gelées
2. Pourquoi se forme-t-il des gouttes sur un verre d'eau très froide en été ?
   - Le verre fuit
   - L'eau traverse le verre
   - ✔ La vapeur d'eau de l'air se condense au contact du froid
   - Le soleil chauffe le verre
3. Que devient la pluie qui tombe sur le sol ?
   - Elle se transforme en sel
   - Elle disparaît
   - Elle remonte au ciel tout de suite
   - ✔ Elle ruisselle vers les rivières ou s'infiltre dans le sol

**Situation de transfert :** Le matin, la vitre de la salle de bain est couverte de buée après une douche chaude.

> Quelles étapes du cycle de l'eau retrouves-tu ici ?

*Réponse attendue :* L'eau chaude s'évapore (vapeur), puis la vapeur se condense en gouttelettes sur la vitre froide.

**Rappel à J+2**

1. Le passage de l'eau liquide à la vapeur s'appelle…
   - précipitation
   - ✔ évaporation
   - fusion
   - condensation
2. Les nuages sont faits de…
   - ✔ fines gouttelettes ou cristaux d'eau
   - fumée
   - gaz carbonique
   - poussière seulement
3. Pluie, neige et grêle sont des…
   - ✔ précipitations
   - condensations
   - nappes
   - évaporations

**Reformulation, idée centrale :** L'eau circule sans cesse : elle s'évapore, se condense en nuages, retombe en pluie puis rejoint rivières, sols et mers.

**Éléments clés :** évaporation puis condensation ; retour au sol et aux mers

## S12 · L'effet de serre

*Domaine : sciences de la Terre*

**Glossaire (termes à surveiller) :** effet de serre, gaz à effet de serre, atmosphère, rayonnement, dioxyde de carbone, réchauffement climatique

**Compréhension immédiate**

1. Sans aucun effet de serre naturel, la Terre serait…
   - beaucoup plus chaude
   - sans soleil
   - identique
   - ✔ beaucoup plus froide
2. Pourquoi l'ajout de gaz à effet de serre réchauffe-t-il le climat ?
   - ✔ Ils retiennent davantage la chaleur émise par la Terre
   - Ils bloquent toute la lumière
   - Ils rapprochent le Soleil
   - Ils font fondre le Soleil
3. Brûler du charbon, du pétrole ou du gaz…
   - ✔ ajoute du dioxyde de carbone dans l'air
   - retire du dioxyde de carbone
   - n'a aucun effet
   - fabrique de l'oxygène

**Situation de transfert :** Une voiture garée au soleil, vitres fermées, devient très chaude à l'intérieur.

> En quoi cela ressemble-t-il à l'effet de serre, et quelle est la limite de la comparaison ?

*Réponse attendue :* La chaleur entre et reste en partie piégée ; mais dans la voiture c'est surtout l'air enfermé, alors que pour la Terre ce sont des gaz qui retiennent le rayonnement de chaleur.

**Rappel à J+2**

1. L'effet de serre naturel est…
   - inexistant
   - toujours néfaste
   - dû à la Lune
   - ✔ indispensable à la vie sur Terre
2. Un gaz à effet de serre important émis par les activités humaines est…
   - l'azote
   - l'oxygène
   - l'hélium
   - ✔ le dioxyde de carbone
3. Renforcer l'effet de serre conduit à…
   - plus de lumière
   - un refroidissement
   - aucun changement
   - ✔ un réchauffement du climat

**Reformulation, idée centrale :** Certains gaz de l'atmosphère retiennent une partie de la chaleur de la Terre ; en en ajoutant, on renforce ce piège et le climat se réchauffe.

**Éléments clés :** effet naturel utile ; ajout humain de gaz qui renforce le réchauffement

## S13 · La gravitation

*Domaine : physique*

**Glossaire (termes à surveiller) :** gravitation, masse, force, attraction, poids, orbite

**Compréhension immédiate**

1. Pourquoi une pomme lâchée tombe-t-elle vers le sol ?
   - L'air la pousse vers le bas
   - Elle est trop mûre
   - ✔ La Terre l'attire
   - Le vent souffle
2. Sur la Lune, un astronaute pèse moins que sur Terre parce que…
   - il a perdu du poids
   - ✔ la Lune l'attire moins fort
   - sa combinaison est légère
   - il n'y a pas d'air
3. Qu'est-ce qui maintient la Lune autour de la Terre ?
   - Un câble invisible
   - Le vent solaire
   - Rien, elle est immobile
   - ✔ L'attraction de la Terre

**Situation de transfert :** Un satellite tourne autour de la Terre sans moteur allumé.

> Pourquoi ne s'éloigne-t-il pas dans l'espace et ne tombe-t-il pas tout droit ?

*Réponse attendue :* La Terre l'attire en permanence, mais il va assez vite sur le côté : il « tombe » autour de la Terre en restant en orbite.

**Rappel à J+2**

1. Deux objets ayant une masse…
   - ✔ s'attirent
   - se repoussent
   - s'ignorent
   - s'annulent
2. Le poids d'un objet dépend…
   - de sa forme seulement
   - de l'heure
   - ✔ de l'astre sur lequel il se trouve
   - de sa couleur
3. Une orbite, c'est…
   - un type de fusée
   - un nuage
   - ✔ le trajet d'un objet qui tourne autour d'un astre
   - une étoile

**Reformulation, idée centrale :** Tout objet ayant une masse attire les autres ; c'est ce qui nous fait tomber vers la Terre et ce qui garde la Lune en orbite.

**Éléments clés :** attraction entre masses ; explique la chute et les orbites

## S14 · Tension et intensité électriques

*Domaine : physique*

**Glossaire (termes à surveiller) :** tension, volt, intensité, ampère, circuit, courant électrique, générateur

**Compréhension immédiate**

1. Si on compare l'électricité à de l'eau dans un tuyau, la tension ressemble à…
   - la couleur de l'eau
   - ✔ la pression qui pousse l'eau
   - la longueur du tuyau
   - le robinet fermé
2. L'intensité mesure…
   - le prix de l'électricité
   - la longueur des fils
   - la couleur de la lumière
   - ✔ la quantité de courant qui passe à chaque instant
3. Pourquoi une lampe ne s'allume-t-elle pas si le circuit est ouvert ?
   - La lampe est trop loin
   - La tension devient trop forte
   - ✔ Le courant ne peut pas circuler
   - Il fait jour

**Situation de transfert :** Une pile de 1,5 V fait briller faiblement une petite lampe prévue pour 4,5 V.

> Pourquoi la lampe brille-t-elle peu, et que faudrait-il changer ?

*Réponse attendue :* La tension est trop faible pour la pousser à son fonctionnement normal ; il faut une tension proche de 4,5 V (par exemple trois piles en série).

**Rappel à J+2**

1. La tension se mesure en…
   - watts
   - ✔ volts
   - ampères
   - mètres
2. L'intensité se mesure en…
   - litres
   - ✔ ampères
   - degrés
   - volts
3. Pour qu'un courant circule, le circuit doit être…
   - ouvert
   - ✔ fermé
   - coupé
   - mouillé

**Reformulation, idée centrale :** La tension pousse le courant dans un circuit fermé ; l'intensité indique combien de courant passe.

**Éléments clés :** tension = ce qui pousse ; intensité = quantité qui passe, circuit fermé

## S15 · L'inflation

*Domaine : économie*

**Glossaire (termes à surveiller) :** inflation, prix, pouvoir d'achat, monnaie, taux d'inflation, salaire

**Compréhension immédiate**

1. S'il y a 10 % d'inflation sur un an, un panier qui coûtait 100 € coûte environ…
   - 200 €
   - ✔ 110 €
   - 90 €
   - 100 €
2. Si ton salaire ne bouge pas alors que les prix montent, ton pouvoir d'achat…
   - ✔ baisse
   - ne change pas
   - monte
   - double
3. L'inflation désigne…
   - la hausse d'un seul produit
   - un impôt
   - une baisse des salaires
   - ✔ une hausse générale et durable des prix

**Situation de transfert :** Ta grand-mère raconte qu'une baguette coûtait beaucoup moins cher dans sa jeunesse.

> Est-ce que cela veut forcément dire que le pain était plus « accessible » à l'époque ? Explique.

*Réponse attendue :* Pas forcément : il faut comparer au salaire de l'époque ; l'inflation fait monter les prix mais aussi, souvent, les salaires.

**Rappel à J+2**

1. Avec l'inflation, 100 € permettent d'acheter…
   - exactement pareil
   - ✔ un peu moins qu'avant
   - rien
   - plus qu'avant
2. Le pouvoir d'achat, c'est…
   - une monnaie étrangère
   - le prix d'un objet
   - ✔ ce qu'on peut acheter avec son revenu
   - le taux d'une banque
3. L'inflation concerne…
   - ✔ l'ensemble des prix
   - un seul magasin
   - les seuls salaires
   - les seules actions

**Reformulation, idée centrale :** L'inflation est la hausse générale des prix : avec la même somme, on achète moins, sauf si les revenus suivent.

**Éléments clés :** hausse générale des prix ; effet sur le pouvoir d'achat

## S16 · L'offre et la demande

*Domaine : économie*

**Glossaire (termes à surveiller) :** offre, demande, prix d'équilibre, pénurie, surplus, marché

**Compréhension immédiate**

1. Si beaucoup de gens veulent un produit rare, son prix a tendance à…
   - baisser
   - ✔ monter
   - rester fixe
   - disparaître
2. Après une très bonne récolte de tomates, leur prix a tendance à…
   - ✔ baisser
   - monter
   - rester fixe
   - doubler
3. Le prix d'équilibre est le prix où…
   - personne n'achète
   - ✔ la quantité offerte égale la quantité demandée
   - l'État fixe le prix
   - le vendeur gagne le plus

**Situation de transfert :** Les billets d'un concert très attendu sont revendus bien plus cher que leur prix initial.

> Explique ce phénomène avec l'offre et la demande.

*Réponse attendue :* Le nombre de places est limité (offre faible) et beaucoup veulent y aller (demande forte) : le prix de revente monte.

**Rappel à J+2**

1. Une pénurie, c'est quand…
   - ✔ la demande dépasse l'offre
   - l'offre dépasse la demande
   - personne ne veut acheter
   - le prix baisse
2. Si l'offre augmente et la demande ne change pas, le prix…
   - ne peut pas changer
   - monte
   - double
   - ✔ a tendance à baisser
3. La demande représente…
   - ce que les vendeurs proposent
   - les salaires
   - ✔ ce que les acheteurs veulent acheter
   - les impôts

**Reformulation, idée centrale :** Le prix d'un bien évolue selon l'équilibre entre ce que les vendeurs proposent et ce que les acheteurs veulent.

**Éléments clés :** rare et demandé = plus cher ; abondant = moins cher

## S17 · La TVA

*Domaine : fiscalité*

**Glossaire (termes à surveiller) :** TVA, taxe, hors taxe, toutes taxes comprises, taux, consommateur final

**Compréhension immédiate**

1. Un objet coûte 100 € hors taxe avec une TVA de 20 %. Son prix TTC est…
   - 80 €
   - ✔ 120 €
   - 200 €
   - 100 €
2. Qui supporte finalement la TVA ?
   - Uniquement l'usine
   - La banque
   - ✔ Le consommateur final
   - Personne
3. « Hors taxe » signifie…
   - un prix soldé
   - le prix avec la TVA
   - ✔ le prix avant ajout de la TVA
   - un prix gratuit

**Situation de transfert :** Une entreprise achète un ordinateur 1 200 € TTC (TVA 20 %) pour son activité.

> Quel est le prix hors taxe, et pourquoi l'entreprise s'intéresse-t-elle surtout à ce montant ?

*Réponse attendue :* 1 000 € HT ; l'entreprise peut en général récupérer la TVA payée, son coût réel est donc le prix hors taxe.

**Rappel à J+2**

1. TTC veut dire…
   - ✔ toutes taxes comprises
   - tarif type commerce
   - total temporaire
   - taxe très chère
2. Avec 20 % de TVA, 50 € HT deviennent…
   - 55 €
   - 50 €
   - 70 €
   - ✔ 60 €
3. La TVA est une taxe sur…
   - les maisons uniquement
   - les voitures uniquement
   - ✔ la consommation
   - les salaires uniquement

**Reformulation, idée centrale :** La TVA est une taxe ajoutée au prix hors taxe ; c'est le consommateur final qui la paie dans le prix TTC.

**Éléments clés :** HT + TVA = TTC ; payée au final par le consommateur

## S18 · Le contrat de travail

*Domaine : droit*

**Glossaire (termes à surveiller) :** contrat de travail, employeur, salarié, CDI, CDD, période d'essai, rupture

**Compréhension immédiate**

1. Quelle est la principale différence entre un CDI et un CDD ?
   - ✔ Le CDD a une date de fin prévue, pas le CDI
   - Il n'y en a aucune
   - Le CDI est toujours mieux payé
   - Le CDD n'a pas de salaire
2. À quoi sert la période d'essai ?
   - À changer de métier
   - À travailler sans salaire
   - ✔ À permettre à chacun de vérifier que le poste convient, avec une rupture plus simple
   - À prolonger les vacances
3. Un contrat de travail lie…
   - deux entreprises
   - un vendeur et un acheteur
   - deux clients
   - ✔ un employeur et un salarié

**Situation de transfert :** Une entreprise embauche une personne pour remplacer une salariée en congé maternité pendant six mois.

> Quel type de contrat est le plus adapté, et pourquoi ?

*Réponse attendue :* Un CDD : le besoin est temporaire, avec une fin prévisible (le retour de la salariée).

**Rappel à J+2**

1. CDI signifie…
   - contrat de droit international
   - contrat d'insertion
   - contrat de durée imposée
   - ✔ contrat à durée indéterminée
2. Pendant la période d'essai, la rupture du contrat est…
   - ✔ plus simple qu'après
   - interdite
   - automatique
   - payante
3. Un CDD prend fin…
   - ✔ à la date ou à l'événement prévu
   - au bout d'un jour
   - jamais
   - quand le salarié le décide seul

**Reformulation, idée centrale :** Le contrat de travail fixe la relation entre employeur et salarié ; le CDD a une fin prévue, le CDI non, et la période d'essai permet de vérifier que tout convient.

**Éléments clés :** CDD temporaire, CDI sans fin prévue ; rôle de la période d'essai

## S19 · Le RGPD

*Domaine : droit, numérique*

**Glossaire (termes à surveiller) :** RGPD, donnée personnelle, consentement, responsable de traitement, droit d'accès, droit à l'effacement

**Compréhension immédiate**

1. Lequel de ces éléments est une donnée personnelle ?
   - Le prix d'un pain
   - La température du jour
   - ✔ Une adresse e-mail nominative
   - Le nom d'une ville seule
2. Le droit d'accès permet à une personne de…
   - ✔ savoir quelles données une organisation détient sur elle
   - voir les comptes de l'entreprise
   - accéder à tous les sites
   - lire les données des autres
3. Pourquoi une entreprise doit-elle indiquer à quoi serviront les données qu'elle collecte ?
   - ✔ Pour que la personne sache et puisse décider en connaissance de cause
   - Pour payer moins d'impôts
   - Pour faire de la publicité
   - Ce n'est pas obligatoire

**Situation de transfert :** Une boulangerie demande l'adresse e-mail de ses clients pour leur envoyer une carte de fidélité numérique.

> Que doit-elle faire pour respecter le RGPD ?

*Réponse attendue :* Dire à quoi servira l'adresse, ne l'utiliser que pour cela (ou demander l'accord pour la publicité), la protéger et permettre de la supprimer sur demande.

**Rappel à J+2**

1. Le RGPD protège…
   - les brevets
   - les prix
   - les routes
   - ✔ les données personnelles
2. Le droit à l'effacement permet de…
   - oublier son mot de passe
   - ✔ demander la suppression de ses données
   - effacer une facture
   - supprimer un site
3. Une donnée personnelle permet…
   - de calculer un prix
   - de mesurer la météo
   - de rien
   - ✔ d'identifier une personne, directement ou non

**Reformulation, idée centrale :** Le RGPD encadre l'usage des données qui identifient une personne : on doit l'informer, n'utiliser ses données que pour un but annoncé et respecter ses droits.

**Éléments clés :** données qui identifient une personne ; information et droits (accès, effacement)

## S20 · La chaîne du froid

*Domaine : hygiène*

**Glossaire (termes à surveiller) :** chaîne du froid, denrée périssable, température, rupture de la chaîne du froid, bactérie, décongélation

**Compréhension immédiate**

1. Pourquoi garde-t-on la viande au froid ?
   - Pour changer son goût
   - ✔ Le froid ralentit le développement des bactéries
   - Le froid tue toutes les bactéries
   - Pour qu'elle soit plus lourde
2. Une « rupture de la chaîne du froid », c'est…
   - une panne de courant de la maison
   - ✔ un moment où le produit n'est plus gardé à la bonne température
   - un produit trop froid
   - un produit congelé deux fois au magasin
3. Pourquoi ne faut-il pas recongeler un produit décongelé ?
   - ✔ Les bactéries ont pu se multiplier pendant la décongélation
   - Il deviendrait trop dur
   - C'est interdit pour le goût
   - Il changerait de couleur

**Situation de transfert :** Après les courses, des surgelés restent deux heures dans le coffre d'une voiture en plein été.

> Quel est le risque, et que faut-il faire ?

*Réponse attendue :* Ils ont pu commencer à décongeler (rupture de la chaîne du froid), et les bactéries se multiplient : il ne faut pas les recongeler ; en cas de doute sur leur température, il faut les jeter.

**Rappel à J+2**

1. Quel est l'effet du froid sur les bactéries des aliments ?
   - les nourrit
   - ✔ ralentit les bactéries
   - n'a aucun effet
   - tue toutes les bactéries
2. Un produit décongelé doit être…
   - laissé au soleil
   - ✔ consommé rapidement, sans être recongelé
   - recongelé aussitôt
   - gardé un mois
3. La chaîne du froid concerne…
   - seulement le congélateur de la maison
   - seulement le magasin
   - seulement le camion
   - ✔ tout le trajet du produit, de la fabrication à l'assiette

**Reformulation, idée centrale :** Un produit périssable doit rester au froid sans interruption de sa fabrication à sa consommation, car le froid ralentit les bactéries.

**Éléments clés :** froid continu sur tout le trajet ; rupture = multiplication des bactéries

## P-R1 · Ouverture et fermeture du magasin (R1 v2, corpus métier n° 1, fictif)

*Domaine : commerce de détail*

**Glossaire (termes à surveiller) :** fond de caisse, télésurveillance, issues de secours, défibrillateur, enveloppe scellée, coffre

**Compréhension immédiate**

1. Combien de personnes au minimum doivent être présentes pour ouvrir le magasin ?
   - Aucune règle
   - Trois
   - ✔ Deux
   - Une
2. Combien de temps as-tu pour désactiver l'alarme en arrivant ?
   - 45 secondes
   - ✔ 30 secondes
   - 2 minutes
   - Pas de limite
3. Le voyant du défibrillateur n'est pas vert à l'ouverture. Que fais-tu ?
   - Je débranche l'appareil
   - ✔ Je préviens le responsable avant d'ouvrir
   - Je ne fais rien
   - J'ouvre et je verrai plus tard

**Situation de transfert :** Un dimanche soir, ton collègue doit partir plus tôt et te propose de fermer seul.

> Que dit la procédure, et que fais-tu ?

*Réponse attendue :* La fermeture se fait toujours à deux (comptage et sortie) : je ne ferme pas seul et je préviens le responsable.

**Rappel à J+2**

1. Le fond de caisse compté à l'ouverture est de…
   - 150 €
   - 100 €
   - ✔ 200 €
   - 300 €
2. L'alarme se déclenche par erreur. Qui appelles-tu ?
   - ✔ La télésurveillance, au numéro affiché dans le bureau
   - La police
   - Un client
   - Personne
3. Le comptage des caisses le soir se fait…
   - ✔ à deux personnes
   - le lendemain
   - seul
   - par un client

**Reformulation, idée centrale :** On ouvre et on ferme toujours à deux, en sécurisant l'alarme, les issues et l'argent à chaque étape.

**Éléments clés :** jamais seul (ouverture, comptage, fermeture) ; contrôles de sécurité : alarme 30 s, issues, défibrillateur

## P-H1 · Réception des livraisons (H1 v2, corpus métier n° 1, fictif)

*Domaine : hôtellerie-restauration*

**Glossaire (termes à surveiller) :** thermomètre sonde, date limite de consommation, bon de livraison, traçabilité, chambre froide, tolérance

**Compréhension immédiate**

1. Une livraison de viande hachée arrive à + 4 °C. Que fais-tu ?
   - ✔ Je refuse le produit, je l'écris sur le bon et je préviens le chef
   - Je l'accepte, c'est presque bon
   - Je la mets au congélateur
   - Je la goûte
2. Qui peut réceptionner une livraison de boissons ?
   - Le livreur seul
   - ✔ Le chef ou son second
   - N'importe quel commis
   - Un client
3. Dans quel délai ranges-tu les produits acceptés en chambre froide ?
   - 30 minutes
   - ✔ 15 minutes
   - En fin de service
   - 1 heure

**Situation de transfert :** Pendant le déchargement, un carton de glaces affiche – 16 °C en surface ; il était à – 18 °C dans le camion.

> Acceptes-tu le carton ? Justifie avec la procédure.

*Réponse attendue :* Oui, si c'est bref et pendant le déchargement : un écart de 3 °C au plus en surface est admis ; je le range vite au froid.

**Rappel à J+2**

1. Il doit rester au moins combien de jours avant la date limite pour les viandes et poissons ?
   - 7 jours
   - 1 jour
   - 3 jours
   - ✔ 4 jours
2. Pour un produit refusé, que faut-il en plus de la mention sur le bon ?
   - Rien
   - ✔ Photographier le thermomètre et le bon, et joindre les photos au registre
   - Appeler un client
   - Jeter le bon
3. Comment mesure-t-on la température d'un produit emballé ?
   - ✔ Sonde entre deux emballages, sans les percer
   - Avec un thermomètre de cuisine dans l'air
   - À la main
   - En perçant l'emballage

**Reformulation, idée centrale :** À la réception, le chef ou son second contrôle températures, dates et emballages, refuse ce qui n'est pas conforme en gardant une preuve, et range vite au froid.

**Éléments clés :** contrôles et seuils de température ; refus documenté (bon, photos) et rangement en 15 minutes

## P-R3 · Tenue de la caisse (R3, corpus métier n° 1, fictif)

*Domaine : commerce de détail*

**Glossaire (termes à surveiller) :** fond de caisse, plafond de paiement en espèces, détecteur de faux billets, prélèvement, fiche d'écart, domicile fiscal

**Compréhension immédiate**

1. Un client domicilié en France veut payer 1 200 € en espèces. Que fais-tu ?
   - J'accepte
   - J'appelle la police
   - ✔ Je refuse le paiement en espèces au-delà de 1 000 € et je propose un autre moyen
   - Je demande la moitié en pièces
2. Un client veut payer 30 € uniquement en pièces de 1 centime. Es-tu obligé d'accepter ?
   - Oui, toujours
   - ✔ Non, pas plus de 50 pièces pour un même paiement
   - Non, jamais de pièces
   - Oui, si c'est le matin
3. Ton tiroir contient 900 € en espèces. Que se passe-t-il ?
   - Tu rends l'argent aux clients
   - Tu fermes la caisse
   - ✔ Le responsable fait un prélèvement vers le coffre
   - Tu continues sans rien faire

**Situation de transfert :** Le détecteur signale qu'un billet de 50 € est douteux ; le client s'énerve et réclame son billet.

> Que fais-tu, et pourquoi ?

*Réponse attendue :* Je reste courtois et je n'accuse pas le client ; le billet présumé faux ne doit pas être remis en circulation (il n'est jamais rendu en monnaie) ; j'appelle le responsable, qui le remet à la Banque de France, à un commissariat ou à une gendarmerie.

**Rappel à J+2**

1. Le fond de caisse est de…
   - 50 €
   - 150 €
   - ✔ 200 €
   - 800 €
2. Au-delà de quel écart en fin de journée faut-il une fiche signée ?
   - 1 €
   - ✔ 10 €
   - 50 €
   - Aucun écart n'est noté
3. À partir de quelle valeur vérifie-t-on les billets au détecteur ?
   - 100 € seulement
   - Tous les billets
   - ✔ 50 € et plus
   - Jamais

**Reformulation, idée centrale :** La caisse se tient avec des règles d'argent strictes : plafonds en espèces, vérification des billets, prélèvements et écarts tracés.

**Éléments clés :** règles légales (1 000 €, 50 pièces, billet suspect) ; règles internes (prélèvement, fiche d'écart)

