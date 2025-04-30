/**
 * Garagem Inteligente v4.0
 * Script com Feedback Visual e Sonoro.
 * @version 4.0
 * @date   2024-07-27
 */

// Inicia uma IIFE (Immediately Invoked Function Expression).
// Isso cria um escopo isolado para o código, evitando conflitos com outras
// variáveis ou bibliotecas no escopo global e mantendo o código organizado.
(function() {
    'use strict'; // Ativa o "modo estrito" do JavaScript. Isso ajuda a pegar erros comuns
                  // e a escrever um código mais seguro, proibindo certas sintaxes "ruins".


                  // --- Referências a Elementos do DOM (Cache de Seletores) ---
// ... (outras referências existentes) ...

// Elementos da API Simulada (Parte 1)
const btnVerDetalhesExtras = document.getElementById('btnVerDetalhesExtras');
const detalhesExtrasApiDiv = document.getElementById('detalhesExtrasApi');

// ... (resto das referências existentes) ...



// --- Funções da API Simulada (Parte 1) ---

/**
 * Busca detalhes extras de um veículo na API simulada (arquivo JSON local).
 * @param {string} identificadorVeiculo O ID do veículo a ser buscado.
 * @returns {Promise<object|null>} Uma Promise que resolve com o objeto de detalhes do veículo ou null se não encontrado/erro.
 */
async function buscarDetalhesVeiculoAPI(identificadorVeiculo) {
    const url = './dados_veiculos_api.json'; // Caminho para o arquivo JSON
    console.log(`LOG API: Buscando detalhes para ID: ${identificadorVeiculo} em ${url}`);

    try {
        const response = await fetch(url);

        // Verifica se a requisição foi bem-sucedida (status 2xx)
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} ${response.statusText}`);
        }

        // Tenta parsear a resposta como JSON
        const data = await response.json();

        // Verifica se o JSON é um array
        if (!Array.isArray(data)) {
            throw new Error("Formato de dados da API inválido (esperado um array).");
        }

        // Encontra o veículo pelo identificador
        const detalhes = data.find(item => item.identificadorVeiculo === identificadorVeiculo);

        if (detalhes) {
            console.log(`LOG API: Detalhes encontrados para ${identificadorVeiculo}:`, detalhes);
            return detalhes; // Retorna o objeto encontrado
        } else {
            console.log(`LOG API: Detalhes não encontrados para ${identificadorVeiculo}.`);
            return null; // Retorna null se não encontrou
        }

    } catch (error) {
        console.error(`ERRO FATAL ao buscar/processar detalhes da API (${url}):`, error);
        adicionarNotificacao(`Falha ao carregar dados extras: ${error.message}`, 'erro');
        // Retorna null em caso de qualquer erro (fetch, parse, etc.)
        return null;
    }
}

/**
 * Habilita ou desabilita o estado visual de carregamento da API.
 * Adiciona/remove classe no body e desabilita/habilita botões principais.
 * @param {boolean} isLoading True para ativar o estado de loading, false para desativar.
 */
function setApiLoadingState(isLoading) {
    document.body.classList.toggle('api-loading', isLoading);

    // Lista de botões a serem desabilitados durante o carregamento
    const buttonsToDisable = [
        btnVerDetalhesExtras, btnLigar, btnDesligar, btnAcelerar, btnFrear, btnBuzinar,
        btnAtivarTurbo, btnDesativarTurbo, btnCarregar, btnDescarregar, btnRemoverVeiculo
        // Adicione outros botões/inputs relevantes se necessário
    ];
    const formManutBotao = formManutencao ? formManutencao.querySelector('button') : null;
    if(formManutBotao) buttonsToDisable.push(formManutBotao);

    buttonsToDisable.forEach(btn => {
        if (btn) {
            btn.disabled = isLoading;
        }
    });

    // Reabilitar botões na aba de detalhes *APENAS SE* um veículo estiver selecionado
    // (Evita habilitar botões indevidamente se o usuário deselecionar enquanto carrega)
    if (!isLoading && veiculoSelecionadoId) {
         // A função atualizarDisplay() já lida com a habilitação correta dos botões
         // com base no estado atual do veículo, então chamá-la é mais seguro.
         atualizarDisplay();
         // No entanto, o botão de API precisa ser habilitado manualmente aqui,
         // pois atualizarDisplay() pode não o fazer se a lógica for complexa.
         if(btnVerDetalhesExtras) btnVerDetalhesExtras.disabled = false;
    } else if (!isLoading && !veiculoSelecionadoId) {
        // Garante que se nenhum veículo for selecionado ao final do loading,
        // o botão de detalhes extras permaneça desabilitado.
         if(btnVerDetalhesExtras) btnVerDetalhesExtras.disabled = true;
    }
}



/**
 * Função assíncrona chamada ao clicar no botão "Ver Detalhes Extras".
 * Gerencia o estado de carregamento, busca os dados e atualiza a UI.
 */
async function mostrarDetalhesExtrasAPI() {
    if (!veiculoSelecionadoId) {
        adicionarNotificacao("Nenhum veículo selecionado para buscar detalhes.", "aviso");
        return;
    }
    if (!detalhesExtrasApiDiv) {
         console.error("ERRO UI: Div #detalhesExtrasApi não encontrada!");
         return;
    }

    // 1. Iniciar Estado de Carregamento
    setApiLoadingState(true);
    detalhesExtrasApiDiv.innerHTML = '<p class="placeholder-text">Carregando detalhes da API...</p>';

    try {
        // 2. Buscar os Dados
        const detalhes = await buscarDetalhesVeiculoAPI(veiculoSelecionadoId);

        // 3. Exibir Resultados ou Mensagem Adequada
        if (detalhes) {
            // Formatar e exibir os dados encontrados
            let html = '';
            // Usando Object.entries para iterar sobre as chaves e valores
            Object.entries(detalhes).forEach(([chave, valor]) => {
                // Não exibir o identificador novamente
                if (chave === 'identificadorVeiculo') return;

                // Formatar chave para exibição (ex: valorFIPE -> Valor FIPE)
                const chaveFormatada = chave
                    .replace(/([A-Z])/g, ' $1') // Adiciona espaço antes de letra maiúscula
                    .replace(/^./, str => str.toUpperCase()); // Capitaliza a primeira letra

                // Formatar valor (ex: boolean, moeda)
                let valorFormatado = valor;
                if (typeof valor === 'boolean') {
                    valorFormatado = valor ? '<span style="color: green; font-weight: bold;">Sim</span>' : '<span style="color: red;">Não</span>';
                    if (chave === 'recallPendente' && valor === true && detalhes.motivoRecall) {
                        valorFormatado += ` <strong style="color: red;">(${detalhes.motivoRecall})</strong>`;
                    }
                } else if (chave === 'valorFIPE' && typeof valor === 'number') {
                    valorFormatado = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                } else if (chave === 'consumoMedio' && typeof valor === 'number') {
                    valorFormatado = `${valor.toFixed(1)} km/l`;
                } else if (chave === 'motivoRecall') {
                    // Já tratado junto com recallPendente
                    return;
                }

                html += `<p><strong>${chaveFormatada}:</strong> ${valorFormatado}</p>`;
            });
            detalhesExtrasApiDiv.innerHTML = html;
        } else {
            // Exibir mensagem de não encontrado
            detalhesExtrasApiDiv.innerHTML = '<p class="placeholder-text">Detalhes extras não encontrados para este veículo.</p>';
        }
    } catch (error) {
        // Erro já logado e notificado por buscarDetalhesVeiculoAPI
        // Apenas exibe mensagem genérica na área de detalhes
        console.error("ERRO no fluxo mostrarDetalhesExtrasAPI:", error); // Log adicional
        detalhesExtrasApiDiv.innerHTML = '<p class="error-text">Ocorreu um erro ao buscar os detalhes extras. Tente novamente.</p>';
    } finally {
        // 4. Finalizar Estado de Carregamento (SEMPRE executar)
        setApiLoadingState(false);
    }
}


function atualizarDisplay() {
    // ... (código existente no início da função) ...
    const veiculo = garagem.find(v => v.id === veiculoSelecionadoId);
    const formManutCampos = formManutencao ? [/* ... */].filter(Boolean) : [];

    // Limpa a área de detalhes da API ao mudar de veículo ou deselecionar
    if (detalhesExtrasApiDiv) {
         detalhesExtrasApiDiv.innerHTML = '<p class="placeholder-text">Clique em "Ver Detalhes Extras (API)" para carregar.</p>';
    }

    if (veiculo) {
        // ... (código existente para atualizar título, infos, velocímetro, controles específicos) ...

        // Habilita/desabilita botões de ação comuns baseado no estado.
        // ... (linhas existentes para btnLigar, btnDesligar, etc.) ...
        if(btnBuzinar) btnBuzinar.disabled = false;
        if(btnVerDetalhesExtras) btnVerDetalhesExtras.disabled = false; // HABILITA o botão da API

        // ... (código existente para manutenção, etc.) ...

    } else { // Se nenhum veículo está selecionado...
        // ... (código existente para resetar título, infos, placeholder) ...

        [btnLigar, btnDesligar, btnAcelerar, btnFrear, btnBuzinar, btnRemoverVeiculo, btnAtivarTurbo, btnDesativarTurbo, cargaInput, btnCarregar, btnDescarregar, btnVerDetalhesExtras] // ADICIONADO btnVerDetalhesExtras aqui
            .forEach(el => { if(el) el.disabled = true; });
        formManutCampos.forEach(campo => { if(campo) campo.disabled = true; });
        if(tabButtonDetails) tabButtonDetails.disabled = true;
        if (painelDetalhes && painelDetalhes.classList.contains('active')) { switchTab('tab-garage'); }
    }
}




    /* ==========================================================================
       CLASSE DE MANUTENÇÃO (Sem alterações nesta versão)
       Define a estrutura e o comportamento para representar um registro de manutenção.
       O comentário indica que esta classe não teve mudanças funcionais significativas
       nesta versão específica do código (v4.0).
       ========================================================================== */
    class Manutencao {
        // Declaração das propriedades da classe (boa prática em JS moderno, embora opcional)
        data;       // Armazenará a data da manutenção (string no formato YYYY-MM-DD)
        tipo;       // Armazenará o tipo de serviço realizado (string)
        custo;      // Armazenará o custo do serviço (número)
        descricao;  // Armazenará uma descrição opcional (string)
        _tipoClasse = 'Manutencao'; // Propriedade especial usada para identificar o tipo de objeto
                                   // ao carregar dados do localStorage (reidratação).

        /**
         * Construtor da classe Manutencao.
         * Chamado quando um novo objeto Manutencao é criado (ex: new Manutencao(...)).
         * Responsável por inicializar as propriedades do objeto.
         * @param {string} dataInput - A data da manutenção fornecida (ex: "2024-12-31").
         * @param {string} tipoInput - O tipo de serviço fornecido (ex: "Troca de Pneus").
         * @param {number|string} custoInput - O custo do serviço (pode ser número ou string que será convertida).
         * @param {string} [descricaoInput=''] - Uma descrição opcional (string vazia por padrão).
         * @throws {Error} Lança um erro se os dados de entrada falharem na validação.
         */
        constructor(dataInput, tipoInput, custoInput, descricaoInput = '') {
            // 1. Validação: Verifica se os dados obrigatórios são válidos antes de prosseguir.
            // Chama o método 'validar' da própria classe.
            if (!this.validar(dataInput, tipoInput, custoInput)) {
                // Se a validação falhar, lança um erro, interrompendo a criação do objeto.
                throw new Error("Dados inválidos: Verifique data, tipo e custo (>=0).");
            }

            // 2. Processamento da Data:
            // Converte a string de data de entrada em um objeto Date do JavaScript.
            const dataObj = new Date(dataInput);
            // Verifica se a conversão da data foi bem-sucedida.
            if (!isNaN(dataObj.getTime())) {
                // Se a data é válida, converte-a para o formato UTC (Tempo Universal Coordenado)
                // para evitar problemas com fusos horários e armazena apenas a parte da data (YYYY-MM-DD).
                // Date.UTC retorna milissegundos desde a época UTC.
                // new Date(...) cria um objeto Date com esses milissegundos.
                // .toISOString() converte para "YYYY-MM-DDTHH:mm:ss.sssZ".
                // .split('T')[0] pega apenas a parte antes do 'T' (a data).
                this.data = new Date(Date.UTC(dataObj.getUTCFullYear(), dataObj.getUTCMonth(), dataObj.getUTCDate())).toISOString().split('T')[0];
            } else {
                // Se a conversão da data falhar (ex: entrada inválida), lança um erro.
                throw new Error("Falha interna ao processar a data.");
            }

            // 3. Processamento de Outros Campos:
            // Remove espaços em branco extras do início e fim do tipo de serviço.
            this.tipo = tipoInput.trim();
            // Converte o custo (que pode ser string) para um número de ponto flutuante.
            this.custo = parseFloat(custoInput);
            // Remove espaços em branco extras da descrição.
            this.descricao = descricaoInput.trim();
        }

        /**
         * Método auxiliar para validar os dados de entrada antes da criação do objeto.
         * @param {string} data - A data a ser validada.
         * @param {string} tipo - O tipo de serviço a ser validado.
         * @param {number|string} custo - O custo a ser validado.
         * @returns {boolean} Retorna true se todos os dados são válidos, false caso contrário.
         */
        validar(data, tipo, custo) {
            // Valida a data: cria um objeto Date e verifica se é um tempo válido.
            const dataObj = new Date(data);
            if (isNaN(dataObj.getTime())) {
                // Loga um erro no console se a data for inválida.
                console.error("ERRO Validação Manutencao: Data inválida.", data);
                return false; // Retorna false, indicando falha na validação.
            }
            // Valida o tipo: verifica se é uma string não vazia após remover espaços.
            if (!tipo || typeof tipo !== 'string' || tipo.trim().length === 0) {
                console.error("ERRO Validação Manutencao: Tipo obrigatório.", tipo);
                return false;
            }
            // Valida o custo: converte para número e verifica se é um número válido e não negativo.
            const custoNum = parseFloat(custo);
            if (isNaN(custoNum) || custoNum < 0) {
                console.error("ERRO Validação Manutencao: Custo inválido.", custo);
                return false;
            }
            // Se todas as validações passaram, retorna true.
            return true;
        }

        /**
         * Formata os dados da manutenção em uma string legível para exibição na UI.
         * @returns {string} Uma string formatada como "DD/MM/YYYY - Tipo (R$ Custo) - Desc: Descrição".
         */
        formatar() {
            try {
                // Cria um objeto Date a partir da string de data armazenada,
                // tratando-a como UTC para consistência na formatação.
                const dataObj = new Date(this.data + 'T00:00:00Z');
                // Formata a data para o padrão pt-BR (dd/mm/aaaa), especificando o fuso UTC.
                const dataFormatada = dataObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                // Formata o custo como moeda BRL (R$).
                const custoFormatado = this.custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                // Monta a string inicial.
                let retorno = `${dataFormatada} - ${this.tipo} (${custoFormatado})`;
                // Se houver uma descrição, a adiciona à string.
                if (this.descricao) {
                    retorno += ` - Desc: ${this.descricao}`;
                }
                // Retorna a string formatada final.
                return retorno;
            } catch (e) {
                // Captura e loga erros que possam ocorrer durante a formatação.
                console.error("ERRO ao formatar manutenção:", this, e);
                // Retorna uma string de erro genérica para a UI.
                return "Erro ao formatar";
            }
        }

        /**
         * Verifica se a data desta manutenção é no futuro em relação ao dia atual.
         * Usado para distinguir entre histórico (passado/hoje) e agendamentos (futuro).
         * Compara as datas considerando apenas o dia, em UTC.
         * @returns {boolean} Retorna true se a data da manutenção for estritamente maior que a data de hoje, false caso contrário.
         */
        isAgendamentoFuturo() {
            try {
                // Obtém a data/hora atual e cria uma data representando o início do dia de HOJE em UTC.
                const hojeInicioDiaUTC = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
                // Cria uma data representando o início do dia da MANUTENÇÃO em UTC.
                const dataManutencaoUTC = new Date(this.data + 'T00:00:00Z');
                // Compara: a data da manutenção é estritamente posterior ao início do dia de hoje?
                return dataManutencaoUTC > hojeInicioDiaUTC;
            } catch (e) {
                 // Captura e loga erros na comparação de datas.
                console.error("ERRO ao verificar agendamento futuro:", this, e);
                // Retorna false como fallback seguro em caso de erro.
                return false;
            }
        }
    } // Fim da classe Manutencao

        /* ==========================================================================
       CLASSES DE VEÍCULOS (Adicionado método buzinar)
       Define as classes para os diferentes tipos de veículos (Carro, CarroEsportivo, Caminhão).
       O comentário indica que a principal adição nesta versão foi o método 'buzinar'.
       ========================================================================== */

    // Classe base para todos os veículos. Define propriedades e métodos comuns.
    class Carro {
        // Declaração de propriedades da classe (boa prática)
        id;                  // Identificador único (gerado ou carregado)
        modelo;              // Nome/modelo do carro (string)
        cor;                 // Cor do carro (string, ex: #ffffff ou nome)
        ligado;              // Estado do motor (boolean: true/false)
        velocidade;          // Velocidade atual em km/h (number)
        velocidadeMaxima;    // Velocidade máxima permitida (number)
        historicoManutencao; // Array de objetos Manutencao
        imagem;              // Caminho do arquivo de imagem para este carro (string)
        _tipoClasse = 'Carro'; // Identificador para reidratação do localStorage

        /**
         * Construtor da classe Carro.
         * @param {string} modelo - Modelo do carro (obrigatório).
         * @param {string} cor - Cor do carro (obrigatório).
         * @param {number} [velocidadeMaxima=180] - Velocidade máxima (padrão 180).
         * @param {string|null} [id=null] - ID existente (para carregamento) ou null para gerar novo.
         * @param {Array<Manutencao|object>} [historicoManutencao=[]] - Histórico inicial.
         */
        constructor(modelo, cor, velocidadeMaxima = 180, id = null, historicoManutencao = []) {
            // Validação inicial: Modelo e cor são obrigatórios.
            if (!modelo || !cor) throw new Error("Modelo e Cor são obrigatórios.");
            // Define o ID: usa o ID fornecido ou gera um novo ID único.
            this.id = id || `carro_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
            // Define modelo e cor, removendo espaços extras do modelo.
            this.modelo = modelo.trim(); this.cor = cor;
            // Define a velocidade máxima, garantindo que não seja negativa.
            this.velocidadeMaxima = Math.max(0, velocidadeMaxima);
            // Define o estado inicial: desligado e parado.
            this.ligado = false; this.velocidade = 0;
            // Processa o histórico de manutenção inicial, convertendo objetos genéricos se necessário.
            this.historicoManutencao = this.reidratarHistorico(historicoManutencao);
            // Define o caminho da imagem padrão para um carro comum.
            this.imagem = 'images/car.png';
        }

        /**
         * Método auxiliar para converter dados de histórico (do localStorage) em instâncias de Manutencao.
         * @param {Array<Manutencao|object>} historicoArray - O array a ser processado.
         * @returns {Array<Manutencao>} Array filtrado contendo apenas instâncias válidas de Manutencao.
         */
        reidratarHistorico(historicoArray) { /* ... (código omitido para brevidade, mas comentado anteriormente) ... */
             if (!Array.isArray(historicoArray)) return [];
             return historicoArray.map(item => {
                 if (item instanceof Manutencao) return item;
                 if (typeof item === 'object' && item !== null && item._tipoClasse === 'Manutencao') {
                     try { return new Manutencao(item.data, item.tipo, item.custo, item.descricao); }
                     catch (e) { console.error(`ERRO Reidratar Manutencao [Veículo: ${this.modelo}]: ${e.message}`, item); return null; }
                 }
                 if (item !== null) console.warn(`WARN Reidratar Manutencao: Item inesperado descartado [Veículo: ${this.modelo}]`, item);
                 return null;
             }).filter(item => item instanceof Manutencao);
         }

        /**
         * Tenta ligar o motor do veículo.
         * @returns {boolean} True se ligou, false se já estava ligado.
         */
        ligar() {
            // Verifica se já está ligado.
            if (this.ligado) {
                // Se sim, envia alerta e retorna false (sem alteração).
                this.alerta("Veículo já está ligado.", 'aviso'); return false;
            }
            // Se não, muda o estado para ligado.
            this.ligado = true;
            // Loga a ação no console.
            console.log(`LOG: ${this.modelo}: Ligado.`);
            // Toca o som correspondente.
            tocarSom('somLigar');
            // Notifica a aplicação que o estado mudou (para atualizar UI e salvar).
            this.notificarAtualizacao();
            // Retorna true indicando sucesso.
            return true;
        }

        /**
         * Tenta desligar o motor do veículo.
         * @returns {boolean} True se desligou, false se já estava desligado ou se estava em movimento.
         */
        desligar() {
            // Verifica se já está desligado.
            if (!this.ligado) {
                this.alerta("Veículo já está desligado.", 'aviso'); return false;
            }
            // Verifica se o veículo está em movimento.
            if (this.velocidade > 0) {
                // Se sim, impede a ação, alerta e toca som de erro.
                this.alerta("Pare o veículo antes de desligar!", 'erro'); tocarSom('somErro'); return false;
            }
            // Se estiver ligado e parado, desliga.
            this.ligado = false;
            console.log(`LOG: ${this.modelo}: Desligado.`);
            tocarSom('somDesligar');
            this.notificarAtualizacao();
            return true;
        }

        /**
         * Aumenta a velocidade do veículo.
         * @param {number} [incremento=10] - Quantidade a acelerar (padrão 10).
         * @returns {boolean} True se a velocidade aumentou, false caso contrário.
         */
        acelerar(incremento = 10) {
            // Verifica se está ligado.
            if (!this.ligado) {
                this.alerta("Ligue o veículo para acelerar!", 'erro'); tocarSom('somErro'); return false;
            }
            // Garante que o incremento não seja negativo.
            const inc = Math.max(0, incremento);
            // Calcula a nova velocidade, limitada pela velocidade máxima.
            const novaVelocidade = Math.min(this.velocidade + inc, this.velocidadeMaxima);
            // Verifica se a velocidade realmente mudou.
            if (novaVelocidade === this.velocidade) {
                // Se não mudou, verifica se foi por atingir a máxima ou por incremento zero.
                 if(this.velocidade === this.velocidadeMaxima) this.alerta("Velocidade máxima atingida!", 'aviso');
                 else this.alerta("Aceleração sem efeito.", 'info'); // Ex: incremento 0
                 return false; // Retorna false pois não houve alteração.
            }
            // Atualiza a velocidade.
            this.velocidade = novaVelocidade;
            console.log(`LOG: ${this.modelo}: Acelerando para ${this.velocidade.toFixed(0)} km/h.`);
            tocarSom('somAcelerar');
            this.notificarAtualizacao();
            return true;
        }

        /**
         * Diminui a velocidade do veículo.
         * @param {number} [decremento=20] - Quantidade a frear (padrão 20).
         * @returns {boolean} True se a velocidade diminuiu, false se já estava parado.
         */
        frear(decremento = 20) {
            // Verifica se já está parado.
            if (this.velocidade === 0) {
                this.alerta("Veículo já está parado.", 'aviso'); return false;
            }
            // Garante que o decremento não seja negativo.
            const dec = Math.max(0, decremento);
            // Calcula a nova velocidade, limitada em 0 (não pode ser negativa).
            this.velocidade = Math.max(0, this.velocidade - dec);
            console.log(`LOG: ${this.modelo}: Freando para ${this.velocidade.toFixed(0)} km/h.`);
            tocarSom('somFrear');
            this.notificarAtualizacao();
            return true;
        }

        /**
         * Novo método: Buzinar.
         * Simula a ação de buzinar.
         * @returns {boolean} Sempre true, pois buzinar é uma ação sem falha.
         */
        buzinar() {
            // Loga a ação no console.
            console.log(`LOG: ${this.modelo}: BIBI! 🔊`);
            // Toca o som da buzina.
            tocarSom('somBuzina');
            // Mostra uma notificação curta e informativa para o usuário.
            this.alerta("Buzinou!", "info", 2000); // duração de 2 segundos
            // Importante: Buzinar é uma ação que NÃO altera o estado persistente
            // do veículo (ligado, velocidade, etc.). Portanto, NÃO chamamos
            // `notificarAtualizacao()` para evitar salvamentos desnecessários no localStorage.
            return true;
        }

        /**
         * Adiciona um registro de manutenção ao histórico do veículo.
         * @param {Manutencao} manutencaoObj - A instância de Manutencao a ser adicionada.
         * @returns {boolean} True se adicionado com sucesso.
         * @throws {Error} Se o objeto não for uma instância de Manutencao.
         */
        adicionarManutencao(manutencaoObj) { /* ... (código omitido para brevidade, mas comentado anteriormente) ... */
             if (!(manutencaoObj instanceof Manutencao)) throw new Error("Objeto de manutenção inválido.");
             this.historicoManutencao.push(manutencaoObj);
             this.historicoManutencao.sort((a, b) => new Date(b.data) - new Date(a.data)); // Ordena por data desc
             console.log(`LOG: Manutenção (${manutencaoObj.tipo}) adicionada para ${this.modelo}.`);
             this.notificarAtualizacao(); return true; // Notifica para atualizar UI e salvar
        }

        /** Retorna array de manutenções passadas. */
        getHistoricoPassado() { try { return this.historicoManutencao.filter(m => !m.isAgendamentoFuturo()); } catch (e) { console.error(`ERRO histórico passado [${this.modelo}]:`, e); return []; }}
        /** Retorna array de agendamentos futuros. */
        getAgendamentosFuturos() { try { return this.historicoManutencao.filter(m => m.isAgendamentoFuturo()); } catch (e) { console.error(`ERRO agendamentos futuros [${this.modelo}]:`, e); return []; }}

        /**
         * Gera o HTML para exibir as informações detalhadas do veículo na UI.
         * Inclui imagem, ID, modelo, cor, status (com indicador), velocidade e contagem de manutenções.
         * @returns {string} String HTML formatada.
         */
        exibirInformacoes() {
            try {
                // Determina a classe CSS e o texto para o status (ligado/desligado).
                const statusClass = this.ligado ? 'status-ligado' : 'status-desligado';
                const statusTexto = this.ligado ? 'Ligado' : 'Desligado';
                // Conta o número de registros passados e futuros para exibição.
                const historicoCount = this.getHistoricoPassado().length;
                const agendamentosCount = this.getAgendamentosFuturos().length;
                // Monta a string HTML usando template literals.
                // Inclui a tag <img> com o src da propriedade `this.imagem` e tratamento de erro `onerror`.
                // Inclui o `<span>` para o swatch de cor.
                // Inclui o `<span>` para o indicador visual de status.
                return `
                    <img src="${this.imagem}" alt="Imagem de ${this.modelo}" class="veiculo-imagem" onerror="this.style.display='none'; console.warn('Imagem não encontrada: ${this.imagem}')">
                    <p><strong>ID:</strong> <small>${this.id}</small></p>
                    <p><strong>Modelo:</strong> ${this.modelo}</p>
                    <p><strong>Cor:</strong> <span class="color-swatch" style="background-color: ${this.cor};" title="${this.cor}"></span> ${this.cor}</p>
                    <p class="${statusClass}"><span class="status-indicator"></span> <span>${statusTexto}</span></p> {/* Status com indicador visual */}
                    <p><strong>Velocidade:</strong> ${this.velocidade.toFixed(0)} km/h (Máx: ${this.velocidadeMaxima} km/h)</p>
                    <p><em>Manutenções: ${historicoCount} | Agendamentos: ${agendamentosCount}</em></p>
                `;
            } catch (e) {
                // Captura e loga erros na geração do HTML.
                console.error(`ERRO ao exibir infos ${this.modelo}:`, e);
                // Retorna uma mensagem de erro segura para a UI.
                return `<p class="error-text">Erro ao exibir informações.</p>`;
            }
        }

        /**
         * Método auxiliar para exibir notificações flutuantes relacionadas a este veículo.
         * @param {string} mensagem - A mensagem a exibir.
         * @param {'info'|'sucesso'|'aviso'|'erro'} [tipo='info'] - Tipo da notificação.
         * @param {number} [duracao=5000] - Duração em milissegundos.
         */
        alerta(mensagem, tipo = 'info', duracao = 5000) {
            // Chama a função global, prefixando a mensagem com o modelo do veículo.
            adicionarNotificacao(`${this.modelo}: ${mensagem}`, tipo, duracao);
        }

        /**
         * Função chamada internamente para sinalizar que o estado do veículo mudou
         * e precisa ser refletido na UI e salvo no localStorage.
         */
        notificarAtualizacao() {
            // Só atualiza o painel de detalhes se este veículo for o que está selecionado.
            if (veiculoSelecionadoId === this.id) {
                atualizarDisplay();
            }
            // Sempre salva a garagem inteira após qualquer modificação de estado.
            salvarGaragem();
        }
    } // Fim da classe Carro


    // Classe para Carros Esportivos, herda de Carro.
    class CarroEsportivo extends Carro {
        // Propriedades específicas do CarroEsportivo
        turboAtivado;              // Estado do turbo (boolean)
        _tipoClasse = 'CarroEsportivo'; // Identificador para reidratação

        /**
         * Construtor do CarroEsportivo.
         * @param {string} modelo - Modelo.
         * @param {string} cor - Cor.
         * @param {number} [velocidadeMaxima=250] - Velocidade máxima maior (padrão 250).
         * @param {string|null} [id=null] - ID existente ou null.
         * @param {Array<Manutencao|object>} [historicoManutencao=[]] - Histórico.
         * @param {boolean} [turboAtivado=false] - Estado inicial do turbo.
         */
        constructor(modelo, cor, velocidadeMaxima = 250, id = null, historicoManutencao = [], turboAtivado = false) {
            // Chama o construtor da classe pai (Carro) para inicializar propriedades comuns.
            super(modelo, cor, velocidadeMaxima, id, historicoManutencao);
            // Inicializa a propriedade específica do turbo.
            this.turboAtivado = turboAtivado;
            // Define a imagem específica para carros esportivos.
            this.imagem = 'images/sportscar.png';
        }

        /** Ativa o turbo (se possível). */
        ativarTurbo() {
            // Validações: só ativa se ligado e se o turbo não estiver já ativo.
            if (!this.ligado) { this.alerta("Ligue o carro para ativar o turbo!", 'erro'); tocarSom('somErro'); return false; }
            if (this.turboAtivado) { this.alerta("Turbo já está ativo!", 'aviso'); return false; }
            // Ativa o turbo, loga, alerta e notifica atualização.
            this.turboAtivado = true; console.log(`LOG: ${this.modelo}: TURBO ATIVADO! 🚀`); this.alerta("Turbo ativado!", "sucesso", 3000); this.notificarAtualizacao(); return true;
        }

        /** Desativa o turbo. */
        desativarTurbo() {
            // Só desativa se estiver ativo.
            if (!this.turboAtivado) return false;
            // Desativa, loga e notifica.
            this.turboAtivado = false; console.log(`LOG: ${this.modelo}: Turbo desativado.`); this.notificarAtualizacao(); return true;
        }

        /** Sobrescreve acelerar para aplicar boost do turbo. */
        acelerar(incremento = 20) { /* ... (código omitido para brevidade, mas comentado anteriormente) ... */
            // Validação inicial
            if (!this.ligado) { this.alerta("Ligue o carro para acelerar!", 'erro'); tocarSom('somErro'); return false; }
            // Calcula boost e aceleração real
            const boost = this.turboAtivado ? 1.5 : 1.0; const aceleracaoReal = Math.max(0, incremento) * boost;
            // Calcula nova velocidade limitada pela máxima
            const novaVelocidade = Math.min(this.velocidade + aceleracaoReal, this.velocidadeMaxima);
            // Verifica se houve mudança
            if (novaVelocidade === this.velocidade) {
                 if(this.velocidade === this.velocidadeMaxima) this.alerta("Velocidade máxima atingida!", 'aviso');
                 else this.alerta("Aceleração sem efeito.", 'info');
                 return false;
            }
            // Atualiza velocidade, loga (com indicação de turbo), toca som e notifica
            this.velocidade = novaVelocidade;
            const msgTurbo = this.turboAtivado ? ' COM TURBO 🚀' : '';
            console.log(`LOG: ${this.modelo}: Acelerando${msgTurbo} para ${this.velocidade.toFixed(0)} km/h.`);
            tocarSom('somAcelerar'); this.notificarAtualizacao(); return true;
         }

        /** Sobrescreve desligar para desativar o turbo junto. */
        desligar() {
            // Chama o desligar da classe pai.
            const desligou = super.desligar();
            // Se conseguiu desligar e o turbo estava ativo, desativa o turbo.
            if (desligou && this.turboAtivado) {
                this.desativarTurbo(); // desativarTurbo também notifica
            }
            return desligou;
        }

        /** Sobrescreve frear para usar decremento maior e desativar turbo em baixa velocidade. */
        frear(decremento = 25) { /* ... (código omitido para brevidade, mas comentado anteriormente) ... */
            // Chama o frear da classe pai com maior decremento.
            const freou = super.frear(decremento); // super.frear já toca o som e notifica
            // Se freou, turbo estava ativo e velocidade ficou baixa, desativa o turbo.
            if (freou && this.turboAtivado && this.velocidade < 30) {
                console.log(`LOG: ${this.modelo}: Turbo desativado auto (baixa velocidade).`);
                this.desativarTurbo(); // desativarTurbo também notifica
                this.alerta("Turbo desativado (baixa velocidade).", "info");
            }
            return freou;
         }

        /** Sobrescreve exibirInformacoes para adicionar o status do turbo. */
        exibirInformacoes() { /* ... (código omitido para brevidade, mas comentado anteriormente) ... */
             // Pega o HTML base do pai.
             const baseHtml = super.exibirInformacoes();
             // Define o texto do status do turbo.
             const statusTurboTexto = this.turboAtivado ? 'ATIVADO 🚀' : 'Desativado';
             // Cria o HTML do turbo.
             const turboHtml = `<p><strong>Turbo:</strong> ${statusTurboTexto}</p>`;
             // Encontra o ponto de inserção e insere o HTML do turbo.
             const partes = baseHtml.split('<p><em>Manutenções:'); // Divide antes da linha de manutenções
             // Remonta o HTML com a informação do turbo incluída.
             return partes[0] + turboHtml + '<p><em>Manutenções:' + partes[1];
        }
    } // Fim da classe CarroEsportivo

        // Classe para Caminhões, herda de Carro.
    // Adiciona funcionalidades relacionadas à capacidade e gerenciamento de carga.
    class Caminhao extends Carro {
        // Propriedades específicas do Caminhão
        capacidadeCarga; // Capacidade máxima de carga em kg (number)
        cargaAtual;      // Carga atual em kg (number)
        _tipoClasse = 'Caminhao'; // Identificador para reidratação

        /**
         * Construtor da classe Caminhao.
         * @param {string} modelo - Modelo do caminhão.
         * @param {string} cor - Cor do caminhão.
         * @param {number|string} capacidadeCargaInput - Capacidade máxima de carga (obrigatório, > 0).
         * @param {number} [velocidadeMaxima=120] - Velocidade máxima menor (padrão 120).
         * @param {string|null} [id=null] - ID existente ou null.
         * @param {Array<Manutencao|object>} [historicoManutencao=[]] - Histórico inicial.
         * @param {number|string} [cargaAtual=0] - Carga inicial (padrão 0).
         * @throws {Error} Se a capacidade de carga for inválida.
         */
        constructor(modelo, cor, capacidadeCargaInput, velocidadeMaxima = 120, id = null, historicoManutencao = [], cargaAtual = 0) {
            // Chama o construtor da classe pai (Carro) para inicializar propriedades comuns.
            super(modelo, cor, velocidadeMaxima, id, historicoManutencao);

            // Valida e define a capacidade de carga.
            const capacidade = parseFloat(capacidadeCargaInput);
            if (isNaN(capacidade) || capacidade <= 0) {
                // Lança um erro se a capacidade não for um número positivo.
                throw new Error("Capacidade de carga inválida (deve ser > 0).");
            }
            this.capacidadeCarga = capacidade;

            // Valida e define a carga atual inicial.
            const cargaInicial = parseFloat(cargaAtual);
            // Garante que a carga inicial seja um número não negativo e não exceda a capacidade.
            this.cargaAtual = (!isNaN(cargaInicial) && cargaInicial >= 0)
                             ? Math.min(cargaInicial, this.capacidadeCarga) // Limita pela capacidade
                             : 0; // Define 0 como padrão se inválido

            // Define a imagem específica para caminhões.
            this.imagem = 'images/truck.png';
        }

        /**
         * Adiciona peso à carga atual do caminhão.
         * @param {number|string} pesoInput - Peso a carregar.
         * @returns {boolean} True se carregou, false se inválido ou excedeu capacidade.
         */
        carregar(pesoInput) { /* ... (código omitido, comentado abaixo) ... */
            // Converte a entrada para número.
            const peso = parseFloat(pesoInput);
            // Valida se o peso é um número positivo.
            if (isNaN(peso) || peso <= 0) {
                this.alerta("Insira um peso válido.", 'erro'); tocarSom('somErro'); return false;
            }
            // Verifica se a adição excede a capacidade total.
            if (this.cargaAtual + peso > this.capacidadeCarga) {
                // Calcula espaço livre e alerta o usuário.
                const espacoLivre = this.capacidadeCarga - this.cargaAtual;
                this.alerta(`Capacidade excedida! Livre: ${espacoLivre.toFixed(0)} kg.`, 'aviso'); tocarSom('somErro'); return false;
            }
            // Adiciona o peso à carga atual.
            this.cargaAtual += peso;
            // Loga e notifica a atualização.
            console.log(`LOG: ${this.modelo}: Carregado +${peso.toFixed(0)} kg. Atual: ${this.cargaAtual.toFixed(0)} kg.`);
            this.notificarAtualizacao(); return true;
        }

        /**
         * Remove peso da carga atual do caminhão.
         * @param {number|string} pesoInput - Peso a descarregar.
         * @returns {boolean} True se descarregou, false se inválido ou sem carga suficiente.
         */
        descarregar(pesoInput) { /* ... (código omitido, comentado abaixo) ... */
            // Converte a entrada para número.
            const peso = parseFloat(pesoInput);
             // Valida se o peso é um número positivo.
            if (isNaN(peso) || peso <= 0) {
                this.alerta("Insira um peso válido.", 'erro'); tocarSom('somErro'); return false;
            }
            // Verifica se há carga suficiente para remover o peso solicitado.
            if (peso > this.cargaAtual) {
                this.alerta(`Não pode descarregar ${peso.toFixed(0)} kg. Atual: ${this.cargaAtual.toFixed(0)} kg.`, 'aviso'); tocarSom('somErro'); return false;
            }
            // Subtrai o peso da carga atual.
            this.cargaAtual -= peso;
            // Loga e notifica a atualização.
            console.log(`LOG: ${this.modelo}: Descarregado -${peso.toFixed(0)} kg. Atual: ${this.cargaAtual.toFixed(0)} kg.`);
            this.notificarAtualizacao(); return true;
        }

        /**
         * Sobrescreve acelerar para considerar o peso da carga.
         * Quanto mais pesado, mais lenta a aceleração.
         * @param {number} [incremento=5] - Incremento base menor para caminhões.
         * @returns {boolean} Resultado da chamada a super.acelerar.
         */
        acelerar(incremento = 5) { /* ... (código omitido, comentado abaixo) ... */
            // Verificação redundante (super.acelerar também verifica), mas clara.
            if (!this.ligado) { this.alerta("Ligue o veículo para acelerar!", 'erro'); tocarSom('somErro'); return false; }
            // Calcula o fator de carga: 1.0 (vazio) a 0.3 (cheio).
            // A fórmula reduz o desempenho em até 70% linearmente com a carga.
            // Garante que o fator seja no mínimo 0.3.
             // Adiciona verificação para evitar divisão por zero se capacidadeCarga for 0
             const fatorCarga = this.capacidadeCarga > 0
                              ? Math.max(0.3, 1 - (this.cargaAtual / this.capacidadeCarga) * 0.7)
                              : 1.0; // Se capacidade for 0, assume fator 1 (sem penalidade)
            // Calcula a aceleração real aplicando o fator.
            const aceleracaoReal = Math.max(0, incremento) * fatorCarga;
            // Chama o método acelerar da classe pai (Carro) com a aceleração ajustada.
            // A classe pai lida com limites, som e notificação.
            return super.acelerar(aceleracaoReal);
        }

        /**
         * Sobrescreve ligar para impedir a partida se o caminhão estiver sobrecarregado.
         * @returns {boolean} True se ligou, false se sobrecarregado ou se super.ligar falhar.
         */
        ligar() {
            // Verifica se a carga atual excede a capacidade.
            if (this.cargaAtual > this.capacidadeCarga) {
                // Se sim, alerta e impede a partida.
                this.alerta("Sobrecarregado! Remova o excesso.", "erro"); tocarSom('somErro'); return false;
            }
            // Se não estiver sobrecarregado, chama o método ligar da classe pai.
            return super.ligar();
        }

        /**
         * Sobrescreve exibirInformacoes para adicionar informações sobre carga e capacidade,
         * incluindo uma barra visual de progresso da carga.
         * @returns {string} HTML formatado com todas as informações do caminhão.
         */
        exibirInformacoes() { /* ... (código omitido, comentado abaixo) ... */
             // Obtém o HTML base da classe pai (Carro).
             const baseHtml = super.exibirInformacoes();
             // Calcula a porcentagem de carga (evita divisão por zero).
             const percCarga = this.capacidadeCarga > 0 ? (this.cargaAtual / this.capacidadeCarga) * 100 : 0;
             // Cria o HTML adicional para as informações de carga e a barra visual.
             // Usa toLocaleString para formatar números grandes (capacidade, carga).
             const cargaHtml = `
                 <p><strong>Capacidade:</strong> ${this.capacidadeCarga.toLocaleString('pt-BR')} kg</p>
                 <p><strong>Carga Atual:</strong> ${this.cargaAtual.toLocaleString('pt-BR')} kg (${percCarga.toFixed(1)}%)</p>
                 <div class="carga-barra-container" title="${percCarga.toFixed(1)}% carregado">
                     <div class="carga-barra" style="width: ${percCarga.toFixed(1)}%;"></div>
                 </div>`;
             // Insere o HTML da carga antes da linha de manutenção no HTML base.
             const partes = baseHtml.split('<p><em>Manutenções:');
             // Remonta a string HTML completa.
             return partes[0] + cargaHtml + '<p><em>Manutenções:' + partes[1];
         }
    } // Fim da classe Caminhao
    /* ==========================================================================
   LÓGICA DA APLICAÇÃO (UI, Eventos, Persistência, Áudio)
   Esta seção contém as variáveis globais, referências a elementos do DOM,
   e as funções que controlam a interface do usuário, manipulam eventos,
   salvam/carregam dados e gerenciam o feedback sonoro.
   ========================================================================== */

    // --- Variáveis Globais da Aplicação ---

    // Array que armazenará todas as instâncias de veículos (objetos Carro, CarroEsportivo, Caminhao).
    // É a representação em memória da garagem do usuário.
    let garagem = [];

    // Variável para guardar o ID ('string') do veículo que está atualmente selecionado
    // na aba de detalhes. Se nenhum estiver selecionado, seu valor é `null`.
    let veiculoSelecionadoId = null;

    // Constante que define a chave (nome) usada para salvar e carregar os dados da
    // garagem no localStorage do navegador. Usar uma chave específica evita conflitos
    // com outros dados que possam estar no localStorage.
    const KEY_LOCAL_STORAGE = 'minhaGaragemV4';

    // Um objeto Set para armazenar os identificadores únicos de lembretes de agendamento
    // que já foram mostrados como notificação durante a sessão atual da página.
    // Isso evita que a mesma notificação apareça repetidamente.
    const lembretesMostrados = new Set();

    // --- Referências a Elementos do DOM (Cache de Seletores) ---
    // Selecionar elementos do DOM repetidamente pode ser custoso. Armazenar as referências
    // em constantes/variáveis no início do script melhora a performance e organiza o código.

    // Elementos de Navegação e Abas
    const tabNavigation = document.querySelector('.tab-navigation'); // Container da navegação por abas
    const tabButtons = document.querySelectorAll('.tab-button');    // Coleção de todos os botões de aba
    const tabPanes = document.querySelectorAll('.tab-pane');        // Coleção de todas as seções de conteúdo das abas
    const tabButtonDetails = document.getElementById('tab-button-details'); // Botão específico da aba de Detalhes

    // Elementos do Formulário de Adicionar Veículo (Aba 'tab-add')
    const formAdicionarVeiculo = document.getElementById('formAdicionarVeiculo'); // O elemento <form>
    const tipoVeiculoSelect = document.getElementById('tipoVeiculo');     // O <select> para escolher o tipo
    const modeloInput = document.getElementById('modeloVeiculo');         // O <input type="text"> para o modelo
    const corInput = document.getElementById('corVeiculo');            // O <input type="color"> para a cor
    const campoCapacidadeCarga = document.getElementById('campoCapacidadeCarga'); // A <div> que contém os controles de capacidade
    const capacidadeCargaInput = document.getElementById('capacidadeCarga');   // O <input type="number"> para capacidade

    // Elementos da Aba 'Minha Garagem' (Aba 'tab-garage')
    const listaVeiculosDiv = document.getElementById('listaVeiculosGaragem'); // A <div> onde a lista/cards de veículos será exibida

    // Elementos da Aba 'Detalhes do Veículo' (Aba 'tab-details')
    const painelDetalhes = document.getElementById('tab-details');          // A <section> da aba de detalhes
    const tituloVeiculo = document.getElementById('tituloVeiculo');         // O <h2> que mostra o nome do veículo selecionado
    const divInformacoes = document.getElementById('informacoesVeiculo');   // A <div> onde as informações do veículo são exibidas
    const btnRemoverVeiculo = document.getElementById('btnRemoverVeiculo'); // O botão de remover veículo

    // Botões de Ação Comuns (na Aba 'tab-details')
    const btnLigar = document.getElementById('btnLigar');              // Botão 'Ligar'
    const btnDesligar = document.getElementById('btnDesligar');        // Botão 'Desligar'
    const btnAcelerar = document.getElementById('btnAcelerar');        // Botão 'Acelerar'
    const btnFrear = document.getElementById('btnFrear');            // Botão 'Frear'
    const btnBuzinar = document.getElementById('btnBuzinar');        // Botão 'Buzinar' (adicionado na v4.0)

    // Controles Específicos (na Aba 'tab-details')
    const controlesEsportivo = document.getElementById('controlesEsportivo'); // Container <div> dos controles de esportivo
    const controlesCaminhao = document.getElementById('controlesCaminhao');   // Container <div> dos controles de caminhão
    const btnAtivarTurbo = document.getElementById('btnAtivarTurbo');       // Botão 'Ativar Turbo'
    const btnDesativarTurbo = document.getElementById('btnDesativarTurbo');   // Botão 'Desativar Turbo'
    const cargaInput = document.getElementById('cargaInput');              // Input <input type="number"> para peso da carga
    const btnCarregar = document.getElementById('btnCarregar');          // Botão 'Carregar'
    const btnDescarregar = document.getElementById('btnDescarregar');      // Botão 'Descarregar'

    // Elementos da Seção de Manutenção (na Aba 'tab-details')
    const formManutencao = document.getElementById('formManutencao');         // O <form> de manutenção
    const dataManutencaoInput = document.getElementById('dataManutencao');   // Input <input type="date"> para data
    const tipoManutencaoInput = document.getElementById('tipoManutencao');   // Input <input type="text"> para tipo de serviço
    const custoManutencaoInput = document.getElementById('custoManutencao');  // Input <input type="number"> para custo
    const descManutencaoInput = document.getElementById('descManutencao');   // Textarea <textarea> para descrição
    const historicoListaUl = document.getElementById('historicoLista');      // Lista <ul> para histórico passado
    const agendamentosListaUl = document.getElementById('agendamentosLista');  // Lista <ul> para agendamentos futuros

    // Elementos de Feedback (Notificações e Áudio)
    const notificacoesDiv = document.getElementById('notificacoes');       // Container <div> para notificações flutuantes
    const volumeSlider = document.getElementById('volumeSlider');         // Slider <input type="range"> para volume

    // Mapeamento de IDs de áudio para os elementos <audio> correspondentes no HTML.
    // Isso permite tocar os sons facilmente usando `audioElements['somLigar'].play()`.
    // Se um elemento <audio> com o ID correspondente não existir no HTML,
    // o valor será `null` (ex: `somErro` pode ser opcional).
    const audioElements = {
        somLigar: document.getElementById('somLigar'),         // Referência ao <audio> de ligar
        somDesligar: document.getElementById('somDesligar'),     // Referência ao <audio> de desligar
        somAcelerar: document.getElementById('somAcelerar'),     // Referência ao <audio> de acelerar
        somFrear: document.getElementById('somFrear'),         // Referência ao <audio> de frear
        somBuzina: document.getElementById('somBuzina'),       // Referência ao <audio> da buzina
        somErro: document.getElementById('somErro')          // Referência ao <audio> de erro (pode ser null)
    };
    // --- Funções de Áudio ---

    /**
     * Toca um som identificado pelo ID (chave no objeto audioElements).
     * Busca o elemento <audio> correspondente e executa o método play().
     * Inclui tratamento básico de erros e reinicia o áudio se já estiver tocando.
     * @param {keyof audioElements | string} somId - A chave/ID do som a ser tocado (ex: 'somLigar').
     */
    function tocarSom(somId) {
        // Obtém a referência ao elemento <audio> do objeto mapeado 'audioElements'.
        const audioElement = audioElements[somId];
        // Verifica se o elemento foi encontrado e se possui o método 'play'.
        if (audioElement && typeof audioElement.play === 'function') {
            try {
                // Define o tempo atual do áudio para 0. Isso permite que o som
                // seja tocado desde o início mesmo se for clicado rapidamente várias vezes.
                audioElement.currentTime = 0;
                // Tenta tocar o áudio. O método play() retorna uma Promise.
                const playPromise = audioElement.play();
                // Verifica se a Promise foi retornada (navegadores mais modernos)
                if (playPromise !== undefined) {
                    // Adiciona um .catch() para lidar com erros comuns na reprodução de áudio.
                    playPromise.catch(error => {
                        // Erro comum: O navegador bloqueia a reprodução automática antes
                        // que o usuário interaja com a página.
                        if (error.name === 'NotAllowedError') {
                            // Loga um aviso no console, informando sobre o bloqueio.
                            // Não mostra notificação ao usuário, pois é um comportamento esperado do navegador.
                            console.warn(`WARN Áudio: Playback de ${somId} bloqueado pelo navegador. Interação necessária.`);
                        } else {
                            // Loga outros erros que possam ocorrer durante a tentativa de play().
                            console.error(`ERRO ao tocar som ${somId}:`, error);
                        }
                    });
                }
            } catch (error) {
                // Captura erros inesperados ao tentar acessar propriedades do audioElement.
                console.error(`ERRO inesperado ao tentar tocar ${somId}:`, error);
            }
        } else {
             // Se o audioElement não foi encontrado ou não é válido (não tem .play),
             // loga um aviso no console.
             // Evita logar para 'somErro' se ele for opcional e não existir no HTML.
             if (somId !== 'somErro') { // Adicione outras exceções se necessário
                console.warn(`WARN Áudio: Elemento de áudio não encontrado ou inválido: ${somId}`);
             }
        }
    }

    /**
     * Atualiza o volume de todos os elementos de áudio registrados
     * com base no valor atual do slider de volume.
     * Salva a preferência de volume no localStorage.
     */
    function atualizarVolume() {
        // Obtém o valor atual do slider de volume (0 a 1).
        // Se o slider não existir, usa 0.5 (50%) como valor padrão.
        const volume = volumeSlider ? parseFloat(volumeSlider.value) : 0.5;
        // Itera sobre todas as chaves (IDs dos sons) no objeto `audioElements`.
        for (const key in audioElements) {
            // Verifica se o elemento de áudio correspondente existe.
            if (audioElements[key]) {
                // Define a propriedade 'volume' do elemento <audio>.
                audioElements[key].volume = volume;
            }
        }
        // Salva a preferência de volume no localStorage para que seja lembrada
        // na próxima vez que o usuário abrir a página (opcional).
         try { // Usa try-catch pois o localStorage pode falhar em alguns cenários (ex: modo privado)
            localStorage.setItem('garagemVolumePref', volume.toString());
         } catch (e) {
            console.warn("WARN: Não foi possível salvar a preferência de volume no localStorage.", e);
         }
    }


    // --- Funções de Persistência (LocalStorage) ---
    // Comentário indica que não houve alterações significativas nesta seção na versão 4.0.

    /**
     * Salva o estado atual do array `garagem` no localStorage.
     * Converte os objetos de veículo e manutenção para JSON, incluindo `_tipoClasse`.
     */
    function salvarGaragem() { /* ... (código omitido, comentado anteriormente) ... */
        try {
            // Mapeia o array 'garagem' para criar uma versão segura para serialização JSON.
            const garagemParaSalvar = garagem.map(veiculo => {
                // Garante que _tipoClasse esteja presente no objeto veículo.
                if (!veiculo._tipoClasse) console.warn(`WARN Salvar: Veículo sem _tipoClasse! ID: ${veiculo.id}`);
                // Mapeia o histórico de manutenção, garantindo que _tipoClasse esteja presente em cada item.
                const historicoParaSalvar = veiculo.historicoManutencao.map(m => {
                    if (!m._tipoClasse) console.warn(`WARN Salvar: Manutenção sem _tipoClasse! Veículo: ${veiculo.id}`);
                    return { ...m, _tipoClasse: m._tipoClasse || 'Manutencao' };
                });
                // Retorna uma cópia do objeto veículo com o histórico mapeado e _tipoClasse garantido.
                return { ...veiculo, _tipoClasse: veiculo._tipoClasse || 'Carro', historicoManutencao: historicoParaSalvar };
            });
            // Converte o array preparado para uma string JSON.
            const garagemJSON = JSON.stringify(garagemParaSalvar);
            // Armazena a string JSON no localStorage sob a chave definida.
            localStorage.setItem(KEY_LOCAL_STORAGE, garagemJSON);
        } catch (error) {
            // Captura erros durante o processo de salvamento.
            console.error("ERRO CRÍTICO ao salvar garagem:", error);
            // Notifica o usuário sobre a falha grave.
            adicionarNotificacao("Falha grave ao salvar dados! Suas últimas alterações podem ser perdidas.", "erro", 15000);
        }
    }

    /**
     * Carrega os dados da garagem do localStorage e os reidrata,
     * convertendo os objetos JSON de volta em instâncias das classes apropriadas.
     * @returns {Array<Carro|CarroEsportivo|Caminhao>} Array de veículos carregados.
     */
    function carregarGaragem() { /* ... (código omitido, comentado anteriormente) ... */
        let garagemJSON;
        try {
            // Obtém a string JSON do localStorage.
            garagemJSON = localStorage.getItem(KEY_LOCAL_STORAGE);
            // Se não houver dados, retorna um array vazio.
            if (!garagemJSON) return [];
            // Converte a string JSON em um array de objetos genéricos.
            const garagemSalva = JSON.parse(garagemJSON);
            // Mapeia os objetos genéricos para instâncias das classes corretas (reidratação).
            const garagemReidratada = garagemSalva.map(veiculoData => {
                try {
                    // Validação básica dos dados carregados.
                    if (!veiculoData || !veiculoData._tipoClasse) throw new Error("Dados incompletos ou corrompidos.");
                    // Reidrata o histórico de manutenção primeiro.
                    const historicoReidratado = reidratarHistoricoAux(veiculoData.historicoManutencao, veiculoData.modelo);
                    // Cria a instância da classe correta baseado no _tipoClasse.
                    switch (veiculoData._tipoClasse) {
                        case 'CarroEsportivo': return new CarroEsportivo(veiculoData.modelo, veiculoData.cor, veiculoData.velocidadeMaxima, veiculoData.id, historicoReidratado, veiculoData.turboAtivado);
                        case 'Caminhao': return new Caminhao(veiculoData.modelo, veiculoData.cor, veiculoData.capacidadeCarga, veiculoData.velocidadeMaxima, veiculoData.id, historicoReidratado, veiculoData.cargaAtual);
                        case 'Carro': return new Carro(veiculoData.modelo, veiculoData.cor, veiculoData.velocidadeMaxima, veiculoData.id, historicoReidratado);
                        default: throw new Error(`Tipo desconhecido encontrado: ${veiculoData._tipoClasse}`);
                    }
                } catch (error) {
                    // Captura erros na reidratação de um veículo específico.
                    console.error(`ERRO ao reidratar veículo (ID: ${veiculoData?.id || '?' }): ${error.message}`, veiculoData);
                    return null; // Retorna null para o veículo com erro.
                }
            }).filter(v => v instanceof Carro); // Filtra para remover quaisquer nulls resultantes de erros.
            console.log(`LOG: Garagem carregada com ${garagemReidratada.length} veículos.`);
            return garagemReidratada; // Retorna o array de veículos reidratados.
        } catch (error) {
            // Captura erros críticos no carregamento ou parse do JSON principal.
            console.error("ERRO CRÍTICO ao carregar/parsear garagem:", error);
            adicionarNotificacao("Erro ao carregar dados da garagem. Podem estar corrompidos.", "erro", 15000);
             // Tenta limpar dados corrompidos para evitar erros futuros (opcional)
            try { localStorage.removeItem(KEY_LOCAL_STORAGE); } catch(e){}
            return []; // Retorna um array vazio como fallback.
        }
    }

    /**
     * Função auxiliar para reidratar o histórico de manutenção de um veículo.
     * @param {Array<object|Manutencao>} historicoArray - Array de dados de manutenção.
     * @param {string} [modeloVeiculo='?'] - Modelo do veículo (para logs de erro).
     * @returns {Array<Manutencao>} Array reidratado de instâncias de Manutencao.
     */
    function reidratarHistoricoAux(historicoArray, modeloVeiculo = '?') { /* ... (código omitido, comentado anteriormente) ... */
         if (!Array.isArray(historicoArray)) return [];
         return historicoArray.map(item => {
             if (item instanceof Manutencao) return item;
             if (typeof item === 'object' && item !== null && item._tipoClasse === 'Manutencao') {
                 try { return new Manutencao(item.data, item.tipo, item.custo, item.descricao); }
                 catch (e) { console.error(`ERRO Reidratar Aux Mnt [${modeloVeiculo}]: ${e.message}`, item); return null; }
             }
             if (item !== null) console.warn(`WARN Reidratar Aux Mnt: Item inesperado [${modeloVeiculo}]`, item);
             return null;
         }).filter(item => item instanceof Manutencao);
     }

    // --- Funções de Manipulação da UI ---
    // Comentário indica que estas funções foram atualizadas para lidar com mais campos habilitados/desabilitados.

    /**
     * Alterna a visibilidade das abas (painéis) e o estado ativo dos botões de navegação.
     * @param {string} tabId - ID da aba a ser mostrada.
     */
    function switchTab(tabId) { /* ... (código omitido, comentado anteriormente) ... */
         let foundTab = false;
         // Mostra a aba correta, esconde as outras.
         tabPanes.forEach(pane => { pane.classList.toggle('active', pane.id === tabId); if(pane.id === tabId) foundTab = true; });
         // Atualiza o botão ativo na navegação.
         tabButtons.forEach(button => { button.classList.toggle('active', button.dataset.tab === tabId); });
         // Habilita/desabilita o botão de Detalhes.
         if(tabButtonDetails) tabButtonDetails.disabled = !veiculoSelecionadoId;
         // Loga a ação ou avisa se a aba não existe.
         if (!foundTab) console.warn(`WARN: Aba inexistente: ${tabId}`); else console.log(`LOG: Aba: ${tabId}`);
     }

    /**
     * Atualiza a lista de veículos na aba "Minha Garagem".
     * Cria botões (ou cards, dependendo da versão) para cada veículo.
     * (A versão do código fornecido aqui ainda usa botões com swatch de cor).
     */
    function atualizarListaVeiculosUI() { /* ... (código omitido - versão com botões, comentado anteriormente) ... */
        listaVeiculosDiv.innerHTML = ''; // Limpa a lista atual
        if (garagem.length === 0) { listaVeiculosDiv.innerHTML = '<p class="placeholder-text">Garagem vazia.</p>'; return; }
        // Ordena por modelo
        garagem.sort((a, b) => a.modelo.localeCompare(b.modelo));
        // Cria um botão para cada veículo
        garagem.forEach(veiculo => {
            const btn = document.createElement('button'); // Cria o botão
            btn.textContent = `${veiculo.modelo} (${veiculo._tipoClasse})`; // Define o texto
            // Cria e adiciona o swatch de cor
            const colorSwatch = document.createElement('span');
            colorSwatch.className = 'color-swatch-list'; // Classe para estilo
            colorSwatch.style.backgroundColor = veiculo.cor;
            btn.prepend(colorSwatch); // Adiciona o swatch antes do texto
            // Armazena ID e marca como selecionado se for o caso
            btn.dataset.veiculoId = veiculo.id;
            btn.classList.toggle('selecionado', veiculo.id === veiculoSelecionadoId);
            // Adiciona evento de clique para selecionar
            btn.addEventListener('click', () => selecionarVeiculo(veiculo.id));
            listaVeiculosDiv.appendChild(btn); // Adiciona o botão à div
        });
    }

    /**
     * Define o veículo selecionado e atualiza a UI correspondente.
     * @param {string|null} veiculoId - ID do veículo a selecionar, ou null para deselecionar.
     */
    function selecionarVeiculo(veiculoId) { /* ... (código omitido, comentado anteriormente) ... */
         veiculoSelecionadoId = veiculoId; // Define o ID selecionado globalmente
         const veiculo = garagem.find(v => v.id === veiculoId); // Encontra o objeto do veículo
         console.log(`LOG: Selecionado: ID ${veiculoId} (${veiculo ? veiculo.modelo : 'Nenhum'})`);
         atualizarListaVeiculosUI(); // Atualiza a lista (destaque)
         atualizarDisplay(); // Atualiza a aba de detalhes
         // Muda para a aba de detalhes se um veículo foi selecionado
         if (veiculoSelecionadoId) switchTab('tab-details');
         else switchTab('tab-garage'); // Volta para a garagem se deselecionado
     }

    /**
     * Exibe o histórico e os agendamentos de manutenção na UI.
     * Aplica classes para destacar agendamentos de hoje/amanhã.
     * @param {Carro|null} veiculo - O veículo selecionado.
     */
    function exibirManutencoesUI(veiculo) { /* ... (código omitido, comentado anteriormente) ... */
         // Limpa listas e mostra placeholder
         historicoListaUl.innerHTML = '<li class="placeholder-text">...</li>'; agendamentosListaUl.innerHTML = '<li class="placeholder-text">...</li>';
         if (!veiculo) { historicoListaUl.innerHTML = '<li class="placeholder-text">Selecione veículo.</li>'; agendamentosListaUl.innerHTML = '<li class="placeholder-text">Selecione veículo.</li>'; return; }
         try {
             // Exibe histórico passado
             const historico = veiculo.getHistoricoPassado(); historicoListaUl.innerHTML = '';
             if (historico.length === 0) historicoListaUl.innerHTML = '<li class="placeholder-text">Nenhum histórico.</li>';
             else historico.forEach(m => { const li = document.createElement('li'); li.textContent = m.formatar(); li.title = `Custo: ${m.custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}${m.descricao ? '\nDesc: ' + m.descricao : ''}`; historicoListaUl.appendChild(li); });
             // Exibe agendamentos futuros
             const agendamentos = veiculo.getAgendamentosFuturos(); agendamentosListaUl.innerHTML = '';
             if (agendamentos.length === 0) agendamentosListaUl.innerHTML = '<li class="placeholder-text">Nenhum agendamento.</li>';
             else {
                 // Ordena agendamentos por data
                 agendamentos.sort((a, b) => new Date(a.data) - new Date(b.data));
                 agendamentos.forEach(m => {
                     const li = document.createElement('li'); li.textContent = m.formatar(); li.title = `Custo: ${m.custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}${m.descricao ? '\nDesc: ' + m.descricao : ''}`;
                     // Adiciona classes para destaque de hoje/amanhã
                     const dataAg = new Date(m.data + 'T00:00:00Z'); const hojeInicioDiaUTC = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())); const amanhaInicioDiaUTC = new Date(hojeInicioDiaUTC); amanhaInicioDiaUTC.setUTCDate(hojeInicioDiaUTC.getUTCDate() + 1);
                     if (dataAg.getTime() === hojeInicioDiaUTC.getTime()) { li.classList.add('agendamento-hoje'); li.title += "\n\n*** HOJE! ***"; }
                     else if (dataAg.getTime() === amanhaInicioDiaUTC.getTime()) { li.classList.add('agendamento-amanha'); li.title += "\n\n* Amanhã."; }
                     agendamentosListaUl.appendChild(li);
                 });
                 // Verifica se há agendamentos próximos para notificar
                 verificarProximosAgendamentos(veiculo, agendamentos);
             }
         } catch (error) { console.error(`ERRO ao exibir manutenções ${veiculo.modelo}:`, error); historicoListaUl.innerHTML = '<li class="error-text">Erro histórico.</li>'; agendamentosListaUl.innerHTML = '<li class="error-text">Erro agendamentos.</li>'; }
    }

    /**
     * Atualiza o conteúdo e o estado dos controles na aba "Detalhes do Veículo".
     * Chamada quando um veículo é selecionado ou seu estado muda.
     */
    function atualizarDisplay() {
        // Encontra o objeto do veículo selecionado.
        const veiculo = garagem.find(v => v.id === veiculoSelecionadoId);
        // Agrupa os campos do formulário de manutenção para habilitar/desabilitar.
        const formManutCampos = formManutencao ? [dataManutencaoInput, tipoManutencaoInput, custoManutencaoInput, descManutencaoInput, formManutencao.querySelector('button')].filter(Boolean) : [];

        // Se um veículo está selecionado...
        if (veiculo) {
            // Atualiza título e habilita botão remover.
            tituloVeiculo.textContent = `Detalhes: ${veiculo.modelo}`; if(btnRemoverVeiculo) btnRemoverVeiculo.disabled = false;
            // Exibe informações do veículo (incluindo imagem).
            divInformacoes.innerHTML = veiculo.exibirInformacoes();
            // Adiciona a barra de velocímetro.
            try {
                const percVelocidade = veiculo.velocidadeMaxima > 0 ? Math.min(100, (veiculo.velocidade / veiculo.velocidadeMaxima) * 100) : 0;
                divInformacoes.innerHTML += `
                    <div class="velocimetro" title="${veiculo.velocidade.toFixed(0)}/${veiculo.velocidadeMaxima} km/h">
                        <div class="velocimetro-barra" style="width: ${percVelocidade.toFixed(1)}%;"></div>
                        <div class="velocimetro-texto">${veiculo.velocidade.toFixed(0)} km/h</div>
                    </div>`;
            } catch(e) { console.error("Erro ao gerar velocímetro:", e); }

            // Mostra/esconde e habilita/desabilita controles específicos do tipo.
            const ehEsportivo = veiculo instanceof CarroEsportivo;
            const ehCaminhao = veiculo instanceof Caminhao;
            if(controlesEsportivo) controlesEsportivo.classList.toggle('hidden', !ehEsportivo);
            if(controlesCaminhao) controlesCaminhao.classList.toggle('hidden', !ehCaminhao);
            if (ehEsportivo) { if(btnAtivarTurbo) btnAtivarTurbo.disabled = veiculo.turboAtivado || !veiculo.ligado; if(btnDesativarTurbo) btnDesativarTurbo.disabled = !veiculo.turboAtivado; }
            else { if(btnAtivarTurbo) btnAtivarTurbo.disabled = true; if(btnDesativarTurbo) btnDesativarTurbo.disabled = true; }
            if (ehCaminhao) { if(cargaInput) cargaInput.disabled = false; if(btnCarregar) btnCarregar.disabled = veiculo.cargaAtual >= veiculo.capacidadeCarga; if(btnDescarregar) btnDescarregar.disabled = veiculo.cargaAtual <= 0; }
            else { if(cargaInput) cargaInput.disabled = true; if(btnCarregar) btnCarregar.disabled = true; if(btnDescarregar) btnDescarregar.disabled = true; }

            // Habilita/desabilita botões de ação comuns baseado no estado.
            if(btnLigar) btnLigar.disabled = veiculo.ligado;
            if(btnDesligar) btnDesligar.disabled = !veiculo.ligado || veiculo.velocidade > 0;
            if(btnAcelerar) btnAcelerar.disabled = !veiculo.ligado || veiculo.velocidade >= veiculo.velocidadeMaxima;
            if(btnFrear) btnFrear.disabled = veiculo.velocidade === 0;
            if(btnBuzinar) btnBuzinar.disabled = false; // Buzina sempre disponível se veículo selecionado

            // Atualiza e habilita a seção de manutenção.
            exibirManutencoesUI(veiculo);
            formManutCampos.forEach(campo => { if(campo) campo.disabled = false; });
            if(tabButtonDetails) tabButtonDetails.disabled = false; // Habilita botão da aba

        } else { // Se nenhum veículo está selecionado...
            // Reseta título, área de informações (com placeholder), e botões/campos.
            tituloVeiculo.textContent = 'Detalhes';
             divInformacoes.innerHTML = `
                 <div class="placeholder-content">
                     <img src="images/placeholder-vehicle.png" alt="Nenhum veículo selecionado" class="placeholder-icon">
                     <p class="placeholder-text" style="display: block;">Selecione um veículo.</p>
                 </div>`;
            exibirManutencoesUI(null); // Limpa listas de manutenção
            if(controlesEsportivo) controlesEsportivo.classList.add('hidden');
            if(controlesCaminhao) controlesCaminhao.classList.add('hidden');
            [btnLigar, btnDesligar, btnAcelerar, btnFrear, btnBuzinar, btnRemoverVeiculo, btnAtivarTurbo, btnDesativarTurbo, cargaInput, btnCarregar, btnDescarregar]
                .forEach(el => { if(el) el.disabled = true; }); // Desabilita todos os botões/inputs
            formManutCampos.forEach(campo => { if(campo) campo.disabled = true; }); // Desabilita form manutenção
            if(tabButtonDetails) tabButtonDetails.disabled = true; // Desabilita botão da aba
            // Volta para a garagem se a aba de detalhes estava ativa.
            if (painelDetalhes && painelDetalhes.classList.contains('active')) { switchTab('tab-garage'); }
        }
    }

    /**
     * Processa cliques nos botões de ação (Ligar, Acelerar, Buzinar, etc.).
     * Chama o método correspondente no objeto do veículo selecionado.
     * @param {string} acao - A string identificadora da ação.
     */
    function interagir(acao) { /* ... (código omitido, comentado anteriormente) ... */
        // Encontra o veículo selecionado.
        const veiculo = garagem.find(v => v.id === veiculoSelecionadoId);
        // Se não houver veículo, mostra erro e sai.
        if (!veiculo) { adicionarNotificacao("Selecione um veículo primeiro.", "erro"); return; }
        console.log(`LOG: Interação: "${acao}" em ${veiculo.modelo}`);
        // Tenta executar a ação dentro de um try-catch.
        try {
            let resultado = false; // Flag opcional
            // Executa o método correspondente no objeto do veículo.
            switch (acao) {
                case 'ligar': resultado = veiculo.ligar(); break;
                case 'desligar': resultado = veiculo.desligar(); break;
                case 'acelerar': resultado = veiculo.acelerar(); break;
                case 'frear': resultado = veiculo.frear(); break;
                case 'buzinar': resultado = veiculo.buzinar(); break; // Chama buzinar
                case 'ativarTurbo': // Ação específica de Esportivo
                    if (veiculo instanceof CarroEsportivo) resultado = veiculo.ativarTurbo();
                    else { veiculo.alerta("Turbo não disponível para este veículo.", "aviso"); tocarSom('somErro'); }
                    break;
                case 'desativarTurbo': // Ação específica de Esportivo
                    if (veiculo instanceof CarroEsportivo) resultado = veiculo.desativarTurbo();
                    break; // Não precisa de else/alerta aqui
                case 'carregar': // Ação específica de Caminhão
                    if (veiculo instanceof Caminhao) {
                        const p = cargaInput ? parseFloat(cargaInput.value) : NaN; // Pega valor do input
                        if (!isNaN(p) && p > 0) resultado = veiculo.carregar(p); // Valida e chama carregar
                        else { veiculo.alerta("Peso inválido para carregar.", "erro"); tocarSom('somErro'); if(cargaInput) cargaInput.focus(); }
                    } else { veiculo.alerta("Ação 'Carregar' não disponível.", "aviso"); tocarSom('somErro'); }
                    break;
                case 'descarregar': // Ação específica de Caminhão
                    if (veiculo instanceof Caminhao) {
                        const p = cargaInput ? parseFloat(cargaInput.value) : NaN;
                        if (!isNaN(p) && p > 0) resultado = veiculo.descarregar(p); // Valida e chama descarregar
                        else { veiculo.alerta("Peso inválido para descarregar.", "erro"); tocarSom('somErro'); if(cargaInput) cargaInput.focus(); }
                    } // Não precisa de else/alerta
                    break;
                default: // Caso a ação não seja reconhecida
                    console.warn(`WARN: Ação desconhecida solicitada: ${acao}`);
                    adicionarNotificacao(`Ação "${acao}" não reconhecida.`, 'erro');
            }
        } catch (error) {
            // Captura erros lançados pelos métodos dos veículos.
            console.error(`ERRO durante interação "${acao}" [${veiculo.modelo}]:`, error);
            adicionarNotificacao(`Erro ao executar ${acao}: ${error.message}`, "erro");
            tocarSom('somErro'); // Toca som de erro genérico
        }
        // A atualização da UI e o salvamento são feitos via notificarAtualizacao() dentro dos métodos dos veículos.
    }

    // --- Funções Auxiliares de UI (Notificação, Lembretes) ---

    /** Exibe notificação flutuante. */
    function adicionarNotificacao(mensagem, tipo = 'info', duracaoMs = 5000) { /* ... (código omitido, comentado anteriormente) ... */
         console.log(`NOTIFICAÇÃO [${tipo.toUpperCase()}]: ${mensagem}`); if (!notificacoesDiv) { console.error("ERRO UI: Container #notificacoes não encontrado."); return; }
         const notificacao = document.createElement('div'); notificacao.className = `notificacao ${tipo}`;
         notificacao.textContent = mensagem.length > 150 ? mensagem.substring(0, 147) + '...' : mensagem;
         notificacao.title = mensagem;
         const closeButton = document.createElement('button'); closeButton.innerHTML = '×'; closeButton.className = 'notificacao-close'; closeButton.title = "Fechar"; closeButton.setAttribute('aria-label', 'Fechar notificação');
         const fecharNotificacao = () => { notificacao.classList.remove('show'); notificacao.addEventListener('transitionend', () => { if (notificacao.parentNode) notificacao.remove(); }, { once: true }); };
         closeButton.onclick = fecharNotificacao; notificacao.appendChild(closeButton);
         notificacoesDiv.appendChild(notificacao);
         requestAnimationFrame(() => { setTimeout(() => notificacao.classList.add('show'), 10); });
         const timerId = setTimeout(fecharNotificacao, duracaoMs);
         notificacao.addEventListener('mouseenter', () => clearTimeout(timerId));
     }

    /** Verifica agendamentos próximos e notifica (hoje/amanhã). */
    function verificarProximosAgendamentos(veiculo, agendamentos) { /* ... (código omitido, comentado anteriormente) ... */
        const hojeUTC = new Date(); const hojeInicioDiaUTC = new Date(Date.UTC(hojeUTC.getUTCFullYear(), hojeUTC.getUTCMonth(), hojeUTC.getUTCDate()));
        const amanhaInicioDiaUTC = new Date(hojeInicioDiaUTC); amanhaInicioDiaUTC.setUTCDate(hojeInicioDiaUTC.getUTCDate() + 1);
        agendamentos.forEach(ag => { const dataAg = new Date(ag.data + 'T00:00:00Z'); const lembreteId = `${veiculo.id}-${ag.data}`;
            if (!lembretesMostrados.has(lembreteId)) {
                if (dataAg.getTime() === hojeInicioDiaUTC.getTime()) { adicionarNotificacao(`🔔 LEMBRETE HOJE: ${ag.tipo} para ${veiculo.modelo}!`, 'aviso', 15000); lembretesMostrados.add(lembreteId); }
                else if (dataAg.getTime() === amanhaInicioDiaUTC.getTime()) { adicionarNotificacao(`🗓️ LEMBRETE AMANHÃ: ${ag.tipo} para ${veiculo.modelo}.`, 'info', 15000); lembretesMostrados.add(lembreteId); }
            }
        });
     }

    // --- EVENT LISTENERS (Ouvintes de Eventos da Interface) ---

    // Navegação por Abas (usando delegação de eventos)
    if (tabNavigation) {
        tabNavigation.addEventListener('click', (e) => {
            // Verifica se o clique foi num botão de aba habilitado
            if (e.target.matches('.tab-button:not(:disabled)')) {
                const tabId = e.target.dataset.tab; // Pega o ID da aba do atributo data-tab
                if (tabId) { switchTab(tabId); } // Chama a função para trocar de aba
            }
        });
    } else { console.error("ERRO FATAL: Container de navegação (.tab-navigation) não encontrado!"); }

    // Submissão do Formulário de Adicionar Veículo
    if (formAdicionarVeiculo) {
        formAdicionarVeiculo.addEventListener('submit', (e) => { /* ... (código omitido - versão com botões, comentado anteriormente) ... */
            e.preventDefault(); // Previne recarregamento da página
            const tipo = tipoVeiculoSelect.value;
            const modelo = modeloInput.value.trim();
            const cor = corInput.value;
            let novoVeiculo = null;
            try {
                // Validações
                if (!modelo) throw new Error("Modelo é obrigatório.");
                if (!tipo) throw new Error("Selecione o tipo de veículo.");
                // Cria o veículo
                switch (tipo) {
                    case 'CarroEsportivo': novoVeiculo = new CarroEsportivo(modelo, cor); break;
                    case 'Caminhao': const cap = capacidadeCargaInput.value; novoVeiculo = new Caminhao(modelo, cor, cap); break;
                    case 'Carro': default: novoVeiculo = new Carro(modelo, cor); break;
                }
                // Adiciona, salva, atualiza UI, reseta form
                garagem.push(novoVeiculo);
                salvarGaragem();
                atualizarListaVeiculosUI(); // Atualiza a lista de veículos
                formAdicionarVeiculo.reset();
                if(campoCapacidadeCarga) campoCapacidadeCarga.classList.add('hidden');
                adicionarNotificacao(`${novoVeiculo.modelo} adicionado com sucesso!`, 'sucesso');
                // Muda para a aba da garagem e destaca o novo veículo
                switchTab('tab-garage');
                setTimeout(() => {
                    // Adapta o seletor para encontrar o card ou o botão, dependendo da versão da UI
                    const elNovoVeiculo = listaVeiculosDiv.querySelector(`.veiculo-card[data-veiculo-id="${novoVeiculo.id}"]`) || listaVeiculosDiv.querySelector(`button[data-veiculo-id="${novoVeiculo.id}"]`);
                    if (elNovoVeiculo) {
                        elNovoVeiculo.focus(); // Foca no elemento
                        elNovoVeiculo.classList.add('highlight-add'); // Adiciona classe de destaque
                        setTimeout(() => elNovoVeiculo.classList.remove('highlight-add'), 1500); // Remove após 1.5s
                    }
                }, 100);
            } catch (error) {
                console.error("Erro ao adicionar veículo:", error);
                adicionarNotificacao(`Erro ao adicionar: ${error.message}`, 'erro');
                tocarSom('somErro');
            }
        });
    } else { console.error("ERRO FATAL: Formulário de adicionar veículo (#formAdicionarVeiculo) não encontrado!"); }

    // Mostrar/Esconder Campo de Capacidade de Carga (ao mudar tipo de veículo)
    if (tipoVeiculoSelect && campoCapacidadeCarga) {
        tipoVeiculoSelect.addEventListener('change', () => {
            // Mostra/esconde o campo baseado na seleção
            campoCapacidadeCarga.classList.toggle('hidden', tipoVeiculoSelect.value !== 'Caminhao');
        });
    }

    // Submissão do Formulário de Adicionar Manutenção
    if (formManutencao) {
        formManutencao.addEventListener('submit', (e) => { /* ... (código omitido, comentado anteriormente) ... */
            e.preventDefault();
            const veiculo = garagem.find(v => v.id === veiculoSelecionadoId);
            if (!veiculo) { adicionarNotificacao("Selecione um veículo antes.", "erro"); return; }
            try {
                // Cria a instância de Manutencao (validação ocorre no construtor)
                const novaM = new Manutencao(dataManutencaoInput.value, tipoManutencaoInput.value, custoManutencaoInput.value, descManutencaoInput.value);
                // Adiciona ao veículo (método da classe notifica atualização)
                veiculo.adicionarManutencao(novaM);
                formManutencao.reset(); // Limpa o formulário
                adicionarNotificacao(`Registro de manutenção adicionado para ${veiculo.modelo}.`, 'sucesso');
                // A UI é atualizada pela chamada a notificarAtualizacao dentro de adicionarManutencao
            } catch (error) {
                console.error("Erro ao adicionar manutenção:", error);
                adicionarNotificacao(`Erro no registro: ${error.message}`, 'erro');
                tocarSom('somErro');
            }
         });
    } else { console.error("ERRO FATAL: Formulário de manutenção (#formManutencao) não encontrado!"); }

    // Clique no Botão de Remover Veículo
    if (btnRemoverVeiculo) {
        btnRemoverVeiculo.addEventListener('click', () => { /* ... (código omitido, comentado anteriormente) ... */
            const veiculo = garagem.find(v => v.id === veiculoSelecionadoId); if (!veiculo) return;
            // Confirmação explícita do usuário
            const confirmacao = confirm(`ATENÇÃO!\n\nRemover o veículo "${veiculo.modelo}"?\n\nEsta ação não pode ser desfeita.`);
            if (confirmacao) {
                // Tenta desligar o veículo antes de remover
                if(veiculo.ligado && !veiculo.desligar()) {
                    veiculo.alerta("Não foi possível remover. Desligue o veículo primeiro (verifique se está parado).", "erro"); return;
                }
                // Remove o veículo do array 'garagem'
                const idRem = veiculo.id; const nomeRem = veiculo.modelo;
                garagem = garagem.filter(v => v.id !== idRem);
                // Deseleciona, salva e notifica
                selecionarVeiculo(null); // Limpa a seleção e atualiza a UI
                salvarGaragem();
                adicionarNotificacao(`${nomeRem} removido da garagem.`, "info");
            } else {
                 adicionarNotificacao(`Remoção de ${veiculo.modelo} cancelada.`, 'info', 3000);
            }
        });
    } else { console.error("ERRO FATAL: Botão de remover (#btnRemoverVeiculo) não encontrado!"); }

    // Adiciona Listeners para os Botões de Ação do Veículo
    const botoesAcao = [
        { id: 'btnLigar', acao: 'ligar' }, { id: 'btnDesligar', acao: 'desligar' },
        { id: 'btnAcelerar', acao: 'acelerar' }, { id: 'btnFrear', acao: 'frear' },
        { id: 'btnBuzinar', acao: 'buzinar' }, { id: 'btnAtivarTurbo', acao: 'ativarTurbo' },
        { id: 'btnDesativarTurbo', acao: 'desativarTurbo' }, { id: 'btnCarregar', acao: 'carregar' },
        { id: 'btnDescarregar', acao: 'descarregar' },
    ];
    botoesAcao.forEach(item => {
        const btn = document.getElementById(item.id); // Encontra o botão pelo ID
        if (btn) {
            // Adiciona o listener que chama a função 'interagir' com a ação correspondente
            btn.addEventListener('click', () => interagir(item.acao));
        } else {
            // Loga um aviso se um botão esperado não for encontrado
            console.warn(`WARN UI: Botão de ação com ID "${item.id}" não encontrado no DOM.`);
        }
    });

    // Listener para o Controle de Volume
    if (volumeSlider) {
        // Carrega a preferência de volume salva ao iniciar
         try {
             const savedVolume = localStorage.getItem('garagemVolumePref');
             if (savedVolume !== null) {
                 const parsedVolume = parseFloat(savedVolume);
                 // Valida o valor carregado antes de aplicá-lo
                 if(!isNaN(parsedVolume) && parsedVolume >= 0 && parsedVolume <= 1) {
                    volumeSlider.value = parsedVolume;
                 }
             }
         } catch(e) { console.warn("WARN: Erro ao carregar preferência de volume.", e); }
        // Adiciona listener para atualizar o volume quando o slider for movido
        volumeSlider.addEventListener('input', atualizarVolume);
        // Chama uma vez no início para aplicar o volume inicial
        atualizarVolume();
    }

    // --- INICIALIZAÇÃO DA APLICAÇÃO ---
    /** Função principal que inicializa a aplicação quando o DOM está pronto. */
    function inicializarApp() {
        console.log("LOG: Inicializando Garagem Inteligente v4.0...");
        atualizarVolume(); // Aplica volume inicial/salvo
        garagem = carregarGaragem(); // Carrega veículos do localStorage
        atualizarListaVeiculosUI(); // Exibe os veículos na UI
        switchTab('tab-garage'); // Define a aba inicial
        atualizarDisplay(); // Define o estado inicial da UI (sem veículo selecionado)
        console.log("LOG: Aplicação inicializada.");
        adicionarNotificacao("Bem-vindo à Garagem Inteligente v4.0!", "info", 3000); // Mensagem de boas-vindas
    }

    // Garante que a inicialização ocorra apenas após o carregamento completo do HTML.
    if (document.readyState === 'loading') { // Se ainda estiver carregando...
        document.addEventListener('DOMContentLoaded', inicializarApp); // ...espera pelo evento.
    } else { // Se já carregou...
        inicializarApp(); // ...chama a inicialização imediatamente.
    }


    // --- EVENT LISTENERS ---
// ... (outros listeners existentes) ...

// Listener para buscar Detalhes Extras da API Simulada
if (btnVerDetalhesExtras) {
    btnVerDetalhesExtras.addEventListener('click', mostrarDetalhesExtrasAPI);
} else {
    console.warn("WARN UI: Botão #btnVerDetalhesExtras não encontrado!");
}

// Listener para o Controle de Volume
// ... (listener existente) ...  


 /**
  * Função assíncrona chamada ao clicar no botão "Ver Detalhes Extras".
  * Obtém o ID do veículo selecionado, gerencia o estado de carregamento da UI,
  * chama a função `buscarDetalhesVeiculoAPI` e exibe os resultados ou mensagens
  * de erro/não encontrado na div `detalhesExtrasApiDiv`.
  * @async
  */
 async function mostrarDetalhesExtrasAPI() {
    // ... (código da função)
 }

 
})(); // Fim da IIFE (Immediately Invoked Function Expression)