/**
 * Percurso geográfico por evidência. Não grava fatos derivados no SQLite.
 * Usa somente relações aprovadas; identifica a pertença de UFs brasileiras ao
 * Brasil pela classe explícita `unidade_federativa_brasileira`/`estado_brasileiro`.
 *
 * A transitividade é restrita à navegação territorial: propriedades de uma
 * entidade (cores, títulos, faturamento...) nunca são herdadas do lugar.
 */
import {normalize} from '../persistence/database.js';

const id = value => normalize(String(value ?? '').replaceAll('_', ' ')).replaceAll(' ', '_');
const GEOGRAPHIC_PREDICATES = new Set(['localizado_em', 'fica_em', 'municipio_de', 'pertence_a']);
const BRAZILIAN_UF_CLASSES = new Set(['unidade_federativa_brasileira', 'estado_brasileiro']);

export function buildGeographicIndex(db) {
  const rows = db.prepare(`SELECT id,subject,predicate,object,source_type,confidence
    FROM knowledge_relations
    WHERE predicate IN ('localizado_em','fica_em','municipio_de','pertence_a','e_um')`).all();
  const parents = new Map();
  const brazilianUFs = new Map();
  for(const row of rows) {
    const subject=id(row.subject), object=id(row.object);
    if(row.predicate==='e_um' && BRAZILIAN_UF_CLASSES.has(object)) {
      if(!brazilianUFs.has(subject)) brazilianUFs.set(subject, row);
    }
    if(GEOGRAPHIC_PREDICATES.has(row.predicate)) {
      if(!parents.has(subject)) parents.set(subject, []);
      parents.get(subject).push({place:object,evidence:row});
    }
  }
  // A classe brasileira já contém a informação de país. Criamos uma aresta
  // virtual apenas durante a consulta, sem duplicar nem reescrever a base.
  for(const [uf, evidence] of brazilianUFs) {
    if(!parents.has(uf)) parents.set(uf, []);
    parents.get(uf).push({place:'brasil',evidence,derived:true});
  }
  return {parents,brazilianUFs};
}

/** Caminho de provas (até seis níveis), sem criar relações novas. */
export function geographicalPath(index,subject,target,maxDepth=6) {
  const from=id(subject), to=id(target);
  if(!from || !to || from===to) return null;
  const queue=[{at:from,path:[],derived:false}];
  const seen=new Set([from]);
  for(let i=0;i<queue.length;i++) {
    const item=queue[i];
    if(item.path.length>=maxDepth) continue;
    for(const edge of index.parents.get(item.at)??[]) {
      if(!edge.place || edge.place===item.at || seen.has(edge.place)) continue;
      const path=[...item.path,edge.evidence];
      const derived=item.derived || Boolean(edge.derived) || path.length>1;
      if(edge.place===to) return {path,derived,hops:path.length};
      seen.add(edge.place);
      queue.push({at:edge.place,path,derived});
    }
  }
  return null;
}
