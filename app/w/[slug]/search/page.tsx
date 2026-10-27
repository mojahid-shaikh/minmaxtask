import Link from 'next/link';import {getWorkspaceContext} from '@/lib/authz';
export default async function Search({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{q?:string}>}){
 const {slug}=await params,{q=''}=await searchParams;const term=q.trim().slice(0,100),{workspace,supabase}=await getWorkspaceContext(slug);
 const safe=term.replace(/[%,_]/g,'\\$&');
 const results=term.length>1?await Promise.all([
 supabase.from('projects').select('id,name,status').eq('workspace_id',workspace.id).ilike('name',`%${safe}%`).limit(40),
 supabase.from('tasks').select('id,title,status').eq('workspace_id',workspace.id).ilike('title',`%${safe}%`).limit(40),
 supabase.from('keywords').select('id,keyword,search_volume').eq('workspace_id',workspace.id).ilike('keyword',`%${safe}%`).limit(40),
 supabase.from('sections').select('id,name').eq('workspace_id',workspace.id).ilike('name',`%${safe}%`).limit(40)]):[];
 const labels=['Projects','Tasks','Keywords','Custom sections'],urls=['projects','my-tasks','keywords','sections'];
 return <><div className="page-title"><div><div className="eyebrow">PERMISSION FILTERED SEARCH</div><h1>Search workspace</h1><p className="muted">Search items you have permission to see.</p></div></div>
 <form method="get" className="filter-bar"><input className="search-input" type="search" name="q" defaultValue={term} placeholder="Type project, task, keyword..." minLength={2} maxLength={100} style={{maxWidth:420}}/><button className="primary">Search</button></form>
 {!term?<div className="card empty"><h3>Start searching</h3><p>Search by a topic, keyword, or task name.</p></div>:<div className="cols2">{results.map((res,index)=><section className="card" key={labels[index]}><h2>{labels[index]}</h2>{res.data?.length?res.data.map((r:Record<string,unknown>)=><div key={String(r.id)} style={{padding:'11px 0',borderBottom:'1px solid #edf1f2'}}><Link className="pill-link" href={`/w/${slug}/${urls[index]}`}>{String(r.name||r.title||r.keyword)}</Link></div>):<p className="muted">No matches</p>}</section>)}</div>}
 </>;
}
