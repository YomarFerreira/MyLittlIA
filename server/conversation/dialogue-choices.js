import {normalize} from '../persistence/database.js';
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const boundary=alias=>new RegExp(`(?:^|\\s)${esc(normalize(alias))}(?=$|\\s)`,'g');

// The interpreter consumes options supplied by the pending question, not reply templates.
export function interpretChoice(text,options) {
 const q=normalize(text);
 if(!q||/^(?:qual|quais|quem|onde|quando|como)\b/.test(q)||/\b(?:mas|porem)\b/.test(q))return null;
 const selected=[],excluded=new Set();
 for(const option of options)for(const alias of option.aliases) {
  for(const match of q.matchAll(boundary(alias))) {
   const before=q.slice(0,match.index).trim(),after=q.slice(match.index+match[0].length).trim();
   if(/(?:nao|menos|exceto|sem|nem)(?: (?:quero|prefiro|escolho|usar|considerar|comparar|por|pelo|pela|o|a))*$/.test(before)||/^nao\b/.test(after))excluded.add(option.id);
   else selected.push(option);
  }
 }
 const available=options.filter(o=>!excluded.has(o.id));
 if(/\bqualquer\b|\btanto faz\b|\bvoce escolhe\b|\bescolha por mim\b/.test(q)){
  if(/\bnao\b/.test(q.replace(/\bnao sei\b/g,'')))return null;
  return available.length?{option:available[0],delegated:true}:null;
 }
 const unique=[...new Map(selected.filter(o=>!excluded.has(o.id)).map(o=>[o.id,o])).values()];
 if(unique.length===1)return {option:unique[0],delegated:false};
 if(unique.length>1)return null;
 const ordinal=q.match(/\b(primeir[oa]|segund[oa]|terceir[oa]|ultim[oa])\b/);
 if(ordinal){const n=/primeir/.test(ordinal[1])?0:/segund/.test(ordinal[1])?1:/terceir/.test(ordinal[1])?2:available.length-1;return available[n]?{option:available[n],delegated:false}:null;}
 return null;
}
export function choiceCatalog(db) {
 const entries=new Map();
 for(const row of db.prepare('SELECT metric,alias FROM ranking_metric_aliases ORDER BY length(alias) DESC').all()) {
  if(!entries.has(row.metric))entries.set(row.metric,{id:row.metric,aliases:[]});
  entries.get(row.metric).aliases.push(row.alias);
 }
 // These are operation names already understood by the municipal numeric engine.
 entries.set('area',{id:'area',aliases:['extensão territorial','extensão','área territorial','área']});
 entries.set('population',{id:'population',aliases:['população','habitantes']});
 return [...entries.values()];
}
export function metricChoice(db,text) {
 const choice=interpretChoice(text,choiceCatalog(db));
 return choice?{metric:choice.option.id,alias:choice.option.aliases[0]}:null;
}
