(function () { // A IIFE deve envolver TODO o código do script.
    'use strict';

    // ==========================================================================
    // CONSTANTES E CONFIGURAÇÕES DA API DE TEMPO (AGORA USANDO O BACKEND PROXY)
    // ==========================================================================
    // const OPENWEATHER_API_KEY = "SUA_CHAVE_AQUI"; // REMOVIDO: A chave da API foi movida para o backend para segurança.
    const DEFAULT_WEATHER_CITY = 'Sao Paulo';
    const WEATHER_FORECAST_API_URL = '/api/forecast'; // ALTERADO: Aponta para o endpoint de previsão no nosso backend.
    const CURRENT_WEATHER_API_URL = '/api/current-weather'; // ALTERADO: Aponta para o endpoint de tempo atual no nosso backend.
    const LOCALSTORAGE_LAST_CITY_KEY = 'garagemWeatherLastCity_v4_1_pastel';
    const LOCALSTORAGE_FILTER_DAYS_KEY = 'garagemWeatherFilterDays_v4_1_pastel';
    const LOCALSTORAGE_HIGHLIGHT_PREFS_KEY = 'garagemWeatherHighlightPrefs_v4_1_pastel';
    // A chave '}' que fechava este bloco prematuramente foi removida.

    // Temperaturas limite para destaque (pode torná-las configuráveis no futuro)
    const TEMP_COLD_LIMIT = 15; // Abaixo de 15°C é frio
    const TEMP_HOT_LIMIT = 28;  // Acima de 28°C é calor

    // --- Referências a Elementos do DOM para Previsão do Tempo ---
    const cityInputEl = document.getElementById('cityInput');
    const fetchWeatherBtn = document.getElementById('fetchWeatherBtn');
    const getGeoLocationWeatherBtn = document.getElementById('getGeoLocationWeatherBtn');
    const weatherCityNameEl = document.getElementById('weather-city-name');
    const currentWeatherDisplayEl = document.getElementById('current-weather-display');
    // NOTA: 'weather-forecast-display' é referenciado, mas não está no HTML fornecido.
    // Se for usado para exibir a previsão de múltiplos dias, adicione-o ao HTML.
    // Ex: <div id="weather-forecast-display" class="weather-forecast-items"></div>
    const weatherForecastDisplayEl = document.getElementById('weather-forecast-display');
    const forecastFilterControlsEl = document.querySelector('.weather-forecast-filter-controls');
    const filterButtons = forecastFilterControlsEl ? forecastFilterControlsEl.querySelectorAll('.filter-btn') : [];

    // NOTA: Os seguintes elementos para controles de destaque não estão no HTML fornecido.
    // Adicione-os se a funcionalidade de destaque for implementada.
    // Ex: <div class="weather-highlight-controls">... <input type="checkbox" id="chkHighlightRain"> ...</div>
    const highlightControlsEl = document.querySelector('.weather-highlight-controls');
    const chkHighlightRain = document.getElementById('chkHighlightRain');
    const chkHighlightCold = document.getElementById('chkHighlightCold');
    const chkHighlightHot = document.getElementById('chkHighlightHot');

    const dailyForecastDetailsMap = new Map();
    let current5DayForecastData = null;
    let activeFilterDays = 5;
    let highlightPreferences = { // Estado inicial dos destaques
        rain: false,
        cold: false,
        hot: false
    };


    /* ==========================================================================
       CLASSE DE MANUTENÇÃO
       ========================================================================== */
    class Manutencao {
        data; tipo; custo; descricao; _tipoClasse = 'Manutencao';
        constructor(dataInput, tipoInput, custoInput, descricaoInput = '') {
            if (!this.validar(dataInput, tipoInput, custoInput)) {
                throw new Error("Dados inválidos: Verifique data, tipo e custo (>=0).");
            }
            const dataObj = new Date(dataInput);
            if (!isNaN(dataObj.getTime())) {
                this.data = new Date(Date.UTC(dataObj.getUTCFullYear(), dataObj.getUTCMonth(), dataObj.getUTCDate())).toISOString().split('T')[0];
            } else {
                throw new Error("Falha interna ao processar a data.");
            }
            this.tipo = tipoInput.trim();
            this.custo = parseFloat(custoInput);
            this.descricao = descricaoInput.trim();
        }

        validar(data, tipo, custo) {
            const dataObj = new Date(data);
            if (isNaN(dataObj.getTime())) {
                console.error("ERRO Validação Manutencao: Data inválida.", data);
                return false;
            }
            if (!tipo || typeof tipo !== 'string' || tipo.trim().length === 0) {
                console.error("ERRO Validação Manutencao: Tipo obrigatório.", tipo);
                return false;
            }
            const custoNum = parseFloat(custo);
            if (isNaN(custoNum) || custoNum < 0) {
                console.error("ERRO Validação Manutencao: Custo inválido.", custo);
                return false;
            }
            return true;
        }

        formatar() {
            try {
                const dataObj = new Date(this.data + 'T00:00:00Z');
                const dataFormatada = dataObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                const custoFormatado = this.custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                let retorno = `${dataFormatada} - ${this.tipo} (${custoFormatado})`;
                if (this.descricao) {
                    retorno += ` - Desc: ${this.descricao}`;
                }
                return retorno;
            } catch (e) {
                console.error("ERRO ao formatar manutenção:", this, e);
                return "Erro ao formatar";
            }
        }

        isAgendamentoFuturo() {
            try {
                const hojeInicioDiaUTC = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
                const dataManutencaoUTC = new Date(this.data + 'T00:00:00Z');
                return dataManutencaoUTC > hojeInicioDiaUTC;
            } catch (e) {
                console.error("ERRO ao verificar agendamento futuro:", this, e);
                return false;
            }
        }
    }

    /* ==========================================================================
       CLASSES DE VEÍCULOS
       ========================================================================== */
    class Carro {
        id; modelo; cor; ligado; velocidade; velocidadeMaxima; historicoManutencao; imagem;
        _tipoClasse = 'Carro';
        detalhesExtras = null;

        constructor(modelo, cor, velocidadeMaxima = 180, id = null, historicoManutencao = []) {
            if (!modelo || !cor) {
                throw new Error("Modelo e Cor são obrigatórios.");
            }
            this.id = id || `carro_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
            this.modelo = modelo.trim();
            this.cor = cor;
            this.velocidadeMaxima = Math.max(0, velocidadeMaxima);
            this.ligado = false;
            this.velocidade = 0;
            this.historicoManutencao = this.reidratarHistorico(historicoManutencao);
            this.imagem = 'images/car.png';
        }

        reidratarHistorico(historicoArray) {
            if (!Array.isArray(historicoArray)) {
                return [];
            }
            return historicoArray.map(item => {
                if (item instanceof Manutencao) {
                    return item;
                }
                if (typeof item === 'object' && item !== null && item._tipoClasse === 'Manutencao') {
                    try {
                        return new Manutencao(item.data, item.tipo, item.custo, item.descricao);
                    } catch (e) {
                        console.error(`ERRO Reidratar Manutencao [Veículo: ${this.modelo}]: ${e.message}`, item);
                        return null;
                    }
                }
                if (item !== null) {
                    console.warn(`WARN Reidratar Manutencao: Item inesperado descartado [Veículo: ${this.modelo}]`, item);
                }
                return null;
            }).filter(item => item instanceof Manutencao);
        }

        ligar() {
            if (this.ligado) { this.alerta("Veículo já está ligado.", 'aviso'); return false; }
            this.ligado = true;
            console.log(`LOG: ${this.modelo}: Ligado.`);
            tocarSom('somLigar');
            this.notificarAtualizacao();
            return true;
        }

        desligar() {
            if (!this.ligado) { this.alerta("Veículo já está desligado.", 'aviso'); return false; }
            if (this.velocidade > 0) { this.alerta("Pare o veículo antes de desligar!", 'erro'); tocarSom('somErro'); return false; }
            this.ligado = false;
            console.log(`LOG: ${this.modelo}: Desligado.`);
            tocarSom('somDesligar');
            this.notificarAtualizacao();
            return true;
        }

        acelerar(incremento = 10) {
            if (!this.ligado) { this.alerta("Ligue o veículo para acelerar!", 'erro'); tocarSom('somErro'); return false; }
            const inc = Math.max(0, incremento);
            const novaVelocidade = Math.min(this.velocidade + inc, this.velocidadeMaxima);
            if (novaVelocidade === this.velocidade) {
                if (this.velocidade === this.velocidadeMaxima) {
                    this.alerta("Velocidade máxima atingida!", 'aviso');
                }
                return false;
            }
            this.velocidade = novaVelocidade;
            console.log(`LOG: ${this.modelo}: Acelerando para ${this.velocidade.toFixed(0)} km/h.`);
            tocarSom('somAcelerar');
            this.notificarAtualizacao();
            return true;
        }

        frear(decremento = 20) {
            if (this.velocidade === 0) { this.alerta("Veículo já está parado.", 'aviso'); return false; }
            const dec = Math.max(0, decremento);
            this.velocidade = Math.max(0, this.velocidade - dec);
            console.log(`LOG: ${this.modelo}: Freando para ${this.velocidade.toFixed(0)} km/h.`);
            tocarSom('somFrear');
            this.notificarAtualizacao();
            return true;
        }

        buzinar() {
            console.log(`LOG: ${this.modelo}: BIBI! 🔊`);
            tocarSom('somBuzina');
            this.alerta("Buzinou!", "info", 2000);
            return true;
        }

        adicionarManutencao(manutencaoObj) {
            if (!(manutencaoObj instanceof Manutencao)) {
                throw new Error("Objeto de manutenção inválido.");
            }
            this.historicoManutencao.push(manutencaoObj);
            this.historicoManutencao.sort((a, b) => new Date(b.data) - new Date(a.data));
            console.log(`LOG: Manutenção (${manutencaoObj.tipo}) adicionada para ${this.modelo}.`);
            this.notificarAtualizacao();
            return true;
        }

        getHistoricoPassado() {
            try {
                return this.historicoManutencao.filter(m => !m.isAgendamentoFuturo());
            } catch (e) {
                console.error(`ERRO histórico passado [${this.modelo}]:`, e);
                return [];
            }
        }

        getAgendamentosFuturos() {
            try {
                return this.historicoManutencao.filter(m => m.isAgendamentoFuturo());
            } catch (e) {
                console.error(`ERRO agendamentos futuros [${this.modelo}]:`, e);
                return [];
            }
        }

        setDetalhesExtras(detalhes) {
            this.detalhesExtras = detalhes;
            this.notificarAtualizacao();
        }

        exibirInformacoes() {
            try {
                const statusClass = this.ligado ? 'status-ligado' : 'status-desligado';
                const statusTexto = this.ligado ? 'Ligado' : 'Desligado';
                const historicoCount = this.getHistoricoPassado().length;
                const agendamentosCount = this.getAgendamentosFuturos().length;

                let detalhesExtrasHtml = '';
                if (this.detalhesExtras) {
                    detalhesExtrasHtml += '<div class="detalhes-extras-veiculo">';
                    detalhesExtrasHtml += '<h4>Curiosidades e Detalhes:</h4>';
                    for (const [key, value] of Object.entries(this.detalhesExtras)) {
                        const chaveFormatada = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        detalhesExtrasHtml += `<p><strong>${chaveFormatada}:</strong> ${value}</p>`;
                    }
                    detalhesExtrasHtml += '</div>';
                }

                return `
                    <img src="${this.imagem}" alt="Imagem de ${this.modelo}" class="veiculo-imagem" onerror="this.style.display='none'; console.warn('Imagem não encontrada: ${this.imagem}')">
                    <p><strong>ID:</strong> <small>${this.id}</small></p>
                    <p><strong>Modelo:</strong> ${this.modelo}</p>
                    <p><strong>Cor:</strong> <span class="color-swatch" style="background-color: ${this.cor};" title="${this.cor}"></span> ${this.cor}</p>
                    <p class="${statusClass}"><span class="status-indicator"></span> <span>${statusTexto}</span></p>
                    <p><strong>Velocidade:</strong> ${this.velocidade.toFixed(0)} km/h (Máx: ${this.velocidadeMaxima} km/h)</p>
                    ${detalhesExtrasHtml}
                    <p><em>Manutenções: ${historicoCount} | Agendamentos: ${agendamentosCount}</em></p>
                `;
            } catch (e) {
                console.error(`ERRO ao exibir infos ${this.modelo}:`, e);
                return `<p class="error-text">Erro ao exibir informações.</p>`;
            }
        }
        alerta(mensagem, tipo = 'info', duracao = 5000) {
            adicionarNotificacao(`${this.modelo}: ${mensagem}`, tipo, duracao);
        }
        notificarAtualizacao() {
            if (veiculoSelecionadoId === this.id) {
                atualizarDisplay();
            }
            salvarGaragem();
        }
    }

    class CarroEsportivo extends Carro {
        turboAtivado; _tipoClasse = 'CarroEsportivo';
        constructor(modelo, cor, velocidadeMaxima = 250, id = null, historicoManutencao = [], turboAtivado = false) {
            super(modelo, cor, velocidadeMaxima, id, historicoManutencao);
            this.turboAtivado = turboAtivado;
            this.imagem = 'images/sportscar.png';
        }
        ativarTurbo() {
            if (!this.ligado) { this.alerta("Ligue o carro para ativar o turbo!", 'erro'); tocarSom('somErro'); return false; }
            if (this.turboAtivado) { this.alerta("Turbo já está ativo!", 'aviso'); return false; }
            this.turboAtivado = true;
            console.log(`LOG: ${this.modelo}: TURBO ATIVADO! 🚀`);
            this.alerta("Turbo ativado!", "sucesso", 3000);
            this.notificarAtualizacao();
            return true;
        }
        desativarTurbo() {
            if (!this.turboAtivado) { return false; }
            this.turboAtivado = false;
            console.log(`LOG: ${this.modelo}: Turbo desativado.`);
            this.notificarAtualizacao();
            return true;
        }
        acelerar(incremento = 20) {
            if (!this.ligado) { this.alerta("Ligue o carro para acelerar!", 'erro'); tocarSom('somErro'); return false; }
            const boost = this.turboAtivado ? 1.5 : 1.0;
            const aceleracaoReal = Math.max(0, incremento) * boost;
            return super.acelerar(aceleracaoReal);
        }
        desligar() {
            const desligou = super.desligar();
            if (desligou && this.turboAtivado) {
                this.desativarTurbo();
            }
            return desligou;
        }
        frear(decremento = 25) {
            const freou = super.frear(decremento);
            if (freou && this.turboAtivado && this.velocidade < 30) {
                console.log(`LOG: ${this.modelo}: Turbo desativado auto.`);
                this.desativarTurbo();
                this.alerta("Turbo desativado (baixa velocidade).", "info");
            }
            return freou;
        }
        exibirInformacoes() {
            const baseHtml = super.exibirInformacoes();
            const statusTurboTexto = this.turboAtivado ? 'ATIVADO 🚀' : 'Desativado';
            const turboHtml = `<p><strong>Turbo:</strong> ${statusTurboTexto}</p>`;
            const partes = baseHtml.split('<p><em>Manutenções:');
            return partes[0] + turboHtml + '<p><em>Manutenções:' + partes[1];
        }
    }

    class Caminhao extends Carro {
        capacidadeCarga; cargaAtual; _tipoClasse = 'Caminhao';
        constructor(modelo, cor, capacidadeCargaInput, velocidadeMaxima = 120, id = null, historicoManutencao = [], cargaAtual = 0) {
            super(modelo, cor, velocidadeMaxima, id, historicoManutencao);
            const capacidade = parseFloat(capacidadeCargaInput);
            if (isNaN(capacidade) || capacidade <= 0) {
                throw new Error("Capacidade de carga inválida (deve ser > 0).");
            }
            this.capacidadeCarga = capacidade;
            const cargaInicial = parseFloat(cargaAtual);
            this.cargaAtual = (!isNaN(cargaInicial) && cargaInicial >= 0) ? Math.min(cargaInicial, this.capacidadeCarga) : 0;
            this.imagem = 'images/truck.png';
        }
        carregar(pesoInput) {
            const peso = parseFloat(pesoInput);
            if (isNaN(peso) || peso <= 0) { this.alerta("Insira um peso válido.", 'erro'); tocarSom('somErro'); return false; }
            if (this.cargaAtual + peso > this.capacidadeCarga) {
                const espacoLivre = this.capacidadeCarga - this.cargaAtual;
                this.alerta(`Capacidade excedida! Livre: ${espacoLivre.toFixed(0)} kg.`, 'aviso');
                tocarSom('somErro');
                return false;
            }
            this.cargaAtual += peso;
            console.log(`LOG: ${this.modelo}: Carregado +${peso.toFixed(0)} kg. Atual: ${this.cargaAtual.toFixed(0)} kg.`);
            this.notificarAtualizacao();
            return true;
        }
        descarregar(pesoInput) {
            const peso = parseFloat(pesoInput);
            if (isNaN(peso) || peso <= 0) { this.alerta("Insira um peso válido.", 'erro'); tocarSom('somErro'); return false; }
            if (peso > this.cargaAtual) {
                this.alerta(`Não pode descarregar ${peso.toFixed(0)} kg. Atual: ${this.cargaAtual.toFixed(0)} kg.`, 'aviso');
                tocarSom('somErro');
                return false;
            }
            this.cargaAtual -= peso;
            console.log(`LOG: ${this.modelo}: Descarregado -${peso.toFixed(0)} kg. Atual: ${this.cargaAtual.toFixed(0)} kg.`);
            this.notificarAtualizacao();
            return true;
        }
        acelerar(incremento = 5) {
            if (!this.ligado) { this.alerta("Ligue o veículo para acelerar!", 'erro'); tocarSom('somErro'); return false; }
            const fatorCarga = Math.max(0.3, 1 - (this.cargaAtual / this.capacidadeCarga) * 0.7);
            const aceleracaoReal = Math.max(0, incremento) * fatorCarga;
            return super.acelerar(aceleracaoReal);
        }
        ligar() {
            if (this.cargaAtual > this.capacidadeCarga) {
                this.alerta("Sobrecarregado! Remova o excesso antes de ligar.", "erro");
                tocarSom('somErro');
                return false;
            }
            return super.ligar();
        }
        exibirInformacoes() {
            const baseHtml = super.exibirInformacoes();
            const percCarga = this.capacidadeCarga > 0 ? (this.cargaAtual / this.capacidadeCarga) * 100 : 0;
            const cargaHtml = `
                 <p><strong>Capacidade:</strong> ${this.capacidadeCarga.toLocaleString('pt-BR')} kg</p>
                 <p><strong>Carga Atual:</strong> ${this.cargaAtual.toLocaleString('pt-BR')} kg (${percCarga.toFixed(1)}%)</p>
                 <div class="carga-barra-container" title="${percCarga.toFixed(1)}% carregado">
                     <div class="carga-barra" style="width: ${percCarga.toFixed(1)}%;"></div>
                 </div>`;
            const partes = baseHtml.split('<p><em>Manutenções:');
            return partes[0] + cargaHtml + '<p><em>Manutenções:' + partes[1];
        }
    }

    /* ==========================================================================
       LÓGICA DA APLICAÇÃO (UI, Eventos, Persistência, Áudio)
       ========================================================================== */
    let garagem = [];
    let veiculoSelecionadoId = null;
    let detalhesVeiculosJSON = null;
    const KEY_LOCAL_STORAGE = 'minhaGaragemV4_1_pastel_v2';
    const lembretesMostrados = new Set();

    const tabNavigation = document.querySelector('.tab-navigation');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const tabButtonDetails = document.getElementById('tab-button-details');
    const formAdicionarVeiculo = document.getElementById('formAdicionarVeiculo');
    const tipoVeiculoSelect = document.getElementById('tipoVeiculo');
    const modeloInput = document.getElementById('modeloVeiculo');
    const corInput = document.getElementById('corVeiculo');
    const campoCapacidadeCarga = document.getElementById('campoCapacidadeCarga');
    const capacidadeCargaInput = document.getElementById('capacidadeCarga');
    const listaVeiculosDiv = document.getElementById('listaVeiculosGaragem');
    const tituloVeiculo = document.getElementById('tituloVeiculo');
    const divInformacoes = document.getElementById('informacoesVeiculo');
    const btnRemoverVeiculo = document.getElementById('btnRemoverVeiculo');
    const btnLigar = document.getElementById('btnLigar');
    const btnDesligar = document.getElementById('btnDesligar');
    const btnAcelerar = document.getElementById('btnAcelerar');
    const btnFrear = document.getElementById('btnFrear');
    const btnBuzinar = document.getElementById('btnBuzinar');
    const controlesEsportivo = document.getElementById('controlesEsportivo');
    const controlesCaminhao = document.getElementById('controlesCaminhao');
    const btnAtivarTurbo = document.getElementById('btnAtivarTurbo');
    const btnDesativarTurbo = document.getElementById('btnDesativarTurbo');
    const cargaInput = document.getElementById('cargaInput');
    const btnCarregar = document.getElementById('btnCarregar');
    const btnDescarregar = document.getElementById('btnDescarregar');
    const formManutencao = document.getElementById('formManutencao');
    const dataManutencaoInput = document.getElementById('dataManutencao');
    const tipoManutencaoInput = document.getElementById('tipoManutencao');
    const custoManutencaoInput = document.getElementById('custoManutencao');
    const descManutencaoInput = document.getElementById('descManutencao');
    const historicoListaUl = document.getElementById('historicoLista');
    const agendamentosListaUl = document.getElementById('agendamentosLista');
    const notificacoesDiv = document.getElementById('notificacoes');
    const volumeSlider = document.getElementById('volumeSlider');
    const audioElements = {
        somLigar: document.getElementById('somLigar'),
        somDesligar: document.getElementById('somDesligar'),
        somAcelerar: document.getElementById('somAcelerar'),
        somFrear: document.getElementById('somFrear'),
        somBuzina: document.getElementById('somBuzina'),
        somErro: document.getElementById('somErro')
    };

    // --- Funções de Áudio ---
    function tocarSom(somId) {
        const audioElement = audioElements[somId];
        if (audioElement && typeof audioElement.play === 'function') {
            try {
                audioElement.currentTime = 0;
                audioElement.play().catch(error => {
                    if (error.name === 'NotAllowedError') {
                        console.warn(`WARN Áudio: Playback de ${somId} bloqueado pelo navegador. Interação necessária.`);
                    } else {
                        console.error(`ERRO ao tocar som ${somId}:`, error);
                    }
                });
            } catch (error) {
                console.error(`ERRO inesperado ao tentar tocar ${somId}:`, error);
            }
        } else {
            console.warn(`WARN Áudio: Elemento de áudio não encontrado ou inválido: ${somId}`);
        }
    }
    function atualizarVolume() {
        const volume = volumeSlider ? parseFloat(volumeSlider.value) : 0.5;
        for (const key in audioElements) {
            if (audioElements[key]) {
                audioElements[key].volume = volume;
            }
        }
        localStorage.setItem('garagemVolumePref_v4_1_pastel_v2', volume.toString());
    }

    // --- Funções de Persistência ---
    function salvarGaragem() {
        try {
            const garagemParaSalvar = garagem.map(veiculo => {
                if (!veiculo._tipoClasse) {
                    console.warn(`WARN Salvar: Veículo sem _tipoClasse! ID: ${veiculo.id}`);
                }
                return {
                    ...veiculo,
                    _tipoClasse: veiculo._tipoClasse || 'Carro',
                    historicoManutencao: veiculo.historicoManutencao.map(m => {
                        if (!m._tipoClasse) {
                            console.warn(`WARN Salvar: Manutenção sem _tipoClasse! Veículo: ${veiculo.id}`);
                        }
                        return { ...m, _tipoClasse: m._tipoClasse || 'Manutencao' };
                    })
                };
            });
            localStorage.setItem(KEY_LOCAL_STORAGE, JSON.stringify(garagemParaSalvar));
        } catch (error) {
            console.error("ERRO CRÍTICO ao salvar garagem:", error);
            adicionarNotificacao("Falha grave ao salvar dados!", "erro", 15000);
        }
    }

    function carregarGaragem() {
        let garagemJSONData;
        try {
            garagemJSONData = localStorage.getItem(KEY_LOCAL_STORAGE);
            if (!garagemJSONData) {
                return [];
            }
            const garagemSalva = JSON.parse(garagemJSONData);
            const garagemReidratada = garagemSalva.map(veiculoData => {
                try {
                    if (!veiculoData || !veiculoData._tipoClasse) {
                        throw new Error("Dados incompletos ou tipo de classe ausente.");
                    }
                    const historicoReidratado = reidratarHistoricoAux(veiculoData.historicoManutencao, veiculoData.modelo);
                    let veiculoInstancia;
                    switch (veiculoData._tipoClasse) {
                        case 'CarroEsportivo':
                            veiculoInstancia = new CarroEsportivo(veiculoData.modelo, veiculoData.cor, veiculoData.velocidadeMaxima, veiculoData.id, historicoReidratado, veiculoData.turboAtivado);
                            break;
                        case 'Caminhao':
                            veiculoInstancia = new Caminhao(veiculoData.modelo, veiculoData.cor, veiculoData.capacidadeCarga, veiculoData.velocidadeMaxima, veiculoData.id, historicoReidratado, veiculoData.cargaAtual);
                            break;
                        case 'Carro':
                        default:
                            veiculoInstancia = new Carro(veiculoData.modelo, veiculoData.cor, veiculoData.velocidadeMaxima, veiculoData.id, historicoReidratado);
                            break;
                    }
                    if (veiculoData.detalhesExtras) {
                        veiculoInstancia.setDetalhesExtras(veiculoData.detalhesExtras);
                    }
                    return veiculoInstancia;

                } catch (error) {
                    console.error(`ERRO ao reidratar veículo (ID: ${veiculoData?.id || '?'}): ${error.message}`, veiculoData);
                    return null;
                }
            }).filter(v => v instanceof Carro);
            console.log(`LOG: Garagem carregada com ${garagemReidratada.length} veículos.`);
            return garagemReidratada;
        } catch (error) {
            console.error("ERRO CRÍTICO ao carregar/parsear garagem:", error);
            adicionarNotificacao("Erro ao carregar dados da garagem. Podem estar corrompidos.", "erro", 15000);
            return [];
        }
    }

    function reidratarHistoricoAux(historicoArray, modeloVeiculo = '?') {
        if (!Array.isArray(historicoArray)) {
            return [];
        }
        return historicoArray.map(item => {
            if (item instanceof Manutencao) {
                return item;
            }
            if (typeof item === 'object' && item !== null && item._tipoClasse === 'Manutencao') {
                try {
                    return new Manutencao(item.data, item.tipo, item.custo, item.descricao);
                } catch (e) {
                    console.error(`ERRO Reidratar Aux Mnt [${modeloVeiculo}]: ${e.message}`, item);
                    return null;
                }
            }
            if (item !== null) {
                console.warn(`WARN Reidratar Aux Mnt: Item inesperado [${modeloVeiculo}]`, item);
            }
            return null;
        }).filter(item => item instanceof Manutencao);
    }

    // function checkApiKey() { ... } // REMOVIDO: A validação da chave da API agora é feita no backend.

    async function fetchWeatherData(cityOrCoords) {
        // A chamada a checkApiKey() foi removida.

        let currentUrl, forecastUrl;
        let logPrefix = "";

        // Os parâmetros 'appid' serão adicionados pelo backend, não mais pelo frontend.
        if (typeof cityOrCoords === 'string') {
            logPrefix = `(Cidade: ${cityOrCoords})`;
            if (weatherCityNameEl) {
                weatherCityNameEl.textContent = cityOrCoords;
            }
            setWeatherLoadingStates();
            // Define as URLs para os endpoints do backend
            currentUrl = `${CURRENT_WEATHER_API_URL}?q=${encodeURIComponent(cityOrCoords)}&units=metric&lang=pt_br`;
            forecastUrl = `${WEATHER_FORECAST_API_URL}?q=${encodeURIComponent(cityOrCoords)}&units=metric&lang=pt_br`;
        } else if (typeof cityOrCoords === 'object' && cityOrCoords.lat && cityOrCoords.lon) {
            logPrefix = `(Coords: ${cityOrCoords.lat},${cityOrCoords.lon})`;
            setWeatherLoadingStates("Buscando por localização...");
            // Define as URLs para os endpoints do backend
            currentUrl = `${CURRENT_WEATHER_API_URL}?lat=${cityOrCoords.lat}&lon=${cityOrCoords.lon}&units=metric&lang=pt_br`;
            forecastUrl = `${WEATHER_FORECAST_API_URL}?lat=${cityOrCoords.lat}&lon=${cityOrCoords.lon}&units=metric&lang=pt_br`;
        } else {
            console.error("ERRO API TEMPO: Parâmetro de busca inválido.", cityOrCoords);
            adicionarNotificacao("Erro interno ao tentar buscar previsão.", "erro");
            return;
        }

        try {
            const currentResponse = await fetch(currentUrl);
            if (!currentResponse.ok) {
                const errorData = await currentResponse.json().catch(() => ({ message: currentResponse.statusText }));
                throw new Error(`Tempo Atual ${logPrefix}: ${currentResponse.status} ${errorData.message || ''}`);
            }
            const currentData = await currentResponse.json();
            displayCurrentWeather(currentData);

            if (typeof cityOrCoords === 'string') {
                localStorage.setItem(LOCALSTORAGE_LAST_CITY_KEY, cityOrCoords);
            } else if (currentData.name) { // Se for por geolocalização, usa o nome retornado pela API
                localStorage.setItem(LOCALSTORAGE_LAST_CITY_KEY, currentData.name);
                if (cityInputEl) {
                    cityInputEl.value = currentData.name;
                }
            }

            const forecastResponse = await fetch(forecastUrl);
            if (!forecastResponse.ok) {
                const errorData = await forecastResponse.json().catch(() => ({ message: forecastResponse.statusText }));
                throw new Error(`Previsão 5 Dias ${logPrefix}: ${forecastResponse.status} ${errorData.message || ''}`);
            }
            current5DayForecastData = await forecastResponse.json();
            processAndDisplay5DayForecast(current5DayForecastData);

        } catch (error) {
            console.error("ERRO API TEMPO:", error);
            const userMessage = typeof cityOrCoords === 'string' ? cityOrCoords : "Localização Atual";
            // Tenta extrair uma mensagem de erro mais amigável do objeto de erro da API, se existir
            let apiErrorMessage = error.details?.message || error.message;
            if (typeof apiErrorMessage === 'object') { // Algumas APIs retornam um objeto de erro
                apiErrorMessage = JSON.stringify(apiErrorMessage);
            }
            const friendlyErrorMessage = `Erro ao buscar tempo para ${userMessage}: ${apiErrorMessage.replace(/Tempo Atual.*?:\s*\d*\s*|Previsão 5 Dias.*?:\s*\d*\s*/gi, '').trim()}.`;

            if (weatherCityNameEl) {
                weatherCityNameEl.textContent = userMessage;
            }
            if (currentWeatherDisplayEl) {
                currentWeatherDisplayEl.innerHTML = `<p class="error-text">${friendlyErrorMessage}</p>`;
            }
            if (weatherForecastDisplayEl) { // Verifica se o elemento existe
                weatherForecastDisplayEl.innerHTML = `<p class="error-text">Não foi possível carregar a previsão.</p>`;
            }
            adicionarNotificacao(friendlyErrorMessage, "erro");
            current5DayForecastData = null;
        }
    }

    function setWeatherLoadingStates(cityName = "Carregando...") {
        if (weatherCityNameEl) {
            weatherCityNameEl.textContent = cityName;
        }
        if (currentWeatherDisplayEl) {
            currentWeatherDisplayEl.innerHTML = '<p class="placeholder-text">Buscando tempo atual...</p>';
        }
        if (weatherForecastDisplayEl) { // Verifica se o elemento existe
            weatherForecastDisplayEl.innerHTML = '<p class="placeholder-text">Buscando previsão...</p>';
        }
    }

    function displayCurrentWeather(data) {
        if (!currentWeatherDisplayEl) { return; } // Proteção caso o elemento não exista

        if (!data || !data.weather || !data.main) {
            currentWeatherDisplayEl.innerHTML = '<p class="error-text">Dados do tempo atual incompletos.</p>';
            return;
        }
        const icon = data.weather[0].icon;
        const description = data.weather[0].description.replace(/\b\w/g, l => l.toUpperCase());
        const temp = Math.round(data.main.temp);
        const feelsLike = Math.round(data.main.feels_like);
        const humidity = data.main.humidity;
        const windSpeed = (data.wind.speed * 3.6).toFixed(1); // Convertendo m/s para km/h

        if (weatherCityNameEl) {
            weatherCityNameEl.textContent = `${data.name}, ${data.sys.country}`;
        }

        currentWeatherDisplayEl.innerHTML = `
            <div class="current-weather-icon">
                <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}" title="${description}">
            </div>
            <div class="current-weather-info">
                <h4>${temp}°C <span class="feels-like">(Sensação: ${feelsLike}°C)</span></h4>
                <p class="description">${description}</p>
                <p>Umidade: ${humidity}%</p>
                <p>Vento: ${windSpeed} km/h</p>
            </div>
        `;
    }

    function processAndDisplay5DayForecast(data) {
        if (!weatherForecastDisplayEl) { return; } // Proteção caso o elemento não exista

        if (!data || !data.list || data.list.length === 0) {
            weatherForecastDisplayEl.innerHTML = '<p class="error-text">Dados de previsão não recebidos ou incompletos.</p>';
            return;
        }

        if (weatherCityNameEl && data.city && data.city.name && (weatherCityNameEl.textContent === "Carregando..." || weatherCityNameEl.textContent === "Buscando por localização...")) {
            weatherCityNameEl.textContent = `${data.city.name}, ${data.city.country}`;
        }

        const dailyForecasts = {};
        data.list.forEach(forecast => {
            const date = forecast.dt_txt.split(' ')[0];
            if (!dailyForecasts[date]) {
                dailyForecasts[date] = {
                    temps: [],
                    forecasts: [] // Armazena todas as previsões para aquele dia
                };
            }
            dailyForecasts[date].temps.push(forecast.main.temp);
            dailyForecasts[date].forecasts.push(forecast);
        });

        weatherForecastDisplayEl.innerHTML = ''; // Limpa antes de adicionar novos itens
        dailyForecastDetailsMap.clear();

        let dates = Object.keys(dailyForecasts).sort();

        // Aplicar filtro de dias
        if (activeFilterDays === 1) {
            dates = dates.slice(0, 1);
        } else if (activeFilterDays === 3) {
            dates = dates.slice(0, 3);
        } else { // default 5 dias ou mais se a API retornar
            dates = dates.slice(0, 5);
        }


        if (dates.length === 0) {
            weatherForecastDisplayEl.innerHTML = '<p class="placeholder-text">Sem previsão para o período selecionado.</p>';
            return;
        }

        dates.forEach(dateStr => {
            const dayData = dailyForecasts[dateStr];
            if (!dayData || dayData.forecasts.length === 0) { return; }

            const minTemp = Math.min(...dayData.temps);
            const maxTemp = Math.max(...dayData.temps);

            // Tenta pegar a previsão do meio-dia, ou a primeira disponível
            let representativeForecast = dayData.forecasts.find(f => f.dt_txt.includes("12:00:00")) || dayData.forecasts[Math.floor(dayData.forecasts.length / 2)] ||  dayData.forecasts[0];

            const icon = representativeForecast.weather[0].icon;
            const description = representativeForecast.weather[0].description.replace(/\b\w/g, l => l.toUpperCase());
            const dateObj = new Date(dateStr + "T12:00:00Z"); // Adiciona Z para UTC
            const formattedDate = dateObj.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });


            const itemDiv = document.createElement('div');
            itemDiv.className = 'weather-item';

            // Aplicar classes de destaque
            itemDiv.classList.remove('highlight-rain', 'highlight-cold', 'highlight-hot');
            const weatherId = representativeForecast.weather[0].id; // Pega o ID principal do clima
            if (chkHighlightRain && highlightPreferences.rain && (weatherId >= 200 && weatherId < 700)) { // Chuva, Neve, Tempestade
                itemDiv.classList.add('highlight-rain');
            }
            if (chkHighlightCold && highlightPreferences.cold && minTemp < TEMP_COLD_LIMIT) {
                itemDiv.classList.add('highlight-cold');
            }
            if (chkHighlightHot && highlightPreferences.hot && maxTemp > TEMP_HOT_LIMIT) {
                itemDiv.classList.add('highlight-hot');
            }

            itemDiv.innerHTML = `
                <p class="date">${formattedDate}</p>
                <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}" title="${description}">
                <p class="temp">${Math.round(minTemp)}° / ${Math.round(maxTemp)}°C</p>
                <p class="desc">${description}</p>
            `;
            // Armazena a previsão representativa para detalhes, mas poderia armazenar dayData.forecasts para mostrar todos os horários
            dailyForecastDetailsMap.set(itemDiv, representativeForecast);
            itemDiv.addEventListener('click', handleForecastItemClick);
            weatherForecastDisplayEl.appendChild(itemDiv);
        });
    }

    function handleForecastItemClick(event) {
        const itemDiv = event.currentTarget;
        const existingDetails = itemDiv.querySelector('.forecast-details-expanded');

        // Remove detalhes expandidos de outros itens
        document.querySelectorAll('.weather-item .forecast-details-expanded').forEach(el => {
            if (el.parentElement !== itemDiv) { // Não remove o próprio se já estiver expandido e for clicado novamente
                el.remove();
            }
        });

        if (existingDetails) { // Se clicou no item já expandido, fecha-o
            existingDetails.remove();
        } else { // Se clicou em um item fechado, abre os detalhes
            const forecastData = dailyForecastDetailsMap.get(itemDiv);
            if (forecastData) {
                const detailsDiv = document.createElement('div');
                detailsDiv.className = 'forecast-details-expanded';
                const feelsLike = Math.round(forecastData.main.feels_like);
                const humidity = forecastData.main.humidity;
                const pressure = forecastData.main.pressure;
                const windSpeed = (forecastData.wind.speed * 3.6).toFixed(1);
                const pop = (forecastData.pop * 100).toFixed(0); // Probabilidade de precipitação

                detailsDiv.innerHTML = `
                    <p><strong>Sensação:</strong> ${feelsLike}°C</p>
                    <p><strong>Umidade:</strong> ${humidity}%</p>
                    <p><strong>Pressão:</strong> ${pressure} hPa</p>
                    <p><strong>Vento:</strong> ${windSpeed} km/h</p>
                    <p><strong>Chuva:</strong> ${pop}% prob.</p>
                `;
                itemDiv.appendChild(detailsDiv);
            }
        }
    }

    function handleGeoLocationClick() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    fetchWeatherData({ lat: position.coords.latitude, lon: position.coords.longitude });
                },
                (error) => {
                    console.error("Erro de Geolocalização:", error);
                    let message = "Não foi possível obter sua localização. ";
                    switch (error.code) {
                        case error.PERMISSION_DENIED: message += "Permissão negada."; break;
                        case error.POSITION_UNAVAILABLE: message += "Informação de localização indisponível."; break;
                        case error.TIMEOUT: message += "Tempo esgotado para obter localização."; break;
                        default: message += "Ocorreu um erro desconhecido."; break;
                    }
                    if (weatherCityNameEl) { weatherCityNameEl.textContent = "Erro"; }
                    if (currentWeatherDisplayEl) { currentWeatherDisplayEl.innerHTML = `<p class="error-text">${message}</p>`; }
                    if (weatherForecastDisplayEl) { weatherForecastDisplayEl.innerHTML = ''; } // Limpa a previsão se houver erro
                    adicionarNotificacao(message, "erro");
                    current5DayForecastData = null; // Reseta dados da previsão
                }
            );
        } else {
            adicionarNotificacao("Geolocalização não é suportada pelo seu navegador.", "aviso");
        }
    }

    function handleFilterButtonClick(event) {
        const btn = event.target.closest('.filter-btn');
        if (!btn) { return; }

        activeFilterDays = parseInt(btn.dataset.days, 10);
        localStorage.setItem(LOCALSTORAGE_FILTER_DAYS_KEY, activeFilterDays.toString());

        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (current5DayForecastData) { // Se já temos os dados de 5 dias, apenas re-renderizamos
            processAndDisplay5DayForecast(current5DayForecastData);
        } else { // Senão, buscamos os dados novamente (pode acontecer se a primeira busca falhou)
            const lastCity = localStorage.getItem(LOCALSTORAGE_LAST_CITY_KEY) || DEFAULT_WEATHER_CITY;
            fetchWeatherData(lastCity);
        }
    }

    function handleHighlightChange() {
        if (chkHighlightRain) { highlightPreferences.rain = chkHighlightRain.checked; }
        if (chkHighlightCold) { highlightPreferences.cold = chkHighlightCold.checked; }
        if (chkHighlightHot) { highlightPreferences.hot = chkHighlightHot.checked; }

        localStorage.setItem(LOCALSTORAGE_HIGHLIGHT_PREFS_KEY, JSON.stringify(highlightPreferences));

        if (current5DayForecastData && weatherForecastDisplayEl) { // Apenas re-renderiza se houver dados e o display existir
            processAndDisplay5DayForecast(current5DayForecastData);
        }
    }

    // --- Funções de Manipulação da UI (Geral) ---
    function switchTab(tabId) {
        let foundTab = false;
        tabPanes.forEach(pane => {
            if (pane.id === tabId) {
                pane.classList.add('active');
                foundTab = true;
            } else {
                pane.classList.remove('active');
            }
        });
        tabButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tabId);
        });
        if (tabButtonDetails) { // Verifica se o botão existe
            tabButtonDetails.disabled = !veiculoSelecionadoId;
        }
        if (!foundTab) {
            console.warn(`WARN: Aba inexistente: ${tabId}`);
        } else {
            console.log(`LOG: Aba ativada: ${tabId}`);
        }
    }

    function atualizarListaVeiculosUI() {
        if (!listaVeiculosDiv) { return; } // Verifica se o elemento existe

        listaVeiculosDiv.innerHTML = '';
        if (garagem.length === 0) {
            listaVeiculosDiv.innerHTML = '<p class="placeholder-text">Garagem vazia.</p>';
            return;
        }
        garagem.sort((a, b) => a.modelo.localeCompare(b.modelo)); // Ordena alfabeticamente
        garagem.forEach(veiculo => {
            const btn = document.createElement('button');
            btn.textContent = `${veiculo.modelo} (${veiculo._tipoClasse})`;
            const colorSwatch = document.createElement('span');
            colorSwatch.className = 'color-swatch-list';
            colorSwatch.style.backgroundColor = veiculo.cor;
            btn.prepend(colorSwatch);
            btn.dataset.veiculoId = veiculo.id;
            btn.classList.toggle('selecionado', veiculo.id === veiculoSelecionadoId);
            btn.addEventListener('click', () => selecionarVeiculo(veiculo.id));
            listaVeiculosDiv.appendChild(btn);
        });
    }

    async function selecionarVeiculo(veiculoId) {
        veiculoSelecionadoId = veiculoId;
        const veiculo = garagem.find(v => v.id === veiculoId);
        console.log(`LOG: Selecionado: ID ${veiculoId} (${veiculo ? veiculo.modelo : 'Nenhum'})`);

        if (veiculo && detalhesVeiculosJSON) {
            const nomeModeloBase = veiculo.modelo.split(' ')[0].toLowerCase(); // Comparação case-insensitive
            let detalhesEncontrados = null;

            // Tenta encontrar pelo nome exato primeiro
            if (detalhesVeiculosJSON[veiculo.modelo]) {
                detalhesEncontrados = detalhesVeiculosJSON[veiculo.modelo];
            } else { // Tenta encontrar por correspondência parcial
                const chaveEncontrada = Object.keys(detalhesVeiculosJSON).find(
                    key => key.toLowerCase().startsWith(veiculo.modelo.toLowerCase()) ||
                           veiculo.modelo.toLowerCase().startsWith(key.toLowerCase()) ||
                           key.toLowerCase().includes(nomeModeloBase) ||
                           veiculo.modelo.toLowerCase().includes(key.toLowerCase())
                );
                if (chaveEncontrada) {
                    detalhesEncontrados = detalhesVeiculosJSON[chaveEncontrada];
                }
            }

            if (detalhesEncontrados) {
                veiculo.setDetalhesExtras(detalhesEncontrados);
            } else if (veiculo.detalhesExtras !== null) { // Reseta se não encontrar e havia detalhes antes
                veiculo.setDetalhesExtras(null);
            }
        } else if (veiculo && !detalhesVeiculosJSON) {
            console.warn("JSON de detalhes do veículo (vehicle_details.json) não carregado ou vazio.");
        }

        atualizarListaVeiculosUI();
        atualizarDisplay();
        if (veiculoSelecionadoId) {
            switchTab('tab-details');
        } else {
            switchTab('tab-garage');
        }
    }

    function exibirManutencoesUI(veiculo) {
        if (!historicoListaUl || !agendamentosListaUl) { return; } // Verifica se os elementos existem

        historicoListaUl.innerHTML = '<li class="placeholder-text">...</li>';
        agendamentosListaUl.innerHTML = '<li class="placeholder-text">...</li>';

        if (!veiculo) {
            historicoListaUl.innerHTML = '<li class="placeholder-text">Selecione um veículo.</li>';
            agendamentosListaUl.innerHTML = '<li class="placeholder-text">Selecione um veículo.</li>';
            return;
        }
        try {
            const historico = veiculo.getHistoricoPassado();
            historicoListaUl.innerHTML = ''; // Limpa antes de adicionar
            if (historico.length === 0) {
                historicoListaUl.innerHTML = '<li class="placeholder-text">Nenhum histórico de manutenção.</li>';
            } else {
                historico.forEach(m => {
                    const li = document.createElement('li');
                    li.textContent = m.formatar();
                    historicoListaUl.appendChild(li);
                });
            }

            const agendamentos = veiculo.getAgendamentosFuturos();
            agendamentosListaUl.innerHTML = ''; // Limpa antes de adicionar
            if (agendamentos.length === 0) {
                agendamentosListaUl.innerHTML = '<li class="placeholder-text">Nenhum agendamento futuro.</li>';
            } else {
                agendamentos.sort((a, b) => new Date(a.data) - new Date(b.data)); // Ordena por data
                agendamentos.forEach(m => {
                    const li = document.createElement('li');
                    li.textContent = m.formatar();
                    const dataAg = new Date(m.data + 'T00:00:00Z');
                    const hojeInicioDiaUTC = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
                    const amanhaInicioDiaUTC = new Date(hojeInicioDiaUTC);
                    amanhaInicioDiaUTC.setUTCDate(hojeInicioDiaUTC.getUTCDate() + 1);

                    if (dataAg.getTime() === hojeInicioDiaUTC.getTime()) {
                        li.classList.add('agendamento-hoje');
                        li.title = "MANUTENÇÃO AGENDADA PARA HOJE!";
                    } else if (dataAg.getTime() === amanhaInicioDiaUTC.getTime()) {
                        li.classList.add('agendamento-amanha');
                        li.title = "Manutenção agendada para amanhã!";
                    }
                    agendamentosListaUl.appendChild(li);
                });
                verificarProximosAgendamentos(veiculo, agendamentos); // Notifica sobre agendamentos próximos
            }
        } catch (error) {
            console.error(`ERRO ao exibir manutenções para ${veiculo.modelo}:`, error);
            historicoListaUl.innerHTML = '<li class="error-text">Erro ao carregar histórico.</li>';
            agendamentosListaUl.innerHTML = '<li class="error-text">Erro ao carregar agendamentos.</li>';
        }
    }

    function atualizarDisplay() {
        const veiculo = garagem.find(v => v.id === veiculoSelecionadoId);
        const formManutCampos = formManutencao ? [dataManutencaoInput, tipoManutencaoInput, custoManutencaoInput, descManutencaoInput, formManutencao.querySelector('button[type="submit"]')] : [];

        if (veiculo) {
            if (tituloVeiculo) { tituloVeiculo.textContent = `Detalhes: ${veiculo.modelo}`; }
            if (btnRemoverVeiculo) { btnRemoverVeiculo.disabled = false; }
            if (divInformacoes) {
                divInformacoes.innerHTML = veiculo.exibirInformacoes();
                const percVelocidade = veiculo.velocidadeMaxima > 0 ? Math.min(100, (veiculo.velocidade / veiculo.velocidadeMaxima) * 100) : 0;
                // Adiciona velocímetro se não existir
                if (!divInformacoes.querySelector('.velocimetro')) {
                    divInformacoes.innerHTML += `
                        <div class="velocimetro" title="${veiculo.velocidade.toFixed(0)}/${veiculo.velocidadeMaxima} km/h">
                            <div class="velocimetro-barra" style="width: ${percVelocidade.toFixed(1)}%;"></div>
                            <div class="velocimetro-texto">${veiculo.velocidade.toFixed(0)} km/h</div>
                        </div>`;
                } else { // Atualiza velocímetro existente
                    const barra = divInformacoes.querySelector('.velocimetro-barra');
                    const texto = divInformacoes.querySelector('.velocimetro-texto');
                    if (barra) { barra.style.width = `${percVelocidade.toFixed(1)}%`; }
                    if (texto) { texto.textContent = `${veiculo.velocidade.toFixed(0)} km/h`; }
                    if (divInformacoes.querySelector('.velocimetro')) {
                        divInformacoes.querySelector('.velocimetro').title = `${veiculo.velocidade.toFixed(0)}/${veiculo.velocidadeMaxima} km/h`;
                    }
                }
            }

            const ehEsportivo = veiculo instanceof CarroEsportivo;
            const ehCaminhao = veiculo instanceof Caminhao;

            if (controlesEsportivo) { controlesEsportivo.classList.toggle('hidden', !ehEsportivo); }
            if (controlesCaminhao) { controlesCaminhao.classList.toggle('hidden', !ehCaminhao); }

            if (ehEsportivo) {
                if (btnAtivarTurbo) { btnAtivarTurbo.disabled = veiculo.turboAtivado || !veiculo.ligado; }
                if (btnDesativarTurbo) { btnDesativarTurbo.disabled = !veiculo.turboAtivado; }
            }
            if (ehCaminhao) {
                if (cargaInput) { cargaInput.disabled = false; /* cargaInput.value = veiculo.cargaAtual; // Sincroniza valor*/ }
                if (btnCarregar) { btnCarregar.disabled = false; }
                if (btnDescarregar) { btnDescarregar.disabled = false; }
            } else { // Reseta e desabilita controles de caminhão se não for um
                if (cargaInput) { cargaInput.disabled = true; cargaInput.value = "1000"; /* Valor padrão ou limpo */ }
                if (btnCarregar) { btnCarregar.disabled = true; }
                if (btnDescarregar) { btnDescarregar.disabled = true; }
            }

            if (btnLigar) { btnLigar.disabled = veiculo.ligado; }
            if (btnDesligar) { btnDesligar.disabled = !veiculo.ligado || veiculo.velocidade > 0; }
            if (btnAcelerar) { btnAcelerar.disabled = !veiculo.ligado || veiculo.velocidade >= veiculo.velocidadeMaxima; }
            if (btnFrear) { btnFrear.disabled = veiculo.velocidade === 0; }
            if (btnBuzinar) { btnBuzinar.disabled = false; }

            exibirManutencoesUI(veiculo);
            formManutCampos.forEach(campo => { if (campo) { campo.disabled = false; } });
            if (tabButtonDetails) { tabButtonDetails.disabled = false; }

        } else { // Nenhum veículo selecionado
            if (tituloVeiculo) { tituloVeiculo.textContent = 'Detalhes'; }
            if (divInformacoes) { divInformacoes.innerHTML = '<p class="placeholder-text">Selecione um veículo na aba "Minha Garagem".</p>'; }
            if (historicoListaUl) { historicoListaUl.innerHTML = '<li class="placeholder-text">Nenhum veículo selecionado.</li>'; }
            if (agendamentosListaUl) { agendamentosListaUl.innerHTML = '<li class="placeholder-text">Nenhum veículo selecionado.</li>'; }

            if (controlesEsportivo) { controlesEsportivo.classList.add('hidden'); }
            if (controlesCaminhao) { controlesCaminhao.classList.add('hidden'); }

            [btnLigar, btnDesligar, btnAcelerar, btnFrear, btnBuzinar, btnRemoverVeiculo, btnAtivarTurbo, btnDesativarTurbo, cargaInput, btnCarregar, btnDescarregar]
                .forEach(el => { if (el) { el.disabled = true; } });
            formManutCampos.forEach(campo => { if (campo) { campo.disabled = true; } });
            if (tabButtonDetails) { tabButtonDetails.disabled = true; }

            // Se a aba de detalhes estiver ativa sem veículo, volta para a garagem
            const activeDetailsTab = document.getElementById('tab-details');
            if (activeDetailsTab && activeDetailsTab.classList.contains('active')) {
                switchTab('tab-garage');
            }
        }
    }

    function interagir(acao) {
        const veiculo = garagem.find(v => v.id === veiculoSelecionadoId);
        if (!veiculo) {
            adicionarNotificacao("Por favor, selecione um veículo primeiro.", "erro");
            return;
        }
        console.log(`LOG: Interação: "${acao}" no veículo ${veiculo.modelo}`);
        try {
            switch (acao) {
                case 'ligar': veiculo.ligar(); break;
                case 'desligar': veiculo.desligar(); break;
                case 'acelerar': veiculo.acelerar(); break;
                case 'frear': veiculo.frear(); break;
                case 'buzinar': veiculo.buzinar(); break;
                case 'ativarTurbo':
                    if (veiculo instanceof CarroEsportivo) {
                        veiculo.ativarTurbo();
                    } else {
                        veiculo.alerta("Esta ação não está disponível para este tipo de veículo.", "aviso");
                        tocarSom('somErro');
                    }
                    break;
                case 'desativarTurbo':
                    if (veiculo instanceof CarroEsportivo) {
                        veiculo.desativarTurbo();
                    } // Não precisa de 'else' se a ação só se aplica a esportivos
                    break;
                case 'carregar':
                    if (veiculo instanceof Caminhao && cargaInput) {
                        const peso = parseFloat(cargaInput.value);
                        if (!isNaN(peso) && peso > 0) {
                            veiculo.carregar(peso);
                        } else {
                            veiculo.alerta("Por favor, insira um valor de carga válido e positivo.", "erro");
                            tocarSom('somErro');
                        }
                    } else if (veiculo) { // Garante que 'veiculo' existe antes de chamar 'alerta'
                        veiculo.alerta("Esta ação não está disponível para este tipo de veículo.", "aviso");
                        tocarSom('somErro');
                    }
                    break;
                case 'descarregar':
                    if (veiculo instanceof Caminhao && cargaInput) {
                        const peso = parseFloat(cargaInput.value);
                        if (!isNaN(peso) && peso > 0) {
                            veiculo.descarregar(peso);
                        } else {
                            veiculo.alerta("Por favor, insira um valor de descarga válido e positivo.", "erro");
                            tocarSom('somErro');
                        }
                    } else if (veiculo) {
                        veiculo.alerta("Esta ação não está disponível para este tipo de veículo.", "aviso");
                        tocarSom('somErro');
                    }
                    break;
                default:
                    console.warn(`WARN: Ação desconhecida: ${acao}`);
                    adicionarNotificacao(`Ação "${acao}" não é reconhecida.`, 'erro');
            }
        } catch (error) {
            console.error(`ERRO durante a interação "${acao}" com ${veiculo.modelo}:`, error);
            adicionarNotificacao(`Erro ao executar ${acao}: ${error.message}`, "erro");
        }
    }

    function adicionarNotificacao(mensagem, tipo = 'info', duracaoMs = 5000) {
        console.log(`NOTIFICAÇÃO [${tipo}]: ${mensagem}`);
        if (!notificacoesDiv) {
            console.error("ERRO FATAL: Container de notificações (div#notificacoes) não encontrado no DOM.");
            return;
        }
        const notificacao = document.createElement('div');
        notificacao.className = `notificacao ${tipo}`;
        notificacao.textContent = mensagem.length > 150 ? mensagem.substring(0, 147) + '...' : mensagem;
        notificacao.title = mensagem; // Mostra a mensagem completa no hover

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×'; // '×' (símbolo de fechar)
        closeButton.className = 'notificacao-close';
        closeButton.title = "Fechar notificação";
        closeButton.onclick = () => { // Arrow function para manter o 'this' correto se necessário
            notificacao.classList.remove('show');
            // Espera a transição de fade-out terminar antes de remover o elemento
            notificacao.addEventListener('transitionend', () => notificacao.remove(), { once: true });
        };

        notificacao.appendChild(closeButton);
        notificacoesDiv.appendChild(notificacao);

        // Força um reflow para garantir que a transição de entrada funcione
        requestAnimationFrame(() => {
            setTimeout(() => {
                notificacao.classList.add('show');
            }, 10); // Pequeno delay para o navegador processar a adição
        });

        let currentTimerId = setTimeout(() => {
            closeButton.onclick(); // Chama a função de fechar
        }, duracaoMs);

        // Pausa o timer de auto-fechamento se o mouse estiver sobre a notificação
        notificacao.addEventListener('mouseover', () => clearTimeout(currentTimerId));
        // Reinicia o timer (com tempo um pouco menor) quando o mouse sai
        notificacao.addEventListener('mouseleave', () => {
            clearTimeout(currentTimerId); // Limpa o timer anterior para evitar múltiplos fechamentos
            currentTimerId = setTimeout(() => {
                closeButton.onclick();
            }, duracaoMs / 1.5); // Fecha mais rápido após o mouse sair
        });
    }

    function verificarProximosAgendamentos(veiculo, agendamentos) {
        const hojeUTC = new Date();
        const hojeInicioDiaUTC = new Date(Date.UTC(hojeUTC.getUTCFullYear(), hojeUTC.getUTCMonth(), hojeUTC.getUTCDate()));
        const amanhaInicioDiaUTC = new Date(hojeInicioDiaUTC);
        amanhaInicioDiaUTC.setUTCDate(hojeInicioDiaUTC.getUTCDate() + 1);

        agendamentos.forEach(ag => {
            const dataAg = new Date(ag.data + 'T00:00:00Z'); // Assegura UTC
            const lembreteId = `${veiculo.id}-${ag.data}-${ag.tipo}`; // ID mais único para o lembrete

            if (!lembretesMostrados.has(lembreteId)) {
                if (dataAg.getTime() === hojeInicioDiaUTC.getTime()) {
                    adicionarNotificacao(`LEMBRETE HOJE: "${ag.tipo}" para ${veiculo.modelo}`, 'aviso', 15000);
                    lembretesMostrados.add(lembreteId);
                } else if (dataAg.getTime() === amanhaInicioDiaUTC.getTime()) {
                    adicionarNotificacao(`LEMBRETE AMANHÃ: "${ag.tipo}" para ${veiculo.modelo}`, 'info', 15000);
                    lembretesMostrados.add(lembreteId);
                }
            }
        });
    }

    // --- EVENT LISTENERS ---
    if (tabNavigation) {
        tabNavigation.addEventListener('click', (e) => {
            if (e.target.matches('.tab-button:not(:disabled)')) {
                switchTab(e.target.dataset.tab);
            }
        });
    } else {
        console.error("ERRO FATAL: Contêiner de navegação por abas (.tab-navigation) não encontrado!");
    }

    if (formAdicionarVeiculo) {
        formAdicionarVeiculo.addEventListener('submit', (e) => {
            e.preventDefault();
            const tipo = tipoVeiculoSelect.value;
            const modelo = modeloInput.value.trim();
            const cor = corInput.value;
            let novoVeiculo = null;
            try {
                if (!modelo) { throw new Error("O modelo do veículo é obrigatório."); }
                if (!tipo) { throw new Error("Por favor, selecione o tipo de veículo."); }

                switch (tipo) {
                    case 'CarroEsportivo':
                        novoVeiculo = new CarroEsportivo(modelo, cor);
                        break;
                    case 'Caminhao':
                        const cap = capacidadeCargaInput.value; // Já é um número pelo type="number"
                        novoVeiculo = new Caminhao(modelo, cor, cap);
                        break;
                    case 'Carro':
                    default:
                        novoVeiculo = new Carro(modelo, cor);
                        break;
                }
                garagem.push(novoVeiculo);
                salvarGaragem();
                atualizarListaVeiculosUI();
                formAdicionarVeiculo.reset(); // Limpa o formulário
                if (tipoVeiculoSelect) { tipoVeiculoSelect.value = ""; } // Reseta o select
                if (campoCapacidadeCarga) { campoCapacidadeCarga.classList.add('hidden'); } // Esconde campo de carga
                if (capacidadeCargaInput) { capacidadeCargaInput.value = "10000"; } // Reseta valor padrão
                if (corInput) { corInput.value = "#cccccc"; } // Reseta cor padrão

                adicionarNotificacao(`${novoVeiculo.modelo} adicionado à garagem com sucesso!`, 'sucesso');
                switchTab('tab-garage'); // Muda para a aba da garagem
                // Adiciona um destaque visual ao novo veículo na lista
                setTimeout(() => {
                    const btn = listaVeiculosDiv.querySelector(`button[data-veiculo-id="${novoVeiculo.id}"]`);
                    if (btn) {
                        btn.focus({ preventScroll: true }); // Foca no botão
                        btn.classList.add('highlight-add');
                        setTimeout(() => { btn.classList.remove('highlight-add'); }, 2000); // Remove destaque após 2s
                    }
                }, 150); // Pequeno delay para garantir que a UI atualizou
            } catch (error) {
                console.error("Erro ao adicionar veículo:", error);
                adicionarNotificacao(`Erro ao adicionar veículo: ${error.message}`, 'erro');
                tocarSom('somErro');
            }
        });
    } else {
        console.error("ERRO FATAL: Formulário de adicionar veículo (#formAdicionarVeiculo) não encontrado!");
    }

    if (tipoVeiculoSelect) {
        tipoVeiculoSelect.addEventListener('change', () => {
            if (campoCapacidadeCarga) { // Verifica se o campo existe
                campoCapacidadeCarga.classList.toggle('hidden', tipoVeiculoSelect.value !== 'Caminhao');
            }
        });
    }

    if (formManutencao) {
        formManutencao.addEventListener('submit', (e) => {
            e.preventDefault();
            const veiculo = garagem.find(v => v.id === veiculoSelecionadoId);
            if (!veiculo) {
                adicionarNotificacao("Por favor, selecione um veículo para adicionar a manutenção.", "erro");
                return;
            }
            try {
                // Certifique-se que os inputs de manutenção existem antes de ler seus valores
                if (!dataManutencaoInput || !tipoManutencaoInput || !custoManutencaoInput || !descManutencaoInput) {
                    console.error("Erro: Um ou mais campos do formulário de manutenção não foram encontrados.");
                    adicionarNotificacao("Erro interno no formulário de manutenção.", "erro");
                    return;
                }
                const novaM = new Manutencao(
                    dataManutencaoInput.value,
                    tipoManutencaoInput.value,
                    custoManutencaoInput.value,
                    descManutencaoInput.value
                );
                veiculo.adicionarManutencao(novaM);
                formManutencao.reset(); // Limpa o formulário
                if (dataManutencaoInput) { dataManutencaoInput.value = ''; } // Garante que o campo data seja limpo
                if (custoManutencaoInput) { custoManutencaoInput.value = "0"; } // Reseta valor padrão

                adicionarNotificacao(`Registro de manutenção adicionado para ${veiculo.modelo}.`, 'sucesso');
                if (veiculo.id === veiculoSelecionadoId) { // Atualiza o display se o veículo selecionado foi modificado
                    atualizarDisplay();
                }
            } catch (error) {
                console.error("Erro ao adicionar manutenção:", error);
                adicionarNotificacao(`Erro no registro de manutenção: ${error.message}`, 'erro');
                tocarSom('somErro');
            }
        });
    } else {
        console.error("ERRO FATAL: Formulário de manutenção (#formManutencao) não encontrado!");
    }

    if (btnRemoverVeiculo) {
        btnRemoverVeiculo.addEventListener('click', () => {
            const veiculo = garagem.find(v => v.id === veiculoSelecionadoId);
            if (!veiculo) { return; } // Não deveria acontecer se o botão está habilitado

            if (confirm(`ATENÇÃO!\n\nTem certeza que deseja remover o veículo ${veiculo.modelo} da garagem?\n\nEsta ação não pode ser desfeita.`)) {
                // Tenta desligar o veículo antes de remover, se estiver ligado
                if (veiculo.ligado) {
                    if (!veiculo.desligar()) { // Se não conseguiu desligar (ex: em movimento)
                        // A função desligar() já deve ter mostrado um alerta.
                        return; // Interrompe a remoção
                    }
                }
                const idRemovido = veiculo.id;
                const nomeRemovido = veiculo.modelo;
                garagem = garagem.filter(v => v.id !== idRemovido);
                selecionarVeiculo(null); // Desseleciona o veículo
                salvarGaragem(); // Salva a garagem sem o veículo
                adicionarNotificacao(`${nomeRemovido} foi removido da garagem.`, "info");
            }
        });
    } else {
        console.error("ERRO FATAL: Botão Remover Veículo (#btnRemoverVeiculo) não encontrado!");
    }

    const botoesAcao = [
        { id: 'btnLigar', acao: 'ligar' }, { id: 'btnDesligar', acao: 'desligar' },
        { id: 'btnAcelerar', acao: 'acelerar' }, { id: 'btnFrear', acao: 'frear' },
        { id: 'btnBuzinar', acao: 'buzinar' }, { id: 'btnAtivarTurbo', acao: 'ativarTurbo' },
        { id: 'btnDesativarTurbo', acao: 'desativarTurbo' }, { id: 'btnCarregar', acao: 'carregar' },
        { id: 'btnDescarregar', acao: 'descarregar' },
    ];
    botoesAcao.forEach(item => {
        const btn = document.getElementById(item.id);
        if (btn) {
            btn.addEventListener('click', () => interagir(item.acao));
        } else {
            // Não é fatal, mas bom saber se um botão esperado não foi encontrado
            // console.warn(`WARN: Botão de ação esperado não encontrado no DOM: ${item.id}`);
        }
    });

    if (volumeSlider) {
        const savedVolume = localStorage.getItem('garagemVolumePref_v4_1_pastel_v2');
        if (savedVolume !== null) {
            volumeSlider.value = savedVolume;
        }
        atualizarVolume(); // Aplica o volume inicial
        volumeSlider.addEventListener('input', atualizarVolume);
    }

    // --- Event Listeners da Previsão do Tempo ---
    if (fetchWeatherBtn && cityInputEl) {
        fetchWeatherBtn.addEventListener('click', () => {
            const city = cityInputEl.value.trim();
            if (city) {
                fetchWeatherData(city);
            } else {
                adicionarNotificacao("Por favor, digite o nome de uma cidade para buscar a previsão.", "aviso");
                cityInputEl.focus();
            }
        });
        cityInputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                fetchWeatherBtn.click(); // Simula o clique no botão de busca
            }
        });
    }
    if (getGeoLocationWeatherBtn) {
        getGeoLocationWeatherBtn.addEventListener('click', handleGeoLocationClick);
    }
    if (forecastFilterControlsEl) {
        forecastFilterControlsEl.addEventListener('click', handleFilterButtonClick);
    }
    if (highlightControlsEl) { // Verifica se os controles de destaque existem
        highlightControlsEl.addEventListener('change', handleHighlightChange);
    }


    // --- Função para carregar detalhes dos veículos do JSON ---
    async function carregarDetalhesVeiculos() {
        try {
            const response = await fetch('vehicle_details.json'); // Certifique-se que este arquivo existe na raiz
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, ${response.statusText}`);
            }
            detalhesVeiculosJSON = await response.json();
            console.log("LOG: Detalhes dos veículos (vehicle_details.json) carregados com sucesso.");
        } catch (error) {
            console.error("ERRO ao carregar vehicle_details.json:", error);
            adicionarNotificacao("Falha ao carregar detalhes extras dos veículos. O arquivo pode estar faltando ou mal formatado.", "aviso");
            detalhesVeiculosJSON = {}; // Define como objeto vazio para evitar erros posteriores
        }
    }

    function loadHighlightPreferences() {
        const savedPrefs = localStorage.getItem(LOCALSTORAGE_HIGHLIGHT_PREFS_KEY);
        if (savedPrefs) {
            try {
                highlightPreferences = JSON.parse(savedPrefs);
                // Só atualiza os checkboxes se eles existirem no DOM
                if (chkHighlightRain) { chkHighlightRain.checked = !!highlightPreferences.rain; }
                if (chkHighlightCold) { chkHighlightCold.checked = !!highlightPreferences.cold; }
                if (chkHighlightHot) { chkHighlightHot.checked = !!highlightPreferences.hot; }
            } catch (e) {
                console.error("Erro ao carregar preferências de destaque do localStorage:", e);
                highlightPreferences = { rain: false, cold: false, hot: false }; // Reseta para o padrão em caso de erro
            }
        }
    }

    function loadSavedFilter() {
        const savedDays = localStorage.getItem(LOCALSTORAGE_FILTER_DAYS_KEY);
        if (savedDays) {
            activeFilterDays = parseInt(savedDays, 10);
            if (isNaN(activeFilterDays) || activeFilterDays < 1 || activeFilterDays > 5) { // Validação básica
                activeFilterDays = 5; // Default
            }
            filterButtons.forEach(btn => {
                btn.classList.toggle('active', parseInt(btn.dataset.days, 10) === activeFilterDays);
            });
        } else { // Se não houver filtro salvo, ativa o de 5 dias por padrão
            const defaultFilterBtn = forecastFilterControlsEl ? forecastFilterControlsEl.querySelector('.filter-btn[data-days="5"]') : null;
            if (defaultFilterBtn) {
                defaultFilterBtn.classList.add('active');
            }
        }
    }

    // --- INICIALIZAÇÃO ---
    async function inicializarApp() {
        console.log("LOG: Inicializando Garagem Inteligente v4.1 (Pastel)...");
        loadSavedFilter();
        loadHighlightPreferences();
        atualizarVolume(); // Garante que o volume seja aplicado na inicialização
        await carregarDetalhesVeiculos(); // Espera carregar os detalhes antes de prosseguir

        garagem = carregarGaragem();
        atualizarListaVeiculosUI();
        switchTab('tab-garage'); // Começa na aba da garagem
        atualizarDisplay(); // Atualiza o display para o estado inicial (sem veículo selecionado)

        const lastCity = localStorage.getItem(LOCALSTORAGE_LAST_CITY_KEY) || DEFAULT_WEATHER_CITY;
        if (cityInputEl) { // Verifica se o input da cidade existe
            cityInputEl.value = lastCity;
        }
        fetchWeatherData(lastCity); // Busca o clima para a última cidade ou padrão

        console.log("LOG: Aplicação Garagem Inteligente inicializada.");
        adicionarNotificacao("Bem-vindo de volta à Garagem Inteligente Pastel!", "info", 3500);
    }

    // Garante que o DOM está pronto antes de executar a inicialização
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializarApp);
    } else {
        inicializarApp(); // DOM já carregado
    }

})(); // Fim da IIFE