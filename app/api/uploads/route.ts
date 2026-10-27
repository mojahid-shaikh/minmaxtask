import {randomUUID} from 'node:crypto';import {NextRequest,NextResponse} from 'next/server';import {createClient} from '@/lib/supabase/server';import {slug} from '@/lib/validation';
export const runtime='nodejs';
const mime=['image/png','image/jpeg','image/webp','application/pdf','text/plain','text/csv'];
export async function POST(req:NextRequest){
 try{const origin=req.headers.get('origin');if(origin&&origin!==req.nextUrl.origin)return NextResponse.json({error:'Invalid origin'},{status:403});
 const form=await req.formData();const workSlug=slug.parse(form.get('slug'));const file=form.get('file');
 if(!(file instanceof File)||file.size>10*1024*1024||file.size<=0||!mime.includes(file.type))return NextResponse.json({error:'Unsupported file or file exceeds 10 MB'},{status:400});
 const sb=await createClient();const {data:{user}}=await sb.auth.getUser();if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
 const {data:ws}=await sb.from('workspaces').select('id').eq('slug',workSlug).maybeSingle();if(!ws)return NextResponse.json({error:'No workspace access'},{status:403});
 const safeFile=file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,100),path=`${ws.id}/files/${randomUUID()}-${safeFile}`;
 const {error:upError}=await sb.storage.from('workspace-files').upload(path,Buffer.from(await file.arrayBuffer()),{contentType:file.type,upsert:false});if(upError)throw Error(upError.message);
 const {data:entry,error:entryError}=await sb.from('attachments').insert({workspace_id:ws.id,storage_path:path,filename:file.name.slice(0,250),content_type:file.type,size_bytes:file.size,uploaded_by:user.id}).select('id').single();
 if(entryError){await sb.storage.from('workspace-files').remove([path]);throw Error(entryError.message);}
 return NextResponse.json({id:entry.id,path,download:`/api/uploads/${entry.id}?slug=${workSlug}`});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Upload failed'},{status:400});}
}
