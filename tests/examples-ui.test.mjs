import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const script = readFileSync(new URL('../js/generative-ui.js', import.meta.url), 'utf8');
for (const expected of ["gen-examples-refresh').addEventListener", "gen-examples-incorporate').addEventListener", "async function refreshNeuralExamples()", "await examplesApi('/incorporate', { ids })"]) {
  assert.ok(script.includes(expected), `Sem implementação: ${expected}`);
}
for (const id of ['gen-examples-select-all','gen-examples-deselect-all']) {
  assert.ok(script.includes(`el('${id}').addEventListener`), `Sem ação: ${id}`);
}
console.log('OK: botões de consultar e incorporar têm ações registradas');
