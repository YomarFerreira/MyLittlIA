import {extractTeachingFacts} from './conversational-graph.js';
import {createRelation} from '../knowledge/relations.js';
import {hasUnboundReference} from '../conversation/entity-reference.js';
import { evaluateTeaching } from './teaching-validation.js';
import { incorporateMunicipalAreas, parseMunicipalAreaTeaching } from './structured-teaching.js';
import { randomUUID } from 'node:crypto';
import { normalize, createKnowledge } from '../persistence/database.js';

export function listConversationalTeachings(db) {
    return db.prepare(`SELECT id,question,answer,status,created_at FROM conversational_teachings
        ORDER BY created_at DESC,rowid DESC LIMIT 200`).all().map(item=>({ ...item, audit: evaluateTeaching(item.question,item.answer), facts:extractTeachingFacts(item.answer,db) }));
}

// Auditoria sob demanda de dados antigos — somente leitura, sem exclusões automáticas.
export function auditPendingTeachings(db) {
    const rows=db.prepare("SELECT id,question,answer,created_at FROM conversational_teachings WHERE status='pending' ORDER BY rowid DESC").all();
    const items=rows.map(row=>({...row,audit:evaluateTeaching(row.question,row.answer)}));
    return {total:items.length, blocked:items.filter(x=>x.audit.status==='blocked').length,
        review:items.filter(x=>x.audit.status==='review').length,
        ok:items.filter(x=>x.audit.status==='ok').length,items};
}

export function findPendingTeaching(db, question) {
    const normalized = normalize(question);
    if (!normalized) return null;
    const exact = db.prepare(`SELECT id,question,answer FROM conversational_teachings
        WHERE status='pending' AND normalized_question=? ORDER BY rowid DESC LIMIT 1`).get(normalized);
    if (exact && evaluateTeaching(exact.question,exact.answer).status!=='blocked') return exact;
    // Similaridade conservadora: nenhuma sugestão se a correspondência for apenas o assunto.
    const stop = new Set(['qual','quais','que','como','onde','quando','porque','por','que','o','a','os','as','um','uma','de','da','do','das','dos','e','ser','tem','sao','sobre']);
    const terms = value => new Set(normalize(value).split(' ').filter(t => t.length > 2 && !stop.has(t)));
    const original = terms(question);
    const rows = db.prepare(`SELECT id,question,answer FROM conversational_teachings
        WHERE status='pending' ORDER BY rowid DESC LIMIT 200`).all();
    let best=null; let score=0;
    for (const item of rows) {
        if(evaluateTeaching(item.question,item.answer).status==='blocked') continue;
        const candidate=terms(item.question);
        const shared=[...original].filter(t=>candidate.has(t)).length;
        const similarity=shared/Math.max(1,new Set([...original,...candidate]).size);
        if (original.size>=2 && candidate.size>=2 && similarity>=0.75 && similarity>score) {best=item;score=similarity;}
    }
    return best;
}

export function saveConversationalTeaching(db,conversationId,question,answer) {
    const normalized=normalize(question);
    const response=String(answer).trim();
    const audit=evaluateTeaching(question,response);
    if (audit.status==='blocked') throw Object.assign(new Error('Esta mensagem parece uma saudação, confirmação ou pergunta, e não foi registrada como conhecimento.'),{status:422, audit});
    if (normalized.length<3 || !response || response.length>1200) throw Object.assign(new Error('Conhecimento inválido.'),{status:400});
    const previous=findPendingTeaching(db,question);
    if (previous && normalize(previous.question)===normalized && normalize(previous.answer)===normalize(response)) return {...previous,inserted:false};
    const id=randomUUID();
    db.prepare(`INSERT INTO conversational_teachings(id,conversation_id,question,normalized_question,answer)
        VALUES (?,?,?,?,?)`).run(id,conversationId,question,normalized,response);
    return {id,question,answer:response,inserted:true};
}

export function reviewConversationalTeaching(db,id,decision,{confirmedReview=false}={}) {
    if (!['approve','reject'].includes(decision)) throw Object.assign(new Error('Decisão inválida.'),{status:400});
    db.exec('BEGIN');
    try {
        const item=db.prepare('SELECT * FROM conversational_teachings WHERE id=?').get(id);
        if (!item) throw Object.assign(new Error('Conhecimento não encontrado.'),{status:404});
        if (item.status!=='pending') throw Object.assign(new Error('Conhecimento já revisado.'),{status:409});
        const audit=evaluateTeaching(item.question,item.answer);
        if(decision==='approve' && audit.status==='blocked') throw Object.assign(new Error('Este registro não parece ser um ensinamento. Rejeite-o ou faça uma nova explicação.'),{status:422,audit});
        if(decision==='approve' && audit.status==='review' && confirmedReview!==true) throw Object.assign(new Error('Este conhecimento precisa de conferência explícita antes de ser aprovado.'),{status:409,audit});
        let knowledge=null;
        let relations=[];
        const facts=extractTeachingFacts(item.answer,db);
        if (decision==='approve' && facts.length) {
            // A aprovação confirma fatos mostrados na revisão, não a pergunta elíptica.
            for(const fact of facts) {
                if(['localizado_em','fundado_em','tem_capital','numero_patas_tipico'].includes(fact.predicate)) {
                    const conflict=db.prepare('SELECT object FROM knowledge_relations WHERE subject=? AND predicate=? AND object<>? LIMIT 1').get(fact.subject,fact.predicate,fact.object);
                    if(conflict) throw Object.assign(new Error('Conflito com valor já aprovado. Revise os fatos antes de aprovar.'),{status:409});
                }
                relations.push(createRelation(db,fact));
            }
        } else if (decision==='approve') {
            if(hasUnboundReference(item.question)) throw Object.assign(new Error('Identifique a entidade antes de aprovar esta pergunta.'),{status:422});
            const existing=db.prepare('SELECT id,answer FROM knowledge WHERE normalized_question=?').get(item.normalized_question);
            if (existing && normalize(existing.answer)!==normalize(item.answer)) throw Object.assign(new Error('Já existe uma resposta diferente. Revise o conflito antes de aprovar.'),{status:409});
            knowledge=existing ?? createKnowledge(db,{question:item.question,answer:item.answer,intent:'outro'},'conversation-approved');
            incorporateMunicipalAreas(db,item.question,item.answer);
        }
        db.prepare('UPDATE conversational_teachings SET status=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=?')
            .run(decision==='approve'?'approved':'rejected',id);
        db.exec('COMMIT');
        return {decision,knowledge,relations,audit};
    } catch(error) {db.exec('ROLLBACK');throw error;}
}
