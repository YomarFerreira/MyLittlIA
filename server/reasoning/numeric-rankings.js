import { normalize } from '../persistence/database.js';

const readable = value => String(value ?? '').replaceAll('_', ' ');
const cap = text => text.charAt(0).toUpperCase() + text.slice(1);
const UF_NAMES=new Set(['acre','alagoas','amapa','amazonas','bahia','ceara','distrito federal','espirito santo','goias','maranhao','mato grosso','mato grosso do sul','minas gerais','para','paraiba','parana','pernambuco','piaui','rio de janeiro','rio grande do norte','rio grande do sul','rondonia','roraima','santa catarina','sao paulo','sergipe','tocantins']);
const ALIASES = new Map([['pe','pernambuco'],['rj','rio de janeiro'],['rio','rio de janeiro'],['sp','sao paulo'],['mg','minas gerais'],['ba','bahia'],['df','distrito federal']]);
const AREA = /\b(?:area|extensao|territorial|km2|territorio)\b/;
const POP = /\b(?:populacao|populos[ao]s?|habitantes)\b/;
const GDP = /\b(?:pib|economia|riqueza|ricas?)\b/;
const CITY = /\b(?:cidades?|municipios?)\b/;
const RANK = /\b(?:maior(?:es)?|menor(?:es)?|ranking|classificacao|mais|menos|diferenca|comparar|superior|inferior|acima|abaixo|depois|antes)\b/;
// Operações sobre o conjunto numérico, não respostas pré-cadastradas.
export function statisticalOperation(q) {
  const text=normalize(q);
  if (/\bmediana\b/.test(text)) return 'median';
  if (/\bmedia(?: aritmetica)?\b/.test(text)) return 'mean';
  if (/\b(?:do meio|da metade|central|no meio)\b/.test(text)) return 'middle';
  return null;
}
const ORDINALS = new Map([['primeira',1],['primeiro',1],['segunda',2],['segundo',2],['terceira',3],['terceiro',3],['quarta',4],['quarto',4],['quinta',5],['quinto',5],['sexta',6],['sexto',6],['setima',7],['setimo',7],['oitava',8],['oitavo',8],['nona',9],['nono',9],['decima',10],['decimo',10]]);
function ordinal(q) { for (const [word,n] of ORDINALS) if (new RegExp(`\\b${word}\\b`).test(q)) return n; return Number(q.match(/\b(\d{1,2})(?:a|o|ª|º)\b/)?.[1] || 0); }
function limitOf(q) {const m=q.match(/\b(?:as|os|top|lista(?:r)?|mostre|quais sao)\s+(\d{1,2})\s+(?:maiores|menores|cidades|municipios)/) || q.match(/\b(?:top|primeir[oa]s?)\s*(\d{1,2})\b/);return m?Math.min(Number(m[1]),100):10;}
const wantsAll=q=>/\b(?:todas|todos|nenhuma de fora|nenhum de fora|nao deixe|nao exclua|sem excluir|inclusive os sem ano|todos os periodos)\b/.test(q);
const wantsDifference=q=>/\b(?:diferenca|diferem|diferenca de area)\b/.test(q);
const wantsThreshold=q=>q.match(/\b(?:acima de|superior(?:es)? a|mais de|abaixo de|inferior(?:es)? a|menos de)\s*(?:r\$\s*)?([\d.,]+)\s*(?:km2|habitantes|reais)?/);
const yearFrom = text => Number(String(text).match(/\b(?:19|20)\d{2}\b/)?.[0] ?? 0);
const sortValue = value => {
  let raw=String(value).trim().replace(/[^0-9,.-]/g,'');
  if (!raw) return NaN;
  if (raw.includes(',') && raw.includes('.')) raw=raw.replaceAll('.','').replace(',','.');
  else if (raw.includes(',')) raw=raw.replace(',','.');
  else if (/^\d{1,3}(?:\.\d{3})+$/.test(raw)) raw=raw.replaceAll('.','');
  return Number(raw);
};
export const rankingPosition = text => ordinal(normalize(text));
function measure(row) {
  const predicate=normalize(row.predicate), object=readable(row.object), normalized=normalize(object);
  const predicateKind = AREA.test(predicate)?'area':POP.test(predicate)?'population':GDP.test(predicate)?'gdp':null;
  if (predicateKind) {
    const numericPart=object.match(/(?:^|[:=]\s*)([0-9][0-9., ]*)(?=\s*(?:km2|habitantes|pessoas|reais|r\$|em\s+(?:19|20)\d{2}|$))/i)?.[1] ?? object.match(/^[0-9][0-9., ]*/)?.[0] ?? '';
    const number=sortValue(numericPart);
    if (Number.isFinite(number) && number>=0) return {kind:predicateKind,value:number,year:yearFrom(object),source:row};
  }
  const patterns=[
    {kind:'area',regex:/(?:area(?: territorial)?|extensao)(?: de)?\s*[:=]?\s*([\d., ]+)\s*(?:km2|quilometros quadrados)/},
    {kind:'population',regex:/populacao(?: estimada)?(?: de)?\s*[:=]?\s*([\d., ]+)\s*(?:habitantes|pessoas)/},
    {kind:'gdp',regex:/(?:pib|produto interno bruto)(?: de)?\s*[:=]?\s*(?:r\$\s*)?([\d., ]+)\s*(?:reais|milhoes|bilhoes)?/}
  ];
  for (const {kind,regex} of patterns) {
    const m=normalized.match(regex);
    if (m) {let value=sortValue(m[1]);if(Number.isFinite(value)) {
      if(kind==='gdp' && /bilhoes/.test(normalized)) value*=1e9;
      else if(kind==='gdp' && /milhoes/.test(normalized)) value*=1e6;
      return {kind,value,year:yearFrom(normalized),source:row};
    }}
  }
  return null;
}
function geoRelation(row) {
  const p=normalize(row.predicate).replaceAll(' ','_'), o=normalize(row.object);
  if (['pertence_a','fica_em','localizado_em','municipio_de','estado'].includes(p)) return o;
  if(p==='tem' && o.startsWith('municipio de ')) return normalize(row.subject);
  return null;
}
function detectGeography(rows, question) {
  const text=normalize(question);
  if(/\bbrasil\b/.test(text)) return 'brasil';
  const candidates=[...new Set(rows.map(row=>normalize(row.object)).filter(Boolean))];
  for(const row of rows) candidates.push(normalize(row.subject));
  const names=[...new Set(candidates)].filter(x=>x.length>3).sort((a,b)=>b.length-a.length);
  for(const n of names) if(text.includes(n) && /(?:pernambuco|bahia|rio de janeiro|sao paulo|amazonas|acre|para|piaui|ceara|goias|sergipe|parana|brasil)/.test(n)) return n;
  for(const [alias,target] of ALIASES) if(new RegExp(`(?:^|\\s)${alias}(?=\\s|$)`).test(text)) return target;
  return null;
}
// Consulta pontual: reutiliza a mesma medida SQLite empregada nos rankings.
export function municipalMeasureAnswer(db, question) {
  const q=normalize(question);
  const kind=AREA.test(q)?'area':POP.test(q)?'population':GDP.test(q)?'gdp':null;
  if (!kind || !/\b(?:qual|quanto|quanto e|valor|me diga|informe|sabe|e o|e a)\b/.test(q)) return null;
  if (RANK.test(q) && CITY.test(q)) return null;
  const rows=db.prepare('SELECT id,subject,predicate,object,confidence,source_type FROM knowledge_relations').all();
  const municipalityStates=new Map();
  for (const row of rows) {
    const parent=geoRelation(row);
    if(parent && UF_NAMES.has(parent)) municipalityStates.set(normalize(row.subject),parent);
  }
  const candidates=[...municipalityStates.keys()].filter(name=>
    new RegExp(`(?:^|\\s)${readable(name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\\s+/g,'\\s+')}(?=\\s|$)`).test(q));
  if (!candidates.length) return null;
  const requestedState=detectGeography(rows,q);
  const matching=candidates.filter(name=>!requestedState || requestedState==='brasil' || municipalityStates.get(name)===requestedState);
  if (matching.length!==1) return null;
  const city=matching[0];
  const requestedYear=yearFrom(q);
  const measures=rows.filter(row=>normalize(row.subject)===city).map(measure).filter(m=>m?.kind===kind && (!requestedYear || m.year===requestedYear));
  const label={area:'área territorial',population:'população',gdp:'PIB'}[kind];
  const state=municipalityStates.get(city);
  if(!measures.length) return {kind:'semantic-data-gap',answer:`Reconheci ${cap(readable(city))}, ${cap(state)}, mas não encontrei ${label} ${requestedYear?'para '+requestedYear+' ':''}registrado no SQLite.`,interpretation:{intent:'municipal-measure',entity:city,property:kind,parser:'numeric-relational',neuralUsedForAnswer:false}};
  measures.sort((a,b)=>b.year-a.year);
  const value=measures[0];
  const number=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3}).format(value.value);
  const formatted=kind==='gdp'?`R$ ${number}`:kind==='area'?`${number} km²`:`${number} habitantes`;
  return {kind:'municipal-measure',answer:`O ${label} cadastrado de ${cap(readable(city))}, ${cap(state)}, é ${formatted}${value.year?` (referência ${value.year})`:' (ano de referência não informado)'}.`,source:'knowledge_relations',path:[value.source],interpretation:{intent:'municipal-measure',entity:city,property:kind,year:value.year||null,parser:'numeric-relational',neuralUsedForAnswer:false}};
}
export function numericRankingAnswer(db, question, {scope=null,region=null}={}) {
  const q=normalize(question);
  const statistic=statisticalOperation(q);
  if(!(RANK.test(q) || statistic) || !CITY.test(q)) return null;
  const kind=AREA.test(q)?'area':POP.test(q)?'population':GDP.test(q)?'gdp':null;
  if(!kind) return null;
  const rows=db.prepare('SELECT id,subject,predicate,object,confidence,source_type FROM knowledge_relations').all();
  const state=detectGeography(rows,q);
  if(!state) return null;
  const requestedYear=yearFrom(q);
  const cityStates=new Map();
  for(const row of rows) {
    const parent=geoRelation(row);
    if(parent && ((state==='brasil' && UF_NAMES.has(parent)) || parent===state)) cityStates.set(normalize(row.subject),parent);
  }
  const capitals=new Set(rows.filter(row=>row.predicate==='tem_capital').map(row=>normalize(row.object)));
  const allowedStates=region?new Set(rows.filter(row=>['localizado_em','fica_em'].includes(row.predicate)&&normalize(row.object)===normalize(region)).map(row=>normalize(row.subject))):null;
  for(const [city,uf] of cityStates)if(scope==='capitals'&&!capitals.has(city)||allowedStates&&!allowedStates.has(uf))cityStates.delete(city);
  const measures=[];
  for(const row of rows) {
    const m=measure(row);
    if(m?.kind===kind && cityStates.has(normalize(row.subject))) measures.push({name:normalize(row.subject),...m});
  }
  const filtered=measures.filter(m=>!requestedYear || m.year===requestedYear);
  const years = [...new Set(filtered.map(m => m.year))];
  const datedYears = years.filter(Boolean).sort((a, b) => b - a);
  const meta = {
    intent: 'numeric-ranking', entity: state, metric: kind,
    requestedYear: requestedYear || null, availableYears: years,
    parser: 'numeric-relational', neuralUsedForAnswer: false
  };
  if (!filtered.length) {
    return {
      kind: 'semantic-data-gap',
      answer: `Entendi que você quer comparar municípios ${state==='brasil'?'do Brasil':`de ${cap(state)}`} por ${kind === 'area' ? 'extensão territorial' : kind === 'population' ? 'população' : 'PIB'}, mas ainda não tenho medidas municipais comparáveis para montar essa lista. Você pode me ajudar a aprender sobre esse assunto?`,
      interpretation: meta,
      explanation: 'Não encontrei municípios ligados ao estado com valores numéricos da medida solicitada.'
    };
  }
  // Agrupa por ano: 0 significa desconhecido, não um ano conflitante.
  // Prefere o conjunto mais abrangente de municípios distintos sem misturar anos.
  // Em empate, prefere os dados datados mais recentes.
  const groups = new Map();
  for (const m of filtered) {
    if (!groups.has(m.year)) groups.set(m.year, []);
    groups.get(m.year).push(m);
  }
  const includeAll=wantsAll(q);
  const candidateYears = [...groups.keys()].sort((a, b) => {
    const countA = new Set(groups.get(a).map(m => m.name)).size;
    const countB = new Set(groups.get(b).map(m => m.name)).size;
    return countB - countA || b - a;
  });
  const selectedYear = requestedYear || candidateYears[0];
  const comparable = includeAll ? filtered : (groups.get(selectedYear) ?? []);
  const discarded = includeAll?0:filtered.length - comparable.length;
  const missingYearCount = filtered.filter(m => !m.year).length;
  const byName=new Map();
  for(const m of comparable) {const old=byName.get(m.name); if(!old || (m.year||0)>(old.year||0)) byName.set(m.name,m);}
  const asc=/\b(?:menor(?:es)?|menos)\b/.test(q);
  const singular=/\b(?:maior|menor)\s+(?:cidade|municipio)\b|\b(?:cidade|municipio)\s+(?:maior|menor)\b/.test(q);
  const allSorted=[...byName.values()].sort((a,b)=>asc?a.value-b.value:b.value-a.value || a.name.localeCompare(b.name));
  const threshold=wantsThreshold(q);
  const thresholdValue=threshold?sortValue(threshold[1]):null;
  const thresholdLow=/abaixo|inferior|menos/.test(threshold?.[0]||'');
  const sorted=threshold && Number.isFinite(thresholdValue) ? allSorted.filter(m=>thresholdLow?m.value<thresholdValue:m.value>thresholdValue) : allSorted;
  const pos=ordinal(q);
  const rank=pos || 1;
  const n=limitOf(q);
  const top=singular ? sorted.slice(rank-1,rank) : sorted.slice(0,n);
  // Estatísticas sobre o MESMO conjunto selecionado para os rankings.
  // Em conjunto par, a mediana é a média dos dois valores centrais,
  // portanto pode não corresponder à área/população de uma cidade existente.
  if (statistic) {
    const points=[...sorted].sort((a,b)=>a.value-b.value || a.name.localeCompare(b.name));
    const size=points.length;
    const label={area:'área territorial',population:'população',gdp:'PIB'}[kind];
    const unit={area:'km²',population:'habitantes',gdp:'R$'}[kind];
    const formatter=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3});
    const valueText=value=>kind==='gdp'?`R$ ${formatter.format(value)}`:`${formatter.format(value)} ${unit}`;
    const entityText=state==='brasil'?'do Brasil':`de ${cap(state)}`;
    if (!size) return {kind:'semantic-data-gap',answer:`Ainda não tenho valores disponíveis para calcular essa estatística dos municípios ${entityText}.`,interpretation:{...meta,operation:statistic,count:0}};
    const middleLeft=points[Math.floor((size-1)/2)];
    const middleRight=points[Math.floor(size/2)];
    const median=(middleLeft.value+middleRight.value)/2;
    const mean=points.reduce((acc,m)=>acc+m.value,0)/size;
    const middleRows=size%2===0?[middleLeft,middleRight]:[middleLeft];
    const names=middleRows.map(m=>cap(readable(m.name))).join(' e ');
    const sentence=statistic==='mean'
      ? `A média de ${label} entre os ${size} municípios ${entityText} com valores comparáveis é ${valueText(mean)}.`
      : statistic==='median'
        ? `A mediana de ${label} desses ${size} municípios é ${valueText(median)}.${size%2===0?` Como a lista tem um número par de cidades, calculei a média entre os dois valores centrais (${names}).`:''}`
        : size%2===0
          ? `Há duas cidades no meio da lista de ${size} municípios ${entityText}: ${names}, com ${valueText(middleLeft.value)} e ${valueText(middleRight.value)}. Não existe uma única cidade central.`
          : `${names} fica no meio da lista de ${size} municípios ${entityText}, com ${valueText(middleLeft.value)}.`;
    const qualification=` Estou considerando somente os municípios com dados disponíveis, não todas as cidades ${entityText}.`;
    const periodNote=discarded?` Deixei ${discarded} medida(s) de outros períodos fora desta comparação.`:'';
    const unknownYear=!selectedYear?' O ano dessas medidas não foi informado.':'';
    const mixed=includeAll && new Set(filtered.map(m=>m.year)).size>1?' Atenção: os dados podem ser de períodos diferentes.':'';
    return {kind:'numeric-statistics',answer:sentence+qualification+periodNote+unknownYear+mixed,
      path:points.map(m=>m.source),source:'knowledge_relations',
      interpretation:{...meta,operation:statistic,year:selectedYear||null,count:size,
        sum:points.reduce((acc,m)=>acc+m.value,0),mean,median,sortedValues:points.map(({name,value,year})=>({name,value,year})),
        middle:middleRows.map(({name,value})=>({name,value})),includeAll,excludedOtherPeriods:discarded,undated:!selectedYear},
      explanation:`Usei ${size} valores de ${label} recuperados do SQLite. Ordenei numericamente os valores e calculei ${statistic==='mean'?'a soma dividida pela quantidade':statistic==='median'?'a mediana do conjunto':'a posição central do conjunto'}.`};
  }
  const requestedNames=allSorted.filter(m=>new RegExp(`(?:^|\\s)${m.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replaceAll('_',' ')}(?=\\s|$)`).test(q));
  const number=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2});
  const unit=kind==='area'?'km²':kind==='population'?'habitantes':'R$';
  const label=kind==='area'?'área territorial':kind==='population'?'população':'PIB';
  const year=selectedYear || null;
  const periodNote = !includeAll && !year
    ? ' As medidas selecionadas não têm ano de referência registrado; confira a origem antes de utilizá-las como ranking oficial.'
    : '';
  const exclusionNote = !includeAll && discarded
    ? ` Para não misturar períodos, deixei de fora ${discarded} medida(s) de outros períodos ou sem data.`
    : '';
  const lines=top.map((m,i)=>`${singular?rank:i+1}. ${cap(readable(m.name))}: ${kind==='gdp'?'R$ ':''}${number.format(m.value)}${kind==='gdp'?'':` ${unit}`}`);
  const singularAnswer = singular && top.length
    ? `Entre os municípios ${state==='brasil'?'do Brasil':`de ${cap(state)}`} com medidas cadastradas${!includeAll&&year?` para ${year}`:''}, ${cap(readable(top[0].name))} ocupa a posição ${rank} entre os ${asc?'menores':'maiores'} em ${label}, com ${number.format(top[0].value)} ${unit}. Esta conclusão considera ${sorted.length} município(s) com dados disponíveis; não garante o extremo de todo o estado.${periodNote}${exclusionNote}`
    : null;
  const dataWarning = includeAll && new Set(filtered.map(m=>m.year)).size>1 ? ' Incluí todos os registros disponíveis, mas há datas diferentes ou desconhecidas: esta lista é apenas exploratória e não representa um ranking temporalmente comparável.' : '';
  if(singular && !top.length) return {kind:'numeric-ranking',answer:`Tenho apenas ${sorted.length} municípios com dados disponíveis para esta comparação; não encontrei a posição ${rank}.`,interpretation:{...meta,position:rank,available:sorted.length,includeAll}};
  if (/\b(?:depois|antes)\b/.test(q) && requestedNames.length===1) {const index=allSorted.findIndex(m=>m.name===requestedNames[0].name);const next=allSorted[index+(/\bdepois\b/.test(q)?1:-1)];return {kind:'numeric-ranking',answer:next?`Nos dados comparáveis cadastrados, ${cap(readable(next.name))} vem ${/\bdepois\b/.test(q)?'depois':'antes'} de ${cap(readable(requestedNames[0].name))} na classificação por ${label}, com ${number.format(next.value)} ${unit}.`:'Não encontrei outra posição nessa direção entre os municípios com dados disponíveis.',path:next?[next.source]:[],interpretation:{...meta,operation:'neighbor',anchor:requestedNames[0].name,neighbor:next?.name??null}};}
  if (wantsDifference(q) && requestedNames.length===2) {const [a,b]=requestedNames;return {kind:'numeric-ranking',answer:`A diferença de ${label} entre ${cap(readable(a.name))} e ${cap(readable(b.name))}, nos dados cadastrados, é ${number.format(Math.abs(a.value-b.value))} ${unit}.${dataWarning}`,path:[a.source,b.source],interpretation:{...meta,operation:'difference',items:[a,b],includeAll}};}
  return {kind:'numeric-ranking',answer:singularAnswer ? singularAnswer+dataWarning : `Entre os municípios de ${cap(state)} com dados de ${label} cadastrados${!includeAll&&year?` para ${year}`:''}, a ordenação ${asc?'crescente':'decrescente'} dos registros disponíveis é:\n${lines.join('\n')}\nEsta é uma classificação parcial dos ${sorted.length} municípios com dados disponíveis, não necessariamente de todos os municípios do estado.${periodNote}${exclusionNote}${dataWarning}`,path:top.map(m=>m.source),source:'knowledge_relations',interpretation:{...meta,year,excludedWithoutYear:year?missingYearCount:0,excludedOtherPeriods:discarded,selectedYearGroup:year,undated:!year,sort:asc?'ascending':'descending',singular,position:rank,requestedLimit:n,includeAll,threshold:thresholdValue,count:sorted.length,ranking:top.map(({name,value,year})=>({name,value,year}))},explanation:`Li os valores numéricos no SQLite, selecionei municípios pertencentes a ${cap(state)}, apliquei a política de comparação de períodos e ordenei ${sorted.length} registros por ${label}.`};
}
