# Arbor : décisions d'architecture

Un seul Arbor, un seul moteur pédagogique, plusieurs contextes d'apprentissage. Ce document consigne les décisions
prises et leurs raisons. Chaque décision a un numéro ; une décision remplacée reste ici, marquée comme telle.

## D1. Plusieurs contextes, un seul moteur (validée le 6 novembre 2026)

Une même personne peut avoir plusieurs **contextes d'apprentissage** : personnel, études, une ou plusieurs organisations.

- **Ce qui est commun** : le moteur. Modèle de connaissance (notions sourcées, relations), preuves (observations datées),
  calcul des états de maîtrise, matrice confiance et justesse, recommandations, Pousse, scénarios.
  Ces modules ne savent pas où les données sont rangées : ils reçoivent des connaissances et des événements de preuve
  et rendent des états et des recommandations.
- **Ce qui change selon le contexte** : l'endroit où les données vivent, qui peut les lire, l'interface et les menus.

| Contexte | Stockage | Qui lit |
|---|---|---|
| Personnel / études | Sur l'appareil (localStorage, IndexedDB) | L'apprenant seul |
| Organisation | Supabase (Postgres, RLS, stockage privé) | Selon le rôle dans l'organisation |

Conséquence voulue : **un manager ne peut pas voir l'apprentissage personnel d'un collaborateur**, parce que ces données
ne sont jamais envoyées au serveur. La règle ne repose pas sur une permission qu'on pourrait mal régler.

Forme commune d'un événement de preuve (même structure en local et sur le serveur) :

```
{ context, user, knowledge (notion ou connaissance), skill?, activity (rappel | lecon | dialogue | diagnostic | simulation),
  outcome (juste | partiel | faux), confidence? (devine | sait | reflexe), source?, source_version?,
  evaluator (regle | ia | humain), detail, at }
```

Les états de maîtrise sont **toujours calculés** à partir des événements, jamais stockés comme vérité.
Un événement n'est jamais modifié ni supprimé ; une correction est un nouvel événement.

## D2. Synchronisation personnelle : prévue, pas maintenant

L'espace personnel reste local. Une synchronisation chiffrée de bout en bout pourra s'ajouter plus tard sans changer le
moteur : le contexte personnel serait copié, chiffré sur l'appareil avec une clé dérivée d'une phrase secrète de
l'utilisateur, dans une table où le serveur ne voit que des blocs illisibles. Elle reste **séparée** des organisations :
aucune table d'organisation ne peut y faire référence. Hors périmètre du pilote.

## D3. Aucune clé d'IA dans le navigateur (validée et appliquée le 6 novembre 2026)

Avant : `js/ai.js` appelait l'API Claude depuis le navigateur avec la clé de l'utilisateur (`dangerouslyAllowBrowser`).
Maintenant : toute génération passe par la fonction Supabase `tutor` (modèles open source via une API compatible OpenAI,
par défaut Groq gratuit). L'utilisateur se connecte par e-mail ; la clé reste dans les secrets du serveur.

- Tâches serveur : dialogue (`socratique`, `enseigne`), `enrichir` (points clés et questions d'une partie de PDF),
  `rediger_cours` et `rediger_notion` (à partir de passages Wikimedia trouvés par le navigateur).
- Seul le texte extrait est envoyé, jamais le fichier PDF.
- Ancrage : le serveur mesure la part du vocabulaire porteur de sens présente dans le texte source et écarte ce qui
  s'en éloigne trop (seuils dans `generate.ts`, à recalibrer sur de vrais cours).
- Quotas séparés : dialogue (`TUTOR_MONTHLY_LIMIT`) et génération (`GEN_MONTHLY_LIMIT`).
- Sans compte : analyse rapide locale des PDF, rédaction assemblée à partir des sources, IA locale sur ordinateur.
- Une ancienne clé enregistrée dans le navigateur est effacée au chargement.

Ce qui a changé pour l'utilisateur : l'ancienne « analyse avancée » faisait relire le PDF entier par Claude et pouvait
redécouper le cours. L'offre gratuite limite chaque minute le volume de texte traité, donc le découpage reste celui de
l'analyse locale ; le serveur ajoute ensuite points clés et questions, partie par partie, sans toucher au texte du cours.

## D4. Traçabilité des connaissances Business (validée ; schéma en place, migration 003)

Chaque connaissance d'une organisation est reliée à :

```
sources (document) ─< source_versions (fichier privé, empreinte, date, auteur)
source_versions ─< knowledge_nodes (type, texte, extrait exact, page, confiance d'extraction,
                                    statut : propose | valide | rejete | a_revalider | remplace, validé par)
knowledge_nodes >─< skills (via skill_knowledge)
knowledge_nodes ─< scenarios (via la liste des connaissances utilisées)
evidence_events → knowledge_node + source_version utilisée au moment de la preuve
```

Quand une nouvelle version d'un document arrive : on compare les extraits page par page, les connaissances dont
l'extrait a disparu ou changé passent à `a_revalider`, et l'on en déduit les compétences, les scénarios et les preuves
concernés. Rien n'est invalidé en bloc ; l'historique des versions et des preuves est conservé.
Une connaissance de type `sensible` n'est jamais utilisée dans un scénario sans validation humaine.

## D5. Client Mystère : une simulation, pas un chatbot (validée, à construire)

- **Fiche de scénario validée** : profil et personnalité du client, objectif, besoin caché, 2 ou 3 objections,
  connaissances autorisées (validées uniquement), grille de comportements observables reliés aux compétences.
- **État du client** tenu par le serveur entre les tours : besoin découvert ou non, objections levées, patience,
  informations déjà données. Le client répond en fonction de cet état et de sa fiche, pas seulement du dernier message.
- **Évaluateur séparé** du rôle du client : pour chaque tour, comportements observés avec la phrase exacte de l'échange
  qui le montre, et vérification des affirmations produit face aux connaissances validées. Une affirmation absente des
  fiches est signalée, jamais acceptée.
- **Confiance déclarée** aux décisions clés (« Je devine », « Je sais », « C'est un réflexe ») : une erreur annoncée
  comme un réflexe est une fausse certitude, prioritaire dans le diagnostic.
- Une simulation réussie ne rend jamais une compétence « maîtrisée » à elle seule : il faut des preuves répétées dans le temps.

## D6. Cloisonnement des organisations (appliqué, migration 003)

- Chaque ligne porte `org_id`. Les clés étrangères composites `(id, org_id)` empêchent de rattacher une ligne
  d'une organisation à un parent d'une autre, même par le serveur.
- L'appartenance se lit toujours depuis `auth.uid()` dans la base (`arbor_private.is_member`, `has_role`), jamais
  depuis une valeur envoyée par le client.
- Rôles : `admin` (tout, y compris les rôles et le journal), `manager` (invitations, validation, preuves de l'équipe),
  `expert` (contenu, validation hors informations sensibles), `member` (connaissances validées, ses propres preuves).
- Les preuves ne sont écrites que par le serveur, après évaluation : un collaborateur ne peut pas s'attribuer un résultat.
  Elles ne sont jamais modifiées ; l'effacement (RGPD) demande une autorisation explicite dans la transaction.
- Opérations sensibles par fonctions contrôlées et journalisées : `create_organization`, `create_invitation`,
  `accept_invitation`, `set_knowledge_status`, `set_member`.
- Le test `tests/db-rls.js` part des droits par défaut de Supabase (tout ouvert sur `public`) pour prouver que
  les retraits de droits et les règles d'accès suffisent.

## D7. Choisir son espace, rejoindre une organisation (appliqué, migration 004, étape C)

- Un sélecteur d'espace apparaît dans l'en-tête dès qu'on appartient à une organisation ; sinon, rien ne change pour l'étudiant
  (création et invitation restent accessibles depuis les réglages et l'introduction).
- Dans un espace professionnel (`#/org/<id>`), les menus personnels (cours, niveau, import, Pousse) sont masqués ;
  le module `js/org.js` ne reçoit que des outils d'affichage, jamais l'état personnel.
- Invitation : lien `#/rejoindre/<jeton>` (le jeton reste dans le fragment de l'adresse, jamais envoyé au site), valable pour
  une adresse, une fois, 7 jours ; l'e-mail du membre est copié depuis son jeton de connexion par la base.
- L'empreinte du jeton n'est plus lisible, même par l'administrateur ; une invitation non utilisée peut être annulée (journalisé).
- Tests : `tests/org.js` (parcours complet avec une base simulée, aucune donnée personnelle dans les requêtes) et
  `tests/db-rls.js` (règles d'accès réelles, section E).

## D8. Documents de l'organisation et extraction des connaissances (appliqué, migration 005, étape D)

- Envoi d'un PDF par l'équipe de contenu (admin, manager, expert) : `add_source` / `add_version` créent la version
  (numéro, empreinte SHA-256, chemin `org/<document>/v<n>.pdf`) ; le fichier va dans le stockage privé `org-sources`.
  Un fichier identique à la dernière version est refusé.
- Le texte est lu page par page dans le navigateur ; le tri cours / hors cours (`DocClassify`, mode strict pour les
  documents de travail) écarte jugements, conseils personnels et annexes : ils ne sont jamais envoyés à l'extraction.
- Tâche serveur `extraire` : connaissances typées (concept, règle, procédure, produit, sensible), chacune avec un extrait
  retrouvé mot pour mot dans un passage (sinon écartée) et la page de ce passage. Sécurité, santé, juridique et argent
  sont toujours « sensible », quel que soit l'avis du modèle.
- Les connaissances arrivent « proposées » ; une connaissance sensible ne se valide que par un manager ou un administrateur.
- Nouvelle version : une connaissance dont l'extrait figure toujours dans le document reste valable ; sinon elle passe
  « à revalider ». Les nouvelles connaissances sont proposées sans doublon. L'historique des versions est conservé.
- Limite connue : les passages envoyés à l'extraction viennent du navigateur de l'équipe de contenu ; le serveur vérifie
  les extraits contre ces passages, pas contre le fichier stocké (acceptable pour le pilote, à revoir pour la production).

## D9. Compétences, diagnostic, Client Mystère, suivi (appliqué, migration 006, étapes E à G)

- Toute la logique est dans `supabase/functions/tutor/org.ts` : le rôle est vérifié dans la base à chaque appel, seules
  les connaissances validées servent, et les preuves sont écrites par le serveur uniquement.
- Diagnostic : questions générées (ou de repli, construites à partir des extraits) ; la bonne réponse reste dans
  `diagnostic_items`, illisible depuis le navigateur ; une question dont la bonne réponse contient un nombre absent de la
  connaissance est écartée ; une question ne se répond qu'une fois.
- Client Mystère : la fiche (besoin caché, objections) reste sur le serveur (`scenario_sessions.spec` non lisible) ; à
  chaque réplique, un évaluateur séparé relève des comportements observables en citant la phrase exacte du vendeur
  et compare chaque affirmation aux connaissances validées ; puis le client répond selon sa fiche et l'état de la
  situation (patience, besoin découvert, objections levées). Le débrief est calculé sans modèle, à partir de l'état.
- Suivi (`js/org-insight.js`) : l'état d'une connaissance vient des preuves dans le temps ; « maîtrise durable » exige
  deux réussites à 7 jours d'écart, la dernière juste ; une fragilité d'équipe n'apparaît qu'à partir de 3 observations
  sur 2 personnes, avec la taille de l'échantillon, la période et la couverture.
- Quota propre à l'espace professionnel (`ORG_MONTHLY_LIMIT`, 400 appels par personne et par mois par défaut).

## D10. Un compte, deux espaces, onboarding reprenable (appliqué dans le code, migration 007 à appliquer)

- Le compte (Supabase Auth) est unique ; il n'est lié ni à Student ni à Business. Le profil (`profiles`) ne garde que des drapeaux
  d'onboarding (espace choisi, introduction faite, entrée choisie, date de première action) : aucun contenu d'apprentissage (D1 tient).
- Une organisation est indépendante de l'espace personnel ; une personne peut appartenir à plusieurs, avec un rôle par organisation.
  Le propriétaire est le créateur (`organizations.created_by`) : il reste administrateur actif (`set_member` le refuse sinon).
- Équipes et établissements (`org_units`) avec clés composites `(id, org_id)` comme le reste de Business (D6).
- Invitations : jeton haché, annulation conservée (`revoked_at`), aperçu public `invitation_preview` (le jeton de 192 bits est le secret),
  refus « déjà membre », une seule invitation en attente par adresse.
- Les 5 entrées Student créent toutes un sujet Arbor ordinaire : mêmes notions, révisions, observations et maîtrise prouvée.
  Une explication personnelle est marquée « à vérifier », complétée par une source, jamais comptée comme preuve.
