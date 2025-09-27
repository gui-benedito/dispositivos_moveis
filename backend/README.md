# Password Manager Backend

Backend para o aplicativo de gerenciamento de senhas com criptografia AES-256.

## 📋 Pré-requisitos

- Node.js 18+ 
- PostgreSQL 12+
- npm ou yarn

## 🛠️ Instalação

1. **Clone o repositório e navegue para a pasta backend:**
```bash
cd backend
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Edite o arquivo `.env` com suas configurações:**
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=password_manager_dev
DB_USER=postgres
DB_PASSWORD=sua_senha_aqui

# JWT Configuration
JWT_SECRET=seu_jwt_secret_super_seguro_aqui
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Server Configuration
SERVER_HOST=0.0.0.0
SERVER_PORT=3000
# (Opcional) Compatibilidade com plataformas que usam PORT
PORT=3000
NODE_ENV=development

# Rate Limiting (opcional)
RATE_LIMIT_WINDOW_MS=900000   # 15 minutos
RATE_LIMIT_MAX_REQUESTS=5     # máximo de tentativas por janela
```

### Descrição das variáveis de ambiente

- `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD`
  - Configuram a conexão com o PostgreSQL conforme `src/config/database.js`.
  - Ambientes: development, test, production (selecionado por `NODE_ENV`).

- `JWT_SECRET`
  - Chave secreta usada para assinar/verificar JWTs em `src/middleware/auth.js` e `src/middleware/sessionManager.js`.
  - Use um valor forte e mantenha em segredo.

- `JWT_EXPIRES_IN`
  - Expiração do Access Token (padrão: `24h`).

- `JWT_REFRESH_EXPIRES_IN`
  - Expiração do Refresh Token (padrão: `7d`).

- `SERVER_HOST` / `SERVER_PORT`
  - Host e porta do servidor HTTP em `src/server.js`.
  - Também utilizados na configuração do Swagger (`src/config/swagger.js`) para montar a URL do servidor em desenvolvimento.
  - `PORT` é aceito como fallback para compatibilidade com plataformas de deploy.

- `NODE_ENV`
  - Define o ambiente (`development`, `test`, `production`).
  - Em `development`, o CORS é permissivo e o Sequelize pode rodar com `alter` (ver `models/index.js`).

- `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX_REQUESTS` (opcionais)
  - Ajustam o rate limit do login em `src/middleware/rateLimiter.js`.
  - Valores padrão: 15 minutos / 5 tentativas.

### Dicas de configuração

- Garanta que o banco PostgreSQL está acessível com as credenciais configuradas.
- Use um `JWT_SECRET` robusto (>= 32 caracteres aleatórios) em produção.
- Se for acessar via rede local (emulators/dispositivos), ajuste `SERVER_HOST` para o IP da sua máquina e libere a porta 3000 no firewall.

5. **Crie o banco de dados PostgreSQL:**
```sql
CREATE DATABASE password_manager_dev;
```

6. **Inicie o servidor:**
```bash
# Desenvolvimento (com nodemon)
npm run dev

# Produção
npm start
```

## 🔗 Endpoints da API

### Autenticação

#### POST `/api/auth/register`
Cadastro de novo usuário.

**Body:**
```json
{
  "email": "usuario@exemplo.com",
  "password": "MinhaSenh@123",
  "firstName": "João",
  "lastName": "Silva"
}
```

**Resposta de sucesso (201):**
```json
{
  "success": true,
  "message": "Usuário criado com sucesso",
  "data": {
    "user": {
      "id": "uuid",
      "email": "usuario@exemplo.com",
      "firstName": "João",
      "lastName": "Silva",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "jwt_token_aqui",
      "refreshToken": "refresh_token_aqui"
    }
  }
}
```

#### POST `/api/auth/login`
Login do usuário.

**Body:**
```json
{
  "email": "usuario@exemplo.com",
  "password": "MinhaSenh@123"
}
```

**Resposta de sucesso (200):**
```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "data": {
    "user": {
      "id": "uuid",
      "email": "usuario@exemplo.com",
      "firstName": "João",
      "lastName": "Silva"
    },
    "tokens": {
      "accessToken": "jwt_token_aqui",
      "refreshToken": "refresh_token_aqui"
    }
  }
}
```

#### POST `/api/auth/refresh-token`
Renovar token de acesso.

**Body:**
```json
{
  "refreshToken": "refresh_token_aqui"
}
```

#### GET `/api/auth/profile`
Obter perfil do usuário autenticado.

**Headers:**
```
Authorization: Bearer jwt_token_aqui
```

#### GET `/api/auth/check-email?email=usuario@exemplo.com`
Verificar se email está disponível.

#### POST `/api/auth/logout`
Logout do usuário.

**Headers:**
```
Authorization: Bearer jwt_token_aqui
```

### Outros Endpoints

#### GET `/api/health`
Health check da API.

#### GET `/api/`
Informações da API.

## 📚 Documentação da API

A API possui documentação completa no Swagger UI:

**Acesse:** `http://localhost:3000/api-docs`

### Como usar o Swagger:

1. **Acesse** `http://localhost:3000/api-docs`
2. **Para testar endpoints protegidos:**
   - Faça login primeiro (`POST /api/auth/login`)
   - Copie o `accessToken` da resposta
   - Clique em "Authorize" no topo da página
   - Cole o token no formato: `Bearer SEU_TOKEN_AQUI`
   - Agora você pode testar endpoints protegidos

## 🧪 Testando a API

### Com Swagger UI (Recomendado):
1. Acesse `http://localhost:3000/api-docs`
2. Use a interface interativa para testar todos os endpoints
3. Veja exemplos de requisição/resposta em tempo real


```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # Configuração do Sequelize
│   ├── controllers/
│   │   └── authController.js    # Lógica de autenticação
│   ├── middleware/
│   │   ├── auth.js              # Middleware de autenticação JWT
│   │   ├── validation.js        # Validações de entrada
│   │   └── rateLimiter.js       # Rate limiting
│   ├── models/
│   │   ├── User.js              # Modelo de usuário
│   │   └── index.js             # Configuração dos modelos
│   ├── routes/
│   │   ├── auth.js              # Rotas de autenticação
│   │   └── index.js             # Rotas principais
│   └── server.js                # Servidor principal
├── package.json
├── env.example
├── .gitignore
└── README.md
```