// models/Veiculo.js
import mongoose from 'mongoose';

// 1. CRIAMOS UM SCHEMA PARA O SUB-DOCUMENTO DE MANUTENÇÃO
const manutencaoSchema = new mongoose.Schema({
    data: { type: Date, required: true },
    tipo: { type: String, required: true, trim: true },
    custo: { type: Number, required: true, min: 0 },
    descricao: { type: String, trim: true }
});

// 2. ATUALIZAMOS O SCHEMA PRINCIPAL DO VEÍCULO
const veiculoSchema = new mongoose.Schema({
    placa: { type: String, required: true, unique: true, uppercase: true, trim: true },
    tipo: { type: String, required: true, enum: ['Carro', 'CarroEsportivo', 'Caminhao'] },
    marca: { type: String, required: true },
    modelo: { type: String, required: true },
    ano: { type: Number, required: true, min: 1900 },
    cor: { type: String, required: true },

    // 3. ADICIONAMOS UM CAMPO PARA GUARDAR UMA LISTA DE MANUTENÇÕES
    // Ele será um array, e cada item dentro dele deve seguir o formato do manutencaoSchema.
    historicoManutencao: [manutencaoSchema] 
}, { 
    timestamps: true 
});

const Veiculo = mongoose.model('Veiculo', veiculoSchema);

export default Veiculo;