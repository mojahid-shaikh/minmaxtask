import {notFound} from 'next/navigation';import {getWorkspaceContext} from '@/lib/authz';import {SectionDetail} from '@/components/SectionBuilder';
export default async function Detail({params}:{params:Promise<{slug:string;sectionId:string}>}){
 const {slug,sectionId}=await params;const {workspace,supabase}=await getWorkspaceContext(slug);
 const [{data:section},{data:defs},{data:records}]=await Promise.all([
 supabase.from('sections').select('id,name,parent_section_id,project_id,visibility').eq('workspace_id',workspace.id).eq('id',sectionId).maybeSingle(),
 supabase.from('section_fields').select('id,section_id,name,field_key,field_type,required,options').eq('workspace_id',workspace.id).eq('section_id',sectionId),
 supabase.from('section_records').select('id,title,field_values,created_at').eq('workspace_id',workspace.id).eq('section_id',sectionId).order('created_at',{ascending:false}).limit(500)]);
 if(!section)notFound();
 return <SectionDetail slug={slug} section={section} definitions={defs||[]} records={records||[]}/>;
}
