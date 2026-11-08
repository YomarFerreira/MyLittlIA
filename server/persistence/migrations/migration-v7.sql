CREATE TABLE IF NOT EXISTS relation_assessments (
 relation_id TEXT PRIMARY KEY REFERENCES knowledge_relations(id) ON DELETE CASCADE,
 score REAL CHECK(score IS NULL OR(score>=0 AND score<=1)),
 status TEXT NOT NULL CHECK(status IN ('evidence','review','conflict')),
 rationale TEXT NOT NULL,
 evidence_count INTEGER NOT NULL DEFAULT 0,
 assessed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_relation_assessments_status ON relation_assessments(status);
