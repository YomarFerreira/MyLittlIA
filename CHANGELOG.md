## v0.34.2 — 2026-11-08

- Relaciona perguntas sobre termos/qualificativos à resposta anterior do foco compartilhado.
- Acrescenta explicações de linguagem editáveis pela migration v29, separadas dos conhecimentos factuais.
- Usa a evidência de valor típico para explicar a formulação sem afirmar exceções não registradas.
- Validação: 91/91 testes aprovados e reprodução numa cópia da conversa real.
- Servidor ativo confirmado na v0.34.2 após backup; fatos e modelos preservados e integridade verificada.

## v0.34.1 — 2026-11-08

- Corrige as 15 falhas legadas e as regressões reveladas pela execução integrada, sem remover ou ignorar testes.
- Fecha conexões de teste em finally, atualiza expectativas obsoletas e utiliza fixture real do schema v9 nas verificações de migração.
- Corrige interpretação de ensinamentos, verificações contextuais, marcadores discursivos, pronomes e consultas interrogativas.
- Aplica e apresenta filtros efetivos de capitais e região; acrescenta teste que verifica os registros excluídos.
- Remove regras CSS antigas sobrescritas para o botão de cadastro.
- npm test executa a suíte completa: 90/90 testes aprovados. Sem nova migração ou alteração do banco pessoal.

## v0.34.0 — 2026-11-08

- Centraliza alterações de entidade, localidade, propriedade, quantidade, ordem, posição e operação em um gerenciador de foco persistente por conversa.
- Reconstrói consultas explícitas e reutiliza o foco na ortografia, em listagens, rankings, consultas relacionais, calendário e explicações.
- Mantém evidências para explicar a resposta anterior, preserva consultas sem dados e pede esclarecimento diante de ambiguidades/execuções não suportadas.
- Remove os resolvedores separados de continuação de comparação e localidade; mantém escolhas genéricas em dialogue-choices.js.
- Preserva mensagens originais, aprovação de ensinamentos, compatibilidade de estado e fatos existentes, sem nova migração.
- Verificação consolidada: 74/89 testes aprovados; permanecem 15 falhas legadas. API verificada em cópia do banco real.

## v0.33.1 — 2026-11-08

- Persiste foco das comparações, inclusive respostas sem medidas disponíveis.
- Continuação por localidade mantém classe, métrica e quantidade; impede reutilizar capital antiga ou atravessar outro assunto.
- Reproduz a sequência Paraíba → Pernambuco com três torcidas e valida outro domínio por velocidade.
- Protege numerais comuns de correções ortográficas indevidas; sem migração ou alteração de fatos.

## v0.33.0 — 2026-11-08

- Introduz interpretação de escolhas a partir das opções oferecidas, com seleção explícita, ordinal, exclusão e delegação.
- Remove a lista de palavras permitidas em torno de critérios; integra a pergunta reconstruída ao fluxo completo, incluindo rankings municipais.
- Anuncia o critério escolhido quando o usuário delega; preserva escopo e fala original.
- Testes de PIB, escolhas genéricas, qualquer opção, segunda opção, negativas e regressões de contexto; sem migração.

## v0.32.2 — 2026-11-08

- Interpreta escolhas naturais de critérios após uma pergunta de esclarecimento, preservando grupo e localidade.
- Usa aliases das métricas no SQLite em vez de enumerar critérios em uma expressão fixa no chat.
- Permite repetir uma escolha recente não compreendida, sem recuperar assuntos antigos ou aceitar escolhas negadas/ambíguas.
- Regressões de comparações, contexto e ortografia contextual verificadas; sem migração ou alterações no banco pessoal.

## v0.32.1 — 2026-11-08

- Integra contexto recente, entidades/classes explícitas e propriedade solicitada ao desempate de sugestões ortográficas.
- Prioriza a pergunta atual e descarta foco antigo após mudança de assunto; não força candidatos ortograficamente mais distantes.
- Expõe as evidências da sugestão no resultado da interpretação.
- Substitui a regra específica de “im” por uma verificação da posição gramatical do artigo.
- Acrescenta testes de ambiguidades, mudanças de contexto e confirmação sem aprendizado de fatos; sem migração ou alteração do banco pessoal.

## v0.32.0 — 2026-11-08

- Adiciona identidade compartilhada e aliases, com consolidação auditada no banco real após backup e validação numa cópia.
- Preserva 4.695 relações anteriores e 948 fatos tipados; acrescenta 28 vínculos de bandeiras e 54 aliases.
- Adiciona sugestão ortográfica com confirmação por conversa, persistência, rejeição e troca de assunto sem gravar fatos.
- Cadastro e importações SQL utilizam a mesma tabela de aliases; valores comuns não são substituídos indiscriminadamente.
- Testes consolidados: 68/83 aprovados; 15 falhas legadas permanecem. Testes novos e regressões afetadas passaram.

## v0.31.1 — 2026-11-08

- Resolve qualificadores de localidade antes de escolher entidades nas consultas genéricas. Um registro incidental estado_de_pernambuco não oculta Pernambuco.
- Regressão cobre troca de estados, cores e capital sem alterar conhecimentos existentes.

## v0.31.0 — 2026-11-08

- Organiza os módulos do servidor por responsabilidade e isola a adaptação de futebol.
- Agrupa schema e migrações em persistência; substitui 25 blocos repetidos por um executor transacional ordenado.
- Atualiza referências dos testes, importadores e scripts sem manter cópias obsoletas dos módulos.
- Preserva banco, modelos, conhecimentos, pesos e histórico SQL.
- Adiciona comando para executar todos os testes existentes e documenta limites arquiteturais.
- Validação: 63/78 testes existentes passaram; os 15 restantes também falham na cópia anterior. Teste adicional de migrações e inicialização HTTP isolada passaram.

## v0.30.19 — 2026-11-08

- Resolve o domínio implícito de “maior torcida” pelo catálogo de métricas.
- Preserva lugar e limite na pergunta e na escolha contextual do critério.
- Ajusta apresentação singular e fonte do primeiro resultado.
- Testes de variações, singular/plural, siglas, contexto e preservação dos fatos.

## v0.30.18 — 2026-11-08

- Lote 021: 117 clubes em 27 UFs e 528 registros com procedência, com lacunas explícitas.
- Exemplos de clubes vêm de uma seleção editorial por estado, em vez dos primeiros nomes disponíveis.
- Comparações preservam séries, períodos, unidades e recortes de pesquisas.
- Consultas distinguem receita, patrimônio líquido, valuation e passivo.
- Importação aditiva e idempotente, automática ao iniciar; proteção contra colisões entre clubes e municípios.
- Títulos e vices históricos separados; revisão do material auxiliar e ressalvas em contagens divergentes.
- Testes com cópia do banco real e preservação de todos os registros anteriores.

## v0.30.17 — 2026-11-08

- Separa a vocalização da representação escrita do som nas respostas.
- Remove “Em português” da descrição padrão.
- Migração preserva fatos e textos personalizados.
- Testes de atualização, respostas e preservação dos dados.

## v0.30.16 — 2026-11-08

- Extrai vocalizações e onomatopeias de explicações com múltiplas entidades.
- Mostra fatos de pendências antigas e aprova relações sem memorizar uma pergunta elíptica como resposta geral.
- Bloqueia aprovação sem entidade identificada e filtra perguntas antigas com pronome na recuperação geral.
- Consulta som e onomatopeia por relações; testes com cachorro, gato e vaca.

## v0.30.15 — 2026-11-08

- Recupera ensinamentos explícitos de quantidade de patas da conversa como propostas revisáveis.
- Preserva rejeições, evita propostas duplicadas e não usa falas da IA como fatos.
- Testes de isolamento, aprovação, recuperação e reprodução com cópia do banco real.

# Correção complementar de aprendizado — 2026-11-08

- Filtro estrito de quantidade de patas; atributos como penas não respondem à consulta.
- Ausência de quantidade aprovada é informada sem recorrer a outro atributo.
- Retomada explícita da pergunta sobre patas.
- Testes com atributos concorrentes, aprovação e conflitos.

## v0.30.14 — Rankings genéricos e Lote 020 (07/11/2026)

- Motor `server/comparative-ranking.js` identifica quantidade, classe, localidade e métrica através dos aliases do SQLite; respeita fonte, ano, unidade e competição. Sem inferência de números ausentes.
- Solicitações ambíguas (`3 maiores clubes`) pedem critério; continuação (`Por torcida`) retoma apenas o ranking imediatamente pendente.
- Comparações de torcida, valuation, receita, patrimônio, títulos por competição; mecanismo reutilizável em animais e unidades federativas quando houver dados tipados.
- Lista nacional de muitos clubes passa a mostrar uma amostra por UF, sem despejar centenas de nomes. Ordenação geográfica continua via relações aprovadas.
- Migração v23: catálogo de métricas/aliases/unidades (SQLite), rótulos das UFs; somente `CREATE`/`INSERT OR IGNORE`, sem alterar os registros anteriores.
- Lote 020: 30 valuations Sports Value 2025 e 17 preferências de torcida Datafolha 2026 (47 fatos novos). Importador idempotente com dry-run e controle de conflitos.
- Testes dirigidos de rankings, importação duplicada, isolamento de assuntos, consultas de clubes/cidades/animais e resultados reais dos lotes 017–020.

## v0.30.13 — Lote 019, propriedades e participações documentadas (07/11/2026)

- Acrescenta arquivo de dados e importador `imports/import-mylittlia-lote-019-futebol-brasil-2026.mjs` com `--dry-run`/`--apply`, importação idempotente e origem individual registrada.
- 401 fatos estruturados, municípios-sede, estádios, títulos, torcidas percentuais, balanços e participações por competição/temporada. Não confunde título com participação, nem receita com patrimônio líquido.
- Migration v22: fatos tipados, vocabulário de propriedades e nomes legíveis no SQLite; o banco antigo é preservado.
- Novo leitor `entity-facts.js` responde a atributos individuais e consultas de grupo por localização, sem fabricar dados faltantes. Respostas sobre períodos limitados informam a cobertura parcial.
- Validações dirigidas e regressões de contexto, layout, aprendizado e inferência geográfica.
- Histórico completo de temporadas e patrimônios da maioria dos clubes seguem explicitamente pendentes por insuficiência de dados individualmente confirmados.

## v0.30.12 — Inferência territorial a partir do grafo

- Consultas nacionais percorrem relações territoriais existentes sem importar conhecimentos novamente.
- Estados e Distrito Federal classificados como UFs brasileiras contribuem com associação virtual ao Brasil em tempo de consulta; nada é escrito em `knowledge_relations`.
- Consultas por UF, cidade e região usam o mesmo resolvedor com proteção contra ciclos e limite de profundidade.
- Listas não são rankings; consultas agrupadas de cores, títulos e faturamento cruzam atributos individuais já cadastrados, mostrando cobertura parcial sem inventar dados. Tamanho exige critério explícito.
- Migração v21 adiciona somente templates de resposta; não sobrescreve configurações pessoais.
- Testes de inferência nacional, duplicação, persistência e ausência de fabricação de atributos.

## v0.30.11 — Conversa por interações, estilo ChatGPT (07/11/2026)

- Substitui os balões separados tipo mensageria por **um cartão grande para cada pergunta + resposta**.
- Dentro do cartão, a pergunta aparece em balão amplo, alinhado à direita, e a resposta da MylittlIA vem logo abaixo **sem balão**.
- A classificação continua com as setas no cabeçalho e a preferência permanece no SQLite. **Recentes primeiro** agora inverte apenas a ordem dos cartões, sem inverter pergunta/resposta dentro deles.
- Data e hora de cada mensagem (com milissegundos quando registrados) permanecem visíveis em estilo discreto.
- A área de conversa mantém a rolagem interna, o redimensionamento do painel e o histórico recuperável após recarregar a página.
- A renderização usa `textContent` para evitar interpretar mensagens como HTML; sem mudanças no banco, em migrations, nos lotes, no treinamento ou no mecanismo de interpretação/contexto da v0.30.10.
- Acrescenta `npm run test:chat-layout` e adapta o teste legado de ordenação ao novo formato.

## v0.30.10 — Isolamento de assuntos e continuidade sem contaminação (03/11/2026)

- Corrige reutilização indevida do ranking municipal depois de perguntas de futebol: “E do Sport?” após “Quais as cores do Náutico?” consulta as cores do Sport, não a extensão territorial.
- Novo `server/dialogue-focus.js` resolve complementos a partir da pergunta imediatamente anterior e das entidades existentes no grafo, sem buscar uma pergunta antiga de outro domínio.
- Pedidos de títulos dos clubes consultam relações aprovadas e informam falta de registros suficientes, em vez de responder apenas “Ainda não sei”. Não inventa títulos.
- Perguntas como “E qual o maior deles?” sobre clubes solicitam critério de classificação (torcida, títulos, receita ou desempenho), sem inferir um maior a partir da lista de conhecidos.
- Migration v20 acrescenta exclusivamente templates de diálogo em `conversational_templates` com `INSERT OR IGNORE`, sem alterar o conhecimento pessoal, migrações antigas, pesos ou treinamentos.
- Proteção de contexto no `chat.js`: rankings municipais são usados apenas quando o turno anterior ainda pertence ao assunto municipal; mudança de tópico encerra o quadro de ranking persistido.
- Teste de diálogo integrado e regressões municipais, animais, vocalizações, clubes, aprendizado e ordenação. Testes legados com versão exata de migration foram tornados compatíveis com migrações futuras (`>=`).
- Limite: a resolução é conservadora, e “maior clube” não recebe ranking sem dados comparáveis. Não representa entendimento universal de todas as referências de linguagem.

## v0.30.9 — Equivalências linguísticas por classe e consulta contextual (03/11/2026)

- Reutiliza os aliases geográficos da v10 (`PE` → `Pernambuco`, `RJ` → `Rio de Janeiro`) na consulta bidirecional do grafo.
- Migration v19: `semantic_concept_aliases` mantém sinônimos classificados por domínio, separados das substituições lexicais globais; não altera fatos, pesos nem conhecimentos pessoais.
- Consulta genérica de entidades por classe e localização, abrangendo variações como `clube de futebol`, `times`, `equipes` e plurais; o mesmo mecanismo atende classes de animais quando houver relações `e_um` + `localizado_em`.
- Distingue `principais`/`melhores` (solicitação de ranking que exige critério) de uma lista de clubes existentes. Não inventa ranking.
- Normaliza também classes aprendidas na conversa: `time de futebol` e `clube de futebol` geram o mesmo `e_um` na proposta pendente, sem aprovação automática.
- Corrige consultas com marcadores conversacionais ("ok, e..."), siglas e locais compostos, inclusive quando o usuário omite o ponto de interrogação.
- Testes com SQLite temporário e com as 383 relações do Lote 018; nenhuma nova relação factual é inserida durante consultas.
- Limite: outras perguntas que não se encaixam em consulta classe + local ainda precisam de evolução da interpretação semântica geral. Não equivale à compreensão universal de sinônimos.

## v0.30.8 — Extração geográfica generalizada (03/11/2026)

- Corrige nomes de estados com preposições internas (Rio de Janeiro e Rio Grande do Norte).
- Consulta vocabulário de localidades e categorias no SQLite para separar classe e localização durante ensinamentos.
- Mantém a edição e aprovação antes da incorporação de relações.
- Acrescenta testes para ensinamentos de localidades com nomes compostos.

## v0.30.7 — Aprendizado conversacional estruturado (03/11/2026)
- Uma explicação declarativa pode originar várias propostas de relações, preservadas individualmente em `knowledge_proposals` e agrupadas por `batch_id`.
- Aprovação continua obrigatória; nenhuma proposta é incorporada automaticamente. O painel **Cadastrar conhecimento** permite corrigir sujeito, predicado, objeto, fonte URL e ano antes da aprovação.
- Nova tabela `relation_provenance` permite rastrear fonte e ano; a existência de uma fonte não implica validação automática da veracidade.
- `generalGraphAnswer` consulta relações nos dois sentidos, respondendo cores, localização, clubes por estado, clubes por cor, e biomas de entidades cadastradas, sem Q/A dedicada por clube.
- Regra de conflito para propriedades singulares (`localizado_em`, `fundado_em`, `tem_capital`), evitando sobrescrever fatos anteriores.
- Templates de prévia e respostas no SQLite, migration v18 incremental.
- Testes específicos: extração multirrelação, edição, aprovação, conflito, metadados e consultas; regressões de contexto e propriedades.
- Lote 017 separado: 18 relações institucionais e de geografia com fontes e referência temporal, importação idempotente via `imports`.
- Limitações: analisador de ensino ainda usa construções reconhecidas, não compreende todas as afirmações da língua portuguesa; não verifica fontes automaticamente; sem retreino neural.

## v0.30.6 — Recuperação contextual de múltiplos atributos e sons (03/11/2026)

- Generaliza a resolução do sujeito da conversa para perguntas com pronomes, em vez de mantê-la restrita a vocalizações.
- Permite consultar vocalizações como entidades independentes, recuperando onomatopeias do grafo sem associar automaticamente o som a um animal diferente.
- Amplia o repertório consultável: distribuição geográfica, domesticabilidade, predação e alimentação, aproveitando os predicados já presentes no catálogo animal.
- Evita a duplicação do verbo nos templates legados de bebida.
- Migration v17: somente novos templates e frases parametrizadas; preserva os dados e ajustes existentes.
- Novo teste integrado: mudança de animal, perguntas anafóricas sobre diferentes atributos, vocalizações e ausência de dados.
- Lote 016: 36 relações adicionais para conceitos de vocalização e onomatopeias representativas, importação idempotente por um arquivo na pasta imports.
- Limites: não substitui a necessidade de avaliar a exatidão biológica dos fatos importados, nem representa interpretação livre de qualquer linguagem natural.

## v0.30.5 — Sons de animais e continuidade por pronome

- Nova categoria semântica `sound` para consultas como “Qual som o cachorro faz?” e “Ele faz algum som?”.
- Anáfora de sujeito recuperada apenas da conversa atual e com predicados de som cadastrados, sem inventar valores.
- Migration v16: templates conversacionais e frases por predicado de som editáveis no SQLite.
- Reconhecimento de ensinamentos com verbos de vocalização; novas informações continuam pendentes de aprovação.
- Testes de contexto, troca explícita de entidade e personalização de templates.
- Lote 015 opcional, importável separadamente pelo procedimento habitual.

## v0.30.4 — Composição semântica a partir de predicados
- Novo `semantic-composer.js` para transformar valores e predicados em orações naturais sem fatos inventados.
- Migration v15 cria `semantic_predicate_phrases` (formas de expressão editáveis no SQLite); nenhuma alteração destrutiva.
- Características como `numero_patas_tipico=4` e `revestimento=pelos` passam a ser descritas como propriedades, não listas de objetos.
- Deduplicação de valores de características e manutenção das personalizações dos templates existentes nas outras categorias.
- Testes de composição, persistência, ausência de atributos, compatibilidade e fluxo de conversa.
- Limitações: flexão complexa e todas as possíveis relações do grafo ainda não estão cobertas; atributos sem padrão não são inventados.

## v0.30.3 — Histórico de mensagens pelo teclado
- Setas ↑ e ↓ no campo principal percorrem somente as mensagens enviadas pelo usuário na conversa atual, da mais recente à mais antiga.
- Ao descer após a mensagem mais recente, o rascunho anterior é restaurado.
- Não depende da ordenação visual do chat e é reiniciado em Nova conversa.
- Shift+Enter, Enter e navegação com modificadores permanecem preservados.
- Sem alterações no esquema SQLite.

## v0.30.2 — Classificação contextual baseada no grafo
- Perguntas como “E onde se encaixa o cachorro nestes grupos?” passam a consultar classificações explícitas `e_um` de `knowledge_relations`, depois de uma conversa sobre animais.
- Novo `contextual-classifications.js`: mantém apenas a referência contextual aos grupos, sem inventar fatos nem introduzir respostas específicas por espécie.
- Template `context-animal-classes` armazenado no SQLite pela migration v14, preservando edições existentes.
- Testes específicos e regressões de classificação, tópicos, elipses, propriedades e templates aprovados. Teste legado de ordenação v0.29.4 possui expectativa fixa da versão 11 e falha quando o banco está na versão 14; não indica uma falha constatada na ordenação.

## v0.30.1 — Consulta genérica de propriedades

- Novo `server/property-query.js` para consulta de propriedades por entidade no grafo SQLite.
- `migration-v13.sql` adiciona modelos conversacionais configuráveis (cor, alimentação, bebida, habitat, respiração, tamanho, locomoção, características, predadores, conservação).
- Inferência limitada à herança de atributos explicitamente cadastrados para uma classe.
- Não presume que propriedade ausente é falsa; preserva banco, pesos e templates personalizados.
- Testes em `tests/property-query-v0301.test.mjs`.
- Limitação: não há compreensão universal de linguagem natural; algumas formulações e relações compostas ainda exigem evolução.

## v0.30.0 — Primeira etapa da refatoração orientada a dados
- Migration v12: modelos de resposta conversacional no SQLite.
- Respostas de identidade, saudações, tempo, versão e resumo de assuntos renderizadas a partir do banco.
- Interpolação restrita de variáveis, sem execução de scripts; templates personalizáveis sem reinserção no reinício.
- Preserva classificadores e regras de interpretação atuais.
- Esta é a etapa inicial, não a migração de todos os textos existentes.

## v0.29.14 — Respostas naturais por assunto

- Resumos sobre animais agora são conversacionais e não exibem SQLite, números técnicos ou nomes internos das relações.
- Categorias e atributos citados são derivados das relações realmente presentes no banco.
- Contagens continuam disponíveis para o inspetor técnico.

## v0.29.13 — Consulta de conhecimento por assunto

- Perguntas como "O que vc sabe sobre animais?" e "Fale sobre mamífero" agora consultam diretamente o SQLite e apresentam categorias, quantidades, atributos e exemplos realmente cadastrados.
- Contagem sem duplicar entidades que pertencem a várias categorias. Não confunde dados importados com aprendizagem neural ou verificação externa.
- Teste específico com dados do Lote 013 (90 entidades, 1.116 relações), além dos testes de contexto v0.29.11/v0.29.12.
- Nenhuma migração ou modificação nos dados do usuário.

## v0.29.12 — Consultas relacionais e classificação
- Marcadores de discurso como “então” não bloqueiam perguntas relacionais diretas.
- Perguntas sobre classificação consultam relações e_um/caracteristica no SQLite, sem respostas negativas inventadas.
- Testes de regressão para sequência de animais e herbivoria.


## v0.29.11 — Contexto relacional e definições
- Impede tratar perguntas completas como complemento de uma relação anterior.
- Interpreta "E um gato?" após uma definição como consulta sobre uma nova entidade, sem reaproveitar o verbo "bebe".
- Evita repetir propriedades equivalentes na composição de definições (ex.: rosa/rosada).
- Acrescenta teste de regressão `tests/context-topic-v02911.test.mjs`.
- Mantém SQLite e migrations existentes sem alteração.

## v0.29.10 — Consulta pontual de indicadores municipais
- Consulta PIB, população e área de município nomeado usando as mesmas relações SQLite dos rankings.
- Não reaproveita o estado de um ranking anterior quando a pergunta cita explicitamente outra cidade.
- Mantém ano de referência dos dados e não inventa valores ausentes.
- Inclui teste contextual Paraíba → Recife, sem alterar o banco pessoal.

## v0.29.9 — Continuidade de rankings geográficos
- Reconhece complementos naturais como "população" e "e extensão vc sabe?".
- Recupera a pergunta original que menciona as cidades, sem confundir o critério anterior com a pergunta-base.
- Não cria dados numéricos: rankings usam somente medidas ligadas ao município/estado e presentes no SQLite.
- Teste de regressão incluído.

## v0.29.8 — Perguntas sobre a própria MylittlIA
- Responde o que faz, qual sua finalidade e para que serve, inclusive em perguntas de continuidade como “e o que você faz?”.
- Reconhece perguntas sobre criação e autoria, sem inventar fatos não comprovados.
- Identidade e metadados têm prioridade sobre os planejadores genéricos.
- Testes para essas perguntas; dados SQLite e checkpoints preservados.

## v0.29.7 — Precisão temporal sem milissegundos fictícios
- Registros legados sem frações de segundo aparecem até os segundos, sem `.000` artificial.
- Mensagens novas continuam gravadas em ISO UTC com milissegundos reais do relógio do servidor.
- A resposta recebe timestamp estritamente posterior ao da pergunta, mesmo em execuções no mesmo milissegundo.
- Testes de renderização de registros legados e precisão dos novos registros.

## v0.29.6 — Controles independentes de ordenação
- Substitui a seta única por dois chevrons compactos (para cima/para baixo), lado a lado, no padrão discreto da interface.
- A seta para cima seleciona recentes primeiro; para baixo seleciona antigas primeiro.
- Indicação visual e acessível da opção selecionada, com persistência no SQLite e restauração ao reabrir.
- Mantém a ordenação por mensagens com precisão de milissegundos, sem alterar o banco de conversas.

## v0.29.5 — Direção do chat, precisão temporal e botão de retorno
- Direção recentes primeiro (↓): a resposta da IA aparece acima da pergunta; antigas primeiro (↑): pergunta acima da resposta. A ordem de gravação permanece intacta.
- Novas mensagens gravadas no SQLite com data UTC em ISO 8601 e milissegundos; horários exibem segundos e milissegundos. Registros antigos permanecem inalterados (precisão histórica de segundos).
- Controle de ordem substituído por botão de seta com preferência persistente.
- Botão amarelo transferido de “Cadastrar conhecimento” para “← Voltar à conversa”.

## v0.29.4 — Ordenação de conversa persistente e data/hora
- Seleção entre recentes primeiro e antigas primeiro, com preferência armazenada no SQLite (migration v11).
- Pergunta e resposta agrupadas em qualquer ordenação; interação mais recente no alto quando habilitada.
- Horário local de cada mensagem, baseado na data/hora UTC persistida, inclusive na restauração.
- Testes de agrupamento, formatação e persistência. Sem alterar o contexto da IA.

## v0.29.3 — Campo de mensagem e estatísticas do conjunto
- Envio limpa o campo e devolve o foco; em caso de erro restaura o texto; bloqueia envios duplicados.
- Média, mediana e posições centrais calculadas a partir do SQLite, sem fatos numéricos fixos no código.
- Complementos contextuais “E a média?”, “E a mediana?” e “E a do meio?” persistem no mesmo estado semântico.
- Preserva seleção de período e ressalvas sobre cobertura parcial; não confunde cidade do meio com mediana numérica.
- Sem nova migration; sem alterações nos dados ou pesos treinados.

# Histórico de alterações

## v0.29.2 — Canonicalização de entidades geográficas (2026-11-02)
- Corrige consultas quando uma entidade aparece como "estado de Pernambuco" mas as relações de municípios usam a chave canônica "pernambuco".
- O resolvedor elimina o prefixo descritivo somente quando reconhece o identificador canônico no SQLite.
- Não modifica medidas, relações, pesos ou históricos; atualização somente do interpretador.
- Teste de regressão reproduz pergunta + complemento "Extensão", com relação histórica "estado de pernambuco".


## v0.29.1 — Correção das migrations no treinamento (2026-11-02)
- Evita o erro `no such table: intent_training_samples` ao iniciar o treinamento antes de atualizar o schema.
- Novo `npm run db:migrate` executa migrations pendentes com a rotina já utilizada pelo aplicativo; não recria o banco e não retreina.
- O modo de prévia do treinamento continua somente leitura e apresenta uma orientação clara quando a migration v10 estiver faltando.
- O modo `--apply` aplica migrations pendentes antes de ler as amostras e treinar os pesos de intenção.
- Teste automatizado com banco v9, prévia, migração, treinamento e preservação dos conhecimentos.
- Ajustada a versão inicial de exibição no HTML; cabeçalho e rodapé seguem sincronizados pela API.

## v0.29.0 — Catálogo linguístico e corpus neural no SQLite (2026-11-02)
- Migração aditiva v10 com cinco tabelas de dados linguísticos (termos, entidades, pistas sociais, respostas sociais, amostras rotuladas).
- Normalização, aliases de UF, nomes/acento e respostas sociais do núcleo passam a consultar o SQLite.
- Treinamento do classificador neural continua feito do zero, agora lendo exemplos ativos do banco; retreinamento somente por comando explícito.
- Preserva pesos antigos e dados do usuário, sem importação/retreinamento automático recorrente.
- Novo teste para alteração de termos/nomes/respostas no SQLite sem mudar JavaScript.
- Outros módulos legados ainda possuem frases e regras codificadas, a migração é incremental.

## v0.28.4 — Feedback de raciocínio e consultas nacionais por população

- Comentários como "mas você já tem os dados, compare-os" são tratados como **orientações sobre a estratégia de resposta**, não como fatos ou ensinamentos a avaliar de 0 a 100.
- A expressão "cidade mais populosa" agora define automaticamente o critério **população**, sem solicitar esclarecimento desnecessário.
- Consultas por população de municípios do Brasil podem reunir medidas individuais associadas a UFs diferentes, em um mesmo grupo de período. Resultados parciais são identificados como parciais, sem afirmar um líder nacional absoluto.
- Quando existem apenas nomes ou exemplos de municípios populosos, a MylittlIA explica por que esses dados não bastam para calcular um ranking nacional; dados estaduais não são confundidos com populações municipais.
- Uma sugestão do usuário não altera relações aprovadas, pesos, avaliações ou pendências de conhecimento, e preserva o contexto semântico da conversa.
- Novo teste de regressão: `tests/reasoning-feedback-v0284.test.mjs`.

## v0.28.3 — Validação dupla e auditoria de ensinamentos (2026-11-02)
- Antes de registrar um ensinamento: descarta mensagens que são apenas saudação, confirmação ou nova pergunta.
- Antes de aprovar: impede a aprovação de não-fatos claros e exige confirmação explícita em casos suspeitos.
- Auditoria sob demanda de todos os ensinamentos pendentes antigos, sem excluir nem alterar dados automaticamente.
- Sinalização visual de pendências suspeitas na área Cadastrar conhecimento; botões para aprovar/rejeitar mantidos.
- Botão Cadastrar conhecimento destacado em amarelo, como Treinar a MylittlIA.
- Nenhuma migration: análise calculada a partir dos registros existentes, sem alterar pesos ou checkpoints.

## v0.28.2 — Elipses relacionais e ampliação controlada de conhecimento
- Novo `server/ellipsis-resolver.js`: mantém o assunto e a relação da pergunta anterior para interpretar complementos como “E leite?”, “E água?” e “E o cachorro?”.
- Distingue mudança de sujeito de mudança de objeto com apoio nas relações aprovadas; não presume que ausência de evidência significa negação.
- Persiste o contexto no `conversation_semantic_state` já existente; nenhuma migration nova.
- Mapa lexical adicional com termos comuns em inglês (`city`, `state`, `population`) e continuidade de ranking por local (“E no RJ?”).
- Novo importador `imports/import-conhecimentos-v0282.mjs`, com simulação sem gravação e importação idempotente de relações sobre capitais, regiões, cidades selecionadas, animais, bebidas e cores.
- Arquivo `imports/knowledge-topics-v0282.json` contém as relações e suas fontes; dados não comprovados individualmente ficam identificados como conhecimentos introdutórios.
- Nenhuma importação automática na instalação. Nenhum dado ou peso manual existente é substituído.

## v0.28.1 — Correção da continuidade de consultas numéricas
- Interpreta “Extensão” e “População” isoladas como respostas ao esclarecimento pendente, sem roteá-las para recuperação textual de conhecimentos antigos.
- Preserva critério, sentido maior/menor e posição do ranking entre mensagens; permite trocar a entidade explicitamente (“E a menor cidade do RJ?”).
- Responde às perguntas sobre a própria solicitação de esclarecimento sem confundi-las com nova consulta/ensinamento.
- Corrige reconhecimento de “maiores/menores” no plural.
- Teste de regressão com a sequência real de Pernambuco → extensão → menor → RJ → população → explicação.
- Sem mudanças de schema; todos os dados existentes permanecem intactos.

## v0.28.0 — Núcleo de compreensão e planejamento semântico
- Nova orquestração semântica em `server/semantic-core.js`, com múltiplas intenções e sinal auxiliar do classificador neural próprio.
- Normalização de variantes e correção ortográfica conservadora para propriedades conhecidas; nomes de exibição centralizados em `server/proper-names.js`.
- Ambiguidade de ranking tratada antes da consulta; estado persistido no SQLite por conversa, com atualizações de entidade, propriedade, operação, ordenação e posição.
- Resolução de localização regional apoiada em `knowledge_relations` e validação de resultados fundamentados; perguntas não suportadas continuam nos módulos anteriores.
- Validador de resposta do núcleo (`server/response-validator.js`): bloqueia resultados de ranking com medida/entidade incompatível e verifica a origem de capitais/localizações.
- Migração **v9** aditiva, sem regravar conhecimentos, pesos ou históricos.
- Inspetor simples e técnico atualizados para exibir como a consulta foi interpretada.
- Teste de regressão com saudação, grafia incorreta de “capital”, Amapá/Macapá, clarificação de “maior”, “E a menor?”, “Em extensão”, segunda posição e retorno após saudação.
- Não adiciona LLM pré-treinada. Não converte resultados do gerador experimental em respostas factuais.

## v0.27.2 — Medição de tempo no fluxo
- Remove avanço visual artificial de 700 ms por camada; resultado aparece assim que a execução real termina.
- Mostra tempos efetivamente medidos nas etapas locais e sinaliza etapas do servidor sem medição isolada.
- Trace exportado registra duração total observada no navegador e duração das chamadas HTTP, sem inventar tempos de servidor.
- O fluxo é um inspetor de operações mistas, não um pipeline sequencial único: os tempos locais não devem ser somados à duração total.

## v0.27.1 — Identidade visual da MylittlIA
- Favicon e marca do cabeçalho usam o símbolo de cérebro com circuitos escolhido para o projeto.
- Arquivos PNG e ICO otimizados, servidos pelo Node.js.
- Versão sincronizada com o `package.json`, sem alterar conhecimento, banco ou modelos treinados.

## v0.27.0 — Núcleo neural de intenções treinado do zero
- Classificador próprio com n-gramas de caracteres, uma camada oculta ReLU (28 unidades) e saída softmax para seis intenções.
- Treinamento supervisionado por SGD em exemplos de saudações, tempo, localização, fatos, ensino e outros.
- Checkpoint persistido em `neural_intent_models` (migration v8) sem sobrescrever pesos ou relações anteriores.
- Classificação rastreável no resultado (`neuralIntent`: candidatos e pontuações), preservando os mecanismos determinísticos quando aplicáveis.
- Saudações não literais podem ser reconhecidas sem cadastrar todas as frases.
- Complementos temporais como “E amanhã que horas serão a esta hora?” podem usar relógio e contexto anterior.
- O modelo não gera respostas livres, não conhece fatos por treinamento nem constitui um Transformer; as pontuações não são probabilidades calibradas.

## v0.26.3 — Calendário e continuidade temporal
- Interpretação contextual de amanhã, ontem, depois de amanhã e anteontem.
- Cálculos de datas futuras/passadas, dias até o Natal, próxima ocorrência de dia da semana e dia da semana de data informada.
- Uso do fuso configurado, sem criar conhecimentos artificiais no SQLite.
- Trace das operações disponível no inspetor.
- Testes de regressão e viradas de mês/ano.

## v0.26.2 — Prioridade de intenção no ensino conversacional
- Saudações e perguntas novas não são mais capturadas como conteúdo de ensino após um convite de ajuda.
- Registro de ensino exige afirmação reconhecível, lista estruturada ou explicação substantiva.
- Preserva o fluxo de aprovação no SQLite e adiciona testes de regressão.

## v0.26.1
- Consultas geográficas de localização por relações explícitas, mesmo sem peso manual.
- Resposta positiva rastreável; ausência de relação não produz negação inventada.

## v0.26.0
- Respostas de saudação e informações sobre a MylittlIA, versão, data e hora em tempo real.
- Resumo de assuntos e quantidades recuperado do SQLite.
- Uso conservador de avaliações automáticas em caminhos inferenciais, mantendo pesos manuais e exceções.
- Novos testes de identidade, relógio e peso efetivo.

## v0.25.0 — Avaliação de evidências e revisão por exceção
- Simulação e avaliação em lote das relações, sem sobrescrever pesos manuais.
- Registro independente de pontuação automática, status e justificativa no SQLite (migration v7).
- Identificação de possíveis conflitos em propriedades de valor único e de relações sem evidência suficiente.
- Filtros de revisão na área de treinamento.
- Não há verificação automática de fatos pela internet; a avaliação não equivale à probabilidade de veracidade.

## v0.24.5
- Campo "Ensine algo à MylittlIA" ampliado para até 70% do painel, sem alterar o botão "Analisar frase".
- Ajuste responsivo para telas estreitas.

## v0.24.4 — Atalho de envio no chat
- Enter envia a mensagem no campo principal; Shift+Enter insere uma quebra de linha.
- Respeita composição de texto (IME) e botão Enviar desabilitado; demais campos não são afetados.

## v0.24.3
- Rodapé simplificado: MylittlIA Lab · Laboratório de LLM experimental (Little Language Model) · versão.
- Cabeçalho, rodapé e título da aba são sincronizados pela mesma versão servida a partir de package.json via /api/version.
- Nenhuma alteração de inferência, SQLite ou modelos neurais.

## v0.24.2
- Exportar trace JSON movido para o canto inferior direito do painel Fluxo entre camadas.
- Removido o selo Híbrido · regras + neural do cabeçalho.
- Mantida a exportação funcional, ativa somente quando houver trace.

- Marca visual (favicon) adicionada antes do nome MylittlIA Lab no cabeçalho.
<!-- Ajuste de apresentação da v0.24.1: cabeçalho e subtítulo atualizados. -->
## v0.24.1 — Identidade e versão da interface
- Cabeçalho alterado para “Laboratório experimental de IA”.
- Versão obtida de package.json via /api/version; alinhamento do título, log do servidor e interface.
- Adicionado favicon SVG da MylittlIA, servido pelo servidor HTTP.
- Sem alterações no banco SQLite ou nos modelos.

## v0.24
- Motor de linguagem separado do motor de inferência para rankings numéricos.
- Respostas naturais com ressalvas compreensíveis, mantendo o cálculo original no trace.
- Nenhuma alteração no banco, modelos ou pesos.

## v0.23.5 — Operações sobre conjuntos
- Interpretação de ordinais (primeiro a décimo) em rankings numéricos.
- Limites explícitos de listas (como cinco maiores).
- Filtros numéricos por limite, diferenças e vizinhos em listas ordenadas.
- Complemento contextual “não deixe nenhuma de fora” para exibir todos os registros disponíveis, sem ocultar divergências de período.
- Aviso quando os dados são parciais ou não comparáveis temporalmente.
- Testes de regressão para ordinais e inclusão de períodos.

## v0.23.4
- Perguntas no singular (maior/menor cidade ou município) usam o ranking numérico real e retornam o primeiro resultado, sem afirmar cobertura total.
- Corrige conflito entre o interpretador numérico e a resposta genérica de falta de ranking.

## v0.23.3
- Rankings com múltiplos períodos agora escolhem o grupo com mais municípios distintos (desempate: ano mais recente), sem misturar anos.
- Medidas sem ano formam um grupo separado e podem compor ranking indicativo, sempre identificado como não datado.
- A resposta informa quantos registros ficaram de fora. Nenhuma migração ou alteração do banco.

## v0.23.2
- Diferencia medidas sem ano de medidas com anos conflitantes em rankings.
- Exclui registros sem ano quando existe um único ano explícito; informa quantos foram excluídos.
- Permite ranking indicativo quando todas as medidas estão sem ano, com ressalva clara.
- Não modifica dados SQLite nem pesos existentes.

## v0.23.1
- Resposta de ensino em linguagem natural, sem referência a aprovações ou telas internas.
- Área Cadastrar conhecimento: lista de pendências, seleção individual, selecionar/desmarcar todos, aprovar e rejeitar.
- Separação entre cadastro manual e revisão de ensinamentos.

## v0.23
- Extração de medidas municipais em listas ensinadas, na aprovação de conhecimento.
- Relações numéricas e vínculos territoriais sem sobrescrever pesos ou valores conflitantes.
- Validação de listas numéricas no laboratório gerativo de palavras.
- Sem dados ou pesos SQLite embutidos no pacote.

## v0.22.1 — Correção do ensino contextual
- Aceita respostas com listas após “Você pode me ajudar a aprender sobre esse assunto?”.
- Vincula a pendência ao assunto das maiores cidades e ao critério contextual.
- Repetição do mesmo contexto informa pendência de aprovação.
- Filtros curtos não são confundidos com uma aula.
- Teste de regressão específico.

## v0.22 — 2026-11-01
- Consultas numéricas dinâmicas de área, população e PIB municipais a partir de relações SQLite.
- Ordenação de municípios vinculados ao mesmo estado; classificação parcial e indicação do ano de referência.
- Reexecução de consultas com complementos como “em extensão” usando o contexto já existente.
- Rastreabilidade numérica para inspeção técnica e tratamento explícito de dados ausentes/incompatíveis.
- Sem novos dados importados nem alterações no esquema existente.

## v0.21.0 — Contexto semântico conversacional
- Memória semântica derivada do histórico persistido no SQLite.
- Esclarecimento de “maiores cidades” por população, área ou PIB.
- Complementos de consulta: extensão, população, ano, capitais e Nordeste.
- Inspetor simples e técnico com atualização do contexto.
- Nenhuma migração, banco de dados ou checkpoint incluído na distribuição.

# Histórico de alterações — MylittlIA Lab

Este documento consolida as notas mantidas anteriormente em `README.md`, `README-v0.19.md` e `README-v0.20.md`. As versões abaixo refletem funcionalidades documentadas, não garantias de interpretação livre ou de aprendizado neural automático.

## v0.20.1 — Layout da conversa
- O painel de mensagens passa a acompanhar a altura da área externa quando redimensionado, reduzindo o espaço vazio.
- Sem alteração nas estruturas de conhecimento ou treinamento.

## v0.20 — Interpretador semântico relacional
- Reconhecimento inicial de aliases selecionados, incluindo `Rio` → `Rio de Janeiro` e siglas de algumas UFs, priorizando entidades disponíveis.
- Consultas a propriedades importadas: capitais, cores de bandeiras, municípios populosos/metropolitanos de referência, praias, economia, indústrias, empresas, área, população e fronteiras.
- Comparação de populações estaduais apenas com o mesmo ano de referência.
- Exemplos de municípios não são apresentados como rankings oficiais; rankings municipais não disponíveis não são inventados.
- Mantém ensino conversacional e rastreia relações utilizadas (`path`). Sem migration nova.
- Limite: aliases e padrões de intenção selecionados, sem interpretação neural livre e sem cobertura irrestrita de filtros e rankings.

## v0.19 — Ensino conversacional com aprovação
- Ao desconhecer a resposta, a IA oferece a possibilidade de ser ensinada.
- A explicação é registrada como pendente, não como fato aprovado nem como atualização de pesos neurais.
- Propostas aparecem em **Treinar a MylittlIA → Relações e aprendizado por conversa** para aprovação ou rejeição.
- Perguntas repetidas antes da aprovação recebem uma resposta específica.
- Migration v6: tabela `conversational_teachings`, sem apagar o banco existente.

## v0.18.2 — Cores de bandeiras
- Consulta de cores da bandeira de Pernambuco por relações `bandeira_de_pernambuco → possui → cor` existentes no SQLite.
- Importador: `imports/import-brasil-geografia.mjs` (`--dry-run` e `--apply`). A instalação não importa fatos automaticamente.

## v0.18.1 — Descrições naturais e relações animais
- Definições podem combinar classificação e até três propriedades pertinentes, como cor típica ou características estruturais.
- Preserva relações e pesos rastreados; pesos ausentes não recebem pontuações inventadas.
- Dataset de relações em `imports/animal-relations.tsv`; importação explícita via `npm run import:animals`.
- Importações preservam pesos já atribuídos e evitam duplicações de relações.

## v0.18 — Inferência relacional ponderada
- Percorre cadeias `e_um` limitadas a cinco relações, com prevenção de ciclos e até 40 caminhos.
- Exemplo: `flamingo → e_um → ave` + `ave → possui → penas` permite inferir a posse de penas se as premissas existirem.
- Classifica caminhos pelo produto dos pesos avaliados, mantendo pontuação desconhecida quando alguma avaliação faltar.
- O trace mostra relações, pesos, caminhos alternativos e origem; não grava automaticamente conclusões derivadas.

## v0.17.3 — Ajustes de altura e leitura
- Conversa retorna à altura natural por padrão, evitando espaços vazios causados por altura persistida excessiva.
- Setas do inspetor preservam o ponto de leitura mesmo quando a altura do conteúdo varia.

## v0.17.2 — Navegação do inspetor
- Setas anterior/próximo trocam a camada sem rolagem automática.
- Clicar em uma camada do fluxo continua levando ao inspetor.

## v0.17 — Telas separadas
- Tela de conversa mantém chat, fluxo de nove camadas, inspetor, métricas e recuperação contextual.
- Botão amarelo **Treinar a MylittlIA** abre área de ensino com conhecimentos, relações e laboratórios neurais.
- **Voltar à conversa** mantém o estado da aplicação.

## Versões anteriores
- Evoluções anteriores incluem SQLite como persistência, treinamento neural de intenções, geradores por caracteres e palavras, memória de conversas, exemplos e recuperação de conhecimentos.
- Este histórico detalhado foi consolidado a partir da documentação disponível no pacote v0.20.1. Não são inventadas notas de versões anteriores que não constavam desses arquivos.