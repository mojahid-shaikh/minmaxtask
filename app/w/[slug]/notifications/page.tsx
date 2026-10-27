import {getWorkspaceContext} from '@/lib/authz';import {DataTable,StatusAction} from '@/components/Operations';
export default async function Notifications({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const {workspace,supabase,user}=await getWorkspaceContext(slug);
 const {data:items,error}=await supabase.from('notifications').select('id,kind,body,is_read,created_at').eq('workspace_id',workspace.id).eq('user_id',user.id).order('created_at',{ascending:false}).limit(200);
 if(error)throw Error(error.message);
 return <><div className="page-title"><div><div className="eyebrow">UPDATES</div><h1>Notifications</h1><p className="muted">Task assignments, reviews, and teammate updates.</p></div></div><DataTable rows={items||[]} columns={[{key:'kind',label:'Type'},{key:'body',label:'Notification'},{key:'is_read',label:'Read'},{key:'created_at',label:'Date',kind:'date'}]}>{r=>r.is_read?null:<StatusAction slug={slug} action="notifications.read" payload={{id:r.id}} label="Mark read"/>}</DataTable></>;
}
