import {prepareFocus,commitFocus,getConversationFocus} from './focus-manager.js';
import {resolveEntityText} from '../knowledge/entity-identity.js';
import {withSpellingClarification} from './spelling-clarification.js';
import {footballProfileAnswer} from '../adapters/football/football-reference.js';
import {contextualClassificationAnswer} from '../reasoning/contextual-classifications.js';
import {resolveDialogueFocus,isRecentMunicipalContext} from './dialogue-focus.js';
import {entityFactAnswer} from '../knowledge/entity-facts.js';
import {comparativeRankingAnswer} from '../reasoning/comparative-ranking.js';
import { evaluateTeaching } from '../learning/teaching-validation.js';
import { reasoningFeedbackAnswer } from './conversation-feedback.js';
import { classifyIntent } from '../neural/neural-intent.js';
import { understandAndPlan, getSemanticState, saveSemanticState } from '../reasoning/semantic-core.js';
import { resolveRelationalTurn } from './ellipsis-resolver.js';
import { resolveClassMembership } from '../knowledge/class-membership.js';
import {readFileSync} from 'node:fs';
import {selfAwarenessAnswer} from '../reasoning/self-awareness.js';
import {topicSummaryAnswer} from '../reasoning/topic-summary.js';
import {propertyQueryAnswer} from '../reasoning/property-query.js';
import {temporalAnswer} from '../reasoning/temporal.js';
import { presentResponse } from '../language/language-engine.js';
import { semanticConversationAnswer } from '../reasoning/conversation-semantics.js';
import { genericSemanticAnswer } from '../reasoning/generic-semantic.js';
import { retrieveKnowledge } from '../reasoning/attention-retrieval.js';
import { randomUUID } from 'node:crypto';
import { normalize } from '../persistence/database.js';
import { semanticAnswer } from '../reasoning/semantic.js';
import { extractLimbStatement, extractStatement, createRelation, updateRelationWeight } from '../knowledge/relations.js';
import { findPendingTeaching, saveConversationalTeaching } from '../learning/teachings.js';
import {extractTeachingFacts, stageTeachingFacts, previewTeaching, generalGraphAnswer} from '../learning/conversational-graph.js';

const APPLICATION_VERSION = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version;
const UNKNOWN = 'Ainda não sei responder a essa pergunta. Você pode me ensinar algo sobre esse assunto?';
// Reconhece a INTENÇÃO de aceitar um convite, sem enumerar frases completas.
// Só deve ser usado quando a resposta anterior da IA pediu ajuda para aprender.
// Ainda é interpretação por padrões, não aprendizado neural de linguagem.
const acceptanceOpeners = [
    /^(?:claro que sim|com certeza|sim|claro|posso|sem duvida|com prazer|pode ser|ok|tudo bem|beleza|quero)(?=$|\s|,)/,
    /^(?:certamente|combinado)(?=$|\s|,)/
];
const affirmativeContinuation = /^(?:(?:claro que sim|com certeza|sim|claro|posso|sem duvida|com prazer|pode ser|ok|tudo bem|beleza|quero|certamente|combinado)(?:\s+|,\s*)?)*$/;
const helpfulFollowup = /^(?:(?:e\s+)?(?:o que|qual|quais)(?:\s+(?:voce|vc))?\s+(?:quer|precisa|gostaria)(?:\s+(?:de\s+)?(?:saber|aprender|conhecer|que eu ensine|que eu explique|informacao|informacoes))?|(?:o que|qual|quais)\s+(?:informacao|informacoes|assunto|coisa|coisas)(?:\s+(?:voce|vc))?\s+(?:quer|precisa|gostaria)(?:\s+(?:de\s+)?(?:saber|aprender|conhecer))?|(?:sobre o que|por onde)\s+(?:comecamos|voce quer saber))\??$/;
// Perguntas complementares de disponibilidade não precisam seguir só uma ordem.
// Ex.: "Sim, qual informação você precisa?" e "Posso, o que você quer saber?".
const followupPatterns = [
    /^(?:o que|qual|quais)\s+(?:voce|vc)\s+(?:quer|precisa|gostaria)(?:\s+(?:de\s+)?(?:saber|aprender|conhecer))?\??$/,
    /^(?:qual|quais)\s+(?:informacao|informacoes)\s+(?:voce|vc)\s+(?:quer|precisa)(?:\s+(?:saber|receber))?\??$/,
    /^(?:o que|qual|quais)\s+(?:voce|vc)\s+(?:quer|precisa)\s+que\s+eu\s+(?:ensine|explique)\??$/,
    /^(?:por onde comecamos|sobre o que voce quer saber)\??$/
];
const teachingRefusal = /^(?:nao|agora nao|prefiro nao|nao posso|melhor nao|hoje nao)(?:\s*,?\s*(?:obrigado|obrigada))?$/;

function acceptsTeachingInvitation(message) {
    const normalized = normalize(message).replace(/[.!?]+$/g, '').trim();
    if (teachingRefusal.test(normalized)) return false;
    const openers = acceptanceOpeners
        .map(pattern => normalized.match(pattern)?.[0] ?? '')
        .filter(Boolean)
        .sort((a, b) => b.length - a.length);
    if (openers.length === 0) return false;
    const rest = normalized.slice(openers[0].length).replace(/^[\s,;:]+/, '').trim();
    if (!rest) return true;
    if (affirmativeContinuation.test(rest)) return true;
    return followupPatterns.some(pattern => pattern.test(rest));
}

function awaitingTeachingExplanation(history) {
    const last=history.at(-1);
    return Boolean(last?.role==='assistant' && /o que voce gostaria de me ensinar|conte com suas palavras/i.test(normalize(last.content)));
}

function lastUnknownQuestion(history) {
    for (let i=history.length-1;i>=0;i--) {
        if (history[i].role!=='assistant') continue;
        if (/pode me (?:ajudar a aprender|ensinar)/.test(normalize(history[i].content))) {
            for (let j=i-1;j>=0;j--) if(history[j].role==='user') {
                const candidate=history[j].content;
                const short=normalize(candidate);
                if (/^(?:em|por) (?:extensao|area|populacao|pib)$/.test(short)) {
                    const earlier=[...history.slice(0,j)].reverse()
                        .find(m=>m.role==='user' && /(?:cidades|municipios)/.test(normalize(m.content)));
                    if (earlier) return `${earlier.content} por ${short.replace(/^(?:em|por) /,'')}`;
                }
                return candidate;
            }
        }
    }
    return null;
}

// O convite anterior não transforma qualquer mensagem seguinte em conhecimento.
// Saudações e perguntas sempre são tratadas como novas intenções.
function isNewConversationalIntent(db, text, version) {
    if (selfAwarenessAnswer(db, text, version) || temporalAnswer(text)) return true;
    const q = normalize(text);
    return /\?$/.test(text.trim()) || /^(?:quem|qual|quais|quando|onde|como|por que|porque|o que|quantos|quantas|me diga|me conte|explique|fale sobre|voce sabe|voce conhece)\b/.test(q);
}

// Apenas afirmações reconhecíveis, dados estruturados ou explicações substantivas.
// Em caso de dúvida, não se cria uma pendência de conhecimento.
function isSubstantiveTeaching(text, normalized) {
    if (/(?:^|\n)\s*\d{1,3}[.)]\s+\S/m.test(text)) return true;
    if (extractStatement(text)) return true;
    if (/\b(?:segue uma lista|seguem os dados|a lista e|sao as seguintes)\b/.test(normalized) && /[\n:]/.test(text)) return true;
    return text.trim().length >= 24 && /\b(?:foi|foram|significa|consiste|aconteceu|inventad[oa]|descobert[oa]|localizad[oa]|possui|existe|tem|corresponde|mede|nasceu|morreu|late|latem|mia|miam|muge|mugem|ruge|rugem|relincha|uiva|faz|emite)\b/.test(normalized);
}

function pendingTeachingInvitation(history) {
    const last = history.at(-1);
    if (!last || last.role !== 'assistant') return false;
    const message = normalize(last.content);
    return /(?:voce pode me ensinar|pode me ensinar|pode me ajudar a aprender|me ensine|me conte algo|me diga o que sabe)/.test(message);
}


function getConversation(db, id) {
    if (!id) return null;
    return db.prepare('SELECT id FROM conversations WHERE id=?').get(id) ?? null;
}

export function conversationHistory(db, id) {
    if (!getConversation(db, id)) return null;
    return db.prepare(`SELECT id,role,content,created_at FROM conversation_messages
        WHERE conversation_id=? ORDER BY rowid LIMIT 500`).all(id);
}

// Mensagens de ensino permanecem como afirmações do usuário, não fatos comprovados.
const freshnessPhrases = [
    'Hum, informação nova para mim...',
    'Hummm, informação fresquinha para meus neurônios...',
    'Olha só, você me contou algo novo!'
];

function ratingQuestion(statement) {
    const subject = statement.subject.replaceAll('_', ' ');
    const property = statement.object.replaceAll('_', ' ');
    if (statement.predicate === 'caracteristica') {
        const negation = statement.polarity === 'negative' ? 'não é' : 'é';
        return `Em uma escala de 0 a 100, quanto você considera que ${subject} ${negation} ${property}?`;
    }
    return `Em uma escala de 0 a 100, quanto você considera confiável a informação sobre ${subject}?`;
}

function pendingRating(history) {
    // O estado é recuperado das mensagens persistidas, mesmo após reiniciar a API.
    const last = history.at(-1);
    if (!last || last.role !== 'assistant') return null;
    if (!last.content.includes('escala de 0 a 100') &&
        !last.content.includes('número entre 0 e 100')) return null;
    const previousUser = [...history].reverse().find(item => item.role === 'user' && extractStatement(item.content));
    return previousUser ? extractStatement(previousUser.content) : null;
}

function parseRating(text) {
    const value = normalize(String(text)).replace(/^(?:uns?|aproximadamente|cerca de|mais ou menos|por volta de|acho que|diria que)\s+/, '')
        .replace(/\s*(?:pontos|por cento|%)$/, '').trim().replace(',', '.');
    if (!/^(?:100(?:\.0+)?|\d{1,2}(?:\.\d+)?)$/.test(value)) return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 && number <= 100 ? number : null;
}

export function sendChatMessage(db, payload) {
    return withSpellingClarification(db,payload,executeChatMessage);
}

function executeChatMessage(db, payload) {
    const originalText = String(payload?.originalText ?? payload?.text ?? '').trim();
    let text = resolveEntityText(db,String(payload?.text ?? '').trim());
    if (!text || text.length > 2000) throw Object.assign(new Error('Digite uma mensagem de até 2.000 caracteres.'),{status:400});
    let id=payload?.conversationId ?? null;
    if (id && !getConversation(db,id)) throw Object.assign(new Error('Conversa não encontrada.'),{status:404});
    const history = id ? conversationHistory(db,id) : [];
    const priorFocus=getConversationFocus(db,id);
    const focusResolution=prepareFocus(db,text,id);
    if(focusResolution?.query)text=focusResolution.query;
    const normalized = normalize(text);
    const awaitingTeaching = pendingTeachingInvitation(history);
    const awaitingExplanation = awaitingTeachingExplanation(history);
    const awaitingRating = pendingRating(history);
    let result = focusResolution?.result??null;
    const neuralIntent = classifyIntent(db,text);
    const semanticState=getSemanticState(db,id);
    // O estado de um ranking só continua válido enquanto o turno imediatamente
    // anterior também pertencer ao domínio municipal. Evita contaminação entre assuntos.
    const priorUser=[...history].reverse().find(m=>m.role==='user');
    const staleMunicipalRanking=semanticState?.operation==='ranking'
      && priorUser && !isRecentMunicipalContext(priorUser.content);
    const activeSemanticState=staleMunicipalRanking?null:semanticState;
    // Identidade, capacidades e metadados do aplicativo têm precedência sobre o plano genérico.
    // Evita interpretar perguntas simples sobre a MylittlIA como desconhecimento.
    const identityResult=selfAwarenessAnswer(db,text,APPLICATION_VERSION);
    if(!result)result=['capabilities','origin-unverified'].includes(identityResult?.interpretation?.intent) ? identityResult : null;
    // Perguntas explícitas sobre o que está cadastrado devem consultar o SQLite
    // antes de interpretações contextuais ou convites para ensinar.
    // Consultas genéricas em relações, inclusive no sentido inverso (valor -> entidades).
    // Comparações têm prioridade sobre listas de fatos: '3 maiores clubes'
    // não deve despejar centenas de nomes nem assumir métrica inexistente.
    if (!result) result=comparativeRankingAnswer(db,text);
    const limbTeaching=extractLimbStatement(text);
    if (!result && limbTeaching) {
        result={kind:'multi-teaching-pending',answer:previewTeaching(db,[limbTeaching]),
          interpretation:{intent:'extract-teaching-relations',parser:'limb-quantity',neuralUsedForAnswer:false}};
    }
    // Uma correção com propriedade e entidade explícitas retoma essa consulta,
    // sem reusar uma resposta anterior sobre outra característica.
    const propertyCorrection=normalized.match(/^(?:mas )?(?:eu )?perguntei sobre (?:as )?patas (?:do|da|de) (.+)$/);
    const limbQuestion=propertyCorrection ? `Quantas patas tem ${propertyCorrection[1]}?` : text;
    if (!result && /\b(?:quantas patas|numero de patas|quantidade de patas)\b/.test(normalize(limbQuestion))) result=propertyQueryAnswer(db,limbQuestion);
    if (!result) result=footballProfileAnswer(db,text);
    if (!result) result=entityFactAnswer(db,text);
    if (!result) result=resolveDialogueFocus(db,text,history);
    if (!result) result=generalGraphAnswer(db,text);
    // Uma explicação pode produzir diversas propostas; nenhuma é incorporada sem aprovação.
    // Somente enunciados afirmativos com duas ou mais relações entram nesta rota;
    // mensagens normais continuam com as regras legadas.
    let multipleTeachingFacts=limbTeaching ? [limbTeaching] : [];
    let teachingSourceText=text;
    // Recupera somente ensinamentos explícitos do usuário nesta conversa.
    // Nunca usa respostas da IA como evidência nem reabre uma proposta rejeitada.
    if (result?.kind==='property-missing' && result.interpretation?.property==='numero_patas_tipico') {
        const subject=result.interpretation.entity;
        const candidates=new Map();
        for(const message of history) {
            if(message.role!=='user') continue;
            const fact=extractLimbStatement(message.content);
            if(!fact || normalize(fact.subject).replaceAll(' ','_')!==subject) continue;
            const reviewed=db.prepare("SELECT 1 FROM knowledge_proposals WHERE conversation_id=? AND subject=? AND predicate=? AND object=? AND status IN ('approved','rejected') LIMIT 1")
                .get(id,subject,fact.predicate,fact.object);
            if(!reviewed) candidates.set(fact.object,{fact:{...fact,subject},text:message.content});
        }
        if(candidates.size) {
            multipleTeachingFacts=[...candidates.values()].map(x=>x.fact);
            teachingSourceText=[...candidates.values()].map(x=>x.text).join('\n');
            const values=[...candidates.keys()].join(' ou ');
            const reminder=candidates.size===1
                ? `Você me ensinou que ${subject.replaceAll('_',' ')} tem ${values} patas. Essa informação ficou no histórico, mas ainda não foi confirmada na base. Recuperei o ensinamento para revisão em Cadastrar conhecimento.`
                : `Encontrei ensinamentos diferentes sobre a quantidade de patas de ${subject.replaceAll('_',' ')}: ${values}. Separei as propostas para revisão em Cadastrar conhecimento; ainda não posso escolher uma como confirmada.`;
            result={kind:'multi-teaching-pending',answer:reminder,path:[],
                interpretation:{intent:'recover-user-teaching',entity:subject,property:'numero_patas_tipico',parser:'conversation-user-statements',neuralUsedForAnswer:false},
                explanation:'Recuperação de afirmações explícitas do usuário na mesma conversa, sem aprovação automática.'};
        }
    }
    if (!result && !text.includes('?')) {
        multipleTeachingFacts=extractTeachingFacts(text,db);
        if (multipleTeachingFacts.length >= 2 || multipleTeachingFacts.some(f=>['som_emitido','onomatopeia'].includes(f.predicate))) {
            result={kind:'multi-teaching-pending',answer:previewTeaching(db,multipleTeachingFacts),
              interpretation:{intent:'extract-teaching-relations',parser:'multi-clause-structured-parser',neuralUsedForAnswer:false},
              explanation:'Relações extraídas em caráter de proposta, sem validação factual nem aprovação automática.'};
        }
    }
    if (!result) result=topicSummaryAnswer(db,text);
    // Um novo tópico explícito tem prioridade sobre o contexto relacional anterior.
    // Ex.: após 'O que o gato bebe?', 'O que é um flamingo?' não pode virar bebida.
    // 'E um gato?' depois de uma definição significa 'O que é um gato?'.
    const shortDefinition=normalized.match(/^e\s+(?:um|uma)\s+([a-z][a-z0-9 ]{1,55})\??$/);
    const lastUser=[...history].reverse().find(message=>message.role==='user');
    const afterDefinition=lastUser && /^(?:o que e|quem e|defina|explique o que e)\s+/.test(normalize(lastUser.content));
    if (!result && shortDefinition && afterDefinition) {
        const entity=shortDefinition[1].trim();
        const definition=semanticAnswer(db,`O que é ${entity}?`);
        if (definition && definition.kind!=='unknown' && definition.kind!=='ambiguous') {
            result={...definition,kind:definition.kind,semanticState:{entity,objectType:'entidade',property:null,operation:'definition',originalQuestion:text},
                interpretation:{...definition.interpretation,intent:'contextual-definition',parser:'definition-follow-up',resolvedQuery:`O que é ${entity}?`}};
        }
    }
    if (!result) result=contextualClassificationAnswer(db,text,history);
    // Contexto compartilhado por TODAS as propriedades, não apenas vocalizações.
    // Mantém o último sujeito citado pelo usuário; uma entidade nova explícita
    // sempre prevalece em propertyQueryAnswer. Não herda respostas da IA.
    if (!result && /\?$/.test(text) && /\b(?:ele|ela|dele|dela|esse|essa|isso)\b/.test(normalized)) {
        const subjects=db.prepare('SELECT DISTINCT subject FROM knowledge_relations').all()
            .map(row=>row.subject).sort((a,b)=>b.length-a.length);
        const mention = (message) => {
            const q=normalize(message);
            return subjects.find(subject => {
                const label=subject.replaceAll('_',' ');
                return new RegExp('(?:^|\\s)'+label.replace(/[^a-z0-9 ]/g,'')+'(?=\\s|$)').test(q);
            }) ?? null;
        };
        const previous=[...history].reverse().filter(m=>m.role==='user').slice(0,12);
        const mentionedSubjects=previous.map(m=>mention(m.content)).filter(Boolean);
        const contextualSubject=mentionedSubjects.find(subject=>db.prepare("SELECT 1 FROM knowledge_relations WHERE subject=? AND predicate IN ('e_um','revestimento','numero_patas_tipico','habitat','come','bebe') LIMIT 1").get(subject)) || mentionedSubjects[0];
        if (contextualSubject) result=propertyQueryAnswer(db,text,contextualSubject);
    }
    // Consultas novas que o motor legado não conhece. Demais consultas seguem
    // pela rota original, evitando respostas duplicadas como "bebe bebe água".
    if (!result) {
        const candidate=propertyQueryAnswer(db,text);
        if (candidate && (['distribution','domestic','prey','food'].includes(candidate.interpretation.property)
           || candidate.path.some(row=>row.predicate==='onomatopeia'))) result=candidate;
    }
    if (!result) result=reasoningFeedbackAnswer(db,text,activeSemanticState);
    if (!result) result=understandAndPlan(db,text,activeSemanticState,neuralIntent);
    if (!result) result=resolveRelationalTurn(db,text,activeSemanticState);
    if (!result && (text.includes('?')||!extractStatement(text))) result=resolveClassMembership(db,text);
    if (!result) result=propertyQueryAnswer(db,text);
    // O classificador neural é um sinal auxiliar; só roteamos quando há confiança suficiente.
    // Nunca transforma uma pergunta em ensinamento automaticamente.
    const neuralRoute = neuralIntent.reliable ? neuralIntent.label : null;
    // Um convite para ensinar também pode ser respondido diretamente com dados,
    // inclusive uma lista numerada iniciada por 'Sim, posso'.
    // Não cadastramos como fato: a informação permanece pendente de revisão.
    const contextFilter=/^(?:em|por) (?:extensao|area|populacao|pib)$|^(?:e )?em 20\d{2}$|^(?:somente as capitais|do nordeste)$/.test(normalized);
    const newIntent = isNewConversationalIntent(db,text,APPLICATION_VERSION)
        || (neuralRoute !== null && ['greeting','temporal','location','knowledge'].includes(neuralRoute));
    const teachingResponse = !result && !newIntent && !contextFilter && (awaitingExplanation || awaitingTeaching)
        && !teachingRefusal.test(normalized)
        && !acceptsTeachingInvitation(text)
        && isSubstantiveTeaching(text,normalized);
    if (teachingResponse) {
        const sourceQuestion=lastUnknownQuestion(history);
        if (sourceQuestion) {
            const assessment=evaluateTeaching(sourceQuestion,text);
            if (assessment.status==='blocked') {
                result={kind:'conversation-teaching-not-registered',
                    answer:assessment.issues.some(issue=>issue.code==='unbound-reference')
                      ? 'Não consegui separar fatos com uma entidade identificada nessa explicação. Diga o nome do animal e o que ele faz; não vou gravar uma resposta geral para uma pergunta com pronome.'
                      : 'Acho que esta mensagem não é uma explicação sobre a pergunta anterior. Podemos continuar conversando ou você pode me contar o que sabe.',
                    interpretation:{intent:'teaching-validation',parser:'teaching-validation',neuralUsedForAnswer:false}};
            } else result={kind:'conversation-teaching-pending',
                answer:'Obrigado! Registrei o que você me ensinou. Ela aguarda aprovação antes de fazer parte dos meus conhecimentos consultáveis.',
                pendingTeaching:{question:sourceQuestion,answer:text},
                interpretation:{intent:'pending-user-teaching',parser:'conversation-context',neuralUsedForAnswer:false}};
        }
    }
    if (!result && awaitingRating) {
        const number = parseRating(text);
        if (number === null) {
            result = {
                kind: 'conversation-rating-pending',
                answer: 'Pode me dizer apenas um número entre 0 e 100?',
                interpretation: {intent:'request-rating', parser:'conversation-context',neuralUsedForAnswer:false}
            };
        } else {
            result = {
                kind: 'conversation-knowledge-acquired',
                answer: 'Obrigada! Guardei sua avaliação e vou lembrar do que você me ensinou.',
                interpretation: {intent:'store-user-assessment', parser:'conversation-context',neuralUsedForAnswer:false},
                learned: { ...awaitingRating,
                    confidence:awaitingRating.polarity === 'negative' ? 1-number / 100 : number / 100,
                    source_type:'user-approved' }
            };
        }
    } else if (!result && awaitingTeaching && acceptsTeachingInvitation(text)) {
        result = {
            kind: 'conversation-teaching-invitation',
            answer: 'Que bom! O que você gostaria de me ensinar sobre esse assunto? Conte com suas palavras e eu vou apresentar o que entendi para você confirmar.',
            interpretation: {
                intent: 'accept-teaching',
                parser: 'conversation-context',
                neuralUsedForAnswer: false
            },
            explanation: 'Identifiquei uma resposta afirmativa ao convite de ensinar feito na mensagem anterior. Ainda não gravei nenhum conhecimento.'
        };
    } else if (!result && awaitingTeaching && teachingRefusal.test(normalized)) {
        result = {
            kind: 'conversation-teaching-declined',
            answer: 'Tudo bem! Podemos continuar conversando ou falar de outro assunto.',
            interpretation: {intent: 'decline-teaching', parser: 'conversation-context', neuralUsedForAnswer: false},
            explanation: 'Identifiquei uma resposta negativa ao convite de ensinar. Nenhum conhecimento foi gravado.'
        };
    }
    if (!result) result=selfAwarenessAnswer(db,text,APPLICATION_VERSION);
    if (!result && neuralRoute==='greeting') {
        result={kind:'neural-greeting',answer:'Olá! Tudo bem por aqui. E com você? Como posso ajudar?',
            interpretation:{intent:'greeting',parser:'scratch-neural-intent',neuralUsedForAnswer:true}};
    }
    if (!result) result=temporalAnswer(text,history);
    // Complemento temporal contextual que antes caía no fluxo de ensino.
    if (!result && neuralRoute==='temporal' && /amanh[ãa]/i.test(text)
        && /hora/i.test(text) && history.some(m=>m.role==='assistant' && /(?:agora s[aã]o|horas s[aã]o|fuso)/i.test(m.content))) {
        const hour = new Intl.DateTimeFormat('pt-BR',{timeZone:process.env.MYLITTLIA_TIMEZONE||'America/Recife',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
        result={kind:'temporal-neural-context',answer:`Amanhã, a esta mesma hora, serão ${hour}.`,interpretation:{intent:'temporal-follow-up',parser:'scratch-neural-intent+clock',neuralUsedForAnswer:true}};
    }
    if (!result) result=semanticConversationAnswer(db,text,
        priorUser && !isRecentMunicipalContext(priorUser.content)?[]:history);
    if (!result) result=genericSemanticAnswer(db,text);
    if (!result) result=semanticAnswer(db,text);
    if (!result || result.kind === 'unknown') {
        const retrieved=retrieveKnowledge(db,text);
        if(retrieved.answer) result={kind:'retrieval-attention',answer:retrieved.answer,
            interpretation:{intent:'retrieve-known-fact',parser:'weighted-retrieval',neuralUsedForAnswer:false},
            explanation:'Consultei conhecimentos incorporados à memória e comparei a relevância das perguntas anteriores.',
            retrieval:retrieved};
    }
    const statement = text.endsWith('?') ? null : extractStatement(text);
    if (!result || result.kind==='unknown' || /(?:data-gap|knowledge-pending-review)/.test(result.kind)) {
        const reference=focusResolution?.frame?.sourceQuestion;
        const contextualQuestion=reference&&focusResolution.changes.includes('property')
            ? `${reference} por ${normalize(originalText).replace(/^(?:em|por) /,'')}`:null;
        const pending=findPendingTeaching(db,text)||(contextualQuestion?findPendingTeaching(db,contextualQuestion):null);
        if (pending) result={kind:'knowledge-pending-review',
            answer:'Já conversamos sobre isso e guardei uma informação que você me ensinou, mas ela ainda aguarda sua aprovação. Ainda não posso tratá-la como um conhecimento confirmado.',
            interpretation:{intent:'pending-knowledge',parser:'conversation-memory',neuralUsedForAnswer:false}};
    }
    if (result?.kind==='unknown') result=null;
    // Após uma mudança explícita de assunto, não manter rankings antigos
    // como contexto persistido para futuras perguntas elípticas.
    if (result && !result.semanticState && ['ranking','comparison'].includes(semanticState?.operation)
        && !isRecentMunicipalContext(text)) {
        result={...result,semanticState:{operation:'topic-changed',entity:null,property:null,
            objectType:null,originalQuestion:text}};
    }
    if(!result&&focusResolution?.query)result={kind:'dialogue-focus-data-gap',answer:'Entendi a continuação, mas ainda não tenho informações suficientes sobre essa consulta. Você pode me ensinar?',path:[],interpretation:{intent:'focused-data-gap',parser:'shared-focus',neuralUsedForAnswer:false},explanation:'A alteração do foco foi identificada; nenhum fato foi inventado para preencher a falta de dados.'};
    result=presentResponse(result,db);
    if(result) result={...result,neuralIntent};
    if(result&&focusResolution)result={...result,
      answer:(focusResolution.delegated?`Como você deixou a escolha comigo, vou comparar por ${focusResolution.label}.\n\n`:'')+result.answer,
      interpretation:{...result.interpretation,focusChanges:focusResolution.changes,
        contextualFollowup:{metric:focusResolution.frame?.property,delegated:focusResolution.delegated??false,
          sourceQuestion:focusResolution.frame?.query??null},parserFocus:'shared-focus',...(focusResolution.frame?.relational?{ellipsis:true}:{})}};
    let response=result?.answer ?? UNKNOWN;
    let proposal=null;
    if (statement && !result) {
        const subject = normalize(statement.subject).replaceAll(' ', '_');
        const object = normalize(statement.object).replaceAll(' ', '_');
        const existing = db.prepare(`SELECT id,confidence FROM knowledge_relations
            WHERE subject=? AND predicate=? AND object=? LIMIT 1`)
            .get(subject, statement.predicate, object);
        if (existing) {
            response = 'Essa informação já faz parte do que me ensinaram. Obrigada por compartilhá-la novamente!';
        } else {
            const phrase = freshnessPhrases[history.filter(entry => entry.role === 'user').length % freshnessPhrases.length];
            response = `${phrase} ${ratingQuestion(statement)}`;
            result = {
                kind:'conversation-rating-request',
                answer:response,
                interpretation:{intent:'request-assessment',parser:'structural-pattern',neuralUsedForAnswer:false},
                explanation:'Uma possível relação foi identificada. Ela só será guardada após receber uma avaliação explícita do usuário.'
            };
        }
    }
    if (!id) id=randomUUID();
    db.exec('BEGIN');
    try {
        if (!getConversation(db,id)) db.prepare('INSERT INTO conversations(id) VALUES (?)').run(id);
        if(payload.consumeClarification)db.prepare('DELETE FROM conversation_clarifications WHERE conversation_id=?').run(id);
        const userMessageId=randomUUID();
        // Relógio do servidor: registra os instantes de cada mensagem em milissegundos.
        // Garante ordenação mesmo quando a resposta é preparada no mesmo milissegundo.
        const userRecordedAt=new Date().toISOString();
        db.prepare('INSERT INTO conversation_messages(id,conversation_id,role,content,created_at) VALUES (?,?,?,?,?)')
            .run(userMessageId,id,'user',originalText,userRecordedAt);
        if (multipleTeachingFacts.length>=1 && result?.kind==='multi-teaching-pending') {
            result.proposedFacts=stageTeachingFacts(db,id,teachingSourceText,multipleTeachingFacts);
        }
        if (result?.semanticState) {
            if(result.semanticState.operation==='comparison')result.semanticState.lastUserText=originalText;
            saveSemanticState(db,id,result.semanticState);
        }
        const committedFocus=commitFocus(db,id,{text:originalText,query:text,result,resolution:focusResolution});
        if(result&&committedFocus) {
            const context=frame=>frame?{...frame,criterion:frame.property==='pib'?'gdp':frame.property,entity:frame.location??frame.entity}:null;
            result.interpretation={...result.interpretation,
                contextBefore:result.interpretation?.contextBefore??context(priorFocus),
                contextAfter:result.interpretation?.contextAfter??context(committedFocus),
                contextReference:result.interpretation?.contextReference??priorFocus?.sourceQuestion??priorFocus?.query??null};
        }
        if (result?.pendingTeaching) {
            saveConversationalTeaching(db,id,result.pendingTeaching.question,result.pendingTeaching.answer);
        }
        if (result?.learned) {
            const relation = createRelation(db,result.learned);
            const saved = db.prepare(`SELECT id FROM knowledge_relations
                WHERE subject=? AND predicate=? AND object=?`).get(
                    normalize(result.learned.subject).replaceAll(' ','_'),
                    result.learned.predicate,
                    normalize(result.learned.object).replaceAll(' ','_')
                );
            if (saved) updateRelationWeight(db,saved.id,{confidence:result.learned.confidence,source_type:'user-approved'});
        }
        if (proposal) {
            proposal={...proposal,id:randomUUID()};
            db.prepare(`INSERT INTO knowledge_proposals (id,conversation_id,subject,predicate,object,original_text)
                VALUES (?,?,?,?,?,?)`).run(proposal.id,id,proposal.subject,proposal.predicate,proposal.object,text);
        }
        const assistantMessageId=randomUUID();
        const assistantRecordedAt=new Date(Math.max(Date.now(), Date.parse(userRecordedAt)+1)).toISOString();
        db.prepare('INSERT INTO conversation_messages(id,conversation_id,role,content,created_at) VALUES (?,?,?,?,?)')
            .run(assistantMessageId,id,'assistant',response,assistantRecordedAt);
        db.exec('COMMIT');
    } catch(error) {db.exec('ROLLBACK');throw error;}
    const savedMessages=db.prepare(`SELECT id,role,content,created_at FROM conversation_messages
       WHERE conversation_id=? ORDER BY rowid DESC LIMIT 2`).all(id).reverse();
    return {conversationId:id,reply:response,messages:savedMessages,proposals:result?.proposedFacts ?? [],result: result ?? {kind:proposal?'pending-approval':'unknown',answer:response,
      interpretation:{intent:proposal?'statement-proposal':'unknown',parser:'limited-structural-parser'},
      neuralIntent,explanation:proposal?'Proposta pendente de aprovação. Nenhum conhecimento foi automaticamente incorporado.':'Não foi identificada uma resposta confiável.'},proposal};
}
