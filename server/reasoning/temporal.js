import {normalize} from '../persistence/database.js';

const zone = () => process.env.MYLITTLIA_TIMEZONE || 'America/Recife';
const format = (date, options) => new Intl.DateTimeFormat('pt-BR', {timeZone:zone(),...options}).format(date);
function todayInZone(now) {
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone(),year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const get=(type)=>Number(parts.find(p=>p.type===type).value);
  return new Date(Date.UTC(get('year'),get('month')-1,get('day'),12));
}
function shifted(base, days) {const d=new Date(base);d.setUTCDate(d.getUTCDate()+days);return d;}
const full=(date)=>new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(date);
const short=(date)=>new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC',day:'2-digit',month:'2-digit',year:'numeric'}).format(date);
function temporalReply(answer, operation, previous, date, extra={}) {
 return {kind:'temporal-calculation',answer,interpretation:{intent:'temporal-query',parser:'calendar-arithmetic',operation,timeZone:zone(),contextReference:previous??null,computedDate:date?short(date):null,neuralUsedForAnswer:false,...extra},explanation:'Usei o calendário e o fuso configurado para calcular a data. Não precisei consultar uma resposta gravada nem treinar a rede neural.'};
}
const isTemporalHistory=(history)=>{
 const last=history?.at(-1);
 if(last?.role!=='assistant')return false;
 const text=normalize(last.content);
 return /(?:hoje e|amanha sera|ontem foi|depois de amanha sera|daqui a \d+ dias|faltam \d+ dias|sera (?:segunda|terca|quarta|quinta|sexta|sabado|domingo)|a data sera|o proximo|o ultimo)/.test(text);
};
export function temporalAnswer(text, history=[], now=new Date()) {
 const q=normalize(String(text)).replace(/[?!.]+$/g,'').trim();
 const base=todayInZone(now);
 let offset=null, operation=null, contextual=false;
 if (/^(?:(?:e|mas) )?(?:amanha|dia de amanha)$/.test(q)) {offset=1;operation='tomorrow';contextual=/^(?:e|mas) /.test(q);}
 else if (/^(?:(?:e|mas) )?depois de amanha$/.test(q)) {offset=2;operation='day-after-tomorrow';contextual=/^(?:e|mas) /.test(q);}
 else if (/^(?:(?:e|mas) )?(?:ontem|dia de ontem)$/.test(q)) {offset=-1;operation='yesterday';contextual=/^(?:e|mas) /.test(q);}
 else if (/^(?:(?:e|mas) )?anteontem$/.test(q)) {offset=-2;operation='day-before-yesterday';contextual=/^(?:e|mas) /.test(q);}
 else if (/^(?:que dia|qual (?:e )?a data|qual dia da semana) (?:sera |foi )?(?:amanha|ontem|depois de amanha|anteontem)$/.test(q)) {
   offset=q.endsWith('depois de amanha')?2:q.endsWith('anteontem')?-2:q.endsWith('amanha')?1:-1;operation='relative-day';
 }
 else {
  const m=q.match(/^(?:e )?(?:daqui a|em) (\d{1,5}) dias?$/);
  const back=q.match(/^(?:ha|faz) (\d{1,5}) dias?$/);
  if(m){offset=Number(m[1]);operation='days-forward';} else if(back){offset=-Number(back[1]);operation='days-back';}
 }
 if(offset!==null) {
   if(contextual && !isTemporalHistory(history)) return null;
   const date=shifted(base,offset);
   const intro=offset===1?'Amanhã será':offset===-1?'Ontem foi':offset===2?'Depois de amanhã será':offset===-2?'Anteontem foi':offset>0?`Daqui a ${offset} dia${offset===1?'':'s'} será`:`Há ${Math.abs(offset)} dias, foi`;
   return temporalReply(`${intro} ${full(date)}.`,operation,contextual?history.at(-1)?.content:null,date,{offsetDays:offset});
 }
 const dateMatch=q.match(/^(?:(?:que|qual) dia da semana (?:sera|foi|cai|e) |(?:em que dia da semana (?:cai|sera) )?)(\d{1,2}) de (janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?: de (\d{4}))?$/);
 if(dateMatch){
  const months=['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const day=Number(dateMatch[1]),month=months.indexOf(dateMatch[2]),year=dateMatch[3]?Number(dateMatch[3]):base.getUTCFullYear();
  const date=new Date(Date.UTC(year,month,day,12));
  if(date.getUTCMonth()!==month||date.getUTCDate()!==day)return temporalReply('Essa data não existe no calendário. Pode conferir o dia e o mês?','invalid-date',null,null);
  return temporalReply(`${full(date)}.`, 'weekday-of-date',null,date);
 }
 const next=q.match(/^(?:(?:qual e )?o )?proximo (domingo|segunda(?: feira)?|terca(?: feira)?|quarta(?: feira)?|quinta(?: feira)?|sexta(?: feira)?|sabado)$/);
 if(next){
  const days=['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
  const target=days.findIndex(x=>next[1].startsWith(x));let delta=(target-base.getUTCDay()+7)%7;if(delta===0)delta=7;
  const date=shifted(base,delta);return temporalReply(`O próximo ${days[target]} será ${full(date)}.`, 'next-weekday',null,date);
 }
 if(/^(?:quantos dias faltam (?:para|pro)|quanto falta (?:para|pro)) (?:o )?natal$/.test(q)){
  let year=base.getUTCFullYear();let christmas=new Date(Date.UTC(year,11,25,12));if(christmas<base)christmas=new Date(Date.UTC(++year,11,25,12));
  const days=Math.round((christmas-base)/86400000);
  return temporalReply(days===0?'Hoje é Natal!':`Faltam ${days} dias para o Natal.`, 'days-until-christmas',null,christmas,{daysRemaining:days});
 }
 return null;
}
