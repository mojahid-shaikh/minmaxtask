'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
import {LayoutDashboard,ListTodo,FolderKanban,Layers3,Search,Globe,KeyRound,Network,CalendarDays,Share2,Users,FileBarChart,Activity,Bell,Settings,LogOut,Menu,X,Plus,Contact,ShieldCheck} from 'lucide-react';
const groups=[
 {label:'Workspace',items:[['dashboard','Overview',LayoutDashboard],['my-tasks','My tasks',ListTodo],['projects','Projects',FolderKanban],['sections','Custom sections',Layers3]]},
 {label:'Marketing & SEO',items:[['seo','SEO activities',Globe],['keywords','Keywords',Search],['topical-maps','Topical maps',Network],['social-media','Social media',Share2],['calendar','Content calendar',CalendarDays]]},
 {label:'Operations',items:[['accounts','Account directory',KeyRound],['team','Team members',Users],['reports','PDF reports',FileBarChart],['notifications','Notifications',Bell],['activity','Activity log',Activity]]}
] as const;
export default function Shell({slug,name,role,userName,workspaces,children}:{slug:string,name:string,role:string,userName:string,workspaces:{slug:string,name:string}[],children:React.ReactNode}){
 const pathname=usePathname(),[open,setOpen]=useState(false);
 return <div className="shell"><aside className={'sidebar '+(open?'mobile-open':'')}><div className="flex between center"><Link href="/" className="brand"><span className="brand-mark"><Layers3 size={18}/></span>WorkSphere</Link><button className="secondary mobile-menu btn-sm" onClick={()=>setOpen(false)} aria-label="Close menu"><X size={18}/></button></div>
 <div className="workspace-box flex center gap8"><div className="initial">{name[0]?.toUpperCase()}</div><div><div style={{fontWeight:740,fontSize:12}}>{name}</div><div className="tiny" style={{color:'#9fb4c2'}}>{role}</div></div></div>
 {workspaces.length>1&&<div className="workspace-switch">Switch workspace{workspaces.filter(w=>w.slug!==slug).map(w=><Link key={w.slug} href={`/w/${w.slug}/dashboard`}>{w.name}</Link>)}</div>}
 <div style={{overflowY:'auto',minHeight:0}}>{groups.map(g=><div key={g.label}><div className="sidebar-label">{g.label}</div>{g.items.map(([key,title,Icon])=><Link onClick={()=>setOpen(false)} key={key} href={`/w/${slug}/${key}`} className={'side-link '+(pathname.includes(`/w/${slug}/${key}`)?'active':'')}><Icon size={17} strokeWidth={1.8}/>{title}</Link>)}</div>)}
 <div className="sidebar-label">Preferences</div><Link className="side-link" href={`/w/${slug}/profile`}><Contact size={17}/> My profile</Link><Link className="side-link" href={`/w/${slug}/settings`}><Settings size={17}/> Workspace settings</Link><Link className="side-link" href={`/w/${slug}/security`}><ShieldCheck size={17}/> Account security</Link></div>
 <div className="sidebar-bottom"><Link className="sidebar-footer-link" href="/onboarding"><Plus size={14}/> Create another workspace</Link><form method="post" action="/api/auth/signout"><button type="submit" className="sidebar-footer-link" style={{background:'transparent',border:0,cursor:'pointer'}}><LogOut size={15}/> Sign out</button></form></div></aside>
 <main className="main"><header className="topbar"><div className="flex center gap12"><button onClick={()=>setOpen(true)} className="secondary mobile-menu" aria-label="Open menu"><Menu size={18}/></button><Link href={`/w/${slug}/search`} className="topbar-search"><Search size={16}/><span className="small">Search tasks, projects and keywords...</span></Link></div><div className="flex center gap16"><Link href={`/w/${slug}/notifications`} className="muted" aria-label="Notifications"><Bell size={19}/></Link><span className="small muted" style={{fontWeight:650}}>{userName}</span><div className="topbar-profile">{userName?.[0]?.toUpperCase()||'U'}</div></div></header><div className="content">{children}</div></main></div>;
}
