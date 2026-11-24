# Mission 3a : récapitulatif des corrections du 2026-11-23 (avant la dernière validation)

Corrections demandées en 4 points après la seconde relecture. Fichiers modifiés :
- sources : `sujets-1.json`, `sujets-2.json`, `procedures.json` ;
- génération : `assembler.js`, et les fichiers générés `jeu-de-mesure.json` et `.md` ;
- grille : `grille-reformulation.md` (partie 2) ;
- protocole : `../protocole-mission-3a.md` ;
- contrôles : `../../tests/jeu-de-mesure.js`.

**Non modifiés :** le moteur pédagogique et tout le code d'Arbor ; les situations de transfert ; les reformulations
attendues ; les glossaires.
**Non lancés :** aucune mesure. **Mission 2d :** branche en pause, aucune modification.

Les contrôles du jeu de mesure s'appellent désormais **J1 à J29** (ils s'appelaient A1 à A15). Les anciens noms se
confondaient avec les mesures techniques A1 à A6 du protocole.

## Point 1 : biais de longueur

**Avant :** la bonne réponse était strictement le choix le plus long dans 145 questions sur 207 (70 %), et parmi les
plus longs dans 167 (81 %). Un participant qui choisit toujours la réponse la plus longue aurait réussi sans
comprendre.

**Méthode :**
- Les choix de **184 questions sur 207** ont été réécrits. Les 23 autres étaient déjà équilibrées (réponses chiffrées
  de même longueur, par exemple « 121 € / 120 € / 110 € / 200 € »).
- La bonne réponse garde le même sens. Elle a parfois été raccourcie, sans perdre ce qui la rend juste.
- Les mauvaises réponses ont été allongées et rendues **plausibles** : ce sont des idées fausses courantes plutôt que
  des absurdités (« Le froid tue toutes les bactéries présentes », « Je l'accepte : la limite des viandes est de
  + 4 °C »).

**Après :**

| | Avant | Après | Hasard |
|---|---|---|---|
| Bonne réponse strictement la plus longue | 145 sur 207 (70,0 %) | **26 sur 207 (12,6 %)** | ≈ 25 % |
| Bonne réponse strictement la plus courte | 5 sur 207 (2,4 %) | **49 sur 207 (23,7 %)** | ≈ 25 % |
| Longueur moyenne bonne réponse / mauvaises | 1,93 (presque deux fois plus longue) | **0,94** | 1 |

Le détail par bloc est dans le tableau « Bilan : longueur des réponses » de `jeu-de-mesure.md`. Le rappel à J+2 est à
6,5 % de bonnes réponses les plus longues, la compréhension immédiate à 15,9 % et le déblocage à 19,6 %.

**Difficulté et justesse :**
- Aucune bonne réponse n'a changé de sens. Les 30 réponses chiffrées sont recalculées automatiquement (J25).
- **Limite honnête :** des mauvaises réponses plausibles rendent sans doute certaines questions **un peu plus
  difficiles** qu'avant, surtout là où elles étaient absurdes (« Il fait jour », « Pour qu'elle soit plus lourde »).
  Les anciennes questions étaient faciles pour une mauvaise raison (l'indice de longueur, les choix absurdes).
- La difficulté réelle ne peut se mesurer qu'avec des personnes. Je ne l'ai pas estimée.

**Contrôles automatiques ajoutés :**

| Contrôle | Règle |
|---|---|
| J16 | bonne réponse strictement la plus longue dans **10 % à 35 %** des questions |
| J17 | bonne réponse strictement la plus courte dans **10 % à 35 %** : le biais ne doit pas s'inverser, sinon « ne jamais prendre la plus longue » deviendrait un nouvel indice |
| J18 | longueur moyenne bonne réponse / mauvaises **entre 0,85 et 1,15** |
| J19 | dans chaque bloc (compréhension, rappel, déblocage), bonne réponse la plus longue dans **35 % au plus** |
| J20 | aucune bonne réponse nettement plus longue que toutes les autres (plus de 1,5 fois **et** plus de 15 signes) |

## Point 2 : questions « pourquoi » des procédures

Les trois procédures fictives écrivent des règles, **jamais leurs raisons**. Les 6 questions « pourquoi » attendaient
donc des justifications non écrites. Elles sont remplacées par des questions d'application, dont la réponse découle
d'une phrase de la procédure.

Ces 6 questions sont marquées ✱ dans le tableau. Les 5 autres lignes sont des questions d'application remplacées parce
que leur réponse n'était pas, ou pas entièrement, écrite dans la procédure (P-R1.r4 a été changée en même temps que
P-R1.c1, pour éviter deux questions semblables).

| Question | Avant | Après | Appui dans la procédure |
|---|---|---|---|
| P-R1.c1 ✱ | Pourquoi être au moins deux pour ouvrir ? | Il est 9 h 05, tu es seul, ton collègue arrive à 9 h 20 : que fais-tu ? | « Le magasin est ouvert par deux personnes au minimum, présentes dès 9 h 00. » |
| P-R1.r4 | Collègue en retard : « j'attends… et je préviens le responsable » (prévenir le responsable n'était pas écrit) | Il est 18 h 45 : quelle étape de la fermeture ? | « Annoncer la fermeture aux clients 15 minutes avant. » « Fermer les portes à 19 h 00… » |
| P-R1.d2 ✱ | Pourquoi compter la caisse à deux ? | Tu as compté seul : est-ce conforme ? | « Compter les caisses à deux personnes… » |
| P-H1.c3 ✱ | Pourquoi ranger en 15 minutes ? | Volaille à + 3 °C : que fais-tu ? (accepter, ranger sous 15 min) | « Viandes de volaille… : + 4 °C. » « Ranger les produits acceptés… dans les 15 minutes. » |
| P-H1.r4 | Poisson à 2 jours de la date limite : « je le refuse » (le refus n'est écrit que pour la température) | Saumon frais à + 3 °C : que fais-tu ? | « Produits de la pêche frais : + 2 °C. » et la règle de refus |
| P-H1.d1 | Yaourts écrasés : « je refuse… photo » (refus pour emballage non écrit) | Préparations élaborées à + 5 °C : que fais-tu ? | « Préparations culinaires… : + 3 °C. », règle de refus, règle des photos |
| P-H1.d2 ✱ | Pourquoi garder une photo ? | Livraison de boissons, seul un commis est là : que fait-il ? | « …par le chef ou son second. » « Cette règle vaut pour toutes les livraisons, boissons… comprises. » |
| P-R3.c3 ✱ | Pourquoi un prélèvement ? | Tiroir à 850 € : que se passe-t-il ? | « Quand le tiroir contient plus de 800 €… prélèvement vers le coffre. » |
| P-R3.d1 | Billet de 20 € douteux (réponse trop proche du transfert) | Client au domicile fiscal à l'étranger, 1 500 € en espèces | « Pour un client dont le domicile fiscal est à l'étranger, le plafond est plus élevé : appeler le responsable. » |
| P-R3.d2 ✱ | Pourquoi un faux billet n'est pas rendu ? (sa réponse aurait aussi donné un indice pour le transfert) | Session de caisse laissée ouverte pour un collègue : est-ce conforme ? | « …ne laisse jamais sa session ouverte. » |

**Autres changements dans les procédures :**
- Toutes les autres questions des procédures sont gardées, avec des choix réécrits.
- Les choix qui ajoutaient une action non écrite ont été retirés. Par exemple, « je propose un autre moyen de
  paiement » ne figure plus dans la bonne réponse de P-R3.c1.
- **Chaque question et chaque situation de transfert des procédures cite maintenant sa phrase d'appui** (champ
  `source`), affichée sous « Appui dans la procédure ». Le contrôle J26 vérifie que chaque phrase existe mot pour mot
  dans la procédure du corpus.
- Le contrôle J27 interdit toute question « pourquoi » dans les procédures.
- Conséquence : le déblocage des procédures compte **2 questions d'application** (au lieu de 1 application et 1
  compréhension), puisqu'aucune raison n'y est écrite. Les sujets gardent 1 application et 1 compréhension.

## Point 3 : critères de classement du déblocage

**Pour chacune des 46 questions de déblocage** (champ `criteres`, affiché dans `jeu-de-mesure.md`) :
- **la raison attendue** : ce que la justification doit contenir pour être juste ;
- un exemple **juste**, un exemple **insuffisant** (qui répète la réponse ou reste vague) et un exemple **faux** (avec
  une erreur de fond).

**Notation** (`grille-reformulation.md`, partie 2) :
- Chaque question est notée **2** (bon choix et raison juste), **1** (bon choix sans raison juste) ou **0** (mauvais
  choix, ou bon choix avec une raison fausse).
- Décision sur la somme des 2 questions : **débloqué** à 3 ou 4 ; **partiellement débloqué** à 2 ; **non débloqué** à 0
  ou 1. C'est la même décision que la grille précédente, rendue explicite.

**Ordre de passage :** le déblocage se fait **après** la reformulation et le transfert, pour que la seconde explication
ne donne pas d'indice sur le transfert.

**Procédures :** une raison vraie mais non écrite dans la procédure est notée **insuffisante**, pas fausse.

Exemple (S07, déblocage 1, salade éclairée 4 h au lieu de 12) :
- raison attendue : moins de lumière, donc moins de photosynthèse, donc moins de sucre fabriqué pour grandir ;
- juste : « Avec moins de lumière elle fabrique moins de nourriture, donc elle pousse moins. » ;
- insuffisant : « Elle a moins de lumière. » ;
- faux : « Elle poussera moins car elle aura moins d'eau. »

## Point 4 : cohérence entre questions, réponses et classements

**Contrôles ajoutés :**

| Contrôle | Ce qu'il vérifie |
|---|---|
| J21 | une question « pourquoi » est classée **compréhension** |
| J22 | une phrase à compléter sans cas chiffré (« Le capital, c'est… ») est classée **restitution** |
| J23 | une question de décision (« Que fais-tu ? », « Est-ce conforme ? ») est classée **application** |
| J24 | dans un même élément, deux questions n'ont jamais la même bonne réponse (pas de question redondante) |
| J25 | **30 réponses recalculées** : Pythagore, fractions, intérêts composés, inflation, TVA, piles en série, décalage de lettres, et seuils des procédures (températures, plafonds, 800 €, 10 €, 50 pièces, 19 h − 15 min) |
| J26 | appui des procédures présent mot pour mot dans la procédure |
| J27 | aucune question « pourquoi » dans les procédures |
| J28 | critères de déblocage complets et distincts pour les 46 questions |
| J29 | pas de critères de justification hors du déblocage |

**Écarts trouvés et corrigés grâce à ces règles :**
- S09.c2 (ADN dans un cheveu) et S10.c3 (bébé et vaccination des autres) : questions « pourquoi » classées application,
  reclassées **compréhension** sans changer l'énoncé.
- S08.d1, S10.d1, S11.c2 : questions « pourquoi » classées application. Réécrites en vraies questions d'application :
  un voyageur face à un microbe inconnu ; quand se faire vacciner avant une épidémie annoncée ; où étendre son linge.
- S13.d1 : « un objet pèserait… » sans cas précis. Réécrite avec un cas chiffré : planète deux fois plus massive, sac
  de 10 kg.

**Vérification que les contrôles détectent bien les défauts :** j'ai introduit 6 défauts volontaires dans une copie des
sources, puis lancé les contrôles. Les 6 défauts ont tous été signalés :
- un calcul faux (121 € remplacé par 122 €) : détecté par J25 ;
- une question « pourquoi » classée application : J21 ;
- 60 bonnes réponses allongées : J16, J18, J19 et J20 ;
- un critère de déblocage manquant : J28 ;
- une phrase d'appui modifiée (« + 3 °C » au lieu de « + 2 °C ») : J26 ;
- une question « pourquoi » dans une procédure : J21 et J27.

Les sources ont ensuite été remises en état.

## Ce que les contrôles ne prouvent pas
- J21 à J23 sont des **règles de cohérence de surface** : elles repèrent des incohérences évidentes, elles ne prouvent
  pas qu'un classement est juste. Votre relecture reste la validation.
- J25 ne couvre que les réponses chiffrées ou à seuil. L'exactitude des autres réponses (biologie, droit, économie)
  repose sur la relecture humaine. Aucun contrôle automatique ne peut la garantir.
- Les critères de déblocage sont **à étalonner** : avant la mesure, les deux correcteurs notent à blanc quelques
  justifications fabriquées, comme pour la reformulation.

## Vérifications techniques
- `node docs/pedagogie/assembler.js` : jeu régénéré (23 éléments, 207 questions).
- `node tests/jeu-de-mesure.js` : **29 contrôles sur 29 passés** (J1 à J29).
- Ces contrôles vérifient la structure et la cohérence du matériel, pas sa valeur pédagogique.
