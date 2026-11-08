// Gerador reproduzível do JSON de referência. Os valores vêm de fontes identificadas.
import {writeFileSync} from 'node:fs';
const sports=[
 ['flamengo',5096],['palmeiras',4395],['corinthians',3971],['atletico_mineiro',3373],
 ['sao_paulo_sp',3244],['botafogo_rj',3047],['cruzeiro',2831],['internacional',2590],
 ['athletico_paranaense',2100],['fluminense_rj',2085],['gremio',1835],['bahia_ba',1783],
 ['red_bull_bragantino',1719],['vasco_da_gama',1523],['santos_fc',1357],['vitoria_ba',826],
 ['fortaleza_ce',789],['sport',789],['atletico_goianiense',433],['juventude',431],
 ['america_mg',413],['ceara_ce',410],['cuiaba_mt',364],['coritiba_saf',362],
 ['criciuma',302],['remo',300],['guarani',278],['goias_go',260],['santa_cruz',243],['ponte_preta',216]
];
const datafolha=[
 ['flamengo',22],['corinthians',14],['palmeiras',7],['sao_paulo_sp',6],['cruzeiro',4],
 ['vasco_da_gama',3],['gremio',3],['atletico_mineiro',2],['internacional',2],['santos_fc',2],
 ['fluminense_rj',2],['bahia_ba',1],['botafogo_rj',1],['vitoria_ba',1],
 ['athletico_paranaense',1],['sport',1],['remo',1]
];
const sportsUrl='https://www.sportsvalue.com.br/case-studies/valuation-top-30-clubes-do-brasil-2025-6a-edicao/';
const dataUrl='https://www.cnnbrasil.com.br/esportes/futebol/datafolha-flamengo-segue-com-a-maior-torcida-do-brasil/';
const facts=[
 ...sports.map(([entity,numeric_value])=>({entity,property:'valuation_milhoes_brl',value:String(numeric_value),numeric_value,unit:'BRL_millions',reference_year:2025,season:null,competition:null,source_url:sportsUrl,note:'Sports Value, Valuation TOP 30 2025, sexta edição: estimativa econômica, não patrimônio líquido contábil nem receita.'})),
 ...datafolha.map(([entity,numeric_value])=>({entity,property:'torcida_percentual_datafolha',value:String(numeric_value),numeric_value,unit:'percent',reference_year:2026,season:null,competition:null,source_url:dataUrl,note:'Datafolha, entrevistas em 22–23/07/2026: 2.004 participantes de 16+ anos, 139 municípios, margem geral ±2 pontos percentuais (95% de confiança). Preferência declarada, não número de torcedores.'}))
];
const result={lote:'020',name:'Rankings brasileiros — valuation 2025 e torcida Datafolha 2026',created:'2026-11-07',policy:'Inserção aditiva idempotente, sem alterar fatos existentes; nunca misturar séries, fontes e períodos.',sources:[{url:sportsUrl,title:'Sports Value — Valuation TOP 30, 2025',unit:'R$ milhões',year:2025},{url:dataUrl,title:'Datafolha — preferências de torcida, julho de 2026',unit:'%',year:2026}],facts,gaps:['Valuation de clubes fora do TOP 30 sem medidas comparáveis nesta fonte.','Torcidas de clubes não presentes no levantamento publicado.','Histórico completo de títulos não é preenchido por este lote.','Valor de mercado, receita e patrimônio líquido são métricas diferentes.']};
writeFileSync(new URL('../imports/mylittlia-lote-020-rankings-brasil.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(facts.length);
