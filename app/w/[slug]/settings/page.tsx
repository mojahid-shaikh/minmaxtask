import {getWorkspaceContext,canAdmin} from '@/lib/authz';import {ActionForm,type Field} from '@/components/Operations';
export default async function Settings({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const {workspace,role}=await getWorkspaceContext(slug);
 const fields:Field[]=[{name:'name',label:'Workspace name',required:true,defaultValue:workspace.name},{name:'description',label:'Workspace description',type:'textarea',defaultValue:workspace.description||''}];
 return <><div className="page-title"><div><div className="eyebrow">WORKSPACE CONFIGURATION</div><h1>Workspace settings</h1><p className="muted">Control workspace name and description.</p></div></div><div className="card" style={{maxWidth:700}}><h2>{workspace.name}</h2><p className="muted">URL: /w/{slug}</p><p>{workspace.description||'No description provided.'}</p><p className="small muted">Your role: <b>{role}</b></p>{canAdmin(role)?<ActionForm slug={slug} action="workspace.update" label="Edit workspace" fields={fields}/>:<p className="muted small">Only owners and admins can edit workspace details.</p>}</div></>;
}
