-- v21: templates nacionais para inferência geográfica multi-hop.
-- Apenas apresenta conclusões obtidas a partir de relações aprovadas.
-- Não modifica nenhuma relação, peso ou treinamento anterior.
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES
 ('pt-BR','graph-clubs-country','No Brasil, conheço estes clubes de futebol: {entities}. Esta lista inclui somente os clubes cadastrados.'),
 ('pt-BR','graph-class-country','No Brasil, conheço estes {class}: {entities}. Esta lista inclui somente os registros cadastrados.'),
 ('pt-BR','graph-clubs-country-importance-unknown','No Brasil, conheço estes clubes de futebol: {entities}. Ainda não tenho indicadores comparáveis para afirmar quais são os principais; títulos, torcida, receita ou desempenho exigem dados e período de referência.'),
 ('pt-BR','graph-class-country-importance-unknown','No Brasil, conheço estes {class}: {entities}. Não posso ordená-los por importância sem um critério e dados comparáveis.'),
 ('pt-BR','graph-group-size-ambiguous','Para comparar o tamanho de {class} em {location}, preciso saber o critério: torcida, receita, patrimônio, títulos ou outro indicador?'),
 ('pt-BR','graph-group-property-unavailable','Conheço {count} registros de {class} em {location}, mas ainda não encontrei informações cadastradas de {property} desses registros. Não posso deduzir esses valores apenas pela localização.'),
 ('pt-BR','graph-group-property-known','Sobre {class} em {location}, encontrei registros de {property} para {available} de {count}: {values}. Restam {uncovered} sem dados dessa propriedade; esta lista é parcial, não é um ranking.'),
 ('pt-BR','graph-group-property-ranking-insufficient','Encontrei registros de {property} para apenas {available} de {count} {class} em {location}: {values}. Não posso estabelecer um ranking sem dados comparáveis, período e cobertura suficientes.');
