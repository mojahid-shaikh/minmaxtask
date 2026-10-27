import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
export async function GET(req:NextRequest){
 const code=req.nextUrl.searchParams.get('code');
 if(code){const sb=await createClient();const {error}=await sb.auth.exchangeCodeForSession(code);
 if(!error){const next=req.nextUrl.searchParams.get('next');const safe=next?.startsWith('/')&&!next.startsWith('//')?next:'/onboarding';return NextResponse.redirect(new URL(safe,req.url));}}
 return NextResponse.redirect(new URL('/login?error=callback',req.url));
}
