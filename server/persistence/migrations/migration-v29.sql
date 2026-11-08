-- Explicações de linguagem, separadas dos fatos sobre entidades.
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES
('pt-BR','wording:normalmente','“{word}” indica uma característica típica; não afirma que cada indivíduo foi observado. A expressão, por si só, não comprova que existam exceções.'),
('pt-BR','wording:tipico','“{word}” descreve uma característica representativa, não a verificação de cada caso individual.'),
('pt-BR','wording:tipica','“{word}” descreve uma característica representativa, não a verificação de cada caso individual.'),
('pt-BR','wording:parcial','“{word}” indica que a resposta cobre os registros disponíveis, sem garantir cobertura completa do conjunto real.'),
('pt-BR','wording:estimativa','“{word}” indica um valor estimado, não uma contagem exata.'),
('pt-BR','wording:comparaveis','“{word}” indica que os valores foram selecionados segundo critérios compatíveis; a expressão não garante que os dados sejam completos.'),
('pt-BR','wording:aproximadamente','“{word}” indica que o valor foi apresentado com aproximação, não como igualdade exata.'),
('pt-BR','wording-typical-evidence','Usei esse qualificativo porque o registro consultado descreve uma característica típica. Não consultei um indivíduo específico nem identifiquei uma exceção nesta resposta.');
