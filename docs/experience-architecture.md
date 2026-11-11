# Arbor Experience Architecture : audit et architecture cible (décision D12)

Audit du HEAD de `main` (commit `bc8434b`, v44), le 11 novembre 2026. Le code fait foi ; les anciens rapports ne sont pas
des preuves. État distant : migration 008 appliquée et fonction `tutor` redéployée (confirmé par le propriétaire ;
le 11 novembre, un sondage avec la clé publique a montré que les tables et fonctions 008 existent, et l'écran Scénarios
a renvoyé un message que seule la nouvelle fonction produit).

## G0. Cartographie de l'existant

### Routes (`js/app.js`, `route()`, routeur par fragment `#/`)

| Route | Vue | Espace | Module |
|---|---|---|---|
| `#/` | Aujourd'hui | Student | `app.js renderHome` |
| `#/reviser` | Session de révision | Student | `app.js`, `srs.js`, `lesson.js` |
| `#/methode`, `#/trophees` | Méthode, trophées | Student | `app.js`, `trophies.js` |
| `#/cours` | Mes cours | Student | `app.js renderCourses` |
| `#/s/<cours>/<notion>/<fiche\|carte\|revision>` | Cours, notion | Student | `app.js`, `explore.js`, `dialogue.js` |
| `#/progression` | Progression | Student | `app.js`, `mastery.js`, `insight.js` |
| `#/org/<id>[/<onglet>[/<sous>]]` | Espace d'organisation | Business | `org.js render` → `org-onboarding.js`, `org-docs.js`, `org-learn.js`, `org-engines.js` |
| `#/org/nouvelle` | Création (assistant) | Business | `org-onboarding.js wizard` |
| `#/rejoindre/<jeton>` | Rejoindre | Business | `org.js joinView` |

Onglets Business (`org.js head` puis `render`) : `accueil`, `suivi`, `documents[/<source>]`, `competences`, `scenarios`,
`equipe`, `diagnostic`, `mystere`, `resultats`, `configurer/<étape>`, `bienvenue`.

### Espaces et rôles
- Student (« espace personnel ») : données sur l'appareil uniquement (`localStorage` `arbor:v1`, IndexedDB `arbor-db` pour les observations). Un compte n'est nécessaire que pour Pousse et la génération.
- Business : une organisation par espace, rôle par organisation (`admin`, `manager`, `expert`, `member`). L'interface masque selon le rôle (`can()` dans `org.js`), mais **chaque droit est vérifié par la base** (RLS, fonctions `security definer` avec `arbor_private.has_role`) ou par le serveur (`org.ts`, `engines.ts`).
- Changement d'espace : `#spaceBtn` → `Org.openSwitcher`. Quitter `#/org/...` remet l'espace personnel (`route()`).

### Écrans Business, données et appels serveur

| Écran | Rôles (interface) | Données lues (REST, RLS) | Écritures / serveur |
|---|---|---|---|
| Accueil | tous | `my_organizations` | aucune |
| Suivi + Radar + fiche personne | admin, manager | `evidence_events`, `knowledge_nodes`, `memberships`, `skills` | `assign_learning_actions`, `record_human_validation` |
| Documents + Watchdog + relations | admin, manager, expert | `sources`, `source_versions`, `knowledge_nodes`, `policy_changes`, `policy_change_items`, `knowledge_edges` | `add_source`, `add_version`, upload `org-sources`, tâche `extraire`, `comparer_versions`, `relations`, `set_knowledge_status`, `decide_change_item`, `set_edge_status`, `assign_learning_actions` |
| Compétences | admin, manager | `skills`, `skill_knowledge`, `skill_units`, `org_units` | tâche `competences`, insert `skills` / `skill_knowledge` |
| Scénarios | admin, manager | `scenarios`, `scenario_versions` (sans `spec`), `scenario_spec()` | tâches `scenario_concevoir`, `scenario_start`, `publish_scenario_version` |
| Équipe | admin, manager | `memberships`, `org_units`, `invitations`, `organizations.retention_days` | `create_invitation`, `revoke_invitation`, `set_member_unit`, tâche `invitation_envoyer`, `set_retention` |
| Diagnostic | tous | (serveur) | tâches `diagnostic_start`, `diagnostic_answer` |
| Client mystère | tous | `scenarios` publiés | tâches `mystere_start`, `scenario_start`, `mystere_tour`, `mystere_fin` |
| Mes résultats + parcours | tous | ses `evidence_events`, `skills`, `learning_actions` | `set_action_status`, `export_my_org_data`, `erase_my_org_data` |
| Configuration (assistant) | admin | `organizations`, `org_units` | `create_organization`, `update_organization`, `save_unit`, `delete_unit`, `mark_onboarded` |

### Composants et logique réutilisables
- Logique pure (testable sous Node) : `Evidence` (7 niveaux, 5 résultats), `Adaptive.recommend`, `OrgInsight.stateOf/person/team/radar/pathway`.
- Rendu Business réutilisable : `OrgEngines.radar/pathway/watchdog/relations/humanValidation/retention`, `OrgLearn.chat` (conversation de simulation), `OrgOnboarding.inviteBox/skillsEditor`.
- Shell : `openModal`, `toast` (`FX`), `ic`, `esc`, transitions de vue, `Motion`.
- Student : `Dialogue.open` (socratique, Enseigne-moi, situation), `Onboarding` (5 entrées), `Mastery`, `Obs`.

### Tests associés
`tests/org.js` (espaces, cloisonnement), `org-onboarding.js`, `org-docs.js`, `org-learn.js`, `org-engines.js`, `org-insight.js`,
`engines.js` (logique pure), `db-rls.js` (166 vérifications SQL, plusieurs organisations), Deno (`supabase/functions/tutor`),
Student : `foundations.js`, `learning-flow.js`, `explore.js`, `onboarding.js`, `tutor.js`, `data-safety.js`, `pdf-*.js`, `welcome.js`,
`responsive.js` (6 largeurs × 17 écrans), `motion.js`.

### Risques de régression
- `org.js head()` est utilisé par tous les écrans Business et par les tests (`.org-tabs a[href$=...]`) : la navigation doit garder ces liens.
- Les textes vérifiés par `org-learn.js` (D1-D4) et `org-engines.js` doivent rester.
- `route()` : quitter Business remet l'espace personnel ; ne pas casser ce comportement (test `org.js`).
- `responsive.js` mesure les débordements sur 17 écrans : toute nouvelle mise en page doit passer.

## Les 6 exigences de l'addendum : état constaté et décision

| # | Exigence | État constaté (fichiers) | Écart | Décision |
|---|---|---|---|---|
| 1 | Cinq portes d'entrée | Student : 5 entrées réelles dans `js/onboarding.js` (dictée, photo avec Tesseract.js, discussion, défi, import), testées (`tests/onboarding.js`). Business : seul l'import de document. | Pas de portes pour le collaborateur Business. | Implémenter dans Business : 5 portes sur les connaissances validées, sans écrire de preuve depuis le navigateur. Rendre les 5 portes Student accessibles hors premier lancement. |
| 2 | Matrice confiance-compétence | Confiance collectée explicitement au diagnostic (obligatoire) et en simulation (facultative) ; seule la « fausse certitude » est exploitée (`OrgInsight.stateOf`, radar). | Pas de matrice à 4 cases, pas d'évolution, pas de « confiance non mesurée ». | Implémenter `OrgInsight.matrix` (logique pure) et l'afficher (Intelligence, résultats). |
| 3 | Invalidation ciblée | Watchdog : changements, décision humaine, impact, revalidation manuelle (`008`). Preuves immuables. | Aucune compétence en `requires_revalidation` ; pas de micro-mission automatique ; un « modifié » accepté sans extrait vérifié recopie l'ancien extrait sur la nouvelle version. | Migration 009 : `skill_revalidations`, création à la décision (modifié / supprimé seulement), clôture par une preuve juste ultérieure, micro-missions ; correction de la recopie. |
| 4 | Provenance PDF (P0) | Le serveur relit le PDF stocké et vérifie chaque passage avant extraction (`pdftext.ts`, `handler.ts`). Mais l'empreinte (`source_versions.checksum`) est **calculée par le navigateur et jamais vérifiée** ; les connaissances sont **insérées par le navigateur** ; leur validation ne vérifie pas leur extrait. | Provenance non garantie de bout en bout. | Migration 009 + serveur : SHA-256 du fichier stocké calculé par le serveur, comparé à l'empreinte déclarée (divergence : blocage, journal) ; vérification serveur de chaque extrait (`provenance`) ; validation refusée sans provenance vérifiée ; chaque preuve porte version et empreinte. |
| 5 | Verdicts | 5 résultats distincts (`juste`, `partiel`, `faux`, `insuffisant`, `non_documente`), non-documenté jamais compté comme erreur. | Pas de catégorie « connaissance de terrain hors référentiel » signalée au manager. | Verdict serveur `hors_referentiel` (plausible, non documenté, jamais compté juste) enregistré dans `out_of_scope_knowledge` (009), visible de l'équipe de contenu. |
| 6 | Persistance `advance()` | `advance()` passait à l'étape suivante même si la sauvegarde échouait (toast seulement). | Non conforme. | **Corrigé** (commit `53e92ea`) : progression seulement après confirmation, délai 15 s, double clic, réessai sans perte ; tests P1-P6. |

## G1. Architecture cible

### Shell contextuel
Un seul routeur (`app.js`), deux coquilles :
- **Student** (inchangée dans sa structure) : barre du haut, navigation basse sur mobile ; sur grand écran, une colonne de contexte (cours, révisions) existe déjà dans les vues.
- **Business** (`html.in-org`) : sur ordinateur (≥ 1024 px), **barre latérale** propre à l'organisation ; sur mobile et tablette, les onglets actuels restent (rien n'est retiré).

Sections Business et rôles (l'interface suit le rôle ; la base décide) :

| Section | Route | admin | manager | expert | collaborateur |
|---|---|---|---|---|---|
| Vue d'ensemble | `accueil` | ✓ (indicateurs d'équipe) | ✓ | ✓ (documents) | ✓ (son parcours) |
| Équipe | `equipe`, `suivi` | ✓ | ✓ | | |
| Documents | `documents` | ✓ | ✓ | ✓ | |
| Compétences | `competences` | ✓ | ✓ | | |
| Scénarios | `scenarios` | ✓ | ✓ | | |
| Intelligence | `intelligence` | ✓ | ✓ | | |
| Apprendre (5 portes, diagnostic, simulation, résultats) | `apprendre`, `diagnostic`, `mystere`, `resultats` | ✓ | ✓ | ✓ | ✓ |
| Aperçu collaborateur (sandbox) | `apercu` | ✓ | ✓ | | |
| Paramètres | `parametres`, `configurer` | ✓ | (conservation : admin) | | |

### Modules (évolution, pas de réécriture)
- `js/org-shell.js` (nouveau) : barre latérale, vue d'ensemble, Intelligence, Paramètres, portes d'entrée Business. Il assemble les rendus existants ; il ne contient aucun moteur.
- `js/org-sandbox.js` (nouveau) : aperçu collaborateur. Données fictives en mémoire, aucun appel réseau en écriture (barrière vérifiée par test), bandeau « Simulation ».
- `js/org-insight.js` : + `matrix` (confiance × compétence).
- Serveur : `provenance` (empreinte, extraits), verdict `hors_referentiel`.
- Migration `009_experience.sql` : provenance, revalidation ciblée, connaissances hors référentiel. Compatible avec les données existantes (colonnes ajoutées avec valeurs par défaut, anciennes connaissances validées conservées et signalées « provenance non vérifiée »).
