/** Conteúdo linguístico configurável no SQLite. Algoritmos permanecem em JS. */
import { normalize } from '../persistence/database.js';
export const language='pt-BR';
export function getLexicon(db,kind='lexical') {
  if(!db)return [];
  return db.prepare('SELECT phrase,canonical FROM semantic_terms WHERE language=? AND kind=? AND active=1 ORDER BY LENGTH(phrase) DESC').all(language,kind);
}
export function displayEntity(db,id) {
  const normalized=normalize(String(id).replaceAll('_',' '));
  return db?.prepare('SELECT display_name,article FROM semantic_entities WHERE entity_id=? AND active=1').get(normalized)||null;
}
export function socialIntentsFromDb(db,text) {
  if(!db)return [];
  const q=normalize(text);
  const cues=db.prepare('SELECT phrase,intent,match_mode FROM semantic_social_cues WHERE language=? AND active=1').all(language);
  return [...new Set(cues.filter(({phrase,match_mode})=>
    match_mode==='exact' ? q===phrase : match_mode==='prefix' ? (q===phrase||q.startsWith(phrase+' ')) : (' '+q+' ').includes(' '+phrase+' ')
  ).map(r=>r.intent))];
}
export function socialResponseFromDb(db,intents=[]) {
  if(!db)return '';
  const responses=new Map(db.prepare('SELECT intent,response FROM semantic_social_responses WHERE language=? AND active=1').all(language).map(r=>[r.intent,r.response]));
  for(const intent of ['gratitude','farewell','wellbeing','greeting']) {
    if(intents.includes(intent)&&responses.has(intent)) {
      const answer=responses.get(intent);
      return intent==='wellbeing'&&intents.includes('greeting') ? `Olá! ${answer}` : answer;
    }
  }
  return '';
}
export function trainingSamples(db) {
  if(!db)throw new Error('Um banco SQLite é necessário para treinar intenções.');
  return db.prepare('SELECT text,label FROM intent_training_samples WHERE language=? AND active=1 ORDER BY id').all(language);
}
