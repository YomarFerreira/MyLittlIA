/** Lote 011 - interpretação de contexto relacional e definições; 2 comandos, sem arquivos auxiliares. */
import {existsSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {normalize} from '../server/persistence/database.js';
const args=process.argv.slice(2);
const apply=args.includes('--apply'),dry=args.includes('--dry-run');
if(Number(apply)+Number(dry)!==1) throw Error('Utilize --dry-run ou --apply');
const idx=args.indexOf('--db');
if(idx>=0&&!args[idx+1]) throw Error('Caminho --db não informado');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dbPath=resolve(idx>=0?args[idx+1]:resolve(root,'data/mylittlia.db'));
if(!existsSync(dbPath)) throw Error('Banco SQLite não encontrado: '+dbPath);
// Conceitos genéricos, sem atribuir PIB, população ou área a municípios específicos.
const facts=[
 ["pergunta_relacional", "consulta", "relacao_entre_entidades"],
 ["consulta_de_definicao", "consulta", "classificacao_de_entidade"],
 ["contexto_conversacional", "pode_preservar", "assunto_anterior"],
 ["mudanca_de_assunto", "pode_substituir", "entidade_anterior"],
 ["pergunta_completa", "diferente_de", "complemento_eliptico"],
 ["pergunta_eliptica", "depende_de", "contexto_valido"],
 ["entidade", "pode_possuir", "propriedades"],
 ["predicado", "representa", "tipo_de_relacao"],
 ["objeto_da_relacao", "diferente_de", "sujeito_da_relacao"],
 ["conhecimento_explicito", "diferente_de", "inferencia"],
 ["ausencia_de_relacao", "nao_comprova", "negacao_da_relacao"],
 ["agua", "e_um", "liquido"],
 ["leite", "e_um", "alimento"],
 ["flamingo", "e_um", "ave"],
 ["gato", "e_um", "mamifero"],
 ["coloração_rosa", "e_um", "caracteristica_visual"],
 ["classificacao_biologica", "organiza", "seres_vivos"],
 ["redundancia_textual", "pode_prejudicar", "clareza_da_resposta"]
];
const db=new DatabaseSync(dbPath,{readOnly:dry});
try {
 const find=db.prepare('SELECT 1 FROM knowledge_relations WHERE subject=? AND predicate=? AND object=? LIMIT 1');
 const canon=x=>normalize(x).replaceAll(' ','_');
 // Valide tudo antes da simulação e da escrita; mesmo critério em ambos os modos.
 const pending=[];
 const seen=new Set();
 const insert=db.prepare(`INSERT INTO knowledge_relations
   (id,subject,predicate,object,confidence,source_type,evidence_count)
   VALUES (?,?,?,?,?,?,?)`);
 for(const [rawSubject,rawPredicate,rawObject] of facts){
  const subject=canon(rawSubject),predicate=String(rawPredicate).trim(),object=canon(rawObject);
  if(!subject||!predicate||!object||subject.length>100||predicate.length>100||object.length>100)
   throw Error(`Relação inválida: ${rawSubject} / ${rawPredicate} / ${rawObject}`);
  const signature=JSON.stringify([subject,predicate,object]);
  if(seen.has(signature)) continue;
  seen.add(signature);
  if(!find.get(subject,predicate,object)) pending.push({subject,predicate,object});
 }
 console.log(`Lote 011: ${facts.length} relações, ${pending.length} novas, ${facts.length-pending.length} já existentes.`);
 if(dry) console.log('SIMULAÇÃO: sem alterações.');
 else {db.exec('BEGIN IMMEDIATE');try{for(const {subject,predicate,object} of pending)insert.run(randomUUID(),subject,predicate,object,null,'imported',1);db.exec('COMMIT');console.log('Importação concluída, pesos preservados.')}catch(e){db.exec('ROLLBACK');throw e}}
}finally{db.close()}
