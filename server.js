// server.js

// 1. Importar as dependências
require('dotenv').config(); // Carrega as variáveis do arquivo .env para process.env
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path'); // Módulo para lidar com caminhos de arquivos

// 2. Inicializar o aplicativo Express
const app = express();
// Usa a porta do .env ou 3001 como padrão. A porta 3000 é comum, então mudei para ela.
const PORT = process.env.PORT || 3000; 

// 3. Configurar Middlewares
// Habilita o CORS para todas as rotas. Permite que o frontend (mesmo em outra porta) acesse o backend.
app.use(cors()); 
// Para parsear JSON no corpo das requisições (útil para POSTs)
app.use(express.json()); 

// 4. Servir os arquivos estáticos do frontend (HTML, CSS, JS, etc.)
// A melhor prática é servir a partir de uma pasta raiz ou 'public'.
// __dirname é o diretório onde o server.js está localizado.
app.use(express.static(path.join(__dirname)));


// 5. Definir a Rota para a Previsão do Tempo (API Proxy)
app.get('/api/weather', async (req, res) => {
    const cidade = req.query.cidade; // Pega o parâmetro 'cidade' da URL (ex: /api/weather?cidade=Londres)
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!cidade) {
        return res.status(400).json({ message: "Parâmetro 'cidade' é obrigatório." });
    }

    if (!apiKey) {
        console.error("ERRO: Chave da API OpenWeatherMap não encontrada no arquivo .env");
        return res.status(500).json({ message: "Erro interno do servidor: Configuração da API ausente." });
    }

    const openWeatherUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cidade)}&appid=${apiKey}&units=metric&lang=pt_br`;

    try {
        console.log(`[BACKEND] Buscando previsão para '${cidade}'...`);
        const weatherResponse = await axios.get(openWeatherUrl);

        // Envia a resposta da API OpenWeatherMap diretamente para o cliente
        console.log(`[BACKEND] Sucesso! Enviando dados para o frontend.`);
        res.json(weatherResponse.data);

    } catch (error) {
        // Trata os erros de forma mais detalhada
        if (error.response) {
            // O erro veio da API da OpenWeatherMap (ex: cidade não encontrada, chave inválida)
            console.error(`[BACKEND] Erro da API OpenWeatherMap: ${error.response.status} -`, error.response.data);
            res.status(error.response.status).json({
                message: error.response.data.message || "Erro ao buscar previsão do tempo.",
                details: error.response.data
            });
        } else {
            // Outros erros (ex: problema de rede no servidor backend, erro de DNS)
            console.error("[BACKEND] Erro de rede ou de sistema ao tentar contatar a API:", error.message);
            res.status(500).json({ message: "Erro interno do servidor ao processar a requisição de clima." });
        }
    }
});


// Rota principal para servir o index.html (opcional, mas bom para garantir)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 6. Iniciar o Servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
    console.log(`✅ Frontend e API acessíveis em http://localhost:${PORT}`);
});