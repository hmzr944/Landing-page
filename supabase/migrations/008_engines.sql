-- Arbor : les cinq moteurs (docs/engines.md, décision D11). Évolue l'existant, ne supprime aucune donnée.
-- - Preuves : cinq résultats distincts (juste, partiel, faux, non_documente, insuffisant), niveau (1 à 7),
--   fiabilité de l'observation, contexte, version du scénario. Toujours immuables.
-- - Connaissances : type « erreur fréquente », contexte d'application, graphe de relations validées.
-- - Scénarios versionnés (conçus par le serveur, publiés par un humain) ; une partie référence la version jouée.
-- - Évolution des documents : changements analysés, décisions humaines, impact, actions de revalidation.
-- - Actions d'apprentissage assignées ; validation humaine d'une compétence ; données personnelles (export,
--   effacement, durée de conservation) ; envoi des invitations ; stockage limité aux chemins prévus.
-- Rejouable.

-- ---------- Preuves ----------
alter table public.evidence_events drop constraint if exists evidence_events_outcome_check;
alter table public.evidence_events add constraint evidence_events_outcome_check check (outcome in ('juste', 'partiel', 'faux', 'non_documente', 'insuffisant'));
alter table public.evidence_events drop constraint if exists evidence_events_activity_check;
alter table public.evidence_events add constraint evidence_events_activity_check
  check (activity in ('diagnostic', 'simulation', 'rappel', 'lecon', 'dialogue', 'validation_humaine', 'revalidation'));
alter table public.evidence_events add column if not exists level smallint check (level between 1 and 7);
alter table public.evidence_events add column if not exists reliability text not null default 'moyenne' check (reliability in ('faible', 'moyenne', 'forte'));
alter table public.evidence_events add column if not exists context text check (context is null or char_length(context) <= 80);
alter table public.evidence_events add column if not exists scenario_version_id uuid;
create index if not exists evidence_org_knowledge on public.evidence_events (org_id, knowledge_id);

-- ---------- Connaissances : type, contexte, graphe ----------
alter table public.knowledge_nodes drop constraint if exists knowledge_nodes_kind_check;
alter table public.knowledge_nodes add constraint knowledge_nodes_kind_check check (kind in ('concept', 'regle', 'procedure', 'produit', 'sensible', 'erreur_frequente'));
alter table public.knowledge_nodes add column if not exists context text check (context is null or char_length(context) <= 300);

create table if not exists public.knowledge_edges (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  from_id uuid not null,
  to_id uuid not null,
  relation text not null check (relation in ('prerequis', 'partie_de', 'precise', 'exemple_de', 'contredit', 'confusion_frequente', 'remplace')),
  method text not null default 'ia' check (method in ('ia', 'humain', 'regle')),
  status text not null default 'propose' check (status in ('propose', 'valide', 'rejete')),
  note text not null default '' check (char_length(note) <= 300),
  created_by uuid references auth.users (id),
  validated_by uuid references auth.users (id),
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  check (from_id <> to_id),
  unique (org_id, from_id, to_id, relation),
  foreign key (from_id, org_id) references public.knowledge_nodes (id, org_id) on delete cascade,
  foreign key (to_id, org_id) references public.knowledge_nodes (id, org_id) on delete cascade
);
alter table public.knowledge_edges enable row level security;
revoke all on public.knowledge_edges from anon, authenticated;
grant select on public.knowledge_edges to authenticated;
grant insert (org_id, from_id, to_id, relation, method, note, created_by) on public.knowledge_edges to authenticated;
grant all on public.knowledge_edges to service_role;
drop policy if exists edge_read on public.knowledge_edges;
create policy edge_read on public.knowledge_edges for select to authenticated
  using (arbor_private.has_role(org_id, array['admin', 'manager', 'expert']::public.org_role[]) or (status = 'valide' and arbor_private.is_member(org_id)));
drop policy if exists edge_write on public.knowledge_edges;
create policy edge_write on public.knowledge_edges for insert to authenticated
  with check (created_by = auth.uid() and method = 'humain' and arbor_private.has_role(org_id, array['admin', 'manager', 'expert']::public.org_role[]));

create or replace function public.set_edge_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_e public.knowledge_edges;
begin
  select * into v_e from public.knowledge_edges where id = p_id for update;
  if not found then raise exception 'relation introuvable'; end if;
  if p_status not in ('valide', 'rejete', 'propose') then raise exception 'statut invalide'; end if;
  if not arbor_private.has_role(v_e.org_id, array['admin', 'manager', 'expert']::public.org_role[]) then raise exception 'accès refusé'; end if;
  update public.knowledge_edges set status = p_status, validated_by = case when p_status = 'valide' then auth.uid() end,
    validated_at = case when p_status = 'valide' then now() end where id = p_id;
  perform arbor_private.audit(v_e.org_id, 'relation.' || p_status, p_id::text, jsonb_build_object('relation', v_e.relation));
end $$;

-- ---------- Scénarios versionnés ----------
create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 160),
  kind text not null default 'client' check (kind in ('client', 'procedure', 'technique', 'management', 'autre')),
  status text not null default 'brouillon' check (status in ('brouillon', 'publie', 'archive')),
  current_version integer not null default 0,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (id, org_id)
);
create table if not exists public.scenario_versions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  scenario_id uuid not null,
  version integer not null check (version >= 1),
  spec jsonb not null check (jsonb_typeof(spec) = 'object' and pg_column_size(spec) <= 20000),
  knowledge_ids uuid[] not null default '{}',
  skill_ids uuid[] not null default '{}',
  status text not null default 'brouillon' check (status in ('brouillon', 'valide', 'obsolete')),
  validated_by uuid references auth.users (id),
  validated_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (scenario_id, version),
  unique (id, org_id),
  foreign key (scenario_id, org_id) references public.scenarios (id, org_id) on delete cascade
);
alter table public.scenarios enable row level security;
alter table public.scenario_versions enable row level security;
revoke all on public.scenarios, public.scenario_versions from anon, authenticated;
grant select on public.scenarios to authenticated;
-- la fiche (spec : besoin caché, événements, grille) n'est pas lisible directement : les responsables passent par scenario_spec()
grant select (id, org_id, scenario_id, version, knowledge_ids, skill_ids, status, validated_at, created_at) on public.scenario_versions to authenticated;
grant all on public.scenarios, public.scenario_versions to service_role;
drop policy if exists scenario_def_read on public.scenarios;
create policy scenario_def_read on public.scenarios for select to authenticated
  using (arbor_private.has_role(org_id, array['admin', 'manager']::public.org_role[]) or (status = 'publie' and arbor_private.is_member(org_id)));
drop policy if exists scenario_ver_read on public.scenario_versions;
create policy scenario_ver_read on public.scenario_versions for select to authenticated
  using (arbor_private.has_role(org_id, array['admin', 'manager']::public.org_role[]) or (status = 'valide' and arbor_private.is_member(org_id)));

create or replace function public.scenario_spec(p_version uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v public.scenario_versions;
begin
  select * into v from public.scenario_versions where id = p_version;
  if not found or not arbor_private.has_role(v.org_id, array['admin', 'manager']::public.org_role[]) then raise exception 'accès refusé'; end if;
  return v.spec;
end $$;

-- Publier une version (relue par un responsable) : l'ancienne version valide devient obsolète, l'historique reste
create or replace function public.publish_scenario_version(p_version uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.scenario_versions;
begin
  select * into v from public.scenario_versions where id = p_version for update;
  if not found then raise exception 'version introuvable'; end if;
  if not arbor_private.has_role(v.org_id, array['admin', 'manager']::public.org_role[]) then raise exception 'accès refusé'; end if;
  update public.scenario_versions set status = 'obsolete' where scenario_id = v.scenario_id and status = 'valide' and id <> p_version;
  update public.scenario_versions set status = 'valide', validated_by = auth.uid(), validated_at = now() where id = p_version;
  update public.scenarios set status = 'publie', current_version = v.version where id = v.scenario_id;
  perform arbor_private.audit(v.org_id, 'scenario.publie', v.scenario_id::text, jsonb_build_object('version', v.version));
end $$;
create or replace function public.archive_scenario(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare s public.scenarios;
begin
  select * into s from public.scenarios where id = p_id for update;
  if not found or not arbor_private.has_role(s.org_id, array['admin', 'manager']::public.org_role[]) then raise exception 'accès refusé'; end if;
  update public.scenarios set status = 'archive' where id = p_id;
  perform arbor_private.audit(s.org_id, 'scenario.archive', p_id::text, '{}'::jsonb);
end $$;

alter table public.scenario_sessions add column if not exists scenario_version_id uuid;
alter table public.scenario_sessions drop constraint if exists scenario_sessions_kind_check;
alter table public.scenario_sessions add constraint scenario_sessions_kind_check check (kind in ('client_mystere', 'scenario'));
grant select (scenario_version_id) on public.scenario_sessions to authenticated;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'scenario_sessions_version_fk') then
    alter table public.scenario_sessions add constraint scenario_sessions_version_fk foreign key (scenario_version_id, org_id) references public.scenario_versions (id, org_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'evidence_scenario_version_fk') then
    alter table public.evidence_events add constraint evidence_scenario_version_fk foreign key (scenario_version_id, org_id) references public.scenario_versions (id, org_id);
  end if;
end $$;

-- ---------- Évolution des documents (Live Policy Watchdog) ----------
create table if not exists public.policy_changes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  source_id uuid not null,
  from_version_id uuid not null,
  to_version_id uuid not null,
  status text not null default 'a_valider' check (status in ('a_valider', 'traite')),
  summary jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (id, org_id),
  unique (to_version_id),
  foreign key (source_id, org_id) references public.sources (id, org_id) on delete cascade,
  foreign key (from_version_id, org_id) references public.source_versions (id, org_id) on delete cascade,
  foreign key (to_version_id, org_id) references public.source_versions (id, org_id) on delete cascade
);
create table if not exists public.policy_change_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  change_id uuid not null,
  knowledge_id uuid,                 -- connaissance de l'ancienne version (absente pour « nouveau »)
  change text not null check (change in ('inchange', 'reformule', 'modifie', 'supprime', 'nouveau')),
  sensitive boolean not null default false,
  new_title text check (new_title is null or char_length(new_title) <= 200),
  new_body text check (new_body is null or char_length(new_body) <= 6000),
  new_quote text check (new_quote is null or char_length(new_quote) <= 1200),
  new_page integer,
  explanation text not null default '' check (char_length(explanation) <= 600),
  decision text not null default 'a_valider' check (decision in ('a_valider', 'accepte', 'rejete')),
  new_knowledge_id uuid,
  decided_by uuid references auth.users (id),
  decided_at timestamptz,
  foreign key (change_id, org_id) references public.policy_changes (id, org_id) on delete cascade,
  foreign key (knowledge_id, org_id) references public.knowledge_nodes (id, org_id) on delete cascade,
  foreign key (new_knowledge_id, org_id) references public.knowledge_nodes (id, org_id)
);
alter table public.policy_changes enable row level security;
alter table public.policy_change_items enable row level security;
revoke all on public.policy_changes, public.policy_change_items from anon, authenticated;
grant select on public.policy_changes, public.policy_change_items to authenticated;
grant all on public.policy_changes, public.policy_change_items to service_role;
drop policy if exists change_read on public.policy_changes;
create policy change_read on public.policy_changes for select to authenticated using (arbor_private.has_role(org_id, array['admin', 'manager', 'expert']::public.org_role[]));
drop policy if exists change_item_read on public.policy_change_items;
create policy change_item_read on public.policy_change_items for select to authenticated using (arbor_private.has_role(org_id, array['admin', 'manager', 'expert']::public.org_role[]));

-- Décision humaine sur un changement. Le sensible exige un manager ou un administrateur.
-- accepte : la connaissance est reportée sur la nouvelle version (nouvelle ligne, l'ancienne passe « remplacée », historique conservé) ;
-- supprime accepté : l'ancienne connaissance passe « remplacée » sans successeur ; rejete : rien ne change, c'est tracé.
create or replace function public.decide_change_item(p_item uuid, p_decision text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare it public.policy_change_items; ch public.policy_changes; k public.knowledge_nodes; v_new uuid;
begin
  select * into it from public.policy_change_items where id = p_item for update;
  if not found then raise exception 'changement introuvable'; end if;
  select * into ch from public.policy_changes where id = it.change_id;
  if p_decision not in ('accepte', 'rejete') then raise exception 'décision invalide'; end if;
  if not arbor_private.has_role(it.org_id, case when it.sensitive then array['admin', 'manager']::public.org_role[] else array['admin', 'manager', 'expert']::public.org_role[] end) then
    raise exception 'accès refusé';
  end if;
  if it.decision <> 'a_valider' then raise exception 'déjà décidé'; end if;
  if p_decision = 'accepte' then
    if it.knowledge_id is not null then select * into k from public.knowledge_nodes where id = it.knowledge_id; end if;
    if it.change = 'supprime' then
      update public.knowledge_nodes set status = 'remplace' where id = it.knowledge_id;
    else
      insert into public.knowledge_nodes (org_id, source_version_id, kind, title, body, quote, page, confidence, extracted_by, status, validated_by, validated_at, replaces, created_by, context)
        values (it.org_id, ch.to_version_id, coalesce(case when it.sensitive then 'sensible' end, k.kind, 'concept'), coalesce(it.new_title, k.title), coalesce(it.new_body, k.body, ''), coalesce(it.new_quote, k.quote, ''),
          coalesce(it.new_page, k.page), k.confidence, 'humain', 'valide', auth.uid(), now(), it.knowledge_id, auth.uid(), k.context)
        returning id into v_new;
      if it.knowledge_id is not null then update public.knowledge_nodes set status = 'remplace' where id = it.knowledge_id; end if;
      -- les compétences suivent la connaissance qui la remplace
      if it.knowledge_id is not null then
        insert into public.skill_knowledge (org_id, skill_id, knowledge_id) select org_id, skill_id, v_new from public.skill_knowledge where knowledge_id = it.knowledge_id on conflict do nothing;
      end if;
    end if;
  end if;
  update public.policy_change_items set decision = p_decision, decided_by = auth.uid(), decided_at = now(), new_knowledge_id = v_new where id = p_item;
  if not exists (select 1 from public.policy_change_items where change_id = it.change_id and decision = 'a_valider') then
    update public.policy_changes set status = 'traite', closed_at = now() where id = it.change_id;
  end if;
  perform arbor_private.audit(it.org_id, 'changement.' || p_decision, p_item::text, jsonb_build_object('change', it.change, 'sensible', it.sensitive));
  return v_new;
end $$;

-- Impact d'un changement : compétences, scénarios et personnes ayant des preuves sur les connaissances touchées
create or replace function public.policy_change_impact(p_change uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare ch public.policy_changes; ks uuid[];
begin
  select * into ch from public.policy_changes where id = p_change;
  if not found or not arbor_private.has_role(ch.org_id, array['admin', 'manager', 'expert']::public.org_role[]) then raise exception 'accès refusé'; end if;
  select coalesce(array_agg(knowledge_id), '{}') into ks from public.policy_change_items where change_id = p_change and change in ('modifie', 'supprime', 'reformule') and knowledge_id is not null;
  return jsonb_build_object(
    'knowledge', cardinality(ks),
    'skills', coalesce((select jsonb_agg(distinct jsonb_build_object('id', s.id, 'name', s.name)) from public.skill_knowledge sk join public.skills s on s.id = sk.skill_id where sk.knowledge_id = any (ks)), '[]'::jsonb),
    'scenarios', coalesce((select jsonb_agg(distinct jsonb_build_object('id', sc.id, 'title', sc.title)) from public.scenario_versions v join public.scenarios sc on sc.id = v.scenario_id where v.status = 'valide' and v.knowledge_ids && ks), '[]'::jsonb),
    'people', coalesce((select jsonb_agg(distinct e.user_id) from public.evidence_events e where e.org_id = ch.org_id and e.knowledge_id = any (ks)), '[]'::jsonb)
  );
end $$;

-- ---------- Actions d'apprentissage (revalidation, correction, parcours) ----------
create table if not exists public.learning_actions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  user_id uuid not null,
  kind text not null check (kind in ('revalidation', 'diagnostic', 'simulation', 'revoir', 'validation_humaine')),
  knowledge_ids uuid[] not null default '{}',
  skill_id uuid,
  scenario_id uuid,
  change_id uuid,
  reason text not null check (char_length(reason) between 3 and 400),
  origin text not null check (origin in ('watchdog', 'manager', 'parcours')),
  status text not null default 'a_faire' check (status in ('a_faire', 'fait', 'annule')),
  due date,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  done_at timestamptz,
  foreign key (org_id, user_id) references public.memberships (org_id, user_id) on delete cascade,
  foreign key (skill_id, org_id) references public.skills (id, org_id) on delete set null (skill_id),
  foreign key (change_id, org_id) references public.policy_changes (id, org_id) on delete set null (change_id)
);
create index if not exists learning_actions_user on public.learning_actions (org_id, user_id, status);
alter table public.learning_actions enable row level security;
revoke all on public.learning_actions from anon, authenticated;
grant select on public.learning_actions to authenticated;
grant all on public.learning_actions to service_role;
drop policy if exists action_read on public.learning_actions;
create policy action_read on public.learning_actions for select to authenticated
  using (user_id = auth.uid() or arbor_private.has_role(org_id, array['admin', 'manager']::public.org_role[]));

create or replace function public.assign_learning_actions(p_org uuid, p_users uuid[], p_kind text, p_reason text,
  p_knowledge uuid[] default '{}', p_skill uuid default null, p_change uuid default null, p_due date default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not arbor_private.has_role(p_org, array['admin', 'manager']::public.org_role[]) then raise exception 'accès refusé'; end if;
  if cardinality(p_users) > 500 then raise exception 'trop de personnes à la fois'; end if;
  insert into public.learning_actions (org_id, user_id, kind, knowledge_ids, skill_id, change_id, reason, origin, due, created_by)
    select p_org, u, p_kind, coalesce(p_knowledge, '{}'), p_skill, p_change, trim(p_reason), case when p_change is null then 'manager' else 'watchdog' end, p_due, auth.uid()
    from unnest(p_users) u where exists (select 1 from public.memberships m where m.org_id = p_org and m.user_id = u and m.status = 'active');
  get diagnostics n = row_count;
  perform arbor_private.audit(p_org, 'actions.assignees', p_kind, jsonb_build_object('n', n, 'change', p_change));
  return n;
end $$;
create or replace function public.set_action_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare a public.learning_actions;
begin
  select * into a from public.learning_actions where id = p_id for update;
  if not found then raise exception 'action introuvable'; end if;
  if p_status not in ('fait', 'annule', 'a_faire') then raise exception 'statut invalide'; end if;
  -- la personne marque ses actions faites ; seul un responsable annule
  if not (a.user_id = auth.uid() and p_status in ('fait', 'a_faire')) and not arbor_private.has_role(a.org_id, array['admin', 'manager']::public.org_role[]) then raise exception 'accès refusé'; end if;
  update public.learning_actions set status = p_status, done_at = case when p_status = 'fait' then now() end where id = p_id;
end $$;

-- Validation humaine d'une compétence ou d'une connaissance (indispensable pour le réglementaire et la sécurité)
create or replace function public.record_human_validation(p_org uuid, p_user uuid, p_outcome text, p_note text,
  p_skill uuid default null, p_knowledge uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not arbor_private.has_role(p_org, array['admin', 'manager']::public.org_role[]) then raise exception 'accès refusé'; end if;
  if p_user = auth.uid() then raise exception 'on ne valide pas ses propres compétences'; end if;
  if p_outcome not in ('juste', 'partiel', 'faux', 'insuffisant') then raise exception 'résultat invalide'; end if;
  if p_skill is null and p_knowledge is null then raise exception 'compétence ou connaissance requise'; end if;
  insert into public.evidence_events (org_id, user_id, knowledge_id, skill_id, activity, outcome, evaluator, level, reliability, context, detail)
    values (p_org, p_user, p_knowledge, p_skill, 'validation_humaine', p_outcome, 'humain', case when p_outcome = 'juste' then 5 else null end, 'forte', 'observation au poste',
      jsonb_build_object('note', left(coalesce(p_note, ''), 500), 'by', auth.uid()));
  perform arbor_private.audit(p_org, 'validation.humaine', p_user::text, jsonb_build_object('skill', p_skill, 'knowledge', p_knowledge, 'outcome', p_outcome));
end $$;

-- ---------- Données personnelles ----------
alter table public.organizations add column if not exists retention_days integer not null default 365 check (retention_days between 30 and 3650);
create or replace function public.set_retention(p_org uuid, p_days integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not arbor_private.has_role(p_org, array['admin']::public.org_role[]) then raise exception 'accès refusé'; end if;
  update public.organizations set retention_days = p_days where id = p_org;
  perform arbor_private.audit(p_org, 'conservation.modifiee', p_org::text, jsonb_build_object('days', p_days));
end $$;
-- Ce que l'organisation a enregistré sur moi (droit d'accès)
create or replace function public.export_my_org_data(p_org uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not arbor_private.is_member(p_org) then raise exception 'accès refusé'; end if;
  return jsonb_build_object(
    'organization', (select name from public.organizations where id = p_org),
    'membership', (select jsonb_build_object('role', role, 'email', email, 'since', created_at) from public.memberships where org_id = p_org and user_id = auth.uid()),
    'evidence', coalesce((select jsonb_agg(to_jsonb(e) - 'org_id' - 'user_id' order by e.at) from public.evidence_events e where e.org_id = p_org and e.user_id = auth.uid()), '[]'::jsonb),
    'simulations', coalesce((select jsonb_agg(jsonb_build_object('at', s.created_at, 'status', s.status, 'transcript', s.transcript, 'debrief', s.debrief)) from public.scenario_sessions s where s.org_id = p_org and s.user_id = auth.uid()), '[]'::jsonb),
    'actions', coalesce((select jsonb_agg(to_jsonb(a) - 'org_id' - 'user_id') from public.learning_actions a where a.org_id = p_org and a.user_id = auth.uid()), '[]'::jsonb),
    'exported_at', now());
end $$;
-- Effacement de mes données d'apprentissage dans une organisation (preuves, simulations, questions, actions) ;
-- l'appartenance reste (la quitter est une autre démarche). Journalisé, sans le contenu effacé.
create or replace function public.erase_my_org_data(p_org uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare n_e integer; n_s integer;
begin
  if not arbor_private.is_member(p_org) then raise exception 'accès refusé'; end if;
  perform set_config('arbor.erasure', 'on', true);
  delete from public.evidence_events where org_id = p_org and user_id = auth.uid(); get diagnostics n_e = row_count;
  delete from public.scenario_sessions where org_id = p_org and user_id = auth.uid(); get diagnostics n_s = row_count;
  delete from public.diagnostic_items where org_id = p_org and user_id = auth.uid();
  delete from public.learning_actions where org_id = p_org and user_id = auth.uid();
  perform set_config('arbor.erasure', 'off', true);
  perform arbor_private.audit(p_org, 'donnees.effacees', auth.uid()::text, jsonb_build_object('preuves', n_e, 'simulations', n_s));
  return jsonb_build_object('evidence', n_e, 'simulations', n_s);
end $$;
-- Purge des transcriptions au-delà de la durée de conservation (le débrief et les preuves restent). Serveur seulement.
create or replace function public.purge_expired_transcripts() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  update public.scenario_sessions s set transcript = '[]'::jsonb
    from public.organizations o where o.id = s.org_id and s.transcript <> '[]'::jsonb and s.created_at < now() - make_interval(days => o.retention_days);
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------- Invitations envoyées par e-mail ----------
alter table public.invitations add column if not exists sent_at timestamptz;
alter table public.invitations add column if not exists send_count integer not null default 0;
grant select (sent_at, send_count) on public.invitations to authenticated;

-- ---------- Stockage : un fichier seulement au chemin prévu d'une version existante ----------
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'source_versions_path_exact') then
    alter table public.source_versions add constraint source_versions_path_exact
      check (storage_path is null or storage_path = org_id::text || '/' || source_id::text || '/v' || version::text || '.pdf') not valid;
  end if;
end $$;
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    execute 'drop policy if exists org_sources_write on storage.objects';
    execute $p$create policy org_sources_write on storage.objects for insert to authenticated
      with check (bucket_id = 'org-sources'
        and arbor_private.has_role(((storage.foldername(name))[1])::uuid, array['admin', 'manager', 'expert']::public.org_role[])
        and exists (select 1 from public.source_versions v where v.storage_path = name and v.org_id = ((storage.foldername(name))[1])::uuid))$p$;
  end if;
end $$;

-- ---------- Journal des appels : nouvelles tâches ----------
alter table public.ai_calls drop constraint if exists ai_calls_mode_check;
alter table public.ai_calls add constraint ai_calls_mode_check
  check (mode in ('socratique', 'enseigne', 'situation', 'enrichir', 'rediger_cours', 'rediger_notion', 'extraire', 'structurer',
    'competences', 'diagnostic', 'mystere', 'relations', 'scenario', 'comparer', 'invitation'));

-- ---------- Droits d'exécution ----------
revoke all on function public.set_edge_status(uuid, text) from public, anon;
revoke all on function public.scenario_spec(uuid) from public, anon;
revoke all on function public.publish_scenario_version(uuid) from public, anon;
revoke all on function public.archive_scenario(uuid) from public, anon;
revoke all on function public.decide_change_item(uuid, text) from public, anon;
revoke all on function public.policy_change_impact(uuid) from public, anon;
revoke all on function public.assign_learning_actions(uuid, uuid[], text, text, uuid[], uuid, uuid, date) from public, anon;
revoke all on function public.set_action_status(uuid, text) from public, anon;
revoke all on function public.record_human_validation(uuid, uuid, text, text, uuid, uuid) from public, anon;
revoke all on function public.set_retention(uuid, integer) from public, anon;
revoke all on function public.export_my_org_data(uuid) from public, anon;
revoke all on function public.erase_my_org_data(uuid) from public, anon;
revoke all on function public.purge_expired_transcripts() from public, anon, authenticated;
grant execute on function public.set_edge_status(uuid, text) to authenticated;
grant execute on function public.scenario_spec(uuid) to authenticated;
grant execute on function public.publish_scenario_version(uuid) to authenticated;
grant execute on function public.archive_scenario(uuid) to authenticated;
grant execute on function public.decide_change_item(uuid, text) to authenticated;
grant execute on function public.policy_change_impact(uuid) to authenticated;
grant execute on function public.assign_learning_actions(uuid, uuid[], text, text, uuid[], uuid, uuid, date) to authenticated;
grant execute on function public.set_action_status(uuid, text) to authenticated;
grant execute on function public.record_human_validation(uuid, uuid, text, text, uuid, uuid) to authenticated;
grant execute on function public.set_retention(uuid, integer) to authenticated;
grant execute on function public.export_my_org_data(uuid) to authenticated;
grant execute on function public.erase_my_org_data(uuid) to authenticated;
grant execute on function public.purge_expired_transcripts() to service_role;
