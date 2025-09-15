import { connectionManager } from './connectionManager';

export const testConnection = async () => {
  console.log('🧪 Testando conexão com o backend...');
  
  try {
    const workingUrl = await connectionManager.findWorkingUrl();
    
    if (workingUrl) {
      return { 
        success: true, 
        message: `Conexão OK! URL funcionando: ${workingUrl}`,
        workingUrl: workingUrl
      };
    } else {
      return { 
        success: false, 
        message: 'Nenhuma URL funcionou. Verifique se o backend está rodando na porta 3000 e se não há firewall bloqueando.' 
      };
    }
  } catch (error: any) {
    return { 
      success: false, 
      message: `Erro no teste: ${error.message}` 
    };
  }
};
