// server.js

// =======================================================
// ----- IMPORTAÇÕES -----
// =======================================================
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Veiculo from './models/Veiculo.js';

// =======================================================
// ----- CONFIGURAÇÃO INICIAL -----
// =======================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3000;

// =======================================================
// ----- CONEXÃO COM O BANCO DE DADOS -----
// =======================================================
mongoose.connect(process.env.MONGO_URI_CRUD).then(() => {
    console.log("🚀 [Mongoose] Conectado com sucesso ao MongoDB Atlas!");
}).catch(err => {
    console.error("❌ [Mongoose ERRO FATAL] Falha ao conectar:", err.message);
});

// =======================================================
// ----- MIDDLEWARES E DADOS ESTÁTICOS -----
// =======================================================
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Carrega os dados do arquivo JSON para as dicas
let dados = {};
try {
    const rawData = fs.readFileSync(path.join(__dirname, 'dados.json'));
    dados = JSON.parse(rawData);
} catch (error) {
    console.error('[Servidor ERRO] Não foi possível carregar dados.json:', error);
}

// =======================================================
// ----- ROTAS DA API -----
// =======================================================

// --- ROTAS CRUD PARA VEÍCULOS (DO MONGODB) ---
app.post('/api/veiculos', async (req, res) => {
    try {
        const veiculoCriado = await Veiculo.create(req.body);
        res.status(201).json(veiculoCriado);
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: 'Placa já existe.' });
        if (error.name === 'ValidationError') return res.status(400).json({ message: Object.values(error.errors).map(e => e.message).join(', ') });
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

app.get('/api/veiculos', async (req, res) => {
    try {
        const todosOsVeiculos = await Veiculo.find({}).sort({ createdAt: -1 }); // Ordena pelos mais recentes
        res.status(200).json(todosOsVeiculos);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar veículos.' });
    }
});

app.delete('/api/veiculos/:id', async (req, res) => {
    try {
        const resultado = await Veiculo.findByIdAndDelete(req.params.id);
        if (!resultado) return res.status(404).json({ message: "Veículo não encontrado." });
        res.status(200).json({ message: `Veículo ${resultado.placa} deletado.` });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar veículo.' });
    }
});

// server.js -> Adicione esta rota

/**
 * @route   POST /api/veiculos/:id/manutencao
 * @desc    Adiciona um novo registro de manutenção a um veículo específico.
 */
app.post('/api/veiculos/:id/manutencao', async (req, res) => {
    try {
        const idDoVeiculo = req.params.id;
        const dadosManutencao = req.body;

        // Encontra o veículo pelo ID
        const veiculo = await Veiculo.findById(idDoVeiculo);

        if (!veiculo) {
            return res.status(404).json({ message: "Veículo não encontrado para adicionar manutenção." });
        }

        // Adiciona o novo registro de manutenção ao array 'historicoManutencao'
        veiculo.historicoManutencao.push(dadosManutencao);

        // Salva o documento do veículo inteiro com a nova manutenção
        const veiculoAtualizado = await veiculo.save();

        res.status(201).json(veiculoAtualizado);
    } catch (error) {
        console.error("Erro ao adicionar manutenção:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Dados de manutenção inválidos." });
        }
        res.status(500).json({ message: "Erro interno do servidor ao adicionar manutenção." });
    }
});

// --- ROTAS PARA DICAS DE MANUTENÇÃO (DO dados.json) ---

// ROTA PARA DICAS GERAIS
app.get('/api/dicas-manutencao', (req, res) => {
    if (dados.dicasManutencao && dados.dicasManutencao.geral) {
        return res.json(dados.dicasManutencao.geral);
    }
    return res.status(404).json({ message: "Dicas gerais não encontradas." });
});

// **ROTA CORRIGIDA E COMPLETA PARA DICAS POR TIPO**
app.get('/api/dicas-manutencao/:tipoVeiculo', (req, res) => {
    const { tipoVeiculo } = req.params; // ex: "carroesportivo"

    // Mapeamento que traduz o tipo da URL para a chave do JSON
    const mapeamentoTipos = {
        'carro': 'carro',
        'carroesportivo': 'esportivo', // Traduz 'carroesportivo' para 'esportivo'
        'caminhao': 'caminhao'
    };

    const chaveJson = mapeamentoTipos[tipoVeiculo.toLowerCase()];

    if (chaveJson && dados.dicasManutencao && dados.dicasManutencao[chaveJson]) {
        // Se encontrou a chave e os dados existem, retorna as dicas
        return res.json(dados.dicasManutencao[chaveJson]);
    } else {
        // Se não, retorna o erro 404
        return res.status(404).json({ message: `Nenhuma dica encontrada para o tipo: ${tipoVeiculo}` });
    }
});

// --- ROTA PARA PREVISÃO DO TEMPO (Proxy) ---
app.get('/api/previsao', async (req, res) => {
    // ... (o código da previsão do tempo, que pode ou não funcionar dependendo da chave de API)
    // Deixamos ele aqui para o futuro
});

// =======================================================
// ----- INICIALIZAÇÃO DO SERVIDOR -----
// =======================================================
app.listen(port, () => {
    console.log(`[Servidor] Rodando e escutando em http://localhost:${port}`);
});