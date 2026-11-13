// Point d'entrée du module TypeScript Configuration.
// Interopérabilité : le module s'enregistre dans l'espace de noms partagé window.PULS,
// que les scripts JavaScript existants (puls.js, shell.js) utilisent déjà.
import { mount } from "./view.js";
window.PULS = window.PULS || {};
window.PULS.configView = { mount };
document.dispatchEvent(new CustomEvent("puls:config-ready"));
