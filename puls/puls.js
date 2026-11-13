/* =========================================================
   CONCIERGE // PULS : prototype interactif
   Données fictives. Aucune commande, aucun remboursement,
   aucun message réel n'est déclenché.
   ========================================================= */
(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NOW = { label: "13 nov., 11:42", hour: 11.7 }; // horloge simulée
  const COURIER_ZONES = ["Paris", "Lyon"];
  const COURIER_CUTOFF = 15; // commande coursier possible avant 15h
  const VALIDATION_THRESHOLD = 150; // € : au-delà, validation responsable
  const MIN_VERIFIED = 30; // incidents vérifiés minimum pour conclure sur un transporteur

  /* ---------------- Catalogue & stocks ---------------- */
  const PRODUCTS = {
    grandcru:   { name: "Coffret Grand Cru, 32 bonbons", cat: "Chocolat", sens: "Élevée", pts: 26, icon: "ph-gift", price: 89, heat: true },
    calendrier: { name: "Calendrier de l'Avent chocolat", cat: "Chocolat", sens: "Élevée", pts: 26, icon: "ph-calendar-star", price: 65, heat: true },
    ganache:    { name: "Tablettes ganache, coffret de 6", cat: "Chocolat", sens: "Élevée", pts: 26, icon: "ph-squares-four", price: 54, heat: true },
    pralines:   { name: "Pralinés à l'ancienne, 400 g", cat: "Confiserie", sens: "Moyenne", pts: 16, icon: "ph-cookie", price: 48, heat: true },
    glace:      { name: "Bûche glacée vanille praliné", cat: "Surgelé", sens: "Critique", pts: 30, icon: "ph-snowflake", price: 72, heat: false, frozen: true },
    sables:     { name: "Sablés au beurre, boîte métal", cat: "Biscuits", sens: "Faible", pts: 6, icon: "ph-cookie", price: 24, heat: false },
    tartiner:   { name: "Pâte à tartiner noisette, 220 g", cat: "Épicerie", sens: "Faible", pts: 6, icon: "ph-jar", price: 18, heat: false },
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

  /* ---------------- État ---------------- */
  const state = {
    view: "desk",
    selected: CASES[0].id,
    filter: "all",
    query: "",
    resolved: new Set(),
    work: {},    // par dossier : { gesture, opt, read, text, edited, tone }
    proof: {},   // par dossier : { slots, analyzed, conclusion }
    proofCase: "PLS-2481",
    carrier: "Hexa Livraison",
    created: new Set(),
  };

  /* ---------------- Utilitaires ---------------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const euro = (n) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const pct = (n, d = 1) => (n * 100).toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }) + " %";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const initials = (c) => (c.first[0] + c.last[0]).toUpperCase();
  const caseById = (id) => CASES.find((c) => c.id === id);
  const fullName = (c) => `${c.first} ${c.last}`;

  function toast(title, sub = "", icon = "ph-check-circle") {
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `<i class="ph ${icon}"></i><div><b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</div>`;
    $("#toasts").appendChild(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 400); }, 4200);
  }

  function countUp(root = document) {
    $$("[data-count]", root).forEach((el) => {
      const target = parseFloat(el.dataset.count);
      if (reduceMotion) { el.textContent = target; return; }
      const start = performance.now(), dur = 900;
      const step = (now) => {
        const p = Math.min(1, (now - start) / dur);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /* ---------------- Score de criticité ---------------- */
  const TIER_PTS = { "Client privilège": 15, "Client entreprise": 13, "Client fidèle": 10, "Nouveau client": 9, "Client standard": 5 };
  const EMO_PTS = { "Colère": 10, "Déception": 9, "Inquiétude": 7, "Non exprimée": 5, "Neutre": 3 };
  function score(c) {
    const p = PRODUCTS[c.product];
    const factors = [
      ["Sensibilité produit", p.pts, 30],
      ["Occasion et échéance", c.occasionPts, 25],
      ["Gravité de l'incident", c.incidentPts, 20],
      ["Relation client", TIER_PTS[c.tier] ?? 5, 15],
      ["Émotion exprimée", EMO_PTS[c.emotion] ?? 3, 10],
    ];
    return { total: factors.reduce((s, f) => s + f[1], 0), factors };
  }

  /* ---------------- Indice thermique estimé ---------------- */
  const SENS_BASE = { "Critique": 42, "Élevée": 36, "Moyenne": 22, "Faible": 8 };
  function thermalIndex(s) {
    const p = PRODUCTS[s.product];
    const parts = [["Sensibilité", SENS_BASE[p.sens]]];
    const over = Math.max(0, s.transit - s.planned);
    if (over) parts.push(["Retard", Math.min(30, Math.round(over * 1.1))]);
    if (p.heat && s.hubTemp > 12) parts.push(["Météo hub", Math.min(20, Math.round((s.hubTemp - 12) * 2.2))]);
    if (p.frozen && s.coldIncident) parts.push(["Incident froid", 40]);
    const v = clamp(parts.reduce((a, b) => a + b[1], 0), 0, 100);
    return { v, parts, level: v >= 70 ? "Élevé" : v >= 45 ? "Modéré" : "Faible" };
  }

  /* ---------------- Règles des gestes ---------------- */
  function gestureRules(c, w) {
    const p = PRODUCTS[c.product];
    const st = STOCK[c.product];
    const total = (st.Paris || 0) + (st.Lyon || 0);
    const local = st[c.city] ?? 0;
    const value = p.price * c.qty;

    const reship = {
      ok: total >= c.qty,
      why: total >= c.qty ? `${total} en stock (Paris ${st.Paris}, Lyon ${st.Lyon})` : `Rupture de stock${st.restock ? `, réassort prévu le ${st.restock}` : ""}`,
    };
    const inZone = COURIER_ZONES.includes(c.city);
    const beforeCut = NOW.hour < COURIER_CUTOFF;
    const courier = {
      ok: inZone && beforeCut && local >= c.qty,
      why: !inZone ? `Hors zone coursier (Paris, Lyon)` : !beforeCut ? "Après l'heure limite de 15 h" : local < c.qty ? `Pas de stock à l'entrepôt de ${c.city}` : `Stock ${c.city} : ${local}, remise avant 16 h 30`,
    };
    const opts = { avoir: 0.2, half: 0.5, full: 1 };
    const amount = Math.round(value * opts[w.opt || "avoir"]);
    const gesture = {
      ok: true, amount,
      needsValidation: w.opt !== "avoir" && amount > VALIDATION_THRESHOLD,
      why: `Valeur de la commande : ${euro(value)}`,
    };
    return { reship, courier, gesture, value };
  }

  /* ---------------- Rédaction de la réponse (brouillon) ---------------- */
  function draftReply(c, w) {
    const p = PRODUCTS[c.product];
    const warm = (w.tone || "warm") === "warm";
    const r = gestureRules(c, w);
    const hello = `${c.civ} ${c.last},`;
    let open;
    if (c.source === "detection") {
      open = warm
        ? `Nous préférons vous prévenir avant même que vous ne vous inquiétiez : votre commande « ${p.name} » rencontre un incident chez notre transporteur.`
        : `Nous vous informons qu'un incident affecte actuellement l'acheminement de votre commande « ${p.name} ».`;
    } else {
      open = warm
        ? `Merci de nous avoir écrit. Nous mesurons combien cette livraison comptait pour vous${c.occasionPts >= 15 ? ", attendue pour une occasion importante" : ""}, et nous en sommes sincèrement désolés.`
        : `Nous avons bien reçu votre message concernant votre commande « ${p.name} » et vous présentons nos excuses.`;
    }
    const carrierFacts = c.events.filter((e) => e.k === "fait" && e.s === c.carrier);
    const lastFact = (carrierFacts.slice(-1)[0] || c.events[0]).x;
    const facts = `D'après le suivi du transporteur : ${lastFact.charAt(0).toLowerCase() + lastFact.slice(1)}.`;
    let caution = "";
    if (p.heat || p.frozen) {
      caution = `Nous ne pouvons pas garantir à distance l'état des produits. Par précaution, nous vous recommandons de ne pas les consommer s'ils vous semblent altérés.`;
    }
    let action = "";
    if (w.gesture === "courier") {
      action = `Un coursier vous apportera aujourd'hui, avant 16 h 30, une nouvelle commande « ${p.name} » préparée spécialement pour vous. Nous vous appellerons pour confirmer le créneau qui vous convient.`;
    } else if (w.gesture === "reship") {
      action = `Nous vous réexpédions ${c.qty > 1 ? "votre commande" : "un nouvel exemplaire"} ${w.opt === "express" ? "en express, pour une livraison demain" : "sous 48 h"}, sans frais. Vous n'avez rien à nous retourner.`;
    } else if (w.gesture === "gesture") {
      const label = { avoir: `un avoir de ${euro(r.gesture.amount)}`, half: `un remboursement de ${euro(r.gesture.amount)}`, full: `le remboursement intégral de ${euro(r.gesture.amount)}` }[w.opt || "avoir"];
      action = r.gesture.needsValidation
        ? `Nous vous proposons ${label}. Ce geste est en cours de validation et vous sera confirmé dans la journée.`
        : `Nous vous proposons ${label}, utilisable dès aujourd'hui.`;
    } else {
      action = `Nous revenons vers vous très rapidement avec une solution.`;
    }
    const close = warm ? `Avec toute notre attention,` : `Bien cordialement,`;
    return [hello, "", open, "", facts + (caution ? " " + caution : ""), "", action, "", close, "Inès Valadier, Conciergerie"].join("\n");
  }

  function work(id) {
    if (!state.work[id]) {
      const c = caseById(id);
      const w = { gesture: null, opt: null, read: false, tone: "warm", edited: false, text: "" };
      // la recommandation n'est pas appliquée : le conseiller garde la main
      w.text = draftReply(c, w);
      state.work[id] = w;
    }
    return state.work[id];
  }

  /* =========================================================
     RENDU
     ========================================================= */
  const VIEWS = {
    desk:    ["Concierge Desk", "Décider et résoudre, dossier par dossier."],
    thermal: ["Thermal Guard", "Estimer le risque de détérioration avant la réclamation."],
    proof:   ["Proof Studio", "Collecter les preuves sans effort pour le client."],
    carrier: ["Carrier Autopsy", "Identifier les défaillances logistiques sur des incidents vérifiés."],
  };

  function openCases() { return CASES.filter((c) => !state.resolved.has(c.id)); }

  function updateRail() {
    $$(".rail-link").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.view === state.view);
      b.setAttribute("aria-current", b.dataset.view === state.view ? "page" : "false");
    });
    const deskBtn = $('.rail-link[data-view="desk"]');
    let badge = $(".count", deskBtn);
    const n = openCases().length;
    if (!badge) { badge = document.createElement("span"); badge.className = "count"; deskBtn.insertBefore(badge, $("kbd", deskBtn)); }
    badge.textContent = n;
    badge.hidden = n === 0;
    const hot = SHIPMENTS.filter((s) => thermalIndex(s).v >= 60 && !s.caseId && !state.created.has(s.ref)).length;
    const thBtn = $('.rail-link[data-view="thermal"]');
    let tb = $(".count", thBtn);
    if (!tb) { tb = document.createElement("span"); tb.className = "count"; thBtn.insertBefore(tb, $("kbd", thBtn)); }
    tb.textContent = hot; tb.hidden = hot === 0;
    window.PULSFX?.movePill();
    window.PULSFX?.setPulse(openCases().filter((c) => score(c).total >= 70).length);
  }

  function go(view) {
    if (!VIEWS[view]) return;
    const el = $("#view");
    const swap = () => {
      state.view = view;
      $("#view-title").textContent = VIEWS[view][0];
      $("#view-sub").textContent = VIEWS[view][1];
      el.classList.remove("leaving");
      render();
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    };
    if (reduceMotion || state.view === view) return swap();
    if (window.PULSFX) return window.PULSFX.wipe(swap);
    el.classList.add("leaving");
    setTimeout(swap, 170);
  }

  function render() {
    updateRail();
    const el = $("#view");
    if (state.view === "desk") el.innerHTML = renderDesk();
    if (state.view === "thermal") el.innerHTML = renderThermal();
    if (state.view === "proof") el.innerHTML = renderProof();
    if (state.view === "carrier") el.innerHTML = renderCarrier();
    afterRender();
  }

  function afterRender() {
    window.PULSFX?.afterRender(document);
    countUp($("#view"));
    const ring = $(".ring .val");
    if (ring) {
      const target = ring.dataset.off;
      requestAnimationFrame(() => requestAnimationFrame(() => { ring.style.strokeDashoffset = target; }));
    }
    const ta = $("textarea.reply");
    if (ta) {
      const w = work(state.selected);
      ta.value = w.text;
      updateCharCount();
    }
  }

  /* ---------------- Concierge Desk ---------------- */
  function filteredQueue() {
    const q = state.query.trim().toLowerCase();
    return openCases()
      .filter((c) => state.filter === "all" || (state.filter === "hot" && score(c).total >= 70) || (state.filter === "detect" && c.source === "detection"))
      .filter((c) => !q || [fullName(c), c.id, c.city, PRODUCTS[c.product].name, c.carrier].join(" ").toLowerCase().includes(q))
      .sort((a, b) => score(b).total - score(a).total);
  }

  function renderQueueItems(list) {
    if (!list.length) {
      const allDone = openCases().length === 0;
      return `<li class="empty"><i class="ph ${allDone ? "ph-champagne" : "ph-funnel-simple"}"></i><strong>${allDone ? "File vide" : "Aucun dossier"}</strong>${allDone ? "Tous les dossiers sont traités. Thermal Guard signalera les prochains risques." : "Aucun dossier ne correspond à ce filtre ou à cette recherche."}</li>`;
    }
    return list.map((c, i) => {
      const s = score(c).total;
      const p = PRODUCTS[c.product];
      return `<li><button class="q-item ${c.id === state.selected ? "is-sel" : ""} ${state.created.has(c.id) ? "is-new" : ""}" data-case="${c.id}" style="--i:${i}">
        <span class="q-score ${s >= 70 ? "hot" : ""}">${s}</span>
        <span class="q-main">
          <span class="q-top"><span class="q-name">${fullName(c)}</span><span class="q-time">${c.received}</span></span>
          <span class="q-prod">${p.name}</span>
          <span class="q-tags">
            ${c.source === "detection" ? `<span class="tag tag-bx"><i class="ph ph-radar"></i>Détecté</span>` : `<span class="tag">${c.channel}</span>`}
            <span class="tag tag-line">${c.city}</span>
            ${c.occasionPts >= 15 ? `<span class="tag">${c.occasionWhen}</span>` : ""}
          </span>
        </span>
      </button></li>`;
    }).join("");
  }

  function renderDesk() {
    const list = filteredQueue();
    if (list.length && !list.some((c) => c.id === state.selected)) state.selected = list[0].id;
    const c = list.find((x) => x.id === state.selected);
    const chip = (k, label) => `<button class="chip ${state.filter === k ? "is-on" : ""}" data-filter="${k}">${label}</button>`;
    return `<div class="desk">
      <div class="queue">
        <div class="queue-head"><h2>File d'urgence</h2><span class="muted">${list.length} ouvert${list.length > 1 ? "s" : ""}</span></div>
        <div class="filters">${chip("all", "Tous")}${chip("hot", "Critiques")}${chip("detect", "Détectés avant réclamation")}</div>
        <ul class="queue-list" id="queue">${renderQueueItems(list)}</ul>
      </div>
      <div id="case">${c ? renderCase(c) : renderNoCase()}</div>
    </div>`;
  }

  function renderNoCase() {
    return `<div class="tile tile-cream" style="--i:0"><div class="empty" style="border:0">
      <i class="ph ph-crown-simple"></i><strong>Aucun dossier sélectionné</strong>
      Choisissez un dossier dans la file, ou ouvrez Thermal Guard pour anticiper les prochains incidents.
      <div style="margin-top:16px"><button class="btn btn-ink" data-go="thermal"><i class="ph ph-thermometer-simple"></i>Ouvrir Thermal Guard</button></div>
    </div></div>`;
  }

  function renderCase(c) {
    const p = PRODUCTS[c.product];
    const sc = score(c);
    const w = work(c.id);
    const R = 64, C = 2 * Math.PI * R;
    const off = C * (1 - sc.total / 100);
    const ticks = Array.from({ length: 20 }, (_, i) => {
      const on = i < Math.round(c.thermal.index / 5);
      return `<span class="${on ? "on" : ""} ${on && c.thermal.index >= 60 ? "hot" : ""}" style="height:${30 + i * 3.5}%;--t:${i}"></span>`;
    }).join("");

    return `<article class="case" data-id="${c.id}">
      <section class="tile c-hero" style="--i:0">
        <div class="ref">
          <span class="tag tag-ink">${c.id}</span>
          ${c.source === "detection" ? `<span class="tag tag-bx"><i class="ph ph-radar"></i>Détecté par PULS avant réclamation</span>` : `<span class="tag">Réclamation, ${c.channel.toLowerCase()}</span>`}
          <span class="tag tag-line">${c.carrier}</span>
        </div>
        <h2>${c.title}</h2>
        ${c.message
          ? `<blockquote class="quote">“${c.message}”<cite>${fullName(c)}, reçu à ${c.received}. Émotion perçue : ${c.emotion.toLowerCase()}</cite></blockquote>`
          : `<div class="detected"><i class="ph ph-bell-ringing"></i><div><b>Le client ne sait encore rien.</b><br><span class="muted">L'incident a été remonté par le transporteur. Le prévenir maintenant transforme une réclamation probable en attention reçue.</span></div></div>`}
        <div class="next-step">
          <span class="lvl lvl-action">Action recommandée</span>
          <p>${(c.events.find((e) => e.k === "action") || { x: "Analyser le dossier" }).x}</p>
          <span class="muted">Le conseiller décide. Touches 1, 2, 3 pour choisir un geste.</span>
        </div>
      </section>

      <section class="tile tile-ink c-score" style="--i:1">
        <div class="tile-head" style="width:100%;margin-bottom:0"><h3>Criticité</h3><span class="hint">sur 100</span></div>
        <div class="ring ${sc.total >= 70 ? "hot" : ""}">
          <svg viewBox="0 0 152 152" aria-hidden="true"><circle class="trk" cx="76" cy="76" r="${R}" fill="none" stroke-width="10"/><circle class="val" cx="76" cy="76" r="${R}" fill="none" stroke-width="10" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-off="${off}"/></svg>
          <div class="ring-num"><b data-count="${sc.total}">0</b><span>${sc.total >= 70 ? "Prioritaire" : sc.total >= 50 ? "À traiter aujourd'hui" : "Standard"}</span></div>
        </div>
        <div class="factors">
          ${sc.factors.map((f, i) => `<div class="factor" style="--i:${i}"><span class="muted">${f[0]}</span><span class="pts">${f[1]} / ${f[2]}</span><span class="bar" style="width:${(f[1] / f[2]) * 100}%"></span></div>`).join("")}
        </div>
      </section>

      <section class="tile c-client" style="--i:2">
        <div class="person"><span class="avatar">${initials(c)}</span><div><b>${fullName(c)}</b><span class="muted">${c.tier}</span></div></div>
        <dl class="kv">
          <dt>Client depuis</dt><dd>${c.since}</dd>
          <dt>Commandes</dt><dd>${c.orders}</dd>
          <dt>Valeur cumulée</dt><dd>${euro(c.ltv)}</dd>
          <dt>Adresse</dt><dd>${c.district}</dd>
          <dt>Contact</dt><dd>${c.channel}</dd>
        </dl>
      </section>

      <section class="tile c-order" style="--i:3">
        <div class="product"><span class="swatch ${p.pts >= 26 ? "sens-high" : ""}"><i class="ph ${p.icon}"></i></span><div><b>${p.name}</b><br><span class="muted">${c.qty} × ${euro(p.price)}, ${p.cat.toLowerCase()}</span></div></div>
        <dl class="kv">
          <dt>Occasion</dt><dd>${c.occasion}</dd>
          <dt>Échéance</dt><dd>${c.occasionWhen}</dd>
          <dt>Sensibilité</dt><dd>${p.sens}</dd>
          <dt>Incident</dt><dd>${c.incident}</dd>
          <dt>Montant</dt><dd>${euro(p.price * c.qty)}</dd>
        </dl>
      </section>

      <section class="tile tile-cream c-thermal" style="--i:4">
        <div class="tile-head"><h3>Risque thermique</h3><span class="lvl lvl-risque">Estimé</span></div>
        <div class="gauge"><b data-count="${c.thermal.index}">0</b><div class="ticks" aria-hidden="true">${ticks}</div></div>
        <p style="margin:0 0 12px;font-size:13px">${c.thermal.why}.</p>
        <div class="caveat"><i class="ph ph-info"></i>Indice estimé à partir du produit, du délai et de la météo des hubs. Ce n'est pas une mesure de la température du colis.</div>
      </section>

      <section class="tile c-timeline" style="--i:5">
        <div class="tile-head"><h3>Ce que l'on sait</h3><span class="hint">du fait à l'action</span></div>
        <ol class="timeline">
          ${c.events.map((e, i) => `<li class="ev ${e.k}" style="--i:${i}"><div class="ev-meta"><span>${e.t}</span><span>${e.s}</span><span>${{ fait: "Fait vérifié", risque: "Risque estimé", action: "Action recommandée" }[e.k]}</span></div><div class="ev-text">${e.x}</div></li>`).join("")}
        </ol>
      </section>

      <section class="tile c-gestures" style="--i:6" id="gestures">${renderGestures(c, w)}</section>

      <section class="tile c-reply" style="--i:7" id="reply">${renderReply(c, w)}</section>
    </article>`;
  }

  function renderGestures(c, w) {
    const r = gestureRules(c, w);
    const G = [
      { k: "reship", n: 1, icon: "ph-package", title: "Réexpédier", sub: r.reship.why, ok: r.reship.ok },
      { k: "gesture", n: 2, icon: "ph-hand-heart", title: "Geste commercial", sub: r.gesture.why, ok: true },
      { k: "courier", n: 3, icon: "ph-person-simple-bike", title: "Coursier dédié", sub: r.courier.why, ok: r.courier.ok },
    ];
    let panel = "";
    if (w.gesture === "reship") {
      panel = `<div class="g-panel">
        <div><span class="field-label">Mode d'envoi</span><div class="seg" role="group">
          <button data-opt="standard" class="${w.opt !== "express" ? "is-on" : ""}">Standard, 48 h</button>
          <button data-opt="express" class="${w.opt === "express" ? "is-on" : ""}">Express, demain</button>
        </div></div>
        <div class="rule ok"><i class="ph ph-check-circle"></i>Stock réservé pour ${c.qty} article${c.qty > 1 ? "s" : ""} (simulation)</div>
        <div class="rule ok"><i class="ph ph-check-circle"></i>Aucun retour du colis demandé au client</div>
      </div>`;
    } else if (w.gesture === "gesture") {
      const opt = w.opt || "avoir";
      panel = `<div class="g-panel">
        <div><span class="field-label">Nature du geste</span><div class="seg" role="group">
          <button data-opt="avoir" class="${opt === "avoir" ? "is-on" : ""}">Avoir 20 %</button>
          <button data-opt="half" class="${opt === "half" ? "is-on" : ""}">Remboursement 50 %</button>
          <button data-opt="full" class="${opt === "full" ? "is-on" : ""}">Remboursement total</button>
        </div></div>
        <div class="rule ok"><i class="ph ph-coins"></i>Montant : <b>${euro(r.gesture.amount)}</b></div>
        ${r.gesture.needsValidation
          ? `<div class="rule warn"><i class="ph ph-seal-warning"></i>Au-delà de ${euro(VALIDATION_THRESHOLD)}, un responsable doit valider ce geste.</div>`
          : `<div class="rule ok"><i class="ph ph-check-circle"></i>Dans la délégation du conseiller</div>`}
      </div>`;
    } else if (w.gesture === "courier") {
      panel = `<div class="g-panel">
        <div class="rule ok"><i class="ph ph-clock"></i>Commande coursier possible jusqu'à 15 h, il est ${NOW.label.split(", ")[1]}</div>
        <div class="rule ok"><i class="ph ph-check-circle"></i>Créneau confirmé uniquement après accord du client</div>
        <div class="rule ok"><i class="ph ph-pen-nib"></i>Mot manuscrit joint par la boutique</div>
      </div>`;
    }
    return `<div class="tile-head"><h3>Gestes de résolution</h3><span class="hint">touches 1, 2, 3</span></div>
      <div class="gestures">
        ${G.map((g) => `<button class="gesture ${w.gesture === g.k ? "is-on" : ""} ${c.reco === g.k ? "is-reco" : ""}" data-gesture="${g.k}" ${g.ok ? "" : "disabled"} aria-pressed="${w.gesture === g.k}">
          <span class="g-ico"><i class="ph ${g.icon}"></i></span>
          <span><span class="g-title">${g.title}${c.reco === g.k ? `<span class="tag tag-bx">Recommandé</span>` : ""}</span><span class="g-sub">${g.ok ? g.sub : `Indisponible : ${g.sub.charAt(0).toLowerCase() + g.sub.slice(1)}`}</span></span>
          <kbd>${g.n}</kbd>
        </button>`).join("")}
      </div>${panel}`;
  }

  function sendLabel(c, w) {
    const r = gestureRules(c, w);
    if (w.gesture === "gesture" && r.gesture.needsValidation) return ["Envoyer en validation", "ph-seal-check"];
    return ["Résoudre et envoyer", "ph-paper-plane-tilt"];
  }

  function renderReply(c, w) {
    const [label, icon] = sendLabel(c, w);
    const r = gestureRules(c, w);
    const gName = { reship: "Réexpédition", gesture: "Geste commercial", courier: "Coursier dédié" }[w.gesture] || "Aucun";
    return `<div class="reply-wrap">
      <div>
        <div class="reply-tools">
          <h3 style="font-size:21px;margin-right:auto">Réponse au client</h3>
          <div class="seg" role="group" aria-label="Ton">
            <button data-tone="warm" class="${w.tone === "warm" ? "is-on" : ""}">Chaleureux</button>
            <button data-tone="sober" class="${w.tone === "sober" ? "is-on" : ""}">Sobre</button>
          </div>
          <button class="btn btn-line" data-regen><i class="ph ph-sparkle"></i>Régénérer</button>
        </div>
        <label class="field-label" for="reply-text">Brouillon proposé par l'assistant, modifiable</label>
        <textarea id="reply-text" class="reply" spellcheck="true"></textarea>
        <div class="reply-help"><span>${w.edited ? "Modifié par le conseiller" : "Rédigé à partir des faits vérifiés uniquement"}</span><span id="charcount"></span></div>
      </div>
      <aside class="reply-side">
        <div class="summary">
          <div><span class="muted">Geste</span><b>${gName}</b></div>
          ${w.gesture === "gesture" ? `<div><span class="muted">Montant</span><b>${euro(r.gesture.amount)}</b></div>` : ""}
          <div><span class="muted">Destinataire</span><b>${c.civ} ${c.last}</b></div>
          <div><span class="muted">Canal</span><b>${c.channel === "Aucun contact" ? "E-mail" : c.channel}</b></div>
        </div>
        <label class="check"><input type="checkbox" id="read-ok" ${w.read ? "checked" : ""}><span>J'ai relu la réponse et je l'assume au nom de la maison.</span></label>
        <button class="btn btn-bx" data-send ${w.read && w.gesture ? "" : "disabled"}><i class="ph ${icon}"></i>${label}</button>
        <span class="muted" style="font-size:12px">${!w.gesture ? "Choisissez d'abord un geste de résolution." : !w.read ? "La relecture est obligatoire avant l'envoi." : "Simulation : rien ne sera réellement envoyé."}</span>
      </aside>
    </div>`;
  }

  function updateCharCount() {
    const ta = $("textarea.reply"), cc = $("#charcount");
    if (ta && cc) cc.textContent = `${ta.value.length} caractères`;
  }

  function refreshCasePart(part) {
    const c = caseById(state.selected), w = work(c.id);
    if (part === "gestures") $("#gestures").innerHTML = renderGestures(c, w);
    if (part === "reply") {
      const ta = $("textarea.reply");
      const caret = ta && document.activeElement === ta;
      $("#reply").innerHTML = renderReply(c, w);
      $("textarea.reply").value = w.text;
      updateCharCount();
      if (caret) $("textarea.reply").focus();
    }
    $("#gestures").style.animation = "none";
    $("#reply").style.animation = "none";
  }

  let typingTimer = null;
  function typeInto(text) {
    const ta = $("textarea.reply");
    if (!ta) return;
    cancelAnimationFrame(typingTimer);
    if (reduceMotion) { ta.value = text; updateCharCount(); return; }
    ta.classList.add("typing");
    let i = 0;
    const step = () => {
      i = Math.min(text.length, i + 7);
      ta.value = text.slice(0, i);
      updateCharCount();
      if (i < text.length) typingTimer = requestAnimationFrame(step);
      else ta.classList.remove("typing");
    };
    step();
  }

  // recalcule le brouillon, réaffiche le bloc réponse, puis écrit le texte (animé ou non)
  function redraft(animate) {
    const c = caseById(state.selected), w = work(c.id);
    w.text = draftReply(c, w);
    w.edited = false;
    refreshCasePart("reply");
    if (animate) typeInto(w.text);
  }

  function selectGesture(k) {
    const c = caseById(state.selected), w = work(c.id);
    const r = gestureRules(c, w);
    if ((k === "reship" && !r.reship.ok) || (k === "courier" && !r.courier.ok)) {
      toast("Geste indisponible", k === "reship" ? r.reship.why : r.courier.why, "ph-prohibit");
      return;
    }
    w.gesture = w.gesture === k ? null : k;
    w.opt = w.gesture === "gesture" ? "avoir" : w.gesture === "reship" ? "standard" : null;
    refreshCasePart("gestures");
    if (!w.edited) redraft(true);
    else { refreshCasePart("reply"); toast("Réponse conservée", "Vous l'avez modifiée : utilisez Régénérer pour l'adapter au nouveau geste.", "ph-pencil-simple"); }
  }

  function resolveCase() {
    const c = caseById(state.selected), w = work(c.id);
    if (!w.gesture || !w.read) return;
    const r = gestureRules(c, w);
    const pending = w.gesture === "gesture" && r.gesture.needsValidation;
    const list = filteredQueue();
    const idx = list.findIndex((x) => x.id === c.id);
    const next = list[idx + 1] || list[idx - 1];
    const item = $(`.q-item[data-case="${c.id}"]`);
    const finish = () => {
      state.resolved.add(c.id);
      state.selected = next ? next.id : null;
      render();
    };
    toast(pending ? "Envoyé en validation" : "Dossier résolu", pending
      ? `Geste de ${euro(r.gesture.amount)} transmis au responsable SAV. Simulation : aucun paiement déclenché.`
      : `Simulation : aucun message ni commande réels pour ${fullName(c)}.`, pending ? "ph-seal-check" : "ph-check-circle");
    if (reduceMotion) return finish();
    window.PULSFX?.seal($("#case .case"), $("#reply"), pending);
    setTimeout(() => item?.classList.add("leaving"), 650);
    setTimeout(finish, 1150);
  }

  function selectCase(id) {
    if (!id || id === state.selected) return;
    state.selected = id;
    $$(".q-item").forEach((b) => b.classList.toggle("is-sel", b.dataset.case === id));
    const c = caseById(id);
    $("#case").innerHTML = renderCase(c);
    afterRender();
    if (window.innerWidth <= 1024) $("#case").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  function moveSelection(d) {
    const list = filteredQueue();
    if (!list.length) return;
    const i = list.findIndex((c) => c.id === state.selected);
    const n = list[clamp(i + d, 0, list.length - 1)];
    selectCase(n.id);
    $(`.q-item[data-case="${n.id}"]`)?.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }

  /* ---------------- Thermal Guard ---------------- */
  function renderThermal() {
    const rows = SHIPMENTS.map((s) => ({ s, t: thermalIndex(s) })).sort((a, b) => b.t.v - a.t.v);
    const high = rows.filter((r) => r.t.v >= 60).length;
    const mod = rows.filter((r) => r.t.v >= 45 && r.t.v < 60).length;
    return `<div class="bento">
      <section class="tile tile-ink span-2 stat" style="--i:0">
        <span class="hint">À surveiller maintenant</span>
        <b data-count="${high}">0</b>
        <p class="muted">expéditions avec un indice estimé de 60 ou plus, sur ${rows.length} en transit.</p>
      </section>
      <section class="tile tile-bx span-2 stat" style="--i:1">
        <span class="label">Vigilance</span>
        <b data-count="${mod}">0</b>
        <p>expéditions entre 45 et 59. Un message préventif suffit souvent.</p>
      </section>
      <section class="tile span-2" style="--i:2">
        <div class="tile-head"><h3>Les trois niveaux</h3></div>
        <div class="legend" style="border:0;padding:0;background:none">
          <span class="lvl lvl-fait">Fait vérifié : remonté par le transporteur</span>
          <span class="lvl lvl-risque">Risque estimé : calculé, jamais mesuré</span>
          <span class="lvl lvl-action">Action recommandée : le conseiller décide</span>
        </div>
      </section>
      <section class="tile tile-cream span-6" style="--i:3">
        <div class="tile-head"><h3>Comment l'indice est estimé</h3><span class="lvl lvl-risque">Risque estimé</span></div>
        <div class="formula">
          <span class="term">Sensibilité du produit</span><span class="op">+</span>
          <span class="term">Retard sur le délai prévu</span><span class="op">+</span>
          <span class="term">Météo extérieure du hub</span><span class="op">+</span>
          <span class="term">Incident froid déclaré</span><span class="op">=</span>
          <span class="term" style="background:var(--ink);color:var(--ivory)">Indice de 0 à 100</span>
        </div>
        <div class="caveat" style="margin-top:14px"><i class="ph ph-info"></i>La température météo d'un hub ne prouve pas la température réelle du colis. L'indice sert à prioriser, jamais à conclure qu'un produit est impropre.</div>
      </section>
      <section class="tile span-6" style="--i:4">
        <div class="tile-head"><h3>Expéditions en transit</h3><span class="hint">triées par indice estimé</span></div>
        <div class="ship-list">
          ${rows.map(({ s, t }, i) => {
            const p = PRODUCTS[s.product];
            const linked = s.caseId || (state.created.has(s.ref) ? s.ref : null);
            return `<div class="ship ${t.v >= 60 ? "flagged" : ""}" style="--i:${i}">
              <div class="idx">${t.v}<small>${t.level.toUpperCase()}</small></div>
              <div class="cell"><b>${p.name}</b><span class="label">${s.ref}, vers ${s.city}</span></div>
              <div class="cell cell-hide"><span class="label">Transit</span><b>${s.transit} h / ${s.planned} h prévues</b></div>
              <div class="cell cell-hide cell-hub"><span class="label">Hub ${s.hub}</span><b>${s.hubTemp} °C météo${s.coldIncident ? ", incident froid" : ""}</b></div>
              <div>${linked
                ? `<button class="btn btn-line" data-open-case="${s.caseId || "PLS-" + s.ref.slice(4)}"><i class="ph ph-arrow-up-right"></i>Voir le dossier</button>`
                : t.v >= 45
                  ? `<button class="btn ${t.v >= 60 ? "btn-bx" : "btn-ink"}" data-preventive="${s.ref}"><i class="ph ph-bell-ringing"></i>Prévenir</button>`
                  : `<span class="muted" style="font-size:12px">Aucune action</span>`}</div>
            </div>`;
          }).join("")}
        </div>
      </section>
    </div>`;
  }

  function createPreventive(ref) {
    const s = SHIPMENTS.find((x) => x.ref === ref);
    if (!s || state.created.has(ref)) return;
    const t = thermalIndex(s);
    const p = PRODUCTS[s.product];
    const id = "PLS-" + ref.slice(4);
    const names = { "EXP-88412": ["Madame", "Margaux", "Le Bihan-Sarr"], "EXP-88386": ["Monsieur", "Rafael", "Montagnier"], "EXP-88399": ["Madame", "Odile", "Castagnet"] };
    const [civ, first, last] = names[ref] || ["Madame", "Nadia", "Vasseur"];
    CASES.push({
      id, civ, first, last, tier: "Client fidèle", since: 2023, orders: 4, ltv: 380,
      city: s.city, district: s.city, product: s.product, qty: 1, carrier: s.carrier, source: "detection", channel: "Aucun contact",
      received: NOW.label.split(", ")[1], emotion: "Non exprimée", incident: `${s.transit} h de transit pour ${s.planned} h prévues`, incidentPts: s.transit > s.planned ? 12 : 6,
      occasion: "Cadeau", occasionWhen: "Date inconnue", occasionPts: 8,
      title: `Une expédition sensible <em>exposée</em> à un transit trop long`,
      message: null,
      thermal: { index: t.v, why: t.parts.map((x) => `${x[0].toLowerCase()} +${x[1]}`).join(", ") },
      events: [
        { t: "13 nov.", k: "fait", s: s.carrier, x: `En transit depuis ${s.transit} h, hub ${s.hub}` },
        { t: "Estimation", k: "risque", s: "Thermal Guard", x: `Indice thermique estimé ${t.v} / 100` },
        { t: "Suggestion", k: "action", s: "PULS", x: "Prévenir le client et proposer une réexpédition si le colis arrive altéré" },
      ],
      reco: "reship",
    });
    state.created.add(ref);
    state.created.add(id);
    toast("Dossier préventif ouvert", `${id} ajouté à la file du Concierge Desk.`, "ph-radar");
    render();
  }

  /* ---------------- Proof Studio ---------------- */
  const SLOT_DEF = [
    { icon: "ph-package", t: "Emballage extérieur", h: "Carton, angles, scellés" },
    { icon: "ph-cookie", t: "Produit", h: "Vue d'ensemble, lumière du jour" },
    { icon: "ph-barcode", t: "Étiquette transporteur", h: "Numéro de suivi lisible" },
  ];
  function proof(id) {
    if (!state.proof[id]) state.proof[id] = { slots: [null, null, null], analyzed: false, analyzing: false, conclusion: null, attached: false };
    return state.proof[id];
  }
  function observations(c) {
    const p = PRODUCTS[c.product];
    const base = [["Étiquette lisible, numéro de suivi conforme à la commande", "Lisible"]];
    if (p.frozen) return [["Emballage isotherme déformé sur une face", "Probable"], ["Présence de condensation visible", "À confirmer"], ...base];
    if (p.heat) return [["Carton intact, pas d'enfoncement visible", "Probable"], ["Aspect blanchi en surface, compatible avec un écart thermique comme avec un blanchiment gras", "À confirmer"], ...base];
    return [["Coin du carton enfoncé", "Probable"], ["Contenu déplacé dans la boîte", "Probable"], ...base];
  }

  function renderProof() {
    const open = openCases();
    if (!open.some((c) => c.id === state.proofCase)) state.proofCase = open[0]?.id || null;
    if (!state.proofCase) return `<div class="tile"><div class="empty" style="border:0"><i class="ph ph-camera"></i><strong>Aucun dossier ouvert</strong>Proof Studio s'active dès qu'un dossier est en cours.</div></div>`;
    const c = caseById(state.proofCase);
    const pr = proof(c.id);
    const filled = pr.slots.filter(Boolean).length;
    const link = `puls.link/p/${c.id.slice(4)}K`;
    return `<div class="bento">
      <section class="tile span-4" style="--i:0">
        <div class="tile-head"><h3>Photos du client</h3><span class="hint">${filled} sur 3</span></div>
        <div class="slots">
          ${SLOT_DEF.map((d, i) => {
            const v = pr.slots[i];
            return `<label class="slot ${v ? "filled" : ""}" data-slot="${i}">
              ${v ? (v === "sim" ? `<span class="placeholder-img"></span>` : `<img src="${v}" alt="${d.t}">`) + `<span class="done"><i class="ph ph-check"></i></span>` : ""}
              <span style="position:relative;${v ? "color:var(--ivory)" : ""}"><i class="ph ${d.icon}"></i><b>${d.t}</b><small style="${v ? "color:inherit;opacity:.75" : ""}">${v ? "Reçue" : d.h}</small></span>
              <input type="file" accept="image/*" data-file="${i}" aria-label="Ajouter : ${d.t}">
            </label>`;
          }).join("")}
        </div>
        <div class="steps" aria-hidden="true">${[0, 1, 2].map((i) => `<span class="${pr.slots[i] ? "on" : ""}"></span>`).join("")}</div>
        <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
          <button class="btn btn-line" data-sim-photos ${filled === 3 ? "disabled" : ""}><i class="ph ph-images"></i>Simuler l'envoi du client</button>
          <button class="btn btn-ink" data-analyze ${filled === 3 && !pr.analyzed && !pr.analyzing ? "" : "disabled"}><i class="ph ph-scan"></i>Lancer l'observation</button>
        </div>
      </section>

      <section class="tile tile-cream span-2" style="--i:1">
        <div class="tile-head"><h3>Dossier</h3></div>
        <label class="field-label" for="proof-case">Dossier concerné</label>
        <select id="proof-case" class="select">${open.map((x) => `<option value="${x.id}" ${x.id === c.id ? "selected" : ""}>${x.id}, ${fullName(x)}</option>`).join("")}</select>
        <p class="muted" style="font-size:12.5px;margin:14px 0 8px">Lien envoyé au client : trois photos guidées depuis son téléphone, sans compte ni application.</p>
        <div class="link-box"><i class="ph ph-link"></i><span>${link}</span><button class="ghost-btn" data-copy="${link}" aria-label="Copier le lien"><i class="ph ph-copy"></i></button></div>
      </section>

      <section class="tile span-3" style="--i:2">
        <div class="tile-head"><h3>Observations assistées</h3><span class="lvl lvl-risque">Non certifiant</span></div>
        ${pr.analyzing ? `<div class="skel"><span></span><span></span><span></span><span></span></div>`
          : pr.analyzed ? `<ul class="obs">${observations(c).map((o, i) => `<li style="--i:${i}"><span>${o[0]}</span><span class="tag ${o[1] === "À confirmer" ? "tag-bx" : ""}">${o[1]}</span></li>`).join("")}</ul>`
          : `<div class="empty" style="padding:24px"><i class="ph ph-scan"></i>Les observations apparaîtront ici une fois les trois photos reçues.</div>`}
        <div class="caveat" style="margin-top:14px"><i class="ph ph-warning"></i>L'analyse d'image décrit ce qui est visible. Elle ne peut pas certifier qu'un produit est impropre ni qu'une chaîne du froid a été rompue.</div>
      </section>

      <section class="tile tile-bx span-3" style="--i:3">
        <div class="tile-head"><h3>Conclusion du conseiller</h3><span class="lvl lvl-action">Votre décision</span></div>
        <div class="radio-list">
          ${[["ok", "Preuves suffisantes pour résoudre"], ["more", "Demander une photo complémentaire"], ["qc", "Transmettre au contrôle qualité"]].map(([k, l]) => `<label><input type="radio" name="concl" value="${k}" ${pr.conclusion === k ? "checked" : ""}>${l}</label>`).join("")}
        </div>
        <button class="btn btn-bx" style="margin-top:14px;width:100%" data-attach ${pr.conclusion && filled === 3 && !pr.attached ? "" : "disabled"}><i class="ph ph-paperclip"></i>${pr.attached ? "Joint au dossier" : "Joindre au dossier"}</button>
      </section>
    </div>`;
  }

  function setSlot(i, val) {
    const pr = proof(state.proofCase);
    pr.slots[i] = val;
    pr.analyzed = false; pr.attached = false;
    render();
  }

  /* ---------------- Carrier Autopsy ---------------- */
  function wilson(k, n, z = 1.96) {
    const p = k / n, d = 1 + (z * z) / n;
    const centre = (p + (z * z) / (2 * n)) / d;
    const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
    return [Math.max(0, centre - half), centre + half];
  }

  function renderCarrier() {
    const totK = CARRIERS.reduce((a, c) => a + c.verified, 0);
    const totN = CARRIERS.reduce((a, c) => a + c.shipments, 0);
    const avg = totK / totN;
    const MAX = 0.06;
    const pos = (v) => `${clamp(v / MAX, 0, 1) * 100}%`;
    const rows = CARRIERS.map((c) => ({ c, rate: c.verified / c.shipments, ci: wilson(c.verified, c.shipments), enough: c.verified >= MIN_VERIFIED }))
      .sort((a, b) => (b.enough - a.enough) || (b.rate - a.rate));
    const worst = rows.filter((r) => r.enough && r.ci[0] > avg);
    const sel = rows.find((r) => r.c.name === state.carrier) || rows[0];
    const unverified = CARRIERS.reduce((a, c) => a + c.unverified, 0);
    const maxType = Math.max(...sel.c.types.map((t) => t[1]));

    let verdict;
    if (!sel.enough) verdict = `<b>Conclusion impossible.</b> ${sel.c.verified} incidents vérifiés seulement, il en faut au moins ${MIN_VERIFIED} pour comparer ${sel.c.name} au réseau.`;
    else if (sel.ci[0] > avg) verdict = `<b>Écart significatif.</b> ${sel.c.name} présente ${pct(sel.rate)} d'incidents vérifiés, au-dessus de la moyenne du réseau (${pct(avg)}) même dans le bas de son intervalle de confiance.`;
    else if (sel.ci[1] < avg) verdict = `<b>Meilleur que le réseau.</b> ${sel.c.name} reste sous la moyenne (${pct(avg)}) sur l'ensemble de son intervalle.`;
    else verdict = `<b>Pas d'écart démontré.</b> L'intervalle de ${sel.c.name} recouvre la moyenne du réseau (${pct(avg)}).`;

    return `<div class="bento">
      <section class="tile tile-ink span-2 stat" style="--i:0">
        <span class="hint">Incidents vérifiés, 90 jours</span>
        <b data-count="${totK}">0</b>
        <p class="muted">sur ${totN.toLocaleString("fr-FR")} expéditions, soit ${pct(avg)} pour l'ensemble du réseau.</p>
      </section>
      <section class="tile tile-bx span-2 stat" style="--i:1">
        <span class="label">Écart significatif</span>
        <b data-count="${worst.length}">0</b>
        <p>${worst.length ? worst.map((w) => w.c.name).join(", ") : "Aucun transporteur"} au-dessus du réseau, intervalle de confiance compris.</p>
      </section>
      <section class="tile tile-cream span-2" style="--i:2">
        <div class="tile-head"><h3>Règle de lecture</h3></div>
        <p style="margin:0 0 8px;font-size:13px">Seuls les incidents confirmés par le transporteur ou par une preuve Proof Studio sont comptés.</p>
        <p class="muted" style="margin:0;font-size:12.5px">${unverified} signalements non confirmés sont exclus. Sous ${MIN_VERIFIED} incidents vérifiés, aucune conclusion n'est affichée.</p>
      </section>

      <section class="tile span-6" style="--i:3">
        <div class="tile-head"><h3>Taux d'incidents vérifiés</h3><span class="hint">point : taux observé, trait : intervalle de confiance à 95 %, pointillé : moyenne réseau</span></div>
        <div class="carrier-head"><span>Transporteur</span><span>Expéditions</span><span>Incidents</span><span>0 % à 6 %</span><span style="text-align:right">Taux</span></div>
        <div class="carriers">
          ${rows.map((r, i) => `<button class="carrier ${r.c.name === sel.c.name ? "is-sel" : ""} ${r.enough ? "" : "low-n"} ${worst.includes(r) ? "worst" : ""}" data-carrier="${r.c.name}" style="--i:${i}">
            <b>${r.c.name}</b>
            <span class="c-n">${r.c.shipments.toLocaleString("fr-FR")}</span>
            <span class="c-n">${r.c.verified}</span>
            <span class="ci"><span class="axis"></span><span class="ref-line" style="left:${pos(avg)}"></span>
              <span class="range" style="left:${pos(r.ci[0])};width:calc(${pos(r.ci[1])} - ${pos(r.ci[0])})"></span>
              <span class="dot" style="left:${pos(r.rate)}"></span></span>
            <span style="text-align:right">${r.enough ? `<b>${pct(r.rate)}</b>` : `<span class="tag tag-line">Échantillon insuffisant</span>`}</span>
          </button>`).join("")}
        </div>
      </section>

      <section class="tile span-3" style="--i:4">
        <div class="tile-head"><h3>${sel.c.name}</h3><span class="hint">nature des incidents vérifiés</span></div>
        <div class="breakdown">
          ${sel.c.types.map((t, i) => `<div class="bd-row" style="--i:${i}"><span>${t[0]}</span><b>${t[1]}</b><span class="bar" style="width:${(t[1] / maxType) * 100}%;${sel.enough ? "" : "background:var(--ink-50)"}"></span></div>`).join("")}
        </div>
      </section>
      <section class="tile ${sel.enough && sel.ci[0] > avg ? "tile-bx" : "tile-cream"} span-3" style="--i:5">
        <div class="tile-head"><h3>Lecture</h3><span class="lvl ${sel.enough ? "lvl-fait" : "lvl-risque"}">${sel.enough ? "Fondée sur des faits vérifiés" : "Données insuffisantes"}</span></div>
        <p style="margin:0 0 14px;font-size:13.5px">${verdict}</p>
        <div class="hubs">${sel.c.hubs.map((h) => `<div class="hub"><span class="label">${h[0]}</span><b>${h[1]}</b><span class="muted" style="font-size:12px">incidents vérifiés</span></div>`).join("")}</div>
      </section>
    </div>`;
  }

  /* =========================================================
     ÉVÉNEMENTS
     ========================================================= */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, [data-slot]");
    if (!t) return;
    if (t.matches(".rail-link")) return go(t.dataset.view);
    if (t.matches("[data-open-help]")) return $("#help").showModal();
    if (t.matches("[data-go]")) return go(t.dataset.go);
    if (t.matches("[data-filter]")) { state.filter = t.dataset.filter; return render(); }
    if (t.matches("[data-case]")) return selectCase(t.dataset.case);
    if (t.matches("[data-gesture]")) return selectGesture(t.dataset.gesture);
    if (t.matches("[data-opt]")) {
      const w = work(state.selected); w.opt = t.dataset.opt;
      refreshCasePart("gestures");
      if (!w.edited) redraft(false); else refreshCasePart("reply");
      return;
    }
    if (t.matches("[data-tone]")) {
      work(state.selected).tone = t.dataset.tone;
      redraft(true); return;
    }
    if (t.matches("[data-regen]")) return redraft(true);
    if (t.matches("[data-send]")) return resolveCase();
    if (t.matches("[data-preventive]")) return createPreventive(t.dataset.preventive);
    if (t.matches("[data-open-case]")) {
      const id = t.dataset.openCase;
      if (state.resolved.has(id)) return toast("Dossier déjà résolu", id, "ph-check-circle");
      state.selected = id; state.filter = "all"; state.query = ""; $("#search").value = "";
      return go("desk");
    }
    if (t.matches("[data-carrier]")) { state.carrier = t.dataset.carrier; return render(); }
    if (t.matches("[data-sim-photos]")) {
      const pr = proof(state.proofCase);
      pr.slots = pr.slots.map((s) => s || "sim"); pr.analyzed = false;
      toast("Photos reçues", "Simulation de l'envoi depuis le téléphone du client.", "ph-images");
      return render();
    }
    if (t.matches("[data-analyze]")) {
      const pr = proof(state.proofCase);
      pr.analyzing = true; render();
      setTimeout(() => { pr.analyzing = false; pr.analyzed = true; if (state.view === "proof") render(); }, reduceMotion ? 0 : 1300);
      return;
    }
    if (t.matches("[data-attach]")) {
      const pr = proof(state.proofCase), c = caseById(state.proofCase);
      pr.attached = true;
      const label = { ok: "Preuves jugées suffisantes", more: "Photo complémentaire demandée", qc: "Transmis au contrôle qualité" }[pr.conclusion];
      const at = c.events.findIndex((x) => x.k !== "fait");
      c.events.splice(at < 0 ? c.events.length : at, 0, { t: "13 nov. " + NOW.label.split(", ")[1], k: "fait", s: "Proof Studio", x: `3 photos reçues du client. ${label}` });
      toast("Preuves jointes", `${c.id} : ${label.toLowerCase()}.`, "ph-paperclip");
      return render();
    }
    if (t.matches("[data-copy]")) {
      navigator.clipboard?.writeText("https://" + t.dataset.copy).catch(() => {});
      return toast("Lien copié", "Lien de démonstration, il ne mène nulle part.", "ph-copy");
    }
  });

  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.id === "read-ok") { work(state.selected).read = t.checked; return refreshCasePart("reply"); }
    if (t.id === "proof-case") { state.proofCase = t.value; return render(); }
    if (t.name === "concl") { proof(state.proofCase).conclusion = t.value; return render(); }
    if (t.matches("[data-file]") && t.files[0]) {
      setSlot(+t.dataset.file, URL.createObjectURL(t.files[0]));
    }
  });

  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "search") {
      state.query = t.value;
      if (state.view !== "desk") return go("desk");
      const list = filteredQueue();
      $("#queue").innerHTML = renderQueueItems(list);
      if (list.length && !list.some((c) => c.id === state.selected)) selectCase(list[0].id);
      return;
    }
    if (t.matches("textarea.reply")) {
      cancelAnimationFrame(typingTimer);
      const w = work(state.selected);
      w.text = t.value;
      if (!w.edited) { w.edited = true; const h = $(".reply-help span"); if (h) h.textContent = "Modifié par le conseiller"; }
      updateCharCount();
    }
  });

  // glisser-déposer sur les emplacements de preuve
  ["dragenter", "dragover"].forEach((ev) => document.addEventListener(ev, (e) => {
    const s = e.target.closest?.(".slot"); if (!s) return; e.preventDefault(); s.classList.add("drag");
  }));
  ["dragleave", "drop"].forEach((ev) => document.addEventListener(ev, (e) => {
    const s = e.target.closest?.(".slot"); if (!s) return; e.preventDefault(); s.classList.remove("drag");
    if (ev === "drop" && e.dataTransfer.files[0]?.type.startsWith("image/")) setSlot(+s.dataset.slot, URL.createObjectURL(e.dataTransfer.files[0]));
  }));

  // clavier
  let gPending = false, gTimer;
  document.addEventListener("keydown", (e) => {
    const typing = e.target.matches("input, textarea, select");
    if (e.key === "Escape") { if (typing) e.target.blur(); return; }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (gPending) {
      gPending = false; clearTimeout(gTimer);
      const map = { d: "desk", t: "thermal", p: "proof", c: "carrier" };
      if (map[k]) { e.preventDefault(); go(map[k]); }
      return;
    }
    if (k === "g") { gPending = true; gTimer = setTimeout(() => (gPending = false), 900); return; }
    if (k === "/") { e.preventDefault(); $("#search").focus(); return; }
    if (k === "?") { $("#help").showModal(); return; }
    if (state.view !== "desk" || !state.selected) return;
    if (k === "j") moveSelection(1);
    if (k === "k") moveSelection(-1);
    if (k === "1") selectGesture("reship");
    if (k === "2") selectGesture("gesture");
    if (k === "3") selectGesture("courier");
    if (k === "r") { e.preventDefault(); const ta = $("textarea.reply"); ta?.focus(); ta?.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" }); }
  });

  render();
})();
