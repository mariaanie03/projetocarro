// File: backend/server.js
import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import mongoose from 'mongoose';
import cors from 'cors'; // Importação do CORS

// Importa o modelo do Mongoose
import Veiculo from './models/Veiculo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors()); // Habilita o CORS para todas as rotas

// Conexão com o MongoDB
const mongoUriCrud = process.env.MONGO_URI_CRUD;
async function connectCrudDB() {
    if (!mongoUriCrud) {
        return console.error("[Mongoose ERRO] MONGO_URI_CRUD não foi definida no .env");
    }
    try {
        await mongoose.connect(mongoUriCrud);
        console.log("🚀 [Mongoose] Conectado com sucesso ao MongoDB!");
    } catch (err) {
        console.error("❌ [Mongoose ERRO] Falha ao conectar ao MongoDB:", err.message);
    }
}
connectCrudDB();

// Carrega dados estáticos do JSON
let dados = {};
try {
    const rawData = fs.readFileSync(path.join(__dirname, 'dados.json'));
    dados = JSON.parse(rawData);
} catch (error) {
    console.error('[Servidor ERRO] Não foi possível ler dados.json:', error);
}

const port = process.env.PORT || 3000;
const apiKey = process.env.OPENWEATHER_API_KEY;

// =========================================================
// ----- ROTAS DA API CRUD DE VEÍCULOS (MongoDB) -----
// =========================================================

// CREATE
app.post('/api/veiculos', async (req, res) => {
    try {
        const veiculo = await Veiculo.create(req.body);
        res.status(201).json(veiculo);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Veículo com esta placa já existe.' });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(' ') });
        }
        res.status(500).json({ message: 'Erro interno ao criar veículo.' });
    }
});

// READ (All)
app.get('/api/veiculos', async (req, res) => {
    try {
        const veiculos = await Veiculo.find().sort({ createdAt: -1 });
        res.status(200).json(veiculos);
    } catch (error) {
        res.status(500).json({ message: 'Erro interno ao buscar veículos.' });
    }
});

// DELETE
app.delete('/api/veiculos/:id', async (req, res) => {
    try {
        const veiculoDeletado = await Veiculo.findByIdAndDelete(req.params.id);
        if (!veiculoDeletado) {
            return res.status(404).json({ message: 'Veículo não encontrado.' });
        }
        res.status(200).json({ message: 'Veículo deletado com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar veículo.' });
    }
});


// ====================================================================
// ----- DEMAIS ENDPOINTS (Clima, Dicas, etc. lendo de dados.json) -----
// ====================================================================
app.get('/api/previsao', async (req, res) => {
    const { cidade } = req.query;
    if (!apiKey) {
        return res.status(503).json({ message: "Serviço de clima indisponível." });
    }
    if (!cidade) {
        return res.status(400).json({ message: "Parâmetro 'cidade' é necessário." });
    }
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${cidade}&appid=${apiKey}&units=metric&lang=pt_br`;
    try {
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ message: `Erro ao buscar previsão: ${error.response?.data?.message || error.message}`});
    }
});

app.get('/api/garagem/veiculos-destaque', (req, res) => {
    res.json(dados.veiculosDestaque || []);
});

app.get('/api/garagem/servicos-oferecidos', (req, res) => {
    res.json(dados.servicosOferecidos || []);
});

app.listen(port, () => {
    console.log(`[Servidor] Rodando e escutando em http://localhost:${port}`);
});