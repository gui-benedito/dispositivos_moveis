const getBaseUrl = () => {
  if (!process.env.EXPO_PUBLIC_API_BASE_URL) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL não definida. Configure a URL base da API no ambiente.');
  }
  return process.env.EXPO_PUBLIC_API_BASE_URL;
};

export const testConnection = async () => {
  console.log('🧪 Testando conexão com o backend (AWS/API Gateway - fetch direto)...');

  const base = getBaseUrl().replace(/\/+$/, '');
  const url = `${base}/health`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.log('❌ Resposta não OK do health:', response.status, text);
      return {
        success: false,
        message: `Health check respondeu com status ${response.status}.`,
      };
    }

    console.log('✅ Health check OK');
    return {
      success: true,
      message: `Conexão OK! Health check respondeu em ${url}`,
      workingUrl: 'https://eavmqeonva.execute-api.us-east-1.amazonaws.com/api',
    };
  } catch (error: any) {
    console.log('❌ Erro no fetch de health:', error?.message || error);
    return {
      success: false,
      message: `Erro no teste (fetch): ${error?.message || 'erro desconhecido'}`,
    };
  }
};
