/**
 * Lote 009 — Importação direta IBGE -> SQLite MylittlIA
 * node imports/import-mylittlia-lote-009-municipios.mjs --dry-run
 * node imports/import-mylittlia-lote-009-municipios.mjs --apply
 * Requer Node 22+, internet, banco existente; nunca sobrescreve pesos.
 * População 2026, PIB 2023, área Censo 2022; não inclui organizações não verificadas.
 */
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { createRelation } from '../server/knowledge/relations.js';
import { normalize } from '../server/persistence/database.js';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
const apply=args.includes('--apply'),dry=args.includes('--dry-run');
if(Number(apply)+Number(dry)!==1){console.error('Use --dry-run ou --apply');process.exit(2)}
const ix=args.indexOf('--db');
if(ix>=0&&!args[ix+1])throw Error('Falta o caminho depois de --db');
const DB=resolve(ix<0?resolve(ROOT,'data/mylittlia.db'):args[ix+1]);
if(!existsSync(DB))throw Error(`Banco não encontrado: ${DB}`);
const SOURCES={
 populacao:{table:6579,variable:9324,years:[2026,2025],unit:'habitantes'},
 pib:{table:5938,variable:37,years:[2023],unit:'mil reais'},
 area:{table:4714,variable:6318,years:[2022],unit:'km²'}
};
const UFS={'11':'RO','12':'AC','13':'AM','14':'RR','15':'PA','16':'AP','17':'TO','21':'MA','22':'PI','23':'CE','24':'RN','25':'PB','26':'PE','27':'AL','28':'SE','29':'BA','31':'MG','32':'ES','33':'RJ','35':'SP','41':'PR','42':'SC','43':'RS','50':'MS','51':'MT','52':'GO','53':'DF'};
const notes=[];
async function getJSON(url){let last;for(let i=0;i<3;i++){try{const resp=await fetch(url,{headers:{'Accept':'application/json'},signal:AbortSignal.timeout(90000)});if(!resp.ok)throw Error(`HTTP ${resp.status}`);return await resp.json()}catch(e){last=e;console.error('Tentativa',i+1,'falhou:',e.message)}}throw last}
function parseNum(x){if(x==null)return null;let s=String(x).trim();if(!s || ['...','..','-','X'].includes(s))return null;s=s.replace(',','.');const n=Number(s);return Number.isFinite(n)?n:null}
async function collect(name,s){for(const year of s.years){const url=`https://apisidra.ibge.gov.br/values/t/${s.table}/n6/all/v/${s.variable}/p/${year}?formato=json`;
 console.log(`Consultando ${name} (${year})...`);try{let rows=await getJSON(url);if(!Array.isArray(rows)||rows.length<1000)throw Error(`Resposta pequena: ${rows?.length}`);let res=new Map();for(const r of rows.slice(1)){const code=String(r.D1C||'');const v=parseNum(r.V);if(/^\d{7}$/.test(code)&&v!=null)res.set(code,{name:r.D1N,value:v})}if(res.size<1000)throw Error(`Somente ${res.size} municípios válidos`);notes.push({metric:name,year,source_url:url,municipalities:res.size,unit:s.unit});return res}catch(e){console.error(`Falha ${name}/${year}:`,e.message);}}
 throw new Error(`Não foi possível recuperar ${name} do IBGE. Revise acesso à internet ou disponibilidade da API.`)}

const [pop,pib,area]=await Promise.all(Object.entries(SOURCES).map(([k,v])=>collect(k,v)));
const ufnames={RO:'rondonia',AC:'acre',AM:'amazonas',RR:'roraima',PA:'para',AP:'amapa',TO:'tocantins',MA:'maranhao',PI:'piaui',CE:'ceara',RN:'rio grande do norte',PB:'paraiba',PE:'pernambuco',AL:'alagoas',SE:'sergipe',BA:'bahia',MG:'minas gerais',ES:'espirito santo',RJ:'rio de janeiro',SP:'sao paulo',PR:'parana',SC:'santa catarina',RS:'rio grande do sul',MS:'mato grosso do sul',MT:'mato grosso',GO:'goias',DF:'distrito federal'};
const allCodes=new Set([...pop.keys(),...pib.keys(),...area.keys()]);
const municipalities=[...allCodes].map(code=>({code,uf:UFS[code.slice(0,2)],name:pop.get(code)?.name||area.get(code)?.name||pib.get(code)?.name||'',population:pop.get(code)?.value??null,area:area.get(code)?.value??null,gdp:pib.get(code)?.value??null})).filter(x=>x.uf&&x.name).map(x=>({...x,name:x.name.replace(new RegExp(`\\s*\\(${x.uf}\\)$`),'').trim()}));
const selected=new Set();const rankingTotals={};
for(const uf of Object.keys(ufnames))for(const [key,label] of [['population','população'],['area','extensão'],['gdp','PIB']]){
  const rows=municipalities.filter(x=>x.uf===uf&&Number.isFinite(x[key]));
  rows.sort((a,b)=>b[key]-a[key]||a.code.localeCompare(b.code));
  for(const x of rows.slice(0,10))selected.add(x.code);
  rankingTotals[`${uf}:${label}`]=Math.min(10,rows.length);
}
const year=Object.fromEntries(notes.map(x=>[x.metric,x.year]));
const relations=[];
const add=(subject,predicate,object)=>relations.push({subject,predicate,object});
for(const m of municipalities){if(!selected.has(m.code))continue;
 add(m.name,'localizado_em',ufnames[m.uf]);
 if(Number.isFinite(m.population))add(m.name,'possui',`populacao: ${Math.trunc(m.population)} habitantes em ${year.populacao}`);
 if(Number.isFinite(m.area))add(m.name,'possui',`area territorial: ${m.area} km2 em ${year.area}`);
 if(Number.isFinite(m.gdp))add(m.name,'possui',`pib: ${Math.round(m.gdp*1000)} reais em ${year.pib}`);
}
const db=new DatabaseSync(DB,{readOnly:!apply});
try{
 db.exec('PRAGMA busy_timeout=5000');
 if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='knowledge_relations'").get())throw Error('Tabela knowledge_relations não encontrada');
 const find=db.prepare('SELECT 1 FROM knowledge_relations WHERE subject=? AND predicate=? AND object=? LIMIT 1');
 const canon=x=>normalize(x).replaceAll(' ','_');
 const seen=new Set(),pending=[];let existing=0;
 for(const r of relations){const s=canon(r.subject),o=canon(r.object),key=JSON.stringify([s,r.predicate,o]);
  if(seen.has(key))continue;seen.add(key);if(find.get(s,r.predicate,o)){existing++;continue;}pending.push(r);
 }
 console.log(`Municípios selecionados: ${selected.size}; relações distintas: ${seen.size}; existentes: ${existing}; novas: ${pending.length}`);
 console.log(`Referências: ${notes.map(n=>`${n.metric} ${n.year}`).join(' | ')}`);
 if(dry) console.log('SIMULAÇÃO: não alterou o banco.');
 else{ db.exec('BEGIN IMMEDIATE');try{let inserted=0;for(const r of pending){if(createRelation(db,{...r,source_type:'imported',confidence:null}).inserted)inserted++;}db.exec('COMMIT');console.log(`Importadas ${inserted} relações. Pesos preservados.`);}catch(e){db.exec('ROLLBACK');throw e;} }
}finally{db.close()}
