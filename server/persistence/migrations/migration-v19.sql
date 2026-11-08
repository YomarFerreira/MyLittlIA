-- v19: aliases de conceitos por domínio, isolados das correções globais da v10.
-- Reusa entity_alias da v10 para siglas; novo léxico de CLASSES evita que
-- termos ambíguos como "time" alterem outras interpretações.
-- Aplicação única e INSERT OR IGNORE: não substitui ajustes pessoais.
CREATE TABLE IF NOT EXISTS semantic_concept_aliases (
 language TEXT NOT NULL DEFAULT 'pt-BR', domain TEXT NOT NULL DEFAULT 'entity_class',
 phrase TEXT NOT NULL, canonical TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),
 origin TEXT NOT NULL DEFAULT 'bootstrap', PRIMARY KEY(language,domain,phrase)
);
CREATE INDEX IF NOT EXISTS ix_semantic_concept_aliases_canonical
 ON semantic_concept_aliases(language,domain,canonical,active);
INSERT OR IGNORE INTO semantic_concept_aliases(language,domain,phrase,canonical) VALUES
 ('pt-BR','entity_class','clube de futebol','clube de futebol'),
 ('pt-BR','entity_class','clubes de futebol','clube de futebol'),
 ('pt-BR','entity_class','time de futebol','clube de futebol'),
 ('pt-BR','entity_class','times de futebol','clube de futebol'),
 ('pt-BR','entity_class','time','clube de futebol'),
 ('pt-BR','entity_class','times','clube de futebol'),
 ('pt-BR','entity_class','clube','clube de futebol'),
 ('pt-BR','entity_class','clubes','clube de futebol'),
 ('pt-BR','entity_class','equipe de futebol','clube de futebol'),
 ('pt-BR','entity_class','equipes de futebol','clube de futebol'),
 ('pt-BR','entity_class','equipe','clube de futebol'),
 ('pt-BR','entity_class','equipes','clube de futebol'),
 ('pt-BR','entity_class','agremiacao futebolistica','clube de futebol'),
 ('pt-BR','entity_class','agremiacoes futebolisticas','clube de futebol'),
 ('pt-BR','entity_class','mamifero','mamifero'),
 ('pt-BR','entity_class','mamiferos','mamifero'),
 ('pt-BR','entity_class','insetos','inseto'),
 ('pt-BR','entity_class','peixes','peixe'),
 ('pt-BR','entity_class','anfibios','anfibio'),
 ('pt-BR','entity_class','vertebrados','vertebrado'),
 ('pt-BR','entity_class','invertebrados','invertebrado'),
 ('pt-BR','entity_class','aves','ave'),
 ('pt-BR','entity_class','moluscos','molusco'),
 ('pt-BR','entity_class','animais marinhos','animal marinho'),
 ('pt-BR','entity_class','animais de agua doce','animal de agua doce');
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES
 ('pt-BR','graph-clubs-importance-unknown','Conheço estes clubes de futebol de {location}: {entities}. Entretanto, ainda não tenho um critério comprovado para afirmar quais são os principais. Posso listá-los, mas para classificá-los precisaria de dados comparáveis sobre títulos, torcida ou desempenho, com fonte e período.'),
 ('pt-BR','graph-class-importance-unknown','Conheço estes {class} de {location}: {entities}. Ainda não tenho dados comparáveis para afirmar quais são os principais.'),
 ('pt-BR','graph-class-no-results','Ainda não encontrei registros aprovados de {class} em {location}. Isso não significa que não existam.');
