import { renderInspector } from './visualization-inspector.js';
import { listKnowledge, replaceKnowledge, browserKnowledgeForMigration, exportKnowledge } from './engines/knowledge-store.js';
import { api } from './api.js';
import { createChatInputHistory } from './chat-input-history.js';
import { orderedChatTurns, normalizeChatOrder, createChatTurnElement } from './chat-view.js';
import { train, trainingInfo, addExample, allExamples } from './engines/neural-engine.js';
import { executeSimulated } from './engines/simulated-engine.js';
const $ = id => document.getElementById(id);
const DEFAULT_MESSAGE = 'Qual a capital de Pernambuco';
let trace = null, current = -1, timer = null, maxReached = -1;
let sendingMessage = false;
const measuredMs = start => +(performance.now() - start).toFixed(3);
let activeChatId = sessionStorage.getItem('mylittlia-active-chat') || null;
let chatOrder = 'newest';
let chatMessages = [];
const inputHistory = createChatInputHistory();
let chatGeneration=0;
function updateChatOrderButtons() {
  for (const [id, order] of [['chat-order-newest', 'newest'], ['chat-order-oldest', 'oldest']]) {
    const button = $(id);
    const selected = chatOrder === order;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
}
function renderChatHistory() {
  const container=$('chat-history');
  const fragment=document.createDocumentFragment();
  for (const turn of orderedChatTurns(chatMessages,chatOrder)) {
    fragment.append(createChatTurnElement(turn, document));
  }
  container.replaceChildren(fragment);
  container.scrollTop=chatOrder==='newest'?0:container.scrollHeight;
}
async function restoreChat() {
  if(!activeChatId)return;
  const generation=chatGeneration, id=activeChatId;
  try {
    const data=await api('/chat/'+id);
    if(generation!==chatGeneration || id!==activeChatId)return;
    chatMessages=data.messages||[];
    inputHistory.reset();
    renderChatHistory();
  }catch(error){
    if(generation!==chatGeneration)return;
    activeChatId=null;sessionStorage.removeItem('mylittlia-active-chat');
  }
}
async function initChatView() {
  try {
    const result=await api('/preferences/chat-order');
    chatOrder=normalizeChatOrder(result.order);
  }catch(error){console.warn('Preferência de ordenação indisponível:',error);}
  updateChatOrderButtons();
  renderChatHistory();
  await restoreChat();
}
let chatOrderSaving = false;
async function setChatOrder(desired) {
  if (chatOrderSaving || desired === chatOrder) return;
  const previous = chatOrder;
  chatOrder = desired;
  updateChatOrderButtons();
  renderChatHistory();
  chatOrderSaving = true;
  $('chat-order-newest').disabled = true;
  $('chat-order-oldest').disabled = true;
  try {
    const result = await api('/preferences/chat-order', {method:'PUT', data:{order:desired}});
    chatOrder = normalizeChatOrder(result.order);
    updateChatOrderButtons();
    renderChatHistory();
  } catch (error) {
    chatOrder = previous;
    updateChatOrderButtons();
    renderChatHistory();
    alert('Não foi possível salvar a ordem da conversa: ' + error.message);
  } finally {
    chatOrderSaving = false;
    $('chat-order-newest').disabled = false;
    $('chat-order-oldest').disabled = false;
  }
}
$('chat-order-newest').onclick = () => setChatOrder('newest');
$('chat-order-oldest').onclick = () => setChatOrder('oldest');
$('new-chat').onclick=()=>{
  chatGeneration++;
  activeChatId=null;sessionStorage.removeItem('mylittlia-active-chat');
  chatMessages=[];inputHistory.reset();renderChatHistory();$('prompt').value='';
};
initChatView();
const stringify = value => JSON.stringify(value, null, 2);
// As camadas existem desde a abertura da página, antes de qualquer execução.
const pipelineDefinition = [
  ['Entrada','Recebimento do texto','simulated'],
  ['Tokenização','Separação e atribuição de IDs','real'],
  ['Vetorização','Vetores ilustrativos de três dimensões','illustrative'],
  ['Agregação','Média dos vetores','real'],
  ['Pontuação','Pontuação didática de relevância','illustrative'],
  ['Interpretação','Entidades, ações, propriedades e intenção','rule-based'],
  ['Rede neural','Classificação de intenção com pesos treinados','neural-real'],
  ['Decisão','Seleção de conhecimento','rule-based'],
  ['Saída','Resposta por regras','rule-based']
].map(([name, description, mode]) => ({ name, description, mode }));
function stopTimer(){if(timer!==null){clearInterval(timer);timer=null;}}
function navigateInspectorWithoutScroll(nextIndex) {
  if (!trace || nextIndex < 0 || nextIndex > maxReached) return;
  const previousY = window.scrollY;
  const inspector = $('inspector-panel');
  const previousTop = inspector.getBoundingClientRect().top;
  stopTimer();
  current = nextIndex;
  render();
  const newTop = inspector.getBoundingClientRect().top;
  window.scrollTo({top: previousY + (newTop - previousTop), behavior: 'instant'});
  requestAnimationFrame(() => {
    const drift = inspector.getBoundingClientRect().top - previousTop;
    if (Math.abs(drift) > 1) window.scrollBy({top: drift, behavior: 'instant'});
  });
}

function render(){
  // maxReached indica a última etapa realmente processada;
  // current indica somente a camada selecionada para inspeção.
  const steps=trace?.steps??pipelineDefinition;
  $('pipeline').replaceChildren();
  steps.forEach((step,index)=>{
    const button=document.createElement('button');button.type='button';button.className='step'+(!trace?' pending':index===current?' active':index<=maxReached?' done':' pending');
    button.setAttribute('aria-label',`Inspecionar camada ${index+1}: ${step.name}`);
    const badge=document.createElement('span');badge.className='step-index';badge.textContent=String(index+1);
    const name=document.createElement('strong');name.textContent=step.name;
    const desc=document.createElement('small');desc.textContent=step.description;
    const kind=document.createElement('span');kind.className='step-kind';kind.textContent=step.mode;
    const timing=document.createElement('span');timing.className='step-timing';
    timing.textContent=Number.isFinite(step.durationMs)?`${step.durationMs.toFixed(3)} ms`:'Tempo não isolado';
    timing.title=step.timingNote??'Tempo medido durante a operação desta etapa';
    button.append(badge,name,desc,timing,kind);button.disabled=!trace||index>maxReached;button.onclick=()=>{if(!trace||index>maxReached)return;stopTimer();current=index;render();const panel=$('inspector-panel');panel.scrollIntoView({behavior:'smooth',block:'start'});};$('pipeline').append(button);
  });
  $('counter').textContent=trace?`${current+1}/${steps.length}`:`0/${steps.length}`;
  $('status').textContent=!trace?'Aguardando entrada':maxReached===steps.length-1?'Concluído':'Processando · etapa '+(maxReached+1);
  $('prev').disabled=current<=0;$('next').disabled=!trace||current>=steps.length-1;$('export').disabled=!trace;
  $('inspector').replaceChildren();
  if(current<0){$('inspector').textContent='Execute uma pergunta para visualizar os dados.';return;}
  renderInspector($('inspector'), steps[current], current, {
    canGoPrevious: current > 0,
    onPrevious: () => {
      if (!trace || current <= 0) return;
      navigateInspectorWithoutScroll(current - 1);
    },
    canGoNext: current < maxReached,
    onNext: () => {
      if (!trace || current >= maxReached) return;
      navigateInspectorWithoutScroll(current + 1);
    }
  });
}
async function run(){
  if(sendingMessage) return;
  sendingMessage=true;
  $('run').disabled=true;
  stopTimer();const executionStarted=performance.now();
  let message='';
  try{
  // O texto cinza é apenas um exemplo. Se o usuário enviar sem digitar,
  // a mensagem de exemplo passa a ser a mensagem real, com cor normal.
  message = $('prompt').value.trim() || DEFAULT_MESSAGE;
  // Limpa ao enviar; caso o servidor falhe, restaura o texto para nova tentativa.
  $('prompt').value = '';
  $('prompt').focus();
  trace = executeSimulated(message);
  // O simulador possui medições locais. As etapas neurais e a resposta real
  // passam por serviços distintos: seus tempos NÃO devem ser inventados.
  for (const index of [2,3,4,7,8]) {
    trace.steps[index].durationMs=null;
    trace.steps[index].timingNote='Esta operação não foi cronometrada isoladamente na execução real.';
  }
  const messageGeneration=chatGeneration;
  const chatStarted=performance.now();
  // Respostas e referências são recuperadas junto ao histórico da conversa.
  // A classificação neural ainda NÃO produz estas respostas.
  const chat=await api('/chat/messages',{
    method:'POST',data:{text:trace.prompt,conversationId:activeChatId}
  });
  const chatRoundtripMs=measuredMs(chatStarted);
  if (messageGeneration!==chatGeneration) return; // 'Nova conversa' acionado durante a requisição.
  activeChatId=chat.conversationId;
  sessionStorage.setItem('mylittlia-active-chat',activeChatId);
  // A API retorna as mensagens efetivamente gravadas, com timestamps UTC reais.
  chatMessages.push(...(chat.messages?.length===2 ? chat.messages : [
    {role:'user',content:trace.prompt,created_at:new Date().toISOString()},
    {role:'assistant',content:chat.reply,created_at:new Date().toISOString()}
  ]));
  inputHistory.reset();
  renderChatHistory();
  if(chat.proposal || chat.proposals?.length || chat.result?.kind==='conversation-teaching-pending')loadRelations().catch(console.error);
  // Trace do modelo gerativo real, obtido do checkpoint ativo no SQLite.
  // A resposta da conversa continua vindo do mecanismo de conhecimento.
  let neuralInspectMs=null;
  try {
    const neuralStarted=performance.now();
    const neuralTrace=await api('/generative/word/inspect', {method:'POST',data:{text:message}});
    neuralInspectMs=measuredMs(neuralStarted);
    if (neuralTrace.available) {
      const embeddings=trace.steps[2];
      embeddings.input=neuralTrace.tokens.map(t=>({token:t.token,id:t.id,known:t.known}));
      embeddings.output=neuralTrace.tokens;
      embeddings.mode='neural-real';
      embeddings.description='Embeddings aprendidos no modelo por palavras';
      embeddings.explanation='Vetores reais obtidos da matriz de embeddings treinada, persistida no SQLite. Palavras não conhecidas usam o vetor <UNK>.';
      const aggregation=trace.steps[3];
      aggregation.input=neuralTrace.contextVectors;
      aggregation.output={contextTokens:neuralTrace.contextTokens, contextIds:neuralTrace.contextIds, features:neuralTrace.featureVector};
      aggregation.mode='neural-real';
      aggregation.description='Concatenação posicional dos vetores treinados';
      aggregation.explanation='Os embeddings das últimas 8 posições são concatenados, como de fato ocorre no gerador por palavras. Não é média nem atenção.';
      const scores=trace.steps[4];
      scores.input={question:message,contextTokens:neuralTrace.contextTokens,featureVector:neuralTrace.featureVector,modelVersion:neuralTrace.modelVersion};
      scores.output=neuralTrace.topPredictions;
      scores.mode='neural-real';
      scores.description='Logits e probabilidades reais do próximo token';
      scores.explanation='Experimento paralelo: projeção linear (embeddings concatenados × pesos + bias) e softmax para prever o token imediatamente posterior à mensagem recebida. Como a entrada NÃO é um prompt formatado com «resposta:», as palavras mais prováveis não são candidatas a resposta factual. A resposta do chat veio da memória/regras, não dessa distribuição.';
      const layer=trace.steps[6];
      layer.output={...layer.output,generativeModel:{trainedSteps:neuralTrace.trainedSteps,contextLength:neuralTrace.contextLength,dimensions:neuralTrace.dimensions,topPredictions:neuralTrace.topPredictions},generativeUsedForAnswer:false};
      layer.explanation += ' O modelo gerativo também produziu previsões numéricas reais, registradas para inspeção, mas ainda NÃO decide a resposta do chat.';
    } else {
      for (const idx of [2,3,4]) {
        trace.steps[idx].mode='unavailable';
        trace.steps[idx].input={text:message};
        trace.steps[idx].output={reason:neuralTrace.reason};
        trace.steps[idx].explanation='Sem um modelo neural por palavras treinado, esta etapa não calcula embeddings ou logits. Nenhum número artificial é apresentado.';
      }
    }
  } catch (error) {
    for (const idx of [2,3,4]) {
      trace.steps[idx].mode='unavailable';
      trace.steps[idx].output={reason:'Não foi possível consultar o modelo neural.'};
      trace.steps[idx].explanation='Não foram apresentados números ilustrativos como se fossem neurais.';
    }
    console.warn('Trace neural indisponível:',error);
  }
  const result=chat.result;
  const interpretation=trace.steps[5],decision=trace.steps[7],output=trace.steps[8];
  if(result.interpretation){
    interpretation.output.semantic=result.interpretation;
    interpretation.explanation='Interpretação da mensagem considerando padrões e, quando possível, o contexto da conversa.';
  }
  decision.output.semanticRecovery={
    kind:result.kind,source:result.source??null,
    contextReference:result.interpretation?.contextReference??null,
    matchedQuestion:result.matchedQuestion??null,path:result.path??[],
    score:result.score??null,scoreInfo:result.scoreInfo??null,alternativePaths:result.alternativePaths??[],reason:result.reason??null,
    neuralUsedForAnswer:false
  };
  decision.explanation=result.explanation??'A resposta foi recuperada do contexto ou dos conhecimentos disponíveis.';
  output.output.answer=chat.reply;
  output.output.knowledgeSource=result.kind;
  output.output.outputTokens=chat.reply.split(/\s+/);
  output.explanation=decision.explanation;
  trace.metrics.outputTokens=output.output.outputTokens.length;
  trace.metrics.localPreparationMs=trace.metrics.durationMs;
  trace.metrics.chatRoundtripMs=chatRoundtripMs;
  trace.metrics.neuralInspectRoundtripMs=neuralInspectMs;
  trace.metrics.durationMs=measuredMs(executionStarted);
  trace.metrics.timingMethod='performance.now; chamadas HTTP medidas de ponta a ponta, sem distribuição artificial por camada';
  for (const index of [2,3,4]) {
    trace.steps[index].durationMs=null;
    trace.steps[index].timingNote=neuralInspectMs===null
      ? 'A inspeção neural não retornou uma medição.'
      : `Essas três operações compartilham uma chamada de inspeção neural de ${neuralInspectMs.toFixed(3)} ms (rede incluída); não há medição isolada por operação.`;
  }
  trace.steps[7].timingNote=`Decisão da resposta executada no servidor; chamada completa: ${chatRoundtripMs.toFixed(3)} ms (rede incluída).`;
  trace.steps[8].timingNote=`Formatação da resposta executada no servidor; chamada completa: ${chatRoundtripMs.toFixed(3)} ms (rede incluída).`;
  maxReached=trace.steps.length-1;current=$('auto').checked?maxReached:0;
  // O trace é persistido na API sem interromper a animação se houver erro de gravação.
  api('/inference-runs', { method:'POST', data:trace })
    .catch(error => console.error('Erro ao persistir inferência:', error));
  $('metrics').replaceChildren();
  [['Tokens de entrada',trace.metrics.inputTokens],['Tokens de saída',trace.metrics.outputTokens],['Etapas',trace.metrics.steps]].forEach(([name,value])=>{
    const div=document.createElement('div');div.append(document.createTextNode(name));const strong=document.createElement('strong');strong.textContent=value;div.append(strong);$('metrics').append(div);
  });
  $('elapsed').textContent=`${trace.metrics.durationMs.toFixed(3)} ms (total no navegador)`;
  $('status').title=`Conversa: ${chatRoundtripMs.toFixed(3)} ms; inspeção neural: ${neuralInspectMs===null?'indisponível':neuralInspectMs.toFixed(3)+' ms'}. Chamadas incluem transporte HTTP.`;
  render();
}catch(error){
  if (!$('prompt').value.trim() && message) $('prompt').value = message;
  alert(error.message);
}finally{sendingMessage=false;$('run').disabled=false;}}
$('run').onclick=run;
// Enter envia a mensagem; Shift+Enter insere uma nova linha.
// O atalho se aplica somente ao campo principal, sem afetar os formulários de ensino.
$('prompt').addEventListener('keydown', event => {
  if (event.isComposing || event.keyCode === 229 || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
  const direction = event.key === 'ArrowUp' ? 'up' : 'down';
  const value = inputHistory.navigate(direction, chatMessages, $('prompt').value);
  if (value === null) return;
  event.preventDefault();
  $('prompt').value = value;
  $('prompt').setSelectionRange(value.length, value.length);
});
// Enter envia; Shift+Enter insere uma linha. As setas navegam apenas entre
// mensagens do usuário na conversa atual, preservando o rascunho.
$('prompt').addEventListener('keydown', event => {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229) return;
  event.preventDefault();
  if ($('run').disabled) return;
  $('run').click();
});

$('run').disabled = true;
$('run').title = 'Preparando a MylittlIA…';
$('prev').onclick=()=>{if(!trace)return;stopTimer();current=Math.max(0,current-1);render();};
$('next').onclick=()=>{if(!trace)return;stopTimer();current=Math.min(trace.steps.length-1,current+1);maxReached=Math.max(maxReached,current);render();};
$('reset').onclick=()=>{stopTimer();trace=null;current=-1;maxReached=-1;$('metrics').innerHTML='<div>Tokens de entrada<strong>—</strong></div><div>Tokens de saída<strong>—</strong></div><div>Etapas<strong>—</strong></div>';$('elapsed').textContent='—';render();};
$('export').onclick=()=>{if(!trace)return;const blob=new Blob([stringify(trace)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='mylittlia-trace.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
render();

function renderExamples(){
 const list=$('examples-list');list.replaceChildren();
 for(const {text,label} of allExamples()){
   const row=document.createElement('div');row.className='example-row';row.textContent=`${label} — ${text}`;list.append(row);
 }
}
function drawTraining(){
 const info=trainingInfo(),canvas=$('loss-chart'),ctx=canvas.getContext('2d');
 const w=canvas.width,h=canvas.height,left=60,right=w-65,top=25,bottom=h-43;
 ctx.clearRect(0,0,w,h);ctx.font='13px sans-serif';
 const points=info.history,maxEpoch=points.at(-1).epoch;
 const maxLoss=Math.max(0.1,...points.flatMap(p=>[p.loss,p.valLoss??0]))*1.08;
 const x=p=>left+(right-left)*(p.epoch-1)/Math.max(1,maxEpoch-1);
 const yLoss=v=>bottom-(bottom-top)*v/maxLoss;
 const yAcc=v=>bottom-(bottom-top)*v/100;
 for(let i=0;i<=4;i++){
   const y=top+(bottom-top)*i/4;ctx.strokeStyle='#30405b';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();
   ctx.fillStyle='#aebcd2';ctx.fillText((maxLoss*(1-i/4)).toFixed(2),8,y+4);ctx.fillText(String(Math.round(100*(1-i/4)))+'%',right+8,y+4);
 }
 ctx.fillStyle='#cbd5e1';ctx.fillText('Loss',8,15);ctx.fillText('Acurácia',right+8,15);
 for(let i=0;i<=5;i++){const epoch=1+Math.round((maxEpoch-1)*i/5);ctx.fillText(String(epoch),left+(right-left)*i/5-10,h-17);}
 ctx.fillText('Épocas',w/2-20,h-3);
 const line=(key,color,scale)=>{ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.beginPath();let started=false;for(const p of points){if(p[key]===null||p[key]===undefined)continue;const px=x(p),py=scale(p[key]);if(!started){ctx.moveTo(px,py);started=true;}else ctx.lineTo(px,py);}if(started)ctx.stroke();};
 line('loss','#4adea8',yLoss);line('valLoss','#fbbf24',yLoss);line('accuracy','#60a5fa',yAcc);line('valAccuracy','#e879f9',yAcc);
 const last=points.at(-1);
 $('training-summary').textContent=`${info.exampleCount} exemplos · ${info.vocabularySize} atributos · ${info.classes.length} intenções · loss treino ${last.loss} · loss validação ${last.valLoss??'n/d'} · acurácia treino ${last.accuracy}% · acurácia validação ${last.valAccuracy??'n/d'}%. Validação pequena: resultados não comprovam generalização.`;
 $('training-status').textContent='Treinamento concluído';
}
$('retrain').onclick=()=>{stopTimer();try{const result=train({epochs:Number($('epochs').value),rate:Number($('rate').value)});api('/training-runs',{method:'POST',data:result}).catch(error=>console.error('Treino não persistido:',error));drawTraining();if(trace){trace=null;current=-1;maxReached=-1;render();}}catch(error){$('training-status').textContent=error.message;}};
$('add-example').onclick=async()=>{try{await api('/examples',{method:'POST',data:{text:$('example-text').value,label:$('example-label').value}});addExample($('example-text').value,$('example-label').value);$('example-text').value='';$('example-status').textContent='Exemplo adicionado. Clique em “Treinar modelo” para aplicar o novo conjunto.';renderExamples();}catch(error){$('example-status').textContent=error.message;}};
for(const label of trainingInfo().classes){const option=document.createElement('option');option.value=label;option.textContent=label;$('example-label').append(option);}drawTraining();renderExamples();

// Exemplos contextuais: alteram somente placeholders, nunca conteúdo digitado.
const knowledgePlaceholders = {
  capital: {question:'Ex.: Qual é a capital de Alagoas?', answer:'Ex.: A capital de Alagoas é Maceió.'},
  perguntar_bebida: {question:'Ex.: O que o gato bebe?', answer:'Ex.: O gato bebe água.'},
  perguntar_comida: {question:'Ex.: O que o coelho come?', answer:'Ex.: O coelho come vegetais.'},
  outro: {question:'Ex.: Quanto é dois mais dois?', answer:'Ex.: Dois mais dois é quatro.'}
};
function updateKnowledgePlaceholders(){
  const example=knowledgePlaceholders[$('knowledge-intent').value] ?? knowledgePlaceholders.outro;
  $('knowledge-question').placeholder=example.question;
  $('knowledge-answer').placeholder=example.answer;
}
$('knowledge-intent').addEventListener('change',updateKnowledgePlaceholders);
updateKnowledgePlaceholders();
// Base explícita: CRUD e persistência independente do classificador neural.
// A lista de registros foi removida. Edição e revisão são feitas via JSON,
// com importação transacional e atualização explícita no banco de dados.
function renderKnowledge() {
    // Mantido como ponto de extensão para o gerenciador de conhecimentos.
}
$('save-knowledge').onclick = async () => {
    try {
        await api('/knowledge', {
            method: 'POST',
            data: {
                question: $('knowledge-question').value,
                answer: $('knowledge-answer').value,
                intent: $('knowledge-intent').value
            }
        });
        await refreshKnowledge();
        $('knowledge-question').value = '';
        $('knowledge-answer').value = '';
        $('knowledge-status').textContent = 'Novo conhecimento adquirido! Obrigada por me ensinar algo novo.';
    } catch (error) {
        $('knowledge-status').textContent = error.message;
    }
};
$('cancel-knowledge').hidden = true;

function downloadText(text, filename) {
    const blob = new Blob([text], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('export-knowledge').onclick = () => downloadText(exportKnowledge(), 'mylittlia-conhecimentos-v0.9.json');
$('import-knowledge').onchange = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
        if (file.size > 2_000_000) throw new Error('Arquivo muito grande (máximo 2 MB).');
        const data = JSON.parse(await file.text());
        if (data.kind !== 'explicit-knowledge' || !Array.isArray(data.items)) {
            throw new Error('Formato de conhecimento inválido.');
        }
        const result = await api('/knowledge/import-updates', { method:'POST', data:{items:data.items} });
        replaceKnowledge(result.items);
        renderKnowledge();
        $('knowledge-status').textContent = `Importação concluída! ${result.added} novo(s), ${result.updated} atualizado(s) e ${result.unchanged} sem alteração. Os demais conhecimentos foram preservados.`;
    } catch (error) { $('knowledge-status').textContent = error.message; }
    finally { event.target.value = ''; }
};

async function refreshKnowledge() {
    const response = await api('/knowledge');
    replaceKnowledge(response.items);
    renderKnowledge();
}

async function initialize() {
    try {
        const bootstrap = await api('/bootstrap');
        // Migra os dados do navegador antigo uma única vez por base, sem substituí-los.
        const oldKnowledge = browserKnowledgeForMigration();
        if (oldKnowledge.length) {
            const migration = await api('/knowledge/merge', {
                method:'POST', data:{items:oldKnowledge}
            });
            replaceKnowledge(migration.items);
            $('knowledge-status').textContent = `Memória pronta! Recuperei ${migration.added} novo(s) conhecimento(s) e reconheci ${migration.skipped} já cadastrado(s).`;
        } else {
            replaceKnowledge(bootstrap.knowledge);
            $('knowledge-status').textContent = 'Minha memória está pronta para receber novos conhecimentos!';
        }
        // Seed do classificador é nativa. Importa apenas exemplos adicionais do banco.
        const existingKeys = new Set(allExamples().map(x => `${x.label}|${x.text.toLocaleLowerCase('pt-BR')}`));
        for (const item of bootstrap.examples) {
            const key = `${item.label}|${item.text.toLocaleLowerCase('pt-BR')}`;
            if (!existingKeys.has(key)) {
                try { addExample(item.text, item.label); existingKeys.add(key); }
                catch (error) { console.warn('Exemplo ignorado:', error); }
            }
        }
        train();
        drawTraining();
        renderExamples();
        renderKnowledge();
        $('run').disabled = false;
        $('run').title = '';
    } catch (error) {
        $('knowledge-status').textContent = 'Não consegui acessar minha memória. Verifique se o servidor está iniciado. Detalhes: ' + error.message;
        $('training-status').textContent = 'Servidor indisponível. Inicie com npm start.';
        console.error('MylittlIA não inicializada:', error);
    }
}
initialize();

// v0.8 — Conversa supervisionada e consulta de relações.
let conversationId=null;
const relationPageSize = 40;
let relationPage = 0;
let relationCache = [];
let relationView = 'pending';
let relationEditingId = null;

function renderRelations() {
    const target = $('relations-list');
    const query = $('relations-search').value.trim().toLocaleLowerCase('pt-BR');
    const filtered = relationCache.filter(rel => {
        const isDefined = rel.confidence !== null && rel.confidence !== undefined;
        return (relationView === 'defined' ? isDefined : !isDefined)
            && `${rel.subject} ${rel.predicate} ${rel.object}`.toLocaleLowerCase('pt-BR').includes(query);
    });
    const pages = Math.max(1, Math.ceil(filtered.length / relationPageSize));
    relationPage = Math.max(0, Math.min(relationPage, pages - 1));
    const visible = filtered.slice(relationPage * relationPageSize, (relationPage + 1) * relationPageSize);
    target.replaceChildren();
    $('relations-count').textContent = `${filtered.length} ${relationView === 'defined' ? 'pesos definidos' : 'relações sem peso'} — até ${relationPageSize} por página.`;
    $('relations-page').textContent = `${relationPage + 1} / ${pages}`;
    $('relations-prev').disabled = relationPage === 0;
    $('relations-next').disabled = relationPage >= pages - 1;
    $('relations-pending').setAttribute('aria-pressed', String(relationView === 'pending'));
    $('relations-defined').setAttribute('aria-pressed', String(relationView === 'defined'));
    if (!filtered.length) target.textContent = relationView === 'defined'
        ? 'Nenhum peso definido corresponde à busca.'
        : 'Nenhuma relação aguardando definição de peso.';

    for (const rel of visible) {
        const row = document.createElement('div');
        row.className = 'relation-row';
        const description = document.createElement('span');
        description.className = 'relation-description';
        description.textContent = `${rel.subject} → ${rel.predicate} → ${rel.object}`;
        description.title = description.textContent;
        const controls = document.createElement('div');
        controls.className = 'relation-weight-controls';
        const note = document.createElement('small');
        note.className = 'relation-status';
        note.setAttribute('role', 'status');

        function showEditor() {
            controls.replaceChildren();
            const label = document.createElement('label');
            label.textContent = 'Peso (0–1)';
            const input = document.createElement('input');
            input.type = 'number';
            input.min = '0';
            input.max = '1';
            input.step = '0.01';
            input.value = rel.confidence ?? '';
            input.setAttribute('aria-label', `Peso de ${rel.subject} → ${rel.object}`);
            const save = document.createElement('button');
            save.type = 'button';
            save.className = 'secondary';
            save.textContent = 'Salvar';
            const cancel = document.createElement('button');
            cancel.type = 'button';
            cancel.className = 'secondary relation-cancel';
            cancel.textContent = 'Cancelar';
            cancel.hidden = relationView !== 'defined';
            cancel.onclick = () => { relationEditingId = null; renderRelations(); };
            note.textContent = rel.confidence == null ? 'Não avaliado' : `Atual: ${rel.confidence}`;
            save.onclick = async () => {
                const raw = input.value.trim();
                const value = raw === '' ? null : Number(raw);
                if (raw !== '' && (!Number.isFinite(value) || value < 0 || value > 1)) {
                    note.textContent = 'Informe um valor de 0 a 1.';
                    return;
                }
                save.disabled = true;
                note.textContent = 'Salvando…';
                try {
                    const response = await api(`/relations/${rel.id}/weight`, {
                        method: 'PATCH', data: { confidence: value }
                    });
                    rel.confidence = response.item.confidence;
                    relationEditingId = null;
                    renderRelations();
                } catch (error) {
                    note.textContent = `Não consegui salvar: ${error.message}`;
                    console.error('Falha ao salvar peso:', error);
                } finally {
                    save.disabled = false;
                }
            };
            label.append(input);
            controls.append(label, save, cancel, note);
        }

        if (relationView === 'defined' && relationEditingId !== rel.id) {
            const weight = document.createElement('span');
            weight.className = 'relation-defined-value';
            weight.textContent = `Peso: ${rel.confidence}`;
            const edit = document.createElement('button');
            edit.type = 'button';
            edit.className = 'secondary';
            edit.textContent = 'Editar';
            edit.setAttribute('aria-label', `Editar peso de ${description.textContent}`);
            edit.onclick = () => { relationEditingId = rel.id; renderRelations(); };
            controls.append(weight, edit);
        } else {
            showEditor();
        }
        row.append(description, controls);
        target.append(row);
    }
}

async function loadAssessments(){
  const box=$('assessment-results');
  const status=$('assessment-filter').value;
  try {
    const result=await api('/relations/assessments?status='+encodeURIComponent(status)+'&limit=100');
    box.replaceChildren();
    for (const r of result.items) {
      const item=document.createElement('div');item.className='assessment-item';
      const title=document.createElement('strong'); title.textContent=`${r.subject} → ${r.predicate} → ${r.object}`;
      const hint=document.createElement('small');hint.textContent=`${r.status==='conflict'?'Possível conflito':r.status==='evidence'?'Evidência identificada':'Revisar'} · ${r.rationale} · Peso manual: ${r.manual_weight??'não definido'} · Pontuação automática: ${r.score??'não atribuída'}`;
      item.append(title,hint);box.append(item);
    }
    if(!result.items.length)box.textContent='Nenhuma avaliação nesta categoria.';
    $('assessment-summary').textContent=`${result.total} avaliação(ões) neste filtro.`;
  }catch(err){$('assessment-summary').textContent=err.message;}
}
async function runAssessment(dryRun){
  const btn=$(dryRun?'assess-preview':'assess-apply');btn.disabled=true;
  $('assessment-summary').textContent='Analisando relações…';
  try{
    const out=await api('/relations/assess',{method:'POST',data:{dryRun,limit:20000}});
    $('assessment-summary').textContent=`${dryRun?'Simulação':'Avaliação gravada'}: ${out.total} relações · ${out.evidence} com evidência identificada · ${out.review} para revisão · ${out.conflict} possíveis conflitos. Nenhum peso manual foi alterado.`;
    if(!dryRun)await loadAssessments();
  }catch(err){$('assessment-summary').textContent='Falha: '+err.message;}
  finally{btn.disabled=false;}
}
$('assess-preview').onclick=()=>runAssessment(true);
$('assess-apply').onclick=()=>runAssessment(false);
$('assessment-filter').onchange=loadAssessments;
$('relations-search').addEventListener('input', () => { relationPage = 0; renderRelations(); });
$('relations-prev').addEventListener('click', () => { relationPage--; renderRelations(); });
// Revisão explícita dos ensinamentos recebidos durante a conversa.
const reviewPanel = document.createElement('section');
reviewPanel.id = 'pending-review-panel';
reviewPanel.className = 'panel';
reviewPanel.innerHTML = `<div class="section-head"><h2>Cadastrar conhecimento</h2><span>Informações para revisar</span></div>
  <p class="hint">Selecione o que deseja incorporar à memória. Informações não selecionadas continuam aguardando revisão.</p>
  <div class="training-controls"><button type="button" class="secondary" id="review-select-all">Selecionar todos</button>
  <button type="button" class="secondary" id="review-deselect-all">Desmarcar todos</button>
  <button type="button" id="review-approve">Aprovar selecionados</button>
  <button type="button" class="secondary" id="review-reject">Rejeitar selecionados</button></div>
  <div class="review-audit-toolbar"><button type="button" class="secondary" id="review-audit">Auditar pendências</button><span id="review-audit-summary" class="hint" role="status"></span></div>
  <p class="hint" role="status" id="review-status"></p>
  <div class="knowledge-list" id="review-list"></div>`;
$('relations-panel').before(reviewPanel);
let pendingReviewItems = [];
function renderPendingReview() {
  const list = $('review-list');
  list.replaceChildren();
  if (!pendingReviewItems.length) {list.textContent='Nenhuma informação aguardando revisão.';return;}
  for (const item of pendingReviewItems) {
    const label=document.createElement('label'); label.className='knowledge-row';
    const input=document.createElement('input');input.type='checkbox';input.className='review-selection';input.value=item.id;
    const desc=document.createElement('span');desc.style.whiteSpace='pre-wrap';
    desc.textContent=`${item.question ? 'Pergunta: '+item.question+'\n' : ''}${item.answer ? 'Ensinado: '+item.answer : item.description}`;
    if(item.facts?.length) {
      desc.textContent+='\nFatos que serão aprovados:\n'+item.facts.map(f=>`${f.subject} → ${f.predicate} → ${f.object}`).join('\n')+'\nA pergunta original não será gravada como resposta geral.';
    }
    const assessment=item.audit;
    if(assessment && assessment.status!=='ok') {
      const note=document.createElement('small');
      note.className='review-audit-warning '+(assessment.status==='blocked'?'review-audit-blocked':'review-audit-check');
      note.textContent=(assessment.status==='blocked'?'Aprovação bloqueada. ':'Revisar antes de aprovar. ')+assessment.issues.map(x=>x.message).join(' ');
      desc.append(document.createElement('br'),note);
      label.classList.add('review-flagged');
    }
    label.append(input,desc);list.append(label);
    if(item.kind==='proposal') {
      const edit=document.createElement('button');edit.type='button';edit.className='secondary';edit.textContent='Editar relação';
      edit.title='Corrigir sujeito, predicado, objeto e referências antes da aprovação';
      edit.onclick=()=>{
        const editor=document.createElement('div');editor.className='training-controls';
        const fields=[['subject','Sujeito'],['predicate','Predicado'],['object','Objeto'],['source_url','Fonte URL (opcional)'],['reference_year','Ano (opcional)']];
        const inputs={};
        for(const [key,label] of fields){
          const wrapper=document.createElement('label');wrapper.textContent=label+' ';
          const field=document.createElement('input');field.value=String(item[key]??'');field.placeholder=label;
          if(key==='source_url')field.type='url';if(key==='reference_year')field.inputMode='numeric';
          wrapper.append(field);editor.append(wrapper);inputs[key]=field;
        }
        const save=document.createElement('button');save.type='button';save.textContent='Salvar correção';
        save.onclick=async()=>{
          try{await api(`/proposals/${item.id}`,{method:'PATCH',data:Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,v.value]))});
            $('review-status').textContent='Relação corrigida. Revise e aprove quando estiver pronta.';await loadRelations();}
          catch(error){$('review-status').textContent='Erro: '+error.message;}
        };
        const cancel=document.createElement('button');cancel.type='button';cancel.className='secondary';cancel.textContent='Cancelar';
        cancel.onclick=()=>editor.remove();editor.append(save,cancel);edit.replaceWith(editor);
      };
      list.append(edit);
    }

  }
}
function selectReviewItems(checked) {
  $('review-list').querySelectorAll('.review-selection').forEach(c=>c.checked=checked);
}
$('review-select-all').onclick=()=>selectReviewItems(true);
$('review-deselect-all').onclick=()=>selectReviewItems(false);
async function reviewSelected(action) {
  const ids=[...$('review-list').querySelectorAll('.review-selection:checked')].map(x=>x.value);
  if(!ids.length){$('review-status').textContent='Selecione pelo menos uma informação.';return;}
  let succeeded=0;const errors=[];
  const selected=ids.map(id=>pendingReviewItems.find(x=>x.id===id)).filter(Boolean);
  const uncertain=action==='approve' && selected.filter(x=>x.kind==='teaching' && x.audit?.status==='review');
  let confirmedReview=false;
  if(uncertain.length) {
    confirmedReview=window.confirm(`${uncertain.length} informação(ões) requer(em) conferência de assunto. Você verificou a pergunta e a explicação e deseja aprová-las?`);
    if(!confirmedReview){$('review-status').textContent='Aprovação interrompida para revisão.';return;}
  }
  for (const id of ids) {
    const item=pendingReviewItems.find(x=>x.id===id);
    try {
      if(action==='approve' && item.audit?.status==='blocked') {errors.push('Há registros que não são ensinamentos; rejeite-os.');continue;}
      await api(item.kind==='teaching' ? `/conversational-teachings/${id}/${action}` : `/proposals/${id}/${action}`,{method:'POST',data:item.kind==='teaching'?{confirmedReview}:undefined});
      succeeded++;
    } catch(error) {errors.push(error.message);}
  }
  $('review-status').textContent=`${succeeded} informação(ões) ${action==='approve'?'aprovada(s)':'rejeitada(s)'}.${errors.length?' '+errors.join('; '):''}`;
  await loadRelations();
}
$('review-approve').onclick=()=>reviewSelected('approve');
$('review-reject').onclick=()=>reviewSelected('reject');
async function auditPendingReview() {
  const summary=$('review-audit-summary');summary.textContent='Analisando informações pendentes...';
  try {
    const report=await api('/conversational-teachings/audit');
    summary.textContent=`${report.total} ensinamento(s): ${report.ok} sem alerta, ${report.review} para conferir e ${report.blocked} bloqueado(s) para aprovação.`;
    const mapped=new Map(report.items.map(x=>[x.id,x.audit]));
    pendingReviewItems=pendingReviewItems.map(x=>x.kind==='teaching'?{...x,audit:mapped.get(x.id)??x.audit}:x);
    renderPendingReview();
  } catch(error) {summary.textContent='Falha na auditoria: '+error.message;}
}
$('review-audit').onclick=auditPendingReview;
window.addEventListener('mylittlia:open-pending-review',()=>loadRelations().catch(console.error));

$('relations-next').addEventListener('click', () => { relationPage++; renderRelations(); });
$('relations-pending').addEventListener('click', () => { relationView = 'pending'; relationEditingId = null; relationPage = 0; renderRelations(); });
$('relations-defined').addEventListener('click', () => { relationView = 'defined'; relationEditingId = null; relationPage = 0; renderRelations(); });

async function loadRelations() {
    const [relations, proposals, teachings] = await Promise.all([api('/relations'), api('/proposals'), api('/conversational-teachings')]);
    relationCache = relations.items;
    renderRelations();
    const list=$('proposals-list');list.replaceChildren();
    const pending=proposals.items.filter(item=>item.status==='pending');
    const pendingTeachings=teachings.items.filter(item=>item.status==='pending');
    pendingReviewItems=[...pendingTeachings.map(item=>({...item,kind:'teaching'})), ...pending.map(item=>({...item,kind:'proposal',description:`${item.subject} → ${item.predicate} → ${item.object}`}))];
    renderPendingReview();
    await auditPendingReview();
    window.dispatchEvent(new CustomEvent('mylittlia:pending-conversation-teachings',{detail:{count:pending.length+pendingTeachings.length}}));
    if(!pending.length && !pendingTeachings.length) list.textContent='Nenhum conhecimento aguardando aprovação.';
    for(const proposal of pending){
        const row=document.createElement('div');row.className='knowledge-row';
        const description=document.createElement('span');
        description.textContent=`${proposal.subject} → ${proposal.predicate} → ${proposal.object}`;
        const actions=document.createElement('div');actions.className='knowledge-actions';
        for(const [label,action] of [['Aprovar','approve'],['Rejeitar','reject']]){
            const button=document.createElement('button');
            button.className='secondary';button.textContent=label;
            button.onclick=async()=>{
                try{
                    await api(`/proposals/${proposal.id}/${action}`,{method:'POST'});
                    $('conversation-status').textContent=action==='approve'
                        ?'Conhecimento adquirido! Obrigada por me ensinar algo novo.'
                        :'Entendido. Não vou guardar essa informação.';
                    await loadRelations();
                }catch(error){$('conversation-status').textContent=error.message;}
            };
            actions.append(button);
        }
        row.append(description,actions);list.append(row);
    }
}
$('send-conversation').onclick=async()=>{
    try{
        const text=$('conversation-text').value.trim();
        const result=await api('/conversations/messages',{
            method:'POST',data:{text,conversationId}
        });
        conversationId=result.conversationId;
        $('conversation-status').textContent=result.message;
        $('conversation-text').value='';
        await loadRelations();
    }catch(error){$('conversation-status').textContent=error.message;}
};
loadRelations().catch(error=>console.error('Não foi possível carregar relações:',error));

window.addEventListener('mylittlia:knowledge-updated', () => { refreshKnowledge().catch(console.error); });


// Recarrega os conhecimentos incorporados pelo laboratório neural.
window.addEventListener('mylittlia:knowledge-updated', async () => {
    try { await refreshKnowledge(); }
    catch (error) { console.error('Não consegui atualizar os conhecimentos:', error); }
});
