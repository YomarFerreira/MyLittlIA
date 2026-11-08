/** Leitor genérico de fatos tipados com procedência.
 *  Os nomes de propriedades e suas equivalências vêm do SQLite (v22).
 *  Fatos de épocas distintas nunca são fundidos como se fossem um registro atual.
 */
import {normalize} from '../persistence/database.js';
import {buildGeographicIndex,geographicalPath} from '../reasoning/geographic-hierarchy.js';
import {geographicMention} from '../language/lexical-equivalence.js';
const norm=x=>normalize(String(x??'').replaceAll('_',' '));
const pretty=x=>String(x??'').replaceAll('_',' ').replace(/(^|\s)\S/g,c=>c.toLocaleUpperCase('pt-BR'));
const appears=(q,v)=>new RegExp(`(?:^|\\s)${norm(v).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?=\\s|$)`).test(q);
const display=(db,key)=>hasTable(db,'entity_labels')?db.prepare('SELECT display_name FROM entity_labels WHERE entity=?').get(key)?.display_name||pretty(key):pretty(key);
const hasTable=(db,t)=>Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(t));
const readRows=(db,sql,...args)=>db.prepare(sql).all(...args);
const localeYear=r=>r.season?` (${r.season})`:r.reference_year?` (${r.reference_year})`:'';
const comp=r=>r.competition?` — ${r.competition}`:'';
const shownValue=r=>{
 if(r.property==='torcida_percentual_atlasintel')return `${String(r.numeric_value).replace('.',',')}% de preferência na pesquisa AtlasIntel de ${r.reference_year}`;
 if(r.property==='torcida_percentual_datafolha')return `${String(r.numeric_value).replace('.',',')}% de preferência na pesquisa Datafolha de ${r.reference_year}`;
 if(r.property==='valuation_milhoes_brl')return `valuation estimado de R$ ${r.numeric_value.toLocaleString('pt-BR')} milhões (${r.reference_year}), não patrimônio líquido`;
 if(/_milhoes_brl$/.test(r.property))return `${r.numeric_value<0?'-':''}R$ ${Math.abs(r.numeric_value).toLocaleString('pt-BR')} milhões (balanço de ${r.reference_year})`;
 if(r.property==='quantidade_titulos')return `${r.numeric_value} título${r.numeric_value===1?'':'s'} em ${r.competition}`;
 if(r.property==='titulo_temporada')return `campeão de ${r.competition} em ${r.season}`;
 if(r.property==='participacao')return `${r.competition} (${r.season})`;
 if(r.property==='participacoes_consecutivas_serie_a')return `${r.numeric_value} temporadas seguidas na Série A, até ${r.reference_year} (não equivale ao total histórico)`;
 return `${r.value}${localeYear(r)}`;
};
const result=(answer,path,property)=>({kind:'entity-facts-qualified',answer,path,
 interpretation:{intent:'sourced-entity-attribute',parser:'typed-entity-facts-sqlite',property,neuralUsedForAnswer:false},
 explanation:'Fatos com fonte, período, competição e tipo de dado preservados no SQLite; ausências não foram preenchidas.'});

export function entityFactAnswer(db,input) {
 if(!hasTable(db,'entity_facts')||!hasTable(db,'entity_fact_aliases'))return null;
 const q=norm(input).replace(/\s+/g,' ').trim();
 if(!q||!(/\?\s*$/.test(input.trim())||/^(qual|quais|quantos|quantas|quanto|onde|em que|me diga|liste|listar|mostre|cite|fale|quando|que|o que)/.test(q)))return null;
 const aliasRows=readRows(db,'SELECT property,alias FROM entity_fact_aliases ORDER BY length(alias) DESC');
 const mentioned=aliasRows.filter(r=>appears(q,r.alias));
 if(!mentioned.length)return null;
 // Atributos mais específicos prevalecem sobre o termo genérico 'serie'.
 const preference=['patrimonio_liquido_milhoes_brl','receita_sem_transferencias_milhoes_brl','valuation_milhoes_brl','torcida_percentual_datafolha',
   'torcida_percentual_atlasintel','estadio_referencia','cidade_sede','participacoes_consecutivas_serie_a',
   'titulo_temporada','quantidade_titulos','participacao'];
 let selected=[...new Set(mentioned.map(r=>r.property))].sort((a,b)=>preference.indexOf(a)-preference.indexOf(b))[0];
 if(/\batlasintel\b/.test(q) && mentioned.some(r=>r.property==='torcida_percentual_atlasintel'))selected='torcida_percentual_atlasintel';
 if(selected==='titulo_temporada' && /\b(?:quais|quantos)\s+(?:os\s+)?titulos/.test(q))selected='quantidade_titulos';
 const titleQuery=selected==='quantidade_titulos'||selected==='titulo_temporada';
 // Uma intenção de título deve consultar conjuntamente conquistas históricas e datas conhecidas.
 const wanted=titleQuery?['quantidade_titulos','titulo_temporada']:[selected];
 const index=buildGeographicIndex(db);
 const clubCategory=/\b(?:clubes?|times?|equipes?)\b/.test(q);
 const place=clubCategory?(geographicMention(db,q)
   || geographicMention(db,q.split(/\b(?:participaram?|disputaram?|em\s+(?:19|20)\d{2}|no\s+ano|com\s+participacao)\b/)[0].trim())):null;
 const facts=readRows(db,`SELECT id,entity,property,value,numeric_value,unit,reference_year,season,competition,source_url,source_note
         FROM entity_facts WHERE property IN (${wanted.map(_=>'?').join(',')}) ORDER BY entity,reference_year DESC`,...wanted);
 if(!facts.length)return null;
 const y=(q.match(/\b(?:19|20)\d{2}\b/)||[])[0];
 let scoped=facts;
 if(y && (selected==='participacao'||selected==='titulo_temporada'))scoped=scoped.filter(r=>String(r.season||r.reference_year)===y);
 // Ex.: 'participou da Copa do Brasil?' => não responder sobre qualquer outra competição.
 if(selected==='participacao'||titleQuery) {
  const competitionNames=[...new Set(facts.map(r=>r.competition).filter(Boolean))];
  const matches=competitionNames.filter(c=>{
    const full=norm(c);
    if(q.includes(full))return true;
    // Siglas/expressões com correspondência pouco ambígua.
    if(full.includes('campeonato brasileiro serie a')&&/\bserie a\b/.test(q))return true;
    if(full.includes('campeonato brasileiro serie b')&&/\bserie b\b/.test(q))return true;
    if(full.includes('campeonato brasileiro serie c')&&/\bserie c\b/.test(q))return true;
    if(full.includes('campeonato pernambucano')&&/\bpernambucano\b/.test(q))return true;
    return false;
  });
  if(matches.length)scoped=scoped.filter(r=>matches.includes(r.competition));
  else if(selected==='participacao' && /\b(?:qual|em qual|que)\s+(?:a\s+)?serie\b/.test(q))
    scoped=scoped.filter(r=>/Campeonato Brasileiro Série [A-D]/.test(r.competition||''));
 }
 // Perguntas de grupo devem ser resolvidas geograficamente antes de procurar
 // uma entidade chamada 'São Paulo', 'Bahia' ou similar.
 if(place&&clubCategory){
  const clubs=readRows(db,"SELECT DISTINCT subject FROM knowledge_relations WHERE predicate='e_um' AND object='clube_de_futebol'")
    .map(r=>r.subject).filter(s=>Boolean(geographicalPath(index,s,place.canonical)));
  const inSet=new Set(clubs);
  const group=scoped.filter(r=>inSet.has(r.entity));
  const perEntity=new Map();
  for(const r of group){if(!perEntity.has(r.entity))perEntity.set(r.entity,[]);perEntity.get(r.entity).push(r);}
  const parts=[...perEntity].sort((a,b)=>a[0].localeCompare(b[0],'pt-BR'))
    .slice(0,16).map(([entity,items])=>`${display(db,entity)}: ${items.slice(0,5).map(shownValue).join('; ')}`);
  if(!parts.length)return null;
  const label=selected.replaceAll('_',' ');
  const answer=`Entre os ${clubs.length} clubes conhecidos de ${pretty(place.canonical)}, tenho registros de ${label} para ${perEntity.size}. `+
    parts.join('. ')+(perEntity.size>16?`. Exibindo 16 de ${perEntity.size} com dados.`:'.')+
    ' A ausência de registro não significa que o clube não possua esse atributo.';
  return result(answer,group,selected);
 }
 const entities=[...new Set(facts.map(r=>r.entity))].sort((a,b)=>norm(b).length-norm(a).length);
 // Protege 'são paulo' contra conflito de município/clube quando for pergunta por estado.
 const entity=entities.find(c=>appears(q,c)||({sao_paulo_sp:'sao paulo',santos_fc:'santos',
  fluminense_rj:'fluminense',botafogo_rj:'botafogo',bahia_ba:'bahia',vitoria_ba:'vitoria',
  fortaleza_ce:'fortaleza',ceara_ce:'ceara',atletico_mineiro:'atletico mg',
  vasco_da_gama:'vasco',atletico_goianiense:'atletico goianiense',goias_go:'goias',
  athletico_paranaense:'athletico pr',coritiba_saf:'coritiba',cuiaba_mt:'cuiaba',
  red_bull_bragantino:'bragantino'}[c] && appears(q,{sao_paulo_sp:'sao paulo',santos_fc:'santos',
  fluminense_rj:'fluminense',botafogo_rj:'botafogo',bahia_ba:'bahia',vitoria_ba:'vitoria',
  fortaleza_ce:'fortaleza',ceara_ce:'ceara',atletico_mineiro:'atletico mg',
  vasco_da_gama:'vasco',atletico_goianiense:'atletico goianiense',goias_go:'goias',
  athletico_paranaense:'athletico pr',coritiba_saf:'coritiba',cuiaba_mt:'cuiaba',
  red_bull_bragantino:'bragantino'}[c])));
 if(!entity)return null;
 const rows=scoped.filter(r=>r.entity===entity);
 if(!rows.length)return null;
 const toShow=rows.filter(r=>r.property!=='titulo_temporada'||!rows.some(t=>t.property==='quantidade_titulos'&&t.competition===r.competition));
 let values=toShow.slice(0,18).map(shownValue).join('; ');
 if(toShow.length>18)values+=` e outros ${toShow.length-18} registros`;
 if(selected==='participacao' && !y)values+=' (minha base registra apenas as temporadas explicitamente documentadas; não é o histórico completo)';
 const suffix=rows.some(r=>r.property==='torcida_percentual_atlasintel')?' É uma estimativa amostral, não o número absoluto de torcedores.':'';
 const suffixFinance=rows.some(r=>r.property==='receita_sem_transferencias_milhoes_brl')?' O indicador exclui vendas de jogadores; não equivale à receita total.':'';
 return result(`${display(db,entity)}: ${values}.${suffix}${suffixFinance}`,rows,selected);
}
