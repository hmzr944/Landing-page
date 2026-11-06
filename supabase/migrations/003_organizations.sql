-- Arbor Business : organisations, rôles, invitations, sources versionnées, connaissances traçables,
-- compétences, preuves (ajout seul) et journal d'audit. Voir docs/architecture.md (D1, D4).
--
-- Principes :
-- - Cloisonnement strict : chaque ligne porte org_id ; les clés étrangères composites (id, org_id) empêchent
--   de rattacher une ligne d'une organisation à un parent d'une autre organisation.
-- - L'appartenance est TOUJOURS déduite de auth.uid() côté base (RLS), jamais d'un org_id fourni par le client.
-- - L'espace personnel n'est pas ici : il reste sur l'appareil. Aucun manager ne peut donc y accéder.
-- - Les preuves ne sont écrites que par le serveur (fonctions Edge, rôle service) et ne sont jamais modifiées.
-- - Les opérations sensibles (création, invitation, rôle, validation d'une connaissance) passent par des
--   fonctions qui vérifient le rôle et écrivent dans le journal d'audit.

create schema if not exists arbor_private;
revoke all on schema arbor_private from public;
grant usage on schema arbor_private to authenticated, service_role;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'org_role') then
    create type public.org_role as enum ('admin', 'manager', 'expert', 'member');
  end if;
end $$;

-- ---------- Organisations et membres ----------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  sector text check (char_length(sector) <= 80),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.org_role not null default 'member',
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index if not exists memberships_user on public.memberships (user_id);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null check (email = lower(email) and position('@' in email) > 1),
  role public.org_role not null default 'member',
  token_hash text not null unique, -- seule l'empreinte du jeton est gardée
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

-- ---------- Fonctions d'appartenance (utilisées par les règles d'accès) ----------
create or replace function arbor_private.is_member(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m where m.org_id = p_org and m.user_id = auth.uid() and m.status = 'active');
$$;
create or replace function arbor_private.has_role(p_org uuid, p_roles public.org_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m where m.org_id = p_org and m.user_id = auth.uid() and m.status = 'active' and m.role = any (p_roles));
$$;
revoke all on function arbor_private.is_member(uuid) from public;
revoke all on function arbor_private.has_role(uuid, public.org_role[]) from public;
grant execute on function arbor_private.is_member(uuid) to authenticated, service_role;
grant execute on function arbor_private.has_role(uuid, public.org_role[]) to authenticated, service_role;

-- ---------- Sources, versions, connaissances, compétences ----------
create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  kind text not null default 'pdf' check (kind in ('pdf', 'texte')),
  current_version integer not null default 0,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  unique (id, org_id)
);

create table if not exists public.source_versions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  source_id uuid not null,
  version integer not null check (version >= 1),
  storage_path text, -- fichier dans le stockage privé « org-sources », sous le dossier de l'organisation
  checksum text, -- empreinte du fichier : détecte un document inchangé
  page_count integer,
  uploaded_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  unique (source_id, version),
  unique (id, org_id),
  foreign key (source_id, org_id) references public.sources (id, org_id) on delete cascade,
  check (storage_path is null or storage_path like org_id::text || '/%')
);

create table if not exists public.knowledge_nodes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  source_version_id uuid not null,
  kind text not null check (kind in ('concept', 'regle', 'procedure', 'produit', 'sensible')),
  title text not null check (char_length(title) between 1 and 200),
  body text not null default '' check (char_length(body) <= 6000),
  quote text not null default '' check (char_length(quote) <= 1200), -- extrait exact du document
  page integer,
  confidence numeric(3, 2) check (confidence between 0 and 1), -- confiance de l'extraction automatique
  extracted_by text not null default 'ia' check (extracted_by in ('ia', 'regle', 'humain')),
  status text not null default 'propose' check (status in ('propose', 'valide', 'rejete', 'a_revalider', 'remplace')),
  validated_by uuid references auth.users (id),
  validated_at timestamptz,
  replaces uuid references public.knowledge_nodes (id),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (id, org_id),
  foreign key (source_version_id, org_id) references public.source_versions (id, org_id) on delete cascade
);
create index if not exists knowledge_org_status on public.knowledge_nodes (org_id, status);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  description text not null default '' check (char_length(description) <= 1000),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (id, org_id)
);

create table if not exists public.skill_knowledge (
  org_id uuid not null,
  skill_id uuid not null,
  knowledge_id uuid not null,
  primary key (skill_id, knowledge_id),
  foreign key (skill_id, org_id) references public.skills (id, org_id) on delete cascade,
  foreign key (knowledge_id, org_id) references public.knowledge_nodes (id, org_id) on delete cascade
);

-- ---------- Preuves (ajout seul) ----------
create table if not exists public.evidence_events (
  id bigint generated always as identity primary key,
  org_id uuid not null,
  user_id uuid not null,
  knowledge_id uuid,
  skill_id uuid,
  activity text not null check (activity in ('diagnostic', 'simulation', 'rappel', 'lecon', 'dialogue', 'validation_humaine')),
  outcome text not null check (outcome in ('juste', 'partiel', 'faux')),
  confidence text check (confidence in ('devine', 'sait', 'reflexe')), -- déclarée par la personne, pas une mesure
  source_version_id uuid,
  evaluator text not null check (evaluator in ('regle', 'ia', 'humain')),
  session_id uuid,
  detail jsonb not null default '{}'::jsonb,
  at timestamptz not null default now(),
  foreign key (org_id, user_id) references public.memberships (org_id, user_id),
  foreign key (knowledge_id, org_id) references public.knowledge_nodes (id, org_id),
  foreign key (skill_id, org_id) references public.skills (id, org_id),
  foreign key (source_version_id, org_id) references public.source_versions (id, org_id)
);
create index if not exists evidence_org_user_at on public.evidence_events (org_id, user_id, at desc);

-- Une preuve n'est jamais modifiée. La suppression n'est possible que pour un effacement demandé (RGPD),
-- explicitement autorisé dans la transaction : set local arbor.erasure = 'on'.
create or replace function arbor_private.evidence_append_only() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then raise exception 'une preuve ne se modifie pas : ajoute un nouvel événement'; end if;
  if tg_op = 'DELETE' and coalesce(current_setting('arbor.erasure', true), '') <> 'on' then
    raise exception 'une preuve ne se supprime pas (sauf effacement autorisé)';
  end if;
  return old;
end $$;
drop trigger if exists evidence_append_only on public.evidence_events;
create trigger evidence_append_only before update or delete on public.evidence_events
  for each row execute function arbor_private.evidence_append_only();

-- ---------- Journal d'audit ----------
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations (id) on delete cascade,
  actor uuid,
  action text not null,
  target text,
  detail jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);
create index if not exists audit_org_at on public.audit_logs (org_id, at desc);

create or replace function arbor_private.audit(p_org uuid, p_action text, p_target text, p_detail jsonb default '{}'::jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_logs (org_id, actor, action, target, detail) values (p_org, auth.uid(), p_action, p_target, coalesce(p_detail, '{}'::jsonb));
$$;
revoke all on function arbor_private.audit(uuid, text, text, jsonb) from public;

-- ---------- Règles d'accès (RLS) ----------
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.sources enable row level security;
alter table public.source_versions enable row level security;
alter table public.knowledge_nodes enable row level security;
alter table public.skills enable row level security;
alter table public.skill_knowledge enable row level security;
alter table public.evidence_events enable row level security;
alter table public.audit_logs enable row level security;

-- Le navigateur ne passe jamais par le rôle anonyme pour ces tables
revoke all on public.organizations, public.memberships, public.invitations, public.sources, public.source_versions,
  public.knowledge_nodes, public.skills, public.skill_knowledge, public.evidence_events, public.audit_logs from anon, authenticated;

-- Lecture
grant select on public.organizations, public.memberships, public.invitations, public.sources, public.source_versions,
  public.knowledge_nodes, public.skills, public.skill_knowledge, public.evidence_events, public.audit_logs to authenticated;

drop policy if exists org_read on public.organizations;
create policy org_read on public.organizations for select to authenticated using (arbor_private.is_member(id));

drop policy if exists member_read on public.memberships;
create policy member_read on public.memberships for select to authenticated
  using (user_id = auth.uid() or arbor_private.has_role(org_id, array['admin', 'manager']::public.org_role[]));

drop policy if exists invitation_read on public.invitations;
create policy invitation_read on public.invitations for select to authenticated
  using (arbor_private.has_role(org_id, array['admin', 'manager']::public.org_role[]));

-- Contenu : l'équipe de contenu (admin, manager, expert) voit tout ; un collaborateur ne voit que le validé
drop policy if exists source_read on public.sources;
create policy source_read on public.sources for select to authenticated
  using (arbor_private.has_role(org_id, array['admin', 'manager', 'expert']::public.org_role[]));
drop policy if exists version_read on public.source_versions;
create policy version_read on public.source_versions for select to authenticated
  using (arbor_private.has_role(org_id, array['admin', 'manager', 'expert']::public.org_role[]));
drop policy if exists knowledge_read on public.knowledge_nodes;
create policy knowledge_read on public.knowledge_nodes for select to authenticated
  using (arbor_private.has_role(org_id, array['admin', 'manager', 'expert']::public.org_role[])
         or (status = 'valide' and arbor_private.is_member(org_id)));
drop policy if exists skill_read on public.skills;
create policy skill_read on public.skills for select to authenticated using (arbor_private.is_member(org_id));
drop policy if exists skill_knowledge_read on public.skill_knowledge;
create policy skill_knowledge_read on public.skill_knowledge for select to authenticated using (arbor_private.is_member(org_id));

-- Preuves : chacun voit les siennes ; admin et manager voient celles de leur organisation (contexte professionnel seulement)
drop policy if exists evidence_read on public.evidence_events;
create policy evidence_read on public.evidence_events for select to authenticated
  using (user_id = auth.uid() or arbor_private.has_role(org_id, array['admin', 'manager']::public.org_role[]));

drop policy if exists audit_read on public.audit_logs;
create policy audit_read on public.audit_logs for select to authenticated
  using (arbor_private.has_role(org_id, array['admin']::public.org_role[]));

-- Écriture directe : seulement le contenu, par l'équipe de contenu de l'organisation, en son propre nom
grant insert on public.sources, public.skills to authenticated;
grant insert (org_id, source_id, version, storage_path, checksum, page_count, uploaded_by) on public.source_versions to authenticated;
grant insert (org_id, source_version_id, kind, title, body, quote, page, confidence, extracted_by, created_by) on public.knowledge_nodes to authenticated;
grant update (title, body, kind, page) on public.knowledge_nodes to authenticated;
grant insert on public.skill_knowledge to authenticated;
grant delete on public.skill_knowledge to authenticated;

drop policy if exists source_write on public.sources;
create policy source_write on public.sources for insert to authenticated
  with check (created_by = auth.uid() and arbor_private.has_role(org_id, array['admin', 'manager', 'expert']::public.org_role[]));
drop policy if exists version_write on public.source_versions;
create policy version_write on public.source_versions for insert to authenticated
  with check (uploaded_by = auth.uid() and arbor_private.has_role(org_id, array['admin', 'manager', 'expert']::public.org_role[]));
drop policy if exists knowledge_write on public.knowledge_nodes;
create policy knowledge_write on public.knowledge_nodes for insert to authenticated
  with check (created_by = auth.uid() and arbor_private.has_role(org_id, array['admin', 'manager', 'expert']::public.org_role[]));
drop policy if exists knowledge_edit on public.knowledge_nodes;
create policy knowledge_edit on public.knowledge_nodes for update to authenticated
  using (arbor_private.has_role(org_id, array['admin', 'manager', 'expert']::public.org_role[]))
  with check (arbor_private.has_role(org_id, array['admin', 'manager', 'expert']::public.org_role[]));
drop policy if exists skill_write on public.skills;
create policy skill_write on public.skills for insert to authenticated
  with check (created_by = auth.uid() and arbor_private.has_role(org_id, array['admin', 'manager']::public.org_role[]));
drop policy if exists skill_knowledge_write on public.skill_knowledge;
create policy skill_knowledge_write on public.skill_knowledge for insert to authenticated
  with check (arbor_private.has_role(org_id, array['admin', 'manager']::public.org_role[]));
drop policy if exists skill_knowledge_delete on public.skill_knowledge;
create policy skill_knowledge_delete on public.skill_knowledge for delete to authenticated
  using (arbor_private.has_role(org_id, array['admin', 'manager']::public.org_role[]));

-- Une connaissance modifiée à la main redevient « à revalider » ; le texte d'une connaissance validée ne change pas en silence
create or replace function arbor_private.knowledge_edit_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- (pas de réglage de session pour contourner : n'importe quel client pourrait le poser)
  if (new.title, new.body, new.kind, new.page) is distinct from (old.title, old.body, old.kind, old.page) and old.status = 'valide' then
    new.status := 'a_revalider'; new.validated_by := null; new.validated_at := null;
  end if;
  return new;
end $$;
drop trigger if exists knowledge_edit_guard on public.knowledge_nodes;
create trigger knowledge_edit_guard before update on public.knowledge_nodes
  for each row execute function arbor_private.knowledge_edit_guard();

-- ---------- Opérations sensibles (fonctions contrôlées et journalisées) ----------
create or replace function public.create_organization(p_name text, p_sector text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  insert into public.organizations (name, sector, created_by) values (trim(p_name), nullif(trim(p_sector), ''), auth.uid()) returning id into v_org;
  insert into public.memberships (org_id, user_id, role) values (v_org, auth.uid(), 'admin');
  perform arbor_private.audit(v_org, 'organisation.creee', v_org::text, jsonb_build_object('name', p_name));
  return v_org;
end $$;

-- Renvoie le jeton une seule fois ; seule son empreinte est stockée
create or replace function public.create_invitation(p_org uuid, p_email text, p_role public.org_role default 'member') returns text
language plpgsql security definer set search_path = '' as $$
declare v_token text;
begin
  if not arbor_private.has_role(p_org, array['admin', 'manager']::public.org_role[]) then raise exception 'accès refusé'; end if;
  if p_role = 'admin' and not arbor_private.has_role(p_org, array['admin']::public.org_role[]) then raise exception 'seul un administrateur peut inviter un administrateur'; end if;
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.invitations (org_id, email, role, token_hash, created_by)
    values (p_org, lower(trim(p_email)), p_role, encode(extensions.digest(v_token, 'sha256'), 'hex'), auth.uid());
  perform arbor_private.audit(p_org, 'invitation.creee', lower(trim(p_email)), jsonb_build_object('role', p_role));
  return v_token;
end $$;

-- L'invitation n'est valable que pour l'adresse e-mail invitée, une seule fois, avant expiration
create or replace function public.accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_inv public.invitations; v_email text;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  select * into v_inv from public.invitations where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') for update;
  if not found or v_inv.accepted_at is not null or v_inv.expires_at < now() then raise exception 'invitation invalide ou expirée'; end if;
  if v_inv.email <> v_email then raise exception 'cette invitation est destinée à une autre adresse'; end if;
  insert into public.memberships (org_id, user_id, role) values (v_inv.org_id, auth.uid(), v_inv.role)
    on conflict (org_id, user_id) do update set status = 'active';
  update public.invitations set accepted_at = now(), accepted_by = auth.uid() where id = v_inv.id;
  perform arbor_private.audit(v_inv.org_id, 'invitation.acceptee', auth.uid()::text, jsonb_build_object('role', v_inv.role));
  return v_inv.org_id;
end $$;

-- Valider, rejeter, remettre en revalidation. Une connaissance « sensible » ne se valide que par admin ou manager.
create or replace function public.set_knowledge_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_k public.knowledge_nodes;
begin
  select * into v_k from public.knowledge_nodes where id = p_id for update;
  if not found then raise exception 'connaissance introuvable'; end if;
  if p_status not in ('valide', 'rejete', 'a_revalider', 'propose') then raise exception 'statut invalide'; end if;
  if not arbor_private.has_role(v_k.org_id, case when v_k.kind = 'sensible' then array['admin', 'manager']::public.org_role[] else array['admin', 'manager', 'expert']::public.org_role[] end) then
    raise exception 'accès refusé';
  end if;
  update public.knowledge_nodes set status = p_status,
    validated_by = case when p_status = 'valide' then auth.uid() end,
    validated_at = case when p_status = 'valide' then now() end
  where id = p_id;
  perform arbor_private.audit(v_k.org_id, 'connaissance.' || p_status, p_id::text, jsonb_build_object('kind', v_k.kind, 'avant', v_k.status));
end $$;

-- Changer un rôle ou suspendre un membre (administrateur seulement ; il reste toujours un administrateur actif)
create or replace function public.set_member(p_org uuid, p_user uuid, p_role public.org_role, p_status text default 'active') returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not arbor_private.has_role(p_org, array['admin']::public.org_role[]) then raise exception 'accès refusé'; end if;
  if p_status not in ('active', 'suspended') then raise exception 'statut invalide'; end if;
  update public.memberships set role = p_role, status = p_status where org_id = p_org and user_id = p_user;
  if not found then raise exception 'membre introuvable'; end if;
  if not exists (select 1 from public.memberships where org_id = p_org and role = 'admin' and status = 'active') then
    raise exception 'il faut au moins un administrateur actif';
  end if;
  perform arbor_private.audit(p_org, 'membre.modifie', p_user::text, jsonb_build_object('role', p_role, 'status', p_status));
end $$;

revoke all on function public.create_organization(text, text) from public, anon;
revoke all on function public.create_invitation(uuid, text, public.org_role) from public, anon;
revoke all on function public.accept_invitation(text) from public, anon;
revoke all on function public.set_knowledge_status(uuid, text) from public, anon;
revoke all on function public.set_member(uuid, uuid, public.org_role, text) from public, anon;
grant execute on function public.create_organization(text, text) to authenticated;
grant execute on function public.create_invitation(uuid, text, public.org_role) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.set_knowledge_status(uuid, text) to authenticated;
grant execute on function public.set_member(uuid, uuid, public.org_role, text) to authenticated;

-- Le serveur (rôle service) écrit les preuves après évaluation ; il lit tout pour calculer les diagnostics
grant all on public.organizations, public.memberships, public.invitations, public.sources, public.source_versions,
  public.knowledge_nodes, public.skills, public.skill_knowledge, public.evidence_events, public.audit_logs to service_role;

-- ---------- Stockage privé des documents (si le module Storage de Supabase est présent) ----------
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('org-sources', 'org-sources', false) on conflict (id) do nothing;
    execute 'drop policy if exists org_sources_read on storage.objects';
    execute $p$create policy org_sources_read on storage.objects for select to authenticated
      using (bucket_id = 'org-sources' and arbor_private.has_role(((storage.foldername(name))[1])::uuid, array['admin', 'manager', 'expert']::public.org_role[]))$p$;
    execute 'drop policy if exists org_sources_write on storage.objects';
    execute $p$create policy org_sources_write on storage.objects for insert to authenticated
      with check (bucket_id = 'org-sources' and arbor_private.has_role(((storage.foldername(name))[1])::uuid, array['admin', 'manager', 'expert']::public.org_role[]))$p$;
  end if;
end $$;
