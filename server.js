// server.js

// Importações
import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
// ADICIONADO: Importação do Mongoose para interagir com o MongoDB
import mongoose from 'mongoose';

// Configuração para obter o __dirname em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega variáveis de ambiente do arquivo .env
dotenv.config();

// ADICIONADO: ---- Início da Lógica de Conexão com MongoDB ----

// Pega a string de conexão das variáveis de ambiente
const mongoUriCrud = process.env.MONGO_URI_CRUD;

// Função de conexão robusta com o Mongoose
async function connectCrudDB() {
    // Se já estiver conectado, não tenta conectar novamente
    if (mongoose.connections[0].readyState) {
        console.log("[Mongoose] Conexão já estabelecida.");
        return;
    }

    // Validação essencial: verifica se a string de conexão foi definida
    if (!mongoUriCrud) {
        console.error("[Mongoose ERRO FATAL] A variável de ambiente MONGO_URI_CRUD não foi definida! A aplicação não pode se conectar ao banco de dados.");
        return;
    }

    try {
        // Opções de conexão para maior robustez
        const options = {
            serverSelectionTimeoutMS: 5000, // Timeout para selecionar um servidor (5s)
            connectTimeoutMS: 10000,        // Timeout para a conexão inicial (10s)
        };

        // Tenta conectar ao banco de dados
        await mongoose.connect(mongoUriCrud, options);

        console.log("🚀 [Mongoose] Conectado com sucesso ao MongoDB Atlas (CRUD)!");

        // Opcional: Listeners para eventos de conexão para monitoramento contínuo
        mongoose.connection.on('disconnected', () => console.warn("⚠️ [Mongoose] Desconectado do MongoDB!"));
        mongoose.connection.on('error', (err) => console.error("❌ [Mongoose] Erro de conexão:", err));

    } catch (err) {
        console.error("❌ [Mongoose ERRO FATAL] Falha ao conectar ao MongoDB (CRUD):", err.message);
        console.error("-> Verifique sua MONGO_URI_CRUD (no .env local e nas variáveis de ambiente do Render).");
        console.error("-> Verifique o acesso de rede (IP Whitelist) no painel do Atlas.");
        console.error("-> Verifique as credenciais do usuário do banco de dados.");
    }
}

// Chama a função para iniciar a conexão com o banco de dados assim que o servidor carrega
connectCrudDB();

// ADICIONADO: ---- Fim da Lógica de Conexão com MongoDB ----


// Carrega os dados do nosso arquivo JSON
let dados = {};
try {
    const rawData = fs.readFileSync(path.join(__dirname, 'dados.json'));
    dados = JSON.parse(rawData);
    console.log('[Servidor] Arquivo dados.json carregado com sucesso.');
} catch (error) {
    console.error('[Servidor ERRO] Não foi possível ler ou parsear o arquivo dados.json:', error);
    process.exit(1);
}

// Inicializa o aplicativo Express
const app = express();
const port = process.env.PORT || 3000;

// MELHORIA DE SEGURANÇA: Carrega a chave de API de forma segura
const apiKey = process.env.OPENWEATHER_API_KEY;

if (!apiKey) {
    console.error('[Servidor ERRO] A variável de ambiente OPENWEATHER_API_KEY não foi definida no arquivo .env.');
    // Não encerra o processo para permitir que o resto da aplicação funcione sem clima.
    // process.exit(1); 
} else {
    console.log('[Servidor] Chave de API da OpenWeatherMap carregada.');
}

// Servir arquivos estáticos da pasta raiz do projeto
app.use(express.static(__dirname));

// Middleware para permitir CORS (Cross-Origin Resource Sharing)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Função auxiliar para lidar com erros da API de clima
const handleApiError = (error, res, location) => {
    console.error(`[Servidor ERRO] Falha ao buscar dados para ${location}:`, error.message);
    const status = error.response ? error.response.status : 500;
    const message = status === 404 ? `Localização não encontrada: ${location}` : "Erro ao contatar a API de clima.";
    res.status(status).json({ error: message, message: message }); // Adiciona 'message' para consistência
};

// =========================================================
// ----- ENDPOINTS DA API DE CLIMA (Proxy) -----
// =========================================================
app.get('/api/previsao', async (req, res) => {
    const { cidade, lat, lon } = req.query;
    let url;
    let locationIdentifier;

    if (!apiKey) {
         return res.status(503).json({ error: "O serviço de clima está temporariamente indisponível.", message: "A chave da API não foi configurada no servidor." });
    }

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
// ----- ENDPOINTS DA GARAGEM INTELIGENTE (lendo de dados.json) -----
// =======================================================

// Endpoint para detalhes de veículos
app.get('/api/veiculos/detalhes', (req, res) => {
    console.log('[Servidor] Requisição recebida para /api/veiculos/detalhes');
    const detalhesVeiculos = {
        carro1: dados.carro1,
        esportivo1: dados.esportivo1,
        caminhao1: dados.caminhao1,
    };
    if (detalhesVeiculos) {
        res.json(detalhesVeiculos);
    } else {
         res.status(500).json({ error: "Dados de detalhes dos veículos não encontrados no servidor." });
    }
});

// Endpoint para dicas de manutenção gerais
app.get('/api/dicas-manutencao', (req, res) => {
    console.log('[Servidor] Requisição recebida para /api/dicas-manutencao');
    if (dados.dicasManutencao && dados.dicasManutencao.geral) {
        res.json(dados.dicasManutencao.geral);
    } else {
        res.status(500).json({ error: "Dados de dicas gerais não encontrados no servidor." });
    }
});

// Endpoint para dicas de manutenção por tipo de veículo
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

// Endpoints para a Vitrine da Garagem
app.get('/api/garagem/veiculos-destaque', (req, res) => {
    console.log('[Servidor] Requisição recebida para /api/garagem/veiculos-destaque');
    if (dados.veiculosDestaque) {
        res.json(dados.veiculosDestaque);
    } else {
        res.status(500).json({ error: "Dados de veículos em destaque não encontrados no servidor." });
    }
});

app.get('/api/garagem/servicos-oferecidos', (req, res) => {
    console.log('[Servidor] Requisição recebida para /api/garagem/servicos-oferecidos');
    if (dados.servicosOferecidos) {
        res.json(dados.servicosOferecidos);
    } else {
        res.status(500).json({ error: "Dados de serviços não encontrados no servidor." });
    }
});


// Inicia o servidor
app.listen(port, () => {
    console.log(`[Servidor] Rodando e escutando em http://localhost:${port}`);
});