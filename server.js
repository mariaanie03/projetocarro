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
import axios from 'axios';

// Importação dos modelos do Mongoose
import Veiculo from './models/Veiculo.js';
import Manutencao from './models/Manutencao.js';

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
    process.exit(1);
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

// --- ROTAS CRUD PARA VEÍCULOS ---

// CRIAR um novo Veículo
app.post('/api/veiculos', async (req, res) => {
    try {
        const veiculoCriado = await Veiculo.create(req.body);
        res.status(201).json(veiculoCriado);
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: 'Erro: A placa informada já existe.' });
        if (error.name === 'ValidationError') return res.status(400).json({ message: Object.values(error.errors).map(e => e.message).join(', ') });
        res.status(500).json({ message: 'Erro interno do servidor ao criar o veículo.' });
    }
});

// LER todos os Veículos (com o histórico de manutenção populado)
app.get('/api/veiculos', async (req, res) => {
    try {
        const todosOsVeiculos = await Veiculo.find({})
            .populate({
                path: 'historicoManutencao',
                model: 'Manutencao',
                options: { sort: { 'data': -1 } }
            })
            .sort({ createdAt: -1 });
        res.status(200).json(todosOsVeiculos);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar os veículos.' });
    }
});

// ATUALIZAR um Veículo existente
app.put('/api/veiculos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const veiculoAtualizado = await Veiculo.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
        if (!veiculoAtualizado) return res.status(404).json({ message: "Veículo não encontrado para atualização." });
        res.status(200).json(veiculoAtualizado);
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: 'Erro: Essa placa já pertence a outro veículo.' });
        if (error.name === 'ValidationError') return res.status(400).json({ message: Object.values(error.errors).map(e => e.message).join(', ') });
        res.status(500).json({ message: 'Erro interno do servidor ao atualizar o veículo.' });
    }
});

// DELETAR um Veículo
app.delete('/api/veiculos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const resultado = await Veiculo.findByIdAndDelete(id);
        if (!resultado) return res.status(404).json({ message: "Veículo não encontrado." });
        
        await Manutencao.deleteMany({ veiculo: id });
        
        res.status(200).json({ message: `Veículo ${resultado.placa} e seu histórico foram deletados.` });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar o veículo.' });
    }
});


// --- ROTAS PARA MANUTENÇÕES ---

// CRIAR UMA NOVA MANUTENÇÃO ASSOCIADA A UM VEÍCULO
app.post('/api/veiculos/:veiculoId/manutencoes', async (req, res) => {
    try {
        const { veiculoId } = req.params;
        const veiculoExistente = await Veiculo.findById(veiculoId);
        if (!veiculoExistente) {
            return res.status(404).json({ message: "Operação falhou: Veículo não encontrado." });
        }
        const dadosNovaManutencao = { ...req.body, veiculo: veiculoId };
        const manutencaoCriada = await Manutencao.create(dadosNovaManutencao);
        
        veiculoExistente.historicoManutencao.push(manutencaoCriada._id);
        await veiculoExistente.save();

        res.status(201).json(manutencaoCriada);
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Dados de manutenção inválidos.", details: error.message });
        }
        console.error("Erro ao criar manutenção:", error);
        res.status(500).json({ message: "Ocorreu um erro interno no servidor." });
    }
});

// LER TODAS AS MANUTENÇÕES DE UM VEÍCULO ESPECÍFICO
app.get('/api/veiculos/:veiculoId/manutencoes', async (req, res) => {
    try {
        const { veiculoId } = req.params;
        const veiculo = await Veiculo.findById(veiculoId);
        if (!veiculo) {
            return res.status(404).json({ message: 'Não foi possível buscar manutenções: Veículo não encontrado.' });
        }
        const manutenções = await Manutencao.find({ veiculo: veiculoId }).sort({ data: -1 });
        res.status(200).json(manutenções);
    } catch (error) {
        console.error("Erro ao buscar o histórico de manutenções:", error);
        res.status(500).json({ message: 'Erro interno do servidor ao processar a solicitação.' });
    }
});


// --- OUTRAS ROTAS DA API (DICAS, PREVISÃO DO TEMPO) ---

// ROTA PARA DICAS DE MANUTENÇÃO (DO dados.json)
app.get('/api/dicas-manutencao/:tipoVeiculo', (req, res) => {
    const { tipoVeiculo } = req.params;
    const mapeamentoTipos = { 'carro': 'carro', 'carroesportivo': 'esportivo', 'caminhao': 'caminhao' };
    const chaveJson = mapeamentoTipos[tipoVeiculo.toLowerCase()];

    if (chaveJson && dados.dicasManutencao && dados.dicasManutencao[chaveJson]) {
        return res.json(dados.dicasManutencao[chaveJson]);
    } else {
        return res.status(404).json({ message: `Nenhuma dica encontrada para o tipo: ${tipoVeiculo}` });
    }
});

// ROTA PARA PREVISÃO DO TEMPO (Proxy)
app.get('/api/previsao', async (req, res) => {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const { cidade } = req.query;

    if (!apiKey) return res.status(500).json({ message: "Chave da API de previsão do tempo não configurada." });
    if (!cidade) return res.status(400).json({ message: "O nome da cidade é obrigatório." });
    
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${cidade}&appid=${apiKey}&units=metric&lang=pt_br`;

    try {
        const response = await axios.get(url);
        
        const nomeCidade = response.data.city.name;
        const listaPrevisoes = response.data.list;
        const previsoesPorDia = {};
        
        listaPrevisoes.forEach(item => {
            const dia = new Date(item.dt * 1000).toLocaleDateString('pt-BR', { weekday: 'long' });
            if (!previsoesPorDia[dia]) {
                previsoesPorDia[dia] = { diaSemana: dia.charAt(0).toUpperCase() + dia.slice(1), temps: [], descricoes: {}, icones: {} };
            }
            previsoesPorDia[dia].temps.push(item.main.temp);
            previsoesPorDia[dia].descricoes[item.weather[0].description] = (previsoesPorDia[dia].descricoes[item.weather[0].description] || 0) + 1;
            previsoesPorDia[dia].icones[item.weather[0].icon] = (previsoesPorDia[dia].icones[item.weather[0].icon] || 0) + 1;
        });

        const resultadoFinal = Object.values(previsoesPorDia).map(diaInfo => ({
            dia: diaInfo.diaSemana,
            temp_min: Math.round(Math.min(...diaInfo.temps)),
            temp_max: Math.round(Math.max(...diaInfo.temps)),
            descricao: Object.keys(diaInfo.descricoes).reduce((a, b) => diaInfo.descricoes[a] > diaInfo.descricoes[b] ? a : b),
            icone: `http://openweathermap.org/img/wn/${Object.keys(diaInfo.icones).reduce((a, b) => diaInfo.icones[a] > diaInfo.icones[b] ? a : b)}.png`
        }));

        res.status(200).json({ cidade: nomeCidade, previsoes: resultadoFinal });

    } catch (error) {
        if (error.response && error.response.status === 404) return res.status(404).json({ message: `Cidade "${cidade}" não encontrada.` });
        res.status(500).json({ message: "Não foi possível obter a previsão do tempo." });
    }
});


// =======================================================
// ----- INICIALIZAÇÃO DO SERVIDOR -----
// =======================================================
app.listen(port, () => {
    console.log(`[Servidor] Rodando e escutando em http://localhost:${port}`);
});