-- Modelos de classificação contextual; personalizações anteriores são preservadas.
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text)
VALUES ('pt-BR','context-animal-classes','Pelo que aprendi, {entity} pertence aos seguintes grupos: {classes}. Quer saber alguma característica dele?');
