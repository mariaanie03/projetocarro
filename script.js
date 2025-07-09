// script.js - Lógica da Garagem Virtual Interativa
"use strict";

// --- (Todas as classes Manutencao, Veiculo, Carro, etc., permanecem as mesmas no topo) ---
// ... (código das classes omitido para brevidade, ele permanece o mesmo) ...
class Manutencao {
    constructor(data, tipo, custo, descricao = '') {
        this.data = data;
        this.tipo = tipo.trim();
        this.custo = parseFloat(custo);
        this.descricao = descricao.trim();
        this.id = `m_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    validar() {
        const dataObj = new Date(this.data + 'T00:00:00');
        const dataValida = dataObj instanceof Date && !isNaN(dataObj.getTime());
        const tipoValido = typeof this.tipo === 'string' && this.tipo !== '';
        const custoValido = typeof this.custo === 'number' && isFinite(this.custo) && this.custo >= 0;
        return dataValida && tipoValido && custoValido;
    }

    formatarData() {
        try {
            const dataObj = new Date(this.data + 'T00:00:00');
            return new Intl.DateTimeFormat(navigator.language || 'pt-BR').format(dataObj);
        } catch (e) {
            console.error("Erro ao formatar data:", this.data, e);
            return "Data inválida";
        }
    }

    formatar() {
        if (!this.validar()) {
            return "<span style='color: red;'>Registro de Manutenção Inválido</span>";
        }
        const custoFormatado = this.custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        let str = `<strong>${this.tipo}</strong> em ${this.formatarData()} - ${custoFormatado}`;
        if (this.descricao) {
            str += ` <small><i>(${this.descricao})</i></small>`;
        }
        return str;
    }

    toJSON() {
        return { data: this.data, tipo: this.tipo, custo: this.custo, descricao: this.descricao, id: this.id };
    }

    static fromJSON(json) {
        if (!json || typeof json !== 'object') return null;
        const m = new Manutencao(json.data, json.tipo, json.custo, json.descricao);
        m.id = json.id || m.id;
        return m.validar() ? m : null;
    }
}

class Veiculo {
    constructor(modelo, cor) {
        if (this.constructor === Veiculo) {
            throw new Error("A classe abstrata 'Veiculo' não pode ser instanciada diretamente.");
        }
        this.modelo = modelo;
        this.cor = cor;
        this.ligado = false;
        this.velocidade = 0;
        this.velocidadeMaxima = this.definirVelocidadeMaxima();
        this.historicoManutencao = [];
        console.log(`Veículo base ${this.modelo} ${this.cor} inicializado.`);
    }

    definirVelocidadeMaxima() {
        throw new Error("Método 'definirVelocidadeMaxima' deve ser implementado pela subclasse.");
    }

    ligar() {
        if (this.ligado) { this.exibirAlerta(`${this.modelo} já está ligado.`, 'info'); return; }
        this.ligado = true;
        this.tocarSom('ligar');
        console.log(`${this.modelo} ligado.`);
        this.atualizarInterface();
    }

    desligar() {
        if (!this.ligado) { this.exibirAlerta(`${this.modelo} já está desligado.`, 'info'); return; }
        if (this.velocidade > 0) { this.exibirAlerta(`Não é possível desligar ${this.modelo} em movimento (Velocidade: ${this.velocidade} km/h).`, 'erro'); return; }
        this.ligado = false;
        this.tocarSom('desligar');
        console.log(`${this.modelo} desligado.`);
        this.atualizarInterface();
    }

    acelerar(incremento = 10) {
        if (!this.ligado) { this.exibirAlerta(`Ligue o ${this.modelo} antes de acelerar.`, 'erro'); return; }
        if (this.velocidade >= this.velocidadeMaxima) { this.exibirAlerta(`${this.modelo} já está na velocidade máxima (${this.velocidadeMaxima} km/h).`, 'info'); return; }
        this.velocidade = Math.min(this.velocidade + Math.round(incremento), this.velocidadeMaxima);
        this.tocarSom('acelerar');
        console.log(`${this.modelo} acelerou para ${this.velocidade} km/h.`);
        this.atualizarInterface();
    }

    frear(decremento = 10) {
        if (this.velocidade === 0) { this.exibirAlerta(`${this.modelo} já está parado.`, 'info'); return; }
        this.velocidade = Math.max(this.velocidade - Math.round(decremento), 0);
        this.tocarSom('frear');
        console.log(`${this.modelo} freou para ${this.velocidade > 0 ? this.velocidade + ' km/h' : 'e parou'}.`);
        this.atualizarInterface();
    }

    buzinar() {
        this.tocarSom('buzina');
        console.log(`${this.modelo} buzinou!`);
    }

    exibirInformacoes() {
        return `<strong>Modelo:</strong> ${this.modelo}<br><strong>Cor:</strong> ${this.cor}<br><strong>Status:</strong> <span class="status-${this.ligado ? 'ligado' : 'desligado'}">${this.ligado ? 'Ligado ✅' : 'Desligado ❌'}</span><br><strong>Velocidade Atual:</strong> ${this.velocidade} km/h<br><strong>Velocidade Máxima:</strong> ${this.velocidadeMaxima} km/h`;
    }

    atualizarInterface() {
        if (typeof atualizarDisplayVeiculo === 'function') { atualizarDisplayVeiculo(); }
        if (typeof salvarGaragem === 'function') { salvarGaragem(); }
    }

    exibirAlerta(mensagem, tipo = 'info') {
        if (typeof mostrarAlerta === 'function') { mostrarAlerta(mensagem, tipo); }
    }

    tocarSom(acao) {
        if (typeof tocarSomVeiculo === 'function') { tocarSomVeiculo(acao); }
    }

    adicionarManutencao(manutencao) {
        if (!(manutencao instanceof Manutencao) || !manutencao.validar()) {
            this.exibirAlerta("Erro ao adicionar manutenção: dados inválidos.", "erro");
            return false;
        }
        this.historicoManutencao.push(manutencao);
        this.atualizarInterface();
        return true;
    }

    obterHistoricoManutencaoFormatado() {
        if (!this.historicoManutencao || this.historicoManutencao.length === 0) {
            return "<p>Nenhuma manutenção registrada.</p>";
        }
        const agora = new Date();
        agora.setHours(0, 0, 0, 0);
        const historico = this.historicoManutencao.filter(m => new Date(m.data + 'T00:00:00') <= agora).sort((a, b) => new Date(b.data) - new Date(a.data));
        const agendamentos = this.historicoManutencao.filter(m => new Date(m.data + 'T00:00:00') > agora).sort((a, b) => new Date(a.data) - new Date(b.data));

        let html = '<h4>Histórico</h4>' + (historico.length > 0 ? '<ul>' + historico.map(m => `<li>${m.formatar()}</li>`).join('') + '</ul>' : '<p>Nenhum registro passado.</p>');
        html += '<h4>Agendamentos</h4>' + (agendamentos.length > 0 ? '<ul>' + agendamentos.map(m => `<li>${m.formatar()} <span style='color: #007bff;'>(Agendado)</span></li>`).join('') + '</ul>' : '<p>Nenhum agendamento futuro.</p>');
        return html;
    }
}

class Carro extends Veiculo {
    constructor(modelo, cor) { super(modelo, cor); }
    definirVelocidadeMaxima() { return 180; }
}

class CarroEsportivo extends Carro {
    constructor(modelo, cor) {
        super(modelo, cor);
        this.turboAtivado = false;
    }
    definirVelocidadeMaxima() { return 250; }
    ativarTurbo() {
        if (!this.ligado) { this.exibirAlerta(`Ligue o ${this.modelo} antes de ativar o turbo.`, 'erro'); return; }
        if (this.turboAtivado) { this.exibirAlerta(`O turbo já está ativado.`, 'info'); return; }
        this.turboAtivado = true;
        this.exibirAlerta(`Turbo ativado! 🔥`, 'info');
        this.atualizarInterface();
    }
    desativarTurbo() {
        if (!this.turboAtivado) { this.exibirAlerta(`O turbo já está desativado.`, 'info'); return; }
        this.turboAtivado = false;
        this.exibirAlerta(`Turbo desativado.`, 'info');
        this.atualizarInterface();
    }
    acelerar(incrementoBase = 15) {
        const incrementoReal = this.turboAtivado ? incrementoBase * 1.8 : incrementoBase;
        super.acelerar(incrementoReal);
    }
    exibirInformacoes() {
        return `${super.exibirInformacoes()}<br><strong>Turbo:</strong> <span class="status-${this.turboAtivado ? 'ligado' : 'desligado'}">${this.turboAtivado ? 'Ativado 🔥' : 'Desativado'}</span>`;
    }
}

class Caminhao extends Veiculo {
    constructor(modelo, cor, capacidadeCarga) {
        super(modelo, cor);
        this.capacidadeCarga = capacidadeCarga;
        this.cargaAtual = 0;
    }
    definirVelocidadeMaxima() { return 100; }
    carregar(peso) {
        if (this.ligado) { this.exibirAlerta(`Desligue o ${this.modelo} para carregar.`, 'erro'); return; }
        if (this.cargaAtual + peso > this.capacidadeCarga) { this.exibirAlerta(`Carga excede a capacidade.`, 'erro'); return; }
        this.cargaAtual += peso;
        this.exibirAlerta(`Carregado com ${peso}kg. Carga atual: ${this.cargaAtual}kg.`, 'info');
        this.atualizarInterface();
    }
    descarregar(peso) {
        if (this.ligado) { this.exibirAlerta(`Desligue o ${this.modelo} para descarregar.`, 'erro'); return; }
        if (this.cargaAtual - peso < 0) { this.exibirAlerta(`Carga insuficiente para descarregar ${peso}kg.`, 'erro'); return; }
        this.cargaAtual -= peso;
        this.exibirAlerta(`Descarregado ${peso}kg. Carga atual: ${this.cargaAtual}kg.`, 'info');
        this.atualizarInterface();
    }
    acelerar(incrementoBase = 8) {
        const fatorCarga = Math.max(0.4, 1 - (this.cargaAtual / (this.capacidadeCarga * 1.5)));
        super.acelerar(incrementoBase * fatorCarga);
    }
    exibirInformacoes() {
        const percentCarga = ((this.cargaAtual / this.capacidadeCarga) * 100).toFixed(0);
        return `${super.exibirInformacoes()}<br><strong>Carga:</strong> ${this.cargaAtual.toLocaleString()} / ${this.capacidadeCarga.toLocaleString()} kg<br><progress value="${this.cargaAtual}" max="${this.capacidadeCarga}" title="${percentCarga}%"></progress> <span>(${percentCarga}%)</span>`;
    }
}


// --- SELETORES DO DOM (CORRIGIDOS E COMPLETOS) ---
const botoesVeiculoContainer = document.getElementById('botoes-veiculo');
const nomeVeiculoSelecionadoEl = document.getElementById('nome-veiculo-selecionado');
const alertaContainer = document.getElementById('alerta-container');
const informacoesVeiculoEl = document.getElementById('informacoes-veiculo');
const velocimetroProgress = document.getElementById('velocimetro');
const velocidadeTexto = document.getElementById('velocidade-texto');
const controlesVeiculoEl = document.getElementById('controles-veiculo');
const acoesEsportivo = document.querySelectorAll('.acao-esportivo');
const acoesCaminhao = document.querySelectorAll('.acao-caminhao');
const inputPesoCarga = document.getElementById('peso-carga');
const historicoManutencaoEl = document.getElementById('historico-manutencao');
const formAddManutencao = document.getElementById('form-add-manutencao');
const formAddVeiculo = document.getElementById('form-add-veiculo');
const volumeControl = document.getElementById('volume-control');
const apiDetalhesContainerEl = document.getElementById('api-detalhes-container');
const btnBuscarApiDetalhes = document.getElementById('btn-buscar-api-detalhes');
const apiLoadingEl = document.getElementById('api-loading');
const apiResultadoEl = document.getElementById('api-resultado');
const planejadorViagemContainerEl = document.getElementById('planejador-viagem-container');
const cidadeDestinoInput = document.getElementById('cidade-destino');
const verificarClimaBtn = document.getElementById('verificar-clima-btn');
const climaLoadingEl = document.getElementById('clima-loading');
const previsaoTempoResultadoEl = document.getElementById('previsao-tempo-resultado');
const filtroDiasPrevisaoSelect = document.getElementById('filtro-dias-previsao');
const destaqueChuvaCheckbox = document.getElementById('destaque-chuva');
const destaqueTempBaixaCheckbox = document.getElementById('destaque-temp-baixa');
const destaqueTempAltaCheckbox = document.getElementById('destaque-temp-alta');
const dicasManutencaoContainerEl = document.getElementById('dicas-manutencao-container');
const btnBuscarDicas = document.getElementById('btn-buscar-dicas');
const dicasLoadingEl = document.getElementById('dicas-loading');
const dicasResultadoEl = document.getElementById('dicas-resultado');


// --- Variáveis Globais de Estado ---
let garagem = {};
let veiculoAtual = null;
let idVeiculoAtual = null;
let alertaTimeout = null;
let volumeAtual = 0.5;
let dadosPrevisaoCompletos = null;

// --- FUNÇÕES DE API E CARREGAMENTO DE CONTEÚDO ---

// Versão robusta da função de API
async function buscarApi(endpoint) {
    try {
        const response = await fetch(endpoint);
        if (!response.ok) {
            let errorMessage;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || `Erro ${response.status}: ${response.statusText}`;
            } catch (e) {
                errorMessage = `Erro ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        return await response.json();
    } catch (error) {
        console.error(`Falha na chamada para ${endpoint}:`, error.message);
        if (error instanceof TypeError) {
             throw new Error('Não foi possível conectar ao servidor. Verifique a conexão.');
        }
        throw error;
    }
}


async function carregarVeiculosDestaque() {
    const container = document.getElementById('cards-veiculos-destaque');
    container.innerHTML = '<p>Carregando destaques...</p>';
    try {
        const veiculos = await buscarApi('http://localhost:3000/api/garagem/veiculos-destaque');
        
        container.innerHTML = '';
        if (!veiculos || veiculos.length === 0) {
            container.innerHTML = '<p>Nenhum veículo em destaque no momento.</p>';
            return;
        }
        veiculos.forEach(veiculo => {
            const card = document.createElement('div');
            card.className = 'veiculo-card';
            card.innerHTML = `
                <img src="${veiculo.imagemUrl || 'images/placeholder.jpg'}" alt="${veiculo.modelo}">
                <h3>${veiculo.modelo} (${veiculo.ano})</h3>
                <p><strong>Destaque:</strong> ${veiculo.destaque}</p>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        container.innerHTML = `<p class="api-erro">Falha ao carregar veículos: ${error.message}</p>`;
    }
}

async function carregarServicosGaragem() {
    const lista = document.getElementById('lista-servicos-oferecidos');
    lista.innerHTML = '<li>Carregando serviços...</li>';
     try {
        const servicos = await buscarApi('http://localhost:3000/api/garagem/servicos-oferecidos');

        lista.innerHTML = '';
        if (!servicos || servicos.length === 0) {
            lista.innerHTML = '<li>Nenhum serviço oferecido no momento.</li>';
            return;
        }
        servicos.forEach(servico => {
            const item = document.createElement('li');
            item.innerHTML = `
                <strong>${servico.nome}</strong> - ${servico.precoEstimado}<br>
                <small>${servico.descricao}</small>
            `;
            lista.appendChild(item);
        });
    } catch (error) {
        lista.innerHTML = `<li class="api-erro">Falha ao carregar serviços: ${error.message}</li>`;
    }
}

async function buscarPrevisaoDetalhada() {
    const cidade = cidadeDestinoInput.value.trim();
    if (!cidade) {
        mostrarAlerta("Por favor, insira o nome da cidade.", "erro");
        return;
    }
    climaLoadingEl.style.display = 'block';
    previsaoTempoResultadoEl.innerHTML = '';
    verificarClimaBtn.disabled = true;

    try {
        const dados = await buscarApi(`http://localhost:3000/api/previsao?cidade=${encodeURIComponent(cidade)}`);
        dadosPrevisaoCompletos = processarDadosForecast(dados);
        renderizarPrevisaoComFiltros();
    } catch (error) {
        mostrarAlerta(error.message, 'erro');
    } finally {
        climaLoadingEl.style.display = 'none';
        verificarClimaBtn.disabled = false;
    }
}

async function buscarDicasManutencaoAPI() {
    if (!veiculoAtual) {
        mostrarAlerta("Selecione um veículo primeiro.", "erro");
        return;
    }
    dicasLoadingEl.style.display = 'block';
    dicasResultadoEl.innerHTML = '';
    btnBuscarDicas.disabled = true;
    try {
        const tipoParaAPI = veiculoAtual.constructor.name.toLowerCase();
        const [dicasGerais, dicasEspecificas] = await Promise.all([
            buscarApi('http://localhost:3000/api/dicas-manutencao'),
            buscarApi(`http://localhost:3000/api/dicas-manutencao/${tipoParaAPI}`)
        ]);
        renderizarDicasManutencao({ gerais: dicasGerais, especificas: dicasEspecificas });
    } catch (error) {
        dicasResultadoEl.innerHTML = `<p class="api-erro">Falha ao buscar dicas: ${error.message}</p>`;
    } finally {
        dicasLoadingEl.style.display = 'none';
        btnBuscarDicas.disabled = false;
    }
}

function renderizarDicasManutencao(dados) {
    let html = '<h4>Dicas Gerais</h4>';
    if (dados.gerais && dados.gerais.length > 0) {
        html += '<ul>';
        dados.gerais.forEach(d => { html += `<li>${d.dica}</li>`; });
        html += '</ul>';
    } else {
        html += '<p>Nenhuma dica geral encontrada.</p>';
    }

    if (dados.especificas && dados.especificas.length > 0) {
        html += `<h4>Dicas para ${veiculoAtual.constructor.name}</h4>`;
        html += '<ul>';
        dados.especificas.forEach(d => { html += `<li>${d.dica}</li>`; });
        html += '</ul>';
    }

    dicasResultadoEl.innerHTML = html;
}

// --- Funções Auxiliares e de UI ---

function mostrarAlerta(mensagem, tipo = 'info') {
    if (alertaTimeout) clearTimeout(alertaTimeout);
    alertaContainer.textContent = mensagem;
    alertaContainer.className = `alerta-${tipo}`;
    alertaContainer.style.opacity = 1;
    alertaTimeout = setTimeout(() => {
        alertaContainer.style.opacity = 0;
    }, 5000);
}

function tocarSomVeiculo(acao) {
    const som = document.getElementById(`som-${acao}`);
    if (som) {
        som.currentTime = 0;
        som.volume = volumeAtual;
        som.play().catch(e => console.warn("Erro ao tocar som:", e));
    }
}

function atualizarDisplayVeiculo() {
    const semVeiculo = !veiculoAtual || !idVeiculoAtual;

    if (semVeiculo) {
        nomeVeiculoSelecionadoEl.textContent = 'Nenhum';
        informacoesVeiculoEl.innerHTML = '<p>Selecione um veículo ou adicione um novo.</p>';
        document.querySelectorAll('#botoes-veiculo button').forEach(btn => btn.classList.remove('selecionado'));
    }

    controlesVeiculoEl.style.display = semVeiculo ? 'none' : 'block';
    formAddManutencao.style.display = semVeiculo ? 'none' : 'block';
    document.getElementById('manutencao-sem-veiculo').style.display = semVeiculo ? 'block' : 'none';
    velocimetroProgress.parentElement.style.display = semVeiculo ? 'none' : 'block';
    apiDetalhesContainerEl.style.display = semVeiculo ? 'none' : 'block';
    planejadorViagemContainerEl.style.display = semVeiculo ? 'none' : 'block';
    dicasManutencaoContainerEl.style.display = semVeiculo ? 'none' : 'block';
    
    if (semVeiculo) {
        historicoManutencaoEl.innerHTML = '<p>Selecione um veículo para ver o histórico de manutenção.</p>';
        apiResultadoEl.innerHTML = '';
        dicasResultadoEl.innerHTML = '';
        previsaoTempoResultadoEl.innerHTML = '';
        return;
    }

    nomeVeiculoSelecionadoEl.textContent = `${veiculoAtual.modelo} (${veiculoAtual.constructor.name})`;
    informacoesVeiculoEl.innerHTML = veiculoAtual.exibirInformacoes();
    velocimetroProgress.value = veiculoAtual.velocidade;
    velocimetroProgress.max = veiculoAtual.velocidadeMaxima;
    velocidadeTexto.textContent = `${veiculoAtual.velocidade} km/h`;
    acoesEsportivo.forEach(el => el.style.display = (veiculoAtual instanceof CarroEsportivo) ? 'inline-block' : 'none');
    acoesCaminhao.forEach(el => el.style.display = (veiculoAtual instanceof Caminhao) ? 'inline-block' : 'none');
    historicoManutencaoEl.innerHTML = veiculoAtual.obterHistoricoManutencaoFormatado();
    
    apiResultadoEl.innerHTML = '<p>Clique no botão acima para buscar detalhes.</p>';
    dicasResultadoEl.innerHTML = '<p>Clique no botão acima para ver dicas.</p>';
    previsaoTempoResultadoEl.innerHTML = '<p>Digite uma cidade e verifique o clima.</p>';
    
    document.querySelectorAll('#botoes-veiculo button').forEach(btn => {
        btn.classList.toggle('selecionado', btn.dataset.veiculoId === idVeiculoAtual);
    });
}

function interagir(acao) {
    if (!veiculoAtual) return;
    try {
        switch (acao) {
            case 'ligar': case 'desligar': case 'acelerar': case 'frear': case 'buzinar':
            case 'ativarTurbo': case 'desativarTurbo':
                if (typeof veiculoAtual[acao] === 'function') veiculoAtual[acao]();
                break;
            case 'carregar': case 'descarregar':
                if (veiculoAtual instanceof Caminhao) {
                    const peso = parseFloat(inputPesoCarga.value);
                    if (!isNaN(peso) && peso > 0) veiculoAtual[acao](peso);
                    else mostrarAlerta("Insira um peso válido.", "erro");
                }
                break;
        }
    } catch (error) {
        mostrarAlerta(`Erro: ${error.message}`, "erro");
    }
}

function adicionarVeiculoNaGaragem(veiculo, id) {
    id = id || `v_${Date.now()}`;
    if (garagem[id]) {
        mostrarAlerta(`ID de veículo '${id}' já existe.`, "erro");
        return null;
    }
    garagem[id] = veiculo;
    salvarGaragem();
    criarBotoesSelecaoVeiculo();
    return id;
}

function criarBotoesSelecaoVeiculo() {
    botoesVeiculoContainer.innerHTML = '';
    const ids = Object.keys(garagem);
    if (ids.length === 0) {
        botoesVeiculoContainer.innerHTML = '<p>Garagem vazia.</p>';
        return;
    }
    ids.forEach(id => {
        const btn = document.createElement('button');
        btn.textContent = `${garagem[id].modelo}`;
        btn.dataset.veiculoId = id;
        btn.addEventListener('click', () => selecionarVeiculo(id));
        botoesVeiculoContainer.appendChild(btn);
    });
}

function selecionarVeiculo(id) {
    if (!garagem[id]) return;
    idVeiculoAtual = id;
    veiculoAtual = garagem[id];
    atualizarDisplayVeiculo();
    verificarAgendamentosProximos(veiculoAtual);
}

function salvarGaragem() {
    const garagemSerializavel = Object.keys(garagem).reduce((acc, id) => {
        const v = garagem[id];
        acc[id] = {
            tipo: v.constructor.name,
            dados: {
                ...v,
                historicoManutencao: v.historicoManutencao.map(m => m.toJSON())
            }
        };
        return acc;
    }, {});
    localStorage.setItem('garagemVirtual', JSON.stringify(garagemSerializavel));
}

function carregarGaragem() {
    const garagemSalva = localStorage.getItem('garagemVirtual');
    if (!garagemSalva) {
        console.log("Nenhum dado salvo. Criando veículos iniciais.");
        adicionarVeiculoNaGaragem(new Carro('Fusca', 'Azul'), 'carro1');
        adicionarVeiculoNaGaragem(new CarroEsportivo('Ferrari F40', 'Vermelha'), 'esportivo1');
        adicionarVeiculoNaGaragem(new Caminhao('Scania R450', 'Branco', 25000), 'caminhao1');
        return;
    }
    const garagemParseada = JSON.parse(garagemSalva);
    garagem = Object.keys(garagemParseada).reduce((acc, id) => {
        // --- CORREÇÃO DO ERRO DE SINTAXE ---
        // A linha abaixo estava com um ponto final, quebrando o código. Foi removido.
        const { tipo, dados } = garagemParseada[id];
        let veiculo;
        switch (tipo) {
            case 'Carro': veiculo = new Carro(dados.modelo, dados.cor); break;
            case 'CarroEsportivo': veiculo = new CarroEsportivo(dados.modelo, dados.cor); break;
            case 'Caminhao': veiculo = new Caminhao(dados.modelo, dados.cor, dados.capacidadeCarga); break;
            default: return acc;
        }
        Object.assign(veiculo, dados);
        veiculo.historicoManutencao = dados.historicoManutencao.map(Manutencao.fromJSON).filter(Boolean);
        acc[id] = veiculo;
        return acc;
    }, {});
}

function verificarAgendamentosProximos(veiculo) {
    if (!veiculo || !veiculo.historicoManutencao) return;
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const amanha = new Date(hoje); amanha.setDate(hoje.getDate() + 1);
    veiculo.historicoManutencao.forEach(m => {
        const dataManut = new Date(m.data + 'T00:00:00');
        if (dataManut.getTime() === hoje.getTime()) mostrarAlerta(`🔔 Lembrete HOJE: ${m.tipo} p/ ${veiculo.modelo}!`, 'info');
        else if (dataManut.getTime() === amanha.getTime()) mostrarAlerta(`🔔 Lembrete AMANHÃ: ${m.tipo} p/ ${veiculo.modelo}.`, 'info');
    });
}

function processarDadosForecast(data) {
    if (!data || !data.list) return null;
    const previsaoPorDia = data.list.reduce((acc, item) => {
        const diaStr = new Date(item.dt * 1000).toISOString().split('T')[0];
        if (!acc[diaStr]) acc[diaStr] = { temps: [], entradas: [] };
        acc[diaStr].temps.push(item.main.temp);
        acc[diaStr].entradas.push(item);
        return acc;
    }, {});
    return Object.entries(previsaoPorDia).map(([dia, dados]) => {
        const meioDia = dados.entradas.find(e => new Date(e.dt*1000).getUTCHours() === 12) || dados.entradas[0];
        return {
            dataISO: dia,
            data: new Date(dia + 'T12:00:00Z').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }),
            temp_min: Math.round(Math.min(...dados.temps)),
            temp_max: Math.round(Math.max(...dados.temps)),
            descricao: meioDia.weather[0].description,
            icone: meioDia.weather[0].icon,
            entradasDetalhadas: dados.entradas,
        };
    }).sort((a,b) => a.dataISO.localeCompare(b.dataISO));
}

function renderizarPrevisaoComFiltros() {
    if (!dadosPrevisaoCompletos) return;
    const numDias = parseInt(filtroDiasPrevisaoSelect.value);
    const previsaoFiltrada = dadosPrevisaoCompletos.slice(0, numDias);
    exibirPrevisaoDetalhada(previsaoFiltrada);
}

function exibirPrevisaoDetalhada(previsaoDiaria) {
    previsaoTempoResultadoEl.innerHTML = '';
    previsaoDiaria.forEach(dia => {
        const diaDiv = document.createElement('div');
        diaDiv.className = 'dia-previsao';
        if (destaqueChuvaCheckbox.checked && dia.descricao.includes('chuva')) diaDiv.classList.add('destaque-chuva');
        if (destaqueTempBaixaCheckbox.checked && dia.temp_min < 5) diaDiv.classList.add('destaque-temp-baixa');
        if (destaqueTempAltaCheckbox.checked && dia.temp_max > 30) diaDiv.classList.add('destaque-temp-alta');
        diaDiv.innerHTML = `
            <h5>${dia.data}</h5>
            <p>Temp: <strong>${dia.temp_min}°C</strong> - <strong>${dia.temp_max}°C</strong></p>
            <div class="info-clima">
                <img src="https://openweathermap.org/img/wn/${dia.icone}@2x.png" alt="${dia.descricao}">
                <p>${dia.descricao.charAt(0).toUpperCase() + dia.descricao.slice(1)}</p>
            </div>`;
        previsaoTempoResultadoEl.appendChild(diaDiv);
    });
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    carregarGaragem();
    criarBotoesSelecaoVeiculo();
    selecionarVeiculo(Object.keys(garagem)[0]);

    // Carregamento do conteúdo global da vitrine da garagem
    carregarVeiculosDestaque();
    carregarServicosGaragem();

    // Adiciona todos os outros event listeners
    controlesVeiculoEl.addEventListener('click', e => e.target.dataset.acao && interagir(e.target.dataset.acao));
    
    formAddVeiculo.addEventListener('submit', e => {
        e.preventDefault();
        const tipo = e.target.elements['tipo-veiculo'].value;
        const modelo = e.target.elements['modelo-veiculo'].value.trim();
        const cor = e.target.elements['cor-veiculo'].value.trim();
        const cap = parseFloat(e.target.elements['capacidade-veiculo'].value);
        if (!tipo || !modelo || !cor) return mostrarAlerta("Preencha todos os campos.", "erro");
        let novoVeiculo;
        switch (tipo) {
            case 'Carro': novoVeiculo = new Carro(modelo, cor); break;
            case 'CarroEsportivo': novoVeiculo = new CarroEsportivo(modelo, cor); break;
            case 'Caminhao':
                if (isNaN(cap) || cap <= 0) return mostrarAlerta("Capacidade inválida.", "erro");
                novoVeiculo = new Caminhao(modelo, cor, cap);
                break;
            default: return;
        }
        const novoId = adicionarVeiculoNaGaragem(novoVeiculo);
        if (novoId) {
            mostrarAlerta(`${tipo} "${modelo}" adicionado!`, "info");
            e.target.reset();
            selecionarVeiculo(novoId);
        }
    });

    formAddManutencao.addEventListener('submit', e => {
        e.preventDefault();
        if (!veiculoAtual) return;
        const data = e.target.elements['data-manutencao'].value;
        const tipo = e.target.elements['tipo-servico'].value;
        const custo = e.target.elements['custo-manutencao'].value;
        const desc = e.target.elements['descricao-manutencao'].value;
        if (veiculoAtual.adicionarManutencao(new Manutencao(data, tipo, custo, desc))) {
            mostrarAlerta("Manutenção registrada!", "info");
            e.target.reset();
        }
    });

    document.getElementById('tipo-veiculo').addEventListener('change', e => {
        document.getElementById('campo-capacidade').style.display = e.target.value === 'Caminhao' ? 'block' : 'none';
    });

    volumeControl.addEventListener('input', e => volumeAtual = parseFloat(e.target.value));
    
    btnBuscarApiDetalhes.addEventListener('click', async () => {
        if (!idVeiculoAtual) return;
        apiLoadingEl.style.display = 'block';
        apiResultadoEl.innerHTML = '';
        try {
            const todosOsDetalhes = await buscarApi('http://localhost:3000/api/veiculos/detalhes');
            const detalheVeiculo = todosOsDetalhes[idVeiculoAtual];

            if (!detalheVeiculo) throw new Error("Detalhes não encontrados para este veículo.");
            
            apiResultadoEl.innerHTML = `<h4>${detalheVeiculo.nomeCompleto} (${detalheVeiculo.anoFabricacao})</h4>
                <p><strong>Valor FIPE:</strong> ${detalheVeiculo.valorFipeEstimado}</p>
                <p style="color:${detalheVeiculo.recallPendente ? 'red' : 'green'};">
                    <strong>${detalheVeiculo.recallPendente ? '🔴 RECALL PENDENTE' : '✅ Sem recalls pendentes'}</strong>
                    ${detalheVeiculo.recallPendente ? `: ${detalheVeiculo.recallDetalhe}` : ''}
                </p>
                <p><strong>Dica Avançada:</strong> ${detalheVeiculo.dicaManutencaoAvancada}</p>
                <p><strong>Curiosidade:</strong> ${detalheVeiculo.curiosidade}</p>`;
        } catch(error) {
             apiResultadoEl.innerHTML = `<p class="api-erro">${error.message}</p>`;
        } finally {
            apiLoadingEl.style.display = 'none';
        }
    });

    verificarClimaBtn.addEventListener('click', buscarPrevisaoDetalhada);
    
    [filtroDiasPrevisaoSelect, destaqueChuvaCheckbox, destaqueTempBaixaCheckbox, destaqueTempAltaCheckbox].forEach(el => {
        el.addEventListener('change', renderizarPrevisaoComFiltros);
    });

    btnBuscarDicas.addEventListener('click', buscarDicasManutencaoAPI);
});