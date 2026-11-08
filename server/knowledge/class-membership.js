import { normalize } from '../persistence/database.js';
import { readableName } from '../language/proper-names.js';

/** Perguntas factuais sobre classificação usam somente relações do SQLite.
 * Não presume que uma classe exclua outra; ausência não implica negação.
 */
export function resolveClassMembership(db, text) {
  const q=normalize(text).replace(/^(?:entao\s*,?\s*)/, '').replace(/[?.!]\s*$/, '').trim();
  const m=q.match(/^(?:(?:o|a)\s+)?([a-z][a-z0-9 ]{1,60}?)\s+(?:e|eh|seria|pode ser)\s+(?:(?:um|uma)\s+)?(herbivor[oa]|carnivor[oa]|onivor[oa]|mamifer[oa]|ave|reptil|peixe|bovino)$/);
  if(!m)return null;
  const entity=normalize(m[1]).replaceAll(' ','_');
  const classification=normalize(m[2]).replace(/(?:ora|oro|era|ero)$/,'or').replace(/(?:iva|ivo)$/,'iv').replace(/(?:fera|fero)$/,'fer');
  const labels={herbivor:'herbívoro',carnivor:'carnívoro',onivor:'onívoro',mamifer:'mamífero',ave:'ave',reptil:'réptil',peixe:'peixe',bovino:'bovino'};
  const rows=db.prepare(`SELECT id,subject,predicate,object,confidence,source_type FROM knowledge_relations
    WHERE subject=? AND predicate IN ('e_um','caracteristica')`).all(entity);
  const matches=rows.filter(row=>{
    const obj=normalize(row.object).replaceAll('_',' ').replace(/(?:ora|oro|era|ero)$/,'or').replace(/(?:iva|ivo)$/,'iv').replace(/(?:fera|fero)$/,'fer');
    return obj===classification;
  });
  const readable=readableName(entity,db).toLocaleLowerCase('pt-BR');
  const name=labels[classification]||m[2];
  const evidence=matches.length>0;
  const answer=evidence
    ? `Segundo os conhecimentos cadastrados, sim: ${readable} é ${name}.`
    : `Ainda não encontrei uma classificação cadastrada que permita confirmar se ${readable} é ${name}. Isso não significa que a afirmação seja falsa.`;
  return {kind:evidence?'classification-relation':'classification-insufficient-evidence',answer,
    path:matches,source:'knowledge_relations',interpretation:{intent:'class-membership',entity,property:classification,parser:'class-membership-v1',neuralUsedForAnswer:false},
    explanation:'Consultei relações explícitas de classificação no SQLite. Sem evidência cadastrada, não infiro resposta negativa.'};
}
