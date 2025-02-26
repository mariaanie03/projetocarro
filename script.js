class Carro {
    constructor(modelo, cor) {
      this.modelo = modelo;
      this.cor = cor;
      this.ligado = false;
    }
  
    ligar() {
      if (!this.ligado) {
        this.ligado = true;
        console.log("Carro ligado!");
      } else {
        console.log("O carro já está ligado.");
      }
      this.atualizarStatus();
    }
  
    desligar() {
      if (this.ligado) {
        this.ligado = false;
        console.log("Carro desligado!");
      } else {
        console.log("O carro já está desligado.");
      }
      this.atualizarStatus();
    }
  
    atualizarStatus() {
      const statusElement = document.getElementById("status");
      if (this.ligado) {
        statusElement.textContent = "Ligado";
        statusElement.classList.remove("desligado"); // Remove a classe "desligado"
        statusElement.classList.add("ligado");    // Adiciona a classe "ligado"
      } else {
        statusElement.textContent = "Desligado";
        statusElement.classList.remove("ligado");    // Remove a classe "ligado"
        statusElement.classList.add("desligado");   // Adiciona a classe "desligado"
      }
    }
  }
  
  // Criar um objeto Carro
  const meuCarro = new Carro("Bugatti", "Azul");
  
  // Atualizar a interface com os dados do carro
  document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("modelo").textContent = meuCarro.modelo;
    document.getElementById("cor").textContent = meuCarro.cor;
    meuCarro.atualizarStatus(); // Inicializa o status na página
  
    // Adicionar evento ao botão
    const botaoLigarDesligar = document.getElementById("ligar-desligar");
    botaoLigarDesligar.addEventListener("click", function() {
      if (meuCarro.ligado) {
        meuCarro.desligar();
        botaoLigarDesligar.textContent = "Ligar";
      } else {
        meuCarro.ligar();
        botaoLigarDesligar.textContent = "Desligar";
      }
    });
  });