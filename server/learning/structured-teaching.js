import { normalize } from '../persistence/database.js';
import { createRelation } from '../knowledge/relations.js';

const ufAliases = new Map([
  ['pe','pernambuco'],['pernambuco','pernambuco'],['alagoas','alagoas'],['ba','bahia'],
  ['bahia','bahia'],['rio de janeiro','rio de janeiro'],['rj','rio de janeiro'],
  ['sp','sao paulo'],['sao paulo','sao paulo']
]);
function parseNumber(raw) {
  const clean=raw.replace(/\s/g,'');
  let canonical;
  if(clean.includes(',') && clean.includes('.')) canonical=clean.replaceAll('.','').replace(',','.');
  else if(clean.includes(',')) canonical=clean.replace(',','.');
  else canonical=/^\d{1,3}(?:\.\d{3})+$/.test(clean)?clean.replaceAll('.',''):clean;
  const value=Number(canonical);
  return Number.isFinite(value) && value>0 && value<1e10 ? value : null;
}
function inferState(question) {
  const q=normalize(question);
  for(const [alias,state] of [...ufAliases].sort((a,b)=>b[0].length-a[0].length)) {
    if(new RegExp(`(?:^|\\b)${alias}(?:\\b|$)`).test(q))return state;
  }
  return null;
}
export function parseMunicipalAreaTeaching(question, answer) {
  const q=normalize(question);
  if(!/(?:cidade|municipio)/.test(q) || !/(?:extensao|area|territorial|km2)/.test(q)) return [];
  const state=inferState(question);
  if(!state)return [];
  const list=[]; const seen=new Set();
  for(const line of String(answer).split(/\r?\n/)) {
    const match=line.match(/^\s*(?:\d{1,3}[.)]\s*)?([\p{L}][\p{L}\p{M}\s'’.-]{1,90}?)\s*:\s*([\d.,]+)\s*km(?:²|2)\s*\.?\s*$/iu);
    if(!match)continue;
    const name=normalize(match[1]).replace(/^municipio de /,'').trim();
    const value=parseNumber(match[2]);
    if(!value || name.length<3 || seen.has(name))continue;
    seen.add(name);
    list.push({municipality:name,state,area:value,original:line.trim()});
  }
  return list;
}
export function incorporateMunicipalAreas(db, question, answer) {
  const items=parseMunicipalAreaTeaching(question,answer);
  let inserted=0;
  for(const item of items) {
    const numeric=String(item.area).replace('.',',');
    const existing=db.prepare(`SELECT id,object FROM knowledge_relations WHERE subject=? AND predicate='area_km2'`).all(item.municipality.replaceAll(' ','_'));
    // Conflict-safe: never add a second incompatible numerical measurement silently.
    if(existing.some(row=>row.object!==numeric))continue;
    for(const rel of [
      {subject:item.municipality,predicate:'pertence_a',object:item.state},
      {subject:item.municipality,predicate:'area_km2',object:numeric}
    ]) {
      // These two predicates have fixed, non-updating semantics.
      const subject=normalize(rel.subject).replaceAll(' ','_');
      const object=rel.predicate==='area_km2' ? rel.object : normalize(rel.object).replaceAll(' ','_');
      const found=db.prepare('SELECT id FROM knowledge_relations WHERE subject=? AND predicate=? AND object=?').get(subject,rel.predicate,object);
      if(!found) {
        db.prepare(`INSERT INTO knowledge_relations(id,subject,predicate,object,confidence,source_type,evidence_count)
          VALUES(lower(hex(randomblob(16))),?,?,?,NULL,'user-approved',1)`).run(subject,rel.predicate,object);
        inserted++;
      }
    }
  }
  return {parsed:items.length,inserted};
}
