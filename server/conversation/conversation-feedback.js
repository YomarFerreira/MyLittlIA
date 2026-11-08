/**
 * Interpreta comentários sobre a estratégia de resposta sem convertê-los
 * em novos fatos, pedidos de pontuação ou ensinamentos.
 * As verificações são realizadas sobre o SQLite atual; não inventam medidas.
 */
import { normalize } from '../persistence/database.js';
import { readableName } from '../language/proper-names.js';

const UF = new Set([
  'acre','alagoas','amapa','amazonas','bahia','ceara','distrito federal',
  'espirito santo','goias','maranhao','mato grosso','mato grosso do sul',
  'minas gerais','para','paraiba','parana','pernambuco','piaui',
  'rio de janeiro','rio grande do norte','rio grande do sul','rondonia',
  'roraima','santa catarina','sao paulo','sergipe','tocantins'
]);
const PLACE_RELATIONS=new Set(['pertence_a','municipio_de','fica_em','localizado_em']);
const FEEDBACK=/\b(?:inferir|inferencia|comparar|compare|comparacao|cruzar|cruze|deduzir|deduza|consulte|consultar|verifique|verificar|ja tem|ja possui|voce tem|vc tem|dados que tem|informacoes que tem|usar o que sabe|pode ver qual)\b/;
const METRIC_PREDICATE=/\b(?:populacao|habitantes|numero_de_habitantes)\b/;
const POPULATION_DESCRIPTION=/\bpopulacao(?: estimada)?(?: de)?\s*[:=]?\s*([\d., ]+)\s*(?:habitantes|pessoas)\b/;

function numericalValue(raw) {
  const text=String(raw).trim().replace(/\s/g,'');
  let number=text;
  if(text.includes(',') && text.includes('.')) number=text.replaceAll('.','').replace(',','.');
  else if(text.includes(',')) number=text.replace(',','.');
  else if(/^\d{1,3}(?:\.\d{3})+$/.test(text)) number=text.replaceAll('.','');
  const parsed=Number(number);
  return Number.isFinite(parsed) && parsed>=0 ? parsed : null;
}
function populationOf(row) {
  const object=String(row.object).replaceAll('_',' ');
  if(METRIC_PREDICATE.test(normalize(row.predicate))) {
    const n=object.match(/^\s*([\d., ]+)\s*(?:habitantes|pessoas|em\s+\d{4}|$)/i)?.[1];
    if(n) return numericalValue(n);
  }
  const match=normalize(object).match(POPULATION_DESCRIPTION);
  return match?numericalValue(match[1]):null;
}
function yearOf(object) {return Number(String(object).match(/\b(?:19|20)\d{2}\b/)?.[0]||0);}

export function inspectBrazilianCityCoverage(db) {
  const rows=db.prepare('SELECT id,subject,predicate,object FROM knowledge_relations').all();
  const municipalities=new Map();
  const referenced=new Set();
  for(const row of rows) {
    const subject=normalize(row.subject.replaceAll('_',' '));
    const object=normalize(row.object.replaceAll('_',' '));
    const predicate=normalize(row.predicate).replaceAll(' ','_');
    if(PLACE_RELATIONS.has(predicate) && UF.has(object) && !UF.has(subject))municipalities.set(subject,object);
    if(UF.has(subject) && object.startsWith('municipio populoso de referencia '))referenced.add(`${subject}:${object}`);
  }
  const measurements=[];
  for(const row of rows) {
    const city=normalize(row.subject.replaceAll('_',' '));
    const state=municipalities.get(city);
    if(!state) continue;
    const value=populationOf(row);
    if(value!==null)measurements.push({city,state,value,year:yearOf(row.object),row});
  }
  const yearGroups=new Map();
  for(const item of measurements) {
    if(!yearGroups.has(item.year))yearGroups.set(item.year,[]);
    yearGroups.get(item.year).push(item);
  }
  const years=[...yearGroups.keys()].sort((a,b)=>new Set(yearGroups.get(b).map(x=>x.city)).size-new Set(yearGroups.get(a).map(x=>x.city)).size || b-a);
  const selectedYear=years[0]??null;
  const eligible=selectedYear===null?[]:(yearGroups.get(selectedYear)||[]);
  const unique=new Map();for(const item of eligible) unique.set(item.city,item);
  const ranking=[...unique.values()].sort((a,b)=>b.value-a.value);
  return {
    referenceCount:referenced.size,
    affiliatedMunicipalities:municipalities.size,
    measuredMunicipalities:new Set(measurements.map(x=>x.city)).size,
    comparableCount:ranking.length,
    selectedYear,
    statesWithMeasurements:new Set(ranking.map(x=>x.state)).size,
    leader:ranking[0]||null,
    comparisonRows:ranking.slice(0,10).map(x=>x.row)
  };
}

export function reasoningFeedbackAnswer(db,text,semanticState) {
  if(semanticState?.operation!=='ranking' || semanticState.property!=='population')return null;
  const q=normalize(text);
  if(q.length<24 || !FEEDBACK.test(q) || !/\b(?:cidade|cidades|municipio|municipios|estado|estados|brasil|populacao|maior|maiores)\b/.test(q))return null;
  const coverage=inspectBrazilianCityCoverage(db);
  const stats=coverage.referenceCount
    ? `Encontrei ${coverage.referenceCount} referências a municípios populosos nos estados.`
    : 'Não encontrei uma lista consolidada de municípios populosos nas relações consultadas.';
  let conclusion;
  if(coverage.leader) {
    const leader=coverage.leader;
    const value=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:0}).format(leader.value);
    conclusion=`Tenho medidas comparáveis de ${coverage.comparableCount} municípios em ${coverage.statesWithMeasurements} estado(s). Nesse conjunto, ${readableName(leader.city,db)} aparece com a maior população registrada (${value} habitantes${coverage.selectedYear?`, em ${coverage.selectedYear}`:', sem ano informado'}). Isso ainda não prova que seja a cidade mais populosa do Brasil, porque a cobertura é parcial.`;
  } else {
    conclusion=`Porém, não encontrei medidas numéricas de população municipal vinculadas aos estados que permitam comparar essas cidades entre si. Saber quais são as maiores de cada estado, sem valores comparáveis, não basta para descobrir a maior do país.`;
  }
  const answer=`Você tem razão em sugerir que eu compare o que já conheço, em vez de pedir mais informações imediatamente. ${stats} ${conclusion}`;
  return {
    kind:'semantic-reasoning-feedback',answer,semanticState,
    path:coverage.comparisonRows,
    interpretation:{intent:'reasoning-feedback',parser:'conversation-feedback',operation:'inspect-existing-data',
      entity:semanticState.entity,property:semanticState.property,
      referenceCount:coverage.referenceCount,measuredMunicipalities:coverage.measuredMunicipalities,
      comparableCount:coverage.comparableCount,selectedYear:coverage.selectedYear,
      neuralUsedForAnswer:false},
    explanation:'A mensagem é uma sugestão de raciocínio sobre o conhecimento existente, não um fato novo. Conferi as referências a municípios e a disponibilidade de valores numéricos, preservando o critério da conversa.'
  };
}
