import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
assert.match(html, /Para corrigir ou atualizar algo que me ensinou/);
assert.doesNotMatch(html, /banco SQLite|armazenados no navegador/i);
assert.doesNotMatch(app, /Aguardando banco SQLite/);
console.log('Interface: mensagens amigáveis verificadas.');
