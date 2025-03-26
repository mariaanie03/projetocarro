// Classes de Veículos
class Veiculo {
    constructor(modelo, cor, combustivelMaximo = 100) {
        this.modelo = modelo;
        this.cor = cor;
        this.ligado = false;
        this.velocidade = 0;
        this.combustivel = combustivelMaximo;
        this.combustivelMaximo = combustivelMaximo;
        this.imagemSrc = "imagens/carro.png"; // Imagem padrão
    }

    ligar() {
        if (this.combustivel > 0) {
            this.ligado = true;
            this.tocarSom("ligarSom");
        } else {
            this.exibirAlerta("Não há combustível para ligar o veículo!");
        }
        this.atualizarStatusVisual();
    }

    desligar() {
        this.ligado = false;
        this.velocidade = 0;
        this.tocarSom("desligarSom");
        this.atualizarStatusVisual();
    }

    acelerar(incremento) {
        if (this.ligado && this.combustivel > 0) {
            if (this.velocidade + incremento <= 200){
                this.velocidade += incremento;
                this.combustivel -= 1;
                this.tocarSom("acelerarSom");
                this.atualizarVelocidadeDisplay();
                this.atualizarAceleracaoBarra();
            } else {
              this.exibirAlerta("Velocidade Maxima atingida");
            }

        } else if (!this.ligado) {
            this.exibirAlerta("O veículo precisa estar ligado para acelerar!");
        } else {
            this.exibirAlerta("O veículo está sem combustível!");
        }
    }

    frear(decremento) {
        if (this.velocidade > 0){
          this.velocidade = Math.max(0, this.velocidade - decremento);
          this.tocarSom("frearSom");
          this.atualizarVelocidadeDisplay();
          this.atualizarAceleracaoBarra();
        } else {
          this.exibirAlerta("o carro ja esta parado");
        }
    }

    pintar(novaCor) {
        this.cor = novaCor;
    }

    mudarModelo(novoModelo) {
        this.modelo = novoModelo;
    }

    buzinar() {
        this.tocarSom("buzinaSom");
    }

    exibirInformacoes() {
        return `Modelo: ${this.modelo}, Cor: ${this.cor}, Ligado: ${this.ligado}, Velocidade: ${this.velocidade} km/h, Combustível: ${this.combustivel}/${this.combustivelMaximo}`;
    }

    usarCombustivel(quantidade) {
        this.combustivel = Math.max(0, this.combustivel - quantidade);
    }

    tocarSom(somId) {
        const som = document.getElementById(somId);
        som.currentTime = 0; // Reinicia o som para que possa tocar novamente rapidamente
        som.play();
    }

    exibirAlerta(mensagem) {
        const alerta = document.getElementById("mensagemAlerta");
        alerta.textContent = mensagem;
        setTimeout(() => {
            alerta.textContent = ""; // Limpa a mensagem após alguns segundos
        }, 3000);
    }

    atualizarStatusVisual() {
        const statusDiv = document.getElementById("status-ligado");
        if (this.ligado) {
            statusDiv.classList.remove("desligado");
            statusDiv.classList.add("ligado");
        } else {
            statusDiv.classList.remove("ligado");
            statusDiv.classList.add("desligado");
        }
    }

    atualizarVelocidadeDisplay() {
        document.getElementById("velocidade-display").querySelector("span").textContent = this.velocidade;
    }

    atualizarAceleracaoBarra() {
        const progresso = document.getElementById("progresso");
        progresso.style.width = `${(this.velocidade / 200) * 100}%`; // Velocidade máxima = 200
    }
    carregar(quantidade) {} // Método vazio para evitar erros
    descarregar(quantidade) {}// Método vazio para evitar erros
    ativarTurbo() {}// Método vazio para evitar erros
    desativarTurbo(){} // Método vazio para evitar erros

}

class CarroEsportivo extends Veiculo {
    constructor(modelo, cor) {
        super(modelo, cor);
        this.turboAtivado = false;
        this.imagemSrc = "imagens/carro_esportivo.png";
    }

    ativarTurbo() {
      if (!(this instanceof CarroEsportivo)) {
        this.exibirAlerta("Essa ação nao pode ser feita para este veiculo");
        return;
      }
        if (this.ligado && this.combustivel > 0) {
            this.turboAtivado = true;
        } else if (!this.ligado) {
            this.exibirAlerta("O veiculo deve estar ligado");
        } else if (this.combustivel <= 0){
             this.exibirAlerta("O veiculo esta sem combustivel")
        }
    }

    desativarTurbo() {
        this.turboAtivado = false;
    }

    acelerar(incremento) {
      if (!(this instanceof CarroEsportivo)) {
        this.exibirAlerta("Essa ação nao pode ser feita para este veiculo");
        return;
      }

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
        this.imagemSrc = "imagens/caminhao.png";
    }

    carregar(quantidade) {
      if (!(this instanceof Caminhao)) {
        this.exibirAlerta("Essa ação nao pode ser feita para este veiculo");
        return;
      }
        if (this.cargaAtual + quantidade <= this.capacidadeCarga) {
            this.cargaAtual += quantidade;
        } else {
             this.exibirAlerta("Capacidade Maxima atingida");
        }
    }

    descarregar(quantidade) {
      if (!(this instanceof Caminhao)) {
        this.exibirAlerta("Essa ação nao pode ser feita para este veiculo");
        return;
      }
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
        this.imagemSrc = "imagens/moto.png";
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
        this.imagemSrc = "imagens/bicicleta.png";
    }

    ligar() {
        this.exibirAlerta("Bicicleta não precisa ser ligada.");
    }

    acelerar(incremento) {
        this.velocidade += incremento;
    }

    frear(decremento) {
        if (this.velocidade > 0){
          this.velocidade = Math.max(0, this.velocidade - decremento);
        } else {
          this.exibirAlerta("a bicicleta ja esta parada");
        }

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
            this.atualizarExibicaoVeiculo();
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
            case "buzinar":
                this.veiculoSelecionado.buzinar();
                break;
            default:
                console.log("Ação inválida.");
        }

        this.exibirInformacoes();
    }

    exibirInformacoes() {
        if (this.veiculoSelecionado) {
            document.getElementById("info").textContent = this.veiculoSelecionado.exibirInformacoes();
        } else {
            document.getElementById("info").textContent = "Nenhum veículo selecionado.";
        }
    }

    atualizarExibicaoVeiculo() {
        if (this.veiculoSelecionado) {
            const img = document.getElementById("veiculo-imagem");
            img.src = this.veiculoSelecionado.imagemSrc;
            img.alt = this.veiculoSelecionado.modelo;

            document.getElementById("combustivel").textContent = `Combustível: ${this.veiculoSelecionado.combustivel}/${this.veiculoSelecionado.combustivelMaximo}`;
            this.veiculoSelecionado.atualizarStatusVisual();
            this.veiculoSelecionado.atualizarVelocidadeDisplay();
            this.veiculoSelecionado.atualizarAceleracaoBarra();
        }
    }

}

// Instancia a Garagem
const garagem = new Garagem();

// Inicializa: Seleciona o primeiro veículo
garagem.selecionarVeiculo(0);