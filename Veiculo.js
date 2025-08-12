// models/Veiculo.js

import mongoose from 'mongoose';

const veiculoSchema = new mongoose.Schema({
    placa: {
        type: String,
        required: [true, 'A placa do veículo é obrigatória.'],
        unique: true, // Garante que não haverá duas placas iguais no banco de dados.
        trim: true,   // Remove espaços em branco do início e do fim.
        uppercase: true // Converte a string da placa para maiúsculas.
    },
    marca: {
        type: String,
        required: [true, 'A marca do veículo é obrigatória.'],
        trim: true
    },
    modelo: {
        type: String,
        required: [true, 'O modelo do veículo é obrigatório.'],
        trim: true
    },
    cor: {
        type: String,
        required: [true, 'A cor do veículo é obrigatória.'],
        trim: true
    },
    ano: {
        type: Number,
        required: [true, 'O ano do veículo é obrigatório.'],
        min: [1886, 'O ano parece ser muito antigo.'] // O primeiro carro foi feito em 1886 :)
    },
    tipo: {
        type: String,
        required: [true, 'O tipo do veículo é obrigatório.'],
        // enum garante que o valor seja uma das opções da lista.
        enum: {
            values: ['Carro', 'CarroEsportivo', 'Caminhao'],
            message: 'O tipo de veículo fornecido ({VALUE}) não é válido.'
        }
    },
    
    // CAMPO DE RELACIONAMENTO:
    // Este campo armazenará uma lista de IDs (_id) de documentos da coleção 'Manutencao'.
    // A propriedade 'ref' é crucial para que o Mongoose saiba qual modelo "popular" (buscar).
    historicoManutencao: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Manutencao'
    }]

}, { 
    // Opções do Schema:
    // `timestamps: true` adiciona automaticamente os campos `createdAt` e `updatedAt`.
    timestamps: true 
});

// Cria o modelo 'Veiculo' a partir do schema definido.
// O Mongoose criará uma coleção chamada 'veiculos' (plural e minúsculo) no MongoDB.
const Veiculo = mongoose.model('Veiculo', veiculoSchema);

export default Veiculo;