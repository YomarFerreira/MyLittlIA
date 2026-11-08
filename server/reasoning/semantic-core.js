/**
 * MylittlIA v0.28 — núcleo de compreensão e planejamento semântico.
 * Não utiliza LLM pré-treinada. Extrai um plano verificável, pede esclarecimentos
 * quando faltam critérios e usa a rede neural local como sinal auxiliar.
 * Interpretar uma frase NÃO equivale a confirmar um fato.
 */
import { normalize } from '../persistence/database.js';
import { genericSemanticAnswer } from './generic-semantic.js';
import { statisticalOperation } from './numeric-rankings.js';
import { semanticAnswer } from './semantic.js';
import { selfAwarenessAnswer } from './self-awareness.js';
import {validatePlannedAnswer} from '../language/response-validator.js';
import { readableName, articleForEntity } from '../language/proper-names.js';
import { getLexicon, socialIntentsFromDb, socialResponseFromDb } from '../language/semantic-catalog.js';



const ignoreForTypos = new Set(['o','a','de','do','da','dos','das','e','em','na','no','um','uma','pra','para','por','quais','qual','que','voce','sabe','estado','eu','o','isso','aquela','esse','ser','como']);
const wordBoundary = part=>new RegExp(`(?:^|\\s)${part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?=\\s|$)`);

function editDistance(a,b) {
  if(Math.abs(a.length-b.length)>2) return 3;
  let prior=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++) {
    const next=[i];
    for(let j=1;j<=b.length;j++) next[j]=Math.min(prior[j]+1,next[j-1]+1,prior[j-1]+(a[i-1]===b[j-1]?0:1));
    prior=next;
  }
  return prior[b.length];
}

export function normalizeSemanticText(text,db=null) {
  const original=normalize(text);
  const lexicon=getLexicon(db,'lexical');
  const words=new Map(lexicon.map(r=>[r.phrase,r.canonical]));
  const typoTargets=[...new Set(lexicon.map(r=>r.canonical))].filter(x=>x.length>=5);
  const corrections=[];
  const fixed=original.split(' ').map(token=>{
    if(!token||ignoreForTypos.has(token))return token;
    let target=words.get(token);
    if(!target && token.length>=5){
      const near=typoTargets.filter(x=>Math.abs(x.length-token.length)<=1 && editDistance(token,x)===1);
      if(near.length===1)target=near[0];
    }
    if(target && target!==token)corrections.push({original:token,corrected:target});
    return target||token;
  }).join(' ');
  return {normalized:fixed,original,corrections};
}

function placeArticle(value,db=null) {
  return `${articleForEntity(value,db)} ${readableName(value,db)}`;
}
function entityCatalog(db) {
  const names=new Set(db.prepare('SELECT entity_id FROM semantic_entities WHERE active=1').all().map(r=>r.entity_id));
  for(const row of db.prepare('SELECT DISTINCT subject FROM knowledge_relations').all())names.add(normalize(String(row.subject).replaceAll('_',' ')));
  return [...names].filter(x=>x.length>2).sort((a,b)=>b.length-a.length);
}
export function resolveEntity(db, text, previous=null) {
  const normalized=normalize(text);
  const candidates=[];
  for(const name of entityCatalog(db))if(wordBoundary(name).test(normalized))candidates.push({id:name,source:'known-name',score:name.length});
  for(const {phrase:alias,canonical:name} of getLexicon(db,'entity_alias'))if(wordBoundary(alias).test(normalized))candidates.push({id:name,source:'uf-alias',score:alias.length+1});
  // 'Rio' pode ser estado ou cidade. Solicitar contexto quando for relevante.
  if(wordBoundary('rio').test(normalized) && !wordBoundary('rio de janeiro').test(normalized))
     candidates.push({id:'rio de janeiro',source:'ambiguous-alias',score:2});
  // Em perguntas 'O Amapá fica no Norte do Brasil?', Brasil é contexto, não sujeito.
  const first=candidates.sort((a,b)=>(b.score-(b.id==='brasil'?100:0))-(a.score-(a.id==='brasil'?100:0)))[0];
  // A grafia descritiva pode aparecer como sujeito de alguma relação antiga:
  // "estado de pernambuco" e "pernambuco" são a mesma entidade geográfica.
  // Manter a chave canônica evita que consultas de municípios procurem um pai
  // inexistente em relações "municipio -> pertence_a -> pernambuco".
  if (first) {
    const descriptive=first.id.match(/^(?:estado|municipio|cidade) (?:de|do|da) (.+)$/);
    if (descriptive) {
      const canonical=descriptive[1];
      const known=db.prepare('SELECT 1 FROM semantic_entities WHERE entity_id=? AND active=1').get(canonical)
        || db.prepare('SELECT 1 FROM knowledge_relations WHERE subject=? OR object=? LIMIT 1').get(canonical,canonical);
      if (known) return {...first,id:canonical,source:'canonicalized-descriptive-name'};
    }
    return first;
  }
  return previous?.entity ? {id:previous.entity,source:'conversation-context',score:0} : null;
}

function socialIntents(db,normalized){return socialIntentsFromDb(db,normalized);}
function socialReply(db,intents){return socialResponseFromDb(db,intents);}
function criterionOf(q) {
  if(/\b(?:extensao|area|km2|territorial|tamanho do territorio)\b/.test(q))return 'area';
  if(/\b(?:populacao|populos[ao]s?|habitantes)\b/.test(q))return 'population';
  if(/\b(?:pib|riqueza|ricas|economia)\b/.test(q))return 'gdp';
  return null;
}
function isRanking(q) {return /\b(?:cidade|cidades|municipio|municipios)\b/.test(q)&&/\b(?:maior(?:es)?|menor(?:es)?|ranking|classificacao|mais populosa|mais populoso)\b/.test(q);}
const ordinals=new Map([['primeira',1],['primeiro',1],['segunda',2],['segundo',2],['terceira',3],['terceiro',3],['quarta',4],['quarto',4],['quinta',5],['quinto',5],['sexta',6],['sexto',6]]);
function rankPosition(q) {for(const [word,n] of ordinals)if(wordBoundary(word).test(q))return n;return 1;}
function queryForRank(plan) {
  const metric={area:'extensão territorial',population:'população',gdp:'PIB'}[plan.property];
  const direction=plan.order==='ascending'?'menor':'maior';
  const rank=plan.position===1?'':(Array.from(ordinals.entries()).find(([w,n])=>n===plan.position&&w.endsWith('a'))?.[0]||`${plan.position}ª`)+' ';
  return `Qual a ${rank}${direction} cidade de ${plan.entity} por ${metric}?`;
}
function standaloneCriterion(q) {
  // A resposta a um esclarecimento pode ser apenas 'Extensão' ou 'População'.
  // Aceitar só formas curtas, para não capturar uma nova pergunta ou ensinamento.
  return /^(?:(?:e|em|por|pela|pelo)\s+)?(?:area(?:\s+territorial)?|extensao(?:\s+territorial)?|populacao|habitantes|pib)$/.test(q);
}
function contextualShort(q) {
  return /^(?:e\s+)?(?:a|o)?\s*(?:(?:primeira|segunda|terceira)\s+)?(?:maior|menor)\??$/.test(q)
    || standaloneCriterion(q);
}
function asksWhyClarified(q) {
  return /\b(?:por que|porque)\s+(?:(?:voce|vc)\s+)?(?:me\s+)?perguntou\b/.test(q)
    || /\b(?:por que|porque)\s+(?:(?:voce|vc)\s+)?(?:me\s+)?pediu\b/.test(q);
}
function result(answer, plan, extras={}) {
  return {kind:'semantic-planned',answer,interpretation:{intent:plan.intents[0]||'unknown',intents:plan.intents,entity:plan.entity,property:plan.property,operation:plan.operation,order:plan.order,position:plan.position,pendingClarification:plan.pendingClarification,parser:'semantic-core-v1',corrections:plan.corrections,contextBefore:plan.contextBefore,contextAfter:plan.contextAfter,neuralSignal:plan.neuralSignal,neuralUsedForAnswer:false},explanation:'Interpretei a mensagem, reconstruí o contexto quando necessário e só respondi com dados encontrados. A correção ortográfica foi usada como hipótese de interpretação.',semanticState:plan.state,...extras};
}
function makeState(previous,changes) { return {...(previous||{}),...changes}; }
export function getSemanticState(db, conversationId) {
  if(!conversationId)return null;
  const row=db.prepare('SELECT state_json FROM conversation_semantic_state WHERE conversation_id=?').get(conversationId);
  if(!row)return null;
  try{return JSON.parse(row.state_json);}catch{return null;}
}
export function saveSemanticState(db,conversationId,state) {
  if(!state)return;
  db.prepare(`INSERT INTO conversation_semantic_state(conversation_id,state_json) VALUES (?,?)
    ON CONFLICT(conversation_id) DO UPDATE SET state_json=excluded.state_json,updated_at=CURRENT_TIMESTAMP`)
     .run(conversationId,JSON.stringify(state));
}

/** Returns null for unhandled intent so legacy tools remain available. */
export function understandAndPlan(db,text,previous=null,neuralIntent=null) {
  const {normalized:q,corrections}=normalizeSemanticText(text,db);
  const social=socialIntents(db,q);
  const entity=resolveEntity(db,q,previous);
  const trimmed=q.replace(/^(?:oi|ola|opa|bom dia|boa tarde|boa noite)[, ]*/,'').trim();
  const hasCapital=/\bcapital\b/.test(q) && !/\b(?:violento|violenta|seguro|segura|rica|rico|grande|pequena)\b/.test(q) && !/^(?:somente|apenas|so)\b/.test(q);
  const hasRank=isRanking(q);
  const hasLocation=/\b(?:fica|localizado|localizada|situa|situado|situada)\b/.test(q) && /\b(?:norte|nordeste|sul|sudeste|centro oeste)\b/.test(q);
  const short=contextualShort(q);
  const previousRank=previous?.operation==='ranking';
  const entityOnly=previousRank && /^(?:e )?(?:no|na|em|do|da) (?:[a-z ]{2,32})$/.test(q) && entity?.source!=='conversation-context';
  const criterionOnly=previousRank && standaloneCriterion(q);
  const continuesRank=previousRank && (short || entityOnly || /^e\s+/.test(q));
  let intents=[...social];
  if(hasCapital)intents.push('capital-query');
  if(hasLocation)intents.push('location-query');
  if(hasRank||short&&previousRank)intents.push('ranking-query');
  const plan={intents,entity:entity?.id??previous?.entity??null,property:null,operation:null,order:null,position:null,pendingClarification:null,corrections,contextBefore:previous,contextAfter:null,neuralSignal:neuralIntent?{label:neuralIntent.label,reliable:neuralIntent.reliable}:null,state:null};
  const socialAnswer=socialReply(db,social);
  const timeQuestion=/\b(?:que horas sao|qual e a hora|que dia e hoje|data de hoje|qual e a data)\b/.test(q);
  const timeReply=timeQuestion?selfAwarenessAnswer(db,text)?.answer:null;
  const socialAndTime=[socialAnswer,timeReply].filter(Boolean).join(' ');

  // Estatísticas e referência à posição central: permitem frases elípticas
  // como "E a mediana?", "E a média?" e "E a do meio?".
  const statistic=statisticalOperation(q);
  const isDefinition=/^(?:o que (?:e|significa)|explique|defina)\s+(?:a |uma |o )?(?:media|mediana)\??$/.test(q);
  if (isDefinition && statistic) {
    const answer=statistic==='median'
      ? 'Mediana é o valor central de uma lista de números ordenados. Se houver dois valores no meio, calculo a média deles.'
      : 'Média aritmética é a soma dos valores dividida pela quantidade de valores.';
    Object.assign(plan,{intents:['statistical-definition'],operation:'definition',property:null,contextAfter:previous,state:null});
    return result(answer,plan,{kind:'statistical-definition'});
  }
  if (statistic && (previousRank || (plan.entity && /\b(?:municipios?|cidades?)\b/.test(q)))) {
    const property=criterionOf(q) || (previousRank?previous.property:null);
    const state=makeState(previousRank?previous:{},{entity:plan.entity,objectType:'municipio',
      property,criterion:property,operation:'ranking',order:previousRank?previous.order:'descending',
      position:previousRank?previous.position:1,pendingClarification:property?null:'ranking-criterion',
      lastStatistic:statistic,originalQuestion:text});
    Object.assign(plan,{intents:['statistics-query'],operation:'statistics',property,
      order:state.order,position:state.position,pendingClarification:state.pendingClarification,contextAfter:state,state});
    if(!property) return result(`Você quer calcular isso usando população, extensão territorial ou PIB?`,plan);
    const metric={area:'extensão territorial',population:'população',gdp:'PIB'}[property];
    const phrase={median:'mediana',mean:'média',middle:'as cidades do meio'}[statistic];
    const query=`Qual ${phrase} dos municípios de ${plan.entity} por ${metric}?`;
    const found=genericSemanticAnswer(db,query);
    if(found && found.kind==='numeric-statistics' && validatePlannedAnswer(plan,found).ok)
      return {...found,semanticState:state,interpretation:{...found.interpretation,...result('',plan).interpretation,
        statistics:found.interpretation,resolvedQuery:query},validation:{ok:true,reason:'Estatística calculada sobre o conjunto de medidas do SQLite'}};
    return result(`Entendi que você quer ${statistic==='middle'?'a cidade do meio':statistic==='median'?'a mediana':'a média'} por ${metric}, mas ainda não tenho valores suficientes para calcular isso.`,plan,{kind:'semantic-data-gap'});
  }
  // Uma pergunta sobre a própria conversa não é uma nova pergunta geográfica.
  // Ela nunca deve desencadear o mecanismo de ensino ou trocar o assunto.
  if (previousRank && asksWhyClarified(q)) {
    const metric={area:'extensão territorial',population:'população',gdp:'PIB'}[previous?.property];
    const subject=previous?.entity ? `as cidades ${placeArticle(previous.entity,db)}` : 'as cidades';
    const reply=previous?.pendingClarification
      ? `Perguntei porque “maior” ou “menor” pode significar população, extensão territorial ou PIB. Preciso saber qual comparação você quer fazer.`
      : metric
        ? `Perguntei para saber como você queria comparar as cidades. Entendi que era por ${metric}, mas ainda não encontrei dados suficientes para comparar ${subject}. Desculpe pela confusão.`
        : 'Perguntei para saber qual critério você queria usar na comparação.';
    Object.assign(plan,{intents:['conversation-explanation'],operation:'explain-context',property:previous?.property??null,contextAfter:previous,state:null});
    return result(reply,plan,{kind:'semantic-context-explanation'});
  }
  // Complementos de filtros existentes não são novas consultas de capital.
  const yearMatch=q.match(/^(?:e )?em (20\d{2})\??$/);
  const scopeFilter=/^(?:somente|apenas|so) as? capitais$/.test(q);
  const regionFilter=/^(?:do|da|no|na) nordeste$/.test(q);
  if(previousRank && (yearMatch || scopeFilter || regionFilter)) {
    const state=makeState(previous,{
      year:yearMatch?Number(yearMatch[1]):previous.year??null,
      scope:scopeFilter?'capitals':previous.scope??'all',
      region:regionFilter?'nordeste':previous.region??null
    });
    Object.assign(plan,{intents:['contextual-filter'],operation:'ranking',property:state.property,order:state.order,position:state.position,
       contextAfter:state,state});
    const label=yearMatch?`para ${yearMatch[1]}`:scopeFilter?'somente às capitais':'à região Nordeste';
    return result(`Entendi: você quer continuar a comparação ${label}. Ainda não consigo aplicar esse filtro a todos os resultados com segurança.`,plan,{kind:'semantic-context-data-gap'});
  }
  const rankingRequest=hasRank || (short&&previousRank) || entityOnly;
  if(rankingRequest && plan.entity) {
    // Se o usuário apenas informa o critério pedido, conservar o ranking original,
    // inclusive a posição (ex.: segunda maior) e a direção (menor/maior).
    // 'E a menor cidade do RJ?' troca a UF, mas continua com o critério conhecido.
    const property=criterionOf(q) || (continuesRank ? previous?.property ?? null : null);
    const order=/\bmenor(?:es)?\b/.test(q)?'ascending':/\bmaior(?:es)?\b/.test(q)?'descending':previous?.order||'descending';
    const position=criterionOnly || entityOnly || (short&&!/\b(?:maior|menor)\b/.test(q))
       ? previous?.position||1 : rankPosition(q);
    const changedEntity=Boolean(previous?.entity && plan.entity!==previous.entity);

    const state=makeState(changedEntity ? {} : previous,{entity:plan.entity,objectType:'municipio',property,criterion:property,operation:'ranking',order,position,pendingClarification:!property?'ranking-criterion':null,
      year:changedEntity?null:previous?.year??null,
      query:!(short||entityOnly)?text:(previous?.query||text),originalQuestion:!(short||entityOnly)?text:(previous?.originalQuestion||text)});

    Object.assign(plan,{property,operation:'ranking',order,position,pendingClarification:state.pendingClarification,contextAfter:state,state});
    if(!property) return result(`${socialAnswer?socialAnswer+' ':''}Você quer comparar as cidades ${placeArticle(plan.entity,db)} por população, extensão territorial ou PIB?`,plan);

    // Consulta estruturada: somente respostas com medidas ou aviso explícito de ausência.
    const query=queryForRank(plan);
    const found=genericSemanticAnswer(db,query);
    if(found && validatePlannedAnswer(plan,found).ok) {
      // Usa o motor de linguagem da aplicação, porém preserva o traço original.
      return {...found,semanticState:state,interpretation:{...found.interpretation,...result('',plan).interpretation,resolvedQuery:query},
        answer:socialAnswer?`${socialAnswer} ${found.answer}`:found.answer,validation:validatePlannedAnswer(plan,found)};
    }
    const metricLabel={area:'extensão territorial',population:'população',gdp:'PIB'}[property];
    const directionLabel=order==='ascending'?'menores':'maiores';
    return result(`Entendi! Você quer comparar as cidades ${placeArticle(plan.entity,db)} por ${metricLabel}. Ainda não tenho medidas suficientes para identificar as ${directionLabel} com segurança. Você pode me ajudar a aprender sobre esse assunto?`,plan,{kind:'semantic-data-gap'});
  }
  if(hasLocation && plan.entity && !hasCapital) {
    const region=q.match(/\b(?:norte|nordeste|sul|sudeste|centro oeste)\b/)?.[0];
    const state=makeState(previous,{entity:plan.entity,objectType:'lugar',property:'localizado_em',operation:'lookup',order:null,position:null,pendingClarification:null,originalQuestion:text});
    Object.assign(plan,{property:'localizado_em',operation:'lookup',contextAfter:state,state});
    const evidence=db.prepare("SELECT id,subject,predicate,object,source_type,confidence FROM knowledge_relations WHERE subject=? AND predicate IN ('localizado_em','fica_em')").all(plan.entity);
    const related=evidence.filter(row=>normalize(row.object.replaceAll('_',' '))===region || normalize(row.object.replaceAll('_',' '))===`regiao ${region}`);
    if(related.length) {
       const label=region.replace(/^./,c=>c.toUpperCase());
       const candidate={path:related,answer:`Sim! ${readableName(plan.entity,db)} fica na Região ${label} do Brasil.`};
       const validation=validatePlannedAnswer(plan,candidate);
       if(validation.ok) return result(`${socialAnswer?socialAnswer+' ':''}${candidate.answer}`,plan,{path:related,source:'knowledge_relations',validation});
    }
    if(evidence.length) return result(`Tenho uma localização registrada para ${readableName(plan.entity,db)}, mas não encontrei uma confirmação de que fique na região ${region}.`,plan,{kind:'semantic-data-gap',path:evidence});
    return result(`Ainda não tenho informações suficientes sobre a localização de ${readableName(plan.entity,db)} para responder com segurança. Você pode me ajudar a aprender?`,plan,{kind:'semantic-data-gap'});
  }
  if(hasCapital && plan.entity) {
    const state=makeState(previous,{entity:plan.entity,objectType:'estado',property:'capital',operation:'lookup',order:null,position:null,pendingClarification:null,originalQuestion:text});
    Object.assign(plan,{property:'capital',operation:'lookup',contextAfter:state,state});
    let row=db.prepare("SELECT id,subject,predicate,object,confidence,source_type FROM knowledge_relations WHERE subject=? AND predicate IN ('tem_capital','capital') LIMIT 2").all(plan.entity);
    const alternatives=[...new Set(row.map(r=>normalize(r.object)))];
    if(alternatives.length>1) return result('Tenho informações diferentes sobre essa capital. Prefiro não escolher uma delas sem verificar.',plan,{kind:'semantic-conflict',path:row});
    if(row.length) {
      const candidate={path:[row[0]],answer:`Sim! A capital ${placeArticle(plan.entity,db)} é ${readableName(row[0].object,db)}.`};
      const validation=validatePlannedAnswer(plan,candidate);
      if(validation.ok) return result(`${socialAndTime?socialAndTime+' ':''}${candidate.answer}`,plan,{path:candidate.path,source:'knowledge_relations',validation});
    }
    // Fallback para o cadastro de perguntas sem introduzir um novo fato.
    const fact=semanticAnswer(db,`Qual a capital de ${plan.entity}?`);
    if(fact && !['unknown','ambiguous'].includes(fact.kind)) {
      const answer = (fact.answer || '').replace(/\bcapital de ([a-z ]+) é ([a-z ]+)\./i,(_,a,b)=>`capital ${placeArticle(a,db)} é ${readableName(b,db)}.`);
      return result(`${socialAndTime?socialAndTime+' ':''}${answer}`,plan,{source:fact.source||'knowledge',path:fact.path||[],validation:{ok:true,reason:'Conhecimento recuperado por entidade e propriedade no cadastro'}});
    }
    return result(`${socialAnswer?socialAnswer+' ':''}Ainda não encontrei a capital ${placeArticle(plan.entity,db)} nos conhecimentos que tenho. Você pode me ajudar a aprender?`,plan,{kind:'semantic-data-gap'});
  }
  if(timeReply&&!hasCapital&&!rankingRequest) {
    Object.assign(plan,{intents:[...intents,'temporal'],operation:'runtime-time',contextAfter:previous,state:null});
    return result(socialAndTime,plan);
  }
  if(social.length && !hasCapital && !hasRank) {
    // Não descartar uma pergunta factual só porque a mensagem começou com “Olá”.
    if(/\b(?:cidade|municipio|bandeira|populacao|industria|empresa|praia|regiao|fronteira|localizado|fica)\b/.test(q)) {
      const factual=q.replace(/^(?:oi|ola|opa|bom dia|boa tarde|boa noite)\s*/, '');
      const found=genericSemanticAnswer(db,factual) || semanticAnswer(db,factual);
      if(found && !['unknown','semantic-data-gap','ambiguous'].includes(found.kind)) return {
        ...found,answer:`${socialAnswer} ${found.answer}`,
        interpretation:{...found.interpretation,intents:[...social,'factual-query'],parser:'semantic-core+knowledge',corrections,neuralSignal:plan.neuralSignal}
      };
      return null;
    }

    // A saudação não apaga o assunto anterior, nem cria uma pendência.
    plan.intents=social;
    return result(socialAnswer,{...plan,operation:'social',contextAfter:previous,state:null});
  }
  return null;
}
