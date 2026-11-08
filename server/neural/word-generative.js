// Gerador neural didático por palavras: janela posicional de 8 tokens.
// Embeddings e projeção linear são ajustados por SGD; não utiliza atenção.
import {readNeuralModel,importLegacyNeuralModel,saveNeuralTraining} from '../persistence/neural-storage.js';
const CONTEXT=8,DIM=20,UNK='<UNK>',PAD='<PAD>',END='<FIM_RESPOSTA>'; 
const DEFAULT=`pergunta: qual é a capital de pernambuco? resposta: recife.\npergunta: qual é a capital de sergipe? resposta: aracaju.\npergunta: qual é a capital de alagoas? resposta: maceió.\npergunta: o que o gato bebe? resposta: água.\npergunta: o gato é um animal? resposta: sim.\npergunta: o que é um felino? resposta: um mamífero.\n`;
export function tokenizeWords(text){return String(text).toLocaleLowerCase('pt-BR').normalize('NFC').match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)*|[^\s\p{L}\p{N}]/gu)||[];}

let model=null,busy=false,lastLoss=null;
function random(seed=39851){return()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}
function init(vocab){const rnd=random(),n=vocab.length;return {version:1,context:CONTEXT,dim:DIM,vocab,trainedSteps:0,trainedExamples:0,
 embeddings:Array.from({length:n},()=>Array.from({length:DIM},()=>(rnd()-.5)*.2)),
 output:Array.from({length:CONTEXT*DIM},()=>Array.from({length:n},()=>(rnd()-.5)*.08)),bias:Array(n).fill(0)};}
function valid(m){return m?.version===1&&m.context===CONTEXT&&m.dim===DIM&&Array.isArray(m.vocab)&&m.vocab[0]===PAD&&m.vocab[1]===UNK&&m.embeddings?.length===m.vocab.length&&m.output?.length===CONTEXT*DIM&&m.bias?.length===m.vocab.length;}
export async function loadWordModel(root){await importLegacyNeuralModel(root,'word','word-model.json',valid);const m=readNeuralModel('word');if(m&&valid(m))model=m;}
function extendVocabulary(words){const known=new Set(model.vocab),add=[...new Set(words)].filter(w=>!known.has(w));if(!add.length)return;const rnd=random(model.vocab.length*104729),old=model.vocab.length;model.vocab.push(...add);for(let i=0;i<add.length;i++)model.embeddings.push(Array.from({length:DIM},()=>(rnd()-.5)*.2));for(const row of model.output)for(let i=0;i<add.length;i++)row.push((rnd()-.5)*.08);model.bias.push(...add.map(()=>0));}
function features(ids){const vector=[];for(const id of ids)vector.push(...model.embeddings[id]);return vector;}
function prediction(ids){const f=features(ids),n=model.vocab.length;const logits=Array.from({length:n},(_,j)=>model.bias[j]+f.reduce((a,v,i)=>a+v*model.output[i][j],0));const peak=Math.max(...logits),exp=logits.map(v=>Math.exp(v-peak)),sum=exp.reduce((a,b)=>a+b,0);return {f,probs:exp.map(v=>v/sum)};}
function step(context,target,rate){const {f,probs}=prediction(context),grad=probs.slice();grad[target]-=1;
const featureGrad=f.map((_,i)=>model.output[i].reduce((a,w,j)=>a+w*grad[j],0));
for(let i=0;i<f.length;i++)for(let j=0;j<grad.length;j++)model.output[i][j]-=rate*f[i]*grad[j];
for(let k=0;k<CONTEXT;k++)for(let d=0;d<DIM;d++)model.embeddings[context[k]][d]-=rate*featureGrad[k*DIM+d];
for(let j=0;j<grad.length;j++)model.bias[j]-=rate*grad[j];return -Math.log(Math.max(1e-12,probs[target]));}
export const wordStatus=()=>({trained:!!model?.trainedSteps,trainedSteps:model?.trainedSteps||0,trainedExamples:model?.trainedExamples||0,lastLoss,vocabularySize:model?.vocab.length||0,contextLength:CONTEXT,embeddingDimensions:DIM,modelType:'predição neural da próxima palavra (sem atenção)',checkpoint:'SQLite / neural_models (word)'});
export async function trainWords(root,input={}){if(busy)throw Object.assign(Error('Treinamento em andamento.'),{status:409});const epochs=Number(input.epochs??10);if(!Number.isInteger(epochs)||epochs<1||epochs>40)throw Object.assign(Error('Épocas devem estar entre 1 e 40.'),{status:400});const text=input.text==null||!String(input.text).trim()?DEFAULT:input.text;if(typeof text!=='string'||text.length>12000)throw Object.assign(Error('Texto de treinamento inválido.'),{status:400});const numberedMeasurements=text.split(/\r?\n/).filter(line=>/^\s*\d{1,3}[.)]\s+.+?:\s*[\d.,]+\s*km(?:²|2)/iu.test(line));
if(numberedMeasurements.length>=2 && !/^\s*pergunta\s*:/imu.test(text)) {
  throw Object.assign(new Error('Esta lista contém medidas, não exemplos de perguntas e respostas. Ensine-a na conversa, aprove o conhecimento e utilize o ranking numérico.'),{status:400});
}
const lines=text.split(/\r?\n/).filter(x=>x.trim());const tokens=lines.flatMap(line=>[...tokenizeWords(line),END]);if(tokens.length<12)throw Object.assign(Error('Forneça pelo menos 12 tokens para treinar.'),{status:400});if(new Set(tokens).size>500)throw Object.assign(Error('Limite didático de 500 palavras distintas por treinamento.'),{status:400});busy=true;try{if(!model)model=init([PAD,UNK,...new Set(tokens)]);else extendVocabulary(tokens);const dict=new Map(model.vocab.map((w,i)=>[w,i]));const sequences=lines.map(line=>[...tokenizeWords(line),END].map(t=>dict.get(t)??1));
const history=[];
for(let epoch=1;epoch<=epochs;epoch++){
 let loss=0,seen=0;
 for(const ids of sequences) for(let i=0;i<ids.length;i++){
  const context=Array.from({length:CONTEXT},(_,k)=>ids[i-CONTEXT+k]??0);
  loss+=step(context,ids[i],0.025);seen++;
 }
 history.push({epoch,loss:Number((loss/seen).toFixed(5))});
}model.trainedSteps+=epochs*tokens.length;model.trainedExamples+=text.split('\n').filter(x=>x.trim()).length;lastLoss=history.at(-1).loss;saveNeuralTraining('word',model,{epochs,exampleCount:text.split('\n').filter(x=>x.trim()).length,tokenCount:tokens.length,history,trainingText:text});return {history,status:wordStatus()};}finally{busy=false;}}
function detokenize(tokens){return tokens.join(' ').replace(/\s+([,.!?;:])/g,'$1').replace(/([([{])\s+/g,'$1');}
export function generateWords(input={}){if(!model?.trainedSteps)throw Object.assign(Error('Treine o modelo de palavras primeiro.'),{status:409});const prompt=String(input.prompt??'').slice(0,500);if(!prompt.trim())throw Object.assign(Error('Informe o começo da geração.'),{status:400});const count=Number(input.length??30),temperature=Number(input.temperature??0.7);if(!Number.isInteger(count)||count<1||count>80||!Number.isFinite(temperature)||temperature<0.2||temperature>1.5)throw Object.assign(Error('Parâmetros inválidos.'),{status:400});const dict=new Map(model.vocab.map((w,i)=>[w,i]));const inputTokens=tokenizeWords(prompt);let ids=Array(CONTEXT).fill(0).concat(inputTokens.map(t=>dict.get(t)??1));const emitted=[],trace=[];let ended=false;for(let pos=0;pos<count;pos++){const context=ids.slice(-CONTEXT),{probs}=prediction(context),adjusted=probs.map((v,i)=>i<2?0:Math.pow(v,1/temperature)),sum=adjusted.reduce((a,b)=>a+b,0);let r=Math.random()*sum,selected=2;for(let j=2;j<adjusted.length;j++){r-=adjusted[j];if(r<=0){selected=j;break;}}const top=probs.map((p,i)=>({token:model.vocab[i],probability:Number(p.toFixed(5))})).filter(x=>x.token!==PAD&&x.token!==UNK).sort((a,b)=>b.probability-a.probability).slice(0,5);if(pos<30)trace.push({position:pos+1,context:context.map(x=>model.vocab[x]),selected:model.vocab[selected],top});if(model.vocab[selected]===END){ended=true;break;}ids.push(selected);emitted.push(model.vocab[selected]);}return {text:detokenize(emitted),generatedTokens:emitted.length,ended,trace,status:wordStatus()};}


// Inferência determinística para o inspetor: utiliza exatamente os embeddings,
// matriz de projeção e bias do modelo gerativo treinado. Não gera a resposta do chat.
export function inspectWordInference(text) {
  const tokens = tokenizeWords(String(text ?? '').slice(0, 1000));
  if (!model?.trainedSteps) return { available:false, reason:'O modelo por palavras ainda não foi treinado.', tokens };
  const vocabIndex = new Map(model.vocab.map((token, id) => [token,id]));
  const tokenDetails = tokens.map(token => {
    const known = vocabIndex.has(token);
    const id = known ? vocabIndex.get(token) : 1;
    return { token, id, known, embedding:model.embeddings[id].slice() };
  });
  const contextTokens = tokens.slice(-CONTEXT);
  const contextIds = Array(CONTEXT).fill(0).concat(contextTokens.map(token=>vocabIndex.get(token)??1)).slice(-CONTEXT);
  const contextVectors = contextIds.map(id=>model.embeddings[id].slice());
  const featureVector = contextVectors.flat();
  const logits = model.vocab.map((token,j) => model.bias[j] + featureVector.reduce((sum,value,i)=>sum + value*model.output[i][j],0));
  const maxLogit=Math.max(...logits);
  const exp=logits.map(x=>Math.exp(x-maxLogit));
  const total=exp.reduce((a,b)=>a+b,0);
  const scores = logits.map((logit,i)=>({token:model.vocab[i],id:i,logit,probability:exp[i]/total}))
    .sort((a,b)=>b.probability-a.probability).slice(0,10);
  return { available:true, kind:'word-feed-forward',modelVersion:model.version,
    trainedSteps:model.trainedSteps, contextLength:CONTEXT,dimensions:DIM,
    tokens:tokenDetails, contextIds,contextTokens:contextIds.map(id=>model.vocab[id]),
    contextVectors, featureVector, topPredictions:scores,
    unknownTokens:tokenDetails.filter(t=>!t.known).map(t=>t.token),
    note:'Predição da próxima palavra, NÃO é uma resposta do chat nem atenção Transformer.'};
}
