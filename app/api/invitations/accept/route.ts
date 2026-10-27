import {createHash} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
export async function POST(req:NextRequest){
 const origin=req.headers.get('origin');if(origin&&origin!==req.nextUrl.origin)return NextResponse.json({error:'Invalid origin'},{status:403});
 const {token}=await req.json();if(typeof token!=='string'||!/^[0-9a-f]{64}$/.test(token))return NextResponse.json({error:'Invalid token'},{status:400});
 const sb=await createClient();const {data:{user}}=await sb.auth.getUser();if(!user)return NextResponse.json({error:'Login required'},{status:401});
 const hashed=createHash('sha256').update(token).digest('hex');
 const {data,error}=await sb.rpc('accept_invitation',{p_token_hash:hashed});
 if(error)return NextResponse.json({error:error.message},{status:403});
 const {data:ws}=await sb.from('workspaces').select('slug').eq('id',data).single();
 return NextResponse.json({ok:true,redirect:ws?`/w/${ws.slug}/dashboard`:'/onboarding'});
}
