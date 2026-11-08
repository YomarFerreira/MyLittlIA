// Classificador neural didático: regressão softmax treinada por gradiente descendente.
// Aprende a classificar INTENÇÕES, não gera linguagem nem substitui fatos cadastrados.
const seedExamples = [
 ['o que o gato bebe','bebida'],['o que o cachorro bebe','bebida'],['qual bebida o gato toma','bebida'],['gato bebe o que','bebida'],['o que um cachorro bebe','bebida'],
 ['o que o gato come','comida'],['o que o cachorro come','comida'],['qual comida o gato come','comida'],['cachorro come o que','comida'],
 ['qual é a capital de pernambuco','capital'],['qual a capital do brasil','capital'],['qual é a capital de alagoas','capital'],['qual é a capital da bahia','capital'],['me diga a capital de alagoas','capital'],['qual a capital de são paulo','capital'],
 ['oi','saudacao'],['olá','saudacao'],['bom dia','saudacao'],['boa tarde','saudacao'],['boa noite','saudacao'],
 ['qual seu nome','nome'],['como você se chama','nome'],['qual é o seu nome','nome'],
 ['qual a cor do gato','outro'],['o gato bebe leite','outro'],['o que o gato bebe é branco','outro'],['quanto é dois mais dois','outro'],['qual é a idade do gato','outro'],['qual o clima amanhã','outro']
];
const examples = seedExamples.map(([text,label])=>[text,label]);
const classes = [...new Set(seedExamples.map(x=>x[1]))];
const norm = s=>s.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').trim().replace(/\s+/g,' ');
const words = s=>norm(s).split(' ').filter(Boolean);
let vocab = [...new Set(examples.flatMap(x=>words(x[0])))].sort();
const vector = s=>{const counts=Object.create(null);for(const w of words(s))counts[w]=(counts[w]||0)+1;return vocab.map(w=>Math.min(counts[w]||0,2)/2);};
const softmax = a=>{const max=Math.max(...a);const ex=a.map(v=>Math.exp(v-max));const sum=ex.reduce((x,y)=>x+y,0);return ex.map(v=>v/sum);};
let weights = classes.map(()=>Array(vocab.length).fill(0));
let bias = classes.map(()=>0);
let trained = false;
let history=[];
function predictRaw(x){return softmax(weights.map((w,k)=>w.reduce((s,v,j)=>s+v*x[j],bias[k])));}
export function addExample(text,label){
 const clean=String(text).trim();
 if(!clean || clean.length>300)throw Error('Informe uma frase de até 300 caracteres.');
 if(!classes.includes(label))throw Error('Selecione uma intenção válida.');
 if(examples.some(([t,l])=>norm(t)===norm(clean)&&l===label))throw Error('Exemplo já cadastrado.');
 examples.push([clean,label]);
 vocab=[...new Set(examples.flatMap(x=>words(x[0])))].sort();
 trained=false;
 return examples.length;
}
export function allExamples(){return examples.map(([text,label])=>({text,label}));}
export function train({epochs=350,rate=0.3}={}){
 epochs=Number(epochs);rate=Number(rate);
 if(!Number.isInteger(epochs)||epochs<1||epochs>1500||!Number.isFinite(rate)||rate<=0||rate>1)throw Error('Parâmetros inválidos.');
 weights=classes.map(()=>Array(vocab.length).fill(0));bias=classes.map(()=>0);history=[];
 // Divisão determinística por classe: reserva um exemplo por intenção quando possível.
 const byClass=new Map(classes.map(c=>[c,[]]));
 examples.forEach(([text,label])=>byClass.get(label).push({x:vector(text),y:classes.indexOf(label)}));
 const training=[],validation=[];
 for(const group of byClass.values()){
   group.forEach((sample,i)=>{(group.length>=4 && i===group.length-1?validation:training).push(sample);});
 }
 const evaluate=samples=>{
   if(!samples.length)return {loss:null,accuracy:null};
   let loss=0,correct=0;
   for(const {x,y} of samples){const probs=predictRaw(x);loss-=Math.log(Math.max(probs[y],1e-12));if(probs.indexOf(Math.max(...probs))===y)correct++;}
   return {loss:+(loss/samples.length).toFixed(5),accuracy:+(100*correct/samples.length).toFixed(2)};
 };
 for(let epoch=0;epoch<epochs;epoch++){
   for(const {x,y} of training){
     const probs=predictRaw(x);
     for(let k=0;k<classes.length;k++){
       const gradient=probs[k]-(k===y?1:0);
       for(let j=0;j<vocab.length;j++)weights[k][j]-=rate*gradient*x[j];
       bias[k]-=rate*gradient;
     }
   }
   if(epoch===0||(epoch+1)%5===0||epoch===epochs-1){
     const t=evaluate(training),v=evaluate(validation);
     history.push({epoch:epoch+1,loss:t.loss,accuracy:t.accuracy,valLoss:v.loss,valAccuracy:v.accuracy});
   }
 }
 trained=true;
 return {epochs,rate,examples:examples.length,trainingCount:training.length,validationCount:validation.length,features:vocab.length,classes,history:[...history]};
}
export function predict(text){if(!trained)train();const x=vector(text),p=predictRaw(x);return {label:classes[p.indexOf(Math.max(...p))],confidence:+Math.max(...p).toFixed(4),probabilities:classes.map((label,i)=>({label,probability:+p[i].toFixed(4)})),recognizedWords:words(text).filter(w=>vocab.includes(w)),unknownWords:words(text).filter(w=>!vocab.includes(w)),activeFeatures:vocab.filter((w,j)=>x[j]>0).map(w=>({word:w,weight:+weights[classes.indexOf('capital')][vocab.indexOf(w)].toFixed(4)})),model:'Regressão softmax (bag-of-words)',trainedExamples:examples.length,loss:history.at(-1)?.loss};}
export function trainingInfo(){if(!trained)train();return {history:[...history],classes,vocabularySize:vocab.length,exampleCount:examples.length};}
