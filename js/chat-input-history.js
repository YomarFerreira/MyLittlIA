// Navegação do histórico de mensagens enviadas, sem acoplar à ordem visual do chat.
// Índice -1 = rascunho atual; 0 = última mensagem enviada.
export function createChatInputHistory() {
  let index = -1;
  let draft = '';
  const reset = () => { index = -1; draft = ''; };
  const navigate = (direction, messages, currentText) => {
    const sent = (messages || []).filter(item => item.role === 'user' && typeof item.content === 'string' && item.content.trim()).map(item => item.content).reverse();
    if (direction === 'up') {
      if (!sent.length) return null;
      if (index === -1) draft = currentText;
      index = Math.min(index + 1, sent.length - 1);
      return sent[index];
    }
    if (direction === 'down') {
      if (index === -1) return null;
      index--;
      return index === -1 ? draft : sent[Math.min(index, sent.length - 1)];
    }
    return null;
  };
  return { reset, navigate };
}
