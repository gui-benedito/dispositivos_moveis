# Password Manager App - Frontend

Frontend React Native para o aplicativo de gerenciamento de senhas.

## 🚀 Funcionalidades Implementadas

### Sprint 1 - RF01 (Frontend)
- ✅ **Tela de Login** com validação de email/senha
- ✅ **Tela de Cadastro** com validação completa
- ✅ **Navegação** entre telas de autenticação
- ✅ **Integração com API** backend
- ✅ **Feedback de loading** e tratamento de erros
- ✅ **Armazenamento local** de tokens e dados do usuário

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
npm run dev
```

4. **Inicie o aplicativo:**
```bash
# Para web
npm run web

# Para Android (com Expo Go)
npm run android

# Para iOS (com Expo Go)
npm run ios
```

## 🔗 Configuração da API

O app está configurado para se conectar com o backend em:
- **Desenvolvimento:** `http://localhost:3000/api`
- **Produção:** Configurar variável de ambiente

## 📱 Telas Implementadas

### Login Screen
- Validação de email e senha
- Feedback de erros em tempo real
- Loading durante requisição
- Navegação para cadastro

### Register Screen
- Validação completa do formulário
- Validação de senha forte
- Confirmação de senha
- Feedback de erros por campo
- Navegação para login

### Home Screen
- Exibição dos dados do usuário
- Lista de funcionalidades disponíveis
- Botão de logout com confirmação

## 🔒 Validações Implementadas

### Email
- Formato válido
- Campo obrigatório

### Senha
- Mínimo 8 caracteres
- Pelo menos 1 letra minúscula
- Pelo menos 1 letra maiúscula
- Pelo menos 1 número
- Pelo menos 1 caractere especial

### Nome/Sobrenome
- Mínimo 2 caracteres
- Apenas letras e espaços

## 🎨 Interface

- Design minimalista e funcional
- Cores consistentes
- Feedback visual para erros
- Loading states
- Responsivo para diferentes tamanhos de tela

## 📦 Dependências Principais

- `@react-navigation/native` - Navegação
- `@react-navigation/stack` - Stack navigator
- `@react-native-async-storage/async-storage` - Armazenamento local
- `axios` - Requisições HTTP
- `expo` - Framework React Native

## 🧪 Testando

1. **Cadastro:**
   - Preencha todos os campos
   - Teste validações (email inválido, senha fraca)
   - Verifique se cria conta com sucesso

2. **Login:**
   - Use credenciais válidas
   - Teste credenciais inválidas
   - Verifique se mantém sessão

3. **Navegação:**
   - Teste navegação entre login/cadastro
   - Verifique se dados são mantidos ao navegar

## 🔄 Próximos Passos

- Implementar autenticação biométrica (RF02)
- Implementar cofre de senhas (RF03)
- Implementar gerador de senhas (RF04)
- Implementar bloqueio automático (RF05)
- Implementar categorias (RF06)

