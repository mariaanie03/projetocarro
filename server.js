// server.js (Com as alterações da Fase 2 aplicadas)

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
import multer from 'multer'; // <-- Importado
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
// ----- MUDANÇA 1: CONFIGURAÇÃO DO MULTER -----
// =======================================================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, 'uploads/');
    if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath); // Onde salvar os arquivos
  },
  filename: function (req, file, cb) {
    // Cria um nome de arquivo único
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

// MUDANÇA 2: Servir arquivos estáticos da pasta 'uploads'
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

    if (token == null) {
        return res.status(401).json({ message: 'Acesso não autorizado: Nenhum token fornecido.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido ou expirado.' });
        }
        req.user = user;
        next();
    });
};

// =======================================================
// ----- ROTAS DA API -----
// =======================================================

// --- ROTAS DE AUTENTICAÇÃO --- (Sem alterações)
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
        if (!user || !(await user.comparePassword(password))) {
            return res.status(400).json({ message: 'Credenciais inválidas.' });
        }
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
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// --- ROTAS CRUD PARA VEÍCULOS ---

// MUDANÇA 3: Rota de CRIAÇÃO de veículo foi substituída
app.post('/api/veiculos',
    authenticateToken,
    createVehicleLimiter,
    upload.single('imagemVeiculo'), // Middleware do Multer
    [
        body('placa').matches(/^[A-Z]{3}\d{1}[A-Z]{1}\d{2}$|^[A-Z]{3}\d{4}$/).trim().toUpperCase(),
        body('marca').not().isEmpty().trim().escape(),
        body('modelo').not().isEmpty().trim().escape(),
        body('ano').isInt({ min: 1900, max: new Date().getFullYear() + 2 }).toInt(),
        body('cor').not().isEmpty().trim().escape(),
        body('tipo').isIn(['Carro', 'CarroEsportivo', 'Caminhao'])
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: `Dados inválidos: ${errors.array().map(e => e.msg).join(', ')}` });
        }
        try {
            // Pega o caminho do arquivo, se ele foi enviado
            const imageUrl = req.file ? req.file.path.replace(/\\/g, "/") : null;

            // Junta os dados do formulário (req.body) com os dados do usuário e da imagem
            const veiculoData = {
                ...req.body,
                owner: req.user.id,
                imageUrl: imageUrl
            };

            const veiculoCriado = await Veiculo.create(veiculoData);
            res.status(201).json(veiculoCriado);
        } catch (error) {
            if (error.code === 11000) return res.status(409).json({ message: 'Erro: A placa informada já existe.' });
            console.error("Erro ao criar veículo:", error); // Adicionado para facilitar a depuração
            res.status(500).json({ message: 'Erro interno do servidor ao criar o veículo.' });
        }
    }
);


// LER todos os Veículos (Sem alterações)
app.get('/api/veiculos', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id; 

        const todosOsVeiculos = await Veiculo.find({
            $or: [
                { owner: userId },
                { sharedWith: userId }
            ]
        })
        .populate({
            path: 'historicoManutencao',
            model: 'Manutencao',
            options: { sort: { 'data': -1 } }
        })
        .populate('owner', 'email')
        .populate('sharedWith', 'email')
        .sort({ createdAt: -1 });

        res.status(200).json(todosOsVeiculos);
    } catch (error) {
        console.error('❌ Erro ao buscar os veículos:', error);
        res.status(500).json({ message: 'Erro ao buscar os veículos.' });
    }
});


// ATUALIZAR um Veículo existente (Sem alterações)
app.put('/api/veiculos/:id', authenticateToken, [
    body('placa').matches(/^[A-Z]{3}\d{1}[A-Z]{1}\d{2}$|^[A-Z]{3}\d{4}$/).trim().toUpperCase(),
    body('marca').not().isEmpty().trim().escape(),
    body('modelo').not().isEmpty().trim().escape(),
    body('ano').isInt({ min: 1900, max: new Date().getFullYear() + 2 }).toInt(),
    body('cor').not().isEmpty().trim().escape(),
    body('tipo').isIn(['Carro', 'CarroEsportivo', 'Caminhao'])
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: `Dados inválidos: ${errors.array().map(e => e.msg).join(', ')}` });
    }
    try {
        const veiculo = await Veiculo.findOne({ _id: req.params.id, owner: req.user.id });
        if (!veiculo) {
            return res.status(404).json({ message: "Veículo não encontrado ou você não tem permissão para atualizá-lo." });
        }
        const veiculoAtualizado = await Veiculo.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        res.status(200).json(veiculoAtualizado);
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: 'Erro: Essa placa já pertence a outro veículo.' });
        res.status(500).json({ message: 'Erro interno do servidor ao atualizar o veículo.' });
    }
});

// DELETAR um Veículo (Sem alterações)
app.delete('/api/veiculos/:id', authenticateToken, async (req, res) => {
    try {
        const veiculoToDelete = await Veiculo.findOne({ _id: req.params.id, owner: req.user.id });
        if (!veiculoToDelete) {
            return res.status(404).json({ message: "Veículo não encontrado ou você não tem permissão para deletá-lo." });
        }
        const removedLog = new RemovedVehicleLog({
            owner: req.user.id,
            placa: veiculoToDelete.placa,
            marca: veiculoToDelete.marca,
            modelo: veiculoToDelete.modelo,
            ano: veiculoToDelete.ano,
            cor: veiculoToDelete.cor,
            tipo: veiculoToDelete.tipo
        });
        await removedLog.save();
        await Manutencao.deleteMany({ veiculo: req.params.id });
        await Veiculo.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: `Veículo ${veiculoToDelete.placa} deletado com sucesso.` });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar o veículo.' });
    }
});


// Rotas de COMPARTILHAMENTO, MANUTENÇÃO, DICAS e PREVISÃO (Sem alterações)
// ... (O restante do seu código permanece exatamente o mesmo) ...

// ROTA: COMPARTILHAR UM VEÍCULO
app.post('/api/veiculos/:veiculoId/share', authenticateToken, /* ... */ );
// ROTA: REVOGAR O COMPARTILHAMENTO DE UM VEÍCULO
app.post('/api/veiculos/:veiculoId/unshare', authenticateToken, /* ... */ );
// CRIAR UMA NOVA MANUTENÇÃO
app.post('/api/veiculos/:veiculoId/manutencoes', authenticateToken, /* ... */ );
// LER TODAS AS MANUTENÇÕES DE UM VEÍCULO
app.get('/api/veiculos/:veiculoId/manutencoes', authenticateToken, /* ... */ );
// --- OUTRAS ROTAS DA API (DICAS, PREVISÃO DO TEMPO) ---
app.get('/api/dicas-manutencao/:tipoVeiculo', /* ... */ );
app.get('/api/previsao', /* ... */ );


// =======================================================
// ----- INICIALIZAÇÃO DO SERVIDOR -----
// =======================================================
app.listen(port, () => {
    console.log(`[Servidor] Rodando e escutando em http://localhost:${port}`);
});