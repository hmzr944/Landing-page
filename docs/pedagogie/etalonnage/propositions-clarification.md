# Propositions de clarification des grilles (mission 3a)

**Statut :**
- Ces propositions sont **non appliquées** et à valider une par une.
- `grille-reformulation.md` n'a pas été modifiée : le contrôle E20 vérifie qu'elle est identique à la version
  `523f730`.

**Origine :**
- Ces points sont apparus en **écrivant** les réponses fictives : ce sont des cas où j'ai moi-même dû trancher en
  dehors du texte de la grille.
- Ils sont **anticipés**, pas mesurés. L'exercice dira lesquels gênent vraiment les correcteurs.
- Je propose de n'adopter que ceux que l'exercice confirme : désaccord, hésitation, ou kappa inférieur à 0,6 sur le
  critère concerné.

Chaque point indique :
- le texte actuel de la grille ;
- le cas qui le met à l'épreuve ;
- la proposition ;
- l'effet attendu.

## B2, reformulation

### P1. C3 récompense une réponse presque vide
- **Texte actuel :** « Une réponse vide, ou "je ne sais pas", vaut 0 sur les quatre critères. » et « C3 : aucune
  erreur = 2 ».
- **Cas :** B2-12, « Je sais pas trop, c'est une piqûre contre les maladies. »
  - Ce n'est pas une réponse vide, et elle ne contient aucune erreur.
  - À la lettre, elle vaut donc C3 = 2, soit 2 points sur 8 pour une réponse sans contenu.
- **Proposition :** C3 ne se note que s'il y a quelque chose à évaluer. Si C1 = 0 et C2 = 0, alors C3 = 0.
- **Effet :** le total d'une réponse sans contenu tombe à 0, au lieu de 2. Les autres réponses ne changent pas.

### P2. Un lien de cause faux, en C4
- **Texte actuel :** C4 = 2 si la personne « relie les éléments (parce que, donc, sinon…) **ou** donne un exemple […]
  juste et pertinent ».
  - « Juste » est exigé pour l'exemple, pas pour le lien.
- **Cas :**
  - B2-03 : « parce que le froid tue les bactéries » ;
  - B2-14 : « il n'y a plus de gravité, c'est pour ça que la Lune flotte ».
- **Proposition :** « Un lien de cause faux vaut au plus 1 en C4 ; l'erreur elle-même est notée en C3. »
- **Effet :** on évite qu'une réponse fausse mais bien construite obtienne 2 en C4.

### P3. « Nommer seulement » : 0 ou 1 en C4 ?
- **Texte actuel :** « Une phrase juste mais qui ne fait que nommer […] vaut au plus 1 en C4. »
  - Or la description du 0 (« liste de termes […] sans lien ») couvre aussi ce cas.
- **Cas :** B2-10, « C'est l'effet de serre : les gaz à effet de serre réchauffent la planète. »
- **Proposition :** « Nommer sans aucun lien ni exemple vaut 0 ; le 1 est réservé à un lien ou un exemple présent mais
  incomplet. »
- **Effet :** une seule lecture possible.

### P4. Raison vraie mais non écrite dans une procédure, en B2
- **Texte actuel :** la règle n'existe que pour B3 et B4 (une raison non écrite ne compte pas).
- **Cas :** B2-13, « on prend des photos, pour pouvoir se faire rembourser par le fournisseur ».
- **Proposition :** ajouter à la partie 1 : « Dans une procédure, un ajout vrai mais non écrit n'est ni une erreur
  (C3), ni un élément clé (C2). »
- **Effet :** même règle dans les trois grilles.

### P5. Un élément clé à moitié présent, en C2
- **Texte actuel :** « aucun / un seul / les deux ». Rien ne dit quand un élément compte comme présent.
- **Cas :** B2-05.
  - Pour l'élément « besoins : lumière, eau, CO2 », seule la lumière est citée.
  - Pour l'élément « produits : sucre et oxygène », la réponse dit seulement « à manger ».
- **Proposition :** un élément compte s'il contient l'essentiel de son contenu. Pour les éléments qui sont des
  listes, écrire dans le jeu de mesure le minimum exigé, par exemple « au moins deux des trois besoins ».
- **Effet :** le jeu de mesure s'enrichit d'un minimum par élément clé.
- **À noter :** cette proposition touche aussi `jeu-de-mesure.json`. Elle devra être validée à part.

## B3, transfert

### P6. Étourderie ou raisonnement faux, dans un calcul
- **Texte actuel :** « une bonne méthode avec une erreur de calcul vaut 1 si l'erreur est une étourderie visible […],
  0 si le raisonnement lui-même est faux ».
- **Cas :**
  - B3-02 : 25 − 9 = 14, ce qui est une étourderie ;
  - B3-05 : « la moitié de 3/4, c'est 3/2 ». La raison est juste, mais l'erreur porte sur la notion même enseignée,
    les fractions.
- **Proposition :** « Une erreur qui porte sur la notion enseignée (diviser une fraction, appliquer un pourcentage au
  mauvais montant) est un raisonnement faux : 0. Une erreur d'opération sans rapport avec la notion est une
  étourderie : 1. »
- **Effet :** tranche aussi B3-07 (20 % retiré du prix TTC).

### P7. Réciter la définition, qui est aussi la raison attendue
- **Texte actuel :** « une simple récitation de la définition, sans l'appliquer à la situation » vaut 0.
- **Cas :** B3-20, « c'est quand les intérêts rapportent eux-mêmes des intérêts ».
  - C'est mot pour mot la raison attendue, mais la réponse ne parle pas de la dette.
- **Deux options, à choisir par vous :**
  - (a) Garder 0 : rien ne montre que la personne a reconnu la situation.
  - (b) Mettre 1 : la raison est là, la décision manque.
- **Ma recommandation :** (a), parce que le transfert mesure justement l'application à un cas nouveau.

### P8. Une règle équivalente, mais sans ses conditions
- **Cas :** B3-12, « pour les glaces on accepte jusqu'à – 15 °C ».
  - Ce seuil équivaut à la tolérance de 3 °C, mais sans ses conditions : en surface, pendant le déchargement, sur une
    courte durée.
- **Proposition :** « Une règle juste mais amputée de ses conditions est une imprécision : 1. Elle n'est pas une
  règle inventée (0). »

### P9. Une raison sous-entendue
- **Cas :** B3-16, « il a servi, sinon ça aurait été pire ».
  - L'idée d'atténuation est là, sans le mécanisme (le corps entraîné réagit plus vite).
- **Proposition :** « La raison doit nommer le mécanisme ou la règle. Une conséquence sans mécanisme vaut comme une
  raison absente. »

## B4, déblocage

### P10. Justification vraie mais hors sujet : insuffisante ou fausse ?
- **Cas :** B4-11, Q2, « parce qu'elle est en face de l'angle droit ».
  - C'est vrai, mais cela dit où est l'hypoténuse, pas pourquoi elle est la plus longue.
- **Proposition :** « "Faux" (0) = la justification contient une affirmation fausse. "Insuffisant" (1) = elle est
  vraie mais ne donne pas la raison attendue. »
- **Effet :** ici, 1. C'est important, parce que la décision change : 2 + 1 = débloqué, alors que 2 + 0 =
  partiellement débloqué.

### P11. Une exagération qui contredit le choix
- **Cas :** B4-12, Q2, « la cuisson tue tout, il n'y a plus aucune bactérie ». Le choix disait « la plupart ».
- **Proposition :** « Une justification qui contredit le choix fait, ou qui affirme quelque chose de faux, même par
  exagération, vaut 0. »

### P12. Décrire la situation sans citer la règle, dans une procédure
- **Cas :** B4-08, Q1, « parce que c'est trop chaud ». Le seuil de + 3 °C n'est pas cité.
- **Proposition :** « Pour une procédure, la justification doit citer la règle (le seuil, la personne habilitée,
  l'interdiction) ; décrire la situation (« trop chaud ») est insuffisant : 1. »

## Ordre suggéré
1. Faire l'exercice tel quel, avec la grille actuelle.
2. Relire ces propositions à la lumière des désaccords mesurés.
3. Valider celles qui sont confirmées.
4. Modifier la grille sur une branche à part, puis refaire l'exercice avec de nouvelles réponses fictives.
