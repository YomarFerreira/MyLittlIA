import {hasUnboundReference} from '../conversation/entity-reference.js';
import {extractTeachingFacts} from './conversational-graph.js';
// v0.28.3 — Validação conservadora de ensinamentos.
// Uma incompatibilidade lexical não prova que um fato é falso. Nunca rejeitar
// automaticamente registros antigos; somente impedir aprovação de não-fatos claros.
import { normalize } from '../persistence/database.js';
import { parseMunicipalAreaTeaching } from './structured-teaching.js';

const greeting = /^(?:(?:oi|ola|alo|bom dia|boa tarde|boa noite|e ai|tudo bem|tudo bom|tudo ok|como vai|beleza|ok|certo|obrigad[oa]|valeu|ate logo|tchau|sim|sim posso|claro|com certeza|nao|nao sei|posso|pode ser)(?: (?:tudo bem|tudo bom|tudo ok|como vai|por aqui|tambem|pra voce|para voce|obrigad[oa]))*)$/;
const starterQuestion = /^(?:e )?(?:qual|quais|quem|onde|quando|por que|porque|como|quantos|quantas|o que|voce sabe|me explique|me diga|pode me dizer)\b/;
const structuredLine = /(?:^|\n)\s*\d{1,3}[.)]\s*[^\n:]+:\s*[^\n]+/m;
const stop = new Set(['qual','quais','quem','quando','onde','como','porque','por','sobre','isso','esta','esse','essa','uma','para','sao','com','que','tem','foi','foram','ser','mais','menos','do','da','de','dos','das','nos','nas','entre','pode','sabe','estado','cidade','cidades','municipio','municipios','informacao','informacoes','o','a','e']);
const tokens = str => new Set(normalize(str).split(' ').filter(x=>x.length>3 && !stop.has(x)));
const stripGreeting = s=>s.replace(/[!?.,;:]+$/g,'').trim();

export function evaluateTeaching(question, answer) {
  const q=String(question??'').trim();
  const a=String(answer??'').trim();
  const cleaned=stripGreeting(normalize(a));
  const issues=[];
  let status='ok';
  const block=(code,message)=>{status='blocked';issues.push({code,message});};
  const review=(code,message)=>{if(status!=='blocked')status='review';issues.push({code,message});};
  if(!q || !a) block('empty','Pergunta ou explicação ausente.');
  else if (greeting.test(cleaned)) block('social','A resposta parece ser apenas uma saudação ou confirmação, e não ensina algo sobre a pergunta.');
  else if (a.trim().endsWith('?') && starterQuestion.test(cleaned)) block('question','A resposta parece ser uma nova pergunta, não um ensinamento.');
  else if (a.length<4) block('too-short','O texto não contém uma explicação identificável.');
  else {
    const areas=parseMunicipalAreaTeaching(q,a);
    const structured=structuredLine.test(a);
    if (!areas.length && structured && /\b(?:municipios|cidades|km2|extensao|area)\b/.test(normalize(q))) {
      review('unparsed-list','A lista não pôde ser interpretada com segurança como medidas numéricas. Confira os itens antes de aprovar.');
    }
    // Quando a pergunta cita um assunto concreto e a explicação parece falar de
    // outro sujeito completamente diferente, oferecer revisão, nunca rejeitar.
    const qt=tokens(q), at=tokens(a);
    const shared=[...qt].some(word=>at.has(word) || [...at].some(t=>t.startsWith(word.slice(0,5)) && word.length>=5));
    const wellFormed=areas.length>0 || /\b(?:e|sao|possui|tem|fica|localiza|corresponde|consiste|significa|inventa|inventada|inventado|foi|eram|mede|apresenta|produz|contem|pertence|aconteceu|nasceu|morreu)\b/.test(cleaned);
    if (!shared && !wellFormed && !structured && qt.size>0 && at.size>=4) {
      review('topic-unclear','Não identifiquei uma ligação clara entre a pergunta e o ensinamento. Confira se correspondem ao mesmo assunto.');
    }
    if (!structured && cleaned.length<11 && !/\bcapital\b/.test(normalize(q))) {
      review('little-context','A informação é muito curta. Confirme se responde à pergunta original.');
    }
  }
  if (hasUnboundReference(q) && !extractTeachingFacts(a).length) {
    block('unbound-reference','A pergunta depende de uma entidade não identificada. Especifique o nome na explicação antes de aprovar.');
  }
  return {status,issues};
}
