"use strict";

// =================================================================================
// --- ELEMENTOS DO DOM ---
// =================================================================================
const mainAppContainer = document.getElementById('main-app-container');
const welcomeMessage = document.getElementById('welcome-message');

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
    definirVelocidadeMaxima() { throw new Error("Implementar na subclasse."); }
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
    buzinar() { tocarSomVeiculo('buzina'); }
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
    acelerar(incBase = 15) { super.acelerar(this.turboAtivado ? incBase * 1.8 : incBase); }
}
class Caminhao extends Veiculo {
    constructor(modelo, cor) { super(modelo, cor); }
    definirVelocidadeMaxima() { return 100; }
}

// =================================================================================
// --- VARIÁVEIS GLOBAIS ---
// =================================================================================
let garagemDB = [],
    veiculoAtual = null,
    alertaTimeout = null,
    volumeAtual = 0.5;
let authMode = 'login';

// =================================================================================
// --- LÓGICA DE UI E AUTENTICAÇÃO ---
// =================================================================================
function updateUIForAuthState(isLoggedIn) {
    if (isLoggedIn) {
        mainAppContainer.classList.remove('hidden');
        welcomeMessage.classList.add('hidden');
    } else {
        mainAppContainer.classList.add('hidden');
        welcomeMessage.classList.remove('hidden');
    }
    updateHeaderAuthButton();
}

async function checkAuthState() {
    const token = localStorage.getItem('jwtToken');
    if (token) {
        try {
            const response = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('usuarioLogado', 'true');
                localStorage.setItem('userEmail', data.user.email);
                updateUIForAuthState(true);
                buscarEExibirVeiculos();
            } else {
                logout(true);
            }
        } catch (error) {
            console.error('Erro de rede ao verificar token:', error);
            updateUIForAuthState(false);
        }
    } else {
        updateUIForAuthState(false);
    }
}

function logout(forced = false) {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userEmail');
    localStorage.setItem('usuarioLogado', 'false');
    if (!forced) {
        mostrarAlerta('Logout realizado com sucesso!', 'info');
    } else {
        mostrarAlerta('Sua sessão expirou ou é inválida.', 'erro');
    }
    updateUIForAuthState(false);
    desselecionarVeiculo();
    document.getElementById('botoes-veiculo').innerHTML = '';
    if (forced) {
        abrirModalAuth('login');
    }
}

function updateHeaderAuthButton() {
    const btnLoginTopo = document.getElementById('btn-abrir-login-topo');
    const userEmail = localStorage.getItem('userEmail');
    if (localStorage.getItem('jwtToken')) {
        btnLoginTopo.textContent = `Olá, ${userEmail || 'Usuário'} (Sair)`;
        btnLoginTopo.classList.add('btn-logout');
        btnLoginTopo.onclick = () => logout(false);
    } else {
        btnLoginTopo.textContent = 'Login';
        btnLoginTopo.classList.remove('btn-logout');
        btnLoginTopo.onclick = () => abrirModalAuth('login');
    }
}

// =================================================================================
// --- FUNÇÕES DE API E MANIPULAÇÃO DE DADOS ---
// =================================================================================
async function buscarApi(endpoint, options = {}) {
    const token = localStorage.getItem('jwtToken');
    const headers = { ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const finalOptions = { ...options, headers };

    const response = await fetch(endpoint, finalOptions);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Erro ${response.status}` }));
        if (response.status === 401 || response.status === 403) {
            logout(true);
            throw new Error('Sua sessão expirou. Por favor, faça login novamente.');
        }
        throw new Error(errorData.message);
    }
    return response.json();
}

async function buscarEExibirVeiculos() {
    const container = document.getElementById('botoes-veiculo');
    if (localStorage.getItem('usuarioLogado') !== 'true') {
        container.innerHTML = '<p>Faça login para ver e gerenciar seus veículos.</p>';
        return;
    }
    try {
        garagemDB = await buscarApi('/api/veiculos');
        container.innerHTML = '';
        if (garagemDB.length === 0) {
            container.innerHTML = '<p>Nenhum veículo na sua garagem.</p>';
            desselecionarVeiculo();
            return;
        }
        const lista = document.createElement('ul');
        lista.className = 'lista-veiculos-db';
        const loggedInUserEmail = localStorage.getItem('userEmail');

        garagemDB.forEach(veiculoData => {
            const item = document.createElement('li');
            item.id = `veiculo-${veiculoData._id}`;
            
            const isOwner = veiculoData.owner && veiculoData.owner.email === loggedInUserEmail;
            let sharedIndicatorHtml = '';

            if (!isOwner && veiculoData.owner) {
                sharedIndicatorHtml = `<span class="shared-indicator">(Compartilhado por ${veiculoData.owner.email})</span>`;
            }

            const actionsHtml = isOwner ? `
                <div class="veiculo-actions">
                    <button class="btn-edit" data-id="${veiculoData._id}">Editar</button>
                    <button class="btn-delete" data-id="${veiculoData._id}">Excluir</button>
                </div>
            ` : '';

            item.innerHTML = `
                <span class="veiculo-info" data-id="${veiculoData._id}">
                    <strong>${veiculoData.placa}</strong> - ${veiculoData.marca} ${veiculoData.modelo} ${sharedIndicatorHtml}
                </span>
                ${actionsHtml}
            `;
            
            item.addEventListener('click', (event) => {
                if (!event.target.closest('button')) {
                    selecionarVeiculo(veiculoData._id);
                }
            });
            lista.appendChild(item);
        });
        container.appendChild(lista);
    } catch (error) {
        if (!error.message.includes('Sua sessão expirou')) {
            mostrarAlerta(error.message, 'erro');
        }
    }
}

async function selecionarVeiculo(veiculoId) {
    const veiculoData = garagemDB.find(v => v._id === veiculoId);
    if (!veiculoData) return;

    switch (veiculoData.tipo) {
        case 'Carro': veiculoAtual = new Carro(veiculoData.modelo, veiculoData.cor); break;
        case 'CarroEsportivo': veiculoAtual = new CarroEsportivo(veiculoData.modelo, veiculoData.cor); break;
        case 'Caminhao': veiculoAtual = new Caminhao(veiculoData.modelo, veiculoData.cor); break;
        default: return;
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
    const nomeEl = document.getElementById('nome-veiculo-selecionado');
    const infoEl = document.getElementById('informacoes-veiculo');
    const velocimetro = document.getElementById('velocimetro');
    const velocidadeTexto = document.getElementById('velocidade-texto');
    const controlesEl = document.getElementById('controles-veiculo');
    const dicasContainer = document.getElementById('dicas-manutencao-container');
    const formManutencao = document.getElementById('form-manutencao-container');
    const historicoEl = document.getElementById('historico-manutencao');
    const shareFormContainer = document.getElementById('form-share-container');

    const oldSharedList = document.getElementById('shared-list-container');
    if (oldSharedList) {
        oldSharedList.remove();
    }

    document.querySelectorAll('.lista-veiculos-db li').forEach(li => li.classList.remove('selecionado'));

    if (!veiculoAtual) {
        nomeEl.textContent = 'Nenhum';
        infoEl.innerHTML = '<p>Selecione um veículo na garagem.</p>';
        controlesEl.style.display = 'none';
        dicasContainer.style.display = 'none';
        formManutencao.style.display = 'none';
        shareFormContainer.style.display = 'none';
        historicoEl.innerHTML = '<p>Selecione um veículo para ver o histórico.</p>';
        return;
    }

    const loggedInUserEmail = localStorage.getItem('userEmail');
    const isOwner = veiculoAtual.owner && veiculoAtual.owner.email === loggedInUserEmail;
    
    shareFormContainer.style.display = isOwner ? 'block' : 'none';

    document.getElementById(`veiculo-${veiculoAtual._id}`)?.classList.add('selecionado');
    nomeEl.textContent = `${veiculoAtual.marca} ${veiculoAtual.modelo}`;
    infoEl.innerHTML = `
        <p><strong>Placa:</strong> ${veiculoAtual.placa}</p>
        <p><strong>Marca:</strong> ${veiculoAtual.marca}</p>
        <p><strong>Tipo:</strong> ${veiculoAtual.tipo}</p>
        <p><strong>Status:</strong> <span class="status-${veiculoAtual.ligado ? 'ligado' : 'desligado'}">${veiculoAtual.ligado ? 'Ligado ✅' : 'Desligado ❌'}</span></p>
        ${veiculoAtual instanceof CarroEsportivo ? `<p><strong>Turbo:</strong> <span class="status-${veiculoAtual.turboAtivado ? 'ligado' : 'desligado'}">${veiculoAtual.turboAtivado ? 'Ativado 🔥' : 'Desativado'}</span></p>` : ''}
    `;
    
    if (isOwner && veiculoAtual.sharedWith && veiculoAtual.sharedWith.length > 0) {
        const sharedContainer = document.createElement('div');
        sharedContainer.id = 'shared-list-container';
        sharedContainer.className = 'shared-section';

        let listHTML = '<h4>Compartilhado Com:</h4><ul class="lista-shared">';
        veiculoAtual.sharedWith.forEach(user => {
            listHTML += `
                <li>
                    <span>${user.email}</span>
                    <button class="btn-unshare" data-email="${user.email}" title="Remover acesso de ${user.email}">
                        &times;
                    </button>
                </li>
            `;
        });
        listHTML += '</ul>';
        sharedContainer.innerHTML = listHTML;
        shareFormContainer.insertAdjacentElement('afterend', sharedContainer);
    }
    
    velocimetro.value = veiculoAtual.velocidade;
    velocimetro.max = veiculoAtual.velocidadeMaxima;
    velocidadeTexto.textContent = `${veiculoAtual.velocidade} km/h`;
    controlesEl.style.display = 'block';
    dicasContainer.style.display = 'block';
    formManutencao.style.display = 'block';
    document.querySelectorAll('.acao-esportivo').forEach(el => el.style.display = (veiculoAtual instanceof CarroEsportivo) ? 'inline-block' : 'none');
}

async function carregarManutencoes(veiculoId) {
    const historicoEl = document.getElementById('historico-manutencao');
    historicoEl.innerHTML = '<h4>Histórico de Manutenção</h4><p><em>Carregando...</em></p>';
    try {
        const manutenções = await buscarApi(`/api/veiculos/${veiculoId}/manutencoes`);
        if (manutenções && manutenções.length > 0) {
            const listaHtml = manutenções.map(m => {
                const custo = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.custo);
                const data = new Date(m.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                const km = m.quilometragem ? ` - ${m.quilometragem.toLocaleString('pt-BR')} km` : '';
                return `<li><strong>${m.descricaoServico}</strong><br><small>Data: ${data} | Custo: ${custo}${km}</small></li>`;
            }).join('');
            historicoEl.innerHTML = `<h4>Histórico de Manutenção</h4><ul class="lista-manutencao">${listaHtml}</ul>`;
        } else {
            historicoEl.innerHTML = '<h4>Histórico de Manutenção</h4><p>Nenhum registro de manutenção.</p>';
        }
    } catch (error) {
        historicoEl.innerHTML = `<p class="api-erro">Erro ao carregar histórico: ${error.message}</p>`;
    }
}

async function handleUnshare(veiculoId, emailToRemove) {
    if (!confirm(`Tem certeza que deseja remover o acesso de ${emailToRemove} a este veículo?`)) {
        return;
    }
    try {
        const response = await buscarApi(`/api/veiculos/${veiculoId}/unshare`, {
            method: 'POST',
            body: JSON.stringify({ emailToRemove })
        });

        mostrarAlerta(response.message, 'sucesso');
        
        if (veiculoAtual && veiculoAtual._id === veiculoId) {
            veiculoAtual.sharedWith = veiculoAtual.sharedWith.filter(user => user.email !== emailToRemove);
            atualizarDisplayVeiculo(); 
        }

    } catch (error) {
        mostrarAlerta(`Erro ao remover acesso: ${error.message}`, 'erro');
    }
}


// =================================================================================
// --- FUNÇÕES DE INTERAÇÃO E UTILITÁRIAS ---
// =================================================================================
function interagir(acao) {
    if (!veiculoAtual) return mostrarAlerta('Selecione um veículo!', 'erro');
    if (typeof veiculoAtual[acao] === 'function') veiculoAtual[acao]();
}

function mostrarAlerta(mensagem, tipo = 'info') {
    const alertaContainer = document.getElementById('alerta-container');
    clearTimeout(alertaTimeout);
    alertaContainer.textContent = mensagem;
    alertaContainer.className = `alerta-${tipo}`;
    alertaContainer.classList.add('visivel');
    alertaTimeout = setTimeout(() => alertaContainer.classList.remove('visivel'), 4000);
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
    const lista = document.createElement('ul');
    lista.className = 'lista-previsao-dias';
    dados.previsoes.slice(0, 5).forEach(p => {
        lista.innerHTML += `<li><img src="${p.icone}" alt="${p.descricao}"><div class="dia-info"><strong>${p.dia}</strong><span>${p.descricao}</span></div><div class="dia-temp"><strong>${p.temp_max}°</strong><span>${p.temp_min}°</span></div></li>`;
    });
    resultadoEl.appendChild(lista);
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

function abrirModalAuth(mode = 'login') {
    authMode = mode;
    const modal = document.getElementById('modal-login');
    const title = document.getElementById('auth-form-title');
    const submitBtn = document.getElementById('btn-submit-auth');
    const toggleLink = document.getElementById('link-toggle-auth');
    if (authMode === 'login') {
        title.textContent = 'Acesse sua Garagem';
        submitBtn.textContent = 'Entrar';
        toggleLink.textContent = 'Não tem uma conta? Registre-se';
    } else {
        title.textContent = 'Crie sua Conta';
        submitBtn.textContent = 'Registrar';
        toggleLink.textContent = 'Já tem uma conta? Faça login';
    }
    modal.classList.add('visivel');
}

function fecharModalAuth() {
    document.getElementById('modal-login').classList.remove('visivel');
    document.getElementById('form-auth').reset();
}

// =================================================================================
// --- PONTO DE ENTRADA E EVENT LISTENERS ---
// =================================================================================
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();

    document.getElementById('btn-login-welcome').addEventListener('click', () => abrirModalAuth('login'));
    document.getElementById('form-buscar-previsao').addEventListener('submit', async (e) => {
        e.preventDefault();
        const cidade = document.getElementById('cidade-input').value.trim();
        const resultadoEl = document.getElementById('previsao-resultado');
        if (!cidade) return;
        resultadoEl.innerHTML = `<p><em>Buscando...</em></p>`;
        try {
            const dados = await buscarApi(`/api/previsao?cidade=${encodeURIComponent(cidade)}`);
            exibirPrevisaoEstendida(dados);
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
            await buscarApi('/api/veiculos', { method: 'POST', body: JSON.stringify(novoVeiculo) });
            mostrarAlerta('Veículo adicionado!', 'sucesso');
            e.target.reset();
            await buscarEExibirVeiculos();
        } catch (error) {
            mostrarAlerta(error.message, 'erro');
        }
    });

    document.getElementById('botoes-veiculo').addEventListener('click', async (event) => {
        const target = event.target.closest('button');
        if (!target) return;
        const veiculoId = target.dataset.id;
        if (target.classList.contains('btn-delete')) {
            if (confirm('Tem certeza que deseja excluir este veículo?')) {
                try {
                    await buscarApi(`/api/veiculos/${veiculoId}`, { method: 'DELETE' });
                    mostrarAlerta('Veículo excluído.', 'info');
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
        const dados = {
            tipo: document.getElementById('edit-tipo-veiculo').value,
            placa: document.getElementById('edit-placa-veiculo').value,
            marca: document.getElementById('edit-marca-veiculo').value,
            modelo: document.getElementById('edit-modelo-veiculo').value,
            ano: document.getElementById('edit-ano-veiculo').value,
            cor: document.getElementById('edit-cor-veiculo').value
        };
        try {
            await buscarApi(`/api/veiculos/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
            fecharModalEdicao();
            mostrarAlerta('Veículo atualizado!', 'sucesso');
            await buscarEExibirVeiculos();
            if (veiculoAtual && veiculoAtual._id === id) await selecionarVeiculo(id);
        } catch (error) {
            mostrarAlerta(`Erro ao atualizar: ${error.message}`, 'erro');
        }
    });

    document.getElementById('form-share-veiculo').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!veiculoAtual) return mostrarAlerta('Selecione um veículo para compartilhar.', 'erro');
        const emailInput = document.getElementById('share-email-input');
        const emailToShare = emailInput.value.trim();
        if (!emailToShare) return mostrarAlerta('Por favor, insira um e-mail.', 'erro');
        try {
            const response = await buscarApi(`/api/veiculos/${veiculoAtual._id}/share`, {
                method: 'POST',
                body: JSON.stringify({ email: emailToShare })
            });
            mostrarAlerta(response.message, 'sucesso');
            e.target.reset();
            // Para atualizar a lista, podemos rebuscar os dados ou adicionar localmente.
            // Rebuscar é mais simples e garante consistência.
            const veiculoId = veiculoAtual._id;
            await buscarEExibirVeiculos();
            await selecionarVeiculo(veiculoId);
            
        } catch (error) {
            mostrarAlerta(`Erro ao compartilhar: ${error.message}`, 'erro');
        }
    });

    document.getElementById('controles-veiculo').addEventListener('click', (e) => {
        if (e.target.dataset.acao) interagir(e.target.dataset.acao);
    });

    document.getElementById('btn-buscar-dicas').addEventListener('click', async () => {
        if (!veiculoAtual) return;
        const resultadoEl = document.getElementById('dicas-resultado');
        resultadoEl.innerHTML = '<em>Buscando...</em>';
        try {
            const tipo = veiculoAtual.tipo.toLowerCase();
            const dicas = await buscarApi(`/api/dicas-manutencao/${tipo}`);
            resultadoEl.innerHTML = `<ul>${dicas.map(d => `<li>${d.dica}</li>`).join('')}</ul>`;
        } catch (error) {
            resultadoEl.innerHTML = `<p class="api-erro">${error.message}</p>`;
        }
    });
    
    document.getElementById('form-add-manutencao').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!veiculoAtual) return;
        const dados = {
            data: document.getElementById('data-manutencao').value,
            descricaoServico: document.getElementById('descricao-servico-input').value,
            custo: parseFloat(document.getElementById('custo-manutencao').value),
            quilometragem: parseInt(document.getElementById('quilometragem-manutencao').value, 10) || null
        };
        try {
            await buscarApi(`/api/veiculos/${veiculoAtual._id}/manutencoes`, { method: 'POST', body: JSON.stringify(dados) });
            mostrarAlerta('Manutenção registrada!', 'sucesso');
            e.target.reset();
            await carregarManutencoes(veiculoAtual._id);
        } catch (error) {
            mostrarAlerta(error.message, 'erro');
        }
    });

    document.getElementById('volume-control').addEventListener('input', e => {
        volumeAtual = parseFloat(e.target.value);
    });

    document.getElementById('form-auth').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        try {
            const response = await fetch(`/api/auth/${authMode}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Erro desconhecido.');
            localStorage.setItem('jwtToken', data.token);
            localStorage.setItem('userEmail', data.email);
            localStorage.setItem('usuarioLogado', 'true');
            mostrarAlerta(data.message, 'sucesso');
            fecharModalAuth();
            updateUIForAuthState(true);
            buscarEExibirVeiculos();
        } catch (error) {
            mostrarAlerta(`Erro: ${error.message}`, 'erro');
        }
    });

    document.getElementById('link-toggle-auth').addEventListener('click', (e) => {
        e.preventDefault();
        abrirModalAuth(authMode === 'login' ? 'register' : 'login');
    });

    document.getElementById('btn-continuar-sem-login').addEventListener('click', () => {
        fecharModalAuth();
    });

    // EVENT LISTENER DELEGADO CORRIGIDO
    document.getElementById('main-app-container').addEventListener('click', (event) => {
        if (event.target.classList.contains('btn-unshare')) {
            const emailToRemove = event.target.dataset.email;
            if (veiculoAtual && emailToRemove) {
                handleUnshare(veiculoAtual._id, emailToRemove);
            }
        }
    });
});