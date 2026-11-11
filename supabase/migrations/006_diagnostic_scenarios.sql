-- Arbor Business, étapes E à G : diagnostic corrigé par le serveur, Client Mystère, preuves.
-- - diagnostic_items : les questions d'un diagnostic, avec la bonne réponse. Jamais lisible par le navigateur :
--   le serveur pose la question, reçoit la réponse, corrige et écrit la preuve.
-- - scenario_sessions : une partie de Client Mystère (fiche du client, état de la situation, échange, débrief).
--   Lisible par la personne qui joue et par le manager / l'administrateur de l'organisation ; écrite par le serveur seulement.
-- - Le journal des appels accepte les nouvelles tâches.

create table if not exists public.diagnostic_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  user_id uuid not null,
  session_id uuid not null,
  knowledge_id uuid not null,
  question text not null,
  options jsonb not null,
  correct integer not null,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (org_id, user_id) references public.memberships (org_id, user_id),
  foreign key (knowledge_id, org_id) references public.knowledge_nodes (id, org_id)
);
create index if not exists diagnostic_items_session on public.diagnostic_items (session_id);
alter table public.diagnostic_items enable row level security;
revoke all on public.diagnostic_items from anon, authenticated;
grant all on public.diagnostic_items to service_role;

create table if not exists public.scenario_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  user_id uuid not null,
  kind text not null default 'client_mystere' check (kind in ('client_mystere')),
  spec jsonb not null,          -- fiche du client (profil, personnalité, besoin caché, objections, connaissances autorisées)
  state jsonb not null,         -- état de la situation (besoin découvert, objections levées, patience…)
  transcript jsonb not null default '[]'::jsonb,
  status text not null default 'en_cours' check (status in ('en_cours', 'termine')),
  debrief jsonb,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  foreign key (org_id, user_id) references public.memberships (org_id, user_id)
);
create index if not exists scenario_sessions_org_user on public.scenario_sessions (org_id, user_id, created_at desc);
alter table public.scenario_sessions enable row level security;
revoke all on public.scenario_sessions from anon, authenticated;
grant select (id, org_id, user_id, kind, status, debrief, created_at, ended_at) on public.scenario_sessions to authenticated;
grant all on public.scenario_sessions to service_role;
drop policy if exists scenario_read on public.scenario_sessions;
create policy scenario_read on public.scenario_sessions for select to authenticated
  using (user_id = auth.uid() or arbor_private.has_role(org_id, array['admin', 'manager']::public.org_role[]));

-- Le manager a besoin de relier les preuves à des personnes : il lit déjà les e-mails des membres (004).
-- Les preuves d'un diagnostic ou d'une simulation portent la version du document de la connaissance évaluée.

alter table public.ai_calls drop constraint if exists ai_calls_mode_check;
alter table public.ai_calls add constraint ai_calls_mode_check
  check (mode in ('socratique', 'enseigne', 'enrichir', 'rediger_cours', 'rediger_notion', 'extraire', 'competences', 'diagnostic', 'mystere'));
