import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
export type Role='owner'|'admin'|'manager'|'member';
export async function getIdentity(){
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error || !user) return null;
 return {user,supabase};
}
export async function requireIdentity(){
 const identity=await getIdentity();if(!identity) redirect('/login');return identity;
}
export async function getWorkspaceContext(slug:string){
 const identity=await requireIdentity();
 const {data:workspace}=await identity.supabase.from('workspaces').select('id,name,slug,kind,description,owner_id').eq('slug',slug).maybeSingle();
 if(!workspace) redirect('/onboarding');
 const {data:membership}=await identity.supabase.from('workspace_members').select('role').eq('workspace_id',workspace.id).eq('user_id',identity.user.id).maybeSingle();
 if(!membership) redirect('/onboarding');
 return {...identity,workspace,role:membership.role as Role};
}
export const canManage=(role:Role)=>['owner','admin','manager'].includes(role);
export const canAdmin=(role:Role)=>['owner','admin'].includes(role);
