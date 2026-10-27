import 'server-only';
import {getWorkspaceContext} from './authz';
export async function workspaceTable(slug:string,table:string,limit=200,order='created_at'){
 const ctx=await getWorkspaceContext(slug);
 // Only use server-defined table names, never caller-provided path parameters.
 const allowed=['projects','tasks','sections','section_fields','section_records','seo_work_records','keywords','topical_maps','topical_map_nodes','topical_map_edges','social_content','social_accounts','account_directory','activity_events','notifications','workspace_members','workspace_invitations','websites','task_checklist_items','task_comments','task_evidence','task_reviews','task_status_history'];
 if(!allowed.includes(table))throw Error('Unsupported data table');
 let q=ctx.supabase.from(table).select('*').eq('workspace_id',ctx.workspace.id).limit(limit);
 if(table!=='workspace_members' && table!=='workspace_invitations')q=q.order(order,{ascending:false});
 const {data,error}=await q;
 if(error)throw Error(error.message);
 return {ctx,rows:data??[]};
}
