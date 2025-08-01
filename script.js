// File: frontend/script.js
"use strict";

// --- SELETORES DO DOM ---
const botoesVeiculoContainer = document.getElementById('botoes-veiculo');
const nomeVeiculoSelecionadoEl = document.getElementById('nome-veiculo-selecionado');
const alertaContainer = document.getElementById('alerta-container');
const informacoesVeiculoEl = document.getElementById('informacoes-veiculo');
const formAddVeiculo = document.getElementById('form-add-veiculo');
const cidadeDestinoInput = document.getElementById('cidade-destino');
const verificarClimaBtn = document.getElementById('verificar-clima-btn');
const climaLoadingEl = document.getElementById('clima-loading');
const previsaoTempoResultadoEl = document.getElementById('previsao-tempo-resultado');

// --- Variáveis Globais ---
let garagem = {}; // Cache local dos veículos do banco de dados
let veiculoAtual = null;
let idVeiculoAtual = null;
let alertaTimeout = null;
const API_BASE_URL = 'http://localhost:3000/api'; // URL do nosso backend

// --- Funções de API ---
async function fetchApi(endpoint, method = 'GET', body = null) {
    const options = { method, headers: {} };
    if (body) {
        options.body = JSON.stringify(body);
        options.headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Ocorreu um erro no servidor.');
    }
    return data;
}

// --- Funções de UI ---
function mostrarAlerta(mensagem, tipo = 'info') {
    if (alertaTimeout) clearTimeout(alertaTimeout);
    alertaContainer.textContent = mensagem;
    alertaContainer.className = `alerta-${tipo}`;
    alertaContainer.style.opacity = 1;
    alertaTimeout = setTimeout(() => { alertaContainer.style.opacity = 0; }, 5000);
}

function atualizarDisplayVeiculo() {
    const temVeiculo = !!veiculoAtual;
    document.getElementById('planejador-viagem-container').style.display = temVeiculo ? 'block' : 'none';
    document.getElementById('dicas-manutencao-container').style.display = temVeiculo ? 'block' : 'none';
    document.getElementById('form-add-manutencao').style.display = temVeiculo ? 'block' : 'none';
    document.getElementById('manutencao-sem-veiculo').style.display = temVeiculo ? 'none' : 'block';

    if (!temVeiculo) {
        nomeVeiculoSelecionadoEl.textContent = 'Nenhum';
        informacoesVeiculoEl.innerHTML = '<p>Selecione um veículo ou adicione um novo.</p>';
        return;
    }
    nomeVeiculoSelecionadoEl.textContent = `${veiculoAtual.marca} ${veiculoAtual.modelo}`;
    informacoesVeiculoEl.innerHTML = `
        <strong>Placa:</strong> ${veiculoAtual.placa}<br>
        <strong>Marca:</strong> ${veiculoAtual.marca}<br>
        <strong>Modelo:</strong> ${veiculoAtual.modelo}<br>
        <strong>Ano:</strong> ${veiculoAtual.ano}<br>
        <strong>Cor:</strong> ${veiculoAtual.cor || 'Não informada'}<br>
        <strong>Cadastrado em:</strong> ${new Date(veiculoAtual.createdAt).toLocaleDateString()}
    `;
    document.querySelectorAll('#botoes-veiculo button').forEach(btn =>
        btn.classList.toggle('selecionado', btn.dataset.veiculoId === idVeiculoAtual)
    );
}

function renderizarBotoesGaragem() {
    botoesVeiculoContainer.innerHTML = '';
    const ids = Object.keys(garagem);
    if (ids.length === 0) {
        botoesVeiculoContainer.innerHTML = '<p>Sua garagem está vazia.</p>';
        return;
    }
    ids.forEach(id => {
        const veiculo = garagem[id];
        const container = document.createElement('div');
        container.className = 'veiculo-garagem-item';
        const btn = document.createElement('button');
        btn.textContent = `${veiculo.marca} ${veiculo.modelo} (${veiculo.placa})`;
        btn.dataset.veiculoId = id;
        btn.addEventListener('click', () => selecionarVeiculo(id));
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '❌';
        deleteBtn.className = 'delete-btn';
        deleteBtn.title = 'Remover veículo';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Tem certeza que deseja remover ${veiculo.marca} ${veiculo.modelo}?`)) {
                removerVeiculo(id);
            }
        });
        container.appendChild(btn);
        container.appendChild(deleteBtn);
        botoesVeiculoContainer.appendChild(container);
    });
}

function selecionarVeiculo(id) {
    if (garagem[id]) {
        idVeiculoAtual = id;
        veiculoAtual = garagem[id];
        atualizarDisplayVeiculo();
    }
}

// --- Funções CRUD (Lado do Cliente) ---
async function carregarVeiculos() {
    try {
        const veiculosDoDB = await fetchApi('/veiculos');
        garagem = {};
        veiculosDoDB.forEach(v => { garagem[v._id] = v; });
        renderizarBotoesGaragem();
        const primeiroId = Object.keys(garagem)[0];
        if (primeiroId) {
            selecionarVeiculo(primeiroId);
        } else {
            idVeiculoAtual = null;
            veiculoAtual = null;
            atualizarDisplayVeiculo();
        }
    } catch (error) {
        mostrarAlerta(`Erro ao carregar garagem: ${error.message}`, 'erro');
        console.log("erro:"+ error.mensage);
    }
}

async function adicionarVeiculo(e) {
    e.preventDefault();
    const veiculoData = {
        placa: document.getElementById('placa-veiculo').value,
        marca: document.getElementById('marca-veiculo').value,
        modelo: document.getElementById('modelo-veiculo').value,
        ano: document.getElementById('ano-veiculo').value,
        cor: document.getElementById('cor-veiculo').value,
    };
    try {
        const novoVeiculo = await fetchApi('/veiculos', 'POST', veiculoData);
        mostrarAlerta(`Veículo ${novoVeiculo.placa} adicionado com sucesso!`, 'info');
        formAddVeiculo.reset();
        await carregarVeiculos(); // Recarrega a lista para incluir o novo veículo
    } catch (error) {
        mostrarAlerta(`Erro: ${error.message}`, 'erro');
    }
}

async function removerVeiculo(id) {
    try {
        const resultado = await fetchApi(`/veiculos/${id}`, 'DELETE');
        mostrarAlerta(resultado.message, 'info');
        await carregarVeiculos(); // Recarrega a lista para remover o veículo da UI
    } catch (error) {
        mostrarAlerta(`Erro ao remover veículo: ${error.message}`, 'erro');
    }
}

// --- Funções da Vitrine e Clima ---
async function carregarConteudoVitrine() {
    try {
        const [destaques, servicos] = await Promise.all([
            fetchApi('/garagem/veiculos-destaque'),
            fetchApi('/garagem/servicos-oferecidos')
        ]);
        const destaqueContainer = document.getElementById('cards-veiculos-destaque');
        destaqueContainer.innerHTML = destaques.map(v => `
            <div class="veiculo-card">
                <img src="${v.imagemUrl || 'images/placeholder.jpg'}" alt="${v.modelo}">
                <h3>${v.modelo} (${v.ano})</h3>
                <p><strong>Destaque:</strong> ${v.destaque}</p>
            </div>`).join('');
        const servicosLista = document.getElementById('lista-servicos-oferecidos');
        servicosLista.innerHTML = servicos.map(s => `
            <li>
                <strong>${s.nome}</strong> - ${s.precoEstimado}<br>
                <small>${s.descricao}</small>
            </li>`).join('');
    } catch (error) {
        console.error("Erro ao carregar vitrine:", error);
    }
}

async function buscarPrevisao() {
    const cidade = cidadeDestinoInput.value.trim();
    if (!cidade) return mostrarAlerta("Por favor, insira o nome da cidade.", "erro");
    climaLoadingEl.style.display = 'block';
    previsaoTempoResultadoEl.innerHTML = '';
    verificarClimaBtn.disabled = true;
    try {
        const dados = await fetchApi(`/previsao?cidade=${encodeURIComponent(cidade)}`);
        previsaoTempoResultadoEl.innerHTML = `<p>Previsão para ${dados.city.name}: ${dados.list[0].weather[0].description}.</p>`;
    } catch (error) {
        previsaoTempoResultadoEl.innerHTML = `<p class="api-erro">${error.message}</p>`;
    } finally {
        climaLoadingEl.style.display = 'none';
        verificarClimaBtn.disabled = false;
    }
}

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    carregarVeiculos();
    carregarConteudoVitrine();
    formAddVeiculo.addEventListener('submit', adicionarVeiculo);
    verificarClimaBtn.addEventListener('click', buscarPrevisao);
});