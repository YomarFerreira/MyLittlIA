import { normalize } from '../persistence/database.js';
import { genericSemanticAnswer } from './generic-semantic.js';

// Contexto derivado de mensagens persistidas: não depende de estado temporário do processo.
const changes = [
  {field:'criterion', value:'area', pattern:/\b(?:extensao|area|km2|territorial)\b/},
  {field:'criterion', value:'population', pattern:/\b(?:populacao|habitantes|mais populos[ao]s?)\b/},
  {field:'criterion', value:'economy', pattern:/\b(?:pib|riqueza|mais ricas?)\b/},
  {field:'scope', value:'capitals', pattern:/\b(?:somente|apenas|so) (?:as )?capitais\b/},
  {field:'region', value:'nordeste', pattern:/\b(?:do|da|no|na) nordeste\b/},
  {field:'year', value:null, pattern:/\b(?:e )?em (20\d\d)\b/}
];
function extractChanges(text) {
  const n=normalize(text); const result={};
  for(const rule of changes) { const m=n.match(rule.pattern); if(m) result[rule.field]=rule.field==='year'?Number(m[1]):rule.value; }
  return result;
}
function hasCityQuestion(text) {return /\b(?:cidades?|municipios?)\b/.test(normalize(text));}
function isLargest(text) {return /\b(?:maiores?|mais grandes)\b/.test(normalize(text));}
function hasCriterion(text) {return /\b(?:populacao|populos|habitantes|extensao|area|km2|pib|ricas?)\b/.test(normalize(text));}
function getBaseQuestion(history) {
  const users=history.filter(m=>m.role==='user');
  for(let i=users.length-1;i>=0;i--) {
    const item=users[i].content;
    if(hasCityQuestion(item)) return item;
  }
  return null;
}
function isShortUpdate(text, updates) {
  const normalized=normalize(text).replace(/^[,;.!? ]+|[,;.!? ]+$/g,'').trim();
  if(!Object.keys(updates).length) return false;
  if(normalized.length>75) return false;
  return !hasCityQuestion(text) && !/\b(?:qual|quais|quanto|quantas|oque|o que)\b/.test(normalized);
}
function buildQuery(base,updates) {
  let q=base.replace(/\bmaiore\b/g,'maiores');
  if(updates.criterion==='area') q=`${q} por extensão territorial em km2`;
  if(updates.criterion==='population') q=`${q} por população`;
  if(updates.criterion==='economy') q=`${q} por PIB`;
  return q;
}
function clarify(base,updates) {
  return {kind:'semantic-clarification',answer:'Você quer as maiores cidades por população, por extensão territorial (km²) ou por PIB?',
    interpretation:{intent:'clarify-city-ranking',parser:'conversation-semantic',originalQuery:base,contextBefore:{query:base,criterion:null},contextAfter:{query:base,criterion:null},pendingClarification:true,neuralUsedForAnswer:false},
    explanation:'Encontrei mais de um significado para “maiores cidades”. Pedi o critério antes de consultar os dados.'};
}
export function semanticConversationAnswer(db,text,history=[]) {
  const raw=normalize(text);
  const includeAll=/\b(?:nao deixe nenhuma de fora|nao deixe nenhum de fora|nao exclua|inclua todos|inclua todas|sem excluir|todas as cidades|todos os municipios)\b/.test(raw);
  if(includeAll) {
    const earlier=getBaseQuestion(history);
    if(earlier) {
      const previous=[...history].reverse().filter(m=>m.role==='user');
      const metric=previous.some(m=>/\b(?:extensao|area|km2)\b/.test(normalize(m.content)))?'area':previous.some(m=>/\b(?:populacao|habitantes)\b/.test(normalize(m.content)))?'population':null;
      const target=metric==='area'?`${earlier} por extensão territorial em km2 inclua todos os periodos`:metric==='population'?`${earlier} por população inclua todos os periodos`:null;
      if(target) {const found=genericSemanticAnswer(db,target);if(found) return {...found,interpretation:{...found.interpretation,intent:'contextual-include-all',contextReference:earlier,appliedChanges:{includeAll:true,criterion:metric}},explanation:`Mantive o assunto anterior e mostrei todos os dados disponíveis com aviso sobre diferenças de datas. ${found.explanation??''}`};}
    }
  }
  const update=extractChanges(text);
  const base=getBaseQuestion(history);
  // Uma pergunta sobre uma cidade nomeada não é complemento do ranking anterior.
  const namedMunicipality= /\b(?:pib|populacao|area|extensao)\s+(?:do|da|de|em|no|na)\s+\S+/.test(raw);
  const explicitMeasure= /\b(?:qual|quanto|valor)\b/.test(raw) && /\b(?:pib|populacao|area|extensao)\b/.test(raw);
  const short=isShortUpdate(text,update) && !namedMunicipality && !explicitMeasure;
  const original=base??text;
  if(!short && hasCityQuestion(text) && isLargest(text) && !hasCriterion(text)) {
    return clarify(text,{});
  }
  if(!short) return null;
  if(!base) return null;
  const lastAssistant=[...history].reverse().find(m=>m.role==='assistant');
  const previousPending=Boolean(lastAssistant && /maiores cidades por populacao, por extensao/.test(normalize(lastAssistant.content)));
  const newQuery=buildQuery(base,update);
  const before={query:base,criterion:previousPending?null:'previous',scope:'all',region:null,year:null};
  const after={query:newQuery,criterion:update.criterion??before.criterion,scope:update.scope??before.scope,region:update.region??before.region,year:update.year??before.year};
  const metadata={intent:'contextual-query-update',parser:'conversation-semantic',contextReference:base,contextBefore:before,contextAfter:after,appliedChanges:update,neuralUsedForAnswer:false};
  if(update.scope || update.region || update.year) {
    return {kind:'semantic-context-data-gap',answer:`Entendi o complemento da sua pergunta anterior${update.year?` para ${update.year}`:''}${update.region?' na região Nordeste':''}${update.scope?' considerando somente as capitais':''}. Ainda não tenho uma consulta verificada que aplique esse filtro a todos os resultados; prefiro não apresentar uma lista incompleta como se fosse definitiva. Você pode me ajudar a aprender sobre esse assunto?`,interpretation:metadata,
      explanation:'Reconheci o filtro e preservei o assunto anterior, mas a filtragem solicitada ainda não é suportada com segurança.'};
  }
  const found=genericSemanticAnswer(db,newQuery);
  if(found) return {...found,interpretation:{...found.interpretation,...metadata},explanation:`Atualizei a consulta anterior: ${base} → ${newQuery}. ${found.explanation??''}`};
  return {kind:'semantic-context-data-gap',answer:'Entendi o complemento da sua pergunta anterior, mas ainda não tenho informações suficientes para responder com esse critério. Você pode me ajudar a aprender sobre esse assunto?',interpretation:metadata,
    explanation:'Mantive a entidade e alterei o critério solicitado, mas não encontrei relações suficientes no banco.'};
}
