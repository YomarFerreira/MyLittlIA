-- MylittlIA v0.7 — esquema inicial; aplicada uma única vez por versão.
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    normalized_question TEXT NOT NULL UNIQUE,
    answer TEXT NOT NULL,
    intent TEXT NOT NULL DEFAULT 'outro',
    origin TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_knowledge_intent ON knowledge(intent);

CREATE TABLE IF NOT EXISTS knowledge_relations (
    id TEXT PRIMARY KEY,
    subject TEXT NOT NULL,
    predicate TEXT NOT NULL,
    object TEXT NOT NULL,
    source_knowledge_id TEXT REFERENCES knowledge(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS training_examples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    normalized_text TEXT NOT NULL,
    label TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(normalized_text, label)
);
CREATE INDEX IF NOT EXISTS idx_training_label ON training_examples(label);

CREATE TABLE IF NOT EXISTS model_versions (
    id TEXT PRIMARY KEY,
    model_type TEXT NOT NULL,
    artifact_path TEXT,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS training_runs (
    id TEXT PRIMARY KEY,
    model_version_id TEXT REFERENCES model_versions(id),
    epochs INTEGER NOT NULL,
    learning_rate REAL NOT NULL,
    example_count INTEGER NOT NULL,
    finished_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS training_metrics (
    run_id TEXT NOT NULL REFERENCES training_runs(id) ON DELETE CASCADE,
    epoch INTEGER NOT NULL,
    loss REAL,
    val_loss REAL,
    accuracy REAL,
    val_accuracy REAL,
    PRIMARY KEY (run_id, epoch)
);

CREATE TABLE IF NOT EXISTS inference_runs (
    id TEXT PRIMARY KEY,
    prompt TEXT NOT NULL,
    answer TEXT,
    source TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS inference_steps (
    inference_id TEXT NOT NULL REFERENCES inference_runs(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    mode TEXT NOT NULL,
    step_json TEXT NOT NULL,
    PRIMARY KEY (inference_id, step_number)
);
