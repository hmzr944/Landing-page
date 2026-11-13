/* Configuration publique de PULS (site et application).
   Ce fichier est servi tel quel au navigateur : n'y mettez JAMAIS de clé secrète
   (clé serveur Supabase, clé OpenAI). Celles-ci vivent dans les secrets des fonctions Supabase.

   supabaseUrl / supabaseKey : projet Supabase dédié à PULS. La clé « publishable » est publique
     par conception ; l'accès aux données est contrôlé par la base (RLS).
   leadEndpoint : URL HTTPS recevant les demandes de démonstration (POST JSON). null : non branché.
   legal : identité légale du responsable du traitement. null tant qu'elle n'est pas fournie :
     le site affiche « Informations légales à compléter » et `npm run check:release` refuse la mise
     en production. Ne jamais remplir avec des informations fictives. */
window.PULS_CONFIG = {
  supabaseUrl: "https://wqqxthpcqczmwigokhus.supabase.co",
  supabaseKey: "sb_publishable_fWANxWzEwKS5VhezIVqr-g_oLxb9b_r",
  leadEndpoint: null,
  legal: null,
  // Forme attendue :
  // legal: { controller: "Raison sociale", address: "Adresse postale", contactEmail: "privacy@exemple.fr", registration: "RCS ..." },
};
