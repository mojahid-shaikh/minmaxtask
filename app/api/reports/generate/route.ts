import {NextRequest,NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import {createClient} from '@/lib/supabase/server';
import {slug} from '@/lib/validation';
export const runtime='nodejs';
const safe=(s:unknown)=>String(s??'').replace(/[^\x20-\x7e]/g,'?').slice(0,350);
const money=(n:number)=>n.toLocaleString('en-US',{maximumFractionDigits:2});
async function makePdf(title:string,month:string,rows:{label:string;value:string}[],sections:{title:string;rows:string[]}[]){
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const width=595,height=842,margin=49;let page=pdf.addPage([width,height]),y=height-54,pageNumber=1;
 function draw(text:string,size=10,weight=false,color=rgb(.18,.27,.37),indent=0){
  const txt=safe(text);if(y<size+58){nextPage();}
  page.drawText(txt,{x:margin+indent,y,size,font:weight?bold:font,color,maxWidth:width-2*margin-indent});y-=size+11;
 }
 function nextPage(){page.drawText(`WorkSphere | ${month} | Page ${pageNumber++}`,{x:margin,y:26,size:8,font,color:rgb(.5,.56,.62)});page=pdf.addPage([width,height]);y=height-55;}
 page.drawRectangle({x:0,y:height-135,width,height:135,color:rgb(.07,.17,.24)});
 page.drawText('WORKSPHERE',{x:margin,y:height-58,size:12,font:bold,color:rgb(.48,.91,.88)});
 page.drawText('Monthly work report',{x:margin,y:height-94,size:25,font:bold,color:rgb(1,1,1)});
 page.drawText(safe(title)+'  |  '+month,{x:margin,y:height-116,size:10,font,color:rgb(.79,.86,.89)});y=height-162;
 draw('EXECUTIVE SUMMARY',12,true,rgb(.06,.45,.51));
 for(const line of rows)draw(`${safe(line.label)}: ${safe(line.value)}`,11,true);
 y-=10;
 for(const section of sections){
  if(y<125)nextPage();draw(section.title.toUpperCase(),12,true,rgb(.06,.45,.51));
  if(section.rows.length===0)draw('No records for this period.',9,false,rgb(.48,.54,.6));
  for(const s of section.rows){const cleaned=safe(s);const words=cleaned.split(' ');let line='';for(const w of words){if((line+' '+w).length>94){draw('• '+line,9,false,rgb(.24,.32,.4),6);line=w;}else line=line?line+' '+w:w;}if(line)draw('• '+line,9,false,rgb(.24,.32,.4),6);}
  y-=12;
 }
 page.drawText(`WorkSphere | ${month} | Page ${pageNumber}`,{x:margin,y:26,size:8,font,color:rgb(.5,.56,.62)});
 return pdf.save();
}
export async function GET(req:NextRequest){
 try{
  const slugValue=slug.parse(req.nextUrl.searchParams.get('slug')),month=req.nextUrl.searchParams.get('month')||'';
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return NextResponse.json({error:'Month must be YYYY-MM'},{status:400});
  const sb=await createClient();const {data:{user}}=await sb.auth.getUser();if(!user)return NextResponse.json({error:'Login required'},{status:401});
  const {data:ws}=await sb.from('workspaces').select('id,name').eq('slug',slugValue).maybeSingle();if(!ws)return NextResponse.json({error:'Workspace not found'},{status:404});
  const {data:member}=await sb.from('workspace_members').select('role').eq('workspace_id',ws.id).eq('user_id',user.id).maybeSingle();if(!member)return NextResponse.json({error:'Permission denied'},{status:403});
  const lead=['owner','admin','manager'].includes(member.role),from=month+'-01',to=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),1)).toISOString().slice(0,10);
  let tasks=sb.from('tasks').select('title,status,actual_hours,completed_at,assigned_to').eq('workspace_id',ws.id).gte('completed_at',from).lt('completed_at',to).limit(500);
  let seo=sb.from('seo_work_records').select('category,description,hours,work_date,completed_by').eq('workspace_id',ws.id).gte('work_date',from).lt('work_date',to).limit(500);
  let social=sb.from('social_content').select('platform,title,publication_status,published_at,created_by').eq('workspace_id',ws.id).gte('published_at',from).lt('published_at',to).limit(500);
  if(!lead){tasks=tasks.eq('assigned_to',user.id);seo=seo.eq('completed_by',user.id);social=social.eq('created_by',user.id);}
  const [tr,sr,cr]=await Promise.all([tasks,seo,social]);for(const r of [tr,sr,cr])if(r.error)throw Error(r.error.message);
  const t=tr.data||[],s=sr.data||[],c=cr.data||[];
  const totalHours=Number(s.reduce((n,x)=>n+Number(x.hours||0),0))+Number(t.reduce((n,x)=>n+Number(x.actual_hours||0),0));
  const buffer=await makePdf(ws.name,month,[{label:'Approved / completed tasks',value:String(t.filter(x=>x.status==='approved').length)},{label:'Recorded SEO work entries',value:String(s.length)},{label:'Published social posts',value:String(c.length)},{label:'Recorded work hours (tasks + SEO)',value:money(totalHours)}],[
   {title:'Tasks completed',rows:t.map(x=>`${x.title} | ${x.status} | ${x.actual_hours||0}h`)},
   {title:'SEO activities',rows:s.map(x=>`${x.category} | ${x.description} | ${x.hours||0}h`)},
   {title:'Published content',rows:c.map(x=>`${x.platform}: ${x.title}`)}
  ]);
  const path=`${ws.id}/reports/${randomUUID()}.pdf`;
  const {error:storeError}=await sb.storage.from('reports-private').upload(path,Buffer.from(buffer),{contentType:'application/pdf',upsert:false});if(storeError)throw Error('Report storage failed: '+storeError.message);
  const {error:recordError}=await sb.from('reports').insert({workspace_id:ws.id,period_month:from,kind:lead?'combined':'personal',generated_by:user.id,storage_path:path});
  if(recordError){await sb.storage.from('reports-private').remove([path]);throw Error('Report metadata failed: '+recordError.message);}
  return new NextResponse(Buffer.from(buffer),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="WorkSphere_Report_${month}.pdf"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Report generation failed'},{status:400});}
}
