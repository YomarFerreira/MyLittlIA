/**
 * A preferência do inspetor pertence à interface, não ao processamento da IA.
 * Ela permanece ativa enquanto o usuário navega entre as camadas.
 */
let selectedInspectorView = 'simple';

/** Explicações didáticas para as nove etapas do pipeline. */
const explanations = [
  {
    title: 'Recebendo sua pergunta',
    analogy: 'É como alguém recebendo uma carta: primeiro precisamos ter a mensagem em mãos.',
    action: step => `A MylittlIA recebeu exatamente este texto: “${step.input}”. Ainda não tentou descobrir o significado.`,
    result: 'A pergunta inteira foi encaminhada para ser dividida em pequenas partes.'
  },
  {
    title: 'Separando o texto em pedacinhos',
    analogy: 'Imagine separar uma frase escrita em peças de um quebra-cabeça.',
    action: step => `Encontramos ${step.output?.tokens?.length ?? 0} pedacinhos (tokens): ${(step.output?.tokens ?? []).map(t => `“${t}”`).join(', ')}. Cada um recebeu um número de identificação.`,
    result: 'A próxima etapa recebe esses números, e não apenas a frase escrita.'
  },
  {
    title: 'Transformando os pedacinhos em números',
    analogy: 'É como trocar nomes por coordenadas em um mapa.',
    action: step => step.mode === 'neural-real' ? `Cada palavra recebeu um grupo de ${step.output?.[0]?.embedding?.length ?? 0} números aprendido durante os treinamentos. ${step.output?.length ?? 0} pedaços foram examinados. ${step.output?.filter(t=>!t.known).length ?? 0} não existiam no vocabulário e usaram um vetor genérico.` : 'Ainda não há um modelo por palavras treinado disponível. Por isso não mostramos números inventados.',
    result: 'Enviamos os grupos de números para a próxima etapa.'
  },
  {
    title: 'Juntando as informações numéricas',
    analogy: 'É como calcular a média das notas de uma turma para ter um resumo.',
    action: step => step.mode === 'neural-real' ? `O modelo juntou os vetores das ${step.output?.contextTokens?.length ?? 0} posições que consegue observar. É como colocar cartões em sequência, preservando a ordem.` : 'Os vetores do modelo não estavam disponíveis nesta execução.',
    result: 'O conjunto numérico segue para o cálculo de probabilidades. Isso ainda não significa entender a pergunta inteira.'
  },
  {
    title: 'Calculando pontuações',
    analogy: 'Imagine um jogo de completar frases: a rede tenta adivinhar qual palavra viria em seguida. Ela ainda não está procurando a resposta certa.',
    action: step => step.mode === 'neural-real' ? `Após ler sua mensagem, o modelo experimental calculou a chance de cada palavra ser a próxima no texto. Isso NÃO é uma lista de respostas à pergunta. Por isso, pode aparecer uma palavra como “gato” mesmo quando você perguntou sobre uma capital.` : 'Não houve previsão real porque o modelo por palavras não estava disponível.',
    result: 'Os cálculos exatos, as palavras previstas e o trecho utilizado estão em Detalhes técnicos. A resposta da conversa foi buscada separadamente na memória.'
  },
  {
    title: 'Procurando o assunto da pergunta',
    analogy: 'É como um atendente que tenta descobrir se você está perguntando sobre animais, cidades ou outra coisa.',
    action: step => step.output?.semantic?.parser?.startsWith('semantic-core')
      ? (() => {
          const m=step.output.semantic;
          const changes=(m.corrections||[]).map(x=>`“${x.original}” como “${x.corrected}”`);
          const correction=changes.length?` Considerei ${changes.join(' e ')} uma possível correção de escrita.`:'';
          if(m.pendingClarification) return `Entendi o assunto, mas encontrei mais de uma maneira de responder. Pedi que você escolhesse o critério antes de consultar os conhecimentos.${correction}`;
          if(m.contextBefore?.operation==='ranking' && m.contextAfter?.operation==='ranking') return `Lembrei que estávamos comparando cidades. Mantive o lugar e atualizei o que você pediu, sem precisar recomeçar.${correction}`;
          return `Reconheci ${m.intents?.length || 1} tipo(s) de intenção na mensagem e procurei o assunto correspondente.${correction}`;
        })()
      : step.output?.semantic?.contextAfter
      ? `Você completou uma pergunta anterior. Eu recuperei o assunto “${step.output.semantic.contextReference ?? step.output.semantic.entity ?? 'anterior'}” e atualizei ${Object.entries(step.output.semantic.appliedChanges ?? {}).map(([campo,valor]) => `${campo}: ${valor}`).join(', ')}. Não precisei pedir que repetisse toda a pergunta.`
      : step.output?.semantic?.entity
      ? `Identifiquei uma pergunta sobre “${step.output.semantic.intent}” relacionada a “${step.output.semantic.entity}”. Procurei o conhecimento pela entidade, e não por uma frase idêntica.`
      : `A análise por regras identificou a intenção “${step.output?.intent ?? 'não identificada'}”. Também procurou nomes, ações e características no texto.`,
    result: step => step.output?.semantic?.contextAfter ? 'A próxima etapa recebeu a consulta organizada. Quando faltou uma informação importante, pedi esclarecimento em vez de adivinhar.' : 'O resultado é uma hipótese baseada em padrões escritos no código, não uma interpretação neural.'
  },
  {
    title: 'Usando o que a rede neural aprendeu',
    analogy: 'Como alguém que praticou com exemplos e ficou melhor em reconhecer tipos de perguntas.',
    action: step => `Um classificador treinado sugeriu que a pergunta é do tipo “${step.output?.label ?? 'não identificada'}”. O modelo gerador também pode prever palavras, mas ainda não escolhe a resposta desta conversa.`,
    result: 'Ela aprendeu a classificar intenções, mas NÃO aprendeu a resposta da pergunta nem criou uma frase.'
  },
  {
    title: 'Escolhendo de onde virá a resposta',
    analogy: 'É como procurar uma informação em um caderno de anotações antes de responder.',
    action: step => step.output?.semanticRecovery?.kind === 'semantic-knowledge'
      ? `Encontrei o conhecimento pela intenção e pela entidade. Pergunta originalmente cadastrada: “${step.output.semanticRecovery.matchedQuestion}”.`
      : step.output?.semanticRecovery?.path?.length
        ? `Encontrei ${step.output.semanticRecovery.path.length} relação(ões) ligadas entre si: ${step.output.semanticRecovery.path.map(e => `${e.subject.replaceAll("_", " ")} → ${e.predicate.replaceAll("_", " ")} → ${e.object.replaceAll("_", " ")}`).join("; ")}. Usei essas informações para chegar à resposta, sem cadastrar uma conclusão nova.`
      : step.output?.knowledge
      ? 'Encontramos uma resposta que alguém cadastrou explicitamente na base de conhecimentos.'
      : step.output?.matchedRule
        ? 'Encontramos uma regra previamente escrita no programa para responder.'
        : 'Não encontramos conhecimento confiável para responder.',
    result: 'Esta escolha ainda depende de conhecimentos e regras cadastrados, não de geração neural.'
  },
  {
    title: 'Mostrando a resposta',
    analogy: 'É como entregar a resposta depois de consultar as anotações disponíveis.',
    action: step => `A resposta apresentada é: “${step.output?.answer ?? 'Não disponível'}”.`,
    result: step => step.output?.knowledgeSource === 'explicit-user-record'
      ? 'Origem: conhecimento informado por uma pessoa, não aprendido pelos pesos da rede.'
      : step.output?.knowledgeSource === 'built-in-rule'
        ? 'Origem: regra já escrita no programa, não aprendizado neural.'
        : ['graph-definition','graph-inference','inferred-relation','explicit-relation'].includes(step.output?.knowledgeSource)
          ? 'Origem: relações do conhecimento já armazenado, combinadas por regras. Os pesos orientam a seleção, mas não provam que a informação é verdadeira.'
          : 'Origem: nenhuma resposta confiável foi encontrada.'
  }
];

const operationNames = {
  simulated: 'Simulação didática',
  real: 'Cálculo executado de verdade',
  illustrative: 'Cálculo com números ilustrativos',
  'rule-based': 'Regra programada',
  'neural-real': 'Cálculo real com pesos aprendidos',
  unavailable: 'Modelo ainda não disponível'
};

function paragraph(label, value) {
  const box = document.createElement('div');
  box.className = 'lesson-part';
  const heading = document.createElement('h4');
  heading.textContent = label;
  const text = document.createElement('p');
  text.textContent = value;
  box.append(heading, text);
  return box;
}

/** Renderiza explicação simples e dados técnicos sem executar código do usuário. */
export function renderInspector(container, step, index, navigation = {}) {
  container.replaceChildren();
  const lesson = explanations[index] ?? explanations[0];
  const tabs = document.createElement('div');
  tabs.className = 'inspector-tabs';
  const simple = document.createElement('button');
  simple.type = 'button';
  simple.textContent = 'Explicação simples';
  const technical = document.createElement('button');
  technical.type = 'button';
  technical.textContent = 'Detalhes técnicos';
  const body = document.createElement('div');
  body.className = 'inspector-content';
  body.setAttribute('role', 'region');
  body.setAttribute('aria-label', 'Conteúdo explicativo da camada');

  function show(view) {
    selectedInspectorView = view;
    simple.classList.toggle('selected', view === 'simple');
    technical.classList.toggle('selected', view === 'technical');
    simple.setAttribute('aria-pressed', String(view === 'simple'));
    technical.setAttribute('aria-pressed', String(view === 'technical'));
    body.replaceChildren();
    if (view === 'simple') {
      const heading = document.createElement('h3');
      heading.className = 'lesson-title';
      heading.textContent = `Camada ${index + 1} — ${lesson.title}`;
      body.append(
        heading,
        paragraph('Pense assim', lesson.analogy),
        paragraph('O que aconteceu com sua pergunta?', lesson.action(step)),
        paragraph('O que passou para a próxima etapa?', typeof lesson.result === 'function' ? lesson.result(step) : lesson.result),
        paragraph('Que tipo de operação é esta?', operationNames[step.mode] ?? step.mode)
      );
    } else {
      for (const [label, value] of [
        ['Tipo de operação', `${operationNames[step.mode] ?? step.mode} (${step.mode})`],
        ['Explicação técnica', step.explanation],
        ['Entrada', step.input],
        ['Saída', step.output],
        ['Plano semântico — intenções, correções e contexto', step.output?.semantic ? {interpretador:step.output.semantic.parser,intencoes:step.output.semantic.intents || [step.output.semantic.intent],entidade:step.output.semantic.entity,propriedade:step.output.semantic.property,operacao:step.output.semantic.operation,ordenacao:step.output.semantic.order,posicao:step.output.semantic.position,correcoes:step.output.semantic.corrections || [],esclarecimentoPendente:step.output.semantic.pendingClarification || null,antes:step.output.semantic.contextBefore || null,depois:step.output.semantic.contextAfter || null,sinalNeural:step.output.semantic.neuralSignal || null} : 'Não houve plano semântico nesta etapa.'],
        ['Duração medida (ms)', step.durationMs]
      ]) {
        const section = document.createElement('section');
        section.className = 'kv';
        const title = document.createElement('h3');
        title.textContent = label;
        const pre = document.createElement('pre');
        pre.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
        section.append(title, pre);
        body.append(section);
      }
    }
  }
  simple.onclick = () => show('simple');
  technical.onclick = () => show('technical');
  // Navegação compacta: botões de ícone com nomes acessíveis.
  const navigationGroup = document.createElement('div');
  navigationGroup.className = 'inspector-navigation';

  function navigationButton(direction, enabled, callback, availableTitle) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `inspector-nav inspector-${direction}`;
    // Ícones vetoriais inline: sem fontes externas ou dependências de rede.
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '17');
    svg.setAttribute('height', '17');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', direction === 'previous'
      ? 'M19 12H5m7 7-7-7 7-7'
      : 'M5 12h14m-7-7 7 7-7 7');
    svg.append(path);
    button.append(svg);
    button.setAttribute('aria-label', direction === 'previous' ? 'Camada anterior' : 'Próxima camada');
    button.title = enabled ? availableTitle : 'Esta camada ainda não está disponível';
    button.disabled = !enabled;
    button.addEventListener('click', () => callback?.());
    return button;
  }

  navigationGroup.append(
    navigationButton('previous', navigation.canGoPrevious, navigation.onPrevious, 'Ver camada anterior'),
    navigationButton('next', navigation.canGoNext, navigation.onNext, 'Ver próxima camada')
  );
  tabs.append(simple, technical, navigationGroup);
  container.append(tabs, body);
  container.classList.remove('empty');
  show(selectedInspectorView);
}
