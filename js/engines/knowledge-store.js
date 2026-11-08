// Conhecimento explícito: NÃO é incorporado aos pesos neurais.
const KEY='mylittlia-knowledge-v0.6';
const initial=[
 {question:'Qual é a capital do Rio de Janeiro?',answer:'A capital do estado do Rio de Janeiro é Rio de Janeiro.',intent:'capital'},
 {question:'Qual é a capital de Sergipe?',answer:'A capital de Sergipe é Aracaju.',intent:'capital'}
];
let memory=null;
const normalize=s=>String(s).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
function read(){if(memory!==null)return memory;try{const raw=localStorage.getItem(KEY);if(raw){const parsed=JSON.parse(raw);if(Array.isArray(parsed)){memory=parsed;return memory;}}}catch{}memory=structuredClone(initial);return memory;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(memory));return true;}catch{return false;}}
// Snapshot da base SQLite: leitura síncrona para preservar o motor de inferência.
export function replaceKnowledge(items) {
    if (!Array.isArray(items)) throw new Error('Conhecimentos inválidos.');
    memory = items.map(({id, question, answer, intent}) => ({id, question, answer, intent}));
}
export function browserKnowledgeForMigration() {
    // Não remove a cópia anterior; a migração é sempre não destrutiva.
    try {
        const old = JSON.parse(localStorage.getItem(KEY) || 'null');
        return Array.isArray(old) ? old : [];
    } catch { return []; }
}
export function listKnowledge(){return read().map(x=>({...x}));}
export function addKnowledge(question,answer,intent='outro'){
 question=String(question??'').trim();answer=String(answer??'').trim();intent=String(intent??'outro').trim();
 if(question.length<5||answer.length<1||question.length>500||answer.length>1200)throw Error('Informe pergunta (5–500 caracteres) e resposta (1–1200 caracteres).');
 const existing=read().find(x=>normalize(x.question)===normalize(question));
 if(existing)throw Error('Pergunta já cadastrada. Edite o registro existente.');
 const item={id:globalThis.crypto?.randomUUID?.()??`k-${Date.now()}-${Math.random().toString(36).slice(2)}`,question,answer,intent};read().push(item);return {item,persisted:save()};
}
export function updateKnowledge(id,question,answer,intent){const item=read().find(x=>x.id===id);if(!item)throw Error('Conhecimento não encontrado.');question=String(question).trim();answer=String(answer).trim();if(question.length<5||!answer||question.length>500||answer.length>1200)throw Error('Pergunta ou resposta inválida.');if(read().some(x=>x!==item&&normalize(x.question)===normalize(question)))throw Error('Pergunta duplicada.');Object.assign(item,{question,answer,intent:String(intent||'outro')});return save();}
export function deleteKnowledge(id){const index=read().findIndex(x=>x.id===id);if(index<0)return false;read().splice(index,1);save();return true;}
export function findKnowledge(question){const normalized=normalize(question);const match=read().find(x=>normalize(x.question)===normalized);return match?{...match,matchType:'pergunta normalizada exata'}:null;}
export function exportKnowledge(){return JSON.stringify({schemaVersion:1,kind:'explicit-knowledge',items:listKnowledge()},null,2);}
export function importKnowledge(json){const data=JSON.parse(json);if(data?.kind!=='explicit-knowledge'||!Array.isArray(data.items)||data.items.length>5000)throw Error('Arquivo de conhecimento inválido.');const clean=[];for(const x of data.items){if(typeof x.question!=='string'||typeof x.answer!=='string'||x.question.trim().length<5||!x.answer.trim()||x.question.length>500||x.answer.length>1200)throw Error('Registro inválido no arquivo.');if(clean.some(y=>normalize(y.question)===normalize(x.question)))throw Error('Perguntas duplicadas no arquivo.');clean.push({id:globalThis.crypto?.randomUUID?.()??`k-${clean.length}`,question:x.question.trim(),answer:x.answer.trim(),intent:String(x.intent||'outro')});}memory=clean;return {count:clean.length,persisted:save()};}
