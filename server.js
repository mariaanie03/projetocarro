// server.js (Versão Final Completa e Corrigida)

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
import multer from 'multer';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Importação dos modelos do Mongoose
import Veiculo from './models/Veiculo.js';
import Manutencao from './models/Manutencao.js';
import User from './models/User.js';
import RemovedVehicleLog from './models/RemovedVehicleLog.js';

// =======================================================
// ----- CONFIGURAÇÃO INICIAL -----
// =======================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3000;

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("❌ [ERRO FATAL] JWT_SECRET não configurado no .env! O sistema de autenticação não funcionará.");
    process.exit(1);
}

// Limitadores de requisição
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Muitas requisições para a API, tente novamente mais tarde.'
});
const createVehicleLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Você atingiu o limite de criação de veículos. Por favor, tente novamente mais tarde.'
});
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: 'Muitas tentativas de autenticação ou registro, por favor, tente novamente mais tarde.'
});

// =======================================================
// ----- CONFIGURAÇÃO DO MULTER (UPLOAD DE ARQUIVOS) -----
// =======================================================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, 'uploads/');
    if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/', apiLimiter);

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
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.status(401).json({ message: 'Acesso não autorizado: Nenhum token fornecido.' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token inválido ou expirado.' });
        req.user = user;
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
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array().map(err => err.msg) });
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(409).json({ message: 'Este email já está registrado.' });
        user = new User({ email, password });
        await user.save();
        const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
        res.status(201).json({ message: 'Usuário registrado com sucesso!', token, email: user.email });
    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor ao registrar o usuário.' });
    }
});

app.post('/api/auth/login', authLimiter, [
    body('email', 'Email inválido').isEmail().normalizeEmail(),
    body('password', 'A senha é obrigatória.').not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array().map(err => err.msg) });
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password))) return res.status(400).json({ message: 'Credenciais inválidas.' });
        user.lastLogin = new Date();
        user.loginCount = (user.loginCount || 0) + 1;
        await user.save();
        const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ message: 'Login realizado com sucesso!', token, email: user.email });
    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor ao fazer login.' });
    }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// --- ROTAS CRUD PARA VEÍCULOS ---
app.post('/api/veiculos', authenticateToken, createVehicleLimiter, upload.single('imagemVeiculo'), [
    body('placa').matches(/^[A-Z]{3}\d{1}[A-Z]{1}\d{2}$|^[A-Z]{3}\d{4}$/).trim().toUpperCase(),
    body('marca').not().isEmpty().trim().escape(),
    body('modelo').not().isEmpty().trim().escape(),
    body('ano').isInt({ min: 1900, max: new Date().getFullYear() + 2 }).toInt(),
    body('cor').not().isEmpty().trim().escape(),
    body('tipo').isIn(['Carro', 'CarroEsportivo', 'Caminhao'])
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: `Dados inválidos: ${errors.array().map(e => e.msg).join(', ')}` });
    try {
        const imageUrl = req.file ? req.file.path.replace(/\\/g, "/") : null;
        const veiculoCriado = await Veiculo.create({ ...req.body, owner: req.user.id, imageUrl: imageUrl });
        res.status(201).json(veiculoCriado);
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: 'Erro: A placa informada já existe.' });
        res.status(500).json({ message: 'Erro interno do servidor ao criar o veículo.' });
    }
});

app.get('/api/veiculos', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id; 
        const todosOsVeiculos = await Veiculo.find({ $or: [{ owner: userId }, { sharedWith: userId }] })
            .populate({ path: 'historicoManutencao', model: 'Manutencao', options: { sort: { 'data': -1 } } })
            .populate('owner', 'email').populate('sharedWith', 'email').sort({ createdAt: -1 });
        res.status(200).json(todosOsVeiculos);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar os veículos.' });
    }
});

app.put('/api/veiculos/:id', authenticateToken, [
    body('placa').matches(/^[A-Z]{3}\d{1}[A-Z]{1}\d{2}$|^[A-Z]{3}\d{4}$/).trim().toUpperCase(),
    body('marca').not().isEmpty().trim().escape(),
    body('modelo').not().isEmpty().trim().escape(),
    body('ano').isInt({ min: 1900, max: new Date().getFullYear() + 2 }).toInt(),
    body('cor').not().isEmpty().trim().escape(),
    body('tipo').isIn(['Carro', 'CarroEsportivo', 'Caminhao'])
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: `Dados inválidos: ${errors.array().map(e => e.msg).join(', ')}` });
    try {
        const veiculo = await Veiculo.findOne({ _id: req.params.id, owner: req.user.id });
        if (!veiculo) return res.status(404).json({ message: "Veículo não encontrado ou você não tem permissão para atualizá-lo." });
        const veiculoAtualizado = await Veiculo.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        res.status(200).json(veiculoAtualizado);
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: 'Erro: Essa placa já pertence a outro veículo.' });
        res.status(500).json({ message: 'Erro interno do servidor ao atualizar o veículo.' });
    }
});

app.delete('/api/veiculos/:id', authenticateToken, async (req, res) => {
    try {
        const veiculoToDelete = await Veiculo.findOne({ _id: req.params.id, owner: req.user.id });
        if (!veiculoToDelete) return res.status(404).json({ message: "Veículo não encontrado ou você não tem permissão para deletá-lo." });
        
        // Opcional: Remover a imagem associada do sistema de arquivos
        if (veiculoToDelete.imageUrl) {
            fs.unlink(path.join(__dirname, veiculoToDelete.imageUrl), (err) => {
                if (err) console.error("Erro ao deletar a imagem do veículo:", err);
            });
        }
        
        await Manutencao.deleteMany({ veiculo: req.params.id });
        await Veiculo.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: `Veículo ${veiculoToDelete.placa} deletado com sucesso.` });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar o veículo.' });
    }
});


// --- CORREÇÃO: ROTAS DE COMPARTILHAMENTO, MANUTENÇÃO, DICAS E PREVISÃO RESTAURADAS ---

// ROTA: COMPARTILHAR UM VEÍCULO
app.post('/api/veiculos/:veiculoId/share', authenticateToken, async (req, res) => {
    try {
        const { veiculoId } = req.params;
        const { email } = req.body;
        const ownerId = req.user.id;

        if (!email) return res.status(400).json({ message: "O email do usuário para compartilhamento é obrigatório." });

        const veiculo = await Veiculo.findById(veiculoId);
        if (!veiculo) return res.status(404).json({ message: "Veículo não encontrado." });

        if (veiculo.owner.toString() !== ownerId) return res.status(403).json({ message: "Acesso proibido. Apenas o proprietário pode compartilhar o veículo." });

        const userToShareWith = await User.findOne({ email: email.toLowerCase() });
        if (!userToShareWith) return res.status(404).json({ message: `Usuário com o email "${email}" não encontrado.` });
        
        if (userToShareWith.id === ownerId) return res.status(400).json({ message: "Você não pode compartilhar um veículo com você mesmo." });
        
        if (veiculo.sharedWith.includes(userToShareWith.id)) return res.status(409).json({ message: `Este veículo já está compartilhado com ${email}.` });

        veiculo.sharedWith.push(userToShareWith._id);
        await veiculo.save();
        res.status(200).json({ message: `Veículo compartilhado com sucesso com ${email}!` });
    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor ao compartilhar o veículo.' });
    }
});

// ROTA: REVOGAR O COMPARTILHAMENTO DE UM VEÍCULO
app.post('/api/veiculos/:veiculoId/unshare', authenticateToken, async (req, res) => {
    try {
        const { veiculoId } = req.params;
        const { emailToRemove } = req.body;
        const ownerId = req.user.id;

        if (!emailToRemove) return res.status(400).json({ message: "O email do usuário para remover o acesso é obrigatório." });

        const veiculo = await Veiculo.findById(veiculoId);
        if (!veiculo) return res.status(404).json({ message: "Veículo não encontrado." });
        
        const userToRemove = await User.findOne({ email: emailToRemove.toLowerCase() });
        if (!userToRemove) return res.status(404).json({ message: `Usuário com o email "${emailToRemove}" não encontrado.` });

        if (veiculo.owner.toString() !== ownerId) return res.status(403).json({ message: "Acesso proibido. Apenas o proprietário pode revogar o acesso." });

        await Veiculo.updateOne({ _id: veiculoId }, { $pull: { sharedWith: userToRemove._id } });
        res.status(200).json({ message: `Acesso ao veículo removido com sucesso para ${emailToRemove}.` });
    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor ao revogar o compartilhamento.' });
    }
});

// CRIAR UMA NOVA MANUTENÇÃO
app.post('/api/veiculos/:veiculoId/manutencoes', authenticateToken, [
    body('data').isISO8601().toDate(),
    body('descricaoServico').not().isEmpty().trim().escape(),
    body('custo').isFloat({ min: 0 }).toFloat(),
    body('quilometragem').optional({ checkFalsy: true }).isInt({ min: 0 }).toInt()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: `Dados inválidos: ${errors.array().map(e => e.msg).join(', ')}` });
    try {
        const veiculo = await Veiculo.findById(req.params.veiculoId);
        if (!veiculo) return res.status(404).json({ message: "Veículo não encontrado." });

        if (veiculo.owner.toString() !== req.user.id && !veiculo.sharedWith.map(id => id.toString()).includes(req.user.id)) {
            return res.status(403).json({ message: "Você não tem permissão para adicionar manutenções a este veículo." });
        }
        const manutencao = await Manutencao.create({ ...req.body, veiculo: req.params.veiculoId });
        veiculo.historicoManutencao.push(manutencao._id);
        await veiculo.save();
        res.status(201).json(manutencao);
    } catch (error) {
        res.status(500).json({ message: "Ocorreu um erro interno no servidor." });
    }
});

// LER TODAS AS MANUTENÇÕES DE UM VEÍCULO
app.get('/api/veiculos/:veiculoId/manutencoes', authenticateToken, async (req, res) => {
    try {
        const veiculo = await Veiculo.findById(req.params.veiculoId);
        if (!veiculo) return res.status(404).json({ message: 'Veículo não encontrado.' });
        if (veiculo.owner.toString() !== req.user.id && !veiculo.sharedWith.map(id => id.toString()).includes(req.user.id)) {
            return res.status(403).json({ message: "Você não tem permissão para ver as manutenções deste veículo." });
        }
        const manutenções = await Manutencao.find({ veiculo: req.params.veiculoId }).sort({ data: -1 });
        res.status(200).json(manutenções);
    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// ROTA DE DICAS DE MANUTENÇÃO
app.get('/api/dicas-manutencao/:tipoVeiculo', (req, res) => {
    const { tipoVeiculo } = req.params;
    const mapeamento = { 'carro': 'carro', 'carroesportivo': 'esportivo', 'caminhao': 'caminhao' };
    const chave = mapeamento[tipoVeiculo.toLowerCase()];
    if (chave && dados.dicasManutencao) {
        res.json([...(dados.dicasManutencao.geral || []), ...(dados.dicasManutencao[chave] || [])]);
    } else {
        res.status(404).json({ message: `Nenhuma dica encontrada para o tipo: ${tipoVeiculo}` });
    }
});

// ROTA DE PREVISÃO DO TEMPO
app.get('/api/previsao', async (req, res) => {
    const { cidade } = req.query;
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) return res.status(500).json({ message: "Chave da API de previsão não configurada." });
    if (!cidade) return res.status(400).json({ message: "O nome da cidade é obrigatório." });

    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cidade)}&appid=${apiKey}&units=metric&lang=pt_br`;
    try {
        const response = await axios.get(url);
        const previsoesPorDia = {};
        response.data.list.forEach(item => {
            const dia = new Date(item.dt * 1000).toLocaleDateString('pt-BR', { weekday: 'long' });
            if (!previsoesPorDia[dia]) {
                previsoesPorDia[dia] = { diaSemana: dia.charAt(0).toUpperCase() + dia.slice(1), temps: [], descricoes: {}, icones: {} };
            }
            previsoesPorDia[dia].temps.push(item.main.temp);
            previsoesPorDia[dia].descricoes[item.weather[0].description] = (previsoesPorDia[dia].descricoes[item.weather[0].description] || 0) + 1;
            previsoesPorDia[dia].icones[item.weather[0].icon] = (previsoesPorDia[dia].icones[item.weather[0].icon] || 0) + 1;
        });
        const resultado = Object.values(previsoesPorDia).map(diaInfo => ({
            dia: diaInfo.diaSemana,
            temp_min: Math.round(Math.min(...diaInfo.temps)),
            temp_max: Math.round(Math.max(...diaInfo.temps)),
            descricao: Object.keys(diaInfo.descricoes).reduce((a, b) => diaInfo.descricoes[a] > diaInfo.descricoes[b] ? a : b),
            icone: `http://openweathermap.org/img/wn/${Object.keys(diaInfo.icones).reduce((a, b) => diaInfo.icones[a] > diaInfo.icones[b] ? a : b)}.png`
        }));
        res.status(200).json({ cidade: response.data.city.name, previsoes: resultado });
    } catch (error) {
        if (error.response?.status === 404) return res.status(404).json({ message: `Cidade "${cidade}" não encontrada.` });
        res.status(500).json({ message: "Não foi possível obter a previsão do tempo." });
    }
});


// =======================================================
// ----- INICIALIZAÇÃO DO SERVIDOR -----
// =======================================================
app.listen(port, () => {
    console.log(`[Servidor] Rodando e escutando em http://localhost:${port}`);
});