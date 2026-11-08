/**
 * Resolução conservadora de referências entre turnos.
 * Um complemento curto herda apenas o atributo do tópico recente. Nunca usa
 * rankings municipais antigos para interpretar clubes, animais ou organizações.
 * Templates de resposta são recuperados do SQLite.
 */
import {normalize} from '../persistence/database.js';
import {renderConversationalTemplate} from '../language/response-templates.js';
import {generalGraphAnswer} from '../learning/conversational-graph.js';
import {classificationMatches,geographicMention} from '../language/lexical-equivalence.js';
import {readableName} from '../language/proper-names.js';

const n = value => normalize(String(value??'').replaceAll('_',' '));
const clubTerms = /\b(?:clubes?|times?|equipes?|agremiacoes?)\b/;
const titles = /\b(?:titulos?|trofeus?|conquistas?|campeonatos?)\b/;
const colors = /\b(?:cores?|coloracao|tonalidades?)\b/;
const longestFirst = (a,b)=>b.length-a.length;
const titlePredicate=/^(?:titulo|titulos|possui_titulo|conquistou|ganhou_titulo|campeao_de|campeonato_conquistado)$/;
const normalizedText = text => n(text).replace(/^(?:(?:ok|entao|certo|bem|agora|sim)\s+)+/,'').trim();

function subjects(db) {
  return db.prepare('SELECT DISTINCT subject FROM knowledge_relations').all().map(r=>r.subject).sort(longestFirst);
}
function matchesMention(q,term) {return new RegExp(`(?:^|\\s)${n(term).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?=$|\\s)`).test(q);}
function knownSubject(db,text) {
  const q=normalizedText(text);
  return subjects(db).find(s=>matchesMention(q,s))??null;
}
function lastUser(history) {return [...history].reverse().find(m=>m.role==='user')?.content??'';}
function previousClubTopic(db,history) {
  const last=lastUser(history), q=normalizedText(last);
  if (!q) return null;
  if (clubTerms.test(q) || (knownSubject(db,last) && /\b(?:cor|cores|titulo|titulos|futebol|fundado|localizado|onde)\b/.test(q))) return q;
  return null;
}
function clubAtLocation(db,place) {
  const loc=n(place).replaceAll(' ','_');
  const candidates=db.prepare("SELECT DISTINCT subject FROM knowledge_relations WHERE predicate='localizado_em' AND object=?").all(loc);
  return candidates.map(c=>c.subject).filter(subject=>db.prepare("SELECT object FROM knowledge_relations WHERE subject=? AND predicate='e_um'").all(subject).some(r=>classificationMatches(db,r.object,'clube de futebol')));
}
function titleRows(db, clubs) {
  const fetch=db.prepare('SELECT subject,predicate,object FROM knowledge_relations WHERE subject=?');
  return clubs.flatMap(c=>fetch.all(c).filter(r=>titlePredicate.test(r.predicate)));
}
function reply(db,key,vars,interpretation,rows=[]) {
  const answer=renderConversationalTemplate(db,key,vars);
  if(!answer)return null;
  return {kind:'dialogue-focus',answer,path:rows,source:'knowledge_relations',
    interpretation:{...interpretation,parser:'dialogue-focus-v03010',neuralUsedForAnswer:false},
    explanation:'Usei somente o assunto imediatamente relevante, as relações aprovadas e um template do SQLite.',
    semanticState:{operation:'dialogue-focus',objectType:'graph',entity:interpretation.entity??null,property:interpretation.property??null,originalQuestion:interpretation.originalQuestion??null}};
}

export function isRecentMunicipalContext(text) {
  const q=normalizedText(text);
  return /\b(?:municipios?|cidades?|extensao|area territorial|populacao|habitantes|pib|mediana|media aritmetica|km2)\b/.test(q)
    || /\b(?:perguntou|pediu)\b.*\bcriterio\b|\bcriterio\b.*\b(?:perguntou|pediu)\b/.test(q)
    || /^(?:(?:e|a|o|em|por|pela|pelo)\s+)*(?:maior|menor|segunda maior|segunda menor|extensao|area|populacao|pib|mediana|media)$/.test(q);
}

export function resolveDialogueFocus(db,text,history=[]) {
  const q=normalizedText(text), prev=previousClubTopic(db,history);
  if (!q) return null;
  // Uma relação anafórica requer uma pergunta explícita anterior sobre o atributo.
  // NUNCA procura uma questão parecida em todo o histórico.
  const short=q.match(/^e\s+(?:do|da|de|dos|das|o|a)\s+(.+)$/);
  if(short && prev){
    const entity=knownSubject(db,short[1]);
    if (entity) {
      const property=colors.test(prev)?'colors':titles.test(prev)?'titles':null;
      if(property==='colors') {
        const found=generalGraphAnswer(db,`Quais as cores de ${entity.replaceAll('_',' ')}?`);
        return found ? {...found,semanticState:{operation:'dialogue-focus',objectType:'graph',entity,property:'colors',originalQuestion:text},
          interpretation:{...(found.interpretation??{}),intent:'contextual-colors',parser:'dialogue-focus-v03010',resolvedEntity:entity,contextQuestion:lastUser(history)}}
          : reply(db,'focus-property-unavailable',{entity:readableName(entity,db),property:'cores'},
            {intent:'contextual-property-missing',entity,property:'colors',originalQuestion:text});
      }
      if(property==='titles') {
        const found=titleRows(db,[entity]);
        return found.length?reply(db,'focus-club-titles-known',{entities:readableName(entity,db),titles:found.map(r=>r.object.replaceAll('_',' ')).join(', ')},
          {intent:'contextual-titles',entity,property:'titles',originalQuestion:text},found)
          :reply(db,'focus-property-unavailable',{entity:readableName(entity,db),property:'títulos'},
            {intent:'contextual-property-missing',entity,property:'titles',originalQuestion:text});
      }
    }
  }
  // Consultas de títulos: identifica corretamente a falta de evidência e
  // não inventa um ranking, mesmo que existam clubes no banco.
  if(titles.test(q) && (clubTerms.test(q) || knownSubject(db,q))) {
    const loc=geographicMention(db,q);
    const clubs=loc?clubAtLocation(db,loc.canonical):knownSubject(db,q)?[knownSubject(db,q)]:[];
    const found=titleRows(db,clubs);
    if (clubs.length && !found.length) return reply(db,'focus-club-titles-unavailable',
      {location:loc?loc.canonical:'a região mencionada',entities:clubs.map(c=>readableName(c,db)).join(', ')},
      {intent:'club-titles-unavailable',property:'titles',originalQuestion:text});
    if (found.length) return reply(db,'focus-club-titles-known',
      {entities:clubs.map(c=>readableName(c,db)).join(', '),titles:found.map(r=>`${readableName(r.subject,db)}: ${r.object.replaceAll('_',' ')}`).join('; ')},
      {intent:'club-titles',property:'titles',originalQuestion:text},found);
  }
  // "Qual o maior deles?" só tem um sentido após definir a métrica.
  // A expressão "deles" remete a clubes quando a pergunta anterior era de futebol.
  if (/^(?:(?:e|entao|mas)\s+)?(?:qual|quem)\s+(?:e\s+)?(?:o\s+)?(?:maior|melhor|mais importante|mais popular)\s+(?:deles|dess[ea]s|entre eles)(?:\s+todos)?$/.test(q) && prev) {
    return reply(db,'focus-ranking-criteria',{subject:'clubes de futebol'},
      {intent:'club-ranking-clarification',property:'importance',originalQuestion:text});
  }
  // Complementos sem atributo recente não herdam um ranking municipal antigo.
  if(short && knownSubject(db,short[1]) && !prev
       && isRecentMunicipalContext(lastUser(history))
       && db.prepare("SELECT 1 FROM knowledge_relations WHERE subject=? AND predicate='e_um' AND object IN ('clube_de_futebol','time_de_futebol') LIMIT 1")
          .get(knownSubject(db,short[1]))) {
    return reply(db,'focus-ambiguous-entity',{entity:readableName(knownSubject(db,short[1]),db)},
      {intent:'subject-without-current-property',originalQuestion:text});
  }
  return null;
}
