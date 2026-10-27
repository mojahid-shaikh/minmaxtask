import {getWorkspaceContext} from '@/lib/authz';import SecurityPanel from '@/components/SecurityPanel';
export default async function Security({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;await getWorkspaceContext(slug);
 return <><div className="page-title"><div><div className="eyebrow">ACCOUNT PROTECTION</div><h1>Security settings</h1><p className="muted">Manage your authenticator factor. Your workspace content remains access controlled.</p></div></div><SecurityPanel/></>;
}
