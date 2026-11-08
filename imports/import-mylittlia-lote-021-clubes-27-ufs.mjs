import {DatabaseSync} from 'node:sqlite';
import {openDatabase} from '../server/persistence/database.js';
import {importFootballResearch} from '../server/adapters/football/football-research-import.js';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const args=process.argv.slice(2);
if(args.length!==1||!['--dry-run','--apply'].includes(args[0]))throw new Error('Uso: node imports/import-mylittlia-lote-021-clubes-27-ufs.mjs --dry-run|--apply');
const path=fileURLToPath(new URL('../data/mylittlia.db',import.meta.url));
const apply=args[0]==='--apply';
const db=apply?openDatabase(path,{seed:false}):new DatabaseSync(path,{readOnly:true});
try{console.log(JSON.stringify(importFootballResearch(db,{apply}),null,2));}finally{db.close();}
