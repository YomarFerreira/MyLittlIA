// Importador MylittlIA: um arquivo, --dry-run / --apply.
// As fontes foram consultadas durante a preparação do lote; a importação funciona offline.
import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRelation } from '../server/knowledge/relations.js';
import { openDatabase, normalize } from '../server/persistence/database.js';

const mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--dry-run') ? 'dry-run' : null;
if (!mode || (process.argv.includes('--apply') && process.argv.includes('--dry-run'))) {
  console.error('Uso: node imports/import-mylittlia-lote-018-brasil-futebol-biomas.mjs --dry-run|--apply');
  process.exit(2);
}
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, 'data', 'mylittlia.db');
if (!existsSync(dbPath)) {
  console.error(`Banco não encontrado em ${dbPath}. Nada foi criado. Confira a instalação.`);
  process.exit(2);
}
if (!existsSync(join(root, 'server', 'persistence', 'migrations', 'migration-v18.sql'))) {
  console.error('Aplicação anterior à v0.30.7: server/persistence/migrations/migration-v18.sql ausente. Instale a v0.30.7 ou superior, preservando data/.');
  process.exit(2);
}
// Registros [sujeito, predicado, objeto, url da fonte, ano de referência, observação].
const records = [
  [
    "acre",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "acre",
    "tem_capital",
    "rio_branco",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "acre",
    "localizado_em",
    "norte",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "amapa",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "amapa",
    "tem_capital",
    "macapa",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "amapa",
    "localizado_em",
    "norte",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "amazonas",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "amazonas",
    "tem_capital",
    "manaus",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "amazonas",
    "localizado_em",
    "norte",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "para",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "para",
    "tem_capital",
    "belem",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "para",
    "localizado_em",
    "norte",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "rondonia",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "rondonia",
    "tem_capital",
    "porto_velho",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "rondonia",
    "localizado_em",
    "norte",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "roraima",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "roraima",
    "tem_capital",
    "boa_vista",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "roraima",
    "localizado_em",
    "norte",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "tocantins",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "tocantins",
    "tem_capital",
    "palmas",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "tocantins",
    "localizado_em",
    "norte",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "alagoas",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "alagoas",
    "tem_capital",
    "maceio",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "alagoas",
    "localizado_em",
    "nordeste",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "bahia",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "bahia",
    "tem_capital",
    "salvador",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "bahia",
    "localizado_em",
    "nordeste",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "ceara",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "ceara",
    "tem_capital",
    "fortaleza",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "ceara",
    "localizado_em",
    "nordeste",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "maranhao",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "maranhao",
    "tem_capital",
    "sao_luis",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "maranhao",
    "localizado_em",
    "nordeste",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "paraiba",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "paraiba",
    "tem_capital",
    "joao_pessoa",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "paraiba",
    "localizado_em",
    "nordeste",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "pernambuco",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "pernambuco",
    "tem_capital",
    "recife",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "pernambuco",
    "localizado_em",
    "nordeste",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "piaui",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "piaui",
    "tem_capital",
    "teresina",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "piaui",
    "localizado_em",
    "nordeste",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "rio_grande_do_norte",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "rio_grande_do_norte",
    "tem_capital",
    "natal",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "rio_grande_do_norte",
    "localizado_em",
    "nordeste",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "sergipe",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "sergipe",
    "tem_capital",
    "aracaju",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "sergipe",
    "localizado_em",
    "nordeste",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "espirito_santo",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "espirito_santo",
    "tem_capital",
    "vitoria",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "espirito_santo",
    "localizado_em",
    "sudeste",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "minas_gerais",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "minas_gerais",
    "tem_capital",
    "belo_horizonte",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "minas_gerais",
    "localizado_em",
    "sudeste",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "rio_de_janeiro",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "rio_de_janeiro",
    "tem_capital",
    "rio_de_janeiro",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "rio_de_janeiro",
    "localizado_em",
    "sudeste",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "sao_paulo",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "sao_paulo",
    "tem_capital",
    "sao_paulo",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "sao_paulo",
    "localizado_em",
    "sudeste",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "parana",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "parana",
    "tem_capital",
    "curitiba",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "parana",
    "localizado_em",
    "sul",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "rio_grande_do_sul",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "rio_grande_do_sul",
    "tem_capital",
    "porto_alegre",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "rio_grande_do_sul",
    "localizado_em",
    "sul",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "santa_catarina",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "santa_catarina",
    "tem_capital",
    "florianopolis",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "santa_catarina",
    "localizado_em",
    "sul",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "distrito_federal",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "distrito_federal",
    "tem_capital",
    "brasilia",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "distrito_federal",
    "localizado_em",
    "centro_oeste",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "goias",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "goias",
    "tem_capital",
    "goiania",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "goias",
    "localizado_em",
    "centro_oeste",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "mato_grosso",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "mato_grosso",
    "tem_capital",
    "cuiaba",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "mato_grosso",
    "localizado_em",
    "centro_oeste",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "mato_grosso_do_sul",
    "e_um",
    "unidade_federativa_brasileira",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Divisão territorial brasileira, IBGE Educa."
  ],
  [
    "mato_grosso_do_sul",
    "tem_capital",
    "campo_grande",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Distrito Federal é tratado como unidade federativa, não como estado dividido em municípios."
  ],
  [
    "mato_grosso_do_sul",
    "localizado_em",
    "centro_oeste",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html",
    null,
    "Região geográfica conforme IBGE Educa."
  ],
  [
    "nacional",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação AM entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "nacional",
    "localizado_em",
    "amazonas",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação AM entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "manaus_am",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação AM entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "manaus_am",
    "localizado_em",
    "amazonas",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação AM entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "manauara",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação AM entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "manauara",
    "localizado_em",
    "amazonas",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação AM entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "gas",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RR entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "gas",
    "localizado_em",
    "roraima",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RR entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "monte_roraima",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RR entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "monte_roraima",
    "localizado_em",
    "roraima",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RR entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "sao_raimundo",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RR entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "sao_raimundo",
    "localizado_em",
    "roraima",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RR entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "independencia",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação AC entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "independencia",
    "localizado_em",
    "acre",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação AC entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "galvez",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação AC entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "galvez",
    "localizado_em",
    "acre",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação AC entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "humaita",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação AC entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "humaita",
    "localizado_em",
    "acre",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação AC entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "porto_velho_ro",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RO entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "porto_velho_ro",
    "localizado_em",
    "rondonia",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RO entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "guapore",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RO entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "guapore",
    "localizado_em",
    "rondonia",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RO entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "araguaina",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação TO entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "araguaina",
    "localizado_em",
    "tocantins",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação TO entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "gama",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação DF entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "gama",
    "localizado_em",
    "distrito_federal",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação DF entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "brasiliense",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação DF entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "brasiliense",
    "localizado_em",
    "distrito_federal",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação DF entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "luverdense",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MT entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "luverdense",
    "localizado_em",
    "mato_grosso",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MT entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "primavera",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MT entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "primavera",
    "localizado_em",
    "mato_grosso",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MT entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "inhumas",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação GO entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "inhumas",
    "localizado_em",
    "goias",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação GO entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "aparecidense",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação GO entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "aparecidense",
    "localizado_em",
    "goias",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação GO entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "capital",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação DF entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "capital",
    "localizado_em",
    "distrito_federal",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação DF entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "ceilandia",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação DF entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "ceilandia",
    "localizado_em",
    "distrito_federal",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação DF entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "mixto",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MT entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "mixto",
    "localizado_em",
    "mato_grosso",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MT entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "operario_mt",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MT entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "operario_mt",
    "localizado_em",
    "mato_grosso",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MT entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "uniao",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MT entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "uniao",
    "localizado_em",
    "mato_grosso",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MT entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "goiatuba",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação GO entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "goiatuba",
    "localizado_em",
    "goias",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação GO entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "trem",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação AP entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "trem",
    "localizado_em",
    "amapa",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação AP entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "oratorio",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação AP entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "oratorio",
    "localizado_em",
    "amapa",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação AP entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "tuna_luso",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PA entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "tuna_luso",
    "localizado_em",
    "para",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PA entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "aguia_de_maraba",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PA entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "aguia_de_maraba",
    "localizado_em",
    "para",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PA entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "tocantinopolis",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação TO entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "tocantinopolis",
    "localizado_em",
    "tocantins",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação TO entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "imperatriz",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MA entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "imperatriz",
    "localizado_em",
    "maranhao",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MA entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "sampaio_correa_ma",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MA entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "sampaio_correa_ma",
    "localizado_em",
    "maranhao",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MA entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "moto_club",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MA entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "moto_club",
    "localizado_em",
    "maranhao",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MA entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "iape",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MA entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "iape",
    "localizado_em",
    "maranhao",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MA entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "maracana",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação CE entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "maracana",
    "localizado_em",
    "ceara",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação CE entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "iguatu",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação CE entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "iguatu",
    "localizado_em",
    "ceara",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação CE entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "parnahyba",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PI entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "parnahyba",
    "localizado_em",
    "piaui",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PI entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "ferroviario",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação CE entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "ferroviario",
    "localizado_em",
    "ceara",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação CE entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "tirol",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação CE entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "tirol",
    "localizado_em",
    "ceara",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação CE entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "atletico_ce",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação CE entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "atletico_ce",
    "localizado_em",
    "ceara",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação CE entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "altos",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PI entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "altos",
    "localizado_em",
    "piaui",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PI entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "piaui_pi",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PI entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "piaui_pi",
    "localizado_em",
    "piaui",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PI entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "fluminense_pi",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PI entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "fluminense_pi",
    "localizado_em",
    "piaui",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PI entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "abc",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RN entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "abc",
    "localizado_em",
    "rio_grande_do_norte",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RN entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "america_rn",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RN entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "america_rn",
    "localizado_em",
    "rio_grande_do_norte",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RN entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "laguna",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RN entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "laguna",
    "localizado_em",
    "rio_grande_do_norte",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RN entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "sousa",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PB entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "sousa",
    "localizado_em",
    "paraiba",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PB entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "maguary",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PE entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "maguary",
    "localizado_em",
    "pernambuco",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PE entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "central",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PE entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "central",
    "localizado_em",
    "pernambuco",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PE entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "retro",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PE entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "retro",
    "localizado_em",
    "pernambuco",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PE entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "decisao",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PE entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "decisao",
    "localizado_em",
    "pernambuco",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PE entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "serra_branca",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PB entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "serra_branca",
    "localizado_em",
    "paraiba",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PB entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "treze",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PB entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "treze",
    "localizado_em",
    "paraiba",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PB entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "lagarto",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação SE entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "lagarto",
    "localizado_em",
    "sergipe",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação SE entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "sergipe_se",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação SE entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "sergipe_se",
    "localizado_em",
    "sergipe",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação SE entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "asa",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação AL entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "asa",
    "localizado_em",
    "alagoas",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação AL entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "csa",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação AL entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "csa",
    "localizado_em",
    "alagoas",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação AL entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "cse",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação AL entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "cse",
    "localizado_em",
    "alagoas",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação AL entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "jacuipense",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação BA entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "jacuipense",
    "localizado_em",
    "bahia",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação BA entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "atletico_ba",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação BA entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "atletico_ba",
    "localizado_em",
    "bahia",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação BA entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "juazeirense",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação BA entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "juazeirense",
    "localizado_em",
    "bahia",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação BA entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "uberlandia",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MG entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "uberlandia",
    "localizado_em",
    "minas_gerais",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MG entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "betim",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MG entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "betim",
    "localizado_em",
    "minas_gerais",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MG entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "crac",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação GO entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "crac",
    "localizado_em",
    "goias",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação GO entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "abecat",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação GO entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "abecat",
    "localizado_em",
    "goias",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação GO entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "operario_ms",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MS entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "operario_ms",
    "localizado_em",
    "mato_grosso_do_sul",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MS entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "ivinhema",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MS entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "ivinhema",
    "localizado_em",
    "mato_grosso_do_sul",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MS entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "porto",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação BA entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "porto",
    "localizado_em",
    "bahia",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação BA entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "rio_branco_es",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação ES entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "rio_branco_es",
    "localizado_em",
    "espirito_santo",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação ES entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "vitoria_es",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação ES entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "vitoria_es",
    "localizado_em",
    "espirito_santo",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação ES entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "real_noroeste",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação ES entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "real_noroeste",
    "localizado_em",
    "espirito_santo",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação ES entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "tombense",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MG entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "tombense",
    "localizado_em",
    "minas_gerais",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MG entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "democrata_gv",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MG entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "democrata_gv",
    "localizado_em",
    "minas_gerais",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MG entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "madureira",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RJ entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "madureira",
    "localizado_em",
    "rio_de_janeiro",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RJ entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "portuguesa_rj",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RJ entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "portuguesa_rj",
    "localizado_em",
    "rio_de_janeiro",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RJ entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "america_rj",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RJ entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "america_rj",
    "localizado_em",
    "rio_de_janeiro",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RJ entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "portuguesa_sp",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "portuguesa_sp",
    "localizado_em",
    "sao_paulo",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "agua_santa",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "agua_santa",
    "localizado_em",
    "sao_paulo",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "pouso_alegre",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MG entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "pouso_alegre",
    "localizado_em",
    "minas_gerais",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação MG entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "nova_iguacu",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RJ entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "nova_iguacu",
    "localizado_em",
    "rio_de_janeiro",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RJ entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "sampaio_correa_rj",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RJ entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "sampaio_correa_rj",
    "localizado_em",
    "rio_de_janeiro",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RJ entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "marica",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RJ entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "marica",
    "localizado_em",
    "rio_de_janeiro",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RJ entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "xv_de_piracicaba",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "xv_de_piracicaba",
    "localizado_em",
    "sao_paulo",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "noroeste",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "noroeste",
    "localizado_em",
    "sao_paulo",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "velo_clube",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "velo_clube",
    "localizado_em",
    "sao_paulo",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "cianorte",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PR entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "cianorte",
    "localizado_em",
    "parana",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PR entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "fc_cascavel",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PR entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "fc_cascavel",
    "localizado_em",
    "parana",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PR entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "santa_catarina_sc",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação SC entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "santa_catarina_sc",
    "localizado_em",
    "santa_catarina",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação SC entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "joinville",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação SC entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "joinville",
    "localizado_em",
    "santa_catarina",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação SC entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "guarany_de_bage",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RS entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "guarany_de_bage",
    "localizado_em",
    "rio_grande_do_sul",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RS entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "sao_luiz",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RS entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "sao_luiz",
    "localizado_em",
    "rio_grande_do_sul",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RS entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "blumenau",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação SC entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "blumenau",
    "localizado_em",
    "santa_catarina",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação SC entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "marcilio_dias",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação SC entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "marcilio_dias",
    "localizado_em",
    "santa_catarina",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação SC entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "sao_joseense",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PR entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "sao_joseense",
    "localizado_em",
    "parana",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PR entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "azuriz",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PR entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "azuriz",
    "localizado_em",
    "parana",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação PR entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "sao_jose",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RS entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "sao_jose",
    "localizado_em",
    "rio_grande_do_sul",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RS entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "brasil",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RS entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "brasil",
    "localizado_em",
    "rio_grande_do_sul",
    "https://www.cbf.com.br/futebol-brasileiro/noticias/sele/a/cbf-divulga-grupos-da-serie-d-de-2026",
    2026,
    "CBF: clube identificado com a federação RS entre participantes da Série D do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "athletico_paranaense",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação PR entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "athletico_paranaense",
    "localizado_em",
    "parana",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação PR entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "atletico_mineiro",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação MG entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "atletico_mineiro",
    "localizado_em",
    "minas_gerais",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação MG entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "bahia_ba",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação BA entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "bahia_ba",
    "localizado_em",
    "bahia",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação BA entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "botafogo_rj",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação RJ entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "botafogo_rj",
    "localizado_em",
    "rio_de_janeiro",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação RJ entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "chapecoense",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação SC entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "chapecoense",
    "localizado_em",
    "santa_catarina",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação SC entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "corinthians",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "corinthians",
    "localizado_em",
    "sao_paulo",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "coritiba_saf",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação PR entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "coritiba_saf",
    "localizado_em",
    "parana",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação PR entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "cruzeiro",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação MG entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "cruzeiro",
    "localizado_em",
    "minas_gerais",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação MG entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "flamengo",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação RJ entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "flamengo",
    "localizado_em",
    "rio_de_janeiro",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação RJ entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "fluminense_rj",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação RJ entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "fluminense_rj",
    "localizado_em",
    "rio_de_janeiro",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação RJ entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "gremio",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação RS entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "gremio",
    "localizado_em",
    "rio_grande_do_sul",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação RS entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "internacional",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação RS entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "internacional",
    "localizado_em",
    "rio_grande_do_sul",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação RS entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "mirassol",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "mirassol",
    "localizado_em",
    "sao_paulo",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "palmeiras",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "palmeiras",
    "localizado_em",
    "sao_paulo",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "red_bull_bragantino",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "red_bull_bragantino",
    "localizado_em",
    "sao_paulo",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "remo",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação PA entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "remo",
    "localizado_em",
    "para",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação PA entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "santos_fc",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "santos_fc",
    "localizado_em",
    "sao_paulo",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "sao_paulo_sp",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "sao_paulo_sp",
    "localizado_em",
    "sao_paulo",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "vasco_da_gama",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação RJ entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "vasco_da_gama",
    "localizado_em",
    "rio_de_janeiro",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação RJ entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "vitoria_ba",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação BA entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "vitoria_ba",
    "localizado_em",
    "bahia",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026",
    2026,
    "CBF: clube identificado com a federação BA entre participantes da Série A do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "america_mg",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação MG entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "america_mg",
    "localizado_em",
    "minas_gerais",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação MG entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "athletic_saf",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação MG entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "athletic_saf",
    "localizado_em",
    "minas_gerais",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação MG entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "atletico_goianiense",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação GO entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "atletico_goianiense",
    "localizado_em",
    "goias",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação GO entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "avai",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação SC entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "avai",
    "localizado_em",
    "santa_catarina",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação SC entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "botafogo_sp",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "botafogo_sp",
    "localizado_em",
    "sao_paulo",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "ceara_ce",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação CE entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "ceara_ce",
    "localizado_em",
    "ceara",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação CE entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "crb",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação AL entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "crb",
    "localizado_em",
    "alagoas",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação AL entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "criciuma",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação SC entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "criciuma",
    "localizado_em",
    "santa_catarina",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação SC entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "cuiaba_mt",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação MT entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "cuiaba_mt",
    "localizado_em",
    "mato_grosso",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação MT entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "fortaleza_ce",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação CE entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "fortaleza_ce",
    "localizado_em",
    "ceara",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação CE entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "goias_go",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação GO entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "goias_go",
    "localizado_em",
    "goias",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação GO entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "gremio_novorizontino",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "gremio_novorizontino",
    "localizado_em",
    "sao_paulo",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "juventude",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação RS entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "juventude",
    "localizado_em",
    "rio_grande_do_sul",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação RS entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "londrina",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação PR entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "londrina",
    "localizado_em",
    "parana",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação PR entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "nautico",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação PE entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "nautico",
    "localizado_em",
    "pernambuco",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação PE entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "operario_pr",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação PR entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "operario_pr",
    "localizado_em",
    "parana",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação PR entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "ponte_preta",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "ponte_preta",
    "localizado_em",
    "sao_paulo",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "sao_bernardo",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "sao_bernardo",
    "localizado_em",
    "sao_paulo",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação SP entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "sport",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação PE entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "sport",
    "localizado_em",
    "pernambuco",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação PE entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "vila_nova",
    "e_um",
    "clube_de_futebol",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação GO entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "vila_nova",
    "localizado_em",
    "goias",
    "https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026",
    2026,
    "CBF: clube identificado com a federação GO entre participantes da Série B do Campeonato Brasileiro 2026. Não é um ranking de popularidade ou relevância."
  ],
  [
    "amazonia",
    "e_um",
    "bioma_brasileiro",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/18307-biomas-brasileiros.html",
    null,
    "IBGE Educa: seis biomas brasileiros."
  ],
  [
    "mata_atlantica",
    "e_um",
    "bioma_brasileiro",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/18307-biomas-brasileiros.html",
    null,
    "IBGE Educa: seis biomas brasileiros."
  ],
  [
    "caatinga",
    "e_um",
    "bioma_brasileiro",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/18307-biomas-brasileiros.html",
    null,
    "IBGE Educa: seis biomas brasileiros."
  ],
  [
    "cerrado",
    "e_um",
    "bioma_brasileiro",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/18307-biomas-brasileiros.html",
    null,
    "IBGE Educa: seis biomas brasileiros."
  ],
  [
    "pantanal",
    "e_um",
    "bioma_brasileiro",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/18307-biomas-brasileiros.html",
    null,
    "IBGE Educa: seis biomas brasileiros."
  ],
  [
    "pampa",
    "e_um",
    "bioma_brasileiro",
    "https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/18307-biomas-brasileiros.html",
    null,
    "IBGE Educa: seis biomas brasileiros."
  ],
  [
    "acre",
    "bioma",
    "amazonia",
    "https://www.ibge.gov.br/en/geosciences/full-list-geosciences/18341-biomes.html?edicao=18347",
    null,
    "Bioma ocupa mais de 50% do território (ou sua totalidade) segundo descrição territorial do IBGE. Não equivale necessariamente a vegetação uniforme."
  ],
  [
    "amapa",
    "bioma",
    "amazonia",
    "https://www.ibge.gov.br/en/geosciences/full-list-geosciences/18341-biomes.html?edicao=18347",
    null,
    "Bioma ocupa mais de 50% do território (ou sua totalidade) segundo descrição territorial do IBGE. Não equivale necessariamente a vegetação uniforme."
  ],
  [
    "amazonas",
    "bioma",
    "amazonia",
    "https://www.ibge.gov.br/en/geosciences/full-list-geosciences/18341-biomes.html?edicao=18347",
    null,
    "Bioma ocupa mais de 50% do território (ou sua totalidade) segundo descrição territorial do IBGE. Não equivale necessariamente a vegetação uniforme."
  ],
  [
    "para",
    "bioma",
    "amazonia",
    "https://www.ibge.gov.br/en/geosciences/full-list-geosciences/18341-biomes.html?edicao=18347",
    null,
    "Bioma ocupa mais de 50% do território (ou sua totalidade) segundo descrição territorial do IBGE. Não equivale necessariamente a vegetação uniforme."
  ],
  [
    "roraima",
    "bioma",
    "amazonia",
    "https://www.ibge.gov.br/en/geosciences/full-list-geosciences/18341-biomes.html?edicao=18347",
    null,
    "Bioma ocupa mais de 50% do território (ou sua totalidade) segundo descrição territorial do IBGE. Não equivale necessariamente a vegetação uniforme."
  ],
  [
    "rondonia",
    "bioma",
    "amazonia",
    "https://www.ibge.gov.br/en/geosciences/full-list-geosciences/18341-biomes.html?edicao=18347",
    null,
    "Bioma ocupa mais de 50% do território (ou sua totalidade) segundo descrição territorial do IBGE. Não equivale necessariamente a vegetação uniforme."
  ],
  [
    "mato_grosso",
    "bioma",
    "amazonia",
    "https://www.ibge.gov.br/en/geosciences/full-list-geosciences/18341-biomes.html?edicao=18347",
    null,
    "Bioma ocupa mais de 50% do território (ou sua totalidade) segundo descrição territorial do IBGE. Não equivale necessariamente a vegetação uniforme."
  ],
  [
    "espirito_santo",
    "bioma",
    "mata_atlantica",
    "https://www.ibge.gov.br/en/geosciences/full-list-geosciences/18341-biomes.html?edicao=18347",
    null,
    "Bioma ocupa mais de 50% do território (ou sua totalidade) segundo descrição territorial do IBGE. Não equivale necessariamente a vegetação uniforme."
  ],
  [
    "rio_de_janeiro",
    "bioma",
    "mata_atlantica",
    "https://www.ibge.gov.br/en/geosciences/full-list-geosciences/18341-biomes.html?edicao=18347",
    null,
    "Bioma ocupa mais de 50% do território (ou sua totalidade) segundo descrição territorial do IBGE. Não equivale necessariamente a vegetação uniforme."
  ],
  [
    "santa_catarina",
    "bioma",
    "mata_atlantica",
    "https://www.ibge.gov.br/en/geosciences/full-list-geosciences/18341-biomes.html?edicao=18347",
    null,
    "Bioma ocupa mais de 50% do território (ou sua totalidade) segundo descrição territorial do IBGE. Não equivale necessariamente a vegetação uniforme."
  ],
  [
    "parana",
    "bioma",
    "mata_atlantica",
    "https://www.ibge.gov.br/en/geosciences/full-list-geosciences/18341-biomes.html?edicao=18347",
    null,
    "Bioma ocupa mais de 50% do território (ou sua totalidade) segundo descrição territorial do IBGE. Não equivale necessariamente a vegetação uniforme."
  ],
  [
    "distrito_federal",
    "bioma",
    "cerrado",
    "https://www.ibge.gov.br/en/geosciences/full-list-geosciences/18341-biomes.html?edicao=18347",
    null,
    "Bioma ocupa mais de 50% do território (ou sua totalidade) segundo descrição territorial do IBGE. Não equivale necessariamente a vegetação uniforme."
  ],
  [
    "goias",
    "bioma",
    "cerrado",
    "https://www.ibge.gov.br/en/geosciences/full-list-geosciences/18341-biomes.html?edicao=18347",
    null,
    "Bioma ocupa mais de 50% do território (ou sua totalidade) segundo descrição territorial do IBGE. Não equivale necessariamente a vegetação uniforme."
  ],
  [
    "maranhao",
    "bioma",
    "cerrado",
    "https://www.ibge.gov.br/en/geosciences/full-list-geosciences/18341-biomes.html?edicao=18347",
    null,
    "Bioma ocupa mais de 50% do território (ou sua totalidade) segundo descrição territorial do IBGE. Não equivale necessariamente a vegetação uniforme."
  ],
  [
    "mato_grosso_do_sul",
    "bioma",
    "cerrado",
    "https://www.ibge.gov.br/en/geosciences/full-list-geosciences/18341-biomes.html?edicao=18347",
    null,
    "Bioma ocupa mais de 50% do território (ou sua totalidade) segundo descrição territorial do IBGE. Não equivale necessariamente a vegetação uniforme."
  ],
  [
    "minas_gerais",
    "bioma",
    "cerrado",
    "https://www.ibge.gov.br/en/geosciences/full-list-geosciences/18341-biomes.html?edicao=18347",
    null,
    "Bioma ocupa mais de 50% do território (ou sua totalidade) segundo descrição territorial do IBGE. Não equivale necessariamente a vegetação uniforme."
  ],
  [
    "tocantins",
    "bioma",
    "cerrado",
    "https://www.ibge.gov.br/en/geosciences/full-list-geosciences/18341-biomes.html?edicao=18347",
    null,
    "Bioma ocupa mais de 50% do território (ou sua totalidade) segundo descrição territorial do IBGE. Não equivale necessariamente a vegetação uniforme."
  ],
  [
    "ceara",
    "bioma",
    "caatinga",
    "https://www.ibge.gov.br/en/geosciences/full-list-geosciences/18341-biomes.html?edicao=18347",
    null,
    "Bioma ocupa mais de 50% do território (ou sua totalidade) segundo descrição territorial do IBGE. Não equivale necessariamente a vegetação uniforme."
  ],
  [
    "bahia",
    "bioma",
    "caatinga",
    "https://www.ibge.gov.br/en/geosciences/full-list-geosciences/18341-biomes.html?edicao=18347",
    null,
    "Bioma ocupa mais de 50% do território (ou sua totalidade) segundo descrição territorial do IBGE. Não equivale necessariamente a vegetação uniforme."
  ],
  [
    "paraiba",
    "bioma",
    "caatinga",
    "https://www.ibge.gov.br/en/geosciences/full-list-geosciences/18341-biomes.html?edicao=18347",
    null,
    "Bioma ocupa mais de 50% do território (ou sua totalidade) segundo descrição territorial do IBGE. Não equivale necessariamente a vegetação uniforme."
  ],
  [
    "pernambuco",
    "bioma",
    "caatinga",
    "https://www.ibge.gov.br/en/geosciences/full-list-geosciences/18341-biomes.html?edicao=18347",
    null,
    "Bioma ocupa mais de 50% do território (ou sua totalidade) segundo descrição territorial do IBGE. Não equivale necessariamente a vegetação uniforme."
  ],
  [
    "piaui",
    "bioma",
    "caatinga",
    "https://www.ibge.gov.br/en/geosciences/full-list-geosciences/18341-biomes.html?edicao=18347",
    null,
    "Bioma ocupa mais de 50% do território (ou sua totalidade) segundo descrição territorial do IBGE. Não equivale necessariamente a vegetação uniforme."
  ],
  [
    "rio_grande_do_norte",
    "bioma",
    "caatinga",
    "https://www.ibge.gov.br/en/geosciences/full-list-geosciences/18341-biomes.html?edicao=18347",
    null,
    "Bioma ocupa mais de 50% do território (ou sua totalidade) segundo descrição territorial do IBGE. Não equivale necessariamente a vegetação uniforme."
  ],
  [
    "rio_grande_do_sul",
    "bioma",
    "pampa",
    "https://www.ibge.gov.br/en/geosciences/full-list-geosciences/18341-biomes.html?edicao=18347",
    null,
    "Bioma ocupa mais de 50% do território (ou sua totalidade) segundo descrição territorial do IBGE. Não equivale necessariamente a vegetação uniforme."
  ]
];
const allowed = new Set(['e_um','localizado_em','tem_capital','possui_cor','fundado_em','bioma','come','bebe','produz','vegetacao_predominante','atividade_economica']);
const canonical = value => normalize(value).replaceAll(' ', '_');
const keys = new Set();
for (const [s,p,o,url,year] of records) {
  const key = `${canonical(s)}|${p}|${canonical(o)}`;
  if (!canonical(s) || !canonical(o) || canonical(s).length>100 || canonical(o).length>100 || !allowed.has(p)
    || !/^https:\/\//.test(url) || (year !== null && (!Number.isInteger(year) || year<1800 || year>2100))) {
      console.error('Registro inválido no lote: '+key);process.exit(2);
  }
  if (keys.has(key)) {console.error('Duplicação interna no lote: '+key);process.exit(2);}
  keys.add(key);
}
let db;
try {
  // Dry-run só consulta. Mesmo com v18 pendente, não modifica o banco.
  if (mode === 'apply') {
    // Aplica TODAS as migrations pendentes da versão instalada, incluindo v18,
    // sem recriar arquivo, sem seed e sem alterar dados/ ou pesos de relações.
    const migrated = openDatabase(dbPath, {seed:false});
    migrated.close();
  }
  db = new DatabaseSync(dbPath, { readOnly: mode === 'dry-run' });
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000;');
  const migration = db.prepare('SELECT version FROM schema_migrations WHERE version=18').get();
  const provenanceExists = !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='relation_provenance'").get();
  if (mode === 'apply' && (!migration || !provenanceExists)) throw new Error('A migração v18 não pôde ser aplicada; confira a instalação da aplicação.');
  const existing = db.prepare('SELECT id FROM knowledge_relations WHERE subject=? AND predicate=? AND object=? LIMIT 1');
  let inserted=0,skipped=0,provenance=0;
  if (mode==='apply') db.exec('BEGIN IMMEDIATE');
  try {
    const insertProvenance = provenanceExists && mode==='apply' ? db.prepare(`INSERT OR IGNORE INTO relation_provenance
      (relation_id, source_url, reference_year, source_note) VALUES (?, ?, ?, ?)`) : null;
    for (const [s,p,o,url,year,note] of records) {
      const subject=canonical(s),object=canonical(o);
      let row=existing.get(subject,p,object);
      if (!row) {
        inserted++;
        if (mode==='apply') {
          createRelation(db,{subject,predicate:p,object,source_type:'imported'});
          row=existing.get(subject,p,object);
          if (!row) throw new Error('Relação não encontrada após inserção: '+subject);
        }
      } else skipped++;
      if (insertProvenance && row) provenance+=Number(insertProvenance.run(row.id,url,year,note).changes);
    }
    if (mode==='apply') db.exec('COMMIT');
  } catch(e) {
    if (mode==='apply') db.exec('ROLLBACK');
    throw e;
  }
  console.log(`Lote 018 (${mode}): ${records.length} relações; ${inserted} novas; ${skipped} já existentes.`);
  if (!migration && mode==='dry-run') console.log('Migração v18 pendente no banco. O --apply aplicará essa migração automaticamente antes da importação.');
  console.log(mode==='dry-run'?'SIMULAÇÃO: nenhum dado foi alterado.':`Importação concluída: ${provenance} registros de fonte acrescentados. Dados e pesos existentes preservados.`);
} catch(e) {console.error('Erro de importação:',e.message);process.exitCode=1;}
finally {db?.close();}
