const fs=require('fs'),path=require('path'),assert=require('assert');const root=path.resolve(__dirname,'..');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?walk(path.join(dir,d.name)):[path.join(dir,d.name)])}
const tsFiles=[...walk(path.join(root,'app')),...walk(path.join(root,'components')),...walk(path.join(root,'lib')),...walk(path.join(root,'tests'))].filter(f=>/\.(tsx?|jsx?)$/.test(f));
let internalImports=0;for(const f of tsFiles){let code=fs.readFileSync(f,'utf8');for(const match of code.matchAll(/from\s+['"]@\/(.+?)['"]/g)){const rel=match[1];const base=path.join(root,rel);const candidates=[base,base+'.ts',base+'.tsx',base+'.js',path.join(base,'index.ts')];assert(candidates.some(x=>fs.existsSync(x)),`Broken import in ${f}: @/${rel}`);internalImports++;}}
const file=fs.readFileSync(path.join(root,'app','api','commands','route.ts'),'utf8');const actions=[...file.matchAll(/^\s*case\s+'([^']+)'\s*:/gm)].map(x=>x[1]);
const formActions=[...tsFiles.flatMap(f=>[...fs.readFileSync(f,'utf8').matchAll(/action="([^\"]+)"/g)].map(x=>x[1]))];
for(const action of formActions.filter(x=>!x.startsWith('/'))){assert(actions.includes(action),`UI action not handled by API: ${action}`);}
const migrations=fs.readdirSync(path.join(root,'supabase','migrations')).filter(f=>f.endsWith('.sql'));assert(migrations.length>=3,'Required migrations missing');
console.log(`Verified ${tsFiles.length} source files, ${internalImports} local imports, ${actions.length} API command cases, ${formActions.length} UI actions, ${migrations.length} migrations`);
