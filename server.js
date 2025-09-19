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
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, validationResult } from 'express-validator';

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

// Rate Limiter para todas as requisições da API
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Limita cada IP a 100 requisições
    message: 'Muitas requisições para a API, tente novamente mais tarde.'
});

// Rate Limiter específico para a criação de veículos (mais restritivo)
const createVehicleLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // Limita cada IP a 10 criações de veículos em 15 minutos
    message: 'Você atingiu o limite de criação de veículos. Por favor, tente novamente mais tarde.'
});

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
app.use(helmet()); // Para configurar cabeçalhos de segurança HTTP
app.use(cors()); // Permite requisições de outras origens
app.use(express.json({ limit: '10kb' })); // Permite o parsing de JSON no corpo da requisição, com limite de tamanho
app.use(express.static(__dirname)); // Serve arquivos estáticos da pasta raiz

// APLICAÇÃO DO API LIMITER (UMA ÚNICA VEZ)
app.use('/api/', apiLimiter); // Aplica o limitador a todas as rotas que começam com /api/

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
app.post('/api/veiculos',
    createVehicleLimiter, // Aplica o limitador específico para criação
    [
        // Validação e sanitização do express-validator
        body('placa', 'Formato de placa inválido. Use 3 letras, 1 número, 1 letra, 2 números (Ex: ABC1D23) OU 3 letras e 4 números (Ex: ABC1234).')
            .matches(/^[A-Z]{3}\d{1}[A-Z]{1}\d{2}$|^[A-Z]{3}\d{4}$/)
            .trim()
            .toUpperCase(),
        body('marca', 'A marca é obrigatória e não pode estar vazia.').not().isEmpty().trim().escape(),
        body('modelo', 'O modelo é obrigatório e não pode estar vazio.').not().isEmpty().trim().escape(),
        body('ano', `O ano deve ser um número inteiro válido entre 1900 e ${new Date().getFullYear() + 2}.`)
            .isInt({ min: 1900, max: new Date().getFullYear() + 2 })
            .toInt(),
        body('cor', 'A cor é obrigatória e não pode estar vazia.').not().isEmpty().trim().escape(),
        body('tipo', 'Tipo de veículo inválido. Escolha entre Carro, CarroEsportivo ou Caminhao.').isIn(['Carro', 'CarroEsportivo', 'Caminhao'])
    ],
    async (req, res) => {
        // Verifica se houve erros de validação do express-validator
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('🚨 Erros de validação ao criar veículo:', errors.array());
            const errorMessages = errors.array().map(err => err.msg).join('; ');
            return res.status(400).json({ message: `Dados inválidos: ${errorMessages}` });
        }

        try {
            const veiculoCriado = await Veiculo.create(req.body);
            res.status(201).json(veiculoCriado);
        } catch (error) {
            if (error.code === 11000) {
                console.error('🚫 Erro de duplicidade de placa:', error.message);
                return res.status(409).json({ message: 'Erro: A placa informada já existe.' });
            }
            if (error.name === 'ValidationError') {
                // Erros de validação do Mongoose (caso algo passe pelo express-validator mas falhe no Mongoose)
                console.error('🚫 Erro de validação Mongoose:', error.message);
                const errorMessages = Object.values(error.errors).map(e => e.message).join('; ');
                return res.status(400).json({ message: `Erro de validação no banco de dados: ${errorMessages}` });
            }
            console.error('❌ Erro interno do servidor ao criar o veículo:', error);
            res.status(500).json({ message: 'Erro interno do servidor ao criar o veículo.' });
        }
    }
);

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
        console.error('❌ Erro ao buscar os veículos:', error);
        res.status(500).json({ message: 'Erro ao buscar os veículos.' });
    }
});

// ATUALIZAR um Veículo existente
app.put('/api/veiculos/:id',
    [
        // Validação e sanitização para atualização
        body('placa', 'Formato de placa inválido. Use 3 letras, 1 número, 1 letra, 2 números (Ex: ABC1D23) OU 3 letras e 4 números (Ex: ABC1234).')
            .matches(/^[A-Z]{3}\d{1}[A-Z]{1}\d{2}$|^[A-Z]{3}\d{4}$/)
            .trim()
            .toUpperCase(),
        body('marca', 'A marca é obrigatória e não pode estar vazia.').not().isEmpty().trim().escape(),
        body('modelo', 'O modelo é obrigatório e não pode estar vazia.').not().isEmpty().trim().escape(),
        body('ano', `O ano deve ser um número inteiro válido entre 1900 e ${new Date().getFullYear() + 2}.`)
            .isInt({ min: 1900, max: new Date().getFullYear() + 2 })
            .toInt(),
        body('cor', 'A cor é obrigatória e não pode estar vazia.').not().isEmpty().trim().escape(),
        body('tipo', 'Tipo de veículo inválido. Escolha entre Carro, CarroEsportivo ou Caminhao.').isIn(['Carro', 'CarroEsportivo', 'Caminhao'])
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('🚨 Erros de validação ao atualizar veículo:', errors.array());
            const errorMessages = errors.array().map(err => err.msg).join('; ');
            return res.status(400).json({ message: `Dados inválidos: ${errorMessages}` });
        }

        try {
            const { id } = req.params;
            const veiculoAtualizado = await Veiculo.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
            if (!veiculoAtualizado) return res.status(404).json({ message: "Veículo não encontrado para atualização." });
            res.status(200).json(veiculoAtualizado);
        } catch (error) {
            if (error.code === 11000) {
                console.error('🚫 Erro de duplicidade de placa ao atualizar:', error.message);
                return res.status(409).json({ message: 'Erro: Essa placa já pertence a outro veículo.' });
            }
            if (error.name === 'ValidationError') {
                console.error('🚫 Erro de validação Mongoose ao atualizar:', error.message);
                const errorMessages = Object.values(error.errors).map(e => e.message).join('; ');
                return res.status(400).json({ message: `Erro de validação no banco de dados: ${errorMessages}` });
            }
            console.error('❌ Erro interno do servidor ao atualizar o veículo:', error);
            res.status(500).json({ message: 'Erro interno do servidor ao atualizar o veículo.' });
        }
    }
);

// DELETAR um Veículo
app.delete('/api/veiculos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const resultado = await Veiculo.findByIdAndDelete(id);
        if (!resultado) return res.status(404).json({ message: "Veículo não encontrado." });

        // Também deleta todas as manutenções associadas a este veículo
        await Manutencao.deleteMany({ veiculo: id });

        res.status(200).json({ message: `Veículo ${resultado.placa} e seu histórico foram deletados.` });
    } catch (error) {
        console.error('❌ Erro ao deletar o veículo:', error);
        res.status(500).json({ message: 'Erro ao deletar o veículo.' });
    }
});

// --- ROTAS PARA MANUTENÇÕES ---

// CRIAR UMA NOVA MANUTENÇÃO ASSOCIADA A UM VEÍCULO
app.post('/api/veiculos/:veiculoId/manutencoes',
    [
        body('data', 'A data da manutenção é obrigatória e deve ser uma data válida.').isISO8601().toDate(),
        body('descricaoServico', 'A descrição do serviço é obrigatória.').not().isEmpty().trim().escape(),
        body('custo', 'O custo da manutenção é obrigatório e deve ser um número positivo.').isFloat({ min: 0 }).toFloat(),
        body('quilometragem', 'A quilometragem deve ser um número inteiro positivo ou pode ser deixada em branco.').optional({ checkFalsy: true }).isInt({ min: 0 }).toInt()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('🚨 Erros de validação ao criar manutenção:', errors.array());
            const errorMessages = errors.array().map(err => err.msg).join('; ');
            return res.status(400).json({ message: `Dados inválidos: ${errorMessages}` });
        }

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
                console.error("🚫 Erro de validação Mongoose ao criar manutenção:", error.message);
                const errorMessages = Object.values(error.errors).map(e => e.message).join('; ');
                return res.status(400).json({ message: `Erro de validação no banco de dados: ${error.message}` });
            }
            console.error("❌ Erro ao criar manutenção:", error);
            res.status(500).json({ message: "Ocorreu um erro interno no servidor." });
        }
    }
);

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
        console.error("❌ Erro ao buscar o histórico de manutenções:", error);
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
        // Retorna as dicas gerais e as específicas do tipo, se houver
        const dicasGerais = dados.dicasManutencao.geral || [];
        const dicasEspecificas = dados.dicasManutencao[chaveJson] || [];
        return res.json([...dicasGerais, ...dicasEspecificas]);
    } else {
        return res.status(404).json({ message: `Nenhuma dica encontrada para o tipo: ${tipoVeiculo}` });
    }
});

// ROTA PARA PREVISÃO DO TEMPO (Proxy)
app.get('/api/previsao', async (req, res) => {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const { cidade } = req.query;

    if (!apiKey) {
        console.error('❌ Chave da API de previsão do tempo não configurada!');
        return res.status(500).json({ message: "Chave da API de previsão do tempo não configurada." });
    }
    if (!cidade) {
        console.warn('⚠️ Nome da cidade não fornecido para previsão.');
        return res.status(400).json({ message: "O nome da cidade é obrigatório." });
    }

    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cidade)}&appid=${apiKey}&units=metric&lang=pt_br`;

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
            // Conta as ocorrências de cada descrição para pegar a mais frequente
            previsoesPorDia[dia].descricoes[item.weather[0].description] = (previsoesPorDia[dia].descricoes[item.weather[0].description] || 0) + 1;
            // Conta as ocorrências de cada ícone
            previsoesPorDia[dia].icones[item.weather[0].icon] = (previsoesPorDia[dia].icones[item.weather[0].icon] || 0) + 1;
        });

        const resultadoFinal = Object.values(previsoesPorDia).map(diaInfo => ({
            dia: diaInfo.diaSemana,
            temp_min: Math.round(Math.min(...diaInfo.temps)),
            temp_max: Math.round(Math.max(...diaInfo.temps)),
            // Pega a descrição mais frequente
            descricao: Object.keys(diaInfo.descricoes).reduce((a, b) => diaInfo.descricoes[a] > diaInfo.descricoes[b] ? a : b),
            // Pega o ícone mais frequente
            icone: `http://openweathermap.org/img/wn/${Object.keys(diaInfo.icones).reduce((a, b) => diaInfo.icones[a] > diaInfo.icones[b] ? a : b)}.png`
        }));

        res.status(200).json({ cidade: nomeCidade, previsoes: resultadoFinal });

    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.warn(`⚠️ Cidade "${cidade}" não encontrada pela API externa.`);
            return res.status(404).json({ message: `Cidade "${cidade}" não encontrada.` });
        }
        console.error('❌ Erro na API de previsão:', error.message, 'Detalhes:', error.response?.data);
        res.status(500).json({ message: "Não foi possível obter a previsão do tempo." });
    }
});


// =======================================================
// ----- INICIALIZAÇÃO DO SERVIDOR -----
// =======================================================
app.listen(port, () => {
    console.log(`[Servidor] Rodando e escutando em http://localhost:${port}`);
});