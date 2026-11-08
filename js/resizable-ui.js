const DEFAULTS = [
  { selector: '#chat-panel', key: 'mylittlia.panel.chat.height.v2', min: 180, max: 900, defaultHeight: null },
  { selector: '#flow-panel', key: 'mylittlia.panel.flow.height', min: 220, max: 900, defaultHeight: 350 },
  { selector: '#generative-lab', key: 'mylittlia.panel.generative.height', min: 320, max: 1100, defaultHeight: 520 }
];

const EDGE_SIZE = 12;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isInteractiveElement(target, root) {
  if (!target || target === root) return false;
  return !!target.closest('button, a, input, textarea, select, label, summary, details');
}

function getClientY(event) {
  if (typeof event.clientY === 'number') return event.clientY;
  if (event.touches && event.touches[0] && typeof event.touches[0].clientY === 'number') return event.touches[0].clientY;
  return null;
}

function detectEdge(target, clientY) {
  const rect = target.getBoundingClientRect();
  const offsetY = clientY - rect.top;
  if (offsetY >= 0 && offsetY <= EDGE_SIZE) return 'top';
  if (offsetY >= rect.height - EDGE_SIZE && offsetY <= rect.height) return 'bottom';
  return null;
}

function updateHoverState(target, clientY) {
  target.classList.remove('resize-zone-top', 'resize-zone-bottom');
  if (clientY == null) return null;
  const edge = detectEdge(target, clientY);
  if (edge === 'top') target.classList.add('resize-zone-top');
  if (edge === 'bottom') target.classList.add('resize-zone-bottom');
  return edge;
}

function makeResizable(target, config) {
  if (!target) return;

  target.classList.add('resizable-target');
  const saved = Number(localStorage.getItem(config.key));
  const initial = Number.isFinite(saved) && saved > 0 ? saved : config.defaultHeight;
  if (initial !== null) target.style.height = `${clamp(initial, config.min, config.max)}px`;
  else target.style.height = 'auto';
  // O topo tem deslocamento próprio. Alterar apenas a altura moveria o rodapé.
  const initialMargin = parseFloat(getComputedStyle(target).marginTop) || 0;
  // Desconsidera deslocamentos persistidos por versões anteriores:
  // apenas a altura deve sobreviver ao redimensionamento.
  localStorage.removeItem(config.key + '.topOffset');
  let topOffset = 0;
  target.style.marginTop = '';

  let dragging = null;

  function beginDrag(edge, event) {
    const startY = getClientY(event);
    if (startY == null) return;
    dragging = {
      edge, startY,
      startHeight: target.getBoundingClientRect().height,
      startOffset: topOffset
    };
    target.classList.add('is-resizing');
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    event.preventDefault();
  }

  function handlePointerMove(event) {
    const clientY = getClientY(event);
    if (dragging) {
      if (clientY == null) return;
      const delta = clientY - dragging.startY;
      const rawHeight = dragging.edge === 'top'
        ? dragging.startHeight - delta
        : dragging.startHeight + delta;
      const nextHeight = clamp(rawHeight, config.min, config.max);
      target.style.height = `${nextHeight}px`;
      if (dragging.edge === 'top') {
        // Mesma alteração, com sinais opostos: a borda superior acompanha
        // o mouse e a borda inferior permanece na posição original.
        topOffset = dragging.startOffset + (dragging.startHeight - nextHeight);
        target.style.marginTop = `${initialMargin + topOffset}px`;
      }
      event.preventDefault?.();
      return;
    }
    updateHoverState(target, clientY);
  }

  function endDrag() {
    if (!dragging) return;
    const finalHeight = Math.round(target.getBoundingClientRect().height);
    localStorage.setItem(config.key, String(finalHeight));
    // Durante o arraste superior, o deslocamento mantém a borda inferior fixa.
    // Ao soltar, remove-se esse deslocamento e o painel volta ao fluxo normal,
    // mantendo a nova altura e o espaçamento original entre os painéis.
    topOffset = 0;
    target.style.marginTop = '';
    localStorage.removeItem(config.key + '.topOffset');
    dragging = null;
    target.classList.remove('is-resizing');
    target.classList.remove('resize-zone-top', 'resize-zone-bottom');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  function handlePointerDown(event) {
    if (isInteractiveElement(event.target, target)) return;
    const clientY = getClientY(event);
    if (clientY == null) return;
    const edge = detectEdge(target, clientY);
    if (!edge) return;
    beginDrag(edge, event);
  }

  target.addEventListener('mousemove', handlePointerMove);
  target.addEventListener('mouseleave', () => {
    if (!dragging) target.classList.remove('resize-zone-top', 'resize-zone-bottom');
  });
  target.addEventListener('mousedown', handlePointerDown);
  target.addEventListener('touchstart', handlePointerDown, { passive: false });
  document.addEventListener('mousemove', handlePointerMove);
  document.addEventListener('touchmove', handlePointerMove, { passive: false });
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchend', endDrag);
}

function initResizableAreas() {
  DEFAULTS.forEach(config => makeResizable(document.querySelector(config.selector), config));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initResizableAreas, { once: true });
} else {
  initResizableAreas();
}
