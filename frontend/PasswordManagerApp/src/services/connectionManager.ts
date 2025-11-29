import axios from 'axios';

const getBaseUrlFromEnv = (): string => {
  if (!process.env.EXPO_PUBLIC_API_BASE_URL) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL não definida. Configure a URL base da API no ambiente.');
  }
  return process.env.EXPO_PUBLIC_API_BASE_URL;
};

class ConnectionManager {
  private workingUrl: string | null = null;
  private urlsToTest = this.getUrlsToTest();

  private getUrlsToTest(): string[] {
    // Preferir URL vinda de variável de ambiente, com fallback seguro
    const base = getBaseUrlFromEnv();
    return [base];
  }

  async findWorkingUrl(): Promise<string | null> {
    if (this.workingUrl) {
      return this.workingUrl;
    }

    console.log('🔍 Procurando URL funcionando...');
    
    for (const url of this.urlsToTest) {
      try {
        console.log(`🧪 Testando: ${url}`);
        const response = await axios.get(`${url}/health`, {
          timeout: 3000,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        });
        
        if (response.status === 200) {
          console.log(`✅ URL funcionando: ${url}`);
          this.workingUrl = url;
          return url;
        }
      } catch (error) {
        console.log(`❌ Falha em ${url}:`, (error as any).message);
        continue;
      }
    }
    
    console.log('❌ Nenhuma URL funcionou');
    return null;
  }

  getWorkingUrl(): string | null {
    return this.workingUrl;
  }

  reset(): void {
    this.workingUrl = null;
  }
}

export const connectionManager = new ConnectionManager();
