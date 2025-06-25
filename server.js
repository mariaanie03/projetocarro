// Importações
import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Configuração para obter o __dirname em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega variáveis de ambiente do arquivo .env
dotenv.config();

// Carrega os dados do nosso arquivo JSON
let dados = {};
try {
    const rawData = fs.readFileSync(path.join(__dirname, 'dados.json'));
    dados = JSON.parse(rawData);
    console.log('[Servidor] Arquivo dados.json carregado com sucesso.');
} catch (error) {
    console.error('[Servidor ERRO] Não foi possível ler ou parsear o arquivo dados.json:', error);
    process.exit(1); // Encerra se os dados essenciais não puderem ser carregados
}

// Inicializa o aplicativo Express
const app = express();
const port = process.env.PORT || 3001;

// MELHORIA DE SEGURANÇA: Carrega a chave de API de forma segura
const apiKey = process.env.OPENWEATHER_API_KEY;

// Verificação para garantir que a chave foi carregada corretamente
if (!apiKey) {
    console.error('[Servidor ERRO] A variável de ambiente OPENWEATHER_API_KEY não foi definida no arquivo .env.');
    process.exit(1); // Encerra o servidor se a chave não existir
}
console.log('[Servidor] Chave de API da OpenWeatherMap carregada.');


// CORREÇÃO ERRO 404: Middleware para servir arquivos estáticos da pasta 'public'
// Isso permite que seu front-end (index.html, etc.) seja carregado ao acessar a raiz do site.
app.use(express.static(path.join(__dirname, 'public')));


// Middleware para permitir CORS (Cross-Origin Resource Sharing)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// =========================================================
// ----- ENDPOINTS DA API DE CLIMA (Proxy) - COMPLETOS -----
// =========================================================

// Função auxiliar para lidar com erros da API
const handleApiError = (error, res, location) => {
    // MELHORIA: Log de erro mais claro
    console.error(`[Servidor ERRO] Falha ao buscar dados para ${location}:`, error.message);
    const status = error.response ? error.response.status : 500;
    const message = status === 404 ? `Localização não encontrada: ${location}` : "Erro ao contatar a API de clima.";
    res.status(status).json({ error: message });
};

// Endpoint unificado para obter o tempo atual (por cidade ou coordenadas)
app.get('/api/tempoatual', async (req, res) => {
    const { cidade, lat, lon } = req.query;
    let url;
    let locationIdentifier;

    if (cidade) {
        locationIdentifier = cidade;
        url = `https://api.openweathermap.org/data/2.5/weather?q=${cidade}&appid=${apiKey}&units=metric&lang=pt_br`;
    } else if (lat && lon) {
        locationIdentifier = `lat=${lat}, lon=${lon}`;
        url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=pt_br`;
    } else {
        return res.status(400).json({ error: "Parâmetros 'cidade' ou 'lat/lon' são necessários." });
    }

    try {
        console.log(`[Servidor] Buscando tempo atual para: ${locationIdentifier}`);
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        handleApiError(error, res, locationIdentifier);
    }
});

// Endpoint unificado para obter a previsão de 5 dias (por cidade ou coordenadas)
app.get('/api/previsao', async (req, res) => {
    const { cidade, lat, lon } = req.query;
    let url;
    let locationIdentifier;

    // CORREÇÃO: Adicionada a lógica para buscar por lat/lon, que estava faltando.
    if (cidade) {
        locationIdentifier = cidade;
        url = `https://api.openweathermap.org/data/2.5/forecast?q=${cidade}&appid=${apiKey}&units=metric&lang=pt_br`;
    } else if (lat && lon) {
        locationIdentifier = `lat=${lat}, lon=${lon}`;
        url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=pt_br`;
    } else {
        return res.status(400).json({ error: "Parâmetros 'cidade' ou 'lat/lon' são necessários." });
    }

    try {
        console.log(`[Servidor] Buscando previsão para: ${locationIdentifier}`);
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        handleApiError(error, res, locationIdentifier);
    }
});


// =======================================================
// ----- ENDPOINTS DA GARAGEM INTELIGENTE - COMPLETOS -----
// =======================================================

// Endpoint para dicas de manutenção gerais
app.get('/api/dicas-manutencao', (req, res) => {
    console.log('[Servidor] Requisição recebida para /api/dicas-manutencao');
    if (dados.dicasManutencao && dados.dicasManutencao.geral) {
        res.json(dados.dicasManutencao.geral);
    } else {
        res.status(500).json({ error: "Dados de dicas gerais não encontrados no servidor." });
    }
});

// Endpoint para dicas de manutenção por tipo de veículo (com lógica melhorada)
app.get('/api/dicas-manutencao/:tipoVeiculo', (req, res) => {
    const { tipoVeiculo } = req.params;
    console.log(`[Servidor] Requisição recebida para /api/dicas-manutencao/${tipoVeiculo}`);

    const mapeamentoTipos = {
        'carro': 'carro',
        'carroesportivo': 'esportivo',
        'caminhao': 'caminhao'
    };

    const chaveJson = mapeamentoTipos[tipoVeiculo.toLowerCase()];
    const dicas = dados.dicasManutencao && chaveJson ? dados.dicasManutencao[chaveJson] : null;

    if (dicas) {
        res.json(dicas);
    } else {
        res.status(404).json({ error: `Nenhuma dica de manutenção encontrada para o tipo: ${tipoVeiculo}` });
    }
});

// Endpoint para viagens populares
app.get('/api/viagens-populares', (req, res) => {
    console.log('[Servidor] Requisição recebida para /api/viagens-populares');
    if (dados.viagensPopulares) {
        res.json(dados.viagensPopulares);
    } else {
        res.status(500).json({ error: "Dados de viagens populares não encontrados no servidor." });
    }
});

// Inicia o servidor
app.listen(port, () => {
    // MELHORIA: Log mais claro usando template literal
    console.log(`[Servidor] Rodando e escutando em http://localhost:${port}`);
});