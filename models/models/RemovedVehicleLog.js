// models/RemovedVehicleLog.js
import mongoose from 'mongoose';

const removedVehicleLogSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Informações do veículo no momento da remoção
    placa: { type: String, uppercase: true, required: true },
    marca: { type: String, required: true },
    modelo: { type: String, required: true },
    ano: { type: Number, required: true },
    cor: { type: String, required: true },
    tipo: { type: String, required: true },
    // Data e hora da remoção
    deletionDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true // Adiciona createdAt e updatedAt para o log
});

const RemovedVehicleLog = mongoose.model('RemovedVehicleLog', removedVehicleLogSchema);

export default RemovedVehicleLog;