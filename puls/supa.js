/* PULS : client Supabase partagé (site public et application).
   - Adresse et clé publiable lues dans config.js (publiques par conception ; la base protège les données par RLS).
   - Session d'authentification rangée dans sessionStorage : propre à l'onglet, effacée à sa fermeture,
     jamais dans le stockage partagé du navigateur.
   - Aucune clé secrète ici : la clé serveur et la clé OpenAI ne quittent jamais Supabase. */
(function () {
  "use strict";
  window.PULS = window.PULS || {};
  var c = window.PULS_CONFIG || {};
  if (!c.supabaseUrl || !c.supabaseKey || !window.supabase || !window.supabase.createClient) {
    window.PULS.client = null;
    return;
  }
  var storage = null;
  try { storage = window.sessionStorage; storage.getItem("x"); } catch (e) { storage = null; }
  window.PULS.client = window.supabase.createClient(c.supabaseUrl, c.supabaseKey, {
    auth: {
      storage: storage || undefined,
      storageKey: "puls-auth",
      persistSession: !!storage,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "implicit",
    },
  });
})();
