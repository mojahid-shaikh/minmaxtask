'use client';
import {BarChart,Bar,CartesianGrid,Tooltip,XAxis,YAxis,ResponsiveContainer} from 'recharts';
export default function DashboardChart({data}:{data:{name:string,count:number}[]}){
 return <div style={{width:'100%',height:265}}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{top:10,right:14,left:-25,bottom:8}}><CartesianGrid stroke="#eef3f6" strokeDasharray="4 4"/><XAxis dataKey="name" tick={{fontSize:11,fill:'#8191a1'}} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{fontSize:11,fill:'#8191a1'}} axisLine={false} tickLine={false}/><Tooltip cursor={{fill:'#eef7f8'}}/><Bar dataKey="count" fill="#118691" radius={[6,6,0,0]} maxBarSize={48}/></BarChart></ResponsiveContainer></div>
}
