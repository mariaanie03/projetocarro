# Plano de Caça-Fantasmas - Garagem Virtual Interativa

## Prioridade Alta (Bugs Críticos)

- [ ] **Problema:** Inconsistência na validação do campo "Placa" entre Frontend (HTML), Backend (Express-Validator) e Modelo Mongoose.
  - **Detalhe:**
    *   No `index.html`, o input de placa tem `minlength="7" maxlength="7"`.
    *   No `server.js`, o `express-validator` usa `isAlphanumeric().isLength({ min: 7, max: 7 })`. Isso permite qualquer letra ou número, mas a posição da letra para Mercosul (LLLNLNN) não é garantida.
    *   No `Veiculo.js` (modelo Mongoose), o `match` regex (`/^[A-Z]{3}\d{1}[A-Z]{1}\d{2}$|^[A-Z]{3}\d{4}$/`) é mais flexível, aceitando tanto o formato antigo (LLLNNNN) quanto o Mercosul (LLLNLNN).
    *   Essa diferença pode fazer com que o frontend aceite algo que o `express-validator` rejeite, ou que o `express-validator` aceite algo que o modelo Mongoose rejeite, levando a erros inesperados para o usuário.
  - **Hipótese:** Desalinhamento nas regras de validação entre as camadas da aplicação.
  - **Como Investigar:**
    1.  Testar o formulário de adicionar/editar veículo com placas em diferentes formatos (ex: "ABC1234", "ABC1D23", "ABCDEFG", "1234567") e observar as mensagens de erro no frontend e no console do servidor.
    2.  **Ação Recomendada:** Unificar a validação. Sugere-se usar o regex do Mongoose no frontend (via `pattern` no input HTML ou JS) e no `express-validator` para garantir consistência. O `isAlphanumeric()` no `express-validator` é muito genérico para o padrão de placa.

- [ ] **Problema:** Duplicação do campo "Ano" no formulário de adicionar novo veículo (`index.html`).
  - **Detalhe:** No `<form id="form-add-veiculo">` em `index.html`, há dois inputs com `id="ano-veiculo"`. O `document.getElementById('ano-veiculo')` no `script.js` sempre retornará apenas o primeiro elemento encontrado, fazendo com que o valor do segundo input seja ignorado.
  - **Hipótese:** Erro de cópia/colagem no HTML.
  - **Como Investigar:**
    1.  Preencher valores diferentes nos dois campos "Ano" no navegador e tentar adicionar um veículo. Observar qual valor é enviado para o backend (via aba 'Network' no console do navegador).
    2.  **Ação Recomendada:** Remover o campo duplicado no `index.html`, mantendo apenas um `<input type="number" id="ano-veiculo" ...>`.

- [ ] **Problema:** O método `Veiculo.exibirInformacoes()` (e a versão sobrescrita em `CarroEsportivo`) não é utilizado no `script.js`.
  - **Detalhe:** A função `atualizarDisplayVeiculo` no `script.js` constrói o HTML das informações do veículo manualmente (usando `document.createElement`, `appendChild`, etc.), em vez de chamar o método `exibirInformacoes` das classes de veículo. O método existe, mas não é invocado.
  - **Hipótese:** Refatoração de código que removeu a chamada ao método, mas não o próprio método. A nova abordagem de construção manual é mais segura contra XSS.
  - **Como Investigar:**
    1.  **Ação Recomendada:** Decidir se a construção manual do HTML em `atualizarDisplayVeiculo` é a abordagem final. Se sim, os métodos `exibirInformacoes()` na classe `Veiculo` e `CarroEsportivo` podem ser removidos para evitar código morto. Se a intenção era que as classes gerassem seu próprio HTML, a `atualizarDisplayVeiculo` precisaria ser ajustada para chamá-los. A abordagem atual é mais robusta contra injeção de HTML.

## Prioridade Média (Melhorias de UX ou Bugs Importantes)

- [ ] **Problema:** Redundância na aplicação do middleware `apiLimiter` no `server.js`.
  - **Detalhe:** A linha `app.use('/api/', apiLimiter);` aparece duas vezes no `server.js`. Embora `express` geralmente processe middlewares na ordem e não duplique o efeito exato do `rateLimit` (que já gerencia a contagem por IP), é uma duplicação desnecessária.
  - **Hipótese:** Erro de cópia/colagem ou inserção acidental.
  - **Como Investigar:**
    1.  Remover uma das linhas `app.use('/api/', apiLimiter);` e reiniciar o servidor para garantir que o limitador de taxa continue funcionando normalmente.

## Prioridade Baixa (Bugs Menores ou Estéticos)

- [ ] **Problema:** Transição de opacidade da caixa de alerta (`alerta-container`) pode ser inconsistente.
  - **Detalhe:** A função `mostrarAlerta` usa `setTimeout(() => { alertaContainer.style.opacity = 1; }, 10);` para forçar a transição de entrada. Embora funcional na maioria dos casos, isso é um hack. O ideal é que a opacidade inicial (0) já esteja definida no CSS para o estado oculto e a transição seja acionada adicionando/removendo uma classe.
  - **Hipótese:** Pequeno problema de timing ou inconsistência de renderização em alguns navegadores.
  - **Como Investigar:**
    1.  **Ação Recomendada:** Modificar o CSS para que `.alerta-container` tenha `opacity: 0; transition: opacity 0.4s ease-in-out;` por padrão. Na função `mostrarAlerta`, em vez de definir `style.opacity = 1;`, adicione uma classe (ex: `alerta-visivel`) que defina `opacity: 1;`. Ao esconder, remova a classe. Isso aproveita melhor as capacidades de transição do CSS.