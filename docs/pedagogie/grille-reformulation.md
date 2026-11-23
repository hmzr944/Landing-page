# Grilles de correction de la mission 3a : reformulation (B2) et déblocage (B4)

Une même grille pour les deux correcteurs, et pour l'ancien comme pour le nouveau moteur (mission 3b). Pour chaque
élément, l'idée centrale et les deux éléments clés attendus sont écrits dans `jeu-de-mesure.json` (champ
`reformulation`), et les deux questions de déblocage dans le champ `deblocage`.

## Partie 1 : reformulation (B2)

### Ce qu'on mesure
La capacité à **expliquer la notion avec ses propres mots** : dire de quoi il s'agit et pourquoi cela fonctionne ainsi,
de façon compréhensible par quelqu'un qui ne connaît pas le sujet. On ne mesure pas la mémoire du texte d'Arbor :
une réponse qui reprend des mots d'Arbor n'est pas pénalisée pour cela, mais elle ne gagne pas non plus de points
pour cela. Ce qui compte est la preuve d'une compréhension propre (lien de cause, exemple, comparaison personnelle).

### Consigne donnée au participant
« Explique cette notion avec tes propres mots, comme à un ami qui n'en a jamais entendu parler. Tu peux écrire ou parler
(ta réponse sera transcrite). Il n'y a pas de piège ni de bonne longueur. »

### Critères (chacun noté 0, 1 ou 2 ; total sur 8)
| Critère | 0 | 1 | 2 |
|---|---|---|---|
| **C1 Idée centrale** | absente ou fausse | présente mais floue ou incomplète | présente et juste |
| **C2 Éléments clés** (les deux du jeu de mesure) | aucun | un seul | les deux |
| **C3 Exactitude** | au moins une erreur de fond (contresens, chiffre faux, règle inversée) | une imprécision sans contresens | aucune erreur |
| **C4 Explication par soi-même** | liste de termes ou de phrases sans lien entre eux ; rien ne montre que la personne sait pourquoi | un lien de cause ou un exemple, mais incomplet ou peu clair | la personne relie les éléments (parce que, donc, sinon…) **ou** donne un exemple, une image ou une comparaison à elle, juste et pertinent |

Pourquoi une échelle 0-1-2 plutôt que 0 / 0,5 / 1 : mêmes niveaux, mais des notes entières, que le kappa pondéré
traite comme des catégories ordonnées.

**Règle supprimée :** l'ancienne règle « 8 mots consécutifs identiques à Arbor = recopie » est retirée. Un débutant
peut reprendre une expression juste (« le froid ralentit les bactéries ») et l'avoir comprise ; à l'inverse, on peut
paraphraser sans comprendre. Le critère C4 juge la présence d'une explication (lien, exemple, comparaison), pas le
nombre de mots en commun. Le correcteur ne voit d'ailleurs pas le texte d'Arbor, ce qui évite de juger la ressemblance.

Règles de décision :
- Une réponse vide, ou « je ne sais pas », vaut 0 sur les quatre critères.
- Un exemple personnel juste compte comme élément clé (C2) s'il illustre l'un des deux éléments attendus ; il compte
  aussi pour C4.
- Une phrase juste mais qui ne fait que nommer (« c'est la photosynthèse, avec la lumière ») vaut au plus 1 en C4.
- On ne pénalise ni l'orthographe, ni le style, ni la longueur.
- Les exemples de copies corrigées (ancrage), écrits avant la mesure, sont joints en annexe A ; les deux correcteurs
  les notent d'abord à blanc pour s'étalonner. Ces copies ne viennent pas des participants.

## Partie 2 : déblocage (B4)

### Quand
Seulement si la personne a obtenu moins de 2 sur 3 aux questions de compréhension immédiate (B1), ou s'est déclarée
bloquée. Le déblocage vient **après** la reformulation (B2) et le transfert (B3), pour que la seconde explication ne
donne pas d'indice sur le transfert. La personne reçoit la seconde explication d'Arbor, puis les **2 questions de
déblocage préparées à l'avance** (champ `deblocage` : pour un sujet, une d'application et une de compréhension ; pour
une procédure, deux d'application). Elles ne reprennent aucune question de B1.

### Ce qu'on demande
Pour chacune des 2 questions : le choix de réponse, puis une phrase : « Pourquoi as-tu choisi cette réponse ? »

### Ce que le correcteur a sous les yeux, pour chaque question
Écrits à l'avance dans `jeu-de-mesure.md` (et `.json`, champ `criteres`), question par question :
- **la raison attendue** : ce qu'une justification doit contenir pour être juste ;
- **un exemple de justification juste** ;
- **un exemple de justification insuffisante** : elle répète la réponse, reste vague (« c'est mieux », « par
  sécurité ») ou décrit la situation sans en donner la raison ;
- **un exemple de justification fausse** : elle contient une erreur de fond.

Pour les procédures, la raison attendue est toujours une règle **écrite dans la procédure** (phrase citée sous
« Appui dans la procédure »). Une raison non écrite, même vraie (« c'est plus sûr »), est insuffisante, pas fausse.

### Note de chaque question (0, 1 ou 2)
| Note | Condition |
|---|---|
| **2** | bon choix **et** justification juste : elle contient la raison attendue, même avec d'autres mots, et aucune erreur de fond |
| **1** | bon choix, mais justification absente, vague, ou qui ne fait que répéter la réponse |
| **0** | mauvais choix, **ou** bon choix avec une justification qui contient une erreur de fond (le bon choix est alors probablement dû au hasard ou à une idée fausse) |

### Décision pour la personne (somme des 2 questions, sur 4)
| Résultat | Somme | Exemples |
|---|---|---|
| **Débloqué** | 3 ou 4 | 2 + 2 ; 2 + 1 (les deux bons choix, au moins une raison juste) |
| **Partiellement débloqué** | 2 | 1 + 1 (deux bons choix sans raison) ; 2 + 0 (une question comprise, l'autre manquée) |
| **Non débloqué** | 0 ou 1 | 1 + 0 ; 0 + 0 |

La justification évite de compter comme débloquée une personne qui a répondu au hasard : 25 % de chances par
question, 6 % pour les deux, mais une raison juste au hasard est très improbable. Les notes de chaque question sont
données par les deux mêmes correcteurs, en aveugle, comme la reformulation ; l'accord entre eux est mesuré sur la note
de chaque question (kappa pondéré) et sur la décision finale.

## Correction en aveugle, par deux correcteurs indépendants
1. **Anonymisation.** Chaque réponse reçoit un code aléatoire. Le correcteur ne voit ni le participant, ni la version
   du moteur (ancienne ou nouvelle), ni la date, ni le texte d'Arbor. L'ordre des réponses est mélangé, différemment
   pour chaque correcteur.
2. **Indépendance.** Les deux correcteurs notent séparément, sans se concerter, sur une feuille qui ne contient que la
   réponse, le sujet, l'idée centrale et les éléments clés attendus.
3. **Notes individuelles figées avant toute discussion.** Chaque correcteur remet ses notes, critère par critère ;
   elles sont enregistrées et ne sont plus modifiées. Elles servent seules au calcul de l'accord.
4. **Accord mesuré sur ces notes individuelles.** Pour chaque critère (C1 à C4), pour le total sur 8 et pour la
   décision de déblocage :
   - **pourcentage d'accord exact** ;
   - **kappa de Cohen pondéré quadratique** (les notes sont ordonnées : un écart de 0 à 2 compte plus qu'un écart de
     0 à 1) ; pour le total, coefficient de corrélation intra-classe en complément.
   Ces chiffres sont publiés tels quels. Avec 5 à 8 participants (environ 25 à 40 reformulations), l'intervalle de
   confiance du kappa sera large : il est publié avec lui. Un kappa pondéré inférieur à 0,6 sur un critère signale une
   grille ambiguë ; le critère est alors rapporté comme peu fiable, sans être corrigé après coup.
5. **Désaccords.** Un écart d'au moins 2 points sur le total, ou toute décision de déblocage différente, est relu par
   les deux correcteurs ensemble, en voyant toujours la seule réponse. La note retenue est la note commune ; à défaut
   d'accord, la moyenne des deux. Les notes individuelles d'avant discussion et les notes d'après discussion sont
   toutes conservées et publiées (en agrégé).
6. **Clé de correspondance.** Le lien entre codes, participants et versions est gardé par une personne qui ne corrige
   pas, hors du dépôt (voir le protocole, section 6). Il n'est ouvert qu'une fois toutes les notes figées.

## Qui
Deux correcteurs volontaires qui n'ont participé ni à la rédaction des explications d'Arbor, ni au moteur pédagogique.
Je ne peux pas être correcteur : j'ai écrit le jeu de mesure et je développerai le moteur.

## Annexe A : copies d'ancrage (fabriquées, pas des participants)
Sujet S20, la chaîne du froid. Attendu : froid continu du début à la fin ; une rupture laisse les bactéries se
multiplier.

| Copie | C1 | C2 | C3 | C4 | Total |
|---|---|---|---|---|---|
| « Il faut garder au froid. » | 1 | 0 | 2 | 0 | 3 |
| « Le froid tue les microbes, donc il faut toujours garder la viande au frigo. » | 1 | 1 | 0 | 1 | 3 |
| « Le froid ralentit les bactéries sans les tuer ; si le produit se réchauffe en route, même un moment, elles repartent. C'est comme une pause : si on enlève la pause, elles se remettent à grandir. Donc il faut du froid tout le long, du camion au frigo. » | 2 | 2 | 2 | 2 | 8 |
| « Le froid ralentit le développement de la plupart des bactéries ; la chaîne doit être continue. » (phrase proche du texte, sans lien ni exemple, rupture non expliquée) | 2 | 1 | 2 | 1 | 6 |
