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