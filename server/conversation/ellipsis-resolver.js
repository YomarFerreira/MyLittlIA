/**
 * v0.28.2 — resolvedor conservador de elipses relacionais.
 * Sem LLM externa ou novos pesos. Retém somente um frame estruturado da conversa.
 * Não interpreta falta de evidência como falsidade nem ensina fatos automaticamente.
 */
import { normalize } from '../persistence/database.js';
import { readableName } from '../language/proper-names.js';

const predicates = { bebe:'bebe', toma:'bebe', ingere:'bebe', come:'come', consome:'come', possui:'possui', tem:'possui' };
const normId = word => normalize(word).replaceAll(' ', '_');
const capitalize = s => s[0]?.toLocaleUpperCase('pt-BR') + s.slice(1);
const noun = (id,db) => readableName(id,db).toLocaleLowerCase('pt-BR');
const displayObject = (id,db) => {const plain=noun(id,db).replaceAll('_',' ');return ({agua:'água',leite_materno:'leite materno',cha:'chá',cafe:'café'})[normId(id)]||plain;};
const isQuestion = text => /\?\s*$/.test(text) || /^(?:o que|qual|quais|quem|onde|como|quanto|e )\b/i.test(text);
const verbWord = {bebe:'bebe',come:'come',possui:'possui'};

function parseDirect(q) {
  // Perguntas abertas: "O que o gato bebe?", "Que bebida o cachorro toma?"
  const open=q.match(/^(?:o que|que bebida|qual bebida|que alimento|qual alimento) (?:o |a |os |as )?([a-z][a-z0-9 ]{1,55}?) (bebe|toma|ingere|come|consome|possui|tem)$/);
  if(open) return {entity:open[1],predicate:predicates[open[2]],object:null,queryMode:'open'};
  // Perguntas fechadas: "O gato bebe leite?", "O gato também bebe água?"
  if(/^(?:qual|quais|onde|como|quantos|quantas)\b/.test(q))return null;
  const closed=q.match(/^(?:o |a |os |as )?([a-z][a-z0-9 ]{1,45}?) (?:tambem )?(bebe|toma|ingere|come|consome|possui|tem) (?:o |a |um |uma )?([a-z][a-z0-9 ]{1,65})$/);
  if(closed) return {entity:closed[1],predicate:predicates[closed[2]],object:closed[3],queryMode:'yes-no'};
  return null;
}
function parseEllipsis(q,previous) {
  if(previous?.operation!=='relational-query' || !previous.entity || !previous.property) return null;
  // "E leite?", "E água?", "E o leite?"; recusar temas e perguntas novas.
  const m=q.match(/^(?:e\s+)(?:(?:o|a|os|as)\s+)?([a-z][a-z0-9 ]{1,42})$/);
  if(!m) return null;
  const object=m[1];
  if(/^(?:o que|que|qual|quando|como|onde|por que|porque|quantos|quantas|voce|vc|quem|amanha|ontem|hoje|menor|maior|populacao|extensao|pib)\b/.test(object))return null;
  // Um artigo indefinido introduz nova entidade/definição, não objeto para beber/comer.
  if (/^e\s+(?:um|uma)\s+/.test(q)) return null;
  return {entity:previous.entity,predicate:previous.property,object,queryMode:'yes-no',ellipsis:true,
    subjectCandidate:/^e\s+(?:o|a|os|as)\s+/.test(q)};
}

function findRows(db, entity, predicate) {
  const aliases=predicate==='possui'?['possui','tem']:[predicate];
  const placeholders=aliases.map(()=>'?').join(',');
  return db.prepare(`SELECT id,subject,predicate,object,confidence,source_type FROM knowledge_relations WHERE subject=? AND predicate IN (${placeholders}) ORDER BY object`).all(normId(entity),...aliases);
}
function result(answer,frame,found=[],kind='relational-ellipsis') {
  const state={entity:normId(frame.entity).replaceAll('_',' '),objectType:'entidade',property:frame.predicate,
    operation:'relational-query',relationObject:frame.object?normId(frame.object):null,queryMode:frame.queryMode,
    pendingClarification:null,originalQuestion:frame.originalQuestion};
  return {kind,answer,path:found,source:'knowledge_relations',semanticState:state,
    interpretation:{intent:frame.queryMode==='open'?'relational-open':'relational-check',entity:state.entity,
      property:frame.predicate,object:state.relationObject,operation:state.operation,
      parser:'ellipsis-resolver-v1',ellipsis:!!frame.ellipsis,
      resolvedQuery:`${state.entity} ${frame.predicate} ${state.relationObject||'?'}`,
      contextBefore:frame.previous||null,contextAfter:state,neuralUsedForAnswer:false},
    explanation:frame.ellipsis?'Recuperei sujeito e relação da pergunta anterior e substituí apenas o objeto consultado.':'Registrei o contexto relacional da consulta.'};
}
export function resolveRelationalTurn(db,text,previous=null) {
  if(!isQuestion(String(text).trim()))return null;
  // Marcadores discursivos não mudam a intenção da consulta.
  const q=normalize(text).replace(/^(?:(?:entao|bem|certo|ok)\s*,?\s*)+/, '').trim();
  const parsed=parseEllipsis(q,previous)||parseDirect(q);
  if(!parsed)return null;
  // "E o cachorro?" muda o sujeito quando existem relações desse sujeito
  // com a mesma propriedade; "E leite?" troca apenas o objeto.
  if(parsed.ellipsis && parsed.subjectCandidate) {
    const subjectRows=findRows(db,parsed.object,parsed.predicate);
    if(subjectRows.length) Object.assign(parsed,{entity:parsed.object,object:null,queryMode:'open'});
  }
  const frame={...parsed,previous,originalQuestion:parsed.ellipsis?previous.originalQuestion||text:text};
  const rows=findRows(db,parsed.entity,parsed.predicate);
  const subject=noun(parsed.entity,db);
  const verb=verbWord[parsed.predicate];
  if(parsed.queryMode==='open') {
    if(rows.length===0) {
      const stored=db.prepare('SELECT id,answer FROM knowledge WHERE normalized_question=?').get(normalize(text));
      if(stored) return {...result(stored.answer,frame,[],'relational-knowledge'),source:'knowledge',knowledgeId:stored.id};
      return result(`Ainda não sei informar o que ${noun(parsed.entity,db)} ${verbWord[parsed.predicate]}. Você pode me ensinar?`,frame,[],'relational-uncertain');
    }
    const objects=[...new Set(rows.map(r=>displayObject(r.object,db)))];
    const answer=`${capitalize(subject)} ${verb} ${objects.join(', ')}.`;
    return result(answer,frame,rows,'relational-list');
  }
  const object=normId(parsed.object);
  const direct=rows.filter(r=>r.object===object);
  if(direct.length)return result(`Pelo que tenho registrado, sim: ${subject} ${verb} ${displayObject(object,db)}.`,frame,direct);
  const related=parsed.predicate==='bebe' ? db.prepare(`SELECT id,subject,predicate,object,confidence,source_type FROM knowledge_relations
    WHERE subject=? AND predicate='pode_ingerir' AND (object=? OR object LIKE ?)`).all(normId(parsed.entity),object,`${object}_%`) : [];
  if(related.length) {
    const qualified=related.some(r=>/restric|cuidado|intoler/.test(r.object));
    const answer=qualified
      ? `Tenho uma informação relacionada sobre ${displayObject(object,db)}: pode haver restrições. Isso não significa que seja adequado oferecer essa bebida ao ${subject}.`
      : `Tenho uma informação sobre ${displayObject(object,db)}, mas ela não confirma que ${subject} ${verb} isso habitualmente.`;
    return result(answer,frame,related,'relational-qualified');
  }
  const known=rows.length ? `Sei que ${subject} ${verb} ${rows.slice(0,3).map(r=>displayObject(r.object,db)).join(', ')}, mas ` : '';
  return result(`${known}ainda não tenho informação suficiente para confirmar se ${subject} ${verb} ${displayObject(object,db)}.`.replace(/^ainda/, 'Ainda'),frame,rows,'relational-uncertain');
}
