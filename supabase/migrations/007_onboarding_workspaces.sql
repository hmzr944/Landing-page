-- Arbor : compte unique, deux espaces, onboarding reprenable (docs/onboarding.md).
-- - profiles : prénom et étapes d'onboarding franchies, pour reprendre sur un autre appareil.
--   Aucun contenu d'apprentissage personnel ici (D1 : cours, révisions, preuves personnelles restent sur l'appareil).
-- - Organisation : taille, pays, langue, objectifs, progression de l'assistant ; propriétaire protégé.
-- - Équipes et établissements (org_units), rattachement des membres et des invitations.
-- - Invitations : annulation conservée (revoked_at), aperçu avant connexion, « déjà membre » distingué.
-- - Compétences : importance, équipes concernées, modification et suppression.
-- - Parcours collaborateur : memberships.onboarded_at.
-- Rejouable : chaque objet est créé « si absent » ou remplacé.

-- ---------- Profil ----------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 80),
  onboarding jsonb not null default '{}'::jsonb check (jsonb_typeof(onboarding) = 'object' and pg_column_size(onboarding) <= 4000),
  last_space text check (last_space is null or last_space = 'personal' or last_space ~ '^[0-9a-f-]{36}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select, insert, update (display_name, onboarding, last_space, updated_at) on public.profiles to authenticated;
drop policy if exists profile_read on public.profiles;
create policy profile_read on public.profiles for select to authenticated using (user_id = auth.uid());
drop policy if exists profile_insert on public.profiles;
create policy profile_insert on public.profiles for insert to authenticated with check (user_id = auth.uid());
drop policy if exists profile_update on public.profiles;
create policy profile_update on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Organisation : informations et assistant ----------
alter table public.organizations add column if not exists size text check (size is null or size in ('1-10', '11-50', '51-250', '251-1000', '1000+'));
alter table public.organizations add column if not exists country text check (country is null or char_length(country) <= 60);
alter table public.organizations add column if not exists language text not null default 'fr' check (char_length(language) between 2 and 12);
alter table public.organizations add column if not exists goals text[] not null default '{}' check (cardinality(goals) <= 12);
alter table public.organizations add column if not exists setup jsonb not null default '{}'::jsonb check (jsonb_typeof(setup) = 'object' and pg_column_size(setup) <= 2000);

-- Le propriétaire est le créateur de l'organisation
create or replace function arbor_private.is_owner(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organizations o where o.id = p_org and o.created_by = auth.uid());
$$;
revoke all on function arbor_private.is_owner(uuid) from public;
grant execute on function arbor_private.is_owner(uuid) to authenticated, service_role;

create or replace function public.update_organization(p_org uuid, p_name text default null, p_sector text default null, p_size text default null,
  p_country text default null, p_language text default null, p_goals text[] default null, p_setup jsonb default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not arbor_private.has_role(p_org, array['admin']::public.org_role[]) then raise exception 'accès refusé'; end if;
  update public.organizations set
    name = coalesce(nullif(trim(p_name), ''), name),
    sector = case when p_sector is null then sector else nullif(trim(p_sector), '') end,
    size = case when p_size is null then size else nullif(p_size, '') end,
    country = case when p_country is null then country else nullif(trim(p_country), '') end,
    language = coalesce(nullif(trim(p_language), ''), language),
    goals = coalesce(p_goals, goals),
    setup = case when p_setup is null then setup else setup || p_setup end
  where id = p_org;
  perform arbor_private.audit(p_org, 'organisation.modifiee', p_org::text,
    jsonb_strip_nulls(jsonb_build_object('name', p_name, 'sector', p_sector, 'size', p_size, 'country', p_country, 'language', p_language, 'goals', p_goals, 'setup', p_setup)));
end $$;

-- Créer une organisation avec ses informations de départ (remplace la version à deux paramètres)
drop function if exists public.create_organization(text, text);
create or replace function public.create_organization(p_name text, p_sector text default null, p_size text default null,
  p_country text default null, p_language text default 'fr') returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  insert into public.organizations (name, sector, size, country, language, created_by)
    values (trim(p_name), nullif(trim(p_sector), ''), nullif(p_size, ''), nullif(trim(p_country), ''), coalesce(nullif(trim(p_language), ''), 'fr'), auth.uid())
    returning id into v_org;
  insert into public.memberships (org_id, user_id, role, email) values (v_org, auth.uid(), 'admin', nullif(lower(coalesce(auth.jwt() ->> 'email', '')), ''));
  perform arbor_private.audit(v_org, 'organisation.creee', v_org::text, jsonb_build_object('name', p_name));
  return v_org;
end $$;

-- ---------- Équipes et établissements ----------
create table if not exists public.org_units (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  kind text not null check (kind in ('equipe', 'etablissement')),
  name text not null check (char_length(trim(name)) between 1 and 80),
  parent_id uuid,
  created_at timestamptz not null default now(),
  unique (id, org_id),
  unique (org_id, kind, name),
  foreign key (parent_id, org_id) references public.org_units (id, org_id) on delete set null (parent_id)
);
alter table public.org_units enable row level security;
revoke all on public.org_units from anon, authenticated;
grant select on public.org_units to authenticated;
drop policy if exists unit_read on public.org_units;
create policy unit_read on public.org_units for select to authenticated using (arbor_private.is_member(org_id));

alter table public.memberships add column if not exists unit_id uuid;
alter table public.memberships add column if not exists onboarded_at timestamptz;
alter table public.invitations add column if not exists unit_id uuid;
alter table public.invitations add column if not exists revoked_at timestamptz;
-- les colonnes lisibles des invitations sont listées une à une (004 : l'empreinte du jeton reste illisible)
grant select (unit_id, revoked_at) on public.invitations to authenticated;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'memberships_unit_fk') then
    alter table public.memberships add constraint memberships_unit_fk foreign key (unit_id, org_id) references public.org_units (id, org_id) on delete set null (unit_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'invitations_unit_fk') then
    alter table public.invitations add constraint invitations_unit_fk foreign key (unit_id, org_id) references public.org_units (id, org_id) on delete set null (unit_id);
  end if;
end $$;

create or replace function public.save_unit(p_org uuid, p_kind text, p_name text, p_id uuid default null, p_parent uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not arbor_private.has_role(p_org, array['admin']::public.org_role[]) then raise exception 'accès refusé'; end if;
  if p_id is null then
    insert into public.org_units (org_id, kind, name, parent_id) values (p_org, p_kind, trim(p_name), p_parent) returning id into v_id;
  else
    update public.org_units set name = trim(p_name), parent_id = p_parent where id = p_id and org_id = p_org returning id into v_id;
    if v_id is null then raise exception 'équipe introuvable'; end if;
  end if;
  perform arbor_private.audit(p_org, 'unite.enregistree', v_id::text, jsonb_build_object('kind', p_kind, 'name', p_name));
  return v_id;
exception when unique_violation then raise exception 'ce nom existe déjà';
end $$;

create or replace function public.delete_unit(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_u public.org_units;
begin
  select * into v_u from public.org_units where id = p_id;
  if not found then raise exception 'équipe introuvable'; end if;
  if not arbor_private.has_role(v_u.org_id, array['admin']::public.org_role[]) then raise exception 'accès refusé'; end if;
  delete from public.org_units where id = p_id;
  perform arbor_private.audit(v_u.org_id, 'unite.supprimee', p_id::text, jsonb_build_object('name', v_u.name));
end $$;

-- Rattacher un membre à une équipe (admin, ou manager pour les membres non administrateurs)
create or replace function public.set_member_unit(p_org uuid, p_user uuid, p_unit uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not arbor_private.has_role(p_org, array['admin', 'manager']::public.org_role[]) then raise exception 'accès refusé'; end if;
  if not arbor_private.has_role(p_org, array['admin']::public.org_role[])
     and exists (select 1 from public.memberships where org_id = p_org and user_id = p_user and role = 'admin') then
    raise exception 'accès refusé';
  end if;
  update public.memberships set unit_id = p_unit where org_id = p_org and user_id = p_user;
  if not found then raise exception 'membre introuvable'; end if;
  perform arbor_private.audit(p_org, 'membre.equipe', p_user::text, jsonb_build_object('unit', p_unit));
end $$;

-- Le propriétaire reste administrateur actif ; seul un administrateur change un rôle
create or replace function public.set_member(p_org uuid, p_user uuid, p_role public.org_role, p_status text default 'active') returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not arbor_private.has_role(p_org, array['admin']::public.org_role[]) then raise exception 'accès refusé'; end if;
  if p_status not in ('active', 'suspended') then raise exception 'statut invalide'; end if;
  if exists (select 1 from public.organizations where id = p_org and created_by = p_user) and (p_role <> 'admin' or p_status <> 'active') then
    raise exception 'le propriétaire reste administrateur';
  end if;
  update public.memberships set role = p_role, status = p_status where org_id = p_org and user_id = p_user;
  if not found then raise exception 'membre introuvable'; end if;
  if not exists (select 1 from public.memberships where org_id = p_org and role = 'admin' and status = 'active') then
    raise exception 'il faut au moins un administrateur actif';
  end if;
  perform arbor_private.audit(p_org, 'membre.modifie', p_user::text, jsonb_build_object('role', p_role, 'status', p_status));
end $$;

-- ---------- Mes espaces (avec propriétaire, équipe, parcours collaborateur, assistant) ----------
drop function if exists public.my_organizations();
create or replace function public.my_organizations() returns table (id uuid, name text, sector text, role public.org_role, owner boolean,
  unit text, onboarded boolean, setup jsonb)
language sql stable security definer set search_path = '' as $$
  select o.id, o.name, o.sector, m.role, o.created_by = auth.uid(), u.name, m.onboarded_at is not null, o.setup
  from public.memberships m join public.organizations o on o.id = m.org_id
  left join public.org_units u on u.id = m.unit_id and u.org_id = m.org_id
  where m.user_id = auth.uid() and m.status = 'active'
  order by o.name;
$$;

create or replace function public.mark_onboarded(p_org uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.memberships set onboarded_at = coalesce(onboarded_at, now()) where org_id = p_org and user_id = auth.uid() and status = 'active';
  if not found then raise exception 'accès refusé'; end if;
end $$;

-- ---------- Invitations v2 ----------
drop function if exists public.create_invitation(uuid, text, public.org_role);
create or replace function public.create_invitation(p_org uuid, p_email text, p_role public.org_role default 'member', p_unit uuid default null) returns text
language plpgsql security definer set search_path = '' as $$
declare v_token text; v_email text := lower(trim(p_email));
begin
  if not arbor_private.has_role(p_org, array['admin', 'manager']::public.org_role[]) then raise exception 'accès refusé'; end if;
  if p_role = 'admin' and not arbor_private.has_role(p_org, array['admin']::public.org_role[]) then raise exception 'seul un administrateur peut inviter un administrateur'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'adresse e-mail invalide'; end if;
  if exists (select 1 from public.memberships where org_id = p_org and email = v_email and status = 'active') then
    raise exception 'cette personne fait déjà partie de l’organisation';
  end if;
  if p_unit is not null and not exists (select 1 from public.org_units where id = p_unit and org_id = p_org) then raise exception 'équipe introuvable'; end if;
  -- une seule invitation en attente par adresse : la précédente est annulée
  update public.invitations set revoked_at = now() where org_id = p_org and email = v_email and accepted_at is null and revoked_at is null;
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.invitations (org_id, email, role, unit_id, token_hash, created_by)
    values (p_org, v_email, p_role, p_unit, encode(extensions.digest(v_token, 'sha256'), 'hex'), auth.uid());
  perform arbor_private.audit(p_org, 'invitation.creee', v_email, jsonb_build_object('role', p_role, 'unit', p_unit));
  return v_token;
end $$;

-- Ce que montre un lien d'invitation avant de se connecter : l'organisation, le rôle, l'adresse masquée, le statut.
-- Le jeton (192 bits) est le secret : sans lui, rien n'est lisible.
create or replace function public.invitation_preview(p_token text) returns table (org_name text, role public.org_role, unit text, email_hint text, status text)
language sql stable security definer set search_path = '' as $$
  select o.name, i.role, u.name,
    left(i.email, 2) || repeat('•', greatest(char_length(split_part(i.email, '@', 1)) - 2, 1)) || '@' || split_part(i.email, '@', 2),
    case when i.revoked_at is not null then 'annulee' when i.accepted_at is not null then 'utilisee' when i.expires_at < now() then 'expiree' else 'valide' end
  from public.invitations i join public.organizations o on o.id = i.org_id
  left join public.org_units u on u.id = i.unit_id and u.org_id = i.org_id
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

create or replace function public.accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_inv public.invitations; v_email text;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  select * into v_inv from public.invitations where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') for update;
  if not found then raise exception 'invitation invalide'; end if;
  if v_inv.revoked_at is not null then raise exception 'invitation annulée'; end if;
  if v_inv.accepted_at is not null then
    if v_inv.accepted_by = auth.uid() and exists (select 1 from public.memberships where org_id = v_inv.org_id and user_id = auth.uid() and status = 'active') then
      return v_inv.org_id; -- déjà membre grâce à ce lien : on retrouve simplement l'organisation
    end if;
    raise exception 'invitation déjà utilisée';
  end if;
  if v_inv.expires_at < now() then raise exception 'invitation expirée'; end if;
  if v_inv.email <> v_email then raise exception 'cette invitation est destinée à une autre adresse'; end if;
  insert into public.memberships (org_id, user_id, role, email, unit_id) values (v_inv.org_id, auth.uid(), v_inv.role, v_email, v_inv.unit_id)
    on conflict (org_id, user_id) do update set status = 'active', email = excluded.email, unit_id = coalesce(excluded.unit_id, public.memberships.unit_id);
  update public.invitations set accepted_at = now(), accepted_by = auth.uid() where id = v_inv.id;
  perform arbor_private.audit(v_inv.org_id, 'invitation.acceptee', auth.uid()::text, jsonb_build_object('role', v_inv.role));
  return v_inv.org_id;
end $$;

-- Annuler garde une trace : le lien affiche « annulée » au lieu d'« invalide »
create or replace function public.revoke_invitation(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_inv public.invitations;
begin
  select * into v_inv from public.invitations where id = p_id for update;
  if not found then raise exception 'invitation introuvable'; end if;
  if not arbor_private.has_role(v_inv.org_id, array['admin', 'manager']::public.org_role[]) then raise exception 'accès refusé'; end if;
  if v_inv.accepted_at is not null then raise exception 'invitation déjà utilisée'; end if;
  update public.invitations set revoked_at = coalesce(revoked_at, now()) where id = p_id;
  perform arbor_private.audit(v_inv.org_id, 'invitation.annulee', v_inv.email, jsonb_build_object('role', v_inv.role));
end $$;

-- ---------- Compétences : importance, équipes concernées, modification ----------
alter table public.skills add column if not exists importance smallint not null default 2 check (importance between 1 and 3);
create table if not exists public.skill_units (
  org_id uuid not null,
  skill_id uuid not null,
  unit_id uuid not null,
  primary key (skill_id, unit_id),
  foreign key (skill_id, org_id) references public.skills (id, org_id) on delete cascade,
  foreign key (unit_id, org_id) references public.org_units (id, org_id) on delete cascade
);
alter table public.skill_units enable row level security;
revoke all on public.skill_units from anon, authenticated;
grant select, insert, delete on public.skill_units to authenticated;
drop policy if exists skill_units_read on public.skill_units;
create policy skill_units_read on public.skill_units for select to authenticated using (arbor_private.is_member(org_id));
drop policy if exists skill_units_write on public.skill_units;
create policy skill_units_write on public.skill_units for insert to authenticated with check (arbor_private.has_role(org_id, array['admin', 'manager']::public.org_role[]));
drop policy if exists skill_units_delete on public.skill_units;
create policy skill_units_delete on public.skill_units for delete to authenticated using (arbor_private.has_role(org_id, array['admin', 'manager']::public.org_role[]));

grant update (name, description, importance) on public.skills to authenticated;
grant delete on public.skills to authenticated;
drop policy if exists skill_edit on public.skills;
create policy skill_edit on public.skills for update to authenticated
  using (arbor_private.has_role(org_id, array['admin', 'manager']::public.org_role[]))
  with check (arbor_private.has_role(org_id, array['admin', 'manager']::public.org_role[]));
drop policy if exists skill_delete on public.skills;
create policy skill_delete on public.skills for delete to authenticated
  using (arbor_private.has_role(org_id, array['admin', 'manager']::public.org_role[]));

-- ---------- Journal des appels : nouvelle tâche « structurer » (introduction Student) ----------
alter table public.ai_calls drop constraint if exists ai_calls_mode_check;
alter table public.ai_calls add constraint ai_calls_mode_check
  check (mode in ('socratique', 'enseigne', 'enrichir', 'rediger_cours', 'rediger_notion', 'extraire', 'competences', 'diagnostic', 'mystere', 'structurer'));

-- ---------- Droits d'exécution ----------
revoke all on function public.update_organization(uuid, text, text, text, text, text, text[], jsonb) from public, anon;
revoke all on function public.create_organization(text, text, text, text, text) from public, anon;
revoke all on function public.save_unit(uuid, text, text, uuid, uuid) from public, anon;
revoke all on function public.delete_unit(uuid) from public, anon;
revoke all on function public.set_member_unit(uuid, uuid, uuid) from public, anon;
revoke all on function public.set_member(uuid, uuid, public.org_role, text) from public, anon;
revoke all on function public.my_organizations() from public, anon;
revoke all on function public.mark_onboarded(uuid) from public, anon;
revoke all on function public.create_invitation(uuid, text, public.org_role, uuid) from public, anon;
revoke all on function public.accept_invitation(text) from public, anon;
revoke all on function public.revoke_invitation(uuid) from public, anon;
revoke all on function public.invitation_preview(text) from public;
grant execute on function public.update_organization(uuid, text, text, text, text, text, text[], jsonb) to authenticated;
grant execute on function public.create_organization(text, text, text, text, text) to authenticated;
grant execute on function public.save_unit(uuid, text, text, uuid, uuid) to authenticated;
grant execute on function public.delete_unit(uuid) to authenticated;
grant execute on function public.set_member_unit(uuid, uuid, uuid) to authenticated;
grant execute on function public.set_member(uuid, uuid, public.org_role, text) to authenticated;
grant execute on function public.my_organizations() to authenticated;
grant execute on function public.mark_onboarded(uuid) to authenticated;
grant execute on function public.create_invitation(uuid, text, public.org_role, uuid) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.revoke_invitation(uuid) to authenticated;
grant execute on function public.invitation_preview(text) to anon, authenticated;
