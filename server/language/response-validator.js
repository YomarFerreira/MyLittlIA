import {normalize} from '../persistence/database.js';

// Valida se a evidência recuperada atende ao plano; não verifica a verdade
// fora das fontes disponíveis e não infere fatos ausentes do banco.
export function validatePlannedAnswer(plan, candidate) {
  if (!candidate || !plan) return {ok:false,reason:'Plano ou resposta ausente'};
  if (plan.operation==='statistics') {
    const m=candidate.interpretation||{};
    const ok=candidate.kind==='numeric-statistics' && m.metric===plan.property
      && normalize(m.entity)===normalize(plan.entity) && m.count>0;
    return {ok,reason:ok?'Estatística apoiada em medidas da entidade e propriedade solicitadas':'Estatística sem dados válidos para a consulta'};
  }
  if (plan.operation==='ranking') {
    const meta=candidate.interpretation||{};
    const matches=candidate.kind==='numeric-ranking'
      && meta.metric===plan.property
      && normalize(meta.entity)===normalize(plan.entity)
      && Array.isArray(meta.ranking)
      && meta.ranking.length>0;
    return {ok:matches,reason:matches?'Ranking com medida, entidade e registros correspondentes ao plano':'Ranking sem medida ou entidade correspondente'};
  }
  if (plan.property==='capital' && plan.operation==='lookup') {
    const rows=Array.isArray(candidate.path)?candidate.path:[];
    const matches=rows.some(x=>normalize(x.subject.replaceAll('_',' '))===normalize(plan.entity)
      && ['tem_capital','capital'].includes(x.predicate));
    return {ok:matches,reason:matches?'Capital sustentada por relação explícita':'Relação de capital ausente ou pertence a outra entidade'};
  }
  if (plan.property==='localizado_em' && plan.operation==='lookup') {
    const rows=Array.isArray(candidate.path)?candidate.path:[];
    const matches=rows.some(x=>normalize(x.subject.replaceAll('_',' '))===normalize(plan.entity)
      && ['localizado_em','fica_em'].includes(x.predicate));
    return {ok:matches,reason:matches?'Localização apoiada em relação da entidade':'Localização não corresponde à entidade'};
  }
  return {ok:typeof candidate.answer==='string' && candidate.answer.trim().length>0,
    reason:'Resposta não factual ou resultado compatível com a intenção'};
}
