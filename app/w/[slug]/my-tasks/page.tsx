import {getWorkspaceContext} from '@/lib/authz';import TaskBoard from '@/components/TaskBoard';
export default async function Tasks({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const {workspace,supabase,role,user}=await getWorkspaceContext(slug),wid=workspace.id;
 const [{data:tasks,error},{data:projects},{data:members},{data:profiles}]=await Promise.all([
 supabase.from('tasks').select('*').eq('workspace_id',wid).order('created_at',{ascending:false}).limit(500),
 supabase.from('projects').select('id,name').eq('workspace_id',wid).order('name'),
 supabase.from('workspace_members').select('user_id,role').eq('workspace_id',wid),
 supabase.from('profiles').select('user_id,full_name')]);
 if(error)throw Error(error.message);
 const ids=(tasks||[]).map(t=>t.id);
 const [{data:comments},{data:evidence},{data:checklist}]=ids.length?await Promise.all([
 supabase.from('task_comments').select('id,task_id,body,created_at').eq('workspace_id',wid).in('task_id',ids).order('created_at',{ascending:false}).limit(800),
 supabase.from('task_evidence').select('id,task_id,work_url,note,created_at').eq('workspace_id',wid).in('task_id',ids).limit(800),
 supabase.from('task_checklist_items').select('id,task_id,title,done').eq('workspace_id',wid).in('task_id',ids).limit(800)]):[{data:[]},{data:[]},{data:[]}];
 const names=new Map((profiles||[]).map(p=>[p.user_id,p.full_name]));
 return <TaskBoard slug={slug} role={role} userId={user.id} tasks={tasks||[]} projects={projects||[]} members={(members||[]).map(m=>({...m,name:names.get(m.user_id)||'Team member'}))} comments={comments||[]} evidence={evidence||[]} checklist={checklist||[]}/>;
}
