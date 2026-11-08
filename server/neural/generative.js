// Pequeno modelo neural autoregressivo de caracteres com contexto de 2 posições.
// IMPORTANTE: modelo didático treinado do zero; NÃO é um Transformer nem uma LLM.
// O treinamento ajusta embeddings e projeção linear por gradiente descendente.
import {readNeuralModel,importLegacyNeuralModel,saveNeuralTraining} from '../persistence/neural-storage.js';

const ALPHABET = [..." abcdefghijklmnopqrstuvwxyzáàâãéêíóôõúüç0123456789,.?!:;()-\n"];
const VOCAB_SIZE = ALPHABET.length;
const DIM = 12;
const UNKNOWN = ALPHABET.indexOf(' ');
const indexOfChar = Object.fromEntries(ALPHABET.map((c, i) => [c, i]));
const clean = (text) => String(text).toLocaleLowerCase('pt-BR').normalize('NFC').replace(/[^ a-záàâãéêíóôõúüç0-9,.?!:;()\n-]/g, ' ').slice(0, 8000);
const idsOf = text => [...clean(text)].map(c => indexOfChar[c] ?? UNKNOWN);
const initModel = () => {
    // Seed fixa: reproduzível, sem dependência de bibliotecas externas.
    let seed = 1879;
    const rnd = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
    return {
        version: 1, vocab: ALPHABET.join(''), dim: DIM, trainedExamples: 0, trainedSteps: 0,
        embeddings: Array.from({length: VOCAB_SIZE}, () => Array.from({length: DIM}, () => (rnd() - 0.5) * 0.16)),
        output: Array.from({length: DIM}, () => Array.from({length: VOCAB_SIZE}, () => (rnd() - 0.5) * 0.16)),
        bias: Array(VOCAB_SIZE).fill(0),
    };
};
let model = initModel();
let lastLoss = null;
let busy = false;


export async function loadGenerative(root) {
    const valid = data => data?.version===1 && data.vocab===ALPHABET.join('') && data.dim===DIM &&
        data.embeddings?.length===VOCAB_SIZE && data.output?.length===DIM && data.bias?.length===VOCAB_SIZE;
    await importLegacyNeuralModel(root,'character','character-model.json',valid);
    const loaded=readNeuralModel('character');
    if (loaded && valid(loaded)) model=loaded;
}

function predict(a, b) {
    const hidden = Array.from({length:DIM}, (_,d) => (model.embeddings[a][d] + model.embeddings[b][d]) / 2);
    const logits = model.bias.map((bias, j) => bias + hidden.reduce((sum, h, d) => sum + h * model.output[d][j],0));
    const max = Math.max(...logits);
    const exps = logits.map(v => Math.exp(v-max));
    const sum = exps.reduce((acc,v) => acc+v,0);
    return {hidden, probabilities:exps.map(v => v/sum)};
}

function trainStep(a,b,target,rate) {
    const {hidden,probabilities} = predict(a,b);
    const gradient = [...probabilities]; gradient[target]-=1;
    const hiddenGrad = Array.from({length:DIM}, (_,d) => gradient.reduce((total,g,j)=>total+g*model.output[d][j],0));
    for(let d=0;d<DIM;d++) {
        for(let j=0;j<VOCAB_SIZE;j++) model.output[d][j]-=rate*hidden[d]*gradient[j];
        model.embeddings[a][d] -= rate * hiddenGrad[d] / 2;
        model.embeddings[b][d] -= rate * hiddenGrad[d] / 2;
    }
    for(let j=0;j<VOCAB_SIZE;j++) model.bias[j]-=rate*gradient[j];
    return -Math.log(Math.max(1e-12, probabilities[target]));
}

const DEFAULT_TEXT = `pergunta: qual é a capital de pernambuco? resposta: recife.\npergunta: qual é a capital de sergipe? resposta: aracaju.\npergunta: o que o gato bebe? resposta: água.\npergunta: o gato é um animal? resposta: sim.\npergunta: o que é um felino? resposta: um tipo de mamífero.\npergunta: o que é aprendizado? resposta: aprender padrões por meio de exemplos.\n`;
export function generativeStatus() {
    return {trained: model.trainedSteps > 0, trainedExamples:model.trainedExamples, trainedSteps:model.trainedSteps, lastLoss,
        vocabularySize:VOCAB_SIZE, contextLength:2, embeddingDimensions:DIM,
        modelType:'rede neural de previsão do próximo caractere (contexto de 2)', checkpoint:'SQLite / neural_models (character)'};
}
export async function trainGenerative(root, input) {
    if(busy) throw Object.assign(new Error('Treinamento em andamento.'),{status:409});
    const epochs = Number(input.epochs ?? 10);
    if(!Number.isInteger(epochs) || epochs < 1 || epochs > 50) throw Object.assign(new Error('Épocas devem estar entre 1 e 50.'),{status:400});
    const text = input.text == null ? DEFAULT_TEXT : input.text;
    if(typeof text !== 'string' || text.length > 8000 || text.trim().length < 20) throw Object.assign(new Error('Forneça pelo menos 20 caracteres de exemplos.'),{status:400});
    const tokens=idsOf(text); if(tokens.length<3) throw Object.assign(new Error('Texto muito curto.'),{status:400});
    const rate=0.04;
    busy=true;
    try {
        const history=[];
        for(let ep=0;ep<epochs;ep++) {
            let loss=0;
            for(let i=2;i<tokens.length;i++) loss+=trainStep(tokens[i-2],tokens[i-1],tokens[i],rate);
            history.push({epoch:ep+1,loss:Number((loss/(tokens.length-2)).toFixed(5))});
        }
        lastLoss=history.at(-1).loss;
        model.trainedExamples += text.split(/\n/).filter(line=>line.trim()).length;
        model.trainedSteps += epochs*(tokens.length-2);
        saveNeuralTraining('character',model,{
            epochs,exampleCount:text.split(/\n/).filter(line=>line.trim()).length,
            tokenCount:tokens.length,history,trainingText:text
        });
        return {history,status:generativeStatus()};
    } finally {busy=false;}
}
export function generateGenerative(input) {
    const prompt=String(input.prompt??'').slice(0,300);
    if(!prompt.trim()) throw Object.assign(new Error('Digite um começo de texto.'),{status:400});
    if(!model.trainedSteps) throw Object.assign(new Error('Treine o modelo experimental primeiro.'),{status:409});
    const count=Number(input.length??100),temp=Number(input.temperature??0.7);
    if(!Number.isInteger(count)||count<1||count>200||!Number.isFinite(temp)||temp<0.2||temp>1.5) throw Object.assign(new Error('Parâmetros de geração inválidos.'),{status:400});
    const generated=idsOf(prompt), steps=[];
    while(generated.length<2)generated.unshift(UNKNOWN);
    for(let n=0;n<count;n++) {
        const a=generated.at(-2),b=generated.at(-1);
        const {probabilities}=predict(a,b);
        const scaled=probabilities.map(v=>Math.pow(v,1/temp));
        const total=scaled.reduce((sum,v)=>sum+v,0);
        let r=Math.random()*total,chosen=scaled.length-1;
        for(let j=0;j<scaled.length;j++){r-=scaled[j];if(r<=0){chosen=j;break;}}
        const top=probabilities.map((probability,id)=>({token:ALPHABET[id]==='\n'?'\\n':ALPHABET[id],probability:Number(probability.toFixed(4))})).sort((x,y)=>y.probability-x.probability).slice(0,5);
        if(n<30)steps.push({position:n+1,context:ALPHABET[a]+ALPHABET[b],selected:ALPHABET[chosen]==='\n'?'\\n':ALPHABET[chosen],top});
        generated.push(chosen);
    }
    return {text:generated.slice(idsOf(prompt).length).map(id=>ALPHABET[id]).join(''),trace:steps,generatedTokens:count,status:generativeStatus()};
}
