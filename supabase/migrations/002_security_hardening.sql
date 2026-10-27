-- Harden the initial schema. Apply AFTER 001_initial.sql.
-- This migration is designed for a fresh Supabase project. Validate in staging before production.

-- All paired workspace references must stay inside one tenant.
alter table public.tasks add constraint tasks_workspace_id_key unique(workspace_id,id);
alter table public.topical_maps add constraint topical_maps_workspace_id_key unique(workspace_id,id);
alter table public.topical_map_nodes add constraint topical_map_nodes_workspace_id_key unique(workspace_id,id);
alter table public.keywords add constraint keywords_workspace_id_key unique(workspace_id,id);
alter table public.social_accounts add constraint social_accounts_workspace_id_key unique(workspace_id,id);
alter table public.account_directory add constraint account_directory_workspace_id_key unique(workspace_id,id);
alter table public.topical_map_nodes add constraint topic_keyword_same_workspace foreign key(workspace_id,keyword_id) references public.keywords(workspace_id,id) on delete set null(keyword_id);

alter table public.task_checklist_items add constraint checklist_task_same_workspace foreign key(workspace_id,task_id) references public.tasks(workspace_id,id) on delete cascade;
alter table public.task_comments add constraint comments_task_same_workspace foreign key(workspace_id,task_id) references public.tasks(workspace_id,id) on delete cascade;
alter table public.task_evidence add constraint evidence_task_same_workspace foreign key(workspace_id,task_id) references public.tasks(workspace_id,id) on delete cascade;
alter table public.task_reviews add constraint review_task_same_workspace foreign key(workspace_id,task_id) references public.tasks(workspace_id,id) on delete cascade;
alter table public.task_status_history add constraint history_task_same_workspace foreign key(workspace_id,task_id) references public.tasks(workspace_id,id) on delete cascade;
alter table public.topical_map_nodes add constraint nodes_map_same_workspace foreign key(workspace_id,map_id) references public.topical_maps(workspace_id,id) on delete cascade;
alter table public.topical_map_edges add constraint edges_map_same_workspace foreign key(workspace_id,map_id) references public.topical_maps(workspace_id,id) on delete cascade;
alter table public.topical_map_edges add constraint edges_source_same_workspace foreign key(workspace_id,source_id) references public.topical_map_nodes(workspace_id,id) on delete cascade;
alter table public.topical_map_edges add constraint edges_target_same_workspace foreign key(workspace_id,target_id) references public.topical_map_nodes(workspace_id,id) on delete cascade;
alter table public.social_content add constraint social_account_same_workspace foreign key(workspace_id,account_id) references public.social_accounts(workspace_id,id) on delete set null(account_id);
alter table public.account_access add constraint access_account_same_workspace foreign key(workspace_id,account_id) references public.account_directory(workspace_id,id) on delete cascade;
-- PostgreSQL 15+ permits a column-specific SET NULL action.
alter table public.tasks drop constraint if exists tasks_workspace_id_section_id_fkey;
alter table public.tasks add constraint task_section_same_workspace foreign key(workspace_id,section_id) references public.sections(workspace_id,id) on delete set null(section_id);

-- Project ownership and section visibility are both part of authorization.
create or replace function public.can_project(p_project uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.projects p where p.id=p_project and public.is_member(p.workspace_id)
 and (p.visibility='workspace' or p.created_by=auth.uid() or public.has_role(p.workspace_id,array['owner','admin'])
 or exists(select 1 from public.project_members pm where pm.project_id=p.id and pm.user_id=auth.uid())));
$$;

create or replace function public.can_section(p_section uuid) returns boolean
language sql stable security definer set search_path=public as $$
 with recursive ancestors as (
 select id,workspace_id,project_id,parent_section_id,visibility from public.sections where id=p_section
 union all select parent.id,parent.workspace_id,parent.project_id,parent.parent_section_id,parent.visibility
 from public.sections parent join ancestors child on parent.id=child.parent_section_id
 )
 select exists(
  select 1 from ancestors a group by a.workspace_id
  having public.is_member(a.workspace_id)
  and bool_and(a.project_id is null or public.can_project(a.project_id))
  and bool_and(a.visibility='workspace' or public.has_role(a.workspace_id,array['owner','admin'])
    or exists(select 1 from public.section_permissions sp where sp.section_id=a.id and sp.user_id=auth.uid()))
 );
$$;
alter table public.sections add column created_by uuid references auth.users(id) default auth.uid();
create function public.can_edit_section(p_section uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select public.can_section(p_section) and exists (
  select 1 from public.sections s where s.id=p_section and
  (s.created_by=auth.uid() or public.has_role(s.workspace_id,array['owner','admin']) or
   (s.visibility='workspace' and public.has_role(s.workspace_id,array['manager'])) or
   exists(select 1 from public.section_permissions sp where sp.section_id=s.id and sp.user_id=auth.uid() and sp.can_edit))
 );
$$;

-- Validate nested relationships and prevent cycles across sections.
create function public.guard_section_parent() returns trigger language plpgsql set search_path=public as $$
declare parent_project uuid; parent_ws uuid; found_cycle boolean;
begin
 if new.parent_section_id is null then return new; end if;
 if new.id=new.parent_section_id then raise exception 'A section cannot be its own parent'; end if;
 select workspace_id,project_id into parent_ws,parent_project from public.sections where id=new.parent_section_id;
 if parent_ws is distinct from new.workspace_id or parent_project is distinct from new.project_id then
  raise exception 'Parent section must belong to same workspace and project';
 end if;
 with recursive parents as (
  select id,parent_section_id from public.sections where id=new.parent_section_id
  union all select s.id,s.parent_section_id from public.sections s join parents p on s.id=p.parent_section_id
 ) select exists(select 1 from parents where id=new.id) into found_cycle;
 if found_cycle then raise exception 'Section nesting cycle not allowed'; end if;
 return new;
end $$;
create trigger section_no_cycle before insert or update of parent_section_id,project_id,workspace_id on public.sections
for each row execute function public.guard_section_parent();

drop policy sections_update on public.sections;
create policy sections_update on public.sections for update to authenticated using(public.can_edit_section(id)) with check(public.can_edit_section(id));
drop policy fields_write on public.section_fields;
create policy fields_write on public.section_fields for insert to authenticated with check(public.can_edit_section(section_id));
drop policy records_write on public.section_records;
create policy records_write on public.section_records for insert to authenticated with check(public.can_section(section_id) and created_by=auth.uid());

-- Explicit membership is necessary even when an account entry has a stale access grant.
create or replace function public.can_account(aid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.account_directory a where a.id=aid and public.is_member(a.workspace_id)
 and (public.has_role(a.workspace_id,array['owner','admin'])
 or exists(select 1 from public.account_access x where x.account_id=aid and x.user_id=auth.uid())));
$$;
create function public.ensure_access_member() returns trigger language plpgsql set search_path=public as $$
begin
 if not exists(select 1 from public.workspace_members m where m.workspace_id=new.workspace_id and m.user_id=new.user_id)
 then raise exception 'Account permission requires active workspace membership'; end if;
 return new;
end $$;
create trigger account_grant_member before insert or update on public.account_access for each row execute function public.ensure_access_member();
create trigger project_grant_member before insert or update on public.project_members for each row execute function public.ensure_access_member();

-- Task lifecycle: direct PostgREST updates cannot bypass server-side approval rules.
revoke update on public.tasks from authenticated;
create function public.transition_task(p_workspace uuid,p_task uuid,p_status text,p_comment text default '') returns uuid
language plpgsql security definer set search_path=public as $$
declare t public.tasks; r text; eligible boolean:=false;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into t from public.tasks where id=p_task and workspace_id=p_workspace for update;
 if not found or not public.can_task(p_task) then raise exception 'Task unavailable'; end if;
 select role into r from public.workspace_members where workspace_id=p_workspace and user_id=auth.uid();
 if r is null then raise exception 'Not a member'; end if;
 if p_status=t.status then raise exception 'Task already in that status'; end if;
 if p_status in ('approved','changes_requested') then
  eligible:=(t.status='submitted' and r in ('owner','admin','manager') and
    t.created_by<>auth.uid() and t.assigned_to is distinct from auth.uid());
 elsif p_status='submitted' then
  eligible:=(t.status in ('todo','in_progress','changes_requested') and (t.assigned_to=auth.uid() or r in ('owner','admin')));
 elsif p_status='cancelled' then eligible:=(r in ('owner','admin') and t.status<>'approved');
 elsif p_status='in_progress' then eligible:=(t.status in ('todo','changes_requested') and (t.assigned_to=auth.uid() or r in ('owner','admin','manager')));
 elsif p_status='todo' then eligible:=(t.status='in_progress' and r in ('owner','admin','manager'));
 end if;
 if not eligible then raise exception 'Invalid task transition or insufficient permission'; end if;
 update public.tasks set status=p_status,updated_at=now(),completed_at=case when p_status='approved' then now() else null end where id=p_task;
 insert into public.task_status_history(workspace_id,task_id,actor_id,from_status,to_status) values(p_workspace,p_task,auth.uid(),t.status,p_status);
 if p_status in ('approved','changes_requested') then
  insert into public.task_reviews(workspace_id,task_id,reviewer_id,decision,comment) values(p_workspace,p_task,auth.uid(),p_status,left(p_comment,5000));
  if t.assigned_to is not null and t.assigned_to<>auth.uid() then
   insert into public.notifications(workspace_id,user_id,kind,body) values(p_workspace,t.assigned_to,'review',left('Task '||p_status||': '||t.title,500));
  end if;
 elsif p_status='submitted' then
  insert into public.notifications(workspace_id,user_id,kind,body)
   select p_workspace,m.user_id,'submitted',left('Review task: '||t.title,500) from public.workspace_members m
   where m.workspace_id=p_workspace and m.role in ('owner','admin','manager') and m.user_id<>auth.uid() limit 15;
 end if;
 return p_task;
end $$;
create function public.set_task_hours(p_workspace uuid,p_task uuid,p_hours numeric) returns uuid
language plpgsql security definer set search_path=public as $$
declare t public.tasks;
begin
 select * into t from public.tasks where id=p_task and workspace_id=p_workspace;
 if not found or not public.can_task(p_task) then raise exception 'Task not found'; end if;
 if t.assigned_to is distinct from auth.uid() and not public.has_role(p_workspace,array['owner','admin','manager']) then
 raise exception 'Not allowed to edit task hours'; end if;
 if p_hours<0 or p_hours>100000 then raise exception 'Hours invalid'; end if;
 update public.tasks set actual_hours=p_hours,updated_at=now() where id=p_task;
 return p_task;
end $$;
revoke all on function public.transition_task(uuid,uuid,text,text) from public;
revoke all on function public.set_task_hours(uuid,uuid,numeric) from public;
grant execute on function public.transition_task(uuid,uuid,text,text) to authenticated;
grant execute on function public.set_task_hours(uuid,uuid,numeric) to authenticated;

-- Ensure direct insertions into related audit tables cannot forge approval/status history.
revoke insert,update,delete on public.task_status_history from authenticated;
revoke insert,update,delete on public.task_reviews from authenticated;
-- New assignment notifications must survive member-created tasks (trigger has trusted privileges).
create function public.notify_task_assignment() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.assigned_to is not null and new.assigned_to is distinct from new.created_by then
  insert into public.notifications(workspace_id,user_id,kind,body) values(new.workspace_id,new.assigned_to,'assignment',left('New task: '||new.title,500));
 end if;
 return new;
end $$;
create trigger task_created_notify after insert on public.tasks for each row execute function public.notify_task_assignment();
create function public.ensure_assignee_member() returns trigger language plpgsql set search_path=public as $$
begin
 if new.assigned_to is not null and not exists(select 1 from public.workspace_members m where m.workspace_id=new.workspace_id and m.user_id=new.assigned_to) then
 raise exception 'Assignee must be a workspace member'; end if;
 return new;
end $$;
create trigger task_assignee_valid before insert or update of assigned_to,workspace_id on public.tasks for each row execute function public.ensure_assignee_member();

-- Limit a Supabase client to updating specific workspace and invitation fields.
revoke update on public.workspaces from authenticated;
grant update(name,description,logo_url,timezone) on public.workspaces to authenticated;
revoke update on public.workspace_invitations from authenticated;
grant update(status) on public.workspace_invitations to authenticated;

-- Restrict report artifacts to authorized readers, unlike general evidence files.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('reports-private','reports-private',false,20971520,array['application/pdf']) on conflict(id) do nothing;
create policy reports_private_insert on storage.objects for insert to authenticated with check
 (bucket_id='reports-private' and public.is_member((split_part(name,'/',1))::uuid));
create policy reports_private_read on storage.objects for select to authenticated using
 (bucket_id='reports-private' and
 (public.has_role((split_part(name,'/',1))::uuid,array['owner','admin','manager'])
 or exists(select 1 from public.reports r where r.storage_path=name and r.generated_by=auth.uid())));
create policy reports_private_delete on storage.objects for delete to authenticated using
 (bucket_id='reports-private' and public.is_member((split_part(name,'/',1))::uuid));

-- Prevent URL disclosure of files from inaccessible private tasks; owner and uploader retain access.
drop policy ws_storage_read on storage.objects;
create policy ws_storage_read on storage.objects for select to authenticated using
 (bucket_id='workspace-files' and public.is_member((split_part(name,'/',1))::uuid) and
 (public.has_role((split_part(name,'/',1))::uuid,array['owner','admin'])
 or exists(select 1 from public.attachments a where a.storage_path=name and
  (a.uploaded_by=auth.uid() or exists(select 1 from public.task_evidence te
    where te.file_path=a.storage_path and public.can_task(te.task_id))))));

-- A new task always starts unreviewed, even when inserted directly through the data API.
drop policy tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert to authenticated
with check(public.is_member(workspace_id) and created_by=auth.uid() and status='todo' and completed_at is null
 and (project_id is null or public.can_project(project_id)));

-- Private project access must also be applied to specialized content/research tables.
create function public.can_map(p_map uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.topical_maps tm where tm.id=p_map and public.is_member(tm.workspace_id)
 and (tm.project_id is null or public.can_project(tm.project_id)));
$$;
do $$ declare tbl text;
begin
 foreach tbl in array array['seo_work_records','keywords','topical_maps','social_content','websites'] loop
  execute format('drop policy if exists %I on public.%I',tbl||'_read',tbl);
  execute format('drop policy if exists %I on public.%I',tbl||'_insert',tbl);
  execute format('drop policy if exists %I on public.%I',tbl||'_update',tbl);
  execute format('drop policy if exists %I on public.%I',tbl||'_delete',tbl);
  execute format('create policy %I on public.%I for select to authenticated using(public.is_member(workspace_id) and (project_id is null or public.can_project(project_id)))',tbl||'_read',tbl);
  execute format('create policy %I on public.%I for insert to authenticated with check(public.is_member(workspace_id) and (project_id is null or public.can_project(project_id)))',tbl||'_insert',tbl);
  execute format('create policy %I on public.%I for update to authenticated using(public.is_member(workspace_id) and (project_id is null or public.can_project(project_id))) with check(public.is_member(workspace_id) and (project_id is null or public.can_project(project_id)))',tbl||'_update',tbl);
  execute format('create policy %I on public.%I for delete to authenticated using(public.has_role(workspace_id,array[''owner'',''admin'',''manager'']) and (project_id is null or public.can_project(project_id)))',tbl||'_delete',tbl);
 end loop;
end $$;
-- Linked nodes and edges inherit permissions from the parent topical map.
drop policy topical_map_nodes_read on public.topical_map_nodes;
create policy topical_map_nodes_read on public.topical_map_nodes for select to authenticated using(public.can_map(map_id));
drop policy topical_map_nodes_insert on public.topical_map_nodes;
create policy topical_map_nodes_insert on public.topical_map_nodes for insert to authenticated with check(public.can_map(map_id));
drop policy topical_map_nodes_update on public.topical_map_nodes;
create policy topical_map_nodes_update on public.topical_map_nodes for update to authenticated using(public.can_map(map_id)) with check(public.can_map(map_id));
drop policy topical_map_edges_read on public.topical_map_edges;
create policy topical_map_edges_read on public.topical_map_edges for select to authenticated using(public.can_map(map_id));
drop policy topical_map_edges_insert on public.topical_map_edges;
create policy topical_map_edges_insert on public.topical_map_edges for insert to authenticated with check(public.can_map(map_id));
drop policy topical_map_edges_update on public.topical_map_edges;
create policy topical_map_edges_update on public.topical_map_edges for update to authenticated using(public.can_map(map_id)) with check(public.can_map(map_id));
-- Only notify existing members (as opposed to outside email addresses).
drop policy notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert to authenticated with check
(public.has_role(workspace_id,array['owner','admin','manager']) and
 exists(select 1 from public.workspace_members m where m.workspace_id=notifications.workspace_id and m.user_id=notifications.user_id));

-- Support safely revoking access to account-directory entries.
create policy access_delete on public.account_access for delete to authenticated
using(public.has_role(workspace_id,array['owner','admin']));
