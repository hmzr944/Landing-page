/* Contrôle hors corpus n° 2 (mission 2d) : procédure P2, jamais vue par le banc, écrite et figée le 2026-11-22 AVANT toute
   modification du code de la mission 2d. Mesurée et rapportée à part : ni seuil, ni donnée de réglage.
   Document fabriqué ; organisation fictive. Mêmes conventions que ../contenu.js.

   Ce qu'elle met à l'épreuve :
   - marqueurs d'ordre : « ensuite » impose un ordre qui n'existait pas (changement) ; « avant » / « après » qui gardent
     le même ordre avec d'autres mots (piège : reformulation) ; « avant » dans une phrase identique (piège) ;
   - numérotation : une étape ajoutée en tête décale les numéros des étapes suivantes, restées identiques (piège) ;
   - mêmes mots, portée différente selon le contexte : « Dégivrer le congélateur. » passe de « Le week-end » à « Chaque
     soir » (changement) ; « Porter des gants. » apparaît aussi sous « Stockage » (nouvelle obligation). */

const ORG = 'Brasserie du Quai (restaurant fictif, 60 couverts)';
const i = (id, base, extra = {}) => ({ id, base, ...extra });

const DOCS = [
  {
    id: 'P2-v1', procedure: 'P2', version: 1, date: '2026-03-09', secteur: 'hcr', org: ORG,
    titre: 'Fermeture de la cuisine',
    sections: [
      { h: 'Objet', p: ['Cette procédure décrit la fermeture de la cuisine après le service du soir.'] },
      { h: 'Nettoyage', ol: [
        { t: 'Débrancher la trancheuse avant de la nettoyer.', r: i('P2.trancheuse', 'interne', { sensible: true }) },
        { t: 'Laver les plans de travail avec le produit désinfectant.', r: i('P2.plans', 'interne', { sensible: true }) },
        { t: 'Ranger les denrées et nettoyer les réfrigérateurs.', r: i('P2.frigos', 'interne') },
        { t: 'Porter des gants.', r: i('P2.gants-nettoyage', 'interne', { sensible: true }) },
      ] },
      { h: 'Stockage', ol: [
        { t: 'Filmer et étiqueter les préparations entamées.', r: i('P2.filmer', 'interne', { sensible: true }) },
        { t: 'Jeter les préparations de plus de 3 jours.', r: i('P2.jeter', 'interne', { sensible: true }) },
      ] },
      { h: 'Le week-end', ol: [
        { t: 'Dégivrer le congélateur.', r: i('P2.degivrer', 'interne') },
      ] },
      { h: 'Sécurité', ol: [
        { t: 'Fermer le gaz avant de quitter la cuisine.', r: i('P2.gaz', 'interne', { sensible: true }) },
        { t: 'Le chef vérifie la fermeture de toutes les portes.', r: i('P2.chef-portes', 'interne', { sensible: true }) },
      ] },
    ],
  },
  {
    id: 'P2-v2', procedure: 'P2', version: 2, date: '2026-10-20', secteur: 'hcr', org: ORG,
    titre: 'Fermeture de la cuisine',
    sections: [
      { h: 'Objet', p: ['Cette procédure décrit la fermeture de la cuisine après le service du soir.'] },
      { h: 'Nettoyage', ol: [
        { t: 'Retirer les déchets alimentaires des bacs.', r: i('P2.dechets', 'interne', { sensible: true }) },
        { t: 'Nettoyer la trancheuse seulement après l’avoir débranchée.', r: i('P2.trancheuse', 'interne', { sensible: true }) },
        { t: 'Laver les plans de travail avec le produit désinfectant.', r: i('P2.plans', 'interne', { sensible: true }) },
        { t: 'Nettoyer les réfrigérateurs, ensuite ranger les denrées.', r: i('P2.frigos', 'interne') },
        { t: 'Porter des gants.', r: i('P2.gants-nettoyage', 'interne', { sensible: true }) },
      ] },
      { h: 'Stockage', ol: [
        { t: 'Filmer et étiqueter les préparations entamées.', r: i('P2.filmer', 'interne', { sensible: true }) },
        { t: 'Jeter les préparations de plus de 2 jours.', r: i('P2.jeter', 'interne', { sensible: true }) },
        { t: 'Porter des gants.', r: i('P2.gants-stockage', 'interne', { sensible: true }) },
      ] },
      { h: 'Chaque soir', ol: [
        { t: 'Dégivrer le congélateur.', r: i('P2.degivrer', 'interne') },
      ] },
      { h: 'Sécurité', ol: [
        { t: 'Fermer le gaz avant de quitter la cuisine.', r: i('P2.gaz', 'interne', { sensible: true }) },
      ] },
    ],
    changements: [
      { id: 'P2.c1', type: 'ajoute', regle: 'P2.dechets', apres: 'Retirer les déchets alimentaires des bacs.', note: 'Vraie nouveauté, en tête de liste : décale la numérotation des étapes suivantes.' },
      { id: 'P2.c2', type: 'modifie', regle: 'P2.frigos', avant: 'Ranger les denrées et nettoyer les réfrigérateurs.', apres: 'Nettoyer les réfrigérateurs, ensuite ranger les denrées.', note: 'Ordre imposé par « ensuite » (règle du 2026-11-22).' },
      { id: 'P2.c3', type: 'modifie', regle: 'P2.jeter', avant: 'de plus de 3 jours', apres: 'de plus de 2 jours' },
      { id: 'P2.c4', type: 'modifie', regle: 'P2.degivrer', avant: 'Dégivrer le congélateur.', apres: 'Dégivrer le congélateur.', note: 'Mêmes mots, portée différente : du week-end à chaque soir (changement de section).' },
      { id: 'P2.c5', type: 'ajoute', regle: 'P2.gants-stockage', apres: 'Porter des gants.', section: 'Stockage', note: 'Même phrase qu’en v1 (Nettoyage), nouvelle obligation dans une autre section.' },
      { id: 'P2.c6', type: 'supprime', regle: 'P2.chef-portes', avant: 'Le chef vérifie la fermeture de toutes les portes.' },
    ],
    non_changements: [
      { type: 'reformulation', avant: 'Débrancher la trancheuse avant de la nettoyer.', apres: 'Nettoyer la trancheuse seulement après l’avoir débranchée.', note: 'Même ordre (débrancher, puis nettoyer), dit autrement : un marqueur d’ordre ne suffit pas à faire un changement.' },
      { type: 'identique', texte: 'Laver les plans de travail avec le produit désinfectant.', note: 'Texte identique ; son numéro passe de 2 à 3 à cause de l’ajout en tête.' },
      { type: 'identique', texte: 'Fermer le gaz avant de quitter la cuisine.', note: 'Texte identique contenant « avant ».' },
    ],
  },
];

if (typeof module !== 'undefined') module.exports = { DOCS };
