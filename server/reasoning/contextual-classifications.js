import {normalize} from '../persistence/database.js';
import {renderConversationalTemplate} from '../language/response-templates.js';

const animalGroups=new Set(['anfibio','mamifero','inseto','herbivoro','peixe','molusco','vertebrado','invertebrado','animal_marinho','agua_doce','ave','reptil','carnivoro','onivoro','bovino']);
const readable=s=>String(s).replaceAll('_',' ');
const present=s=>readable(s).replace(/\b\w/g,c=>c.toUpperCase());

/** Contexto serve para resolver a referência "nesses grupos", nunca para criar fatos. */
export function contextualClassificationAnswer(db,input,history=[]) {
  const q=normalize(input);
  const explicit=/\b(?:grupo|grupos|classifica|classificacao|categoria|categorias|encaixa|pertence|tipo de animal)\b/.test(q);
  if(!explicit) return null;
  const refersBack=/\b(?:nesses|nestes|nessas|nestas|citados|mencionados|anteriores|que voce falou)\b/.test(q);
  if(refersBack) {
    const recent=[...history].reverse().filter(m=>m.role==='user').slice(0,5);
    if(!recent.some(m=>/\b(?:animais|animal|mamiferos|vertebrados|invertebrados|especies|grupos)\b/.test(normalize(m.content)))) return null;
  }
  const subjects=db.prepare("SELECT DISTINCT subject FROM knowledge_relations WHERE predicate='e_um'").all();
  const matching=subjects.filter(r=>{
    const word=normalize(readable(r.subject));
    return word.length>2 && new RegExp(`(?:^|\\s)${word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?=\\s|$)`).test(q);
  }).sort((a,b)=>b.subject.length-a.subject.length);
  if(!matching.length) return null;
  const subject=matching[0].subject;
  const rows=db.prepare("SELECT id,subject,predicate,object,confidence,source_type FROM knowledge_relations WHERE subject=? AND predicate='e_um'").all(subject);
  const classes=[...new Set(rows.filter(r=>animalGroups.has(normalize(readable(r.object)).replaceAll(' ','_'))).map(r=>r.object))];
  if(!classes.length) return null;
  const answer=renderConversationalTemplate(db,'context-animal-classes',{entity:readable(subject),classes:classes.map(readable).join(', ') });
  if(!answer) return null;
  return {kind:'contextual-classifications',answer,path:rows.filter(r=>classes.includes(r.object)),interpretation:{intent:'contextual-classification',entity:subject,parser:'sqlite-classification-context',neuralUsedForAnswer:false},explanation:'Classificações recuperadas de relações explícitas e_um; contexto só resolve a referência aos grupos.'};
}
