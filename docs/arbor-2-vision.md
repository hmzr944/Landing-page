# Arbor 2.0 : vision consolidée, architecture et état réel

**Branche :** `arbor-2`. Ce document décrit ce qui est construit, ce qui ne l'est pas, et l'ordre de la suite.
Il ne remplace pas le plan de transformation : il le recadre sur la vision produit du 24 novembre 2026.

## 1. Le cap
Arbor est une **plateforme universelle d'apprentissage**. **Arbor Learning est le cœur** ; Arbor Business est un
environnement spécialisé pour les organisations, qui n'en définit pas l'identité.

| Pilier | Ce que c'est | Où c'est dans le code |
|---|---|---|
| 1. Living Learning Engine | situation, explication adaptée, pratique, diagnostic des confusions, fausses certitudes, révisions, maîtrise prouvée | `js/pedagogie/` (fiche, parcours, correction), `js/mastery.js`, `js/srs.js` (FSRS), `js/evidence.js`, `js/adaptive.js`, `js/learn.js` |
| 2. Knowledge Intelligence | sources et provenance, structure, graphe de connaissance, comparaison de versions, transmission | `js/insight.js` (relations), `js/spaces.js` (arbre de savoir, compagnon sourcé), `supabase/` (provenance vérifiée, `policy_changes`), `js/org-changes.js` (Diff & Impact) |
| 3. Expériences | Learning (personnel, universel) et Business (organisation) | `js/app.js` + `js/spaces.js` (Learning) ; `js/org*.js` + `js/desk2.js` (Business) |

**Une règle d'architecture :** les données personnelles restent sur l'appareil (localStorage, IndexedDB) ; les données
d'organisation restent dans la base de l'organisation (RLS). Aucun écran ne mélange les deux : changer d'espace
change de source de données.

## 2. Navigation
**Learning (expérience principale, ordinateur et application installée)** : huit espaces dans la barre latérale.

| Espace | Contenu | État |
|---|---|---|
| Mon espace | l'action du jour, une seule action principale | existant, conservé |
| Explorer | nouveau sujet, document, démonstration de parcours, discussion | **nouveau** |
| Mon apprentissage | les cours, l'arbre, les fiches | existant |
| Studio pédagogique | construire ses parcours (plan, document, ce que je sais) | **nouveau** (s'appuie sur les imports existants) |
| Pratiquer | révisions dues, notions fragiles, parcours guidés, mises en situation | **nouveau** |
| Ma connaissance | arbre de savoir vivant : chapitres, notions colorées par leur état prouvé, à approfondir | **nouveau** |
| Compagnon Arbor | question → passages sourcés des cours de l'apprenant ; rien d'inventé | **nouveau** (recherche locale ; Pousse avec un compte) |
| Progression et mémoire | états de maîtrise, courbe d'oubli FSRS sur 30 jours (estimation) | enrichi |

Téléphone : la barre du bas (3 entrées) reste ; les huit espaces sont accessibles par leurs adresses.

**Business (dans la même application, selon le compte et les droits)** : Mon environnement professionnel,
Knowledge & Impact Studio, Scenario Studio, Blind Spots, Evidence & Mastery, Transmission & Knowledge Sharing, puis le
contexte (Mon équipe, Mon apprentissage). Les collaborateurs gardent leur navigation d'apprentissage quotidien
(Accueil, Explorer, Mon parcours).

## 3. Desktop Windows et macOS
**Choix : Tauri 2 autour du code web existant, sans React.** Le projet n'utilise ni React ni étape de construction :
45 modules JavaScript chargés par `index.html`. Réécrire en React coûterait toute l'interface sans gain pour
l'utilisateur. Tauri sert ces mêmes fichiers dans une fenêtre native (application de 3 à 10 Mo, contre 80 Mo et plus
pour Electron). Electron reste l'alternative si une fonction de Chromium manque à WebKit sous macOS.

Fait (`desktop/`) :
- configuration Tauri ;
- fenêtre native, une seule instance, taille et position retenues ;
- notifications natives : un rappel de révision par jour, seulement s'il y a des révisions dues ;
- liens externes ouverts dans le navigateur ;
- raccourcis Ctrl/⌘ + 1 à 8 et Ctrl/⌘ + K ;
- icônes ;
- flux GitHub « Desktop » : construction manuelle des installateurs `.dmg`, `.msi` et `.exe`, sans publication ;
- pas de service worker dans l'application : les fichiers y sont déjà.

Reste à décider ou à fournir (propriétaire) :
- **signature** : Apple Developer, payant, avec notarisation ; certificat Windows ;
- **mises à jour automatiques** : clé de signature et lieu de publication des versions ;
- **origines serveur** : ajout de `tauri://localhost` et `http://tauri.localhost` à `TUTOR_ORIGINS` ; sans cela, la
  connexion et Pousse sont refusés depuis l'application ;
- **synchronisation entre appareils** : les cours restent aujourd'hui sur l'appareil. Une synchronisation chiffrée
  demande un chantier serveur, avec RGPD et résolution des conflits.

## 4. Ce que couvrent réellement les tests
**Les 37 suites prouvent que le code fait ce que les tests décrivent, pas que l'expérience est bonne.**

| Type | Couvre | Ne couvre pas |
|---|---|---|
| Unitaires et propriétés (`fiche`, `parcours`, `jeu-de-mesure`) | règles du validateur, du moteur de parcours, de la correction, déterminisme | la qualité pédagogique d'une fiche ; l'effet sur l'apprentissage |
| Navigateur (Playwright, 30 suites) | parcours d'écrans avec des données fabriquées, absence d'erreur, débordements, accessibilité de base | de vrais utilisateurs, de vrais documents, la compréhension réelle |
| Serveur (Deno, 73 tests) | droits, filtres, citations vérifiées, comparaison de versions avec un modèle simulé | la qualité réelle de l'IA (mesurée seulement par le banc d'essai à 3 passages) |
| Base (RLS) | droits par rôle sur PostgreSQL 16 | l'état de la base de production (non vérifié) |
| Desktop | compilation de l'application (vérification locale) | installation réelle sous Windows et macOS, signature |

Validations encore à faire :
- **pédagogique** : mesure 3a, avec des participants ;
- **utilisateurs réels** : pilote Learning et pilote Business.

## 5. Priorités (valeur produit)
1. **Learning universel utilisable de bout en bout :**
   - génération contrôlée de fiches (`rediger_fiche`) pour que tout sujet ait un parcours guidé ;
   - les 23 fiches de référence ;
   - le compagnon branché sur Pousse avec un compte.
2. **Desktop diffusable :** signature, mises à jour, origines serveur, puis synchronisation.
3. **Apprentissage proactif :** notifications et « bon moment » à partir de FSRS et des confusions ouvertes. La base
   existe : `Mastery.plan`, `Adaptive.recommend`.
4. **Business quotidien du collaborateur :** collections, produits et nouveautés comme sources de l'organisation,
   apprises avec le même moteur ; Transmission envoyée à la Base de savoir après validation.
5. **Mobile compagnon :** la même identité, centrée sur pratiquer, réviser et la consultation sur le terrain.
