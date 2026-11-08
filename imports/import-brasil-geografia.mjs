/**
 * MylittlIA — Importador de geografia/economia do Brasil (2026-11)
 * Compatível com o projeto v0.18.1; Node >=22.13; não altera migrations ou pesos.
 * Uso: node imports/import-brasil-geografia.mjs --dry-run
 *      node imports/import-brasil-geografia.mjs --apply
 * O conjunto é CURADO: listas de exemplos NÃO são rankings nem listas completas.
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from '../server/persistence/database.js';
import { createRelation } from '../server/knowledge/relations.js';

const states = [
  {
    "uf": "AC",
    "name": "Acre",
    "capital": "Rio Branco",
    "region": "Norte",
    "pop2025": "884372",
    "flag": "verde, amarelo e vermelho",
    "economy": "extrativismo florestal, pecuária e comércio",
    "industry": "madeira, alimentos e beneficiamento de produtos florestais",
    "popCities": "Rio Branco, Cruzeiro do Sul, Sena Madureira",
    "metroExamples": "Rio Branco, Bujari, Senador Guiomard",
    "beaches": "—",
    "companies": "—"
  },
  {
    "uf": "AL",
    "name": "Alagoas",
    "capital": "Maceió",
    "region": "Nordeste",
    "pop2025": "3220848",
    "flag": "vermelho, branco, azul e amarelo",
    "economy": "cana-de-açúcar, turismo, serviços e pecuária",
    "industry": "açúcar, etanol, alimentos e química",
    "popCities": "Maceió, Arapiraca, Rio Largo",
    "metroExamples": "Maceió, Marechal Deodoro, Rio Largo, Satuba",
    "beaches": "Pajuçara, Ponta Verde, Praia do Francês, Maragogi",
    "companies": "Braskem, Usina Coruripe"
  },
  {
    "uf": "AP",
    "name": "Amapá",
    "capital": "Macapá",
    "region": "Norte",
    "pop2025": "806517",
    "flag": "verde, amarelo, azul, branco e preto",
    "economy": "serviços, mineração, comércio e extrativismo",
    "industry": "mineração, alimentos e madeira",
    "popCities": "Macapá, Santana, Laranjal do Jari",
    "metroExamples": "Macapá, Santana, Mazagão",
    "beaches": "—",
    "companies": "—"
  },
  {
    "uf": "AM",
    "name": "Amazonas",
    "capital": "Manaus",
    "region": "Norte",
    "pop2025": "4321616",
    "flag": "azul, branco e vermelho",
    "economy": "polo industrial de Manaus, comércio e serviços",
    "industry": "eletroeletrônicos, motocicletas e bebidas",
    "popCities": "Manaus, Itacoatiara, Manacapuru",
    "metroExamples": "Manaus, Iranduba, Manacapuru, Careiro da Várzea",
    "beaches": "—",
    "companies": "Honda, Yamaha, Samsung"
  },
  {
    "uf": "BA",
    "name": "Bahia",
    "capital": "Salvador",
    "region": "Nordeste",
    "pop2025": "14870907",
    "flag": "azul, branco, vermelho e amarelo",
    "economy": "agricultura, mineração, indústria e turismo",
    "industry": "petroquímica, automotiva, alimentos e celulose",
    "popCities": "Salvador, Feira de Santana, Vitória da Conquista",
    "metroExamples": "Salvador, Lauro de Freitas, Camaçari, Simões Filho",
    "beaches": "Porto da Barra, Praia do Forte, Morro de São Paulo, Itacaré",
    "companies": "Braskem, Suzano"
  },
  {
    "uf": "CE",
    "name": "Ceará",
    "capital": "Fortaleza",
    "region": "Nordeste",
    "pop2025": "9268836",
    "flag": "verde, amarelo, azul e branco",
    "economy": "serviços, turismo, indústria e agricultura",
    "industry": "calçados, têxtil, siderurgia e alimentos",
    "popCities": "Fortaleza, Caucaia, Juazeiro do Norte",
    "metroExamples": "Fortaleza, Caucaia, Maracanaú, Eusébio",
    "beaches": "Jericoacoara, Canoa Quebrada, Praia do Futuro",
    "companies": "Grendene, M. Dias Branco, ArcelorMittal"
  },
  {
    "uf": "DF",
    "name": "Distrito Federal",
    "capital": "Brasília",
    "region": "Centro-Oeste",
    "pop2025": "2996899",
    "flag": "branco e verde",
    "economy": "administração pública, serviços e tecnologia",
    "industry": "tecnologia, alimentos e construção",
    "popCities": "Brasília",
    "metroExamples": "Brasília",
    "beaches": "—",
    "companies": "Banco do Brasil, Caixa Econômica Federal"
  },
  {
    "uf": "ES",
    "name": "Espírito Santo",
    "capital": "Vitória",
    "region": "Sudeste",
    "pop2025": "4126854",
    "flag": "azul, branco e rosa",
    "economy": "comércio exterior, petróleo e gás, serviços",
    "industry": "siderurgia, celulose, rochas ornamentais e alimentos",
    "popCities": "Serra, Vila Velha, Cariacica, Vitória",
    "metroExamples": "Vitória, Vila Velha, Serra, Cariacica",
    "beaches": "Guarapari, Praia da Costa, Itaúnas",
    "companies": "Vale, ArcelorMittal, Suzano"
  },
  {
    "uf": "GO",
    "name": "Goiás",
    "capital": "Goiânia",
    "region": "Centro-Oeste",
    "pop2025": "7423629",
    "flag": "verde, amarelo, azul e branco",
    "economy": "agronegócio, comércio, serviços e mineração",
    "industry": "alimentos, farmacêutica, automotiva e fertilizantes",
    "popCities": "Goiânia, Aparecida de Goiânia, Anápolis",
    "metroExamples": "Goiânia, Aparecida de Goiânia, Senador Canedo, Trindade",
    "beaches": "—",
    "companies": "Hyundai, Piracanjuba"
  },
  {
    "uf": "MA",
    "name": "Maranhão",
    "capital": "São Luís",
    "region": "Nordeste",
    "pop2025": "7018211",
    "flag": "vermelho, branco, preto, azul e amarelo",
    "economy": "agropecuária, logística portuária e serviços",
    "industry": "alumínio, alimentos e celulose",
    "popCities": "São Luís, Imperatriz, São José de Ribamar",
    "metroExamples": "São Luís, São José de Ribamar, Paço do Lumiar, Raposa",
    "beaches": "Lençóis Maranhenses, Caburé, Calhau",
    "companies": "Alumar, Vale"
  },
  {
    "uf": "MT",
    "name": "Mato Grosso",
    "capital": "Cuiabá",
    "region": "Centro-Oeste",
    "pop2025": "3893659",
    "flag": "azul, branco, verde e amarelo",
    "economy": "soja, milho, algodão e pecuária",
    "industry": "frigoríficos, biodiesel e alimentos",
    "popCities": "Cuiabá, Várzea Grande, Rondonópolis",
    "metroExamples": "Cuiabá, Várzea Grande, Santo Antônio de Leverger",
    "beaches": "—",
    "companies": "Amaggi, JBS"
  },
  {
    "uf": "MS",
    "name": "Mato Grosso do Sul",
    "capital": "Campo Grande",
    "region": "Centro-Oeste",
    "pop2025": "2924631",
    "flag": "verde, azul, branco e amarelo",
    "economy": "pecuária, agricultura e celulose",
    "industry": "celulose, frigoríficos, etanol e alimentos",
    "popCities": "Campo Grande, Dourados, Três Lagoas",
    "metroExamples": "Campo Grande, Terenos, Sidrolândia",
    "beaches": "—",
    "companies": "Suzano, Eldorado Brasil"
  },
  {
    "uf": "MG",
    "name": "Minas Gerais",
    "capital": "Belo Horizonte",
    "region": "Sudeste",
    "pop2025": "21393441",
    "flag": "branco e vermelho",
    "economy": "mineração, indústria, agricultura e serviços",
    "industry": "siderurgia, automotiva, mineração e alimentos",
    "popCities": "Belo Horizonte, Uberlândia, Contagem",
    "metroExamples": "Belo Horizonte, Contagem, Betim, Nova Lima",
    "beaches": "—",
    "companies": "Vale, Cemig, Localiza"
  },
  {
    "uf": "PA",
    "name": "Pará",
    "capital": "Belém",
    "region": "Norte",
    "pop2025": "8711196",
    "flag": "vermelho, branco e azul",
    "economy": "mineração, pecuária, açaí e serviços",
    "industry": "mineração, metalurgia e alimentos",
    "popCities": "Belém, Ananindeua, Santarém",
    "metroExamples": "Belém, Ananindeua, Marituba, Benevides",
    "beaches": "Salinas, Algodoal, Alter do Chão (praia fluvial)",
    "companies": "Vale, Hydro"
  },
  {
    "uf": "PB",
    "name": "Paraíba",
    "capital": "João Pessoa",
    "region": "Nordeste",
    "pop2025": "4164468",
    "flag": "preto, vermelho e branco",
    "economy": "serviços, comércio, agricultura e turismo",
    "industry": "têxtil, calçados, alimentos e tecnologia",
    "popCities": "João Pessoa, Campina Grande, Santa Rita",
    "metroExamples": "João Pessoa, Cabedelo, Bayeux, Santa Rita",
    "beaches": "Tambaú, Coqueirinho, Tambaba",
    "companies": "Alpargatas"
  },
  {
    "uf": "PR",
    "name": "Paraná",
    "capital": "Curitiba",
    "region": "Sul",
    "pop2025": "11890517",
    "flag": "verde, branco, azul e amarelo",
    "economy": "agroindústria, comércio e serviços",
    "industry": "automotiva, alimentos, papel e celulose",
    "popCities": "Curitiba, Londrina, Maringá",
    "metroExamples": "Curitiba, São José dos Pinhais, Colombo, Pinhais",
    "beaches": "Ilha do Mel, Matinhos, Caiobá",
    "companies": "Renault, Volvo, Klabin"
  },
  {
    "uf": "PE",
    "name": "Pernambuco",
    "capital": "Recife",
    "region": "Nordeste",
    "pop2025": "9562007",
    "flag": "azul, branco, vermelho e amarelo",
    "economy": "serviços, turismo, comércio e agricultura",
    "industry": "automotiva, alimentos, petroquímica e tecnologia",
    "popCities": "Recife, Jaboatão dos Guararapes, Olinda, Caruaru",
    "metroExamples": "Recife, Olinda, Jaboatão dos Guararapes, Paulista, Camaragibe",
    "beaches": "Boa Viagem, Porto de Galinhas, Carneiros, Fernando de Noronha",
    "companies": "Stellantis, Baterias Moura, Hemobrás"
  },
  {
    "uf": "PI",
    "name": "Piauí",
    "capital": "Teresina",
    "region": "Nordeste",
    "pop2025": "3384547",
    "flag": "verde, amarelo, azul e branco",
    "economy": "agricultura, comércio e serviços",
    "industry": "alimentos, têxtil e energia renovável",
    "popCities": "Teresina, Parnaíba, Picos",
    "metroExamples": "Teresina, Timon",
    "beaches": "Barra Grande, Pedra do Sal, Atalaia",
    "companies": "—"
  },
  {
    "uf": "RJ",
    "name": "Rio de Janeiro",
    "capital": "Rio de Janeiro",
    "region": "Sudeste",
    "pop2025": "17223547",
    "flag": "azul e branco",
    "economy": "petróleo e gás, serviços e turismo",
    "industry": "petróleo, siderurgia, farmacêutica e audiovisual",
    "popCities": "Rio de Janeiro, São Gonçalo, Duque de Caxias",
    "metroExamples": "Rio de Janeiro, Niterói, São Gonçalo, Duque de Caxias",
    "beaches": "Copacabana, Ipanema, Búzios, Arraial do Cabo",
    "companies": "Petrobras, Globo, Vale"
  },
  {
    "uf": "RN",
    "name": "Rio Grande do Norte",
    "capital": "Natal",
    "region": "Nordeste",
    "pop2025": "3455236",
    "flag": "verde, branco e amarelo",
    "economy": "turismo, petróleo, sal e fruticultura",
    "industry": "sal, alimentos, energia eólica e petróleo",
    "popCities": "Natal, Mossoró, Parnamirim",
    "metroExamples": "Natal, Parnamirim, São Gonçalo do Amarante, Macaíba",
    "beaches": "Ponta Negra, Pipa, Genipabu, São Miguel do Gostoso",
    "companies": "Guararapes, Salinor"
  },
  {
    "uf": "RS",
    "name": "Rio Grande do Sul",
    "capital": "Porto Alegre",
    "region": "Sul",
    "pop2025": "11233263",
    "flag": "verde, vermelho e amarelo",
    "economy": "agropecuária, serviços e indústria",
    "industry": "calçados, metalmecânica, alimentos e automotiva",
    "popCities": "Porto Alegre, Caxias do Sul, Canoas",
    "metroExamples": "Porto Alegre, Canoas, Gravataí, São Leopoldo",
    "beaches": "Torres, Capão da Canoa, Tramandaí",
    "companies": "Gerdau, Marcopolo, Randoncorp"
  },
  {
    "uf": "RO",
    "name": "Rondônia",
    "capital": "Porto Velho",
    "region": "Norte",
    "pop2025": "1751950",
    "flag": "azul, verde, amarelo e branco",
    "economy": "pecuária, agricultura e comércio",
    "industry": "frigoríficos, laticínios e madeira",
    "popCities": "Porto Velho, Ji-Paraná, Ariquemes",
    "metroExamples": "Porto Velho, Candeias do Jamari",
    "beaches": "—",
    "companies": "—"
  },
  {
    "uf": "RR",
    "name": "Roraima",
    "capital": "Boa Vista",
    "region": "Norte",
    "pop2025": "738772",
    "flag": "verde, branco, amarelo, azul e vermelho",
    "economy": "comércio, serviços e agropecuária",
    "industry": "alimentos, madeira e construção",
    "popCities": "Boa Vista, Rorainópolis, Caracaraí",
    "metroExamples": "Boa Vista, Cantá",
    "beaches": "—",
    "companies": "—"
  },
  {
    "uf": "SC",
    "name": "Santa Catarina",
    "capital": "Florianópolis",
    "region": "Sul",
    "pop2025": "8187029",
    "flag": "verde, branco e vermelho",
    "economy": "indústria, comércio, tecnologia e turismo",
    "industry": "têxtil, metalmecânica, cerâmica e alimentos",
    "popCities": "Joinville, Florianópolis, Blumenau",
    "metroExamples": "Florianópolis, São José, Palhoça, Biguaçu",
    "beaches": "Jurerê, Bombinhas, Balneário Camboriú, Guarda do Embaú",
    "companies": "WEG, Havan, BRF"
  },
  {
    "uf": "SP",
    "name": "São Paulo",
    "capital": "São Paulo",
    "region": "Sudeste",
    "pop2025": "46081801",
    "flag": "preto, branco, vermelho, azul e amarelo",
    "economy": "serviços, indústria, comércio e finanças",
    "industry": "automotiva, química, tecnologia e farmacêutica",
    "popCities": "São Paulo, Guarulhos, Campinas",
    "metroExamples": "São Paulo, Guarulhos, Osasco, Santo André, São Bernardo do Campo",
    "beaches": "Santos, Guarujá, Maresias, Ubatuba",
    "companies": "Itaú Unibanco, Embraer, Natura"
  },
  {
    "uf": "SE",
    "name": "Sergipe",
    "capital": "Aracaju",
    "region": "Nordeste",
    "pop2025": "2299425",
    "flag": "verde, amarelo, azul e branco",
    "economy": "petróleo e gás, serviços e agricultura",
    "industry": "fertilizantes, alimentos e cimento",
    "popCities": "Aracaju, Nossa Senhora do Socorro, Lagarto",
    "metroExamples": "Aracaju, Nossa Senhora do Socorro, São Cristóvão, Barra dos Coqueiros",
    "beaches": "Atalaia, Aruana, Praia do Saco",
    "companies": "—"
  },
  {
    "uf": "TO",
    "name": "Tocantins",
    "capital": "Palmas",
    "region": "Norte",
    "pop2025": "1586859",
    "flag": "branco, azul e amarelo",
    "economy": "agropecuária, comércio e serviços",
    "industry": "alimentos, frigoríficos e biocombustíveis",
    "popCities": "Palmas, Araguaína, Gurupi",
    "metroExamples": "Palmas, Porto Nacional",
    "beaches": "—",
    "companies": "—"
  }
];
const URLS = {
 area: 'https://www.ibge.gov.br/geociencias/organizacao-do-territorio/estrutura-territorial/2225-np-areas-dos-municipios/15761-areas-dos-municipios.html',
 population: 'https://agenciadenoticias.ibge.gov.br/media/com_mediaibge/arquivos/8383bdedce5a6d972e60dd32671e533a.pdf',
 territories: 'https://educa.ibge.gov.br/jovens/materias-especiais/22754-um-pais-com-quase-seis-mil-municipios.html',
 borders: 'https://www.gov.br/mj/pt-br/assuntos/sua-protecao/politicas-sobre-drogas/subcapas-senad/protecao-integrada-de-fronteiras_web-final.pdf',
 flags: 'https://www.gov.br/car/pt-br/canais_atendimento/contatos-dos-orgaos-competentes/bandeiras',
 ibge: 'https://www.ibge.gov.br/cidades-e-estados.html',
 tourism: 'https://www.gov.br/turismo/pt-br',
 economics: 'https://www.ibge.gov.br/estatisticas/economicas/contas-nacionais.html'
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.includes('--help')) {
 console.log('Uso: node imports/import-brasil-geografia.mjs --dry-run | --apply [--db caminho]');
 process.exit(0);
}
if (args.includes('--apply') === args.includes('--dry-run')) {
 console.error('Escolha exatamente uma opção: --dry-run ou --apply.'); process.exit(2);
}
const dbFlag = args.indexOf('--db');
if (dbFlag !== -1 && !args[dbFlag+1]) throw new Error('Faltou caminho após --db');
const dbPath = resolve(dbFlag === -1 ? resolve(root, 'data/mylittlia.db') : args[dbFlag+1]);
const sourceType = 'imported';
const proposals = [];
function add(subject, predicate, object, category, source, year = null, note = '') {
 subject = String(subject).trim(); object = String(object).trim();
 if (!subject || !object || object.length > 96 || subject.length > 96) throw new Error(`Relação inválida: ${subject}/${object}`);
 proposals.push({subject,predicate,object,category,source,year,note});
}
function csv(s) { return s === '—' ? [] : s.split(',').map(x => x.trim()).filter(Boolean); }
function addAll(s,p,items,category,src,year,note) {
 for (const obj of items) add(s,p,obj,category,src,year,note);
}
// Base nacional com ano claro e referências oficiais.
add('Brasil','tem','8509360,850 km2 de area territorial','area_nacional',URLS.area,2025);
add('Brasil','tem','26 estados','divisao_administrativa',URLS.territories,2025);
add('Brasil','tem','1 distrito federal','divisao_administrativa',URLS.territories,2025);
add('Brasil','tem_capital','Brasília','capital',URLS.ibge);
addAll('bandeira do Brasil','possui',['verde','amarelo','azul','branco'],'cores_bandeira','https://www.gov.br/mre/pt-br/embaixada-bogota/a-embaixada/o-brasil/o-brasil/bandeira-do-brasil');
const neighbors = ['Argentina','Bolívia','Colômbia','Guiana','Paraguai','Peru','Suriname','Uruguai','Venezuela'];
addAll('Brasil','tem',neighbors.map(x => `fronteira terrestre com ${x}`),'fronteira',URLS.borders);
add('Brasil','tem','fronteira com a Guiana Francesa (território da França)','fronteira',URLS.borders);
add('Brasil','tem','litoral no Oceano Atlântico','geografia',URLS.ibge);
const capitalCoast = new Set(['MA','CE','RN','PB','PE','AL','SE','BA','ES','RJ','SC']);
// Alguns municípios da região metropolitana são APENAS EXEMPLOS, não cobertura integral.
for (const s of states) {
 const n=s.name;
 add(n,'localizado_em',s.region,'regiao',URLS.ibge);
 add(n,'tem_capital',s.capital,'capital',URLS.ibge);
 add(n,'tem',`populacao estimada de ${Number(s.pop2025).toLocaleString('pt-BR')} habitantes em 2025`,'populacao_uf',URLS.population,2025);
 addAll(`bandeira de ${n}`,'possui',csv(s.flag.replaceAll(' e ', ', ')),'cores_bandeira',URLS.flags,2026,'Cores gerais, sem detalhar brasão ou gradações.');
 addAll(n,'tem',csv(s.economy).map(x=>`atividade economica relevante: ${x}`),'economia_setorial',URLS.economics,null,'Descrições setoriais indicativas, não classificação por PIB.');
 addAll(n,'tem',csv(s.industry).map(x=>`setor industrial relevante: ${x}`),'industria_setorial',URLS.economics,null,'Setores exemplificativos, sem ranking de produção.');
 addAll(n,'tem',csv(s.popCities).map(x=>`municipio populoso de referencia: ${x}`),'municipios_referencia',URLS.population,2025,'Não constitui ranking validado por população municipal.');
 if (s.uf !== 'DF') addAll(`regiao metropolitana de ${s.capital}`,'tem',csv(s.metroExamples).map(x=>`municipio de referencia: ${x}`),'metro_exemplos',URLS.ibge,null,'EXEMPLOS somente; composição legal completa pode mudar. Verificar em legislação estadual.');
 if (capitalCoast.has(s.uf)) add(s.capital,'tem','capital situada no litoral','capital_litoranea',URLS.ibge);
 addAll(n,'tem',csv(s.beaches).map(x=>`praia ou destino costeiro conhecido: ${x}`),'praias_referencia',URLS.tourism,null,'Seleção ilustrativa, não ranking de beleza.');
 addAll(n,'tem',csv(s.companies).map(x=>`empresa com operacoes relevantes: ${x}`),'empresas_referencia',URLS.economics,null,'Exemplos, não ranking, nem necessariamente sede da companhia.');
}
// Os maiores estados por extensão, sem valores aproximados não auditados.
add('Amazonas','tem','primeiro lugar em area territorial entre estados','ranking_area_uf',URLS.area,2025);
add('Pará','tem','segundo lugar em area territorial entre estados','ranking_area_uf',URLS.area,2025);
add('Mato Grosso','tem','terceiro lugar em area territorial entre estados','ranking_area_uf',URLS.area,2025);
for (const [i,s] of [...states].sort((a,b)=>Number(b.pop2025)-Number(a.pop2025)).entries()) {
 add(s.name,'tem',`posicao ${i+1} em populacao entre as 27 UFs em 2025`,'ranking_populacao_uf',URLS.population,2025);
}

// Não declarar maior município por área, maior PIB municipal ou composição integral de RMs
// sem dados específicos com ano/metodologia e cobertura das 27 UFs.
const omitted = [
 'Ranking de municípios por área (km²) em cada UF: requer tabela municipal IBGE 2025 completa',
 'Municípios de maior PIB por UF: requer PIB dos Municípios por ano, não ranking informal de riqueza',
 'Ranking populacional municipal completo por UF: requer tabela de municípios da estimativa 2026',
 'Lista completa e atual das regiões metropolitanas: legislação estadual e composição oficial',
 'Praias mais bonitas/badaladas: classificação subjetiva; incluídos apenas exemplos conhecidos',
 'Principais empresas: sem ranking setorial oficial; incluídos exemplos não exaustivos'
];

const db = openDatabase(dbPath, {seed:false});
try {
 db.exec(`CREATE TABLE IF NOT EXISTS imported_knowledge_provenance (
   relation_id TEXT PRIMARY KEY REFERENCES knowledge_relations(id) ON DELETE CASCADE,
   topic TEXT NOT NULL,
   source_url TEXT NOT NULL,
   reference_year INTEGER,
   note TEXT NOT NULL DEFAULT '',
   imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 )`);
 const find = db.prepare('SELECT id FROM knowledge_relations WHERE subject=? AND predicate=? AND object=? LIMIT 1');
 const provenance = db.prepare(`INSERT OR IGNORE INTO imported_knowledge_provenance
    (relation_id,topic,source_url,reference_year,note) VALUES (?,?,?,?,?)`);
 const norm = x => String(x).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim().replaceAll(' ','_');
 db.exec('BEGIN');
 let created=0,previous=0;
 for (const x of proposals) {
  const result = createRelation(db,{...x,confidence:null,source_type:sourceType});
  if (result.inserted) created++; else previous++;
  const row = find.get(norm(x.subject),x.predicate,norm(x.object));
  if (row) provenance.run(row.id,x.category,x.source,x.year,x.note);
 }
 if (args.includes('--dry-run')) {
   db.exec('ROLLBACK');
   console.log(`SIMULAÇÃO: ${created} relações novas, ${previous} já existentes. Nada gravado.`);
 } else {
   db.exec('COMMIT');
   console.log(`IMPORTAÇÃO: ${created} relações novas; ${previous} preservadas. Pesos anteriores intactos.`);
 }
 console.log(`Total proposto: ${proposals.length}; origem: ${dbPath}`);
 console.log('LACUNAS CONHECIDAS (não foram inventados rankings):');
 omitted.forEach(x=>console.log(` - ${x}`));
} catch(e) { try { db.exec('ROLLBACK'); } catch {} throw e; }
finally { db.close(); }
