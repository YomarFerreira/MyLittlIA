import assert from 'node:assert/strict';
import {createChatTurnElement,groupChatTurns,orderedChatTurns} from '../js/chat-view.js';

class Element {
  constructor(tagName) {this.tagName=tagName;this.children=[];this.attributes={};this.className='';this.textContent='';}
  setAttribute(name,value) {this.attributes[name]=value;}
  append(...children) {this.children.push(...children);}
}
const doc={createElement:(tag)=>new Element(tag)};
const messages=[
  {role:'user',content:'Qual a capital de Pernambuco?',created_at:'2026-11-07T13:00:00.101Z'},
  {role:'assistant',content:'A capital é Recife.',created_at:'2026-11-07T13:00:00.102Z'},
  {role:'user',content:'E quais são os clubes? <script>alert(1)</script>',created_at:'2026-11-07T13:01:00.001Z'},
  {role:'assistant',content:'Conheço vários clubes.',created_at:'2026-11-07T13:01:00.002Z'}
];
const ascending=orderedChatTurns(messages,'oldest');
const descending=orderedChatTurns(messages,'newest');
assert.equal(groupChatTurns(messages).length,2);
assert.deepEqual(ascending.map(t=>t[0].content),[messages[0].content,messages[2].content]);
assert.deepEqual(descending.map(t=>t[0].content),[messages[2].content,messages[0].content]);
for(const turns of [ascending,descending]) {
  for(const turn of turns) {
    assert.deepEqual(turn.map(m=>m.role),['user','assistant']);
    const card=createChatTurnElement(turn,doc);
    assert.equal(card.tagName,'article');
    assert.equal(card.className,'chat-turn');
    assert.equal(card.children[0].className,'chat-question');
    assert.equal(card.children[1].className,'chat-answer');
    assert.equal(card.children[0].children[0].textContent,turn[0].content);
    assert.equal(card.children[1].children[1].textContent,turn[1].content);
    assert.match(card.children[0].children[1].children[1].textContent,/\d{2}:\d{2}:\d{2}\.\d{3}/);
    assert.match(card.children[1].children[2].children[0].textContent,/\d{2}:\d{2}:\d{2}\.\d{3}/);
  }
}
const incomplete=createChatTurnElement([{role:'user',content:'Pergunta pendente'}],doc);
assert.equal(incomplete.children.length,1);
assert.equal(incomplete.children[0].className,'chat-question');
const assistantOnly=createChatTurnElement([{role:'assistant',content:'Resposta recuperada'}],doc);
assert.equal(assistantOnly.children[0].className,'chat-answer');
console.log('PASS: cartões de interação, pergunta antes da resposta, ordenação, data/hora e texto seguro');
