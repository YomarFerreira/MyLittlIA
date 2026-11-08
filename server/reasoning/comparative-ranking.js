import {rankingPosition} from './numeric-rankings.js';
import {footballReferenceExamples} from '../adapters/football/football-reference.js';
/**
 * Comparações numéricas genéricas, orientadas por métricas e aliases do SQLite.
 * Não converte palavras vagas como "maior" em medidas arbitrárias e nunca
 * mistura séries de fontes/épocas diferentes na mesma ordenação.
 */
import {normalize} from '../persistence/database.js';
import {buildGeographicIndex,geographicalPath} from './geographic-hierarchy.js';
import {geographicMention,conceptInQuestion,classificationMatches} from '../language/lexical-equivalence.js';

const norm = value => normalize(String(value??'').replaceAll('_',' '));
const phrase = (q,x) => new RegExp(`(?:^|\\s)${norm(x).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?=$|\\s)`).test(q);
const comparison = /\b(?:maior(?:es)?|menor(?:es)?|melhores?|principais|mais|menos|top|ranking|lideram|lideres|ordenad[oa]s?|classificacao|compare|comparar)\b/;
const cardinals = new Map([['um',1],['uma',1],['dois',2],['duas',2],['tres',3],['quatro',4],['cinco',5],['seis',6],['sete',7],['oito',8],['nove',9],['dez',10]]);
const classPlural=klass=>{if(klass==='unidade_federativa_brasileira')return 'unidades federativas brasileiras';const raw=String(klass).replaceAll('_',' ');const first=raw.split(' ')[0];const ending=first==='animal'?'animais':first.endsWith('al')?first.slice(0,-2)+'ais':first.endsWith('l')?first.slice(0,-1)+'is':first+'s';return ending+raw.slice(first.length);};
const format=(n,max=2)=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:max}).format(n);
const tableExists=(db,name)=>Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
const proper=(x)=>String(x??'').replaceAll('_',' ').split(' ').map((word,i)=>i>0&&['de','da','do','das','dos','e'].includes(word)?word:word.charAt(0).toLocaleUpperCase('pt-BR')+word.slice(1)).join(' ');
const entityName=(db,key)=>tableExists(db,'entity_labels')?db.prepare('SELECT display_name FROM entity_labels WHERE entity=?').get(key)?.display_name??proper(key):proper(key);
const limit=(q)=> {
  const words=[...cardinals].map(([name,n])=>({name,n}));
  const m=q.match(/\b(?:top\s*|(?:os|as|quais|qual|liste|mostre|cite|compare|quero|me diga)\s+(?:(?:os|as)\s+)?)?(\d{1,2}|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez)\s+(?:maiores?|menores?|melhores?|principais|clubes?|times?|equipes?|animais?|estados?|cidades?|municipios?|mais|mais\s+valiosos?)\b/);
  if(m){const n=cardinals.get(m[1])??Number(m[1]);return Math.max(1,Math.min(n,50));}
  // Ex.: "Top 3 clubes"; "5 cidades com maior PIB"; "quais os 3 clubes com mais torcida".
  const before=q.match(/\b(?:top\s*)?(\d{1,2})\s+(?:clubes?|times?|equipes?|animais?|estados?|cidades?|municipios?|maiores?|menores?)\b/);
  if(before)return Math.max(1,Math.min(Number(before[1]),50));
  return /^(?:qual|quem)\b/.test(q) && /\b(?:maior|menor|mais|menos)\b/.test(q)?1:null;
};
const queryYear=q=>Number(q.match(/\b(?:19|20)\d{2}\b/)?.[0]??0);
function entityScope(db,q,metric=null) {
  const classes=db.prepare("SELECT DISTINCT object FROM knowledge_relations WHERE predicate='e_um'").all().map(row=>row.object);
  // Resolver pelo catálogo semântico, não fixar o domínio 'futebol'.
  const subjectQuery=q.replace(/\b(?:em|no|na) (?:o |a )?(?:estado|cidade|municipio) (?:de|do|da)\b.*$/,'').trim();
  const possible=classes.map(klass=>({klass,mention:conceptInQuestion(db,subjectQuery,klass)}))
    .filter(item=>item.mention).sort((a,b)=>b.mention.length-a.mention.length);
  if(!possible.length && metric && tableExists(db,'ranking_metric_classes')) {
    const inferred=db.prepare('SELECT canonical_class FROM ranking_metric_classes WHERE metric=?').all(metric)
      .filter(row=>classes.some(klass=>classificationMatches(db,klass,row.canonical_class)));
    if(inferred.length===1)possible.push({klass:inferred[0].canonical_class,mention:null});
  }
  if(!possible.length)return null;
  const {klass,mention}=possible[0];
  const all=db.prepare("SELECT subject,object FROM knowledge_relations WHERE predicate='e_um'").all()
    .filter(row=>classificationMatches(db,row.object,klass))
    .map(row=>row.subject);
  const names=[...new Set(all)].sort();
  return {klass,mention,names};
}
function locationOf(db,q) {
  // O lugar pode vir antes do qualificador, como em "clubes do Brasil por torcida".
  const normalized=q.replace(/\s+(?:por|segundo|ordenados? por)\s+.+$/,'').replace(/\s+com\s+(?:maior(?:es)?|menor(?:es)?|mais|menos)\s+.+$/,'');
  return geographicMention(db,q) || geographicMention(db,normalized);
}
function selectMetric(db,q) {
  const aliases=db.prepare('SELECT metric,alias FROM ranking_metric_aliases ORDER BY length(alias) DESC').all();
  const matches=aliases.filter(row=>phrase(q,row.alias));
  const byMetric=[...new Map(matches.map(row=>[row.metric,row])).keys()];
  // "patrimônio" nunca deve ser confundido com "valor de mercado".
  if(byMetric.length>1) {
    const longest=matches[0];
    const tied=matches.filter(row=>row.alias.length===longest.alias.length);
    return new Set(tied.map(row=>row.metric)).size===1?longest.metric:null;
  }
  return byMetric[0]||null;
}
function examples(db,subjects,index) {
  const rows=[];
  const knownLabel=db.prepare('SELECT display_name FROM entity_labels WHERE entity=?');
  for(const club of subjects){
    // Exemplos apenas de nomes com ficha legível verificada no catálogo.
    if(!knownLabel.get(club))continue;
    const uf=[...index.brazilianUFs.keys()].find(place=>geographicalPath(index,club,place));
    if(uf)rows.push({name:entityName(db,club),state:entityName(db,uf)});
  }
  const group=new Map();
  for(const r of rows){if(!group.has(r.state))group.set(r.state,[]);group.get(r.state).push(r.name);}
  const best=[...group].sort((a,b)=>b[1].length-a[1].length).slice(0,3)
    .map(([state,clubs])=>`${clubs.slice(0,2).join(' e ')} (${state})`);
  return best.join('; ');
}
const units={percent:(n)=>`${format(n)}%`,brl_million:(n)=>`R$ ${format(n)} milhões`,count:(n)=>`${format(n)} título${n===1?'':'s'}`,kmh:(n)=>`${format(n)} km/h`,generic:(n,unit)=>`${format(n)} ${unit}`.trim()};
function output(db,{q,n,scope,index,place,metric}) {
  const definition=db.prepare('SELECT * FROM ranking_metrics WHERE metric=?').get(metric);
  if(!definition)return null;
  const properties=db.prepare('SELECT property FROM ranking_metric_properties WHERE metric=?').all(metric).map(r=>r.property);
  const eligible=scope.names.filter(name=>!place||geographicalPath(index,name,place.canonical));
  if(!eligible.length)return null;
  if(!properties.length)return null;
  const permittedUnits=new Set(db.prepare('SELECT unit FROM ranking_metric_units WHERE metric=?').all(metric).map(r=>r.unit));
  const eligibleSet=new Set(eligible);
  const rows=db.prepare(`SELECT id,entity,property,value,numeric_value,unit,reference_year,season,competition,source_url,source_note,source_series,measurement_scope
     FROM entity_facts WHERE property IN (${properties.map(()=>'?').join(',')}) AND numeric_value IS NOT NULL`).all(...properties)
     .filter(r=>eligibleSet.has(r.entity) && Number.isFinite(r.numeric_value)
        && permittedUnits.has(r.unit) && Number.isInteger(r.reference_year) && r.reference_year>0 && /^https:\/\//.test(r.source_url));
  const requested=queryYear(q);
  // 'AtlasIntel 2025' e 'Datafolha 2026' são séries distintas.
  const chosen=rows.filter(r=>!requested||r.reference_year===requested)
    .filter(r=>!/atlasintel/.test(q)||/atlasintel/.test(r.property+' '+r.source_url))
    .filter(r=>!/datafolha/.test(q)||/datafolha/.test(r.property+' '+r.source_url));
  let usable=chosen.filter(row=>metric!=='torcida'||!row.measurement_scope||row.measurement_scope==='brasil'||row.measurement_scope===place?.canonical);
  let competition=null;
  if(metric==='titulos') {
    const competitions=[...new Set(usable.map(r=>r.competition).filter(Boolean))];
    competition=competitions.find(name=>phrase(q,name));
    if(!competition){
      const generic=/\b(?:nacionais|nacional|estaduais|estadual|internacionais|internacional)\b/.test(q);
      return {kind:'comparative-ranking-clarification',answer:`Para comparar títulos com segurança, preciso saber a competição específica${generic?' (o total de títulos por categoria não está completo na base)':''}. Por exemplo: Copa do Brasil ou Campeonato Brasileiro Série A.`,interpretation:{intent:'ranking-needs-competition',metric,neuralUsedForAnswer:false},path:[]};
    }
    usable=usable.filter(r=>r.competition===competition);
  }
  // Grupo por (propriedade, ano, unidade e fonte). Nunca combinar estudos/tempos.
  const series=new Map();
  for(const row of usable) {
    // Contagens por competição podem ter uma página de fonte por clube;
    // exige-se o mesmo portal, ano, propriedade, unidade e competição.
    const sourceScope=row.source_series??(metric==='titulos'?new URL(row.source_url).hostname:row.source_url);
    const groupKey=JSON.stringify([row.property,row.reference_year,row.unit,sourceScope,metric==='titulos'?row.competition:null]);
    if(!series.has(groupKey))series.set(groupKey,[]);
    series.get(groupKey).push(row);
  }
  const candidates=[...series.values()].map(list=>{
    const perEntity=new Map();
    for(const row of list)if(!perEntity.has(row.entity))perEntity.set(row.entity,row);
    return {rows:[...perEntity.values()],year:list[0]?.reference_year||0,source:list[0]?.source_url,property:list[0]?.property};
  }).filter(s=>s.rows.length);
  // Política: preferir a série mais recente, depois a maior cobertura; nenhum dado extrapolado.
  candidates.sort((a,b)=>b.year-a.year||b.rows.length-a.rows.length||a.property.localeCompare(b.property));
  const dataset=candidates[0];
  if(!dataset){
    return {kind:'comparative-ranking-data-gap',answer:`Tenho ${eligible.length} ${classPlural(scope.klass)} cadastrados nesse recorte, mas não encontrei valores numéricos comparáveis de ${definition.label}${requested?` em ${requested}`:''}. Não vou inventar uma classificação.`,path:[],interpretation:{intent:'ranking-data-gap',metric,neuralUsedForAnswer:false}};
  }
  const asc=/\b(?:menores?|menos|mais baratos|inferiores?)\b/.test(q);
  const ranking=dataset.rows.sort((a,b)=>(asc?a.numeric_value-b.numeric_value:b.numeric_value-a.numeric_value)||entityName(db,a.entity).localeCompare(entityName(db,b.entity),'pt-BR'));
  const position=rankingPosition(q)||1;
  const top=ranking.slice(position-1,position-1+(n||10));
  if(!top.length)return {kind:'comparative-ranking-data-gap',answer:`Não tenho registros comparáveis suficientes para a posição ${position}.`,path:[],interpretation:{intent:'ranking-data-gap',metric,position,neuralUsedForAnswer:false}};
  const value=(row)=>row.unit==='milhoes_pessoas'?`${format(row.numeric_value)} milhões (estimativa)`:units[definition.numeric_kind]?.(row.numeric_value,definition.unit_label)??`${row.numeric_value} ${definition.unit_label}`;
  const lines=top.map((row,i)=>`${position+i}. ${entityName(db,row.entity)} — ${value(row)}`);
  const cutoff=top.at(-1)?.numeric_value;
  const tied=ranking.slice(n||10).filter(row=>row.numeric_value===cutoff).length;
  const warns=[];
  if(dataset.rows.length<eligible.length)warns.push(`Tenho essa medida para ${dataset.rows.length} de ${eligible.length} registros do recorte; a classificação não é completa.`);
  if(n && ranking.length<n)warns.push(`Existem apenas ${ranking.length} resultados com valores comparáveis para esse critério.`);
  if(tied)warns.push(`Há ${tied} outro${tied>1?'s':''} resultado${tied>1?'s':''} empatado${tied>1?'s':''} com a última posição exibida.`);
  if(metric==='torcida' && dataset.rows[0]?.unit==='percent')warns.push('Percentuais de pesquisa representam preferência declarada; não são números absolutos de torcedores nem diferenças necessariamente significativas.');
  if(metric==='torcida' && dataset.rows[0]?.unit==='milhoes_pessoas')warns.push('São estimativas de torcedores e simpatizantes divulgadas pela PLURI, não uma contagem ou pesquisa de campo datada de 2025.');
  if(metric==='valuation')warns.push('Valuation é uma avaliação econômica estimada, não patrimônio líquido contábil.');
  if(metric==='titulos')warns.push('A cobertura histórica por competição pode estar incompleta; não assuma total de títulos nacionais.');
  if(metric==='receita')warns.push('Esta série de receita exclui transferências de jogadores; não equivale a faturamento total.');
  const local=place?` em ${entityName(db,place.canonical)}`:'';
  const label=metric==='titulos' ? `títulos em ${competition}` : definition.label;
  const sourceLabel=metric==='titulos'?`Fichas por clube de ${new URL(dataset.source).hostname} (endereços individuais gravados no SQLite)` : dataset.source;
  const period=dataset.year?` (${dataset.year})`:' (sem ano informado)';
  return {kind:'comparative-ranking',answer:`Considerando ${label}${period}, ${position>1?`este é o resultado na posição ${position} da comparação de ${classPlural(scope.klass)}`:top.length===1?`este é o ${asc?'menor':'maior'} ${String(scope.klass).replaceAll('_',' ')}`:`estes são os ${top.length} ${asc?'menores':'maiores'} ${classPlural(scope.klass)}`}${local} entre os registros comparáveis que conheço:\n${lines.join('\n')}\nFonte: ${sourceLabel}. ${warns.join(' ')}`.trim(),
    path:top,source:'entity_facts',interpretation:{intent:'numeric-comparative-ranking',parser:'sqlite-generic-comparisons',metric,position,requestedLimit:n,referenceYear:dataset.year||null,sourceUrl:dataset.source,property:dataset.property,eligibleCount:eligible.length,comparableCount:dataset.rows.length,competition,ascending:asc,ranking:top.map(r=>({entity:r.entity,value:r.numeric_value})),neuralUsedForAnswer:false},
    explanation:'Usei apenas fatos numéricos do mesmo indicador, fonte, unidade e período; ordenei os valores e apliquei o limite solicitado.'};
}
export function comparativeRankingAnswer(db,input) {
  if(!tableExists(db,'ranking_metrics')||!tableExists(db,'entity_facts'))return null;
  const q=norm(input);
  if(!comparison.test(q)||q.length<7)return null;
  const metric=selectMetric(db,q);
  const scope=entityScope(db,q,metric);
  if(!scope)return null;
  const index=buildGeographicIndex(db);
  const place=locationOf(db,q);
  const selected=scope.names.filter(name=>!place||geographicalPath(index,name,place.canonical));
  if(!selected.length)return null;
  const n=limit(q);
  const remember=result=>result?{...result,
    semanticState:{operation:'comparison',objectType:scope.klass,entity:place?.canonical??null,
      metric,property:metric,requestedLimit:n,ascending:/\b(?:menor|menores|menos)\b/.test(q),query:input},
    interpretation:{...result.interpretation,scope:place?.canonical??null,canonicalClass:scope.klass,requestedLimit:n}}:null;
  if(!metric) {
    const reference=footballReferenceExamples(db,selected,{country:place?.canonical==='brasil'||!place,state:place?.canonical});
    const sample=reference?null:examples(db,selected,index);
    const intro=reference??(sample?`Bem, entre os ${selected.length} ${classPlural(scope.klass)} que conheço, há ${sample}. `:`Conheço ${selected.length} ${classPlural(scope.klass)} nesse recorte. `);
    return remember({kind:'comparative-ranking-clarification',answer:`${intro}Para indicar ${n===1?'o maior':n?`os ${n} maiores`:'quais são os maiores'}, qual critério você quer usar: tamanho da torcida, valuation, títulos de uma competição específica, receita ou patrimônio líquido?`,path:[],interpretation:{intent:'ranking-needs-metric',parser:'sqlite-generic-comparisons',requestedLimit:n,eligibleCount:selected.length,neuralUsedForAnswer:false}});
  }
  return remember(output(db,{q,n,scope,index,place,metric}));
}
