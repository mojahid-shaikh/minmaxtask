import {getWorkspaceContext} from '@/lib/authz';import {DataTable} from '@/components/Operations';
export default async function Activity({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const {workspace,supabase}=await getWorkspaceContext(slug);
 const {data:events,error}=await supabase.from('activity_events').select('id,kind,summary,actor_id,created_at').eq('workspace_id',workspace.id).order('created_at',{ascending:false}).limit(500);
 if(error)throw Error(error.message);
 return <><div className="page-title"><div><div className="eyebrow">WORKSPACE AUDIT TRAIL</div><h1>Activity history</h1><p className="muted">Recent app actions and changes, sorted newest first.</p></div></div><div className="info-strip">Activity records are application-generated operational history. Do not treat them as tamper-proof forensic security logs without a separate privileged audit pipeline.</div><DataTable rows={events||[]} columns={[{key:'created_at',label:'When',kind:'date'},{key:'summary',label:'Action'},{key:'actor_id',label:'Actor ID'}]}/></>;
}
