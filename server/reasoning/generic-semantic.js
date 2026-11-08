import {resolveEntityText} from '../knowledge/entity-identity.js';
import {readableName} from '../language/proper-names.js';
import { numericRankingAnswer, municipalMeasureAnswer } from './numeric-rankings.js';
import { normalize } from '../persistence/database.js';

const human = value => String(value).replaceAll('_',' ');
const cap = (db,value) => readableName(value,db);
const aliases = new Map([
  ['rio','rio de janeiro'],['rj','rio de janeiro'],['sp','sao paulo'],['sampa','sao paulo'],
  ['pe','pernambuco'],['mg','minas gerais'],['df','distrito federal'],['br','brasil']
]);
const stop = new Set(['qual','quais','o','a','os','as','de','da','do','das','dos','e','sao','seria','seriam','me','diga','fale','sobre','por','favor','que','tem','possui']);
function clean(value) { return normalize(value).replace(/\b(?:estado|cidade|municipio) (?:de|do|da)\b/g,' ').replace(/\s+/g,' ').trim(); }
function tokenize(value) { return clean(value).split(' ').filter(x => x && !stop.has(x)); }
function getEntities(db) {
 const rows=db.prepare('SELECT DISTINCT subject FROM knowledge_relations').all();
 return new Map(rows.map(r=>[human(r.subject),r.subject]));
}
function findEntity(db,input) {
 const names=getEntities(db);
 // Usa os aliases revisados compartilhados com cadastro e importação.
 const raw=normalize(resolveEntityText(db,input));
 const candidates=[];
 for(const [name,id] of names) {
   const boundary=new RegExp(`(?:^|\\s)${name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?=\\s|$)`);
   if(boundary.test(raw)) candidates.push({name,id,score:name.length});
 }
 for(const [alias,target] of aliases) {
   if(new RegExp(`(?:^|\\s)${alias}(?=\\s|$)`).test(raw) && names.has(target)) {
     candidates.push({name:target,id:names.get(target),score:alias.length});
   }
 }
 candidates.sort((a,b)=>b.score-a.score);
 return candidates[0]??null;
}
function classify(input) {
 const s=normalize(input);
 if(/(?:capital)/.test(s)) return {kind:'capital',label:'capital'};
 if(/(?:bandeira)/.test(s)&&/(?:cor|cores)/.test(s)) return {kind:'flag',label:'cores da bandeira'};
 if(/(?:regiao metropolitana|municipios metropolitanos)/.test(s)) return {kind:'metro',label:'municípios metropolitanos de referência'};
 if(/(?:praias?|litoral|praia mais)/.test(s)) return {kind:'beaches',label:'praias e destinos costeiros de referência'};
 if(/(?:industrias?|setores industriais?)/.test(s)) return {kind:'industry',label:'setores industriais'};
 if(/(?:empresas?)/.test(s)) return {kind:'companies',label:'empresas com operações relevantes'};
 if(/(?:atividades? economicas?|economia)/.test(s)) return {kind:'economy',label:'atividades econômicas'};
 if(/(?:cidades?|municipios?)/.test(s)) {
   if(/(?:km2|area|extensao|territorio|maior em tamanho)/.test(s)) return {kind:'unsupported-ranking',label:'área municipal'};
   if(/(?:rica|ricos|pib)/.test(s)) return {kind:'unsupported-ranking',label:'PIB municipal'};
   if(/(?:mais populosa|mais habitantes|maiores populacoes)/.test(s)) return {kind:'cities',label:'municípios populosos de referência'};
   return {kind:'cities',label:'municípios populosos de referência'};
 }
 if(/(?:populacao|habitantes)/.test(s)) return {kind:'population',label:'população estimada'};
 if(/(?:area|extensao|km2)/.test(s)) return {kind:'area',label:'área territorial'};
 if(/(?:fronteira|faz divisa|paises vizinhos)/.test(s)) return {kind:'borders',label:'fronteiras'};
 return null;
}
const patterns={
 flag:r=>r.predicate==='possui' && ['verde','azul','amarelo','branco','vermelho','preto','laranja','marrom'].includes(human(r.object)),
 cities:r=>r.predicate==='tem' && human(r.object).startsWith('municipio populoso de referencia '),
 beaches:r=>r.predicate==='tem' && human(r.object).startsWith('praia ou destino costeiro conhecido '),
 metro:r=>r.predicate==='tem' && human(r.object).startsWith('municipio de referencia '),
 industry:r=>r.predicate==='tem' && human(r.object).startsWith('setor industrial relevante '),
 companies:r=>r.predicate==='tem' && human(r.object).startsWith('empresa com operacoes relevantes '),
 economy:r=>r.predicate==='tem' && human(r.object).startsWith('atividade economica relevante '),
 population:r=>r.predicate==='tem' && human(r.object).startsWith('populacao estimada de '),
 area:r=>r.predicate==='tem' && /area territorial/.test(human(r.object)),
 borders:r=>r.predicate==='tem' && /fronteira/.test(human(r.object)),
 capital:r=>r.predicate==='tem_capital'
};
function display(item,kind) {
 let value=human(item.object);
 const prefixes={cities:'municipio populoso de referencia ',beaches:'praia ou destino costeiro conhecido ',metro:'municipio de referencia ',industry:'setor industrial relevante ',companies:'empresa com operacoes relevantes ',economy:'atividade economica relevante '};
 if(prefixes[kind] && value.startsWith(prefixes[kind])) value=value.slice(prefixes[kind].length);
 return value;
}
const list=values=>values.length===1?values[0]:`${values.slice(0,-1).join(', ')} e ${values.at(-1)}`;
function populationComparison(db, question) {
 const normalized=normalize(question);
 if(!/populacao|habitantes/.test(normalized) || !/maior|mais|menor|menos/.test(normalized)) return null;
 const entity=findEntity(db,question);
 if(!entity) return null;
 const parsed=[];
 for(const row of db.prepare("SELECT id,subject,predicate,object FROM knowledge_relations WHERE predicate='tem'").all()) {
   const value=human(row.object);
   const match=value.match(/^populacao estimada de ([0-9 ]+) habitantes em ([0-9]{4})$/);
   if(match) parsed.push({...row,pop:Number(match[1].replaceAll(' ','')),year:Number(match[2])});
 }
 const ref=parsed.find(row=>row.subject===entity.id);
 if(!ref) return null;
 const larger=/maior|mais/.test(normalized);
 const matches=parsed.filter(row=>row.year===ref.year && row.subject!==ref.subject && (larger?row.pop>ref.pop:row.pop<ref.pop));
 if(matches.length===0) return {kind:'generic-semantic',answer:`Não encontrei outras unidades federativas com população ${larger?'maior':'menor'} que ${cap(db,entity.name)} nos dados de ${ref.year}.`,path:[ref],interpretation:{intent:'population-comparison',entity:entity.name,parser:'generic-semantic',neuralUsedForAnswer:false}};
 matches.sort((a,b)=>larger?b.pop-a.pop:a.pop-b.pop);
 const names=matches.map(row=>cap(db,human(row.subject)));
 return {kind:'generic-semantic',answer:`Segundo as estimativas cadastradas para ${ref.year}, as unidades federativas com população ${larger?'maior':'menor'} que ${cap(db,entity.name)} são: ${list(names)}.`,path:[ref,...matches],interpretation:{intent:'population-comparison',entity:entity.name,parser:'generic-semantic',neuralUsedForAnswer:false},explanation:'Comparei valores numéricos de população do mesmo ano armazenados nas relações do SQLite; não utilizei estimativas de anos diferentes.'};
}
export function genericSemanticAnswer(db,question) {
 const single=municipalMeasureAnswer(db,question);
 if(single) return single;
 const numeric=numericRankingAnswer(db,question);
 if(numeric) return numeric;
 const comparison=populationComparison(db,question);
 if(comparison) return comparison;
 const intent=classify(question);
 if(!intent) return null;
 if(intent.kind==='unsupported-ranking') return {kind:'semantic-data-gap',answer:`Ainda não tenho um ranking municipal verificado de ${intent.label} para responder com segurança. Você pode me ajudar a aprender sobre esse assunto?`,interpretation:{intent:intent.kind,parser:'generic-semantic',neuralUsedForAnswer:false},explanation:'A pergunta exige um ranking que não foi validado nos dados existentes.'};
 let entity=findEntity(db,question);
 if (!entity) return null;
 let subject=entity.id;
 if(intent.kind==='flag' && !subject.startsWith('bandeira_de_')) subject=`bandeira_de_${subject}`;
 if(intent.kind==='metro') {
   const capital=db.prepare('SELECT object FROM knowledge_relations WHERE subject=? AND predicate=? LIMIT 1').get(subject,'tem_capital')?.object;
   if(!capital) return null;
   subject=`regiao_metropolitana_de_${capital}`;
 }
 const rows=db.prepare('SELECT id,subject,predicate,object,confidence,source_type FROM knowledge_relations WHERE subject=?').all(subject);
 const relevant=rows.filter(patterns[intent.kind]??(()=>false));
 if(!relevant.length) return null;
 const values=[...new Set(relevant.map(r=>display(r,intent.kind)))];
 const title=cap(db,intent.kind==='flag'&&subject.startsWith('bandeira_de_')?subject.slice('bandeira_de_'.length):entity.name);
 const prefix={flag:`A bandeira de ${title} tem as cores`,capital:`A capital de ${title} é`,cities:`Entre os municípios populosos de referência de ${title} estão`,beaches:`Entre os destinos de praia conhecidos de ${title} estão`,metro:`Alguns municípios de referência na região metropolitana associada a ${title} são`,industry:`Entre os setores industriais relevantes de ${title} estão`,companies:`Entre as empresas com operações relevantes em ${title} estão`,economy:`Entre as atividades econômicas relevantes de ${title} estão`,population:`A informação cadastrada sobre a população de ${title} é`,area:`A informação cadastrada sobre a área de ${title} é`,borders:`As informações cadastradas sobre as fronteiras de ${title} incluem`}[intent.kind];
 const caveat=['cities','beaches','metro','industry','companies','economy'].includes(intent.kind)?' Essa lista reúne exemplos cadastrados, não um ranking completo ou oficial.':'';
 return {kind:'generic-semantic',answer:`${prefix} ${list(values)}.${caveat}`,
    path:relevant,source:'knowledge_relations',interpretation:{intent:intent.kind,entity:entity.name,property:intent.label,parser:'generic-semantic',neuralUsedForAnswer:false},
    explanation:`Interpretei a propriedade “${intent.label}” e recuperei ${relevant.length} relação(ões) existentes no SQLite. Nenhum ranking foi inventado.`};
}
