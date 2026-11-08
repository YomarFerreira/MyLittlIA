/** Lote 010 - interpretação de indicadores municipais; 2 comandos, sem arquivos auxiliares. */
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
 ['pib_municipal','e_um','indicador_economico'],
 ['pib_municipal','representa','valor_da_producao_de_bens_e_servicos_finais_do_municipio'],
 ['pib_municipal','possui','ano_de_referencia'],
 ['pib_total','diferente_de','pib_per_capita'],
 ['pib_per_capita','calculado_por','pib_total_dividido_pela_populacao'],
 ['populacao_municipal','e_um','indicador_demografico'],
 ['populacao_municipal','possui','ano_de_referencia'],
 ['estimativa_populacional','diferente_de','contagem_censitaria'],
 ['area_territorial','e_um','medida_geografica'],
 ['area_territorial','medida_em','quilometros_quadrados'],
 ['area_territorial','possui','ano_de_referencia'],
 ['ranking_municipal','ordenado_por','criterio_de_comparacao'],
 ['ranking_municipal','requer','valores_numericos_comparaveis'],
 ['ranking_parcial','diferente_de','ranking_completo'],
 ['consulta_pontual','consulta','indicador_de_uma_entidade'],
 ['consulta_de_ranking','compara','indicador_de_varias_entidades'],
 ['comparacao_temporal','requer','periodos_consistentes'],
 ['conhecimento_cadastrado','diferente_de','conhecimento_verificado']
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
 console.log(`Lote 010: ${facts.length} relações, ${pending.length} novas, ${facts.length-pending.length} já existentes.`);
 if(dry) console.log('SIMULAÇÃO: sem alterações.');
 else {db.exec('BEGIN IMMEDIATE');try{for(const {subject,predicate,object} of pending)insert.run(randomUUID(),subject,predicate,object,null,'imported',1);db.exec('COMMIT');console.log('Importação concluída, pesos preservados.')}catch(e){db.exec('ROLLBACK');throw e}}
}finally{db.close()}
