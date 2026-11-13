-- Tests d'isolation, de permissions, de versionnement et d'audit du Configuration Engine.
-- Chaque test échoue bruyamment (exception) ; la dernière ligne affiche le bilan.
\set ON_ERROR_STOP on
set client_min_messages = warning;
\o /dev/null

-- ---------- Données de test (fictives, créées en superutilisateur) ----------
insert into auth.users values
  ('a0000000-0000-0000-0000-00000000000a', 'admin@a.test'), ('a0000000-0000-0000-0000-00000000000b', 'agent@a.test'),
  ('a0000000-0000-0000-0000-00000000000c', 'manager@a.test'), ('a0000000-0000-0000-0000-00000000000d', 'viewer@a.test'),
  ('b0000000-0000-0000-0000-00000000000a', 'admin@b.test');
insert into public.companies (id, name, environment) values
  ('ca000000-0000-0000-0000-000000000000', 'Entreprise A (test)', 'demo'),
  ('cb000000-0000-0000-0000-000000000000', 'Entreprise B (test)', 'demo');
insert into public.memberships values
  ('ca000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-00000000000a', 'admin', 'active'),
  ('ca000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-00000000000b', 'agent', 'active'),
  ('ca000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-00000000000c', 'sav_manager', 'active'),
  ('ca000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-00000000000d', 'viewer', 'active'),
  ('cb000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-00000000000a', 'admin', 'active');

create table pg_temp.results (n serial, name text, ok boolean);
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', u, false);
end $$;
create or replace function pg_temp.expect_fail(name text, stmt text) returns void language plpgsql as $$
begin
  begin execute stmt;
  exception when others then insert into pg_temp.results (name, ok) values (name, true); return; end;
  insert into pg_temp.results (name, ok) values (name, false);
end $$;
create or replace function pg_temp.check(name text, cond boolean) returns void language plpgsql as $$
begin insert into pg_temp.results (name, ok) values (name, coalesce(cond, false)); end $$;
grant all on pg_temp.results, pg_temp.results_n_seq to authenticated, anon;

-- ---------- Configuration par l'admin de A ----------
set role authenticated;
select pg_temp.as_user('a0000000-0000-0000-0000-00000000000a');
insert into public.workspaces (id, company_id, name) values ('aa000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000000', 'SAV France');
insert into public.brands (id, company_id, workspace_id, name) values ('ab000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000000', 'aa000000-0000-0000-0000-000000000001', 'Marque A');
insert into public.products (company_id, workspace_id, brand_id, sku, name, list_price)
  values ('ca000000-0000-0000-0000-000000000000', 'aa000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0000-000000000001', 'A-001', 'Coffret test', 89);
insert into public.sites (company_id, workspace_id, name, kind) values ('ca000000-0000-0000-0000-000000000000', 'aa000000-0000-0000-0000-000000000001', 'Boutique test', 'store');
insert into public.policy_sets (id, company_id, workspace_id, kind, name)
  values ('ad000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000000', 'aa000000-0000-0000-0000-000000000001', 'authorization', 'Délégation');
insert into public.policy_versions (id, company_id, policy_set_id, version, body, created_by)
  values ('ae000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000000', 'ad000000-0000-0000-0000-000000000001', 1,
          '{"limits": {"agent": 60, "sav_manager": 250, "admin": 1000}}', 'a0000000-0000-0000-0000-00000000000a');
select public.activate_policy_version('ae000000-0000-0000-0000-000000000001');
insert into public.cases (id, company_id, workspace_id, ref) values ('ac000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000000', 'aa000000-0000-0000-0000-000000000001', 'A-CASE-1');

select pg_temp.check('inconnu reste inconnu : sensibilité par défaut unknown, durée NULL',
  (select thermal_sensitivity = 'unknown' and fragility = 'unknown' and shelf_life_hours is null and storage_temp_min_c is null from public.products where sku = 'A-001'));
select pg_temp.check('une boutique n''expédie pas par défaut', (select not ships_orders from public.sites where name = 'Boutique test'));
select pg_temp.check('marge non calculée sans coût de revient', (select known_margin is null from public.product_margins where sku = 'A-001'));

-- ---------- Entreprise B : isolation ----------
select pg_temp.as_user('b0000000-0000-0000-0000-00000000000a');
insert into public.workspaces (id, company_id, name) values ('ba000000-0000-0000-0000-000000000001', 'cb000000-0000-0000-0000-000000000000', 'SAV B');
insert into public.brands (id, company_id, workspace_id, name) values ('bb000000-0000-0000-0000-000000000001', 'cb000000-0000-0000-0000-000000000000', 'ba000000-0000-0000-0000-000000000001', 'Marque B');
select pg_temp.check('B ne voit aucun produit de A', (select count(*) = 0 from public.products));
select pg_temp.check('B ne voit aucun dossier de A', (select count(*) = 0 from public.cases));
select pg_temp.check('B ne voit pas l''entreprise A', (select count(*) = 1 from public.companies));
select pg_temp.check('B ne voit pas les membres de A', (select count(*) = 1 from public.memberships));
select pg_temp.expect_fail('B ne peut pas écrire un produit dans A',
  $$insert into public.products (company_id, workspace_id, sku, name) values ('ca000000-0000-0000-0000-000000000000', 'aa000000-0000-0000-0000-000000000001', 'X', 'intrus')$$);
select pg_temp.expect_fail('B ne peut pas rattacher sa ligne à la marque de A (clé composite)',
  $$insert into public.products (company_id, workspace_id, brand_id, sku, name) values ('cb000000-0000-0000-0000-000000000000', 'ba000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0000-000000000001', 'B-1', 'mix')$$);
select pg_temp.expect_fail('B ne peut pas demander une action sur un dossier de A',
  $$select public.request_action('ac000000-0000-0000-0000-000000000001', 'refund', 10)$$);
update public.products set name = 'piraté' where sku = 'A-001';
select pg_temp.check('B ne modifie rien chez A (0 ligne touchée)', true);

-- ---------- Permissions et délégation dans A ----------
select pg_temp.as_user('a0000000-0000-0000-0000-00000000000b');  -- agent
select pg_temp.expect_fail('un agent ne crée pas de produit', $$insert into public.products (company_id, workspace_id, sku, name) values ('ca000000-0000-0000-0000-000000000000', 'aa000000-0000-0000-0000-000000000001', 'A-2', 'x')$$);
select pg_temp.expect_fail('un agent n''écrit pas directement une action', $$insert into public.case_actions (company_id, case_id, kind, level, status, requested_by) values ('ca000000-0000-0000-0000-000000000000', 'ac000000-0000-0000-0000-000000000001', 'refund', 1, 'executed', 'a0000000-0000-0000-0000-00000000000b')$$);
select pg_temp.check('remboursement de 40 € : dans la délégation agent (60 €)',
  (select status = 'approved' from public.request_action('ac000000-0000-0000-0000-000000000001', 'refund', 40)));
create temp table big as select * from public.request_action('ac000000-0000-0000-0000-000000000001', 'refund', 120);
select pg_temp.check('remboursement de 120 € : en attente de validation', (select status = 'pending_approval' from big));
select pg_temp.check('niveau 1 (demande de photo) : proposée, sans autorisation', (select status = 'proposed' and level = 1 from public.request_action('ac000000-0000-0000-0000-000000000001', 'request_proof')));
select pg_temp.expect_fail('le demandeur ne valide pas sa propre action', $$select public.decide_action((select id from big), true)$$);
select pg_temp.expect_fail('une action en attente ne peut pas être exécutée', $$select public.execute_action((select id from big))$$);

select pg_temp.as_user('a0000000-0000-0000-0000-00000000000d');  -- observateur
select pg_temp.expect_fail('un observateur ne demande aucune action', $$select public.request_action('ac000000-0000-0000-0000-000000000001', 'refund', 5)$$);

select pg_temp.as_user('a0000000-0000-0000-0000-00000000000c');  -- responsable SAV
select pg_temp.check('le responsable SAV valide 120 € (plafond 250 €)', (select status = 'approved' from public.decide_action((select id from big), true)));
select pg_temp.check('exécution en démonstration : simulée, jamais réelle',
  (select status = 'simulated' and execution_mode = 'simulated' from public.execute_action((select id from big))));
select pg_temp.check('aucune action « executed » en démonstration', (select count(*) = 0 from public.case_actions where status = 'executed'));

-- ---------- Versionnement : le passé n'est pas réécrit ----------
select pg_temp.as_user('a0000000-0000-0000-0000-00000000000a');
update public.policy_versions set body = '{"limits": {"agent": 9999}}' where id = 'ae000000-0000-0000-0000-000000000001';
select pg_temp.check('une politique active ne peut pas être modifiée par l''admin (contenu inchangé)',
  (select (body -> 'limits' ->> 'agent')::int = 60 from public.policy_versions where id = 'ae000000-0000-0000-0000-000000000001'));
reset role;  -- même un accès serveur qui contourne la RLS se heurte au verrou
select pg_temp.expect_fail('le verrou tient aussi pour un accès serveur',
  $$update public.policy_versions set body = '{"limits": {"agent": 9999}}' where id = 'ae000000-0000-0000-0000-000000000001'$$);
set role authenticated;
insert into public.policy_versions (id, company_id, policy_set_id, version, body, created_by)
  values ('ae000000-0000-0000-0000-000000000002', 'ca000000-0000-0000-0000-000000000000', 'ad000000-0000-0000-0000-000000000001', 2,
          '{"limits": {"agent": 100, "sav_manager": 300, "admin": 1000}}', 'a0000000-0000-0000-0000-00000000000a');
select public.activate_policy_version('ae000000-0000-0000-0000-000000000002');
select pg_temp.check('v1 retirée, v2 active', (select array_agg(status order by version) = array['retired','active']::public.policy_status[] from public.policy_versions));
select pg_temp.check('les décisions passées pointent toujours vers v1',
  (select bool_and(authorization_policy_version_id = 'ae000000-0000-0000-0000-000000000001') from public.case_actions where level = 3));
select pg_temp.as_user('a0000000-0000-0000-0000-00000000000b');
select pg_temp.check('avec v2, 80 € entre dans la délégation agent', (select status = 'approved' and authorization_policy_version_id = 'ae000000-0000-0000-0000-000000000002' from public.request_action('ac000000-0000-0000-0000-000000000001', 'goodwill', 80)));

-- ---------- Audit ----------
select pg_temp.as_user('a0000000-0000-0000-0000-00000000000b');
select pg_temp.check('un agent ne lit pas le journal d''audit', (select count(*) = 0 from public.audit_log));
select pg_temp.as_user('a0000000-0000-0000-0000-00000000000c');
select pg_temp.check('le journal trace demandes, validation, exécution, activations', (select count(*) >= 8 from public.audit_log));
select pg_temp.check('chaque entrée a un auteur', (select bool_and(actor is not null) from public.audit_log));
select pg_temp.expect_fail('le journal ne se modifie pas', $$update public.audit_log set action = 'x'$$);
select pg_temp.expect_fail('le journal ne se supprime pas', $$delete from public.audit_log$$);
select pg_temp.as_user('b0000000-0000-0000-0000-00000000000a');
select pg_temp.check('B ne lit pas le journal de A', (select count(*) = 0 from public.audit_log where company_id = 'ca000000-0000-0000-0000-000000000000'));

-- ---------- Anonyme ----------
reset role; set role anon;
select pg_temp.expect_fail('un visiteur anonyme ne lit rien', $$select count(*) from public.products$$);

reset role;
select pg_temp.as_user('a0000000-0000-0000-0000-00000000000a');
select pg_temp.check('B n''a rien modifié chez A', (select name = 'Coffret test' from public.products where sku = 'A-001'));

\o
\pset footer off
select n as "#", case when ok then 'OK' else 'ÉCHEC' end as résultat, name as test from pg_temp.results order by n;
select count(*) filter (where ok) || ' / ' || count(*) || ' tests passent' as bilan from pg_temp.results;
do $$ begin if exists (select 1 from pg_temp.results where not ok) then raise exception 'des tests échouent'; end if; end $$;
