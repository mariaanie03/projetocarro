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
    marca: { type: String, required: [true, 'A marca é obrigatória.'] },
    modelo: { type: String, required: [true, 'O modelo é obrigatório.'] },
    ano: {
        type: Number,
        required: [true, 'O ano é obrigatório.'],
        min: [1900, 'Ano mínimo é 1900.'],
        max: [new Date().getFullYear() + 2, 'Ano máximo é o ano atual mais 2.']
    },
    cor: { type: String, required: [true, 'A cor é obrigatória.'] },
    tipo: {
        type: String,
        required: [true, 'O tipo do veículo é obrigatório.'],
        enum: ['Carro', 'CarroEsportivo', 'Caminhao'],
        default: 'Carro'
    },
    // NOVO CAMPO PARA O HISTÓRICO DE MANUTENÇÃO
    historicoManutencao: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Manutencao'
    }],
    // NOVO CAMPO: Associando o veículo a um usuário (dono)
    owner: {
        type: mongoose.Schema.Types.ObjectId, // Tipo ObjectId para referenciar outro documento
        ref: 'User', // O nome do modelo que está sendo referenciado
        required: [true, 'Um veículo deve ter um proprietário.'] // Torna o proprietário obrigatório
    }
}, {
    timestamps: true // Adiciona createdAt e updatedAt
});

const Veiculo = mongoose.model('Veiculo', veiculoSchema);

export default Veiculo;