import { renderConversationalTemplate } from '../language/response-templates.js';
import { normalize } from '../persistence/database.js';

const ANIMAL_CLASSES = ['anfibio','mamifero','inseto','herbivoro','peixe','molusco','vertebrado','invertebrado','animal marinho','agua doce','ave','reptil','carnivoro','onivoro'];
const human = value => String(value).replaceAll('_',' ');
const sentence = words => words.map(human).join(', ');

// A síntese é calculada sobre as relações presentes no SQLite: nenhum animal ou
// atributo é fabricado. O reconhecimento da intenção não é um modelo neural.
export function topicSummaryAnswer(db, input) {
  const q = normalize(input);
  const m = q.match(/^(?:(?:o que|quais (?:coisas|informacoes)) (?:voce|vc|a mylittlia) (?:sabe|conhece|aprendeu|tem (?:de )?informacao(?:es)?) (?:sobre|de)|(?:me )?(?:fale|conte|explique) (?:um pouco )?(?:sobre|a respeito de))\s+(.+?)\s*$/);
  if (!m) return null;
  const raw = m[1].replace(/^(?:os|as|o|a)\s+/,'').trim();
  if (!raw || raw.length>70) return null;
  const animalTopic = /^(?:animais|animal|fauna|zoologia)$/.test(raw);
  const terms = animalTopic ? ANIMAL_CLASSES.map(v=>normalize(v).replaceAll(' ','_')) : [raw.replaceAll(' ','_'),raw];
  const placeholders = terms.map(()=>'?').join(',');
  const categories = db.prepare(`SELECT object,COUNT(DISTINCT subject) n FROM knowledge_relations WHERE predicate='e_um' AND object IN (${placeholders}) GROUP BY object ORDER BY n DESC, object`).all(...terms);
  const subjects = db.prepare(`SELECT DISTINCT subject FROM knowledge_relations WHERE predicate='e_um' AND object IN (${placeholders}) ORDER BY subject`).all(...terms).map(x=>x.subject);
  if (!subjects.length) return null;
  const props = db.prepare(`SELECT predicate,COUNT(DISTINCT subject) n FROM knowledge_relations WHERE subject IN (SELECT DISTINCT subject FROM knowledge_relations WHERE predicate='e_um' AND object IN (${placeholders})) AND predicate <> 'e_um' GROUP BY predicate ORDER BY n DESC LIMIT 8`).all(...terms);
  const scope = animalTopic ? 'animais' : raw;
  // O resumo conversacional não expõe tabelas, predicados nem contagens técnicas.
  // Todas as categorias e habilidades citadas abaixo dependem de registros existentes.
  const categoryLabels = [...new Set(categories.map(c => human(c.object)))];
  const categoryPhrase = categoryLabels.length ? ` como ${categoryLabels.slice(0,5).join(', ')}` : '';
  const attrLabels = new Map([
    ['come','alimentação'], ['bebe','o que bebem'], ['habitat','habitat'],
    ['vive_em','onde vivem'], ['localizado_em','onde vivem'],
    ['respira_por','respiração'], ['locomove_se','locomoção'],
    ['possui','características físicas'], ['possui_pelos','pelos'],
    ['cor_tipica','cores'], ['predador_de','relações entre predadores e presas'],
    ['tem_predador','predadores'], ['predador','predadores']
  ]);
  const attributes = [...new Set(props.map(p=>attrLabels.get(p.predicate)).filter(Boolean))].slice(0,5);
  const learning = attributes.length ? renderConversationalTemplate(db,'topic-learning',{attributes:attributes.join(', ')}) : '';
  const answer = animalTopic
    ? renderConversationalTemplate(db,'topic-animals',{categories:categoryPhrase,learning:learning||''})
    : renderConversationalTemplate(db,'topic-category',{category:human(raw),learning:learning||''});
  if (!answer) return null;
  return {
    kind:'knowledge-topic-summary',
    answer,
    interpretation:{intent:'knowledge-topic-summary',entity:scope,parser:'sqlite-topic-aggregation',neuralUsedForAnswer:false,entityCount:subjects.length,categoryCount:categories.length},
    explanation:'Resumo conversacional fundamentado nas relações cadastradas; contagens e SQLite ficam nos detalhes técnicos.'
  };
}
