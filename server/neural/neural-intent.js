import { trainingSamples } from '../language/semantic-catalog.js';
// Rede neural pequena, treinada do zero, para roteamento de intenções.
// Features são n-gramas de caracteres; duas camadas densas treinadas por SGD.
// Não é uma LLM nem verifica a verdade de uma afirmação.
import { normalize } from '../persistence/database.js';

const LABELS=['greeting','temporal','location','knowledge','teaching','other'];
const INPUT=384, HIDDEN=28;
const idx=Object.fromEntries(LABELS.map((x,i)=>[x,i]));
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)%INPUT;}
function features(text){const s=`  ${normalize(text)}  `;const map=new Map();const words=s.trim().split(/\s+/);for(let n=2;n<=4;n++)for(let i=0;i+n<=s.length;i++){const k=hash(`${n}:${s.slice(i,i+n)}`);map.set(k,(map.get(k)||0)+1);}for(const w of words){const k=hash(`w:${w}`);map.set(k,(map.get(k)||0)+2);}const arr=[...map].map(([i,v])=>[i,Math.min(v,4)]);const norm=Math.sqrt(arr.reduce((a,x)=>a+x[1]**2,0))||1;return arr.map(([i,v])=>[i,v/norm]);}
function seeded(){let state=7027;return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
function fresh(){const rng=seeded();return {w1:Array.from({length:HIDDEN},()=>Array.from({length:INPUT},()=> (rng()-.5)*.12)),b1:Array(HIDDEN).fill(0),w2:Array.from({length:LABELS.length},()=>Array.from({length:HIDDEN},()=> (rng()-.5)*.12)),b2:Array(LABELS.length).fill(0)};}
function forward(m,feat){const hidden=m.w1.map((weights,j)=>Math.max(0,feat.reduce((s,[k,v])=>s+weights[k]*v,m.b1[j])));const logits=m.w2.map((weights,j)=>weights.reduce((s,v,k)=>s+v*hidden[k],m.b2[j]));const max=Math.max(...logits);const exps=logits.map(v=>Math.exp(v-max));const total=exps.reduce((a,b)=>a+b,0);return {hidden,probs:exps.map(v=>v/total)};}
export function trainIntentModel({db,epochs=100,rate=.18}={}){const m=fresh();const data=trainingSamples(db).filter(row=>Object.hasOwn(idx,row.label)).map(({text,label})=>({feat:features(text),label:idx[label]}));for(let epoch=0;epoch<epochs;epoch++){const lr=rate*(1-epoch/epochs*.7);for(let offset=0;offset<data.length;offset++){const entry=data[(offset*37+epoch*7)%data.length];const {hidden,probs}=forward(m,entry.feat);const delta=probs.map((p,i)=>p-(i===entry.label?1:0));const dh=hidden.map((h,k)=>h>0?m.w2.reduce((a,weights,i)=>a+weights[k]*delta[i],0):0);for(let i=0;i<LABELS.length;i++){m.b2[i]-=lr*delta[i];for(let j=0;j<HIDDEN;j++)m.w2[i][j]-=lr*delta[i]*hidden[j];}for(let j=0;j<HIDDEN;j++){m.b1[j]-=lr*dh[j];for(const [k,v] of entry.feat)m.w1[j][k]-=lr*dh[j]*v;}}}return m;}
const cached=new WeakMap();
export function loadIntentModel(db){if(cached.has(db))return cached.get(db);let row=db.prepare('SELECT weights FROM neural_intent_models WHERE id=1').get();if(!row){const model=trainIntentModel({db});db.prepare('INSERT OR IGNORE INTO neural_intent_models(id,version,weights,trained_at) VALUES (1,?,?,CURRENT_TIMESTAMP)').run('scratch-v2-db',JSON.stringify(model));row=db.prepare('SELECT weights FROM neural_intent_models WHERE id=1').get();}const model=JSON.parse(row.weights);cached.set(db,model);return model;}
export function classifyIntent(db,text){const {probs}=forward(loadIntentModel(db),features(text));const ranked=LABELS.map((label,i)=>({label,score:Number(probs[i].toFixed(5))})).sort((a,b)=>b.score-a.score);return {label:ranked[0].label,confidence:ranked[0].score,candidates:ranked.slice(0,3),trainedFromScratch:true,model:db.prepare('SELECT version FROM neural_intent_models WHERE id=1').get()?.version||'scratch-v2-db',reliable:ranked[0].score>=.70};}

/** Retreinamento explícito: alterações nos exemplos não mudam pesos sem esta ação. */
export function retrainIntentModel(db,{epochs=100,rate=.18}={}) {
  const model=trainIntentModel({db,epochs,rate});
  const count=trainingSamples(db).length;
  db.prepare(`INSERT INTO neural_intent_models(id,version,weights,trained_at)
    VALUES(1,'scratch-v2-db',?,CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET version=excluded.version,weights=excluded.weights,trained_at=CURRENT_TIMESTAMP`).run(JSON.stringify(model));
  cached.set(db,model);
  return {model:'scratch-v2-db',trainedExamples:count,epochs};
}
