import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../server/persistence/database.js';
import {evaluateTeaching} from '../server/learning/teaching-validation.js';
import {auditPendingTeachings,findPendingTeaching,saveConversationalTeaching,reviewConversationalTeaching} from '../server/learning/teachings.js';
import {sendChatMessage} from '../server/conversation/chat.js';
const dir=mkdtempSync(join(tmpdir(),'myl-0283-audit-'));
try {
  const db=openDatabase(join(dir,'test.db'));
  assert.equal(evaluateTeaching('O Amapá fica no Norte do Brasil?','Olá').status,'blocked');
  assert.equal(evaluateTeaching('E amanhã a esta hora?','Olá!').status,'blocked');
  assert.equal(evaluateTeaching('O Amapá fica no Norte do Brasil?','Tudo bem?').status,'blocked');
  assert.equal(evaluateTeaching('E as maiores cidades de PE por extensão?', '1. Petrolina: 4.561,87 km²\n2. Floresta: 3.644,169 km²').status,'ok');
  assert.equal(evaluateTeaching('Quem inventou a palavra girafotron?','Foi inventada por uma personagem de um conto.').status,'ok');
  assert.throws(()=>saveConversationalTeaching(db,null,'O Amapá fica no Norte do Brasil?','Olá'),/não foi registrada/);
  // Pendências antigas: inseridas como versões legadas, não removidas pela auditoria.
  const oldId='bca789c3-fd08-473f-8559-00550baa7770';
  const reviewId='bca789c3-fd08-473f-8559-00550baa7771';
  db.prepare(`INSERT INTO conversational_teachings(id,question,normalized_question,answer) VALUES (?,?,?,?)`).run(oldId,'O Amapá fica no Norte do Brasil?','o amapa fica no norte do brasil','Olá');
  db.prepare(`INSERT INTO conversational_teachings(id,question,normalized_question,answer) VALUES (?,?,?,?)`).run(reviewId,'O que o gato bebe?','o que o gato bebe','Um texto longo mas que não menciona nenhum animal ou bebida específica para poder conferir depois');
  const before=db.prepare("SELECT count(*) n FROM conversational_teachings WHERE status='pending'").get().n;
  const audit=auditPendingTeachings(db);
  assert.equal(audit.total,before);
  assert.equal(audit.blocked,1);
  assert.equal(findPendingTeaching(db,'O Amapá fica no Norte do Brasil?'),null);
  assert.equal(audit.review,1);
  assert.equal(db.prepare("SELECT count(*) n FROM conversational_teachings WHERE status='pending'").get().n,before);
  assert.throws(()=>reviewConversationalTeaching(db,oldId,'approve'),/não parece ser um ensinamento/);
  assert.throws(()=>reviewConversationalTeaching(db,reviewId,'approve'),/conferência explícita/);
  assert.equal(reviewConversationalTeaching(db,reviewId,'approve',{confirmedReview:true}).decision,'approve');
  assert.equal(reviewConversationalTeaching(db,oldId,'reject').decision,'reject');
  assert.equal(db.prepare("SELECT count(*) n FROM conversational_teachings WHERE status='pending'").get().n,0);
  assert.equal(db.prepare('SELECT count(*) n FROM knowledge WHERE normalized_question=?').get('o amapa fica no norte do brasil').n,0);
  // Saudação após convite não gera nova pendência.
  const invite=sendChatMessage(db,{text:'Quem inventou a palavra girafotron?'});
  const hello=sendChatMessage(db,{conversationId:invite.conversationId,text:'Olá'});
  assert.notEqual(hello.result.kind,'conversation-teaching-pending');
  db.close();
  console.log('OK v0.28.3: dupla validação, auditoria antiga, rejeição, confirmação manual e salvaguarda do SQLite');
} finally {rmSync(dir,{recursive:true,force:true});}
