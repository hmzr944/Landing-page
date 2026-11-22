# Mission 3a : récapitulatif des corrections du 2026-11-22 (seconde validation)

Corrections demandées en 7 points après la première relecture. Fichiers concernés : `sujets-1.json`,
`sujets-2.json`, `procedures.json` (sources), `assembler.js` (génération), `jeu-de-mesure.json` et `.md` (générés),
`grille-reformulation.md`, `../protocole-mission-3a.md`, `../../tests/jeu-de-mesure.js`.

**Non modifiés :** le moteur pédagogique et tout le code d'Arbor. **Non lancés :** aucune mesure, ni technique ni avec
des participants.

## Point 1 : compréhension immédiate et rappel à J+2
**Avant :** 69 questions de compréhension, dont une grande part de restitution (définitions). Le classement
« évalue » était deviné par une heuristique (mots « pourquoi », « que fais-tu »), donc inexact.

**Après :**
- Chaque question porte un classement **explicite**, écrit dans les sources et relu : application, compréhension ou
  restitution. L'heuristique de `assembler.js` est supprimée.
- **Compréhension immédiate : au moins 2 questions sur 3** en application ou compréhension, dans chaque élément.
  Bilan : 28 application, 39 compréhension, 2 restitution (les 2 restitutions sont dans P-R1 et P-H1, où un chiffre ou
  un rôle de la procédure doit être su).
- **Rappel à J+2 : 4 questions au lieu de 3.** Les 3 premières restent de la restitution : elles mesurent la
  mémorisation, comme demandé. La 4e est une question d'application nouvelle. Les deux scores sont rapportés
  séparément (mémorisation sur 3, application sur 1).
- Contrôles automatiques ajoutés : A12 (classement présent), A13 (au moins 2/3 en compréhension immédiate), A14 (rappel
  = 3 restitutions + 1 application).

**Questions modifiées, par élément** (c = compréhension immédiate, r = rappel ; entre crochets, le classement) :

| Élément | Questions modifiées ou ajoutées |
|---|---|
| S01 IP | c2 [application] « Un routeur reçoit un paquet adressé à un ordinateur situé dans un autre pays. Que fait-il ? » ; c3 [compréhension] « Un câble est coupé sur le trajet habituel, mais la vidéo continue d'arriver. Pourquoi ? » ; r4 [application] paquets arrivés dans le désordre |
| S02 RAM | c2 [compréhension] ralentissement avec beaucoup de programmes ; c3 [application] où enregistrer des photos à garder des années ; r4 [application] 30 onglets ouverts, disque presque vide |
| S03 Chiffrement | c1 choix revus ; c2 [application] clé volée ; c3 [compréhension] méthode connue de tous, qu'est-ce qui garde le secret ; r4 [application] chiffrer « OUI » avec un décalage de 1 |
| S04 Pythagore | c2 [compréhension] pourquoi pas sans angle droit ; c3 [application] le triangle 5, 12, 13 est-il rectangle ; r4 [application] côtés 6 et 8 (déplacée du rappel) |
| S05 Fractions | c2 [compréhension] pourquoi 1/4 < 1/2 alors que 4 > 2 ; c3 choix revus ; r4 [application] 2/6 contre 1/3 d'une tarte |
| S06 Intérêts composés | c2 [compréhension] pourquoi 121 € et non 120 € ; c3 choix revus ; r4 [application] 100 € à 50 % sur 2 ans (déplacée) |
| S07 Photosynthèse | c1 [compréhension] plante dans un placard ; c2 [application] plante loin de la fenêtre ; c3 [compréhension] d'où vient la matière d'un arbre ; r4 [application] bulles dans un aquarium |
| S08 Immunité | c1 [compréhension] varicelle une seule fois ; c2 [compréhension] anticorps grippe contre varicelle ; c3 [application] coupure rouge et chaude ; r4 [application] deux enfants, même virus |
| S09 ADN | c1 [compréhension] ressemblance aux deux parents ; c2 [application] ADN dans un cheveu ; c3 [compréhension] vrais jumeaux ; r4 [application] trace ADN et deux suspects |
| S10 Vaccin | c1, c2, c3 reformulées (voir point 6) ; r4 [application] rappel non fait |
| S11 Cycle de l'eau | c1 [compréhension] gouttes sur un verre froid ; c2 [application] linge au vent ; c3 [compréhension] flaque qui disparaît ; r4 [application] bouteille sortie du réfrigérateur |
| S12 Effet de serre | c1 [compréhension] Terre sans effet de serre ; c3 [application] bus électriques ; r4 [application] trajet quotidien en voiture |
| S13 Gravitation | c2 [compréhension] pourquoi on pèse moins sur la Lune ; c3 [application] balance et masse sur la Lune ; r4 [application] sac de 10 kg sur Mars |
| S14 Électricité | c1, c3 (voir point 6) ; c2 [compréhension] circuit ouvert ; r4 [application] interrupteur ouvert |
| S15 Inflation | c2 [compréhension] pourquoi on achète moins ; c3 [application] salaire + 2 %, prix + 5 % ; r4 [application] prix des fraises seul |
| S16 Offre et demande | c1 [application] récolte de tomates ; c2 [compréhension] produit rare ; c3 [compréhension] prix d'équilibre ; r4 [application] ventilateurs en été |
| S17 TVA | c2 [compréhension] qui supporte la TVA ; c3 [application] 60 € TTC → HT ; r4 [application] 50 € HT (déplacée) |
| S18 Contrat de travail | c1, c2 (voir point 6) ; c3 [application] démission et préavis ; r4 [application] renfort des fêtes |
| S19 RGPD | c1 choix revus ; c2 [compréhension] pourquoi annoncer l'usage ; c3 [application] droit d'accès ; r4 [application] vente des numéros |
| S20 Chaîne du froid | c1 choix revus ; c2 [compréhension] recongeler tel quel ; c3 [application] ordre des courses ; r4 [application] réfrigérateur resté ouvert |
| P-R1 | c1 [compréhension] pourquoi ouvrir à deux ; r4 [application] collègue en retard à l'ouverture |
| P-H1 | c3 [compréhension] pourquoi ranger en 15 minutes ; r4 [application] poisson à 2 jours de la date limite |
| P-R3 | c3 [compréhension] pourquoi un prélèvement ; r4 [application] écart de 15 € |

## Point 2 : déblocage
- **2 questions préparées à l'avance** pour chaque élément (champ `deblocage`) : 1 d'application, 1 de compréhension
  (46 questions), différentes de toutes les autres questions (contrôles A4, A6, A15).
- Chacune est suivie d'une phrase de justification.
- **Grille de décision** (`grille-reformulation.md`, partie 2) : **débloqué** = 2/2 justes et au moins une
  justification juste ; **partiellement** = 2/2 sans justification juste, ou 1/2 avec sa justification ; **non
  débloqué** sinon. La justification évite de compter le hasard (6 % de chances d'avoir 2/2 au hasard).

## Point 3 : définitions opérationnelles A1, A2, A6
Protocole, section 2.
- Chaque mesure a une définition qui **fait foi**, appliquée par une personne. L'heuristique lexicale ne fait qu'une
  pré-classification.
- **A1** : une situation doit être concrète **et** reliée à la notion. « Par exemple » suivi d'une liste de noms ne
  compte pas.
- **A2** : un sigle développé ou un synonyme technique n'est pas une explication.
- **A6** : un changement de méthode doit apporter un **contenu nouveau** qui vise la confusion exprimée. « Imaginons »
  suivi du même contenu est une répétition.
- **Contrôle manuel conservé (20 %)**, tiré au sort, stratifié, avec une graine publiée avant la production des
  textes ; **100 % pour A6** (69 réponses).
- Deux annotateurs indépendants, dont l'accord est publié.
- **Journal des erreurs des heuristiques** : faux positifs, faux négatifs et leur cause ; matrice de confusion,
  précision et rappel.
- **Règle fixée à l'avance :** une heuristique de précision ou de rappel inférieur à 0,8 n'est pas utilisée pour les
  résultats globaux.

## Point 4 : grille de reformulation
- **Règle « 8 mots identiques = recopie » supprimée.**
- Le critère « mots à soi » devient **C4 Explication par soi-même** : lien de cause (parce que, donc, sinon) ou exemple,
  image, comparaison personnelle juste.
- Reprendre une expression d'Arbor n'est ni pénalisé ni récompensé. Le correcteur ne voit pas le texte d'Arbor.
- Notes entières 0-1-2 par critère, total sur 8 (au lieu de 0 / 0,5 / 1 sur 4).
- **Accord :** pourcentage d'accord exact et **kappa de Cohen pondéré quadratique**, par critère, sur le total et sur la
  décision de déblocage ; corrélation intra-classe en complément pour le total. L'intervalle de confiance est publié.
- **Notes individuelles figées avant toute discussion**, seules utilisées pour l'accord. Les notes d'après discussion
  sont conservées à part.
- 4 copies d'ancrage **fabriquées** (sujet S20), pour étalonner les correcteurs.

## Point 5 : répartition 3a / 3b
Protocole, section 4.
- **Deux moitiés de 10 sujets**, de même composition par domaine : la moitié 1 sert à 3a, la moitié 2 à 3b.
- Personne ne voit deux fois le même sujet, ni la même procédure.
- **En 3b**, chaque personne voit les deux moteurs **en alternance** (actuel, nouveau… ou l'inverse selon le code), sans
  savoir lequel.
- Chaque sujet est expliqué par les deux moteurs selon les personnes.
- **Table d'affectation P01 à P08 fixée avant les séances** ; le déséquilibre restant est publié.
- L'amélioration se juge **à l'intérieur de 3b** (chaque personne est son propre témoin). La comparaison entre 3a et 3b
  ne sert qu'à vérifier la stabilité du moteur actuel.

## Point 6 : contenus revus

| Sujet | Avant | Après | Raison |
|---|---|---|---|
| S10 Vaccin | « microbe rendu inoffensif ou une partie de celui-ci » | « un élément du microbe (ou de quoi le fabriquer) » ; nouveau transfert : une personne vaccinée attrape la maladie de façon légère (« aucun vaccin ne protège à 100 % ») | couvre aussi les vaccins à ARN ; corrige l'idée d'une protection totale |
| S14 Électricité | l'analogie de l'eau présentée comme un fait (« la tension ressemble à… ») ; « tension = ce qui pousse » | l'analogie est annoncée comme une image (« on compare souvent… dans cette image ») ; une question de déblocage porte sur sa **limite** ; tension = « ce qui fait circuler (différence entre deux points) » | éviter que l'image soit prise pour la réalité |
| S18 Contrat de travail | « le CDD a une date de fin » | « une fin prévue : date **ou événement** » (par exemple le retour d'une salariée remplacée) ; préavis de démission « prévu par le contrat, la convention ou l'usage » | exactitude juridique (CDD à terme imprécis) |
| S19 RGPD | « demander l'accord pour la publicité » ; donnée personnelle = « identifie une personne » | autre usage : informer et respecter le **droit de refuser** ; donnée personnelle : identifie une personne « **directement ou non** » ; but « annoncé et légitime » ; un nouvel usage demande une base légale | le consentement n'est pas la seule base légale ; la simplification était trompeuse |
| S20 Chaîne du froid | « le froid ralentit les bactéries » ; « ne pas recongeler » | « ralentit **la plupart** des bactéries, sans les tuer » ; « ne pas recongeler **tel quel** », une question explique pourquoi la cuisson permet de recongeler | exactitude (la recongélation après cuisson est admise) |
| P-R1 | une question de déblocage situait le tour des issues de secours le soir | le tour de sécurité est fait **le matin**, avant l'ouverture, comme dans la procédure R1 | conformité au corpus |

## Point 7 : données des participants
Protocole, section 6, et annexe A.
- **Consentement explicite écrit**, avec un formulaire proposé. La personne peut se retirer à tout moment.
- **Minimisation :** ni nom, ni e-mail, ni âge, ni profession sur les réponses. Les séances se font avec des comptes de
  test, supprimés ensuite.
- Le formulaire signale l'envoi au fournisseur d'IA de ce qui est tapé dans le dialogue.
- **Stockage restreint et pseudonymisé, hors du dépôt.**
- La **clé de correspondance** est gardée à part, par une personne qui ne corrige pas.
- **Conservation :** la clé et les coordonnées sont détruites au plus tard à 6 mois, les réponses à 12 mois. Chaque
  destruction est datée.
- **Dans le dépôt : agrégats et notes par code uniquement. Jamais de réponse brute.**

## Ce qui reste à décider ou à corriger
1. **Biais découvert pendant cette correction, non corrigé :** dans **167 questions sur 207 (81 %)**, la bonne réponse
   est le choix le plus long (ou l'un des plus longs). Un participant pourrait réussir sans comprendre.
   - Correction proposée avant toute mesure : réécrire les mauvaises réponses pour qu'elles aient la même longueur et
     la même précision.
   - Ajouter un contrôle automatique (par exemple, bonne réponse la plus longue dans au plus 35 % des questions).
   - Je ne l'ai pas fait sans votre accord : cela touche les 207 questions.
2. Dans P-R1, P-H1 et P-R3, les questions « pourquoi » (ouvrir à deux, ranger en 15 minutes, prélèvement) portent sur
   des **raisons que la procédure fictive n'écrit pas**. La bonne réponse est raisonnable, mais elle n'est pas dans le
   texte expliqué. À valider, ou à remplacer par des questions d'application.
3. Les **bonnes réponses aux justifications de déblocage** (« raison attendue » pour chaque question) restent à écrire
   dans les notes des correcteurs.
4. Noms des correcteurs, des annotateurs et de la personne qui garde la clé ; espace de stockage privé ; contact du
   formulaire.

## Vérifications techniques faites
- `node docs/pedagogie/assembler.js` : jeu régénéré (23 éléments, 207 questions).
- `node tests/jeu-de-mesure.js` : 15 contrôles sur 15 passés (A1 à A15).
- Ces contrôles vérifient la **structure** du matériel, pas sa qualité pédagogique. Votre relecture reste la seule
  validation.
