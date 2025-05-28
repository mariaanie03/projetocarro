// server.js

// Carrega variáveis de ambiente do arquivo .env para process.env
require('dotenv').config();

// Importa os módulos necessários
const express = require('express'); // Framework web para Node.js
const axios = require('axios');   // Cliente HTTP para fazer requisições do backend

// Cria uma instância da aplicação Express
const app = express();

// Define a porta do servidor. Usa a variável de ambiente PORT ou 3000 como padrão.
const PORT = process.env.PORT || 3000;

// Obtém a chave da API OpenWeatherMap do arquivo .env
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

// URLs base da API OpenWeatherMap
const OPENWEATHER_BASE_URL_FORECAST = 'https://api.openweathermap.org/data/2.5/forecast';
const OPENWEATHER_BASE_URL_CURRENT = 'https://api.openweathermap.org/data/2.5/weather';

// Verifica se a chave da API está configurada. Se não, encerra o servidor com erro.
if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY === "SUA_CHAVE_OPENWEATHERMAP_AQUI") {
    console.error("ERRO CRÍTICO: A chave da API OpenWeatherMap (OPENWEATHER_API_KEY) não está configurada corretamente no arquivo .env!");
    console.error("Por favor, adicione sua chave ao arquivo .env e reinicie o servidor.");
    process.exit(1); // Encerra o processo com código de erro
}

// Middleware para logar cada requisição recebida pelo servidor (útil para debugging)
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleString('pt-BR')}] Requisição recebida: ${req.method} ${req.url}`);
    next(); // Passa a requisição para o próximo middleware ou rota
});

// Rota para o endpoint /api/forecast (Proxy para a previsão de 5 dias)
app.get('/api/forecast', async (req, res) => {
    try {
        // Extrai os query parameters da requisição do cliente (frontend)
        // Ex: /api/forecast?q=Sao%20Paulo&units=metric
        const clientParams = req.query;

        console.log('Backend: Recebida requisição para /api/forecast com params:', clientParams);

        // Faz a requisição para a API OpenWeatherMap usando axios
        const response = await axios.get(OPENWEATHER_BASE_URL_FORECAST, {
            params: {
                ...clientParams,             // Repassa os parâmetros do cliente (cidade, unidades, etc.)
                appid: OPENWEATHER_API_KEY,  // Adiciona a chave da API de forma segura aqui no backend
                lang: clientParams.lang || 'pt_br' // Garante um idioma padrão se não fornecido
            }
        });

        // Envia a resposta da OpenWeatherMap de volta para o cliente (frontend)
        res.json(response.data);
    } catch (error) {
        // Trata erros que podem ocorrer durante a chamada à API OpenWeatherMap
        console.error("Erro no backend ao buscar previsão (/api/forecast):", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            message: "Erro ao buscar previsão do tempo no servidor.",
            details: error.response?.data || { message: error.message } // Envia detalhes do erro se disponíveis
        });
    }
});

// Rota para o endpoint /api/current-weather (Proxy para o tempo atual)
app.get('/api/current-weather', async (req, res) => {
    try {
        // Extrai os query parameters da requisição do cliente
        const clientParams = req.query;

        console.log('Backend: Recebida requisição para /api/current-weather com params:', clientParams);

        // Faz a requisição para a API OpenWeatherMap
        const response = await axios.get(OPENWEATHER_BASE_URL_CURRENT, {
            params: {
                ...clientParams,
                appid: OPENWEATHER_API_KEY,
                lang: clientParams.lang || 'pt_br'
            }
        });
        // Envia a resposta para o cliente
        res.json(response.data);
    } catch (error) {
        console.error("Erro no backend ao buscar tempo atual (/api/current-weather):", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            message: "Erro ao buscar tempo atual no servidor.",
            details: error.response?.data || { message: error.message }
        });
    }
});

// Middleware para servir arquivos estáticos (HTML, CSS, JS, imagens da sua pasta do projeto)
// '.' significa que o Express servirá arquivos da pasta raiz do projeto.
// Se seu frontend (index.html, css/, images/, script.js) estiver em uma subpasta como 'public',
// você mudaria para: app.use(express.static('public'));
app.use(express.static('.'));

// Inicia o servidor Express para escutar na porta definida
app.listen(PORT, () => {
    console.log(`Servidor da "Garagem Inteligente" rodando em http://localhost:${PORT}`);
    console.log(`Frontend principal deve estar acessível em http://localhost:${PORT}/index.html (ou apenas /)`);
});