import {importFootballResearch} from './adapters/football/football-research-import.js';
import { assessRelations, listAssessments } from './knowledge/assessments.js';
import { retrieveKnowledge } from './reasoning/attention-retrieval.js';
import { listNeuralExamples, incorporateNeuralExamples } from './neural/neural-examples.js';
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, sep, extname } from 'node:path';
import { openDatabase, listKnowledge, listExamples, createKnowledge, editKnowledge,
    removeKnowledge, mergeKnowledge, importKnowledgeUpdates, addTrainingExample, saveTraining, saveInference } from './persistence/database.js';

import { semanticAnswer } from './reasoning/semantic.js';
import { loadGenerative, generativeStatus, trainGenerative, generateGenerative } from './neural/generative.js';
import {loadWordModel,wordStatus,trainWords,generateWords,inspectWordInference} from './neural/word-generative.js';
import {configureNeuralDatabase} from './persistence/neural-storage.js';
import { conversationHistory, sendChatMessage } from './conversation/chat.js';
import { getChatOrder, setChatOrder } from './conversation/chat-preferences.js';
import { listConversationalTeachings, reviewConversationalTeaching, auditPendingTeachings } from './learning/teachings.js';
import { createRelation, listRelations, submitStatement, listProposals, reviewProposal, updateProposal, inferRelation, updateRelationWeight } from './knowledge/relations.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appVersion = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).version;
const db = openDatabase(join(root, 'data', 'mylittlia.db'));
console.log('Lote 021:',importFootballResearch(db,{apply:true}));
configureNeuralDatabase(db);
await loadGenerative(root);
await loadWordModel(root);
const host = '127.0.0.1';
const port = Number(process.env.PORT || 8000);
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.png':'image/png' };
const reply = (res, status, data) => {
    res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
    res.end(JSON.stringify(data));
};
async function body(req) {
    const chunks = []; let size = 0;
    for await (const chunk of req) {
        size += chunk.length;
        if (size > 2_000_000) throw Object.assign(new Error('Requisição muito grande.'), { status: 413 });
        chunks.push(chunk);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw Object.assign(new Error('JSON inválido.'), { status: 400 }); }
}

const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, `http://${host}:${port}`);
        const path = url.pathname;
        if (path.startsWith('/api/')) {
            if (req.method === 'GET' && path === '/api/version') return reply(res, 200, { version: appVersion });
            if (req.method === 'GET' && path === '/api/preferences/chat-order') return reply(res,200,{order:getChatOrder(db)});
            if (req.method === 'PUT' && path === '/api/preferences/chat-order') {
                const input=await body(req);
                return reply(res,200,{order:setChatOrder(db,input?.order)});
            }
            if (req.method === 'GET' && path === '/api/generative/examples') return reply(res,200,{items:listNeuralExamples(db)});
            if (req.method === 'POST' && path === '/api/generative/examples/incorporate') {
                const input=await body(req);
                return reply(res,200,incorporateNeuralExamples(db,input.ids));
            }
            if(req.method === 'POST' && path === '/api/generative/word/inspect') {
                const input=await body(req);
                return reply(res,200,inspectWordInference(input.text));
            }
            if(req.method === 'GET' && path === '/api/generative/word/status') return reply(res,200,wordStatus());
            if(req.method === 'POST' && path === '/api/generative/word/train') return reply(res,200,await trainWords(root,await body(req)));
            if(req.method === 'POST' && path === '/api/generative/word/generate') return reply(res,200,generateWords(await body(req)));
            if(req.method === 'GET' && path === '/api/generative/status') return reply(res,200,generativeStatus());
            if(req.method === 'POST' && path === '/api/generative/train') return reply(res,200,await trainGenerative(root,await body(req)));
            if(req.method === 'POST' && path === '/api/generative/generate') return reply(res,200,generateGenerative(await body(req)));
            if(req.method === 'POST' && path === '/api/attention/retrieve') {
                const input=await body(req);
                return reply(res,200,retrieveKnowledge(db,input.question));
            }
            if (req.method === 'POST' && path === '/api/chat/messages') {
                return reply(res,200,sendChatMessage(db,await body(req)));
            }
            const historyMatch=path.match(/^\/api\/chat\/([a-f0-9-]{36})$/);
            if (req.method === 'GET' && historyMatch) {
                const messages=conversationHistory(db,historyMatch[1]);
                return messages ? reply(res,200,{messages}) : reply(res,404,{error:'Conversa não encontrada.'});
            }
            if (req.method === 'POST' && path === '/api/semantic/answer') {
                const input=await body(req);
                if(typeof input.question !== 'string' || input.question.length > 2000) return reply(res,400,{error:'Pergunta inválida.'});
                return reply(res,200,{result:semanticAnswer(db,input.question)});
            }
            if(req.method==='POST' && path==='/api/relations/assess') {
                const options=await body(req);
                const result=assessRelations(db,{limit:options.limit??2000,dryRun:options.dryRun===true});
                return reply(res,200,{...result,items:result.items.slice(0,50)});
            }
            if(req.method==='GET' && path==='/api/relations/assessments') {
                return reply(res,200,listAssessments(db,{status:url.searchParams.get('status')||'all',limit:Number(url.searchParams.get('limit')||200),offset:Number(url.searchParams.get('offset')||0)}));
            }
            if (req.method === 'GET' && path === '/api/relations') return reply(res,200,{items:listRelations(db)});
            if (req.method === 'POST' && path === '/api/relations') return reply(res,201,{item:createRelation(db,await body(req))});
            const relationMatch=path.match(/^\/api\/relations\/([a-f0-9]{32}|[a-f0-9-]{36})\/weight$/);
            if (req.method === 'PATCH' && relationMatch) return reply(res,200,{item:updateRelationWeight(db,relationMatch[1],await body(req))});
            if (req.method === 'POST' && path === '/api/relations/infer') {
                const data=await body(req);
                return reply(res,200,{result:inferRelation(db,data.question)});
            }
            if (req.method === 'POST' && path === '/api/conversations/messages') {
                const data=await body(req);
                return reply(res,200,submitStatement(db,data.text,data.conversationId));
            }
            if (req.method === 'GET' && path === '/api/conversational-teachings') return reply(res,200,{items:listConversationalTeachings(db)});
            if (req.method === 'GET' && path === '/api/conversational-teachings/audit') return reply(res,200,auditPendingTeachings(db));
            const teachingMatch=path.match(/^\/api\/conversational-teachings\/([a-f0-9-]{36})\/(approve|reject)$/);
            if (req.method === 'POST' && teachingMatch) {
                const input=await body(req);
                return reply(res,200,reviewConversationalTeaching(db,teachingMatch[1],teachingMatch[2],{confirmedReview:input?.confirmedReview===true}));
            }
            if (req.method === 'GET' && path === '/api/proposals') return reply(res,200,{items:listProposals(db)});
            const editProposalMatch=path.match(/^\/api\/proposals\/([a-f0-9-]{36})$/);
            if (req.method === 'PATCH' && editProposalMatch) return reply(res,200,{item:updateProposal(db,editProposalMatch[1],await body(req))});
            const proposalMatch=path.match(/^\/api\/proposals\/([a-f0-9-]{36})\/(approve|reject)$/);
            if (req.method === 'POST' && proposalMatch) return reply(res,200,reviewProposal(db,proposalMatch[1],proposalMatch[2]==='approve'?'approved':'rejected'));
            if (req.method === 'GET' && path === '/api/health') return reply(res, 200, { ok:true, database:'sqlite' });
            if (req.method === 'GET' && path === '/api/bootstrap') {
                return reply(res, 200, { knowledge:listKnowledge(db), examples:listExamples(db) });
            }
            if (req.method === 'GET' && path === '/api/knowledge') return reply(res, 200, { items:listKnowledge(db) });
            if (req.method === 'POST' && path === '/api/knowledge') return reply(res, 201, { item:createKnowledge(db, await body(req)) });
            if (req.method === 'POST' && path === '/api/knowledge/merge') {
                const input = await body(req);
                return reply(res, 200, { ...mergeKnowledge(db, input.items, 'browser-import'), items:listKnowledge(db) });
            }
            if (req.method === 'POST' && path === '/api/knowledge/import-updates') {
                const input=await body(req);
                return reply(res,200,{...importKnowledgeUpdates(db,input.items),items:listKnowledge(db)});
            }
            const match = path.match(/^\/api\/knowledge\/([a-f0-9-]{36})$/);
            if (match && req.method === 'PUT') return reply(res, 200, { item:editKnowledge(db, match[1], await body(req)) });
            if (match && req.method === 'DELETE') return reply(res, 200, { deleted:removeKnowledge(db, match[1]) });
            if (path === '/api/examples' && req.method === 'POST') return reply(res, 201, { item:addTrainingExample(db, await body(req)) });
            if (path === '/api/training-runs' && req.method === 'POST') return reply(res, 201, { id:saveTraining(db, await body(req)) });
            if (path === '/api/inference-runs' && req.method === 'POST') return reply(res, 201, { id:saveInference(db, await body(req)) });
            if (path === '/api/inference-runs' && req.method === 'GET') {
                return reply(res, 200, { items:db.prepare('SELECT * FROM inference_runs ORDER BY created_at DESC LIMIT 50').all() });
            }
            return reply(res, 404, { error:'Endpoint não encontrado.' });
        }
        if (req.method !== 'GET' && req.method !== 'HEAD') return reply(res, 405, { error:'Método não permitido.' });
        const decoded = decodeURIComponent(path);
        const file = resolve(root, '.' + (decoded === '/' ? '/index.html' : decoded));
        if (file !== root && !file.startsWith(root + sep)) return reply(res, 403, { error:'Acesso negado.' });
        const relative = file.slice(root.length + 1).replaceAll('\\', '/');
        // Do not expose database, source server code or development artifacts.
        if (!/^(?:index\.html|favicon\.(?:png|ico)|css\/[^/]+\.css|js\/[\w./-]+\.js)$/.test(relative) || relative.includes('..')) {
            return reply(res, 404, { error:'Arquivo não encontrado.' });
        }
        const info = await stat(file);
        if (!info.isFile()) return reply(res, 404, { error:'Arquivo não encontrado.' });
        res.writeHead(200, { 'Content-Type':(mime[extname(file)] || 'application/octet-stream') + '; charset=utf-8', 'Cache-Control':'no-store' });
        if (req.method === 'HEAD') return res.end();
        res.end(await readFile(file));
    } catch (error) {
        const code = error.status || (error.code === 'ENOENT' ? 404 : 500);
        if (code === 500) console.error(error);
        reply(res, code, { error:code === 500 ? 'Erro interno do servidor.' : error.message });
    }
});
server.listen(port, host, () => console.log(`MylittlIA v${appVersion}: http://${host}:${port}/`));
