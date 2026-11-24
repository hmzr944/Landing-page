/* Contrôle hors corpus (mission 2c) : une procédure que le banc n'a jamais vue, écrite et figée le 2026-11-22 AVANT toute
   modification du code de comparaison. Elle sert à vérifier que les règles de la mission 2c valent au-delà du corpus n° 1.
   Elle est mesurée et rapportée à part : ce n'est ni un seuil, ni une donnée d'entraînement ou de réglage.
   Document fabriqué ; organisation fictive. Mêmes conventions que ../contenu.js.

   Les quatre cas de nouveautés demandés :
   1. vraie nouveauté : « Vérifier avec le client le nom inscrit sur la commande. » (absente de la v1) ;
   2. formulation déjà présente en v1, sens opérationnel nouveau : « Demander une pièce d'identité. » existait pour les
      commandes payées en magasin ; la v2 l'exige aussi pour un retrait par une autre personne (nouvelle section) ;
   3. connaissance déjà présente et identique : « Demander le numéro de commande au client. » (même texte, même section) ;
   4. contexte qui change la portée : « Remettre la commande sans demander de pièce d'identité. » valait pour toutes les
      commandes payées en ligne ; la v2 la réserve aux commandes de moins de 50 € (même phrase, autre section). */

const ORG = 'Maison Ardoise (enseigne fictive, équipement de la maison)';
const BANDEAU = 'Document fictif fabriqué pour tester Arbor. Ce n’est pas une procédure réelle.';
const i = (id, base, extra = {}) => ({ id, base, ...extra });

const DOCS = [
  {
    id: 'P1-v1', procedure: 'P1', version: 1, date: '2026-05-04', secteur: 'retail', org: ORG,
    titre: 'Retrait des commandes en magasin',
    sections: [
      { h: 'Objet', p: ['Cette procédure décrit la remise au client d’une commande passée sur le site.'] },
      { h: 'Commandes payées en ligne', ol: [
        { t: 'Demander le numéro de commande au client.', r: i('P1.numero', 'interne') },
        { t: 'Remettre la commande sans demander de pièce d’identité.', r: i('P1.sans-piece', 'interne', { sensible: true }) },
        { t: 'Scanner le colis et le remettre au client.', r: i('P1.scanner', 'interne') },
      ] },
      { h: 'Commandes payées en magasin', ol: [
        { t: 'Demander une pièce d’identité.', r: i('P1.piece-magasin', 'interne', { sensible: true }) },
        { t: 'Encaisser le montant restant avant la remise.', r: i('P1.encaisser', 'interne', { sensible: true }) },
      ] },
      { h: 'Délai de garde', ol: [
        { t: 'Une commande non retirée est gardée 7 jours.', r: i('P1.delai', 'interne') },
        { t: 'Le client est prévenu par SMS le jour de l’arrivée de la commande.', r: i('P1.sms', 'interne') },
        { t: 'Un client peut demander une prolongation de 3 jours.', r: i('P1.prolongation', 'interne') },
      ] },
      { h: 'Incident', p: [{ t: 'Si le colis est abîmé, le client peut refuser la commande.', r: i('P1.colis-abime', 'interne', { sensible: true }) }] },
    ],
  },
  {
    id: 'P1-v2', procedure: 'P1', version: 2, date: '2026-10-12', secteur: 'retail', org: ORG,
    titre: 'Retrait des commandes en magasin',
    sections: [
      { h: 'Objet', p: ['Cette procédure décrit la remise au client d’une commande passée sur le site.'] },
      { h: 'Incident', p: [{ t: 'Si le colis est abîmé, le client peut refuser la commande.', r: i('P1.colis-abime', 'interne', { sensible: true }) }] },
      { h: 'Commandes payées en ligne', ol: [
        { t: 'Demander le numéro de commande au client.', r: i('P1.numero', 'interne') },
        { t: 'Vérifier avec le client le nom inscrit sur la commande.', r: i('P1.nom', 'interne', { sensible: true }) },
        { t: 'Remettre le colis au client, puis le scanner.', r: i('P1.scanner', 'interne') },
      ] },
      { h: 'Commandes de moins de 50 €', ol: [
        { t: 'Remettre la commande sans demander de pièce d’identité.', r: i('P1.sans-piece', 'interne', { sensible: true }) },
      ] },
      { h: 'Commandes payées en magasin', ol: [
        { t: 'Demander une pièce d’identité.', r: i('P1.piece-magasin', 'interne', { sensible: true }) },
        { t: 'Faire payer le solde avant de remettre la commande.', r: i('P1.encaisser', 'interne', { sensible: true }) },
      ] },
      { h: 'Retrait par une autre personne', ol: [
        { t: 'Demander une pièce d’identité.', r: i('P1.piece-tiers', 'interne', { sensible: true }) },
        { t: 'Demander la confirmation écrite du client.', r: i('P1.confirmation', 'interne', { sensible: true }) },
      ] },
      { h: 'Délai de garde', ol: [
        { t: 'Une commande non retirée est gardée 10 jours.', r: i('P1.delai', 'interne') },
        { t: 'Le client est prévenu par SMS le jour de l’arrivée de la commande.', r: i('P1.sms', 'interne') },
      ] },
    ],
    changements: [
      { id: 'P1.c1', type: 'modifie', regle: 'P1.delai', avant: 'gardée 7 jours', apres: 'gardée 10 jours' },
      { id: 'P1.c2', type: 'supprime', regle: 'P1.prolongation', avant: 'Un client peut demander une prolongation de 3 jours.' },
      { id: 'P1.c3', type: 'ajoute', regle: 'P1.nom', apres: 'Vérifier avec le client le nom inscrit sur la commande.', note: 'Cas 1 : vraie nouveauté.' },
      { id: 'P1.c4', type: 'ajoute', regle: 'P1.piece-tiers', apres: 'Demander une pièce d’identité.', section: 'Retrait par une autre personne', note: 'Cas 2 : formulation déjà présente en v1 (commandes payées en magasin), sens opérationnel nouveau.' },
      { id: 'P1.c5', type: 'ajoute', regle: 'P1.confirmation', apres: 'Demander la confirmation écrite du client.' },
      { id: 'P1.c6', type: 'modifie', regle: 'P1.sans-piece', avant: 'Remettre la commande sans demander de pièce d’identité.', apres: 'Remettre la commande sans demander de pièce d’identité.', note: 'Cas 4 : même phrase, portée réduite aux commandes de moins de 50 € (changement de section).' },
      { id: 'P1.c7', type: 'modifie', regle: 'P1.scanner', avant: 'Scanner le colis et le remettre au client.', apres: 'Remettre le colis au client, puis le scanner.', note: 'Ordre imposé (« puis »), même règle de décision que R1 le 2026-11-22.' },
    ],
    non_changements: [
      { type: 'identique', texte: 'Demander le numéro de commande au client.', note: 'Cas 3 : même texte, même section.' },
      { type: 'deplacement', texte: 'Si le colis est abîmé, le client peut refuser la commande.', note: 'Section « Incident » déplacée en tête, texte identique.' },
      { type: 'reformulation', avant: 'Encaisser le montant restant avant la remise.', apres: 'Faire payer le solde avant de remettre la commande.', note: 'Même consigne, autres mots.' },
    ],
  },
];

if (typeof module !== 'undefined') module.exports = { DOCS, BANDEAU };
