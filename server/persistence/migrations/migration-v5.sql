-- Exemplos por par pergunta/resposta; modelo e historico seguem no SQLite.
CREATE TABLE IF NOT EXISTS neural_training_examples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  normalized_question TEXT NOT NULL,
  normalized_answer TEXT NOT NULL,
  origin TEXT NOT NULL DEFAULT 'neural-training',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(normalized_question,normalized_answer)
);
CREATE TABLE IF NOT EXISTS neural_training_run_examples (
  run_id INTEGER NOT NULL REFERENCES neural_training_runs(id) ON DELETE CASCADE,
  example_id INTEGER NOT NULL REFERENCES neural_training_examples(id),
  PRIMARY KEY(run_id,example_id)
);
CREATE INDEX IF NOT EXISTS idx_neural_examples_question ON neural_training_examples(normalized_question);
