import {getWorkspaceContext} from '@/lib/authz';import TopicalMapBoard from '@/components/TopicalMapBoard';
export default async function TopicalMaps({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const {workspace,supabase}=await getWorkspaceContext(slug),wid=workspace.id;
 const [{data:maps,error},{data:nodes},{data:edges},{data:projects},{data:keywords}]=await Promise.all([
 supabase.from('topical_maps').select('id,title').eq('workspace_id',wid).order('created_at',{ascending:false}).limit(100),
 supabase.from('topical_map_nodes').select('id,map_id,title,kind,x,y,keyword_id').eq('workspace_id',wid).limit(1000),
 supabase.from('topical_map_edges').select('id,map_id,source_id,target_id').eq('workspace_id',wid).limit(1500),
 supabase.from('projects').select('id,name').eq('workspace_id',wid),
 supabase.from('keywords').select('id,keyword').eq('workspace_id',wid).limit(500)]);
 if(error)throw Error(error.message);
 return <TopicalMapBoard slug={slug} maps={maps||[]} nodes={nodes||[]} edges={edges||[]} projects={projects||[]} keywords={keywords||[]}/>;
}
