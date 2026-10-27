import {getWorkspaceContext} from '@/lib/authz';import CalendarBoard from '@/components/CalendarBoard';
export default async function Calendar({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const {workspace,supabase}=await getWorkspaceContext(slug);
 const [{data:tasks},{data:content}]=await Promise.all([
 supabase.from('tasks').select('id,title,due_at,status').eq('workspace_id',workspace.id).not('due_at','is',null).limit(2000),
 supabase.from('social_content').select('id,title,scheduled_at,publication_status').eq('workspace_id',workspace.id).not('scheduled_at','is',null).limit(2000)]);
 const events=[...(tasks||[]).map(x=>({id:x.id,title:x.title,date:x.due_at!,kind:'task' as const,status:x.status})),...(content||[]).map(x=>({id:x.id,title:x.title,date:x.scheduled_at!,kind:'social' as const,status:x.publication_status}))];
 return <><div className="page-title"><div><div className="eyebrow">PLANNING</div><h1>Content & task calendar</h1><p className="muted">Upcoming deadlines and scheduled content from connected work records.</p></div></div><CalendarBoard events={events}/></>;
}
