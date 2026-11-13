-- Arbor, migration 011 : Arbor League (docs/business-v2.md, A5 ; décision D13).
-- À appliquer APRÈS 001 à 010. Rejouable. N'altère aucune donnée existante.
--
-- Principes :
-- - Toute reconnaissance (trophée, rang) est calculée ici, dans la base, à partir des preuves (evidence_events) écrites par le
--   serveur ou par une validation humaine nominative. Le navigateur n'envoie jamais de score.
-- - Chaque attribution garde sa preuve source (evidence_id) et est unique par (personne, trophée, portée) : pas de double récompense.
-- - Définitions reprises des niveaux de preuve (js/evidence.js) : appliquée = juste de niveau >= 4 ; transférée = appliquée dans
--   deux contextes ; durable = réussites à >= 7 jours d'écart, la dernière juste.
-- - Double voile : chacun lit ses attributions avec leur preuve ; les membres de l'organisation ne voient des autres que rang,
--   trophées, cordées et défis (fonction league_board), jamais une erreur, une confiance ou une preuve.

-- ---------- Catalogue (système, lecture seule) ----------
create table if not exists public.league_ranks (
  rank smallint primary key check (rank between 1 and 5),
  key text unique not null,
  label text not null,
  min_applied integer not null default 0,   -- connaissances appliquées (juste, niveau >= 4)
  min_durable integer not null default 0,   -- feuilles d'or
  min_transfer integer not null default 0,  -- maître du terrain
  description text not null default ''
);
insert into public.league_ranks (rank, key, label, min_applied, min_durable, min_transfer, description) values
  (1, 'graine', 'Graine', 0, 0, 0, 'Le point de départ.'),
  (2, 'pousse', 'Pousse', 1, 0, 0, 'Une première connaissance appliquée en situation.'),
  (3, 'arbuste', 'Arbuste', 3, 1, 0, 'Trois connaissances appliquées, dont une maîtrisée dans la durée.'),
  (4, 'arbre', 'Arbre', 6, 3, 1, 'Six connaissances appliquées, trois durables, une transférée à un autre contexte.'),
  (5, 'canopee', 'Canopée', 10, 6, 3, 'Une maîtrise large, durable et transférée.')
on conflict (rank) do nothing;

create table if not exists public.league_trophies (
  key text primary key,
  name text not null,
  description text not null,
  rule text not null,
  rarity text not null check (rarity in ('commun', 'rare', 'saisonnier')),
  scope text not null check (scope in ('once', 'knowledge', 'mentorship', 'challenge')),
  sort smallint not null default 0
);
insert into public.league_trophies (key, name, description, rule, rarity, scope, sort) values
  ('premiere_pousse', 'Première pousse', 'Ta première connaissance appliquée en situation.', 'Une réponse juste de niveau « appliquée » (4) ou plus.', 'commun', 'once', 1),
  ('maitre_terrain', 'Maître du terrain', 'Une connaissance appliquée dans plusieurs situations professionnelles.', 'La même connaissance appliquée juste dans deux contextes différents.', 'rare', 'knowledge', 2),
  ('feuille_or', 'Feuille d’or', 'Une connaissance maîtrisée dans la durée.', 'Deux réussites à au moins 7 jours d’écart, la dernière juste, dont au moins une application.', 'rare', 'knowledge', 3),
  ('resilience', 'Feuille de résilience', 'Une erreur devenue une réussite.', 'Une erreur sur une connaissance, puis plus tard, dans une autre partie, une application juste.', 'commun', 'knowledge', 4),
  ('arbre_savoir', 'Arbre de savoir', 'Une progression durable sur plusieurs connaissances.', 'Trois feuilles d’or.', 'rare', 'once', 5),
  ('mentor', 'Mentor', 'Ta transmission a fait progresser quelqu’un.', 'La personne accompagnée applique la connaissance après le début du mentorat, sans l’avoir appliquée avant.', 'rare', 'mentorship', 6),
  ('defi_releve', 'Défi relevé', 'Ta cordée a atteint l’objectif d’un défi de saison.', 'La part demandée des membres de la cordée applique les connaissances du défi pendant la saison.', 'saisonnier', 'challenge', 7)
on conflict (key) do nothing;

-- ---------- Organisation de la League ----------
create table if not exists public.league_cordees (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  kind text not null default 'groupe' check (kind in ('equipe', 'etablissement', 'groupe', 'binome')),
  unit_id uuid,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, org_id)
);
create table if not exists public.league_cordee_members (
  cordee_id uuid not null,
  org_id uuid not null,
  user_id uuid not null,
  joined_at timestamptz not null default now(),
  primary key (cordee_id, user_id),
  foreign key (cordee_id, org_id) references public.league_cordees (id, org_id) on delete cascade,
  foreign key (org_id, user_id) references public.memberships (org_id, user_id) on delete cascade
);
create table if not exists public.league_mentorships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  mentor_id uuid not null,
  mentee_id uuid not null,
  knowledge_id uuid not null,
  status text not null default 'actif' check (status in ('actif', 'reussi', 'clos')),
  created_by uuid references auth.users (id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  check (mentor_id <> mentee_id),
  unique (id, org_id),
  foreign key (org_id, mentor_id) references public.memberships (org_id, user_id) on delete cascade,
  foreign key (org_id, mentee_id) references public.memberships (org_id, user_id) on delete cascade,
  foreign key (knowledge_id, org_id) references public.knowledge_nodes (id, org_id)
);
create unique index if not exists mentorship_one_active on public.league_mentorships (org_id, mentee_id, knowledge_id) where status = 'actif';
create table if not exists public.league_seasons (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (id, org_id)
);
create table if not exists public.league_challenges (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  season_id uuid not null,
  cordee_id uuid,                -- null : toute l'organisation
  title text not null check (char_length(trim(title)) between 2 and 120),
  knowledge_ids uuid[] not null check (cardinality(knowledge_ids) between 1 and 10),
  target_ratio numeric not null default 0.8 check (target_ratio > 0 and target_ratio <= 1),
  achieved_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (id, org_id),
  foreign key (season_id, org_id) references public.league_seasons (id, org_id) on delete cascade,
  foreign key (cordee_id, org_id) references public.league_cordees (id, org_id) on delete cascade
);

-- ---------- Attributions et historique (écrits par la base seulement) ----------
create table if not exists public.league_awards (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  user_id uuid not null,
  trophy_key text not null references public.league_trophies (key),
  scope_key text not null,                 -- 'once', 'k:<connaissance>', 'm:<mentorat>', 'c:<défi>'
  knowledge_id uuid,
  evidence_id bigint,                      -- preuve source (traçabilité)
  mentorship_id uuid,
  challenge_id uuid,
  season_id uuid,
  awarded_at timestamptz not null default now(),
  unique (org_id, user_id, trophy_key, scope_key),
  foreign key (org_id, user_id) references public.memberships (org_id, user_id) on delete cascade
);
create index if not exists league_awards_org on public.league_awards (org_id, awarded_at desc);
create table if not exists public.league_rank_history (
  org_id uuid not null,
  user_id uuid not null,
  rank smallint not null references public.league_ranks (rank),
  evidence_id bigint,
  reached_at timestamptz not null default now(),
  primary key (org_id, user_id, rank),
  foreign key (org_id, user_id) references public.memberships (org_id, user_id) on delete cascade
);

-- ---------- Accès ----------
alter table public.league_ranks enable row level security;
alter table public.league_trophies enable row level security;
alter table public.league_cordees enable row level security;
alter table public.league_cordee_members enable row level security;
alter table public.league_mentorships enable row level security;
alter table public.league_seasons enable row level security;
alter table public.league_challenges enable row level security;
alter table public.league_awards enable row level security;
alter table public.league_rank_history enable row level security;
revoke all on public.league_ranks, public.league_trophies, public.league_cordees, public.league_cordee_members, public.league_mentorships,
  public.league_seasons, public.league_challenges, public.league_awards, public.league_rank_history from anon, authenticated;
grant select on public.league_ranks, public.league_trophies, public.league_cordees, public.league_cordee_members, public.league_mentorships,
  public.league_seasons, public.league_challenges, public.league_awards, public.league_rank_history to authenticated;
grant all on public.league_ranks, public.league_trophies, public.league_cordees, public.league_cordee_members, public.league_mentorships,
  public.league_seasons, public.league_challenges, public.league_awards, public.league_rank_history to service_role;

drop policy if exists lg_ranks_read on public.league_ranks;
create policy lg_ranks_read on public.league_ranks for select to authenticated using (true);
drop policy if exists lg_trophies_read on public.league_trophies;
create policy lg_trophies_read on public.league_trophies for select to authenticated using (true);
drop policy if exists lg_cordees_read on public.league_cordees;
create policy lg_cordees_read on public.league_cordees for select to authenticated using (arbor_private.is_member(org_id));
drop policy if exists lg_cmembers_read on public.league_cordee_members;
create policy lg_cmembers_read on public.league_cordee_members for select to authenticated using (arbor_private.is_member(org_id));
drop policy if exists lg_mentor_read on public.league_mentorships;
create policy lg_mentor_read on public.league_mentorships for select to authenticated
  using (mentor_id = auth.uid() or mentee_id = auth.uid() or arbor_private.has_role(org_id, array['admin', 'manager']::public.org_role[]));
drop policy if exists lg_seasons_read on public.league_seasons;
create policy lg_seasons_read on public.league_seasons for select to authenticated using (arbor_private.is_member(org_id));
drop policy if exists lg_challenges_read on public.league_challenges;
create policy lg_challenges_read on public.league_challenges for select to authenticated using (arbor_private.is_member(org_id));
-- ses propres attributions, avec leur preuve ; celles des autres seulement par league_board (sans preuve)
drop policy if exists lg_awards_read on public.league_awards;
create policy lg_awards_read on public.league_awards for select to authenticated using (user_id = auth.uid());
drop policy if exists lg_rankh_read on public.league_rank_history;
create policy lg_rankh_read on public.league_rank_history for select to authenticated using (user_id = auth.uid());

-- ---------- Moteur d'attribution (base seulement) ----------
create or replace function arbor_private.league_award(p_org uuid, p_user uuid, p_key text, p_scope text, p_knowledge uuid, p_evidence bigint,
  p_mentorship uuid default null, p_challenge uuid default null, p_season uuid default null) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  -- datée par sa preuve source : un recalcul de l'historique garde les vraies dates (saisons, chronologie)
  insert into public.league_awards (org_id, user_id, trophy_key, scope_key, knowledge_id, evidence_id, mentorship_id, challenge_id, season_id, awarded_at)
    values (p_org, p_user, p_key, p_scope, p_knowledge, p_evidence, p_mentorship, p_challenge, p_season,
      coalesce((select at from public.evidence_events where id = p_evidence), now()))
    on conflict (org_id, user_id, trophy_key, scope_key) do nothing;
  get diagnostics n = row_count;
  return n > 0;
end $$;

-- Rang d'une personne : le plus haut dont tous les seuils sont atteints ; un rang atteint reste acquis
create or replace function arbor_private.league_rank_update(p_org uuid, p_user uuid, p_evidence bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare v_applied integer; v_durable integer; v_transfer integer;
begin
  select count(distinct knowledge_id) into v_applied from public.evidence_events
    where org_id = p_org and user_id = p_user and knowledge_id is not null and outcome = 'juste' and coalesce(level, 0) >= 4;
  select count(*) filter (where trophy_key = 'feuille_or'), count(*) filter (where trophy_key = 'maitre_terrain') into v_durable, v_transfer
    from public.league_awards where org_id = p_org and user_id = p_user;
  insert into public.league_rank_history (org_id, user_id, rank, evidence_id, reached_at)
    select p_org, p_user, r.rank, p_evidence, coalesce((select at from public.evidence_events where id = p_evidence), now()) from public.league_ranks r
    where r.min_applied <= v_applied and r.min_durable <= v_durable and r.min_transfer <= v_transfer
    on conflict do nothing;
end $$;

-- Défis de saison concernés par une nouvelle application : atteints quand la part demandée des membres du groupe
-- a appliqué toutes les connaissances du défi pendant la saison. Tous les membres reçoivent « Défi relevé » :
-- personne n'est pénalisé par le rythme d'un autre.
create or replace function arbor_private.league_challenges_check(p_org uuid, p_knowledge uuid, p_at timestamptz, p_evidence bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare c record; v_members uuid[]; v_done integer;
begin
  for c in select ch.*, s.starts_at, s.ends_at from public.league_challenges ch join public.league_seasons s on s.id = ch.season_id
    where ch.org_id = p_org and ch.achieved_at is null and p_knowledge = any (ch.knowledge_ids) and p_at between s.starts_at and s.ends_at loop
    if c.cordee_id is not null then
      select array_agg(user_id) into v_members from public.league_cordee_members where cordee_id = c.cordee_id;
    else
      select array_agg(user_id) into v_members from public.memberships where org_id = p_org and status = 'active';
    end if;
    if coalesce(cardinality(v_members), 0) = 0 then continue; end if;
    select count(*) into v_done from unnest(v_members) m(uid)
      where not exists (select 1 from unnest(c.knowledge_ids) k(kid) where not exists (
        select 1 from public.evidence_events e where e.org_id = p_org and e.user_id = m.uid and e.knowledge_id = k.kid
          and e.outcome = 'juste' and coalesce(e.level, 0) >= 4 and e.at between c.starts_at and c.ends_at));
    if v_done::numeric / cardinality(v_members) >= c.target_ratio then
      update public.league_challenges set achieved_at = p_at where id = c.id;
      perform arbor_private.league_award(p_org, m.uid, 'defi_releve', 'c:' || c.id, null, p_evidence, null, c.id, c.season_id) from unnest(v_members) m(uid);
    end if;
  end loop;
end $$;

-- Évaluation d'une nouvelle preuve (idempotente) : trophées, mentorats, défis, rang
create or replace function arbor_private.league_evaluate(ev public.evidence_events) returns void
language plpgsql security definer set search_path = '' as $$
declare v_applied boolean; m record; v_k uuid;
begin
  v_k := ev.knowledge_id;
  if v_k is null or ev.outcome <> 'juste' then return; end if;
  v_applied := coalesce(ev.level, 0) >= 4;
  if v_applied then
    perform arbor_private.league_award(ev.org_id, ev.user_id, 'premiere_pousse', 'once', v_k, ev.id);
    -- transférée : la même connaissance appliquée dans deux contextes différents
    if (select count(distinct coalesce(e.context, '')) from public.evidence_events e where e.org_id = ev.org_id and e.user_id = ev.user_id and e.knowledge_id = v_k
          and e.outcome = 'juste' and coalesce(e.level, 0) >= 4 and e.at <= ev.at) >= 2 then
      perform arbor_private.league_award(ev.org_id, ev.user_id, 'maitre_terrain', 'k:' || v_k, v_k, ev.id);
    end if;
    -- résilience : une erreur antérieure, dans une autre partie, puis cette application juste
    if exists (select 1 from public.evidence_events e where e.org_id = ev.org_id and e.user_id = ev.user_id and e.knowledge_id = v_k and e.outcome = 'faux'
          and e.at < ev.at and (e.session_id is null or ev.session_id is null or e.session_id <> ev.session_id)) then
      perform arbor_private.league_award(ev.org_id, ev.user_id, 'resilience', 'k:' || v_k, v_k, ev.id);
    end if;
    -- mentorat : la personne accompagnée applique la connaissance après le début, sans l'avoir appliquée avant ;
    -- une validation humaine faite par le mentor lui-même ne compte pas
    for m in select * from public.league_mentorships where org_id = ev.org_id and mentee_id = ev.user_id and knowledge_id = v_k and status = 'actif' and started_at < ev.at loop
      if (ev.evaluator = 'humain' and ev.detail ->> 'by' = m.mentor_id::text) then continue; end if;
      if exists (select 1 from public.evidence_events e where e.org_id = ev.org_id and e.user_id = ev.user_id and e.knowledge_id = v_k
            and e.outcome = 'juste' and coalesce(e.level, 0) >= 4 and e.at < m.started_at) then continue; end if;
      if arbor_private.league_award(ev.org_id, m.mentor_id, 'mentor', 'm:' || m.id, v_k, ev.id, m.id) then
        update public.league_mentorships set status = 'reussi', ended_at = now() where id = m.id;
      end if;
    end loop;
    perform arbor_private.league_challenges_check(ev.org_id, v_k, ev.at, ev.id);
  end if;
  -- durable : deux réussites à au moins 7 jours d'écart, la dernière juste (celle-ci), dont au moins une application
  if exists (select 1 from public.evidence_events e where e.org_id = ev.org_id and e.user_id = ev.user_id and e.knowledge_id = v_k and e.outcome = 'juste' and e.at <= ev.at - interval '7 days')
     and (v_applied or exists (select 1 from public.evidence_events e where e.org_id = ev.org_id and e.user_id = ev.user_id and e.knowledge_id = v_k and e.outcome = 'juste' and coalesce(e.level, 0) >= 4 and e.at <= ev.at)) then
    -- deux instructions distinctes : en SQL, l'ordre d'évaluation d'un « and » n'est pas garanti
    perform arbor_private.league_award(ev.org_id, ev.user_id, 'feuille_or', 'k:' || v_k, v_k, ev.id);
  end if;
  if (select count(*) from public.league_awards where org_id = ev.org_id and user_id = ev.user_id and trophy_key = 'feuille_or') >= 3 then
    perform arbor_private.league_award(ev.org_id, ev.user_id, 'arbre_savoir', 'once', v_k, ev.id);
  end if;
  perform arbor_private.league_rank_update(ev.org_id, ev.user_id, ev.id);
end $$;

create or replace function arbor_private.league_on_evidence() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform arbor_private.league_evaluate(new);
  return null;
end $$;
drop trigger if exists league_on_evidence on public.evidence_events;
create trigger league_on_evidence after insert on public.evidence_events for each row execute function arbor_private.league_on_evidence();

-- Effacement de ses données d'organisation : les reconnaissances qui en découlent disparaissent aussi
create or replace function arbor_private.league_on_erase() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.action = 'donnees.effacees' then
    delete from public.league_awards where org_id = new.org_id and user_id = new.actor;
    delete from public.league_rank_history where org_id = new.org_id and user_id = new.actor;
    update public.league_mentorships set status = 'clos', ended_at = now() where org_id = new.org_id and status = 'actif' and (mentor_id = new.actor or mentee_id = new.actor);
  end if;
  return null;
end $$;
drop trigger if exists league_on_erase on public.audit_logs;
create trigger league_on_erase after insert on public.audit_logs for each row execute function arbor_private.league_on_erase();

-- ---------- Fonctions pour l'application ----------
-- Recalcul de l'historique d'une organisation (idempotent) : responsables seulement
-- (fonction interne sans contrôle : appelée par la migration elle-même, jamais exposée)
create or replace function arbor_private.league_replay(p_org uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare ev public.evidence_events; n integer := 0;
begin
  for ev in select * from public.evidence_events where org_id = p_org order by at, id loop
    perform arbor_private.league_evaluate(ev); n := n + 1;
  end loop;
  return n;
end $$;
create or replace function public.league_backfill(p_org uuid) returns integer
language plpgsql security definer set search_path = '' as $$
begin
  if not arbor_private.has_role(p_org, array['admin', 'manager']::public.org_role[]) then raise exception 'accès refusé'; end if;
  return arbor_private.league_replay(p_org);
end $$;

-- Ma League : mon rang, ce qui manque pour le suivant, mes trophées (avec leur preuve source)
create or replace function public.my_league(p_org uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_applied integer; v_durable integer; v_transfer integer; v_rank smallint;
begin
  if not arbor_private.is_member(p_org) then raise exception 'accès refusé'; end if;
  select count(distinct knowledge_id) into v_applied from public.evidence_events where org_id = p_org and user_id = auth.uid() and knowledge_id is not null and outcome = 'juste' and coalesce(level, 0) >= 4;
  select count(*) filter (where trophy_key = 'feuille_or'), count(*) filter (where trophy_key = 'maitre_terrain') into v_durable, v_transfer from public.league_awards where org_id = p_org and user_id = auth.uid();
  select coalesce(max(rank), 1) into v_rank from public.league_rank_history where org_id = p_org and user_id = auth.uid();
  return jsonb_build_object(
    'rank', v_rank, 'applied', v_applied, 'durable', v_durable, 'transfer', v_transfer,
    'next', (select to_jsonb(r) from public.league_ranks r where r.rank = v_rank + 1),
    'awards', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'trophy', a.trophy_key, 'scope', a.scope_key, 'knowledge_id', a.knowledge_id, 'knowledge', k.title,
        'evidence_id', a.evidence_id, 'evidence', case when e.id is null then null else jsonb_build_object('activity', e.activity, 'context', e.context, 'at', e.at) end,
        'season_id', a.season_id, 'at', a.awarded_at) order by a.awarded_at desc)
      from public.league_awards a left join public.knowledge_nodes k on k.id = a.knowledge_id left join public.evidence_events e on e.id = a.evidence_id
      where a.org_id = p_org and a.user_id = auth.uid()), '[]'::jsonb),
    'ranks', (select jsonb_agg(jsonb_build_object('rank', h.rank, 'at', h.reached_at) order by h.rank) from public.league_rank_history h where h.org_id = p_org and h.user_id = auth.uid()));
end $$;

-- Tableau public de l'organisation : rangs, trophées, cordées, défis. Jamais d'erreur, de confiance ni de preuve.
create or replace function public.league_board(p_org uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_season public.league_seasons;
begin
  if not arbor_private.is_member(p_org) then raise exception 'accès refusé'; end if;
  select * into v_season from public.league_seasons where org_id = p_org and now() between starts_at and ends_at order by starts_at desc limit 1;
  return jsonb_build_object(
    'members', coalesce((select jsonb_agg(jsonb_build_object(
        'user_id', ms.user_id, 'name', split_part(coalesce(ms.email, 'membre'), '@', 1),
        'rank', coalesce((select max(h.rank) from public.league_rank_history h where h.org_id = p_org and h.user_id = ms.user_id), 1),
        'trophies', coalesce((select jsonb_agg(jsonb_build_object('trophy', t.trophy_key, 'count', t.n, 'last', t.last)) from (
            select trophy_key, count(*) n, max(awarded_at) last from public.league_awards a where a.org_id = p_org and a.user_id = ms.user_id group by trophy_key) t), '[]'::jsonb),
        'season_awards', case when v_season.id is null then 0 else (select count(*) from public.league_awards a where a.org_id = p_org and a.user_id = ms.user_id and a.awarded_at between v_season.starts_at and v_season.ends_at) end)
      order by split_part(coalesce(ms.email, 'membre'), '@', 1))
      from public.memberships ms where ms.org_id = p_org and ms.status = 'active'), '[]'::jsonb),
    'cordees', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'kind', c.kind,
        'members', (select count(*) from public.league_cordee_members cm where cm.cordee_id = c.id),
        'member_ids', (select coalesce(jsonb_agg(cm.user_id), '[]'::jsonb) from public.league_cordee_members cm where cm.cordee_id = c.id),
        'trophies', (select count(*) from public.league_awards a join public.league_cordee_members cm on cm.user_id = a.user_id and cm.cordee_id = c.id where a.org_id = p_org),
        'applied', (select count(distinct (e.user_id, e.knowledge_id)) from public.evidence_events e join public.league_cordee_members cm on cm.user_id = e.user_id and cm.cordee_id = c.id
                    where e.org_id = p_org and e.knowledge_id is not null and e.outcome = 'juste' and coalesce(e.level, 0) >= 4)) order by c.name)
      from public.league_cordees c where c.org_id = p_org and c.archived_at is null), '[]'::jsonb),
    'season', case when v_season.id is null then null else jsonb_build_object('id', v_season.id, 'name', v_season.name, 'starts_at', v_season.starts_at, 'ends_at', v_season.ends_at) end,
    'challenges', coalesce((select jsonb_agg(jsonb_build_object('id', ch.id, 'title', ch.title, 'cordee_id', ch.cordee_id, 'target_ratio', ch.target_ratio, 'achieved_at', ch.achieved_at,
        'knowledge', (select jsonb_agg(k.title) from public.knowledge_nodes k where k.id = any (ch.knowledge_ids))) order by ch.created_at)
      from public.league_challenges ch where ch.org_id = p_org and ch.season_id = v_season.id), '[]'::jsonb),
    'past_seasons', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'ends_at', s.ends_at,
        'achieved', (select count(*) from public.league_challenges ch where ch.season_id = s.id and ch.achieved_at is not null)) order by s.ends_at desc)
      from public.league_seasons s where s.org_id = p_org and s.ends_at < now()), '[]'::jsonb));
end $$;

-- Gestion (responsables) : cordées, mentorats, saisons, défis. Tout est journalisé.
create or replace function public.league_save_cordee(p_org uuid, p_name text, p_kind text, p_members uuid[], p_id uuid default null, p_unit uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not arbor_private.has_role(p_org, array['admin', 'manager']::public.org_role[]) then raise exception 'accès refusé'; end if;
  if p_id is null then
    insert into public.league_cordees (org_id, name, kind, unit_id, created_by) values (p_org, trim(p_name), coalesce(p_kind, 'groupe'), p_unit, auth.uid()) returning id into v_id;
  else
    update public.league_cordees set name = trim(p_name), kind = coalesce(p_kind, kind) where id = p_id and org_id = p_org returning id into v_id;
    if v_id is null then raise exception 'cordée introuvable'; end if;
    delete from public.league_cordee_members where cordee_id = v_id and not (user_id = any (coalesce(p_members, '{}')));
  end if;
  insert into public.league_cordee_members (cordee_id, org_id, user_id)
    select v_id, p_org, m.user_id from public.memberships m where m.org_id = p_org and m.status = 'active' and m.user_id = any (coalesce(p_members, '{}'))
    on conflict do nothing;
  perform arbor_private.audit(p_org, 'league.cordee', v_id::text, jsonb_build_object('membres', cardinality(coalesce(p_members, '{}'))));
  return v_id;
end $$;
create or replace function public.league_archive_cordee(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.league_cordees;
begin
  select * into c from public.league_cordees where id = p_id;
  if not found or not arbor_private.has_role(c.org_id, array['admin', 'manager']::public.org_role[]) then raise exception 'accès refusé'; end if;
  update public.league_cordees set archived_at = now() where id = p_id;
end $$;

-- Un mentor doit avoir lui-même appliqué la connaissance ; on ne peut pas se désigner soi-même mentor ni s'accompagner soi-même
create or replace function public.league_start_mentorship(p_org uuid, p_mentor uuid, p_mentee uuid, p_knowledge uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not arbor_private.has_role(p_org, array['admin', 'manager']::public.org_role[]) then raise exception 'accès refusé'; end if;
  if p_mentor = p_mentee then raise exception 'un mentor accompagne une autre personne'; end if;
  if p_mentor = auth.uid() then raise exception 'un responsable ne se désigne pas lui-même mentor'; end if;
  if not exists (select 1 from public.evidence_events e where e.org_id = p_org and e.user_id = p_mentor and e.knowledge_id = p_knowledge and e.outcome = 'juste' and coalesce(e.level, 0) >= 4) then
    raise exception 'le mentor doit avoir appliqué cette connaissance';
  end if;
  insert into public.league_mentorships (org_id, mentor_id, mentee_id, knowledge_id, created_by) values (p_org, p_mentor, p_mentee, p_knowledge, auth.uid()) returning id into v_id;
  perform arbor_private.audit(p_org, 'league.mentorat', v_id::text, '{}'::jsonb);
  return v_id;
end $$;
create or replace function public.league_close_mentorship(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.league_mentorships;
begin
  select * into m from public.league_mentorships where id = p_id;
  if not found or not arbor_private.has_role(m.org_id, array['admin', 'manager']::public.org_role[]) then raise exception 'accès refusé'; end if;
  update public.league_mentorships set status = 'clos', ended_at = now() where id = p_id and status = 'actif';
end $$;
create or replace function public.league_create_season(p_org uuid, p_name text, p_starts timestamptz, p_ends timestamptz) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not arbor_private.has_role(p_org, array['admin', 'manager']::public.org_role[]) then raise exception 'accès refusé'; end if;
  if exists (select 1 from public.league_seasons where org_id = p_org and tstzrange(starts_at, ends_at) && tstzrange(p_starts, p_ends)) then raise exception 'une saison couvre déjà cette période'; end if;
  insert into public.league_seasons (org_id, name, starts_at, ends_at, created_by) values (p_org, trim(p_name), p_starts, p_ends, auth.uid()) returning id into v_id;
  perform arbor_private.audit(p_org, 'league.saison', v_id::text, '{}'::jsonb);
  return v_id;
end $$;
create or replace function public.league_create_challenge(p_org uuid, p_season uuid, p_title text, p_knowledge uuid[], p_ratio numeric default 0.8, p_cordee uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not arbor_private.has_role(p_org, array['admin', 'manager']::public.org_role[]) then raise exception 'accès refusé'; end if;
  if exists (select 1 from unnest(p_knowledge) k(kid) where not exists (select 1 from public.knowledge_nodes n where n.id = k.kid and n.org_id = p_org and n.status = 'valide')) then
    raise exception 'un défi porte sur des connaissances validées de l’organisation';
  end if;
  insert into public.league_challenges (org_id, season_id, cordee_id, title, knowledge_ids, target_ratio, created_by) values (p_org, p_season, p_cordee, trim(p_title), p_knowledge, p_ratio, auth.uid()) returning id into v_id;
  perform arbor_private.audit(p_org, 'league.defi', v_id::text, '{}'::jsonb);
  return v_id;
end $$;

revoke all on function public.league_backfill(uuid), public.my_league(uuid), public.league_board(uuid), public.league_save_cordee(uuid, text, text, uuid[], uuid, uuid),
  public.league_archive_cordee(uuid), public.league_start_mentorship(uuid, uuid, uuid, uuid), public.league_close_mentorship(uuid),
  public.league_create_season(uuid, text, timestamptz, timestamptz), public.league_create_challenge(uuid, uuid, text, uuid[], numeric, uuid) from public, anon;
grant execute on function public.league_backfill(uuid), public.my_league(uuid), public.league_board(uuid), public.league_save_cordee(uuid, text, text, uuid[], uuid, uuid),
  public.league_archive_cordee(uuid), public.league_start_mentorship(uuid, uuid, uuid, uuid), public.league_close_mentorship(uuid),
  public.league_create_season(uuid, text, timestamptz, timestamptz), public.league_create_challenge(uuid, uuid, text, uuid[], numeric, uuid) to authenticated;
revoke all on function arbor_private.league_award(uuid, uuid, text, text, uuid, bigint, uuid, uuid, uuid), arbor_private.league_rank_update(uuid, uuid, bigint),
  arbor_private.league_challenges_check(uuid, uuid, timestamptz, bigint), arbor_private.league_evaluate(public.evidence_events), arbor_private.league_replay(uuid) from public;

-- Historique existant : les preuves déjà enregistrées comptent (idempotent)
do $$ declare o record; begin
  for o in select id from public.organizations loop perform arbor_private.league_replay(o.id); end loop;
end $$;
