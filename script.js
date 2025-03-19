class Carro {
    constructor(modelo, cor) {
      this.modelo = modelo;
      this.cor = cor;
      this.ligado = false;
      this.velocidade = 0;
    }
  
    ligar() {
      this.ligado = true;
    }
  
    desligar() {
      this.ligado = false;
      this.velocidade = 0;
    }
  
    acelerar(incremento) {
      if (this.ligado) {
        this.velocidade += incremento;
      }
    }
  
    frear(decremento) {
      this.velocidade -= decremento;
      if (this.velocidade < 0) {
        this.velocidade = 0;
      }
    }
  }
  
  class CarroEsportivo extends Carro {
    constructor(modelo, cor) {
      super(modelo, cor);
      this.turboAtivado = false;
    }
  
    ativarTurbo() {
      if (this.ligado) {
        this.turboAtivado = true;
        this.acelerar(50);
      }
    }
  }
  
  class Caminhao extends Carro {
    constructor(modelo, cor, capacidadeCarga) {
      super(modelo, cor);
      this.capacidadeCarga = capacidadeCarga;
      this.cargaAtual = 0;
    }
  
    carregar(peso) {
      if (this.cargaAtual + peso <= this.capacidadeCarga) {
        this.cargaAtual += peso;
      }
    }
  }
  
  
  const carroEsportivo = new CarroEsportivo("Ferrari", "Vermelha");
  const caminhao = new Caminhao("Volvo", "Azul", 10000);
  
  function atualizarCarroEsportivo() {
    document.getElementById("modeloEsportivo").textContent = carroEsportivo.modelo;
    document.getElementById("corEsportivo").textContent = carroEsportivo.cor;
    document.getElementById("ligadoEsportivo").textContent = carroEsportivo.ligado ? "Sim" : "Não";
    document.getElementById("velocidadeEsportivo").textContent = carroEsportivo.velocidade;
    document.getElementById("turboEsportivo").textContent = carroEsportivo.turboAtivado ? "Sim" : "Não";
  }
  
  function atualizarCaminhao() {
    document.getElementById("modeloCaminhao").textContent = caminhao.modelo;
    document.getElementById("corCaminhao").textContent = caminhao.cor;
    document.getElementById("ligadoCaminhao").textContent = caminhao.ligado ? "Sim" : "Não";
    document.getElementById("velocidadeCaminhao").textContent = caminhao.velocidade;
    document.getElementById("capacidadeCarga").textContent = caminhao.capacidadeCarga;
    document.getElementById("cargaAtual").textContent = caminhao.cargaAtual;
  }
  
  document.getElementById("ligarEsportivoBtn").addEventListener("click", () => {
    carroEsportivo.ligar();
    atualizarCarroEsportivo();
  });
  
  document.getElementById("desligarEsportivoBtn").addEventListener("click", () => {
    carroEsportivo.desligar();
    atualizarCarroEsportivo();
  });
  
  document.getElementById("acelerarEsportivoBtn").addEventListener("click", () => {
    carroEsportivo.acelerar(10);
    atualizarCarroEsportivo();
  });
  
  document.getElementById("frearEsportivoBtn").addEventListener("click", () => {
    carroEsportivo.frear(10);
    atualizarCarroEsportivo();
  });
  
  document.getElementById("ativarTurboBtn").addEventListener("click", () => {
    carroEsportivo.ativarTurbo();
    atualizarCarroEsportivo();
  });
  
  document.getElementById("ligarCaminhaoBtn").addEventListener("click", () => {
    caminhao.ligar();
    atualizarCaminhao();
  });
  
  document.getElementById("desligarCaminhaoBtn").addEventListener("click", () => {
    caminhao.desligar();
    atualizarCaminhao();
  });
  
  document.getElementById("acelerarCaminhaoBtn").addEventListener("click", () => {
    caminhao.acelerar(5);
    atualizarCaminhao();
  });
  
  document.getElementById("frearCaminhaoBtn").addEventListener("click", () => {
    caminhao.frear(5);
    atualizarCaminhao();
  });
  
  document.getElementById("carregarCaminhaoBtn").addEventListener("click", () => {
    const peso = parseInt(document.getElementById("pesoCarga").value);
    caminhao.carregar(peso);
    atualizarCaminhao();
  });
  
  atualizarCarroEsportivo();
  atualizarCaminhao();