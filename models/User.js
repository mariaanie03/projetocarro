// models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs'; // Importa bcryptjs para hash de senha

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'O email é obrigatório.'],
        unique: true, // Garante que cada email seja único no banco de dados
        lowercase: true, // Armazena emails em minúsculas
        trim: true, // Remove espaços em branco antes e depois
        match: [/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/, 'Por favor, insira um email válido.'] // Regex para validação básica de email
    },
    password: {
        type: String,
        required: [true, 'A senha é obrigatória.'],
        minlength: [6, 'A senha deve ter no mínimo 6 caracteres.'] // Define um comprimento mínimo para a senha
    },
    // NOVOS CAMPOS PARA RASTREAMENTO DE LOGIN
    lastLogin: {
        type: Date,
        default: null // Pode ser nulo até o primeiro login
    },
    loginCount: {
        type: Number,
        default: 0 // Inicia com 0 logins
    }
}, {
    timestamps: true // Adiciona automaticamente os campos createdAt e updatedAt
});

// Middleware pre-save para hash da senha
// Será executado ANTES de salvar um documento User no banco de dados
userSchema.pre('save', async function(next) {
    // Só faz hash da senha se ela foi modificada (ou é um novo usuário sendo criado)
    if (!this.isModified('password')) {
        return next(); // Se a senha não foi modificada, passa para o próximo middleware/salvamento
    }
    try {
        const salt = await bcrypt.genSalt(10); // Gera um salt (valor aleatório) para ser usado no hash. O custo (10) define a complexidade.
        this.password = await bcrypt.hash(this.password, salt); // Faz o hash da senha usando o salt
        next(); // Continua com o processo de salvamento
    } catch (error) {
        next(error); // Se houver um erro no processo de hash, passa o erro para o próximo middleware
    }
});

// Método para comparar a senha fornecida pelo usuário com a senha hashada no banco de dados
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password); // Retorna true se as senhas coincidirem, false caso contrário
};

const User = mongoose.model('User', userSchema);

export default User;