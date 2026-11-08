import assert from 'node:assert/strict';
import { executeSimulated } from '../js/engines/simulated-engine.js';
import { train,predict } from '../js/engines/neural-engine.js';
const t=train();assert.ok(t.history.at(-1).loss<t.history[0].loss);
for(const [q,expected] of [['Qual é a capital de Alagoas?','Maceió'],['O que o gato bebe?','água'],['Qual é a capital do Brasil?','Brasília']]){
 const result=executeSimulated(q);assert.ok(result.steps.at(-1).output.answer.includes(expected),q);
 assert.equal(result.steps.length,9);assert.ok(result.steps.some(s=>s.mode==='neural-real'));
}
assert.equal(predict('qual a capital de alagoas').label,'capital');
console.log('OK: treinamento, inferência e fluxo de 9 etapas');
const {addKnowledge,updateKnowledge,deleteKnowledge,findKnowledge,exportKnowledge,importKnowledge}=await import('../js/engines/knowledge-store.js');
const added=addKnowledge('Qual é a capital do Tocantins?','Palmas.','capital');
assert.equal(executeSimulated('Qual é a capital do Tocantins?').steps.at(-1).output.answer,'Palmas.');
assert.equal(executeSimulated('Qual é a capital do Tocantins?').steps.at(-1).output.knowledgeSource,'explicit-user-record');
assert.equal(executeSimulated('Qual é a capital do Tocantins?').steps[6].mode,'neural-real');
updateKnowledge(added.item.id,'Qual é a capital do Tocantins?','A capital é Palmas.','capital');
assert.equal(findKnowledge('qual e a capital do tocantins').answer,'A capital é Palmas.');
const exported=exportKnowledge();assert.ok(exported.includes('Tocantins'));assert.ok(importKnowledge(exported).count>=1);
const found=findKnowledge('Qual é a capital do Tocantins?');assert.ok(deleteKnowledge(found.id));
console.log('OK: conhecimento explícito CRUD, import/export, resposta separada dos pesos');
