-- Arbor : quotas et coût du tuteur IA.
-- À exécuter une fois dans Supabase (SQL Editor). Ne stocke AUCUN contenu de cours ni aucune réponse :
-- seulement des compteurs, pour appliquer les quotas et mesurer le coût réel par utilisateur.

-- Compteur mensuel par utilisateur
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null,                        -- « 2026-11 »
  calls integer not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cost_usd numeric(10, 5) not null default 0,
  primary key (user_id, month)
);

-- Journal des appels (métadonnées uniquement : mode, jetons, coût, refus)
create table if not exists public.ai_calls (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  mode text not null check (mode in ('socratique', 'enseigne')),
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(10, 5) not null default 0,
  refused boolean not null default false
);
create index if not exists ai_calls_user_at on public.ai_calls (user_id, at desc);

-- Sécurité : chaque utilisateur lit seulement ses lignes ; personne n'écrit depuis le navigateur.
-- Seule la fonction serveur (clé service, qui contourne RLS) incrémente les compteurs.
alter table public.ai_usage enable row level security;
alter table public.ai_calls enable row level security;

drop policy if exists "lecture de son propre usage" on public.ai_usage;
create policy "lecture de son propre usage" on public.ai_usage
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "lecture de ses propres appels" on public.ai_calls;
create policy "lecture de ses propres appels" on public.ai_calls
  for select to authenticated using (auth.uid() = user_id);

-- Incrément atomique, appelé par la fonction serveur uniquement
create or replace function public.ai_record_call(
  p_user uuid, p_month text, p_mode text, p_model text,
  p_in integer, p_out integer, p_cost numeric, p_refused boolean
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into ai_usage (user_id, month, calls, input_tokens, output_tokens, cost_usd)
  values (p_user, p_month, 1, p_in, p_out, p_cost)
  on conflict (user_id, month) do update set
    calls = ai_usage.calls + 1,
    input_tokens = ai_usage.input_tokens + excluded.input_tokens,
    output_tokens = ai_usage.output_tokens + excluded.output_tokens,
    cost_usd = ai_usage.cost_usd + excluded.cost_usd;
  insert into ai_calls (user_id, mode, model, input_tokens, output_tokens, cost_usd, refused)
  values (p_user, p_mode, p_model, p_in, p_out, p_cost, p_refused);
end $$;
revoke all on function public.ai_record_call from public, anon, authenticated;
grant execute on function public.ai_record_call to service_role;

-- Conservation : les métadonnées d'appel de plus de 13 mois peuvent être purgées
-- (à planifier plus tard avec pg_cron) : delete from ai_calls where at < now() - interval '13 months';
