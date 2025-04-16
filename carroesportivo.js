
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