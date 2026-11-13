/* =========================================================
   PULS App : jeu de données de DÉMONSTRATION
   Tout ce fichier est fictif : clients, commandes, stocks, expéditions, transporteurs.
   Il n'est chargé que dans l'espace de démonstration ; un compte réel ne le voit jamais.
   Les règles métier (délégation, coursier, criticité, ton) n'y figurent pas :
   elles viennent des politiques (demo-policies.js en démonstration, base de données sinon).
   ========================================================= */
window.PULS_DEMO_DATA = (() => {
  "use strict";
  /* ---------------- Catalogue & stocks ---------------- */
  const PRODUCTS = {
    grandcru:   { name: "Coffret Grand Cru, 32 bonbons", cat: "Chocolat", sens: "Élevée", level: "high", icon: "ph-gift", price: 89, heat: true },
    calendrier: { name: "Calendrier de l'Avent chocolat", cat: "Chocolat", sens: "Élevée", level: "high", icon: "ph-calendar-star", price: 65, heat: true },
    ganache:    { name: "Tablettes ganache, coffret de 6", cat: "Chocolat", sens: "Élevée", level: "high", icon: "ph-squares-four", price: 54, heat: true },
    pralines:   { name: "Pralinés à l'ancienne, 400 g", cat: "Confiserie", sens: "Moyenne", level: "medium", icon: "ph-cookie", price: 48, heat: true },
    glace:      { name: "Bûche glacée vanille praliné", cat: "Surgelé", sens: "Critique", level: "critical", icon: "ph-snowflake", price: 72, heat: false, frozen: true },
    sables:     { name: "Sablés au beurre, boîte métal", cat: "Biscuits", sens: "Faible", level: "low", icon: "ph-cookie", price: 24, heat: false },
    tartiner:   { name: "Pâte à tartiner noisette, 220 g", cat: "Épicerie", sens: "Faible", level: "low", icon: "ph-jar", price: 18, heat: false },
  };
  const STOCK = {
    grandcru: { Paris: 14, Lyon: 0 }, calendrier: { Paris: 2, Lyon: 5 }, ganache: { Paris: 0, Lyon: 0, restock: "18 nov." },
    pralines: { Paris: 9, Lyon: 6 }, glace: { Paris: 0, Lyon: 3 }, sables: { Paris: 40, Lyon: 22 }, tartiner: { Paris: 31, Lyon: 12 },
  };

  /* ---------------- Dossiers ---------------- */
  const CASES = [
    {
      id: "PLS-2481", civ: "Madame", first: "Hélène", last: "Marchetti", tier: "Client privilège", since: 2017, orders: 23, ltv: 3140,
      city: "Paris", district: "Paris 7e", product: "grandcru", qty: 1, carrier: "Rapide Urbain", source: "client", channel: "E-mail",
      received: "08:47", emotion: "Déception", incident: "Livré avec 15 h de retard", incidentPts: 16,
      occasion: "Anniversaire de mariage", occasionWhen: "Hier soir", occasionPts: 25,
      title: "Un coffret pour 20 ans de mariage, arrivé <em>le lendemain</em>",
      message: "Le coffret devait être offert hier soir pour nos vingt ans de mariage. Il est arrivé ce matin et les bonbons ont blanchi. Je suis profondément déçue.",
      thermal: { index: 64, why: "23 h de transit, produit très sensible, dépôt en loge chauffée possible" },
      events: [
        { t: "12 nov. 09:14", k: "fait", s: "Rapide Urbain", x: "Pris en charge au hub Paris Gennevilliers" },
        { t: "12 nov. 17:52", k: "fait", s: "Rapide Urbain", x: "Échec de livraison : destinataire absent" },
        { t: "13 nov. 08:31", k: "fait", s: "Rapide Urbain", x: "Livré, déposé en loge" },
        { t: "Estimation", k: "risque", s: "Thermal Guard", x: "Indice thermique estimé 64 / 100 : le blanchiment est plausible, non prouvé" },
        { t: "Suggestion", k: "action", s: "PULS", x: "Coursier dédié avec un coffret neuf avant 16 h 30" },
      ],
      reco: "courier",
    },
    {
      id: "PLS-2479", civ: "Monsieur", first: "Thibault", last: "Lenoir-Aubry", tier: "Client fidèle", since: 2021, orders: 9, ltv: 1180,
      city: "Lyon", district: "Lyon 6e", product: "glace", qty: 2, carrier: "TransAlpes Froid", source: "detection", channel: "Aucun contact",
      received: "10:05", emotion: "Non exprimée", incident: "Colis immobilisé, incident froid signalé", incidentPts: 18,
      occasion: "Réception à domicile", occasionWhen: "Samedi 14 nov.", occasionPts: 25,
      title: "Deux bûches glacées <em>immobilisées</em> à la veille d'une réception",
      message: null,
      thermal: { index: 82, why: "Incident groupe froid déclaré par le transporteur, produit surgelé" },
      events: [
        { t: "12 nov. 22:40", k: "fait", s: "TransAlpes Froid", x: "Arrivé au hub Lyon Corbas" },
        { t: "13 nov. 09:58", k: "fait", s: "TransAlpes Froid", x: "Incident véhicule frigorifique déclaré, colis immobilisé" },
        { t: "Estimation", k: "risque", s: "Thermal Guard", x: "Rupture de la chaîne du froid possible : seul un contrôle physique peut la confirmer" },
        { t: "Suggestion", k: "action", s: "PULS", x: "Prévenir le client maintenant et réexpédier en express depuis Lyon" },
      ],
      reco: "reship",
    },
    {
      id: "PLS-2476", civ: "Madame", first: "Clémence", last: "Ferrand-Oyono", tier: "Client entreprise", since: 2019, orders: 14, ltv: 4620,
      city: "Marseille", district: "Marseille 8e", product: "calendrier", qty: 3, carrier: "Hexa Livraison", source: "client", channel: "Téléphone",
      received: "09:30", emotion: "Inquiétude", incident: "2 articles sur 3 écrasés", incidentPts: 18,
      occasion: "Cadeaux d'équipe", occasionWhen: "1er décembre", occasionPts: 15,
      title: "Des calendriers de l'Avent <em>écrasés</em>, à distribuer le 1er décembre",
      message: "Deux calendriers sur trois arrivent écrasés. J'ai besoin d'une solution avant la fin du mois, ils sont destinés à mon équipe.",
      thermal: { index: 38, why: "Transit dans les délais, risque surtout mécanique" },
      events: [
        { t: "11 nov. 14:02", k: "fait", s: "Hexa Livraison", x: "Pris en charge au hub Marseille Vitrolles" },
        { t: "12 nov. 11:16", k: "fait", s: "Hexa Livraison", x: "Livré, réserve « carton abîmé » notée par le livreur" },
        { t: "Estimation", k: "risque", s: "Thermal Guard", x: "Risque thermique faible, dommage mécanique probable" },
        { t: "Suggestion", k: "action", s: "PULS", x: "Réexpédier 2 calendriers en standard, il reste 18 jours" },
      ],
      reco: "reship",
    },
    {
      id: "PLS-2474", civ: "Monsieur", first: "Jean-Baptiste", last: "Kerhervé", tier: "Client fidèle", since: 2020, orders: 7, ltv: 410,
      city: "Rennes", district: "Rennes", product: "sables", qty: 2, carrier: "Hexa Livraison", source: "client", channel: "Chat",
      received: "10:52", emotion: "Colère", incident: "3 jours de retard, deuxième incident", incidentPts: 14,
      occasion: "Usage personnel", occasionWhen: "Aucune date", occasionPts: 3,
      title: "Un client fidèle, un <em>deuxième</em> retard d'affilée",
      message: "Toujours rien reçu. C'est la deuxième fois que ça arrive, je commence à me demander si ça vaut la peine de commander chez vous.",
      thermal: { index: 9, why: "Produit peu sensible à la chaleur" },
      events: [
        { t: "09 nov. 16:20", k: "fait", s: "Hexa Livraison", x: "Pris en charge au hub Rennes Chantepie" },
        { t: "10 nov. 07:45", k: "fait", s: "Hexa Livraison", x: "En attente au hub : surcharge du centre de tri" },
        { t: "Historique", k: "fait", s: "CRM", x: "Retard de 4 jours sur sa commande de septembre" },
        { t: "Suggestion", k: "action", s: "PULS", x: "Geste commercial et réexpédition, la fidélité est en jeu" },
      ],
      reco: "gesture",
    },
    {
      id: "PLS-2471", civ: "Madame", first: "Aurore", last: "Delacroix-Ba", tier: "Nouveau client", since: 2026, orders: 1, ltv: 54,
      city: "Paris", district: "Paris 16e", product: "ganache", qty: 1, carrier: "Rapide Urbain", source: "client", channel: "E-mail",
      received: "07:58", emotion: "Inquiétude", incident: "Tablettes collées entre elles", incidentPts: 15,
      occasion: "Première commande", occasionWhen: "Aucune date", occasionPts: 8,
      title: "Une première commande, des tablettes <em>collées</em> entre elles",
      message: "Les tablettes sont collées entre elles. Est-ce que je peux encore les manger ? C'était ma première commande chez vous.",
      thermal: { index: 57, why: "Livraison en boîte aux lettres exposée au soleil d'après le livreur" },
      events: [
        { t: "12 nov. 10:12", k: "fait", s: "Rapide Urbain", x: "Livré, déposé en boîte aux lettres" },
        { t: "Estimation", k: "risque", s: "Thermal Guard", x: "Indice thermique estimé 57 / 100, fonte partielle plausible" },
        { t: "Règle", k: "fait", s: "Qualité", x: "Aucune garantie de consommation ne peut être donnée à distance" },
        { t: "Suggestion", k: "action", s: "PULS", x: "Rupture de stock : proposer un remboursement et réserver le réassort" },
      ],
      reco: "gesture",
    },
    {
      id: "PLS-2468", civ: "Monsieur", first: "Mathis", last: "Oudinot", tier: "Client standard", since: 2024, orders: 3, ltv: 96,
      city: "Lille", district: "Lille", product: "tartiner", qty: 1, carrier: "Colis Express", source: "client", channel: "Formulaire",
      received: "Hier", emotion: "Neutre", incident: "Colis non localisé depuis 5 jours", incidentPts: 12,
      occasion: "Usage personnel", occasionWhen: "Aucune date", occasionPts: 3,
      title: "Un pot de pâte à tartiner <em>introuvable</em>",
      message: "Bonjour, mon colis n'a pas bougé depuis lundi sur le suivi. Pouvez-vous vérifier ?",
      thermal: { index: 6, why: "Produit stable à température ambiante" },
      events: [
        { t: "08 nov. 13:40", k: "fait", s: "Colis Express", x: "Pris en charge au hub Lille Lesquin" },
        { t: "Depuis 5 jours", k: "fait", s: "Colis Express", x: "Aucun nouvel événement de suivi" },
        { t: "Suggestion", k: "action", s: "PULS", x: "Ouvrir une enquête transporteur et réexpédier sans attendre" },
      ],
      reco: "reship",
    },
    {
      id: "PLS-2465", civ: "Madame", first: "Solène", last: "Aït-Kaci", tier: "Client fidèle", since: 2022, orders: 6, ltv: 520,
      city: "Bordeaux", district: "Bordeaux", product: "pralines", qty: 1, carrier: "Hexa Livraison", source: "detection", channel: "Aucun contact",
      received: "09:12", emotion: "Non exprimée", incident: "52 h de transit pour 24 h prévues", incidentPts: 12,
      occasion: "Cadeau", occasionWhen: "Date inconnue", occasionPts: 8,
      title: "Un cadeau en transit depuis <em>deux jours</em>, sans nouvelles",
      message: null,
      thermal: { index: 54, why: "Retard important sur un produit moyennement sensible" },
      events: [
        { t: "11 nov. 07:30", k: "fait", s: "Hexa Livraison", x: "Pris en charge au hub Mérignac" },
        { t: "13 nov. 11:30", k: "fait", s: "Hexa Livraison", x: "Toujours en tournée, 28 h de retard" },
        { t: "Estimation", k: "risque", s: "Thermal Guard", x: "Indice thermique estimé 54 / 100" },
        { t: "Suggestion", k: "action", s: "PULS", x: "Prévenir la cliente avant qu'elle ne s'inquiète" },
      ],
      reco: "reship",
    },
  ];

  /* ---------------- Expéditions en transit (Thermal Guard) ---------------- */
  const SHIPMENTS = [
    { ref: "EXP-88412", product: "grandcru", city: "Nice", carrier: "Hexa Livraison", hub: "Marseille Vitrolles", hubTemp: 19, transit: 46, planned: 24 },
    { ref: "EXP-88407", product: "glace", city: "Lyon", carrier: "TransAlpes Froid", hub: "Lyon Corbas", hubTemp: 9, transit: 20, planned: 24, coldIncident: true, caseId: "PLS-2479" },
    { ref: "EXP-88386", product: "ganache", city: "Montpellier", carrier: "Hexa Livraison", hub: "Montpellier Fréjorgues", hubTemp: 18, transit: 38, planned: 24 },
    { ref: "EXP-88390", product: "pralines", city: "Bordeaux", carrier: "Hexa Livraison", hub: "Mérignac", hubTemp: 13, transit: 52, planned: 24, caseId: "PLS-2465" },
    { ref: "EXP-88399", product: "calendrier", city: "Toulouse", carrier: "Colis Express", hub: "Toulouse Blagnac", hubTemp: 15, transit: 30, planned: 24 },
    { ref: "EXP-88381", product: "grandcru", city: "Strasbourg", carrier: "Colis Express", hub: "Strasbourg Entzheim", hubTemp: 6, transit: 22, planned: 24 },
    { ref: "EXP-88395", product: "sables", city: "Lille", carrier: "Rapide Urbain", hub: "Lille Lesquin", hubTemp: 8, transit: 26, planned: 24 },
    { ref: "EXP-88377", product: "tartiner", city: "Nantes", carrier: "Colis Express", hub: "Nantes Carquefou", hubTemp: 11, transit: 31, planned: 24 },
  ];

  /* ---------------- Transporteurs (90 derniers jours) ---------------- */
  const CARRIERS = [
    { name: "Hexa Livraison", shipments: 2890, verified: 94, unverified: 21,
      types: [["Retard > 24 h", 41], ["Colis endommagé", 29], ["Échec de livraison", 17], ["Perte", 7]],
      hubs: [["Marseille Vitrolles", 31], ["Mérignac", 24], ["Montpellier Fréjorgues", 22], ["Rennes Chantepie", 17]] },
    { name: "Rapide Urbain", shipments: 4120, verified: 61, unverified: 9,
      types: [["Échec de livraison", 26], ["Retard > 24 h", 19], ["Colis endommagé", 11], ["Perte", 5]],
      hubs: [["Paris Gennevilliers", 38], ["Lille Lesquin", 23]] },
    { name: "Colis Express", shipments: 6310, verified: 88, unverified: 5,
      types: [["Retard > 24 h", 44], ["Perte", 18], ["Colis endommagé", 16], ["Échec de livraison", 10]],
      hubs: [["Toulouse Blagnac", 30], ["Nantes Carquefou", 27], ["Strasbourg Entzheim", 31]] },
    { name: "TransAlpes Froid", shipments: 640, verified: 11, unverified: 2,
      types: [["Incident froid déclaré", 6], ["Retard > 24 h", 5]],
      hubs: [["Lyon Corbas", 11]] },
    { name: "Coursiers de la maison", shipments: 210, verified: 2, unverified: 0,
      types: [["Retard > 1 h", 2]], hubs: [["Paris", 2]] },
  ];


  return { PRODUCTS, STOCK, CASES, SHIPMENTS, CARRIERS };
})();
