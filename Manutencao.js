// models/Manutencao.js

import mongoose from 'mongoose';

const manutencaoSchema = new mongoose.Schema({
    descricaoServico: {
        type: String,
        required: [true, 'A descrição do serviço é obrigatória.']
    },
    data: {
        type: Date,
        required: true,
        default: Date.now // Define a data atual como padrão
    },
    custo: {
        type: Number,
        required: [true, 'O custo é obrigatório.'],
        min: [0, 'O custo não pode ser negativo.']
    },
    quilometragem: {
        type: Number,
        min: [0, 'A quilometragem não pode ser negativa.'],
        default: 0
    },
    // Este é o campo que cria o relacionamento com Veiculo
    veiculo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Veiculo', // A referência para o modelo 'Veiculo'
        required: true
    }
}, { timestamps: true }); // timestamps adiciona createdAt e updatedAt automaticamente

const Manutencao = mongoose.model('Manutencao', manutencaoSchema);

export default Manutencao;