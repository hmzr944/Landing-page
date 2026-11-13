-- Arbor, migration 010 : retours des participants (pilote G7).
-- À appliquer APRÈS 001 à 009. Rejouable. N'altère aucune table existante.
--
-- Un retour est volontaire, rédigé par la personne, et ne contient aucun contenu de cours.
-- - Retour « Business » (rattaché à une organisation dont la personne est membre active) : lisible par son auteur et par
--   les responsables (administrateur, manager) de cette organisation.
-- - Retour « Student » (sans organisation) : lisible par son auteur seulement ; l'équipe Arbor le lit dans le tableau
--   de bord Supabase (rôle de service). Il n'est jamais visible d'une organisation.
-- Personne ne modifie un retour après l'envoi ; l'auteur peut l'effacer (droit à l'effacement).

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  org_id uuid references public.organizations (id) on delete cascade,
  space text not null check (space in ('student', 'business')),
  pilot_step text check (pilot_step is null or char_length(pilot_step) <= 40),
  blocked text not null default '' check (char_length(blocked) <= 2000),
  learned_score smallint check (learned_score between 1 and 5),
  learned text not null default '' check (char_length(learned) <= 2000),
  would_use text check (would_use in ('oui', 'peut_etre', 'non')),
  would_use_why text not null default '' check (char_length(would_use_why) <= 1000),
  ease smallint check (ease between 1 and 5),
  app_version text check (app_version is null or char_length(app_version) <= 20),
  created_at timestamptz not null default now(),
  -- un retour Business porte l'organisation, un retour Student n'en porte pas
  check ((space = 'business') = (org_id is not null)),
  -- au moins une réponse
  check (char_length(blocked) > 0 or learned_score is not null or char_length(learned) > 0 or would_use is not null or ease is not null)
);
create index if not exists feedback_org on public.feedback (org_id, created_at desc);
create index if not exists feedback_user on public.feedback (user_id, created_at desc);

alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;
grant select, delete on public.feedback to authenticated;
grant insert (org_id, space, pilot_step, blocked, learned_score, learned, would_use, would_use_why, ease, app_version) on public.feedback to authenticated;
grant all on public.feedback to service_role;

drop policy if exists feedback_insert on public.feedback;
create policy feedback_insert on public.feedback for insert to authenticated
  with check (user_id = auth.uid() and (org_id is null or arbor_private.is_member(org_id)));
drop policy if exists feedback_read on public.feedback;
create policy feedback_read on public.feedback for select to authenticated
  using (user_id = auth.uid() or (org_id is not null and arbor_private.has_role(org_id, array['admin', 'manager']::public.org_role[])));
drop policy if exists feedback_delete on public.feedback;
create policy feedback_delete on public.feedback for delete to authenticated using (user_id = auth.uid());

-- Les retours Business de la personne suivent ses droits sur ses données d'organisation : effacés avec elles.
create or replace function arbor_private.feedback_on_erase() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.action = 'donnees.effacees' then
    delete from public.feedback where org_id = new.org_id and user_id = new.actor;
  end if;
  return null;
end $$;
drop trigger if exists feedback_on_erase on public.audit_logs;
create trigger feedback_on_erase after insert on public.audit_logs for each row execute function arbor_private.feedback_on_erase();
