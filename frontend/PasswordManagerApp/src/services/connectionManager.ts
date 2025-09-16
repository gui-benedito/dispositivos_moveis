import axios from 'axios';

class ConnectionManager {
  private workingUrl: string | null = null;
  private urlsToTest = [
    'http://192.168.0.68:3000/api', // IP do Wi-Fi
    'http://192.168.56.1:3000/api', // IP Ethernet
    'http://localhost:3000/api',
    'http://127.0.0.1:3000/api',
    'http://10.0.2.2:3000/api', // Android emulator
  ];

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
