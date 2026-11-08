import { normalize } from '../persistence/database.js';
import { inferRelation, extractStatement } from '../knowledge/relations.js';

// Recuperação semântica limitada: interpretação explícita e rastreável.
// NÃO é um modelo generativo nem embeddings semânticos treinados.
const UNKNOWN = 'Ainda não tenho conhecimento suficiente para responder a essa pergunta.';

/**
 * Escala qualitativa didática para afirmações sobre violência.
 * Os limites representam uma avaliação manual, NÃO dados de criminalidade.
 * O número fica somente no trace/inspetor técnico.
 */
export function violenceLevel(weight) {
    if (weight < 0.1) return 'não aparenta ter um nível elevado de violência';
    if (weight < 0.2) return 'tem um baixo nível de violência';
    if (weight < 0.8) return 'tem um nível de violência mediano';
    if (weight < 1) return 'é considerado violento';
    return 'é considerado muito violento';
}

/** Transforma avaliações em linguagem natural, sem expor números ao usuário. */
export function describeRegisteredClaim(relation) {
    const subject = String(relation.subject).replaceAll('_', ' ');
    const property = String(relation.object).replaceAll('_', ' ');
    const weight = relation.confidence == null ? null : Number(relation.confidence);
    const isViolenceClaim = relation.predicate === 'caracteristica'
        && ['violento', 'violenta'].includes(property.toLocaleLowerCase('pt-BR'));

    let answer;
    let level = null;
    if (isViolenceClaim && weight !== null && Number.isFinite(weight)) {
        level = violenceLevel(weight);
        answer = `Tenho registrada uma avaliação segundo a qual ${subject} ${level}, mas ainda não tenho dados confiáveis suficientes para confirmar essa afirmação. A avaliação depende, por exemplo, de indicadores de criminalidade e do período analisado.`;
    } else if (isViolenceClaim) {
        answer = `Tenho registrada uma afirmação sobre a violência em ${subject}, mas ela ainda não foi avaliada. Também não tenho dados confiáveis suficientes para confirmá-la.`;
    } else {
        answer = `Tenho registrada a afirmação de que ${subject} é ${property}, mas ainda não tenho evidências independentes suficientes para confirmá-la.`;
    }

    return {
        answer,
        weight,
        level,
        sourceType: relation.source_type ?? 'não informada',
        evidenceCount: relation.evidence_count ?? null
    };
}

const capitals = [
    /^(?:qual|que cidade) (?:e )?(?:a )?capital (?:do estado )?(?:de |do |da )?(.+)$/,
    /^(.+) (?:tem )?(?:qual|que cidade) (?:como )?(?:sua )?capital$/
];
const strip = text => normalize(text).replace(/^(?:estado de |estado do |estado da )/, '').trim();

function parse(question) {
    const text = normalize(question);
    const matches = capitals.map(pattern => text.match(pattern)).find(Boolean);
    if (matches) {
        let entity = strip(matches[1]);
        entity = entity.replace(/^o estado (?:de |do |da )/, '');
        if (entity) return { intent:'capital', entity, normalizedText:text, parser:'capital-structure' };
    }
    return { intent:'unknown', entity:null, normalizedText:text, parser:'no-supported-pattern' };
}
function parseCapitalExistence(question) {
    const text = normalize(question);
    const match = text.match(/^(?:(?:o|a) )?(.+?) (?:tem|possui) (?:uma? )?capital$/);
    return match ? strip(match[1]) : null;
}
function answerExistence(db, question) {
    const entity = parseCapitalExistence(question);
    if (!entity) return null;
    const relations = db.prepare(`SELECT id,subject,predicate,object,confidence,source_type
      FROM knowledge_relations WHERE predicate IN ('tem_capital','capital')`).all();
    const related = relations.filter(item => strip(item.subject) === entity);
    const known = db.prepare('SELECT id,question,answer,intent FROM knowledge').all().filter(item =>
        entityFromStoredQuestion(item.question) === entity &&
        (item.intent === 'capital' || normalize(item.question).includes('capital')));
    const names = new Set([...related.map(x=>normalize(x.object)), ...known.map(x=>normalize(capitalNameFromAnswer(x.answer) || x.answer))]);
    const interpretation = { intent:'capital-existence', entity, parser:'capital-existence-pattern', neuralUsedForAnswer:false };
    if (names.size > 1) return {kind:'ambiguous',answer:UNKNOWN,interpretation,reason:'Foram encontradas respostas divergentes.'};
    if (related.length || known.length) {
        const capital = related[0]?.object.replaceAll('_',' ') || capitalNameFromAnswer(known[0].answer);
        const qualifier = entity === 'rio de janeiro' ? 'Se você se refere ao estado do Rio de Janeiro, ' : '';
        return {kind:'semantic-knowledge',interpretation,
          answer: qualifier + 'sim, ele tem uma capital' + (capital ? `: ${capital}.` : '.'),
          source:related.length ? 'knowledge_relations':'knowledge',
          path:related.length ? [related[0]] : [],
          matchedQuestion:known[0]?.question ?? null,
          explanation:'Reconheci uma pergunta de existência e usei o conhecimento sobre a capital para responder.'};
    }
    return {kind:'unknown',answer:UNKNOWN,interpretation,reason:'Não encontrei informação suficiente para confirmar.'};
}
function getCapitalSubject(question) {
    const result = parse(question);
    return result.intent === 'capital' ? result.entity : null;
}
function capitalNameFromAnswer(answer) {
    const matched = String(answer).match(/\bcapital\s+(?:do estado\s+)?(?:de|do|da)\s+.+?\s+é\s+(.+?)[.!?]?$/iu);
    return matched ? matched[1].replace(/[.!?]+$/, '').trim() : null;
}
function entityFromStoredQuestion(question) {
    return getCapitalSubject(question);
}

/** Procura uma relação ou uma resposta associada à entidade, sem exigir frase igual. */
export function semanticAnswer(db, question) {
    const existence=answerExistence(db,question);
    if(existence) return existence;
    const analysis = parse(question);
    const interpretation = {
        normalizedText:analysis.normalizedText,
        intent:analysis.intent,
        entity:analysis.entity,
        parser:analysis.parser,
        neuralUsedForAnswer:false
    };
    if (analysis.intent === 'capital') {
        const relations = db.prepare(`SELECT id,subject,predicate,object,confidence,source_type
            FROM knowledge_relations WHERE predicate IN ('tem_capital','capital')`).all();
        const related = relations.filter(row => strip(row.subject) === analysis.entity);
        const distinct = [...new Set(related.map(row => normalize(row.object)))];
        if (distinct.length > 1) return { kind:'ambiguous', answer:UNKNOWN,
            interpretation, reason:'Relações de capital conflitantes; nenhuma conclusão foi escolhida.', candidates:related };
        if (related.length) return {
            kind:'explicit-relation',
            answer:`A capital de ${analysis.entity === 'brasil' ? 'Brasil' : analysis.entity} é ${related[0].object.replaceAll('_',' ')}.`,
            interpretation, source:'knowledge_relations', path:[related[0]],
            explanation:'Identifiquei uma pergunta sobre capital, extraí o lugar e consultei a relação correspondente.'
        };
        const rows = db.prepare('SELECT id,question,answer,intent FROM knowledge').all();
        const found = rows.filter(row => {
            if (entityFromStoredQuestion(row.question) !== analysis.entity) return false;
            return row.intent === 'capital' || normalize(row.question).includes('capital');
        });
        const answers = [...new Set(found.map(row => normalize(row.answer)))];
        if (answers.length > 1) return {kind:'ambiguous',answer:UNKNOWN,interpretation,
            reason:'Respostas cadastradas conflitantes para a mesma entidade.',candidates:found};
        if (found.length) return {
            kind:'semantic-knowledge', answer:found[0].answer, interpretation,
            source:'knowledge', knowledgeId:found[0].id,
            matchedQuestion:found[0].question,
            explanation:'Identifiquei a intenção e o lugar e recuperei um conhecimento cadastrado com outra formulação da pergunta.'
        };
        return {kind:'unknown',answer:UNKNOWN,interpretation,
            reason:'Local reconhecido, mas não há conhecimento cadastrado para sua capital.'};
    }
    // Mantém a inferência relacional anterior para outras perguntas suportadas.
    const graph = inferRelation(db, question);
    if (graph && graph.kind !== 'unknown') return {...graph, interpretation:{...interpretation,parser:'knowledge-graph'}};
    // Verifica afirmações gerais já aprovadas. Para descrições subjetivas,
    // apresenta a origem explicitamente, sem convertê-las em fatos comprovados.
    if (String(question).trim().endsWith('?')) {
        const claim = extractStatement(String(question).trim().replace(/\?+$/, ''));
        if (claim) {
            const subject = claim.subject.replaceAll(' ','_');
            const object = claim.object.replaceAll(' ','_');
            let match = db.prepare(`SELECT id,subject,predicate,object,source_type,confidence,evidence_count
                FROM knowledge_relations WHERE subject=? AND predicate=? AND object=? LIMIT 1`)
                .get(subject, claim.predicate, object);
            // Compatibilidade com registros criados pela versão antiga, que
            // interpretava erroneamente 'Sergipe não é violenta' como sujeito 'sergipe_nao'.
            // Não modifica o banco do usuário: apenas interpreta a avaliação inversa.
            let legacyNegative = false;
            if (!match && claim.predicate === 'caracteristica') {
                match = db.prepare(`SELECT id,subject,predicate,object,source_type,confidence,evidence_count
                    FROM knowledge_relations WHERE subject=? AND predicate=? AND object=? LIMIT 1`)
                    .get(`${subject}_nao`, claim.predicate, object);
                legacyNegative = Boolean(match);
            }
            if (match) {
                const interpreted = legacyNegative
                    ? {...match, subject, confidence:match.confidence == null ? null : 1 - match.confidence}
                    : match;
                const assessment = describeRegisteredClaim(interpreted);
                return {
                    kind:'explicit-relation',
                    answer:assessment.answer,
                    assessment: { confidence:assessment.weight, sourceType:assessment.sourceType,
                        evidenceCount:assessment.evidenceCount, calibratedProbability:false,
                        qualitativeLevel:assessment.level, legacyNegationConverted:legacyNegative },
                    interpretation:{...interpretation,intent:'check-registered-claim',entity:claim.subject,parser:'registered-statement',neuralUsedForAnswer:false},
                    source:'knowledge_relations',path:[match],
                    explanation:'Consultei uma afirmação previamente aprovada e sua avaliação manual. A classificação exibida não comprova a afirmação.'
                };
            }
        }
    }
    return null;
}
