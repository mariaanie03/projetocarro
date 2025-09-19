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

    // REMOVIDO: O método exibirInformacoes não é mais usado diretamente, a lógica foi movida para atualizarDisplayVeiculo.
    // exibirInformacoes() {
    //     return `<p><strong>Placa:</strong> ${this.placa}</p><p><strong>Marca:</strong> ${this.marca}</p><p><strong>Tipo:</strong> ${this.tipo}</p><p><strong>Status:</strong> <span class="status-${this.ligado ? 'ligado' : 'desligado'}">${this.ligado ? 'Ligado ✅' : 'Desligado ❌'}</span></p>`;
    // }
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
    // REMOVIDO: O método exibirInformacoes não é mais usado diretamente, a lógica foi movida para atualizarDisplayVeiculo.
    // exibirInformacoes() {
    //     return `${super.exibirInformacoes()}<p><strong>Turbo:</strong> <span class="status-${this.turboAtivado ? 'ligado' : 'desligado'}">${this.turboAtivado ? 'Ativado 🔥' : 'Desativado'}</span></p>`;
    // }
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

            // Adiciona o listener de clique no item inteiro (para selecionar)
            item.addEventListener('click', (event) => {
                // Impede que o clique nos botões de ação selecione o veículo
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
    // Copia as propriedades do objeto do banco de dados para a instância
    // Incluindo o historicoManutencao que já vem populado do backend
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
    
    // --- INÍCIO DA VERSÃO SEGURA PARA EXIBIR INFORMAÇÕES (MANTIDA) ---
    infoVeiculoEl.innerHTML = ''; // Limpa o conteúdo anterior

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
    // --- FIM DA VERSÃO SEGURA ---

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
    alertaContainer.className = `alerta-${tipo}`; // Define o tipo de estilo (info, erro)

    // Adiciona a classe 'visivel' para iniciar a transição de entrada
    alertaContainer.classList.add('visivel');

    alertaTimeout = setTimeout(() => {
        // Remove a classe 'visivel' para iniciar a transição de saída
        alertaContainer.classList.remove('visivel');
        // Após a transição de saída, limpa o texto
        setTimeout(() => {
            alertaContainer.textContent = '';
        }, 400); // Deve ser o mesmo tempo da transição CSS
    }, 4000); // Tempo que o alerta fica visível antes de começar a desaparecer
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
// --- FUNÇÕES DE LOGIN E CONTROLE DE USO (NOVAS) ---
// =================================================================================
function abrirModalLogin() {
    document.getElementById('modal-login').classList.add('visivel');
}

function fecharModalLogin() {
    document.getElementById('modal-login').classList.remove('visivel');
}

function verificarLoginEContagemDeUso() {
    const usuarioLogado = localStorage.getItem('usuarioLogado') === 'true';

    if (usuarioLogado) return;

    let contagemDeUso = parseInt(localStorage.getItem('contagemDeUso'), 10) || 0;

    if (contagemDeUso >= 5) {
        abrirModalLogin();
    } else {
        contagemDeUso++;
        localStorage.setItem('contagemDeUso', contagemDeUso);
        
        const usosRestantes = 5 - contagemDeUso + 1; // +1 porque a contagem já foi incrementada
        if (usosRestantes > 0 && usosRestantes <= 5) { // Só mostra o alerta se ainda houver usos "restantes" antes de 5
            mostrarAlerta(`Você pode usar o app mais ${usosRestantes} vez(es) antes de pedirmos para você fazer login.`, 'info');
        }
    }
}


// =================================================================================
// --- PONTO DE ENTRADA E EVENT LISTENERS ---
// =================================================================================
document.addEventListener('DOMContentLoaded', () => {
    buscarEExibirVeiculos();
    
    // --- PONTO DE ENTRADA DO CONTROLE DE LOGIN ---
    verificarLoginEContagemDeUso();

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
            await buscarApi('/api/veiculos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novoVeiculo)
            });
            mostrarAlerta('Veículo adicionado com sucesso!', 'info');
            await buscarEExibirVeiculos();
            e.target.reset();
        } catch (error) {
            mostrarAlerta(error.message, 'erro');
        }
    });

    document.getElementById('botoes-veiculo').addEventListener('click', async (event) => {
        const target = event.target.closest('button');
        if (!target) return; // Se clicou na LI mas não no botão, sai. A seleção é feita no item.addEventListener.
        
        const veiculoId = target.dataset.id;
        if (target.classList.contains('btn-delete')) {
            if (confirm('Tem certeza que deseja excluir este veículo e todo o seu histórico?')) {
                try {
                    await buscarApi(`/api/veiculos/${veiculoId}`, { method: 'DELETE' });
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
        // A lógica de selecionar veículo ao clicar no veiculo-info agora está no item.addEventListener em buscarEExibirVeiculos
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
            await buscarApi(`/api/veiculos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosAtualizados)
            });
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
            await buscarApi(`/api/veiculos/${veiculoId}/manutencoes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosFormulario)
            });
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

    // --- EVENT LISTENERS PARA O MODAL DE LOGIN ---
    document.getElementById('form-login').addEventListener('submit', (e) => {
        e.preventDefault();
        // SIMULAÇÃO DE LOGIN BEM-SUCEDIDO
        // Aqui você integraria com um backend de autenticação real
        mostrarAlerta('Login realizado com sucesso! Bem-vindo(a) de volta!', 'info');
        localStorage.setItem('usuarioLogado', 'true');
        localStorage.removeItem('contagemDeUso'); // Reseta a contagem de uso após o login
        fecharModalLogin();
    });

    document.getElementById('btn-continuar-sem-login').addEventListener('click', () => {
        fecharModalLogin();
    });
});