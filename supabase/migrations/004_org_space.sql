-- Arbor Business, étape C : choisir son espace et rejoindre une organisation.
-- - L'adresse e-mail du membre est copiée depuis son jeton de connexion (jamais saisie par le client) :
--   l'administrateur et le manager voient qui fait partie de l'équipe ; un membre ne voit que la sienne (RLS 003).
-- - my_organizations() : les espaces professionnels de la personne connectée, avec son rôle.
-- - revoke_invitation() : annuler une invitation non utilisée (journalisé).

alter table public.memberships add column if not exists email text check (email is null or email = lower(email));

create or replace function public.my_organizations() returns table (id uuid, name text, sector text, role public.org_role)
language sql stable security definer set search_path = '' as $$
  select o.id, o.name, o.sector, m.role
  from public.memberships m join public.organizations o on o.id = m.org_id
  where m.user_id = auth.uid() and m.status = 'active'
  order by o.name;
$$;

-- Les fonctions de 003 sont reprises pour enregistrer l'e-mail du membre
create or replace function public.create_organization(p_name text, p_sector text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  insert into public.organizations (name, sector, created_by) values (trim(p_name), nullif(trim(p_sector), ''), auth.uid()) returning id into v_org;
  insert into public.memberships (org_id, user_id, role, email) values (v_org, auth.uid(), 'admin', nullif(lower(coalesce(auth.jwt() ->> 'email', '')), ''));
  perform arbor_private.audit(v_org, 'organisation.creee', v_org::text, jsonb_build_object('name', p_name));
  return v_org;
end $$;

create or replace function public.accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_inv public.invitations; v_email text;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  select * into v_inv from public.invitations where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') for update;
  if not found or v_inv.accepted_at is not null or v_inv.expires_at < now() then raise exception 'invitation invalide ou expirée'; end if;
  if v_inv.email <> v_email then raise exception 'cette invitation est destinée à une autre adresse'; end if;
  insert into public.memberships (org_id, user_id, role, email) values (v_inv.org_id, auth.uid(), v_inv.role, v_email)
    on conflict (org_id, user_id) do update set status = 'active', email = excluded.email;
  update public.invitations set accepted_at = now(), accepted_by = auth.uid() where id = v_inv.id;
  perform arbor_private.audit(v_inv.org_id, 'invitation.acceptee', auth.uid()::text, jsonb_build_object('role', v_inv.role));
  return v_inv.org_id;
end $$;

create or replace function public.revoke_invitation(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_inv public.invitations;
begin
  select * into v_inv from public.invitations where id = p_id for update;
  if not found then raise exception 'invitation introuvable'; end if;
  if not arbor_private.has_role(v_inv.org_id, array['admin', 'manager']::public.org_role[]) then raise exception 'accès refusé'; end if;
  if v_inv.accepted_at is not null then raise exception 'invitation déjà utilisée'; end if;
  delete from public.invitations where id = p_id;
  perform arbor_private.audit(v_inv.org_id, 'invitation.annulee', v_inv.email, jsonb_build_object('role', v_inv.role));
end $$;

revoke all on function public.my_organizations() from public, anon;
revoke all on function public.create_organization(text, text) from public, anon;
revoke all on function public.accept_invitation(text) from public, anon;
revoke all on function public.revoke_invitation(uuid) from public, anon;
grant execute on function public.my_organizations() to authenticated;
grant execute on function public.create_organization(text, text) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.revoke_invitation(uuid) to authenticated;

-- Le jeton haché d'une invitation n'a pas à être lu, même par l'administrateur
revoke select on public.invitations from authenticated;
grant select (id, org_id, email, role, expires_at, accepted_at, accepted_by, created_by, created_at) on public.invitations to authenticated;
