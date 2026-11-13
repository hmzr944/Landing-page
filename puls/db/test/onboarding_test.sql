-- Tests de la migration 002 : création d'entreprise, membres, configuration de démonstration.
\set ON_ERROR_STOP on
set client_min_messages = warning;
\o /dev/null
insert into auth.users values ('f0000000-0000-0000-0000-000000000001', 'fondatrice@c.test'), ('f0000000-0000-0000-0000-000000000002', 'conseiller@c.test'),
  ('f0000000-0000-0000-0000-000000000003', 'externe@d.test');
create table pg_temp.r (n serial, name text, ok boolean);
grant all on pg_temp.r, pg_temp.r_n_seq to authenticated, anon;
create function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;
create function pg_temp.check(name text, cond boolean) returns void language sql as $$ insert into pg_temp.r (name, ok) values (name, coalesce(cond, false)) $$;
create function pg_temp.expect_fail(name text, stmt text) returns void language plpgsql as $$
begin begin execute stmt; exception when others then insert into pg_temp.r (name, ok) values (name, true); return; end;
insert into pg_temp.r (name, ok) values (name, false); end $$;

set role authenticated;
select pg_temp.as_user('');
select pg_temp.expect_fail('créer une entreprise exige d''être connecté', $$select public.create_company('Anonyme')$$);
select pg_temp.as_user('f0000000-0000-0000-0000-000000000001');
create temp table co as select public.create_company('Maison C (test)') as id;
select pg_temp.check('la créatrice devient administratrice', (select role = 'admin' from public.memberships where company_id = (select id from co)));
select pg_temp.check('nouvelle entreprise en démonstration', (select environment = 'demo' from public.companies where id = (select id from co)));
select pg_temp.check('un workspace Principal est créé', (select count(*) = 1 from public.workspaces where company_id = (select id from co)));
select pg_temp.expect_fail('écriture directe d''une entreprise interdite', $$insert into public.companies (name) values ('Directe')$$);
select pg_temp.expect_fail('écriture directe d''une appartenance interdite', $$insert into public.memberships (company_id, user_id, role) values ((select id from co), 'f0000000-0000-0000-0000-000000000003', 'admin')$$);

select public.seed_demo_configuration((select id from co));
select pg_temp.check('démo : 7 produits', (select count(*) = 7 from public.products));
select pg_temp.check('démo : coût de revient inconnu, donc aucune marge', (select bool_and(known_margin is null) from public.product_margins));
select pg_temp.check('démo : la boutique n''expédie pas', (select not ships_orders from public.sites where kind = 'store'));
select pg_temp.check('démo : 5 politiques actives', (select count(*) = 5 from public.policy_versions where status = 'active'));
select pg_temp.check('démo : stocks avec source déclarée', (select bool_and(source = 'manual') and count(*) > 0 from public.stock_levels));
select pg_temp.expect_fail('démo : une seule fois', $$select public.seed_demo_configuration((select id from co))$$);

select pg_temp.expect_fail('ajout d''un e-mail sans compte refusé', $$select public.add_member((select id from co), 'personne@nulle.part', 'agent')$$);
select public.add_member((select id from co), 'Conseiller@C.test', 'agent');
select pg_temp.check('membre ajouté avec son rôle (e-mail insensible à la casse)', (select role = 'agent' from public.memberships where user_id = 'f0000000-0000-0000-0000-000000000002'));
select pg_temp.check('liste des membres avec e-mail', (select count(*) = 2 from public.list_members((select id from co))));
select pg_temp.expect_fail('on ne retire pas le dernier administrateur', $$select public.set_member_role((select id from co), 'f0000000-0000-0000-0000-000000000001', 'agent')$$);

select pg_temp.as_user('f0000000-0000-0000-0000-000000000002');
select pg_temp.expect_fail('un agent n''ajoute pas de membre', $$select public.add_member((select id from co), 'externe@d.test', 'admin')$$);
select pg_temp.expect_fail('un agent ne se promeut pas', $$select public.set_member_role((select id from co), 'f0000000-0000-0000-0000-000000000002', 'admin')$$);
select pg_temp.check('l''agent lit la configuration', (select count(*) = 7 from public.products));

select pg_temp.as_user('f0000000-0000-0000-0000-000000000003');
select pg_temp.check('une personne extérieure ne voit rien', (select count(*) = 0 from public.products) and (select count(*) = 0 from public.list_members((select id from co))));
select pg_temp.expect_fail('une personne extérieure ne lance pas la démo', $$select public.seed_demo_configuration((select id from co))$$);

select pg_temp.as_user('f0000000-0000-0000-0000-000000000002');
select pg_temp.expect_fail('journal IA : un agent n''écrit pas d''appel', $$insert into public.ai_calls (company_id, user_id, task, provider, model, status) values ((select id from co), 'f0000000-0000-0000-0000-000000000002', 'triage', 'openai', 'm', 'ok')$$);
select pg_temp.check('journal IA : un agent ne lit pas les appels', (select count(*) = 0 from public.ai_calls));
grant select on co to service_role;
reset role; set role service_role;
insert into public.ai_calls (company_id, user_id, task, provider, model, status) values ((select id from co), 'f0000000-0000-0000-0000-000000000001', 'triage', 'openai', 'm', 'ok');
reset role; set role authenticated;
select pg_temp.as_user('f0000000-0000-0000-0000-000000000001');
select pg_temp.check('journal IA : écrit par le serveur, lu par l''administratrice', (select count(*) = 1 from public.ai_calls));
select pg_temp.as_user('f0000000-0000-0000-0000-000000000003');
select pg_temp.check('journal IA : invisible pour une autre entreprise', (select count(*) = 0 from public.ai_calls));
reset role;
\o
\pset footer off
select n as "#", case when ok then 'OK' else 'ÉCHEC' end as résultat, name as test from pg_temp.r order by n;
select count(*) filter (where ok) || ' / ' || count(*) || ' tests passent' as bilan from pg_temp.r;
do $$ begin if exists (select 1 from pg_temp.r where not ok) then raise exception 'des tests échouent'; end if; end $$;
