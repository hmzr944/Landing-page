/* Cloisonnement des organisations (migration 003) sur un vrai PostgreSQL, avec les règles d'accès (RLS).
   Démarre un PostgreSQL temporaire (binaires PostgreSQL 16 requis), applique le bouchon Supabase puis les migrations,
   et joue chaque scénario sous l'identité d'un utilisateur connecté (rôle « authenticated » + jeton simulé).
   Lancer depuis la racine du dépôt :  node tests/db-rls.js
   Ce qui n'est PAS couvert ici : le module Storage de Supabase (politiques des fichiers), testé seulement sur le vrai projet. */
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BIN = ['/usr/lib/postgresql/16/bin', '/usr/lib/postgresql/17/bin', '/usr/lib/postgresql/15/bin'].find((d) => fs.existsSync(path.join(d, 'initdb')));
if (!BIN) { console.log('– PostgreSQL introuvable : tests de base de données NON VÉRIFIÉS'); process.exit(0); }

let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' : ' + extra : ''}`); if (!ok) failed++; };

// PostgreSQL refuse de tourner en root : on utilise l'utilisateur « postgres » si besoin
const asRoot = process.getuid && process.getuid() === 0;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arbor-db-'));
const run = (cmd, args) => {
  if (asRoot) { fs.chownSync(dir, Number(execFileSync('id', ['-u', 'postgres']).toString()), Number(execFileSync('id', ['-g', 'postgres']).toString())); return execFileSync('su', ['postgres', '-c', [cmd, ...args].map((a) => `'${a}'`).join(' ')], { stdio: 'pipe' }); }
  return execFileSync(cmd, args, { stdio: 'pipe' });
};
const PORT = String(54000 + Math.floor(Math.random() * 900));
run(path.join(BIN, 'initdb'), ['-D', path.join(dir, 'data'), '-U', 'postgres', '--auth=trust']);
run(path.join(BIN, 'pg_ctl'), ['-D', path.join(dir, 'data'), '-o', `-p ${PORT} -k ${dir} -c listen_addresses=`, '-l', path.join(dir, 'log'), '-w', 'start']);
const stop = () => { try { run(path.join(BIN, 'pg_ctl'), ['-D', path.join(dir, 'data'), '-m', 'fast', 'stop']); } catch (e) { /* déjà arrêté */ } };
process.on('exit', stop);

function psql(sql) {
  const r = spawnSync('psql', ['-h', dir, '-p', PORT, '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At', '-F', '|', '-q'], { input: sql, encoding: 'utf8', env: { ...process.env, PGOPTIONS: '-c client_min_messages=warning' } });
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}
const file = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
// Une requête sous l'identité d'un utilisateur connecté (comme l'API REST de Supabase avec son jeton)
function as(user, sql) {
  const claims = JSON.stringify({ sub: user.id, email: user.email, role: 'authenticated' }).replace(/'/g, "''");
  return psql(`begin; set local role authenticated; select set_config('request.jwt.claims', '${claims}', true) \\g /dev/null\n${sql}\ncommit;`);
}
const asService = (sql) => psql(`begin; set local role service_role;\n${sql}\ncommit;`);

// ---------- Mise en place ----------
for (const f of ['tests/db/supabase-stub.sql', 'supabase/migrations/001_tutor.sql', 'supabase/migrations/002_generation.sql', 'supabase/migrations/003_organizations.sql', 'supabase/migrations/004_org_space.sql', 'supabase/migrations/005_documents.sql', 'supabase/migrations/006_diagnostic_scenarios.sql']) {
  const r = psql(file(f));
  check(`M ${path.basename(f)} s'applique`, r.ok, r.err.slice(0, 300));
  if (!r.ok) process.exit(1);
}
const again = psql(file('supabase/migrations/003_organizations.sql'));
check('M0 la migration 003 peut être rejouée sans erreur', again.ok, again.err.slice(0, 300));

const U = (n, email) => ({ id: `00000000-0000-0000-0000-00000000000${n}`, email });
const alice = U(1, 'alice@magasin-a.fr'), bob = U(2, 'bob@magasin-a.fr'), carla = U(3, 'carla@magasin-b.fr'), dan = U(4, 'dan@ailleurs.fr'), eve = U(5, 'eve@magasin-a.fr');
psql(`insert into auth.users values ${[alice, bob, carla, dan, eve].map((u) => `('${u.id}', '${u.email}')`).join(',')};`);

// ---------- Organisations ----------
const orgA = as(alice, `select public.create_organization('Magasin A', 'retail');`).out;
const orgB = as(carla, `select public.create_organization('Magasin B', 'retail');`).out;
check('O1 un utilisateur connecté crée son organisation et en devient administrateur', /^[0-9a-f-]{36}$/.test(orgA) && as(alice, `select role from public.memberships where org_id = '${orgA}';`).out === 'admin');
check('O2 un anonyme ne peut pas créer d’organisation', !psql(`set role anon; select public.create_organization('X');`).ok);
check('O3 chacun ne voit que ses organisations', as(alice, 'select name from public.organizations;').out === 'Magasin A' && as(carla, 'select name from public.organizations;').out === 'Magasin B' && as(dan, 'select count(*) from public.organizations;').out === '0');
check('O4 écrire directement dans les organisations ou les membres est impossible', !as(dan, `insert into public.memberships (org_id, user_id, role) values ('${orgA}', '${dan.id}', 'admin');`).ok && !as(dan, `insert into public.organizations (name, created_by) values ('Pirate', '${dan.id}');`).ok);

// ---------- Invitations ----------
const tok = as(alice, `select public.create_invitation('${orgA}', 'Bob@Magasin-A.fr', 'member');`).out;
check('I1 l’administrateur invite par e-mail ; seule l’empreinte du jeton est stockée', tok.length === 48 && psql(`select count(*) from public.invitations where token_hash = '${tok}';`).out === '0');
check('I2 un non-administrateur ne peut pas inviter', !as(dan, `select public.create_invitation('${orgA}', 'x@y.fr');`).ok);
check('I3 l’invitation est refusée pour une autre adresse e-mail', /autre adresse/.test(as(dan, `select public.accept_invitation('${tok}');`).err));
check('I4 la bonne personne accepte et devient membre', as(bob, `select public.accept_invitation('${tok}');`).out === orgA && as(bob, `select role from public.memberships where org_id = '${orgA}' and user_id = '${bob.id}';`).out === 'member');
check('I5 une invitation ne sert qu’une fois', !as(bob, `select public.accept_invitation('${tok}');`).ok);
const tokMgr = as(alice, `select public.create_invitation('${orgA}', 'eve@magasin-a.fr', 'manager');`).out;
as(eve, `select public.accept_invitation('${tokMgr}');`);
check('I6 un manager ne peut pas inviter un administrateur', /administrateur/.test(as(eve, `select public.create_invitation('${orgA}', 'z@a.fr', 'admin');`).err));
check('I7 un membre ne voit pas les invitations', as(bob, 'select count(*) from public.invitations;').out === '0' && as(eve, 'select count(*) from public.invitations;').out === '2');

// ---------- Sources et connaissances ----------
const src = as(alice, `insert into public.sources (org_id, title, created_by) values ('${orgA}', 'Fiche produit Vélo X', '${alice.id}') returning id;`).out;
const ver = as(alice, `insert into public.source_versions (org_id, source_id, version, storage_path, checksum, uploaded_by) values ('${orgA}', '${src}', 1, '${orgA}/velo-x-v1.pdf', 'abc', '${alice.id}') returning id;`).out;
check('S1 l’équipe de contenu ajoute une source et sa version', /^[0-9a-f-]{36}$/.test(src) && /^[0-9a-f-]{36}$/.test(ver));
check('S2 un membre ne peut pas ajouter de source', !as(bob, `insert into public.sources (org_id, title, created_by) values ('${orgA}', 'X', '${bob.id}');`).ok);
check('S3 impossible d’écrire dans une autre organisation en donnant son org_id', !as(carla, `insert into public.sources (org_id, title, created_by) values ('${orgA}', 'Intrusion', '${carla.id}');`).ok);
check('S4 une version ne peut pas être rattachée à la source d’une autre organisation', !as(carla, `insert into public.source_versions (org_id, source_id, version, uploaded_by) values ('${orgB}', '${src}', 2, '${carla.id}');`).ok);
check('S5 le chemin du fichier doit être dans le dossier de l’organisation', !as(alice, `insert into public.source_versions (org_id, source_id, version, storage_path, uploaded_by) values ('${orgA}', '${src}', 2, '${orgB}/vole.pdf', '${alice.id}');`).ok);

const k1 = as(alice, `insert into public.knowledge_nodes (org_id, source_version_id, kind, title, body, quote, page, confidence, created_by) values ('${orgA}', '${ver}', 'produit', 'Autonomie du Vélo X', 'Batterie 500 Wh, 80 km.', 'autonomie de 80 km', 2, 0.82, '${alice.id}') returning id;`).out;
const k2 = as(alice, `insert into public.knowledge_nodes (org_id, source_version_id, kind, title, body, quote, page, created_by) values ('${orgA}', '${ver}', 'sensible', 'Retour d’une batterie endommagée', 'Ne jamais recharger, isoler, appeler le SAV.', 'ne jamais recharger', 3, '${alice.id}') returning id;`).out;
{ const k = as(alice, `select status, page, source_version_id = '${ver}', quote from public.knowledge_nodes where id = '${k1}';`); check('K1 une connaissance garde sa source, sa version, sa page, son extrait et arrive « proposée »', k.out === 'propose|2|t|autonomie de 80 km', k.out + k.err); }
check('K2 un membre ne voit pas les connaissances non validées', as(bob, 'select count(*) from public.knowledge_nodes;').out === '0');
check('K3 le statut ne se change pas directement', !as(alice, `update public.knowledge_nodes set status = 'valide' where id = '${k1}';`).ok);
as(alice, `select public.set_knowledge_status('${k1}', 'valide');`);
check('K4 validée par la fonction contrôlée : visible du membre, avec qui l’a validée', as(bob, 'select title from public.knowledge_nodes;').out === 'Autonomie du Vélo X' && as(alice, `select validated_by from public.knowledge_nodes where id = '${k1}';`).out === alice.id);
// un expert ne valide pas une information sensible
const tokExp = as(alice, `select public.create_invitation('${orgA}', 'dan@ailleurs.fr', 'expert');`).out;
as(dan, `select public.accept_invitation('${tokExp}');`);
check('K5 une information sensible ne peut pas être validée par un expert', /accès refusé/.test(as(dan, `select public.set_knowledge_status('${k2}', 'valide');`).err));
check('K6 mais par un manager, oui', as(eve, `select public.set_knowledge_status('${k2}', 'valide');`).ok);
as(alice, `update public.knowledge_nodes set body = 'Batterie 625 Wh, 100 km.' where id = '${k1}';`);
check('K7 modifier le texte d’une connaissance validée la remet « à revalider »', as(alice, `select status || '|' || coalesce(validated_by::text, '-') from public.knowledge_nodes where id = '${k1}';`).out === 'a_revalider|-');
check('K8 l’autre organisation ne voit rien des sources, versions et connaissances', as(carla, 'select (select count(*) from public.sources) + (select count(*) from public.source_versions) + (select count(*) from public.knowledge_nodes);').out === '0');

// ---------- Compétences ----------
const sk = as(alice, `insert into public.skills (org_id, name, created_by) values ('${orgA}', 'Conseiller un vélo électrique', '${alice.id}') returning id;`).out;
check('C1 une compétence se relie à une connaissance de la même organisation', as(alice, `insert into public.skill_knowledge (org_id, skill_id, knowledge_id) values ('${orgA}', '${sk}', '${k1}');`).ok);
const kB = (() => { const s = as(carla, `insert into public.sources (org_id, title, created_by) values ('${orgB}', 'Doc B', '${carla.id}') returning id;`).out; const v = as(carla, `insert into public.source_versions (org_id, source_id, version, uploaded_by) values ('${orgB}', '${s}', 1, '${carla.id}') returning id;`).out; return as(carla, `insert into public.knowledge_nodes (org_id, source_version_id, kind, title, created_by) values ('${orgB}', '${v}', 'concept', 'Secret B', '${carla.id}') returning id;`).out; })();
check('C2 impossible de relier une compétence à une connaissance d’une autre organisation', !as(alice, `insert into public.skill_knowledge (org_id, skill_id, knowledge_id) values ('${orgA}', '${sk}', '${kB}');`).ok);

// ---------- Preuves ----------
check('P1 un utilisateur ne peut pas écrire de preuve lui-même (pas de résultat falsifié)', !as(bob, `insert into public.evidence_events (org_id, user_id, activity, outcome, evaluator) values ('${orgA}', '${bob.id}', 'simulation', 'juste', 'ia');`).ok);
const ev = asService(`insert into public.evidence_events (org_id, user_id, knowledge_id, skill_id, activity, outcome, confidence, source_version_id, evaluator, detail) values ('${orgA}', '${bob.id}', '${k1}', '${sk}', 'simulation', 'faux', 'reflexe', '${ver}', 'ia', '{"extrait":"Il fait 120 km."}') returning id;`);
check('P2 le serveur enregistre une preuve reliée à la connaissance, à la compétence et à la version du document', ev.ok, ev.err);
check('P3 une preuve ne peut pas viser une personne qui n’est pas membre', !asService(`insert into public.evidence_events (org_id, user_id, activity, outcome, evaluator) values ('${orgA}', '${carla.id}', 'diagnostic', 'juste', 'regle');`).ok);
check('P4 une preuve ne peut pas viser une connaissance d’une autre organisation', !asService(`insert into public.evidence_events (org_id, user_id, knowledge_id, activity, outcome, evaluator) values ('${orgA}', '${bob.id}', '${kB}', 'diagnostic', 'juste', 'regle');`).ok);
check('P5 une preuve ne se modifie pas, même par le serveur', /ne se modifie pas/.test(asService(`update public.evidence_events set outcome = 'juste';`).err));
check('P6 une preuve ne se supprime pas sans effacement autorisé', /ne se supprime pas/.test(asService('delete from public.evidence_events;').err));
check('P7 le collaborateur voit ses propres preuves', as(bob, 'select outcome || confidence from public.evidence_events;').out === 'fauxreflexe');
check('P8 le manager et l’administrateur de l’organisation les voient', as(eve, 'select count(*) from public.evidence_events;').out === '1' && as(alice, 'select count(*) from public.evidence_events;').out === '1');
check('P9 un expert ne voit pas les preuves des autres', as(dan, 'select count(*) from public.evidence_events;').out === '0');
check('P10 l’autre organisation ne voit aucune preuve', as(carla, 'select count(*) from public.evidence_events;').out === '0');
const ev2 = asService(`insert into public.evidence_events (org_id, user_id, activity, outcome, evaluator) values ('${orgB}', '${carla.id}', 'diagnostic', 'juste', 'regle') returning id;`);
check('P11 le manager de A ne voit pas les preuves de B, même en filtrant sur B', ev2.ok && as(eve, `select count(*) from public.evidence_events where org_id = '${orgB}';`).out === '0');
check('P12 l’effacement autorisé (RGPD) fonctionne pour le serveur', asService(`set local arbor.erasure = 'on'; delete from public.evidence_events where org_id = '${orgB}';`).ok);

// ---------- Plusieurs contextes : une même personne dans deux organisations ----------
{
  const t = as(carla, `select public.create_invitation('${orgB}', 'dan@ailleurs.fr', 'member');`).out;
  as(dan, `select public.accept_invitation('${t}');`);
  asService(`insert into public.evidence_events (org_id, user_id, activity, outcome, evaluator) values ('${orgB}', '${dan.id}', 'diagnostic', 'partiel', 'regle');`);
  check('X1 une personne membre de deux organisations voit ses deux organisations et ses propres preuves', as(dan, 'select count(distinct org_id) from public.evidence_events;').out === '1' && as(dan, 'select count(*) from public.organizations;').out === '2');
  check('X2 le manager de A ne voit rien de ce que cette personne fait dans B', as(eve, `select count(*) from public.evidence_events where user_id = '${dan.id}';`).out === '0');
  check('X3 la manager de B ne voit rien de A, même pour une personne commune', as(carla, `select count(*) from public.evidence_events where org_id = '${orgA}';`).out === '0' && as(carla, 'select count(*) from public.knowledge_nodes where org_id <> \'' + orgB + '\';').out === '0');
}

// ---------- Membres et audit ----------
check('R1 un membre ne voit que sa propre appartenance', as(bob, 'select count(*) from public.memberships;').out === '1');
check('R2 le dernier administrateur ne peut pas se retirer ses droits', /au moins un administrateur/.test(as(alice, `select public.set_member('${orgA}', '${alice.id}', 'member');`).err));
check('R3 un membre suspendu ne voit plus rien de l’organisation', as(alice, `select public.set_member('${orgA}', '${bob.id}', 'member', 'suspended');`).ok && as(bob, 'select (select count(*) from public.organizations) + (select count(*) from public.knowledge_nodes);').out === '0');
const audit = as(alice, 'select string_agg(action, \',\' order by id) from public.audit_logs;').out;
check('R4 les opérations sensibles sont journalisées', ['organisation.creee', 'invitation.creee', 'invitation.acceptee', 'connaissance.valide', 'membre.modifie'].every((a) => audit.includes(a)), audit);
check('R5 seul l’administrateur lit le journal ; l’autre organisation ne voit pas le journal de A', as(eve, 'select count(*) from public.audit_logs;').out === '0' && !as(carla, 'select action from public.audit_logs;').out.includes('Magasin A') && as(carla, `select count(*) from public.audit_logs where org_id = '${orgA}';`).out === '0');
check('R6 le rôle anonyme n’a accès à aucune table Business', !psql('set role anon; select * from public.organizations;').ok && !psql('set role anon; select * from public.evidence_events;').ok);

// ---------- Étape C : espaces de la personne, e-mail des membres, annulation d'invitation (004) ----------
{
  const again4 = psql(file('supabase/migrations/004_org_space.sql'));
  check('E0 la migration 004 peut être rejouée sans erreur', again4.ok, again4.err.slice(0, 200));
  check('E1 chacun liste ses propres espaces avec son rôle', as(dan, 'select string_agg(name || \':\' || role, \',\' order by name) from public.my_organizations();').out === 'Magasin A:expert,Magasin B:member' && as(carla, 'select count(*) from public.my_organizations();').out === '1');
  check('E2 un anonyme ne peut pas lister d’espaces', !psql('set role anon; select * from public.my_organizations();').ok);
  const tk = as(alice, `select public.create_invitation('${orgA}', 'new@magasin-a.fr', 'member');`).out;
  const newU = U(6, 'new@magasin-a.fr'); psql(`insert into auth.users values ('${newU.id}', '${newU.email}');`);
  as(newU, `select public.accept_invitation('${tk}');`);
  check('E3 l’e-mail du membre vient de son jeton de connexion, et l’administrateur le voit', as(alice, `select email from public.memberships where user_id = '${newU.id}';`).out === 'new@magasin-a.fr');
  check('E4 un membre ne voit pas l’e-mail des autres', as(newU, 'select count(*) from public.memberships;').out === '1');
  const inv = as(alice, `select public.create_invitation('${orgA}', 'oubli@magasin-a.fr', 'member');`);
  const invId = as(alice, "select id from public.invitations where email = 'oubli@magasin-a.fr';").out;
  check('E5 l’empreinte du jeton n’est plus lisible, même par l’administrateur', !as(alice, 'select token_hash from public.invitations;').ok && inv.ok);
  check('E6 un membre ne peut pas annuler une invitation', /accès refusé/.test(as(newU, `select public.revoke_invitation('${invId}');`).err));
  check('E7 l’administrateur annule une invitation non utilisée, c’est journalisé', as(alice, `select public.revoke_invitation('${invId}');`).ok && as(alice, "select count(*) from public.audit_logs where action = 'invitation.annulee';").out === '1');
  check('E8 une invitation déjà utilisée ne s’annule pas', /déjà utilisée/.test(as(alice, `select public.revoke_invitation((select id from public.invitations where email = 'new@magasin-a.fr'));`).err));
}

// ---------- Étape D : documents et versions (005) ----------
{
  check('D0 la migration 005 peut être rejouée sans erreur', psql(file('supabase/migrations/005_documents.sql')).ok);
  const r = as(dan, `select source_id || '|' || version_id || '|' || version || '|' || storage_path from public.add_source('${orgA}', 'Fiche produit Vélo Y', 'sha-1', 4);`);
  const [sid, vid, vn, spath] = r.out.split('|');
  check('D1 un expert ajoute un document : version 1, fichier dans le dossier privé de l’organisation', r.ok && vn === '1' && spath === `${orgA}/${sid}/v1.pdf`, r.err);
  check('D2 un collaborateur ne peut pas ajouter de document', /accès refusé/.test(as(bob, `select * from public.add_source('${orgA}', 'X', 'h');`).err));
  check('D3 une autre organisation ne peut pas ajouter de document chez A', /accès refusé/.test(as(carla, `select * from public.add_source('${orgA}', 'X', 'h');`).err));
  check('D4 une version identique (même empreinte) est refusée', /inchangé/.test(as(dan, `select * from public.add_version('${sid}', 'sha-1');`).err));
  const v2 = as(dan, `select version || '|' || storage_path from public.add_version('${sid}', 'sha-2', 5);`).out;
  check('D5 une nouvelle version prend le numéro suivant et met à jour le document', v2 === `2|${orgA}/${sid}/v2.pdf` && as(dan, `select current_version from public.sources where id = '${sid}';`).out === '2', v2);
  check('D6 la manager de B ne peut pas ajouter de version à un document de A', /accès refusé/.test(as(carla, `select * from public.add_version('${sid}', 'sha-3');`).err));
  check('D7 l’ajout de document et de version est journalisé', as(alice, "select count(*) from public.audit_logs where action in ('document.ajoute', 'document.version');").out === '2');
  check('D8 le journal des appels accepte la tâche « extraire »', psql(`insert into public.ai_calls (user_id, mode, model) values ('${bob.id}', 'extraire', 'm');`).ok);
  check('D9 une connaissance extraite se rattache à la version, en « proposée »', as(dan, `insert into public.knowledge_nodes (org_id, source_version_id, kind, title, body, quote, page, confidence, created_by) values ('${orgA}', '${vid}', 'produit', 'Autonomie', 'Le vélo Y roule 90 km.', 'roule 90 km', 2, 0.7, '${dan.id}') returning status;`).out === 'propose');
}

// ---------- Étapes E-G : diagnostic et Client Mystère (006) ----------
{
  check('M0 la migration 006 peut être rejouée sans erreur', psql(file('supabase/migrations/006_diagnostic_scenarios.sql')).ok);
  const kk = as(alice, `select id from public.knowledge_nodes where org_id = '${orgA}' limit 1;`).out;
  const ins = asService(`insert into public.diagnostic_items (org_id, user_id, session_id, knowledge_id, question, options, correct) values ('${orgA}', '${bob.id}', gen_random_uuid(), '${kk}', 'Q ?', '["a","b","c"]', 1) returning id;`);
  check('M1 le serveur enregistre une question de diagnostic', ins.ok, ins.err);
  check('M2 la bonne réponse d’un diagnostic n’est lisible par personne depuis le navigateur (même la personne interrogée)', !as(bob, 'select correct from public.diagnostic_items;').ok && !as(alice, 'select * from public.diagnostic_items;').ok);
  check('M3 un utilisateur ne peut pas écrire une question ou une réponse', !as(bob, `insert into public.diagnostic_items (org_id, user_id, session_id, knowledge_id, question, options, correct) values ('${orgA}', '${bob.id}', gen_random_uuid(), '${kk}', 'Q', '[]', 0);`).ok);
  const sc = asService(`insert into public.scenario_sessions (org_id, user_id, spec, state, debrief) values ('${orgA}', '${bob.id}', '{"secret":"besoin caché"}', '{}', '{"score":3}') returning id;`);
  check('M4 le serveur enregistre une partie de Client Mystère', sc.ok, sc.err);
  check('M5 la personne voit sa partie et son débrief, mais pas la fiche secrète du client', as(bob, 'select count(*) from public.scenario_sessions;').out === '1' && !as(bob, 'select spec from public.scenario_sessions;').ok && as(bob, "select debrief->>'score' from public.scenario_sessions;").out === '3');
  check('M6 la manager de l’organisation voit la partie ; l’expert et l’autre organisation non', as(eve, 'select count(*) from public.scenario_sessions;').out === '1' && as(dan, 'select count(*) from public.scenario_sessions;').out === '0' && as(carla, 'select count(*) from public.scenario_sessions;').out === '0');
  check('M7 personne ne modifie une partie depuis le navigateur', !as(bob, "update public.scenario_sessions set status = 'termine';").ok);
  check('M8 une partie ne peut pas viser une personne extérieure à l’organisation', !asService(`insert into public.scenario_sessions (org_id, user_id, spec, state) values ('${orgA}', '${carla.id}', '{}', '{}');`).ok);
  check('M9 le journal des appels accepte les nouvelles tâches', psql(`insert into public.ai_calls (user_id, mode, model) values ('${dan.id}', 'mystere', 'm'), ('${dan.id}', 'diagnostic', 'm'), ('${dan.id}', 'competences', 'm');`).ok);
}

// ---------- Onboarding, espaces, équipes, invitations v2 (007), appliquée sur une base déjà en service ----------
{
  const m7 = psql(file('supabase/migrations/007_onboarding_workspaces.sql'));
  check('W0 la migration 007 s’applique sur la base existante', m7.ok, m7.err.slice(0, 300));
  check('W0b la migration 007 peut être rejouée sans erreur', psql(file('supabase/migrations/007_onboarding_workspaces.sql')).ok);
  // Profil : chacun le sien
  check('W1 chacun crée et lit son profil', as(bob, `insert into public.profiles (user_id, display_name, onboarding) values ('${bob.id}', 'Bob', '{"workspace":"business"}');`).ok && as(bob, 'select display_name from public.profiles;').out === 'Bob');
  check('W2 personne ne lit ni n’écrit le profil d’un autre', as(alice, 'select count(*) from public.profiles;').out === '0' && !as(alice, `insert into public.profiles (user_id) values ('${bob.id}');`).ok && as(alice, `update public.profiles set display_name = 'X' where user_id = '${bob.id}' returning 1;`).out === '');
  check('W3 un anonyme n’a pas accès aux profils', !psql('set role anon; select * from public.profiles;').ok);
  check('W4 le profil ne peut pas devenir un fourre-tout', !as(bob, `update public.profiles set onboarding = (select jsonb_object_agg(g::text, repeat('x', 100)) from generate_series(1, 80) g);`).ok);
  // Organisation : informations, propriétaire
  const orgC = as(dan, "select public.create_organization('Restaurant C', 'Hôtellerie et restauration', '11-50', 'France', 'fr');").out;
  check('W5 création avec taille, pays et langue', /^[0-9a-f-]{36}$/.test(orgC) && as(dan, `select size || '|' || country || '|' || language from public.organizations where id = '${orgC}';`).out === '11-50|France|fr');
  check('W6 l’ancienne création à deux informations marche toujours', /^[0-9a-f-]{36}$/.test(as(dan, "select public.create_organization('Atelier D', 'Industrie');").out));
  check('W7 l’administrateur enregistre objectifs et progression de l’assistant (fusionnée)', as(dan, `select public.update_organization('${orgC}', p_goals => array['procedures','vente'], p_setup => '{"step":2}');`).ok && as(dan, `select public.update_organization('${orgC}', p_setup => '{"units":true}');`).ok && as(dan, `select (setup->>'step') || (setup->>'units') || cardinality(goals) from public.organizations where id = '${orgC}';`).out === '2true2');
  check('W8 un non-administrateur ne modifie pas l’organisation', /accès refusé/.test(as(alice, `select public.update_organization('${orgC}', p_name => 'Pirate');`).err) && /accès refusé/.test(as(bob, `select public.update_organization('${orgA}', p_name => 'Pirate');`).err));
  check('W9 mes espaces indiquent le propriétaire', as(dan, `select owner from public.my_organizations() where id = '${orgC}';`).out === 't' && as(alice, `select owner from public.my_organizations() where id = '${orgA}';`).out === 't');
  // Équipes
  const shop = as(dan, `select public.save_unit('${orgC}', 'etablissement', 'Lyon Bellecour');`).out;
  const team = as(dan, `select public.save_unit('${orgC}', 'equipe', 'Salle', p_parent => '${shop}');`).out;
  check('W10 l’administrateur crée établissements et équipes', /^[0-9a-f-]{36}$/.test(shop) && /^[0-9a-f-]{36}$/.test(team));
  check('W11 deux équipes ne portent pas le même nom', /existe déjà/.test(as(dan, `select public.save_unit('${orgC}', 'equipe', 'Salle');`).err));
  check('W12 une autre organisation ne voit pas ces équipes et ne peut pas en créer', as(alice, 'select count(*) from public.org_units;').out === '0' && /accès refusé/.test(as(alice, `select public.save_unit('${orgC}', 'equipe', 'Pirates');`).err));
  check('W13 une équipe ne peut pas avoir pour parent une équipe d’une autre organisation', !as(alice, `select public.save_unit('${orgA}', 'equipe', 'Croisée', p_parent => '${shop}');`).ok);
  // Invitations v2
  const tw = as(dan, `select public.create_invitation('${orgC}', 'Carla@Magasin-B.fr', 'member', '${team}');`).out;
  check('W14 invitation rattachée à une équipe', tw.length === 48);
  check('W15 aperçu avant connexion : organisation, rôle, équipe, adresse masquée, statut', psql(`set role anon; select org_name || '|' || role || '|' || unit || '|' || email_hint || '|' || status from public.invitation_preview('${tw}');`).out === 'Restaurant C|member|Salle|ca•••@magasin-b.fr|valide');
  check('W16 un faux jeton ne révèle rien', psql("set role anon; select count(*) from public.invitation_preview('" + 'f'.repeat(48) + "');").out === '0');
  check('W17 l’invitation acceptée place la personne dans son équipe', as(carla, `select public.accept_invitation('${tw}');`).out === orgC && as(carla, `select unit from public.my_organizations() where id = '${orgC}';`).out === 'Salle');
  check('W18 rouvrir le même lien quand on est déjà membre ramène à l’organisation', as(carla, `select public.accept_invitation('${tw}');`).out === orgC);
  check('W19 le lien déjà utilisé est refusé à une autre personne, et l’aperçu dit « utilisée »', /déjà utilisée/.test(as(dan, `select public.accept_invitation('${tw}');`).err) && psql(`set role anon; select status from public.invitation_preview('${tw}');`).out === 'utilisee');
  check('W20 on n’invite pas quelqu’un qui est déjà membre', /déjà partie/.test(as(dan, `select public.create_invitation('${orgC}', 'carla@magasin-b.fr');`).err));
  check('W21 on n’invite pas dans une équipe d’une autre organisation', /équipe introuvable/.test(as(alice, `select public.create_invitation('${orgA}', 'x@magasin-a.fr', 'member', '${team}');`).err));
  const t1 = as(dan, `select public.create_invitation('${orgC}', 'serveur@resto.fr');`).out;
  const t2 = as(dan, `select public.create_invitation('${orgC}', 'serveur@resto.fr');`).out;
  check('W22 réinviter la même adresse annule l’invitation précédente', psql(`set role anon; select status from public.invitation_preview('${t1}');`).out === 'annulee' && psql(`set role anon; select status from public.invitation_preview('${t2}');`).out === 'valide');
  const t2id = as(dan, "select id from public.invitations where email = 'serveur@resto.fr' and revoked_at is null;").out;
  check('W23 une invitation annulée reste tracée et son lien dit « annulée »', as(dan, `select public.revoke_invitation('${t2id}');`).ok && psql(`set role anon; select status from public.invitation_preview('${t2}');`).out === 'annulee');
  psql(`insert into auth.users values ('00000000-0000-0000-0000-000000000009', 'serveur@resto.fr');`);
  const srv = U(9, 'serveur@resto.fr');
  check('W24 un lien annulé ne permet pas d’entrer', /annulée/.test(as(srv, `select public.accept_invitation('${t2}');`).err) && as(srv, 'select count(*) from public.my_organizations();').out === '0');
  const t3 = as(dan, `select public.create_invitation('${orgC}', 'serveur@resto.fr');`).out;
  psql(`update public.invitations set expires_at = now() - interval '1 day' where email = 'serveur@resto.fr' and revoked_at is null;`);
  check('W25 un lien expiré est refusé et l’aperçu dit « expirée »', /expirée/.test(as(srv, `select public.accept_invitation('${t3}');`).err) && psql(`set role anon; select status from public.invitation_preview('${t3}');`).out === 'expiree');
  // Rôles et propriétaire
  const tAdm = as(dan, `select public.create_invitation('${orgC}', 'eve@magasin-a.fr', 'admin');`).out;
  as(eve, `select public.accept_invitation('${tAdm}');`);
  check('W26 un administrateur ne peut pas rétrograder ni suspendre le propriétaire', /propriétaire/.test(as(eve, `select public.set_member('${orgC}', '${dan.id}', 'member');`).err) && /propriétaire/.test(as(eve, `select public.set_member('${orgC}', '${dan.id}', 'admin', 'suspended');`).err));
  check('W27 un collaborateur ne change pas son propre rôle', /accès refusé/.test(as(carla, `select public.set_member('${orgC}', '${carla.id}', 'admin');`).err) && as(carla, `select role from public.memberships where org_id = '${orgC}' and user_id = '${carla.id}';`).out === 'member');
  check('W28 un collaborateur ne s’affecte pas lui-même à une équipe', /accès refusé/.test(as(carla, `select public.set_member_unit('${orgC}', '${carla.id}', '${shop}');`).err));
  check('W29 l’administrateur change l’équipe d’un membre', as(eve, `select public.set_member_unit('${orgC}', '${carla.id}', '${shop}');`).ok && as(carla, `select unit from public.my_organizations() where id = '${orgC}';`).out === 'Lyon Bellecour');
  // Parcours collaborateur
  check('W30 le parcours collaborateur est marqué une fois, pour soi seulement', as(carla, `select public.mark_onboarded('${orgC}');`).ok && as(carla, `select onboarded from public.my_organizations() where id = '${orgC}';`).out === 't' && /accès refusé/.test(as(carla, `select public.mark_onboarded('${orgA}');`).err));
  // Compétences
  const skC = as(dan, `insert into public.skills (org_id, name, created_by, importance) values ('${orgC}', 'Accueil client', '${dan.id}', 3) returning id;`).out;
  check('W31 compétence avec importance, rattachée à une équipe', /^[0-9a-f-]{36}$/.test(skC) && as(dan, `insert into public.skill_units (org_id, skill_id, unit_id) values ('${orgC}', '${skC}', '${team}');`).ok);
  check('W32 une compétence ne se rattache pas à l’équipe d’une autre organisation', !as(alice, `insert into public.skill_units (org_id, skill_id, unit_id) values ('${orgA}', '${sk}', '${team}');`).ok);
  check('W33 le manager modifie l’importance ; le collaborateur non', as(dan, `update public.skills set importance = 1 where id = '${skC}' returning importance;`).out === '1' && as(carla, `update public.skills set importance = 3 where id = '${skC}' returning 1;`).out === '');
  check('W34 le collaborateur voit les compétences de son organisation et leurs équipes', as(carla, 'select count(*) from public.skill_units;').out === '1');
  check('W35 le collaborateur ne supprime pas une compétence ; l’administrateur oui', as(carla, `delete from public.skills where id = '${skC}' returning 1;`).out === '' && as(dan, `delete from public.skills where id = '${skC}' returning 1;`).out === '1');
  check('W36 tout est journalisé (organisation, équipes, invitations, membres)', Number(as(dan, `select count(*) from public.audit_logs where org_id = '${orgC}' and action in ('organisation.modifiee', 'unite.enregistree', 'invitation.creee', 'invitation.annulee', 'membre.equipe');`).out) >= 7);
  check('W37 les anciens scénarios tiennent : l’autre organisation ne voit toujours rien', as(carla, `select count(*) from public.organizations where id = '${orgA}';`).out === '0' && as(eve, `select count(*) from public.memberships where org_id = '${orgB}';`).out === '0');
}

// ---------- Les cinq moteurs (008), appliquée sur la base existante ----------
{
  const m8 = psql(file('supabase/migrations/008_engines.sql'));
  check('Y0 la migration 008 s’applique sur la base existante', m8.ok, m8.err.slice(0, 300));
  check('Y0b la migration 008 peut être rejouée sans erreur', psql(file('supabase/migrations/008_engines.sql')).ok);
  const orgC = as(dan, "select id from public.organizations where name = 'Restaurant C';").out;
  const srcC = as(dan, `insert into public.sources (org_id, title, created_by) values ('${orgC}', 'Procédure hygiène', '${dan.id}') returning id;`).out;
  const v1 = as(dan, `insert into public.source_versions (org_id, source_id, version, storage_path, checksum, uploaded_by) values ('${orgC}', '${srcC}', 1, '${orgC}/${srcC}/v1.pdf', 'h1', '${dan.id}') returning id;`).out;
  const v2 = as(dan, `insert into public.source_versions (org_id, source_id, version, storage_path, checksum, uploaded_by) values ('${orgC}', '${srcC}', 2, '${orgC}/${srcC}/v2.pdf', 'h2', '${dan.id}') returning id;`).out;
  check('Y1 un chemin de fichier autre que celui prévu pour la version est refusé', /path_exact|violates check/.test(as(dan, `insert into public.source_versions (org_id, source_id, version, storage_path, checksum, uploaded_by) values ('${orgC}', '${srcC}', 3, '${orgC}/autre/piege.pdf', 'h3', '${dan.id}');`).err));
  const kIns = (title, kind = 'regle') => as(dan, `insert into public.knowledge_nodes (org_id, source_version_id, kind, title, body, quote, page, created_by) values ('${orgC}', '${v1}', '${kind}', '${title}', '${title} : corps', '${title} extrait', 1, '${dan.id}') returning id;`).out;
  const k1 = kIns('Laver les mains'), k2 = kIns('Température frigo'), k3 = kIns('Allergènes', 'sensible');
  const kErr = kIns('Confondre DLC et DDM', 'erreur_frequente');
  check('Y2 une erreur fréquente est un type de connaissance', /^[0-9a-f-]{36}$/.test(kErr));
  [k1, k2, k3].forEach((k) => as(dan, `select public.set_knowledge_status('${k}', 'valide');`));
  // Preuves
  const ev = (u, k, outcome, extra = '') => asService(`insert into public.evidence_events (org_id, user_id, knowledge_id, activity, outcome, evaluator${extra ? ', level, reliability, context' : ''}) values ('${orgC}', '${u.id}', '${k}', 'simulation', '${outcome}', 'ia'${extra}) returning id;`);
  check('Y3 les cinq résultats sont distincts et acceptés, avec niveau, fiabilité et contexte', ['juste', 'partiel', 'faux', 'non_documente', 'insuffisant'].every((o) => ev(carla, k1, o, ", 4, 'moyenne', 'simulation:vente'").ok));
  check('Y4 un résultat inconnu ou un niveau hors échelle est refusé', !ev(carla, k1, 'bof').ok && !asService(`insert into public.evidence_events (org_id, user_id, knowledge_id, activity, outcome, evaluator, level) values ('${orgC}', '${carla.id}', '${k1}', 'simulation', 'juste', 'ia', 8);`).ok);
  check('Y5 une preuve reste immuable', !asService(`update public.evidence_events set outcome = 'juste' where org_id = '${orgC}';`).ok);
  // Graphe
  check('Y6 l’équipe de contenu relie deux connaissances (méthode humaine)', as(dan, `insert into public.knowledge_edges (org_id, from_id, to_id, relation, method, created_by) values ('${orgC}', '${k1}', '${k3}', 'prerequis', 'humain', '${dan.id}');`).ok);
  check('Y7 un client ne peut pas se faire passer pour l’IA, ni relier une connaissance à elle-même', !as(dan, `insert into public.knowledge_edges (org_id, from_id, to_id, relation, method, created_by) values ('${orgC}', '${k1}', '${k2}', 'precise', 'ia', '${dan.id}');`).ok && !as(dan, `insert into public.knowledge_edges (org_id, from_id, to_id, relation, method, created_by) values ('${orgC}', '${k1}', '${k1}', 'precise', 'humain', '${dan.id}');`).ok);
  const kA = as(alice, `select id from public.knowledge_nodes where org_id = '${orgA}' limit 1;`).out;
  check('Y8 impossible de relier une connaissance d’une autre organisation', !as(dan, `insert into public.knowledge_edges (org_id, from_id, to_id, relation, method, created_by) values ('${orgC}', '${k1}', '${kA}', 'prerequis', 'humain', '${dan.id}');`).ok);
  check('Y9 un collaborateur ne crée pas de relation et ne voit pas les relations non validées', !as(carla, `insert into public.knowledge_edges (org_id, from_id, to_id, relation, method, created_by) values ('${orgC}', '${k2}', '${k3}', 'precise', 'humain', '${carla.id}');`).ok && as(carla, 'select count(*) from public.knowledge_edges;').out === '0');
  const edge = as(dan, 'select id from public.knowledge_edges limit 1;').out;
  check('Y10 validée par l’équipe de contenu, la relation devient visible du collaborateur ; il ne peut pas la valider', /accès refusé/.test(as(carla, `select public.set_edge_status('${edge}', 'valide');`).err) && as(dan, `select public.set_edge_status('${edge}', 'valide');`).ok && as(carla, 'select count(*) from public.knowledge_edges;').out === '1');
  // Scénarios
  const sc = asService(`insert into public.scenarios (org_id, title, kind, created_by) values ('${orgC}', 'Client allergique', 'client', '${dan.id}') returning id;`).out;
  const sv1 = asService(`insert into public.scenario_versions (org_id, scenario_id, version, spec, knowledge_ids, created_by) values ('${orgC}', '${sc}', 1, '{"need":"secret","events":[]}', array['${k3}']::uuid[], '${dan.id}') returning id;`).out;
  check('Y11 un brouillon de scénario est invisible du collaborateur', as(carla, 'select count(*) from public.scenarios;').out === '0' && as(carla, 'select count(*) from public.scenario_versions;').out === '0');
  check('Y12 la fiche secrète n’est lisible que par un responsable, par la fonction dédiée', /secret/.test(as(dan, `select public.scenario_spec('${sv1}');`).out) && /accès refusé/.test(as(carla, `select public.scenario_spec('${sv1}');`).err));
  check('Y13 un collaborateur ne publie pas ; un responsable publie', /accès refusé/.test(as(carla, `select public.publish_scenario_version('${sv1}');`).err) && as(dan, `select public.publish_scenario_version('${sv1}');`).ok);
  check('Y14 publié : le collaborateur voit le scénario, jamais la colonne de la fiche', as(carla, 'select count(*) from public.scenario_versions;').out === '1' && !as(carla, 'select spec from public.scenario_versions;').ok);
  const sv2 = asService(`insert into public.scenario_versions (org_id, scenario_id, version, spec, knowledge_ids, created_by) values ('${orgC}', '${sc}', 2, '{"need":"v2"}', array['${k3}']::uuid[], '${dan.id}') returning id;`).out;
  as(dan, `select public.publish_scenario_version('${sv2}');`);
  check('Y15 nouvelle version publiée : l’ancienne devient obsolète, l’historique reste', as(dan, `select string_agg(version || ':' || status, ',' order by version) from public.scenario_versions where scenario_id = '${sc}';`).out === '1:obsolete,2:valide');
  check('Y16 une partie et une preuve référencent la version jouée', asService(`insert into public.scenario_sessions (org_id, user_id, kind, spec, state, scenario_version_id) values ('${orgC}', '${carla.id}', 'scenario', '{}', '{}', '${sv2}');`).ok && asService(`insert into public.evidence_events (org_id, user_id, knowledge_id, activity, outcome, evaluator, scenario_version_id, level, context) values ('${orgC}', '${carla.id}', '${k3}', 'simulation', 'juste', 'ia', '${sv2}', 4, 'scenario:client');`).ok);
  // Watchdog
  const skC = as(dan, `insert into public.skills (org_id, name, created_by) values ('${orgC}', 'Servir en sécurité', '${dan.id}') returning id;`).out;
  as(dan, `insert into public.skill_knowledge (org_id, skill_id, knowledge_id) values ('${orgC}', '${skC}', '${k3}');`);
  const ch = asService(`insert into public.policy_changes (org_id, source_id, from_version_id, to_version_id, created_by) values ('${orgC}', '${srcC}', '${v1}', '${v2}', '${dan.id}') returning id;`).out;
  const itMod = asService(`insert into public.policy_change_items (org_id, change_id, knowledge_id, change, sensitive, new_body, new_quote, new_page, explanation) values ('${orgC}', '${ch}', '${k3}', 'modifie', true, 'Allergènes : 14 désormais', '14 allergènes', 2, 'liste étendue') returning id;`).out;
  const itDel = asService(`insert into public.policy_change_items (org_id, change_id, knowledge_id, change) values ('${orgC}', '${ch}', '${k2}', 'supprime') returning id;`).out;
  const itSame = asService(`insert into public.policy_change_items (org_id, change_id, knowledge_id, change) values ('${orgC}', '${ch}', '${k1}', 'inchange') returning id;`).out;
  check('Y17 les changements ne sont pas lisibles par un collaborateur, ni par une autre organisation', as(carla, 'select count(*) from public.policy_changes;').out === '0' && as(alice, 'select count(*) from public.policy_change_items;').out === '0');
  const imp = as(dan, `select public.policy_change_impact('${ch}');`).out;
  check('Y18 l’impact liste compétences, scénarios publiés et personnes ayant des preuves sur l’ancienne version', /Servir en sécurité/.test(imp) && /Client allergique/.test(imp) && imp.includes(carla.id), imp.slice(0, 200));
  check('Y19 le collaborateur ne peut pas lire l’impact', /accès refusé/.test(as(carla, `select public.policy_change_impact('${ch}');`).err));
  const tExpert = as(dan, "select public.create_invitation((select id from public.organizations where name = 'Restaurant C'), 'expert@resto.fr', 'expert');").out;
  psql(`insert into auth.users values ('00000000-0000-0000-0000-000000000010', 'expert@resto.fr');`);
  const expert = U(10, 'expert@resto.fr').id ? { id: '00000000-0000-0000-0000-000000000010', email: 'expert@resto.fr' } : null;
  as(expert, `select public.accept_invitation('${tExpert}');`);
  check('Y20 un changement sensible ne peut pas être accepté par un expert (manager ou administrateur requis)', /accès refusé/.test(as(expert, `select public.decide_change_item('${itMod}', 'accepte');`).err));
  const newK = as(dan, `select public.decide_change_item('${itMod}', 'accepte');`).out;
  check('Y21 accepté : nouvelle connaissance validée sur la nouvelle version, l’ancienne « remplacée », la compétence suit',
    /^[0-9a-f-]{36}$/.test(newK) && as(dan, `select status || '|' || (source_version_id = '${v2}') || '|' || replaces from public.knowledge_nodes where id = '${newK}';`).out === `valide|true|${k3}` && as(dan, `select status from public.knowledge_nodes where id = '${k3}';`).out === 'remplace' && as(dan, `select count(*) from public.skill_knowledge where knowledge_id = '${newK}';`).out === '1');
  check('Y22 une décision ne se prend qu’une fois', /déjà décidé/.test(as(dan, `select public.decide_change_item('${itMod}', 'rejete');`).err));
  as(expert, `select public.decide_change_item('${itDel}', 'accepte');`); as(expert, `select public.decide_change_item('${itSame}', 'accepte');`);
  check('Y23 suppression acceptée : l’ancienne connaissance est « remplacée » sans successeur ; tout décidé : changement traité',
    as(dan, `select status from public.knowledge_nodes where id = '${k2}';`).out === 'remplace' && as(dan, `select status from public.policy_changes where id = '${ch}';`).out === 'traite');
  check('Y24 les preuves sur l’ancienne version restent intactes', as(dan, `select count(*) from public.evidence_events where knowledge_id = '${k3}';`).out === '1');
  check('Y25 chaque décision est journalisée', Number(as(dan, `select count(*) from public.audit_logs where org_id = '${orgC}' and action like 'changement.%';`).out) === 3);
  // Actions
  const n = as(dan, `select public.assign_learning_actions('${orgC}', array['${carla.id}', '${alice.id}']::uuid[], 'revalidation', 'La procédure allergènes a changé', array['${newK}']::uuid[], null, '${ch}');`).out;
  check('Y26 un responsable assigne une revalidation ; une personne extérieure à l’organisation est ignorée', n === '1');
  check('Y27 le collaborateur voit ses actions, pas celles des autres ; une autre organisation ne voit rien', as(carla, 'select count(*) from public.learning_actions;').out === '1' && as(alice, 'select count(*) from public.learning_actions;').out === '0');
  const act = as(carla, 'select id from public.learning_actions limit 1;').out;
  check('Y28 il marque son action faite, mais ne peut pas l’annuler', as(carla, `select public.set_action_status('${act}', 'fait');`).ok && /accès refusé/.test(as(carla, `select public.set_action_status('${act}', 'annule');`).err));
  check('Y29 un collaborateur ne peut pas assigner d’actions', /accès refusé/.test(as(carla, `select public.assign_learning_actions('${orgC}', array['${carla.id}']::uuid[], 'revoir', 'xxx');`).err));
  // Validation humaine
  check('Y30 un manager valide une compétence au poste : preuve humaine, fiabilité forte, niveau 5', as(dan, `select public.record_human_validation('${orgC}', '${carla.id}', 'juste', 'Observée au service du midi', '${skC}');`).ok
    && as(carla, "select evaluator || '|' || reliability || '|' || level from public.evidence_events where activity = 'validation_humaine';").out === 'humain|forte|5');
  check('Y31 on ne valide pas ses propres compétences ; un collaborateur ne valide personne', /propres/.test(as(dan, `select public.record_human_validation('${orgC}', '${dan.id}', 'juste', 'x', '${skC}');`).err) && /accès refusé/.test(as(carla, `select public.record_human_validation('${orgC}', '${dan.id}', 'juste', 'x', '${skC}');`).err));
  // Données personnelles
  const exp = as(carla, `select public.export_my_org_data('${orgC}');`).out;
  check('Y32 export : mes preuves, mes simulations, mes actions, et rien des autres', /Restaurant C/.test(exp) && /validation_humaine/.test(exp) && !exp.includes(dan.id.slice(-6) + '","user') && JSON.parse(exp).evidence.length >= 6);
  check('Y33 export refusé hors de l’organisation', /accès refusé/.test(as(alice, `select public.export_my_org_data('${orgC}');`).err));
  asService(`insert into public.evidence_events (org_id, user_id, knowledge_id, activity, outcome, evaluator) values ('${orgC}', '${eve.id}', '${k1}', 'diagnostic', 'juste', 'regle');`);
  const er = as(carla, `select public.erase_my_org_data('${orgC}');`);
  check('Y34 effacement : mes preuves et simulations disparaissent, celles des autres restent, c’est journalisé sans contenu',
    er.ok && as(dan, `select count(*) from public.evidence_events where org_id = '${orgC}' and user_id = '${carla.id}';`).out === '0' && as(dan, `select count(*) from public.evidence_events where org_id = '${orgC}' and user_id = '${eve.id}';`).out === '1' && as(dan, "select count(*) from public.audit_logs where action = 'donnees.effacees';").out === '1', er.err);
  check('Y35 hors de cette fonction, une preuve ne se supprime toujours pas', !as(dan, `delete from public.evidence_events where org_id = '${orgC}';`).ok || as(dan, `select count(*) from public.evidence_events where org_id = '${orgC}';`).out === '1');
  check('Y36 la durée de conservation se règle par un administrateur seulement', as(dan, `select public.set_retention('${orgC}', 90);`).ok && /accès refusé/.test(as(carla, `select public.set_retention('${orgC}', 30);`).err) && !as(dan, `select public.set_retention('${orgC}', 5);`).ok);
  asService(`insert into public.scenario_sessions (org_id, user_id, spec, state, transcript, created_at) values ('${orgC}', '${eve.id}', '{}', '{}', '[{"role":"client","text":"vieux"}]', now() - interval '200 days'), ('${orgC}', '${eve.id}', '{}', '{}', '[{"role":"client","text":"récent"}]', now());`);
  check('Y37 la purge vide les transcriptions trop anciennes seulement (débrief et preuves restent) ; réservée au serveur',
    asService('select public.purge_expired_transcripts();').out === '1' && asService(`select count(*) from public.scenario_sessions where org_id = '${orgC}' and transcript::text like '%récent%';`).out === '1' && !as(dan, 'select public.purge_expired_transcripts();').ok);
  check('Y38 le journal des appels accepte les nouvelles tâches', psql(`insert into public.ai_calls (user_id, mode, model) values ('${dan.id}', 'relations', 'm'), ('${dan.id}', 'scenario', 'm'), ('${dan.id}', 'comparer', 'm'), ('${dan.id}', 'situation', 'm'), ('${dan.id}', 'invitation', 'm'), ('${dan.id}', 'structurer', 'm');`).ok);
  check('Y39 le suivi des envois d’invitation est lisible par un responsable', as(dan, 'select count(sent_at) + sum(send_count) from public.invitations;').ok);
}

// ---------- Tables du tuteur (001, 002) toujours protégées ----------
check('T1 le journal des appels accepte les nouvelles tâches de génération', psql(`insert into public.ai_calls (user_id, mode, model) values ('${bob.id}', 'enrichir', 'm');`).ok);
check('T2 un utilisateur ne lit pas les compteurs des autres', as(carla, 'select count(*) from public.ai_calls;').out === '0' && as(bob, 'select count(*) from public.ai_calls;').out === '2');

stop();
fs.rmSync(dir, { recursive: true, force: true });
console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
process.exit(failed ? 1 : 0);
