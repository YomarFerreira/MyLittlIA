import {explainWording} from './wording-explanation.js';
import {selfAwarenessAnswer} from '../reasoning/self-awareness.js';
import {buildGeographicIndex,geographicalPath} from '../reasoning/geographic-hierarchy.js';
import {classificationMatches} from '../language/lexical-equivalence.js';
import {propertyQueryAnswer,propertyOfText} from '../reasoning/property-query.js';
import {entityFactAnswer} from '../knowledge/entity-facts.js';
import {temporalAnswer} from '../reasoning/temporal.js';
import {readableName} from '../language/proper-names.js';
import {renderConversationalTemplate} from '../language/response-templates.js';
import {normalize} from '../persistence/database.js';
import {getSemanticState,saveSemanticState} from '../reasoning/semantic-core.js';
import {resolveEntityText} from '../knowledge/entity-identity.js';
import {geographicMention,conceptInQuestion} from '../language/lexical-equivalence.js';
import {choiceCatalog,interpretChoice} from './dialogue-choices.js';
import {numericRankingAnswer,municipalMeasureAnswer,rankingPosition} from '../reasoning/numeric-rankings.js';

const n=value=>normalize(String(value??'').replaceAll('_',' '));
const esc=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const has=(text,phrase)=>new RegExp(`(?:^|\\s)${esc(n(phrase))}(?=$|\\s)`).test(n(text));
const cardinals=new Map(['zero','um','dois','tres','quatro','cinco','seis','sete','oito','nove','dez'].map((word,i)=>[word,i]));
const social=q=>/^(?:oi|ola|obrigado|obrigada|valeu|ok|certo|entendi|sim|claro|bom dia|boa tarde|boa noite)$/.test(q);
const question=q=>/^(?:qual|quais|quantos|quantas|quem|onde|quando|como|o que|me diga|me conte|fale sobre|voce sabe)\b/.test(q);
const short=q=>q.split(' ').length<=16;
const propertyKey=value=>({gdp:'pib',titles:'titulos',colors:'cores',color:'cores',sound:'som',population:'population',area:'area'})[value]??value;
const propertyLabel=value=>({area:'extensão territorial',population:'população',pib:'PIB',capital:'capital',cores:'cores',som:'som'})[value]??String(value??'').replaceAll('_',' ');
function amount(q) {
 const match=q.match(/\b(?:mostre|liste|mostrar|listar|quero|apenas|somente|top)\s+(?:(?:os|as)\s+)?(\d{1,2}|um|dois|tres|quatro|cinco|seis|sete|oito|nove|dez)\b/)
  ??q.match(/\b(\d{1,2}|um|dois|tres|quatro|cinco|seis|sete|oito|nove|dez)\s+(?:maiores|menores|primeiros|primeiras)\b/);
 return match?Math.max(1,Math.min(50,cardinals.get(match[1])??Number(match[1]))):null;
}
function mentionedEntity(db,text) {
 const q=n(resolveEntityText(db,text));
 const names=db.prepare('SELECT DISTINCT subject AS entity FROM knowledge_relations').all();
 return names.filter(row=>has(q,row.entity)).sort((a,b)=>b.entity.length-a.entity.length)[0]?.entity??null;
}
function mentionedPlace(db,text) {
 const direct=geographicMention(db,text);if(direct)return direct;
 const q=n(text);
 for(const row of db.prepare("SELECT phrase,canonical FROM semantic_terms WHERE kind='entity_alias' AND active=1 ORDER BY length(phrase) DESC").all()) {
  for(const label of [row.phrase,row.canonical])if(new RegExp(`(?:^|\\s)(?:de|do|da|em|no|na)\\s+${esc(n(label))}$`).test(q))return {canonical:n(row.canonical),phrase:n(label)};
 }
 return null;
}
function optionsFor(db,result) {
 const answer=n(result?.answer),pending=/qual criterio|quer comparar|preciso saber a competicao/.test(answer);
 if(!pending)return [];
 const options=choiceCatalog(db).map(option=>({...option,position:Math.min(...option.aliases.map(alias=>{const i=answer.indexOf(n(alias));return i<0?Infinity:i;}))})).filter(o=>Number.isFinite(o.position));
 if(/competicao/.test(answer)&&result?.interpretation?.metric==='titulos')for(const row of db.prepare('SELECT DISTINCT competition FROM entity_facts WHERE competition IS NOT NULL').all()) {
  if(has(answer,row.competition))options.push({id:'competition:'+row.competition,aliases:[row.competition],position:answer.indexOf(n(row.competition))});
 }
 return options.length>=2?options.sort((a,b)=>a.position-b.position):[];
}
function properties(db) {
 const values=[...choiceCatalog(db),{id:'capital',aliases:['capital']},{id:'cores',aliases:['cores','cor']},{id:'som',aliases:['som','sons','vocalização']},{id:'alimentacao',aliases:['alimentação','comida']},{id:'localizacao',aliases:['localização','onde fica']}];
 for(const row of db.prepare('SELECT property,alias FROM entity_fact_aliases').all()) {
  let item=values.find(item=>item.id===row.property);
  if(!item){item={id:row.property,aliases:[]};values.push(item);}item.aliases.push(row.alias);
 }
 return values;
}
function render(frame) {
 if(frame.operation==='ranking'||frame.operation==='statistics') {
  const group=String(frame.entityClass??'entidades').replaceAll('_',' ');
  const direction=frame.order==='ascending'?'menores':'maiores';
  const place=frame.location?` de ${frame.location}`:'';
  const metric=frame.property?` por ${propertyLabel(frame.property)}`:'';
  const competition=(frame.competition?` em ${frame.competition}`:'')+(frame.year?` em ${frame.year}`:'');
  if(frame.operation==='statistics')return `Qual a ${frame.statistic} de ${group}${place}${metric}${competition}?`;
  if((frame.position??1)>1)return `Qual a ${frame.position}a ${frame.order==='ascending'?'menor':'maior'} ${group}${place}${metric}${competition}?`;
  return `Quais os ${frame.limit??1} ${direction} ${group}${place}${metric}${competition}?`;
 }
 if(frame.operation==='listing')return `Quais ${frame.property?(frame.propertyLabel??propertyLabel(frame.property))+' dos ':''}${String(frame.entityClass).replaceAll('_',' ')}${frame.location?' de '+frame.location:''}?`;
 if(frame.relational&&frame.relationObject)return `${frame.entity} ${frame.property} ${frame.relationObject}?`;
 if(frame.operation==='definition')return `O que é ${frame.entity}?`;
 if(['bebe','come'].includes(frame.propertyLabel))return `O que ${frame.entity} ${frame.propertyLabel}?`;
 if(frame.template&&frame.entity)return frame.template.replaceAll('{entity}',frame.entity);
 return `Qual ${frame.propertyLabel??propertyLabel(frame.property)} de ${frame.entity}?`;
}
function clarification(answer,frame) {
 return {frame,changes:[],result:{kind:'dialogue-focus-clarification',answer,path:[],interpretation:{intent:'clarify-focus',parser:'shared-focus',neuralUsedForAnswer:false},explanation:'A continuação não identifica um foco ou uma alteração sem ambiguidade.'},preserve:true};
}
export function getConversationFocus(db,id) {
 const state=getSemanticState(db,id);if(!state)return null;
 if(Object.hasOwn(state,'focus'))return state.focus;
 // Upgrade an existing conversation's structured state without searching old topics.
 if(!['comparison','ranking','lookup','relational-query','definition'].includes(state.operation))return null;
 const messages=db.prepare('SELECT role,content FROM conversation_messages WHERE conversation_id=? ORDER BY rowid DESC LIMIT 2').all(id);
 const last=messages.find(row=>row.role==='user')?.content??'';
 if(state.lastUserText&&n(last)!==n(state.lastUserText))return null;
 const query=state.query??state.originalQuestion??last;
 if(!query||!state.entity&& !state.objectType)return null;
 const ranking=['comparison','ranking'].includes(state.operation),answer=messages.find(row=>row.role==='assistant')?.content??'';
 const entity=ranking?null:state.entity;
 return {operation:ranking?'ranking':state.operation==='definition'?'definition':'lookup',
  entity,entityClass:ranking?state.objectType:null,location:ranking?state.entity:null,
  property:propertyKey(state.operation==='ranking'?state.property:state.metric??state.property),
  limit:state.requestedLimit??1,position:state.position??1,order:state.order??(state.ascending?'ascending':'descending'),
  relational:state.operation==='relational-query',relationObject:state.relationObject??null,
  query,sourceQuestion:query,template:entity?n(query).replace(new RegExp(`\\b${esc(n(entity))}\\b`,'g'),'{entity}'):null,
  options:optionsFor(db,{answer}),pending:state.pendingClarification??null,
  lastUserText:last,lastResult:{answer,path:[],explanation:'Foco recuperado do estado estruturado da conversa anterior; não há evidências adicionais armazenadas nesse estado antigo.'}};
}

export function prepareFocus(db,text,id) {
 const previous=getConversationFocus(db,id),q=n(text);
 if(['capabilities','identity','version','origin-unverified','learning-status','clock','date'].includes(selfAwarenessAnswer(db,text)?.interpretation?.intent))return null;
 const explicitRanking=/\b(?:maior|maiores|menor|menores)\s+(?!(?:de|do|da|deles|delas|entre)\b)[a-z]+/.test(q);
 const continuation=short(q)&&(/^(?:e\b|agora\b|mostre\b|liste\b|por\b|pela\b|pelo\b|so\b|apenas\b|somente\b)/.test(q)||/^(?:por que|porque|explique|como assim)\b/.test(q));
 if(!previous) {
  if(continuation&&/^e\b/.test(q)&&!explicitRanking&&!question(q.replace(/^e\s+/,'')))return clarification('O que você quer consultar sobre essa entidade ou localidade?',null);
  if(continuation&&!mentionedEntity(db,text)&&!/[a-z]+\s+(?:do|da|de)\s+[a-z]+/.test(q)&&!question(q.replace(/^e\s+/,'')))return clarification('Sobre qual entidade ou conjunto você quer continuar?',null);
  return null;
 }
 const wording=explainWording(db,text,previous);
 if(wording)return {frame:previous,changes:['operation'],preserve:true,result:wording};
 if(previous.operation==='temporal'&&/\b(?:amanha|ontem|hoje|dias|semana|mes|ano|horas)\b/.test(q)) {
  const anchor=[{role:'assistant',content:previous.lastResult?.answer??''}];
  let result=temporalAnswer(text,anchor);
  const hour=previous.lastResult?.answer?.match(/\b\d{1,2}:\d{2}\b/)?.[0];
  if(!result&&hour&&/amanha/.test(q)&&/hora/.test(q))result={kind:'temporal-calculation',answer:`Amanhã, a esta mesma hora, serão ${hour}.`,path:[],interpretation:{intent:'temporal-follow-up',parser:'shared-focus',neuralUsedForAnswer:false},explanation:'Mantive o horário da resposta anterior e alterei a referência para amanhã.'};
  if(result)return {frame:previous,query:text,changes:['operation'],result};
 }
 const verificationTarget=mentionedEntity(db,text);
 const verification=(!verificationTarget||n(verificationTarget)===n(previous.entity)||n(verificationTarget)===n(previous.location))&&(/^(?:isso|essa informacao|essa resposta|voce tem certeza|tem certeza|como sabe|qual (?:e )?a fonte)\b/.test(q)||/\b(?:verificar|confirmar|comprovar)\b/.test(q)&&/\b(?:isso|essa informacao|essa resposta)\b/.test(q))&&/\b(?:verdade|confiavel|certeza|sabe|fonte|evidencia|verificar|confirmar|comprovar)\b/.test(q);
 if(verification||/^(?:por que|porque|explique(?: isso| melhor)?|como assim)$/.test(q)) {
  const last=previous.lastResult??{};
  const details=[verification?`Para verificar essa informação sobre ${readableName(previous.entity??previous.location??'o assunto atual',db)}, precisamos de fontes confiáveis, indicadores comparáveis e período de referência. A pergunta anterior não comprova a afirmação.`:null,last.explanation,last.path?.length?`Usei ${last.path.length} registro(s) como evidência.`:null,last.answer?`Resposta a que estou me referindo: ${last.answer}`:null].filter(Boolean).join('\n\n');
  return {frame:previous,changes:['operation'],preserve:true,result:{kind:'dialogue-focus-explanation',answer:details||'Não tenho evidências suficientes para explicar a resposta anterior.',path:last.path??[],interpretation:{intent:'explain-current-answer',parser:'shared-focus',focus:previous,neuralUsedForAnswer:false},explanation:'Recuperei a justificativa e as evidências da última resposta deste foco, sem recalcular outro assunto.'}};
 }
 if(explicitRanking&&!['ranking','statistics'].includes(previous.operation))return null;
 if(social(q))return {frame:previous,preserve:true,changes:[]};
 const bare=q.replace(/^(?:(?:ok|sim|entao|certo|bem|e|agora)\s+)+/,'');
 const reference=/\b(?:ele|ela|eles|elas|dele|dela|deles|delas)\b/.test(q);
 const namedClass=db.prepare("SELECT DISTINCT object FROM knowledge_relations WHERE predicate='e_um'").all().some(row=>conceptInQuestion(db,text,row.object));
 const sameRankingClass=['ranking','statistics'].includes(previous.operation)&&previous.entityClass&&explicitRanking&&conceptInQuestion(db,text,previous.entityClass);
 if(((question(bare)&&(question(q)&&!reference||mentionedEntity(db,text)||namedClass))||/^(?:liste|mostre)\b/.test(bare)&&namedClass&&!amount(q))&&!sameRankingClass)return null;
 if(/\b(?:outro assunto|mudando de assunto|mudar de assunto)\b/.test(q))return null;
 const frame={...previous},changes=[];
 const choices=previous.options??[];
 const choice=choices.length?interpretChoice(text,choices):null;
 let delegated=false;
 if(choice) {
  if(choice.option.id.startsWith('competition:'))frame.competition=choice.option.id.slice(12);
  else frame.property=choice.option.id;
  frame.options=[];frame.pending=null;changes.push('property');delegated=choice.delegated;
 }
 const propertyMatches=(previous.operation==='ranking'||previous.operation==='statistics'?choiceCatalog(db):properties(db)).filter(option=>option.aliases.some(alias=>has(q,alias)));
 const propertyIds=[...new Set(propertyMatches.map(o=>o.id))];
 const modification=(/^(?:e|agora|por|pela|pelo|mostre|liste|quero|apenas|somente|so|os|as|a|o|prefiro|vamos|ok|sim|pode|sei|sem)\b/.test(q)&&short(q))||propertyMatches.some(option=>option.aliases.some(alias=>n(alias)===q));
 if(!choice&&modification&&propertyIds.length===1&&!/\b(?:nao|ou)\b/.test(q)) {frame.property=propertyIds[0];frame.propertyLabel=propertyMatches[0].aliases.find(alias=>has(q,alias));frame.template=null;changes.push('property');}
 if(!choice&&choices.length&&modification&&(/\b(?:ou|qualquer|escolh|opcao)\b/.test(q)||propertyIds.length>1))return clarification('Não ficou claro qual opção você escolheu. Você pode indicar uma das opções ou deixar a escolha comigo.',previous);
 const year=q.match(/\b((?:19|20)\d{2})\b/);
 if(year&&modification){frame.year=Number(year[1]);changes.push('period');}
 const describedProperty=propertyOfText(q);
 if(describedProperty&&previous.operation==='lookup'&&(reference||modification)&&!changes.includes('property')) {
  frame.property=propertyKey(describedProperty.id);frame.propertyLabel=describedProperty.label;frame.template=null;frame.relational=false;frame.relationObject=null;changes.push('property');
 }
 if(/^(?:somente|apenas|so) as? capitais$/.test(q)){frame.scope='capitals';changes.push('filter');}
 if(/^do nordeste$/.test(q)){frame.region='nordeste';changes.push('region');}
 const count=amount(q);
 if(count&&modification){frame.operation=previous.operation==='listing'?'listing':'ranking';frame.position=1;frame.limit=count;changes.push('quantity');}
 if(modification&&/\bmenor(?:es)?\b/.test(q)){frame.operation='ranking';frame.order='ascending';frame.position=1;changes.push('order');}
 if(modification&&/\bmaior(?:es)?\b/.test(q)){frame.operation='ranking';frame.order='descending';frame.position=1;changes.push('order');}
 const position=rankingPosition(q);
 if(position&&modification){frame.operation='ranking';frame.position=position;frame.limit=1;changes.push('position');}
 const statistic=q.match(/\b(media|mediana|soma|do meio|central)\b/);
 if(modification&&statistic){frame.operation='statistics';frame.statistic=statistic[1];changes.push('operation');}
 const unknownDefinition=previous.operation==='definition'?q.match(/^e\s+(?:um|uma)\s+(.+)$/):null;
 if(unknownDefinition){frame.entity=unknownDefinition[1];changes.push('entity');}
 const target=mentionedEntity(db,text);
 if(previous.relational&&/^e\s+/.test(q)&&!question(q.replace(/^e\s+/,''))&&!changes.length) {
  const object=q.replace(/^e\s+(?:(?:o|a|os|as)\s+)?/,'');
  const subjectChange=target&&/^e\s+(?:o|a|os|as)\s+/.test(q)&&db.prepare('SELECT 1 FROM knowledge_relations WHERE subject=? AND predicate=? LIMIT 1').get(target,previous.property);
  if(subjectChange){frame.entity=target;frame.relationObject=null;changes.push('entity');}
  else if(object&&!/^(?:um|uma|maior|menor|maiores|menores|por|onde|quando|hoje|amanha)\b/.test(object)){frame.relationObject=object;changes.push('object');}
 }

 const place=mentionedPlace(db,text)||mentionedPlace(db,String(text).split(/\s+por\s+/i)[0]);
 if(modification&&place) {
  if(frame.operation==='ranking'||frame.operation==='statistics'){frame.location=place.canonical;changes.push('location');}
  else {frame.entity=place.canonical;changes.push('entity');}
 } else if(!previous.relational&&modification&&target&&/^(?:e\b|agora\b)/.test(q)) {
  if(frame.operation==='lookup'||frame.operation==='definition'){frame.entity=target;changes.push('entity');}
  else if(changes.includes('property')){frame.operation='lookup';frame.entity=target;frame.entityClass=null;frame.template=null;changes.push('entity','operation');}
  else if(target!==frame.entityClass)return clarification(`O que você gostaria de saber sobre ${readableName(target,db)}? Quer compará-la com o grupo anterior ou consultar uma propriedade?`,previous);
 }
 // Complete new questions establish their own focus, not a patch to the previous one.
 if(question(q)&&!choice&&!sameRankingClass)return null;
 if(!changes.length) {
  if(/^(?:somente|apenas|so)\b/.test(q))return clarification('Identifiquei uma restrição, mas ainda não consigo aplicá-la com segurança ao conjunto atual. Pode indicar a entidade, propriedade ou quantidade que deseja alterar?',previous);
  if(continuation||modification&&/\b(?:ele|ela|eles|elas|deles|delas|isso)\b/.test(q))return clarification('Não consegui identificar com segurança o que você quer mudar no assunto atual. Pode indicar a entidade, o critério ou a quantidade?',previous);
  return null;
 }
 if(previous.operation==='listing'&&changes.includes('order')&&!changes.includes('property')) {
  frame.property=null;frame.pending='metric';frame.operation='ranking';
  return clarification(renderConversationalTemplate(db,'focus-ranking-criteria',{subject:String(frame.entityClass).replaceAll('_',' ')})??'Qual critério você quer usar para ordenar esse conjunto?',frame);
 }
 if((changes.includes('quantity')||changes.includes('order'))&&!['ranking','statistics','listing'].includes(frame.operation))return clarification('Para ordenar ou limitar resultados, preciso saber qual conjunto você quer comparar.',previous);
 if((choices.length||previous.pending)&&!choice&&changes.length) {
  const prompt=changes.includes('order')&&previous.pending==='competition'?renderConversationalTemplate(db,'focus-ranking-criteria',{subject:String(frame.entityClass??'entidades').replaceAll('_',' ')}):null;
  return clarification(prompt??('Antes de continuar, preciso esclarecer o critério ou a opção pendente: '+choices.map(option=>propertyLabel(option.id)).join(', ')+'.'),frame);
 }
 const query=render(frame);
 let result=null;
 if(frame.operation==='listing') {
  const index=buildGeographicIndex(db);
  const memberships=db.prepare("SELECT * FROM knowledge_relations WHERE predicate='e_um'").all().filter(row=>classificationMatches(db,row.object,frame.entityClass));
  const eligible=[...new Set(memberships.map(row=>row.subject))].filter(entity=>!frame.location||geographicalPath(index,entity,frame.location)).sort((a,b)=>readableName(a,db).localeCompare(readableName(b,db),'pt-BR'));
  const selected=eligible.slice(0,frame.limit??10),path=memberships.filter(row=>selected.includes(row.subject));
  const lines=selected.map(entity=>{
   const name=readableName(entity,db);
   if(!frame.property)return name;
   const request=`Quais ${frame.propertyLabel??propertyLabel(frame.property)} de ${name}?`;
   const found=entityFactAnswer(db,request)||propertyQueryAnswer(db,request,entity);
   if(found?.path)path.push(...found.path);
   return `${name}: ${found?.answer??'Não tenho essa propriedade cadastrada.'}`;
  });
  result={kind:selected.length?'focused-list':'dialogue-focus-data-gap',answer:selected.length?`Entre os registros cadastrados${frame.location?' de '+readableName(frame.location,db):''}:\n${lines.join('\n')}`:'Não encontrei entidades cadastradas nesse recorte.',path,interpretation:{intent:'focused-list',entities:selected,property:frame.property,count:selected.length,available:eligible.length,requestedLimit:frame.limit,neuralUsedForAnswer:false},explanation:'Filtrei as entidades pela classe e localidade do foco, apliquei a quantidade pedida e consultei somente propriedades cadastradas.'};
 }

 if(frame.operation==='lookup'&&['pib','area','population'].includes(frame.property))result=municipalMeasureAnswer(db,query);
 if(frame.entityClass==='municipio'&&frame.property&&['ranking','statistics'].includes(frame.operation)) {
  result=numericRankingAnswer(db,query,{scope:frame.scope,region:frame.region});
  if(result?.kind==='semantic-data-gap')result={...result,answer:result.answer.replace('medidas municipais comparáveis','medidas suficientes e comparáveis')+(frame.year?` Não encontrei medidas para ${frame.year}.`:'')};
  if(result)result={...result,validation:{ok:result.kind==='numeric-ranking'||result.kind==='numeric-statistics',reason:'Consulta numérica executada para os campos explícitos do foco compartilhado.'}};
  if(result?.kind==='numeric-statistics')result={...result,interpretation:{...result.interpretation,operation:'statistics',statistics:result.interpretation}};
  else if(result?.kind==='semantic-data-gap'&&frame.operation==='statistics')result={...result,answer:`Ainda não tenho valores suficientes para calcular ${frame.statistic} por ${propertyLabel(frame.property)} nesse conjunto.`};
 }
 if(result&&(frame.scope==='capitals'||frame.region)) {
  const filters=[frame.scope==='capitals'?'somente capitais':null,frame.region?'região '+readableName(frame.region,db):null].filter(Boolean).join('; ');
  result={...result,interpretation:{...result.interpretation,appliedFilters:{scope:frame.scope,region:frame.region}},answer:`Recorte aplicado: ${filters}.\n\n${result.answer}`,explanation:(result.explanation??'')+` Recorte aplicado: ${filters}.`};
 }
 if(frame.operation==='statistics'&&frame.entityClass!=='municipio')return clarification('Identifiquei a operação pedida, mas este conjunto ainda não possui um cálculo estatístico seguro disponível.',previous);
 return {frame,query,changes:[...new Set(changes)],delegated,label:propertyLabel(frame.property),result};
}

export function commitFocus(db,id,{text,query,result,resolution}) {
 const state=getSemanticState(db,id)??{},q=n(query),meta=result?.interpretation??{},semantic=result?.semanticState??{};
 let frame=null;
 if(resolution?.preserve)frame=resolution.frame;
 else if((['knowledge-pending-review','dialogue-focus-data-gap'].includes(result?.kind)||resolution?.frame?.operation==='listing')&&resolution?.frame)frame={...resolution.frame};
 else if(result) {
  const temporal=/temporal/.test(result.kind??'')||(meta.intents??[]).includes('temporal')||meta.intent==='temporal'||['clock','date'].includes(meta.intent);
  const ranking=semantic.operation==='comparison'||semantic.operation==='ranking'||/ranking|statistics/.test(result.kind??'')||/ranking/.test(meta.intent??'');
  if(temporal)frame={operation:'temporal',entity:null,entityClass:null,location:null,property:/hora/.test(q)?'time':'date',query,options:[]};
  else if(ranking) {
   const base=resolution?.frame??{};
   const municipal=semantic.objectType==='municipio'||meta.parser==='numeric-relational'||meta.parser==='semantic-core-v1'&&semantic.operation==='ranking';
   frame={...base,operation:base.operation==='statistics'?'statistics':'ranking',entity:null,
    entityClass:municipal?'municipio':semantic.objectType??meta.canonicalClass??base.entityClass,
    location:semantic.entity??meta.scope??meta.entity??base.location??null,
    property:propertyKey((municipal?semantic.property:semantic.metric)??semantic.property??meta.metric??meta.property??base.property??null),
    limit:amount(q)??semantic.requestedLimit??meta.requestedLimit??base.limit??(semantic.position===1?1:meta.ranking?.length??(/^qual\b/.test(q)?1:10)),
    order:semantic.order??(semantic.ascending===true||meta.ascending===true?'ascending':base.order??'descending'),
    scope:base.scope??semantic.scope??null,region:base.region??semantic.region??null,year:base.year??semantic.year??meta.requestedYear??null,sourceQuestion:base.sourceQuestion??query,query,position:base.position??semantic.position??meta.position??1,options:optionsFor(db,result),pending:meta.intent==='ranking-needs-competition'?'competition':meta.intent==='ranking-needs-metric'?'metric':null};
  } else if(!/pending|teaching|unknown|clarification/.test(result.kind??'')) {
   const entity=(/bandeira/.test(q)?geographicMention(db,query)?.canonical:null)??semantic.entity??meta.entity??mentionedEntity(db,query);
   const group=db.prepare("SELECT DISTINCT object FROM knowledge_relations WHERE predicate='e_um'").all().find(row=>conceptInQuestion(db,query,row.object));
   if(group&&/^(?:quais|liste|mostre|que|e quais)\b/.test(q)) {
    frame={operation:'listing',entity:null,entityClass:group.object,location:mentionedPlace(db,query)?.canonical??null,property:propertyKey(meta.property??null),propertyLabel:properties(db).flatMap(option=>option.aliases).filter(alias=>has(q,alias)).sort((a,b)=>b.length-a.length)[0]??null,limit:amount(q),order:null,query,options:[]};
   } else if(entity) {
    const definition=/^(?:o que e|quem e|defina)\b/.test(q);
    frame={operation:definition?'definition':'lookup',entity:n(entity),entityClass:null,location:null,
     property:propertyKey(semantic.property??meta.property??meta.intent??null),query,sourceQuestion:resolution?.frame?.sourceQuestion??query,relational:semantic.operation==='relational-query',relationObject:semantic.relationObject??null,
     template:semantic.operation==='relational-query'&&resolution?.frame?.template?resolution.frame.template:q.replace(new RegExp(`\\b${esc(n(entity))}\\b`,'g'),'{entity}'),options:[]};
   }
  }
 }
 if(!frame&&!result&&String(query).trim().endsWith('?')&&!question(q)) {
  const claim=q.match(/^(?:o |a )?(.+?) (?:e|eh) (.+)$/);
  if(claim)frame={operation:'claim-check',entity:claim[1],property:claim[2],entityClass:null,location:null,query,options:[]};
 }
 if(frame&&!resolution?.preserve)frame.lastResult={answer:result?.answer??'Ainda não tenho evidências para avaliar essa afirmação.',explanation:result?.explanation??null,path:(result?.path??[]).slice(0,50)};
 if(frame)frame.lastUserText=text;
 const projected=frame&&['ranking','statistics'].includes(frame.operation)?{
  operation:frame.entityClass==='municipio'?'ranking':'comparison',objectType:frame.entityClass,
  entity:frame.location,property:frame.property==='pib'?'gdp':frame.property,criterion:frame.property==='pib'?'gdp':frame.property,metric:frame.property,
  scope:frame.scope??null,region:frame.region??null,order:frame.order,year:frame.year??null,position:frame.position??1,requestedLimit:frame.limit,pendingClarification:frame.options?.length?'ranking-criterion':null,
  query:frame.query,originalQuestion:frame.query,lastUserText:text
 }:{};
 saveSemanticState(db,id,{...state,...projected,focus:frame});
 return frame;
}
