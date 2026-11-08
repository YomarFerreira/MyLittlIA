/** Lote 016: sons dos animais como conceitos consultáveis no grafo.
 * Onomatopeias são aproximações em português, não gravações ou medições acústicas.
 * Mesmo arquivo para --dry-run e --apply; nunca altera pesos existentes.
 */
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const args=process.argv.slice(2),dry=args.includes('--dry-run'),apply=args.includes('--apply');
if(Number(dry)+Number(apply)!==1) throw Error('Use --dry-run OU --apply');
const at=args.indexOf('--db');
if(at>=0&&!args[at+1]) throw Error('Informe --db seguido do caminho do SQLite');
const dbPath=at>=0?resolve(args[at+1]):resolve(dirname(fileURLToPath(import.meta.url)),'../data/mylittlia.db');
if(!existsSync(dbPath)) throw Error('SQLite inexistente: '+dbPath);
const sounds=[
 ['latido','au au'],['miado','miau'],['mugido','muuu'],['relincho','hiii'],
 ['balido','meee'],['grunhido','oinc'],['rugido','grrr'],['uivo','auuuu'],
 ['grasnido','qua qua'],['cacarejo','co co'],['coaxar','croac'],['pio','piu'],
 ['zumbido','zzzz'],['zurrar','io io'],['ronronar','prrr'],['cocorico','cocorico'],
 ['assobio','fiu fiu'],['guincho','iii']
];
const canon=s=>String(s).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').trim().replace(/\s+/g,'_');
const facts=sounds.flatMap(([sound,imitation])=>[
 [sound,'e_um','vocalizacao'],[sound,'onomatopeia',imitation]
]);
const db=new DatabaseSync(dbPath,{readOnly:dry});
try {
 const present=db.prepare('SELECT 1 FROM knowledge_relations WHERE subject=? AND predicate=? AND object=? LIMIT 1');
 const unique=new Map(facts.map(parts=>{const row=parts.map(canon);return [JSON.stringify(row),row]}));
 const pending=[...unique.values()].filter(row=>!present.get(...row));
 console.log(`Lote 016: ${unique.size} relações; ${pending.length} novas; ${unique.size-pending.length} já existentes.`);
 if(dry) {console.log('SIMULAÇÃO: nenhuma alteração no SQLite.');}
 else {
   const insert=db.prepare('INSERT INTO knowledge_relations(id,subject,predicate,object,confidence,source_type,evidence_count) VALUES(?,?,?,?,NULL,?,1)');
   db.exec('BEGIN IMMEDIATE');
   try {for(const row of pending) insert.run(randomUUID(),...row,'imported');db.exec('COMMIT');}
   catch(e) {db.exec('ROLLBACK');throw e;}
   console.log(`IMPORTAÇÃO: ${pending.length} relações novas. Pesos anteriores preservados.`);
 }
} finally {db.close();}
