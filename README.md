# Backlog

| RF   | Sprint | Item do Backlog                                   | Descrição                                                                                      | Prioridade |
|------|--------|--------------------------------------------------|------------------------------------------------------------------------------------------------|------------|
| RF01 | 1      | Cadastro e autenticação básica                   | Cadastro por e-mail/senha e login seguro.                                                       | Alta       |
| RF02 | 1      | Autenticação biométrica                          | Login via biometria (digital/face) com fallback por senha mestre.                               | Alta       |
| RF03 | 1      | Cofre de senhas criptografado                    | Armazenar credenciais localmente com criptografia AES-256.                                      | Alta       |
| RF04 | 1      | Gerador de senhas                                | Gerar senhas fortes com parâmetros (tamanho, tipos de caractere).                               | Alta       |
| RF05 | 1      | Bloqueio automático por inatividade              | Bloquear app/sessão após tempo configurável.                                                     | Alta       |
| RF06 | 1      | Categorias de senhas (padrão)                    | Categorizar credenciais (E-mail, Bancos, Redes Sociais).                                        | Média      |
| RF07 | 2      | Autenticação em dois fatores (2FA)               | Ativar/validar 2FA (TOTP e SMS) no login.                                                       | Alta       |
| RF08 | 2      | Notas seguras                                    | Guardar notas/textos sensíveis no cofre criptografado.                                          | Média      |
| RF09 | 2      | Backup em nuvem                                  | Backup criptografado em Google Drive/Dropbox/OneDrive.                                          | Alta       |
| RF10 | 2      | Sincronização entre dispositivos                 | Sync E2EE entre múltiplos aparelhos, com resolução de conflitos.                                | Alta       |
| RF11 | 2      | Histórico de alterações de senhas                | Versionamento e restauração de versões anteriores.                                              | Média      |
| RF12 | 2      | Busca rápida                                     | Localizar credenciais por nome, login ou categoria.                                             | Alta       |
| RF13 | 2      | Categorias personalizadas                        | Criar/renomear/excluir categorias e definir ícones.                                             | Média      |
| RF14 | 3      | Alerta de credenciais comprometidas (HIBP)       | Checar vazamentos e alertar usuário (Have I Been Pwned).                                        | Alta       |
| RF15 | 3      | Exportação segura                                | Exportar dados em arquivo criptografado com reautenticação.                                     | Média      |
| RF16 | 3      | Preenchimento automático (Android Autofill)      | Integração com Autofill do Android para logins em apps/navegadores.                             | Alta       |
| RF17 | 3      | Modo offline                                     | App utilizável sem internet; dados locais criptografados; sync ao reconectar.                   | Alta       |
| RF18 | 3      | Configurações avançadas de segurança             | Ajustar bloqueio, exigir senha mestre, ativar/desativar biometria.                              | Média      |
| RF19 | 3      | Notificações inteligentes de segurança           | Alertas de login suspeito, senhas antigas e recomendações.                                      | Alta       |
| RF20 | 3      | Interface personalizável                         | Temas claro/escuro e ícones por categoria.                                                      | Média      |


| Sprint | Ref. RF | User Story (resumo)                                  | Critérios de Aceitação (resumo)                                                                        | Prioridade |
|--------|---------|------------------------------------------------------|--------------------------------------------------------------------------------------------------------|------------|
| 1      | RF01    | Como usuário, quero me cadastrar e logar pelo app para acessar minhas credenciais. | Tela de cadastro/login; validação de e-mail/senha; feedback de erro/sucesso; loading/desabilitar botão durante requisição. | Alta       |
| 1      | RF01    | Como sistema, quero expor endpoints seguros de cadastro e autenticação. | Hash seguro (bcrypt/Argon2); geração/validação de token (JWT); rate-limit no login; resposta padronizada de erros; política de senha mínima. | Alta       |
| 1      | RF02    | Como usuário, quero acessar com biometria para não digitar senha sempre. | Detectar suporte biométrico; toggle de ativação; fallback por senha mestre; fluxo de erro claro.         | Alta       |
| 1      | RF02    | Como sistema, não devo armazenar dados biométricos e devo aceitar sessão iniciada no cliente. | Nenhum dado biométrico persistido; auditoria de sessão; políticas/documentação de privacidade.          | Alta       |
| 1      | RF03    | Como usuário, quero criar/visualizar/editar/excluir credenciais em categorias. | Formulário de credencial; mostrar/ocultar senha; copiar para área de transferência; listas por categoria. | Alta       |
| 1      | RF03    | Como sistema, devo armazenar credenciais com AES-256 e chaves derivadas da senha mestre. | Modelo “Credencial”; AES-256 at-rest; KDF (PBKDF2/Argon2id) com salt; IV único por registro; CRUD REST; testes de criptografia. | Alta       |
| 1      | RF04    | Como usuário, quero gerar senhas fortes configuráveis e copiá-las. | UI de parâmetros (tamanho, maiúsc., minúsc., números, símbolos); botão “Gerar”; botão “Copiar”.         | Alta       |
| 1      | RF04    | Como sistema, quero gerar senhas seguras conforme parâmetros. | Função pseudoaleatória criptograficamente segura; checagens de política; retorno idempotente por requisição. | Alta       |
| 1      | RF05    | Como usuário, quero que o app bloqueie após inatividade configurável. | Timer configurável (1/5/10 min…); tela de lock; requer biometria/senha ao voltar.                       | Alta       |
| 1      | RF05    | Como sistema, quero expirar tokens/sessões inativos. | TTL de token configurável; invalidação de refresh tokens; 401 ao exceder tempo.                        | Alta       |
| 1      | RF06    | Como usuário, quero escolher categoria ao salvar e filtrar por categoria. | Seleção de categoria no formulário; chips/filtros por categoria; categorias padrão visíveis.            | Média      |
| 1      | RF06    | Como sistema, devo manter categorias padrão e o vínculo credencial–categoria. | Entidade “Categoria” com seeds; relacionamento 1-N; endpoints de listagem.                             | Média      |
| 2      | RF07    | Como usuário, quero ativar 2FA e informar código no login. | Tela de setup com QR TOTP; fluxo de verificação; campo código no login; mensagens de erro/expiração.    | Alta       |
| 2      | RF07    | Como sistema, devo registrar segredo TOTP, validar códigos e enviar SMS. | Endpoint de enrolment/disable; verificação TOTP (tempo/deriva); integração SMS; opção de códigos de recuperação. | Alta       |
| 2      | RF08    | Como usuário, quero CRUD de notas seguras.           | Tela de lista e editor; marcação como “seguro”; busca integrada.                                        | Média      |
| 2      | RF08    | Como sistema, devo criptografar e expor CRUD de notas. | Entidade “Nota” criptografada; endpoints; testes de criptografia/autorização.                          | Média      |
| 2      | RF09    | Como usuário, quero configurar e disparar backup/restauração em nuvem. | Tela de provedores (Drive/Dropbox/OneDrive); OAuth; botões “Backup”/“Restaurar”; estado/sucesso/erro.   | Alta       |
| 2      | RF09    | Como sistema, devo criptografar antes do upload e restaurar mediante autenticação. | Criptografia client/server-side antes do envio; integração SDKs; versionamento de backup; checksum/integridade. | Alta       |
| 2      | RF10    | Como usuário, quero ativar sync e ver status entre dispositivos. | Toggle de sincronização; indicador de status (ok/pending/conflict).                                    | Alta       |
| 2      | RF10    | Como sistema, devo realizar sync E2EE com resolução de conflitos. | Protocolo de delta-sync; merges por timestamp/versão; filas idempotentes; testes de conflito.           | Alta       |
| 2      | RF11    | Como usuário, quero visualizar histórico e restaurar versões antigas. | Timeline por credencial; ação “Restaurar”; confirmação.                                                | Média      |
| 2      | RF11    | Como sistema, devo versionar credenciais e permitir restauração. | Tabelas de versão/auditoria; endpoints listar/restaurar; trilha de auditoria.                           | Média      |
| 2      | RF12    | Como usuário, quero buscar rapidamente por nome/login/categoria. | Campo de busca com debounce; destaque de termos; resultados instantâneos.                              | Alta       |
| 2      | RF12    | Como sistema, devo prover busca com filtros eficientes. | Endpoint com filtros; índices no banco; paginação.                                                     | Alta       |
| 2      | RF13    | Como usuário, quero criar/renomear/excluir categorias e escolher ícones. | Modal de CRUD; galeria de ícones; validação de duplicidade.                                           | Média      |
| 2      | RF13    | Como sistema, devo persistir categorias personalizadas e ícones. | CRUD; validação de nomes únicos por usuário; armazenamento dos ícones/refs.                            | Média      |
| 3      | RF14    | Como usuário, quero ser alertado se minha senha foi vazada (HIBP). | Alertas em tempo real/ao abrir app; tela de “Senhas em risco”; ação “Trocar senha”.                   | Alta       |
| 3      | RF14    | Como sistema, devo consultar HIBP via k-anonymity e não expor senhas. | Consulta por prefixo SHA-1; agendador periódico; cache e limites; logs mínimos.                        | Alta       |
| 3      | RF15    | Como usuário, quero exportar dados com reautenticação/2FA. | Fluxo com confirmação e reautenticação; salvar arquivo .vault (ou similar).                           | Média      |
| 3      | RF15    | Como sistema, devo gerar arquivo criptografado para exportação. | KDF forte; criptografia do pacote; assinatura/verificação; metadados de versão.                        | Média      |
| 3      | RF16    | Como usuário Android, quero preenchimento automático em apps/sites. | Serviço Android Autofill; seleção da credencial; permissão do usuário; UX de fallback.                | Alta       |
| 3      | RF17    | Como usuário, quero usar o app offline e sincronizar ao reconectar. | Toda UI funciona sem rede; fila de operações; mensagem de estado offline/online.                       | Alta       |
| 3      | RF17    | Como sistema, devo suportar estratégia offline-first no sync. | Fila no cliente + endpoints idempotentes; reconciliação no servidor; detecção de conflitos.            | Alta       |
| 3      | RF18    | Como usuário, quero ajustar bloqueio, senha mestre e biometria nas configurações. | Tela de configurações; toggles/sliders; validação em tempo real; persistência local.                  | Média      |
| 3      | RF18    | Como sistema, devo persistir e aplicar preferências de segurança por usuário. | Endpoints de preferências; políticas aplicadas no login/sessão; auditoria.                            | Média      |
| 3      | RF19    | Como usuário, quero receber e ver notificações de segurança. | Receber push; bandeja de alertas; tela de histórico com filtros.                                       | Alta       |
| 3      | RF19    | Como sistema, devo detectar eventos suspeitos e enviar push. | Heurísticas (IP/geo/device), detecção de anomalias de login, agendador de verificação de senhas antigas; envio via FCM/APNs. | Alta       |
| 3      | RF20    | Como usuário, quero temas claro/escuro e ícones por categoria. | Alternar tema sem reiniciar; salvar preferências; contraste adequado (acessibilidade).               | Média      |
| 3      | RF20    | Como sistema, devo armazenar preferências de interface por usuário. | Persistência por usuário; endpoints; defaults por plataforma.                                         | Média      |
