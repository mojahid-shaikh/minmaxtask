import {NextRequest,NextResponse} from 'next/server';import {createClient} from '@/lib/supabase/server';import {slug,uuid} from '@/lib/validation';
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{const {id}=await params,attachmentId=uuid.parse(id),workSlug=slug.parse(req.nextUrl.searchParams.get('slug'));
 const sb=await createClient();const {data:{user}}=await sb.auth.getUser();if(!user)return NextResponse.json({error:'Login required'},{status:401});
 const {data:ws}=await sb.from('workspaces').select('id').eq('slug',workSlug).maybeSingle();if(!ws)return NextResponse.json({error:'Not found'},{status:404});
 const {data:item}=await sb.from('attachments').select('storage_path,filename,content_type').eq('workspace_id',ws.id).eq('id',attachmentId).maybeSingle();if(!item)return NextResponse.json({error:'Not found'},{status:404});
 const {data,error}=await sb.storage.from('workspace-files').download(item.storage_path);if(error||!data)return NextResponse.json({error:'File not accessible'},{status:403});
 return new NextResponse(data,{headers:{'Content-Type':item.content_type,'Content-Disposition':`attachment; filename="${item.filename.replace(/["\\\r\n]/g,'_')}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch{return NextResponse.json({error:'Invalid request'},{status:400});}
}
