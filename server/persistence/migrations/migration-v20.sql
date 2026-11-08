-- v20: respostas sobre continuidade conversacional orientadas por dados.
-- Sem alteração de conhecimentos; preserva templates editados anteriormente.
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES
 ('pt-BR','focus-property-unavailable','Ainda não tenho informações sobre {property} de {entity}. Isso não significa que a informação não exista; apenas não está cadastrada entre os conhecimentos que consigo consultar.'),
 ('pt-BR','focus-club-titles-unavailable','Conheço estes clubes de futebol de {location}: {entities}. Entretanto, ainda não tenho os títulos registrados de forma suficiente para informar suas conquistas ou classificá-los por importância.'),
 ('pt-BR','focus-club-titles-known','Sobre os títulos destes clubes, tenho registrado: {titles}. Essa relação não estabelece, por si só, quais são os maiores.'),
 ('pt-BR','focus-ranking-criteria','Para dizer qual é o maior entre esses {subject}, preciso de um critério: torcida, títulos, receita ou desempenho? Sem indicadores comparáveis e um período de referência, não posso escolher um como o maior.'),
 ('pt-BR','focus-ambiguous-entity','Sobre {entity}, você gostaria de saber as cores, a localização, a fundação ou outra característica? Não vou reaproveitar um critério de outro assunto.');
