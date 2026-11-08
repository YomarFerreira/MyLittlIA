// v0.25: avaliação de evidência, NÃO probabilidade de verdade.
// Pesos manuais em knowledge_relations.confidence jamais são modificados.
const norm = s => String(s ?? '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const reviewTerms = /violenc|bonit|melhor|pior|badalad|rico|principal|famos|preferid|perigos|qualidade|relevan/;
const negative = /^(?:nao_|não_)|^(?:nao |não )/;
const strongSources = /^(?:ibge|gov\.|official|oficial|verified|verificado)/i;
export function assessRelations(db, {limit=2000, dryRun=false}={}) {
  if(!Number.isInteger(limit)||limit<1||limit>20000) throw Object.assign(new Error('Limite inválido (1–20000).'),{status:400});
  const rows=db.prepare(`SELECT id,subject,predicate,object,confidence,source_type,evidence_count FROM knowledge_relations ORDER BY subject,predicate,object LIMIT ?`).all(limit);
  const candidates=db.prepare('SELECT id,subject,predicate,object FROM knowledge_relations').all();
  const byRelation=new Map();
  for(const r of candidates) {const k=`${norm(r.subject)}|${norm(r.predicate)}`; if(!byRelation.has(k))byRelation.set(k,[]);byRelation.get(k).push(r);}
  const scored=rows.map(r=>{
    const predicate=norm(r.predicate), origin=String(r.source_type||'legacy'), count=Number(r.evidence_count)||0;
    const same=byRelation.get(`${norm(r.subject)}|${predicate}`)||[];
    const different=same.filter(x=>norm(x.object)!==norm(r.object));
    // List/multi-valued predicates are not inherently contradictory.
    const singleValue=/^(?:tem_capital|capital|area_km2|populacao|pib|numero_patas_tipico)$/.test(predicate);
    const conflict=singleValue&&different.length>0;
    const subjective=reviewTerms.test(predicate+' '+norm(r.object));
    const established=strongSources.test(origin) && count>=1;
    let status='review',score=null,rationale='Origem ou evidência insuficiente para avaliação automática.';
    if(conflict){status='conflict';rationale='Existem valores diferentes para uma propriedade que normalmente tem um único valor. Pode haver períodos distintos: revisar.';}
    else if(subjective){rationale='Avaliação subjetiva ou dependente de critérios e período.';}
    else if(negative.test(predicate)){rationale='Negação requer verificação específica da evidência.';}
    else if(established){status='evidence';score=Math.min(.9,.65+Math.min(5,count)*.05);rationale='Origem identificada como oficial e evidência declarada; fonte não verificada externamente.';}
    else if(count>=2){score=Math.min(.65,.35+.05*Math.min(count,6));rationale='Mais de uma evidência declarada, mas sem verificação independente da origem.';}
    return {relation_id:r.id,subject:r.subject,predicate:r.predicate,object:r.object,manual_weight:r.confidence,source_type:origin,score,status,rationale,evidence_count:count};
  });
  if(!dryRun){db.exec('BEGIN IMMEDIATE');try{
    const up=db.prepare(`INSERT INTO relation_assessments(relation_id,score,status,rationale,evidence_count,assessed_at)
      VALUES(?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(relation_id) DO UPDATE SET score=excluded.score,status=excluded.status,rationale=excluded.rationale,evidence_count=excluded.evidence_count,assessed_at=CURRENT_TIMESTAMP`);
    for(const r of scored)up.run(r.relation_id,r.score,r.status,r.rationale,r.evidence_count);
    db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}}
  return {total:scored.length,evidence:scored.filter(x=>x.status==='evidence').length,review:scored.filter(x=>x.status==='review').length,conflict:scored.filter(x=>x.status==='conflict').length,dryRun,items:scored};
}
export function listAssessments(db,{status='all',limit=200,offset=0}={}){
  if(!['all','evidence','review','conflict'].includes(status))throw Object.assign(new Error('Filtro inválido.'),{status:400});
  if(!Number.isInteger(limit)||limit<1||limit>500||!Number.isInteger(offset)||offset<0)throw Object.assign(new Error('Paginação inválida.'),{status:400});
  const where=status==='all'?'':' WHERE a.status=?';const params=status==='all'?[]:[status];
  const rows=db.prepare(`SELECT a.*,r.subject,r.predicate,r.object,r.confidence AS manual_weight,r.source_type FROM relation_assessments a JOIN knowledge_relations r ON r.id=a.relation_id${where} ORDER BY a.status,r.subject,r.predicate LIMIT ? OFFSET ?`).all(...params,limit,offset);
  const total=db.prepare(`SELECT COUNT(*) AS n FROM relation_assessments a${where}`).get(...params).n;
  return {items:rows,total};
}
