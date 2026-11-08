import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const file=new URL('../../../imports/mylittlia-lote-021-clubes-27-ufs.json',import.meta.url);
const hash=s=>createHash('sha256').update(s).digest('hex');
export function importFootballResearch(db,{apply=false,dataset=null}={}) {
 const input=dataset??JSON.parse(readFileSync(file,'utf8'));
 const profiles=input.profiles;
 if(!Array.isArray(profiles)||profiles.length<108)throw new Error('Lote 021: cobertura insuficiente.');
 const states=new Map();const ids=new Set();const facts=[];
 for(const p of profiles) {
  if(ids.has(p.entity)||!p.entity||!p.state_entity||!p.name||!Number.isInteger(p.display_order))throw new Error('Ficha inválida ou duplicada.');
  ids.add(p.entity);states.set(p.state_entity,(states.get(p.state_entity)??0)+1);
  const collision=db.prepare("SELECT 1 FROM knowledge_relations WHERE subject=? AND predicate='e_um' AND object IN ('municipio','estado_brasileiro','unidade_federativa_brasileira','pais')").get(p.entity);
  const present=db.prepare('SELECT 1 FROM knowledge_relations WHERE subject=? LIMIT 1').get(p.entity);
  const club=db.prepare("SELECT 1 FROM knowledge_relations WHERE subject=? AND predicate='e_um' AND object='clube_de_futebol'").get(p.entity);
  const geographicData=db.prepare("SELECT 1 FROM knowledge_relations WHERE subject=? AND (predicate IN ('area_km2','populacao_habitantes','tem_capital') OR (predicate='possui' AND (object LIKE 'area_territorial_%' OR object LIKE 'populacao_%'))) LIMIT 1").get(p.entity);
  if(present&&!club&&geographicData)throw new Error(`Entidade já usada sem identificação de clube: ${p.entity}. Use um identificador específico para evitar misturar cidade e time.`);
  if(collision)throw new Error(`Entidade ambígua: ${p.entity}. Separe o clube da localidade antes de importar.`);
  const title=p.titles;
  if(title.value!==null) facts.push({entity:p.entity,property:'quantidade_titulos',value:String(title.value),numeric_value:title.value,unit:'titulos',reference_year:title.year,competition:title.competition,source_url:title.source_url,source_note:title.note,source_series:'Wikipedia-estaduais-consulta2026-11-08',measurement_scope:p.state_entity});
  for(const field of ['supporters','revenue','equity','valuation','debt'])for(const item of p[field]??[])facts.push({entity:p.entity,property:item.property,value:String(item.value),numeric_value:item.value,unit:item.unit,reference_year:item.year,competition:null,source_url:item.source_url,source_note:item.note,source_series:item.source_series,measurement_scope:item.measurement_scope??null});
  for(const item of p.extra_titles??[]) facts.push({entity:p.entity,property:item.kind==='title'?'quantidade_titulos':'quantidade_vices',value:String(item.value),numeric_value:item.value,unit:'titulos',reference_year:item.year,competition:item.competition,source_url:item.source_url,source_note:item.note+(item.seasons?' Temporadas: '+item.seasons.join(', '):''),source_series:'Wikipedia-historico-ate2025',measurement_scope:null});
 }
 if(states.size!==27||[...states.values()].some(n=>n<4))throw new Error('O lote deve cobrir quatro ou mais clubes por UF.');
 const existing=db.prepare('SELECT entity,property,value,numeric_value,reference_year,competition,source_url FROM entity_facts').all();
 for(const f of facts) {
  if(!Number.isFinite(f.numeric_value)||!Number.isInteger(f.reference_year)||!/^https:\/\//.test(f.source_url))throw new Error('Fato inválido.');
  if(existing.some(e=>e.entity===f.entity&&e.property===f.property&&e.reference_year===f.reference_year&&(e.competition??null)===f.competition&&e.source_url===f.source_url&&e.numeric_value!==f.numeric_value))throw new Error(`Conflito em ${f.entity}/${f.property}. Nenhum dado anterior será substituído.`);
 }
 const checksum=hash(JSON.stringify(input));
 const tracked=db.prepare("SELECT 1 FROM sqlite_master WHERE name='football_research_imports'").get();
 if(tracked&&db.prepare('SELECT 1 FROM football_research_imports WHERE checksum=?').get(checksum))return {profiles:profiles.length,facts:facts.length,inserted:0,alreadyImported:true};
 if(!apply)return {profiles:profiles.length,facts:facts.length,coverage:input.coverage,inserted:0,dryRun:true};
 db.exec('BEGIN IMMEDIATE');
 try {
  const insertProfile=db.prepare('INSERT OR IGNORE INTO football_reference_profiles VALUES (?,?,?,?,?,?)');
  const label=db.prepare("INSERT OR IGNORE INTO entity_labels(entity,display_name,source_import) VALUES (?,?,'lote-021')");
  const findRelation=db.prepare('SELECT 1 FROM knowledge_relations WHERE subject=? AND predicate=? AND object=?');
  const relation=db.prepare("INSERT INTO knowledge_relations(id,subject,predicate,object,source_type,confidence) VALUES (?,?,?,?,'imported',NULL)");
  const addRelation=(s,p,o)=>{if(!findRelation.get(s,p,o))relation.run(hash('lote021:'+JSON.stringify([s,p,o])),s,p,o);};
  for(const p of profiles) {
   insertProfile.run(p.entity,p.state_entity,p.name,p.display_order,JSON.stringify(p),p.selection_source);
   label.run(p.entity,p.name);label.run(p.state_entity,p.state);
   addRelation(p.entity,'e_um','clube_de_futebol');addRelation(p.entity,'localizado_em',p.state_entity);
   addRelation(p.state_entity,'e_um','unidade_federativa_brasileira');addRelation(p.state_entity,'localizado_em','brasil');
  }
  const insert=db.prepare(`INSERT OR IGNORE INTO entity_facts(id,entity,property,value,numeric_value,unit,reference_year,competition,source_url,source_note,source_series,measurement_scope,origin_import) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'lote-021')`);
  let inserted=0;
  for(const f of facts) {
   const duplicate=existing.some(e=>e.entity===f.entity&&e.property===f.property&&e.reference_year===f.reference_year&&(e.competition??null)===f.competition&&e.source_url===f.source_url&&e.numeric_value===f.numeric_value);
   if(duplicate)continue;
   inserted+=Number(insert.run(hash('lote021:'+JSON.stringify(f)),f.entity,f.property,f.value,f.numeric_value,f.unit,f.reference_year,f.competition,f.source_url,f.source_note,f.source_series,f.measurement_scope).changes);
  }
  db.prepare('INSERT INTO football_research_imports(checksum) VALUES (?)').run(checksum);
  db.exec('COMMIT');return {profiles:profiles.length,facts:facts.length,inserted,coverage:input.coverage};
 }catch(error){db.exec('ROLLBACK');throw error;}
}
