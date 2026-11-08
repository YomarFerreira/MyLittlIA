-- Domínio implícito de métricas, sem cadastrar respostas ou alterar fatos.
CREATE TABLE ranking_metric_classes (
 metric TEXT NOT NULL REFERENCES ranking_metrics(metric),
 canonical_class TEXT NOT NULL,
 PRIMARY KEY(metric,canonical_class)
);
INSERT INTO ranking_metric_classes VALUES ('torcida','clube_de_futebol');
