-- v12: modelos de resposta conversacional configuráveis; sem modificar dados existentes.
CREATE TABLE IF NOT EXISTS conversational_templates (
  language TEXT NOT NULL DEFAULT 'pt-BR',
  template_key TEXT NOT NULL,
  template_text TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  origin TEXT NOT NULL DEFAULT 'bootstrap',
  PRIMARY KEY(language,template_key)
);
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES ('pt-BR','greeting','Olá! Como posso ajudar você hoje?');
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES ('pt-BR','gratitude','Por nada! Quando precisar, estou por aqui.');
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES ('pt-BR','farewell','Até mais! Foi bom conversar com você.');
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES ('pt-BR','clock','Agora são {time}, no fuso {timezone}.');
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES ('pt-BR','date','Hoje é {date}.');
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES ('pt-BR','version','Estou na versão v{version} da MylittlIA Lab.');
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES ('pt-BR','origin-unverified','Sei que sou a MylittlIA Lab, mas não tenho uma data de criação nem autoria confirmadas. Posso usar uma informação sobre minha origem quando ela for aprovada e registrada como conhecimento.');
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES ('pt-BR','capabilities','Sou uma inteligência artificial experimental e didática. Posso conversar, consultar conhecimentos que me ensinaram, fazer algumas inferências e mostrar etapas do processamento. Ainda estou aprendendo.');
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES ('pt-BR','identity','Sou a MylittlIA, uma pequena inteligência artificial experimental. Consigo conversar, consultar conhecimentos que me ensinaram e fazer algumas inferências. Ainda tenho limitações e continuo evoluindo.');
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES ('pt-BR','learning-status','Estou estudando com o que você me ensina. Tenho {relations} relações e {knowledge} perguntas e respostas disponíveis na memória.{topics} Também tenho {examples} exemplos de treinamento e {pending} informações aguardando revisão. Ter dados guardados não significa que eu saiba responder tudo sobre eles.');
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES ('pt-BR','learning-topics',' Tenho relações sobre temas como {topics}.');
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES ('pt-BR','topic-animals','Sei que existem diversos grupos de animais{categories}.{learning} Você pode me perguntar sobre um animal específico. Quem sabe eu já tenha aprendido alguma coisa sobre ele!');
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES ('pt-BR','topic-category','Conheço alguns animais classificados como {category}.{learning} Pergunte sobre um deles ou sobre alguma de suas características. Talvez eu consiga ajudar!');
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES ('pt-BR','topic-learning','Também tenho aprendido sobre {attributes}.');
