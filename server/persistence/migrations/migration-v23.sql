-- v23: catálogo extensível de métricas para rankings; não altera fatos existentes.
-- Uma métrica pode possuir mais de uma série/fonte. O motor NÃO as mistura.
CREATE TABLE IF NOT EXISTS ranking_metrics (
  metric TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  unit_label TEXT NOT NULL,
  numeric_kind TEXT NOT NULL CHECK(numeric_kind IN ('percent','brl_million','count','kmh','generic'))
);
CREATE TABLE IF NOT EXISTS ranking_metric_aliases (
  metric TEXT NOT NULL REFERENCES ranking_metrics(metric),
  alias TEXT NOT NULL,
  PRIMARY KEY(metric,alias)
);
CREATE TABLE IF NOT EXISTS ranking_metric_properties (
  metric TEXT NOT NULL REFERENCES ranking_metrics(metric),
  property TEXT NOT NULL,
  PRIMARY KEY(metric,property)
);
INSERT OR IGNORE INTO ranking_metrics VALUES
 ('torcida','tamanho da torcida','%', 'percent'),
 ('valuation','valuation dos clubes','R$ milhões','brl_million'),
 ('receita','receita sem transferências','R$ milhões','brl_million'),
 ('patrimonio','patrimônio líquido contábil','R$ milhões','brl_million'),
 ('titulos','títulos conquistados','títulos','count'),
 ('velocidade','velocidade máxima','km/h','kmh'),
 ('pib','PIB','R$ bilhões','generic');
INSERT OR IGNORE INTO ranking_metric_aliases VALUES
 ('torcida','torcida'),('torcida','torcidas'),('torcida','torcedores'),('torcida','mais populares'),('torcida','popularidade'),('torcida','tamanho da torcida'),
 ('valuation','valuation'),('valuation','valor de mercado'),('valuation','valor economico'),('valuation','mais valiosos'),('valuation','mais valioso'),('valuation','avaliacao economica'),
 ('receita','receita'),('receita','receitas'),('receita','faturamento'),('receita','faturamentos'),
 ('patrimonio','patrimonio'),('patrimonio','patrimonio liquido'),('patrimonio','patrimonio contabil'),
 ('titulos','titulos'),('titulos','titulo'),('titulos','conquistas'),('titulos','mais campeonatos'),
 ('velocidade','velocidade'),('velocidade','rapidos'),('velocidade','rapidas'),('velocidade','velozes'),
 ('pib','pib'),('pib','produto interno bruto');
INSERT OR IGNORE INTO ranking_metric_properties VALUES
 ('torcida','torcida_percentual_atlasintel'),('torcida','torcida_percentual_datafolha'),
 ('valuation','valuation_milhoes_brl'),
 ('receita','receita_sem_transferencias_milhoes_brl'),
 ('patrimonio','patrimonio_liquido_milhoes_brl'),
 ('titulos','quantidade_titulos'),
 ('velocidade','velocidade_maxima_kmh'),
 ('pib','pib_bilhoes_brl');
INSERT OR IGNORE INTO semantic_concept_aliases(language,domain,phrase,canonical) VALUES
 ('pt-BR','entity_class','animal','animal'),('pt-BR','entity_class','animais','animal'),
 ('pt-BR','entity_class','estado','unidade federativa brasileira'),('pt-BR','entity_class','estados','unidade federativa brasileira'),
 ('pt-BR','entity_class','cidade','municipio'),('pt-BR','entity_class','cidades','municipio'),
 ('pt-BR','entity_class','municipio','municipio'),('pt-BR','entity_class','municipios','municipio');

CREATE TABLE IF NOT EXISTS ranking_metric_units (
  metric TEXT NOT NULL REFERENCES ranking_metrics(metric),
  unit TEXT NOT NULL,
  PRIMARY KEY(metric,unit)
);
INSERT OR IGNORE INTO ranking_metric_units VALUES
 ('torcida','percentual'),('torcida','percent'),
 ('valuation','BRL_millions'),
 ('receita','R$ milhões'),('patrimonio','R$ milhões'),
 ('titulos','titulos'),('velocidade','kmh'),('pib','BRL_billions');

-- Rótulos de UFs do catálogo IBGE já conhecido, sem reescrever nomes personalizados.
INSERT OR IGNORE INTO entity_labels(entity,display_name,source_import) VALUES
 ('acre','Acre','v23-geo-labels'),
 ('alagoas','Alagoas','v23-geo-labels'),
 ('amapa','Amapá','v23-geo-labels'),
 ('amazonas','Amazonas','v23-geo-labels'),
 ('bahia','Bahia','v23-geo-labels'),
 ('ceara','Ceará','v23-geo-labels'),
 ('distrito_federal','Distrito Federal','v23-geo-labels'),
 ('espirito_santo','Espírito Santo','v23-geo-labels'),
 ('goias','Goiás','v23-geo-labels'),
 ('maranhao','Maranhão','v23-geo-labels'),
 ('mato_grosso','Mato Grosso','v23-geo-labels'),
 ('mato_grosso_do_sul','Mato Grosso do Sul','v23-geo-labels'),
 ('minas_gerais','Minas Gerais','v23-geo-labels'),
 ('para','Pará','v23-geo-labels'),
 ('paraiba','Paraíba','v23-geo-labels'),
 ('parana','Paraná','v23-geo-labels'),
 ('pernambuco','Pernambuco','v23-geo-labels'),
 ('piaui','Piauí','v23-geo-labels'),
 ('rio_de_janeiro','Rio de Janeiro','v23-geo-labels'),
 ('rio_grande_do_norte','Rio Grande do Norte','v23-geo-labels'),
 ('rio_grande_do_sul','Rio Grande do Sul','v23-geo-labels'),
 ('rondonia','Rondônia','v23-geo-labels'),
 ('roraima','Roraima','v23-geo-labels'),
 ('santa_catarina','Santa Catarina','v23-geo-labels'),
 ('sao_paulo','São Paulo','v23-geo-labels'),
 ('sergipe','Sergipe','v23-geo-labels'),
 ('tocantins','Tocantins','v23-geo-labels'),
 ('brasil','Brasil','v23-geo-labels');
