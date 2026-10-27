// Application-layer best-effort throttling for development only.
// For production, use durable distributed rate limiting at the edge/backend.
const last=new Map<string,{count:number,starts:number}>();
export function localRateLimit(key:string,max=30,windowMs=60000){
 const now=Date.now();const prev=last.get(key);
 if(!prev||now-prev.starts>windowMs){last.set(key,{count:1,starts:now});return true;}
 prev.count++;return prev.count<=max;
}
