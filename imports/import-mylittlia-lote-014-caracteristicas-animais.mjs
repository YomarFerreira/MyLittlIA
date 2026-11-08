/** Lote 014 — relações introdutórias sobre anatomia de animais.
 * Uso: node imports/import-mylittlia-lote-014-caracteristicas-animais.mjs --dry-run|--apply
 * Um arquivo, sem dependências, sem alterações em pesos nem exclusões.
 */
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const args=process.argv.slice(2);
const dry=args.includes('--dry-run'),apply=args.includes('--apply');
if(Number(dry)+Number(apply)!==1)throw Error('Use --dry-run OU --apply');
const path=resolve(dirname(fileURLToPath(import.meta.url)),'../data/mylittlia.db');
if(!existsSync(path))throw Error('SQLite não encontrado: '+path);
const facts=[
 ['elefante africano','possui','tromba'],
 ['elefante africano','possui','presas de marfim'],
 ['girafa','possui','pescoco longo'],
 ['rinoceronte branco','possui','chifres'],
 ['tucano','possui','bico grande'],
 ['pinguim imperador','revestimento','penas'],
 ['morcego','possui','asas'],
 ['aguia','revestimento','penas'],
 ['tartaruga marinha','possui','carapaca'],
 ['polvo','numero_bracos_tipico','8'],
 ['aranha','numero_patas_tipico','8'],
 ['formiga','numero_patas_tipico','6'],
 ['cavalo','revestimento','pelos'],
 ['lagarto','revestimento','escamas'],
 ['salmão','respira_por','branquias']
];
const canon=s=>String(s).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').trim().replaceAll(' ','_');
const db=new DatabaseSync(path,{readOnly:dry});
try {
 const rows=facts.map(r=>r.map(canon));
 const exists=db.prepare('SELECT 1 FROM knowledge_relations WHERE subject=? AND predicate=? AND object=? LIMIT 1');
 const pending=rows.filter(r=>!exists.get(...r));
 console.log(`Lote 014: ${facts.length} relações; ${pending.length} novas; ${facts.length-pending.length} existentes.`);
 if(dry){console.log('SIMULAÇÃO: nenhuma alteração.');}
 else{
  const insert=db.prepare('INSERT INTO knowledge_relations(id,subject,predicate,object,confidence,source_type,evidence_count) VALUES (?,?,?,?,NULL,?,1)');
  db.exec('BEGIN IMMEDIATE');
  try {for (const r of pending) insert.run(randomUUID(),...r,'imported');db.exec('COMMIT');}
  catch(e){db.exec('ROLLBACK');throw e;}
  console.log(`IMPORTAÇÃO: ${pending.length} relações adicionadas, pesos existentes preservados.`);
 }
} finally {db.close();}
