import Shell from '@/components/Shell';
import {getWorkspaceContext} from '@/lib/authz';
export default async function WorkspaceLayout({children,params}:{children:React.ReactNode,params:Promise<{slug:string}>}){
 const {slug}=await params;const {supabase,user,workspace,role}=await getWorkspaceContext(slug);
 const {data:profile}=await supabase.from('profiles').select('full_name').eq('user_id',user.id).maybeSingle();
 const {data:members}=await supabase.from('workspace_members').select('workspace_id').eq('user_id',user.id);
 const ids=(members||[]).map(m=>m.workspace_id);
 const {data:all}=ids.length?await supabase.from('workspaces').select('name,slug').in('id',ids):{data:[]};
 return <Shell slug={slug} name={workspace.name} role={role} userName={profile?.full_name||user.email||'Member'} workspaces={all||[]}>{children}</Shell>;
}
