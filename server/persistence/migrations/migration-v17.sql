-- v17: amplia catálogo de propriedades e descrição sonora. Sem alteração dos fatos.
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES
 ('pt-BR','property-sound-description','Em português, {entity} {values}.'),
 ('pt-BR','property-distribution','Sobre a distribuição geográfica de {entity}, sei que {values}.'),
 ('pt-BR','property-domestic','Sobre domesticação de {entity}, sei que {values}.'),
 ('pt-BR','property-prey','Sobre a alimentação predatória de {entity}, sei que {values}.');
INSERT OR IGNORE INTO semantic_predicate_phrases(property,predicate,template_text) VALUES
 ('distribution','distribuicao_geografica','ocorre em {value}'),
 ('distribution','distribuicao','é encontrado em {value}'),
 ('distribution','localizado_em','está localizado em {value}'),
 ('distribution','ocorre_em','ocorre em {value}'),
 ('domestic','domesticavel','é considerado domesticável: {value}'),
 ('domestic','domesticado','é domesticado: {value}'),
 ('prey','preda','pode predar {value}'),
 ('prey','predador_de','é predador de {value}');
