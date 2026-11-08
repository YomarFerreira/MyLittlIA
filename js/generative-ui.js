// Este laboratório opera em paralelo à conversa tradicional.
// Não apresenta respostas experimentais como fatos confirmados.
const el = id => document.getElementById(id);
const mode=()=>el('gen-mode').value;
const endpoint=path=>mode()==='word'?'word/'+path:path;
async function api(path, data) {
    const response=await fetch('/api/generative/'+endpoint(path), {
        method:data===undefined?'GET':'POST',
        headers:data===undefined?{}:{'Content-Type':'application/json'},
        body:data===undefined?undefined:JSON.stringify(data)
    });
    const result=await response.json();
    if(!response.ok) throw new Error(result.error||'Falha no laboratório.');
    return result;
}
function draw(history) {
    const canvas=el('gen-chart'),ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const w=canvas.width,h=canvas.height,p=30;
    ctx.strokeStyle='#2d425d';ctx.beginPath();ctx.moveTo(p,10);ctx.lineTo(p,h-p);ctx.lineTo(w-10,h-p);ctx.stroke();
    if(history.length===0)return;
    const max=Math.max(...history.map(x=>x.loss),0.01),min=Math.min(0,...history.map(x=>x.loss));
    ctx.strokeStyle='#34d399';ctx.lineWidth=3;ctx.beginPath();
    history.forEach(({loss},i)=>{const x=p+i*(w-p-20)/Math.max(1,history.length-1);const y=10+(max-loss)*(h-p-20)/Math.max(0.01,max-min);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
    ctx.stroke(); ctx.font='12px sans-serif';ctx.fillStyle='#cbd5e1';ctx.fillText('Loss',p+5,22);
}
async function update() {
    const status=await api('status');
    el('gen-status').textContent=status.trained?`Treinado · ${status.trainedSteps} atualizações · ${status.vocabularySize} tokens no vocabulário`:'Modelo ainda não treinado';
}
el('gen-train').addEventListener('click',async()=>{
    el('gen-train').disabled=true; el('gen-train-info').textContent='Treinando...';
    try {
        const result=await api('train',{text:el('gen-corpus').value.trim()||undefined,epochs:Number(el('gen-epochs').value)});
        draw(result.history);
        el('gen-train-info').textContent=`Treinamento concluído. Loss final: ${result.history.at(-1).loss}. Checkpoint salvo.`;
        await update();
        await refreshNeuralExamples();
    } catch(error) {el('gen-train-info').textContent=error.message;}
    finally {el('gen-train').disabled=false;}
});
el('gen-generate').addEventListener('click',async()=>{
    el('gen-generate').disabled=true;
    try {
        const result=await api('generate',{prompt:el('gen-prompt').value,temperature:Number(el('gen-temperature').value),length:mode()==='word'?60:100});
        el('gen-output').textContent=result.text;
        el('gen-trace').textContent=JSON.stringify(result.trace,null,2);
    } catch(error){el('gen-output').textContent=error.message;}
    finally{el('gen-generate').disabled=false;}
});
el('gen-mode').addEventListener('change',()=>{draw([]);el('gen-output').textContent='Escolha o treinamento e gere um texto para comparar os modelos.';el('gen-trace').textContent='Ainda não há geração neste modo.';update().catch(error=>{el('gen-status').textContent=error.message;});});
draw([]);update().catch(error=>{el('gen-status').textContent=error.message;});


// Exemplos de treinamento já armazenados no SQLite.
// Esta consulta é independente do modo de geração selecionado.
let neuralExamples = [];
async function examplesApi(path, data) {
    const response = await fetch('/api/generative/examples' + path, {
        method: data === undefined ? 'GET' : 'POST',
        headers: data === undefined ? {} : { 'Content-Type': 'application/json' },
        body: data === undefined ? undefined : JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Não consegui consultar os exemplos.');
    return result;
}

function renderNeuralExamples() {
    const list = el('gen-examples-list');
    list.replaceChildren();
    if (!neuralExamples.length) {
        list.textContent = 'Todos os exemplos já estão na memória, ou ainda não há exemplos de treinamento.';
        return;
    }
    const fragment = document.createDocumentFragment();
    for (const item of neuralExamples) {
        const label = document.createElement('label');
        label.className = 'gen-example-row';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = String(item.id);
        checkbox.className = 'gen-example-checkbox';
        const text = document.createElement('span');
        const question = document.createElement('strong');
        question.textContent = item.question;
        const answer = document.createElement('span');
        answer.textContent = ` — ${item.answer}`;
        text.append(question, answer);
        label.append(checkbox, text);
        fragment.append(label);
    }
    list.append(fragment);
}

async function refreshNeuralExamples() {
    const status = el('gen-examples-status');
    status.textContent = 'Consultando exemplos...';
    try {
        const result = await examplesApi('');
        neuralExamples = Array.isArray(result.items) ? result.items : [];
        renderNeuralExamples();
        status.textContent = `${neuralExamples.length} exemplo(s) aguardando incorporação.`;
        window.dispatchEvent(new CustomEvent('mylittlia:pending-examples', {detail:{count:neuralExamples.length}}));
    } catch (error) {
        status.textContent = error.message;
    }
}

el('gen-examples-refresh').addEventListener('click', refreshNeuralExamples);
el('gen-examples-select-all').addEventListener('click', () => {
    document.querySelectorAll('#gen-examples-list .gen-example-checkbox').forEach(box => { box.checked = true; });
});
el('gen-examples-deselect-all').addEventListener('click', () => {
    document.querySelectorAll('#gen-examples-list .gen-example-checkbox').forEach(box => { box.checked = false; });
});
el('gen-examples-incorporate').addEventListener('click', async () => {
    const ids = Array.from(document.querySelectorAll('.gen-example-checkbox:checked'), item => Number(item.value));
    const status = el('gen-examples-status');
    if (!ids.length) {
        status.textContent = 'Selecione ao menos um exemplo para incorporar à memória.';
        return;
    }
    const button = el('gen-examples-incorporate');
    button.disabled = true;
    status.textContent = 'Incorporando conhecimentos selecionados...';
    try {
        const result = await examplesApi('/incorporate', { ids });
        status.textContent = `Aprendi ${result.added} novo(s) conhecimento(s). ${result.existing} já conhecido(s), ${result.conflicts} com respostas diferentes preservadas e ${result.missing} não encontrado(s).`;
        await refreshNeuralExamples();
        // O motor principal carrega o conhecimento em memória no navegador.
        // Atualizamos essa memória sem recarregar a página.
        window.dispatchEvent(new Event('mylittlia:knowledge-updated'));
    } catch (error) {
        status.textContent = error.message;
    } finally {
        button.disabled = false;
    }
});

// Conta pendências ao entrar no aplicativo, mesmo com a área de ensino fechada.
refreshNeuralExamples();
