import {openDatabase,closeDatabases,LATEST_SCHEMA_VERSION} from './helpers/database.mjs';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {sendChatMessage,conversationHistory} from '../server/conversation/chat.js';
const dir=mkdtempSync(join(tmpdir(),'mylittlia-chat-'));
try {
 const db=openDatabase(join(dir,'test.db'));
 const first=sendChatMessage(db,{text:'O estado de Pernambuco é violento?'});
 const follow=sendChatMessage(db,{conversationId:first.conversationId,text:'E como podemos verificar essa informação?'});
 assert.match(follow.reply,/pernambuco/i);
 assert.match(follow.reply,/fontes confiáveis/i);
 assert.equal(conversationHistory(db,first.conversationId).length,4);
 const invitation=sendChatMessage(db,{text:'A capital de Pernambuco é violenta?'});
 assert.match(invitation.reply,/pode me ensinar/i);
 const acceptance=sendChatMessage(db,{conversationId:invitation.conversationId,text:'Sim, posso.'});
 assert.match(acceptance.reply,/o que voc[eê] gostaria de me ensinar/i);
 assert.equal(acceptance.result.kind,'conversation-teaching-invitation');
 // Reproduz o relato do usuário: 'Sim, claro.' também precisa confirmar o convite.
 const invitationClaro = sendChatMessage(db,{text:'A capital de Pernambuco é violenta?'});
 const acceptanceClaro = sendChatMessage(db,{conversationId:invitationClaro.conversationId,text:'Sim, claro.'});
 assert.equal(acceptanceClaro.result.kind,'conversation-teaching-invitation');
 assert.match(acceptanceClaro.reply,/o que voc[eê] gostaria de me ensinar/i);

 // Mesma intenção expressa de formas diferentes: testar no contexto do convite.
 const affirmativeVariants = ["Posso", "Sim, claro", "Sim, posso", "Claro que sim", "Com certeza", "Claro", "Sim, o que vc precisa?", "Sim, o que você quer saber", "Sim, qual informação vc precisa?", "Posso, o que você quer saber", "Posso, qual informação vc precisa?", "Claro, qual informação vc precisa?", "Claro, o que você quer saber", "Com certeza, o que você quer saber?", "Com certeza, qual informação vc precisa?"];
 for (const phrase of affirmativeVariants) {
     const invitationVariant = sendChatMessage(db,{text:'A capital de Pernambuco é violenta?'});
     const accepted = sendChatMessage(db,{conversationId:invitationVariant.conversationId,text:phrase});
     assert.equal(accepted.result.kind,'conversation-teaching-invitation',phrase);
 }
 const refusalVariant = sendChatMessage(db,{text:'A capital de Pernambuco é violenta?'});
 assert.equal(sendChatMessage(db,{conversationId:refusalVariant.conversationId,text:'Não, obrigada.'}).result.kind,'conversation-teaching-declined');
 const acceptanceStandalone = sendChatMessage(db,{text:'Sim, claro.'});
 assert.notEqual(acceptanceStandalone.result.kind,'conversation-teaching-invitation');

 assert.equal(db.prepare('SELECT count(*) n FROM knowledge_proposals').get().n,0);
 const proposalAfterAcceptance=sendChatMessage(db,{conversationId:invitation.conversationId,text:'O cavalo é um mamífero.'});
 assert.equal(proposalAfterAcceptance.result.kind,'conversation-teaching-pending');
 assert.match(proposalAfterAcceptance.reply,/Registrei o que você me ensinou/i);
 assert.equal(db.prepare('SELECT count(*) n FROM knowledge_relations WHERE subject=?').get('cavalo').n,0);
 const pending = db.prepare("SELECT id FROM conversational_teachings WHERE status='pending' AND answer='O cavalo é um mamífero.'").get();
 assert.ok(pending);
 const refused=sendChatMessage(db,{text:'O helicóptero consegue nadar?'});
 const decline=sendChatMessage(db,{conversationId:refused.conversationId,text:'Não.'});
 assert.match(decline.reply,/tudo bem/i);
 const taught=sendChatMessage(db,{conversationId:first.conversationId,text:'A vaca é um mamífero.'});
 assert.equal(taught.result.kind,'conversation-rating-request');
 assert.equal(db.prepare("SELECT COUNT(*) n FROM knowledge_relations WHERE subject='vaca' AND object='mamifero'").get().n,0);
 const invalid=sendChatMessage(db,{conversationId:first.conversationId,text:'120'});
 assert.match(invalid.reply,/0 e 100/);
 const rated=sendChatMessage(db,{conversationId:first.conversationId,text:'50'});
 assert.equal(rated.result.kind,'conversation-knowledge-acquired');
 assert.equal(db.prepare("SELECT confidence FROM knowledge_relations WHERE subject='vaca' AND object='mamifero'").get().confidence,0.5);
 const repeat=sendChatMessage(db,{conversationId:first.conversationId,text:'A vaca é um mamífero.'});
 assert.ok(repeat.reply.length > 0);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM knowledge_relations WHERE subject='vaca' AND object='mamifero'").get().n,1);
 const unverified=sendChatMessage(db,{text:'A Cidade do Recife é violenta.'});
 assert.match(unverified.reply,/quanto você considera/i);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM knowledge_relations WHERE subject='cidade_do_recife'").get().n,0);
 const violenceScore=sendChatMessage(db,{conversationId:unverified.conversationId,text:'50'});
 assert.equal(violenceScore.result.kind,'conversation-knowledge-acquired');
 assert.equal(db.prepare("SELECT confidence FROM knowledge_relations WHERE subject='cidade_do_recife' AND object='violenta'").get().confidence,0.5);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM knowledge_proposals WHERE status='pending'").get().n,0);
 const second=sendChatMessage(db,{text:'Qual é a capital de Sergipe?'});
 assert.match(second.reply,/aracaju/i);
 assert.notEqual(second.conversationId,first.conversationId);
 db.close();
 console.log('PASS: contexto, histórico e aprovação pendente');
}finally{closeDatabases();rmSync(dir,{recursive:true,force:true});}
