-- Conhecimento recebido no chat não é conhecimento aprovado.
CREATE TABLE IF NOT EXISTS conversational_teachings (
 id TEXT PRIMARY KEY,
 conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
 question TEXT NOT NULL,
 normalized_question TEXT NOT NULL,
 answer TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 reviewed_at TEXT
);
CREATE INDEX IF NOT EXISTS ix_conversational_teachings_status ON conversational_teachings(status);
CREATE INDEX IF NOT EXISTS ix_conversational_teachings_question ON conversational_teachings(normalized_question);
