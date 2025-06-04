// server.js

// 1. Importar as dependências
require('dotenv').config(); // Carrega as variáveis do arquivo .env para process.env
const express = require('express');
const axios = require('axios');
const cors = require('cors'); // Importa o pacote CORS

// 2. Inicializar o aplicativo Express
const app = express();
const PORT = process.env.PORT || 3001; // Usa a porta do .env ou 3001 como padrão

// 3. Configurar Middlewares
app.use(cors()); // Habilita o CORS para todas as rotas. Para produção, configure origens específicas.
app.use(express.json()); // Para parsear JSON no corpo das requisições (útil para POSTs, não usado neste exemplo GET)

// 4. Definir a Rota para a Previsão do Tempo
app.get('/api/weather', async (req, res) => {
    const cidade = req.query.cidade; // Pega o parâmetro 'cidade' da URL (ex: /api/weather?cidade=Londres)
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!cidade) {
        return res.status(400).json({ message: "Parâmetro 'cidade' é obrigatório." });
    }

    if (!apiKey) {
        console.error("Chave da API OpenWeatherMap não encontrada no .env");
        return res.status(500).json({ message: "Erro interno do servidor: Configuração da API ausente." });
    }

    const openWeatherUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cidade)}&appid=${apiKey}&units=metric&lang=pt_br`;

    try {
        console.log(`Backend: Buscando previsão para ${cidade} na URL: ${openWeatherUrl}`);
        const weatherResponse = await axios.get(openWeatherUrl);

        // Envia a resposta da API OpenWeatherMap diretamente para o cliente
        // O frontend já tem a lógica para processar 'weatherResponse.data'
        res.json(weatherResponse.data);

    } catch (error) {
        console.error("Backend: Erro ao buscar dados da OpenWeatherMap:", error.response ? error.response.data : error.message);
        
        if (error.response) {
            // Se o erro veio da API OpenWeatherMap (ex: cidade não encontrada, chave inválida)
            res.status(error.response.status).json({
                message: error.response.data.message || "Erro ao buscar previsão do tempo.",
                details: error.response.data
            });
        } else {
            // Outros erros (ex: problema de rede no servidor backend)
            res.status(500).json({ message: "Erro interno do servidor ao processar a requisição de clima." });
        }
    }
});

// 5. Opcional: Servir os arquivos estáticos do frontend (HTML, CSS, JS da Garagem)
// Isso permite que você acesse sua aplicação inteira (frontend + backend) pela porta do backend.
// Se você estiver usando o Live Server do VS Code ou similar para o frontend,
// e o backend rodar em outra porta, o CORS já configurado acima é essencial.
// Se quiser servir tudo pelo Node.js:
// Crie uma pasta chamada 'public' e mova index.html, script.js, css/, sounds/, dados_veiculos_api.json para dentro dela.
// Então, descomente a linha abaixo:
// app.use(express.static('public'));
// Se seus arquivos estáticos estão na raiz (como no exemplo original), use:
app.use(express.static(__dirname)); // Serve arquivos da raiz do projeto (index.html, script.js, etc.)
                                    // CUIDADO: Isso também pode expor server.js, .env se não forem devidamente protegidos
                                    // A melhor prática é usar uma pasta 'public' dedicada.

// 6. Iniciar o Servidor
app.listen(PORT, () => {
    console.log(`Servidor backend rodando na porta ${PORT}`);
    console.log(`Frontend acessível em http://localhost:${PORT} (se servindo arquivos estáticos)`);
});