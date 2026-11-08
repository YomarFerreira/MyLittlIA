import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const nav = app.slice(app.indexOf("renderInspector($('inspector')"), app.indexOf('async function run()'));
assert.ok(nav.includes('onPrevious:'));
assert.ok(nav.includes('onNext:'));
assert.ok(!nav.includes('scrollIntoView'), 'Setas não devem mover a página');
assert.ok(app.includes("panel.scrollIntoView({behavior:'smooth',block:'start'})"), 'Clique em uma camada deve continuar rolando até o inspetor');
console.log('Navegação do inspetor validada.');
