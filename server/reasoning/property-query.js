import {normalize} from '../persistence/database.js';
import {renderConversationalTemplate} from '../language/response-templates.js';
import {composePropertyAnswer} from '../language/semantic-composer.js';

const readable = s => String(s).replaceAll('_',' ');
const definitions = [
 {id:'features',strict:true,words:/\b(?:quantas patas|numero de patas|quantidade de patas)\b/,predicates:['numero_patas_tipico'],labels:['caracteristica'],template:'property-features'},
 {id:'color',words:/\b(?:cor|cores|coloracao|tonalidade)\b/,predicates:['cor_tipica','cor','coloracao','possui_cor'],labels:['cor','coloracao'],template:'property-color'},
 {id:'food',words:/\b(?:come|comem|alimenta|alimentacao|dieta|comida)\b/,predicates:['come','alimenta_se_de','alimentacao','dieta'],labels:['alimento'],template:'property-food'},
 {id:'sound',words:/\b(?:som|sons|barulho|barulhos|som_emitido|vocaliza|vocalizacao|late|latido|mia|miado|muge|mugido|ruge|rugido|uiva|uivo|relincha|relincho|canta|canto)\b/,predicates:['som_emitido','emite_som','vocalizacao','vocaliza','onomatopeia','faz_som'],labels:['som'],template:'property-sound'},
 {id:'drink',words:/\b(?:bebe|bebem|bebida)\b/,predicates:['bebe'],labels:['bebida'],template:'property-drink'},
 {id:'habitat',words:/\b(?:habitat|vive|vivem|mora|moram|habita|encontrado|localizacao)\b/,predicates:['habitat','vive_em','localizado_em','distribuicao_geografica','distribuicao','ocorre_em'],labels:['habitat'],template:'property-habitat'},
 {id:'breathing',words:/\b(?:respira|respiram|respiracao|pulmoes|branquias|guelras)\b/,predicates:['respira_por','possui_pulmoes','possui_branquias','possui_guelras'],labels:['respiracao'],template:'property-breathing'},
 {id:'size',words:/\b(?:tamanho|altura|comprimento|mede|peso|pesa|pesam)\b/,predicates:['tamanho','altura','comprimento','peso','peso_tipico'],labels:['tamanho'],template:'property-size'},
 {id:'movement',words:/\b(?:voa|voam|corre|correm|pula|pulam|rasteja|rastejam|nada|nadam|locomove|velocidade)\b/,predicates:['voa','corre','pula','rasteja','nada','locomove_se','locomocao','velocidade_maxima'],labels:['locomocao'],template:'property-movement'},
 {id:'features',words:/\b(?:pelos|penas|escamas|asas|chifres|bico|tromba|patas|caracteristicas|possui|tem)\b/,predicates:['possui','tem','caracteristica','revestimento','possui_pelos','possui_penas','possui_escamas','possui_asas','numero_patas_tipico'],labels:['caracteristica'],template:'property-features'},
 {id:'predators',words:/\b(?:predador|predadores|presa|caca|cacam)\b/,predicates:['predador_de','tem_predador','predador','predadores_possiveis'],labels:['predador'],template:'property-predators'},
 {id:'distribution',words:/\b(?:distribuicao|distribuido|regiao|regioes|continente|continentes|paises|pais|onde e encontrado|em que lugar do mundo)\b/,predicates:['distribuicao_geografica','distribuicao','localizado_em','ocorre_em'],labels:['distribuicao'],template:'property-distribution'},
 {id:'domestic',words:/\b(?:domesticavel|domesticado|domestico|domesticacao)\b/,predicates:['domesticavel','domesticado'],labels:['domesticacao'],template:'property-domestic'},
 {id:'prey',words:/\b(?:caca|cacam|preda|predam|presas|presa|captura|capturam)\b/,predicates:['preda','predador_de'],labels:['presa'],template:'property-prey'},
 {id:'conservation',words:/\b(?:extincao|ameacado|conservacao)\b/,predicates:['estado_conservacao','risco_extincao'],labels:['conservacao'],template:'property-conservation'},
];
const common = new Set(['o','a','os','as','um','uma','de','do','da','dos','das','qual','quais','que','como','onde','quanto','quantos','sobre','e','ele','ela','se','vc','voce','animal','animais','cor','cores','coloracao','comida','habitat','tamanho','peso','altura','respira','alimentacao','come','bebe','vive','tem','possui','voa','corre','pula','nada','rasteja','predador','velocidade','maxima','sao','é','e','por','tipo','tipica','tipico','principal']);
const boundary = s=>new RegExp(`(?:^|\\s)${s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?=\\s|$)`);
function matchSubject(db,q) {
 const rows=db.prepare('SELECT DISTINCT subject FROM knowledge_relations').all();
 const candidates=rows.filter(r=>boundary(readable(r.subject)).test(q)).sort((a,b)=>b.subject.length-a.subject.length);
 return candidates[0]?.subject ?? null;
}
function rowMatches(row,definition) {
 if(definition.predicates.includes(row.predicate)) return true;
 if(definition.strict) return false;
 if(!['possui','tem','caracteristica'].includes(row.predicate)) return false;
 const value=readable(row.object);
 if(definition.id==='color') return /\b(?:cor|coloracao|rosa|rosada|marrom|branca|branco|preto|preta|amarela|amarelo|verde|azul|vermelha|vermelho|cinza|caramelo|laranja)\b/.test(value);
 if(definition.id==='breathing') return /\b(?:pulmoes|branquias|guelras|respiracao)\b/.test(value);
 if(definition.id==='habitat') return /\b(?:rio|floresta|oceano|mar|lago|pantanal|savana|habitat)\b/.test(value);
 if(definition.id==='features') return true;
 return false;
}
export function propertyOfText(input) {
 const q=normalize(input),definition=definitions.find(item=>item.words.test(q));
 return definition?{id:definition.id,label:definition.words.exec(q)?.[0],predicates:definition.predicates}:null;
}
export function propertyQueryAnswer(db,input,contextSubject=null) {
 const q=normalize(input).replace(/^(?:(?:entao|mas|bem|agora|me diga|e)\s+)+/,'');
 const definition=definitions.find(d=>d.words.test(q));
 if(!definition) return null;
 // Só interceptar consultas sobre entidades explícitas, não afirmações de ensino.
 if(!/\?$/.test(String(input).trim()) && !/^(?:qual|quais|como|onde|quanto|quantos|quantas|o que|que cor|de que|e o|e a|ele|ela)\b/.test(q)) return null;
 const explicitSubject=matchSubject(db,q);
 // O pronome só herda o sujeito anterior quando a pergunta não informa outra entidade.
 const pronoun=/\b(?:ele|ela|dele|dela|esse|essa|isso)\b/.test(q);
 const subject=explicitSubject || ((pronoun || /^(?:e |e$|qual |quais |como |onde |o que |que |ele |ela |tem |possui |faz )/.test(q)) && contextSubject ? contextSubject : null);
 if(!subject) return null;
 const rows=db.prepare('SELECT id,subject,predicate,object,confidence,source_type FROM knowledge_relations WHERE subject=? ORDER BY predicate,object').all(subject);
 let matches=rows.filter(r=>rowMatches(r,definition));
 // Uma propriedade de classe só é herdada quando houver relação explícita de classe e atributo.
 if(!matches.length) {
  const classes=rows.filter(r=>r.predicate==='e_um').map(r=>r.object);
  for(const cl of classes.slice(0,8)) {
   const inherited=db.prepare('SELECT id,subject,predicate,object,confidence,source_type FROM knowledge_relations WHERE subject=?').all(cl).filter(r=>rowMatches(r,definition));
   matches.push(...inherited.map(r=>({...r,inheritedFrom:cl})));
  }
 }
 if(!matches.length) {
  if(definition.strict) return {kind:'property-missing',answer:`Ainda não tenho uma quantidade de patas aprovada para ${readable(subject)}. Conhecer outras características não informa esse número. Você pode me ensinar e aprovar a informação em Cadastrar conhecimento.`,path:[],interpretation:{intent:'property-missing',entity:subject,property:'numero_patas_tipico',parser:'sqlite-property-query',neuralUsedForAnswer:false}};
  return null;
 }
 if(definition.id==='sound') {
  const linked=[];
  for(const row of matches.filter(r=>r.predicate==='som_emitido')) {
   linked.push(...db.prepare("SELECT id,subject,predicate,object,confidence,source_type FROM knowledge_relations WHERE subject=? AND predicate='onomatopeia'").all(row.object));
  }
  matches.push(...linked);
 }
 const unique=[...new Map(matches.map(r=>[`${r.predicate}:${r.object}`,r])).values()].slice(0,12);
 const composed=composePropertyAnswer(db,definition,subject,unique);
 if(!composed) return null;
 return {kind:'graph-property',answer:composed.answer,path:composed.sources,interpretation:{intent:'property-query',entity:subject,property:definition.id,parser:'sqlite-semantic-composer',neuralUsedForAnswer:false,inherited:composed.sources.some(r=>r.inheritedFrom)},explanation:'Composição por predicado e modelos linguísticos do SQLite; sem criação de fatos.'};
}
