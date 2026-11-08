-- v18: propostas multirrelação, revisão e rastreabilidade. Apenas adições.
ALTER TABLE knowledge_proposals ADD COLUMN batch_id TEXT;
ALTER TABLE knowledge_proposals ADD COLUMN source_url TEXT;
ALTER TABLE knowledge_proposals ADD COLUMN reference_year INTEGER;
ALTER TABLE knowledge_proposals ADD COLUMN edited_at TEXT;
CREATE INDEX IF NOT EXISTS ix_proposals_batch ON knowledge_proposals(batch_id);
CREATE TABLE IF NOT EXISTS relation_provenance (
  relation_id TEXT PRIMARY KEY REFERENCES knowledge_relations(id) ON DELETE CASCADE,
  source_url TEXT,
  reference_year INTEGER,
  source_note TEXT,
  recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES
 ('pt-BR','learning-multiple-preview','Entendi estas informações: {facts}. Separei cada relação para você revisar, corrigir e aprovar em Cadastrar conhecimento. Até a aprovação, não vou tratá-las como conhecimento confirmado.'),
 ('pt-BR','graph-colors','As cores de {entity} que conheço são {values}.'),
 ('pt-BR','graph-location','{entity} está localizado em {values}.'),
 ('pt-BR','graph-inverse-colors','Conheço estes clubes associados à cor {color}: {entities}.'),
 ('pt-BR','graph-clubs-location','Conheço estes clubes de futebol de {location}: {entities}.'),
 ('pt-BR','graph-football-topic','Sobre o futebol de {location}, conheço estes clubes: {entities}. Você pode perguntar suas cores ou onde ficam.'),
 ('pt-BR','graph-football-unknown','Ainda conheço pouco sobre o futebol de {location}. Você pode me ensinar alguma coisa?'),
 ('pt-BR','graph-fact-unknown','Ainda não tenho informação suficiente para responder sobre {entity}. Você pode me ensinar algo?'),
 ('pt-BR','graph-attribute','Sobre {entity}, conheço esta informação de {attribute}: {values}.'),
 ('pt-BR','graph-class-location','Conheço estes {class} de {location}: {entities}.');
