import {canonicalEntity,registerEntity,registerGeographicAliases} from './entity-identity.js';
import {hasUnboundReference} from '../conversation/entity-reference.js';
import { randomUUID } from 'node:crypto';
import { normalize } from '../persistence/database.js';

const permitted = new Set(['e_um', 'bebe', 'pode_ingerir', 'numero_patas_tipico', 'cor_tipica', 'origem', 'caracteristica', 'tem', 'localizado_em', 'produz', 'come', 'tem_capital', 'possui', 'possui_cor', 'fundado_em', 'vegetacao_predominante', 'bioma', 'atividade_economica', 'som_emitido', 'onomatopeia', 'tem_bandeira']);
const pretty = value => value.replaceAll('_', ' ');
const capitalize = value => value.charAt(0).toUpperCase() + value.slice(1);
const unknown = 'Ainda não tenho conhecimento suficiente para responder a essa pergunta.';

function metadata(item) {
    const confidence = item.confidence == null || item.confidence === '' ? null : Number(item.confidence);
    if (confidence !== null && (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)) {
        throw Object.assign(new Error('Confiança deve estar entre 0 e 1.'), { status:400 });
    }
    const sourceType = String(item.source_type ?? 'user-approved').trim();
    if (!['user-approved','manual-sql','legacy','verified','imported'].includes(sourceType)) {
        throw Object.assign(new Error('Origem inválida.'), { status:400 });
    }
    const evidenceCount = Number(item.evidence_count ?? 1);
    if (!Number.isSafeInteger(evidenceCount) || evidenceCount < 1 || evidenceCount > 1000000) {
        throw Object.assign(new Error('Quantidade de evidências inválida.'), { status:400 });
    }
    return { confidence, sourceType, evidenceCount };
}

export function createRelation(db, item) {
    const subject = canonicalEntity(db,item.subject);
    const predicate = String(item.predicate ?? '').trim();
    const object = ['localizado_em','fica_em','municipio_de','pertence_a','tem_capital','cidade_sede','tem_bandeira'].includes(predicate) ? canonicalEntity(db,item.object) : normalize(item.object).replaceAll(' ', '_');
    if (hasUnboundReference(subject.replaceAll('_',' ')) || !subject || !object || subject.length > 100 || object.length > 100 || !permitted.has(predicate)) {
        throw Object.assign(new Error('Relação inválida.'), { status: 400 });
    }
    const meta = metadata(item);
    registerEntity(db,subject);
    if(predicate==='e_um')registerGeographicAliases(db,subject,object);
    const exists = db.prepare(`SELECT id FROM knowledge_relations
        WHERE subject=? AND predicate=? AND object=? LIMIT 1`).get(subject, predicate, object);
    if (exists) return { subject, predicate, object, inserted:false };
    const result = db.prepare(`INSERT INTO knowledge_relations
        (id,subject,predicate,object,confidence,source_type,evidence_count)
        VALUES (?,?,?,?,?,?,?)`)
        .run(randomUUID(), subject, predicate, object, meta.confidence, meta.sourceType, meta.evidenceCount);
    return { subject, predicate, object, inserted:Boolean(result.changes) };
}
export function listRelations(db) {
    return db.prepare(`SELECT r.id,r.subject,r.predicate,r.object,r.confidence,r.source_type,r.evidence_count,
        a.score AS assessment_score,a.status AS assessment_status
        FROM knowledge_relations r LEFT JOIN relation_assessments a ON a.relation_id=r.id
        ORDER BY r.subject,r.predicate,r.object`).all();
}

export function updateRelationWeight(db, id, payload) {
    const current = db.prepare('SELECT * FROM knowledge_relations WHERE id=?').get(id);
    if (!current) throw Object.assign(new Error('Relação não encontrada.'), {status:404});
    const meta = metadata({ ...current, ...payload });
    db.prepare(`UPDATE knowledge_relations SET confidence=?,source_type=?,evidence_count=? WHERE id=?`)
        .run(meta.confidence,meta.sourceType,meta.evidenceCount,id);
    return db.prepare('SELECT * FROM knowledge_relations WHERE id=?').get(id);
}

// Extrator de relações por padrões gerais. Não é uma LLM: o usuário revisa
// cada proposta antes de ela se tornar conhecimento recuperável.
export function extractLimbStatement(text) {
    let input = normalize(text).replace(/[.!]+$/, '').trim();
    if (input.includes('?')) return null;
    if (/^n[ãa]o,\s*/i.test(String(text).trim())) input = input.replace(/^nao\s+/, '');
    const m = input.match(/^(?:(?:o|a|um|uma)\s+)?([a-z][a-z ]*?)\s+(?:(?:normalmente|geralmente|sempre)\s+)?(?:tem|possui)\s+(?:(?:normalmente|geralmente|sempre)\s+)?(\d{1,3}|zero|uma?|duas?|dois|tres|quatro|cinco|seis|sete|oito|nove|dez)\s+patas$/);
    if (!m || /\b(?:nao|nunca|sem)\b/.test(m[1])) return null;
    const numbers = {zero:0,um:1,uma:1,dois:2,duas:2,tres:3,quatro:4,cinco:5,seis:6,sete:7,oito:8,nove:9,dez:10};
    return {subject:m[1],predicate:'numero_patas_tipico',object:String(numbers[m[2]] ?? Number(m[2])),extraction:'limb-quantity',verified:false};
}

export function extractStatement(text) {
    const input = normalize(text).replace(/[.!]+$/, '').trim();
    if (!input || input.length > 500 || input.split(' ').length < 3) return null;
    if (/^(?:(?:o|a) )?(?:ele|ela|eles|elas|isso|isto|aquilo)\b/.test(input)) return null;
    // Frases interrogativas não são afirmações para memorização.
    if (/\?$/.test(String(text).trim()) || /^(?:quem|qual|quando|onde|como|por que|porque|o que)\b/.test(input)) return null;
    if (/\b(?:nao|nunca) (?:tem|possui)\b/.test(input)) return null;
    const limbs = extractLimbStatement(text);
    if (limbs) return limbs;
    // Negação explícita: preserva o sujeito e marca a polaridade da afirmação.
    // A avaliação será armazenada na escala da propriedade afirmativa:
    // 'não é violenta' avaliada em 98/100 equivale a 'é violenta' em 2/100.
    const negative = input.match(/^(.+?) nao (?:e|esta) (.+)$/);
    if (negative) {
        const subject = negative[1].replace(/^(?:o |a |os |as )/, '').trim();
        const object = negative[2].trim();
        if (subject.length >= 2 && object.length > 0 && subject.length <= 100 && object.length <= 100) {
            return {subject, predicate:'caracteristica', object,
                polarity:'negative', extraction:'structural-pattern', verified:false};
        }
        return null;
    }
    const patterns = [
        [/^(.+?) (?:e a capital de|e capital de|e a capital do|e capital do|e a capital da) (.+)$/, 'capital_de'],
        [/^(.+?) (?:e um|e uma) (.+)$/, 'e_um'],
        [/^(.+?) (?:e|esta) (.+)$/, 'caracteristica'],
        [/^(.+?) (?:tem|possui) (?:quatro|4) patas$/, 'numero_patas_tipico'],
        [/^(.+?) (?:tem|possui) (.+)$/, 'tem'],
        [/^(.+?) (?:fica|esta localizado|esta localizada) (?:em|no|na) (.+)$/, 'localizado_em'],
        [/^(.+?) (?:vem|e originario|e originaria) (?:de|do|da) (.+)$/, 'origem'],
        [/^(.+?) (?:produz|fabricam|produzem) (.+)$/, 'produz'],
        [/^(.+?) (?:bebe|bebem) (.+)$/, 'bebe'],
        [/^(.+?) (?:come|comem) (.+)$/, 'come'],
        [/^(.+?) (?:e a capital de|e capital de|e a capital do|e capital do|e a capital da) (.+)$/, 'capital_de']
    ];
    for (const [pattern, type] of patterns) {
        const match = input.match(pattern);
        if (!match) continue;
        const subject = match[1].replace(/^(?:o |a |os |as )/, '').trim();
        let object = (type === 'numero_patas_tipico' ? '4' : match[2]).trim();
        const predicate = type === 'capital_de' ? 'tem_capital' : type;
        // Capital: "Maceió é a capital de Alagoas" -> Alagoas tem_capital Maceió.
        const result = type === 'capital_de'
            ? {subject:object, predicate, object:subject}
            : {subject, predicate, object};
        if (result.subject.length < 2 || result.object.length < 1 || result.subject.length > 100 || result.object.length > 100) return null;
        // Uma afirmação ensinada não significa que seja fato comprovado.
        return {...result, extraction:'structural-pattern', verified:false};
    }
    return null;
}
export function submitStatement(db, text, conversationId) {
    const raw = String(text ?? '').trim();
    if (!raw || raw.length > 500) throw Object.assign(new Error('Mensagem deve conter de 1 a 500 caracteres.'), { status:400 });
    let id = conversationId;
    if (id && !db.prepare('SELECT id FROM conversations WHERE id=?').get(id)) {
        throw Object.assign(new Error('Conversa não encontrada.'), { status:404 });
    }
    if (!id) { id=randomUUID(); db.prepare('INSERT INTO conversations(id) VALUES (?)').run(id); }
    const proposal=extractStatement(raw);
    db.exec('BEGIN');
    try {
        db.prepare('INSERT INTO conversation_messages(id,conversation_id,role,content) VALUES (?,?,?,?)')
            .run(randomUUID(), id, 'user', raw);
        if (proposal) {
            proposal.id=randomUUID();
            db.prepare(`INSERT INTO knowledge_proposals
                (id,conversation_id,subject,predicate,object,original_text) VALUES (?,?,?,?,?,?)`)
                .run(proposal.id,id,proposal.subject,proposal.predicate,proposal.object,raw);
        }
        const message=proposal
            ? 'Encontrei um possível conhecimento. Confira os dados e aprove antes de eu guardá-lo.'
            : 'Não consegui identificar uma relação nesta frase. Experimente escrever uma afirmação direta, como “O Rio de Janeiro é uma cidade”, “O gato tem quatro patas” ou “Maceió é a capital de Alagoas”.';
        db.prepare('INSERT INTO conversation_messages(id,conversation_id,role,content) VALUES (?,?,?,?)')
            .run(randomUUID(),id,'assistant',message);
        db.exec('COMMIT');
        return { conversationId:id, message, proposal };
    } catch(error) {db.exec('ROLLBACK');throw error;}
}
export function listProposals(db) {
    return db.prepare(`SELECT id,subject,predicate,object,original_text,status,batch_id,source_url,reference_year,edited_at
        FROM knowledge_proposals ORDER BY created_at DESC,id DESC LIMIT 300`).all();
}
export function updateProposal(db,id,input) {
    const item=db.prepare('SELECT * FROM knowledge_proposals WHERE id=?').get(id);
    if (!item) throw Object.assign(new Error('Proposta não encontrada.'),{status:404});
    if (item.status!=='pending') throw Object.assign(new Error('Somente propostas pendentes podem ser editadas.'),{status:409});
    const candidate={subject:normalize(input.subject??item.subject).replaceAll(' ','_'),
        predicate:String(input.predicate??item.predicate).trim(),
        object:normalize(input.object??item.object).replaceAll(' ','_')};
    if(!candidate.subject || !candidate.object || candidate.subject.length>100 || candidate.object.length>100 || !permitted.has(candidate.predicate))
        throw Object.assign(new Error('Relação inválida. Revise sujeito, predicado e objeto.'),{status:400});
    const sourceUrl=String(input.source_url??item.source_url??'').trim() || null;
    if(sourceUrl && (sourceUrl.length>500 || !/^https?:\/\//i.test(sourceUrl))) throw Object.assign(new Error('Fonte deve ser uma URL HTTP(S).'),{status:400});
    const year=input.reference_year==null || input.reference_year===''?null:Number(input.reference_year);
    if(year!==null && (!Number.isInteger(year)||year<1000||year>2100)) throw Object.assign(new Error('Ano de referência inválido.'),{status:400});
    db.prepare(`UPDATE knowledge_proposals SET subject=?,predicate=?,object=?,source_url=?,reference_year=?,edited_at=CURRENT_TIMESTAMP WHERE id=?`)
        .run(candidate.subject,candidate.predicate,candidate.object,sourceUrl,year,id);
    return db.prepare('SELECT * FROM knowledge_proposals WHERE id=?').get(id);
}
export function reviewProposal(db, id, decision) {
    if (!['approved','rejected'].includes(decision)) throw Object.assign(new Error('Decisão inválida.'), { status:400 });
    db.exec('BEGIN');
    try {
        const proposal = db.prepare('SELECT * FROM knowledge_proposals WHERE id=?').get(id);
        if (!proposal) throw Object.assign(new Error('Proposta não encontrada.'), { status:404 });
        if (proposal.status !== 'pending') throw Object.assign(new Error('Proposta já analisada.'), { status:409 });
        // Propriedades singulares conflitantes exigem revisão humana; cores e classes são multivaloradas.
        if(decision==='approved' && ['localizado_em','fundado_em','tem_capital','numero_patas_tipico'].includes(proposal.predicate)) {
            const conflicting=db.prepare(`SELECT object FROM knowledge_relations WHERE subject=? AND predicate=? AND object<>? LIMIT 1`)
                .get(proposal.subject,proposal.predicate,proposal.object);
            if(conflicting)throw Object.assign(new Error(`Conflito com valor já aprovado (${conflicting.object}). Corrija ou rejeite a proposta.`),{status:409});
        }
        const relation = decision==='approved' ? createRelation(db,proposal) : null;
        if(relation && (proposal.source_url || proposal.reference_year)) {
            const row=db.prepare('SELECT id FROM knowledge_relations WHERE subject=? AND predicate=? AND object=?').get(proposal.subject,proposal.predicate,proposal.object);
            // Não substitui metadados anteriores sem revisão explícita.
            db.prepare(`INSERT OR IGNORE INTO relation_provenance(relation_id,source_url,reference_year,source_note) VALUES (?,?,?,?)`)
                .run(row.id,proposal.source_url,proposal.reference_year,'Informação revisada pelo usuário; a aprovação não equivale à verificação externa.');
        }
        db.prepare(`UPDATE knowledge_proposals SET status=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=?`).run(decision,id);
        db.exec('COMMIT');
        return { decision, relation };
    } catch(error) { db.exec('ROLLBACK'); throw error; }
}

// Um score de classificação de caminhos, NÃO uma probabilidade calibrada.
// Relações sem confiança avaliada permanecem NULL e são explicitamente sinalizadas.
export function scorePath(path) {
    const effective = edge => edge.confidence ?? (edge.assessment_status === 'evidence' && Number.isFinite(edge.assessment_score) ? edge.assessment_score : null);
    const known = path.filter(edge => effective(edge) !== null);
    const unknownCount = path.length - known.length;
    const score = known.length === path.length
        ? path.reduce((value, edge) => value * effective(edge), 1)
        : null;
    return {score, unknownCount, method:'product-heuristic',calibrated:false};
}

function rankPaths(paths) {
    return paths.map(path => ({path, ...scorePath(path)}))
        .sort((a,b) => (b.score === null ? -1 : b.score) - (a.score === null ? -1 : a.score)
            || a.path.length - b.path.length);
}

// Inferência conservadora: relações aprovadas são as únicas premissas.
// Pesos manuais servem para classificar caminhos, não são probabilidades calibradas.
// Nenhum caminho derivado é salvo automaticamente no banco.
export function inferGraph(db, question) {
    const raw = normalize(question);
    const clean = value => value.replace(/^(?:o|a|os|as|um|uma) /, '').trim().replaceAll(' ', '_');
    const rows = listRelations(db);
    const bySubject = new Map();
    for (const edge of rows) {
        if (!bySubject.has(edge.subject)) bySubject.set(edge.subject, []);
        bySubject.get(edge.subject).push(edge);
    }
    const pathsTo = (start, predicate, object = null) => {
        const results = [];
        const queue = [{node:start, path:[], seen:new Set([start])}];
        while (queue.length && results.length < 40) {
            const current = queue.shift();
            const edges = bySubject.get(current.node) || [];
            for (const edge of edges) {
                if (edge.predicate === predicate && (!object || edge.object === object)) {
                    results.push([...current.path, edge]);
                }
                if (edge.predicate === 'e_um' && current.path.length < 4 && !current.seen.has(edge.object)) {
                    queue.push({node:edge.object, path:[...current.path,edge], seen:new Set([...current.seen,edge.object])});
                }
            }
        }
        return rankPaths(results);
    };
    // Perguntas geográficas de confirmação, baseadas em uma relação explícita.
    // A ausência de relação não autoriza resposta negativa.
    const locationQuestion = raw.match(/^(?:o |a )?(.+?) (?:fica|esta localizado|esta localizada|se localiza) (?:em|no|na) (.+)$/);
    if (locationQuestion) {
        const subject = clean(locationQuestion[1]);
        const destinationText = locationQuestion[2].replace(/^(?:regiao )/, '').replace(/(?: do brasil| brasileira| brasileiro)$/, '').trim();
        const destination = clean(destinationText);
        const found = (bySubject.get(subject) || []).filter(edge => edge.predicate === 'localizado_em' && edge.object === destination);
        if (found.length) {
            const ranked = rankPaths(found.map(edge => [edge]));
            const best = ranked[0];
            const region = ['norte','nordeste','sul','sudeste','centro_oeste'].includes(destination)
                ? `na Região ${capitalize(pretty(destination))} do Brasil`
                : `em ${pretty(destination)}`;
            return {
                kind:'graph-location',
                answer:`Sim! ${capitalize(pretty(subject))} fica ${region}.`,
                path:best.path,score:best.score,scoreInfo:best,alternativePaths:ranked.slice(1),
                interpretation:{intent:'location-confirmation',entity:subject,property:'localizado_em',value:destination,parser:'knowledge-graph',neuralUsedForAnswer:false},
                explanation:'Consultei a relação de localização explicitamente cadastrada. A ausência de peso manual não apaga o conhecimento; a verificação independente da afirmação é outra etapa.'
            };
        }
    }
    // Consultas a propriedades explícitas importadas, sem exigir uma pergunta
    // literal em knowledge. Só responde quando existe relação no grafo.
    const flagColors = raw.match(/^(?:(?:qual|quais) (?:e |sao )?(?:a |as )?(?:cor|cores) (?:da |de )?bandeira (?:de |do |da )?|(?:de |do |da )?que (?:cor|cores) (?:e |sao )?(?:a |as )?bandeira (?:de |do |da )?)(.+)$/);
    if (flagColors) {
        const entity = clean(flagColors[1]);
        const subject = `bandeira_de_${entity}`;
        const colors = (bySubject.get(subject) || []).filter(edge => edge.predicate === 'possui');
        // Limitar esta pergunta ao atributo de cores; não usar outras
        // propriedades da bandeira como se fossem cores.
        const validColors = new Set(['verde','amarelo','azul','branco','vermelho','preto','rosa','laranja','roxo','cinza','marrom']);
        const found = colors.filter(edge => validColors.has(edge.object));
        if (found.length) {
            const names = found.map(edge => pretty(edge.object));
            const finalText = names.length > 1
                ? `${names.slice(0,-1).join(', ')} e ${names.at(-1)}` : names[0];
            const label = pretty(entity).replace(/\b\w/g, char => char.toUpperCase());
            return {
                kind:'graph-property-list',
                answer:`A bandeira de ${label} tem as cores ${finalText}.`,
                path:found,
                score:null,
                explanation:'Consultei as relações de cores da bandeira já cadastradas. Não utilizei previsões do gerador neural nem inventei cores.',
                interpretation:{intent:'flag-colors',entity,parser:'knowledge-graph',neuralUsedForAnswer:false}
            };
        }
        return null;
    }
    const definition = raw.match(/^(?:o que e|quem e|defina|explique o que e) (.+)$/);
    if (definition) {
        const subject = clean(definition[1]);
        const members = pathsTo(subject, 'e_um');
        const direct = members.filter(x => x.path.length === 1);
        if (!direct.length) return null;
        const best = direct[0];
        const category = pretty(best.path.at(-1).object);
        const scoreInfo = scorePath(best.path);
        // Propriedades específicas do sujeito vêm antes das propriedades herdadas.
        // Só herdamos características estruturais de classes; características típicas
        // (cor, dieta, voo etc.) NÃO são universalizadas por herança.
        const human = value => pretty(value).replace(/\s+/g, ' ').trim();
        const properties = [];
        for (const relation of bySubject.get(subject) || []) {
            if (relation.predicate === 'cor_tipica') properties.push({edge:relation, text:`costuma apresentar coloração ${human(relation.object)}`});
            if (relation.predicate === 'possui') properties.push({edge:relation, text:`possui ${human(relation.object)}`});
            if (relation.predicate === 'numero_patas_tipico') properties.push({edge:relation, text:`normalmente tem ${human(relation.object)} patas`});
            if (relation.predicate === 'localizado_em') properties.push({edge:relation, text:`é encontrado em ${human(relation.object)}`});
        }
        // Ex.: ave -> possui -> penas é estrutural e pode ser herdada.
        // Não afirmamos que aves em geral voam ou possuem uma única cor.
        for (const relation of bySubject.get(best.path.at(-1).object) || []) {
            if (relation.predicate === 'possui' && ['penas', 'coluna_vertebral'].includes(relation.object)
                && !properties.some(item => item.edge.object === relation.object)) {
                properties.push({edge:relation, text:`possui ${human(relation.object)}`, inherited:true});
            }
        }
        // Lotes distintos podem registrar o mesmo conceito em formas equivalentes.
        // Evitar repetições como 'coloração rosa e coloração rosada'.
        const unique=[];
        for (const item of properties) {
            const comparable=normalize(item.text).replace(/\b(?:rosada|rosa)\b/g,'rosa');
            if (!unique.some(existing=>normalize(existing.text).replace(/\b(?:rosada|rosa)\b/g,'rosa')===comparable)) unique.push(item);
        }
        const details = unique.slice(0,3);
        const article = ['ave','aranha','abelha','borboleta','formiga'].includes(best.path.at(-1).object) ? 'uma' : 'um';
        const answer = `${capitalize(human(subject))} é ${article} ${category}${details.length ? `, ${details.map(item=>item.text).join(' e ')}` : ''}.`;
        return {kind:'graph-definition',answer,
            path:[...best.path,...details.map(item=>item.edge)],score:scoreInfo.score,scoreInfo,
            alternativePaths:direct.slice(1),
            explanation:'Construí uma descrição usando a classificação e propriedades explícitas ou estruturais herdáveis. Os valores das relações são consultados na memória; nenhum fato foi criado.',
            interpretation:{intent:'define-entity',entity:subject,parser:'weighted-knowledge-graph',neuralUsedForAnswer:false}};
    }
    const has = raw.match(/^(.+?) (?:possui|tem) (.+)$/);
    const questionHas = raw.match(/^(?:o|a)?\s*(.+?) (?:possui|tem) (.+)$/);
    const match = has || questionHas;
    if (match) {
        const subject = clean(match[1]);
        const object = clean(match[2]);
        // Não herdar características marcadas como típicas; exceções são possíveis.
        const options = [...pathsTo(subject,'possui',object),...pathsTo(subject,'tem',object)]
            .sort((a,b)=>(b.score??-1)-(a.score??-1) || a.path.length-b.path.length);
        if (!options.length) return null;
        const best = options[0];
        return {kind:'graph-inference',answer:`Sim. ${capitalize(pretty(subject))} possui ${pretty(object)}.`,
            path:best.path,score:best.score,scoreInfo:best,alternativePaths:options.slice(1),
            explanation:'Percorri relações de classificação e de propriedade existentes na memória. Os pesos classificam caminhos, mas não comprovam sua veracidade.',
            interpretation:{intent:'check-property',entity:subject,parser:'weighted-knowledge-graph',neuralUsedForAnswer:false}};
    }
    return null;
}

export function inferRelation(db, question) {
    const composed = inferGraph(db, question);
    if (composed) return composed;
    const text = normalize(question);
    const relationRows = listRelations(db);
    const edges = relationRows.filter(r=>r.predicate==='e_um');
    function allPaths(start,target,maxDepth=6,maxPaths=40) {
        const results=[], queue=[{node:start,path:[],visited:new Set([start])}];
        while(queue.length && results.length<maxPaths) {
            const current=queue.shift();
            if(current.path.length>=maxDepth) continue;
            for(const edge of edges.filter(e=>e.subject===current.node)) {
                if(current.visited.has(edge.object)) continue;
                const path=[...current.path,edge];
                if(edge.object===target) results.push(path);
                else queue.push({node:edge.object,path,visited:new Set([...current.visited,edge.object])});
            }
        }
        return rankPaths(results);
    }
    const membership=text.match(/^(?:o |a )?(gato|cachorro|vaca) e (?:um |uma )?(animal|mamifero|felino|canino|bovino|ruminante)$/);
    if(membership) {
        const [,animal,kind]=membership;
        const ranked=allPaths(animal,kind);
        if(ranked.length) return {
            answer:`Sim. ${capitalize(animal)} é ${pretty(kind)}.`,
            kind:'inferred-relation',path:ranked[0].path,
            score:ranked[0].score,scoreInfo:ranked[0],alternativePaths:ranked.slice(1)
        };
        return {answer:unknown,kind:'unknown',path:[],reason:'Ausência de caminho não significa resposta negativa.'};
    }
    const legs=text.match(/^quantas patas (?:tem|possui) (?:o |a )?(gato|cachorro|vaca)$/);
    const drink=text.match(/^o que (?:o |a )?(gato|cachorro|vaca) bebe$/);
    const color=text.match(/^qual (?:e )?a cor do (leite)$/);
    const origin=text.match(/^de onde vem (?:o )?(leite)$/);
    const choices=[
        [legs,'numero_patas_tipico',match=>`${capitalize(match[1])} normalmente tem {value} patas.`],
        [drink,'bebe',match=>`${capitalize(match[1])} bebe {value}.`],
        [color,'cor_tipica',match=>`A cor típica do ${match[1]} é {value}.`],
        [origin,'origem',match=>`O ${match[1]} vem de {value}.`]
    ];
    for(const [match,predicate,template] of choices) {
        if(!match) continue;
        const ranked=rankPaths(relationRows.filter(r=>r.subject===match[1] && r.predicate===predicate).map(r=>[r]));
        if(ranked.length) return {
            answer:template(match).replace('{value}',pretty(ranked[0].path[0].object)),
            kind:'explicit-relation',path:ranked[0].path,
            score:ranked[0].score,scoreInfo:ranked[0],alternativePaths:ranked.slice(1)
        };
    }
    return null;
}
