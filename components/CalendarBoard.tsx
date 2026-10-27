'use client';
import {useMemo,useState} from 'react';import {ChevronLeft,ChevronRight} from 'lucide-react';
type Entry={id:string;title:string;date:string;kind:'task'|'social';status:string};
export default function CalendarBoard({events}:{events:Entry[]}){
 const now=new Date(),[month,setMonth]=useState(now.getMonth()),[year,setYear]=useState(now.getFullYear());
 const first=new Date(year,month,1),monthDays=new Date(year,month+1,0).getDate(),offset=first.getDay();
 const cells=useMemo(()=>Array.from({length:Math.ceil((offset+monthDays)/7)*7},(_,i)=>i-offset+1),[offset,monthDays]);
 const change=(n:number)=>{const d=new Date(year,month+n,1);setYear(d.getFullYear());setMonth(d.getMonth());};
 return <div className="card"><div className="flex between center" style={{marginBottom:19}}><h2 style={{margin:0}}>{first.toLocaleString('en-US',{month:'long'})} {year}</h2><div className="action-row"><button className="secondary btn-sm" aria-label="Previous month" onClick={()=>change(-1)}><ChevronLeft size={16}/></button><button className="secondary btn-sm" onClick={()=>{setYear(now.getFullYear());setMonth(now.getMonth());}}>Today</button><button className="secondary btn-sm" aria-label="Next month" onClick={()=>change(1)}><ChevronRight size={16}/></button></div></div>
 <div className="calendar-grid">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(s=><div className="calendar-day" style={{minHeight:30,textAlign:'center',background:'#f5f9fa'}} key={s}><b>{s}</b></div>)}{cells.map((day,index)=>{
 const iso=day>0&&day<=monthDays?`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`:'';
 const entries=events.filter(e=>iso&&e.date.slice(0,10)===iso);
 return <div className="calendar-day" key={index} style={{background:!iso?'#f7f8fa':'white'}}>{iso&&<><b>{day}</b>{entries.map(x=><div className="calendar-pill" title={`${x.kind}: ${x.title} (${x.status})`} key={x.id} style={x.kind==='task'?{background:'#edf2ff',color:'#405c8a'}:{}}>{x.kind==='task'?'✓ ':'● '}{x.title}</div>)}</>}</div>;
 })}</div><div className="info-strip space-top">Calendar entries are derived from task deadlines and social content schedules; changing a task or content date updates the calendar.</div></div>;
}
