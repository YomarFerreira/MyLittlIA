-- Atualiza apenas o texto padrão anterior; preserva personalizações.
UPDATE conversational_templates
SET template_text='{sound_description}. Esse som pode ser representado por “{representations}”.'
WHERE language='pt-BR' AND template_key='property-sound-description'
AND template_text='Em português, {entity} {values}.';
INSERT OR IGNORE INTO conversational_templates(language,template_key,template_text) VALUES
('pt-BR','property-sound-representation','{entity} pode ser representado por “{representations}”.'),
('pt-BR','sound-action-latido','{entity} late'),
('pt-BR','sound-action-miado','{entity} mia'),
('pt-BR','sound-action-mugido','{entity} muge'),
('pt-BR','sound-action-grasnido','{entity} grasna'),
('pt-BR','sound-action-relincho','{entity} relincha'),
('pt-BR','sound-action-uivo','{entity} uiva');
