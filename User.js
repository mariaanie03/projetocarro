// models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs'; // Importa bcrypt para hash de senha

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'O email é obrigatório.'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/, 'Por favor, insira um email válido.']
    },
    password: {
        type: String,
        required: [true, 'A senha é obrigatória.'],
        minlength: [6, 'A senha deve ter no mínimo 6 caracteres.']
    }
}, {
    timestamps: true // Adiciona createdAt e updatedAt
});

// Middleware pre-save para hash da senha
// Será executado antes de salvar um documento User
userSchema.pre('save', async function(next) {
    // Só faz hash da senha se ela foi modificada (ou é um novo usuário)
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10); // Gera um salt (custo 10 é um bom padrão)
        this.password = await bcrypt.hash(this.password, salt); // Faz o hash da senha
        next();
    } catch (error) {
        next(error); // Passa o erro para o próximo middleware
    }
});

// Método para comparar a senha fornecida com a senha hashada no banco de dados
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;