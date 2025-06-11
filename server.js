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
            console.error(`[BACKEND] Erro da API OpenWeather (status ${error.response.status}):`, error.response.data.message);
            if (error.response.status === 404) {
                return res.status(404).json({ message: `Cidade '${cidade}' não encontrada. Verifique o nome e tente novamente.` });
            }
            return res.status(error.response.status).json({ message: error.response.data.message });
        }
        console.error("[BACKEND] Erro genérico ao tentar contatar a API OpenWeather:", error.message);
        res.status(500).json({ message: "Erro ao conectar com o serviço de previsão do tempo." });
    }
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

// 6. Rota principal para servir o index.html (fallback)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 7. Iniciar o Servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
    console.log(`✅ Aplicação acessível em http://localhost:${PORT}`);
});