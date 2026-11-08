-- v16: sons/vocalizações — somente linguagem; fatos continuam em knowledge_relations.
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text)
 VALUES ('pt-BR','property-sound','Sobre os sons de {entity}, sei que {values}.');
INSERT OR IGNORE INTO semantic_predicate_phrases(property,predicate,template_text) VALUES
 ('sound','som_emitido','emite {value}'),
 ('sound','emite_som','emite {value}'),
 ('sound','vocalizacao','produz {value}'),
 ('sound','vocaliza','faz {value}'),
 ('sound','onomatopeia','pode ser representado por {value}'),
 ('sound','faz_som','faz {value}');
