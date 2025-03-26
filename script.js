// Classes de Veículos
class Veiculo {
    constructor(modelo, cor, combustivelMaximo = 100) {
        this.modelo = modelo;
        this.cor = cor;
        this.ligado = false;
        this.velocidade = 0;
        this.combustivel = combustivelMaximo;
        this.combustivelMaximo = combustivelMaximo;
    }

    ligar() {
        if (this.combustivel > 0) {
            this.ligado = true;
        }
    }

    desligar() {
        this.ligado = false;
        this.velocidade = 0;
    }

    acelerar(incremento) {
        if (this.ligado && this.combustivel > 0) {
            this.velocidade += incremento;
            this.combustivel -= 1;
        }
    }

    frear(decremento) {
        this.velocidade = Math.max(0, this.velocidade - decremento);
    }

    pintar(novaCor) {
        this.cor = novaCor;
    }

    mudarModelo(novoModelo) {
        this.modelo = novoModelo;
    }

    buzinar() {
        const buzinaSom = document.getElementById("buzinaSom");
        buzinaSom.play(); // Toca o som da buzina
    }

    exibirInformacoes() {
        return `Modelo: ${this.modelo}, Cor: ${this.cor}, Ligado: ${this.ligado}, Velocidade: ${this.velocidade} km/h, Combustível: ${this.combustivel}/${this.combustivelMaximo}`;
    }

    usarCombustivel(quantidade) {
        this.combustivel = Math.max(0, this.combustivel - quantidade);
    }

    carregar(quantidade) {}
    descarregar(quantidade) {}
    ativarTurbo() {}
    desativarTurbo(){}
}

class CarroEsportivo extends Veiculo {
    constructor(modelo, cor) {
        super(modelo, cor);
        this.turboAtivado = false;
    }

    ativarTurbo() {
        if (this.ligado && this.combustivel > 0) {
            this.turboAtivado = true;
        }
    }

    desativarTurbo() {
        this.turboAtivado = false;
    }

    acelerar(incremento) {
        let incrementoTurbo = this.turboAtivado ? incremento * 2 : incremento;
        super.acelerar(incrementoTurbo);
        if (this.turboAtivado && this.ligado && this.combustivel > 0) {
             this.usarCombustivel(2);
        }
    }

    exibirInformacoes() {
        return `${super.exibirInformacoes()}, Turbo: ${this.turboAtivado ? 'Ativado' : 'Desativado'}`;
    }
}

class Caminhao extends Veiculo {
    constructor(modelo, cor, capacidadeCarga) {
        super(modelo, cor);
        this.capacidadeCarga = capacidadeCarga;
        this.cargaAtual = 0;
    }

    carregar(quantidade) {
        if (this.cargaAtual + quantidade <= this.capacidadeCarga) {
            this.cargaAtual += quantidade;
        }
    }

    descarregar(quantidade) {
        this.cargaAtual = Math.max(0, this.cargaAtual - quantidade);
    }

    acelerar(incremento) {
        super.acelerar(incremento);
        if(this.ligado && this.combustivel > 0){
             this.usarCombustivel(0.5);
        }
    }

    exibirInformacoes() {
        return `${super.exibirInformacoes()}, Carga: ${this.cargaAtual}/${this.capacidadeCarga}`;
    }
}

class Moto extends Veiculo {
    constructor(modelo, cor) {
        super(modelo, cor, 50);
    }

    acelerar(incremento) {
        super.acelerar(incremento);
        if(this.ligado && this.combustivel > 0){
             this.usarCombustivel(1.5);
        }
    }

    exibirInformacoes() {
        return `${super.exibirInformacoes()}, Tipo: Moto`;
    }
}

class Bicicleta extends Veiculo {
    constructor(modelo, cor) {
        super(modelo, cor, Infinity);
    }

    ligar() {
    }

    acelerar(incremento) {
        this.velocidade += incremento;
    }

    exibirInformacoes() {
        return `${super.exibirInformacoes()}, Tipo: Bicicleta (Não usa combustível)`;
    }
}

// Classe Garagem
class Garagem {
    constructor() {
        this.veiculos = [
            new Veiculo("Civic", "Prata"),
            new CarroEsportivo("Ferrari", "Vermelha"),
            new Caminhao("Volvo", "Branco", 1000),
            new Moto("Harley", "Preta"),
            new Bicicleta("Caloi", "Verde")
        ];
        this.veiculoSelecionado = null;
    }

    adicionarVeiculo(veiculo) {
        this.veiculos.push(veiculo);
    }

    selecionarVeiculo(index) {
        if (index >= 0 && index < this.veiculos.length) {
            this.veiculoSelecionado = this.veiculos[index];
            this.atualizarCombustivelInfo();
            this.exibirInformacoes();
        } else {
            console.log("Veículo não encontrado.");
        }
    }

    interagir(acao) {
        if (!this.veiculoSelecionado) {
            console.log("Selecione um veículo primeiro!");
            return;
        }

        switch (acao) {
            case "ligar":
                this.veiculoSelecionado.ligar();
                break;
            case "desligar":
                this.veiculoSelecionado.desligar();
                break;
            case "acelerar":
                this.veiculoSelecionado.acelerar(10);
                break;
            case "frear":
                this.veiculoSelecionado.frear(5);
                break;
            case "ativarTurbo":
                this.veiculoSelecionado.ativarTurbo();
                break;
            case "desativarTurbo":
                this.veiculoSelecionado.desativarTurbo();
                break;
            case "carregar":
                this.veiculoSelecionado.carregar(200);
                break;
            case "descarregar":
                this.veiculoSelecionado.descarregar(100);
                break;
            case "pintar":
                const novaCor = document.getElementById("novaCor").value;
                this.veiculoSelecionado.pintar(novaCor);
                break;
            case "mudarModelo":
                const novoModelo = document.getElementById("novoModelo").value;
                this.veiculoSelecionado.mudarModelo(novoModelo);
                break;
            case "buzinar": // Nova ação para buzinar
                this.veiculoSelecionado.buzinar();
                break;
            default:
                console.log("Ação inválida.");
        }

        this.atualizarCombustivelInfo();
        this.exibirInformacoes();
    }

    exibirInformacoes() {
        if (this.veiculoSelecionado) {
            document.getElementById("info").textContent = this.veiculoSelecionado.exibirInformacoes();
        } else {
            document.getElementById("info").textContent = "Nenhum veículo selecionado.";
        }
    }

    atualizarCombustivelInfo() {
        if (this.veiculoSelecionado) {
            document.getElementById("combustivel").textContent = `Combustível: ${this.veiculoSelecionado.combustivel}/${this.veiculoSelecionado.combustivelMaximo}`;
        } else {
            document.getElementById("combustivel").textContent = "";
        }
    }
}

// Instancia a Garagem
const garagem = new Garagem();

// Inicializa: Seleciona o primeiro veículo
garagem.selecionarVeiculo(0);