// v0.17 — Alterna entre conversar e ensinar sem destruir componentes existentes.
// A mudança de tela preserva o estado, o histórico e os controles já inicializados.
const main = document.querySelector('main.shell');
const sections = Array.from(main.children).filter(element => element.tagName === 'SECTION');
const trainingIds = new Set(['knowledge-panel','relations-panel','training-panel','generative-lab']);
const conversationView = document.createElement('div');
conversationView.id = 'conversation-view';
conversationView.className = 'mylittlia-view';
const trainingView = document.createElement('div');
trainingView.id = 'training-view';
trainingView.className = 'mylittlia-view';
trainingView.hidden = true;

for (const section of sections) {
  (trainingIds.has(section.id) ? trainingView : conversationView).appendChild(section);
}
const footer = main.querySelector('footer');
main.insertBefore(conversationView,footer);
main.insertBefore(trainingView,footer);

const actions = document.createElement('div');
actions.className = 'training-entry';
const trainButton = document.createElement('button');
trainButton.id = 'open-training';
trainButton.className = 'training-entry-button';
trainButton.type = 'button';
trainButton.textContent = '🎓 Treinar a MylittlIA';
const pendingCount = document.createElement('span');
pendingCount.id = 'pending-knowledge-count';
pendingCount.className = 'pending-knowledge-count';
pendingCount.hidden = true;
trainButton.appendChild(pendingCount);
let examplePending = 0;
let chatPending = 0;
function updatePendingBadge() {
  const count = examplePending + chatPending;
  pendingCount.hidden = count === 0;
  pendingCount.textContent = `${count} pendente${count === 1 ? '' : 's'}`;
  trainButton.classList.toggle('has-pending-knowledge', count > 0);
  document.getElementById('open-pending-review')?.classList.toggle('has-pending-knowledge', count > 0);
  trainButton.title = count ? `${count} conhecimentos aguardando revisão` : '';
}
window.addEventListener('mylittlia:pending-examples', event => {
  examplePending=Math.max(0,Number(event.detail?.count)||0);updatePendingBadge();
});
window.addEventListener('mylittlia:pending-conversation-teachings', event => {
  chatPending=Math.max(0,Number(event.detail?.count)||0);updatePendingBadge();
});
actions.appendChild(trainButton);
conversationView.appendChild(actions);

const trainingHeader = document.createElement('section');
trainingHeader.className = 'panel training-view-header';
trainingHeader.innerHTML = '<div><span class="eyebrow">ÁREA DE ENSINO</span><h2>Treinar a MylittlIA</h2><p class="hint">Ensine conhecimentos, consulte exemplos e acompanhe o treinamento neural.</p></div>';
const pendingReviewButton = document.createElement('button');
pendingReviewButton.id = 'open-pending-review';
pendingReviewButton.type = 'button';
pendingReviewButton.className = 'secondary review-entry-button';
pendingReviewButton.textContent = 'Cadastrar conhecimento';
trainingHeader.appendChild(pendingReviewButton);
const backButton = document.createElement('button');
backButton.id = 'back-to-chat';
backButton.className = 'training-entry-button';
backButton.type = 'button';
backButton.textContent = '← Voltar à conversa';
trainingHeader.appendChild(backButton);
trainingView.prepend(trainingHeader);

function showView(view) {
  const isTraining = view === 'training';
  conversationView.hidden = isTraining;
  trainingView.hidden = !isTraining;
  trainButton.setAttribute('aria-expanded', String(isTraining));
  window.scrollTo({top: 0, behavior: 'instant'});
}
trainButton.addEventListener('click', () => showView('training'));
backButton.addEventListener('click', () => showView('conversation'));
pendingReviewButton.addEventListener('click', () => {
  showView('training');
  const panel = document.getElementById('pending-review-panel');
  panel?.scrollIntoView({behavior:'smooth',block:'start'});
  window.dispatchEvent(new Event('mylittlia:open-pending-review'));
});

// Atalhos de consulta agora aparecem no alto da área de ensino.
const knowledgePanel = document.getElementById('knowledge-panel');
const labPanel = document.getElementById('generative-lab');
const shortcuts = document.createElement('div');
shortcuts.className = 'training-shortcuts';
shortcuts.innerHTML = '<strong>Ir para</strong>';
for (const [label, target] of [
  ['Cadastrar conhecimento', document.getElementById('pending-review-panel')],
  ['Conhecimentos', knowledgePanel],
  ['Exemplos e memória', document.getElementById('gen-examples-details')],
  ['Treinamento neural', labPanel]
]) {
  if (!target) continue;
  const button = document.createElement('button');
  button.className = 'secondary';
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', () => {
    if (target.tagName === 'DETAILS') target.open = true;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  shortcuts.appendChild(button);
}
trainingHeader.after(shortcuts);
