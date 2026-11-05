import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
const root=dirname(fileURLToPath(import.meta.url));
for(const dir of ['dist/api','dist/shared','dist/public'])mkdirSync(join(root,dir),{recursive:true});
for(const name of ['issue-workspace-switch','issue-switch-destination','issue-ref','project-paths']){
 const source=readFileSync(join(root,'../../lib',name+'.ts'),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replaceAll(/from "@\/lib\/([^"]+)"/g,'from "./$1.mjs"');
 writeFileSync(join(root,'dist/shared',name+'.mjs'),js);
}
copyFileSync(join(root,'handler.mjs'),join(root,'dist/api/index.mjs'));
copyFileSync(join(root,'render.mjs'),join(root,'dist/render.mjs'));
copyFileSync(join(root,'../../components/issue-workspace-switch.module.css'),join(root,'dist/public/styles.css'));
writeFileSync(join(root,'dist/package.json'),JSON.stringify({type:'module',engines:{node:'22.x'}}));
writeFileSync(join(root,'dist/vercel.json'),JSON.stringify({version:2,builds:[{src:'api/index.mjs',use:'@vercel/node'},{src:'public/**',use:'@vercel/static'}],routes:[{src:'/styles.css',dest:'/public/styles.css'},{src:'/(.*)',dest:'/api/index.mjs'}]}));
console.log('Built server-backed sandbox with the production destination and membership resolver modules.');
