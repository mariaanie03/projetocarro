// models/Veiculo.js

import mongoose from 'mongoose';

const veiculoSchema = new mongoose.Schema({
    placa: {
        type: String,
        required: [true, 'A placa é obrigatória.'],
        unique: true,
        uppercase: true,
        match: [/^[A-Z]{3}\d{1}[A-Z]{1}\d{2}$|^[A-Z]{3}\d{4}$/, 'Formato de placa inválido.']
    },
    marca: { 
        type: String, 
        required: [true, 'A marca é obrigatória.'] 
    },
    modelo: { 
        type: String, 
        required: [true, 'O modelo é obrigatório.'] 
    },
    ano: {
        type: Number,
        required: [true, 'O ano é obrigatório.'],
        min: [1900, 'Ano mínimo é 1900.'],
        max: [new Date().getFullYear() + 2, 'Ano máximo é o ano atual mais 2.']
    },
    cor: { 
        type: String, 
        required: [true, 'A cor é obrigatória.'] 
    },
    tipo: {
        type: String,
        required: [true, 'O tipo do veículo é obrigatório.'],
        enum: ['Carro', 'CarroEsportivo', 'Caminhao'],
        default: 'Carro'
    },
    historicoManutencao: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Manutencao'
    }],
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Um veículo deve ter um proprietário.']
    },
    // Campo para armazenar com quem o veículo foi compartilhado
    sharedWith: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User' // Um array de referências para outros usuários
    }]
}, {
    timestamps: true // Adiciona os campos createdAt e updatedAt
});

const Veiculo = mongoose.model('Veiculo', veiculoSchema);

export default Veiculo;