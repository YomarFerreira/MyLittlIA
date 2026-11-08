// Apresentação pura: a memória e a ordem cronológica no SQLite não são modificadas.
export const normalizeChatOrder = value => value === 'oldest' ? 'oldest' : 'newest';
export function groupChatTurns(messages) {
  const turns=[];
  for (const message of messages) {
    const last=turns.at(-1);
    if (message.role === 'assistant' && last?.at(-1)?.role === 'user') last.push(message);
    else turns.push([message]);
  }
  return turns;
}
export function orderedChatTurns(messages, order='newest') {
  const turns=groupChatTurns(messages);
  // A classificação troca a ordem dos pares, nunca a ordem pergunta -> resposta.
  return normalizeChatOrder(order)==='newest'?turns.reverse():turns;
}
export function parseChatTimestamp(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value !== 'string' || !value.trim()) return null;
  // Legado SQLite (segundos UTC) e novas datas ISO com milissegundos.
  const iso=/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)
    ? value.replace(' ','T')+'Z' : value;
  const date=new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}
export function formatChatTimestamp(value, locale='pt-BR', timeZone=undefined) {
  const date=parseChatTimestamp(value);
  if (!date) return 'Horário indisponível';
  const hasMilliseconds = value instanceof Date || typeof value === 'number' || (typeof value === 'string' && /(?:\.\d{1,}|[+-]\d{2}:\d{2})/.test(value) && /\.\d{1,}/.test(value));
  return new Intl.DateTimeFormat(locale,{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',...(hasMilliseconds?{fractionalSecondDigits:3}:{}),hour12:false,...(timeZone?{timeZone}:{})}).format(date).replace(',',' ·').replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/, '$1.$2');
}


// v0.30.11 — Apresentação das interações em cartões, no estilo pergunta + resposta.
// Não altera as mensagens ou sua ordem persistida no SQLite; usa textContent por segurança.
export function createChatTurnElement(turn, doc = globalThis.document) {
  const card = doc.createElement('article');
  card.className = 'chat-turn';
  card.setAttribute('aria-label', 'Interação da conversa');

  for (const message of turn) {
    const user = message.role === 'user';
    const section = doc.createElement('section');
    section.className = user ? 'chat-question' : 'chat-answer';
    section.setAttribute('aria-label', user ? 'Sua pergunta' : 'Resposta da MylittlIA');

    if (!user) {
      const heading = doc.createElement('div');
      heading.className = 'chat-answer-heading';
      const logo = doc.createElement('img');
      logo.className = 'chat-answer-mark';
      logo.src = './favicon.png';
      logo.alt = '';
      logo.setAttribute('aria-hidden', 'true');
      const name = doc.createElement('strong');
      name.textContent = 'MylittlIA';
      heading.append(logo, name);
      section.append(heading);
    }

    const content = doc.createElement('div');
    content.className = 'chat-text';
    content.textContent = message.content ?? '';

    const timestamp = doc.createElement('time');
    timestamp.className = 'chat-timestamp';
    timestamp.textContent = formatChatTimestamp(message.created_at);
    timestamp.title = 'Data e hora no fuso horário do navegador';
    const date = parseChatTimestamp(message.created_at);
    if (date) timestamp.dateTime = date.toISOString();

    const meta = doc.createElement('div');
    meta.className = 'chat-message-meta';
    if (user) {
      const speaker = doc.createElement('span');
      speaker.className = 'chat-speaker';
      speaker.textContent = 'Você';
      meta.append(speaker);
    }
    meta.append(timestamp);
    section.append(content, meta);
    card.append(section);
  }
  return card;
}
