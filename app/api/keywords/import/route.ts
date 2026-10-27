import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {parseCsv,rowsToObjects} from '@/lib/keyword-csv';
import {httpUrl,slug} from '@/lib/validation';
export const runtime='nodejs';
const columns=['keyword','location','intent','search_volume','difficulty','cpc','cluster_name','source','target_url','project_id'];
function numeric(value:unknown,max:number,integer=false):number|null{
 const v=String(value??'').trim();if(v==='')return null;
 const n=Number(v);if(!Number.isFinite(n)||n<0||n>max||(integer&&!Number.isInteger(n)))throw Error('Invalid numeric value');return n;
}
function normalize(row:Record<string,unknown>){
 const keyword=String(row.keyword||'').trim(),location=String(row.location||'').trim();
 if(keyword.length<1||keyword.length>500)throw Error('Keyword is empty or too long');
 if(location.length>100)throw Error('Location too long');
 const url=String(row.target_url||'').trim();if(url&&!httpUrl.safeParse(url).success)throw Error('Invalid target_url');
 const project=String(row.project_id||'').trim();if(project&&!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(project))throw Error('Invalid project_id');
 return {keyword,location,intent:String(row.intent||'').slice(0,100),search_volume:numeric(row.search_volume,1000000000,true),difficulty:numeric(row.difficulty,100),cpc:numeric(row.cpc,100000),cluster_name:String(row.cluster_name||'').slice(0,500),source:String(row.source||'CSV upload').slice(0,120),target_url:url||null,project_id:project||null};
}
async function recordsFromFile(file:File):Promise<Record<string,unknown>[]>{
 const extension=file.name.toLowerCase().split('.').pop();if(extension==='csv'){
  return rowsToObjects(parseCsv(await file.text()));
 }
 if(extension==='xlsx'){
  const ExcelJS=(await import('exceljs')).default;
  const book=new ExcelJS.Workbook();await book.xlsx.load(Buffer.from(await file.arrayBuffer()) as never);
  const sheet=book.worksheets[0];if(!sheet)throw Error('No worksheet found');
  const rows:string[][]=[];sheet.eachRow({includeEmpty:false},row=>{rows.push((row.values as unknown[]).slice(1).map(v=>v===null||v===undefined?'':typeof v==='object'&&v!==null&&'text'in v?String((v as {text:unknown}).text):String(v)));});
  return rowsToObjects(rows);
 }
 throw Error('Only .csv and .xlsx files are supported');
}
export async function POST(req:NextRequest){
 try{
  const origin=req.headers.get('origin');if(origin&&origin!==req.nextUrl.origin)return NextResponse.json({error:'Invalid origin'},{status:403});
  const form=await req.formData(),slugValue=slug.parse(form.get('workspaceSlug')),mode=form.get('mode');
  if(mode!=='import'&&mode!=='preview')return NextResponse.json({error:'Invalid mode'},{status:400});
  const file=form.get('file');if(!(file instanceof File)||file.size>2*1024*1024||file.size<1)return NextResponse.json({error:'File missing or larger than 2MB'},{status:400});
  const sb=await createClient(),{data:{user}}=await sb.auth.getUser();if(!user)return NextResponse.json({error:'Login required'},{status:401});
  const {data:workspace}=await sb.from('workspaces').select('id').eq('slug',slugValue).maybeSingle();if(!workspace)return NextResponse.json({error:'Workspace not found'},{status:404});
  const data=await recordsFromFile(file);if(data.length>1000)throw Error('Maximum 1,000 rows per import');
  const invalidFields=Object.keys(data[0]||{}).filter(k=>!columns.includes(k));if(invalidFields.length)throw Error('Unexpected column(s): '+invalidFields.join(', '));
  const valid:ReturnType<typeof normalize>[]=[];const issues:{row:number;reason:string}[]=[];
  const seen=new Set<string>();
  for(let i=0;i<data.length;i++){
   try{const normalized=normalize(data[i]);const unique=[normalized.project_id||'',normalized.keyword.toLowerCase(),normalized.location.toLowerCase()].join('|');if(seen.has(unique))throw Error('Duplicate row within upload');seen.add(unique);valid.push(normalized);}
   catch(ex){issues.push({row:i+2,reason:ex instanceof Error?ex.message:'Invalid values'});}
  }
  const projectIds=[...new Set(valid.map(r=>r.project_id).filter((x):x is string=>!!x))];
  if(projectIds.length){const {data:projects,error}=await sb.from('projects').select('id').eq('workspace_id',workspace.id).in('id',projectIds);if(error)throw Error(error.message);const accessible=new Set((projects||[]).map(p=>p.id));if(projectIds.some(id=>!accessible.has(id)))throw Error('An imported project_id is inaccessible');}
  if(mode==='preview')return NextResponse.json({valid:valid.length,invalid:issues.length,preview:valid.slice(0,5),issues:issues.slice(0,100),total:data.length});
  let imported=0,skipped=issues.length;const errors=issues.slice(0,5).map(i=>`Row ${i.row}: ${i.reason}`);
  for(let i=0;i<valid.length;i+=50){const chunk=valid.slice(i,i+50).map(r=>({...r,workspace_id:workspace.id}));const {error}=await sb.from('keywords').insert(chunk);
   if(!error)imported+=chunk.length;
   else{for(const item of chunk){const {error:single}=await sb.from('keywords').insert(item);if(single){skipped++;if(errors.length<10)errors.push(item.keyword+': '+single.message.slice(0,95));}else imported++;}}
  }
  return NextResponse.json({imported,skipped,errors});
 }catch(ex){return NextResponse.json({error:ex instanceof Error?ex.message:'Import failed'},{status:400});}
}
