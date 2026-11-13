# PULS

**Save the experience.** Plateforme d'hospitalité opérationnelle et de gestion proactive des incidents post-achat.

Deux expériences, une identité :

| | Dossier | Rôle |
|---|---|---|
| **PULS Website** | `puls/*.html`, `puls/secteurs/` | Site public : présenter, expliquer, commercialiser, demander une démonstration |
| **PULS App** | `puls/app/` | Espace professionnel installable (PWA), accessible après connexion |

Aucune étape de build pour l'utilisation : servir `puls/` (`python3 -m http.server`) et ouvrir `index.html`.

## Étape 1 : audit de l'existant (13 nov. 2026)

- Le dépôt héberge un autre produit, **Arbor** (racine du dépôt, `js/`, `supabase/`), en HTML/CSS/JS sans build, avec un backend **Supabase** (PostgreSQL, RLS, fonctions Edge) déjà structuré en organisations, rôles et journal d'audit. PULS n'en dépend pas et n'y touche pas.
- **PULS** se limitait au prototype Concierge Desk : quatre moteurs (Concierge Desk, Thermal Guard, Proof Studio, Carrier Autopsy), données fictives en mémoire, aucune persistance, aucun backend, aucune authentification.
- Conservé intégralement : direction artistique, trois niveaux de vérité, criticité explicable, gestes avec règles (stock, zones, délégation), réponse IA relue, raccourcis clavier, identité « pouls ».
- Modifié dans l'app : suppression de l'intro et du rideau plein écran, animations ramenées vers 150 à 200 ms (Partie 12).

### Choix techniques
- **Site public : HTML statique généré** (`site-src/build.py`). Rapide, indexable, sans dépendance. Le gabarit commun (navigation, pied de page) n'existe qu'à un endroit.
- **App : conservée en JavaScript sans framework** pour cette étape, afin de ne pas réécrire un prototype qui fonctionne. La migration React / TypeScript se justifiera avec la persistance et la configuration multi-entreprise.
- **Backend visé : PostgreSQL avec isolation par workspace au niveau base (RLS)**, sur le modèle déjà éprouvé dans `supabase/` pour Arbor, dans un schéma séparé.

## Ce qui fonctionne aujourd'hui

**Site public** : accueil, plateforme (avec simulateur d'arbitrage interactif), page secteurs et 5 pages métier, intégrations, sécurité, démonstration et contact, confidentialité, connexion. Captures réelles de l'app (`assets/`, générées par `site-src/shots.js`).

**Formulaire de démonstration** : validation, refus des adresses personnelles, consentement, préremplissage par URL (`demo.html?sujet=integration&secteur=luxe`), confirmation. Branchement CRM : renseigner `leadEndpoint` dans `config.js` (POST JSON). Sans point de collecte, la confirmation le dit explicitement et propose de copier la demande.

**Connexion et app** : l'app redirige vers `connexion.html` sans session ; l'espace de démonstration ouvre une session dans `sessionStorage` (onglet courant), effacée à la déconnexion. Manifeste, icônes, service worker limité aux fichiers d'interface (jamais de données), bouton d'installation quand le navigateur le propose.

## Ce qui n'est pas encore réel (affiché comme tel)

- Comptes nominatifs et authentification serveur : le formulaire de compte est désactivé et signalé.
- Multi-entreprise, rôles, configuration : modules « Intelligence » et « Configuration » marqués « Bientôt » dans l'app.
- Intégrations : seules les données de démonstration sont « Disponibles ».
- Aucune certification de sécurité n'est revendiquée.

## Prochaines étapes
3. Authentification serveur (comptes, sessions, rôles).
5. Schéma multi-tenant PostgreSQL avec RLS, testé par des requêtes croisées entre entreprises.
6. Persistance des dossiers, moteur d'arbitrage dans l'app, configuration du catalogue et des seuils, Proof Studio côté client (lien expirant, téléversement privé), exports Carrier Autopsy.

## Commandes
```bash
npm ci                              # outils (TypeScript, types)
npm run typecheck                   # vérification TypeScript : app + fonctions serveur
npm run build                       # compile app/src -> app/dist (versionné, servi tel quel)
npm run ci                          # typecheck + dist à jour + tests de la fonction IA
npm run test:ai                     # fonction IA, fournisseur simulé
db/test/run.sh                      # PostgreSQL : migrations + 60 tests d'isolation et de permissions
python3 site-src/build.py           # régénère les pages du site
python3 -m http.server 8765         # sert puls/
node site-src/test-site.cjs         # site, liens, mobile, formulaire, connexion réelle, PWA
node site-src/test-app.cjs          # app : démonstration et compte (API simulée)
node site-src/shots.cjs             # régénère les captures de l'app
npm run check:release               # refuse la mise en production sans informations légales ni point de collecte
```

Architecture, audit et décisions : `docs/ARCHITECTURE.md`. Base et serveur : `db/README.md`.

## Design
- Ivoire, crème, bordeaux, charbon, gris chauds dérivés.
- Outfit (titres), GT Walsheim (texte, fichiers sous licence à déposer dans `fonts/`, repli Figtree).
- Icônes Phosphor. `prefers-reduced-motion` respecté partout.
