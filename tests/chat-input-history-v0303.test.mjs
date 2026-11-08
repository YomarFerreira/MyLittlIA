import assert from 'node:assert/strict';
import { createChatInputHistory } from '../js/chat-input-history.js';
const history=createChatInputHistory();
const messages=[
  {role:'user',content:'primeira'},
  {role:'assistant',content:'resposta'},
  {role:'user',content:'segunda'},
  {role:'assistant',content:'outra resposta'},
  {role:'user',content:'terceira'}
];
assert.equal(history.navigate('down',messages,'rascunho'),null);
assert.equal(history.navigate('up',messages,'rascunho'),'terceira');
assert.equal(history.navigate('up',messages,'terceira'),'segunda');
assert.equal(history.navigate('up',messages,'segunda'),'primeira');
assert.equal(history.navigate('up',messages,'primeira'),'primeira');
assert.equal(history.navigate('down',messages,'primeira'),'segunda');
assert.equal(history.navigate('down',messages,'segunda'),'terceira');
assert.equal(history.navigate('down',messages,'terceira'),'rascunho');
assert.equal(history.navigate('down',messages,'rascunho'),null);
history.reset();
assert.equal(history.navigate('up',[],''),null);
assert.equal(history.navigate('up',messages,'novo rascunho'),'terceira');
assert.equal(history.navigate('down',messages,'terceira'),'novo rascunho');
console.log('Histórico de entrada v0.30.3: OK');
