-- v22: fatos com propriedade tipada, fonte, período e competição.
-- Não transforma estimativas em valores permanentes sem data; não altera relações antigas.
CREATE TABLE IF NOT EXISTS entity_facts (
  id TEXT PRIMARY KEY,
  entity TEXT NOT NULL,
  property TEXT NOT NULL,
  value TEXT NOT NULL,
  numeric_value REAL,
  unit TEXT,
  reference_year INTEGER,
  season INTEGER,
  competition TEXT,
  source_url TEXT NOT NULL,
  source_note TEXT,
  origin_import TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_entity_facts_entity_property ON entity_facts (entity,property);
CREATE INDEX IF NOT EXISTS idx_entity_facts_property_season ON entity_facts (property,season,competition);
CREATE TABLE IF NOT EXISTS entity_fact_aliases (
  property TEXT NOT NULL,
  alias TEXT NOT NULL,
  PRIMARY KEY(property,alias)
);

CREATE TABLE IF NOT EXISTS entity_labels (
 entity TEXT PRIMARY KEY,
 display_name TEXT NOT NULL,
 source_import TEXT NOT NULL
);
