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
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Importação dos modelos do Mongoose
import Veiculo from './models/Veiculo.js';
import Manutencao from './models/Manutencao.js';
import User from './models/User.js';
import RemovedVehicleLog from './models/RemovedVehicleLog.js'; // <-- NOVA IMPORTAÇÃO: Importa o novo modelo

// =======================================================
// ----- CONFIGURAÇÃO INICIAL -----
// =======================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3000;

// Chave secreta para JWT
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("❌ [ERRO FATAL] JWT_SECRET não configurado no .env! O sistema de autenticação não funcionará.");
    process.exit(1);
}

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

// Rate Limiter para autenticação (registro e login)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 50, // Limita cada IP a 50 tentativas de autenticação/registro em 15 minutos
    message: 'Muitas tentativas de autenticação ou registro, por favor, tente novamente mais tarde.'
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
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(express.static(__dirname));

// APLICAÇÃO DO API LIMITER (UMA ÚNICA VEZ para rotas /api/ não-auth)
app.use('/api/', apiLimiter);

// Carrega os dados do arquivo JSON para as dicas
let dados = {};
try {
    const rawData = fs.readFileSync(path.join(__dirname, 'dados.json'));
    dados = JSON.parse(rawData);
} catch (error) {
    console.error('[Servidor ERRO] Não foi possível carregar dados.json:', error);
}


// =======================================================
// ----- MIDDLEWARE DE AUTENTICAÇÃO (JWT) -----
// =======================================================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato: Bearer TOKEN

    if (token == null) {
        console.warn('⚠️ Tentativa de acesso não autorizado: Nenhum token fornecido.');
        return res.status(401).json({ message: 'Acesso não autorizado: Nenhum token fornecido.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.warn('⚠️ Token inválido ou expirado:', err.message);
            return res.status(403).json({ message: 'Token inválido ou expirado.' });
        }
        req.user = user; // Adiciona os dados do usuário (do token) ao objeto da requisição
        next();
    });
};


// =======================================================
// ----- ROTAS DA API -----
// =======================================================

// --- ROTAS DE AUTENTICAÇÃO ---
app.post('/api/auth/register', authLimiter, [
    body('email', 'Email inválido').isEmail().normalizeEmail(),
    body('password', 'A senha deve ter no mínimo 6 caracteres.').isLength({ min: 6 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array().map(err => err.msg) });
    }

    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(409).json({ message: 'Este email já está registrado.' });
        }

        user = new User({ email, password });
        await user.save();

        const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({ message: 'Usuário registrado com sucesso!', token, email: user.email });
    } catch (error) {
        console.error('❌ Erro no registro de usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao registrar o usuário.' });
    }
});

app.post('/api/auth/login', authLimiter, [
    body('email', 'Email inválido').isEmail().normalizeEmail(),
    body('password', 'A senha é obrigatória.').not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array().map(err => err.msg) });
    }

    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Credenciais inválidas.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Credenciais inválidas.' });
        }

        user.lastLogin = new Date();
        user.loginCount = (user.loginCount || 0) + 1;
        await user.save();

        const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ message: 'Login realizado com sucesso!', token, email: user.email });
    } catch (error) {
        console.error('❌ Erro no login de usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao fazer login.' });
    }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password createdAt lastLogin loginCount');
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        res.status(200).json({ user: { id: user._id, email: user.email, createdAt: user.createdAt, lastLogin: user.lastLogin, loginCount: user.loginCount } });
    } catch (error) {
        console.error('❌ Erro ao verificar token/buscar usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// --- NOVA ROTA: Dashboard do Usuário ---
app.get('/api/user/dashboard', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password createdAt lastLogin loginCount');
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const removedVehicles = await RemovedVehicleLog.find({ owner: req.user.id }).sort({ deletionDate: -1 });

        res.status(200).json({
            user: {
                id: user._id,
                email: user.email,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin,
                loginCount: user.loginCount
            },
            removedVehicles: removedVehicles
        });
    } catch (error) {
        console.error('❌ Erro ao buscar dados do dashboard do usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar dados do dashboard.' });
    }
});


// --- ROTAS CRUD PARA VEÍCULOS ---

// CRIAR um novo Veículo
app.post('/api/veiculos', authenticateToken, createVehicleLimiter,
    [
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
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('🚨 Erros de validação ao criar veículo:', errors.array());
            const errorMessages = errors.array().map(err => err.msg).join('; ');
            return res.status(400).json({ message: `Dados inválidos: ${errorMessages}` });
        }

        try {
            const veiculoCriado = await Veiculo.create({ ...req.body, owner: req.user.id });
            res.status(201).json(veiculoCriado);
        } catch (error) {
            if (error.code === 11000) {
                console.error('🚫 Erro de duplicidade de placa:', error.message);
                return res.status(409).json({ message: 'Erro: A placa informada já existe.' });
            }
            if (error.name === 'ValidationError') {
                console.error('🚫 Erro de validação Mongoose:', error.message);
                const errorMessages = Object.values(error.errors).map(e => e.message).join('; ');
                return res.status(400).json({ message: `Erro de validação no banco de dados: ${errorMessages}` });
            }
            console.error('❌ Erro interno do servidor ao criar o veículo:', error);
            res.status(500).json({ message: 'Erro interno do servidor ao criar o veículo.' });
        }
    }
);

// LER todos os Veículos DO USUÁRIO LOGADO
app.get('/api/veiculos', authenticateToken, async (req, res) => {
    try {
        const todosOsVeiculos = await Veiculo.find({ owner: req.user.id })
            .populate({
                path: 'historicoManutencao',
                model: 'Manutencao',
                options: { sort: { 'data': -1 } }
            })
            .populate('owner', 'email')
            .sort({ createdAt: -1 });
        res.status(200).json(todosOsVeiculos);
    } catch (error) {
        console.error('❌ Erro ao buscar os veículos:', error);
        res.status(500).json({ message: 'Erro ao buscar os veículos.' });
    }
});

// ATUALIZAR um Veículo existente
app.put('/api/veiculos/:id', authenticateToken,
    [
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
        // CORREÇÃO: Mensagem de validação do tipo
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
            const veiculo = await Veiculo.findOne({ _id: id, owner: req.user.id });
            if (!veiculo) {
                return res.status(404).json({ message: "Veículo não encontrado ou você não tem permissão para atualizá-lo." });
            }

            const veiculoAtualizado = await Veiculo.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
            res.status(200).json(veiculoAtualizado);
        } catch (error) {
            if (error.code === 11000) {
                console.error('🚫 Erro de duplicidade de placa ao atualizar:', error.message);
                return res.status(409).json({ message: 'Erro: Essa placa já pertence a outro veículo.' });
            }
            if (error.name === 'ValidationError') {
                console.error('🚫 Erro de validação Mongoose:', error.message);
                const errorMessages = Object.values(error.errors).map(e => e.message).join('; ');
                return res.status(400).json({ message: `Erro de validação no banco de dados: ${errorMessages}` });
            }
            console.error('❌ Erro interno do servidor ao atualizar o veículo:', error);
            res.status(500).json({ message: 'Erro interno do servidor ao atualizar o veículo.' });
        }
    }
);

// DELETAR um Veículo
app.delete('/api/veiculos/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const veiculoToDelete = await Veiculo.findOne({ _id: id, owner: req.user.id });
        if (!veiculoToDelete) {
            return res.status(404).json({ message: "Veículo não encontrado ou você não tem permissão para deletá-lo." });
        }

        // ALTERAÇÃO: Antes de deletar, registra o resumo do veículo no RemovedVehicleLog
        const removedLog = new RemovedVehicleLog({
            owner: req.user.id,
            placa: veiculoToDelete.placa,
            marca: veiculoToDelete.marca,
            modelo: veiculoToDelete.modelo,
            ano: veiculoToDelete.ano,
            cor: veiculoToDelete.cor,
            tipo: veiculoToDelete.tipo,
            deletionDate: new Date()
        });
        await removedLog.save();
        
        // Deleta as manutenções associadas e o próprio veículo
        await Manutencao.deleteMany({ veiculo: id });
        await Veiculo.findByIdAndDelete(id);

        res.status(200).json({ message: `Veículo ${veiculoToDelete.placa} e seu histórico foram deletados e registrados no log de remoção.` });
    } catch (error) {
        console.error('❌ Erro ao deletar o veículo:', error);
        res.status(500).json({ message: 'Erro ao deletar o veículo.' });
    }
});

// --- ROTAS PARA MANUTENÇÕES ---

// CRIAR UMA NOVA MANUTENÇÃO ASSOCIADA A UM VEÍCULO
app.post('/api/veiculos/:veiculoId/manutencoes', authenticateToken,
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
            if (veiculoExistente.owner.toString() !== req.user.id) {
                return res.status(403).json({ message: "Você não tem permissão para adicionar manutenções a este veículo." });
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
app.get('/api/veiculos/:veiculoId/manutencoes', authenticateToken, async (req, res) => {
    try {
        const { veiculoId } = req.params;
        const veiculo = await Veiculo.findById(veiculoId);
        if (!veiculo) {
            return res.status(404).json({ message: 'Não foi possível buscar manutenções: Veículo não encontrado.' });
        }
        if (veiculo.owner.toString() !== req.user.id) {
            return res.status(403).json({ message: "Você não tem permissão para ver as manutenções deste veículo." });
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