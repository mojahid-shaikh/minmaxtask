'use client';
import {useState} from 'react';import {useRouter} from 'next/navigation';import {command} from '@/components/Operations';
export default function FileUploader({slug,taskId}:{slug:string;taskId:string}){
 const router=useRouter(),[file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const upload=async()=>{if(!file)return;setBusy(true);setMessage('');try{const form=new FormData();form.append('file',file);form.append('slug',slug);const r=await fetch('/api/uploads',{method:'POST',body:form});const data=await r.json();if(!r.ok)throw Error(data.error);await command(slug,'tasks.evidence',{task_id:taskId,file_path:data.path,note:`Uploaded ${file.name}`,work_url:''});setMessage('File attached to task');router.refresh();}catch(e){setMessage(e instanceof Error?e.message:'Upload failed');}finally{setBusy(false);}};
 return <div className="space-top"><div className="action-row"><input type="file" aria-label="Attach supporting file" accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.csv" onChange={e=>setFile(e.target.files?.[0]||null)}/><button className="secondary btn-sm" type="button" disabled={!file||busy} onClick={upload}>{busy?'Uploading...':'Upload evidence file'}</button></div>{message&&<p className="muted small" role="status">{message}</p>}</div>;
}
