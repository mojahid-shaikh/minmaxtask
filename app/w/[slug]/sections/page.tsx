import {getWorkspaceContext} from '@/lib/authz';import SectionBuilder from '@/components/SectionBuilder';
export default async function Sections({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const {workspace,supabase}=await getWorkspaceContext(slug);
 const [{data:sections,error},{data:projects}]=await Promise.all([supabase.from('sections').select('id,name,parent_section_id,project_id,visibility').eq('workspace_id',workspace.id).order('name').limit(250),supabase.from('projects').select('id,name').eq('workspace_id',workspace.id)]);
 if(error)throw Error(error.message);
 return <SectionBuilder slug={slug} sections={sections||[]} projects={projects||[]}/>;
}
