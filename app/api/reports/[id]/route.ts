import {NextRequest,NextResponse} from 'next/server';import {createClient} from '@/lib/supabase/server';import {uuid,slug} from '@/lib/validation';
export const runtime='nodejs';
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{const {id}=await params,reportId=uuid.parse(id),workSlug=slug.parse(req.nextUrl.searchParams.get('slug'));
  const sb=await createClient();const {data:{user}}=await sb.auth.getUser();if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
  const {data:ws}=await sb.from('workspaces').select('id').eq('slug',workSlug).maybeSingle();if(!ws)return NextResponse.json({error:'Not found'},{status:404});
  const {data:report}=await sb.from('reports').select('storage_path,period_month').eq('workspace_id',ws.id).eq('id',reportId).maybeSingle();if(!report?.storage_path)return NextResponse.json({error:'Report not accessible'},{status:404});
  const {data,error}=await sb.storage.from('reports-private').download(report.storage_path);if(error||!data)return NextResponse.json({error:'Download denied'},{status:403});
  return new NextResponse(data,{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="WorkSphere_Report_${report.period_month}.pdf"`,'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Invalid report request'},{status:400});}
}
