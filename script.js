"use strict";

// =================================================================================
// --- CLASSES DE VEÍCULOS ---
// =================================================================================
class Veiculo {
    constructor(modelo, cor) {
        if (this.constructor === Veiculo) throw new Error("Classe abstrata.");
        this.modelo = modelo;
        this.cor = cor;
        this.ligado = false;
        this.velocidade = 0;
        this.velocidadeMaxima = this.definirVelocidadeMaxima();
        this.historicoManutencao = [];
    }

    definirVelocidadeMaxima() {
        throw new Error("Implementar na subclasse.");
    }

    ligar() {
        if (this.ligado) return mostrarAlerta(`${this.modelo} já está ligado.`, 'info');
        this.ligado = true;
        tocarSomVeiculo('ligar');
        atualizarDisplayVeiculo();
    }

    desligar() {
        if (!this.ligado) return mostrarAlerta(`${this.modelo} já está desligado.`, 'info');
        if (this.velocidade > 0) return mostrarAlerta(`Não é possível desligar ${this.modelo} em movimento.`, 'erro');
        this.ligado = false;
        tocarSomVeiculo('desligar');
        atualizarDisplayVeiculo();
    }

    acelerar(inc = 10) {
        if (!this.ligado) return mostrarAlerta(`Ligue o ${this.modelo} antes.`, 'erro');
        this.velocidade = Math.min(this.velocidade + Math.round(inc), this.velocidadeMaxima);
        tocarSomVeiculo('acelerar');
        atualizarDisplayVeiculo();
    }

    frear(dec = 10) {
        if (this.velocidade === 0) return mostrarAlerta(`${this.modelo} já está parado.`, 'info');
        this.velocidade = Math.max(this.velocidade - Math.round(dec), 0);
        tocarSomVeiculo('frear');
        atualizarDisplayVeiculo();
    }

    buzinar() {
        tocarSomVeiculo('buzina');
    }
}

class Carro extends Veiculo {
    constructor(modelo, cor) {
        super(modelo, cor);
    }
    definirVelocidadeMaxima() {
        return 180;
    }
}

class CarroEsportivo extends Carro {
    constructor(modelo, cor) {
        super(modelo, cor);
        this.turboAtivado = false;
    }
    definirVelocidadeMaxima() {
        return 250;
    }
    ativarTurbo() {
        if (!this.ligado) return mostrarAlerta(`Ligue o ${this.modelo} antes.`, 'erro');
        this.turboAtivado = true;
        mostrarAlerta('Turbo ativado! 🔥', 'info');
        atualizarDisplayVeiculo();
    }
    desativarTurbo() {
        this.turboAtivado = false;
        mostrarAlerta('Turbo desativado.', 'info');
        atualizarDisplayVeiculo();
    }
    acelerar(incBase = 15) {
        super.acelerar(this.turboAtivado ? incBase * 1.8 : incBase);
    }
}

class Caminhao extends Veiculo {
    constructor(modelo, cor) {
        super(modelo, cor);
    }
    definirVelocidadeMaxima() {
        return 100;
    }
}

// =================================================================================
// --- VARIÁVEIS GLOBAIS ---
// =================================================================================
let garagemDB = [],
    veiculoAtual = null,
    alertaTimeout = null,
    volumeAtual = 0.5;
let authMode = 'login'; // 'login' ou 'register' para o modal de autenticação


// =================================================================================
// --- FUNÇÕES DE API ---
// =================================================================================
async function buscarApi(endpoint, options = {}) {
    const response = await fetch(endpoint, options);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({
            message: `Erro ${response.status}: ${response.statusText}`
        }));
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
            
            const infoSpan = document.createElement('span');
            infoSpan.className = 'veiculo-info';
            infoSpan.dataset.id = veiculoData._id;
            infoSpan.innerHTML = `<strong>${veiculoData.placa}</strong> - ${veiculoData.marca} ${veiculoData.modelo}`;
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'veiculo-actions';
            actionsDiv.innerHTML = `
                <button class="btn-edit" data-id="${veiculoData._id}">Editar</button>
                <button class="btn-delete" data-id="${veiculoData._id}">Excluir</button>
            `;
            
            item.appendChild(infoSpan);
            item.appendChild(actionsDiv);

            item.addEventListener('click', (event) => {
                if (!event.target.closest('button')) {
                    selecionarVeiculo(veiculoData._id);
                }
            });

            lista.appendChild(item);
        });
        container.appendChild(lista);
    } catch (error) {
        mostrarAlerta(error.message, 'erro');
    }
}

async function selecionarVeiculo(veiculoId) {
    const veiculoData = garagemDB.find(v => v._id === veiculoId);
    if (!veiculoData) return;

    switch (veiculoData.tipo) {
        case 'Carro':
            veiculoAtual = new Carro(veiculoData.modelo, veiculoData.cor);
            break;
        case 'CarroEsportivo':
            veiculoAtual = new CarroEsportivo(veiculoData.modelo, veiculoData.cor);
            break;
        case 'Caminhao':
            veiculoAtual = new Caminhao(veiculoData.modelo, veiculoData.cor);
            break;
        default:
            return;
    }
    Object.assign(veiculoAtual, veiculoData);
    await carregarManutencoes(veiculoId);
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
    
    infoVeiculoEl.innerHTML = '';

    const criarInfoLinha = (label, value) => {
        const p = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = `${label}: `;
        p.appendChild(strong);
        p.append(value);
        infoVeiculoEl.appendChild(p);
    };

    criarInfoLinha('Placa', veiculoAtual.placa);
    criarInfoLinha('Marca', veiculoAtual.marca);
    criarInfoLinha('Tipo', veiculoAtual.tipo);

    const pStatus = document.createElement('p');
    pStatus.innerHTML = `<strong>Status: </strong><span class="status-${veiculoAtual.ligado ? 'ligado' : 'desligado'}">${veiculoAtual.ligado ? 'Ligado ✅' : 'Desligado ❌'}</span>`;
    infoVeiculoEl.appendChild(pStatus);

    if (veiculoAtual instanceof CarroEsportivo) {
        const pTurbo = document.createElement('p');
        pTurbo.innerHTML = `<strong>Turbo: </strong><span class="status-${veiculoAtual.turboAtivado ? 'ligado' : 'desligado'}">${veiculoAtual.turboAtivado ? 'Ativado 🔥' : 'Desativado'}</span>`;
        infoVeiculoEl.appendChild(pTurbo);
    }

    velocimetro.value = veiculoAtual.velocidade;
    velocimetro.max = veiculoAtual.velocidadeMaxima;
    velocidadeTexto.textContent = `${veiculoAtual.velocidade} km/h`;

    controlesVeiculoEl.style.display = 'block';
    dicasContainer.style.display = 'block';
    formManutencaoContainer.style.display = 'block';
    document.getElementById('dicas-resultado').innerHTML = '';
    document.querySelectorAll('.acao-esportivo').forEach(el => el.style.display = (veiculoAtual instanceof CarroEsportivo) ? 'inline-block' : 'none');
}

async function carregarManutencoes(veiculoId) {
    const historicoManutencaoEl = document.getElementById('historico-manutencao');
    historicoManutencaoEl.innerHTML = '<h4>Histórico de Manutenção</h4><p><em>Carregando histórico...</em></p>';

    try {
        const manutenções = await buscarApi(`/api/veiculos/${veiculoId}/manutencoes`);
        if (manutenções && manutenções.length > 0) {
            const listaHtml = manutenções.map(m => {
                const custoFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.custo);
                const dataFormatada = new Date(m.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                const kmFormatado = m.quilometragem ? ` - ${m.quilometragem.toLocaleString('pt-BR')} km` : '';
                return `<li><strong>${m.descricaoServico}</strong><br><small>Data: ${dataFormatada} | Custo: ${custoFormatado}${kmFormatado}</small></li>`;
            }).join('');
            historicoManutencaoEl.innerHTML = `<h4>Histórico de Manutenção</h4><ul class="lista-manutencao">${listaHtml}</ul>`;
        } else {
            historicoManutencaoEl.innerHTML = '<h4>Histórico de Manutenção</h4><p>Nenhum registro de manutenção para este veículo.</p>';
        }
    } catch (error) {
        historicoManutencaoEl.innerHTML = `<p class="api-erro">Erro ao carregar histórico: ${error.message}</p>`;
        mostrarAlerta(`Erro ao carregar histórico de manutenção: ${error.message}`, 'erro');
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

    alertaContainer.classList.add('visivel');

    alertaTimeout = setTimeout(() => {
        alertaContainer.classList.remove('visivel');
        setTimeout(() => {
            alertaContainer.textContent = '';
        }, 400);
    }, 4000);
}

function tocarSomVeiculo(acao) {
    const som = document.getElementById(`som-${acao}`);
    if (som) {
        som.currentTime = 0;
        som.volume = volumeAtual;
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
// --- FUNÇÕES DE AUTENTICAÇÃO E CONTROLE DE USO (NOVAS/ATUALIZADAS) ---
// =================================================================================
function abrirModalAuth(mode = 'login') {
    authMode = mode;
    const modal = document.getElementById('modal-login'); // ID do modal de autenticação
    const title = document.getElementById('auth-form-title');
    const subtitle = document.getElementById('auth-form-subtitle');
    const submitBtn = document.getElementById('btn-submit-auth');
    const toggleLink = document.getElementById('link-toggle-auth');

    if (authMode === 'login') {
        title.textContent = 'Acesse sua Garagem';
        subtitle.textContent = 'Faça login para salvar suas manutenções e acessar recursos exclusivos.';
        submitBtn.textContent = 'Entrar';
        toggleLink.textContent = 'Não tem uma conta? Registre-se';
        toggleLink.onclick = () => abrirModalAuth('register');
    } else { // 'register'
        title.textContent = 'Crie sua Conta';
        subtitle.textContent = 'Registre-se para começar a usar todos os recursos!';
        submitBtn.textContent = 'Registrar';
        toggleLink.textContent = 'Já tem uma conta? Faça login';
        toggleLink.onclick = () => abrirModalAuth('login');
    }
    modal.classList.add('visivel');
}

function fecharModalAuth() {
    document.getElementById('modal-login').classList.remove('visivel');
    document.getElementById('form-auth').reset(); // Limpa o formulário
}

// Lógica para logout
function logout() {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userEmail'); // Limpa email do usuário
    localStorage.setItem('usuarioLogado', 'false'); // Marca como deslogado
    localStorage.removeItem('contagemDeUso'); // Opcional: resetar contagem de uso no logout

    mostrarAlerta('Logout realizado com sucesso!', 'info');
    updateHeaderAuthButton(); // Atualiza o botão no topo
    // Opcional: recarregar a página ou re-inicializar algumas partes do app
}

// Função para atualizar o botão de Login/Logout no cabeçalho
function updateHeaderAuthButton() {
    const btnLoginTopo = document.getElementById('btn-abrir-login-topo');
    const userEmail = localStorage.getItem('userEmail');

    if (localStorage.getItem('jwtToken') && localStorage.getItem('usuarioLogado') === 'true') {
        btnLoginTopo.textContent = `Olá, ${userEmail || 'Usuário'} (Sair)`;
        btnLoginTopo.classList.add('btn-logout'); // Adiciona classe para estilo de logout se quiser
        btnLoginTopo.onclick = logout; // Ao clicar, faz logout
    } else {
        btnLoginTopo.textContent = 'Login';
        btnLoginTopo.classList.remove('btn-logout');
        btnLoginTopo.onclick = () => abrirModalAuth('login'); // Ao clicar, abre o modal de login
    }
}

// Chamada para verificar status de autenticação na inicialização
async function checkAuthStatus() {
    const token = localStorage.getItem('jwtToken');
    if (token) {
        try {
            // Tenta verificar o token no backend
            const response = await fetch('/api/auth/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('usuarioLogado', 'true');
                localStorage.setItem('userEmail', data.user.email);
                localStorage.removeItem('contagemDeUso'); // Resetar contagem se o login persistiu
                updateHeaderAuthButton();
                // mostrarAlerta(`Bem-vindo de volta, ${data.user.email}!`, 'info'); // Opcional
            } else {
                // Token inválido ou expirado
                console.log('Token expirado ou inválido. Realize o login novamente.');
                logout(); // Força o logout no frontend
            }
        } catch (error) {
            console.error('Erro ao verificar token:', error);
            logout(); // Força o logout em caso de erro de rede, etc.
        }
    } else {
        // Se não há token, inicia o tracking de uso
        initializeUsageTracking();
    }
}


// Lógica de tracking de uso para não logados
function initializeUsageTracking() {
    if (localStorage.getItem('usuarioLogado') === 'true') return; // Não rastreia se já logado

    let contagemDeUso = parseInt(localStorage.getItem('contagemDeUso'), 10) || 0;
    contagemDeUso++;
    localStorage.setItem('contagemDeUso', contagemDeUso);

    const LIMITE_USOS_SEM_LOGIN = 5;

    if (contagemDeUso < LIMITE_USOS_SEM_LOGIN) {
        const usosRestantes = LIMITE_USOS_SEM_LOGIN - contagemDeUso;
        if (usosRestantes > 0) { // Garante que a mensagem só aparece antes de 5
             mostrarAlerta(`Você pode usar o app mais ${usosRestantes} vez(es) antes de sugerirmos o login.`, 'info');
        }
    } else if (contagemDeUso === LIMITE_USOS_SEM_LOGIN) {
        mostrarAlerta('Você utilizou o app 5 vezes. Considere fazer login para salvar seu progresso!', 'info');
        abrirModalAuth('login'); // Abre o modal para sugerir o login
    }
}


// =================================================================================
// --- PONTO DE ENTRADA E EVENT LISTENERS ---
// =================================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Primeiro, verifica o status de autenticação (se já tem token válido)
    checkAuthStatus();
    buscarEExibirVeiculos();
    
    // Event listener para o botão de login/logout no topo
    const btnAbrirLoginTopo = document.getElementById('btn-abrir-login-topo');
    if (btnAbrirLoginTopo) {
        // A função onclick é definida por updateHeaderAuthButton()
        // e mudará dependendo do estado de login.
    }

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
        const novoVeiculo = {
            tipo: document.getElementById('tipo-veiculo').value,
            placa: document.getElementById('placa-veiculo').value,
            marca: document.getElementById('marca-veiculo').value,
            modelo: document.getElementById('modelo-veiculo').value,
            ano: document.getElementById('ano-veiculo').value,
            cor: document.getElementById('cor-veiculo').value
        };
        try {
            // Adicionar token ao header se a rota de veículos for protegida no futuro
            const options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novoVeiculo)
            };
            const token = localStorage.getItem('jwtToken');
            if (token) {
                options.headers['Authorization'] = `Bearer ${token}`;
            }
            
            await buscarApi('/api/veiculos', options);
            mostrarAlerta('Veículo adicionado com sucesso!', 'info');
            await buscarEExibirVeiculos();
            e.target.reset();
        } catch (error) {
            mostrarAlerta(error.message, 'erro');
        }
    });

    document.getElementById('botoes-veiculo').addEventListener('click', async (event) => {
        const target = event.target.closest('button');
        if (!target) return;
        
        const veiculoId = target.dataset.id;
        const options = { method: 'DELETE' };
        const token = localStorage.getItem('jwtToken');
        if (token) {
            options.headers = { 'Authorization': `Bearer ${token}` };
        }

        if (target.classList.contains('btn-delete')) {
            if (confirm('Tem certeza que deseja excluir este veículo e todo o seu histórico?')) {
                try {
                    await buscarApi(`/api/veiculos/${veiculoId}`, options);
                    mostrarAlerta('Veículo excluído com sucesso.', 'info');
                    if (veiculoAtual && veiculoAtual._id === veiculoId) desselecionarVeiculo();
                    await buscarEExibirVeiculos();
                } catch (error) {
                    mostrarAlerta(error.message, 'erro');
                }
            }
        } else if (target.classList.contains('btn-edit')) {
            abrirModalEdicao(veiculoId);
        }
    });

    document.getElementById('form-edit-veiculo').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-veiculo-id').value;
        const dadosAtualizados = {
            tipo: document.getElementById('edit-tipo-veiculo').value,
            placa: document.getElementById('edit-placa-veiculo').value,
            marca: document.getElementById('edit-marca-veiculo').value,
            modelo: document.getElementById('edit-modelo-veiculo').value,
            ano: document.getElementById('edit-ano-veiculo').value,
            cor: document.getElementById('edit-cor-veiculo').value
        };
        try {
            const options = {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosAtualizados)
            };
            const token = localStorage.getItem('jwtToken');
            if (token) {
                options.headers['Authorization'] = `Bearer ${token}`;
            }

            await buscarApi(`/api/veiculos/${id}`, options);
            fecharModalEdicao();
            mostrarAlerta('Veículo atualizado com sucesso!', 'info');
            await buscarEExibirVeiculos();
            if (veiculoAtual && veiculoAtual._id === id) await selecionarVeiculo(id);
        } catch (error) {
            mostrarAlerta(`Erro ao atualizar: ${error.message}`, 'erro');
        }
    });

    document.getElementById('controles-veiculo').addEventListener('click', (event) => {
        const acao = event.target.dataset.acao;
        if (acao) interagir(acao);
    });

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
        try {
            const options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosFormulario)
            };
            const token = localStorage.getItem('jwtToken');
            if (token) {
                options.headers['Authorization'] = `Bearer ${token}`;
            }

            await buscarApi(`/api/veiculos/${veiculoId}/manutencoes`, options);
            mostrarAlerta('Manutenção registrada com sucesso!', 'info');
            e.target.reset();
            await carregarManutencoes(veiculoId);
        } catch (error) {
            mostrarAlerta(`Erro ao registrar manutenção: ${error.message}`, 'erro');
        }
    });

    document.getElementById('volume-control').addEventListener('input', e => {
        volumeAtual = parseFloat(e.target.value);
    });

    // --- EVENT LISTENER PRINCIPAL PARA O FORMULÁRIO DE AUTENTICAÇÃO ---
    document.getElementById('form-auth').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;

        try {
            let response;
            if (authMode === 'login') {
                response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
            } else { // register
                response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
            }

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.message || (data.errors ? data.errors.join(', ') : 'Erro desconhecido.');
                throw new Error(errorMessage);
            }

            localStorage.setItem('jwtToken', data.token);
            localStorage.setItem('userEmail', data.email);
            localStorage.setItem('usuarioLogado', 'true');
            localStorage.removeItem('contagemDeUso');
            mostrarAlerta(data.message, 'sucesso');
            fecharModalAuth();
            updateHeaderAuthButton();
        } catch (error) {
            mostrarAlerta(`Erro de autenticação: ${error.message}`, 'erro');
        }
    });

    // Event Listener para alternar entre Login e Registro
    document.getElementById('link-toggle-auth').addEventListener('click', (e) => {
        e.preventDefault();
        if (authMode === 'login') {
            abrirModalAuth('register');
        } else {
            abrirModalAuth('login');
        }
    });

    // Event Listener para o botão 'Continuar sem login' no modal
    document.getElementById('btn-continuar-sem-login').addEventListener('click', () => {
        fecharModalAuth();
    });
});