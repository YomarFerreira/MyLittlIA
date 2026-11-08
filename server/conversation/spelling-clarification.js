import {spellingContext} from './spelling-context.js';
import {randomUUID} from 'node:crypto';
import {readableName} from '../language/proper-names.js';
import {normalize} from '../persistence/database.js';

function distance(a,b) {
 const rows=Array.from({length:a.length+1},(_,i)=>[i]);
 for(let j=0;j<=b.length;j++)rows[0][j]=j;
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++) {
  rows[i][j]=Math.min(rows[i-1][j]+1,rows[i][j-1]+1,rows[i-1][j-1]+Number(a[i-1]!==b[j-1]));
  if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])rows[i][j]=Math.min(rows[i][j],rows[i-2][j-2]+1);
 }
 return rows[a.length][b.length];
}
const grammar='dele dela deles delas nele nela neles nelas comigo contigo consigo conosco neste nesta nestes nestas nesse nessa nesses nessas deste desta destes destas desse dessa desses dessas naquele naquela naqueles naquelas podemos esta essa este isto verificar informacao zero dois duas tres quatro cinco seis sete oito nove dez primeiro primeira segundo segunda terceiro terceira mudando mudar agora outro assunto versao numero quantidade tamanho valor bebe beber come comer vive viver sabe sabem sabemos quero quer querem conhece conhecem conheco existe existem possui possuem faz fazem tem temos pode podem consegue conseguem responda explique pergunte diga gostaria preciso precisa o a os as um uma uns umas que qual quais quem como onde quando quanto quantas quantos e eh de do da dos das em no na nos nas por para com sem se eu voce vc ele ela isso isto sim nao exatamente claro certo correto quero saber diga fale mostre liste sobre tem sao ser faz foi pode maior menor mais menos cor cores capital bandeira estado cidade municipio animal'.split(' ');
function vocabulary(db) {
 const words=new Map(grammar.map(w=>[w,w]));
 const add=text=>{for(const token of String(text).replaceAll('_',' ').match(/[\p{L}]+/gu)??[]) {
  const key=normalize(token);if(key&&!words.has(key))words.set(key,token);
 }};
 for(const row of db.prepare('SELECT subject,object FROM knowledge_relations').all()){add(row.subject);add(row.object);add(row.predicate);}
 for(const row of db.prepare('SELECT phrase,canonical FROM semantic_terms WHERE active=1').all()){add(row.phrase);add(row.canonical);}
 for(const row of db.prepare('SELECT display_name FROM entity_labels').all())add(row.display_name);
 for(const row of db.prepare('SELECT text FROM training_examples UNION SELECT text FROM intent_training_samples UNION SELECT question AS text FROM knowledge').all())add(row.text);
 for(const row of db.prepare('SELECT alias AS text FROM ranking_metric_aliases UNION SELECT alias AS text FROM entity_fact_aliases UNION SELECT entity AS text FROM entity_facts UNION SELECT property AS text FROM entity_facts UNION SELECT value AS text FROM entity_facts UNION SELECT competition AS text FROM entity_facts').all())if(row.text)add(row.text);
 return words;
}
export function suggestSpelling(db,text,options={}) {
 const suggestion=spellingSuggestion(db,text,options);
 return suggestion?.corrected??null;
}
export function spellingSuggestion(db,text,{conversationId=null}={}) {
 // Statements and teachings are never silently repaired or turned into facts.
 if(!/^(?:qual|quais|quem|como|onde|quando|quanto|o que)\b/.test(normalize(text))&&!(text.endsWith('?')&&/^e\b/.test(normalize(text))))return null;
 const words=vocabulary(db),context=spellingContext(db,text,conversationId),corrections=[];let changes=0;
 const corrected=text.replace(/[\p{L}]+/gu,(token,offset)=>{
  const key=normalize(token);
  if(words.has(key)||words.has(key+'r')||key.endsWith('a')&&words.has(key.slice(0,-1)+'o')||/^[A-Z]{2,3}$/.test(token)||key.endsWith('s')&&words.has(key.slice(0,-1))||key.endsWith('es')&&words.has(key.slice(0,-2))||key.endsWith('ais')&&words.has(key.slice(0,-3)+'al')||key.endsWith('eis')&&words.has(key.slice(0,-3)+'el'))return token;
  // Article after “o que é”: short grammatical errors have little lexical evidence.
  if(/o que [eé]\s*$/i.test(text.slice(0,offset))) {
   const articles=['um','uma'].filter(word=>distance(key,word)===1);
   if(articles.length===1){changes++;corrections.push({original:token,corrected:articles[0],evidence:['grammatical-position']});return articles[0];}
  }
  if(key.length<3)return token;
  const limit=key.length>=6?2:1;
  const options=[...words].filter(([w])=>Math.abs(w.length-key.length)<=limit&&(key.length>3||grammar.includes(w)))
   .map(([w,label])=>({word:w,label,d:distance(key,w)})).filter(x=>x.d<=limit).sort((a,b)=>a.d-b.d);
  if(!options.length)return token;
  // Context only breaks ties at the best lexical distance; it cannot force a remote match.
  const nearest=options.filter(option=>option.d===options[0].d)
   .map(option=>({...option,...context.score(option.word)})).sort((a,b)=>b.score-a.score);
  if(nearest.length>1&&(nearest[0].score===nearest[1].score||nearest[0].score<2))return token;
  const chosen=nearest[0],label=/^[A-ZÁ-Ú]/.test(token)?readableName(chosen.label,db):chosen.label;
  changes++;corrections.push({original:token,corrected:label,distance:chosen.d,evidence:chosen.evidence,contextScore:chosen.score});return label;
 });
 return changes&&changes<=4?{corrected,corrections,context:{origin:context.origin,entities:context.entities}}:null;
}
function agreement(text) {
 const q=normalize(text);
 if(/\b(?:nao|negativo|discordo|talvez)\b/.test(q)||/^(?:errado|engano)\b/.test(q)||/\b(?:esta|ta|isso e) errado\b/.test(q))return false;
 return /^(?:sim|isso|isto|exatamente|claro|ah claro|ha claro|correto|certo|isso mesmo|pode ser|afirmativo|e isso|era isso)\b/.test(q);
}
function persistPrompt(db,id,text,answer,result,corrected=null,suggestion=null) {
 id??=randomUUID();
 db.exec('BEGIN');
 try {
  db.prepare('INSERT OR IGNORE INTO conversations(id) VALUES (?)').run(id);
  const insert=db.prepare('INSERT INTO conversation_messages(id,conversation_id,role,content,created_at) VALUES (?,?,?,?,?)');
  const time=Date.now();insert.run(randomUUID(),id,'user',text,new Date(time).toISOString());
  insert.run(randomUUID(),id,'assistant',answer,new Date(time+1).toISOString());
  db.prepare('DELETE FROM conversation_clarifications WHERE conversation_id=?').run(id);
  if(corrected)db.prepare('INSERT INTO conversation_clarifications VALUES (?,?,?)').run(id,text,corrected);
  db.exec('COMMIT');
 } catch(error){db.exec('ROLLBACK');throw error;}
 return {conversationId:id,reply:answer,result:{kind:result,answer,path:[],interpretation:{intent:result,parser:'contextual-lexical-edit-distance',neuralUsedForAnswer:false,corrections:suggestion?.corrections??[],spellingContext:suggestion?.context??null},explanation:corrected?'Sugestão por semelhança ortográfica, entidades em foco e propriedades cadastradas; aguarda confirmação e não grava fatos.':'A sugestão foi recusada; nenhum fato foi alterado.'},proposals:[],proposal:null,
  messages:db.prepare('SELECT id,role,content,created_at FROM conversation_messages WHERE conversation_id=? ORDER BY rowid DESC LIMIT 2').all(id).reverse()};
}
export function withSpellingClarification(db,payload,execute) {
 const text=String(payload?.text??'').trim(),id=payload?.conversationId??null;
 if(!text||text.length>2000)throw Object.assign(new Error('Digite uma mensagem de até 2.000 caracteres.'),{status:400});
 if(id&&!db.prepare('SELECT id FROM conversations WHERE id=?').get(id))throw Object.assign(new Error('Conversa não encontrada.'),{status:404});
 const pending=id?db.prepare('SELECT * FROM conversation_clarifications WHERE conversation_id=?').get(id):null;
 if(pending) {
  if(agreement(text)&&!/[?]/.test(text)&&! /\b(?:qual|quais|quem|onde|quanto)\b/.test(normalize(text))&&! /\b(?:mas|porem|agora|prefiro)\b/.test(normalize(text))) {
   const reply=execute(db,{text:pending.corrected_text,conversationId:id,originalText:text,consumeClarification:true});
   reply.result={...reply.result,clarification:{original:pending.original_text,corrected:pending.corrected_text,confirmed:true}};
   return reply;
  }
  if(/^(?:nao|negativo)\b/.test(normalize(text))&&!text.includes('?'))return persistPrompt(db,id,text,'Tudo bem. Pode reformular a pergunta?', 'spelling-rejected');
  db.prepare('DELETE FROM conversation_clarifications WHERE conversation_id=?').run(id);
 }
 const suggestion=spellingSuggestion(db,text,{conversationId:id});
 if(suggestion)return persistPrompt(db,id,text,`Você quis dizer: “${suggestion.corrected.replace(/[?!]+$/,'')}”?`,'spelling-clarification',suggestion.corrected,suggestion);
 return execute(db,{text,conversationId:id});
}
