/** RFC4180-ish CSV parser with escaped quotation and CRLF support. No arbitrary code execution. */
export function parseCsv(input:string):string[][]{
 const source=input.replace(/^\uFEFF/,'');const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<source.length;i++){
  const char=source[i];if(char==='"'){
   if(quoted&&source[i+1]==='"'){cell+='"';i++;}else if(!quoted&&cell===''){quoted=true;}else if(quoted){quoted=false;}else throw Error('Malformed CSV quote');
  }else if(char===','&&!quoted){row.push(cell);cell='';}
  else if((char==='\n'||char==='\r')&&!quoted){if(char==='\r'&&source[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()!==''))rows.push(row);row=[];cell='';}
  else cell+=char;
 }
 if(quoted)throw Error('Unterminated quoted CSV cell');
 row.push(cell);if(row.some(x=>x.trim()!==''))rows.push(row);
 return rows;
}
export function rowsToObjects(rows:string[][]):Record<string,string>[]{
 if(rows.length===0)return [];
 const names=rows[0].map(x=>x.toLowerCase().trim().replace(/^\uFEFF/,''));
 if(names.some((n,i)=>!n||names.indexOf(n)!==i))throw Error('Duplicate or empty CSV header');
 return rows.slice(1).map(row=>Object.fromEntries(names.map((name,index)=>[name,(row[index]||'').trim()])));
}
