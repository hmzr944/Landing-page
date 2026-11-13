/* Configuration du site public PULS.
   leadEndpoint : URL HTTPS qui reçoit les demandes de démonstration (POST JSON).
     Exemple : une fonction serveur qui écrit dans le CRM. Ne jamais mettre de clé d'API ici :
     ce fichier est public. Tant que la valeur est null, le formulaire l'indique honnêtement
     et la demande ne quitte pas le navigateur. */
window.PULS_CONFIG = {
  leadEndpoint: null,
};
