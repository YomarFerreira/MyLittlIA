import {renderConversationalTemplate} from './response-templates.js';

const readable = value => String(value ?? '').replaceAll('_', ' ').trim();
const normalized = value => readable(value).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
const joinNatural = items => items.length < 2 ? (items[0] ?? '') : `${items.slice(0,-1).join(', ')} e ${items.at(-1)}`;
const variables = (text, values) => String(text).replace(/\{([a-z_]+)\}/g, (_, key) => values[key] ?? '');

// O SQL contém as regras de expressão; este módulo apenas coordena seleção,
// flexão numérica elementar, deduplicação e preenchimento de variáveis.
export function composePropertyAnswer(db, definition, subject, rows) {
  if (!rows.length) return null;
  const phrases = db.prepare('SELECT predicate, template_text FROM semantic_predicate_phrases WHERE language=? AND active=1 AND property=?').all('pt-BR',definition.id);
  const byPredicate = new Map(phrases.map(p=>[p.predicate,p.template_text]));
  const clauses = [];
  const seen = new Set();
  const seenValues = new Set();
  const sources = [];
  // Propriedades específicas antecedem atributos genéricos da mesma entidade.
  const priorities = {numero_patas_tipico:0,revestimento:1,possui_pelos:2,possui_penas:2,possui_escamas:2,possui_asas:2,possui:3,tem:4,caracteristica:5};
  const ordered = definition.id==='features'
    ? [...rows].sort((a,b)=>(priorities[a.predicate]??4)-(priorities[b.predicate]??4)) : rows;
  for (const row of ordered) {
    const pattern=byPredicate.get(row.predicate);
    if (!pattern) continue;
    const raw=readable(row.object);
    if (!raw) continue;
    const count=Number(raw);
    const naturalCount=Number.isInteger(count) && count>=0 && count<=100 ? ({0:'zero',1:'uma',2:'duas',3:'três',4:'quatro',5:'cinco',6:'seis',7:'sete',8:'oito',9:'nove',10:'dez'}[count] ?? raw) : raw;
    const semanticValue=normalized(raw);
    if (definition.id==='features' && seenValues.has(semanticValue)) continue;
    const clause=variables(pattern,{value:raw,count:naturalCount,entity:readable(subject)}).trim();
    if (!clause || /\{[^}]+\}/.test(clause)) continue;
    const key=normalized(clause);
    if (seen.has(key)) continue;
    seen.add(key);
    seenValues.add(semanticValue);
    clauses.push(clause);
    sources.push(row);
  }
  if (!clauses.length) return null;
  const combined=joinNatural(clauses);
  // Templates históricos de bebida já contêm o verbo 'bebe'; não o duplicar.
  const presentedValues=definition.id==='drink' ? joinNatural(sources.map(row=>readable(row.object))) : combined;
  // Mantém templates já personalizados nas categorias anteriores; características
  // usam a frase completa composta a partir de predicados.
  const entity=readable(subject);
  const capitalizedEntity=entity.charAt(0).toUpperCase()+entity.slice(1);
  const soundRows=sources.filter(row=>row.predicate!=='onomatopeia');
  const soundClauses=soundRows.map(row=> {
    const action=row.predicate==='som_emitido'
      ? renderConversationalTemplate(db,`sound-action-${row.object}`,{entity:capitalizedEntity}) : null;
    return action ?? `${capitalizedEntity} ${variables(byPredicate.get(row.predicate) ?? '{value}',{value:readable(row.object),entity})}`;
  });
  const representations=joinNatural([...new Set(sources.filter(row=>row.predicate==='onomatopeia').map(row=>readable(row.object)))]);
  const soundVars={entity:capitalizedEntity,values:combined,clauses:combined,sound_description:joinNatural(soundClauses),representations};
  const answer=definition.id==='sound' && sources.some(row=>row.predicate==='onomatopeia')
    ? renderConversationalTemplate(db,soundRows.length?'property-sound-description':'property-sound-representation',soundVars)
    : definition.id==='features'
    ? renderConversationalTemplate(db,'property-composed',{entity:readable(subject),clauses:combined})
    : renderConversationalTemplate(db,definition.template,{entity:readable(subject),values:presentedValues,clauses:combined});
  return answer ? {answer,sources} : null;
}
