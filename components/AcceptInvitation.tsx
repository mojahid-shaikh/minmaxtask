'use client';
import {useState} from 'react';import {useSearchParams,useRouter} from 'next/navigation';
import Link from 'next/link';
export default function AcceptInvitation(){const params=useSearchParams(),router=useRouter();const token=params.get('token');const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const accept=async()=>{setBusy(true);try{const r=await fetch('/api/invitations/accept',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});const j=await r.json();if(!r.ok)throw Error(j.error);router.push(j.redirect);router.refresh();}catch(e){setMessage(e instanceof Error?e.message:'Failed');}finally{setBusy(false);}};
 return <div className="card stack"><div className="eyebrow">Join your team</div><h1>Workspace invitation</h1><p className="muted">Sign in using the exact email address this invitation was sent to, then accept.</p>{message&&<div className="message">{message}</div>}<button className="primary" disabled={!token||busy} onClick={accept}>Accept invitation</button><Link className="pill-link" href="/login">Sign in first</Link></div>}
