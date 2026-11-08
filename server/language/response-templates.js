// Interpolação controlada: somente variáveis fornecidas pelo motor, sem executar código.
export function renderConversationalTemplate(db, key, vars={}) {
  const row = db.prepare(`SELECT template_text FROM conversational_templates
    WHERE language='pt-BR' AND template_key=? AND active=1`).get(key);
  if (!row) return null;
  const names=[...row.template_text.matchAll(/\{([a-z][a-z0-9_]*)\}/g)].map(m=>m[1]);
  if (names.some(name=>!Object.hasOwn(vars,name))) return null;
  return row.template_text.replace(/\{([a-z][a-z0-9_]*)\}/g,(_,name)=>String(vars[name]));
}
