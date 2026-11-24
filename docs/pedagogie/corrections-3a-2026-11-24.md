# Mission 3a : récapitulatif des corrections du 2026-11-24 (avant le gel du protocole)

Cinq points relevés à la relecture du 2026-11-24. Seuls ces points ont été traités.

**Fichiers modifiés :**
- sources : `sujets-1.json`, `sujets-2.json`, `procedures.json` ;
- génération : `assembler.js`, et les fichiers générés `jeu-de-mesure.json` et `.md` ;
- grille : `grille-reformulation.md` ;
- protocole : `../protocole-mission-3a.md` ;
- contrôles : `../../tests/jeu-de-mesure.js`.

**Non modifiés :** le moteur pédagogique et tout le code d'Arbor ; les questions à choix, sauf S20.r4. **Non lancé :**
aucune mesure. **Mission 2d :** branche en pause, aucune modification.

## Point 1 : sources des transferts des procédures

**Constat confirmé.** Les phrases d'appui des trois transferts étaient enregistrées dans `jeu-de-mesure.json`, et
vérifiées par J26, mais `assembler.js` ne les affichait pas dans la version lisible. Le récapitulatif du 23 novembre
était donc vrai pour les données, faux pour le document que vous lisiez.

**Corrections :**
- La phrase exacte de la procédure est maintenant affichée sous chaque réponse attendue (« Appui dans la
  procédure »). J26 continue de vérifier qu'elle existe mot pour mot dans le document source.
- En relisant, j'ai aussi trouvé deux réponses attendues qui dépassaient leur appui. Elles sont réécrites pour ne
  contenir que ce que la procédure écrit :

| Transfert | Avant | Après | Appui |
|---|---|---|---|
| P-R1 (fermer seul un dimanche) | « …je ne ferme pas seul **et je préviens le responsable** » : prévenir le responsable n'était pas écrit | « Je ne ferme pas seul : la procédure impose de compter les caisses à deux personnes et de sortir à deux, et elle ne prévoit aucune exception pour le dimanche. » | « Compter les caisses à deux personnes… » « Activer l'alarme et sortir à deux. » |
| P-H1 (glaces à – 16 °C) | « …je le range vite au froid » : formulation vague | Écart de 2 °C (de – 18 à – 16), dans la tolérance de 3 °C au plus pendant le déchargement, sur une courte durée ; rangement en chambre froide dans les 15 minutes | les deux phrases sur les glaces et la tolérance, plus la règle de rangement en 15 minutes, ajoutée aux appuis |
| P-R3 (billet douteux) | inchangée sur le fond, remise dans l'ordre de la procédure | « Je reste courtois, je n'accuse pas le client et j'appelle le responsable ; je ne rends pas le billet… » | les trois phrases de la section « Billet présumé faux » |

## Point 2 : barème du transfert (B3)

**Nouvelle partie 2 de `grille-reformulation.md` : transfert (B3).** La partie déblocage devient la partie 3.

**Règle générale, sur 2 points :**
- **2** : la décision ou la conclusion **et** la raison sont justes, sans erreur de fond.
- **1** : un seul des deux éléments est juste, ou les deux avec une imprécision sans contresens.
- **0** : aucun des deux éléments, une erreur de fond (même à côté d'un élément juste), une simple récitation de la
  définition sans l'appliquer, ou pas de réponse.

**Règles de décision ajoutées :**
- **Calculs :** un bon résultat sans méthode vaut 1. Une étourderie visible dans un raisonnement écrit juste vaut 1.
  Un raisonnement faux vaut 0.
- **Procédures :** une raison vraie mais non écrite dans la procédure vaut au plus 1. Une règle inventée vaut 0.
- **Hésitation :** en cas de doute, le correcteur met la note la plus basse et signale son hésitation ; ces
  hésitations sont comptées.

**Pour chacune des 23 situations**, écrits à l'avance (champ `transfert.criteres`, affichés dans `jeu-de-mesure.md`) :
- l'élément 1, la décision attendue ;
- l'élément 2, la raison attendue ;
- un exemple de réponse à 2 points, à 1 point et à 0 point.

Exemple, P-R1 :
- 2 points : « Je refuse de fermer seul : la procédure dit de compter les caisses à deux et de sortir à deux, et elle
  ne prévoit pas d'exception le dimanche. »
- 1 point : « Je ne ferme pas seul, ce n'est pas prudent. »
- 0 point : « J'accepte : le dimanche, on peut fermer seul. »

**Double correction :** le transfert est noté par les deux correcteurs, en aveugle. L'accord est calculé sur leurs
notes individuelles (pourcentage d'accord exact et kappa pondéré). Toute note de transfert différente est relue
ensemble, comme pour la reformulation.

## Point 3 : question S20 sur le poisson

**Avant :** « Ton réfrigérateur est resté ouvert toute la nuit. Que faire du poisson frais qu'il contenait ? ». La
bonne réponse était « Le jeter s'il est resté au chaud ». Elle dépendait d'une information absente de l'énoncé.

**Après :** « Ton réfrigérateur est resté ouvert toute la nuit, **environ 8 heures**. Au matin, son thermomètre
indique **15 °C**. Que faire du poisson frais qu'il contenait ? »
- Bonne réponse : « Le jeter : il est resté des heures loin du froid ».
- Les mauvaises réponses : le recongeler, le garder deux jours, ou « le froid tuera les bactéries ». Cette dernière
  reprend une idée fausse visée par le sujet.
- J'ai évité la mauvaise réponse « le cuire et le manger ». Pour la réfuter, il faudrait savoir que la cuisson ne
  détruit pas certaines toxines du poisson, ce que l'explication n'enseigne pas. Elle aurait été injuste.

J'ai relu les autres questions de décision (S20, procédures, S10.r4) en cherchant le même défaut. Je n'en ai pas
trouvé d'autre : elles donnent la température et la durée, ou leur bonne réponse tient compte de ce qu'on ne sait pas
(« en cas de doute », « a pu baisser »).

## Point 4 : répartition des sujets entre 3a et 3b

**Constat confirmé, et un second écart trouvé en vérifiant.** Le dernier groupe semblait équilibré (3 contre 3), mais
les deux sujets de droit (S18 contrat de travail, S19 RGPD) étaient tous les deux dans la moitié 1.

**Corrections :**
- **S19 et S20 sont échangés** entre les moitiés. Ils occupaient la même position dans la rotation : la table
  d'affectation garde donc exactement le même équilibre des moteurs et des positions.
- Le protocole dit maintenant explicitement que **l'équilibre est fait par grand domaine** (3 + 2 + 2 + 3 sujets de
  chaque côté), pas par sous-domaine.
- Il explique pourquoi : il y a 3 sujets d'informatique et 3 de mathématiques. Chacun ne peut pas être coupé en deux
  parts égales ; ils sont regroupés, et leurs écarts (2 contre 1, 1 contre 2) se compensent.
- Dans le dernier groupe, il reste un écart : la fiscalité n'est que dans la moitié 2, l'hygiène que dans la moitié 1.
- Ces écarts seront publiés avec les résultats, qui seront aussi donnés par grand domaine.

| Grand domaine | Moitié 1 (3a) | Moitié 2 (3b) |
|---|---|---|
| informatique et mathématiques | S01, S03, S05 | S02, S04, S06 |
| sciences de la vie | S07, S10 | S08, S09 |
| sciences de la Terre, physique | S11, S14 | S12, S13 |
| économie, droit, fiscalité, hygiène | S15 (économie), S18 (droit), S20 (hygiène) | S16 (économie), S19 (droit), S17 (fiscalité) |

**Nouveau contrôle J32 :** il lit la répartition **dans le protocole lui-même** et vérifie :
- que les deux moitiés comptent 10 sujets chacune, tous différents ;
- que l'équilibre par grand domaine est le même des deux côtés ;
- que chacun des 8 participants voit 4 sujets de la bonne moitié en 3a, 4 en 3b, et ne voit jamais deux fois un sujet
  ni une procédure.

## Point 5 : consentement des participants

**Constat confirmé.** Le protocole disait « tant que les résultats n'ont pas été agrégés », le formulaire disait « à
tout moment », et le contact était un champ vide.

**Harmonisation :** les mêmes trois périodes figurent maintenant dans le protocole et dans le formulaire.
1. **Jusqu'à la date de regroupement des résultats :** retrait complet. Toutes les réponses sont supprimées et la
   personne est exclue des résultats.
2. **Ensuite, tant que la clé de correspondance existe** (au plus tard 6 mois après la première séance) : les réponses
   brutes sont supprimées sur demande, mais les résultats d'ensemble déjà calculés ne sont pas refaits.
3. **Après la destruction de la clé :** les réponses ne peuvent plus être reliées à la personne.

**Date de regroupement :** 14 jours après la dernière séance de rappel à J+2 de la mesure. Elle est fixée avant la
première séance, écrite sur chaque formulaire, et jamais avancée.

**Formulaire :**
- Il comporte maintenant, en tête, des champs « Responsable de l'étude » et « Contact », marqués **à compléter avant
  toute distribution**, ainsi que la date limite de retrait et un champ « code participant ».
- Le protocole interdit de distribuer le formulaire tant que trois champs sont vides : le responsable et son contact,
  la date de regroupement, l'espace de stockage.

**Ce que je n'ai pas fait :** je n'ai pas rempli le contact ni le nom du responsable. Ce sont des informations que
seul le responsable du projet peut fournir, et je n'utilise pas de coordonnées personnelles dans le dépôt public. Je
recommande une adresse dédiée à l'étude plutôt qu'une adresse personnelle.

## Vérifications techniques
- `node docs/pedagogie/assembler.js` : jeu régénéré (23 éléments, 207 questions).
- `node tests/jeu-de-mesure.js` : **32 contrôles sur 32 passés**. J30 à J32 sont nouveaux :
  - J30 : chaque transfert a ses critères de notation, complets et distincts ;
  - J31 : les 5 réponses attendues de transferts chiffrés sont recalculées (échelle, recette, TVA, piles, tolérance
    des glaces) ;
  - J32 : la répartition 3a / 3b, relue dans le protocole.
- **Contrôle des contrôles :** j'ai introduit 4 défauts dans une copie des fichiers, puis remis les fichiers en état.
  Les 4 ont été signalés :
  - un critère de transfert supprimé : détecté par J30 ;
  - « 1 200 € HT » comme réponse attendue de S17 : J31 ;
  - une phrase d'appui modifiée dans P-H1 : J26 ;
  - S19 remis dans la moitié 1 : J32.
- Le biais de longueur reste corrigé après la réécriture de S20.r4 : la bonne réponse est la plus longue dans 26
  questions sur 207 (12,6 %), avec un rapport moyen de 0,95.

**Limite inchangée :** ces contrôles vérifient la structure et la cohérence du matériel. La justesse pédagogique des
critères de transfert reste à confirmer par votre relecture, et par l'étalonnage des correcteurs sur quelques réponses
fabriquées avant la mesure.
