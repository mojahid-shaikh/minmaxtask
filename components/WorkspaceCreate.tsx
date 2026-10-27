'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Plus} from 'lucide-react';
export default function WorkspaceCreate(){
 const [name,setName]=useState(''),[slug,setSlug]=useState(''),[kind,setKind]=useState('company');
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);const router=useRouter();
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setMessage('');
  try{const r=await fetch('/api/commands',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'workspace.create',payload:{name,slug,kind}})});const j=await r.json();if(!r.ok)throw Error(j.error);router.push(j.redirect);router.refresh();}catch(e){setMessage(e instanceof Error?e.message:'Failed to create workspace');}finally{setBusy(false);}
 };
 return <form onSubmit={submit} className="card" style={{maxWidth:570}}><h2>Create a workspace</h2><p className="muted">A private space for your team and its work.</p><div className="stack"><label className="field">Workspace name<input required minLength={2} maxLength={100} placeholder="Your agency or team" value={name} onChange={e=>{setName(e.target.value);setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''));}}/></label><label className="field">Workspace URL / ID<input required minLength={3} pattern="[a-z0-9][a-z0-9-]{2,49}" value={slug} onChange={e=>setSlug(e.target.value.toLowerCase())}/></label><label className="field">Workspace type<select value={kind} onChange={e=>setKind(e.target.value)}><option value="company">Company / team</option><option value="personal">Personal</option></select></label></div>{message&&<p className="message">{message}</p>}<div className="form-actions"><button disabled={busy} className="primary" type="submit"><Plus size={16}/> {busy?'Creating...':'Create workspace'}</button></div></form>;
}
