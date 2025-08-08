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

// --- ROTAS CRUD PARA VEÍCULOS (DO MONGODB) ---
app.post('/api/veiculos', async (req, res) => { try { const veiculoCriado = await Veiculo.create(req.body); res.status(201).json(veiculoCriado); } catch (error) { if (error.code === 11000) return res.status(409).json({ message: 'Placa já existe.' }); if (error.name === 'ValidationError') return res.status(400).json({ message: Object.values(error.errors).map(e => e.message).join(', ') }); res.status(500).json({ message: 'Erro interno do servidor ao criar veículo.' }); } });
app.get('/api/veiculos', async (req, res) => { try { const todosOsVeiculos = await Veiculo.find({}).sort({ createdAt: -1 }); res.status(200).json(todosOsVeiculos); } catch (error) { res.status(500).json({ message: 'Erro ao buscar veículos.' }); } });
app.put('/api/veiculos/:id', async (req, res) => { try { const { id } = req.params; const novosDados = req.body; const veiculoAtualizado = await Veiculo.findByIdAndUpdate(id, novosDados, { new: true, runValidators: true }); if (!veiculoAtualizado) { return res.status(404).json({ message: "Veículo não encontrado para atualização." }); } res.status(200).json(veiculoAtualizado); } catch (error) { if (error.code === 11000) return res.status(409).json({ message: 'Essa placa já pertence a outro veículo.' }); if (error.name === 'ValidationError') return res.status(400).json({ message: Object.values(error.errors).map(e => e.message).join(', ') }); res.status(500).json({ message: 'Erro interno do servidor ao atualizar veículo.' }); } });
app.delete('/api/veiculos/:id', async (req, res) => { try { const { id } = req.params; const resultado = await Veiculo.findByIdAndDelete(id); if (!resultado) { return res.status(404).json({ message: "Veículo não encontrado." }); } res.status(200).json({ message: `Veículo ${resultado.placa} deletado.` }); } catch (error) { res.status(500).json({ message: 'Erro ao deletar veículo.' }); } });
app.post('/api/veiculos/:id/manutencao', async (req, res) => { try { const veiculo = await Veiculo.findById(req.params.id); if (!veiculo) { return res.status(404).json({ message: "Veículo não encontrado para adicionar manutenção." }); } veiculo.historicoManutencao.push(req.body); const veiculoAtualizado = await veiculo.save(); res.status(201).json(veiculoAtualizado); } catch (error) { if (error.name === 'ValidationError') { return res.status(400).json({ message: "Dados de manutenção inválidos." }); } res.status(500).json({ message: "Erro interno do servidor ao adicionar manutenção." }); } });

// --- ROTA PARA DICAS DE MANUTENÇÃO (DO dados.json) ---
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

// --- ROTA PARA PREVISÃO DO TEMPO (Proxy) ---
app.get('/api/previsao', async (req, res) => {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const { cidade } = req.query; // Pega a cidade da query, agora é obrigatória

    if (!apiKey) {
        return res.status(500).json({ message: "Chave da API de previsão do tempo não configurada." });
    }
    if (!cidade) {
        return res.status(400).json({ message: "O nome da cidade é obrigatório." });
    }

    // Novo URL para a previsão de 5 dias / 3 horas
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${cidade}&appid=${apiKey}&units=metric&lang=pt_br`;

    try {
        const response = await axios.get(url);
        
        const nomeCidade = response.data.city.name;
        const listaPrevisoes = response.data.list;

        // Processar os dados para agrupar por dia
        const previsoesPorDia = {};
        listaPrevisoes.forEach(item => {
            const dia = new Date(item.dt * 1000).toLocaleDateString('pt-BR', { weekday: 'long' });
            if (!previsoesPorDia[dia]) {
                previsoesPorDia[dia] = {
                    diaSemana: dia.charAt(0).toUpperCase() + dia.slice(1),
                    temps: [],
                    descricoes: {},
                    icones: {}
                };
            }
            previsoesPorDia[dia].temps.push(item.main.temp);
            previsoesPorDia[dia].descricoes[item.weather[0].description] = (previsoesPorDia[dia].descricoes[item.weather[0].description] || 0) + 1;
            previsoesPorDia[dia].icones[item.weather[0].icon] = (previsoesPorDia[dia].icones[item.weather[0].icon] || 0) + 1;
        });

        // Montar o resultado final com mín, máx e a condição do tempo mais comum
        const resultadoFinal = Object.values(previsoesPorDia).map(diaInfo => {
            const temp_min = Math.min(...diaInfo.temps);
            const temp_max = Math.max(...diaInfo.temps);
            const descricaoMaisComum = Object.keys(diaInfo.descricoes).reduce((a, b) => diaInfo.descricoes[a] > diaInfo.descricoes[b] ? a : b);
            const iconeMaisComum = Object.keys(diaInfo.icones).reduce((a, b) => diaInfo.icones[a] > diaInfo.icones[b] ? a : b);
            
            return {
                dia: diaInfo.diaSemana,
                temp_min: Math.round(temp_min),
                temp_max: Math.round(temp_max),
                descricao: descricaoMaisComum.charAt(0).toUpperCase() + descricaoMaisComum.slice(1),
                icone: `http://openweathermap.org/img/wn/${iconeMaisComum}.png`
            };
        });

        res.status(200).json({ cidade: nomeCidade, previsoes: resultadoFinal });

    } catch (error) {
        if (error.response && error.response.status === 404) {
            return res.status(404).json({ message: `Cidade "${cidade}" não encontrada.` });
        }
        console.error("Erro ao buscar previsão do tempo:", error.message);
        res.status(500).json({ message: "Não foi possível obter a previsão do tempo." });
    }
});

// =======================================================
// ----- INICIALIZAÇÃO DO SERVIDOR -----
// =======================================================
app.listen(port, () => {
    console.log(`[Servidor] Rodando e escutando em http://localhost:${port}`);
});