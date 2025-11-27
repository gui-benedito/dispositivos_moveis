const { sequelize } = require('../config/database');
const User = require('./User');
const BiometricSession = require('./BiometricSession');
const Credential = require('./Credential');
const UserSettings = require('./UserSettings');
const TwoFactorAuth = require('./TwoFactorAuth');
const VerificationCode = require('./VerificationCode');
const Note = require('./Note');
const Backup = require('./Backup');
const CredentialVersion = require('./CredentialVersion');
const Category = require('./Category');
const SecurityEvent = require('./SecurityEvent');

// Associações entre modelos
User.hasMany(BiometricSession, { foreignKey: 'userId', as: 'biometricSessions' });
BiometricSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Credential, { foreignKey: 'userId', as: 'credentials' });
Credential.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Categorias personalizadas
User.hasMany(Category, { foreignKey: 'userId', as: 'categories' });
Category.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Versionamento de credenciais
Credential.hasMany(CredentialVersion, { foreignKey: 'credentialId', as: 'versions' });
CredentialVersion.belongsTo(Credential, { foreignKey: 'credentialId', as: 'credential' });
User.hasMany(CredentialVersion, { foreignKey: 'userId', as: 'credentialVersions' });
CredentialVersion.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(UserSettings, { foreignKey: 'userId', as: 'settings' });
UserSettings.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(TwoFactorAuth, { foreignKey: 'userId', as: 'twoFactorAuths' });
TwoFactorAuth.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(VerificationCode, { foreignKey: 'userId', as: 'verificationCodes' });
VerificationCode.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Note, { foreignKey: 'userId', as: 'notes' });
Note.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Backup, { foreignKey: 'userId', as: 'backups' });
Backup.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Eventos de segurança
User.hasMany(SecurityEvent, { foreignKey: 'userId', as: 'securityEvents' });
SecurityEvent.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Sincronizar modelos com o banco de dados
const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexão com banco de dados estabelecida com sucesso.');
    
    // Configuração de sincronização baseada no ambiente
    const syncOptions = {
      force: false, // Nunca forçar (não apaga dados)
      alter: process.env.NODE_ENV === 'development' ? true : false // Alterar tabelas em desenvolvimento
    };
    
    console.log('🔄 Sincronizando modelos com banco de dados...');
    console.log('📋 Opções de sincronização:', syncOptions);
    
    await sequelize.sync(syncOptions);
    
    console.log('✅ Modelos sincronizados com banco de dados.');
    console.log('📊 Tabelas disponíveis:', Object.keys(sequelize.models));
  } catch (error) {
    console.error('❌ Erro ao conectar com banco de dados:', error);
    console.error('💡 Verifique se o PostgreSQL está rodando e as credenciais estão corretas');
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  User,
  BiometricSession,
  Credential,
  CredentialVersion,
  UserSettings,
  TwoFactorAuth,
  VerificationCode,
  Note,
  Backup,
  Category,
  SecurityEvent,
  syncDatabase
};
