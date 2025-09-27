# Password Manager App - Frontend

Frontend React Native para o aplicativo de gerenciamento de senhas.

## 📋 Pré-requisitos

- Node.js 18+
- Expo CLI
- Backend rodando na porta 3000

## 🛠️ Instalação

1. **Navegue para a pasta do projeto:**
```bash
cd frontend/PasswordManagerApp
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Certifique-se que o backend está rodando:**
```bash
# No diretório backend
npm run start
```

4. **Inicie o aplicativo:**
```bash
# Para Android (com Expo Go)
npm run android
```

## 🔗 Configuração da API

O app está configurado para se conectar com o backend em:
- **Desenvolvimento:** `http://localhost:3000/api`
- **Produção:** Configurar variável de ambiente

## ⚙️ Arquivo .env (Frontend)

O frontend (Expo) suporta variáveis públicas com prefixo `EXPO_PUBLIC_`.

Crie um arquivo `.env` dentro de `frontend/PasswordManagerApp/` com:

```env
# Configurações da API (Expo)
EXPO_PUBLIC_API_BASE_URL=http://{IP_BACKEND}:3000/api
```

Notas importantes:

- Em emulador Android, se o backend estiver em sua máquina local, você pode usar `http://10.0.2.2:3000/api` (Android Emulator) ou `http://10.0.3.2:3000/api` (Genymotion). Em dispositivos físicos, use o IP da máquina (ex.: `http://192.168.0.68:3000/api`).
- O projeto também tenta detectar automaticamente uma URL funcional via `src/services/connectionManager.ts`. A variável `EXPO_PUBLIC_API_BASE_URL` tem prioridade quando definida.
- Após alterar `.env`, reinicie o servidor do Expo para aplicar as mudanças.