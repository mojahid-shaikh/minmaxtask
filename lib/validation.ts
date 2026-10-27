import {z} from 'zod';
export const uuid=z.string().uuid();
export const text=z.string().trim().min(1).max(500);
export const optionalText=z.string().trim().max(5000).optional().default('');
export const httpUrl=z.string().trim().url().refine((v)=>{
 try{return ['https:','http:'].includes(new URL(v).protocol);}catch{return false;}
},'Only http(s) URLs are permitted');
export const optionalUrl=z.union([httpUrl,z.literal('')]).optional().default('');
export const slug=z.string().regex(/^[a-z0-9][a-z0-9-]{2,49}$/);
export const status=z.enum(['todo','in_progress','submitted','changes_requested','approved','cancelled']);
export const phases=['todo','in_progress','submitted','changes_requested','approved','cancelled'] as const;
export function canTransition(from:string,to:string,role:string,actorIsAssignee:boolean,actorIsCreator:boolean){
 if(from===to)return false;
 if(to==='approved' || to==='changes_requested') return from==='submitted' && ['owner','admin','manager'].includes(role) && !actorIsAssignee && !actorIsCreator;
 if(to==='submitted') return ['todo','in_progress','changes_requested'].includes(from) && (actorIsAssignee || ['owner','admin'].includes(role));
 if(to==='cancelled') return ['owner','admin'].includes(role) && from!=='approved';
 if(to==='in_progress')return ['todo','changes_requested'].includes(from) && (actorIsAssignee || ['owner','admin','manager'].includes(role));
 if(to==='todo')return from==='in_progress' && ['owner','admin','manager'].includes(role);
 return false;
}
export function isValidColumnId(value:string){return /^[a-z][a-z0-9_]{1,39}$/.test(value);}
export const notifyText=(s:string)=>s.slice(0,500);
