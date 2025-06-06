// script.js - Lógica da Garagem Virtual Interativa
// ... (todo o código da parte de classes, como Manutencao, Veiculo, Carro, etc., permanece o mesmo) ...

// --- FUNÇÕES DE PREVISÃO DO TEMPO (CORRIGIDA PARA USAR O BACKEND) ---
/**
 * Busca a previsão do tempo detalhada através do nosso servidor backend.
 * @param {string} cidade - Nome da cidade.
 * @returns {Promise<object|null>} Uma Promise que resolve com os dados da previsão ou null/objeto de erro.
 */
async function buscarPrevisaoDetalhada(cidade) {
    if (!cidade) {
        console.warn("buscarPrevisaoDetalhada chamada sem nome da cidade.");
        return { error: true, message: "Nome da cidade não fornecido." };
    }

    // URL do nosso endpoint no backend. Como o frontend está sendo servido
    // pelo mesmo servidor, podemos usar um caminho relativo.
    const backendUrl = `/api/weather?cidade=${encodeURIComponent(cidade)}`;
    console.log(`[FRONTEND] Chamando a API do backend em: ${backendUrl}`);

    try {
        const response = await fetch(backendUrl); // Chama o nosso backend
        const data = await response.json();

        if (!response.ok) {
            // A mensagem de erro agora virá do nosso backend
            const errorMessage = data.message || `Erro ${response.status}: ${response.statusText}`;
            console.error(`[FRONTEND] Erro recebido do backend ao buscar clima para (${cidade}): ${errorMessage}`);
            throw new Error(errorMessage);
        }
        console.log("[FRONTEND] Dados brutos da previsão recebidos do backend:", data);
        return data;
    } catch (error) {
        console.error("[FRONTEND] Erro de conexão/fetch com o backend:", error);
        return { error: true, message: `Falha ao comunicar com o servidor para obter a previsão. Verifique se o backend está rodando. (${error.message})` };
    }
}


// ... (todo o resto do código, como processarDadosForecast, renderizarPrevisao, etc., permanece o mesmo) ...


// --- FUNÇÕES DA API SIMULADA (DETALHES DO VEÍCULO) ---
// **** CORREÇÃO CRÍTICA APLICADA AQUI ****
async function buscarDetalhesVeiculoAPI(identificadorVeiculo) {
    console.log("buscarDetalhesVeiculoAPI chamada com ID:", identificadorVeiculo);
    if (!identificadorVeiculo) {
        console.warn("buscarDetalhesVeiculoAPI chamado sem identificador.");
        return null;
    }
    // Simula um pequeno atraso da API
    await new Promise(resolve => setTimeout(resolve, 700));
     try {
        const response = await fetch('./dados_veiculos_api.json');
        if (!response.ok) {
            console.error("Erro na API (fetch):", response.status, response.statusText);
            throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log("Dados da API carregados:", data);
        
        // **BUG CORRIGIDO AQUI:** Antes retornava `data` (o objeto inteiro).
        // Agora, ele procura a chave correspondente ao ID do veículo.
        const detalhesVeiculo = data[identificadorVeiculo];

        if (detalhesVeiculo) {
             console.log(`Detalhes encontrados para ${identificadorVeiculo}:`, detalhesVeiculo);
             return detalhesVeiculo;
        } else {
             console.warn(`Nenhum detalhe encontrado no JSON para o ID: ${identificadorVeiculo}`);
             return null; // Retorna nulo se o ID não for encontrado no arquivo
        }

    } catch (error) {
        console.error("Erro ao buscar detalhes na API simulada:", error);
        return { error: true, message: `Falha ao carregar dados da API: ${error.message}. Verifique se o arquivo 'dados_veiculos_api.json' existe e está acessível.` };
    }
}


// ... (O restante do arquivo script.js permanece exatamente o mesmo) ...
"use strict";

// --- Classe Manutencao ---
class Manutencao {
    constructor(data, tipo, custo, descricao = '') {
        this.data = data;
        this.tipo = tipo.trim();
        this.custo = parseFloat(custo);
        this.descricao = descricao.trim();
        this.id = `m_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    validar() {
        const dataObj = new Date(this.data + 'T00:00:00'); // Treat date as local
        const dataValida = dataObj instanceof Date && !isNaN(dataObj.getTime());
        const tipoValido = typeof this.tipo === 'string' && this.tipo !== '';
        const custoValido = typeof this.custo === 'number' && isFinite(this.custo) && this.custo >= 0;
        return dataValida && tipoValido && custoValido;
    }

    formatarData() {
        try {
            const dataObj = new Date(this.data + 'T00:00:00'); // Treat date as local
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
        return {
            data: this.data,
            tipo: this.tipo,
            custo: this.custo,
            descricao: this.descricao,
            id: this.id
        };
    }

    static fromJSON(json) {
        if (!json || typeof json !== 'object') return null;
        const m = new Manutencao(json.data, json.tipo, json.custo, json.descricao);
        m.id = json.id || m.id; // Preserve existing ID if available
        return m.validar() ? m : null;
    }
}


// --- Classe Base Veiculo ---
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
        if (this.ligado) {
            this.exibirAlerta(`${this.modelo} já está ligado.`, 'info');
            return;
        }
        this.ligado = true;
        this.tocarSom('ligar');
        console.log(`${this.modelo} ligado.`);
        this.atualizarInterface();
    }

    desligar() {
        if (!this.ligado) {
            this.exibirAlerta(`${this.modelo} já está desligado.`, 'info');
            return;
        }
        if (this.velocidade > 0) {
            this.exibirAlerta(`Não é possível desligar ${this.modelo} em movimento (Velocidade: ${this.velocidade} km/h).`, 'erro');
            return;
        }
        this.ligado = false;
        this.tocarSom('desligar');
        console.log(`${this.modelo} desligado.`);
        this.atualizarInterface();
    }

    acelerar(incremento = 10) {
        if (!this.ligado) {
            this.exibirAlerta(`Ligue o ${this.modelo} antes de acelerar.`, 'erro');
            return;
        }
        if (this.velocidade >= this.velocidadeMaxima) {
             this.exibirAlerta(`${this.modelo} já está na velocidade máxima (${this.velocidadeMaxima} km/h).`, 'info');
             return;
        }
        this.velocidade = Math.min(this.velocidade + Math.round(incremento), this.velocidadeMaxima);
        this.tocarSom('acelerar');
        console.log(`${this.modelo} acelerou para ${this.velocidade} km/h.`);
        this.atualizarInterface();
    }

    frear(decremento = 10) {
        if (this.velocidade === 0) {
             this.exibirAlerta(`${this.modelo} já está parado.`, 'info');
             return;
        }
        this.velocidade = Math.max(this.velocidade - Math.round(decremento), 0);
        this.tocarSom('frear');
        if (this.velocidade === 0) {
            console.log(`${this.modelo} parou.`);
        } else {
            console.log(`${this.modelo} freou para ${this.velocidade} km/h.`);
        }
        this.atualizarInterface();
    }

    buzinar() {
        this.tocarSom('buzina');
        console.log(`${this.modelo} buzinou!`);
    }

    exibirInformacoes() {
        return `
            <strong>Modelo:</strong> ${this.modelo}<br>
            <strong>Cor:</strong> ${this.cor}<br>
            <strong>Status:</strong> <span class="status-${this.ligado ? 'ligado' : 'desligado'}">${this.ligado ? 'Ligado ✅' : 'Desligado ❌'}</span><br>
            <strong>Velocidade Atual:</strong> ${this.velocidade} km/h<br>
            <strong>Velocidade Máxima:</strong> ${this.velocidadeMaxima} km/h
        `;
    }

    atualizarInterface() {
        if (typeof atualizarDisplayVeiculo === 'function') {
            atualizarDisplayVeiculo();
        }
         if (typeof salvarGaragem === 'function') {
            salvarGaragem();
        }
    }

    exibirAlerta(mensagem, tipo = 'info') {
        if (typeof mostrarAlerta === 'function') {
            mostrarAlerta(mensagem, tipo);
        } else {
            // Fallback para console e alert se mostrarAlerta não estiver definida globalmente
            (tipo === 'erro' ? console.error : console.log)(`ALERTA [${this.modelo}]: ${mensagem}`);
            alert(`[${this.modelo}] ${mensagem}`);
        }
    }

    tocarSom(acao) {
         if (typeof tocarSomVeiculo === 'function') {
            tocarSomVeiculo(acao);
        }
    }

    adicionarManutencao(manutencao) {
        if (!Array.isArray(this.historicoManutencao)) { // Garantir que é um array
            this.historicoManutencao = [];
        }
        if (manutencao instanceof Manutencao && manutencao.validar()) {
            this.historicoManutencao.push(manutencao);
            console.log(`Manutenção [${manutencao.tipo}] adicionada ao ${this.modelo}.`);
            this.atualizarInterface(); // Atualiza UI e salva
            return true; // Sucesso
        } else {
            console.error("Tentativa de adicionar manutenção inválida:", manutencao);
            this.exibirAlerta("Erro ao adicionar manutenção: dados inválidos ou objeto incorreto.", "erro");
            return false; // Falha
        }
    }

    obterHistoricoManutencaoFormatado() {
        if (!this.historicoManutencao || this.historicoManutencao.length === 0) {
            return "<p>Nenhuma manutenção registrada ou agendada para este veículo.</p>";
        }

        const agora = new Date();
        agora.setHours(0, 0, 0, 0); // Para comparar apenas a data

        const historico = [];
        const agendamentos = [];

        // Cria uma cópia para ordenação para não modificar o array original diretamente
        [...this.historicoManutencao]
            .sort((a, b) => new Date(b.data + 'T00:00:00') - new Date(a.data + 'T00:00:00')) // Ordena por data mais recente primeiro para histórico
            .forEach(m => {
                const dataManutencao = new Date(m.data + 'T00:00:00'); // Trata como data local
                if (dataManutencao <= agora) {
                    historico.push(m);
                } else {
                    agendamentos.push(m);
                }
            });
        // Agendamentos devem ser ordenados por data mais próxima primeiro
        agendamentos.sort((a, b) => new Date(a.data + 'T00:00:00') - new Date(b.data + 'T00:00:00'));

        let historicoHTML = "<h4>Histórico de Manutenção</h4>";
        if (historico.length > 0) {
            historicoHTML += "<ul>";
            historico.forEach(m => historicoHTML += `<li>${m.formatar()}</li>`);
            historicoHTML += "</ul>";
        } else {
            historicoHTML += "<p>Nenhum registro de manutenção passada.</p>";
        }

        let agendamentosHTML = "<h4>Agendamentos Futuros</h4>";
        if (agendamentos.length > 0) {
            agendamentosHTML += "<ul>";
            agendamentos.forEach(m => agendamentosHTML += `<li>${m.formatar()} <span style='color: #007bff;'><i>(Agendado)</i></span></li>`);
            agendamentosHTML += "</ul>";
        } else {
            agendamentosHTML += "<p>Nenhum agendamento futuro encontrado.</p>";
        }
        return historicoHTML + agendamentosHTML;
    }
}

// --- Classe Carro ---
class Carro extends Veiculo {
    constructor(modelo, cor) {
        super(modelo, cor);
        console.log(`Carro específico ${this.modelo} ${this.cor} criado.`);
    }
    definirVelocidadeMaxima() {
        return 180; // km/h
    }
}

// --- Classe CarroEsportivo ---
class CarroEsportivo extends Carro {
    constructor(modelo, cor) {
        super(modelo, cor);
        this.turboAtivado = false;
        console.log(`Carro Esportivo ${this.modelo} ${this.cor} criado.`);
    }

    definirVelocidadeMaxima() {
        return 250; // km/h
    }

    ativarTurbo() {
        if (!this.ligado) {
            this.exibirAlerta(`Ligue o ${this.modelo} antes de ativar o turbo.`, 'erro');
            return;
        }
        if (this.turboAtivado) {
            this.exibirAlerta(`O turbo do ${this.modelo} já está ativado.`, 'info');
            return;
        }
        this.turboAtivado = true;
        console.log(`Turbo do ${this.modelo} ativado! 🚀`);
        this.exibirAlerta(`Turbo do ${this.modelo} ativado! 🔥`, 'info');
        this.atualizarInterface(); // Atualiza o display e salva
    }

    desativarTurbo() {
         if (!this.turboAtivado) {
            this.exibirAlerta(`O turbo do ${this.modelo} já está desativado.`, 'info');
            return;
        }
        this.turboAtivado = false;
        console.log(`Turbo do ${this.modelo} desativado.`);
        this.exibirAlerta(`Turbo do ${this.modelo} desativado.`, 'info');
        this.atualizarInterface(); // Atualiza o display e salva
    }

    acelerar(incrementoBase = 15) {
        if (!this.ligado) {
            this.exibirAlerta(`Ligue o ${this.modelo} antes de acelerar.`, 'erro');
            return;
        }
         if (this.velocidade >= this.velocidadeMaxima) {
             this.exibirAlerta(`${this.modelo} já está na velocidade máxima (${this.velocidadeMaxima} km/h).`, 'info');
             return;
        }

        const fatorTurbo = 1.8;
        const incrementoReal = this.turboAtivado ? incrementoBase * fatorTurbo : incrementoBase;

        this.velocidade = Math.min(this.velocidade + Math.round(incrementoReal), this.velocidadeMaxima);
        this.tocarSom('acelerar');
        console.log(`${this.modelo} ${this.turboAtivado ? '(Turbo ON)' : ''} acelerou para ${this.velocidade} km/h.`);
        this.atualizarInterface();
    }

    exibirInformacoes() {
        const infoBase = super.exibirInformacoes();
        return `
            ${infoBase}<br>
            <strong>Turbo:</strong> <span class="status-${this.turboAtivado ? 'ligado' : 'desligado'}">${this.turboAtivado ? 'Ativado 🔥' : 'Desativado'}</span>
        `;
    }
}

// --- Classe Caminhao ---
class Caminhao extends Veiculo {
    constructor(modelo, cor, capacidadeCarga) {
        super(modelo, cor);
        this.capacidadeCarga = typeof capacidadeCarga === 'number' && capacidadeCarga > 0 ? capacidadeCarga : 0;
        this.cargaAtual = 0;
        console.log(`Caminhão ${this.modelo} ${this.cor} com capacidade ${this.capacidadeCarga.toLocaleString()}kg criado.`);
    }

    definirVelocidadeMaxima() {
        return 100; // km/h
    }

    carregar(peso) {
        if (this.ligado) {
             this.exibirAlerta(`Desligue o ${this.modelo} antes de carregar/descarregar.`, 'erro');
             return;
        }
        if (isNaN(peso) || peso <= 0) {
            this.exibirAlerta("O peso a carregar deve ser um número positivo.", "erro");
            return;
        }
        if (this.cargaAtual + peso > this.capacidadeCarga) {
            const espacoLivre = this.capacidadeCarga - this.cargaAtual;
            this.exibirAlerta(`Não é possível carregar ${peso.toLocaleString()}kg. Excede a capacidade em ${(peso - espacoLivre).toLocaleString()}kg. (Espaço livre: ${espacoLivre.toLocaleString()}kg).`, "erro");
        } else {
            this.cargaAtual += peso;
            console.log(`${this.modelo} carregado com ${peso.toLocaleString()}kg. Carga atual: ${this.cargaAtual.toLocaleString()}kg.`);
            this.exibirAlerta(`${this.modelo} carregado com ${peso.toLocaleString()}kg. Carga atual: ${this.cargaAtual.toLocaleString()}kg.`, 'info');
            this.atualizarInterface();
        }
    }

     descarregar(peso) {
        if (this.ligado) {
             this.exibirAlerta(`Desligue o ${this.modelo} antes de carregar/descarregar.`, 'erro');
             return;
        }
         if (isNaN(peso) || peso <= 0) {
            this.exibirAlerta("O peso a descarregar deve ser um número positivo.", "erro");
            return;
        }
        if (this.cargaAtual - peso < 0) {
            this.exibirAlerta(`Não é possível descarregar ${peso.toLocaleString()}kg. Carga atual (${this.cargaAtual.toLocaleString()}kg) é insuficiente.`, "erro");
        } else {
            this.cargaAtual -= peso;
            console.log(`${this.modelo} descarregado em ${peso.toLocaleString()}kg. Carga atual: ${this.cargaAtual.toLocaleString()}kg.`);
            this.exibirAlerta(`${this.modelo} descarregado em ${peso.toLocaleString()}kg. Carga atual: ${this.cargaAtual.toLocaleString()}kg.`, 'info');
            this.atualizarInterface();
        }
    }

    acelerar(incrementoBase = 8) {
        if (!this.ligado) {
            this.exibirAlerta(`Ligue o ${this.modelo} antes de acelerar.`, 'erro');
            return;
        }
         if (this.velocidade >= this.velocidadeMaxima) {
             this.exibirAlerta(`${this.modelo} já está na velocidade máxima (${this.velocidadeMaxima} km/h).`, 'info');
             return;
        }

        // Fator de carga afeta aceleração: mais carga, acelera menos.
        // Garante que fatorCarga seja no mínimo 0.4 (para não parar de acelerar com muita carga)
        const fatorCarga = Math.max(0.4, 1 - (this.cargaAtual / (this.capacidadeCarga * 1.5))); // *1.5 para não zerar o fator com carga máxima
        const incrementoReal = Math.max(1, Math.round(incrementoBase * fatorCarga)); // Acelera no mínimo 1km/h

        this.velocidade = Math.min(this.velocidade + incrementoReal, this.velocidadeMaxima);
        this.tocarSom('acelerar');
        console.log(`${this.modelo} acelerou ${incrementoReal}km/h para ${this.velocidade} km/h (Carga: ${this.cargaAtual.toLocaleString()}kg, Fator: ${fatorCarga.toFixed(2)}).`);
        this.atualizarInterface();
    }

    exibirInformacoes() {
        const infoBase = super.exibirInformacoes();
        const percentCarga = ((this.cargaAtual / (this.capacidadeCarga || 1)) * 100).toFixed(0); // || 1 para evitar divisão por zero
        return `
            ${infoBase}<br>
            <strong>Capacidade Carga:</strong> ${this.capacidadeCarga.toLocaleString()} kg<br>
            <strong>Carga Atual:</strong> ${this.cargaAtual.toLocaleString()} kg
            <progress value="${this.cargaAtual}" max="${this.capacidadeCarga}" title="${percentCarga}% carregado"></progress>
            <span style="font-size: 0.8em; margin-left: 5px;">(${percentCarga}%)</span>
        `;
    }
}


// ================================================================== //
// --- Lógica Principal da Aplicação e Manipulação da Interface --- //
// ================================================================== //

// --- Seleção de Elementos do DOM ---
console.log("Selecionando elementos do DOM...");
const botoesVeiculoContainer = document.getElementById('botoes-veiculo');
const nomeVeiculoSelecionadoEl = document.getElementById('nome-veiculo-selecionado');
const alertaContainer = document.getElementById('alerta-container');
const informacoesVeiculoEl = document.getElementById('informacoes-veiculo');
const velocimetroProgress = document.getElementById('velocimetro');
const velocidadeTexto = document.getElementById('velocidade-texto');
const controlesVeiculoEl = document.getElementById('controles-veiculo');
const acoesEsportivo = document.querySelectorAll('.acao-esportivo'); // NodeList
const acoesCaminhao = document.querySelectorAll('.acao-caminhao');   // NodeList
const inputPesoCarga = document.getElementById('peso-carga');
const historicoManutencaoEl = document.getElementById('historico-manutencao');
const formAddManutencao = document.getElementById('form-add-manutencao');
const dataManutencaoInput = document.getElementById('data-manutencao');
const tipoServicoInput = document.getElementById('tipo-servico');
const custoManutencaoInput = document.getElementById('custo-manutencao');
const descricaoManutencaoInput = document.getElementById('descricao-manutencao');
const manutencaoSemVeiculoMsg = document.getElementById('manutencao-sem-veiculo');
const formAddVeiculo = document.getElementById('form-add-veiculo');
const tipoVeiculoInput = document.getElementById('tipo-veiculo');
const modeloVeiculoInput = document.getElementById('modelo-veiculo');
const corVeiculoInput = document.getElementById('cor-veiculo');
const capacidadeVeiculoInput = document.getElementById('capacidade-veiculo');
const campoCapacidadeDiv = document.getElementById('campo-capacidade');
const volumeControl = document.getElementById('volume-control');
const sons = { // Objeto para fácil acesso aos elementos de áudio
    ligar: document.getElementById('som-ligar'),
    desligar: document.getElementById('som-desligar'),
    acelerar: document.getElementById('som-acelerar'),
    frear: document.getElementById('som-frear'),
    buzina: document.getElementById('som-buzina'),
};
const apiDetalhesContainerEl = document.getElementById('api-detalhes-container');
const btnBuscarApiDetalhes = document.getElementById('btn-buscar-api-detalhes');
const apiLoadingEl = document.getElementById('api-loading');
const apiResultadoEl = document.getElementById('api-resultado');

// NOVOS ELEMENTOS DO DOM PARA PREVISÃO DO TEMPO
const planejadorViagemContainerEl = document.getElementById('planejador-viagem-container');
const cidadeDestinoInput = document.getElementById('cidade-destino');
const verificarClimaBtn = document.getElementById('verificar-clima-btn');
const climaLoadingEl = document.getElementById('clima-loading');
const previsaoTempoResultadoEl = document.getElementById('previsao-tempo-resultado');
// ADDED: Selectors for weather filters
const filtroDiasPrevisaoSelect = document.getElementById('filtro-dias-previsao');
const destaqueChuvaCheckbox = document.getElementById('destaque-chuva');
const destaqueTempBaixaCheckbox = document.getElementById('destaque-temp-baixa');
const destaqueTempAltaCheckbox = document.getElementById('destaque-temp-alta');

console.log("Elementos do DOM selecionados.");

// --- Variáveis Globais de Estado da Aplicação ---
let garagem = {}; // Objeto para armazenar os veículos, usando ID como chave
let veiculoAtual = null; // Referência ao objeto do veículo atualmente selecionado
let idVeiculoAtual = null; // ID do veículo atualmente selecionado
let alertaTimeout = null; // Para controlar o timeout do alerta
let volumeAtual = 0.5; // Volume inicial dos sons
let dadosPrevisaoCompletos = null; // Armazena os dados brutos da API de previsão
let cidadePrevisaoAtual = null; // Armazena o nome da cidade da última previsão


// --- Funções Auxiliares da Interface (UI) ---
function mostrarAlerta(mensagem, tipo = 'info') {
    if (!alertaContainer) { console.error("Elemento #alerta-container não encontrado!"); return; }
    if (alertaTimeout) clearTimeout(alertaTimeout); // Limpa timeout anterior, se houver

    alertaContainer.textContent = mensagem;
    alertaContainer.className = ''; // Limpa classes anteriores
    alertaContainer.classList.add(`alerta-${tipo}`); // Adiciona a classe do tipo de alerta
    alertaContainer.style.display = 'block';
    alertaContainer.style.opacity = 1; // Garante que esteja visível

    const duracaoAlerta = 5000; // 5 segundos
    alertaTimeout = setTimeout(() => {
        alertaContainer.style.opacity = 0; // Começa a desaparecer
        setTimeout(() => { // Espera a transição de opacidade terminar
             if (alertaContainer.style.opacity === '0') { // Verifica se ainda deve ser escondido
                 alertaContainer.style.display = 'none';
                 alertaContainer.textContent = '';
                 alertaContainer.className = ''; // Limpa classes ao esconder
             }
        }, 400); // Duração da transição de opacidade no CSS
        alertaTimeout = null; // Reseta o ID do timeout
    }, duracaoAlerta);
}

function tocarSomVeiculo(acao) {
     const som = sons[acao];
     if (som instanceof HTMLAudioElement) {
        som.pause(); // Garante que o som pare se já estiver tocando
        som.currentTime = 0; // Reinicia o som
        som.volume = volumeAtual; // Define o volume atual
        som.play().catch(error => console.warn(`Falha ao tocar som "${acao}": ${error.message}`));
     } else if (acao) { // Só avisa se uma ação foi passada mas o som não existe
         console.warn(`Elemento de áudio para a ação "${acao}" não encontrado.`);
     }
}

// --- Função Principal de Atualização da Interface ---
function atualizarDisplayVeiculo() {
    console.log(`Atualizando display. Veículo atual: ${idVeiculoAtual ? idVeiculoAtual : 'Nenhum'}`);

    if (!veiculoAtual || !idVeiculoAtual) { // Se nenhum veículo está selecionado
        nomeVeiculoSelecionadoEl.textContent = 'Nenhum';
        informacoesVeiculoEl.innerHTML = '<p>Selecione um veículo na garagem ou adicione um novo.</p>';
        controlesVeiculoEl.style.display = 'none';
        formAddManutencao.style.display = 'none';
        manutencaoSemVeiculoMsg.style.display = 'block';
        historicoManutencaoEl.innerHTML = ''; // Limpa histórico
        velocimetroProgress.style.display = 'none'; // Esconde velocímetro
        velocidadeTexto.style.display = 'none'; // Esconde texto da velocidade

        if (apiDetalhesContainerEl) apiDetalhesContainerEl.style.display = 'none';
        if (apiResultadoEl) apiResultadoEl.innerHTML = ''; // Limpa resultado da API de detalhes
        if (apiLoadingEl) apiLoadingEl.style.display = 'none';

        if (planejadorViagemContainerEl) planejadorViagemContainerEl.style.display = 'none';
        if (previsaoTempoResultadoEl) previsaoTempoResultadoEl.innerHTML = '';
        if (climaLoadingEl) climaLoadingEl.style.display = 'none';

        document.querySelectorAll('#botoes-veiculo button').forEach(btn => btn.classList.remove('selecionado'));
        console.log("Display atualizado para 'Nenhum veículo'.");
        return; // Encerra a função aqui
    }

    // Se um veículo está selecionado, atualiza a UI com suas informações
    controlesVeiculoEl.style.display = 'block';
    formAddManutencao.style.display = 'block';
    manutencaoSemVeiculoMsg.style.display = 'none';
    velocimetroProgress.style.display = 'block'; // Mostra velocímetro
    velocidadeTexto.style.display = 'inline-block'; // Mostra texto da velocidade

    if (apiDetalhesContainerEl) apiDetalhesContainerEl.style.display = 'block';
    if (apiResultadoEl) apiResultadoEl.innerHTML = '<p>Clique no botão acima para buscar detalhes.</p>'; // Mensagem inicial
    if (apiLoadingEl) apiLoadingEl.style.display = 'none';

    if (planejadorViagemContainerEl) planejadorViagemContainerEl.style.display = 'block';
    if (previsaoTempoResultadoEl) previsaoTempoResultadoEl.innerHTML = '<p>Digite uma cidade e clique em "Verificar Clima".</p>';
    if (climaLoadingEl) climaLoadingEl.style.display = 'none';

    nomeVeiculoSelecionadoEl.textContent = `${veiculoAtual.modelo} (${veiculoAtual.constructor.name})`;
    informacoesVeiculoEl.innerHTML = veiculoAtual.exibirInformacoes();

    velocimetroProgress.value = veiculoAtual.velocidade;
    velocimetroProgress.max = Math.max(1, veiculoAtual.velocidadeMaxima); // Evita max=0
    velocidadeTexto.textContent = `${veiculoAtual.velocidade} km/h`;
    velocimetroProgress.title = `Velocidade: ${veiculoAtual.velocidade}/${veiculoAtual.velocidadeMaxima} km/h`;

    // Controla visibilidade dos botões específicos (turbo, carga)
    acoesEsportivo.forEach(el => el.style.display = (veiculoAtual instanceof CarroEsportivo) ? 'inline-block' : 'none');
    acoesCaminhao.forEach(el => el.style.display = (veiculoAtual instanceof Caminhao) ? 'inline-block' : 'none');

    historicoManutencaoEl.innerHTML = veiculoAtual.obterHistoricoManutencaoFormatado();

    if (inputPesoCarga) inputPesoCarga.value = ''; // Limpa campo de peso

    // Destaca o botão do veículo atualmente selecionado
    document.querySelectorAll('#botoes-veiculo button').forEach(btn => {
        btn.classList.toggle('selecionado', btn.dataset.veiculoId === idVeiculoAtual);
    });

    console.log(`Display atualizado para veículo: ${idVeiculoAtual}`);
}

// --- Função de Interação Polimórfica ---
function interagir(acao) {
    if (!veiculoAtual) {
        mostrarAlerta("Selecione um veículo antes de interagir!", "erro");
        return;
    }
    console.log(`Executando ação: ${acao} em ${idVeiculoAtual}`);
    try {
        switch (acao) {
            case 'ligar': veiculoAtual.ligar(); break;
            case 'desligar': veiculoAtual.desligar(); break;
            case 'acelerar': veiculoAtual.acelerar(); break;
            case 'frear': veiculoAtual.frear(); break;
            case 'buzinar': veiculoAtual.buzinar(); break;
            case 'ativarTurbo':
            case 'desativarTurbo':
                if (veiculoAtual instanceof CarroEsportivo) {
                    veiculoAtual[acao](); // Chama o método diretamente (ativarTurbo ou desativarTurbo)
                } else {
                    mostrarAlerta(`Ação '${acao}' não disponível para ${veiculoAtual.constructor.name}.`, "erro");
                }
                break;
            case 'carregar':
            case 'descarregar':
                if (veiculoAtual instanceof Caminhao) {
                    const peso = parseFloat(inputPesoCarga.value);
                    if (!isNaN(peso) && peso > 0) {
                        veiculoAtual[acao](peso); // Chama carregar(peso) ou descarregar(peso)
                    } else {
                        mostrarAlerta("Insira um peso numérico positivo válido.", "erro");
                        inputPesoCarga.focus();
                    }
                } else {
                    mostrarAlerta(`Ação '${acao}' não disponível para ${veiculoAtual.constructor.name}.`, "erro");
                }
                break;
            default:
                console.warn(`Ação desconhecida: ${acao}`);
                mostrarAlerta(`Ação desconhecida: ${acao}`, "erro");
        }
    } catch (error) {
         console.error(`Erro ao executar ação '${acao}' em ${idVeiculoAtual}:`, error);
         mostrarAlerta(`Ocorreu um erro: ${error.message}`, "erro");
    }
}

// --- Funções de Gerenciamento da Garagem ---
function adicionarVeiculoNaGaragem(veiculo, id) {
    if (!id) { // Gera um ID único se não for fornecido
        id = `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    if (garagem.hasOwnProperty(id)) { // Verifica se o ID já existe
         mostrarAlerta(`Erro: ID de veículo '${id}' já existe.`, "erro");
         return null; // Falha ao adicionar
    }
    garagem[id] = veiculo; // Adiciona o veículo ao objeto garagem
    console.log(`Veículo ${id} (${veiculo.modelo}) adicionado.`);
    salvarGaragem(); // Persiste a garagem no LocalStorage
    criarBotoesSelecaoVeiculo(); // Atualiza os botões na UI
    return id; // Retorna o ID do veículo adicionado
}

function criarBotoesSelecaoVeiculo() {
    if (!botoesVeiculoContainer) return; // Proteção
    botoesVeiculoContainer.innerHTML = ''; // Limpa botões existentes
    const ids = Object.keys(garagem);
    if (ids.length === 0) {
        botoesVeiculoContainer.innerHTML = '<p>Garagem vazia. Adicione um veículo!</p>';
        return;
    }
    ids.forEach(id => {
        const veiculo = garagem[id];
        const btn = document.createElement('button');
        btn.textContent = `${veiculo.modelo} (${veiculo.constructor.name})`;
        btn.dataset.veiculoId = id; // Armazena o ID no botão para fácil acesso
        btn.title = `Selecionar ${veiculo.constructor.name} ${veiculo.modelo}`;
        btn.addEventListener('click', () => selecionarVeiculo(id));
        botoesVeiculoContainer.appendChild(btn);
    });
    // Se houver um veículo atual, marca seu botão como selecionado
    if (idVeiculoAtual && garagem[idVeiculoAtual]) {
        const btnAtual = botoesVeiculoContainer.querySelector(`button[data-veiculo-id="${idVeiculoAtual}"]`);
        if (btnAtual) btnAtual.classList.add('selecionado');
    }
}

function selecionarVeiculo(idVeiculo) {
    if (garagem.hasOwnProperty(idVeiculo)) {
        veiculoAtual = garagem[idVeiculo];
        idVeiculoAtual = idVeiculo;
        console.log(`Veículo ${idVeiculo} selecionado.`);

        // Limpa resultados de API e previsão do tempo ao trocar de veículo
        if (apiResultadoEl) apiResultadoEl.innerHTML = '<p>Clique no botão acima para buscar detalhes.</p>';
        if (apiLoadingEl) apiLoadingEl.style.display = 'none';

        if (previsaoTempoResultadoEl) previsaoTempoResultadoEl.innerHTML = '<p>Digite uma cidade e clique em "Verificar Clima".</p>';
        if (climaLoadingEl) climaLoadingEl.style.display = 'none';
        if (cidadeDestinoInput) cidadeDestinoInput.value = '';
        dadosPrevisaoCompletos = null;
        cidadePrevisaoAtual = null;

        atualizarDisplayVeiculo(); // Atualiza toda a UI para o novo veículo
        verificarAgendamentosProximos(veiculoAtual); // Verifica lembretes de manutenção
    } else {
        console.error(`Veículo com ID ${idVeiculo} não encontrado.`);
        veiculoAtual = null;
        idVeiculoAtual = null;
        mostrarAlerta(`Veículo ID ${idVeiculo} não encontrado.`, "erro");
        atualizarDisplayVeiculo(); // Atualiza UI para estado "nenhum selecionado"
    }
}

function salvarGaragem() {
    try {
        const garagemSerializavel = {};
        for (const id in garagem) {
            if (garagem.hasOwnProperty(id)) {
                const v = garagem[id];
                garagemSerializavel[id] = {
                    tipo: v.constructor.name,
                    dados: {
                        modelo: v.modelo, cor: v.cor, ligado: v.ligado, velocidade: v.velocidade,
                        turboAtivado: v.turboAtivado,
                        capacidadeCarga: v.capacidadeCarga,
                        cargaAtual: v.cargaAtual,
                        historicoManutencao: Array.isArray(v.historicoManutencao) ? v.historicoManutencao.map(m => m.toJSON()) : []
                    }
                };
            }
        }
        localStorage.setItem('garagemVirtual', JSON.stringify(garagemSerializavel));
    } catch (error) {
        console.error("Erro ao salvar no LocalStorage:", error);
        mostrarAlerta("Falha ao salvar dados da garagem.", "erro");
    }
}

function carregarGaragem() {
    console.log("Tentando carregar garagem do LocalStorage...");
    try {
        const garagemSalva = localStorage.getItem('garagemVirtual');
        if (!garagemSalva) {
            console.log("Nenhum dado salvo. Criando veículos iniciais.");
            adicionarVeiculoNaGaragem(new Carro('Fusca', 'Azul'), 'carro1');
            adicionarVeiculoNaGaragem(new CarroEsportivo('Ferrari F40', 'Vermelha'), 'esportivo1');
            adicionarVeiculoNaGaragem(new Caminhao('Scania R450', 'Branco', 25000), 'caminhao1');
            const dataEx = new Date(); dataEx.setDate(dataEx.getDate() - 5);
            const dataExStr = dataEx.toISOString().split('T')[0];
            const manutEx = new Manutencao(dataExStr, 'Revisão Geral', 350, 'Verificação de freios e fluidos');
            if(garagem['carro1']) garagem['carro1'].adicionarManutencao(manutEx);
            return;
        }

        const garagemSerializada = JSON.parse(garagemSalva);
        garagem = {};

        for (const id in garagemSerializada) {
            if (garagemSerializada.hasOwnProperty(id)) {
                const d = garagemSerializada[id];
                if (!d || !d.tipo || !d.dados) continue;

                let veiculoRecriado = null;
                switch (d.tipo) {
                    case 'Carro':         veiculoRecriado = new Carro(d.dados.modelo, d.dados.cor); break;
                    case 'CarroEsportivo':veiculoRecriado = new CarroEsportivo(d.dados.modelo, d.dados.cor); break;
                    case 'Caminhao':      veiculoRecriado = new Caminhao(d.dados.modelo, d.dados.cor, d.dados.capacidadeCarga); break;
                    default: console.warn(`Tipo ${d.tipo} desconhecido ao carregar.`); continue;
                }

                veiculoRecriado.ligado = d.dados.ligado === true;
                veiculoRecriado.velocidade = parseFloat(d.dados.velocidade) || 0;
                if (veiculoRecriado instanceof CarroEsportivo) veiculoRecriado.turboAtivado = d.dados.turboAtivado === true;
                if (veiculoRecriado instanceof Caminhao) veiculoRecriado.cargaAtual = parseFloat(d.dados.cargaAtual) || 0;

                veiculoRecriado.historicoManutencao = (Array.isArray(d.dados.historicoManutencao))
                    ? d.dados.historicoManutencao.map(mData => Manutencao.fromJSON(mData)).filter(m => m !== null)
                    : [];
                garagem[id] = veiculoRecriado;
            }
        }
        console.log("Garagem carregada do LocalStorage com sucesso.");

    } catch (error) {
        console.error("Erro crítico ao carregar/processar LocalStorage:", error);
        mostrarAlerta("Erro ao carregar dados. Resetando garagem.", "erro");
        localStorage.removeItem('garagemVirtual');
        garagem = {};
        adicionarVeiculoNaGaragem(new Carro('Fusca', 'Azul'), 'carro1');
        adicionarVeiculoNaGaragem(new CarroEsportivo('Ferrari F40', 'Vermelha'), 'esportivo1');
        adicionarVeiculoNaGaragem(new Caminhao('Scania R450', 'Branco', 25000), 'caminhao1');
    }
}

/**
 * Processa os dados brutos da API de previsão do tempo e agrupa por dia.
 * @param {object} data - Objeto de dados retornado pela API OpenWeatherMap (/forecast).
 * @returns {Array<object>|null} Array de objetos, cada um representando um dia com dados resumidos, ou null.
 */
function processarDadosForecast(data) {
    if (!data || !data.list || !Array.isArray(data.list) || data.list.length === 0) {
        console.warn("Dados de forecast inválidos ou lista vazia.");
        return null;
    }

    const previsaoPorDia = {};

    data.list.forEach(item => {
        const dataHora = new Date(item.dt * 1000);
        const diaStr = dataHora.toISOString().split('T')[0]; // AAAA-MM-DD para agrupar

        if (!previsaoPorDia[diaStr]) {
            previsaoPorDia[diaStr] = {
                dataCompleta: diaStr, temps: [], descricoes: {}, icones: {}, entradas: []
            };
        }
        previsaoPorDia[diaStr].entradas.push(item);
        previsaoPorDia[diaStr].temps.push(item.main.temp);
        const desc = item.weather[0].description;
        const icon = item.weather[0].icon;
        previsaoPorDia[diaStr].descricoes[desc] = (previsaoPorDia[diaStr].descricoes[desc] || 0) + 1;
        previsaoPorDia[diaStr].icones[icon] = (previsaoPorDia[diaStr].icones[icon] || 0) + 1;
    });

    const resultadoFinal = [];
    for (const dia in previsaoPorDia) {
        const dadosDia = previsaoPorDia[dia];
        let entradaRepresentativa = dadosDia.entradas.find(e => new Date(e.dt * 1000).getUTCHours() >= 12 && new Date(e.dt * 1000).getUTCHours() <= 15) || dadosDia.entradas[Math.floor(dadosDia.entradas.length / 2)];

        resultadoFinal.push({
            dataISO: dadosDia.dataCompleta,
            data: new Date(dadosDia.dataCompleta + 'T00:00:00Z').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }),
            temp_min: Math.round(Math.min(...dadosDia.temps)),
            temp_max: Math.round(Math.max(...dadosDia.temps)),
            descricao: entradaRepresentativa.weather[0].description,
            icone: entradaRepresentativa.weather[0].icon,
            entradasDetalhadas: dadosDia.entradas
        });
    }
    resultadoFinal.sort((a, b) => a.dataISO.localeCompare(b.dataISO));
    console.log("Dados processados da previsão:", resultadoFinal);
    return resultadoFinal;
}

function renderizarPrevisaoComFiltros() {
     if (!dadosPrevisaoCompletos || !cidadePrevisaoAtual || !filtroDiasPrevisaoSelect) return;
      const numDias = parseInt(filtroDiasPrevisaoSelect.value);
      const previsaoDiariaFiltrada = dadosPrevisaoCompletos.slice(0, numDias);
      exibirPrevisaoDetalhada(previsaoDiariaFiltrada, cidadePrevisaoAtual);
}

/**
 * Exibe a previsão do tempo detalhada na interface.
 * @param {Array<object>} previsaoDiaria - Array de objetos processados, cada um representando um dia.
 * @param {string} nomeCidade - Nome da cidade para exibir no título.
 */
function exibirPrevisaoDetalhada(previsaoDiaria, nomeCidade) {
    if (!previsaoTempoResultadoEl) return;
    previsaoTempoResultadoEl.innerHTML = '';

    if (!previsaoDiaria || previsaoDiaria.length === 0) {
        previsaoTempoResultadoEl.innerHTML = `<p>Não foi possível obter a previsão para ${nomeCidade}.</p>`;
        return;
    }

    const titulo = document.createElement('h4');
    titulo.textContent = `Previsão para ${nomeCidade} (Próximos ${previsaoDiaria.length} dias):`;
    previsaoTempoResultadoEl.appendChild(titulo);

    const containerDias = document.createElement('div');
    previsaoDiaria.forEach(dia => {
        const diaDiv = document.createElement('div');
        diaDiv.classList.add('dia-previsao');
        diaDiv.dataset.dataIso = dia.dataISO;

        if (destaqueChuvaCheckbox && destaqueChuvaCheckbox.checked && (dia.descricao.includes('chuva') || dia.descricao.includes('tempestade') || dia.descricao.includes('chuvisco'))) {
           diaDiv.classList.add('destaque-chuva');
        }
        if (destaqueTempBaixaCheckbox && destaqueTempBaixaCheckbox.checked && dia.temp_min < 5) {
           diaDiv.classList.add('destaque-temp-baixa');
        }
        if (destaqueTempAltaCheckbox && destaqueTempAltaCheckbox.checked && dia.temp_max > 30) {
           diaDiv.classList.add('destaque-temp-alta');
        }

        const dataH5 = document.createElement('h5');
        dataH5.textContent = dia.data;
        dataH5.title = "Clique para ver detalhes por hora";
        dataH5.addEventListener('click', () => toggleDetalhesDia(diaDiv, dia.entradasDetalhadas));

        const tempP = document.createElement('p');
        tempP.innerHTML = `Temp: <strong>${dia.temp_min}°C</strong> - <strong>${dia.temp_max}°C</strong>`;

        const infoClimaDiv = document.createElement('div');
        infoClimaDiv.classList.add('info-clima');

        const descP = document.createElement('p');
        descP.textContent = dia.descricao.charAt(0).toUpperCase() + dia.descricao.slice(1);

        const iconeImg = document.createElement('img');
        iconeImg.src = `https://openweathermap.org/img/wn/${dia.icone}@2x.png`;
        iconeImg.alt = dia.descricao;
        iconeImg.title = dia.descricao;

        infoClimaDiv.appendChild(iconeImg);
        infoClimaDiv.appendChild(descP);

        const detalhesHoraDiv = document.createElement('div');
        detalhesHoraDiv.classList.add('detalhes-hora');

        diaDiv.appendChild(dataH5);
        diaDiv.appendChild(tempP);
        diaDiv.appendChild(infoClimaDiv);
        diaDiv.appendChild(detalhesHoraDiv);
        containerDias.appendChild(diaDiv);
    });
    previsaoTempoResultadoEl.appendChild(containerDias);
}


/**
 * Alterna a exibição dos detalhes por hora de um dia específico.
 * @param {HTMLElement} diaDivElement - O elemento div do dia.
 * @param {Array<object>} entradasDetalhadas - Array com as previsões de 3 em 3 horas para aquele dia.
 */
function toggleDetalhesDia(diaDivElement, entradasDetalhadas) {
    if (!diaDivElement || !Array.isArray(entradasDetalhadas)) return;

    diaDivElement.classList.toggle('expandido');
    const detalhesHoraDiv = diaDivElement.querySelector('.detalhes-hora');
    if (!detalhesHoraDiv) return;

    if (diaDivElement.classList.contains('expandido')) {
        if (detalhesHoraDiv.innerHTML === '') {
            entradasDetalhadas.forEach(entrada => {
                const hora = new Date(entrada.dt * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
                const temp = Math.round(entrada.main.temp);
                const desc = entrada.weather[0].description;
                const umidade = entrada.main.humidity;
                const vento = (entrada.wind.speed * 3.6).toFixed(1); // m/s para km/h

                const p = document.createElement('p');
                p.innerHTML = `<strong>${hora} UTC:</strong> ${temp}°C, ${desc}, Umid: ${umidade}%, Vento: ${vento} km/h`;
                detalhesHoraDiv.appendChild(p);
            });
        }
    }
}


async function lidarComVerificarClima() {
    const cidade = cidadeDestinoInput.value.trim();
    if (!cidade) {
        mostrarAlerta("Por favor, insira o nome da cidade de destino.", "erro");
        cidadeDestinoInput.focus();
        return;
    }

    if (climaLoadingEl) climaLoadingEl.style.display = 'block';
    if (previsaoTempoResultadoEl) previsaoTempoResultadoEl.innerHTML = '';
    if (verificarClimaBtn) verificarClimaBtn.disabled = true;

    const dadosBrutos = await buscarPrevisaoDetalhada(cidade);

    if (climaLoadingEl) climaLoadingEl.style.display = 'none';
    if (verificarClimaBtn) verificarClimaBtn.disabled = false;

    if (dadosBrutos && !dadosBrutos.error) {
        dadosPrevisaoCompletos = processarDadosForecast(dadosBrutos);
        cidadePrevisaoAtual = dadosBrutos.city ? dadosBrutos.city.name : cidade;

        if (dadosPrevisaoCompletos) {
            renderizarPrevisaoComFiltros();
        } else {
            if (previsaoTempoResultadoEl) previsaoTempoResultadoEl.innerHTML = `<p class="api-erro">Não foi possível processar os dados da previsão para ${cidadePrevisaoAtual}.</p>`;
        }
    } else {
        if (previsaoTempoResultadoEl) previsaoTempoResultadoEl.innerHTML = `<p class="api-erro">${(dadosBrutos && dadosBrutos.message) || `Não foi possível obter a previsão para ${cidade}. Tente novamente.`}</p>`;
        dadosPrevisaoCompletos = null;
        cidadePrevisaoAtual = null;
    }
}

// --- Lógica de Agendamento e Lembretes ---
function verificarAgendamentosProximos(veiculo) {
    if (!veiculo || !Array.isArray(veiculo.historicoManutencao)) return;

    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const amanha = new Date(hoje); amanha.setDate(hoje.getDate() + 1);

    veiculo.historicoManutencao.forEach(m => {
        try {
            const dataManut = new Date(m.data + 'T00:00:00');
            if (isNaN(dataManut.getTime())) return;

            if (dataManut.getTime() === hoje.getTime()) {
                mostrarAlerta(`🔔 Lembrete HOJE: ${m.tipo} p/ ${veiculo.modelo}!`, 'info');
            } else if (dataManut.getTime() === amanha.getTime()) {
                mostrarAlerta(`🔔 Lembrete AMANHÃ: ${m.tipo} p/ ${veiculo.modelo}.`, 'info');
            }
        } catch(e) { console.error(`Erro ao verificar data de manutenção ${m.data}`, e); }
    });
}

async function lidarComBuscaApiDetalhes() {
    console.log("lidarComBuscaApiDetalhes chamada. Veículo atual:", idVeiculoAtual);
    if (!veiculoAtual || !idVeiculoAtual) {
        mostrarAlerta("Nenhum veículo selecionado para buscar detalhes.", "erro");
        return;
    }

    if (apiLoadingEl) apiLoadingEl.style.display = 'block';
    if (apiResultadoEl) apiResultadoEl.innerHTML = '';
    if (btnBuscarApiDetalhes) btnBuscarApiDetalhes.disabled = true;

    const detalhes = await buscarDetalhesVeiculoAPI(idVeiculoAtual);

    if (apiLoadingEl) apiLoadingEl.style.display = 'none';
    if (btnBuscarApiDetalhes) btnBuscarApiDetalhes.disabled = false;

    if (apiResultadoEl) {
        if (detalhes) {
            if (detalhes.error) {
                apiResultadoEl.innerHTML = `<p class="api-erro">${detalhes.message}</p>`;
            } else {
                let htmlDetalhes = `<h4>${detalhes.nomeCompleto || veiculoAtual.modelo} (Ano: ${detalhes.anoFabricacao || 'N/D'})</h4>`;
                htmlDetalhes += `<p><strong>Valor FIPE Estimado:</strong> ${detalhes.valorFipeEstimado || 'Não informado'}</p>`;

                if (detalhes.recallPendente) {
                    htmlDetalhes += `<p style="color: red;"><strong>🔴 RECALL PENDENTE!</strong> Detalhes: ${detalhes.recallDetalhe || 'Verificar com fabricante.'}</p>`;
                } else {
                    htmlDetalhes += `<p style="color: green;"><strong>✅ Sem recalls pendentes conhecidos.</strong></p>`;
                }

                htmlDetalhes += `<p><strong>Dica de Manutenção Avançada:</strong> ${detalhes.dicaManutencaoAvancada || 'Sem dicas específicas.'}</p>`;
                htmlDetalhes += `<p><strong>Curiosidade:</strong> ${detalhes.curiosidade || 'Sem curiosidades.'}</p>`;

                apiResultadoEl.innerHTML = htmlDetalhes;
            }
        } else {
            apiResultadoEl.innerHTML = `<p class="api-nao-encontrado">Nenhum detalhe adicional encontrado para este veículo (${idVeiculoAtual}) na API.</p>`;
        }
    }
}


// --- Event Listeners ---
if (controlesVeiculoEl) {
    controlesVeiculoEl.addEventListener('click', (event) => {
        const btn = event.target.closest('button[data-acao]');
        if (btn) interagir(btn.dataset.acao);
    });
}

if (formAddVeiculo) {
    formAddVeiculo.addEventListener('submit', (event) => {
        event.preventDefault();
        const tipo = tipoVeiculoInput.value;
        const modelo = modeloVeiculoInput.value.trim();
        const cor = corVeiculoInput.value.trim();
        const capStr = capacidadeVeiculoInput.value;

        if (!tipo || !modelo || !cor) { mostrarAlerta("Preencha Tipo, Modelo e Cor.", "erro"); return; }

        let novoVeiculo = null;
        try {
            switch (tipo) {
                case 'Carro': novoVeiculo = new Carro(modelo, cor); break;
                case 'CarroEsportivo': novoVeiculo = new CarroEsportivo(modelo, cor); break;
                case 'Caminhao':
                    const cap = parseFloat(capStr);
                    if (isNaN(cap) || cap <= 0) { mostrarAlerta("Capacidade inválida p/ Caminhão.", "erro"); capacidadeVeiculoInput.focus(); return; }
                    novoVeiculo = new Caminhao(modelo, cor, cap);
                    break;
                default: mostrarAlerta("Tipo inválido.", "erro"); return;
            }
            const novoId = adicionarVeiculoNaGaragem(novoVeiculo);
            if (novoId) {
                mostrarAlerta(`${tipo} "${modelo}" adicionado!`, "info");
                formAddVeiculo.reset();
                campoCapacidadeDiv.style.display = 'none';
                tipoVeiculoInput.value = "";
                selecionarVeiculo(novoId);
            }
        } catch (error) {
            console.error("Erro ao criar veículo:", error);
            mostrarAlerta(`Erro: ${error.message}`, "erro");
        }
    });
}

if (tipoVeiculoInput) {
    tipoVeiculoInput.addEventListener('change', () => {
        const ehCaminhao = tipoVeiculoInput.value === 'Caminhao';
        campoCapacidadeDiv.style.display = ehCaminhao ? 'block' : 'none';
        if (!ehCaminhao) capacidadeVeiculoInput.value = '';
    });
}

if (formAddManutencao) {
    formAddManutencao.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!veiculoAtual) { mostrarAlerta("Selecione um veículo para adicionar manutenção.", "erro"); return; }

        const data = dataManutencaoInput.value;
        const tipo = tipoServicoInput.value.trim();
        const custoStr = custoManutencaoInput.value;
        const desc = descricaoManutencaoInput.value.trim();

        if (!data || !tipo || custoStr === '') { mostrarAlerta("Preencha Data, Tipo de Serviço e Custo.", "erro"); return; }

        try {
            const novaManut = new Manutencao(data, tipo, custoStr, desc);
            if (novaManut.validar()) {
                if (veiculoAtual.adicionarManutencao(novaManut)) {
                    mostrarAlerta("Manutenção adicionada/agendada com sucesso!", "info");
                    formAddManutencao.reset();
                    verificarAgendamentosProximos(veiculoAtual);
                }
            } else {
                mostrarAlerta("Dados de manutenção inválidos. Verifique a Data (deve ser válida) e o Custo (deve ser numérico).", "erro");
            }
        } catch (error) {
            console.error("Erro ao adicionar manutenção:", error);
            mostrarAlerta(`Ocorreu um erro ao adicionar manutenção: ${error.message}`, "erro");
        }
    });
}

if (volumeControl) {
    volumeControl.addEventListener('input', (e) => {
        volumeAtual = parseFloat(e.target.value);
        Object.values(sons).forEach(som => { if(som instanceof HTMLAudioElement) som.volume = volumeAtual; });
    });
}

if (btnBuscarApiDetalhes) {
      btnBuscarApiDetalhes.addEventListener('click', lidarComBuscaApiDetalhes);
}

if (verificarClimaBtn) {
    verificarClimaBtn.addEventListener('click', lidarComVerificarClima);
}

if (filtroDiasPrevisaoSelect) {
    filtroDiasPrevisaoSelect.addEventListener('change', renderizarPrevisaoComFiltros);
}
if (destaqueChuvaCheckbox) {
    destaqueChuvaCheckbox.addEventListener('change', renderizarPrevisaoComFiltros);
}
if (destaqueTempBaixaCheckbox) {
    destaqueTempBaixaCheckbox.addEventListener('change', renderizarPrevisaoComFiltros);
}
if (destaqueTempAltaCheckbox) {
    destaqueTempAltaCheckbox.addEventListener('change', renderizarPrevisaoComFiltros);
}


// --- Inicialização da Aplicação ---
function inicializarAplicacao() {
    console.log("🚀 DOM carregado. Inicializando aplicação...");
    carregarGaragem();
    criarBotoesSelecaoVeiculo();

    const ids = Object.keys(garagem);
    if (ids.length > 0 && !idVeiculoAtual) {
        selecionarVeiculo(ids[0]);
    } else {
        atualizarDisplayVeiculo();
    }

    if (volumeControl) volumeControl.dispatchEvent(new Event('input'));

    if (tipoVeiculoInput && campoCapacidadeDiv) {
        campoCapacidadeDiv.style.display = (tipoVeiculoInput.value === 'Caminhao') ? 'block' : 'none';
    }
    console.log("✅ Aplicação Pronta.");
}

document.addEventListener('DOMContentLoaded', inicializarAplicacao);