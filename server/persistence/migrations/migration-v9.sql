-- v0.28: estado semântico por conversa; não modifica conhecimentos ou modelos.
CREATE TABLE IF NOT EXISTS conversation_semantic_state (
  conversation_id TEXT PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  state_json TEXT NOT NULL CHECK (json_valid(state_json)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
