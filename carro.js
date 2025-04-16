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