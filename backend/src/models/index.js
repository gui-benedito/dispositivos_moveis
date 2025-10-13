const { sequelize } = require('../config/database');
const User = require('./User');
const BiometricSession = require('./BiometricSession');
const Credential = require('./Credential');
const UserSettings = require('./UserSettings');
const TwoFactorAuth = require('./TwoFactorAuth');
const VerificationCode = require('./VerificationCode');
const Note = require('./Note');

// Associações entre modelos
User.hasMany(BiometricSession, { foreignKey: 'userId', as: 'biometricSessions' });
BiometricSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Credential, { foreignKey: 'userId', as: 'credentials' });
Credential.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(UserSettings, { foreignKey: 'userId', as: 'settings' });
UserSettings.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(TwoFactorAuth, { foreignKey: 'userId', as: 'twoFactorAuths' });
TwoFactorAuth.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(VerificationCode, { foreignKey: 'userId', as: 'verificationCodes' });
VerificationCode.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Note, { foreignKey: 'userId', as: 'notes' });
Note.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Sincronizar modelos com o banco de dados
const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexão com banco de dados estabelecida com sucesso.');
    
    // Sincronizar modelos (force: true apenas em desenvolvimento)
    await sequelize.sync({ 
      force: process.env.NODE_ENV === 'development' ? false : false,
      alter: process.env.NODE_ENV === 'development' ? true : false
    });
    
    console.log('✅ Modelos sincronizados com banco de dados.');
  } catch (error) {
    console.error('❌ Erro ao conectar com banco de dados:', error);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  User,
  BiometricSession,
  Credential,
  UserSettings,
  TwoFactorAuth,
  VerificationCode,
  Note,
  syncDatabase
};
