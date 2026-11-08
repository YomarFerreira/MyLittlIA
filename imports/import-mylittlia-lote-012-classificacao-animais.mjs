/** Lote 012 — classificações e dieta animal. Simulação/execução idempotentes. */
import {existsSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {normalize} from '../server/persistence/database.js';
const args=process.argv.slice(2),apply=args.includes('--apply'),dry=args.includes('--dry-run');
if(Number(apply)+Number(dry)!==1) throw Error('Use --dry-run ou --apply');
const idx=args.indexOf('--db');
if(idx>=0&&!args[idx+1]) throw Error('Informe o caminho após --db');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dbPath=resolve(idx>=0?args[idx+1]:resolve(root,'data/mylittlia.db'));
if(!existsSync(dbPath)) throw Error('SQLite não encontrado: '+dbPath);
const facts=[
 ['vaca','e_um','mamifero'],['vaca','e_um','herbivoro'],['vaca','e_um','bovino'],
 ['cavalo','e_um','mamifero'],['cavalo','e_um','herbivoro'],
 ['coelho','e_um','mamifero'],['coelho','e_um','herbivoro'],
 ['gato','e_um','mamifero'],['gato','e_um','carnivoro'],
 ['leao','e_um','mamifero'],['leao','e_um','carnivoro'],
 ['cachorro','e_um','mamifero'],
 ['ser_humano','e_um','mamifero'],['ser_humano','e_um','onivoro'],
 ['porco','e_um','mamifero'],['porco','e_um','onivoro'],
 ['flamingo','e_um','ave'],['pinguim','e_um','ave']
];
const canon=x=>normalize(x).replaceAll(' ','_');
const db=new DatabaseSync(dbPath,{readOnly:dry});
try{
 const find=db.prepare('SELECT 1 FROM knowledge_relations WHERE subject=? AND predicate=? AND object=? LIMIT 1');
 const insert=db.prepare(`INSERT INTO knowledge_relations(id,subject,predicate,object,confidence,source_type,evidence_count) VALUES (?,?,?,?,?,?,?)`);
 const seen=new Set(),pending=[];
 for(const triple of facts){
  const [subject,predicate,object]=triple.map(canon);
  if(!subject||!predicate||!object||subject.length>100||predicate.length>100||object.length>100)throw Error('Relação inválida: '+triple.join('/'));
  const key=JSON.stringify([subject,predicate,object]);if(seen.has(key))continue;seen.add(key);
  if(!find.get(subject,predicate,object))pending.push([subject,predicate,object]);
 }
 console.log(`Lote 012: ${facts.length} relações, ${pending.length} novas, ${facts.length-pending.length} existentes.`);
 if(dry)console.log('SIMULAÇÃO: sem alterações.');
 else{db.exec('BEGIN IMMEDIATE');try{for(const triple of pending)insert.run(randomUUID(),...triple,null,'imported',1);db.exec('COMMIT');console.log('Importação concluída; pesos preexistentes preservados.');}catch(err){db.exec('ROLLBACK');throw err}}
}finally{db.close()}
