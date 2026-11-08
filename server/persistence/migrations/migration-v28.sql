-- Stable entity identities, explicit aliases and auditable reconciliation.
CREATE TABLE entity_identities (
 entity_id TEXT PRIMARY KEY,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE entity_aliases (
 alias TEXT PRIMARY KEY,
 canonical_id TEXT NOT NULL REFERENCES entity_identities(entity_id),
 origin TEXT NOT NULL,
 CHECK(alias<>canonical_id)
);
CREATE TABLE entity_resolution_audit (
 id INTEGER PRIMARY KEY,
 relation_id TEXT NOT NULL,
 original_subject TEXT NOT NULL,
 original_object TEXT NOT NULL,
 canonical_subject TEXT NOT NULL,
 canonical_object TEXT NOT NULL,
 operation TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO entity_identities(entity_id) SELECT DISTINCT subject FROM knowledge_relations;
-- Only aliases supported by the geographic classification or existing lexicon.
INSERT OR IGNORE INTO entity_aliases(alias,canonical_id,origin)
 SELECT 'estado_de_'||subject,subject,'geographic-classification'
 FROM knowledge_relations WHERE predicate='e_um' AND object IN ('estado_brasileiro','unidade_federativa_brasileira');
INSERT OR IGNORE INTO entity_aliases(alias,canonical_id,origin)
 SELECT 'cidade_de_'||subject,subject,'geographic-classification'
 FROM knowledge_relations WHERE predicate='e_um' AND object='municipio';
INSERT OR IGNORE INTO entity_aliases(alias,canonical_id,origin)
 SELECT 'municipio_de_'||subject,subject,'geographic-classification'
 FROM knowledge_relations WHERE predicate='e_um' AND object='municipio';
INSERT OR IGNORE INTO entity_aliases(alias,canonical_id,origin)
 SELECT replace(t.phrase,' ','_'),replace(t.canonical,' ','_'),'semantic-lexicon'
 FROM semantic_terms t JOIN entity_identities e ON e.entity_id=replace(t.canonical,' ','_')
 WHERE t.active=1 AND t.kind='entity_alias'
 AND replace(t.phrase,' ','_')<>replace(t.canonical,' ','_')
 AND NOT EXISTS (SELECT 1 FROM entity_identities other WHERE other.entity_id=replace(t.phrase,' ','_'));
INSERT INTO entity_resolution_audit(relation_id,original_subject,original_object,canonical_subject,canonical_object,operation)
 SELECT r.id,r.subject,r.object,coalesce(s.canonical_id,r.subject),coalesce(o.canonical_id,r.object),'migration-28'
 FROM knowledge_relations r LEFT JOIN entity_aliases s ON s.alias=r.subject LEFT JOIN entity_aliases o ON o.alias=r.object AND r.predicate IN ('localizado_em','fica_em','municipio_de','pertence_a','tem_capital','cidade_sede','tem_bandeira')
 WHERE s.alias IS NOT NULL OR o.alias IS NOT NULL;
UPDATE knowledge_relations SET
 subject=coalesce((SELECT canonical_id FROM entity_aliases WHERE alias=subject),subject),
 object=CASE WHEN predicate IN ('localizado_em','fica_em','municipio_de','pertence_a','tem_capital','cidade_sede','tem_bandeira') THEN coalesce((SELECT canonical_id FROM entity_aliases WHERE alias=object),object) ELSE object END;
-- Direct SQL importers use the same identity map as the application.
CREATE TRIGGER canonical_relation_insert AFTER INSERT ON knowledge_relations
 WHEN EXISTS (SELECT 1 FROM entity_aliases WHERE alias=NEW.subject OR (alias=NEW.object AND NEW.predicate IN ('localizado_em','fica_em','municipio_de','pertence_a','tem_capital','cidade_sede','tem_bandeira')))
 BEGIN
 INSERT INTO entity_resolution_audit(relation_id,original_subject,original_object,canonical_subject,canonical_object,operation)
 VALUES (NEW.id,NEW.subject,NEW.object,coalesce((SELECT canonical_id FROM entity_aliases WHERE alias=NEW.subject),NEW.subject),CASE WHEN NEW.predicate IN ('localizado_em','fica_em','municipio_de','pertence_a','tem_capital','cidade_sede','tem_bandeira') THEN coalesce((SELECT canonical_id FROM entity_aliases WHERE alias=NEW.object),NEW.object) ELSE NEW.object END,'insert');
 UPDATE knowledge_relations SET subject=coalesce((SELECT canonical_id FROM entity_aliases WHERE alias=NEW.subject),NEW.subject),object=CASE WHEN NEW.predicate IN ('localizado_em','fica_em','municipio_de','pertence_a','tem_capital','cidade_sede','tem_bandeira') THEN coalesce((SELECT canonical_id FROM entity_aliases WHERE alias=NEW.object),NEW.object) ELSE NEW.object END WHERE id=NEW.id;
 END;
CREATE TRIGGER canonical_relation_update AFTER UPDATE OF subject,object ON knowledge_relations
 WHEN EXISTS (SELECT 1 FROM entity_aliases WHERE alias=NEW.subject OR (alias=NEW.object AND NEW.predicate IN ('localizado_em','fica_em','municipio_de','pertence_a','tem_capital','cidade_sede','tem_bandeira')))
 BEGIN
 INSERT INTO entity_resolution_audit(relation_id,original_subject,original_object,canonical_subject,canonical_object,operation)
 VALUES (NEW.id,NEW.subject,NEW.object,coalesce((SELECT canonical_id FROM entity_aliases WHERE alias=NEW.subject),NEW.subject),CASE WHEN NEW.predicate IN ('localizado_em','fica_em','municipio_de','pertence_a','tem_capital','cidade_sede','tem_bandeira') THEN coalesce((SELECT canonical_id FROM entity_aliases WHERE alias=NEW.object),NEW.object) ELSE NEW.object END,'update');
 UPDATE knowledge_relations SET subject=coalesce((SELECT canonical_id FROM entity_aliases WHERE alias=NEW.subject),NEW.subject),object=CASE WHEN NEW.predicate IN ('localizado_em','fica_em','municipio_de','pertence_a','tem_capital','cidade_sede','tem_bandeira') THEN coalesce((SELECT canonical_id FROM entity_aliases WHERE alias=NEW.object),NEW.object) ELSE NEW.object END WHERE id=NEW.id;
 END;

DELETE FROM entity_identities WHERE entity_id IN (SELECT alias FROM entity_aliases);
CREATE TRIGGER register_relation_identity AFTER INSERT ON knowledge_relations BEGIN
 INSERT OR IGNORE INTO entity_identities(entity_id) VALUES (coalesce((SELECT canonical_id FROM entity_aliases WHERE alias=NEW.subject),NEW.subject));
END;

CREATE VIEW entity_resolution_conflicts AS
 SELECT subject,predicate,count(DISTINCT object) AS distinct_values,group_concat(DISTINCT object) AS values_found
 FROM knowledge_relations
 WHERE predicate IN ('tem_capital','fundado_em','numero_patas_tipico')
 GROUP BY subject,predicate HAVING count(DISTINCT object)>1;
-- A state and its flag are distinct entities linked explicitly.
INSERT OR IGNORE INTO knowledge_relations(id,subject,predicate,object,source_type)
 SELECT 'identity-flag:'||f.entity_id,p.entity_id,'tem_bandeira',f.entity_id,'legacy'
 FROM entity_identities f JOIN entity_identities p ON f.entity_id='bandeira_de_'||p.entity_id
 WHERE NOT EXISTS (SELECT 1 FROM knowledge_relations r WHERE r.subject=p.entity_id AND r.predicate='tem_bandeira' AND r.object=f.entity_id);
