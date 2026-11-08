/** Lote 015 — vocalizações típicas de animais. Fonte: conhecimento zoológico geral;
 * uso ilustrativo, não contém medições acústicas verificadas.
 * node imports/import-mylittlia-lote-015-vocalizacoes-animais.mjs --dry-run|--apply
 */
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const args=process.argv.slice(2);
const dry=args.includes('--dry-run'),apply=args.includes('--apply');
if (Number(dry)+Number(apply)!==1) throw Error('Use --dry-run OU --apply');
const path=resolve(dirname(fileURLToPath(import.meta.url)),'../data/mylittlia.db');
if(!existsSync(path)) throw Error('SQLite não encontrado: '+path);
const facts=[
 ['cachorro','som_emitido','latido'],['gato','som_emitido','miado'],
 ['vaca','som_emitido','mugido'],['cavalo','som_emitido','relincho'],
 ['ovelha','som_emitido','balido'],['cabra','som_emitido','balido'],
 ['porco','som_emitido','grunhido'],['leao','som_emitido','rugido'],
 ['lobo','som_emitido','uivo'],['pato','som_emitido','grasnido'],
 ['galinha','som_emitido','cacarejo'],['galo','som_emitido','canto'],
 ['sapo','som_emitido','coaxar'],['coruja','som_emitido','pio'],
 ['elefante','som_emitido','bramido']
];
const normalize=s=>String(s).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').trim().replaceAll(' ','_');
const db=new DatabaseSync(path,{readOnly:dry});
try {
 const exists=db.prepare('SELECT 1 FROM knowledge_relations WHERE subject=? AND predicate=? AND object=? LIMIT 1');
 const rows=facts.map(x=>x.map(normalize));
 const pending=rows.filter(row=>!exists.get(...row));
 console.log(`Lote 015: ${rows.length} relações; ${pending.length} novas; ${rows.length-pending.length} existentes.`);
 if(dry) console.log('SIMULAÇÃO: nenhuma alteração.');
 else {
  const insert=db.prepare('INSERT INTO knowledge_relations(id,subject,predicate,object,confidence,source_type,evidence_count) VALUES(?,?,?,?,NULL,?,1)');
  db.exec('BEGIN IMMEDIATE');
  try {for(const row of pending) insert.run(randomUUID(),...row,'imported');db.exec('COMMIT');}
  catch(e){db.exec('ROLLBACK');throw e;}
  console.log(`IMPORTAÇÃO: ${pending.length} relações adicionadas, sem modificar pesos existentes.`);
 }
} finally {db.close();}
