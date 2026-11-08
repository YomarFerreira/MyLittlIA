/**
 * Equivalências controladas pelo SQLite.
 * Não reescrevemos livremente as perguntas: isso confundiria palavras ambíguas
 * (ex.: "time" em outros contextos) e poderia alterar fatos do grafo.
 */
import {normalize} from '../persistence/database.js';
import {getLexicon} from './semantic-catalog.js';

const pretty = x => String(x ?? '').replaceAll('_',' ');
const normalized = x => normalize(pretty(x));
const safeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const contains = (query, phrase) => new RegExp(`(?:^|\\s)${safeRegex(normalized(phrase))}(?=$|\\s)`).test(query);

function classAliases(db) {
  return db.prepare("SELECT phrase,canonical FROM semantic_concept_aliases WHERE language='pt-BR' AND domain='entity_class' AND active=1 ORDER BY LENGTH(phrase) DESC").all();
}
export function canonicalTerm(db,text,kind='lexical') {
  const value=normalized(text);
  if (kind==='lexical') {
    const specific=classAliases(db).find(row=>normalized(row.phrase)===value);
    if (specific) return normalized(specific.canonical);
  }
  const row=getLexicon(db,kind).find(entry => normalized(entry.phrase)===value);
  return row?normalized(row.canonical):value;
}
export function conceptInQuestion(db,question,canonical) {
  const query=normalized(question);
  const target=normalized(canonical);
  const variants=[target,...classAliases(db).filter(row=>normalized(row.canonical)===target).map(row=>normalized(row.phrase)),...getLexicon(db,'lexical')
    .filter(row=>normalized(row.canonical)===target)
    .map(row=>normalized(row.phrase))];
  return [...new Set(variants)].sort((a,b)=>b.length-a.length)
    .find(variant=>contains(query,variant)) ?? null;
}
export function geographicMention(db,question) {
  const q=normalized(question);
  const known=db.prepare("SELECT DISTINCT object AS place FROM knowledge_relations WHERE predicate IN ('localizado_em','fica_em','municipio_de','pertence_a')").all()
    .map(r=>normalized(r.place));
  // Uma UF classificada como brasileira também dá evidência de que o país
  // "Brasil" existe como destino consultável, mesmo sem uma relação direta
  // `estado -> localizado_em -> brasil` cadastrada.
  if(db.prepare("SELECT 1 FROM knowledge_relations WHERE predicate='e_um' AND object IN ('unidade_federativa_brasileira','estado_brasileiro') LIMIT 1").get()) {
    known.push('brasil');
  }
  const knownSet=new Set(known);
  const variants=[...known.map(place=>({phrase:place,canonical:place})),
    ...getLexicon(db,'entity_alias').map(row=>({phrase:normalized(row.phrase),canonical:normalized(row.canonical)}))]
    .filter(row=>knownSet.has(row.canonical));
  // Ordenar do maior para o menor evita cortar "Rio Grande do Norte" em "Norte".
  variants.sort((a,b)=>b.phrase.length-a.phrase.length);
  for (const row of variants) {
    // Uma localidade somente é interpretada se ocupa a posição de local da
    // pergunta. Exige preposição; não troca palavras aleatórias no texto.
    const ending = new RegExp(`(?:^|\\s)(?:de|do|da|dos|das|em|no|na)\\s+${safeRegex(row.phrase)}$`);
    if (ending.test(q)) return row;
  }
  return null;
}
export function canonicalClass(db,text) {
  return canonicalTerm(db,text,'lexical');
}
export function classificationMatches(db,actual,canonical) {
  return canonicalClass(db,actual)===normalized(canonical);
}
