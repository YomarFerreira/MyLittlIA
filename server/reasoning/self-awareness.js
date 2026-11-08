import { renderConversationalTemplate } from '../language/response-templates.js';
import {normalize} from '../persistence/database.js';
const fmt = (date,opts) => new Intl.DateTimeFormat('pt-BR',{timeZone:process.env.MYLITTLIA_TIMEZONE||'America/Recife',...opts}).format(date);
export function selfAwarenessAnswer(db, text, version='0.26.0', now=new Date()) {
  const q=normalize(text).replace(/\s+/g,' ').trim();
  const reply=(answer,intent)=>({kind:'self-awareness',answer,interpretation:{intent,parser:'application-runtime',neuralUsedForAnswer:false},explanation:'Informação obtida do relógio, versão do aplicativo ou dados existentes; não é um fato inventado nem treinado pela rede neural.'});
  const fromDb=(key, vars={})=>{const answer=renderConversationalTemplate(db,key,vars); return answer===null?null:reply(answer,key);};
  if (/^(?:oi|ola|opa|e ai|bom dia|boa tarde|boa noite|saudacoes|tudo bem|como vai|oi tudo bem|ola tudo bem)$/.test(q)) return fromDb('greeting');
  if (/^(?:obrigad[oa]|valeu|muito obrigad[oa])$/.test(q)) return fromDb('gratitude');
  if (/^(?:tchau|ate logo|ate mais|adeus)$/.test(q)) return fromDb('farewell');
  if (/\b(?:que horas sao|qual e a hora|hora atual|me diga as horas|que horas temos)\b/.test(q)) return fromDb('clock',{time:fmt(now,{hour:'2-digit',minute:'2-digit',hour12:false}),timezone:process.env.MYLITTLIA_TIMEZONE||'America/Recife'});
  if (/\b(?:que dia e hoje|qual e a data|data atual|data de hoje|em que dia estamos|hoje e que dia)\b/.test(q)) return fromDb('date',{date:fmt(now,{weekday:'long',day:'numeric',month:'long',year:'numeric'})});
  if (/\b(?:qual (?:e )?(?:sua|a sua|tua) versao|em que versao voce esta|qual a versao do aplicativo|voce esta em qual versao)\b/.test(q)) return fromDb('version',{version});
  // Perguntas sobre a própria aplicação não dependem de perguntas/respostas cadastradas.
  // O histórico de criação não é inferível a partir da data atual ou da versão do pacote.
  if (/\b(?:quando (?:voce|vc|a mylittlia) (?:foi|era) criad[ao]|(?:em )?que (?:dia|data|ano) (?:voce|vc|a mylittlia) (?:foi|era) criad[ao]|quem (?:te|a) criou|por quem (?:voce|vc|a mylittlia) (?:foi|era) criad[ao]|quem e (?:seu|o seu) criador|quando (?:foi|comecou) (?:o seu|seu) desenvolvimento)\b/.test(q))
    return fromDb('origin-unverified');
  if (/\b(?:(?:o que|que) (?:voce|vc|a mylittlia) (?:faz|consegue fazer|sabe fazer)|(?:para que|pra que) (?:voce|vc|a mylittlia) (?:serve|foi criada)|qual (?:e )?(?:a sua|sua) (?:funcao|finalidade|utilidade|objetivo)|o que faz a mylittlia)\b/.test(q))
    return fromDb('capabilities');
  if (/\b(?:qual e (?:o seu|seu|teu) nome|como voce se chama|quem e voce|o que voce e|o que e a mylittlia|quem e a mylittlia)\b/.test(q)) return fromDb('identity');
  if (/\b(?:o que voce esta (?:aprendendo|estudando)|quais assuntos voce (?:aprendeu|conhece|estuda|esta aprendendo)|o que voce sabe|sobre quais assuntos voce sabe|o que ja aprendeu)\b/.test(q)) {
    const count=db.prepare('SELECT COUNT(*) n FROM knowledge_relations').get().n;
    const knowledge=db.prepare('SELECT COUNT(*) n FROM knowledge').get().n;
    const pending=db.prepare("SELECT COUNT(*) n FROM conversational_teachings WHERE status='pending'").get().n;
    const examples=db.prepare('SELECT COUNT(*) n FROM neural_training_examples').get().n;
    const groups=db.prepare('SELECT predicate,COUNT(*) n FROM knowledge_relations GROUP BY predicate ORDER BY n DESC LIMIT 5').all().map(r=>r.predicate.replaceAll('_',' '));
    const topics=groups.length?(renderConversationalTemplate(db,'learning-topics',{topics:groups.join(', ')})||''):'';
    return fromDb('learning-status',{relations:count,knowledge,pending,examples,topics});
  }
  return null;
}
