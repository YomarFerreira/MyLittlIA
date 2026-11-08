import assert from 'node:assert/strict';import {openDatabase} from '../server/persistence/database.js';import {sendChatMessage} from '../server/conversation/chat.js';import {interpretChoice} from '../server/conversation/dialogue-choices.js';
const db=openDatabase(':memory:',{seed:false});
try {
 const add=(s,p,o)=>db.prepare('INSERT INTO knowledge_relations(id,subject,predicate,object) VALUES (?,?,?,?)').run([s,p,o].join(':'),s,p,o);
 add('pernambuco','e_um','estado_brasileiro');
 for(const [name,pib,pop,area] of [['recife',100,1500,200],['caruaru',30,300,900]]){add(name,'localizado_em','pernambuco');add(name,'pib',String(pib));add(name,'populacao_habitantes',String(pop));add(name,'area_km2',String(area));}
 for(const choice of ['OK, por PIB, vai','ok, vamos de PIB','sei lá, pode ser por qualquer um dos 3','a segunda opção','sem preferência, você escolhe']) {
  let r=sendChatMessage(db,{text:'Qual a maior cidade do Brasil?'});console.log('pergunta =>',r.reply);
  r=sendChatMessage(db,{conversationId:r.conversationId,text:choice});console.log(choice,'=>',r.reply);
  assert.ok(r.result.interpretation.contextualFollowup,choice);
  assert.doesNotMatch(r.reply,/Ainda não sei responder/);
  if(/PIB/.test(choice))assert.equal(r.result.interpretation.contextualFollowup.metric,'pib');
  if(/qualquer|escolhe/.test(choice)){assert.equal(r.result.interpretation.contextualFollowup.delegated,true);assert.match(r.reply,/vou comparar por/);}
 }
 const options=[{id:'x',aliases:['rápido']},{id:'y',aliases:['econômico']}];
 assert.equal(interpretChoice('vamos de econômico, vai',options)?.option.id,'y');
 assert.equal(interpretChoice('qualquer um serve',options)?.delegated,true);
 assert.equal(interpretChoice('a segunda',options)?.option.id,'y');
 assert.equal(interpretChoice('rápido ou econômico',options),null);
 assert.equal(interpretChoice('não, rápido não',options),null);
 assert.equal(interpretChoice('não quero rápido, prefiro econômico',options)?.option.id,'y');
 assert.equal(interpretChoice('qualquer um menos rápido',options)?.option.id,'y');
 assert.equal(interpretChoice('não escolha qualquer um',options),null);
 console.log('OK: opções genéricas, PIB, delegação transparente e posição ordinal.');
}finally{db.close();}
