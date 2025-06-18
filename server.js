// 1. Importar as dependências
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

// 2. Inicializar o aplicativo Express
const app = express();
const PORT = process.env.PORT || 3000;

// 3. Dados Simulados para as novas rotas (Mock Database)
const dicasManutencaoGerais = [
    { id: 1, dica: "Verifique o nível do óleo do motor regularmente." },
    { id: 2, dica: "Mantenha os pneus calibrados com a pressão correta." },
    { id: 3, dica: "Confira o estado e o nível do fluido de arrefecimento." },
    { id: 4, dica: "Teste os freios e observe qualquer ruído estranho." }
];

const dicasPorTipo = {
    carro: [
        { id: 10, dica: "Faça o rodízio dos pneus a cada 10.000 km para um desgaste uniforme." },
        { id: 11, dica: "Verifique o filtro de ar do motor e da cabine a cada revisão." }
    ],
    carroesportivo: [
        { id: 15, dica: "Verifique o desgaste dos pneus com mais frequência, especialmente após uso intenso." },
        { id: 16, dica: "Use somente fluidos de freio de alta performance (DOT 4 ou superior)." }
    ],
    caminhao: [
        { id: 20, dica: "Verifique o sistema de freios a ar (cuícas) diariamente antes de iniciar a viagem." },
        { id: 21, dica: "Inspecione o estado da 'quinta roda' e sua lubrificação." }
    ],
    moto: [
        { id: 25, dica: "Lubrifique a corrente da moto a cada 500 km." }
    ]
};

// Dados do "Arsenal da Garagem"
const veiculosDestaque = [
    { id: 10, modelo: "Maverick Híbrido", ano: 2024, destaque: "Economia e Estilo", imagemUrl: "images/maverick.jpg" },
    { id: 11, modelo: "Kombi Elétrica ID.Buzz", ano: 2025, destaque: "Nostalgia Eletrificada", imagemUrl: "images/idbuzz.jpg" },
    { id: 12, modelo: "Ferrari 296 GTB", ano: 2023, destaque: "O Futuro V6 Híbrido", imagemUrl: "images/ferrari296.jpg" }
];

const servicosGaragem = [
    { id: "svc001", nome: "Diagnóstico Eletrônico Completo", descricao: "Verificação de todos os sistemas eletrônicos do veículo.", precoEstimado: "R$ 250,00" },
    { id: "svc002", nome: "Alinhamento e Balanceamento 3D", descricao: "Para uma direção perfeita e maior durabilidade dos pneus.", precoEstimado: "R$ 180,00" },
    { id: "svc003", nome: "Polimento Técnico e Vitrificação", descricao: "Proteção e brilho para a pintura do seu carro.", precoEstimado: "R$ 800,00" }
];


// 4. Configurar Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));


// 5. ROTAS DA API
app.get('/api/weather', async (req, res) => {
    const cidade = req.query.cidade;
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!cidade) {
        return res.status(400).json({ message: "O nome da cidade é obrigatório." });
    }
    if (!apiKey) {
        console.error("[BACKEND] ERRO: OPENWEATHER_API_KEY não encontrada no arquivo .env");
        return res.status(500).json({ message: "Chave da API de clima não configurada no servidor." });
    }

    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${cidade}&appid=${apiKey}&units=metric&lang=pt_br`;

    console.log(`[BACKEND] Buscando clima para '${cidade}'.`);

    try {
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        if (error.response) {
            // Este erro veio da API OpenWeather (ela respondeu com 4xx ou 5xx)
            const status = error.response.status;
            const data = error.response.data;
            // Verificação segura da mensagem de erro da API
            const apiMessage = (data && data.message) ? data.message : 'A API de clima retornou uma resposta inesperada.';

            console.error(`[BACKEND] Erro da API OpenWeather (status ${status}):`, apiMessage);

            if (status === 404) {
                return res.status(404).json({ message: `Cidade '${cidade}' não encontrada. Verifique o nome e tente novamente.` });
            }
            if (status === 401) {
                // Mensagem de erro mais útil para o desenvolvedor
                return res.status(500).json({ message: 'A chave da API de clima é inválida ou não foi ativada. Verifique o arquivo .env no servidor.' });
            }
            // Para outros erros da API (ex: 429 Too Many Requests)
            return res.status(status).json({ message: apiMessage });
        }
    }
    // Este é um erro genérico de rede (ex: DNS, timeout, servidor sem internet)
    console.error("[BACKEND] Erro genérico ao tentar contatar a API OpenWeather:", error.message);
    res.status(500).json({ message: "Erro ao conectar com o serviço de previsão do tempo. Verifique a conexão do servidor." });
    // --- FIM DA CORREÇÃO ---
});

app.get('/api/dicas-manutencao', (req, res) => {
    console.log("[BACKEND] Requisição recebida para /api/dicas-manutencao");
    res.json(dicasManutencaoGerais);
});

app.get('/api/dicas-manutencao/:tipoVeiculo', (req, res) => {
    const tipo = req.params.tipoVeiculo.toLowerCase();
    console.log(`[BACKEND] Requisição recebida para /api/dicas-manutencao/${tipo}`);

    const dicas = dicasPorTipo[tipo];

    if (dicas) {
        res.json(dicas);
    } else {
        console.log(`[BACKEND] Nenhuma dica específica encontrada para '${tipo}'. Retornando array vazio.`);
        res.json([]);
    }
});

// NOVAS ROTAS DO "ARSENAL DA GARAGEM"
app.get('/api/garagem/veiculos-destaque', (req, res) => {
    console.log("[BACKEND] Requisição para /api/garagem/veiculos-destaque");
    res.json(veiculosDestaque);
});

app.get('/api/garagem/servicos-oferecidos', (req, res) => {
    console.log("[BACKEND] Requisição para /api/garagem/servicos-oferecidos");
    res.json(servicosGaragem);
});

// ROTA OPCIONAL com parâmetro :idServico
app.get('/api/garagem/servicos-oferecidos/:idServico', (req, res) => {
    const { idServico } = req.params;
    console.log(`[BACKEND] Requisição para serviço específico. ID: ${idServico}`);

    const servico = servicosGaragem.find(s => s.id === idServico);

    if (servico) {
        res.json(servico);
    } else {
        res.status(404).json({ message: `Serviço com ID '${idServico}' não encontrado.` });
    }
});


// 6. Rota principal para servir o index.html (fallback)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 7. Iniciar o Servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
    console.log(`✅ Aplicação acessível em http://localhost:${PORT}`);
});