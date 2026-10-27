'use client';
import {useState} from 'react';import {useRouter} from 'next/navigation';import {Upload,Download} from 'lucide-react';
type Preview={valid:number;invalid:number;preview:Record<string,unknown>[];issues:{row:number;reason:string}[];total:number};
export default function KeywordImport({slug}:{slug:string}){
 const router=useRouter();const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState<Preview|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const upload=async(commit:boolean)=>{
  if(!file)return;setBusy(true);setMessage('');try{
   const body=new FormData();body.append('file',file);body.append('workspaceSlug',slug);body.append('mode',commit?'import':'preview');
   const res=await fetch('/api/keywords/import',{method:'POST',body});const data=await res.json();if(!res.ok)throw Error(data.error||'Import request failed');
   if(commit){setMessage(`Imported ${data.imported} records; ${data.skipped} skipped. ${data.errors?.join(' | ')||''}`);setPreview(null);router.refresh();}
   else setPreview(data);
  }catch(e){setMessage(e instanceof Error?e.message:'Import failed');}finally{setBusy(false);}
 };
 return <div className="card" style={{marginBottom:20}}><div className="flex between center"><h2 style={{marginBottom:8}}>Bulk keyword import</h2><a className="pill-link flex center gap8" href="/keyword_template.csv" download><Download size={15}/>CSV template</a></div><p className="muted small">Supports CSV and XLSX (up to 2 MB / 1,000 rows). Preview and validate before committing.</p><div className="action-row"><input type="file" accept=".csv,.xlsx" aria-label="Upload keyword CSV or XLSX" onChange={e=>{setFile(e.target.files?.[0]||null);setPreview(null);}}/><button type="button" className="secondary btn-sm" disabled={!file||busy} onClick={()=>upload(false)}><Upload size={15}/>Preview import</button></div>
 {preview&&<div className="space-top"><div className="info-strip">{preview.total} rows scanned · {preview.valid} valid · {preview.invalid} invalid</div>{preview.issues.slice(0,10).map(e=><p className="message small" key={e.row}>Row {e.row}: {e.reason}</p>)}{preview.preview.length>0&&<div className="table-wrap"><table className="data-table"><thead><tr><th>Keyword</th><th>Location</th><th>Volume</th><th>Intent</th></tr></thead><tbody>{preview.preview.map((r,i)=><tr key={i}><td>{String(r.keyword)}</td><td>{String(r.location||'')}</td><td>{String(r.search_volume??'')}</td><td>{String(r.intent||'')}</td></tr>)}</tbody></table></div>}<button type="button" className="primary space-top" disabled={busy||!preview.valid} onClick={()=>upload(true)}>Import {preview.valid} valid rows</button></div>}
 {message&&<p role="status" className="message space-top">{message}</p>}</div>;
}
