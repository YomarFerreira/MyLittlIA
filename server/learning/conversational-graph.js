import {hasUnboundReference} from '../conversation/entity-reference.js';
import {extractLimbStatement} from '../knowledge/relations.js';
import {randomUUID} from 'node:crypto';
import {normalize} from '../persistence/database.js';
import {renderConversationalTemplate} from '../language/response-templates.js';
import {canonicalClass, conceptInQuestion, geographicMention, classificationMatches} from '../language/lexical-equivalence.js';
import {buildGeographicIndex, geographicalPath} from '../reasoning/geographic-hierarchy.js';

const slug = s => normalize(s).replaceAll(' ','_');
const read = s => String(s ?? '').replaceAll('_',' ');
const proper = s => read(s).split(' ').map((w,i)=>i>0 && /^(?:de|do|da|dos|das|e)$/.test(w)?w:w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
const tidy = s => String(s).replace(/\s+/g,' ').trim();
const cleanSubject = s => tidy(s).replace(/^(?:o|a|os|as|um|uma)\s+/i,'');
const colors = ['vermelho','vermelha','preto','preta','branco','branca','azul','verde','amarelo','amarela','laranja','roxo','roxa','rosa','cinza','marrom','caramelo'];
const colorCanonical = new Map([['vermelha','vermelho'],['preta','preto'],['branca','branco'],['amarela','amarelo'],['roxa','roxo']]);
const color = s => colorCanonical.get(slug(s)) ?? slug(s);
const valid = f => f && f.subject?.length>=2 && f.subject.length<=100 && f.object?.length>=1 && f.object.length<=100 && f.predicate?.length<=64;
const fact = (s,p,o) => ({subject:slug(s),predicate:p,object:p==='possui_cor'?color(o):slug(o)});
const splitValues = s => s.split(/\s*(?:,|\be\b|\bou\b)\s*/).map(tidy).filter(Boolean);

// Vocabulário de lugares e categorias vem das relações aprovadas, e não de uma
// lista de estados escrita no interpretador. Evita cortar "Rio de Janeiro" em
// "rio" + "janeiro" e "Rio Grande do Norte" em "rio grande" + "norte".
function graphVocabulary(db, predicate, condition='') {
  if (!db) return [];
  try {
    const sql = predicate === 'places'
      ? `SELECT DISTINCT subject AS term FROM knowledge_relations WHERE predicate='tem_capital'
          UNION SELECT DISTINCT subject AS term FROM knowledge_relations
          WHERE predicate='e_um' AND object IN ('unidade_federativa_brasileira','estado_brasileiro')`
      : `SELECT DISTINCT object AS term FROM knowledge_relations WHERE predicate='e_um'`;
    return db.prepare(sql).all().map(row => read(row.term))
      .filter(Boolean).sort((a,b)=>b.length-a.length);
  } catch { return []; }
}
function categoryAndLocation(rest,db) {
  // Primeiro verifica o maior nome geográfico já conhecido (não apenas palavras isoladas).
  for (const name of graphVocabulary(db,'places')) {
    if (!rest.endsWith(' '+name)) continue;
    const prefix=rest.slice(0,-name.length).trim();
    const m=prefix.match(/^(.+?)\s+(?:de|do|da|dos|das)$/);
    if (m && m[1].trim()) return {category:m[1].trim(),location:name};
  }
  // Se a categoria já foi ensinada (clube de futebol, mamífero, etc.),
  // tudo após a preposição é o local, inclusive nomes compostos.
  for (const category of graphVocabulary(db,'categories')) {
    if (!rest.startsWith(category+' ')) continue;
    const remainder=rest.slice(category.length).trim();
    const m=remainder.match(/^(?:de|do|da|dos|das)\s+(.+)$/);
    if (m) return {category,location:m[1]};
  }
  // Compatibilidade com o caso inicial antes da importação de UFs ou categorias.
  // O local pode conter três ou mais palavras. Não deduzimos outros padrões
  // ambíguos sem apoio no grafo: o usuário poderá revisar uma proposta de classe.
  const football=rest.match(/^((?:clube|time) de futebol)\s+(?:de|do|da|dos|das)\s+(.+)$/);
  if (football) return {category:football[1],location:football[2]};
  return null;
}

// Análise conservadora: frases declarativas, sem interrogação. Casos ambíguos
// continuam na revisão humana. Não é um analisador universal de linguagem.
export function extractTeachingFacts(input, db=null) {
  const text=tidy(input);
  if (!text || text.length>2000 || text.includes('?')) return [];
  const clauses=text.replace(/^(?:sim|claro|certo)\s*[,!:]\s*/i,'')
    .split(/\s*[.;\n]\s*|\s+e\s+(?=(?:o som (?:do|da|de)|(?:o |a )?[a-z]+ (?:late|mia|muge|grasna|relincha|uiva)\b))/i).filter(Boolean);
  const found=[]; let subject=null;
  for (const raw of clauses) {
    const q=normalize(raw);
    let m;
    const limbs=extractLimbStatement(raw);
    const sounds={late:'latido',mia:'miado',muge:'mugido',grasna:'grasnido',relincha:'relincho',uiva:'uivo'};
    const vocal=q.match(/^(?:(?:o|a|um|uma) )?([a-z][a-z ]*?) (late|mia|muge|grasna|relincha|uiva)$/);
    const imitation=q.match(/^(?:o )?som (?:do|da|de) ([a-z][a-z ]*?) e ([a-z][a-z ]*)$/);
    if (vocal && !hasUnboundReference(vocal[1]) && !/\b(?:nao|nunca|talvez|acho|se)\b/.test(vocal[1])) {
      subject=cleanSubject(vocal[1]);found.push(fact(subject,'som_emitido',sounds[vocal[2]]));
    } else if (imitation && !hasUnboundReference(imitation[1]) && !/\b(?:nao|nunca|talvez|acho|se)\b/.test(imitation[1])) {
      found.push(fact(imitation[1],'onomatopeia',imitation[2]));
    } else if (limbs) { subject=limbs.subject; found.push(fact(subject,limbs.predicate,limbs.object)); }
    else if ((m=q.match(/^(.+?)\s+e\s+um(?:a)?\s+(.+)$/))) {
      subject=cleanSubject(m[1]);
      const parsed=categoryAndLocation(m[2],db);
      if (parsed) {
        found.push(fact(subject,'e_um',parsed.category));
        found.push(fact(subject,'localizado_em',parsed.location));
      } else {
        found.push(fact(subject,'e_um',m[2]));
      }
    } else if ((m=q.match(/^(?:suas|as|seus|os)\s+cores\s+(?:sao|eram)\s+(.+)$/))) {
      if(subject) for(const v of splitValues(m[1])) found.push(fact(subject,'possui_cor',v));
    } else if ((m=q.match(/^(.+?)\s+(?:tem|possui|usa|utiliza)\s+(?:as?\s+)?cores?\s+(.+)$/))) {
      subject=cleanSubject(m[1]);for(const v of splitValues(m[2])) found.push(fact(subject,'possui_cor',v));
    } else if ((m=q.match(/^(.+?)\s+(?:fica|esta localizado|esta localizada|tem sede|sediado|sediada)\s+(?:em|no|na)\s+(.+)$/))) {
      subject=cleanSubject(m[1]);found.push(fact(subject,'localizado_em',m[2]));
    } else if ((m=q.match(/^(.+?)\s+(?:come|bebe|produz)\s+(.+)$/))) {
      subject=cleanSubject(m[1]); const predicate=/\scome\s/.test(q)?'come':/\sbebe\s/.test(q)?'bebe':'produz';
      for(const v of splitValues(m[2]))found.push(fact(subject,predicate,v));
    } else if ((m=q.match(/^(.+?)\s+(?:tem|possui)\s+(.+)$/))) {
      subject=cleanSubject(m[1]); found.push(fact(subject,'possui',m[2]));
    }
  }
  // Padroniza a classe também no ensino: uma informação sobre "time de
  // futebol" deve alimentar o mesmo conceito de "clube de futebol".
  const canonicalFacts=found.filter(f=>valid(f) && !hasUnboundReference(read(f.subject))).map(f=>f.predicate==='e_um' && db
    ? {...f,object:slug(canonicalClass(db,f.object))}:f);
  return [...new Map(canonicalFacts.map(f=>[`${f.subject}|${f.predicate}|${f.object}`,f])).values()].slice(0,20);
}
export function stageTeachingFacts(db,conversationId,text,facts,{sourceUrl=null,referenceYear=null}={}) {
  if(!facts.length) return [];
  const batch=randomUUID();
  const insert=db.prepare(`INSERT INTO knowledge_proposals
    (id,conversation_id,subject,predicate,object,original_text,batch_id,source_url,reference_year)
    VALUES (?,?,?,?,?,?,?,?,?)`);
  const saved=[];
  for(const f of facts) {
    const existing=db.prepare(`SELECT id,status FROM knowledge_proposals
      WHERE conversation_id=? AND subject=? AND predicate=? AND object=? AND status='pending' LIMIT 1`)
      .get(conversationId,f.subject,f.predicate,f.object);
    if(existing) {saved.push({...f,id:existing.id,alreadyPending:true});continue;}
    const id=randomUUID();insert.run(id,conversationId,f.subject,f.predicate,f.object,text,batch,sourceUrl,referenceYear);
    saved.push({...f,id});
  }
  return saved;
}
export function previewTeaching(db,facts) {
  return renderConversationalTemplate(db,'learning-multiple-preview',{
    facts:facts.map(f=>`${read(f.subject)} → ${read(f.predicate)} → ${read(f.object)}`).join('; ')
  }) ?? 'Identifiquei relações para sua revisão. Nenhuma foi aprovada automaticamente.';
}

function statement(db,key,vars) {return renderConversationalTemplate(db,key,vars);}
const edges=(db,p,o)=>db.prepare('SELECT subject,predicate,object,id FROM knowledge_relations WHERE predicate=? AND object=? ORDER BY subject').all(p,o);
const outgoing=(db,s,p)=>db.prepare('SELECT subject,predicate,object,id FROM knowledge_relations WHERE subject=? AND predicate=? ORDER BY object').all(s,p);
const distinct=a=>[...new Set(a)];
const matches=(value, q)=>new RegExp(`(?:^|\\s)${read(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?=\\s|$)`).test(q);
function subjectMentioned(db,q) {
  const subjects=db.prepare('SELECT DISTINCT subject FROM knowledge_relations').all().map(x=>x.subject).sort((a,b)=>b.length-a.length);
  return subjects.find(s=>matches(s,q))??null;
}
/**
 * Consulta genérica de entidades por classe e local. Uma palavra diferente
 * pode identificar a mesma categoria, mas "principais" é uma solicitação de
 * ranking — não um sinônimo de "existentes".
 *
 * Usa as classes EFETIVAMENTE presentes no grafo e equivalências no SQLite.
 * Não muda fatos nem presume que a lista de conhecidos seja um ranking.
 */
// Leitura agrupada de propriedades REAIS dos membros encontrados pelo grafo.
// Não transforma "conhecer o clube" em "conhecer o faturamento ou seus títulos".
export function classPropertiesByLocationAnswer(db,input) {
  const q=normalize(input).replace(/^(?:(?:ok|certo|entao|bem|agora|sim|e)\s+){1,5}/,'');
  if(!/^(?:quais?|cite|lista|liste|mostre|me diga|me fale|fale|conhece|voce conhece|vc conhece|quanto|quantos|quantas|qual)\b/.test(q)) return null;
  const metrics=[
    {key:'colors',name:'cores',expression:/\b(?:cores?|coloracao|tonalidades?)\b/,predicates:new Set(['possui_cor','cor_tipica','cor','coloracao'])},
    {key:'titles',name:'títulos',expression:/\b(?:titulos?|trofeus?|conquistas?|campeonatos?)\b/,predicates:new Set(['titulo','titulos','possui_titulo','conquistou','ganhou_titulo','campeao_de','campeonato_conquistado'])},
    {key:'revenue',name:'faturamento',expression:/\b(?:faturamentos?|receitas?|lucros?)\b/,predicates:new Set(['faturamento','receita','receita_anual','faturamento_anual','receita_total'])},
    {key:'size',name:'tamanho',expression:/\b(?:tamanho|tamanhos)\b/,predicates:new Set()}
  ];
  const metric=metrics.find(m=>m.expression.test(q));
  if(!metric)return null;
  const place=geographicMention(db,q);
  if(!place)return null;
  const classifications=db.prepare("SELECT id,subject,predicate,object FROM knowledge_relations WHERE predicate='e_um'").all();
  const knownClasses=[...new Set(classifications.map(r=>canonicalClass(db,r.object)))];
  const choices=knownClasses.map(canonical=>({canonical,phrase:conceptInQuestion(db,q,canonical)}))
    .filter(c=>c.phrase).sort((a,b)=>b.phrase.length-a.phrase.length);
  if(!choices.length)return null;
  const selected=choices[0].canonical, index=buildGeographicIndex(db);
  const membership=classifications.filter(r=>classificationMatches(db,r.object,selected))
    .filter(r=>Boolean(geographicalPath(index,r.subject,place.canonical)));
  const subjects=[...new Set(membership.map(r=>r.subject))]
    .sort((a,b)=>proper(a).localeCompare(proper(b),'pt-BR'));
  if(!subjects.length)return null;
  const kind=selected==='clube de futebol'?'clubes de futebol':read(selected);
  const vars={class:kind,location:proper(place.canonical),property:metric.name,count:subjects.length};
  if(metric.key==='size') {
    const answer=statement(db,'graph-group-size-ambiguous',vars);
    return answer?{kind:'graph-group-property',answer,path:membership,
      interpretation:{intent:'group-size-clarification',property:'size',parser:'geographic-graph-group',neuralUsedForAnswer:false},
      explanation:'Tamanho de clube pode representar torcida, receita, patrimônio ou títulos. Solicitei um critério sem presumir uma medida.'}:null;
  }
  const matching=[];
  for(const subject of subjects) {
    const rows=db.prepare('SELECT id,subject,predicate,object,source_type,confidence FROM knowledge_relations WHERE subject=?').all(subject);
    const actual=rows.filter(r=>metric.predicates.has(r.predicate));
    if(actual.length)matching.push({subject,rows:actual});
  }
  const isRanking=/\b(?:maiores?|menores?|melhores?|principais|mais rico|mais ricos|ranking|lideres?)\b/.test(q);
  const availableCount=matching.length;
  const uncovered=subjects.length-availableCount;
  const output=matching.slice(0,15).map(group=>`${proper(group.subject)}: ${[...new Set(group.rows.map(r=>read(r.object)))].join(', ')}`);
  const messageKey=availableCount===0?'graph-group-property-unavailable'
    :isRanking?'graph-group-property-ranking-insufficient':'graph-group-property-known';
  vars.values=output.join('; ') + (matching.length>15?`; mais ${matching.length-15} registro(s) com dados não exibidos nesta resposta`:'');
  vars.available=availableCount;
  vars.uncovered=uncovered;
  vars.remaining=Math.max(0,matching.length-output.length);
  const answer=statement(db,messageKey,vars);
  if(!answer)return null;
  const sourceRows=[...membership.flatMap(row=>[row,...(geographicalPath(index,row.subject,place.canonical)?.path??[])]),...matching.flatMap(group=>group.rows)];
  return {kind:'graph-group-property',answer,
    path:[...new Map(sourceRows.filter(row=>row.id).map(row=>[row.id,row])).values()],
    interpretation:{intent:availableCount?'group-property-partial':'group-property-unavailable',
      property:metric.key,parser:'geographic-graph-group',
      matchedLocation:place.phrase,canonicalClass:selected,availableCount,uncovered,
      rankingVerified:false,neuralUsedForAnswer:false},
    explanation:'Cruzei a classificação de entidades, seus locais comprovados e atributos individuais aprovados no SQLite. Não herdei atributos da região nem criei dados para registros ausentes.'};
}

// Listagens extensas são apresentadas como amostra geográfica, não como um
// despejo de centenas de nomes. A quantidade real permanece na interpretação.
function conciseClassList(db,entries,index,klass,place) {
  const hasLabels=Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='entity_labels'").get());
  const readLabel=hasLabels?db.prepare('SELECT display_name FROM entity_labels WHERE entity=?'):null;
  const groups=new Map();
  for(const item of entries){
    const label=readLabel?.get(item.subject)?.display_name;
    if(!label)continue;
    const state=[...index.brazilianUFs.keys()].find(uf=>geographicalPath(index,item.subject,uf));
    const heading=state?(readLabel?.get(state)?.display_name||proper(state)):(readLabel?.get(place)?.display_name||proper(place));
    if(!groups.has(heading))groups.set(heading,[]);
    groups.get(heading).push(label);
  }
  const examples=[...groups.entries()].sort((a,b)=>b[1].length-a[1].length).slice(0,4)
   .map(([state,items])=>`${items.slice(0,2).join(' e ')} (${state})`);
  if(!examples.length)examples.push(entries.slice(0,8).map(r=>proper(r.subject)).join(', '));
  const kind=klass==='clube de futebol'?'clubes de futebol':`registros de ${klass}`;
  return `Bem, conheço ${entries.length} ${kind} relacionados a ${readLabel?.get(place)?.display_name||proper(place)} na minha base. Alguns exemplos: ${examples.join('; ')}. Esta é apenas uma amostra, não uma classificação dos maiores. Posso filtrar por estado ou por um critério específico.`;
}

export function classByLocationAnswer(db,input) {
  let q=normalize(input);
  if (!q) return null;
  q=q.replace(/^(?:(?:ok|certo|entao|bem|agora|sim|e)\s+){1,5}/,'');
  if (!/^(?:(?:quais?|cite|lista|liste|mostre|me diga|me fale|fale|conhece|voce conhece|vc conhece)\b)/.test(q)) return null;
  // Não transformar uma pergunta sobre atributos dos grupos em uma simples listagem.
  if (/\b(?:cores?|titulos?|torcidas?|uniformes?|mascotes?|escudos?|jogadores?|patrocinadores?|fundacao|fundados?|populacao|pib|salarios?|faturamentos?|receitas?|lucros?|tamanhos?|capacidades?|estadios?|valor(?:es)? de mercado|fundadores?)\b/.test(q)) return null;
  const place=geographicMention(db,q) || geographicMention(db,q.replace(/\s+(?:voce|vc)\s+conhece$/,''));
  if (!place) return null;
  // Procura no universo de classes conhecidas, pois uma classe pode não ter
  // nenhuma aresta DIRETA para a localidade (caso típico: clubes do Brasil).
  const classifications=db.prepare("SELECT id,subject,predicate,object FROM knowledge_relations WHERE predicate='e_um'").all();
  const candidates=[...new Set(classifications.map(r=>canonicalClass(db,r.object)))];
  const choices=candidates.map(canonical=>({canonical,phrase:conceptInQuestion(db,q,canonical)}))
    .filter(item=>Boolean(item.phrase))
    .sort((a,b)=>b.phrase.length-a.phrase.length);
  if(!choices.length)return null;
  const selected=choices[0].canonical;
  const index=buildGeographicIndex(db);
  const found=[];
  for(const classification of classifications) {
    if(!classificationMatches(db,classification.object,selected))continue;
    const route=geographicalPath(index,classification.subject,place.canonical);
    if(route)found.push({subject:classification.subject,route,classification});
  }
  if(!found.length)return null;
  const unique=[...new Map(found.map(f=>[f.subject,f])).values()]
    .sort((a,b)=>proper(a.subject).localeCompare(proper(b.subject),'pt-BR'));
  const requestedRanking=/\b(?:principais|melhores|maiores|mais importantes|mais tradicionais|mais populares|mais famosos)\b/.test(q);
  const football=selected==='clube de futebol';
  const nationwide=slug(place.canonical)==='brasil';
  const key=nationwide
    ? (requestedRanking
      ? (football?'graph-clubs-country-importance-unknown':'graph-class-country-importance-unknown')
      : (football?'graph-clubs-country':'graph-class-country'))
    : (requestedRanking
      ? (football?'graph-clubs-importance-unknown':'graph-class-importance-unknown')
      : (football?'graph-clubs-location':'graph-class-location'));
  const vars={location:proper(place.canonical),class:read(selected),entities:unique.map(f=>proper(f.subject)).join(', ')};
  const answer=(!requestedRanking&&unique.length>12)
    ? conciseClassList(db,unique,index,selected,place.canonical)
    : statement(db,key,vars);
  if(!answer)return null;
  const path=[...new Map(unique.flatMap(f=>[f.classification,...f.route.path])
    .filter(r=>r?.id).map(r=>[r.id,r])).values()];
  return {kind:'general-graph-qa',answer,path,interpretation:{
    intent:requestedRanking?'class-ranking-without-criterion':'class-membership-list',
    parser:'sqlite-lexical-equivalence-and-geographic-graph',canonicalClass:selected,
    matchedClass:choices[0].phrase,matchedLocation:place.phrase,
    qualifier:requestedRanking?'importance-unverified':null,
    inferred:unique.some(f=>f.route.derived),listedCount:unique.length,
    neuralUsedForAnswer:false},
    explanation:requestedRanking
      ? 'Encontrei entidades por ligações geográficas aprovadas, mas não presumi um ranking sem indicadores comparáveis.'
      : 'Percorri as relações geográficas aprovadas e as classes de UFs brasileiras. Os caminhos inferidos não foram gravados como fatos novos; a lista se limita às entidades conhecidas.'};
}

export function generalGraphAnswer(db,input) {
  const q=normalize(input);if(!q || !(/\?/.test(input) || /^(?:(?:ok|certo|entao|bem|agora|sim|e)\s+){0,5}(?:quais?|quem|cite|fale|me diga|mostre|liste|onde|o que)\b/.test(q)))return null;
  const groupedProperties=classPropertiesByLocationAnswer(db,input);
  if(groupedProperties)return groupedProperties;
  const classResponse=classByLocationAnswer(db,input);
  if(classResponse) return classResponse;
  let m, key=null, vars=null, path=[];
  // Respostas com leitura em ambos os sentidos sem cadastrar perguntas prontas.
  if((m=q.match(/^(?:quais?\s+)?(?:clubes?|times?)\b.*\b(?:usam|utilizam|possuem|tem|têm)\s+(?:a\s+)?(?:cor\s+)?([a-z]+)\??$/)) && colors.includes(m[1])) {
    const colorValue=color(m[1]);const relations=edges(db,'possui_cor',colorValue);
    const found=relations.filter(r=>outgoing(db,r.subject,'e_um').some(c=>classificationMatches(db,c.object,'clube de futebol')));
    if(found.length) {key='graph-inverse-colors';vars={color:colorValue,entities:distinct(found.map(r=>proper(r.subject))).join(', ')};path=found;}
  }
  if(!key && (m=q.match(/^(?:cite|liste|quais|me diga|mostre)\b.*\bclubes?\b.*\bfutebol\b.*\b(?:de|do|da|em)\s+([a-z ]+?)\??$/))) {
    const location=slug(m[1]);const relations=edges(db,'localizado_em',location);
    const found=relations.filter(r=>outgoing(db,r.subject,'e_um').some(c=>classificationMatches(db,c.object,'clube de futebol')));
    if(found.length){key='graph-clubs-location';vars={location:proper(location),entities:distinct(found.map(r=>proper(r.subject))).join(', ')};path=found;}
  }
  if(!key && (m=q.match(/^(?:cite|liste|mostre)\s+(?:um|uma|alguns|algumas)\s+(.+)\s+(?:de|do|da|em)\s+([a-z]+)$/))) {
    const group=slug(m[1]),location=slug(m[2]);
    const found=edges(db,'localizado_em',location).filter(r=>outgoing(db,r.subject,'e_um').some(c=>c.object===group));
    if(found.length){key='graph-class-location';vars={class:read(group),location:proper(location),entities:distinct(found.map(r=>proper(r.subject))).join(', ')};path=found;}
  }
  if(!key && (m=q.match(/^(?:o que (?:voce|vc) sabe|fale|me conte|me diga) sobre (?:o )?futebol (?:de|do|da)\s+([a-z ]+?)\??$/))) {
    const location=slug(m[1]);const relations=edges(db,'localizado_em',location);
    const found=relations.filter(r=>outgoing(db,r.subject,'e_um').some(c=>classificationMatches(db,c.object,'clube de futebol')));
    key=found.length?'graph-football-topic':'graph-football-unknown';vars={location:proper(location),entities:distinct(found.map(r=>proper(r.subject))).join(', ')};path=found;
  }
  if(!key && /\b(?:bioma|vegetacao|atividade economica|economia)\b/.test(q)) {
    const subject=subjectMentioned(db,q);
    if(subject) {
      const kind=/\bbioma\b/.test(q)?'bioma':/\bvegetacao\b/.test(q)?'vegetacao_predominante':'atividade_economica';
      const found=outgoing(db,subject,kind);
      if(found.length){key='graph-attribute';vars={entity:proper(subject),attribute:read(kind),values:distinct(found.map(x=>read(x.object))).join(' e ')};path=found;}
    }
  }
  if(!key && /\b(?:cor|cores)\b/.test(q)) {
    const subject=subjectMentioned(db,q);
    if(subject){const found=outgoing(db,subject,'possui_cor');if(found.length){key='graph-colors';vars={entity:proper(subject),values:distinct(found.map(x=>read(x.object))).join(' e ')};path=found;}}
  }
  if(!key && /\b(?:onde fica|onde esta|localizado|localizada|localizacao|sede)\b/.test(q)) {
    const subject=subjectMentioned(db,q);
    if(subject){const found=outgoing(db,subject,'localizado_em');if(found.length){key='graph-location';vars={entity:proper(subject),values:distinct(found.map(x=>read(x.object))).join(' e ')};path=found;}}
  }
  if(!key)return null;
  const answer=statement(db,key,vars);if(!answer)return null;
  return {kind:'general-graph-qa',answer,path,interpretation:{intent:'graph-query',parser:'bidirectional-relation-query',neuralUsedForAnswer:false},explanation:'Consultei apenas relações aprovadas, com seleção por entidade, predicado e valor.'};
}
