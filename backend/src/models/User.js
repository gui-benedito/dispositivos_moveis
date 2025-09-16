const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');
const argon2 = require('argon2');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: {
        msg: 'Email deve ter um formato válido'
      },
      notEmpty: {
        msg: 'Email é obrigatório'
      }
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Senha é obrigatória'
      },
      len: {
        args: [8, 128],
        msg: 'Senha deve ter entre 8 e 128 caracteres'
      }
    }
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Nome é obrigatório'
      },
      len: {
        args: [2, 50],
        msg: 'Nome deve ter entre 2 e 50 caracteres'
      }
    }
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Sobrenome é obrigatório'
      },
      len: {
        args: [2, 50],
        msg: 'Sobrenome deve ter entre 2 e 50 caracteres'
      }
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  loginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lockUntil: {
    type: DataTypes.DATE,
    allowNull: true
  },
  biometricEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  biometricType: {
    type: DataTypes.ENUM('fingerprint'),
    allowNull: true
  },
  biometricLastUsed: {
    type: DataTypes.DATE,
    allowNull: true
  },
  twoFactorEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  twoFactorSecret: {
    type: DataTypes.STRING,
    allowNull: true
  },
  backupCodes: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  paranoid: true, // Soft delete
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        // Usar Argon2 para hash da senha (mais seguro que bcrypt)
        user.password = await argon2.hash(user.password, {
          type: argon2.argon2id,
          memoryCost: 2 ** 16, // 64 MB
          timeCost: 3,
          parallelism: 1
        });
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await argon2.hash(user.password, {
          type: argon2.argon2id,
          memoryCost: 2 ** 16,
          timeCost: 3,
          parallelism: 1
        });
      }
    }
  }
});

// Método para verificar senha
User.prototype.validatePassword = async function(password) {
  try {
    return await argon2.verify(this.password, password);
  } catch (error) {
    console.error('Erro ao verificar senha:', error);
    return false;
  }
};

// Método para verificar se conta está bloqueada
User.prototype.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Método para incrementar tentativas de login
User.prototype.incLoginAttempts = async function() {
  // Se já está bloqueado e o tempo de bloqueio expirou, resetar
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.update({
      loginAttempts: 1,
      lockUntil: null
    });
  }

  const updates = { loginAttempts: this.loginAttempts + 1 };

  // Bloquear conta após 5 tentativas por 2 horas
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.lockUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 horas
  }

  return this.update(updates);
};

// Método para resetar tentativas de login
User.prototype.resetLoginAttempts = async function() {
  return this.update({
    loginAttempts: 0,
    lockUntil: null
  });
};

// Método para retornar dados seguros (sem senha)
User.prototype.toSafeJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  delete values.twoFactorSecret;
  delete values.backupCodes;
  return values;
};

module.exports = User;
