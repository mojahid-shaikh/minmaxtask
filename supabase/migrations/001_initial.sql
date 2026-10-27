-- Multi-tenant schema. Run in Supabase SQL Editor once in a NEW project.
create extension if not exists pgcrypto;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', username text unique,
  title text default '', bio text default '', skills text[] default '{}',
  avatar_url text, cover_url text, timezone text default 'Asia/Dhaka',
  language text default 'en', visibility text default 'workspace' check (visibility in ('public','workspace','private')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.user_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 theme text default 'light' check(theme in('light','dark','system')),
 notifications_enabled boolean not null default true, dashboard_widgets jsonb not null default '[]'::jsonb
);
create function public.on_user_created() returns trigger language plpgsql security definer set search_path = public as $$
begin
 insert into public.profiles(user_id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name','')) on conflict do nothing;
 insert into public.user_preferences(user_id) values(new.id) on conflict do nothing;
 return new;
end $$;
create trigger auth_profile_created after insert on auth.users for each row execute function public.on_user_created();

create table public.workspaces (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 name text not null, slug text unique not null check (slug ~ '^[a-z0-9][a-z0-9-]{2,49}$'),
 description text default '', kind text not null default 'company' check(kind in('company','personal')),
 logo_url text, timezone text default 'Asia/Dhaka', created_at timestamptz default now()
);
create table public.workspace_members (
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','admin','manager','member')),
 joined_at timestamptz not null default now(), primary key(workspace_id,user_id)
);
create table public.workspace_invitations (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 email text not null, role text not null check(role in('admin','manager','member')),
 token_hash text not null unique, status text default 'pending' check(status in('pending','accepted','revoked')),
 invited_by uuid not null references auth.users(id), expires_at timestamptz not null,
 accepted_at timestamptz, created_at timestamptz default now()
);

-- SECURITY DEFINER helper functions avoid recursive RLS checks.
create function public.is_member(ws uuid) returns boolean language sql stable security definer set search_path = public as $$
 select auth.uid() is not null and exists(select 1 from public.workspace_members m where m.workspace_id=ws and m.user_id=auth.uid());
$$;
create function public.has_role(ws uuid, roles text[]) returns boolean language sql stable security definer set search_path = public as $$
 select auth.uid() is not null and exists(select 1 from public.workspace_members m where m.workspace_id=ws and m.user_id=auth.uid() and m.role=any(roles));
$$;
create function public.create_workspace(p_name text,p_slug text,p_kind text default 'company') returns uuid
language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if length(trim(p_name)) not between 2 and 100 or p_slug !~ '^[a-z0-9][a-z0-9-]{2,49}$' or p_kind not in('company','personal') then raise exception 'Invalid workspace'; end if;
 insert into public.workspaces(owner_id,name,slug,kind) values(auth.uid(),trim(p_name),p_slug,p_kind) returning id into new_id;
 insert into public.workspace_members(workspace_id,user_id,role) values(new_id,auth.uid(),'owner');
 return new_id;
end $$;
create function public.accept_invitation(p_token_hash text) returns uuid language plpgsql security definer set search_path=public as $$
declare inv public.workspace_invitations; cur_email text;
begin
 if auth.uid() is null then raise exception 'Not authenticated'; end if;
 select email into cur_email from auth.users where id=auth.uid();
 select * into inv from public.workspace_invitations where token_hash=p_token_hash and status='pending' and expires_at>now() for update;
 if not found or lower(inv.email) <> lower(cur_email) then raise exception 'Invitation invalid or wrong email'; end if;
 insert into public.workspace_members(workspace_id,user_id,role) values(inv.workspace_id,auth.uid(),inv.role)
 on conflict(workspace_id,user_id) do nothing;
 update public.workspace_invitations set status='accepted',accepted_at=now() where id=inv.id;
 return inv.workspace_id;
end $$;

create table public.projects (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 name text not null, description text default '', client_name text default '', domain text default '',
 visibility text not null default 'workspace' check(visibility in('workspace','private')),
 status text not null default 'active' check(status in('active','on_hold','completed','archived')),
 created_by uuid not null references auth.users(id), due_at date, created_at timestamptz default now(),
 unique(workspace_id,id)
);
create table public.project_members (
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 project_id uuid not null, user_id uuid not null references auth.users(id) on delete cascade,
 primary key(project_id,user_id),foreign key(workspace_id,project_id) references public.projects(workspace_id,id) on delete cascade
);
create function public.can_project(p_project uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.projects p where p.id=p_project and public.is_member(p.workspace_id)
 and (p.visibility='workspace' or public.has_role(p.workspace_id,array['owner','admin'])
 or exists(select 1 from public.project_members pm where pm.project_id=p.id and pm.user_id=auth.uid())));
$$;
create table public.sections (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 project_id uuid, parent_section_id uuid, name text not null,
 visibility text not null default 'workspace' check(visibility in('workspace','private')),
 icon text default 'layers', archived boolean default false, created_at timestamptz default now(),
 unique(workspace_id,id),
 foreign key(workspace_id,project_id) references public.projects(workspace_id,id) on delete cascade,
 foreign key(workspace_id,parent_section_id) references public.sections(workspace_id,id)
);
create table public.section_permissions (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 section_id uuid not null, user_id uuid not null references auth.users(id), can_edit boolean default false,
 unique(section_id,user_id), foreign key(workspace_id,section_id) references public.sections(workspace_id,id) on delete cascade
);
create function public.can_section(p_section uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.sections s where s.id=p_section and public.is_member(s.workspace_id)
 and (s.project_id is null or public.can_project(s.project_id))
 and (s.visibility='workspace' or public.has_role(s.workspace_id,array['owner','admin'])
 or exists(select 1 from public.section_permissions sp where sp.section_id=s.id and sp.user_id=auth.uid())));
$$;
create table public.section_fields (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 section_id uuid not null, name text not null, field_key text not null,
 field_type text not null check(field_type in('text','number','date','url','select','multi_select','checkbox','user')),
 required boolean default false, options jsonb default '[]'::jsonb,
 unique(section_id,field_key), foreign key(workspace_id,section_id) references public.sections(workspace_id,id) on delete cascade
);
create table public.section_records (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 section_id uuid not null, title text not null, field_values jsonb not null default '{}'::jsonb,
 created_by uuid not null references auth.users(id), created_at timestamptz default now(), updated_at timestamptz default now(),
 foreign key(workspace_id,section_id) references public.sections(workspace_id,id) on delete cascade
);
create table public.tasks (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 project_id uuid, section_id uuid, title text not null, description text default '',
 assigned_to uuid references auth.users(id),created_by uuid not null references auth.users(id),
 status text not null default 'todo' check(status in('todo','in_progress','submitted','changes_requested','approved','cancelled')),
 priority text default 'medium' check(priority in('low','medium','high','urgent')),
 due_at date, estimate_hours numeric(8,2) default 0, actual_hours numeric(8,2) default 0,
 completed_at timestamptz, created_at timestamptz default now(),updated_at timestamptz default now(),
 foreign key(workspace_id,project_id) references public.projects(workspace_id,id) on delete cascade,
 foreign key(workspace_id,section_id) references public.sections(workspace_id,id) on delete set null
);
create table public.task_checklist_items (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 task_id uuid not null references public.tasks(id) on delete cascade, title text not null, done boolean not null default false
);
create table public.task_comments (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 task_id uuid not null references public.tasks(id) on delete cascade,user_id uuid not null references auth.users(id),
 body text not null,created_at timestamptz default now()
);
create table public.task_evidence (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 task_id uuid not null references public.tasks(id) on delete cascade,submitted_by uuid not null references auth.users(id),
 work_url text, note text default '', file_path text,created_at timestamptz default now()
);
create table public.task_reviews (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 task_id uuid not null references public.tasks(id) on delete cascade,
 reviewer_id uuid not null references auth.users(id), decision text not null check(decision in('approved','changes_requested')),
 comment text default '',created_at timestamptz default now()
);
create table public.task_status_history (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 task_id uuid not null references public.tasks(id) on delete cascade,
 actor_id uuid not null references auth.users(id),from_status text,to_status text not null, created_at timestamptz default now()
);
create table public.websites (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 project_id uuid,name text not null,domain text not null,created_at timestamptz default now(),
 foreign key(workspace_id,project_id) references public.projects(workspace_id,id) on delete cascade
);
create table public.seo_work_records (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 project_id uuid,category text not null,description text not null,live_url text,
 completed_by uuid not null references auth.users(id),hours numeric(8,2) default 0,work_date date not null default current_date,
 created_at timestamptz default now(),foreign key(workspace_id,project_id) references public.projects(workspace_id,id) on delete cascade
);
create table public.keywords (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 project_id uuid,keyword text not null,location text default '',intent text default '',
 search_volume integer, difficulty numeric(6,2), cpc numeric(10,2),source text default 'manual',
 target_url text,cluster_name text default '',status text default 'idea',notes text default '',created_at timestamptz default now(),
 foreign key(workspace_id,project_id) references public.projects(workspace_id,id) on delete cascade
);
create unique index keywords_dedup on public.keywords(workspace_id,lower(keyword),coalesce(project_id,'00000000-0000-0000-0000-000000000000'::uuid),lower(location));
create table public.topical_maps (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 project_id uuid,title text not null,created_at timestamptz default now(),foreign key(workspace_id,project_id) references public.projects(workspace_id,id) on delete cascade
);
create table public.topical_map_nodes (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 map_id uuid not null references public.topical_maps(id) on delete cascade,
 title text not null,kind text not null default 'supporting' check(kind in('pillar','supporting')),
 x float8 not null default 0,y float8 not null default 0,
 keyword_id uuid references public.keywords(id) on delete set null,status text default 'planned'
);
create table public.topical_map_edges (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 map_id uuid not null references public.topical_maps(id) on delete cascade,
 source_id uuid not null references public.topical_map_nodes(id) on delete cascade,
 target_id uuid not null references public.topical_map_nodes(id) on delete cascade,
 unique(map_id,source_id,target_id),check(source_id<>target_id)
);
create table public.social_accounts (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 platform text not null,handle text not null,profile_url text,created_at timestamptz default now()
);
create table public.social_content (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 project_id uuid,account_id uuid references public.social_accounts(id) on delete set null,
 platform text not null,title text not null,caption text default '',content_type text default 'post',
 publication_status text not null default 'draft' check(publication_status in('draft','scheduled','published','failed')),
 scheduled_at timestamptz,published_at timestamptz,published_url text,created_by uuid not null references auth.users(id),
 thumbnail_path text,created_at timestamptz default now(),
 foreign key(workspace_id,project_id) references public.projects(workspace_id,id) on delete cascade
);
create table public.account_directory (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 service text not null,account_email text,username text,login_url text,vault_reference text,
 note text default '',created_at timestamptz default now()
);
create table public.account_access (
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 account_id uuid not null references public.account_directory(id) on delete cascade,
 user_id uuid not null references auth.users(id),primary key(account_id,user_id)
);
create table public.attachments (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 storage_path text not null unique,filename text not null,content_type text not null,size_bytes bigint not null,
 uploaded_by uuid not null references auth.users(id),created_at timestamptz default now()
);
create table public.notifications (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id),kind text not null,body text not null,is_read boolean default false,
 created_at timestamptz default now()
);
create table public.activity_events (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 actor_id uuid not null references auth.users(id),kind text not null,summary text not null,entity_id uuid,
 created_at timestamptz default now()
);
create table public.reports (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 period_month date not null,kind text not null default 'combined',generated_by uuid not null references auth.users(id),
 storage_path text,created_at timestamptz default now()
);

create index tasks_workspace_status on public.tasks(workspace_id,status,due_at);
create index seo_workspace_date on public.seo_work_records(workspace_id,work_date);
create index social_workspace_status on public.social_content(workspace_id,publication_status,scheduled_at);
create index activity_workspace_date on public.activity_events(workspace_id,created_at desc);
create index notifications_user_date on public.notifications(user_id,is_read,created_at desc);

-- Access control for every exposed table, including role checks on writes.
do $$ declare nm text;
begin
 foreach nm in array array['profiles','user_preferences','workspaces','workspace_members','workspace_invitations','projects','project_members','sections','section_permissions','section_fields','section_records','tasks','task_checklist_items','task_comments','task_evidence','task_reviews','task_status_history','websites','seo_work_records','keywords','topical_maps','topical_map_nodes','topical_map_edges','social_accounts','social_content','account_directory','account_access','attachments','notifications','activity_events','reports'] loop
  execute format('alter table public.%I enable row level security',nm);
 end loop;
end $$;
create policy profiles_read on public.profiles for select to authenticated using (user_id=auth.uid() or exists(select 1 from public.workspace_members a join public.workspace_members b on a.workspace_id=b.workspace_id where a.user_id=auth.uid() and b.user_id=profiles.user_id));
create policy profiles_update on public.profiles for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy prefs_own on public.user_preferences for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy ws_read on public.workspaces for select to authenticated using(public.is_member(id));
create policy ws_write on public.workspaces for update to authenticated using(public.has_role(id,array['owner','admin'])) with check(public.has_role(id,array['owner','admin']));
create policy member_read on public.workspace_members for select to authenticated using(public.is_member(workspace_id));
create policy member_write on public.workspace_members for update to authenticated using(public.has_role(workspace_id,array['owner','admin']) and role<>'owner') with check(public.has_role(workspace_id,array['owner','admin']) and role<>'owner');
create policy member_delete on public.workspace_members for delete to authenticated using(public.has_role(workspace_id,array['owner','admin']) and role<>'owner');
create policy invites_read on public.workspace_invitations for select to authenticated using(public.has_role(workspace_id,array['owner','admin']));
create policy invites_insert on public.workspace_invitations for insert to authenticated with check(public.has_role(workspace_id,array['owner','admin']) and invited_by=auth.uid());
create policy invites_update on public.workspace_invitations for update to authenticated using(public.has_role(workspace_id,array['owner','admin'])) with check(public.has_role(workspace_id,array['owner','admin']));
create policy projects_read on public.projects for select to authenticated using(public.can_project(id));
create policy projects_insert on public.projects for insert to authenticated with check(public.has_role(workspace_id,array['owner','admin','manager']) and created_by=auth.uid());
create policy projects_update on public.projects for update to authenticated using(public.can_project(id) and public.has_role(workspace_id,array['owner','admin','manager'])) with check(public.can_project(id) and public.has_role(workspace_id,array['owner','admin','manager']));
create policy project_members_read on public.project_members for select to authenticated using(public.can_project(project_id));
create policy project_members_write on public.project_members for insert to authenticated with check(public.has_role(workspace_id,array['owner','admin','manager']));
create policy project_members_delete on public.project_members for delete to authenticated using(public.has_role(workspace_id,array['owner','admin','manager']));
create policy sections_read on public.sections for select to authenticated using(public.can_section(id));
create policy sections_insert on public.sections for insert to authenticated with check(public.is_member(workspace_id) and (project_id is null or public.can_project(project_id)));
create policy sections_update on public.sections for update to authenticated using(public.can_section(id)) with check(public.can_section(id));
create policy section_perms_read on public.section_permissions for select to authenticated using(public.can_section(section_id));
create policy section_perms_write on public.section_permissions for insert to authenticated with check(public.has_role(workspace_id,array['owner','admin']));
create policy section_perms_delete on public.section_permissions for delete to authenticated using(public.has_role(workspace_id,array['owner','admin']));
create policy fields_read on public.section_fields for select to authenticated using(public.can_section(section_id));
create policy fields_write on public.section_fields for insert to authenticated with check(public.can_section(section_id));
create policy records_read on public.section_records for select to authenticated using(public.can_section(section_id));
create policy records_write on public.section_records for insert to authenticated with check(public.can_section(section_id) and created_by=auth.uid());
create policy records_update on public.section_records for update to authenticated using(public.can_section(section_id)) with check(public.can_section(section_id));
-- Members can read workspace tasks for shared projects; private project tasks require project access.
create policy tasks_read on public.tasks for select to authenticated using(public.is_member(workspace_id) and (project_id is null or public.can_project(project_id)));
create policy tasks_insert on public.tasks for insert to authenticated with check(public.is_member(workspace_id) and created_by=auth.uid() and (project_id is null or public.can_project(project_id)));
create policy tasks_update on public.tasks for update to authenticated using(public.is_member(workspace_id) and (project_id is null or public.can_project(project_id)) and (assigned_to=auth.uid() or public.has_role(workspace_id,array['owner','admin','manager']))) with check(public.is_member(workspace_id) and (project_id is null or public.can_project(project_id)));
-- Child records always check corresponding task visibility.
create function public.can_task(tid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.tasks t where t.id=tid and public.is_member(t.workspace_id) and (t.project_id is null or public.can_project(t.project_id)));
$$;
create policy check_read on public.task_checklist_items for select to authenticated using(public.can_task(task_id));
create policy check_write on public.task_checklist_items for insert to authenticated with check(public.can_task(task_id));
create policy check_update on public.task_checklist_items for update to authenticated using(public.can_task(task_id)) with check(public.can_task(task_id));
create policy comments_read on public.task_comments for select to authenticated using(public.can_task(task_id));
create policy comments_write on public.task_comments for insert to authenticated with check(public.can_task(task_id) and user_id=auth.uid());
create policy evidence_read on public.task_evidence for select to authenticated using(public.can_task(task_id));
create policy evidence_write on public.task_evidence for insert to authenticated with check(public.can_task(task_id) and submitted_by=auth.uid());
create policy review_read on public.task_reviews for select to authenticated using(public.can_task(task_id));
create policy review_write on public.task_reviews for insert to authenticated with check(public.can_task(task_id) and reviewer_id=auth.uid() and public.has_role(workspace_id,array['owner','admin','manager']));
create policy history_read on public.task_status_history for select to authenticated using(public.can_task(task_id));
create policy history_write on public.task_status_history for insert to authenticated with check(public.can_task(task_id) and actor_id=auth.uid());
-- Workspace-wide structured work modules (restricted to members; writes need membership).
do $$ declare nm text;
begin
 foreach nm in array array['websites','seo_work_records','keywords','topical_maps','topical_map_nodes','topical_map_edges','social_accounts','social_content'] loop
  execute format('create policy %I on public.%I for select to authenticated using(public.is_member(workspace_id))',nm||'_read',nm);
  execute format('create policy %I on public.%I for insert to authenticated with check(public.is_member(workspace_id))',nm||'_insert',nm);
  execute format('create policy %I on public.%I for update to authenticated using(public.is_member(workspace_id)) with check(public.is_member(workspace_id))',nm||'_update',nm);
  execute format('create policy %I on public.%I for delete to authenticated using(public.has_role(workspace_id,array[''owner'',''admin'',''manager'']))',nm||'_delete',nm);
 end loop;
end $$;
-- Credential directory remains restricted even when ordinary workspace rows are visible.
create function public.can_account(aid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.account_directory a where a.id=aid and (public.has_role(a.workspace_id,array['owner','admin'])
 or exists(select 1 from public.account_access x where x.account_id=aid and x.user_id=auth.uid())));
$$;
create policy account_read on public.account_directory for select to authenticated using(public.can_account(id));
create policy account_write on public.account_directory for insert to authenticated with check(public.has_role(workspace_id,array['owner','admin']));
create policy account_edit on public.account_directory for update to authenticated using(public.has_role(workspace_id,array['owner','admin'])) with check(public.has_role(workspace_id,array['owner','admin']));
create policy access_read on public.account_access for select to authenticated using(public.can_account(account_id));
create policy access_write on public.account_access for insert to authenticated with check(public.has_role(workspace_id,array['owner','admin']));
create policy attachments_read on public.attachments for select to authenticated using(public.is_member(workspace_id));
create policy attachments_insert on public.attachments for insert to authenticated with check(public.is_member(workspace_id) and uploaded_by=auth.uid());
create policy notifications_read on public.notifications for select to authenticated using(user_id=auth.uid() and public.is_member(workspace_id));
create policy notifications_update on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy notifications_insert on public.notifications for insert to authenticated with check(public.has_role(workspace_id,array['owner','admin','manager']));
create policy activity_read on public.activity_events for select to authenticated using(public.is_member(workspace_id));
create policy activity_insert on public.activity_events for insert to authenticated with check(public.is_member(workspace_id) and actor_id=auth.uid());
create policy reports_read on public.reports for select to authenticated using(public.has_role(workspace_id,array['owner','admin','manager']) or generated_by=auth.uid());
create policy reports_write on public.reports for insert to authenticated with check(public.is_member(workspace_id) and generated_by=auth.uid());

-- Supabase Storage. Private file downloads require authenticated server-side signed URLs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('workspace-files','workspace-files',false,10485760,array['image/png','image/jpeg','image/webp','application/pdf','text/plain','text/csv'])
on conflict(id) do nothing;
create policy ws_storage_read on storage.objects for select to authenticated using(bucket_id='workspace-files' and public.is_member((split_part(name,'/',1))::uuid));
create policy ws_storage_insert on storage.objects for insert to authenticated with check(bucket_id='workspace-files' and public.is_member((split_part(name,'/',1))::uuid));
create policy ws_storage_delete on storage.objects for delete to authenticated using(bucket_id='workspace-files' and public.has_role((split_part(name,'/',1))::uuid,array['owner','admin']));

-- Recommended privilege reduction (client can only execute RPC via authenticated identity).
revoke all on function public.create_workspace(text,text,text) from public;
revoke all on function public.accept_invitation(text) from public;
grant execute on function public.create_workspace(text,text,text) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
