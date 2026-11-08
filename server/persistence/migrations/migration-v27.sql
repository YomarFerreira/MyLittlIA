CREATE TABLE conversation_clarifications (
 conversation_id TEXT PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
 original_text TEXT NOT NULL,
 corrected_text TEXT NOT NULL
);
