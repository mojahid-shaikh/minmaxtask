-- Ownership and membership changes occur in one authenticated database transaction.
create function public.transfer_workspace_ownership(p_workspace uuid,p_target uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare old_owner uuid;
begin
 select owner_id into old_owner from public.workspaces where id=p_workspace for update;
 if old_owner is null or old_owner<>auth.uid() then raise exception 'Only current owner may transfer ownership'; end if;
 if p_target=old_owner then raise exception 'Already the owner'; end if;
 if not exists(select 1 from public.workspace_members where workspace_id=p_workspace and user_id=p_target)
 then raise exception 'New owner must be a workspace member'; end if;
 update public.workspace_members set role='admin' where workspace_id=p_workspace and user_id=old_owner;
 update public.workspace_members set role='owner' where workspace_id=p_workspace and user_id=p_target;
 update public.workspaces set owner_id=p_target where id=p_workspace;
 return p_workspace;
end $$;
create function public.remove_workspace_member(p_workspace uuid,p_target uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare member_role text; actor_role text;
begin
 select role into actor_role from public.workspace_members where workspace_id=p_workspace and user_id=auth.uid();
 select role into member_role from public.workspace_members where workspace_id=p_workspace and user_id=p_target;
 if actor_role not in ('owner','admin') then raise exception 'Only owner/admin can remove members'; end if;
 if member_role='owner' or member_role is null then raise exception 'Cannot remove owner or unknown member'; end if;
 if actor_role='admin' and member_role='admin' then raise exception 'Only owner can remove another admin'; end if;
 delete from public.workspace_members where workspace_id=p_workspace and user_id=p_target;
 delete from public.project_members where workspace_id=p_workspace and user_id=p_target;
 delete from public.account_access where workspace_id=p_workspace and user_id=p_target;
 delete from public.section_permissions where workspace_id=p_workspace and user_id=p_target;
 return p_target;
end $$;
revoke all on function public.transfer_workspace_ownership(uuid,uuid) from public;
revoke all on function public.remove_workspace_member(uuid,uuid) from public;
grant execute on function public.transfer_workspace_ownership(uuid,uuid) to authenticated;
grant execute on function public.remove_workspace_member(uuid,uuid) to authenticated;

-- Private project invitations and nested section creation must respect resource permissions.
drop policy project_members_write on public.project_members;
create policy project_members_write on public.project_members for insert to authenticated with check
(public.has_role(workspace_id,array['owner','admin','manager']) and public.can_project(project_id));
drop policy project_members_delete on public.project_members;
create policy project_members_delete on public.project_members for delete to authenticated using
(public.has_role(workspace_id,array['owner','admin','manager']) and public.can_project(project_id));
drop policy sections_insert on public.sections;
create policy sections_insert on public.sections for insert to authenticated with check
(public.is_member(workspace_id) and (project_id is null or public.can_project(project_id))
 and (parent_section_id is null or public.can_edit_section(parent_section_id)));
