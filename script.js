"use strict";

// =================================================================================
// --- CLASSES DE VEÍCULOS ---
// =================================================================================
class Veiculo {
    constructor(modelo, cor) { if (this.constructor === Veiculo) throw new Error("Classe abstrata."); this.modelo = modelo; this.cor = cor; this.ligado = false; this.velocidade = 0; this.velocidadeMaxima = this.definirVelocidadeMaxima(); }
    definirVelocidadeMaxima() { throw new Error("Implementar na subclasse."); }
    ligar() { if (this.ligado) return mostrarAlerta(`${this.modelo} já está ligado.`, 'info'); this.ligado = true; tocarSomVeiculo('ligar'); atualizarDisplayVeiculo(); }
    desligar() { if (!this.ligado) return mostrarAlerta(`${this.modelo} já está desligado.`, 'info'); if (this.velocidade > 0) return mostrarAlerta(`Não é possível desligar ${this.modelo} em movimento.`, 'erro'); this.ligado = false; tocarSomVeiculo('desligar'); atualizarDisplayVeiculo(); }
    acelerar(inc = 10) { if (!this.ligado) return mostrarAlerta(`Ligue o ${this.modelo} antes.`, 'erro'); this.velocidade = Math.min(this.velocidade + Math.round(inc), this.velocidadeMaxima); tocarSomVeiculo('acelerar'); atualizarDisplayVeiculo(); }
    frear(dec = 10) { if (this.velocidade === 0) return mostrarAlerta(`${this.modelo} já está parado.`, 'info'); this.velocidade = Math.max(this.velocidade - Math.round(dec), 0); tocarSomVeiculo('frear'); atualizarDisplayVeiculo(); }
    buzinar() { tocarSomVeiculo('buzina'); }
    exibirInformacoes() { return `<p><strong>Placa:</strong> ${this.placa}</p><p><strong>Marca:</strong> ${this.marca}</p><p><strong>Tipo:</strong> ${this.tipo}</p><p><strong>Status:</strong> <span class="status-${this.ligado ? 'ligado' : 'desligado'}">${this.ligado ? 'Ligado ✅' : 'Desligado ❌'}</span></p>`; }
}
class Carro extends Veiculo { constructor(modelo, cor) { super(modelo, cor); } definirVelocidadeMaxima() { return 180; } }
class CarroEsportivo extends Carro { constructor(modelo, cor) { super(modelo, cor); this.turboAtivado = false; } definirVelocidadeMaxima() { return 250; } ativarTurbo() { if (!this.ligado) return mostrarAlerta(`Ligue o ${this.modelo} antes.`, 'erro'); this.turboAtivado = true; mostrarAlerta('Turbo ativado! 🔥', 'info'); atualizarDisplayVeiculo(); } desativarTurbo() { this.turboAtivado = false; mostrarAlerta('Turbo desativado.', 'info'); atualizarDisplayVeiculo(); } acelerar(incBase = 15) { super.acelerar(this.turboAtivado ? incBase * 1.8 : incBase); } exibirInformacoes() { return `${super.exibirInformacoes()}<p><strong>Turbo:</strong> <span class="status-${this.turboAtivado ? 'ligado' : 'desligado'}">${this.turboAtivado ? 'Ativado 🔥' : 'Desativado'}</span></p>`; } }
class Caminhao extends Veiculo { constructor(modelo, cor) { super(modelo, cor); } definirVelocidadeMaxima() { return 100; } }

// =================================================================================
// --- VARIÁVEIS GLOBAIS ---
// =================================================================================
let garagemDB = [], veiculoAtual = null, alertaTimeout = null, volumeAtual = 0.5;

// =================================================================================
// --- FUNÇÕES DE API ---
// =================================================================================
async function buscarApi(endpoint) {
    const response = await fetch(endpoint);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Erro ${response.status}: ${response.statusText}` }));
        throw new Error(errorData.message);
    }
    return response.json();
}

// =================================================================================
// --- LÓGICA PRINCIPAL DA APLICAÇÃO ---
// =================================================================================
async function buscarEExibirVeiculos() {
    const container = document.getElementById('botoes-veiculo');
    try {
        garagemDB = await buscarApi('/api/veiculos');
        container.innerHTML = '';
        if (garagemDB.length === 0) {
            container.innerHTML = '<p>Nenhum veículo na garagem.</p>';
            desselecionarVeiculo();
            return;
        }
        const lista = document.createElement('ul');
        lista.className = 'lista-veiculos-db';
        garagemDB.forEach(veiculoData => {
            const item = document.createElement('li');
            item.id = `veiculo-${veiculoData._id}`;
            item.dataset.id = veiculoData._id;
            item.innerHTML = `
                <span class="veiculo-info" data-id="${veiculoData._id}"><strong>${veiculoData.placa}</strong> - ${veiculoData.marca} ${veiculoData.modelo}</span>
                <div class="veiculo-actions">
                    <button class="btn-edit" data-id="${veiculoData._id}">Editar</button>
                    <button class="btn-delete" data-id="${veiculoData._id}">Excluir</button>
                </div>
            `;
            lista.appendChild(item);
        });
        container.appendChild(lista);
    } catch (error) {
        mostrarAlerta(error.message, 'erro');
    }
}

function selecionarVeiculo(veiculoId) {
    const veiculoData = garagemDB.find(v => v._id === veiculoId);
    if (!veiculoData) return;
    switch (veiculoData.tipo) {
        case 'Carro': veiculoAtual = new Carro(veiculoData.modelo, veiculoData.cor); break;
        case 'CarroEsportivo': veiculoAtual = new CarroEsportivo(veiculoData.modelo, veiculoData.cor); break;
        case 'Caminhao': veiculoAtual = new Caminhao(veiculoData.modelo, veiculoData.cor); break;
        default: return;
    }
    Object.assign(veiculoAtual, veiculoData);
    atualizarDisplayVeiculo();
}

function desselecionarVeiculo() {
    veiculoAtual = null;
    atualizarDisplayVeiculo();
}

function atualizarDisplayVeiculo() {
    const nomeVeiculoEl = document.getElementById('nome-veiculo-selecionado');
    const infoVeiculoEl = document.getElementById('informacoes-veiculo');
    const velocimetro = document.getElementById('velocimetro');
    const velocidadeTexto = document.getElementById('velocidade-texto');
    const controlesVeiculoEl = document.getElementById('controles-veiculo');
    const dicasContainer = document.getElementById('dicas-manutencao-container');
    const formManutencaoContainer = document.getElementById('form-manutencao-container');
    const historicoManutencaoEl = document.getElementById('historico-manutencao');

    document.querySelectorAll('.lista-veiculos-db li').forEach(li => li.classList.remove('selecionado'));

    if (!veiculoAtual) {
        nomeVeiculoEl.textContent = 'Nenhum';
        infoVeiculoEl.innerHTML = '<p>Selecione um veículo na garagem.</p>';
        controlesVeiculoEl.style.display = 'none';
        dicasContainer.style.display = 'none';
        formManutencaoContainer.style.display = 'none';
        historicoManutencaoEl.innerHTML = '<p>Selecione um veículo para ver o histórico.</p>';
        return;
    }
    
    const itemSelecionado = document.getElementById(`veiculo-${veiculoAtual._id}`);
    if (itemSelecionado) itemSelecionado.classList.add('selecionado');

    nomeVeiculoEl.textContent = `${veiculoAtual.marca} ${veiculoAtual.modelo}`;
    infoVeiculoEl.innerHTML = veiculoAtual.exibirInformacoes();
    velocimetro.value = veiculoAtual.velocidade;
    velocimetro.max = veiculoAtual.velocidadeMaxima;
    velocidadeTexto.textContent = `${veiculoAtual.velocidade} km/h`;
    
    controlesVeiculoEl.style.display = 'block';
    dicasContainer.style.display = 'block';
    formManutencaoContainer.style.display = 'block';
    document.getElementById('dicas-resultado').innerHTML = '';
    document.querySelectorAll('.acao-esportivo').forEach(el => el.style.display = (veiculoAtual instanceof CarroEsportivo) ? 'inline-block' : 'none');
    
    // LÓGICA ATUALIZADA PARA EXIBIR O HISTÓRICO DE MANUTENÇÃO
    if (veiculoAtual.historicoManutencao && veiculoAtual.historicoManutencao.length > 0) {
        const listaHtml = veiculoAtual.historicoManutencao.map(m => {
            const custoFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.custo);
            const dataFormatada = new Date(m.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            const kmFormatado = m.quilometragem ? ` - ${m.quilometragem.toLocaleString('pt-BR')} km` : '';
            return `<li>
                        <strong>${m.descricaoServico}</strong><br>
                        <small>Data: ${dataFormatada} | Custo: ${custoFormatado}${kmFormatado}</small>
                    </li>`;
        }).join('');
        historicoManutencaoEl.innerHTML = `<h4>Histórico de Manutenção</h4><ul class="lista-manutencao">${listaHtml}</ul>`;
    } else {
        historicoManutencaoEl.innerHTML = '<h4>Histórico de Manutenção</h4><p>Nenhum registro de manutenção para este veículo.</p>';
    }
}

function interagir(acao) {
    if (!veiculoAtual) return mostrarAlerta('Selecione um veículo!', 'erro');
    if (typeof veiculoAtual[acao] === 'function') {
        veiculoAtual[acao]();
    }
}

function mostrarAlerta(mensagem, tipo = 'info') {
    const alertaContainer = document.getElementById('alerta-container');
    if (alertaTimeout) clearTimeout(alertaTimeout);
    alertaContainer.textContent = mensagem;
    alertaContainer.className = `alerta-${tipo}`;
    alertaContainer.style.display = 'block';
    alertaContainer.style.opacity = 1;
    alertaTimeout = setTimeout(() => {
        alertaContainer.style.opacity = 0;
        setTimeout(() => { alertaContainer.style.display = 'none'; }, 400);
    }, 4000);
}

function tocarSomVeiculo(acao) {
    const som = document.getElementById(`som-${acao}`);
    const volumeControl = document.getElementById('volume-control');
    if (som && volumeControl) {
        som.currentTime = 0;
        som.volume = parseFloat(volumeControl.value);
        som.play().catch(e => console.warn("Erro ao tocar som:", e));
    }
}

function exibirPrevisaoEstendida(dados) {
    const resultadoEl = document.getElementById('previsao-resultado');
    resultadoEl.innerHTML = `<h4>Previsão para ${dados.cidade}</h4>`;
    const listaDiasEl = document.createElement('ul');
    listaDiasEl.className = 'lista-previsao-dias';
    dados.previsoes.slice(0, 5).forEach(previsaoDia => {
        const itemDia = document.createElement('li');
        itemDia.innerHTML = `<img src="${previsaoDia.icone}" alt="${previsaoDia.descricao}"><div class="dia-info"><strong>${previsaoDia.dia}</strong><span>${previsaoDia.descricao}</span></div><div class="dia-temp"><strong>${previsaoDia.temp_max}°</strong><span>${previsaoDia.temp_min}°</span></div>`;
        listaDiasEl.appendChild(itemDia);
    });
    resultadoEl.appendChild(listaDiasEl);
}

function abrirModalEdicao(veiculoId) {
    const veiculo = garagemDB.find(v => v._id === veiculoId);
    if (!veiculo) return;
    document.getElementById('edit-veiculo-id').value = veiculo._id;
    document.getElementById('edit-tipo-veiculo').value = veiculo.tipo;
    document.getElementById('edit-placa-veiculo').value = veiculo.placa;
    document.getElementById('edit-marca-veiculo').value = veiculo.marca;
    document.getElementById('edit-modelo-veiculo').value = veiculo.modelo;
    document.getElementById('edit-ano-veiculo').value = veiculo.ano;
    document.getElementById('edit-cor-veiculo').value = veiculo.cor;
    document.getElementById('modal-editar').classList.add('visivel');
}

function fecharModalEdicao() {
    document.getElementById('modal-editar').classList.remove('visivel');
}

// =================================================================================
// --- PONTO DE ENTRADA E EVENT LISTENERS ---
// =================================================================================
document.addEventListener('DOMContentLoaded', () => {
    buscarEExibirVeiculos();

    document.getElementById('form-buscar-previsao').addEventListener('submit', async (e) => {
        e.preventDefault();
        const inputCidade = document.getElementById('cidade-input');
        const cidade = inputCidade.value.trim();
        const resultadoEl = document.getElementById('previsao-resultado');
        if (!cidade) return mostrarAlerta('Por favor, digite o nome de uma cidade.', 'erro');
        resultadoEl.innerHTML = `<p><em>Buscando previsão para ${cidade}...</em> 🌍</p>`;
        try {
            const dadosPrevisao = await buscarApi(`/api/previsao?cidade=${encodeURIComponent(cidade)}`);
            exibirPrevisaoEstendida(dadosPrevisao);
        } catch (error) {
            resultadoEl.innerHTML = `<p class="api-erro">${error.message}</p>`;
        }
    });

    document.getElementById('form-add-veiculo').addEventListener('submit', async (e) => {
        e.preventDefault();
        const novoVeiculo = { tipo: document.getElementById('tipo-veiculo').value, placa: document.getElementById('placa-veiculo').value, marca: document.getElementById('marca-veiculo').value, modelo: document.getElementById('modelo-veiculo').value, ano: document.getElementById('ano-veiculo').value, cor: document.getElementById('cor-veiculo').value };
        try {
            const response = await fetch('/api/veiculos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(novoVeiculo) });
            if (!response.ok) { const err = await response.json(); throw new Error(err.message); }
            mostrarAlerta('Veículo adicionado com sucesso!', 'info');
            await buscarEExibirVeiculos();
            e.target.reset();
        } catch (error) {
            mostrarAlerta(error.message, 'erro');
        }
    });

    document.getElementById('botoes-veiculo').addEventListener('click', async (event) => {
        const target = event.target;
        const veiculoId = target.dataset.id;
        if (target.classList.contains('btn-delete')) {
            if (confirm('Tem certeza que deseja excluir este veículo?')) {
                try {
                    const response = await fetch(`/api/veiculos/${veiculoId}`, { method: 'DELETE' });
                    if (!response.ok) throw new Error('Falha ao deletar o veículo.');
                    mostrarAlerta('Veículo excluído com sucesso.', 'info');
                    if (veiculoAtual && veiculoAtual._id === veiculoId) desselecionarVeiculo();
                    await buscarEExibirVeiculos();
                } catch (error) {
                    mostrarAlerta(error.message, 'erro');
                }
            }
        } else if (target.classList.contains('btn-edit')) {
            abrirModalEdicao(veiculoId);
        } else if (target.closest('.veiculo-info')) {
            selecionarVeiculo(veiculoId);
        }
    });
    
    document.getElementById('form-edit-veiculo').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-veiculo-id').value;
        const dadosAtualizados = { tipo: document.getElementById('edit-tipo-veiculo').value, placa: document.getElementById('edit-placa-veiculo').value, marca: document.getElementById('edit-marca-veiculo').value, modelo: document.getElementById('edit-modelo-veiculo').value, ano: document.getElementById('edit-ano-veiculo').value, cor: document.getElementById('edit-cor-veiculo').value };
        try {
            const response = await fetch(`/api/veiculos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dadosAtualizados) });
            if (!response.ok) { const err = await response.json(); throw new Error(err.message); }
            fecharModalEdicao();
            mostrarAlerta('Veículo atualizado com sucesso!', 'info');
            await buscarEExibirVeiculos();
            if (veiculoAtual && veiculoAtual._id === id) selecionarVeiculo(id);
        } catch (error) {
            mostrarAlerta(`Erro ao atualizar: ${error.message}`, 'erro');
        }
    });
    
    document.getElementById('controles-veiculo').addEventListener('click', (event) => { const acao = event.target.dataset.acao; if (acao) interagir(acao); });
    
    document.getElementById('btn-buscar-dicas').addEventListener('click', async () => {
        if (!veiculoAtual) return mostrarAlerta("Selecione um veículo.", "erro");
        const resultadoEl = document.getElementById('dicas-resultado');
        resultadoEl.innerHTML = '<em>Buscando...</em>';
        try {
            const tipoParaAPI = veiculoAtual.tipo.toLowerCase();
            const dicas = await buscarApi(`/api/dicas-manutencao/${tipoParaAPI}`);
            resultadoEl.innerHTML = `<ul>${dicas.map(d => `<li>${d.dica}</li>`).join('')}</ul>`;
        } catch (error) {
            resultadoEl.innerHTML = `<p class="api-erro">${error.message}</p>`;
        }
    });

    // LISTENER DO FORMULÁRIO DE MANUTENÇÃO ATUALIZADO
    document.getElementById('form-add-manutencao').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!veiculoAtual) return mostrarAlerta('Nenhum veículo selecionado.', 'erro');

        const dadosFormulario = {
            data: document.getElementById('data-manutencao').value,
            descricaoServico: document.getElementById('descricao-servico-input').value,
            custo: parseFloat(document.getElementById('custo-manutencao').value),
            quilometragem: parseInt(document.getElementById('quilometragem-manutencao').value, 10) || null
        };

        const veiculoId = veiculoAtual._id;
        const url = `/api/veiculos/${veiculoId}/manutencoes`;

        try {
            const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dadosFormulario) });
            const resultado = await response.json();
            if (!response.ok) throw new Error(resultado.message || 'Falha ao registrar manutenção.');

            mostrarAlerta('Manutenção registrada com sucesso!', 'info');
            e.target.reset();
            
            // Atualiza a garagem e re-seleciona o veículo para mostrar a nova manutenção.
            await buscarEExibirVeiculos();
            selecionarVeiculo(veiculoId);
            
        } catch (error) {
            mostrarAlerta(`Erro ao registrar manutenção: ${error.message}`, 'erro');
        }
    });

    document.getElementById('volume-control').addEventListener('input', e => { volumeAtual = parseFloat(e.target.value); });
});