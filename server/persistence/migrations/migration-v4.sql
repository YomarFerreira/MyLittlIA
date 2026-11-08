CREATE TABLE IF NOT EXISTS neural_models (
  kind TEXT PRIMARY KEY CHECK(kind IN ('character','word')),
  model_json TEXT NOT NULL CHECK(json_valid(model_json)),
  trained_steps INTEGER NOT NULL DEFAULT 0,
  trained_examples INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS neural_training_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_kind TEXT NOT NULL CHECK(model_kind IN ('character','word')),
  epochs INTEGER NOT NULL,
  example_count INTEGER NOT NULL,
  token_count INTEGER NOT NULL,
  loss_initial REAL NOT NULL,
  loss_final REAL NOT NULL,
  training_text TEXT NOT NULL,
  trained_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS neural_training_metrics (
  run_id INTEGER NOT NULL REFERENCES neural_training_runs(id),
  epoch INTEGER NOT NULL,
  loss REAL NOT NULL,
  PRIMARY KEY(run_id,epoch)
);
CREATE INDEX IF NOT EXISTS idx_neural_training_kind ON neural_training_runs(model_kind,trained_at);
