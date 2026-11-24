# Audit du moteur pédagogique d'Arbor (Student)

**Date :** 2026-11-24. **Version auditée :** `main`, commit `5be606a` (v53, en production).
**Nature :** audit en lecture seule. Aucun code n'a été modifié et aucune mesure n'a été lancée.

**Méthode :**
- J'ai lu le code des chemins par lesquels un apprenant reçoit une explication, s'exerce et est évalué.
- Chaque constat renvoie au fichier et à la ligne qui le justifient.
- Ce qui dépend de la réponse d'un modèle d'IA (qualité réelle d'une explication, justesse d'un diagnostic) n'est
  **pas mesuré** ici. J'en décris seulement la logique : ce qui est imposé par le code, et ce qui est seulement demandé
  au modèle dans une consigne.

**But :** savoir ce que le moteur sait faire, ce qu'il ne sait pas faire, et ce qui doit changer pour atteindre le
concept **Situation → Pratique → Maîtrise**, avant d'écrire une proposition consolidée et du code (mission 3b).

## 1. Résumé

| Capacité visée (mission 3b) | État | En une phrase |
|---|---|---|
| Situation concrète **avant** la définition | **Absente** | Les trois façons de rédiger un cours mettent la définition en premier. La leçon choisit même exprès une phrase de définition pour ouvrir. |
| Explication adaptée au niveau | **Absente** | Aucune donnée sur l'apprenant n'arrive à la rédaction : tout le monde reçoit le même texte. |
| Détection des incompréhensions | **Partielle** | Seul le dialogue avec Pousse nomme une confusion, et c'est le modèle qui en juge, sans contrôle. Leçon et révision voient « faux », jamais « pourquoi ». |
| Changement de méthode après plusieurs erreurs | **Absent** | Après une erreur, Arbor repose la même question, donne un indice plus précis ou fait relire le même passage. Jamais une autre façon d'expliquer. |
| Vérification de la mémorisation | **Présente, solide** | Répétition espacée FSRS ; « maîtrisée » seulement après 2 rappels justes espacés d'au moins 7 jours. |
| Vérification de l'application et du transfert | **Absente côté Student** | Le modèle de preuves (appliquée, transférée) existe, mais seul Business l'utilise. Une mise en situation réussie ne compte pour rien dans l'état d'une notion. |
| Questions qui testent la compréhension | **Faible** | Les questions de la leçon testent la reconnaissance (« de quelle notion parle cette phrase », mot manquant). |

**Le constat central :** la pédagogie d'Arbor est aujourd'hui portée par des **consignes données au modèle**, pas par
une **logique du moteur**.
- **Ce que le code garantit vraiment :**
  - les sources (citations vérifiées) ;
  - la mémoire (FSRS) ;
  - l'honnêteté des états (finir une leçon ne rend pas une notion « maîtrisée »).
- **Ce que le code ne garantit pas :** l'ordre de l'explication, son niveau, le diagnostic d'une erreur et le
  changement de méthode. Ce sont précisément les capacités visées.

**Le chemin le plus probable d'un débutant est le moins pédagogique.**
- Sans compte ni IA locale, un sujet libre donne une fiche tirée de **Wikipédia**, qui commence par la définition
  encyclopédique.
- La leçon pose ensuite des questions de **reconnaissance**.
- Pousse, seul à proposer une mise en situation, exige un compte.

## 2. Les chemins audités

| Étape | Chemin | Fichiers |
|---|---|---|
| Rédiger un cours à partir d'un sujet | sans compte : fiche Wikipédia | `js/course.js` |
| | avec compte : rédaction par le serveur (`rediger_cours`, `rediger_notion`) | `supabase/functions/tutor/generate.ts`, `js/ai.js`, `js/storm.js` |
| | IA locale dans le navigateur | `js/local-ai.js` |
| Apprendre une notion | leçon guidée : Découvre, Retiens, Vérifie | `js/lesson.js` |
| S'exercer avec un tuteur | Pousse : socratique, Enseigne-moi, mise en situation | `js/dialogue.js`, `supabase/functions/tutor/handler.ts` |
| Réviser | rappel, texte à trous, branche, exercice, indices | `js/app.js` (séance de révision), `js/srs.js` |
| Suivre l'état d'une notion | états et « quoi faire maintenant » | `js/mastery.js`, `js/db.js` (journal des observations) |
| Preuves et recommandations | 7 niveaux de preuve ; règles de recommandation | `js/evidence.js`, `js/adaptive.js` (**Business seulement** : `js/org-insight.js:46`, `:61`) |

## 3. Constats détaillés

### 3.1 La situation ne vient jamais avant la définition

| Où | Ce que fait le code |
|---|---|
| `js/course.js:60` | La vue d'ensemble reprend les 3 premières phrases de l'introduction Wikipédia, c'est-à-dire la définition encyclopédique. Les notions sont des sections de l'article, résumées par des phrases-clés extraites automatiquement (`:73`). |
| `supabase/functions/tutor/generate.ts:116-119` | Consigne du cours rédigé par le serveur : chaque notion contient « définition, fonctionnement, exemple concret », dans cet ordre. |
| `js/local-ai.js:150` | Même ordre pour l'IA locale : « la définition, puis comment ça marche ou pourquoi, puis un exemple concret ». |
| `js/lesson.js:6` et `:46` | L'écran « Découvre » de la leçon choisit en priorité une phrase qui **ressemble à une définition** (expression régulière `DEF` : « est un », « désigne », « on appelle »…). |
| `handler.ts:135`, `js/app.js:1798` | La mise en situation existe, mais seulement dans Pousse, en option, **après** l'apprentissage, et avec un compte. |

L'ordre définition → exemple est donc **inscrit dans le code et dans toutes les consignes**. Inverser l'ordre ne
demande pas une nouvelle fonctionnalité : il faut changer ces quatre endroits, et surtout le rendre **vérifiable**.

### 3.2 Aucune adaptation au niveau
- La rédaction (`generate.ts`, `genPrompt`) reçoit un sujet, un contexte et un texte de référence, rien sur
  l'apprenant.
- `rediger_notion` vise toujours « un étudiant français débutant » (`generate.ts:122`). `rediger_cours` ne précise
  aucun niveau.
- Le dialogue transmet à Pousse l'état de la notion (« Fragile », « Découverte »…) et les confusions déjà repérées
  (`handler.ts:125`, `:138`). C'est la seule trace d'un profil d'apprenant, et elle ne sert qu'au dialogue.
- Il n'existe ni diagnostic de départ, ni deuxième niveau d'explication (plus simple, ou plus avancé).

### 3.3 Détection des incompréhensions : réservée à Pousse, sans contrôle
- **Pousse** renvoie un verdict (juste, partiel, faux) et, s'il en voit une, une confusion nommée en quelques mots
  (`handler.ts`, schéma `SCHEMA`).
  - Cette confusion est enregistrée et rend la notion « fragile » jusqu'à une prochaine bonne réponse
    (`js/db.js:83`, `js/mastery.js`). Elle avance aussi la prochaine révision (`js/dialogue.js:99`).
  - C'est une bonne mécanique, mais **le diagnostic est entièrement celui du modèle** : rien ne vérifie que la
    confusion nommée existe, qu'elle est la bonne, ni qu'elle revient d'une fois sur l'autre sous le même nom.
- **Leçon :** une réponse fausse donne « Pas tout à fait » et la bonne réponse, puis la même question revient une
  fois à la fin (`js/lesson.js:171`). Aucune cause n'est recherchée.
- **Révision :** l'apprenant coche ce qu'il a retrouvé et choisit sa note. Arbor propose une note, mais ne cherche
  pas l'erreur.
- **Il n'existe nulle part de liste des confusions typiques d'une notion**, que le moteur pourrait reconnaître et
  traiter.

### 3.4 Pas de changement de méthode
Après une erreur, voici tout ce qui peut arriver :

| Où | Réaction | Est-ce une autre méthode ? |
|---|---|---|
| Leçon (`lesson.js:171`) | la même question revient une fois à la fin | non, répétition |
| Révision (`app.js:1312-1344`) | indice 1 puis 2 : premières lettres, début des points clés ; la note proposée est plafonnée | non, indice sur la même réponse |
| Pousse socratique (`handler.ts:91`) | consigne au modèle : indices 1, 2, 3 « s'il s'est trompé deux fois » | non : un indice de plus en plus précis sur la même voie. Et c'est une consigne, pas une règle du code. |
| Pousse, activité corrective (`dialogue.js:120`) | relire le passage cité, ou revoir un prérequis | relire le même texte n'est pas une autre explication ; revoir un prérequis l'est en partie |

- La variable `errors` du dialogue (`dialogue.js:34`, `:85`) compte les **erreurs réseau**, pas les erreurs de
  l'apprenant.
- Aucun code ne compte les erreurs d'un apprenant sur une notion pendant une séance pour décider de changer
  d'approche : nouvel exemple, image, étapes, autre représentation.

### 3.5 Mémoire : le point fort
- `js/srs.js` applique FSRS-5.
- `js/mastery.js:23` et `:65` : « maîtrisée » exige une stabilité d'au moins 21 jours, une mémoire estimée d'au
  moins 85 %, et 2 rappels justes espacés d'au moins 7 jours, sans confusion ouverte.
- Finir une leçon ne suffit jamais (`mastery.js`, en-tête). C'est honnête et conforme à la recherche.
- **Limites :**
  - La note de révision reste **déclarée par l'apprenant**. Arbor la propose d'après ce qu'il a coché ou tapé
    (`app.js:1336-1346`), mais l'apprenant peut choisir autre chose.
  - Les cartes d'une leçon attendent la fin de toutes les leçons avant leur premier rappel (audit Student,
    point 18, non corrigé).

### 3.6 Application et transfert : non comptés côté Student
- `js/evidence.js` définit 7 niveaux : déclarée, reconnue, restituée, **appliquée**, démontrée, **transférée**,
  durable. `js/adaptive.js` en tire des recommandations, du type « su, pas encore appliqué : mise en situation ».
- **Ces deux moteurs ne servent qu'à Business** (`js/org-insight.js:46`, `:61`).
- Côté Student, le résumé d'une notion (`js/db.js:79`) ne compte comme preuve que les **rappels réussis**.
  - Une mise en situation réussie avec Pousse est enregistrée dans le journal, mais ne change ni l'état de la notion,
    ni la recommandation suivante.
  - Il n'existe aucune question de transfert (même notion, contexte nouveau).

### 3.7 Les questions testent surtout la reconnaissance
- **Leçon :** deux types de questions seulement.
  - « De quelle notion parle cette phrase ? » (`lesson.js:59`) : il suffit de repérer un mot-clé, souvent présent
    dans la phrase (audit Student, point 15).
  - « Choisis le mot manquant » (`lesson.js:67`).

  Ce sont des questions de **restitution ou de reconnaissance**, au sens de la classification validée pour la
  mission 3a.
- **Révision :** les exercices rédigés par l'IA (question et réponse attendue) sont proposés dans 60 % des cas quand
  ils existent (`app.js:1291`). Ils peuvent faire réfléchir, mais ils sont **autocorrigés** par l'apprenant : rien ne
  vérifie la réponse.

## 4. Ce qui marche, et doit être gardé

| Acquis | Où | Pourquoi le garder |
|---|---|---|
| Ancrage sur les sources, citations vérifiées mot pour mot | `handler.ts`, `checkCitations` | Base du « Knowledge Firewall » : toute nouvelle explication devra s'y plier. |
| L'IA donne des pistes, pas les réponses | `app.js:1309-1344`, consignes de Pousse | Conforme à la recherche citée dans l'app. |
| États honnêtes ; « maîtrisée » seulement prouvée dans la durée | `mastery.js` | C'est déjà la « Maîtrise » du concept ; à étendre, pas à refaire. |
| FSRS et preuve par rappels espacés | `srs.js`, `db.js` | Solide et testé. |
| Confusion repérée → notion fragile → révision avancée | `dialogue.js:94-100`, `mastery.js` | Bonne boucle, à alimenter par un diagnostic plus fiable. |
| Modèle de preuves à 7 niveaux, règles de recommandation lisibles | `evidence.js`, `adaptive.js` | Prêts à l'emploi : il suffit de les brancher sur Student. |
| Modes Enseigne-moi et mise en situation | `handler.ts` | Les bonnes activités existent déjà ; elles sont en option et mal reliées à l'état. |

## 5. Pourquoi ces manques sont structurels

1. **Il n'existe pas de modèle pédagogique d'une notion.**
   - Une notion est stockée sous la forme d'un texte (`notes`), de points clés et d'exercices (question et réponse).
   - Rien ne représente :
     - une situation d'ouverture ;
     - une explication à deux niveaux ;
     - les confusions typiques et leur remède ;
     - une question d'application ;
     - une question de transfert.
   - Le moteur ne peut donc ni ordonner, ni adapter, ni remédier : il n'a pas les pièces.
2. **La pédagogie vit dans les consignes.** L'ordre d'explication, les indices, le moment de changer d'approche et
   le diagnostic sont demandés au modèle, en langage naturel.
   - Rien ne vérifie qu'ils sont respectés.
   - Les campagnes des missions 2 à 2c ont montré que, pour une même consigne et un même document, les résultats du
     modèle varient d'un passage à l'autre.
3. **Le modèle de l'apprenant se réduit à la mémoire.** FSRS dit ce qui s'oublie, pas ce qui est mal compris, ni à
   quel niveau expliquer.
4. **Deux moteurs d'état.** Student utilise `Mastery` (mémoire), Business utilise `Evidence` et `Adaptive`
   (preuves graduées). La même notion n'a pas le même sens d'un espace à l'autre.
5. **Rien n'est mesuré.** Aucun test ne vérifie une propriété pédagogique (situation en premier, question de
   compréhension, changement de méthode). Les tests actuels vérifient l'interface et les flux.

## 6. Écart avec Situation → Pratique → Maîtrise

| Phase | Ce qu'elle demande | Ce qui existe | Écart |
|---|---|---|---|
| **Situation** | un cas concret, familier, qui pose le problème avant la notion | rien en ouverture ; mise en situation de Pousse en fin, en option, avec compte | à créer : situation d'ouverture dans la notion et dans la leçon |
| **Explication** (entre situation et pratique) | expliquer à partir de la situation, au bon niveau | texte définition d'abord, un seul niveau | à réordonner et doubler (niveau simple et niveau normal) |
| **Pratique** | appliquer, se tromper, être corrigé sur la cause, changer d'approche si ça bloque | questions de reconnaissance ; exercices autocorrigés ; Pousse en option | à créer : questions d'application vérifiables, diagnostic par confusions typiques, changement de méthode imposé par le code |
| **Maîtrise** | mémoire dans la durée, application, transfert | mémoire : oui (FSRS, preuve espacée) ; application et transfert : non comptés | brancher `Evidence` sur Student ; ajouter des questions de transfert |

## 7. Ce qui doit changer : orientations pour la proposition consolidée

Ce sont des orientations, pas une décision : la proposition consolidée les détaillera, avec les critères de réussite,
avant tout code.

1. **Fiche pédagogique d'une notion**, comme donnée et pas comme texte libre. Elle contiendrait :
   - une situation d'ouverture ;
   - une explication à deux niveaux ;
   - une à trois confusions typiques, chacune avec sa question révélatrice et son remède (une autre représentation) ;
   - une question d'application ;
   - une question de transfert.

   Sa forme serait contrôlée par le code, et son contenu soumis aux mêmes garde-fous de sources que les cours
   actuels. C'est le préalable à tout le reste.
2. **Séquence imposée par le code :** situation, puis explication, puis pratique, puis vérification. L'ordre est
   vérifié par des tests, et ne dépend plus d'une consigne.
3. **Remédiation déterministe :**
   - un compteur d'erreurs par notion et par séance ;
   - à la deuxième erreur, ou à la première confusion reconnue, Arbor passe à une autre représentation tirée de la
     fiche ;
   - chaque changement est enregistré, pour la mesure A6.
4. **Questions de compréhension** à la place des questions de reconnaissance de la leçon. Elles reprendraient la
   classification validée pour la mission 3a (application, compréhension, restitution) et la règle « au moins 2 sur
   3 qui ne sont pas de la restitution ».
5. **Une seule notion de preuve** : brancher `Evidence` (appliquée, transférée) sur Student, pour qu'une mise en
   situation réussie et un transfert comptent. `Mastery` resterait la couche « mémoire ».
6. **Adaptation au niveau, en version simple** : un niveau choisi ou déduit d'une ou deux réponses, qui sélectionne
   l'un des deux niveaux d'explication de la fiche. Pas de « personnalisation » plus ambitieuse tant qu'elle n'est
   pas mesurée.
7. **Instrumentation pour la mesure :**
   - enregistrer, sans contenu personnel, la séquence montrée, les erreurs et les changements de méthode ;
   - les mesures 3a et 3b doivent pouvoir lire ce qui s'est passé, pas le reconstruire.

**À ne pas faire :** ajouter une nouvelle consigne au modèle pour chaque capacité. C'est la cause du problème actuel :
une capacité qui n'existe que dans une consigne n'est ni garantie, ni testable.

## 8. Points à décider avant la proposition consolidée
1. **Où naît la fiche pédagogique ?** Générée par l'IA à partir des sources, puis contrôlée ? Écrite à la main pour
   les 20 sujets et 3 procédures de la mission 3a ? Ou les deux : le jeu de mesure sert de référence, l'IA pour le
   reste ?
2. **Le chemin sans compte** (Wikipédia, puis leçon de reconnaissance) doit-il recevoir la même séquence ? Sans
   modèle, la situation d'ouverture et les confusions ne peuvent pas être générées.
3. **Pousse** reste-t-il réservé aux comptes ? La pratique avec diagnostic en dépend aujourd'hui.
4. **Unification Student et Business** de la preuve : maintenant (mission 3b), ou plus tard ?

## 9. Limites de cet audit
- Lecture du code seulement. Je n'ai observé ni explication réellement produite, ni dialogue réel : ce sera le rôle
  de la mesure 3a, partie A.
- **Mes jugements de qualité** (« définition d'abord », « reconnaissance ») viennent du code et des consignes. Un
  modèle peut parfois s'en écarter, dans un sens ou dans l'autre. Ce que je dis **garanti** ou **absent** ne
  concerne que la logique du code.
- L'espace Business n'est pas audité ici, sauf pour constater que `Evidence` et `Adaptive` n'y servent qu'à lui.
