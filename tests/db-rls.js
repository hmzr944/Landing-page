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
for (const f of ['tests/db/supabase-stub.sql', 'supabase/migrations/001_tutor.sql', 'supabase/migrations/002_generation.sql', 'supabase/migrations/003_organizations.sql', 'supabase/migrations/004_org_space.sql']) {
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

// ---------- Tables du tuteur (001, 002) toujours protégées ----------
check('T1 le journal des appels accepte les nouvelles tâches de génération', psql(`insert into public.ai_calls (user_id, mode, model) values ('${bob.id}', 'enrichir', 'm');`).ok);
check('T2 un utilisateur ne lit pas les compteurs des autres', as(carla, 'select count(*) from public.ai_calls;').out === '0' && as(bob, 'select count(*) from public.ai_calls;').out === '1');

stop();
fs.rmSync(dir, { recursive: true, force: true });
console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
process.exit(failed ? 1 : 0);
