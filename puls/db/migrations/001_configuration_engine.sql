-- =====================================================================
-- PULS : 001 Configuration Engine (fondations multi-entreprises)
-- Cible : un projet Supabase DÉDIÉ à PULS (pas celui d'Arbor).
--
-- Principes :
-- - Chaque ligne métier porte company_id. L'appartenance est TOUJOURS déduite de auth.uid()
--   côté base (RLS), jamais d'un identifiant fourni par le navigateur.
-- - Clés étrangères composites (id, company_id) : impossible de rattacher une ligne d'une
--   entreprise à un parent d'une autre entreprise, même avec un identifiant valide.
-- - Inconnu = NULL ou 'unknown', jamais une valeur inventée (température, durée, coût).
-- - Politiques versionnées : une version active est figée ; les décisions pointent vers
--   la version appliquée, une nouvelle version ne réécrit pas le passé.
-- - Actions sensibles (niveau 3) : uniquement via fonctions serveur qui vérifient le rôle
--   et la délégation, puis écrivent dans le journal d'audit (ajout seul).
-- - Environnement 'demo' : aucune exécution réelle possible, le résultat est 'simulated'.
-- =====================================================================

create extension if not exists pgcrypto;
create schema if not exists puls_private;
revoke all on schema puls_private from public;
grant usage on schema puls_private to authenticated, service_role;

-- ---------- Types ----------
create type public.puls_role as enum ('admin', 'sav_manager', 'agent', 'logistics_manager', 'viewer');
create type public.puls_env as enum ('demo', 'production');
create type public.level5 as enum ('unknown', 'none', 'low', 'medium', 'high', 'critical');
create type public.site_kind as enum ('warehouse', 'store', 'workshop', 'partner');
create type public.policy_kind as enum ('incident_types', 'criticality', 'resolution', 'authorization', 'refund', 'replacement', 'sla', 'escalation', 'tone');
create type public.policy_status as enum ('draft', 'active', 'retired');
create type public.case_status as enum ('new', 'open', 'waiting_customer', 'waiting_carrier', 'on_hold', 'resolved', 'reopened', 'closed');
create type public.action_kind as enum ('reship', 'local_replacement', 'courier', 'refund', 'goodwill', 'custom',
                                        'request_proof', 'check_tracking', 'contact_carrier', 'check_stock', 'escalate', 'hold');
create type public.action_status as enum ('proposed', 'pending_approval', 'approved', 'rejected', 'simulated', 'executed', 'failed');

-- ---------- Entreprises et membres ----------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  environment public.puls_env not null default 'demo',
  created_at timestamptz not null default now()
);

create table public.memberships (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.puls_role not null default 'viewer',
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);
create index memberships_user on public.memberships (user_id);

create or replace function puls_private.is_member(p_company uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m
                 where m.company_id = p_company and m.user_id = auth.uid() and m.status = 'active');
$$;
create or replace function puls_private.role_in(p_company uuid) returns public.puls_role
language sql stable security definer set search_path = '' as $$
  select m.role from public.memberships m
  where m.company_id = p_company and m.user_id = auth.uid() and m.status = 'active';
$$;
create or replace function puls_private.has_role(p_company uuid, p_roles public.puls_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(puls_private.role_in(p_company) = any (p_roles), false);
$$;
revoke all on function puls_private.is_member(uuid), puls_private.role_in(uuid), puls_private.has_role(uuid, public.puls_role[]) from public;
grant execute on function puls_private.is_member(uuid), puls_private.role_in(uuid), puls_private.has_role(uuid, public.puls_role[]) to authenticated, service_role;

-- ---------- Organisation ----------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  unique (id, company_id)
);
create table public.legal_entities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  registration_number text,                 -- inconnu = NULL
  country text,
  unique (id, company_id)
);
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  workspace_id uuid not null,
  legal_entity_id uuid,
  name text not null,
  unique (id, company_id),
  foreign key (workspace_id, company_id) references public.workspaces (id, company_id) on delete cascade,
  foreign key (legal_entity_id, company_id) references public.legal_entities (id, company_id)
);
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  workspace_id uuid not null,
  brand_id uuid,
  name text not null,
  kind public.site_kind not null,
  -- Une boutique n'est jamais un entrepôt par défaut : l'expédition doit être déclarée explicitement.
  ships_orders boolean not null default false,
  city text,
  timezone text not null default 'Europe/Paris',
  opening_hours jsonb,                      -- inconnu = NULL
  prep_capacity_per_day integer check (prep_capacity_per_day >= 0),
  can_transfer boolean,                     -- inconnu = NULL
  courier_available boolean,                -- inconnu = NULL
  unique (id, company_id),
  foreign key (workspace_id, company_id) references public.workspaces (id, company_id) on delete cascade,
  foreign key (brand_id, company_id) references public.brands (id, company_id)
);

-- ---------- Catalogue ----------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  workspace_id uuid not null,
  brand_id uuid,
  sku text not null,
  name text not null,
  category text,
  thermal_sensitivity public.level5 not null default 'unknown',
  fragility public.level5 not null default 'unknown',
  storage_conditions text,                  -- inconnu = NULL
  storage_temp_min_c numeric,               -- inconnu = NULL, jamais inventé
  storage_temp_max_c numeric,
  shelf_life_hours integer check (shelf_life_hours > 0),
  transport_restrictions text[] not null default '{}',
  seasonal_constraints jsonb not null default '[]',
  unit_cost numeric check (unit_cost >= 0), -- inconnu = NULL : aucune marge ne sera calculée
  list_price numeric check (list_price >= 0),
  unique (company_id, sku),
  unique (id, company_id),
  check (storage_temp_min_c is null or storage_temp_max_c is null or storage_temp_min_c <= storage_temp_max_c),
  foreign key (workspace_id, company_id) references public.workspaces (id, company_id) on delete cascade,
  foreign key (brand_id, company_id) references public.brands (id, company_id)
);

create table public.carriers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  unique (id, company_id)
);
create table public.delivery_methods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  carrier_id uuid not null,
  name text not null,
  temperature_controlled boolean,           -- inconnu = NULL
  max_transit_hours integer,
  unique (id, company_id),
  foreign key (carrier_id, company_id) references public.carriers (id, company_id) on delete cascade
);
create table public.product_delivery_methods (
  company_id uuid not null,
  product_id uuid not null,
  delivery_method_id uuid not null,
  primary key (product_id, delivery_method_id),
  foreign key (product_id, company_id) references public.products (id, company_id) on delete cascade,
  foreign key (delivery_method_id, company_id) references public.delivery_methods (id, company_id) on delete cascade
);
create table public.stock_levels (
  company_id uuid not null,
  site_id uuid not null,
  product_id uuid not null,
  quantity integer not null check (quantity >= 0),
  as_of timestamptz not null,
  source text not null check (source in ('manual', 'csv', 'integration')),   -- l'origine est toujours dite
  primary key (site_id, product_id),
  foreign key (site_id, company_id) references public.sites (id, company_id) on delete cascade,
  foreign key (product_id, company_id) references public.products (id, company_id) on delete cascade
);

-- ---------- Politiques versionnées ----------
create table public.policy_sets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  workspace_id uuid not null,
  kind public.policy_kind not null,
  name text not null,
  unique (id, company_id),
  unique (workspace_id, kind, name),
  foreign key (workspace_id, company_id) references public.workspaces (id, company_id) on delete cascade
);
create table public.policy_versions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  policy_set_id uuid not null,
  version integer not null check (version > 0),
  body jsonb not null,
  status public.policy_status not null default 'draft',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  activated_by uuid references auth.users (id),
  activated_at timestamptz,
  unique (policy_set_id, version),
  unique (id, company_id),
  foreign key (policy_set_id, company_id) references public.policy_sets (id, company_id) on delete cascade
);
create unique index one_active_version on public.policy_versions (policy_set_id) where status = 'active';

-- Une version activée ou retirée ne change plus de contenu.
create or replace function puls_private.freeze_policy() returns trigger language plpgsql as $$
begin
  if old.status <> 'draft' and (new.body is distinct from old.body or new.version <> old.version or new.policy_set_id <> old.policy_set_id) then
    raise exception 'policy version % is % and cannot be modified', old.id, old.status using errcode = 'check_violation';
  end if;
  if old.status = 'retired' and new.status <> 'retired' then
    raise exception 'a retired policy version cannot be reactivated' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger policy_versions_freeze before update on public.policy_versions for each row execute function puls_private.freeze_policy();

-- ---------- Dossiers et actions ----------
create table public.cases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  workspace_id uuid not null,
  ref text not null,
  status public.case_status not null default 'new',
  customer_name text,
  customer_email text,
  order_ref text,
  -- criticité explicable : facteurs séparés (risque produit, urgence logistique, urgence commerciale)
  criticality jsonb,
  criticality_policy_version_id uuid,
  opened_at timestamptz not null default now(),
  unique (company_id, ref),
  unique (id, company_id),
  foreign key (workspace_id, company_id) references public.workspaces (id, company_id) on delete cascade,
  foreign key (criticality_policy_version_id, company_id) references public.policy_versions (id, company_id)
);

create table public.case_actions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  case_id uuid not null,
  kind public.action_kind not null,
  level smallint not null check (level between 1 and 3),
  amount numeric check (amount >= 0),
  status public.action_status not null,
  authorization_policy_version_id uuid,
  requested_by uuid not null references auth.users (id),
  requested_at timestamptz not null default now(),
  decided_by uuid references auth.users (id),
  decided_at timestamptz,
  execution_mode text check (execution_mode in ('simulated', 'real')),
  result jsonb,
  check (level < 3 or authorization_policy_version_id is not null),
  check (decided_by is null or decided_by <> requested_by or status in ('approved', 'simulated', 'executed', 'failed')),
  foreign key (case_id, company_id) references public.cases (id, company_id) on delete cascade,
  foreign key (authorization_policy_version_id, company_id) references public.policy_versions (id, company_id)
);

-- ---------- Journal d'audit (ajout seul) ----------
create table public.audit_log (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies (id) on delete cascade,
  actor uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  detail jsonb not null default '{}',
  at timestamptz not null default now()
);
create or replace function puls_private.audit(p_company uuid, p_action text, p_entity text, p_id uuid, p_detail jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log (company_id, actor, action, entity, entity_id, detail)
  values (p_company, auth.uid(), p_action, p_entity, p_id, coalesce(p_detail, '{}'));
$$;
revoke all on function puls_private.audit(uuid, text, text, uuid, jsonb) from public;
create or replace function puls_private.no_rewrite() returns trigger language plpgsql as $$
begin raise exception 'audit_log is append-only' using errcode = 'insufficient_privilege'; end $$;
create trigger audit_log_append_only before update or delete on public.audit_log for each row execute function puls_private.no_rewrite();

-- ---------- Marge : jamais inventée ----------
create view public.product_margins with (security_invoker = true) as
  select id, company_id, sku, list_price, unit_cost,
         case when unit_cost is null or list_price is null then null else list_price - unit_cost end as known_margin
  from public.products;

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.companies enable row level security;
alter table public.memberships enable row level security;
alter table public.workspaces enable row level security;
alter table public.legal_entities enable row level security;
alter table public.brands enable row level security;
alter table public.sites enable row level security;
alter table public.products enable row level security;
alter table public.carriers enable row level security;
alter table public.delivery_methods enable row level security;
alter table public.product_delivery_methods enable row level security;
alter table public.stock_levels enable row level security;
alter table public.policy_sets enable row level security;
alter table public.policy_versions enable row level security;
alter table public.cases enable row level security;
alter table public.case_actions enable row level security;
alter table public.audit_log enable row level security;

create policy companies_read on public.companies for select to authenticated using (puls_private.is_member(id));
create policy memberships_read on public.memberships for select to authenticated using (puls_private.is_member(company_id));

-- Lecture : tout membre actif. Écriture de configuration : administrateurs (et responsable logistique pour les stocks).
do $$
declare t text;
begin
  foreach t in array array['workspaces','legal_entities','brands','sites','products','carriers','delivery_methods','product_delivery_methods','policy_sets'] loop
    execute format('create policy %1$s_read on public.%1$s for select to authenticated using (puls_private.is_member(company_id))', t);
    execute format('create policy %1$s_admin_ins on public.%1$s for insert to authenticated with check (puls_private.has_role(company_id, array[''admin'']::public.puls_role[]))', t);
    execute format('create policy %1$s_admin_upd on public.%1$s for update to authenticated using (puls_private.has_role(company_id, array[''admin'']::public.puls_role[])) with check (puls_private.has_role(company_id, array[''admin'']::public.puls_role[]))', t);
    execute format('create policy %1$s_admin_del on public.%1$s for delete to authenticated using (puls_private.has_role(company_id, array[''admin'']::public.puls_role[]))', t);
  end loop;
end $$;

create policy stock_read on public.stock_levels for select to authenticated using (puls_private.is_member(company_id));
create policy stock_write on public.stock_levels for all to authenticated
  using (puls_private.has_role(company_id, array['admin','logistics_manager']::public.puls_role[]))
  with check (puls_private.has_role(company_id, array['admin','logistics_manager']::public.puls_role[]));

-- Politiques : lecture membres ; brouillons écrits par l'admin ; activation uniquement par fonction.
create policy pv_read on public.policy_versions for select to authenticated using (puls_private.is_member(company_id));
create policy pv_draft_ins on public.policy_versions for insert to authenticated
  with check (status = 'draft' and puls_private.has_role(company_id, array['admin']::public.puls_role[]));
create policy pv_draft_upd on public.policy_versions for update to authenticated
  using (status = 'draft' and puls_private.has_role(company_id, array['admin']::public.puls_role[]))
  with check (status = 'draft' and puls_private.has_role(company_id, array['admin']::public.puls_role[]));

create policy cases_read on public.cases for select to authenticated using (puls_private.is_member(company_id));
create policy cases_ins on public.cases for insert to authenticated
  with check (puls_private.has_role(company_id, array['admin','sav_manager','agent']::public.puls_role[]));
create policy cases_upd on public.cases for update to authenticated
  using (puls_private.has_role(company_id, array['admin','sav_manager','agent']::public.puls_role[]))
  with check (puls_private.has_role(company_id, array['admin','sav_manager','agent']::public.puls_role[]));

-- Actions et audit : lecture seule depuis le client ; écriture exclusivement par fonctions.
create policy actions_read on public.case_actions for select to authenticated using (puls_private.is_member(company_id));
create policy audit_read on public.audit_log for select to authenticated
  using (puls_private.has_role(company_id, array['admin','sav_manager']::public.puls_role[]));

revoke insert, update, delete on public.case_actions, public.audit_log from authenticated, anon;
grant select on all tables in schema public to authenticated;
grant insert, update, delete on public.workspaces, public.legal_entities, public.brands, public.sites, public.products, public.carriers,
  public.delivery_methods, public.product_delivery_methods, public.stock_levels, public.policy_sets, public.policy_versions, public.cases to authenticated;
revoke all on all tables in schema public from anon;

-- =====================================================================
-- Fonctions métier (niveau 3 : autorisation)
-- =====================================================================

-- Active une version de politique ; la précédente est retirée, jamais modifiée.
create or replace function public.activate_policy_version(p_version uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.policy_versions;
begin
  select * into v from public.policy_versions where id = p_version for update;
  if v.id is null or not puls_private.has_role(v.company_id, array['admin']::public.puls_role[]) then
    raise exception 'not allowed' using errcode = 'insufficient_privilege';
  end if;
  if v.status <> 'draft' then raise exception 'only a draft can be activated' using errcode = 'check_violation'; end if;
  update public.policy_versions set status = 'retired' where policy_set_id = v.policy_set_id and status = 'active';
  update public.policy_versions set status = 'active', activated_by = auth.uid(), activated_at = now() where id = p_version;
  perform puls_private.audit(v.company_id, 'policy.activate', 'policy_version', p_version, jsonb_build_object('version', v.version));
end $$;

-- Plafond de délégation du rôle courant, lu dans la politique d'autorisation active du workspace.
create or replace function puls_private.delegation(p_company uuid, p_workspace uuid, out version_id uuid, out lim numeric)
language plpgsql stable security definer set search_path = '' as $$
declare r public.puls_role := puls_private.role_in(p_company);
begin
  select pv.id, (pv.body -> 'limits' ->> r::text)::numeric into version_id, lim
  from public.policy_versions pv join public.policy_sets ps on ps.id = pv.policy_set_id
  where ps.workspace_id = p_workspace and ps.company_id = p_company and ps.kind = 'authorization' and pv.status = 'active';
end $$;

-- Demande d'action. Niveaux 1-2 : enregistrées comme proposées. Niveau 3 : vérifiées contre la délégation.
create or replace function public.request_action(p_case uuid, p_kind public.action_kind, p_amount numeric default null, p_note text default null)
returns public.case_actions language plpgsql security definer set search_path = '' as $$
declare c public.cases; v_policy uuid; v_lim numeric; a public.case_actions; lvl smallint; st public.action_status;
begin
  select * into c from public.cases where id = p_case;
  if c.id is null or not puls_private.has_role(c.company_id, array['admin','sav_manager','agent','logistics_manager']::public.puls_role[]) then
    raise exception 'not allowed' using errcode = 'insufficient_privilege';
  end if;
  lvl := case when p_kind in ('reship','local_replacement','courier','refund','goodwill','custom') then 3
              when p_kind in ('escalate','hold') then 2 else 1 end;
  if lvl = 3 then
    select version_id, lim into v_policy, v_lim from puls_private.delegation(c.company_id, c.workspace_id);
    if v_policy is null then raise exception 'no active authorization policy for this workspace' using errcode = 'check_violation'; end if;
    st := case when coalesce(p_amount, 0) <= coalesce(v_lim, 0) then 'approved' else 'pending_approval' end;
  else
    st := 'proposed';
  end if;
  insert into public.case_actions (company_id, case_id, kind, level, amount, status, authorization_policy_version_id, requested_by,
                                   decided_by, decided_at, result)
  values (c.company_id, c.id, p_kind, lvl, p_amount, st, v_policy, auth.uid(),
          case when st = 'approved' then auth.uid() end, case when st = 'approved' then now() end,
          case when p_note is null then null else jsonb_build_object('note', p_note) end)
  returning * into a;
  perform puls_private.audit(c.company_id, 'action.request', 'case_action', a.id,
          jsonb_build_object('kind', p_kind, 'amount', p_amount, 'status', st, 'policy_version', v_policy));
  return a;
end $$;

-- Validation d'une action en attente : par une autre personne dont la délégation couvre le montant.
create or replace function public.decide_action(p_action uuid, p_approve boolean) returns public.case_actions
language plpgsql security definer set search_path = '' as $$
declare a public.case_actions; c public.cases; d record;
begin
  select * into a from public.case_actions where id = p_action for update;
  if a.id is null or not puls_private.is_member(a.company_id) then raise exception 'not allowed' using errcode = 'insufficient_privilege'; end if;
  if a.status <> 'pending_approval' then raise exception 'action is not pending' using errcode = 'check_violation'; end if;
  if a.requested_by = auth.uid() then raise exception 'requester cannot approve their own action' using errcode = 'insufficient_privilege'; end if;
  select * into c from public.cases where id = a.case_id;
  select * into d from puls_private.delegation(a.company_id, c.workspace_id);
  if p_approve and coalesce(a.amount, 0) > coalesce(d.lim, 0) then
    raise exception 'amount exceeds your delegation' using errcode = 'insufficient_privilege';
  end if;
  update public.case_actions set status = case when p_approve then 'approved'::public.action_status else 'rejected' end,
         decided_by = auth.uid(), decided_at = now()
  where id = p_action returning * into a;
  perform puls_private.audit(a.company_id, case when p_approve then 'action.approve' else 'action.reject' end, 'case_action', a.id,
          jsonb_build_object('amount', a.amount, 'policy_version', d.version_id));
  return a;
end $$;

-- Exécution : en démonstration, jamais réelle. En production, aucun exécuteur n'est encore branché.
create or replace function public.execute_action(p_action uuid) returns public.case_actions
language plpgsql security definer set search_path = '' as $$
declare a public.case_actions; env public.puls_env;
begin
  select * into a from public.case_actions where id = p_action for update;
  if a.id is null or not puls_private.has_role(a.company_id, array['admin','sav_manager','agent','logistics_manager']::public.puls_role[]) then
    raise exception 'not allowed' using errcode = 'insufficient_privilege';
  end if;
  if a.status <> 'approved' then raise exception 'only an approved action can be executed' using errcode = 'check_violation'; end if;
  select environment into env from public.companies where id = a.company_id;
  if env = 'demo' then
    update public.case_actions set status = 'simulated', execution_mode = 'simulated',
           result = coalesce(result, '{}') || jsonb_build_object('note', 'Environnement de démonstration : aucune opération réelle')
    where id = p_action returning * into a;
  else
    raise exception 'no executor connected for %', a.kind using errcode = 'feature_not_supported';
  end if;
  perform puls_private.audit(a.company_id, 'action.execute', 'case_action', a.id, jsonb_build_object('mode', a.execution_mode));
  return a;
end $$;

revoke all on function public.activate_policy_version(uuid), public.request_action(uuid, public.action_kind, numeric, text),
  public.decide_action(uuid, boolean), public.execute_action(uuid) from public;
grant execute on function public.activate_policy_version(uuid), public.request_action(uuid, public.action_kind, numeric, text),
  public.decide_action(uuid, boolean), public.execute_action(uuid) to authenticated;
revoke all on function puls_private.delegation(uuid, uuid) from public;
