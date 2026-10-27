import Link from 'next/link';
import WorkspaceCreate from '@/components/WorkspaceCreate';
import {requireIdentity} from '@/lib/authz';
export default async function Onboarding(){
 const {supabase,user}=await requireIdentity();
 const {data:members}=await supabase.from('workspace_members').select('workspace_id,role,workspaces(id,name,slug)').eq('user_id',user.id);
 return <main style={{maxWidth:800,margin:'65px auto',padding:20}}><div className="eyebrow">Workspace setup</div><h1>Welcome to WorkSphere</h1><p className="muted">Create a new workspace, or continue in one you already belong to.</p>{(members||[]).length>0&&<div className="card" style={{margin:'20px 0'}}><h2>Your workspaces</h2>{members?.map((m,i)=>{const ws=m.workspaces as unknown as {id:string,name:string,slug:string}|null;return ws?<p key={i}><Link className="pill-link" href={`/w/${ws.slug}/dashboard`}>{ws.name} →</Link> <span className="badge">{m.role}</span></p>:null})}</div>}<WorkspaceCreate/><p className="muted small" style={{marginTop:18}}>Joining a team? Open the invitation URL provided by your workspace administrator.</p></main>;
}
