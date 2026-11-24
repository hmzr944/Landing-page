/* Corpus métier n° 1 : contenu des documents.
   TOUS LES DOCUMENTS SONT FABRIQUÉS (jeu de test). Les enseignes sont fictives. Seules les règles marquées
   base « reglementaire » reprennent un texte public, vérifié à la source indiquée (voir SOURCES).
   Les règles « interne » sont des choix inventés pour l'exercice : elles ne sont ni des obligations légales,
   ni des recommandations.
   Une règle attendue = une phrase exacte du document (r: {...}). Les changements d'une v2 sont décrits dans
   « changements » (doivent être détectés) et « non_changements » (ne doivent pas déclencher de revalidation).
   Décisions sur le corrigé (datées, jamais après le lancement d'une campagne) :
   - 2026-11-22 : R1, « Allumer l'éclairage et démarrer les caisses » → « Démarrer les caisses, puis allumer l'éclairage »
     passe de piège « reformulation » à changement « modifie » (ordre imposé). 10 changements, 3 pièges. Les campagnes
     des missions 2 et 2b restent calculées avec le corrigé figé corpus-reference-2026-11-16.json. */

const SOURCES = {
  temp: { titre: 'Arrêté du 21 décembre 2009, article 3 et annexe I (extrait publié par la préfecture du Calvados)', url: 'https://www.calvados.gouv.fr/index.php/contenu/telechargement/18316/140968/file/temperature_de_conservation_et_service_des_aliments.pdf', verifie: '2026-11-16' },
  refroid: { titre: 'Arrêté du 21 décembre 2009, annexe IV : refroidissement rapide (dispositions de restauration collective, reprises ici comme règle interne)', url: 'https://pedagogie.ac-strasbourg.fr/fileadmin/pedagogie/ecogestionpro/filieres_et_ressources/hotellerie_restauration/PMS_-_PRP/guide_PMS/2._BONNES_PRATIQUES_DE_FABRICATION/2.12_REFROIDISSEMENT_RAPIDE.pdf', verifie: '2026-11-16' },
  inco: { titre: 'Règlement (UE) n° 1169/2011 (INCO), annexe II : 14 substances ou produits provoquant des allergies ou intolérances', url: 'https://eur-lex.europa.eu/eli/reg/2011/1169/oj', verifie: '2026-11-16' },
  reprise: { titre: 'INC : pas de droit général au remboursement en magasin ; garantie légale de conformité', url: 'https://www.inc-conso.fr/content/puis-je-exiger-le-remboursement-dun-produit-achete-dans-un-magasin', verifie: '2026-11-16' },
  garantie: { titre: 'INC : garanties du vendeur (biens achetés à partir du 1er janvier 2022), 2 ans pour un bien neuf', url: 'https://www.inc-conso.fr/content/garanties-du-vendeur-en-22-questions-reponses-biens-achetes-partir-du-01-01-2022', verifie: '2026-11-16' },
  especes: { titre: 'INC : les espèces (plafond de 1 000 €, 50 pièces au plus, billets présumés faux)', url: 'https://www.inc-conso.fr/content/les-especes-vos-questions-nos-reponses-0', verifie: '2026-11-16' },
  plafond: { titre: 'BOFiP : article D. 112-3 du code monétaire et financier, paiement en espèces au-delà de 1 000 €', url: 'https://bofip.impots.gouv.fr/node/13824', verifie: '2026-11-16' },
};

const ARDOISE = 'Maison Ardoise (enseigne fictive, équipement de la maison)';
const QUAI = 'Brasserie du Quai (restaurant fictif, 60 couverts)';
const BANDEAU = 'Document fictif fabriqué pour tester Arbor. Ce n’est pas une procédure réelle.';

const i = (id, base, extra = {}) => ({ id, base, ...extra });

const DOCS = [
  // ───────────────────────── RETAIL ─────────────────────────
  {
    id: 'R1-v1', procedure: 'R1', version: 1, date: '2026-03-03', secteur: 'retail', org: ARDOISE,
    titre: 'Ouverture et fermeture du magasin',
    sections: [
      { h: 'Objet', p: ['Cette procédure décrit l’ouverture du magasin au public à 9 h 30 et sa fermeture à 19 h 00. Elle s’applique à tous les responsables et vendeurs.'] },
      { h: 'Ouverture', ol: [
        { t: 'Le magasin est ouvert par deux personnes au minimum, présentes dès 9 h 00.', r: i('R1.deux-personnes', 'interne', { sensible: true }) },
        { t: 'Désactiver l’alarme dans les 45 secondes avec son code personnel. Le code ne se communique jamais.', r: i('R1.alarme-delai', 'interne', { sensible: true }) },
        { t: 'Faire le tour de sécurité : issues de secours dégagées et déverrouillées, extincteurs à leur place.', r: i('R1.tour-securite', 'interne', { sensible: true }) },
        { t: 'Allumer l’éclairage et démarrer les caisses.' },
        { t: 'Compter le fond de caisse de 150 € en présence du responsable et signaler tout écart.', r: i('R1.fond-caisse', 'interne') },
        { t: 'Ouvrir les portes au public à 9 h 30.' },
      ] },
      { h: 'Fermeture', ol: [
        { t: 'Annoncer la fermeture aux clients 15 minutes avant.', r: i('R1.annonce', 'interne') },
        { t: 'Fermer les portes à 19 h 00 et accompagner les derniers clients vers la sortie.' },
        { t: 'Compter les caisses à deux personnes et placer l’enveloppe scellée dans le coffre.', r: i('R1.comptage-deux', 'interne', { sensible: true }) },
        { t: 'Vérifier qu’il ne reste personne dans les cabines et les réserves, puis fermer les issues de secours.' },
        { t: 'Activer l’alarme et sortir à deux.' },
        { t: 'Le dimanche, le responsable peut fermer seul le magasin.', r: i('R1.dimanche-seul', 'interne', { sensible: true }) },
      ] },
      { h: 'Incident', p: ['En cas de déclenchement de l’alarme par erreur, appeler la télésurveillance au numéro affiché dans le bureau et donner le mot de passe du site.'] },
    ],
  },
  {
    id: 'R1-v2', procedure: 'R1', version: 2, date: '2026-09-02', secteur: 'retail', org: ARDOISE,
    titre: 'Ouverture et fermeture du magasin',
    sections: [
      { h: 'Objet', p: ['Cette procédure décrit l’ouverture du magasin au public à 9 h 30 et sa fermeture à 19 h 00. Elle s’applique à tous les responsables et vendeurs.'] },
      { h: 'Incident', p: ['En cas de déclenchement de l’alarme par erreur, appeler la télésurveillance au numéro affiché dans le bureau et donner le mot de passe du site.'] },
      { h: 'Ouverture', ol: [
        { t: 'Le magasin est ouvert par deux personnes au minimum, présentes dès 9 h 00.', r: i('R1.deux-personnes', 'interne', { sensible: true }) },
        { t: 'Désactiver l’alarme dans les 30 secondes avec son code personnel. Le code ne se communique jamais.', r: i('R1.alarme-delai', 'interne', { sensible: true }) },
        { t: 'Faire le tour de sécurité : issues de secours dégagées et déverrouillées, extincteurs à leur place.', r: i('R1.tour-securite', 'interne', { sensible: true }) },
        { t: 'Vérifier que le voyant du défibrillateur est vert ; sinon prévenir le responsable avant l’ouverture.', r: i('R1.defibrillateur', 'interne', { sensible: true }) },
        { t: 'Démarrer les caisses, puis allumer l’éclairage.' },
        { t: 'Compter le fond de caisse de 200 € en présence du responsable et signaler tout écart.', r: i('R1.fond-caisse', 'interne') },
        { t: 'Ouvrir les portes au public à 9 h 30.' },
      ] },
      { h: 'Fermeture', ol: [
        { t: 'Annoncer la fermeture aux clients 15 minutes avant.', r: i('R1.annonce', 'interne') },
        { t: 'Fermer les portes à 19 h 00 et accompagner les derniers clients vers la sortie.' },
        { t: 'Compter les caisses à deux personnes et placer l’enveloppe scellée dans le coffre.', r: i('R1.comptage-deux', 'interne', { sensible: true }) },
        { t: 'Vérifier qu’il ne reste personne dans les cabines et les réserves, puis fermer les issues de secours.' },
        { t: 'Activer l’alarme et sortir à deux.' },
      ] },
    ],
    changements: [
      { id: 'R1.c1', type: 'modifie', regle: 'R1.fond-caisse', avant: 'fond de caisse de 150 €', apres: 'fond de caisse de 200 €' },
      { id: 'R1.c2', type: 'modifie', regle: 'R1.alarme-delai', avant: 'dans les 45 secondes', apres: 'dans les 30 secondes', sensible: true },
      { id: 'R1.c3', type: 'ajoute', regle: 'R1.defibrillateur', apres: 'Vérifier que le voyant du défibrillateur est vert', sensible: true },
      { id: 'R1.c4', type: 'supprime', regle: 'R1.dimanche-seul', avant: 'Le dimanche, le responsable peut fermer seul le magasin.', sensible: true, note: 'La fermeture à deux s’applique désormais tous les jours.' },
      { id: 'R1.c5', type: 'modifie', avant: 'Allumer l’éclairage et démarrer les caisses.', apres: 'Démarrer les caisses, puis allumer l’éclairage.', decision: '2026-11-22', note: 'Requalifié le 2026-11-22 (décision du responsable produit) : « et » ne fixait pas d’ordre, « puis » en impose un. Changement d’ordre des étapes, à signaler. Avant cette date : piège « reformulation » (corrigé figé dans corpus-reference-2026-11-16.json).' },
    ],
    non_changements: [
      { type: 'deplacement', texte: 'En cas de déclenchement de l’alarme par erreur', note: 'Section « Incident » déplacée en tête, texte identique.' },
    ],
  },
  {
    id: 'R2-v1', procedure: 'R2', version: 1, date: '2026-04-14', secteur: 'retail', org: ARDOISE,
    titre: 'Retour d’un article par un client',
    sections: [
      { h: 'Ce que dit la loi', p: [
        { t: 'Un magasin n’est pas obligé de reprendre ou de rembourser un article qui n’a pas de défaut : la loi ne prévoit pas de droit de changer d’avis pour un achat en magasin.', r: i('R2.pas-obligation', 'reglementaire', { source: 'reprise' }) },
        { t: 'Un article neuf qui présente un défaut est couvert par la garantie légale de conformité pendant 2 ans à partir de l’achat.', r: i('R2.garantie-2-ans', 'reglementaire', { source: 'garantie' }) },
        { t: 'Une affiche « ni repris ni échangé » ne supprime jamais la garantie légale de conformité.', r: i('R2.affiche', 'reglementaire', { source: 'reprise' }) },
      ] },
      { h: 'Article sans défaut (geste commercial de Maison Ardoise)', ol: [
        { t: 'Le retour est accepté pendant 30 jours après l’achat, sur présentation du ticket de caisse.', r: i('R2.delai-30', 'interne') },
        { t: 'L’article doit être neuf, non utilisé, dans son emballage d’origine.' },
        { t: 'Le client choisit entre un avoir et un remboursement sur le moyen de paiement utilisé à l’achat.', r: i('R2.choix', 'interne') },
        { t: 'Les articles soldés ne sont ni repris ni échangés, sauf défaut.' },
      ] },
      { h: 'Article défectueux (garantie légale)', ol: [
        { t: 'Ne jamais refuser la demande au motif que le délai de 30 jours est dépassé.', r: i('R2.jamais-refuser', 'reglementaire', { source: 'garantie', sensible: true }) },
        { t: 'Proposer d’abord la réparation ou le remplacement de l’article.', r: i('R2.reparer-remplacer', 'reglementaire', { source: 'reprise' }) },
        { t: 'Si ni la réparation ni le remplacement ne sont possibles, rembourser le client.' },
        { t: 'Noter le défaut constaté sur la fiche de retour et la faire signer par le client.' },
      ] },
      { h: 'Validation et paiement', ol: [
        { t: 'Tout remboursement de plus de 150 € est validé par le responsable avant d’être effectué.', r: i('R2.validation-150', 'interne', { sensible: true }) },
        { t: 'Un remboursement en espèces ne dépasse jamais 150 €.', r: i('R2.especes-150', 'interne', { sensible: true }) },
      ] },
    ],
  },
  {
    id: 'R3-v1', procedure: 'R3', version: 1, date: '2026-09-02', secteur: 'retail', org: ARDOISE,
    titre: 'Tenue de la caisse',
    sections: [
      { h: 'Prise de poste', ol: [
        { t: 'Chaque vendeur se connecte à la caisse avec son identifiant personnel et ne laisse jamais sa session ouverte.', r: i('R3.session', 'interne', { sensible: true }) },
        { t: 'Le fond de caisse est de 200 €.', r: i('R3.fond-caisse', 'interne') },
      ] },
      { h: 'Paiement en espèces', ol: [
        { t: 'Un client dont le domicile fiscal est en France ne peut pas payer en espèces un achat de plus de 1 000 €.', r: i('R3.plafond-1000', 'reglementaire', { source: 'plafond', sensible: true }) },
        { t: 'Pour un client dont le domicile fiscal est à l’étranger, le plafond est plus élevé : appeler le responsable.' },
        { t: 'Le vendeur n’est pas tenu d’accepter plus de 50 pièces pour un même paiement.', r: i('R3.50-pieces', 'reglementaire', { source: 'especes' }) },
        { t: 'Vérifier chaque billet de 50 € et plus au détecteur.', r: i('R3.detecteur', 'interne') },
      ] },
      { h: 'Billet présumé faux', ol: [
        { t: 'Un billet présumé faux ne doit jamais être remis en circulation : il n’est pas rendu en monnaie.', r: i('R3.faux-billet', 'reglementaire', { source: 'especes', sensible: true }) },
        { t: 'Rester courtois, ne pas accuser le client, appeler le responsable.' },
        { t: 'Le responsable remet le billet à la Banque de France, à un commissariat ou à une gendarmerie.', r: i('R3.faux-remise', 'reglementaire', { source: 'especes' }) },
      ] },
      { h: 'Écarts et prélèvements', ol: [
        { t: 'Quand le tiroir contient plus de 800 € en espèces, le responsable fait un prélèvement vers le coffre.', r: i('R3.prelevement', 'interne', { sensible: true }) },
        { t: 'Tout écart de plus de 10 € en fin de journée fait l’objet d’une fiche d’écart signée par le vendeur et le responsable.', r: i('R3.ecart', 'interne', { sensible: true }) },
      ] },
    ],
  },

  // ─────────────────── HÔTELLERIE-RESTAURATION ───────────────────
  {
    id: 'H1-v1', procedure: 'H1', version: 1, date: '2026-02-10', secteur: 'hcr', org: QUAI,
    titre: 'Réception des livraisons',
    sections: [
      { h: 'Qui réceptionne', p: [
        { t: 'Les livraisons sont reçues entre 7 h et 10 h par le chef ou son second.', r: i('H1.qui', 'interne', { sensible: true }) },
        { t: 'Exception : les livraisons de boissons et d’épicerie sèche peuvent être reçues par un commis.', r: i('H1.exception-commis', 'interne') },
      ] },
      { h: 'Contrôles à réception', ol: [
        { t: 'Vérifier que les emballages ne sont pas abîmés.' },
        { t: 'Contrôler la date limite de consommation : il doit rester au moins 3 jours pour les viandes et les poissons.', r: i('H1.dlc', 'interne', { sensible: true }) },
        { t: 'Mesurer la température avec le thermomètre sonde, placé entre deux emballages, sans les percer.', r: i('H1.sonde', 'interne') },
        { t: 'Rapprocher les quantités du bon de livraison.' },
      ] },
      { h: 'Températures maximales à réception', ul: [
        { t: 'Viandes hachées : + 2 °C.', r: i('H1.t-hachees', 'reglementaire', { source: 'temp', sensible: true }) },
        { t: 'Produits de la pêche frais : + 2 °C.', r: i('H1.t-peche', 'reglementaire', { source: 'temp', sensible: true }) },
        { t: 'Viandes de volaille et préparations de viandes : + 4 °C.', r: i('H1.t-volaille', 'reglementaire', { source: 'temp', sensible: true }) },
        { t: 'Préparations culinaires élaborées à l’avance : + 3 °C.', r: i('H1.t-preparations', 'reglementaire', { source: 'temp', sensible: true }) },
        { t: 'Glaces et crèmes glacées : – 18 °C.', r: i('H1.t-glaces', 'reglementaire', { source: 'temp', sensible: true }) },
      ] },
      { h: 'Refus et rangement', ol: [
        { t: 'Si une température dépasse le maximum, refuser le produit, l’écrire sur le bon de livraison et prévenir le chef.', r: i('H1.refus', 'interne', { sensible: true }) },
        { t: 'Ranger les produits acceptés en chambre froide dans les 30 minutes.', r: i('H1.rangement', 'interne', { sensible: true }) },
        { t: 'Conserver les étiquettes de traçabilité des viandes avec le bon de livraison.', r: i('H1.tracabilite', 'interne') },
      ] },
    ],
  },
  {
    id: 'H1-v2', procedure: 'H1', version: 2, date: '2026-07-15', secteur: 'hcr', org: QUAI,
    titre: 'Réception des livraisons',
    sections: [
      { h: 'Qui réceptionne', p: [
        { t: 'Les livraisons sont reçues entre 7 h et 10 h par le chef ou son second.', r: i('H1.qui', 'interne', { sensible: true }) },
        'Cette règle vaut pour toutes les livraisons, boissons et épicerie sèche comprises.',
      ] },
      { h: 'Contrôles à réception', ol: [
        { t: 'Contrôler l’intégrité des emballages.' },
        { t: 'Contrôler la date limite de consommation : il doit rester au moins 4 jours pour les viandes et les poissons.', r: i('H1.dlc', 'interne', { sensible: true }) },
        { t: 'Mesurer la température avec le thermomètre sonde, placé entre deux emballages, sans les percer.', r: i('H1.sonde', 'interne') },
        { t: 'Rapprocher les quantités du bon de livraison.' },
      ] },
      { h: 'Températures maximales à réception', ul: [
        { t: 'Viandes hachées : + 2 °C.', r: i('H1.t-hachees', 'reglementaire', { source: 'temp', sensible: true }) },
        { t: 'Produits de la pêche frais : + 2 °C.', r: i('H1.t-peche', 'reglementaire', { source: 'temp', sensible: true }) },
        { t: 'Viandes de volaille et préparations de viandes : + 4 °C.', r: i('H1.t-volaille', 'reglementaire', { source: 'temp', sensible: true }) },
        { t: 'Préparations culinaires élaborées à l’avance : + 3 °C.', r: i('H1.t-preparations', 'reglementaire', { source: 'temp', sensible: true }) },
        { t: 'Glaces et crèmes glacées : – 18 °C.', r: i('H1.t-glaces', 'reglementaire', { source: 'temp', sensible: true }) },
        { t: 'Pour les glaces et les produits congelés, un écart de 3 °C au plus en surface est admis pendant le déchargement, sur une courte durée.', r: i('H1.tolerance', 'reglementaire', { source: 'temp', sensible: true }) },
      ] },
      { h: 'Refus et rangement', ol: [
        { t: 'Si une température dépasse le maximum, refuser le produit, l’écrire sur le bon de livraison et prévenir le chef.', r: i('H1.refus', 'interne', { sensible: true }) },
        { t: 'Photographier le thermomètre et le bon de livraison pour chaque produit refusé, et joindre les photos au registre.', r: i('H1.photo', 'interne') },
        { t: 'Ranger les produits acceptés en chambre froide dans les 15 minutes.', r: i('H1.rangement', 'interne', { sensible: true }) },
        { t: 'Conserver les étiquettes de traçabilité des viandes avec le bon de livraison.', r: i('H1.tracabilite', 'interne') },
      ] },
    ],
    changements: [
      { id: 'H1.c1', type: 'supprime', regle: 'H1.exception-commis', avant: 'peuvent être reçues par un commis', note: 'Le commis ne réceptionne plus aucune livraison (changement de rôle).', sensible: true },
      { id: 'H1.c2', type: 'modifie', regle: 'H1.dlc', avant: 'au moins 3 jours', apres: 'au moins 4 jours', sensible: true },
      { id: 'H1.c3', type: 'ajoute', regle: 'H1.tolerance', apres: 'un écart de 3 °C au plus en surface', sensible: true },
      { id: 'H1.c4', type: 'ajoute', regle: 'H1.photo', apres: 'Photographier le thermomètre et le bon de livraison' },
      { id: 'H1.c5', type: 'modifie', regle: 'H1.rangement', avant: 'dans les 30 minutes', apres: 'dans les 15 minutes', sensible: true },
    ],
    non_changements: [
      { type: 'reformulation', avant: 'Vérifier que les emballages ne sont pas abîmés.', apres: 'Contrôler l’intégrité des emballages.', note: 'Même consigne, autres mots.' },
      { type: 'identique', texte: 'Viandes hachées : + 2 °C.', note: 'Tableau des températures inchangé : aucune revalidation attendue pour ces règles.' },
    ],
  },
  {
    id: 'H2-v1', procedure: 'H2', version: 1, date: '2026-02-10', secteur: 'hcr', org: QUAI,
    titre: 'Chaîne du froid en cuisine',
    sections: [
      { h: 'Stockage', ol: [
        { t: 'Les préparations culinaires élaborées à l’avance sont conservées à + 3 °C au plus.', r: i('H2.preparations', 'reglementaire', { source: 'temp', sensible: true }) },
        { t: 'Relever la température de chaque réfrigérateur et de la chambre froide à l’ouverture et à la fermeture, et la noter dans le registre.', r: i('H2.releves', 'interne') },
        { t: 'Un produit décongelé n’est jamais recongelé.', r: i('H2.recongeler', 'interne', { sensible: true }) },
        { t: 'Toute préparation entamée porte une étiquette avec la date de fabrication.' },
      ] },
      { h: 'Refroidissement rapide', ol: [
        { t: 'Une préparation cuite destinée à être servie froide passe de + 63 °C à moins de + 10 °C à cœur en moins de 2 heures, en cellule de refroidissement.', r: i('H2.refroidissement', 'reglementaire', { source: 'refroid', sensible: true }) },
        { t: 'Si ce délai est dépassé, la préparation est jetée.', r: i('H2.jeter', 'reglementaire', { source: 'refroid', sensible: true }) },
      ] },
      { h: 'Plats servis chauds', ol: [
        { t: 'Les plats servis chauds sont maintenus à + 63 °C au moins.', r: i('H2.maintien', 'reglementaire', { source: 'temp', sensible: true }) },
        { t: 'Une préparation remise en température atteint + 63 °C à cœur en moins d’une heure.', r: i('H2.remise', 'interne', { sensible: true }) },
      ] },
      { h: 'Panne de froid', ol: [
        { t: 'Si un réfrigérateur dépasse + 8 °C, prévenir le chef, transférer les produits dans un autre équipement et noter l’heure dans le registre.', r: i('H2.panne', 'interne', { sensible: true }) },
        { t: 'Le chef décide du sort des produits : rien n’est servi sans son accord.' },
      ] },
    ],
  },
  {
    id: 'H3-v1', procedure: 'H3', version: 1, date: '2026-05-20', secteur: 'hcr', org: QUAI,
    titre: 'Réclamation d’un client',
    sections: [
      { h: 'En salle', ol: [
        { t: 'Écouter le client jusqu’au bout, sans l’interrompre ni contester.', r: i('H3.ecouter', 'interne') },
        { t: 'Pour un plat non conforme (froid, mal cuit, erreur de commande), proposer de le remplacer ou de le retirer de l’addition.', r: i('H3.remplacer', 'interne') },
        { t: 'Un geste commercial de plus de 30 € est décidé par le responsable de salle.', r: i('H3.geste-30', 'interne') },
      ] },
      { h: 'Allergènes', ol: [
        { t: 'La carte des allergènes indique, pour chaque plat, la présence des 14 allergènes majeurs fixés par le règlement européen INCO.', r: i('H3.14-allergenes', 'reglementaire', { source: 'inco' }) },
        { t: 'Si un client signale une allergie, vérifier sur la carte des allergènes et demander au chef ; ne jamais répondre de mémoire.', r: i('H3.jamais-memoire', 'interne', { sensible: true }) },
        { t: 'En cas de réaction allergique (gêne respiratoire, gonflement), appeler immédiatement le 15.', r: i('H3.appel-15', 'interne', { sensible: true }) },
        { t: 'Conserver le reste du plat au froid, étiqueté, et prévenir le chef.', r: i('H3.conserver', 'interne', { sensible: true }) },
      ] },
      { h: 'Après la réclamation', ol: [
        { t: 'Noter chaque réclamation dans le registre : date, table, motif, réponse apportée.', r: i('H3.registre', 'interne') },
        { t: 'Une réclamation écrite reçoit une réponse sous 7 jours.', r: i('H3.reponse-7', 'interne') },
      ] },
    ],
  },
];

if (typeof module !== 'undefined') module.exports = { DOCS, SOURCES, BANDEAU };
