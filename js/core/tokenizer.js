// Tokenizador didático: palavras, números e pontuação. Não é BPE/WordPiece.
export function tokenize(text) {
  return text.normalize('NFC').match(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*|\p{N}+(?:[.,]\p{N}+)*|[^\s]/gu) ?? [];
}
export function buildVocabulary(tokens) {
  const unique = [...new Set(tokens.map(t => t.toLocaleLowerCase('pt-BR')))];
  return Object.fromEntries(unique.map((token, index) => [token, index + 1]));
}
