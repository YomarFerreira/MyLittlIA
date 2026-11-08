import {readableName} from './proper-names.js';
// A apresentação da resposta não altera decisões do motor de inferência.
// O resultado estruturado e sua explicação técnica permanecem no trace.
const display = (db,s) => readableName(String(s ?? ''),db);
const fmt = new Intl.NumberFormat('pt-BR', {maximumFractionDigits: 3});
const labels = {area:'área', population:'população', gdp:'PIB'};
const units = {area:'km²', population:'habitantes', gdp:'R$'};
function amount(metric, value) {
  return metric === 'gdp' ? `R$ ${fmt.format(value)}` : `${fmt.format(value)} ${units[metric] || ''}`;
}
function caveat(meta) {
  const notes=[];
  if (meta.includeAll && (meta.availableYears || []).length > 1)
    notes.push('Algumas informações podem ser de épocas diferentes. Por isso, a comparação é aproximada.');
  else if (meta.undated && meta.count > 0)
    notes.push('Não sei de quando são algumas dessas medidas.');
  else if (meta.excludedOtherPeriods > 0)
    notes.push(`Encontrei mais ${meta.excludedOtherPeriods} medida(s) de outros períodos e preferi não misturá-las nesta comparação.`);
  return notes.join(' ');
}
function numericLanguage(result,db=null) {
  const m=result.interpretation || {};
  const places=Array.isArray(m.ranking)?m.ranking:[];
  if (!places.length || !m.metric || !m.entity) return null;
  const where=display(db,m.entity);
  const place=m.entity==='brasil'?'do Brasil':`de ${where}`;
  const totalPlace=m.entity==='brasil'?'de todo o Brasil':'de todo o estado';
  const metric=labels[m.metric] ?? 'medida';
  const note=caveat(m);
  const partial=`Estou considerando apenas as ${m.count} cidades ${place} para as quais tenho informações.`;
  if(m.singular) {
    const item=places[0];
    const n=m.position ?? 1;
    const ordinal=n===1?'a primeira':`a ${n}ª`;
    const position=n===1 ? (m.sort==='ascending'?'a menor':'a maior') : `${ordinal} ${m.sort==='ascending'?'menor':'maior'}`;
    return `${display(db,item.name)} é ${position} em ${metric} entre as cidades que conheço, com ${amount(m.metric,item.value)}. ${partial} Isso não significa que seja realmente ${m.sort==='ascending'?'a menor':'a maior'} cidade ${totalPlace}.${note?' '+note:''}`;
  }
  const heading=m.includeAll?`Encontrei estas cidades ${place} e incluí todas as medidas disponíveis:`:`Aqui estão as cidades ${place} que conheço, por ${metric}:`;
  const lines=places.map((p,i)=>`${i+1}. ${display(db,p.name)} — ${amount(m.metric,p.value)}`).join('\n');
  return `${heading}\n${lines}\n${partial}${note?' '+note:''}`;
}
export function presentResponse(result,db=null) {
  if (!result || typeof result.answer !== 'string') return result;
  let answer=null;
  if(result.kind==='numeric-ranking') answer=numericLanguage(result,db);
  if (!answer) return result;
  const filter=result.interpretation?.appliedFilters;
  if(filter) {
    const description=[filter.scope==='capitals'?'somente capitais':null,filter.region?'região '+display(db,filter.region):null].filter(Boolean).join('; ');
    if(description)answer=`Recorte aplicado: ${description}.\n\n${answer}`;
  }
  // Mantém o resultado bruto e metadados para uso no inspetor técnico.
  return {...result, inferenceAnswer:result.answer, answer,
    interpretation:{...result.interpretation, languageEngine:'natural-pt-br-v1'}};
}
