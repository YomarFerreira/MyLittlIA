-- Lote 021: procedência das séries e perfis de referência; não altera fatos anteriores.
ALTER TABLE entity_facts ADD COLUMN source_series TEXT;
ALTER TABLE entity_facts ADD COLUMN measurement_scope TEXT;
CREATE TABLE football_reference_profiles (
 entity TEXT PRIMARY KEY,
 state_entity TEXT NOT NULL,
 display_name TEXT NOT NULL,
 display_order INTEGER NOT NULL,
 profile_json TEXT NOT NULL,
 selection_source TEXT NOT NULL
);
CREATE TABLE football_research_imports (
 checksum TEXT PRIMARY KEY,
 imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO ranking_metric_properties(metric,property) VALUES
 ('receita','receita_total_milhoes_brl'),('receita','receita_bruta_milhoes_brl'),
 ('receita','receita_operacional_liquida_milhoes_brl'),('receita','receita_operacional_milhoes_brl'),
 ('torcida','torcida_estimada_pluri_milhoes'),('torcida','torcida_percentual_datafolha_pe');
INSERT OR IGNORE INTO ranking_metric_units(metric,unit) VALUES ('torcida','milhoes_pessoas');
UPDATE ranking_metrics SET label='receita publicada (conforme a definição da série)' WHERE metric='receita' AND label='receita sem transferências';

INSERT OR IGNORE INTO ranking_metrics VALUES
 ('divida','dívida (conforme definição da série)','R$ milhões','brl_million'),
 ('passivo','passivo total contábil','R$ milhões','brl_million');
INSERT OR IGNORE INTO ranking_metric_aliases VALUES
 ('divida','divida'),('divida','dividas'),('divida','endividamento'),('passivo','passivo'),('passivo','passivo total');
INSERT OR IGNORE INTO ranking_metric_properties VALUES
 ('divida','divida_sportsvalue_milhoes_brl'),('passivo','passivo_total_milhoes_brl'),
 ('receita','receita_total_sportsvalue_milhoes_brl');
INSERT OR IGNORE INTO ranking_metric_units VALUES ('divida','BRL_millions'),('passivo','BRL_millions');
INSERT OR IGNORE INTO ranking_metric_units(metric,unit) VALUES ('receita','BRL_millions'),('patrimonio','BRL_millions');
