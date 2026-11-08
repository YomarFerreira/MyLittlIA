import {normalize} from '../persistence/database.js';
import {renderConversationalTemplate} from '../language/response-templates.js';
const norm=value=>normalize(String(value??''));
const contains=(text,phrase)=>(' '+norm(text)+' ').includes(' '+norm(phrase)+' ');

// Resolve a question about the wording of the last answer, without inventing causes.
export function explainWording(db,text,frame) {
 const q=norm(text),answer=frame?.lastResult?.answer??'';
 const target=q.match(/^(?:por que|porque|o que significa|o que voce quis dizer com|explique(?: a palavra| o termo)?)\s+(?:(?:voce|vc) (?:disse|usou|falou) )?(.+)$/)?.[1];
 if(!target||!answer)return null;
 const entries=db.prepare("SELECT template_key FROM conversational_templates WHERE language='pt-BR' AND template_key LIKE 'wording:%'").all();
 const selected=entries.filter(row=>contains(target,row.template_key.slice(8))&&contains(answer,row.template_key.slice(8))).sort((a,b)=>b.template_key.length-a.template_key.length)[0];
 if(!selected)return null;
 const phrase=selected.template_key.slice(8);
 // An explicit new subject must not be absorbed into the previous explanation.
 const filler=new Set('a o as os de do da e essa esta esse este palavra termo expressao na resposta anterior voce vc disse usou falou quer dizer'.split(' '));
 if(norm(target).split(' ').some(word=>!filler.has(word)&&!contains(answer,word)))return null;
 const path=frame.lastResult.path??[];
 const typical=path.filter(row=>/(?:^|_)tipic[oa](?:_|$)/.test(row.predicate??''));
 const word=(answer.match(/[\p{L}]+/gu)??[]).find(token=>norm(token)===phrase)??phrase;
 const explanation=renderConversationalTemplate(db,selected.template_key,{word});
 const evidence=typical.length?renderConversationalTemplate(db,'wording-typical-evidence'):null;
 return {kind:'dialogue-wording-explanation',answer:[explanation,evidence,`Na resposta anterior: ${answer}`].filter(Boolean).join('\n\n'),path,
  interpretation:{intent:'explain-response-wording',parser:'shared-focus',phrase,entity:frame.entity??null,evidencePredicates:typical.map(row=>row.predicate),neuralUsedForAnswer:false},
  explanation:'Relacionei a expressão à última resposta do foco e às evidências recuperadas. Não inferi exceções ou causas ausentes dos registros.'};
}
