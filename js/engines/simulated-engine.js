import { tokenize, buildVocabulary } from '../core/tokenizer.js';
import { inferAnswer } from './response-engine.js';
import { predict } from './neural-engine.js';
import { findKnowledge } from './knowledge-store.js';
const now = () => performance.now();
function record(name, description, input, output, explanation, started, extra = {}) {
  return { step: 0, name, description, mode: 'simulated', input, output, explanation, durationMs: +(now()-started).toFixed(3), ...extra };
}
export function executeSimulated(prompt) {
  if (!prompt || !prompt.trim()) throw new Error('Informe uma pergunta ou frase.');
  const started = now();
  const steps = [];
  let t = now();
  const input = prompt.trim();
  steps.push(record('Entrada', 'Recebimento do texto', input, { text: input, characters: input.length }, 'O texto é recebido sem interpretação semântica.', t));
  t = now();
  const tokens = tokenize(input);
  const vocabulary = buildVocabulary(tokens);
  const ids = tokens.map(token => vocabulary[token.toLocaleLowerCase('pt-BR')]);
  steps.push(record('Tokenização', 'Separação e atribuição de IDs', input, { tokens, ids, vocabulary }, 'Separação real por expressão regular; IDs locais são criados nesta execução.', t, { mode: 'real' }));
  t = now();
  const vectors = ids.map(id => [+(Math.sin(id)).toFixed(4), +(Math.cos(id)).toFixed(4), +(Math.sin(id*0.5)).toFixed(4)]);
  steps.push(record('Vetorização', 'Vetores ilustrativos de três dimensões', ids, vectors, 'Os vetores são calculados por funções determinísticas, mas NÃO são embeddings aprendidos.', t, { mode: 'illustrative' }));
  t = now();
  const mean = [0,1,2].map(j => +(vectors.reduce((sum,v)=>sum+v[j],0)/Math.max(1,vectors.length)).toFixed(4));
  steps.push(record('Agregação', 'Média dos vetores', vectors, mean, 'Média aritmética real. Não representa atenção nem uma camada Transformer.', t, { mode: 'real' }));
  t = now();
  const scores = tokens.map((token,i) => ({ token, score: +(Math.abs(mean[0]*vectors[i][0]+mean[1]*vectors[i][1]+mean[2]*vectors[i][2])).toFixed(4) }));
  steps.push(record('Pontuação', 'Pontuação didática de relevância', { mean, vectors }, scores, 'Produto escalar calculado de verdade, mas sem pesos treinados e sem probabilidade linguística.', t, { mode: 'illustrative' }));
  t = now();
  const decision = inferAnswer(tokens);
  steps.push(record('Interpretação', 'Entidades, ações, propriedades e intenção', tokens, { normalizedText:decision.normalizedText, entities:decision.entities, actions:decision.actions, properties:decision.properties, intent:decision.intent, slots:decision.slots }, 'Análise estrutural por padrões explícitos; não é compreensão neural.', t, { mode:'rule-based' }));
  t = now();
  const neural = predict(input);
  steps.push(record('Rede neural', 'Classificação de intenção com pesos treinados', { text:input }, neural, 'Classificador softmax treinado por gradiente descendente em exemplos locais. Não gera a resposta e não é uma LLM.', t, {mode:'neural-real'}));
  const explicit = findKnowledge(input);
  const answer = explicit?.answer ?? decision.answer;
  const outputTokens = tokenize(answer);
  steps.push(record('Saída', 'Resposta por regras', { tokens, intent: decision.intent, slots: decision.slots }, { answer, matchedRule: explicit ? 'knowledge-exact' : decision.matchedRule, knowledgeSource: explicit ? 'explicit-user-record' : (decision.matchedRule ? 'built-in-rule' : 'unknown'), outputTokens }, (explicit ? 'Resposta recuperada da base de conhecimento explícito. Nenhum peso neural foi alterado.' : decision.explanation + ' Resposta selecionada por regras, não por um modelo neural.'), t, { mode: 'rule-based' }));
  steps.splice(7,0,record('Decisão', 'Seleção de conhecimento', tokens, { matchedRule: explicit ? 'knowledge-exact' : decision.matchedRule, knowledge: explicit, candidates: decision.candidates, scoring: decision.confidenceType, neuralClassification: neural.label, neuralUsedForAnswer: false }, (explicit ? 'Conhecimento explícito cadastrado; classificador neural não gera a resposta.' : decision.explanation), t, { mode: 'rule-based' }));
  steps.forEach((step,i)=>step.step=i+1);
  return { schemaVersion: 1, engine: 'hybrid-rules-softmax-v0.4', timestamp: new Date().toISOString(), prompt: input, steps, metrics: { inputTokens: tokens.length, outputTokens: outputTokens.length, steps: steps.length, durationMs: +(now()-started).toFixed(3) } };
}
