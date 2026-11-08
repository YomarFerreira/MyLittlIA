-- v0.9: adiciona metadados sem reescrever registros anteriores.
-- NULL = confiança não avaliada (não implica 100%).
ALTER TABLE knowledge_relations ADD COLUMN confidence REAL CHECK (confidence BETWEEN 0 AND 1);
ALTER TABLE knowledge_relations ADD COLUMN source_type TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE knowledge_relations ADD COLUMN evidence_count INTEGER NOT NULL DEFAULT 1 CHECK (evidence_count >= 1);
CREATE INDEX IF NOT EXISTS ix_relations_subject_predicate ON knowledge_relations(subject, predicate);
