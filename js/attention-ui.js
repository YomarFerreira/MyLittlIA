const element=id=>document.getElementById(id);
const question=element('retrieval-question');
const button=element('retrieval-run');
button?.addEventListener('click',async()=>{
  const status=element('retrieval-status');
  const answer=element('retrieval-answer');
  const candidates=element('retrieval-candidates');
  const prompt=question.value.trim();
  if(!prompt){status.textContent='Digite uma pergunta para investigar.';return;}
  button.disabled=true;status.textContent='Buscando conhecimentos relacionados...';
  try {
    const response=await fetch('/api/attention/retrieve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:prompt})});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'Não consegui consultar a memória.');
    answer.textContent=result.answer||'Não encontrei um conhecimento suficientemente específico para responder com segurança.';
    status.textContent=result.reason==='retrieved'?'Encontrei conhecimento relacionado.':'Nenhuma resposta confiável foi selecionada.';
    candidates.replaceChildren();
    for(const item of result.candidates){
      const row=document.createElement('div');row.className='retrieval-candidate';
      const title=document.createElement('strong');title.textContent=item.question;
      const detail=document.createElement('p');detail.className='hint';
      detail.textContent=`Relevância: ${(item.score*100).toFixed(1)}% · Atenção relativa: ${(item.attention*100).toFixed(1)}% · Palavras correspondentes: ${item.matchedTerms.join(', ')||'nenhuma'}`;
      const responseText=document.createElement('p');responseText.textContent=item.answer;
      row.append(title,detail,responseText);candidates.append(row);
    }
  }catch(error){status.textContent='Não consegui investigar esta pergunta.';answer.textContent=error.message;}
  finally{button.disabled=false;}
});
