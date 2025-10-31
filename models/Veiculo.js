// models/Veiculo.js

import mongoose from 'mongoose';

const veiculoSchema = new mongoose.Schema({
    // Dados principais do veículo
    placa: { 
        type: String, 
        required: [true, 'A placa é obrigatória.'], 
        unique: true, 
        trim: true, 
        uppercase: true,
        match: [/^[A-Z]{3}\d{1}[A-Z]{1}\d{2}$|^[A-Z]{3}\d{4}$/, 'Formato de placa inválido. Use ABC1234 ou ABC1D23.']
    },
    marca: { 
        type: String, 
        required: [true, 'A marca é obrigatória.'], 
        trim: true 
    },
    modelo: { 
        type: String, 
        required: [true, 'O modelo é obrigatório.'], 
        trim: true 
    },
    ano: { 
        type: Number, 
        required: [true, 'O ano é obrigatório.'],
        min: 1900,
        max: new Date().getFullYear() + 2 // Permite carros do ano seguinte
    },
    cor: { 
        type: String, 
        required: [true, 'A cor é obrigatória.'], 
        trim: true 
    },
    tipo: { 
        type: String, 
        required: [true, 'O tipo do veículo é obrigatório.'], 
        enum: ['Carro', 'CarroEsportivo', 'Caminhao'] // Garante que o valor seja um dos permitidos
    },
    
    // --- CAMPO ADICIONADO NA FASE 2 ---
    // Caminho para a imagem do veículo salva no servidor
    imageUrl: { 
        type: String, 
        required: false // A imagem é opcional
    },

    // Relacionamentos com outros modelos
    owner: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', // Referência ao modelo de Usuário
        required: true 
    },
    sharedWith: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    historicoManutencao: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Manutencao' // Referência ao modelo de Manutenção
    }],
}, {
    // Adiciona os campos createdAt e updatedAt automaticamente
    timestamps: true
});

// Cria o modelo 'Veiculo' a partir do schema definido
const Veiculo = mongoose.model('Veiculo', veiculoSchema);

// Exporta o modelo para ser utilizado em outras partes da aplicação
export default Veiculo;