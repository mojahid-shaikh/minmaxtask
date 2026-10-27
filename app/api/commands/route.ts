import {NextRequest,NextResponse} from 'next/server';
import {randomBytes,createHash} from 'node:crypto';
import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';
import {canTransition,httpUrl,optionalUrl,optionalText,slug,text,uuid,isValidColumnId} from '@/lib/validation';
import {localRateLimit} from '@/lib/rate';

export const runtime='nodejs';
type Payload=Record<string,unknown>;
const nullableNumber=z.preprocess(value=>value===''?null:value,z.coerce.number().min(0).nullish());
const permissions={
  'projects.create':'manager','projects.update':'manager','projects.member':'manager',
  'sections.create':'member','sections.field':'member','sections.record':'member',
  'tasks.create':'member','tasks.transition':'member','tasks.comment':'member','tasks.checklist':'member','tasks.checklist.toggle':'member','tasks.evidence':'member','tasks.hours':'member',
  'seo.create':'member','keywords.create':'member','maps.create':'member','maps.node':'member','maps.position':'member','maps.edge':'member',
  'social.create':'member','social.update':'member','social.accounts':'member',
  'accounts.create':'admin','accounts.grant':'admin','accounts.revoke':'admin',
  'team.invite':'admin','team.role':'admin','team.revoke':'admin','team.remove':'admin','team.transfer':'owner',
  'notifications.read':'member','workspace.update':'admin','profiles.update':'member'
} as Record<string,string>;
const fields={
 'projects.create':z.object({name:text,description:optionalText,client_name:optionalText,domain:optionalText,visibility:z.enum(['workspace','private']).default('workspace')}),
 'projects.update':z.object({id:uuid,status:z.enum(['active','on_hold','completed','archived'])}),
 'projects.member':z.object({project_id:uuid,user_id:uuid}),
 'sections.create':z.object({name:text,project_id:uuid.nullish(),parent_section_id:uuid.nullish(),visibility:z.enum(['workspace','private']).default('workspace')}),
 'sections.field':z.object({section_id:uuid,name:text,field_key:z.string().refine(isValidColumnId),field_type:z.enum(['text','number','date','url','select','multi_select','checkbox','user']),required:z.boolean().default(false),options:z.array(z.string()).max(40).default([])}),
 'sections.record':z.object({section_id:uuid,title:text,field_values:z.record(z.string(), z.unknown()).default({})}),
 'tasks.create':z.object({title:text,description:optionalText,project_id:uuid.nullish(),assigned_to:uuid.nullish(),priority:z.enum(['low','medium','high','urgent']).default('medium'),due_at:z.union([z.string().date(),z.literal('')]).optional(),estimate_hours:z.coerce.number().min(0).max(100000).default(0)}),
 'tasks.transition':z.object({id:uuid,status:z.enum(['todo','in_progress','submitted','changes_requested','approved','cancelled']),comment:optionalText}),
 'tasks.comment':z.object({task_id:uuid,body:z.string().trim().min(1).max(4000)}),
 'tasks.checklist':z.object({task_id:uuid,title:text}),
 'tasks.checklist.toggle':z.object({id:uuid,done:z.boolean()}),
 'tasks.evidence':z.object({task_id:uuid,work_url:optionalUrl,note:optionalText,file_path:z.string().max(500).optional()}),
 'tasks.hours':z.object({task_id:uuid,actual_hours:z.coerce.number().min(0).max(100000)}),
 'seo.create':z.object({project_id:uuid.nullish(),category:text,description:z.string().min(1).max(5000),live_url:optionalUrl,hours:z.coerce.number().min(0).max(100000).default(0),work_date:z.string().date()}),
 'keywords.create':z.object({project_id:uuid.nullish(),keyword:text,location:z.string().max(100).default(''),intent:z.string().max(100).default(''),search_volume:z.preprocess(v=>v===''?null:v,z.coerce.number().int().min(0).nullish()),difficulty:z.preprocess(v=>v===''?null:v,z.coerce.number().min(0).max(100).nullish()),cpc:nullableNumber,cluster_name:optionalText,source:z.string().max(120).default('manual'),target_url:optionalUrl}),
 'maps.create':z.object({title:text,project_id:uuid.nullish()}),
 'maps.node':z.object({map_id:uuid,title:text,kind:z.enum(['pillar','supporting']).default('supporting'),keyword_id:uuid.nullish(),x:z.coerce.number().finite().default(0),y:z.coerce.number().finite().default(0)}),
 'maps.position':z.object({map_id:uuid,id:uuid,x:z.coerce.number().finite(),y:z.coerce.number().finite()}),
 'maps.edge':z.object({map_id:uuid,source_id:uuid,target_id:uuid}),
 'social.accounts':z.object({platform:text,handle:text,profile_url:optionalUrl}),
 'social.create':z.object({project_id:uuid.nullish(),account_id:uuid.nullish(),platform:text,title:text,caption:optionalText,content_type:z.string().max(60).default('post'),publication_status:z.enum(['draft','scheduled','published','failed']).default('draft'),scheduled_at:z.string().datetime().nullish(),published_url:optionalUrl}),
 'social.update':z.object({id:uuid,publication_status:z.enum(['draft','scheduled','published','failed']),scheduled_at:z.string().datetime().nullish(),published_url:optionalUrl}),
 'accounts.create':z.object({service:text,account_email:z.string().email().or(z.literal('')).default(''),username:optionalText,login_url:optionalUrl,vault_reference:optionalUrl,note:optionalText}),
 'accounts.grant':z.object({account_id:uuid,user_id:uuid}),
 'accounts.revoke':z.object({account_id:uuid,user_id:uuid}),
 'team.invite':z.object({email:z.string().trim().toLowerCase().email(),role:z.enum(['admin','manager','member'])}),
 'team.role':z.object({user_id:uuid,role:z.enum(['admin','manager','member'])}),
 'team.revoke':z.object({invitation_id:uuid}),
 'team.remove':z.object({user_id:uuid}),
 'team.transfer':z.object({user_id:uuid}),
 'notifications.read':z.object({id:uuid}),
 'workspace.update':z.object({name:text,description:optionalText}),
 'profiles.update':z.object({full_name:text,title:optionalText,bio:optionalText,timezone:z.string().max(100).default('Asia/Dhaka'),language:z.enum(['en','bn']).default('en'),visibility:z.enum(['public','workspace','private']).default('workspace')})
} as Record<string,z.ZodTypeAny>;

export async function POST(req:NextRequest){
 try{
  const origin=req.headers.get('origin');if(origin && origin!==req.nextUrl.origin)return NextResponse.json({error:'Invalid origin'},{status:403});
  if(Number(req.headers.get('content-length')||0)>250000)return NextResponse.json({error:'Request too large'},{status:413});
  const input=await req.json();
  if(!input || typeof input.action!=='string')return NextResponse.json({error:'Missing action'},{status:400});
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'Login required'},{status:401});
  if(!localRateLimit(`${user.id}:${input.action}`,40))return NextResponse.json({error:'Too many requests'},{status:429});
  if(input.action==='workspace.create'){
   const p=z.object({name:text,slug,kind:z.enum(['company','personal'])}).parse(input.payload);
   const {data,error}=await supabase.rpc('create_workspace',{p_name:p.name,p_slug:p.slug,p_kind:p.kind});
   if(error)throw Error(error.message);
   return NextResponse.json({ok:true,id:data,redirect:`/w/${p.slug}/dashboard`});
  }
  const action=input.action as string;
  const schema=fields[action];if(!schema)return NextResponse.json({error:'Unknown action'},{status:400});
  const parse=schema.safeParse(input.payload);
  if(!parse.success)return NextResponse.json({error:'Invalid fields',issues:parse.error.flatten()},{status:400});
  const p=parse.data as Payload;
  const workspaceSlug=slug.parse(input.workspaceSlug);
  const {data:workspace,error:wsError}=await supabase.from('workspaces').select('id,slug').eq('slug',workspaceSlug).maybeSingle();
  if(wsError || !workspace)return NextResponse.json({error:'Workspace not found'},{status:404});
  const wid=workspace.id as string;
  const {data:member}=await supabase.from('workspace_members').select('role').eq('workspace_id',wid).eq('user_id',user.id).maybeSingle();
  if(!member)return NextResponse.json({error:'Workspace access denied'},{status:403});
  const role=member.role as string;
  const ranks:Record<string,number>={member:0,manager:1,admin:2,owner:3};
  if(ranks[role]<ranks[permissions[action]])return NextResponse.json({error:'Insufficient permissions'},{status:403});
  const insert=async(table:string,record:Record<string,unknown>)=>{
   const {data,error}=await supabase.from(table).insert({workspace_id:wid,...record}).select('id').single();
   if(error)throw Error(error.message);return data;
  };
  const update=async(table:string,id:string,record:Record<string,unknown>)=>{
   const {data,error}=await supabase.from(table).update(record).eq('workspace_id',wid).eq('id',id).select('id').single();
   if(error)throw Error(error.message);return data;
  };
  const assertProject=async(id:unknown)=>{
   if(!id)return;
   const {data}=await supabase.from('projects').select('id').eq('workspace_id',wid).eq('id',id as string).maybeSingle();
   if(!data)throw Error('Project is inaccessible');
  };
  const assertSection=async(id:unknown)=>{
   const {data}=await supabase.from('sections').select('id').eq('workspace_id',wid).eq('id',id as string).maybeSingle();
   if(!data)throw Error('Section is inaccessible');
  };
  const assertTask=async(id:unknown)=>{
   const {data}=await supabase.from('tasks').select('*').eq('workspace_id',wid).eq('id',id as string).maybeSingle();
   if(!data)throw Error('Task is inaccessible');return data;
  };
  const assertMap=async(id:unknown)=>{
   const {data}=await supabase.from('topical_maps').select('id').eq('workspace_id',wid).eq('id',id as string).maybeSingle();
   if(!data)throw Error('Map is inaccessible');
  };
  let result:unknown=null;
  switch(action){
   case 'profiles.update':{
    const {error}=await supabase.from('profiles').update(p).eq('user_id',user.id);if(error)throw Error(error.message);
    result={id:user.id};break;
   }
   case 'workspace.update':{const {data,error}=await supabase.from('workspaces').update(p).eq('id',wid).select('id').single();if(error)throw Error(error.message);result=data;break;}
   case 'projects.create':result=await insert('projects',{...p,created_by:user.id});break;
   case 'projects.update':result=await update('projects',p.id as string,{status:p.status});break;
   case 'projects.member':{await assertProject(p.project_id);const {data:m}=await supabase.from('workspace_members').select('user_id').eq('workspace_id',wid).eq('user_id',p.user_id).maybeSingle();if(!m)throw Error('Target is not a workspace member');const {error}=await supabase.from('project_members').upsert({workspace_id:wid,project_id:p.project_id,user_id:p.user_id},{onConflict:'project_id,user_id'});if(error)throw Error(error.message);result={ok:true};break;}
   case 'sections.create':{
    await assertProject(p.project_id);if(p.parent_section_id)await assertSection(p.parent_section_id);
    result=await insert('sections',p);break;
   }
   case 'sections.field':{
    await assertSection(p.section_id);
    result=await insert('section_fields',p);break;
   }
   case 'sections.record':{
    await assertSection(p.section_id);
    const {data:defs,error}=await supabase.from('section_fields').select('*').eq('workspace_id',wid).eq('section_id',p.section_id);
    if(error)throw Error(error.message);
    const entries=p.field_values as Record<string,unknown>;
    const keys=new Set((defs||[]).map(f=>f.field_key as string));
    for(const [key,value] of Object.entries(entries)){
      if(!keys.has(key))throw Error(`Unknown field: ${key}`);
      const d=(defs||[]).find(f=>f.field_key===key)!;
      if(d.field_type==='number' && value!=='' && (typeof value!=='number' || !Number.isFinite(value)))throw Error(`Invalid numeric field: ${key}`);
      if(d.field_type==='url' && value!=='' && !httpUrl.safeParse(value).success)throw Error(`Invalid URL field: ${key}`);
      if(d.field_type==='checkbox' && typeof value!=='boolean')throw Error(`Invalid checkbox field: ${key}`);
      if(d.field_type==='date' && value!=='' && (typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)))throw Error(`Invalid date field: ${key}`);
      if(d.field_type==='select' && value!=='' && !(Array.isArray(d.options)&&d.options.includes(value)))throw Error(`Unknown select option: ${key}`);
      if(d.field_type==='multi_select' && (!Array.isArray(value) || (value as unknown[]).some(v=>!Array.isArray(d.options)||!d.options.includes(v))))throw Error(`Unknown multi-select options: ${key}`);
      if(d.field_type==='user' && value!=='' && !uuid.safeParse(value).success)throw Error(`Invalid user reference: ${key}`);
    }
    for(const d of defs||[]){if(d.required && (entries[d.field_key]===undefined || entries[d.field_key]===''))throw Error(`Required: ${d.name}`);}
    result=await insert('section_records',{...p,created_by:user.id});break;
   }
   case 'tasks.create':{
    await assertProject(p.project_id);
    if(p.assigned_to){
     const {data:m}=await supabase.from('workspace_members').select('user_id').eq('workspace_id',wid).eq('user_id',p.assigned_to).maybeSingle();
     if(!m)throw Error('Assignee must belong to workspace');
    }
    result=await insert('tasks',{...p,assigned_to:p.assigned_to||user.id,due_at:p.due_at||null,created_by:user.id});
    // Database trigger dispatches assignment notifications atomically.
    break;
   }
   case 'tasks.transition':{
    const t=await assertTask(p.id);
    if(!canTransition(t.status,p.status as string,role,t.assigned_to===user.id,t.created_by===user.id))throw Error('This task transition is not permitted');
    // Privileged DB RPC enforces the same review policy atomically and prevents direct client bypass.
    const {data,error}=await supabase.rpc('transition_task',{p_workspace:wid,p_task:p.id,p_status:p.status,p_comment:p.comment||''});
    if(error)throw Error(error.message);result={id:data};break;
   }
   case 'tasks.comment':await assertTask(p.task_id);result=await insert('task_comments',{...p,user_id:user.id});break;
   case 'tasks.checklist':await assertTask(p.task_id);result=await insert('task_checklist_items',p);break;
   case 'tasks.checklist.toggle':{const {data:item}=await supabase.from('task_checklist_items').select('id,task_id').eq('workspace_id',wid).eq('id',p.id).maybeSingle();if(!item)throw Error('Checklist item not found');await assertTask(item.task_id);result=await update('task_checklist_items',p.id as string,{done:p.done});break;}
   case 'tasks.evidence':{
    await assertTask(p.task_id);
    if(!p.work_url && !p.note && !p.file_path)throw Error('Evidence cannot be empty');
    // File references are only accepted when the matching attachment belongs to this workspace.
    if(p.file_path){const {data:f}=await supabase.from('attachments').select('id').eq('workspace_id',wid).eq('storage_path',p.file_path).maybeSingle();if(!f)throw Error('Invalid attachment reference');}
    result=await insert('task_evidence',{...p,submitted_by:user.id});break;
   }
   case 'tasks.hours':{
    await assertTask(p.task_id);
    const {data,error}=await supabase.rpc('set_task_hours',{p_workspace:wid,p_task:p.task_id,p_hours:p.actual_hours});
    if(error)throw Error(error.message);result={id:data};break;
   }
   case 'seo.create':await assertProject(p.project_id);result=await insert('seo_work_records',{...p,project_id:p.project_id||null,completed_by:user.id});break;
   case 'keywords.create':{
    await assertProject(p.project_id);
    result=await insert('keywords',{...p,project_id:p.project_id||null});break;
   }
   case 'maps.create':await assertProject(p.project_id);result=await insert('topical_maps',p);break;
   case 'maps.node':{await assertMap(p.map_id);if(p.keyword_id){const {data:keyword}=await supabase.from('keywords').select('id').eq('workspace_id',wid).eq('id',p.keyword_id).maybeSingle();if(!keyword)throw Error('Linked keyword unavailable');}result=await insert('topical_map_nodes',p);break;}
   case 'maps.position':{
    await assertMap(p.map_id);
    const {data:node}=await supabase.from('topical_map_nodes').select('id').eq('workspace_id',wid).eq('map_id',p.map_id).eq('id',p.id).maybeSingle();
    if(!node)throw Error('Node not on this map');
    result=await update('topical_map_nodes',p.id as string,{x:p.x,y:p.y});break;
   }
   case 'maps.edge':{
    await assertMap(p.map_id);if(p.source_id===p.target_id)throw Error('Self edges not permitted');
    const {data:nodes}=await supabase.from('topical_map_nodes').select('id').eq('workspace_id',wid).eq('map_id',p.map_id).in('id',[p.source_id,p.target_id]);
    if(nodes?.length!==2)throw Error('Invalid source/target');
    result=await insert('topical_map_edges',p);break;
   }
   case 'social.accounts':result=await insert('social_accounts',p);break;
   case 'social.create':{
    await assertProject(p.project_id);
    if(p.account_id){const {data:a}=await supabase.from('social_accounts').select('id').eq('workspace_id',wid).eq('id',p.account_id).maybeSingle();if(!a)throw Error('Invalid social account');}
    if(p.publication_status==='published'&&!p.published_url)throw Error('Published posts need a live URL');
    if(p.publication_status==='scheduled'&&!p.scheduled_at)throw Error('Scheduled content requires a date');
    result=await insert('social_content',{...p,created_by:user.id,scheduled_at:p.scheduled_at||null,published_at:p.publication_status==='published'?new Date().toISOString():null});break;
   }
   case 'social.update':{
    if(p.publication_status==='published'&&!p.published_url)throw Error('Published posts need a live URL');
    if(p.publication_status==='scheduled'&&!p.scheduled_at)throw Error('Scheduled content requires a date');
    result=await update('social_content',p.id as string,{publication_status:p.publication_status,published_url:p.published_url,scheduled_at:p.scheduled_at||null,published_at:p.publication_status==='published'?new Date().toISOString():null});break;
   }
   case 'accounts.create':result=await insert('account_directory',p);break;
   case 'accounts.grant':{
    const {data:a}=await supabase.from('account_directory').select('id').eq('workspace_id',wid).eq('id',p.account_id).maybeSingle();
    const {data:m}=await supabase.from('workspace_members').select('user_id').eq('workspace_id',wid).eq('user_id',p.user_id).maybeSingle();
    if(!a||!m)throw Error('Invalid account or member');
    const {error}=await supabase.from('account_access').insert({workspace_id:wid,...p});if(error)throw Error(error.message);
    result={ok:true};break;
   }
   case 'accounts.revoke':{const {error}=await supabase.from('account_access').delete().eq('workspace_id',wid).eq('account_id',p.account_id).eq('user_id',p.user_id);if(error)throw Error(error.message);result={ok:true};break;}
   case 'team.invite':{
    const token=randomBytes(32).toString('hex');const token_hash=createHash('sha256').update(token).digest('hex');
    const {data,error}=await supabase.from('workspace_invitations').insert({workspace_id:wid,email:p.email,role:p.role,token_hash,invited_by:user.id,expires_at:new Date(Date.now()+7*86400000).toISOString()}).select('id').single();
    if(error)throw Error(error.message);
    // Delivery is deliberately manual. Do not pretend transactional email is configured.
    result={...data,inviteUrl:`${req.nextUrl.origin}/invitations/accept?token=${token}`};break;
   }
   case 'team.role':{
    const {data:m}=await supabase.from('workspace_members').select('role').eq('workspace_id',wid).eq('user_id',p.user_id).maybeSingle();
    if(!m||m.role==='owner')throw Error('Cannot change owner role');
    const {error}=await supabase.from('workspace_members').update({role:p.role}).eq('workspace_id',wid).eq('user_id',p.user_id);if(error)throw Error(error.message);
    result={ok:true};break;
   }
   case 'team.revoke':result=await update('workspace_invitations',p.invitation_id as string,{status:'revoked'});break;
   case 'team.remove':{const {data,error}=await supabase.rpc('remove_workspace_member',{p_workspace:wid,p_target:p.user_id});if(error)throw Error(error.message);result={id:data};break;}
   case 'team.transfer':{const {data,error}=await supabase.rpc('transfer_workspace_ownership',{p_workspace:wid,p_target:p.user_id});if(error)throw Error(error.message);result={id:data};break;}
   case 'notifications.read':result=await update('notifications',p.id as string,{is_read:true});break;
   default:throw Error('Unsupported action');
  }
  // The audit event is intentionally sanitized (action + ID only, no private content).
  const entityId=(result as {id?:string}|null)?.id;
  await supabase.from('activity_events').insert({workspace_id:wid,actor_id:user.id,kind:action,summary:action.replace(/[.]/g,' '),entity_id:entityId||null});
  return NextResponse.json({ok:true,result});
 }catch(error){
  if(error instanceof z.ZodError)return NextResponse.json({error:'Invalid input',issues:error.flatten()},{status:400});
  const message=error instanceof Error?error.message:'Unknown failure';
  // Keep error messages useful but avoid leaking query parameters or internal stack traces.
  return NextResponse.json({error:message.slice(0,220)},{status:400});
 }
}
