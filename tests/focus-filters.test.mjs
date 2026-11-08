import assert from 'node:assert/strict';
import {openDatabase,closeDatabases} from './helpers/database.mjs';
import {sendChatMessage} from '../server/conversation/chat.js';
const db=openDatabase(':memory:',{seed:false});
const add=(s,p,o)=>db.prepare('INSERT INTO knowledge_relations(id,subject,predicate,object) VALUES (?,?,?,?)').run([s,p,o].join(':'),s,p,o);
try {
 for(const [state,region,capital] of [['pernambuco','nordeste','recife'],['paraiba','nordeste','joao_pessoa'],['sao_paulo','sudeste','sao_paulo']]){add(state,'localizado_em',region);add(state,'tem_capital',capital);}
 for(const [city,state,value] of [['recife','pernambuco',100],['petrolina','pernambuco',1000],['joao_pessoa','paraiba',200],['sao_paulo','sao_paulo',900]]){add(city,'pertence_a',state);add(city,'area_km2',String(value));}
 let r=sendChatMessage(db,{text:'Quais as cinco maiores cidades do Brasil por extensão?'});const id=r.conversationId;
 r=sendChatMessage(db,{conversationId:id,text:'somente as capitais'});assert.equal(r.result.interpretation.contextAfter.scope,'capitals');assert.match(r.reply,/somente capitais/);assert.ok(r.result.interpretation.ranking.every(row=>row.name!=='petrolina'));assert.equal(r.result.interpretation.ranking[0].name,'sao paulo');
 r=sendChatMessage(db,{conversationId:id,text:'do Nordeste'});assert.equal(r.result.interpretation.contextAfter.region,'nordeste');assert.match(r.reply,/região Nordeste/);assert.deepEqual(r.result.interpretation.ranking.map(row=>row.name),['joao pessoa','recife']);assert.equal(r.result.interpretation.contextAfter.scope,'capitals');
 console.log('OK: filtros efetivos por capitais e região, sem incluir cidades fora do recorte.');
}finally{closeDatabases();}
