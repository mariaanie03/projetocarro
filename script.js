// script.js - Lógica da Garagem Virtual Interativa
// Define o modo estrito para evitar erros comuns e práticas inseguras
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
const OPENWEATHERMAP_API_KEY = '189d11b2569e9dc749b6bd952cbdf02f'; // Sua chave da API OpenWeatherMap
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


        // ESCONDE PLANEJADOR DE VIAGEM (NOVO)
        if (planejadorViagemContainerEl) planejadorViagemContainerEl.style.display = 'none';
        if (previsaoTempoResultadoEl) previsaoTempoResultadoEl.innerHTML = '';
        if (climaLoadingEl) climaLoadingEl.style.display = 'none';


        // Remove a classe 'selecionado' de todos os botões de veículo
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

     // MOSTRA PLANEJADOR DE VIAGEM (NOVO)
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
// CHANGED: Moved adicionarVeiculoNaGaragem and criarBotoesSelecaoVeiculo to top-level
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
                // Prepara um objeto simples para serialização
                garagemSerializavel[id] = {
                    tipo: v.constructor.name, // Nome da classe para recriar o objeto
                    dados: { // Dados específicos do veículo
                        modelo: v.modelo, cor: v.cor, ligado: v.ligado, velocidade: v.velocidade,
                        // Propriedades específicas de subclasses
                        turboAtivado: v.turboAtivado, // undefined se não for CarroEsportivo, OK
                        capacidadeCarga: v.capacidadeCarga, // undefined se não for Caminhao, OK
                        cargaAtual: v.cargaAtual,       // undefined se não for Caminhao, OK
                        // Serializa o histórico de manutenção
                        historicoManutencao: Array.isArray(v.historicoManutencao) ? v.historicoManutencao.map(m => m.toJSON()) : []
                    }
                };
            }
        }
        localStorage.setItem('garagemVirtual', JSON.stringify(garagemSerializavel));
        // console.log("Garagem salva no LocalStorage.");
    } catch (error) {
        console.error("Erro ao salvar no LocalStorage:", error);
        mostrarAlerta("Falha ao salvar dados da garagem.", "erro");
    }
}

function carregarGaragem() {
    console.log("Tentando carregar garagem do LocalStorage...");
    try {
        const garagemSalva = localStorage.getItem('garagemVirtual');
        if (!garagemSalva) { // Se não há dados salvos, cria veículos iniciais
            console.log("Nenhum dado salvo. Criando veículos iniciais.");
            adicionarVeiculoNaGaragem(new Carro('Fusca', 'Azul'), 'carro1');
            adicionarVeiculoNaGaragem(new CarroEsportivo('Ferrari F40', 'Vermelha'), 'esportivo1');
            adicionarVeiculoNaGaragem(new Caminhao('Scania R450', 'Branco', 25000), 'caminhao1');
            // Adiciona uma manutenção de exemplo
            const dataEx = new Date(); dataEx.setDate(dataEx.getDate() - 5); // 5 dias atrás
            const dataExStr = dataEx.toISOString().split('T')[0];
            const manutEx = new Manutencao(dataExStr, 'Revisão Geral', 350, 'Verificação de freios e fluidos');
            if(garagem['carro1']) garagem['carro1'].adicionarManutencao(manutEx);

            return; // Encerra se criou os iniciais
        }

        const garagemSerializada = JSON.parse(garagemSalva);
        garagem = {}; // Limpa a garagem atual antes de carregar

        for (const id in garagemSerializada) { // Itera sobre os veículos salvos
            if (garagemSerializada.hasOwnProperty(id)) {
                const d = garagemSerializada[id]; // Dados do veículo serializado
                if (!d || !d.tipo || !d.dados) continue; // Pula se dados inválidos

                let veiculoRecriado = null;
                // Recria o objeto do veículo com base no tipo salvo
                switch (d.tipo) {
                    case 'Carro':         veiculoRecriado = new Carro(d.dados.modelo, d.dados.cor); break;
                    case 'CarroEsportivo':veiculoRecriado = new CarroEsportivo(d.dados.modelo, d.dados.cor); break;
                    case 'Caminhao':      veiculoRecriado = new Caminhao(d.dados.modelo, d.dados.cor, d.dados.capacidadeCarga); break;
                    default: console.warn(`Tipo ${d.tipo} desconhecido ao carregar.`); continue; // Pula tipo desconhecido
                }

                // Restaura o estado do veículo
                veiculoRecriado.ligado = d.dados.ligado === true; // Converte para booleano
                veiculoRecriado.velocidade = parseFloat(d.dados.velocidade) || 0;
                if (veiculoRecriado instanceof CarroEsportivo) veiculoRecriado.turboAtivado = d.dados.turboAtivado === true;
                if (veiculoRecriado instanceof Caminhao) veiculoRecriado.cargaAtual = parseFloat(d.dados.cargaAtual) || 0;

                // Restaura o histórico de manutenção
                veiculoRecriado.historicoManutencao = (Array.isArray(d.dados.historicoManutencao))
                    ? d.dados.historicoManutencao.map(mData => Manutencao.fromJSON(mData)).filter(m => m !== null) // Filtra nulos se fromJSON falhar
                    : [];
                garagem[id] = veiculoRecriado; // Adiciona o veículo recriado à garagem
            }
        }
        console.log("Garagem carregada do LocalStorage com sucesso.");

    } catch (error) { // Em caso de erro crítico ao carregar, reseta a garagem
        console.error("Erro crítico ao carregar/processar LocalStorage:", error);
        mostrarAlerta("Erro ao carregar dados. Resetando garagem.", "erro");
        localStorage.removeItem('garagemVirtual'); // Remove dados corrompidos
        garagem = {}; // Reseta a garagem
        // Cria veículos iniciais novamente como fallback
        adicionarVeiculoNaGaragem(new Carro('Fusca', 'Azul'), 'carro1');
        adicionarVeiculoNaGaragem(new CarroEsportivo('Ferrari F40', 'Vermelha'), 'esportivo1');
        adicionarVeiculoNaGaragem(new Caminhao('Scania R450', 'Branco', 25000), 'caminhao1');
    }
}


// --- FUNÇÕES DE PREVISÃO DO TEMPO (NOVAS) ---

/**
 * Busca a previsão do tempo detalhada (5 dias / 3 horas) da API OpenWeatherMap.
 * @param {string} cidade - Nome da cidade.
 * @returns {Promise<object|null>} Uma Promise que resolve com os dados da previsão ou null/objeto de erro.
 */
async function buscarPrevisaoDetalhada(cidade) {
    if (OPENWEATHERMAP_API_KEY === 'SUA_CHAVE_API_AQUI' || OPENWEATHERMAP_API_KEY === '') {
        console.error("Chave da API OpenWeatherMap não configurada!");
        if (previsaoTempoResultadoEl) previsaoTempoResultadoEl.innerHTML = `<p class="api-erro">Erro: A chave da API de previsão do tempo não foi configurada no script.js.</p>`;
        return { error: true, message: "Chave da API não configurada." };
    }

    if (!cidade) {
        console.warn("buscarPrevisaoDetalhada chamada sem nome da cidade.");
        return { error: true, message: "Nome da cidade não fornecido." };
    }

    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cidade)}&appid=${OPENWEATHERMAP_API_KEY}&units=metric&lang=pt_br`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data.message || `Erro ${response.status}: ${response.statusText}`;
            console.error(`Erro da API OpenWeatherMap (${cidade}): ${errorMessage}`);
            throw new Error(errorMessage);
        }
        console.log("Dados brutos da previsão:", data);
        return data;
    } catch (error) {
        console.error("Erro ao buscar previsão do tempo detalhada:", error);
        return { error: true, message: `Falha ao carregar previsão: ${error.message}` };
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
                dataCompleta: diaStr, // Data ISO para referência
                entradas: [],         // Todas as entradas de 3h para este dia
                temps: [],            // Apenas temperaturas para min/max
                descricoes: {},       // Contagem de descrições
                icones: {},           // Contagem de ícones
                umidade: [],          // Para detalhes
                vento: []             // Para detalhes
            };
        }
        previsaoPorDia[diaStr].entradas.push(item);
        previsaoPorDia[diaStr].temps.push(item.main.temp);
        previsaoPorDia[diaStr].umidade.push(item.main.humidity);
        previsaoPorDia[diaStr].vento.push(item.wind.speed); // m/s
        const desc = item.weather[0].description;
        const icon = item.weather[0].icon;
        previsaoPorDia[diaStr].descricoes[desc] = (previsaoPorDia[diaStr].descricoes[desc] || 0) + 1;
        previsaoPorDia[diaStr].icones[icon] = (previsaoPorDia[diaStr].icones[icon] || 0) + 1;
    });

    const resultadoFinal = [];
    for (const dia in previsaoPorDia) {
        const dadosDia = previsaoPorDia[dia];
        const temp_min = Math.min(...dadosDia.temps);
        const temp_max = Math.max(...dadosDia.temps);

        // Escolher entrada representativa (ex: meio-dia ou a mais frequente)
        let entradaRepresentativa = dadosDia.entradas.find(e => {
            const hora = new Date(e.dt * 1000).getUTCHours(); // Consistente com dt_txt
            return hora >= 12 && hora <= 15; // Prioriza entre 12:00 e 15:00 UTC
        }) || dadosDia.entradas[Math.floor(dadosDia.entradas.length / 2)]; // Fallback

        resultadoFinal.push({
            dataISO: dadosDia.dataCompleta, // CHANGED: Adicionado dataISO
            data: new Date(dadosDia.dataCompleta + 'T00:00:00Z').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }), // Adiciona Z para UTC
            temp_min: Math.round(temp_min),
            temp_max: Math.round(temp_max),
            descricao: entradaRepresentativa.weather[0].description,
            icone: entradaRepresentativa.weather[0].icon,
            entradasDetalhadas: dadosDia.entradas // ADDED: para expandir detalhes
        });
    }
    // Ordenar por dataISO para garantir a ordem correta dos dias
    resultadoFinal.sort((a, b) => a.dataISO.localeCompare(b.dataISO));
    console.log("Dados processados da previsão:", resultadoFinal);
    return resultadoFinal; //.slice(0, 5); // O filtro de dias cuidará disso
}


function renderizarPrevisaoComFiltros() {
     if (!dadosPrevisaoCompletos || !cidadePrevisaoAtual || !filtroDiasPrevisaoSelect) return; // Proteção
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
    // Estilos via CSS, mas podemos adicionar classes se necessário ou manter inline para simplicidade
    // containerDias.style.display = 'flex';
    // containerDias.style.flexWrap = 'wrap';
    // containerDias.style.gap = '10px';

    previsaoDiaria.forEach(dia => {
        const diaDiv = document.createElement('div');
        diaDiv.classList.add('dia-previsao');
        diaDiv.dataset.dataIso = dia.dataISO; // Para identificar o dia

        // Aplicar destaques com base nos checkboxes
        if (destaqueChuvaCheckbox && destaqueChuvaCheckbox.checked && (dia.descricao.includes('chuva') || dia.descricao.includes('tempestade') || dia.descricao.includes('chuvisco'))) {
           diaDiv.classList.add('destaque-chuva');
        }
        if (destaqueTempBaixaCheckbox && destaqueTempBaixaCheckbox.checked && dia.temp_min < 5) { // Ajuste o limite conforme necessário
           diaDiv.classList.add('destaque-temp-baixa');
        }
        if (destaqueTempAltaCheckbox && destaqueTempAltaCheckbox.checked && dia.temp_max > 30) { // Ajuste o limite
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
        // Detalhes preenchidos ao clicar

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
    if (!diaDivElement || !Array.isArray(entradasDetalhadas)) return; // Proteção

    diaDivElement.classList.toggle('expandido');
    const detalhesHoraDiv = diaDivElement.querySelector('.detalhes-hora');
    if (!detalhesHoraDiv) return;

    if (diaDivElement.classList.contains('expandido')) {
        if (detalhesHoraDiv.innerHTML === '') { // Preenche apenas se estiver vazio
            entradasDetalhadas.forEach(entrada => {
                const hora = new Date(entrada.dt * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }); // Especificar UTC para consistência com dt
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
    // CSS cuida de esconder/mostrar com max-height
}


// CHANGED: Simplified lidarComVerificarClima
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
        cidadePrevisaoAtual = dadosBrutos.city ? dadosBrutos.city.name : cidade; // Usa nome da API se disponível

        if (dadosPrevisaoCompletos) {
            renderizarPrevisaoComFiltros(); // Única chamada para renderizar
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
            const dataManut = new Date(m.data + 'T00:00:00'); // Trata data como local
            if (isNaN(dataManut.getTime())) return; // Pula data inválida

            if (dataManut.getTime() === hoje.getTime()) {
                mostrarAlerta(`🔔 Lembrete HOJE: ${m.tipo} p/ ${veiculo.modelo}!`, 'info');
            } else if (dataManut.getTime() === amanha.getTime()) {
                mostrarAlerta(`🔔 Lembrete AMANHÃ: ${m.tipo} p/ ${veiculo.modelo}.`, 'info');
            }
        } catch(e) { console.error(`Erro ao verificar data de manutenção ${m.data}`, e); }
    });
}


// --- FUNÇÕES DA API SIMULADA (DETALHES DO VEÍCULO) ---
async function buscarDetalhesVeiculoAPI(identificadorVeiculo) {
    if (!identificadorVeiculo) {
        console.warn("buscarDetalhesVeiculoAPI chamado sem identificador.");
        return null;
    }
    // Simula um pequeno atraso da API
    await new Promise(resolve => setTimeout(resolve, 700));

    try {
        // Supondo que 'dados_veiculos_api.json' está na raiz do projeto ou um caminho acessível
        const response = await fetch('./dados_veiculos_api.json');
        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        if (data && data.identificadores_veiculos && data.identificadores_veiculos[identificadorVeiculo]) {
            return data.identificadores_veiculos[identificadorVeiculo];
        } else {
            return null; // Não encontrado
        }
    } catch (error) {
        console.error("Erro ao buscar detalhes na API simulada:", error);
        // Retorna um objeto de erro para tratamento na UI
        return { error: true, message: `Falha ao carregar dados da API: ${error.message}. Verifique se o arquivo 'dados_veiculos_api.json' existe e está acessível.` };
    }
}

async function lidarComBuscaApiDetalhes() {
    if (!veiculoAtual || !idVeiculoAtual) {
        mostrarAlerta("Nenhum veículo selecionado para buscar detalhes.", "erro");
        return;
    }

    if (apiLoadingEl) apiLoadingEl.style.display = 'block';
    if (apiResultadoEl) apiResultadoEl.innerHTML = ''; // Limpa resultados anteriores
    if (btnBuscarApiDetalhes) btnBuscarApiDetalhes.disabled = true;

    const detalhes = await buscarDetalhesVeiculoAPI(idVeiculoAtual);

    if (apiLoadingEl) apiLoadingEl.style.display = 'none';
    if (btnBuscarApiDetalhes) btnBuscarApiDetalhes.disabled = false;

    if (apiResultadoEl) {
        if (detalhes) {
            if (detalhes.error) { // Se a API retornou um erro encapsulado
                apiResultadoEl.innerHTML = `<p class="api-erro">${detalhes.message}</p>`;
            } else { // Sucesso
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
        } else { // Nenhum detalhe encontrado (retorno null da API)
            apiResultadoEl.innerHTML = `<p class="api-nao-encontrado">Nenhum detalhe adicional encontrado para este veículo (${idVeiculoAtual}) na API.</p>`;
        }
    }
}


// --- Event Listeners ---
if (controlesVeiculoEl) {
    controlesVeiculoEl.addEventListener('click', (event) => {
        const btn = event.target.closest('button[data-acao]'); // Garante que o clique foi num botão com data-acao
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
            const novoId = adicionarVeiculoNaGaragem(novoVeiculo); // Esta função já salva e atualiza botões
            if (novoId) {
                mostrarAlerta(`${tipo} "${modelo}" adicionado!`, "info");
                formAddVeiculo.reset(); // Limpa o formulário
                campoCapacidadeDiv.style.display = 'none'; // Esconde campo de capacidade
                tipoVeiculoInput.value = ""; // Reseta o select do tipo
                selecionarVeiculo(novoId); // Seleciona o veículo recém-adicionado
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
        if (!ehCaminhao) capacidadeVeiculoInput.value = ''; // Limpa capacidade se não for caminhão
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
                if (veiculoAtual.adicionarManutencao(novaManut)) { // adicionarManutencao já atualiza a UI e salva
                    mostrarAlerta("Manutenção adicionada/agendada com sucesso!", "info");
                    formAddManutencao.reset(); // Limpa o formulário
                    verificarAgendamentosProximos(veiculoAtual); // Re-verifica lembretes
                }
                // Não precisa de 'else' aqui, pois adicionarManutencao já exibe alerta em caso de falha interna.
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
        // Aplica o volume a todos os sons definidos
        Object.values(sons).forEach(som => { if(som instanceof HTMLAudioElement) som.volume = volumeAtual; });
    });
}

if (btnBuscarApiDetalhes) {
    btnBuscarApiDetalhes.addEventListener('click', lidarComBuscaApiDetalhes);
}

// NOVO EVENT LISTENER para o botão de verificar clima
if (verificarClimaBtn) {
    verificarClimaBtn.addEventListener('click', lidarComVerificarClima);
}

// NOVOS EVENT LISTENERS para filtros e destaques da previsão
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
    carregarGaragem(); // Carrega dados do LocalStorage ou cria iniciais
    criarBotoesSelecaoVeiculo(); // Cria botões para veículos existentes

    // Seleciona o primeiro veículo da garagem por padrão, se houver
    const ids = Object.keys(garagem);
    if (ids.length > 0 && !idVeiculoAtual) { // Só seleciona se nenhum já estiver (ex: após recarregar página)
        selecionarVeiculo(ids[0]);
    } else {
        atualizarDisplayVeiculo(); // Garante que a UI reflita o estado (mesmo que nenhum selecionado)
    }

    // Ajusta o volume inicial dos sons
    if (volumeControl) volumeControl.dispatchEvent(new Event('input')); // Dispara o evento para aplicar o valor padrão

    // Garante que o campo de capacidade esteja corretamente visível/oculto
    if (tipoVeiculoInput && campoCapacidadeDiv) {
        campoCapacidadeDiv.style.display = (tipoVeiculoInput.value === 'Caminhao') ? 'block' : 'none';
    }


    console.log("✅ Aplicação Pronta.");
}

// Garante que o DOM esteja completamente carregado antes de rodar a inicialização
document.addEventListener('DOMContentLoaded', inicializarAplicacao);