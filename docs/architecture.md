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

## D4. Traçabilité des connaissances Business (validée, à construire)

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
