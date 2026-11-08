import assert from 'node:assert/strict';
import {openDatabase} from '../server/persistence/database.js';
import {importFootballResearch} from '../server/adapters/football/football-research-import.js';
import {sendChatMessage} from '../server/conversation/chat.js';
import {getConversationFocus} from '../server/conversation/focus-manager.js';
const db=openDatabase(':memory:',{seed:false});
try {
 importFootballResearch(db,{apply:true});
 const add=(s,p,o)=>db.prepare('INSERT INTO knowledge_relations(id,subject,predicate,object) VALUES (?,?,?,?)').run([s,p,o].join(':'),s,p,o);
 add('pernambuco','tem_capital','recife');add('paraiba','tem_capital','joao_pessoa');
 add('gato','e_um','mamifero');add('gato','bebe','agua');add('cachorro','e_um','mamifero');add('cachorro','bebe','leite');add('cachorro','possui_cor','preto');add('cachorro','numero_patas_tipico','4');
 const ask=(id,text)=>sendChatMessage(db,{conversationId:id,text});
 let r=ask(null,'Liste as três maiores torcidas de Pernambuco');let id=r.conversationId;
 let frame=getConversationFocus(db,id);assert.equal(frame.limit,3);assert.equal(frame.property,'torcida');
 r=ask(id,'e os menores?');frame=getConversationFocus(db,id);assert.equal(frame.order,'ascending');assert.equal(frame.limit,3);assert.equal(frame.location,'pernambuco');assert.equal(frame.property,'torcida');
 r=ask(id,'mostre cinco');frame=getConversationFocus(db,id);assert.equal(frame.limit,5);assert.equal(frame.order,'ascending');
 r=ask(id,'agora por receita');frame=getConversationFocus(db,id);assert.equal(frame.property,'receita');assert.equal(frame.limit,5);assert.equal(frame.location,'pernambuco');assert.equal(frame.order,'ascending');
 r=ask(id,'agora mostre dois menores por receita da Paraíba');frame=getConversationFocus(db,id);assert.equal(frame.limit,2);assert.equal(frame.location,'paraiba');assert.equal(frame.property,'receita');assert.equal(frame.order,'ascending');
 for(const dimension of ['quantity','order','property','location'])assert.ok(r.result.interpretation.focusChanges.includes(dimension));
 const answer=r.reply;
 r=ask(id,'por quê?');assert.equal(r.result.kind,'dialogue-focus-explanation');assert.ok(r.reply.includes(answer));assert.equal(getConversationFocus(db,id).property,'receita');
 r=ask(id,'E da Paraíba?');frame=getConversationFocus(db,id);assert.equal(frame.location,'paraiba');assert.equal(frame.limit,2);assert.equal(frame.property,'receita');
 r=ask(id,'Qual a capital de Pernambuco?');assert.match(r.reply,/Recife/);assert.equal(getConversationFocus(db,id).operation,'lookup');
 r=ask(id,'E da Paraíba?');assert.match(r.reply,/João Pessoa/i);assert.notEqual(r.result.kind,'comparative-ranking');
 r=ask(id,'O que o gato bebe?');assert.match(r.reply,/água/i);
 r=ask(id,'E o cachorro?');assert.match(r.reply,/leite/i);assert.equal(getConversationFocus(db,id).entity,'cachorro');
 r=ask(id,'E as cores?');assert.match(r.reply,/preto/i);assert.equal(getConversationFocus(db,id).entity,'cachorro');
 r=ask(id,'Quantas patas ele tem?');assert.match(r.reply,/4|quatro/i);assert.equal(getConversationFocus(db,id).entity,'cachorro');
 r=ask(id,'Isso é confiável?');assert.equal(r.result.kind,'dialogue-focus-explanation');
 // Identical slot changes apply to municipal rankings.
 for(let i=1;i<=6;i++){add('cidade_'+i,'localizado_em','pernambuco');add('cidade_'+i,'area_km2',String(i*100));add('cidade_'+i,'populacao_habitantes',String(i*1000));}
 r=ask(null,'Qual a maior cidade de Pernambuco por extensão?');id=r.conversationId;
 r=ask(id,'mostre cinco');assert.equal(r.result.interpretation.ranking.length,5);assert.equal(getConversationFocus(db,id).limit,5);
 r=ask(id,'e os menores?');assert.equal(r.result.interpretation.ranking[0].value,100);assert.equal(r.result.interpretation.ranking.length,5);
 r=ask(id,'agora por população');assert.equal(getConversationFocus(db,id).property,'population');assert.equal(r.result.interpretation.ranking.length,5);assert.equal(r.result.interpretation.ranking[0].value,1000);
 r=ask(id,'e a média?');assert.equal(r.result.interpretation.statistics.operation,'mean');assert.equal(getConversationFocus(db,id).operation,'statistics');
 r=ask(null,'Quais clubes de futebol você conhece em Pernambuco?');const listing=r.conversationId;
 assert.equal(getConversationFocus(db,listing).operation,'listing');
 r=ask(listing,'mostre dois');assert.equal(r.result.kind,'focused-list');assert.equal(r.result.interpretation.count,2);
 r=ask(listing,'E as cores?');assert.equal(r.result.kind,'focused-list');assert.equal(getConversationFocus(db,listing).property,'cores');assert.equal(r.result.interpretation.count,2);
 r=ask(null,'e os menores?');assert.equal(r.result.kind,'dialogue-focus-clarification');
 r=ask(null,'Qual é o significado de zzzinexistente?');id=r.conversationId;r=ask(id,'E de Pernambuco?');assert.equal(r.result.kind,'dialogue-focus-clarification');
 console.log('OK: foco compartilhado, quantidade, ordem, propriedade, localidade, entidade, explicação, estatística e ausência de foco.');
}finally{db.close();}
