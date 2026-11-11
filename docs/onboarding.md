# Onboarding universel, compte unique, deux espaces

Audit réalisé le 11 novembre 2026 sur le dépôt (v38) et sur le projet Supabase réel (sondé avec la clé publiable).
Ce document sert de référence pour les phases 1 à 6 ; il est mis à jour à la fin de chaque phase.

## 1. Ce qui existe et fonctionne

| Domaine | Où | État vérifié |
|---|---|---|
| Compte : e-mail + mot de passe, confirmation, renvoi, mot de passe oublié, nouveau mot de passe, code à 6 chiffres | `js/tutor.js`, `js/welcome.js` | testé (Supabase simulé, 61 vérifications) ; sur le vrai projet : réglages vérifiés (inscriptions ouvertes, confirmation active, 8 caractères) ; **envoi d'e-mails bloqué tant qu'aucun SMTP n'est branché** |
| Session : jeton + rafraîchissement automatique, déconnexion | `js/tutor.js` (`token()`, `signOut`) | testé |
| Espace personnel (cours, révisions FSRS, observations, maîtrise prouvée) | `js/store.js`, `js/db.js`, `js/mastery.js`, `js/insight.js` | local à l'appareil (décision D1) ; testé |
| Import PDF (classification des blocs, pages, mis de côté) | `js/pdf-import.js`, `js/doc-classify.js` | testé, corpus réel |
| Cours à partir d'un sujet (sources Wikimedia, reformulées par le serveur si connecté) | `js/app.js` `fetchCourse`, `js/storm.js` | testé (réseau Wikimedia parfois limité) |
| Pousse : dialogue socratique et « Enseigne-moi » sur une notion, citations vérifiées | `js/dialogue.js`, fonction `tutor` | testé (Deno + navigateur) |
| Organisations, membres, rôles admin / manager / expert / membre, invitations à jeton haché, audit | migrations 003-004, `js/org.js` | **déployé** sur le projet (sondé) ; RLS testées sur PostgreSQL 16 |
| Documents de l'organisation, versions, extraction, validation humaine, sensible forcé | migration 005, `js/org-docs.js`, tâche `extraire` | déployé ; testé |
| Compétences proposées, diagnostic, Client Mystère, suivi manager avec garde-fous statistiques | migration 006, `js/org-learn.js`, `js/org-insight.js`, `org.ts` | déployé ; testé |

## 2. Ce qui existe mais est incomplet

- **Accueil** : centré sur « un PDF devient un cours » ; ne dit pas qu'on peut partir d'une question, d'une explication, d'une photo.
- **Après connexion** : on entre directement dans l'introduction étudiante ; aucun choix d'espace, aucune détection des organisations.
- **Création d'organisation** : nom + secteur seulement ; pas de taille, pays, langue, objectifs ; pas d'équipes ni d'établissements ; pas d'assistant.
- **Rôles** : pas de « propriétaire » ; un administrateur peut rétrograder le créateur.
- **Invitations** : annuler supprime la ligne (on ne peut plus dire « annulée ») ; pas d'équipe ; pas d'aperçu avant connexion ; « déjà membre » non distingué.
- **Compétences** : pas d'importance, pas d'équipes concernées, pas de suppression.
- **Collaborateur** : il arrive sur l'accueil de l'organisation sans explication (pourquoi, ce qui est observé, qui voit ses résultats).
- **Reprise** : l'état d'onboarding n'existe que dans ce navigateur.
- **Liens e-mail expirés ou déjà utilisés** : message brut de Supabase en anglais.

## 3. Ce qui est absent

- Profil serveur (prénom, état d'onboarding reprenable d'un appareil à l'autre).
- Connexion Google (le fournisseur est **désactivé** sur le projet : `external.google = false`).
- Dictée / « Brain Dump », reconnaissance de texte sur photo, défi de départ sans cours, import par URL.

## 4. À corriger avant d'ajouter

1. Annulation d'invitation : conserver la ligne (`revoked_at`) au lieu de la supprimer.
2. Protéger le propriétaire (créateur) contre la rétrogradation.
3. `create_invitation` et `my_organizations` changent de signature : les supprimer avant de les recréer (sinon PostgREST hésite entre deux versions).

## 5. Risques de régression

- Tests navigateur qui partent d'un appareil neuf (accueil, introduction, organisation) : adaptés à chaque phase.
- Fonctions SQL recréées : rejouées dans `tests/db-rls.js` avec les scénarios existants (O, I, S, K…).
- Espace personnel : aucune donnée personnelle ne part vers la base ; vérifié par `tests/org.js` (F1).

## 6. Migration nécessaire : `007_onboarding_workspaces.sql` (une seule, à appliquer à la fin)

- `profiles` : prénom, état d'onboarding (étapes franchies, dates), dernier espace. Lecture et écriture : la personne seule.
  Aucun contenu d'apprentissage personnel (D1 : il reste sur l'appareil).
- `organizations` : taille, pays, langue, objectifs, progression de l'assistant ; modification par `update_organization` (administrateur).
- Propriétaire = `organizations.created_by` ; `set_member` refuse de le rétrograder ou de le suspendre.
- `org_units` (équipes et établissements) ; `memberships.unit_id`, `invitations.unit_id`.
- Invitations : `revoked_at`, aperçu `invitation_preview` (statut, organisation, rôle, adresse masquée), refus « déjà membre ».
- Compétences : `importance` (1 à 3), `skill_units`, modification et suppression par admin / manager.
- `memberships.onboarded_at` + `mark_onboarded` : le parcours collaborateur ne se rejoue pas.

## 7. Plan

| Phase | Contenu |
|---|---|
| 1 | Profil serveur, Google si activé (bouton masqué sinon), liens expirés en français, reprise |
| 2 | Choix de l'espace après connexion ; organisations existantes ; changement d'espace |
| 4 | Assistant Business (6 étapes reprenables) ; équipes ; invitations v2 ; compétences éditables |
| 5 | Parcours collaborateur : rôle, équipe, compétences attendues, ce qui est observé, qui voit, diagnostic |
| 3 | Introduction Student : 5 entrées réelles, objectif libre, personnalisation facultative, première expérience |
| 6 | Tests complets (navigateur, base, Deno), guide Supabase, rapport |

Business passe avant Student (priorité de la demande). Chaque phase se termine par ses tests et un commit.
