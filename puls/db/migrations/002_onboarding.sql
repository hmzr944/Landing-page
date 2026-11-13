-- =====================================================================
-- PULS : 002 Onboarding (création d'entreprise, membres, configuration de démonstration)
-- Les entreprises et les appartenances ne s'écrivent jamais directement depuis le navigateur :
-- uniquement par ces fonctions, qui vérifient le rôle et écrivent dans le journal.
-- =====================================================================

-- Crée une entreprise ; l'appelant en devient administrateur. Un workspace « Principal » est créé.
create or replace function public.create_company(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_company uuid; v_ws uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = 'insufficient_privilege'; end if;
  if char_length(coalesce(trim(p_name), '')) < 2 then raise exception 'company name too short' using errcode = 'check_violation'; end if;
  if (select count(*) from public.memberships where user_id = auth.uid() and role = 'admin') >= 5 then
    raise exception 'too many companies for this account' using errcode = 'check_violation';
  end if;
  -- Toute nouvelle entreprise démarre en démonstration : aucune exécution réelle possible.
  insert into public.companies (name, environment) values (trim(p_name), 'demo') returning id into v_company;
  insert into public.memberships (company_id, user_id, role) values (v_company, auth.uid(), 'admin');
  insert into public.workspaces (company_id, name) values (v_company, 'Principal') returning id into v_ws;
  perform puls_private.audit(v_company, 'company.create', 'company', v_company, jsonb_build_object('name', trim(p_name)));
  return v_company;
end $$;

-- Ajoute un membre qui possède déjà un compte PULS. Pas d'envoi d'e-mail : la personne doit s'inscrire d'abord.
create or replace function public.add_member(p_company uuid, p_email text, p_role public.puls_role) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  if not puls_private.has_role(p_company, array['admin']::public.puls_role[]) then
    raise exception 'not allowed' using errcode = 'insufficient_privilege';
  end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then raise exception 'no PULS account for this e-mail yet' using errcode = 'no_data_found'; end if;
  insert into public.memberships (company_id, user_id, role) values (p_company, v_user, p_role)
  on conflict (company_id, user_id) do update set role = excluded.role, status = 'active';
  perform puls_private.audit(p_company, 'member.add', 'membership', v_user, jsonb_build_object('role', p_role));
end $$;

create or replace function puls_private.assert_admin_remains(p_company uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.memberships where company_id = p_company and role = 'admin' and status = 'active') then
    raise exception 'a company must keep at least one active administrator' using errcode = 'check_violation';
  end if;
end $$;

create or replace function public.set_member_role(p_company uuid, p_user uuid, p_role public.puls_role) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not puls_private.has_role(p_company, array['admin']::public.puls_role[]) then
    raise exception 'not allowed' using errcode = 'insufficient_privilege';
  end if;
  update public.memberships set role = p_role where company_id = p_company and user_id = p_user;
  perform puls_private.assert_admin_remains(p_company);
  perform puls_private.audit(p_company, 'member.role', 'membership', p_user, jsonb_build_object('role', p_role));
end $$;

create or replace function public.suspend_member(p_company uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not puls_private.has_role(p_company, array['admin']::public.puls_role[]) then
    raise exception 'not allowed' using errcode = 'insufficient_privilege';
  end if;
  update public.memberships set status = 'suspended' where company_id = p_company and user_id = p_user;
  perform puls_private.assert_admin_remains(p_company);
  perform puls_private.audit(p_company, 'member.suspend', 'membership', p_user, '{}');
end $$;

-- Liste des membres avec leur e-mail, visible seulement par les membres de la même entreprise.
create or replace function public.list_members(p_company uuid)
returns table (user_id uuid, email text, role public.puls_role, status text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.user_id, u.email::text, m.role, m.status, m.created_at
  from public.memberships m join auth.users u on u.id = m.user_id
  where m.company_id = p_company and puls_private.is_member(p_company)
  order by m.created_at;
$$;

-- Configuration de démonstration (fictive) : uniquement pour une entreprise en environnement démo,
-- dont le workspace principal est encore vide. Toutes les valeurs sont des exemples à remplacer.
create or replace function public.seed_demo_configuration(p_company uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_ws uuid; v_le uuid; v_brand uuid; v_env public.puls_env;
  s_paris uuid; s_lyon uuid; s_shop uuid; c_ru uuid; c_hx uuid; c_ce uuid; c_ta uuid;
  v_set uuid; v_ver uuid; k text; b jsonb; n text;
  prod record;
begin
  if not puls_private.has_role(p_company, array['admin']::public.puls_role[]) then
    raise exception 'not allowed' using errcode = 'insufficient_privilege';
  end if;
  select environment into v_env from public.companies where id = p_company;
  if v_env <> 'demo' then raise exception 'demo configuration is only allowed in a demo company' using errcode = 'check_violation'; end if;
  select id into v_ws from public.workspaces where company_id = p_company order by name = 'Principal' desc limit 1;
  if exists (select 1 from public.products where workspace_id = v_ws) then
    raise exception 'workspace already configured' using errcode = 'check_violation';
  end if;

  insert into public.legal_entities (company_id, name, country) values (p_company, 'Maison Valcour SAS (fictive)', 'FR') returning id into v_le;
  insert into public.brands (company_id, workspace_id, legal_entity_id, name) values (p_company, v_ws, v_le, 'Maison Valcour') returning id into v_brand;

  insert into public.sites (company_id, workspace_id, brand_id, name, kind, ships_orders, city, prep_capacity_per_day, can_transfer, courier_available)
    values (p_company, v_ws, v_brand, 'Entrepôt Paris Ivry', 'warehouse', true, 'Paris', 400, true, true) returning id into s_paris;
  insert into public.sites (company_id, workspace_id, brand_id, name, kind, ships_orders, city, prep_capacity_per_day, can_transfer, courier_available)
    values (p_company, v_ws, v_brand, 'Entrepôt Lyon Corbas', 'warehouse', true, 'Lyon', 150, true, true) returning id into s_lyon;
  insert into public.sites (company_id, workspace_id, brand_id, name, kind, ships_orders, city, opening_hours, prep_capacity_per_day, can_transfer, courier_available)
    values (p_company, v_ws, v_brand, 'Boutique Paris 7e', 'store', false, 'Paris',
            '{"mon-sat": "10:00-19:00"}', 12, false, true) returning id into s_shop;

  insert into public.carriers (company_id, name) values (p_company, 'Rapide Urbain') returning id into c_ru;
  insert into public.carriers (company_id, name) values (p_company, 'Hexa Livraison') returning id into c_hx;
  insert into public.carriers (company_id, name) values (p_company, 'Colis Express') returning id into c_ce;
  insert into public.carriers (company_id, name) values (p_company, 'TransAlpes Froid') returning id into c_ta;
  insert into public.delivery_methods (company_id, carrier_id, name, temperature_controlled, max_transit_hours) values
    (p_company, c_ru, 'Standard 48 h', false, 48), (p_company, c_ru, 'Express J+1', false, 24),
    (p_company, c_hx, 'Standard 48 h', false, 48), (p_company, c_ce, 'Standard 48 h', false, 48),
    (p_company, c_ta, 'Froid négatif J+1', true, 24);

  -- Catalogue : coût de revient volontairement inconnu (NULL), durées et températures inconnues sauf mention.
  for prod in select * from (values
      ('VAL-GC32', 'Coffret Grand Cru, 32 bonbons', 'Chocolat', 'high'::public.level5, 'low'::public.level5, 89, 14, 0),
      ('VAL-AVENT', 'Calendrier de l''Avent chocolat', 'Chocolat', 'high', 'medium', 65, 2, 5),
      ('VAL-GAN6', 'Tablettes ganache, coffret de 6', 'Chocolat', 'high', 'low', 54, 0, 0),
      ('VAL-PRAL400', 'Pralinés à l''ancienne, 400 g', 'Confiserie', 'medium', 'low', 48, 9, 6),
      ('VAL-BUCHE', 'Bûche glacée vanille praliné', 'Surgelé', 'critical', 'medium', 72, 0, 3),
      ('VAL-SABLE', 'Sablés au beurre, boîte métal', 'Biscuits', 'low', 'low', 24, 40, 22),
      ('VAL-TART220', 'Pâte à tartiner noisette, 220 g', 'Épicerie', 'low', 'low', 18, 31, 12)
    ) as t(sku, name, cat, sens, frag, price, st_paris, st_lyon)
  loop
    insert into public.products (company_id, workspace_id, brand_id, sku, name, category, thermal_sensitivity, fragility, list_price,
                                 storage_temp_max_c, transport_restrictions)
    values (p_company, v_ws, v_brand, prod.sku, prod.name, prod.cat, prod.sens, prod.frag, prod.price,
            case when prod.sku = 'VAL-BUCHE' then -18 end,
            case when prod.sku = 'VAL-BUCHE' then array['froid négatif obligatoire'] else '{}' end);
    insert into public.stock_levels (company_id, site_id, product_id, quantity, as_of, source)
      select p_company, s_paris, id, prod.st_paris, now(), 'manual' from public.products where company_id = p_company and sku = prod.sku;
    insert into public.stock_levels (company_id, site_id, product_id, quantity, as_of, source)
      select p_company, s_lyon, id, prod.st_lyon, now(), 'manual' from public.products where company_id = p_company and sku = prod.sku;
  end loop;
  insert into public.stock_levels (company_id, site_id, product_id, quantity, as_of, source)
    select p_company, s_shop, id, 6, now(), 'manual' from public.products where company_id = p_company and sku = 'VAL-GC32';

  -- Politiques (exemples) : chacune créée en version 1 puis activée.
  for k, n, b in select * from (values
      ('authorization', 'Délégation financière',
        '{"currency": "EUR", "limits": {"agent": 60, "logistics_manager": 150, "sav_manager": 250, "admin": 1000, "viewer": 0}}'::jsonb),
      ('resolution', 'Solutions autorisées',
        '{"courier": {"zones": ["Paris", "Lyon"], "order_before_hour": 15, "delivered_before": "16 h 30"},
          "goodwill": {"avoir": 0.2, "half": 0.5, "full": 1},
          "reship": {"standard_hours": 48, "express_hours": 24}}'::jsonb),
      ('criticality', 'Criticité',
        '{"max": {"product": 30, "occasion": 25, "incident": 20, "relationship": 15, "emotion": 10},
          "sensitivity_points": {"critical": 30, "high": 26, "medium": 16, "low": 6, "none": 0, "unknown": 16},
          "relationship_points": {"Client privilège": 15, "Client entreprise": 13, "Client fidèle": 10, "Nouveau client": 9, "Client standard": 5},
          "emotion_points": {"Colère": 10, "Déception": 9, "Inquiétude": 7, "Non exprimée": 5, "Neutre": 3},
          "priority_threshold": 70}'::jsonb),
      ('tone', 'Ton éditorial', '{"signature": "La Conciergerie Maison Valcour", "default_tone": "warm",
          "caution_sensitive": "Nous ne pouvons pas garantir à distance l''état des produits."}'::jsonb),
      ('sla', 'Engagements de service', '{"first_response_hours": 4, "resolution_hours": 48, "business_hours": "09:00-19:00"}'::jsonb)
    ) as t(kind, name, body)
  loop
    insert into public.policy_sets (company_id, workspace_id, kind, name) values (p_company, v_ws, k::public.policy_kind, n) returning id into v_set;
    insert into public.policy_versions (company_id, policy_set_id, version, body, created_by) values (p_company, v_set, 1, b, auth.uid()) returning id into v_ver;
    update public.policy_versions set status = 'active', activated_by = auth.uid(), activated_at = now() where id = v_ver;
  end loop;
  perform puls_private.audit(p_company, 'config.seed_demo', 'workspace', v_ws, '{}');
end $$;

revoke all on function public.create_company(text), public.add_member(uuid, text, public.puls_role), public.set_member_role(uuid, uuid, public.puls_role),
  public.suspend_member(uuid, uuid), public.list_members(uuid), public.seed_demo_configuration(uuid), puls_private.assert_admin_remains(uuid) from public;
grant execute on function public.create_company(text), public.add_member(uuid, text, public.puls_role), public.set_member_role(uuid, uuid, public.puls_role),
  public.suspend_member(uuid, uuid), public.list_members(uuid), public.seed_demo_configuration(uuid) to authenticated;
