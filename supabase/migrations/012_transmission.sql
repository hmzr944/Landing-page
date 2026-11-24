-- 012 · Transmission & Knowledge Sharing (Arbor 2)
-- Un membre de l'organisation transmet une méthode ou un savoir-faire : titre, situation, étapes, pièges, astuces.
-- Règles :
-- - une transmission n'entre JAMAIS seule dans le référentiel : elle est « soumise », puis relue par un responsable
--   (admin, manager ou expert) qui la valide ou la rejette avec une note ; l'auteur ne valide pas sa propre transmission ;
-- - le statut et la relecture sont conservés (qui, quand, pourquoi), et chaque décision est inscrite au journal d'audit ;
-- - l'auteur voit et retire ses transmissions tant qu'elles ne sont pas validées ; les membres ne voient que les
--   transmissions validées (savoir-faire partagé) et les leurs ; une autre organisation ne voit rien ;
-- - une transmission validée reste distincte des règles extraites des documents (socle souverain) : c'est un
--   savoir-faire de terrain validé, affiché comme tel. Rien n'est écrit dans knowledge_nodes.
-- Rejouable sans erreur.

create table if not exists public.transmissions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  author uuid not null references auth.users (id),
  title text not null check (char_length(title) between 3 and 160),
  situation text not null check (char_length(situation) between 10 and 1200),
  steps jsonb not null check (jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) between 2 and 20),
  pitfalls jsonb not null default '[]'::jsonb check (jsonb_typeof(pitfalls) = 'array' and jsonb_array_length(pitfalls) <= 20),
  tips jsonb not null default '[]'::jsonb check (jsonb_typeof(tips) = 'array' and jsonb_array_length(tips) <= 20),
  status text not null default 'soumise' check (status in ('soumise', 'validee', 'rejetee')),
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  review_note text check (review_note is null or char_length(review_note) <= 600),
  created_at timestamptz not null default now(),
  check (status = 'soumise' or (reviewed_by is not null and reviewed_at is not null)),
  check (reviewed_by is null or reviewed_by <> author)
);
create index if not exists transmissions_org on public.transmissions (org_id, status, created_at desc);
alter table public.transmissions enable row level security;
revoke all on public.transmissions from anon, authenticated;
grant select, delete on public.transmissions to authenticated;

drop policy if exists tr_read on public.transmissions;
create policy tr_read on public.transmissions for select to authenticated using (
  arbor_private.is_member(org_id) and (status = 'validee' or author = auth.uid() or arbor_private.has_role(org_id, array['admin', 'manager', 'expert']::public.org_role[])));
drop policy if exists tr_delete on public.transmissions;
create policy tr_delete on public.transmissions for delete to authenticated using (author = auth.uid() and status <> 'validee');

-- Soumettre : seulement par une fonction (statut imposé « soumise », auteur = la personne connectée)
create or replace function public.submit_transmission(p_org uuid, p_title text, p_situation text, p_steps jsonb, p_pitfalls jsonb default '[]'::jsonb, p_tips jsonb default '[]'::jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not arbor_private.is_member(p_org) then raise exception 'accès refusé'; end if;
  insert into public.transmissions (org_id, author, title, situation, steps, pitfalls, tips)
  values (p_org, auth.uid(), p_title, p_situation, p_steps, coalesce(p_pitfalls, '[]'::jsonb), coalesce(p_tips, '[]'::jsonb)) returning id into v_id;
  perform arbor_private.audit(p_org, 'transmission.soumise', v_id::text, jsonb_build_object('titre', p_title));
  return v_id;
end $$;

-- Relire : valider ou rejeter, par un responsable qui n'en est pas l'auteur ; une seule décision
create or replace function public.review_transmission(p_id uuid, p_decision text, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.transmissions;
begin
  select * into t from public.transmissions where id = p_id;
  if t.id is null then raise exception 'transmission introuvable'; end if;
  if not arbor_private.has_role(t.org_id, array['admin', 'manager', 'expert']::public.org_role[]) then raise exception 'accès refusé'; end if;
  if t.author = auth.uid() then raise exception 'relecture par une autre personne que l''auteur'; end if;
  if t.status <> 'soumise' then raise exception 'déjà relue'; end if;
  if p_decision not in ('validee', 'rejetee') then raise exception 'décision inconnue'; end if;
  if p_decision = 'rejetee' and coalesce(btrim(p_note), '') = '' then raise exception 'un rejet explique pourquoi'; end if;
  update public.transmissions set status = p_decision, reviewed_by = auth.uid(), reviewed_at = now(), review_note = nullif(btrim(p_note), '') where id = p_id;
  perform arbor_private.audit(t.org_id, 'transmission.' || p_decision, p_id::text, jsonb_build_object('titre', t.title));
end $$;

revoke all on function public.submit_transmission(uuid, text, text, jsonb, jsonb, jsonb) from public, anon;
revoke all on function public.review_transmission(uuid, text, text) from public, anon;
grant execute on function public.submit_transmission(uuid, text, text, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.review_transmission(uuid, text, text) to authenticated;
