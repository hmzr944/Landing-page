/* =========================================================
   PULS App : politiques de l'espace de DÉMONSTRATION (fictives)
   Copie exacte des politiques créées par seed_demo_configuration (db/migrations/002_onboarding.sql).
   Un test compare les deux (site-src/test-app.js) pour éviter qu'elles ne divergent.
   ========================================================= */
window.PULS_DEMO_POLICIES = {
  authorization: { currency: "EUR", limits: { agent: 60, logistics_manager: 150, sav_manager: 250, admin: 1000, viewer: 0 } },
  resolution: {
    courier: { zones: ["Paris", "Lyon"], order_before_hour: 15, delivered_before: "16 h 30" },
    goodwill: { avoir: 0.2, half: 0.5, full: 1 },
    reship: { standard_hours: 48, express_hours: 24 },
  },
  criticality: {
    max: { product: 30, occasion: 25, incident: 20, relationship: 15, emotion: 10 },
    sensitivity_points: { critical: 30, high: 26, medium: 16, low: 6, none: 0, unknown: 16 },
    relationship_points: { "Client privilège": 15, "Client entreprise": 13, "Client fidèle": 10, "Nouveau client": 9, "Client standard": 5 },
    emotion_points: { "Colère": 10, "Déception": 9, "Inquiétude": 7, "Non exprimée": 5, "Neutre": 3 },
    priority_threshold: 70,
  },
  tone: { signature: "La Conciergerie Maison Valcour", default_tone: "warm", caution_sensitive: "Nous ne pouvons pas garantir à distance l'état des produits." },
  sla: { first_response_hours: 4, resolution_hours: 48, business_hours: "09:00-19:00" },
};
