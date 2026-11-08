// Interpretador semântico didático: padrões explícitos, NÃO uma LLM.
const normalize = text => text.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const facts = {
  gato: { drink: 'água', food: 'ração própria para gatos' },
  cachorro: { drink: 'água', food: 'ração própria para cães' }
};
const capitals = { pernambuco: 'Recife', brasil: 'Brasília', alagoas: 'Maceió', bahia: 'Salvador', 'sao paulo': 'São Paulo' };
const unknown = 'Ainda não tenho conhecimento suficiente para responder a essa pergunta.';
const lexicon = { entities: ['gato','cachorro','pernambuco','brasil','alagoas','bahia','agua','leite','racao'], actions: ['bebe','beber','come','comer'], properties: ['branco','branca','preto','preta','cor','liquido'], interrogatives: ['o','que','qual','quais','como','onde','quem','e'] };
function analyze(tokens) {
  const words = tokens.map(normalize);
  const text = words.join(' ').replace(/\s+([?!.,])/g,'$1');
  const entities = lexicon.entities.filter(x=>words.includes(x));
  const actions = lexicon.actions.filter(x=>words.includes(x));
  const properties = lexicon.properties.filter(x=>words.includes(x));
  const candidates = [];
  function add(id, pattern, match, intent, slots, answer, rationale) {
    candidates.push({rule:id,pattern,matched:!!match,reason:match?'Estrutura e relações reconhecidas.':'A estrutura completa não corresponde à regra.'});
    if(match) return {intent,slots,answer,rationale,matchedRule:id};
    return null;
  }
  let selected = null;
  const patterns = [
    ['animal-bebida','^o que (?:o |a )?(gato|cachorro) (?:bebe|pode beber)\\??$',m=>({intent:'perguntar_bebida',slots:{animal:m[1]},answer:`O ${m[1]} bebe ${facts[m[1]].drink}.`,rationale:'Pergunta sobre a bebida do animal; fato cadastrado.'})],
    ['animal-comida','^o que (?:o |a )?(gato|cachorro) (?:come|pode comer)\\??$',m=>({intent:'perguntar_comida',slots:{animal:m[1]},answer:`O ${m[1]} come ${facts[m[1]].food}.`,rationale:'Pergunta sobre alimentação; fato cadastrado.'})],
    ['animal-bebida-cor','^o que (?:o |a )?(gato|cachorro) bebe (?:e|é) (?:branco|branca|preto|preta)\\??$',m=>({intent:'verificar_cor_bebida',slots:{animal:m[1],propriedade:words.at(-2)},answer:'Não posso afirmar isso: a água não tem cor branca; normalmente é incolor.',rationale:'A pergunta relaciona a cor à bebida, não ao animal.'})],
    ['animal-bebida-cor-alternativa','^a (?:bebida|agua|água) (?:do |que o )?(?:gato|cachorro)? ?(?:bebe )?(?:e|é) (?:branca|branco)\\??$',m=>({intent:'verificar_cor_bebida',slots:{propriedade:'branca'},answer:'A água normalmente é incolor, não branca.',rationale:'Cor da água cadastrada.'})],
    ['animal-bebe-objeto','^(?:o |a )?(gato|cachorro) bebe (agua|leite|suco)\\??$',m=>({intent:'verificar_bebida',slots:{animal:m[1],bebida:m[2]},answer:m[2]==='agua'?`Sim. O ${m[1]} bebe água.`:`Não tenho uma regra confiável para afirmar que ${m[2]} seja uma bebida adequada para o ${m[1]}.`,rationale:'Verificação da relação animal–bebida, sem substituir o objeto citado.'})],
    ['capital','^qual (?:e|é) a capital (?:de|do|da) (pernambuco|brasil|alagoas|bahia|sao paulo)\\??$',m=>({intent:'perguntar_capital',slots:{local:m[1]},answer:`A capital de ${m[1]==='brasil'?'Brasil':m[1]==='sao paulo'?'São Paulo':m[1].charAt(0).toUpperCase()+m[1].slice(1)} é ${capitals[m[1]]}.`,rationale:'Consulta a um fato geográfico cadastrado.'})],
    ['nome','^(?:qual (?:e|é) (?:o )?seu nome|como voce se chama)\\??$',m=>({intent:'perguntar_nome',slots:{},answer:'Meu nome é MylittlIA.',rationale:'Identidade cadastrada.'})],
    ['cumprimento','^(?:ola|oi|bom dia|boa tarde|boa noite)[!.]?$',m=>({intent:'cumprimento',slots:{},answer:'Olá! Eu sou a MylittlIA, uma pequena IA didática.',rationale:'Cumprimento reconhecido.'})]
  ];
  for (const [id,pattern,build] of patterns) {
    const m=text.match(new RegExp(pattern,'u'));
    const data=m?build(m):null;
    const result=add(id,pattern,m,data?.intent,data?.slots,data?.answer,data?.rationale);
    if(result && !selected)selected=result;
  }
  // Uma regra só é aceita quando a pergunta inteira corresponde à estrutura esperada.
  return {normalizedText:text,entities,actions,properties,intent:selected?.intent??'desconhecida',slots:selected?.slots??{},matchedRule:selected?.matchedRule??null,answer:selected?.answer??unknown,explanation:selected?.rationale??'Nenhuma estrutura completa foi reconhecida; palavras isoladas não bastam para responder.',candidates,confidenceType:'correspondência estrutural; não é probabilidade neural'};
}
export function inferAnswer(tokens){return analyze(tokens);}
