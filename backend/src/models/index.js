const { sequelize } = require('../config/database');
const User = require('./User');

// Associações entre modelos (quando tivermos mais modelos)
// User.hasMany(Credential, { foreignKey: 'userId' });
// Credential.belongsTo(User, { foreignKey: 'userId' });

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
  syncDatabase
};
