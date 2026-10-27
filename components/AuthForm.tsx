'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useRouter,useSearchParams} from 'next/navigation';
import {createClient} from '@/lib/supabase/browser';
import {ArrowRight,Chrome} from 'lucide-react';
type Mode='login'|'signup'|'forgot'|'reset';
export default function AuthForm({mode}:{mode:Mode}){
 const router=useRouter(),sp=useSearchParams();
 const [email,setEmail]=useState(''),[pass,setPass]=useState(''),[name,setName]=useState('');
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const signup=mode==='signup',forgot=mode==='forgot',reset=mode==='reset';
 const submit=async(e:React.FormEvent)=>{
 e.preventDefault();setBusy(true);setMessage('');const sb=createClient();
 try{
  if(forgot){const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}/auth/callback?next=/reset-password`});if(error)throw error;setMessage('If the email exists, password recovery instructions have been sent.');}
  else if(reset){const {error}=await sb.auth.updateUser({password:pass});if(error)throw error;router.push('/onboarding');}
  else if(signup){const {error}=await sb.auth.signUp({email,password:pass,options:{data:{full_name:name},emailRedirectTo:`${location.origin}/auth/callback`}});if(error)throw error;setMessage('Check your email to verify your account, then log in.');}
  else{const {error}=await sb.auth.signInWithPassword({email,password:pass});if(error)throw error;const next=sp.get('next');router.push(next?.startsWith('/')&&!next.startsWith('//')?next:'/onboarding');router.refresh();}
 }catch(err){setMessage(err instanceof Error?err.message:'Login failed');}finally{setBusy(false);}
 };
 const google=async()=>{
  setBusy(true);const {error}=await createClient().auth.signInWithOAuth({provider:'google',options:{redirectTo:`${location.origin}/auth/callback`}});
  if(error){setMessage(error.message);setBusy(false);}
 };
 return <form onSubmit={submit} className="auth-card">
  <div className="eyebrow">Welcome to WorkSphere</div><h1>{signup?'Create your account':forgot?'Reset your password':reset?'Choose a new password':'Sign in to your workspace'}</h1>
  <p className="muted" style={{lineHeight:1.8}}>{signup?'Start your organized team workflow.':forgot?'We will send you a recovery link.':reset?'Use at least 8 characters.':'Your work, team, and data - all in one place.'}</p>
  {signup&&<label className="field">Full name<input required autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name"/></label>}
  {!reset&&<label className="field">Email address<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com"/></label>}
  {!forgot&&<label className="field">Password<input required type="password" autoComplete={signup?'new-password':'current-password'} minLength={signup||reset?8:1} value={pass} onChange={e=>setPass(e.target.value)} placeholder="Enter your password"/></label>}
  {message&&<p role="status" className={'message '+(message.startsWith('Check')||message.startsWith('If the')?'ok':'')}>{message}</p>}
  <button disabled={busy} className="primary" type="submit">{busy?'Please wait...':signup?'Sign up':forgot?'Send recovery email':reset?'Update password':'Log in'} <ArrowRight size={16}/></button>
  {!forgot&&!reset&&<><div className="muted" style={{textAlign:'center',margin:'16px 0'}}>or</div><button type="button" onClick={google} disabled={busy} className="secondary" style={{width:'100%'}}><Chrome size={16}/> Continue with Google</button></>}
  <div className="flex between center space-top small">{!signup&&!forgot&&!reset&&<Link className="muted-link" href="/forgot-password">Forgot password?</Link>}{signup?<span>Have an account? <Link className="muted-link" href="/login">Log in</Link></span>:<span>{!reset&&'New here? '}<Link className="muted-link" href={reset?'/login':'/signup'}>{reset?'Back to login':'Create an account'}</Link></span>}</div>
 </form>;
}
