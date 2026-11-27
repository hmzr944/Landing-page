-- 013 · Entrer dans une organisation sans lien d'invitation (Arbor 3, docs/arbor-3-recherche.md § 4)
-- Deux portes :
--  A. Rattachement automatique : le responsable déclare des adresses ou un domaine autorisés (avec un rôle et, au
--     besoin, un site ou pôle). La personne se connecte avec SON compte ; dès que son adresse est VÉRIFIÉE, elle est
--     rattachée (claim_memberships). Jamais le rôle d'administrateur par ce moyen. Domaines de messagerie publique refusés.
--  B. Pass d'équipe éphémère : un code court (6 caractères, QR possible), valable 1 à 60 minutes (15 par défaut), pour
--     un nombre limité de personnes, rattaché à un site/pôle et à un libellé. Seule l'empreinte du code est gardée et
--     elle n'est lisible par personne. Au plus 10 tentatives ratées par heure et par compte.
-- Les liens d'invitation déjà envoyés restent acceptés (accept_invitation inchangé) ; l'interface n'en crée plus.
-- Rejouable sans erreur.

-- ---------- A. Adresses et domaines autorisés ----------
create table if not exists public.org_access_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  kind text not null check (kind in ('email', 'domain')),
  value text not null check (value = lower(value) and char_length(value) between 3 and 254),
  role public.org_role not null default 'member' check (role <> 'admin'),
  unit_id uuid,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  unique (org_id, kind, value)
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'org_access_rules_unit_fk') then
    alter table public.org_access_rules add constraint org_access_rules_unit_fk foreign key (unit_id, org_id) references public.org_units (id, org_id) on delete set null (unit_id);
  end if;
end $$;
create index if not exists org_access_rules_value on public.org_access_rules (kind, value);
alter table public.org_access_rules enable row level security;
revoke all on public.org_access_rules from anon, authenticated;
grant select on public.org_access_rules to authenticated;
drop policy if exists access_read on public.org_access_rules;
create policy access_read on public.org_access_rules for select to authenticated using (arbor_private.has_role(org_id, array['admin', 'manager']::public.org_role[]));

-- Domaines ouverts à tous : les autoriser reviendrait à ouvrir l'organisation à n'importe qui
create or replace function arbor_private.public_mail_domain(p_domain text) returns boolean
language sql immutable set search_path = '' as $$
  select lower(p_domain) = any (array['gmail.com', 'googlemail.com', 'outlook.com', 'outlook.fr', 'hotmail.com', 'hotmail.fr', 'live.com', 'live.fr', 'msn.com',
    'yahoo.com', 'yahoo.fr', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'gmx.com', 'gmx.fr', 'proton.me', 'protonmail.com', 'pm.me', 'free.fr', 'orange.fr',
    'wanadoo.fr', 'sfr.fr', 'neuf.fr', 'laposte.net', 'bbox.fr', 'numericable.fr', 'yandex.com', 'mail.com', 'zoho.com', 'tutanota.com', 'hey.com']);
$$;

create or replace function public.add_access_rule(p_org uuid, p_kind text, p_value text, p_role public.org_role default 'member', p_unit uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v text := lower(trim(p_value)); v_id uuid;
begin
  if not arbor_private.has_role(p_org, array['admin', 'manager']::public.org_role[]) then raise exception 'accès refusé'; end if;
  if p_kind not in ('email', 'domain') then raise exception 'type inconnu'; end if;
  if p_role = 'admin' then raise exception 'le rôle d’administrateur ne s’attribue jamais automatiquement'; end if;
  if p_role = 'manager' and not arbor_private.has_role(p_org, array['admin']::public.org_role[]) then raise exception 'seul un administrateur peut autoriser des managers'; end if;
  if p_kind = 'domain' then
    v := regexp_replace(v, '^@', '');
    if not arbor_private.has_role(p_org, array['admin']::public.org_role[]) then raise exception 'seul un administrateur peut autoriser un domaine entier'; end if;
    if v !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$' then raise exception 'domaine invalide'; end if;
    if arbor_private.public_mail_domain(v) then raise exception 'domaine de messagerie publique : autorise plutôt des adresses une par une'; end if;
  elsif v !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'adresse e-mail invalide';
  end if;
  if p_unit is not null and not exists (select 1 from public.org_units where id = p_unit and org_id = p_org) then raise exception 'site ou pôle introuvable'; end if;
  insert into public.org_access_rules (org_id, kind, value, role, unit_id, created_by) values (p_org, p_kind, v, p_role, p_unit, auth.uid())
    on conflict (org_id, kind, value) do update set role = excluded.role, unit_id = excluded.unit_id returning id into v_id;
  perform arbor_private.audit(p_org, 'acces.regle_ajoutee', v, jsonb_build_object('type', p_kind, 'role', p_role, 'unit', p_unit));
  return v_id;
end $$;

create or replace function public.remove_access_rule(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.org_access_rules;
begin
  select * into r from public.org_access_rules where id = p_id;
  if r.id is null or not arbor_private.has_role(r.org_id, array['admin', 'manager']::public.org_role[]) then raise exception 'accès refusé'; end if;
  if r.kind = 'domain' and not arbor_private.has_role(r.org_id, array['admin']::public.org_role[]) then raise exception 'seul un administrateur peut retirer un domaine'; end if;
  delete from public.org_access_rules where id = p_id;
  perform arbor_private.audit(r.org_id, 'acces.regle_retiree', r.value, jsonb_build_object('type', r.kind));
end $$;

-- Rattachement : appelé par l'application à chaque connexion. Adresse non vérifiée : rien. Déjà membre (même
-- suspendu) : rien ne change (une suspension ne se contourne pas par une règle). Règle nominative prioritaire.
create or replace function public.claim_memberships() returns table (org_id uuid, org_name text, role public.org_role)
language plpgsql security definer set search_path = '' as $$
declare v_email text; v_conf timestamptz; r record;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  select lower(u.email), u.email_confirmed_at into v_email, v_conf from auth.users u where u.id = auth.uid();
  if v_email is null or v_conf is null then return; end if;
  for r in
    select distinct on (a.org_id) a.org_id, a.role, a.unit_id, a.kind from public.org_access_rules a
    where (a.kind = 'email' and a.value = v_email) or (a.kind = 'domain' and a.value = split_part(v_email, '@', 2))
    order by a.org_id, (a.kind = 'email') desc
  loop
    if not exists (select 1 from public.memberships m where m.org_id = r.org_id and m.user_id = auth.uid()) then
      insert into public.memberships (org_id, user_id, role, email, unit_id) values (r.org_id, auth.uid(), r.role, v_email, r.unit_id);
      perform arbor_private.audit(r.org_id, 'membre.rattache_auto', v_email, jsonb_build_object('regle', r.kind, 'role', r.role));
      org_id := r.org_id; role := r.role; select o.name into org_name from public.organizations o where o.id = r.org_id;
      return next;
    end if;
  end loop;
end $$;

-- ---------- B. Pass d'équipe éphémère ----------
create table if not exists public.team_passes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  code_hash text not null unique,
  label text check (label is null or char_length(label) <= 80),
  unit_id uuid,
  max_uses int not null check (max_uses between 1 and 500),
  uses int not null default 0 check (uses >= 0),
  expires_at timestamptz not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (uses <= max_uses)
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'team_passes_unit_fk') then
    alter table public.team_passes add constraint team_passes_unit_fk foreign key (unit_id, org_id) references public.org_units (id, org_id) on delete set null (unit_id);
  end if;
end $$;
alter table public.team_passes enable row level security;
revoke all on public.team_passes from anon, authenticated;
-- l'empreinte d'un code de 6 caractères se retrouve par essais : elle n'est jamais lisible
grant select (id, org_id, label, unit_id, max_uses, uses, expires_at, created_by, created_at, revoked_at) on public.team_passes to authenticated;
drop policy if exists pass_read on public.team_passes;
create policy pass_read on public.team_passes for select to authenticated using (arbor_private.has_role(org_id, array['admin', 'manager']::public.org_role[]));

create table if not exists public.team_pass_uses (
  pass_id uuid not null references public.team_passes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  primary key (pass_id, user_id)
);
alter table public.team_pass_uses enable row level security;
revoke all on public.team_pass_uses from anon, authenticated;

create table if not exists arbor_private.pass_attempts (user_id uuid not null, at timestamptz not null default now());
create index if not exists pass_attempts_user on arbor_private.pass_attempts (user_id, at);

create or replace function arbor_private.pass_hash(p_code text) returns text
language sql immutable set search_path = '' as $$
  select encode(extensions.digest('arbor-pass:' || upper(regexp_replace(p_code, '[^0-9A-Za-z]', '', 'g')), 'sha256'), 'hex');
$$;

-- Créer un pass : le code n'est rendu qu'une fois, ici
create or replace function public.create_team_pass(p_org uuid, p_minutes int default 15, p_max_uses int default 30, p_unit uuid default null, p_label text default null)
returns table (id uuid, code text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_alpha text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; v_code text; v_b bytea; i int; v_try int := 0;
begin
  if not arbor_private.has_role(p_org, array['admin', 'manager']::public.org_role[]) then raise exception 'accès refusé'; end if;
  if p_minutes is null or p_minutes < 1 or p_minutes > 60 then raise exception 'durée : entre 1 et 60 minutes'; end if;
  if p_max_uses is null or p_max_uses < 1 or p_max_uses > 500 then raise exception 'nombre de places : entre 1 et 500'; end if;
  if p_unit is not null and not exists (select 1 from public.org_units u where u.id = p_unit and u.org_id = p_org) then raise exception 'site ou pôle introuvable'; end if;
  loop
    v_b := extensions.gen_random_bytes(6); v_code := '';
    for i in 0..5 loop v_code := v_code || substr(v_alpha, (get_byte(v_b, i) % 32) + 1, 1); end loop;
    exit when not exists (select 1 from public.team_passes t where t.code_hash = arbor_private.pass_hash(v_code));
    v_try := v_try + 1; if v_try > 20 then raise exception 'réessaie dans un instant'; end if;
  end loop;
  insert into public.team_passes (org_id, code_hash, label, unit_id, max_uses, expires_at, created_by)
    values (p_org, arbor_private.pass_hash(v_code), nullif(trim(p_label), ''), p_unit, p_max_uses, now() + make_interval(mins => p_minutes), auth.uid())
    returning team_passes.id, team_passes.expires_at into id, expires_at;
  code := v_code;
  perform arbor_private.audit(p_org, 'pass.cree', id::text, jsonb_build_object('minutes', p_minutes, 'places', p_max_uses, 'unit', p_unit));
  return next;
end $$;

create or replace function public.revoke_team_pass(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select t.org_id into v_org from public.team_passes t where t.id = p_id;
  if v_org is null or not arbor_private.has_role(v_org, array['admin', 'manager']::public.org_role[]) then raise exception 'accès refusé'; end if;
  update public.team_passes set revoked_at = coalesce(revoked_at, now()) where id = p_id;
  perform arbor_private.audit(v_org, 'pass.revoque', p_id::text, '{}'::jsonb);
end $$;

-- Entrer avec un pass. Rend un statut plutôt qu'une erreur, pour que les tentatives ratées soient bien comptées.
-- ok · deja_membre · invalide (inconnu, expiré, révoqué ou complet : un seul message) · trop_de_tentatives · suspendu
create or replace function public.redeem_team_pass(p_code text) returns table (status text, org_id uuid, org_name text, unit_name text)
language plpgsql security definer set search_path = '' as $$
declare t public.team_passes; m public.memberships; v_email text;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  if (select count(*) from arbor_private.pass_attempts a where a.user_id = auth.uid() and a.at > now() - interval '1 hour') >= 10 then
    status := 'trop_de_tentatives'; return next; return;
  end if;
  select * into t from public.team_passes p where p.code_hash = arbor_private.pass_hash(coalesce(p_code, '')) for update;
  if t.id is null or t.revoked_at is not null or t.expires_at <= now() or t.uses >= t.max_uses then
    insert into arbor_private.pass_attempts (user_id) values (auth.uid());
    status := 'invalide'; return next; return;
  end if;
  org_id := t.org_id;
  select o.name into org_name from public.organizations o where o.id = t.org_id;
  select u.name into unit_name from public.org_units u where u.id = t.unit_id;
  select * into m from public.memberships x where x.org_id = t.org_id and x.user_id = auth.uid();
  if m.user_id is not null then status := case when m.status = 'active' then 'deja_membre' else 'suspendu' end; return next; return; end if;
  select lower(u.email) into v_email from auth.users u where u.id = auth.uid();
  insert into public.memberships (org_id, user_id, role, email, unit_id) values (t.org_id, auth.uid(), 'member', v_email, t.unit_id);
  insert into public.team_pass_uses (pass_id, user_id) values (t.id, auth.uid());
  update public.team_passes set uses = uses + 1 where id = t.id;
  perform arbor_private.audit(t.org_id, 'membre.rattache_pass', coalesce(v_email, auth.uid()::text), jsonb_build_object('pass', t.id, 'label', t.label));
  status := 'ok'; return next;
end $$;

revoke all on function public.add_access_rule(uuid, text, text, public.org_role, uuid) from public, anon;
revoke all on function public.remove_access_rule(uuid) from public, anon;
revoke all on function public.claim_memberships() from public, anon;
revoke all on function public.create_team_pass(uuid, int, int, uuid, text) from public, anon;
revoke all on function public.revoke_team_pass(uuid) from public, anon;
revoke all on function public.redeem_team_pass(text) from public, anon;
grant execute on function public.add_access_rule(uuid, text, text, public.org_role, uuid) to authenticated;
grant execute on function public.remove_access_rule(uuid) to authenticated;
grant execute on function public.claim_memberships() to authenticated;
grant execute on function public.create_team_pass(uuid, int, int, uuid, text) to authenticated;
grant execute on function public.revoke_team_pass(uuid) to authenticated;
grant execute on function public.redeem_team_pass(text) to authenticated;
revoke all on function arbor_private.pass_hash(text) from public;
revoke all on function arbor_private.public_mail_domain(text) from public;
