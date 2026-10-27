import Link from 'next/link';
import {FolderKanban,ListTodo,CheckCircle2,Globe,ArrowUpRight,Network,Clock3,Share2} from 'lucide-react';
import DashboardChart from '@/components/DashboardChart';
import {getWorkspaceContext} from '@/lib/authz';
const short=(s:string)=>s.length>49?s.slice(0,46)+'...':s;
export default async function Dashboard({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params,{supabase,workspace,user,role}=await getWorkspaceContext(slug);
 const wid=workspace.id;
 const [projects,tasks,seo,social,keywords]=await Promise.all([
  supabase.from('projects').select('id,name,status').eq('workspace_id',wid).limit(10),
  supabase.from('tasks').select('id,title,status,priority,due_at,assigned_to').eq('workspace_id',wid).order('created_at',{ascending:false}).limit(200),
  supabase.from('seo_work_records').select('id',{count:'exact',head:true}).eq('workspace_id',wid),
  supabase.from('social_content').select('id,publication_status').eq('workspace_id',wid).limit(1000),
  supabase.from('keywords').select('id',{count:'exact',head:true}).eq('workspace_id',wid)
 ]);
 const ts=tasks.data||[],p=projects.data||[],s=social.data||[];
 const stats=[{title:'Active projects',number:p.filter(x=>x.status==='active').length,icon:FolderKanban,detail:'Visible in your workspace'},{title:'Open tasks',number:ts.filter(x=>!['approved','cancelled'].includes(x.status)).length,icon:ListTodo,detail:'Awaiting completion'},{title:'Approved tasks',number:ts.filter(x=>x.status==='approved').length,icon:CheckCircle2,detail:'Reviewed and approved'},{title:'SEO activities',number:seo.count||0,icon:Globe,detail:'Recorded work entries'}];
 const histogram=['todo','in_progress','submitted','changes_requested','approved'].map(x=>({name:x.replace('_',' '),count:ts.filter(t=>t.status===x).length}));
 return <><div className="page-title"><div><div className="eyebrow">WORKSPACE OVERVIEW</div><h1>Good to see you back</h1><p className="muted">Here is what is happening across <b>{workspace.name}</b>.</p></div><Link className="primary" href={`/w/${slug}/my-tasks`}>View tasks <ArrowUpRight size={16}/></Link></div><div className="stat-grid">{stats.map(x=><div className="stat" key={x.title}><div className="stat-head"><span>{x.title}</span><span className="stat-icon"><x.icon size={17}/></span></div><div className="stat-number">{x.number}</div><div className="stat-detail">{x.detail}</div></div>)}</div>
 <div className="cols2"><div className="card"><div className="card-heading"><div><h2>Task distribution</h2><div className="muted small">Live status from authorized tasks</div></div><span className="badge">{role}</span></div><DashboardChart data={histogram}/></div><div className="card"><div className="card-heading"><h2>Latest tasks</h2><Link className="pill-link" href={`/w/${slug}/my-tasks`}>See all →</Link></div>{ts.length?ts.slice(0,6).map(t=><div key={t.id} className="flex between center" style={{padding:'11px 0',borderBottom:'1px solid #f0f3f5',gap:10}}><div><div style={{fontWeight:670}}>{short(t.title)}</div><div className="muted tiny" style={{marginTop:5}}>Due: {t.due_at||'Not set'}</div></div><span className={'badge '+t.status}>{t.status.replace('_',' ')}</span></div>):<p className="muted">No tasks yet. Create your first task to begin.</p>}</div></div>
 <div className="cols3 space-top"><div className="card"><div className="flex center gap12"><Network size={18} color="#0d7884"/><b>Keyword research</b></div><div className="stat-number">{keywords.count||0}</div><Link className="pill-link" href={`/w/${slug}/keywords`}>Open keywords →</Link></div><div className="card"><div className="flex center gap12"><Share2 size={18} color="#0d7884"/><b>Published content</b></div><div className="stat-number">{s.filter(x=>x.publication_status==='published').length}</div><Link className="pill-link" href={`/w/${slug}/social-media`}>Social tracker →</Link></div><div className="card"><div className="flex center gap12"><Clock3 size={18} color="#0d7884"/><b>Assigned to you</b></div><div className="stat-number">{ts.filter(x=>x.assigned_to===user.id&&x.status!=='approved').length}</div><Link className="pill-link" href={`/w/${slug}/my-tasks`}>My workload →</Link></div></div>
 </>;
}
