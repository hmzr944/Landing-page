-- Arbor, migration 009 : Experience Architecture (docs/experience-architecture.md, D12).
-- À appliquer APRÈS 001 à 008. Rejouable sans erreur. Ne modifie aucune donnée existante :
-- colonnes ajoutées avec des valeurs par défaut, connaissances déjà validées conservées (signalées « provenance non vérifiée »).
--
-- 1. Provenance documentaire (priorité P0) : le serveur calcule l'empreinte SHA-256 du fichier stocké et la compare à celle
--    déclarée à l'envoi ; il vérifie chaque extrait dans le texte du fichier. Seul le serveur (service_role) écrit ces champs.
--    Une connaissance ne peut être validée que si son extrait a été vérifié sur le fichier actuel, et une version divergente bloque tout.
--    Chaque preuve porte la version et l'empreinte du document de la connaissance évaluée.
-- 2. Invalidation ciblée : quand un changement « modifié » ou « supprimé » est accepté, seules les personnes dont une preuve juste
--    reposait sur l'ancienne connaissance voient les compétences concernées passer « requires_revalidation », avec une micro-mission.
--    Les preuves historiques ne sont jamais modifiées. Une preuve juste ultérieure sur la nouvelle connaissance clôt la revalidation.
-- 3. Connaissances hors référentiel (out_of_scope_knowledge) : une affirmation plausible mais absente des documents est signalée
--    à l'équipe de contenu, sans être comptée juste ni fausse.

-- ---------- 1. Provenance ----------
alter table public.source_versions add column if not exists server_sha256 text;
alter table public.source_versions add column if not exists integrity text not null default 'non_verifie';
alter table public.source_versions add column if not exists verified_at timestamptz;
do $$ begin
  alter table public.source_versions add constraint source_versions_integrity_chk check (integrity in ('non_verifie', 'conforme', 'divergent'));
exception when duplicate_object then null; end $$;

alter table public.knowledge_nodes add column if not exists provenance text not null default 'non_verifiee';
alter table public.knowledge_nodes add column if not exists provenance_sha256 text;
alter table public.knowledge_nodes add column if not exists provenance_at timestamptz;
do $$ begin
  alter table public.knowledge_nodes add constraint knowledge_provenance_chk check (provenance in ('non_verifiee', 'verifiee', 'introuvable'));
exception when duplicate_object then null; end $$;

alter table public.evidence_events add column if not exists source_sha256 text;

-- Une modification de la page (le seul champ de localisation modifiable) remet la provenance à vérifier
create or replace function arbor_private.knowledge_edit_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.title, new.body, new.kind, new.page) is distinct from (old.title, old.body, old.kind, old.page) and old.status = 'valide' then
    new.status := 'a_revalider'; new.validated_by := null; new.validated_at := null;
  end if;
  -- (le navigateur ne peut pas écrire les champs de provenance : ils ne figurent pas dans ses droits de colonne)
  if new.page is distinct from old.page and current_user <> 'service_role' then
    new.provenance := 'non_verifiee'; new.provenance_sha256 := null; new.provenance_at := null;
  end if;
  return new;
end $$;

-- Validation : extrait vérifié sur le fichier actuel, version non divergente.
-- Le refus est une erreur explicite (un journal écrit ici serait annulé avec la transaction) ; la divergence d'empreinte
-- elle-même est journalisée par le serveur au moment où il la détecte (action « provenance.divergente »).
create or replace function public.set_knowledge_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_k public.knowledge_nodes; v_v public.source_versions;
begin
  select * into v_k from public.knowledge_nodes where id = p_id for update;
  if not found then raise exception 'connaissance introuvable'; end if;
  if p_status not in ('valide', 'rejete', 'a_revalider', 'propose') then raise exception 'statut invalide'; end if;
  if not arbor_private.has_role(v_k.org_id, case when v_k.kind = 'sensible' then array['admin', 'manager']::public.org_role[] else array['admin', 'manager', 'expert']::public.org_role[] end) then
    raise exception 'accès refusé';
  end if;
  if p_status = 'valide' then
    select * into v_v from public.source_versions where id = v_k.source_version_id;
    if v_v.integrity = 'divergent' then
      raise exception 'validation bloquée : le fichier stocké ne correspond pas à l’empreinte déclarée';
    end if;
    if v_k.provenance <> 'verifiee' or v_k.provenance_sha256 is null or v_k.provenance_sha256 is distinct from v_v.server_sha256 then
      raise exception 'provenance non vérifiée : l’extrait doit être retrouvé par le serveur dans le document stocké';
    end if;
  end if;
  update public.knowledge_nodes set status = p_status,
    validated_by = case when p_status = 'valide' then auth.uid() end,
    validated_at = case when p_status = 'valide' then now() end
  where id = p_id;
  perform arbor_private.audit(v_k.org_id, 'connaissance.' || p_status, p_id::text, jsonb_build_object('kind', v_k.kind, 'avant', v_k.status));
end $$;

-- Chaque preuve reçoit la version et l'empreinte du document de la connaissance évaluée (jamais fournies par le client)
create or replace function arbor_private.evidence_provenance() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.knowledge_id is not null then
    select k.source_version_id, coalesce(k.provenance_sha256, v.server_sha256) into new.source_version_id, new.source_sha256
      from public.knowledge_nodes k left join public.source_versions v on v.id = k.source_version_id where k.id = new.knowledge_id;
  else
    new.source_sha256 := null;
  end if;
  return new;
end $$;
drop trigger if exists evidence_provenance on public.evidence_events;
create trigger evidence_provenance before insert on public.evidence_events for each row execute function arbor_private.evidence_provenance();

-- ---------- 2. Invalidation ciblée des compétences ----------
create table if not exists public.skill_revalidations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  user_id uuid not null,
  skill_id uuid,                     -- compétence touchée (null si la connaissance n'est reliée à aucune compétence)
  knowledge_id uuid not null,        -- ancienne connaissance, sur laquelle reposait la preuve
  new_knowledge_id uuid,             -- connaissance qui la remplace (null si supprimée)
  change_id uuid not null,
  change_item_id uuid not null,
  reason text not null check (char_length(reason) between 3 and 600),
  status text not null default 'requires_revalidation' check (status in ('requires_revalidation', 'revalidee', 'annulee')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_evidence bigint,
  unique (org_id, id),
  foreign key (org_id, user_id) references public.memberships (org_id, user_id) on delete cascade,
  foreign key (skill_id, org_id) references public.skills (id, org_id) on delete cascade,
  foreign key (knowledge_id, org_id) references public.knowledge_nodes (id, org_id),
  foreign key (change_id, org_id) references public.policy_changes (id, org_id) on delete cascade
);
create unique index if not exists skill_reval_once on public.skill_revalidations (user_id, change_item_id, coalesce(skill_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists skill_reval_org on public.skill_revalidations (org_id, status);
alter table public.skill_revalidations enable row level security;
revoke all on public.skill_revalidations from anon, authenticated;
grant select on public.skill_revalidations to authenticated;
grant all on public.skill_revalidations to service_role;
drop policy if exists reval_read on public.skill_revalidations;
create policy reval_read on public.skill_revalidations for select to authenticated
  using (user_id = auth.uid() or arbor_private.has_role(org_id, array['admin', 'manager']::public.org_role[]));

-- Une preuve juste sur la nouvelle connaissance, postérieure au changement, clôt la revalidation (la preuve elle-même ne change pas)
create or replace function arbor_private.close_revalidations() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.outcome = 'juste' and new.knowledge_id is not null then
    update public.skill_revalidations set status = 'revalidee', resolved_at = now(), resolved_evidence = new.id
      where user_id = new.user_id and org_id = new.org_id and new_knowledge_id = new.knowledge_id and status = 'requires_revalidation' and created_at <= new.at;
  end if;
  return null;
end $$;
drop trigger if exists close_revalidations on public.evidence_events;
create trigger close_revalidations after insert on public.evidence_events for each row execute function arbor_private.close_revalidations();

-- Un manager peut annuler une revalidation (par exemple après une vérification au poste)
create or replace function public.cancel_revalidation(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.skill_revalidations;
begin
  select * into r from public.skill_revalidations where id = p_id for update;
  if not found then raise exception 'revalidation introuvable'; end if;
  if not arbor_private.has_role(r.org_id, array['admin', 'manager']::public.org_role[]) then raise exception 'accès refusé'; end if;
  update public.skill_revalidations set status = 'annulee', resolved_at = now() where id = p_id and status = 'requires_revalidation';
  perform arbor_private.audit(r.org_id, 'revalidation.annulee', p_id::text, '{}'::jsonb);
end $$;

-- Décision humaine sur un changement (remplace la version de 008) :
-- - un extrait nouveau n'est reporté comme « valide » que s'il a été retrouvé par le serveur dans la nouvelle version ;
--   sinon la connaissance est créée « à revalider » et sa provenance « introuvable » (on ne recopie plus l'ancien extrait comme s'il était à jour) ;
-- - « modifié » et « supprimé » acceptés : revalidation ciblée des personnes concernées et micro-mission ;
--   « reformulé » et « inchangé » n'invalident rien (le fond n'a pas changé).
create or replace function public.decide_change_item(p_item uuid, p_decision text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare it public.policy_change_items; ch public.policy_changes; k public.knowledge_nodes; v_new uuid; v_to public.source_versions; v_ok boolean; v_reason text;
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
    select * into v_to from public.source_versions where id = ch.to_version_id;
    if v_to.integrity = 'divergent' then raise exception 'validation bloquée : le fichier de la nouvelle version ne correspond pas à son empreinte'; end if;
    if it.knowledge_id is not null then select * into k from public.knowledge_nodes where id = it.knowledge_id; end if;
    if it.change = 'supprime' then
      update public.knowledge_nodes set status = 'remplace' where id = it.knowledge_id;
    else
      v_ok := it.new_quote is not null and v_to.server_sha256 is not null;
      insert into public.knowledge_nodes (org_id, source_version_id, kind, title, body, quote, page, confidence, extracted_by, status, validated_by, validated_at, replaces, created_by, context, provenance, provenance_sha256, provenance_at)
        values (it.org_id, ch.to_version_id, coalesce(case when it.sensitive then 'sensible' end, k.kind, 'concept'), coalesce(it.new_title, k.title), coalesce(it.new_body, k.body, ''), coalesce(it.new_quote, k.quote, ''),
          coalesce(it.new_page, k.page), k.confidence, 'humain', case when v_ok then 'valide' else 'a_revalider' end, case when v_ok then auth.uid() end, case when v_ok then now() end,
          it.knowledge_id, auth.uid(), k.context, case when v_ok then 'verifiee' else 'introuvable' end, case when v_ok then v_to.server_sha256 end, case when v_ok then now() end)
        returning id into v_new;
      if it.knowledge_id is not null then update public.knowledge_nodes set status = 'remplace' where id = it.knowledge_id; end if;
      if it.knowledge_id is not null then
        insert into public.skill_knowledge (org_id, skill_id, knowledge_id) select org_id, skill_id, v_new from public.skill_knowledge where knowledge_id = it.knowledge_id on conflict do nothing;
      end if;
    end if;
    -- Invalidation ciblée : seulement si le fond a changé, et seulement pour les personnes dont une preuve juste reposait dessus
    if it.change in ('modifie', 'supprime') and it.knowledge_id is not null then
      v_reason := left(case when it.change = 'supprime' then format('La règle « %s » a été retirée de la procédure.', k.title)
        else format('La règle « %s » a changé%s', k.title, case when it.new_quote is not null then format(' : maintenant « %s ».', left(it.new_quote, 300)) else '.' end) end, 600);
      insert into public.skill_revalidations (org_id, user_id, skill_id, knowledge_id, new_knowledge_id, change_id, change_item_id, reason)
        select distinct e.org_id, e.user_id, sk.skill_id, it.knowledge_id, v_new, it.change_id, it.id, v_reason
        from public.evidence_events e left join public.skill_knowledge sk on sk.knowledge_id = it.knowledge_id
        where e.knowledge_id = it.knowledge_id and e.outcome = 'juste'
        on conflict do nothing;
      insert into public.learning_actions (org_id, user_id, kind, knowledge_ids, skill_id, change_id, reason, origin, created_by)
        select distinct e.org_id, e.user_id, 'revalidation', case when v_new is not null then array[v_new] else '{}'::uuid[] end, null::uuid, it.change_id, left(v_reason, 400), 'watchdog', auth.uid()
        from public.evidence_events e
        where e.knowledge_id = it.knowledge_id and e.outcome = 'juste'
          and not exists (select 1 from public.learning_actions a where a.user_id = e.user_id and a.change_id = it.change_id and a.status = 'a_faire' and a.knowledge_ids = case when v_new is not null then array[v_new] else '{}'::uuid[] end);
    end if;
  end if;
  update public.policy_change_items set decision = p_decision, decided_by = auth.uid(), decided_at = now(), new_knowledge_id = v_new where id = p_item;
  if not exists (select 1 from public.policy_change_items where change_id = it.change_id and decision = 'a_valider') then
    update public.policy_changes set status = 'traite', closed_at = now() where id = it.change_id;
  end if;
  perform arbor_private.audit(it.org_id, 'changement.' || p_decision, p_item::text, jsonb_build_object('change', it.change, 'sensible', it.sensitive, 'provenance', case when v_ok then 'verifiee' when v_new is not null then 'introuvable' end));
  return v_new;
end $$;

-- ---------- 3. Connaissances hors référentiel ----------
create table if not exists public.out_of_scope_knowledge (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  user_id uuid not null,
  session_id uuid,
  claim text not null check (char_length(claim) between 2 and 400),
  context text not null default '' check (char_length(context) <= 300),
  rationale text not null default '' check (char_length(rationale) <= 400),
  source text check (source is null or char_length(source) <= 300),
  status text not null default 'a_examiner' check (status in ('a_examiner', 'a_documenter', 'ecartee')),
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (org_id, id),
  foreign key (org_id, user_id) references public.memberships (org_id, user_id) on delete cascade
);
create index if not exists oos_org on public.out_of_scope_knowledge (org_id, status, created_at desc);
alter table public.out_of_scope_knowledge enable row level security;
revoke all on public.out_of_scope_knowledge from anon, authenticated;
grant select on public.out_of_scope_knowledge to authenticated;
grant all on public.out_of_scope_knowledge to service_role;
drop policy if exists oos_read on public.out_of_scope_knowledge;
create policy oos_read on public.out_of_scope_knowledge for select to authenticated
  using (user_id = auth.uid() or arbor_private.has_role(org_id, array['admin', 'manager', 'expert']::public.org_role[]));

create or replace function public.review_out_of_scope(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.out_of_scope_knowledge;
begin
  select * into r from public.out_of_scope_knowledge where id = p_id for update;
  if not found then raise exception 'signalement introuvable'; end if;
  if p_status not in ('a_documenter', 'ecartee', 'a_examiner') then raise exception 'statut invalide'; end if;
  if not arbor_private.has_role(r.org_id, array['admin', 'manager', 'expert']::public.org_role[]) then raise exception 'accès refusé'; end if;
  update public.out_of_scope_knowledge set status = p_status, reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
  perform arbor_private.audit(r.org_id, 'hors_referentiel.' || p_status, p_id::text, '{}'::jsonb);
end $$;

-- ---------- RGPD : export et effacement couvrent les nouvelles données de la personne ----------
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
    'revalidations', coalesce((select jsonb_agg(to_jsonb(r) - 'org_id' - 'user_id') from public.skill_revalidations r where r.org_id = p_org and r.user_id = auth.uid()), '[]'::jsonb),
    'out_of_scope', coalesce((select jsonb_agg(to_jsonb(o) - 'org_id' - 'user_id') from public.out_of_scope_knowledge o where o.org_id = p_org and o.user_id = auth.uid()), '[]'::jsonb),
    'exported_at', now());
end $$;
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
  delete from public.skill_revalidations where org_id = p_org and user_id = auth.uid();
  delete from public.out_of_scope_knowledge where org_id = p_org and user_id = auth.uid();
  perform set_config('arbor.erasure', 'off', true);
  perform arbor_private.audit(p_org, 'donnees.effacees', auth.uid()::text, jsonb_build_object('preuves', n_e, 'simulations', n_s));
  return jsonb_build_object('evidence', n_e, 'simulations', n_s);
end $$;

-- ai_calls : la vérification de provenance ne passe pas par le modèle ; rien à ajouter.

revoke all on function public.cancel_revalidation(uuid) from public, anon;
revoke all on function public.review_out_of_scope(uuid, text) from public, anon;
grant execute on function public.cancel_revalidation(uuid) to authenticated;
grant execute on function public.review_out_of_scope(uuid, text) to authenticated;
grant execute on function public.set_knowledge_status(uuid, text) to authenticated;
grant execute on function public.decide_change_item(uuid, text) to authenticated;
grant execute on function public.export_my_org_data(uuid) to authenticated;
grant execute on function public.erase_my_org_data(uuid) to authenticated;
