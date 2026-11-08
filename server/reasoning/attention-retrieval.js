import {hasUnboundReference} from '../conversation/entity-reference.js';
import { normalize } from '../persistence/database.js';

// Recuperação factual ponderada por relevância lexical; não é atenção Transformer treinada.
// Evita inventar fatos: somente respostas explícitas registradas em knowledge.
const common = new Set('o a os as um uma de da do das dos e é em no na qual quais que como quem quando onde por para se tem são sobre me voce você diga explique descreva fale'.split(' ').map(normalize));
const terms = text => normalize(text).split(' ').filter(t => t.length > 1 && !common.has(t));
const isDefinitionQuestion = question => /^(?:o que (?:e|eh)|quem (?:e|eh)|defina|explique o que (?:e|eh))\b/.test(normalize(question));
const isDefinitionCandidate = question => isDefinitionQuestion(question) ||
  /^(?:descreva|defina|explique)\b/.test(normalize(question));

const softmax = values => {
    const max=Math.max(...values), exp=values.map(v=>Math.exp(v-max));
    const total=exp.reduce((a,b)=>a+b,0);
    return exp.map(v=>v/total);
};
function scoreQuestion(query, candidate, frequency, count) {
    const q=[...new Set(terms(query))], c=[...new Set(terms(candidate))];
    if (!q.length || !c.length) return {score:0,matches:[]};
    const matches=q.filter(t=>c.includes(t));
    const weight=t=>Math.log(1+(count+1)/(1+(frequency.get(t)??0)));
    const overlap=matches.reduce((s,t)=>s+weight(t),0);
    const totalQ=q.reduce((s,t)=>s+weight(t),0);
    const totalC=c.reduce((s,t)=>s+weight(t),0);
    const coverage=overlap/Math.max(totalQ,1e-8);
    const precision=overlap/Math.max(totalC,1e-8);
    return {score:Number((0.72*coverage+0.28*precision).toFixed(5)),matches};
}
export function retrieveKnowledge(db, question, {limit=5}={}) {
    const input=String(question??'').trim();
    if(input.length<3 || input.length>2000) return {answer:null,source:'knowledge',candidates:[],reason:'invalid-input'};
    const rows=db.prepare('SELECT id,question,answer,origin FROM knowledge ORDER BY created_at DESC LIMIT 5000').all().filter(row=>!hasUnboundReference(row.question));
    if(!rows.length) return {answer:null,source:'knowledge',candidates:[],reason:'empty-memory'};
    const freq=new Map();
    for(const row of rows){for(const word of new Set(terms(row.question)))freq.set(word,(freq.get(word)??0)+1);}
    // Uma pergunta de definição não deve recuperar uma propriedade diferente
    // (ex.: perguntar o que é um flamingo ≠ perguntar qual é sua cor).
    const compatibleRows = isDefinitionQuestion(input)
      ? rows.filter(row => isDefinitionCandidate(row.question))
      : rows;
    if (!compatibleRows.length) return {answer:null,source:'knowledge',candidates:[],reason:'no-compatible-question'};
    const ranked=compatibleRows.map(row=>({...row,...scoreQuestion(input,row.question,freq,rows.length)}))
      .sort((a,b)=>b.score-a.score||a.question.localeCompare(b.question,'pt-BR'));
    const chosen=ranked.slice(0,Math.min(Math.max(limit,1),10));
    const attention=softmax(chosen.map(x=>x.score*10));
    const candidates=chosen.map((row,i)=>({id:row.id,question:row.question,answer:row.answer,origin:row.origin,score:row.score,attention:Number(attention[i].toFixed(5)),matchedTerms:row.matches}));
    const first=candidates[0], second=candidates[1];
    const sufficientlyRelevant=first.score>=0.68 && first.matchedTerms.length>=1;
    const ambiguous=second && first.score-second.score<0.065 && normalize(first.answer)!==normalize(second.answer);
    return {answer:sufficientlyRelevant&&!ambiguous?first.answer:null,source:'knowledge',candidates,
      reason:!sufficientlyRelevant?'low-relevance':ambiguous?'ambiguous':'retrieved',
      selectedId:sufficientlyRelevant&&!ambiguous?first.id:null,
      method:'IDF lexical + distribuição softmax ilustrativa (não é Transformer)'};
}
