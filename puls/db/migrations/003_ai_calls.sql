-- =====================================================================
-- PULS : 003 Journal des appels d'IA (fonction serveur « ai »)
-- Aucun contenu de message ni de réponse n'est stocké : seulement des métadonnées
-- (tâche, fournisseur, modèle, jetons, durée, statut), pour les quotas et la traçabilité.
-- Écriture réservée au serveur (rôle service) ; lecture : administrateurs et responsables SAV.
-- =====================================================================
create table public.ai_calls (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  task text not null check (task in ('triage', 'draft_reply')),
  provider text not null,
  model text not null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  latency_ms integer not null default 0 check (latency_ms >= 0),
  status text not null check (status in ('ok', 'error', 'refused')),
  at timestamptz not null default now()
);
create index ai_calls_company_month on public.ai_calls (company_id, at);
alter table public.ai_calls enable row level security;
create policy ai_calls_read on public.ai_calls for select to authenticated
  using (puls_private.has_role(company_id, array['admin','sav_manager']::public.puls_role[]));
revoke insert, update, delete on public.ai_calls from authenticated, anon;
grant select on public.ai_calls to authenticated;
grant select, insert on public.ai_calls to service_role;
grant usage on sequence public.ai_calls_id_seq to service_role;
