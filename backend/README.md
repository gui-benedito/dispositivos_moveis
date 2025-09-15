# Password Manager Backend

Backend para o aplicativo de gerenciamento de senhas com criptografia AES-256.

## 🚀 Funcionalidades Implementadas

### Sprint 1 - RF01 (Sistema)
- ✅ **Cadastro e autenticação básica**
  - Hash seguro com Argon2 (mais seguro que bcrypt)
  - Geração/validação de token JWT
  - Rate-limit no login (5 tentativas por 15 minutos)
  - Resposta padronizada de erros
  - Política de senha mínima (8+ caracteres, maiúscula, minúscula, número, símbolo)

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

3. **Configure as variáveis de ambiente:**
```bash
cp env.example .env
```

4. **Edite o arquivo `.env` com suas configurações:**
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
PORT=3000
NODE_ENV=development
```

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

## 🔒 Segurança Implementada

- **Hash de senhas**: Argon2id com configurações seguras
- **JWT**: Tokens com expiração configurável
- **Rate Limiting**: Proteção contra ataques de força bruta
- **Validação**: Validação rigorosa de entrada
- **CORS**: Configuração segura para desenvolvimento e produção
- **Helmet**: Headers de segurança HTTP
- **Bloqueio de conta**: Após 5 tentativas de login incorretas

## 📚 Documentação da API

A API possui documentação completa no Swagger UI:

**Acesse:** `http://localhost:3000/api-docs`

### Funcionalidades do Swagger:
- ✅ **Interface interativa** para testar todos os endpoints
- ✅ **Autenticação JWT** integrada (botão "Authorize")
- ✅ **Exemplos de requisição/resposta** para cada endpoint
- ✅ **Validação de schemas** em tempo real
- ✅ **Filtros e busca** para encontrar endpoints rapidamente
- ✅ **Persistência de autorização** entre sessões

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

### Com curl:

**Cadastro:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@exemplo.com",
    "password": "MinhaSenh@123",
    "firstName": "João",
    "lastName": "Silva"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@exemplo.com",
    "password": "MinhaSenh@123"
  }'
```

**Perfil (com token):**
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Com Postman/Insomnia:
Importe as rotas acima e teste com os mesmos dados.

## 📁 Estrutura do Projeto

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

## 🚨 Próximos Passos

- [ ] Implementar autenticação biométrica (RF02)
- [ ] Criar cofre de senhas criptografado (RF03)
- [ ] Implementar gerador de senhas (RF04)
- [ ] Adicionar bloqueio automático por inatividade (RF05)
- [ ] Criar categorias de senhas (RF06)

## 🐛 Troubleshooting

### Erro de conexão com banco:
- Verifique se o PostgreSQL está rodando
- Confirme as credenciais no `.env`
- Certifique-se de que o banco `password_manager_dev` existe

### Erro de JWT:
- Verifique se `JWT_SECRET` está definido no `.env`
- Use um secret forte em produção

### Rate limit:
- Aguarde o tempo de reset ou reinicie o servidor
- Em desenvolvimento, você pode ajustar os limites no `.env`
