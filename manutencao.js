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