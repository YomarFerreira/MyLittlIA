-- v13: modelos de resposta genérica a propriedades, preservando personalizações.
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES ('pt-BR','property-color','Sobre {entity}, conheço estas informações de cor: {values}.');
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES ('pt-BR','property-food','Sobre a alimentação de {entity}, sei que: {values}.');
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES ('pt-BR','property-drink','{entity} bebe {values}.');
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES ('pt-BR','property-habitat','Sobre onde {entity} vive, tenho registrado: {values}.');
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES ('pt-BR','property-breathing','Sobre a respiração de {entity}, conheço: {values}.');
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES ('pt-BR','property-size','Sobre as medidas de {entity}, conheço: {values}.');
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES ('pt-BR','property-movement','Sobre a locomoção de {entity}, conheço: {values}.');
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES ('pt-BR','property-features','Sobre as características de {entity}, conheço: {values}.');
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES ('pt-BR','property-predators','Sobre os predadores ou presas relacionados a {entity}, conheço: {values}.');
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES ('pt-BR','property-conservation','Sobre a conservação de {entity}, tenho registrado: {values}.');
