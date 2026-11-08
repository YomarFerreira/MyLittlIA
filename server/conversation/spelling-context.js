import {getConversationFocus} from './focus-manager.js';
import {resolveEntityText} from '../knowledge/entity-identity.js';
import {normalize} from '../persistence/database.js';

const norm=value=>normalize(String(value??'').replaceAll('_',' '));
const tokens=value=>norm(value).split(' ').filter(Boolean);
const key=value=>norm(value).replaceAll(' ','_');
const contains=(text,phrase)=>(' '+text+' ').includes(' '+phrase+' ');

// Context is evidence for ranking lexical candidates, never evidence for new facts.
export function spellingContext(db,text,conversationId=null) {
 const rows=db.prepare('SELECT subject,predicate,object FROM knowledge_relations').all();
 const entities=new Map(),parents=new Map(),properties=new Map();
 const add=(id,label=id)=>{
  if(!entities.has(id))entities.set(id,new Set());
  entities.get(id).add(norm(label));
 };
 for(const row of rows) {
  add(row.subject);
  if(row.predicate==='e_um') {
   add(row.object);
   if(!parents.has(row.subject))parents.set(row.subject,new Set());
   parents.get(row.subject).add(row.object);
  }
  if(!properties.has(row.subject))properties.set(row.subject,new Set());
  for(const word of tokens(row.predicate))properties.get(row.subject).add(word);
 }
 for(const row of db.prepare('SELECT entity,display_name FROM entity_labels').all())add(row.entity,row.display_name);
 for(const row of db.prepare('SELECT alias,canonical_id FROM entity_aliases').all())add(row.canonical_id,row.alias);
 for(const row of db.prepare("SELECT phrase,canonical FROM semantic_concept_aliases WHERE active=1 AND domain='entity_class' UNION SELECT phrase,canonical FROM semantic_terms WHERE active=1 AND kind IN ('entity_alias','lexical')").all()) {
  if(entities.has(key(row.canonical)))add(key(row.canonical),row.phrase);
 }
 for(const row of db.prepare('SELECT entity,property FROM entity_facts').all()) {
  add(row.entity);
  if(!properties.has(row.entity))properties.set(row.entity,new Set());
  for(const word of tokens(row.property))properties.get(row.entity).add(word);
 }
 // Catalog aliases connect natural property wording with stored predicate names.
 const propertyAliases=new Map();
 for(const row of db.prepare('SELECT property,alias FROM entity_fact_aliases').all()) {
  for(const word of tokens(row.alias)) {
   if(!propertyAliases.has(word))propertyAliases.set(word,new Set());
   for(const part of tokens(row.property))propertyAliases.get(word).add(part);
  }
 }
 const ancestors=id=>{
  const seen=new Set([id]),pending=[id];
  while(pending.length&&seen.size<100)for(const parent of parents.get(pending.shift())??[])if(!seen.has(parent)){seen.add(parent);pending.push(parent);}
  return seen;
 };
 const families=new Map([...entities.keys()].map(id=>[id,ancestors(id)]));
 const mentions=input=>{
  const q=norm(resolveEntityText(db,input)),found=new Set();
  for(const [id,names] of entities)for(const name of names) {
   if(name.length<=3&&name!==norm(id))continue;
   // Whole phrases and regular plurals; no substring matching inside other words.
   if(contains(q,name)||contains(q,name+'s')||name.endsWith('al')&&contains(q,name.slice(0,-2)+'ais')){found.add(id);break;}
  }
  return found;
 };
 const current=mentions(text);
 const history=conversationId?db.prepare('SELECT role,content FROM conversation_messages WHERE conversation_id=? ORDER BY rowid DESC LIMIT 2').all(conversationId).reverse():[];
 const lastUser=history.find(row=>row.role==='user')?.content??'';
 let recent=mentions(lastUser);
 // After a short confirmation, the just-produced answer identifies the focus.
 if(!recent.size&&/^(?:sim|isso|isto|exatamente|claro|ha claro|ah claro)\b/.test(norm(lastUser))) {
  const answer=history.find(row=>row.role==='assistant')?.content??'';
  if(!/^voce quis dizer/.test(norm(answer)))recent=mentions(answer);
 }
 const reset=/\b(?:outro assunto|mudar de assunto|mudando de assunto|agora sobre)\b/.test(norm(text));
 // An explicit entity/class in the current question overrides the older topic.
 const focus=getConversationFocus(db,conversationId);
 const focused=new Set([focus?.entity,focus?.entityClass].filter(id=>id&&entities.has(id)));
 const active=current.size?current:reset?new Set():focused.size?focused:recent;
 const origin=current.size?'current-question':reset?'none':focused.size?'shared-focus':recent.size?'recent-conversation':'none';
 const queryWords=new Set(tokens(text));
 for(const word of [...queryWords])for(const alias of propertyAliases.get(word)??[])queryWords.add(alias);
 const wordEntities=new Map();
 for(const [id,names] of entities)for(const name of names)for(const word of tokens(name)) {
  if(!wordEntities.has(word))wordEntities.set(word,new Set());
  wordEntities.get(word).add(id);
 }
 return {
  origin,entities:[...active],
  score(word) {
   let best=0,evidence=[];
   for(const id of wordEntities.get(word)??[]) {
    let score=0,reasons=[];
    for(const anchor of active) {
     if(id===anchor){score=Math.max(score,4);reasons.push('entity-in-focus');}
     else if(families.get(id)?.has(anchor)||families.get(anchor)?.has(id)){score=Math.max(score,3);reasons.push('classification-in-focus');}
     else if([...families.get(id)??[]].some(parent=>families.get(anchor)?.has(parent))) {score=Math.max(score,2);reasons.push('shared-classification');}
    }
    const matched=[...properties.get(id)??[]].filter(part=>part.length>2&&queryWords.has(part));
    if(matched.length){score+=2;reasons.push('requested-property');}
    if(score>best){best=score;evidence=[...new Set(reasons)];}
   }
   return {score:best,evidence};
  }
 };
}
