# Arbor Desktop : origines du serveur, et proposition de synchronisation

**Statut :** préparation. Aucune configuration de production n'a été modifiée.

## 1. Origines autorisées (`TUTOR_ORIGINS`)

### 1.1 Constat
La fonction `tutor` n'accepte que les origines listées dans `TUTOR_ORIGINS` (`supabase/functions/tutor/index.ts`).
- Valeur actuelle : `https://hmzr944.github.io`.
- Dans l'application installée, la page n'a pas cette origine. Tauri 2 sert les fichiers depuis :

| Système | Origine |
|---|---|
| macOS (et Linux) | `tauri://localhost` |
| Windows | `http://tauri.localhost` |

**Effet :** depuis l'application, tout ce qui passe par la fonction `tutor` est refusé (code 403) :
- la génération de fiches ;
- le compagnon ;
- Pousse ;
- l'espace professionnel.

Ce qui n'en dépend pas fonctionne :
- les cours, les révisions et la progression, qui restent sur l'appareil ;
- la connexion par code, et les lectures et écritures de la base via l'API REST de Supabase, qui accepte toutes les
  origines (le contrôle se fait par les jetons et la RLS).

### 1.2 Modification préparée, à appliquer par le propriétaire
Dans Supabase : *Edge Functions*, puis *Secrets*, puis `TUTOR_ORIGINS`.
```
https://hmzr944.github.io,tauri://localhost,http://tauri.localhost
```

**Risque :** faible.
- L'origine n'est pas une protection d'accès : chaque appel exige un jeton de session valide, et les quotas
  s'appliquent par personne.
- L'origine empêche seulement qu'un site tiers utilise la session d'un apprenant depuis son navigateur.
- `tauri://localhost` n'est atteignable par aucun site web.

### 1.3 Connexion depuis l'application
| Mode | Fonctionne dans l'application ? | Pourquoi |
|---|---|---|
| Code reçu par e-mail (`verifyCode`) ou mot de passe | Oui | aucune redirection |
| Lien magique | Non | il ouvre le navigateur, pas l'application |
| Connexion Google | Non | elle redirige vers le site |

Pour les deux derniers, il faudrait :
- un **lien profond**, `arbor://auth`, avec `tauri-plugin-deep-link` ;
- l'URL de redirection correspondante, déclarée dans Supabase Auth.

C'est à décider. Dans l'immédiat, l'application propose la connexion par code.

## 2. Synchronisation entre appareils : proposition technique

**Rien n'est implémenté.** Ce qui suit est une proposition à valider.

### 2.1 Ce qui existe
| Données | Où elles vivent |
|---|---|
| Données personnelles Learning : cours, notes, fiches, révisions FSRS, journal des preuves | `localStorage` et IndexedDB, sur l'appareil seulement |
| Données professionnelles : documents, règles, preuves, revalidations, transmissions | base de l'organisation, avec RLS |

Une sauvegarde manuelle (export et import JSON) existe déjà.

### 2.2 Principes
1. **Deux mondes séparés, jamais mélangés.** La synchronisation ne concerne que l'espace personnel Learning. Les données
   professionnelles restent dans la base de l'organisation, et aucune donnée personnelle n'y entre.
2. **Facultative et explicite.** Elle est désactivée par défaut et s'active avec un compte. On peut la désactiver et
   tout effacer côté serveur.
3. **Chiffrée de bout en bout**, recommandé :
   - la clé est dérivée d'une phrase secrète de l'apprenant (Argon2id), et le serveur ne stocke que des blocs chiffrés
     (AES-GCM) ;
   - conséquence assumée : une phrase oubliée ne se récupère pas, mais une sauvegarde locale reste possible ;
   - ni le compagnon ni les générations n'ont besoin de lire ces blocs, car le navigateur envoie les passages au moment
     voulu, comme aujourd'hui.

### 2.3 Modèle de données (migration 013 proposée)
- `sync_items(user_id, item_id, kind, version, updated_at, deleted, ciphertext, nonce)`.
  - `kind` vaut `subject`, `node`, `fiche`, `srs` ou `obs`.
  - Une ligne par objet stable, pas un seul gros document : les conflits restent localisés et les envois légers.
- RLS : `user_id = auth.uid()`, et rien d'autre ; aucun rôle d'organisation ne lit cette table.
- Le journal des preuves (`obs`) est en **ajout seul** : il n'y a jamais de conflit, les deux appareils fusionnent par
  union (l'identifiant de chaque observation est unique).

### 2.4 Conflits
| Objet | Règle | Justification |
|---|---|---|
| Observations (preuves) | union, jamais d'écrasement | un fait observé ne disparaît pas |
| État FSRS d'une notion | **recalculé** à partir des observations fusionnées | pas de « dernier qui écrit gagne » sur la mémoire |
| Notes et titres | horloge par champ ; si les deux appareils ont modifié le même champ, on garde les deux versions et l'apprenant choisit | aucune perte silencieuse |
| Fiches | version la plus récente **et** validée ; une fiche modifiée repasse au validateur | — |
| Suppressions | « pierre tombale » gardée 90 jours | — |

### 2.5 Fonctionnement hors ligne
Chaque appareil reste pleinement utilisable sans réseau, comme aujourd'hui. La synchronisation pousse et tire :
- au lancement ;
- toutes les 5 minutes ;
- au retour du réseau.

### 2.6 RGPD
| Point | Proposition |
|---|---|
| Finalité | permettre à l'apprenant de retrouver son apprentissage sur ses appareils, et rien d'autre (ni analyse, ni partage) |
| Base légale | exécution du service demandé, par activation explicite |
| Minimisation | blocs chiffrés ; métadonnées réduites à l'identifiant, au type, à la version et à la date |
| Droits | export (le fichier de sauvegarde existant) ; effacement complet en un geste (`delete` sur `sync_items`) ; aucune conservation après effacement, hors sauvegardes techniques de Supabase selon leur durée |
| Hébergement | celui du projet Supabase ; à choisir en Union européenne pour le Business (décision H1 du plan) |
| Mineurs | à traiter avant ouverture aux moins de 15 ans (consentement parental) |
| Registre | une ligne de plus au registre des traitements |

### 2.7 Charge et risques
- **Charge :** un lot moyen, soit environ une à deux semaines :
  - migration et RLS ;
  - module de synchronisation côté navigateur ;
  - chiffrement (WebCrypto, avec Argon2 en WebAssembly) ;
  - écran de conflit ;
  - tests de fusion par propriétés, sur des historiques générés.
- **Risques :**
  - la phrase secrète perdue ;
  - les quotas de stockage du plan gratuit de Supabase ;
  - la cohérence FSRS si les horloges des appareils divergent (d'où le recalcul à partir des observations datées par
    le serveur).

**Décisions demandées avant tout code :**
1. chiffrement de bout en bout, ou chiffrement côté serveur seulement (plus simple, récupérable, mais lisible par
   l'opérateur) ;
2. hébergement européen ;
3. âge minimal.
