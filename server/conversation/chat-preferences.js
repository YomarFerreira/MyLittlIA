// A ordenação do chat é uma preferência de apresentação, não altera a ordem do histórico.
export const CHAT_ORDERS = Object.freeze(['newest', 'oldest']);
export function getChatOrder(db) {
  const record = db.prepare("SELECT value FROM app_preferences WHERE key='chat.order'").get();
  return CHAT_ORDERS.includes(record?.value) ? record.value : 'newest';
}
export function setChatOrder(db, order) {
  if (!CHAT_ORDERS.includes(order)) throw Object.assign(new Error('Ordem de conversa inválida.'), {status:400});
  db.prepare(`INSERT INTO app_preferences(key,value) VALUES ('chat.order',?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP`).run(order);
  return getChatOrder(db);
}
