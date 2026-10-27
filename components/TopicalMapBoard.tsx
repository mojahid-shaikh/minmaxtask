'use client';
import {useMemo,useState,useEffect,useCallback} from 'react';
import {ReactFlow,Background,Controls,MiniMap,useNodesState,useEdgesState,addEdge,type Connection,type Node,type Edge} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {ActionForm,command,type Field} from '@/components/Operations';
import {useRouter} from 'next/navigation';
export default function TopicalMapBoard({slug,maps,nodes:rawNodes,edges:rawEdges,projects,keywords}:{slug:string;maps:{id:string;title:string}[];nodes:{id:string;map_id:string;title:string;kind:string;x:number;y:number;keyword_id?:string|null}[];edges:{id:string;map_id:string;source_id:string;target_id:string}[];projects:{id:string;name:string}[];keywords:{id:string;keyword:string}[]}){
 const router=useRouter();const [mapId,setMapId]=useState(maps[0]?.id||''),[message,setMessage]=useState('');
 const graphNodes=useMemo<Node[]>(()=>rawNodes.filter(n=>n.map_id===mapId).map(n=>({id:n.id,data:{label:n.title},position:{x:n.x,y:n.y},style:{borderRadius:12,border:n.kind==='pillar'?'2px solid #0f8a93':'1px solid #b9d9da',padding:10,fontWeight:700,background:n.kind==='pillar'?'#e1f5f2':'#fff',maxWidth:240}})),[rawNodes,mapId]);
 const graphEdges=useMemo<Edge[]>(()=>rawEdges.filter(e=>e.map_id===mapId).map(e=>({id:e.id,source:e.source_id,target:e.target_id,animated:false})),[rawEdges,mapId]);
 const [nodes,setNodes,onNodesChange]=useNodesState(graphNodes),[edges,setEdges,onEdgesChange]=useEdgesState(graphEdges);
 useEffect(()=>{setNodes(graphNodes);setEdges(graphEdges);},[graphNodes,graphEdges,setNodes,setEdges]);
 const connect=useCallback(async(conn:Connection)=>{
  try{if(!conn.source||!conn.target)return;await command(slug,'maps.edge',{map_id:mapId,source_id:conn.source,target_id:conn.target});setEdges(old=>addEdge(conn,old));setMessage('Connection saved');router.refresh();}
  catch(ex){setMessage(ex instanceof Error?ex.message:'Link failed');}
 },[slug,mapId,router,setEdges]);
 const dragEnd=useCallback(async(_event:React.MouseEvent,node:Node)=>{
  try{await command(slug,'maps.position',{map_id:mapId,id:node.id,x:node.position.x,y:node.position.y});setMessage('Node position saved');}
  catch(ex){setMessage(ex instanceof Error?ex.message:'Could not save position');}
 },[mapId,slug]);
 const mapFields:Field[]=[{name:'title',label:'Topical map title',required:true},{name:'project_id',label:'Project',type:'select',options:projects.map(x=>({value:x.id,label:x.name}))}];
 const nodeFields:Field[]=[{name:'title',label:'Topic title',required:true},{name:'kind',label:'Node type',type:'select',required:true,defaultValue:'supporting',options:[{value:'pillar',label:'Pillar page'},{value:'supporting',label:'Supporting page'}]},{name:'keyword_id',label:'Link related keyword',type:'select',options:keywords.map(x=>({value:x.id,label:x.keyword}))},{name:'x',label:'Horizontal position',type:'number',defaultValue:100},{name:'y',label:'Vertical position',type:'number',defaultValue:100}];
 return <><div className="page-title"><div><div className="eyebrow">SEMANTIC SEO</div><h1>Topical maps</h1><p className="muted">Build topic structures and visualize pillar-to-supporting relationships.</p></div><ActionForm slug={slug} action="maps.create" fields={mapFields} label="New topical map"/></div>
 <div className="filter-bar"><select className="small-select" value={mapId} onChange={e=>setMapId(e.target.value)} aria-label="Select topical map"><option value="">Select map...</option>{maps.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select>{mapId&&<ActionForm slug={slug} action="maps.node" initial={{map_id:mapId}} fields={nodeFields} label="Add topic node" buttonVariant="secondary"/>}</div>
 {message&&<p className="info-strip" role="status">{message}</p>}
 {mapId?<><div className="flow-wrap"><ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={connect} onNodeDragStop={dragEnd} fitView><Background/><MiniMap pannable zoomable/><Controls/></ReactFlow></div><div className="info-strip space-top">Drag a topic node to reposition it. Drag from one node handle to another to link topics. Saved nodes and links persist after sign-out.</div></>:<div className="card empty"><h3>No topical map selected</h3><p>Create a new topical map to start building your research graph.</p></div>}
 </>;
}
