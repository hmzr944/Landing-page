/* Exercice d'étalonnage des correcteurs (mission 3a) : réponses ENTIÈREMENT FABRIQUÉES par le concepteur du jeu de
   mesure. Aucune ne vient d'un participant.

   CE FICHIER CONTIENT LA CLÉ DU CONCEPTEUR (types de réponse, notes prévues, raisons, cas limites). Il ne doit jamais
   être montré aux correcteurs : ils reçoivent seulement leur copie (copie-correcteur-A.md ou -B.md) et leur feuille de
   notes. La « note prévue » n'est pas une vérité : c'est la lecture du concepteur, comparée aux correcteurs dans le
   rapport, à titre d'information. L'accord qui compte est celui entre les deux correcteurs.

   Champs :
   - grille : B2 (reformulation), B3 (transfert), B4 (déblocage) ; element : identifiant du jeu de mesure ;
   - reponse (B2, B3) ; q1 et q2 (B4) : { choix, justification }, le choix étant recopié mot pour mot du jeu de mesure ;
   - types : ce que la réponse met à l'épreuve ; prevu : notes prévues ; pourquoi : raisonnement du concepteur ;
   - limite : cas que le concepteur juge discutable, où une hésitation ou un désaccord est attendu. */

const B2 = (id, element, reponse, types, prevu, pourquoi, limite = false) => ({ id, grille: 'B2', element, reponse, types, prevu, pourquoi, limite });
const B3 = (id, element, reponse, types, note, pourquoi, limite = false) => ({ id, grille: 'B3', element, reponse, types, prevu: { note }, pourquoi, limite });
const B4 = (id, element, q1, q2, types, prevu, pourquoi, limite = false) => ({ id, grille: 'B4', element, q1, q2, types, prevu, pourquoi, limite });
const R = (choix, justification) => ({ choix, justification });
const c = (C1, C2, C3, C4) => ({ C1, C2, C3, C4 });

module.exports = [
  // ───────────── B2 : reformulation (C1 idée centrale, C2 éléments clés, C3 exactitude, C4 explication par soi-même) ─────────────
  B2('B2-01', 'S20', "Le froid ne tue pas les microbes, il les met au ralenti. Si les surgelés traînent dans la voiture en revenant du marché, ils se réveillent et se multiplient. Donc il faut que ça reste froid tout le temps, de l'usine jusqu'à mon frigo.",
    ['entièrement correcte', 'exemple personnel pertinent'], c(2, 2, 2, 2), "Idée centrale et deux éléments présents, aucune erreur, lien de cause et exemple personnel."),
  B2('B2-02', 'S20', "La chaîne du froid consiste à maintenir la température des denrées périssables tout au long de la chaîne logistique, conformément aux normes d'hygiène, afin d'éviter toute rupture de la chaîne du froid.",
    ['vocabulaire technique sans compréhension démontrée', 'un critère réussi, un autre échoué'], c(1, 1, 2, 0), "Définition circulaire : le froid continu est dit, mais ni pourquoi (bactéries ralenties), ni ce que provoque une rupture. Aucune erreur, aucun lien de cause."),
  B2('B2-03', 'S20', "Il faut garder les aliments au froid tout le temps parce que le froid tue les bactéries. Si ça se réchauffe un peu ce n'est pas grave, tant qu'on remet au froid après.",
    ['erreur de fond', 'raisonnement avec contradiction'], c(1, 0, 0, 1), "Contradiction (« tout le temps » puis « pas grave si ça se réchauffe ») ; deux erreurs de fond (le froid tue ; la rupture n'est pas grave). C4 : un lien de cause existe mais il est faux.", true),
  B2('B2-04', 'S07', "la plante elle prend la lumiere du soleil + l'eau + le co2 de l'air et sa lui fait du sucre pour grandir, et elle rejete de l'oxigene. cest pour ça qu'une plante dans le noir creve.",
    ['courte, maladroite, avec fautes, mais juste', 'entièrement correcte'], c(2, 2, 2, 2), "Tout est juste malgré l'orthographe ; le lien avec la plante dans le noir montre la compréhension. L'orthographe n'est pas notée."),
  B2('B2-05', 'S07', "C'est comme la cuisine de la plante : avec la lumière, elle se fabrique à manger.",
    ['exemple personnel pertinent', 'partiellement correcte'], c(1, 1, 2, 2), "Image juste et personnelle (C4) ; idée centrale incomplète (ni eau, ni CO2, ni oxygène) ; un élément sur deux, seulement en partie (la lumière comme besoin).", true),
  B2('B2-06', 'S15', "Quand tout augmente en même temps, les courses, l'essence, le loyer, c'est l'inflation. Mon salaire reste pareil, donc avec mes 100 € je remplis moins mon caddie qu'avant. Sauf si mon patron m'augmente autant.",
    ['entièrement correcte', 'exemple personnel pertinent'], c(2, 2, 2, 2), "Hausse générale, effet sur le pouvoir d'achat, nuance sur les salaires, exemple personnel."),
  B2('B2-07', 'S15', "L'inflation, c'est quand un produit devient plus cher, par exemple les tomates en hiver. Du coup on peut moins en acheter.",
    ['erreur de fond', 'bonne idée partielle'], c(0, 1, 0, 1), "Contresens : l'inflation est une hausse générale, pas celle d'un produit. Seul l'effet sur ce qu'on peut acheter est juste. L'exemple illustre l'erreur.", true),
  B2('B2-08', 'S18', "CDD : fin prévue. CDI : pas de fin prévue. Période d'essai : on vérifie que ça va des deux côtés.",
    ['un critère réussi, un autre échoué', 'liste sans liens'], c(2, 2, 2, 0), "Tout le contenu est juste et complet, mais c'est une liste : rien ne relie les éléments (C4 à 0)."),
  B2('B2-09', 'S18', "Un CDD finit toujours à une date précise, un CDI c'est pour toujours. Comme quand j'ai remplacé une vendeuse cet été : j'avais un CDD jusqu'à son retour.",
    ['raisonnement avec contradiction', 'exemple personnel pertinent', 'imprécision'], c(1, 1, 1, 2), "« Toujours à une date précise » contredit l'exemple (fin à un événement) ; « pour toujours » est imprécis ; la période d'essai manque. L'exemple personnel est juste.", true),
  B2('B2-10', 'S12', "C'est l'effet de serre : les gaz à effet de serre réchauffent la planète.",
    ['vocabulaire technique sans compréhension démontrée', 'réponse courte'], c(1, 0, 1, 0), "La réponse nomme sans expliquer ; « réchauffent » au lieu de « retiennent la chaleur » est une imprécision ; aucun des deux éléments (effet naturel utile, renforcement humain).", true),
  B2('B2-11', 'S12', "La Terre a comme une couverture de gaz qui garde une partie de sa chaleur, sinon il ferait glacial. C'est utile. Le problème, c'est qu'en brûlant du pétrole on épaissit la couverture, donc on a trop chaud.",
    ['entièrement correcte', 'exemple personnel pertinent'], c(2, 2, 2, 2), "Image personnelle juste, effet naturel utile, renforcement humain, lien de cause."),
  B2('B2-12', 'S10', "Je sais pas trop, c'est une piqûre contre les maladies.",
    ['réponse ambiguë', 'réponse courte'], c(0, 0, 2, 0), "Presque vide : ni l'apprentissage du corps, ni les rappels. Selon la grille à la lettre, C3 vaut 2 (aucune erreur) : une réponse presque vide gagne donc 2 points. Cas prévu pour tester ce point de la grille.", true),
  B2('B2-13', 'P-H1', "Quand une livraison arrive, le chef ou son second vérifie la température, les dates et les emballages. Si c'est trop chaud, on refuse, on l'écrit sur le bon et on prend des photos, pour pouvoir se faire rembourser par le fournisseur. Ce qui est accepté va en chambre froide en moins d'un quart d'heure.",
    ['entièrement correcte', 'raison vraie non écrite dans la procédure', 'procédure métier'], c(2, 2, 2, 2), "Tout le contenu de la procédure y est. « Pour se faire rembourser » n'est pas écrit dans la procédure : ce n'est pas une erreur de fond (C3 reste à 2), mais un correcteur peut hésiter.", true),
  B2('B2-14', 'S13', "Tout ce qui a une masse s'attire, c'est pour ça qu'on tombe. Dans l'espace il n'y a plus de gravité, c'est pour ça que la Lune flotte autour de nous.",
    ['raisonnement avec contradiction', 'erreur de fond'], c(1, 1, 0, 1), "La première phrase est juste, la seconde la contredit (pas de gravité dans l'espace : erreur de fond). Les orbites sont mal expliquées.", true),

  // ───────────── B3 : transfert (note sur 2) ─────────────
  B3('B3-01', 'S04', "Le mur et le sol font un angle droit. 3² = 9, 5² = 25, 25 − 9 = 16, et la racine de 16 c'est 4. Donc 4 m.",
    ['entièrement correcte', 'calcul'], 2, "Bon résultat et bonne méthode."),
  B3('B3-02', 'S04', "Angle droit entre le mur et le sol, donc 5² = 3² + h². 25 − 9 = 14, donc h fait à peu près 3,7 m.",
    ['erreur de calcul avec méthode correcte', 'calcul'], 1, "Méthode écrite juste, étourderie visible (25 − 9 = 14) : la règle des calculs donne 1."),
  B3('B3-03', 'S04', "4 m.",
    ['bonne conclusion sans justification', 'calcul', 'réponse courte'], 1, "Bon résultat sans méthode : 1."),
  B3('B3-04', 'S04', "5 − 3 = 2, et comme c'est un triangle on double : 4 m.",
    ['bonne réponse avec justification incorrecte', 'calcul'], 0, "Bon résultat obtenu par un raisonnement faux : erreur de fond, 0."),
  B3('B3-05', 'S05', "Il faut la moitié, parce qu'on est deux fois moins. La moitié de 3/4, c'est 3/2 de litre.",
    ['erreur de calcul avec méthode correcte', 'calcul', 'réponse ambiguë'], 0, "La raison (la moitié) est juste, mais diviser une fraction par deux en divisant le bas est une erreur sur la notion même de fraction : raisonnement faux plutôt qu'étourderie. Un correcteur peut lire une étourderie et mettre 1.", true),
  B3('B3-06', 'S17', "1 000 € HT, parce que 1 200, c'est 1 000 plus 20 %. L'entreprise regarde le HT parce que c'est le vrai prix, sans la taxe.",
    ['partiellement correcte', 'calcul'], 1, "Bon résultat et bonne méthode, mais la raison demandée (l'entreprise récupère la TVA) n'est pas donnée : « le vrai prix » reste vague.", true),
  B3('B3-07', 'S17', "1 200 − 20 % = 960 € HT. L'entreprise peut récupérer la TVA, donc c'est ce qui lui coûte vraiment.",
    ['erreur de fond', 'calcul', 'partiellement correcte'], 0, "Raisonnement faux (20 % du TTC) ; la raison sur la TVA est juste, mais la règle dit : erreur de fond, même à côté d'un élément juste, 0.", true),
  B3('B3-08', 'P-R1', "Non, je reste. Le soir on compte la caisse à deux et on sort à deux, c'est écrit, et il n'y a pas d'exception pour le dimanche.",
    ['entièrement correcte', 'procédure métier'], 2, "Décision et règle écrite."),
  B3('B3-09', 'P-R1', "Je refuse : c'est dangereux de rester seul le soir avec la recette, on pourrait se faire agresser.",
    ['raison vraie non écrite dans la procédure', 'procédure métier'], 1, "Bonne décision ; la raison est vraie mais n'est pas écrite dans la procédure : au plus 1."),
  B3('B3-10', 'P-R1', "Je peux fermer seul si le responsable est d'accord au téléphone, sinon non.",
    ['erreur de fond', 'procédure métier'], 0, "Règle inventée (une exception par accord téléphonique) : 0."),
  B3('B3-11', 'P-H1', "Oui je le prends : – 16 en surface, c'est 2 degrés d'écart, on a droit à 3 degrés pendant le déchargement si c'est court. Je le mets vite en chambre froide.",
    ['entièrement correcte', 'procédure métier', 'calcul'], 2, "Décision, écart calculé, tolérance et ses conditions."),
  B3('B3-12', 'P-H1', "Oui, pour les glaces on accepte jusqu'à – 15 °C.",
    ['réponse ambiguë', 'procédure métier'], 1, "Le seuil donné équivaut à la tolérance de 3 °C, mais sans ses conditions (en surface, pendant le déchargement, courte durée) : imprécision. Un correcteur peut lire une règle inventée (0) ou une raison suffisante (2).", true),
  B3('B3-13', 'P-H1', "Non, une glace doit arriver à – 18 °C, sinon on refuse et on prend des photos.",
    ['réponse fausse', 'procédure métier'], 0, "Mauvaise décision, ignore la tolérance écrite."),
  B3('B3-14', 'P-R3', "Je rends le billet au client pour le calmer, mais je préviens le responsable que le billet est faux, car un faux billet ne doit pas être remis en circulation.",
    ['raisonnement avec contradiction', 'procédure métier'], 0, "Contradiction : rendre le billet, c'est le remettre en circulation. Erreur de fond malgré la règle citée."),
  B3('B3-15', 'P-R3', "Je garde le billet, je reste poli et j'appelle mon responsable.",
    ['bonne conclusion sans justification', 'procédure métier'], 1, "Bonne décision complète, aucune raison (pourquoi on ne rend pas le billet)."),
  B3('B3-16', 'S10', "Non, il a servi, sinon ça aurait été pire.",
    ['réponse ambiguë', 'réponse courte'], 1, "Bonne décision ; « sinon ça aurait été pire » suggère l'atténuation sans dire pourquoi (corps entraîné). Lisible comme une raison suffisante (2).", true),
  B3('B3-17', 'S12', "C'est pareil, la chaleur rentre et reste coincée. Mais dans la voiture c'est les vitres qui bloquent l'air chaud, alors que dans le ciel c'est des gaz.",
    ['courte, maladroite, avec fautes, mais juste', 'entièrement correcte'], 2, "Ressemblance et limite, toutes deux justes, dans des mots simples."),
  B3('B3-18', 'S13', "Il reste en orbite parce que là-haut la gravité de la Terre ne l'atteint plus, il flotte.",
    ['bonne réponse avec justification incorrecte', 'erreur de fond'], 0, "Conclusion juste (il reste en orbite) mais raison fausse : la Terre l'attire en permanence."),
  B3('B3-19', 'S20', "risque bactéri qui se multipli car sa a décongelé. pas recongeler, jeter si on sait pas la température.",
    ['courte, maladroite, avec fautes, mais juste', 'entièrement correcte'], 2, "Les deux éléments sont là malgré l'orthographe."),
  B3('B3-20', 'S06', "Les intérêts composés, c'est quand les intérêts rapportent eux-mêmes des intérêts.",
    ['réponse ambiguë', 'vocabulaire technique sans compréhension démontrée'], 0, "Récitation de la définition sans l'appliquer à la dette (règle : 0). Mais cette définition est aussi la raison attendue : un correcteur peut mettre 1.", true),

  // ───────────── B4 : déblocage (chaque question 0, 1 ou 2 ; décision sur la somme) ─────────────
  B4('B4-01', 'S06', R('220 €, puis 242 €', "La deuxième année, les 10 % se calculent sur 220 €, donc on ajoute 22 €."), R('Non, les intérêts ne restent pas pour rapporter à leur tour', "L'argent retiré ne peut plus rapporter d'intérêts, on repart toujours de 200 €."),
    ['bon choix et justification correcte', 'débloqué'], { Q1: 2, Q2: 2, decision: 'débloqué' }, "Deux bons choix, deux raisons justes."),
  B4('B4-02', 'S06', R('220 €, puis 242 €', "C'est le bon calcul."), R('Non, les intérêts ne restent pas pour rapporter à leur tour', "Non, parce que la banque baisse le taux quand on retire."),
    ['bon choix et justification insuffisante', 'bon choix et justification fausse', 'non débloqué'], { Q1: 1, Q2: 0, decision: 'non débloqué' }, "Q1 : justification qui ne dit rien. Q2 : bon choix, raison fausse (0)."),
  B4('B4-03', 'S09', R('Oui, presque toutes ses cellules ont le même ADN', "C'est la même personne, toutes ses cellules viennent de la même cellule de départ."), R("L'ADN des parents change un peu chaque année", "Les parents vieillissent, donc leur ADN change entre deux enfants."),
    ['bon choix et justification correcte', 'mauvais choix', 'partiellement débloqué'], { Q1: 2, Q2: 0, decision: 'partiellement débloqué' }, "Une question comprise, l'autre manquée : 2 + 0."),
  B4('B4-04', 'S09', R('Oui, presque toutes ses cellules ont le même ADN', "Oui, c'est la même personne."), R("Chacun reçoit une combinaison différente de l'ADN des parents", "Parce que chacun est unique."),
    ['bon choix et justification insuffisante', 'partiellement débloqué'], { Q1: 1, Q2: 1, decision: 'partiellement débloqué' }, "Deux bons choix sans raison : 1 + 1. « C'est la même personne » peut être lu comme suffisant.", true),
  B4('B4-05', 'S19', R('Non : un nouvel usage doit être annoncé et justifié', "On l'a donnée pour vérifier l'âge, pas pour autre chose. Pour l'utiliser autrement il faut prévenir et avoir le droit."), R('Un numéro permet souvent de retrouver la personne', "Avec le numéro on peut appeler et savoir qui c'est."),
    ['bon choix et justification correcte', 'débloqué'], { Q1: 2, Q2: 2, decision: 'débloqué' }, "Deux raisons justes."),
  B4('B4-06', 'S19', R("Oui, une fois collectée, elle peut servir à tout ce que le site veut", "Une fois qu'on l'a donnée, elle appartient au site."), R('Un numéro permet souvent de retrouver la personne', "C'est privé."),
    ['mauvais choix', 'bon choix et justification insuffisante', 'non débloqué'], { Q1: 0, Q2: 1, decision: 'non débloqué' }, "0 + 1."),
  B4('B4-07', 'P-H1', R('Je la refuse, je le note sur le bon et je photographie les preuves', "Le maximum pour les préparations, c'est + 3 °C. À + 5 on refuse, on l'écrit sur le bon et on prend les photos."), R("Il ne la réceptionne pas : c'est le rôle du chef ou du second", "C'est plus prudent que ce soit quelqu'un d'expérimenté qui vérifie."),
    ['procédure métier', 'bon choix et justification correcte', 'raison vraie non écrite dans la procédure', 'débloqué'], { Q1: 2, Q2: 1, decision: 'débloqué' }, "Q2 : raison plausible mais non écrite (la procédure dit seulement que toutes les livraisons sont reçues par le chef ou son second) : insuffisante, 1."),
  B4('B4-08', 'P-H1', R('Je la refuse, je le note sur le bon et je photographie les preuves', "Parce que c'est trop chaud."), R("Il ne la réceptionne pas : c'est le rôle du chef ou du second", "Même pour les boissons, c'est le chef ou son second qui reçoit, c'est écrit."),
    ['procédure métier', 'bon choix et justification insuffisante', 'débloqué'], { Q1: 1, Q2: 2, decision: 'débloqué' }, "Q1 : « trop chaud » ne cite pas le seuil de + 3 °C. Un correcteur peut le juger suffisant (2).", true),
  B4('B4-09', 'P-R3', R("J'appelle le responsable : son plafond est plus élevé", "Il habite à l'étranger, ce n'est pas la même limite, et la procédure dit d'appeler le responsable."), R('Oui, si le collègue travaille dans le même rayon', "C'est un collègue de confiance."),
    ['procédure métier', 'bon choix et justification correcte', 'mauvais choix', 'partiellement débloqué'], { Q1: 2, Q2: 0, decision: 'partiellement débloqué' }, "2 + 0."),
  B4('B4-10', 'P-R3', R('Je refuse : 1 000 € est le plafond pour tous les clients', "Le plafond c'est 1 000 €."), R('Non : une session ne doit jamais rester ouverte', "Non, mais si c'est pour cinq minutes on peut."),
    ['procédure métier', 'mauvais choix', 'raisonnement avec contradiction', 'non débloqué'], { Q1: 0, Q2: 0, decision: 'non débloqué' }, "Q1 : mauvais choix. Q2 : bon choix, mais la justification le contredit (erreur de fond) : 0."),
  B4('B4-11', 'S04', R('50 cm', "30² + 40² = 900 + 1600 = 2500, donc la diagonale fait 50."), R("Son carré est la somme des deux autres carrés, donc plus grand", "Parce qu'elle est en face de l'angle droit."),
    ['bon choix et justification correcte', 'bon choix et justification insuffisante', 'débloqué'], { Q1: 2, Q2: 1, decision: 'débloqué' }, "Q2 : la phrase est vraie mais dit où est l'hypoténuse, pas pourquoi elle est la plus longue : insuffisante. Un correcteur peut la juger fausse (0), ce qui ferait passer la décision à « partiellement ».", true),
  B4('B4-12', 'S20', R('Dans un sac isotherme avec des pains de glace', "Sinon ça tourne avec la chaleur : il faut du froid pendant tout le trajet, même si le poulet est cuit."), R('La cuisson détruit la plupart des bactéries apparues', "Parce que la cuisson tue tout, il n'y a plus aucune bactérie."),
    ['bon choix et justification correcte', 'bon choix et justification fausse', 'partiellement débloqué'], { Q1: 2, Q2: 0, decision: 'partiellement débloqué' }, "Q2 : « tue tout, plus aucune bactérie » contredit le choix (« la plupart ») : erreur de fond, 0. Un correcteur peut y voir une simple exagération (1).", true),
  B4('B4-13', 'S15', R("Un peu moins qu'au début", "les pri ont monté de 5% mais moi jai toujours 1000"), R('Revenus et prix montent au même rythme', "si les deux monte pareil sa s'annule"),
    ['courte, maladroite, avec fautes, mais juste', 'débloqué'], { Q1: 2, Q2: 2, decision: 'débloqué' }, "Deux raisons justes malgré l'orthographe."),
];
