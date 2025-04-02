// script.js - Lógica da Garagem Virtual Interativa
"use strict";

// --- Classes (Manutencao, Veiculo, Carro, CarroEsportivo, Caminhao) ---
// (Colar as definições das classes da resposta anterior aqui - elas não precisam mudar)
// --- Classe Manutencao ---
class Manutencao {
    constructor(data, tipo, custo, descricao = '') { this.data = data; this.tipo = tipo.trim(); this.custo = parseFloat(custo); this.descricao = descricao.trim(); this.id = `m_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`; }
    validar() { const dataObj = new Date(this.data + 'T00:00:00'); const dataValida = dataObj instanceof Date && !isNaN(dataObj.getTime()); const tipoValido = typeof this.tipo === 'string' && this.tipo !== ''; const custoValido = typeof this.custo === 'number' && isFinite(this.custo) && this.custo >= 0; return dataValida && tipoValido && custoValido; }
    formatarData() { try { const dataObj = new Date(this.data + 'T00:00:00'); return new Intl.DateTimeFormat(navigator.language || 'pt-BR').format(dataObj); } catch (e) { console.error("Erro ao formatar data:", this.data, e); return "Data inválida"; } }
    formatar() { if (!this.validar()) { return "<span style='color: red;'>Registro Inválido</span>"; } const custoFormatado = this.custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); let str = `<strong>${this.tipo}</strong> em ${this.formatarData()} - ${custoFormatado}`; if (this.descricao) { str += ` <small><i>(${this.descricao})</i></small>`; } return str; }
    toJSON() { return { data: this.data, tipo: this.tipo, custo: this.custo, descricao: this.descricao, id: this.id }; }
    static fromJSON(json) { if (!json || typeof json !== 'object') return null; const m = new Manutencao(json.data, json.tipo, json.custo, json.descricao); m.id = json.id || m.id; return m.validar() ? m : null; }
}
// --- Classe Base Veiculo ---
class Veiculo {
    constructor(modelo, cor) { if (this.constructor === Veiculo) { throw new Error("Classe abstrata 'Veiculo' não pode ser instanciada."); } this.modelo = modelo; this.cor = cor; this.ligado = false; this.velocidade = 0; this.velocidadeMaxima = this.definirVelocidadeMaxima(); this.historicoManutencao = []; console.log(`Veículo base ${this.modelo} ${this.cor} inicializado.`); }
    definirVelocidadeMaxima() { throw new Error("Método 'definirVelocidadeMaxima' deve ser implementado."); }
    ligar() { if (this.ligado) { this.exibirAlerta(`${this.modelo} já ligado.`, 'info'); return; } this.ligado = true; this.tocarSom('ligar'); console.log(`${this.modelo} ligado.`); this.atualizarInterface(); }
    desligar() { if (!this.ligado) { this.exibirAlerta(`${this.modelo} já desligado.`, 'info'); return; } if (this.velocidade > 0) { this.exibirAlerta(`Não desligar ${this.modelo} em movimento.`, 'erro'); return; } this.ligado = false; this.tocarSom('desligar'); console.log(`${this.modelo} desligado.`); this.atualizarInterface(); }
    acelerar(inc = 10) { if (!this.ligado) { this.exibirAlerta(`Ligue ${this.modelo} p/ acelerar.`, 'erro'); return; } if (this.velocidade >= this.velocidadeMaxima) { this.exibirAlerta(`${this.modelo} na vel. máxima.`, 'info'); return; } this.velocidade = Math.min(this.velocidade + Math.round(inc), this.velocidadeMaxima); this.tocarSom('acelerar'); console.log(`${this.modelo} acelerou p/ ${this.velocidade} km/h.`); this.atualizarInterface(); }
    frear(dec = 10) { if (this.velocidade === 0) { this.exibirAlerta(`${this.modelo} já parado.`, 'info'); return; } this.velocidade = Math.max(this.velocidade - Math.round(dec), 0); this.tocarSom('frear'); console.log(this.velocidade === 0 ? `${this.modelo} parou.` : `${this.modelo} freou p/ ${this.velocidade} km/h.`); this.atualizarInterface(); }
    buzinar() { this.tocarSom('buzina'); console.log(`${this.modelo} buzinou!`); }
    exibirInformacoes() { return `<strong>Modelo:</strong> ${this.modelo}<br><strong>Cor:</strong> ${this.cor}<br><strong>Status:</strong> <span class="status-${this.ligado ? 'ligado' : 'desligado'}">${this.ligado ? 'Ligado ✅' : 'Desligado ❌'}</span><br><strong>Vel. Atual:</strong> ${this.velocidade} km/h<br><strong>Vel. Máxima:</strong> ${this.velocidadeMaxima} km/h`; }
    atualizarInterface() { if (typeof atualizarDisplayVeiculo === 'function') { atualizarDisplayVeiculo(); } if (typeof salvarGaragem === 'function') { salvarGaragem(); } }
    exibirAlerta(msg, tipo = 'info') { if (typeof mostrarAlerta === 'function') { mostrarAlerta(msg, tipo); } else { alert(`[${this.modelo}] ${msg}`); } }
    tocarSom(acao) { if (typeof tocarSomVeiculo === 'function') { tocarSomVeiculo(acao); } }
    adicionarManutencao(manut) { if (!Array.isArray(this.historicoManutencao)) { this.historicoManutencao = []; } if (manut instanceof Manutencao && manut.validar()) { this.historicoManutencao.push(manut); console.log(`Manutenção [${manut.tipo}] add a ${this.modelo}.`); this.atualizarInterface(); return true; } else { console.error("Tentativa de add manutenção inválida:", manut); this.exibirAlerta("Erro ao add manutenção.", "erro"); return false; } }
    obterHistoricoManutencaoFormatado() { if (!this.historicoManutencao || this.historicoManutencao.length === 0) { return "<p>Nenhuma manutenção registrada/agendada.</p>"; } const agora = new Date(); agora.setHours(0, 0, 0, 0); const historico = []; const agendamentos = []; [...this.historicoManutencao].sort((a, b) => new Date(b.data + 'T00:00:00') - new Date(a.data + 'T00:00:00')).forEach(m => { const dataM = new Date(m.data + 'T00:00:00'); if (dataM <= agora) { historico.push(m); } else { agendamentos.push(m); } }); agendamentos.sort((a, b) => new Date(a.data + 'T00:00:00') - new Date(b.data + 'T00:00:00')); let histHTML = "<h4>Histórico</h4>" + (historico.length > 0 ? `<ul>${historico.map(m => `<li>${m.formatar()}</li>`).join('')}</ul>` : "<p>Nenhum registro passado.</p>"); let agenHTML = "<h4>Agendamentos</h4>" + (agendamentos.length > 0 ? `<ul>${agendamentos.map(m => `<li>${m.formatar()} <span style='color:#007bff;'><i>(Agendado)</i></span></li>`).join('')}</ul>` : "<p>Nenhum agendamento futuro.</p>"); return histHTML + agenHTML; }
}
// --- Classe Carro ---
class Carro extends Veiculo { constructor(m, c) { super(m, c); console.log(`Carro ${m} ${c} criado.`); } definirVelocidadeMaxima() { return 180; } }
// --- Classe CarroEsportivo ---
class CarroEsportivo extends Carro { constructor(m, c) { super(m, c); this.turboAtivado = false; console.log(`Esportivo ${m} ${c} criado.`); } definirVelocidadeMaxima() { return 250; } ativarTurbo() { if (!this.ligado) { this.exibirAlerta(`Ligue ${this.modelo} p/ ativar turbo.`, 'erro'); return; } if (this.turboAtivado) { this.exibirAlerta(`Turbo já ativado.`, 'info'); return; } this.turboAtivado = true; console.log(`Turbo ${this.modelo} ON! 🚀`); this.exibirAlerta(`Turbo ativado! 🔥`, 'info'); this.atualizarInterface(); } desativarTurbo() { if (!this.turboAtivado) { this.exibirAlerta(`Turbo já desativado.`, 'info'); return; } this.turboAtivado = false; console.log(`Turbo ${this.modelo} OFF.`); this.exibirAlerta(`Turbo desativado.`, 'info'); this.atualizarInterface(); } acelerar(incBase = 15) { if (!this.ligado) { this.exibirAlerta(`Ligue ${this.modelo} p/ acelerar.`, 'erro'); return; } if (this.velocidade >= this.velocidadeMaxima) { this.exibirAlerta(`${this.modelo} na vel. máxima.`, 'info'); return; } const incReal = this.turboAtivado ? incBase * 1.8 : incBase; this.velocidade = Math.min(this.velocidade + Math.round(incReal), this.velocidadeMaxima); this.tocarSom('acelerar'); console.log(`${this.modelo} ${this.turboAtivado ? '(Turbo)' : ''} acelerou p/ ${this.velocidade} km/h.`); this.atualizarInterface(); } exibirInformacoes() { const base = super.exibirInformacoes(); return `${base}<br><strong>Turbo:</strong> <span class="status-${this.turboAtivado ? 'ligado' : 'desligado'}">${this.turboAtivado ? 'Ativado 🔥' : 'Desativado'}</span>`; } }
// --- Classe Caminhao ---
class Caminhao extends Veiculo { constructor(m, c, cap) { super(m, c); this.capacidadeCarga = typeof cap === 'number' && cap > 0 ? cap : 0; this.cargaAtual = 0; console.log(`Caminhão ${m} ${c} (Cap: ${this.capacidadeCarga.toLocaleString()}kg) criado.`); } definirVelocidadeMaxima() { return 100; } carregar(peso) { if (this.ligado) { this.exibirAlerta(`Desligue ${this.modelo} p/ carregar.`, 'erro'); return; } if (isNaN(peso) || peso <= 0) { this.exibirAlerta("Peso inválido.", "erro"); return; } if (this.cargaAtual + peso > this.capacidadeCarga) { const livre = this.capacidadeCarga - this.cargaAtual; this.exibirAlerta(`Não cabe ${peso.toLocaleString()}kg. Excede em ${(peso - livre).toLocaleString()}kg. Livre: ${livre.toLocaleString()}kg.`, "erro"); } else { this.cargaAtual += peso; console.log(`${this.modelo} carregado com ${peso.toLocaleString()}kg. Atual: ${this.cargaAtual.toLocaleString()}kg.`); this.exibirAlerta(`${this.modelo} carregado: ${peso.toLocaleString()}kg. Carga: ${this.cargaAtual.toLocaleString()}kg.`, 'info'); this.atualizarInterface(); } } descarregar(peso) { if (this.ligado) { this.exibirAlerta(`Desligue ${this.modelo} p/ descarregar.`, 'erro'); return; } if (isNaN(peso) || peso <= 0) { this.exibirAlerta("Peso inválido.", "erro"); return; } if (this.cargaAtual - peso < 0) { this.exibirAlerta(`Não pode descarregar ${peso.toLocaleString()}kg. Carga: ${this.cargaAtual.toLocaleString()}kg.`, "erro"); } else { this.cargaAtual -= peso; console.log(`${this.modelo} descarregado ${peso.toLocaleString()}kg. Atual: ${this.cargaAtual.toLocaleString()}kg.`); this.exibirAlerta(`${this.modelo} descarregado: ${peso.toLocaleString()}kg. Carga: ${this.cargaAtual.toLocaleString()}kg.`, 'info'); this.atualizarInterface(); } } acelerar(incBase = 8) { if (!this.ligado) { this.exibirAlerta(`Ligue ${this.modelo} p/ acelerar.`, 'erro'); return; } if (this.velocidade >= this.velocidadeMaxima) { this.exibirAlerta(`${this.modelo} na vel. máxima.`, 'info'); return; } const fatorCarga = Math.max(0.4, 1 - (this.cargaAtual / (this.capacidadeCarga * 1.5))); const incReal = Math.max(1, Math.round(incBase * fatorCarga)); this.velocidade = Math.min(this.velocidade + incReal, this.velocidadeMaxima); this.tocarSom('acelerar'); console.log(`${this.modelo} acelerou ${incReal} p/ ${this.velocidade} km/h (Carga:${this.cargaAtual.toLocaleString()}kg)`); this.atualizarInterface(); } exibirInformacoes() { const base = super.exibirInformacoes(); const perc = ((this.cargaAtual / (this.capacidadeCarga || 1)) * 100).toFixed(0); return `${base}<br><strong>Capacidade:</strong> ${this.capacidadeCarga.toLocaleString()} kg<br><strong>Carga Atual:</strong> ${this.cargaAtual.toLocaleString()} kg <progress value="${this.cargaAtual}" max="${this.capacidadeCarga}" title="${perc}%"></progress> <span style='font-size:0.8em'>(${perc}%)</span>`; } }
// --- FIM DAS CLASSES ---


// ================================================================== //
// --- Lógica Principal da Aplicação e Manipulação da Interface --- //
// ================================================================== //

// --- Seleção de Elementos do DOM ---
console.log("Selecionando elementos do DOM...");
const botoesVeiculoContainer = document.getElementById('botoes-veiculo');
const nomeVeiculoSelecionadoEl = document.getElementById('nome-veiculo-selecionado');
const alertaContainer = document.getElementById('alerta-container');
const informacoesVeiculoEl = document.getElementById('informacoes-veiculo');
// Seleciona TODAS as imagens que podem ser exibidas
const imagensDisplay = document.querySelectorAll('.imagem-display'); // NodeList com todas as <img>
const imagemPlaceholderEl = document.getElementById('imagem-placeholder'); // Referência específica ao placeholder
const imagemVeiculoContainer = document.getElementById('imagem-veiculo-container'); // Container das imagens
const velocimetroProgress = document.getElementById('velocimetro');
const velocidadeTexto = document.getElementById('velocidade-texto');
const controlesVeiculoEl = document.getElementById('controles-veiculo');
const acoesEsportivo = document.querySelectorAll('.acao-esportivo');
const acoesCaminhao = document.querySelectorAll('.acao-caminhao');
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
const sons = { // Mapeamento para elementos <audio>
    ligar: document.getElementById('som-ligar'),
    desligar: document.getElementById('som-desligar'),
    acelerar: document.getElementById('som-acelerar'),
    frear: document.getElementById('som-frear'),
    buzina: document.getElementById('som-buzina'),
};
console.log("Elementos do DOM selecionados.");

// --- Variáveis Globais de Estado ---
let garagem = {};
let veiculoAtual = null;
let idVeiculoAtual = null;
let alertaTimeout = null;
let volumeAtual = 0.5;


// --- Funções Auxiliares da UI ---
/** Exibe alerta temporário. */
function mostrarAlerta(mensagem, tipo = 'info') { /* ... (código da função mostrarAlerta da resposta anterior) ... */
    if (!alertaContainer) { console.error("Elemento #alerta-container não encontrado!"); return; } if (alertaTimeout) clearTimeout(alertaTimeout); alertaContainer.textContent = mensagem; alertaContainer.className = `alerta-${tipo}`; alertaContainer.style.display = 'block'; alertaContainer.style.opacity = 1; const duracaoAlerta = 5000; alertaTimeout = setTimeout(() => { alertaContainer.style.opacity = 0; setTimeout(() => { if (alertaContainer.style.opacity === '0') { alertaContainer.style.display = 'none'; alertaContainer.textContent = ''; alertaContainer.className = ''; } }, 400); alertaTimeout = null; }, duracaoAlerta);
 }
/** Toca efeito sonoro. */
function tocarSomVeiculo(acao) { /* ... (código da função tocarSomVeiculo da resposta anterior) ... */
    const som = sons[acao]; if (som instanceof HTMLAudioElement) { som.pause(); som.currentTime = 0; som.volume = volumeAtual; som.play().catch(error => console.warn(`Falha ao tocar som "${acao}": ${error.message}`)); } else if (acao) { console.warn(`Elemento de áudio para a ação "${acao}" não encontrado.`); }
}

// --- Função Principal de Atualização da Interface ---
/** Atualiza a UI baseada no veículo selecionado. */
function atualizarDisplayVeiculo() {
    console.log(`Atualizando display. Veículo atual: ${idVeiculoAtual ? idVeiculoAtual : 'Nenhum'}`);

    // --- Caso 1: Nenhum veículo selecionado ---
    if (!veiculoAtual || !idVeiculoAtual) {
        nomeVeiculoSelecionadoEl.textContent = 'Nenhum';
        informacoesVeiculoEl.innerHTML = '<p>Selecione um veículo na garagem ou adicione um novo.</p>';
        // Mostra APENAS o placeholder, esconde as outras imagens
        imagensDisplay.forEach(img => {
            img.style.display = (img.id === 'imagem-placeholder') ? 'block' : 'none';
        });
        controlesVeiculoEl.style.display = 'none';
        formAddManutencao.style.display = 'none';
        manutencaoSemVeiculoMsg.style.display = 'block';
        historicoManutencaoEl.innerHTML = '';
        velocimetroProgress.style.display = 'none';
        velocidadeTexto.style.display = 'none';
        document.querySelectorAll('#botoes-veiculo button').forEach(btn => btn.classList.remove('selecionado'));
        console.log("Display atualizado para 'Nenhum veículo'.");
        return;
    }

    // --- Caso 2: Um veículo está selecionado ---
    controlesVeiculoEl.style.display = 'block';
    formAddManutencao.style.display = 'block';
    manutencaoSemVeiculoMsg.style.display = 'none';
    velocimetroProgress.style.display = 'block';
    velocidadeTexto.style.display = 'inline-block';

    // 1. Atualiza Nome
    nomeVeiculoSelecionadoEl.textContent = `${veiculoAtual.modelo} (${veiculoAtual.constructor.name})`;

    // 2. Atualiza Informações
    informacoesVeiculoEl.innerHTML = veiculoAtual.exibirInformacoes();

    // 3. ATUALIZA IMAGEM (Lógica Modificada para controlar visibilidade)
    console.log(`Atualizando imagem para tipo: ${veiculoAtual.constructor.name}`);
    let idImagemAtiva = 'imagem-placeholder'; // ID da imagem a ser exibida (padrão placeholder)
    const tipoVeiculo = veiculoAtual.constructor.name;

    // Determina qual ID de imagem corresponde ao tipo do veículo
    switch (tipoVeiculo) {
        case 'Caminhao':       idImagemAtiva = 'imagem-caminhao'; break;
        case 'CarroEsportivo': idImagemAtiva = 'imagem-esportivo'; break;
        case 'Carro':          idImagemAtiva = 'imagem-carro'; break;
        // Adicionar mais 'case' para outros tipos
        default:
             console.warn(`Tipo "${tipoVeiculo}" não tem ID de imagem mapeado. Usando placeholder.`);
             // idImagemAtiva permanece 'imagem-placeholder'
             break;
    }

    // Itera sobre TODAS as imagens com a classe .imagem-display
    imagensDisplay.forEach(img => {
        // Mostra a imagem se o ID dela for o ID ativo determinado, senão esconde.
        img.style.display = (img.id === idImagemAtiva) ? 'block' : 'none';
    });
    console.log(`Imagem ativa definida para: #${idImagemAtiva}`);

    // 4. Atualiza Velocímetro
    velocimetroProgress.value = veiculoAtual.velocidade;
    velocimetroProgress.max = Math.max(1, veiculoAtual.velocidadeMaxima);
    velocidadeTexto.textContent = `${veiculoAtual.velocidade} km/h`;
    velocimetroProgress.title = `Velocidade: ${veiculoAtual.velocidade}/${veiculoAtual.velocidadeMaxima} km/h`;

    // 5. Controla Visibilidade de Botões Específicos
    acoesEsportivo.forEach(el => el.style.display = (veiculoAtual instanceof CarroEsportivo) ? 'inline-block' : 'none');
    acoesCaminhao.forEach(el => el.style.display = (veiculoAtual instanceof Caminhao) ? 'inline-block' : 'none');

    // 6. Atualiza Histórico de Manutenção
    historicoManutencaoEl.innerHTML = veiculoAtual.obterHistoricoManutencaoFormatado();

    // 7. Limpa Input de Carga
    if (inputPesoCarga) inputPesoCarga.value = '';

    // 8. Atualiza Estilo do Botão de Seleção Ativo
    document.querySelectorAll('#botoes-veiculo button').forEach(btn => {
        btn.classList.toggle('selecionado', btn.dataset.veiculoId === idVeiculoAtual);
    });

    console.log(`Display atualizado para veículo: ${idVeiculoAtual}`);
}


// --- Função de Interação Polimórfica ---
/** Executa ação no veículo atual. */
function interagir(acao) { /* ... (código da função interagir da resposta anterior - não precisa mudar) ... */
    if (!veiculoAtual) { mostrarAlerta("Selecione um veículo!", "erro"); return; } console.log(`Executando ação: ${acao} em ${idVeiculoAtual}`); try { switch (acao) { case 'ligar': veiculoAtual.ligar(); break; case 'desligar': veiculoAtual.desligar(); break; case 'acelerar': veiculoAtual.acelerar(); break; case 'frear': veiculoAtual.frear(); break; case 'buzinar': veiculoAtual.buzinar(); break; case 'ativarTurbo': case 'desativarTurbo': if (veiculoAtual instanceof CarroEsportivo) { veiculoAtual[acao](); } else { mostrarAlerta(`Ação '${acao}' indisponível.`, "erro"); } break; case 'carregar': case 'descarregar': if (veiculoAtual instanceof Caminhao) { const peso = parseFloat(inputPesoCarga.value); if (!isNaN(peso) && peso > 0) { veiculoAtual[acao](peso); } else { mostrarAlerta("Insira peso válido.", "erro"); inputPesoCarga.focus(); } } else { mostrarAlerta(`Ação '${acao}' indisponível.`, "erro"); } break; default: console.warn(`Ação desconhecida: ${acao}`); mostrarAlerta(`Ação desconhecida: ${acao}`, "erro"); } } catch (error) { console.error(`Erro na ação '${acao}':`, error); mostrarAlerta(`Erro: ${error.message}`, "erro"); }
}

// --- Funções de Gerenciamento da Garagem ---
/** Seleciona veículo por ID. */
function selecionarVeiculo(idVeiculo) { /* ... (código da função selecionarVeiculo da resposta anterior - não precisa mudar) ... */
    if (garagem.hasOwnProperty(idVeiculo)) { veiculoAtual = garagem[idVeiculo]; idVeiculoAtual = idVeiculo; console.log(`Veículo ${idVeiculo} selecionado.`); atualizarDisplayVeiculo(); verificarAgendamentosProximos(veiculoAtual); } else { console.error(`Veículo ID ${idVeiculo} não encontrado.`); veiculoAtual = null; idVeiculoAtual = null; mostrarAlerta(`Veículo ID ${idVeiculo} não encontrado.`, "erro"); atualizarDisplayVeiculo(); }
}
/** Adiciona veículo à garagem. */
function adicionarVeiculoNaGaragem(veiculo, id) { /* ... (código da função adicionarVeiculoNaGaragem da resposta anterior - não precisa mudar) ... */
    if (!id) { id = `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`; } if (garagem.hasOwnProperty(id)) { mostrarAlerta(`Erro: ID '${id}' já existe.`, "erro"); return null; } garagem[id] = veiculo; console.log(`Veículo ${id} (${veiculo.modelo}) adicionado.`); salvarGaragem(); criarBotoesSelecaoVeiculo(); return id;
 }
/** Recria botões de seleção. */
function criarBotoesSelecaoVeiculo() { /* ... (código da função criarBotoesSelecaoVeiculo da resposta anterior - não precisa mudar) ... */
    botoesVeiculoContainer.innerHTML = ''; const ids = Object.keys(garagem); if (ids.length === 0) { botoesVeiculoContainer.innerHTML = '<p>Garagem vazia.</p>'; return; } ids.forEach(id => { const v = garagem[id]; const btn = document.createElement('button'); btn.textContent = `${v.modelo} (${v.constructor.name})`; btn.dataset.veiculoId = id; btn.title = `Selecionar ${v.constructor.name} ${v.modelo}`; btn.addEventListener('click', () => selecionarVeiculo(id)); botoesVeiculoContainer.appendChild(btn); }); if (idVeiculoAtual && garagem[idVeiculoAtual]) { const btnAtual = botoesVeiculoContainer.querySelector(`button[data-veiculo-id="${idVeiculoAtual}"]`); if (btnAtual) btnAtual.classList.add('selecionado'); }
}

// --- Persistência com LocalStorage ---
/** Salva garagem no LocalStorage. */
function salvarGaragem() { /* ... (código da função salvarGaragem da resposta anterior - não precisa mudar) ... */
    try { const gS = {}; for (const id in garagem) { if (garagem.hasOwnProperty(id)) { const v = garagem[id]; gS[id] = { tipo: v.constructor.name, dados: { modelo: v.modelo, cor: v.cor, ligado: v.ligado, velocidade: v.velocidade, turboAtivado: v.turboAtivado, capacidadeCarga: v.capacidadeCarga, cargaAtual: v.cargaAtual, historicoManutencao: Array.isArray(v.historicoManutencao) ? v.historicoManutencao.map(m => m.toJSON()) : [] } }; } } localStorage.setItem('garagemVirtual', JSON.stringify(gS)); } catch (e) { console.error("Erro ao salvar:", e); mostrarAlerta("Falha ao salvar dados.", "erro"); }
}
/** Carrega garagem do LocalStorage. */
function carregarGaragem() { /* ... (código da função carregarGaragem da resposta anterior - não precisa mudar) ... */
    console.log("Carregando garagem..."); try { const gSalva = localStorage.getItem('garagemVirtual'); if (!gSalva) { console.log("Nenhum dado salvo. Criando iniciais."); adicionarVeiculoNaGaragem(new Carro('Fusca', 'Azul'), 'carro1'); adicionarVeiculoNaGaragem(new CarroEsportivo('Ferrari F40', 'Vermelha'), 'esportivo1'); adicionarVeiculoNaGaragem(new Caminhao('Scania R450', 'Branco', 25000), 'caminhao1'); const dataEx = new Date(); dataEx.setDate(dataEx.getDate() - 5); const dataExStr = dataEx.toISOString().split('T')[0]; const manutEx = new Manutencao(dataExStr, 'Revisão Geral', 350); if(garagem['carro1']) garagem['carro1'].adicionarManutencao(manutEx); return; } const gSer = JSON.parse(gSalva); garagem = {}; for (const id in gSer) { if (gSer.hasOwnProperty(id)) { const d = gSer[id]; if (!d || !d.tipo || !d.dados) continue; let vRec = null; switch (d.tipo) { case 'Carro': vRec = new Carro(d.dados.modelo, d.dados.cor); break; case 'CarroEsportivo': vRec = new CarroEsportivo(d.dados.modelo, d.dados.cor); break; case 'Caminhao': vRec = new Caminhao(d.dados.modelo, d.dados.cor, d.dados.capacidadeCarga); break; default: console.warn(`Tipo ${d.tipo} desconhecido.`); continue; } vRec.ligado = d.dados.ligado === true; vRec.velocidade = parseFloat(d.dados.velocidade) || 0; if (vRec instanceof CarroEsportivo) vRec.turboAtivado = d.dados.turboAtivado === true; if (vRec instanceof Caminhao) vRec.cargaAtual = parseFloat(d.dados.cargaAtual) || 0; vRec.historicoManutencao = (Array.isArray(d.dados.historicoManutencao)) ? d.dados.historicoManutencao.map(Manutencao.fromJSON).filter(m => m !== null) : []; garagem[id] = vRec; } } console.log("Garagem carregada."); } catch (e) { console.error("Erro crítico ao carregar:", e); mostrarAlerta("Erro ao carregar dados. Resetando.", "erro"); localStorage.removeItem('garagemVirtual'); garagem = {}; adicionarVeiculoNaGaragem(new Carro('Fusca', 'Azul'), 'carro1'); adicionarVeiculoNaGaragem(new CarroEsportivo('Ferrari F40', 'Vermelha'), 'esportivo1'); adicionarVeiculoNaGaragem(new Caminhao('Scania R450', 'Branco', 25000), 'caminhao1'); }
}

// --- Lógica de Lembretes ---
/** Verifica agendamentos próximos. */
function verificarAgendamentosProximos(veiculo) { /* ... (código da função verificarAgendamentosProximos da resposta anterior - não precisa mudar) ... */
    if (!veiculo || !Array.isArray(veiculo.historicoManutencao)) return; const hoje = new Date(); hoje.setHours(0,0,0,0); const amanha = new Date(hoje); amanha.setDate(hoje.getDate() + 1); veiculo.historicoManutencao.forEach(m => { try { const dataM = new Date(m.data + 'T00:00:00'); const tsM = dataM.getTime(); if (tsM === hoje.getTime()) { mostrarAlerta(`🔔 HOJE: ${m.tipo} p/ ${veiculo.modelo}!`, 'info'); } else if (tsM === amanha.getTime()) { mostrarAlerta(`🔔 AMANHÃ: ${m.tipo} p/ ${veiculo.modelo}.`, 'info'); } } catch(e) { console.error(`Erro data ${m.data}`, e); } });
}

// --- Event Listeners ---
// Delegação para botões de AÇÃO
controlesVeiculoEl.addEventListener('click', (event) => { const btn = event.target.closest('button[data-acao]'); if (btn) interagir(btn.dataset.acao); });
// Submit ADD VEÍCULO
formAddVeiculo.addEventListener('submit', (event) => { /* ... (código do listener formAddVeiculo da resposta anterior - não precisa mudar) ... */
    event.preventDefault(); const tipo = tipoVeiculoInput.value; const modelo = modeloVeiculoInput.value.trim(); const cor = corVeiculoInput.value.trim(); const capStr = capacidadeVeiculoInput.value; if (!tipo || !modelo || !cor) { mostrarAlerta("Preencha Tipo, Modelo e Cor.", "erro"); return; } let novoVeiculo = null; try { switch (tipo) { case 'Carro': novoVeiculo = new Carro(modelo, cor); break; case 'CarroEsportivo': novoVeiculo = new CarroEsportivo(modelo, cor); break; case 'Caminhao': const cap = parseFloat(capStr); if (isNaN(cap) || cap <= 0) { mostrarAlerta("Capacidade inválida.", "erro"); capacidadeVeiculoInput.focus(); return; } novoVeiculo = new Caminhao(modelo, cor, cap); break; default: mostrarAlerta("Tipo inválido.", "erro"); return; } const novoId = adicionarVeiculoNaGaragem(novoVeiculo); if (novoId) { mostrarAlerta(`${tipo} "${modelo}" adicionado!`, "info"); formAddVeiculo.reset(); campoCapacidadeDiv.style.display = 'none'; tipoVeiculoInput.value = ""; selecionarVeiculo(novoId); } } catch (error) { console.error("Erro ao criar:", error); mostrarAlerta(`Erro: ${error.message}`, "erro"); }
});
// Change TIPO VEÍCULO
tipoVeiculoInput.addEventListener('change', () => { const ehCaminhao = tipoVeiculoInput.value === 'Caminhao'; campoCapacidadeDiv.style.display = ehCaminhao ? 'block' : 'none'; if (!ehCaminhao) capacidadeVeiculoInput.value = ''; });
// Submit ADD MANUTENÇÃO
formAddManutencao.addEventListener('submit', (event) => { /* ... (código do listener formAddManutencao da resposta anterior - não precisa mudar) ... */
    event.preventDefault(); if (!veiculoAtual) { mostrarAlerta("Selecione veículo.", "erro"); return; } const data = dataManutencaoInput.value; const tipo = tipoServicoInput.value.trim(); const custoStr = custoManutencaoInput.value; const desc = descricaoManutencaoInput.value.trim(); if (!data || !tipo || custoStr === '') { mostrarAlerta("Preencha Data, Tipo e Custo.", "erro"); return; } try { const novaM = new Manutencao(data, tipo, custoStr, desc); if (novaM.validar()) { if (veiculoAtual.adicionarManutencao(novaM)) { mostrarAlerta("Manutenção adicionada!", "info"); formAddManutencao.reset(); verificarAgendamentosProximos(veiculoAtual); } } else { mostrarAlerta("Dados inválidos.", "erro"); } } catch (error) { console.error("Erro add manut:", error); mostrarAlerta(`Erro: ${error.message}`, "erro"); }
});
// Input CONTROLE VOLUME
volumeControl.addEventListener('input', (e) => { volumeAtual = parseFloat(e.target.value); Object.values(sons).forEach(som => { if(som) som.volume = volumeAtual; }); });

// --- Inicialização ---
/** Roda quando o DOM está pronto. */
function inicializarAplicacao() {
    console.log("🚀 DOM pronto. Inicializando aplicação...");
    carregarGaragem();
    criarBotoesSelecaoVeiculo();
    const ids = Object.keys(garagem);
    // Seleciona o primeiro veículo OU atualiza a UI se já houver um selecionado (do carregamento)
    if (ids.length > 0 && !idVeiculoAtual) {
        selecionarVeiculo(ids[0]);
    } else {
        atualizarDisplayVeiculo(); // Garante que a UI esteja correta
        if(veiculoAtual) verificarAgendamentosProximos(veiculoAtual); // Verifica lembretes se um veículo foi carregado
    }
    volumeControl.dispatchEvent(new Event('input')); // Aplica volume inicial
    // Esconde capacidade se o primeiro veículo não for caminhão
    if(!(veiculoAtual instanceof Caminhao)) campoCapacidadeDiv.style.display = 'none';
    console.log("✅ Aplicação Pronta.");
}

// Listener para iniciar tudo
document.addEventListener('DOMContentLoaded', inicializarAplicacao);