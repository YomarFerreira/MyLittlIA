import {normalize} from '../persistence/database.js';

export const entityKey=value=>normalize(String(value??'').replaceAll('_',' ')).replaceAll(' ','_');
export function canonicalEntity(db,value) {
 const key=entityKey(value);
 return db.prepare('SELECT canonical_id FROM entity_aliases WHERE alias=?').get(key)?.canonical_id??key;
}
export function registerEntity(db,value) {
 const id=canonicalEntity(db,value);
 db.prepare('INSERT OR IGNORE INTO entity_identities(entity_id) VALUES (?)').run(id);
 return id;
}
export function registerAlias(db,alias,entity,origin='reviewed') {
 const key=entityKey(alias),id=canonicalEntity(db,entity);
 if(!key||key===id)return;
 const previous=db.prepare('SELECT canonical_id FROM entity_aliases WHERE alias=?').get(key);
 if(previous&&previous.canonical_id!==id)throw new Error(`Nome alternativo ambíguo: ${alias}`);
 if(db.prepare('SELECT 1 FROM entity_aliases WHERE canonical_id=?').get(key))throw new Error('Um nome canônico com aliases não pode virar outro alias.');
 registerEntity(db,id);
 db.prepare('INSERT OR IGNORE INTO entity_aliases(alias,canonical_id,origin) VALUES (?,?,?)').run(key,id,origin);
}
export function registerGeographicAliases(db,entity,klass) {
 const id=registerEntity(db,entity);
 const prefixes=['estado_brasileiro','unidade_federativa_brasileira'].includes(klass)?['estado_de_']:klass==='municipio'?['cidade_de_','municipio_de_']:[];
 for(const prefix of prefixes)registerAlias(db,prefix+id,id,'geographic-classification');
 if(prefixes.length)for(const row of db.prepare("SELECT phrase,canonical FROM semantic_terms WHERE kind='entity_alias' AND active=1").all()) {
  if(entityKey(row.canonical)===id&&!db.prepare('SELECT 1 FROM knowledge_relations WHERE subject=?').get(entityKey(row.phrase)))registerAlias(db,row.phrase,id,'semantic-lexicon');
 }
}
export function resolveEntityText(db,text) {
 const aliases=db.prepare('SELECT alias,canonical_id FROM entity_aliases ORDER BY length(alias) DESC').all();
 // One pass avoids cascades and never substitutes part of a longer word.
 const map=new Map(aliases.map(row=>[row.alias.replaceAll('_',' '),row.canonical_id.replaceAll('_',' ')]));
 if(!map.size)return text;
 const escaped=[...map.keys()].map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
 const pattern=new RegExp(`(?<![\\p{L}\\p{N}_])(?:${escaped.join('|')})(?![\\p{L}\\p{N}_])`,'giu');
 return text.replace(pattern,(match,offset)=>{
  const key=normalize(match);
  if(key.length<=3&&match!==match.toUpperCase()&&!/(?:^|\s)(?:de|do|da|em|no|na|para)\s*$/i.test(text.slice(0,offset)))return match;
  return map.get(key)??match;
 });
}
