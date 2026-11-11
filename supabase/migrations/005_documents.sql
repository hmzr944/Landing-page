-- Arbor Business, étape D : documents de l'organisation, versions, extraction des connaissances.
-- - add_source / add_version : un document et ses versions sont créés de façon atomique (numéro de version,
--   chemin du fichier dans le dossier privé de l'organisation, empreinte), par l'équipe de contenu seulement, journalisé.
-- - Une version identique à la précédente (même empreinte) est refusée : « document inchangé ».
-- - Le journal des appels accepte la tâche « extraire ».

create or replace function public.add_source(p_org uuid, p_title text, p_checksum text, p_pages integer default null)
returns table (source_id uuid, version_id uuid, version integer, storage_path text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare v_src uuid; v_ver uuid; v_path text;
begin
  if not arbor_private.has_role(p_org, array['admin', 'manager', 'expert']::public.org_role[]) then raise exception 'accès refusé'; end if;
  insert into public.sources (org_id, title, kind, current_version, created_by) values (p_org, trim(p_title), 'pdf', 1, auth.uid()) returning id into v_src;
  v_path := p_org::text || '/' || v_src::text || '/v1.pdf';
  insert into public.source_versions (org_id, source_id, version, storage_path, checksum, page_count, uploaded_by)
    values (p_org, v_src, 1, v_path, p_checksum, p_pages, auth.uid()) returning id into v_ver;
  perform arbor_private.audit(p_org, 'document.ajoute', v_src::text, jsonb_build_object('title', p_title, 'version', 1));
  return query select v_src, v_ver, 1, v_path;
end $$;

create or replace function public.add_version(p_source uuid, p_checksum text, p_pages integer default null)
returns table (source_id uuid, version_id uuid, version integer, storage_path text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare v_s public.sources; v_last public.source_versions; v_ver uuid; v_n integer; v_path text;
begin
  select * into v_s from public.sources where id = p_source for update;
  if not found then raise exception 'document introuvable'; end if;
  if not arbor_private.has_role(v_s.org_id, array['admin', 'manager', 'expert']::public.org_role[]) then raise exception 'accès refusé'; end if;
  select * into v_last from public.source_versions where source_id = p_source order by version desc limit 1;
  if found and v_last.checksum is not null and v_last.checksum = p_checksum then raise exception 'document inchangé'; end if;
  v_n := coalesce(v_last.version, 0) + 1;
  v_path := v_s.org_id::text || '/' || p_source::text || '/v' || v_n || '.pdf';
  insert into public.source_versions (org_id, source_id, version, storage_path, checksum, page_count, uploaded_by)
    values (v_s.org_id, p_source, v_n, v_path, p_checksum, p_pages, auth.uid()) returning id into v_ver;
  update public.sources set current_version = v_n where id = p_source;
  perform arbor_private.audit(v_s.org_id, 'document.version', p_source::text, jsonb_build_object('version', v_n));
  return query select p_source, v_ver, v_n, v_path;
end $$;

revoke all on function public.add_source(uuid, text, text, integer) from public, anon;
revoke all on function public.add_version(uuid, text, integer) from public, anon;
grant execute on function public.add_source(uuid, text, text, integer) to authenticated;
grant execute on function public.add_version(uuid, text, integer) to authenticated;

alter table public.ai_calls drop constraint if exists ai_calls_mode_check;
alter table public.ai_calls add constraint ai_calls_mode_check
  check (mode in ('socratique', 'enseigne', 'enrichir', 'rediger_cours', 'rediger_notion', 'extraire'));

-- Stockage privé (au cas où il n'existait pas encore) : seuls admin, manager et expert de l'organisation lisent et déposent
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('org-sources', 'org-sources', false, 20971520, array['application/pdf']) on conflict (id) do update set public = false;
  end if;
end $$;
