-- Arbor : la génération de contenu passe par le serveur (plus aucune clé IA dans le navigateur).
-- Le journal des appels accepte les nouvelles tâches ; le quota de génération est compté à part du dialogue.
alter table public.ai_calls drop constraint if exists ai_calls_mode_check;
alter table public.ai_calls add constraint ai_calls_mode_check
  check (mode in ('socratique', 'enseigne', 'enrichir', 'rediger_cours', 'rediger_notion'));

-- Comptage rapide des appels du mois par tâche (quota)
create index if not exists ai_calls_user_mode_at on public.ai_calls (user_id, mode, at desc);
