import {readFileSync,readdirSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const files=readdirSync(new URL('../tests/',import.meta.url)).filter(name=>name.endsWith('.mjs')).sort();
const results=[];
for(const file of files) {
 const run=spawnSync(process.execPath,[`tests/${file}`],{encoding:'utf8',timeout:120000});
 const ok=run.status===0;
 results.push({file,ok,status:run.status,error:run.error?.message,output:run.stdout+run.stderr});
 console.log(`${ok?'PASS':'FAIL'} ${file}`);
 if(!ok)console.log((run.stdout+run.stderr).slice(-6000));
}
mkdirSync('backups',{recursive:true});
const version=JSON.parse(readFileSync('package.json','utf8')).version;
writeFileSync(`backups/test-results-${version}.json`,JSON.stringify(results,null,2));
console.log(`${results.filter(r=>r.ok).length}/${results.length} testes passaram.`);
process.exitCode=results.every(r=>r.ok)?0:1;
