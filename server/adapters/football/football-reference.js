import {normalize} from '../../persistence/database.js';
const hasTable=db=>Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE name='football_reference_profiles'").get());
const pretty=s=>String(s).replaceAll('_',' ');
const norm=s=>normalize(pretty(s));
const includes=(q,name)=>new RegExp(`(?:^| )${norm(name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?= |$)`).test(q);
const number=n=>Number(n).toLocaleString('pt-BR',{maximumFractionDigits:2});
const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:0,maximumFractionDigits:2}).format(n*1e6);
export function footballReferenceExamples(db,eligible,{country=false,state=null}={}) {
 if(!hasTable(db))return null;
 const set=new Set(eligible);
 const rows=db.prepare('SELECT entity,state_entity,display_name,display_order FROM football_reference_profiles ORDER BY state_entity,display_order').all().filter(row=>set.has(row.entity)&&(!state||state==='brasil'||row.state_entity===state));
 if(!rows.length)return null;
 const groups=new Map();
 for(const row of rows){if(!groups.has(row.state_entity))groups.set(row.state_entity,[]);groups.get(row.state_entity).push(row.display_name);}
 const labels=db.prepare('SELECT display_name FROM entity_labels WHERE entity=?');
 const lines=[...groups].map(([state,names])=>`${labels.get(state)?.display_name??pretty(state)}: ${names.slice(0,country?4:3).join(', ')}`);
 return `Clubes de referência para começar a comparação:\n${lines.join('\n')}\nEsta seleção é uma referência editorial por estado, não um ranking que combine torcida, títulos e finanças. `;
}
export function footballProfileAnswer(db,input) {
 if(!hasTable(db))return null;
 const q=norm(input);
 if(!/^(?:qual|quais|quanto|quantos|quantas|me diga|mostre|fale|o que)/.test(q)||/\b(?:maior|maiores|menor|menores|clubes|times)\b/.test(q))return null;
 const fields=[];
 if(/\btorcida\b/.test(q))fields.push('supporters');
 if(/\b(?:titulos?|conquistas?)\b/.test(q))fields.push('titles');
 if(/\b(?:patrimonio|patrimonio liquido)\b/.test(q))fields.push('equity');
 if(/\b(?:receita|receitas|faturamento)\b/.test(q))fields.push('revenue');
 if(/\b(?:valuation|valor de mercado|avaliacao economica)\b/.test(q))fields.push('valuation');
 if(/\b(?:divida|dividas|endividamento|passivo)\b/.test(q))fields.push('debt');
 if(/\b(?:vice|vices|campanhas)\b/.test(q))fields.push('campaigns');
 if(!fields.length)return null;
 const rows=db.prepare('SELECT entity,display_name,profile_json FROM football_reference_profiles').all();
 const candidates=rows.map(row=>({...row,aliases:[row.display_name,pretty(row.entity)]}));
 const matched=candidates.filter(row=>row.aliases.some(name=>includes(q,name)))
   .sort((a,b)=>norm(b.display_name).length-norm(a.display_name).length);
 if(!matched.length)return null;
 const row=matched[0],p=JSON.parse(row.profile_json),requested=Number(q.match(/\b(?:19|20)\d{2}\b/)?.[0]??0);
 const path=[],lines=[];
 for(const field of fields) {
  if(field==='titles'||field==='campaigns') {
   const kind=field==='titles'?'title':'runner_up';
   let history=(p.extra_titles??[]).filter(item=>item.kind===kind&&(!requested||requested===item.year));
   const specific=/\b(?:brasileiro|brasileirao|libertadores|copa do brasil|serie [abcd]|nacionais|internacionais|regionais|mundial|intercontinental|nordeste|copa verde|copa norte|conmebol)\b/.test(q);
   const series=q.match(/\bserie ([abcd])\b/);
   if(series)history=history.filter(item=>norm(item.competition).includes('serie '+series[1]));
   else if(/copa do brasil/.test(q))history=history.filter(item=>item.competition==='Copa do Brasil');
   else if(/libertadores/.test(q))history=history.filter(item=>/Libertadores/.test(item.competition));
   else if(/sul americana/.test(q))history=history.filter(item=>/Sul-Americana/.test(item.competition));
   else if(/nordeste/.test(q))history=history.filter(item=>/Nordeste/.test(item.competition));
   else if(/copa verde/.test(q))history=history.filter(item=>item.competition==='Copa Verde');
   else if(/mundial|intercontinental/.test(q))history=history.filter(item=>/Intercontinental|Mundial|Copa Rio/.test(item.competition));
   else if(/nacionais/.test(q))history=history.filter(item=>/Brasileiro|Copa do Brasil/.test(item.competition));
   else if(/regionais/.test(q))history=history.filter(item=>/Nordeste|Copa Norte|Copa Verde/.test(item.competition));
   if(field==='titles'&&!specific) {
    const t=p.titles;
    if(!requested||requested===t.year) {
     lines.push(t.value===null?`${t.competition}: há divergência entre ${t.reported_counts.join(' e ')} títulos nas fontes. ${t.note}`
      :`${t.competition}: ${t.value} título(s), conforme fonte consultada em 08/11/2026. ${t.note} Fonte: ${t.source_url}`);
     path.push(t);
    }
   }
   for(const item of history) {
    lines.push(`${item.competition}: ${item.value} ${kind==='title'?'título(s)':'vice-campeonato(s)'} até ${item.year}${item.seasons?' ('+item.seasons.join(', ')+')':''}. Fonte: ${item.source_url}`);path.push(item);
   }
   if(!history.length&&specific)lines.push('Não localizei esse histórico com fonte na ficha; ausência de registro não significa ausência de conquistas.');
   lines.push('Conquistas e vice-campeonatos são registrados separadamente; a ficha não representa um total universal de troféus.');
   continue;
  }
  let values=(p[field]??[]).filter(v=>!requested||v.year===requested);
  if(field==='debt' && /passivo/.test(q))values=values.filter(v=>v.property==='passivo_total_milhoes_brl');
  if(field==='debt' && /divida liquida/.test(q))values=values.filter(v=>v.property==='divida_liquida_milhoes_brl');
  const label={supporters:'Torcida',equity:'Patrimônio líquido',revenue:'Receita',valuation:'Valuation estimado',debt:'Endividamento'}[field];
  if(!values.length){lines.push(`${label}: não localizei um valor numérico com fonte${requested?' para '+requested:''} nas fontes desta pesquisa. Essa lacuna não significa zero.`);continue;}
  values.sort((a,b)=>b.year-a.year);
  // Mantém visíveis recortes diferentes para torcida; finanças apresentam o exercício mais recente.
  if(field!=='supporters')values=values.filter(v=>v.year===values[0].year);
  for(const v of values) {
   const representation=v.unit==='percent'?`${number(v.value)}% (recorte: ${pretty(v.measurement_scope)})`
    :v.unit==='milhoes_pessoas'?`${number(v.value)} milhões de torcedores e simpatizantes (estimativa, não contagem)`
    :money(v.value);
   const definition=v.property==='receita_operacional_liquida_milhoes_brl'?'receita operacional líquida'
    :v.property==='receita_bruta_milhoes_brl'?'receita bruta':v.property==='receita_operacional_milhoes_brl'?'receita operacional':v.property==='passivo_total_milhoes_brl'?'passivo total':label;
   lines.push(`${definition}: ${representation} (${v.year}). ${v.note} Fonte: ${v.source_url}`);path.push(v);
  }
 }
 return {kind:'football-research-profile',answer:`${p.name}\n${lines.join('\n')}`,path,
 interpretation:{intent:'sourced-football-profile',entity:p.entity,fields,neuralUsedForAnswer:false},explanation:'Dados pesquisados, períodos e lacunas preservados; sem confundir receita, valuation e patrimônio.'};
}
