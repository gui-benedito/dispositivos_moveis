const { Credential, User, CredentialVersion } = require('../models');
const { Op } = require('sequelize');
const cryptoService = require('../services/cryptoService');
const { validationResult } = require('express-validator');

class CredentialController {
  /**
   * @swagger
   * /api/credentials:
   *   get:
   *     summary: Listar credenciais do usuário
   *     description: Retorna todas as credenciais do usuário autenticado (apenas metadados)
   *     tags: [Credentials]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: category
   *         schema:
   *           type: string
   *         description: Filtrar por categoria
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Buscar por título ou descrição
   *       - in: query
   *         name: favorite
   *         schema:
   *           type: boolean
   *         description: Filtrar apenas favoritos
   *     responses:
   *       200:
   *         description: Lista de credenciais obtida com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                       title:
   *                         type: string
   *                       description:
   *                         type: string
   *                       category:
   *                         type: string
   *                       isFavorite:
   *                         type: boolean
   *                       accessCount:
   *                         type: integer
   *                       lastAccessed:
   *                         type: string
   *                         format: date-time
   *                       createdAt:
   *                         type: string
   *                         format: date-time
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async getCredentials(req, res) {
    try {
      const userId = req.user.id;
      const { category, search, favorite, page = '1', limit = '20', sort = 'title', order = 'asc' } = req.query;

      // Sanitizar paginação
      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
      const offset = (pageNum - 1) * limitNum;

      // Campos permitidos para ordenação
      const allowedSort = new Set(['title', 'category', 'lastAccessed', 'accessCount', 'createdAt', 'updatedAt', 'isFavorite']);
      const sortField = allowedSort.has(String(sort)) ? String(sort) : 'title';
      const sortOrder = String(order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      // Filtros
      const whereClause = { userId, isActive: true };
      if (category) whereClause.category = category;
      if (favorite === 'true') whereClause.isFavorite = true;

      // Busca por título/descrição (case-insensitive) no banco
      if (search && String(search).trim().length > 0) {
        const term = `%${String(search).trim()}%`;
        whereClause[Op.or] = [
          { title: { [Op.iLike]: term } },
          { description: { [Op.iLike]: term } }
        ];
      }

      // Total para paginação
      const total = await Credential.count({ where: whereClause });

      // Query paginada
      const credentials = await Credential.findAll({
        where: whereClause,
        order: [[sortField, sortOrder]],
        offset,
        limit: limitNum,
        attributes: [
          'id', 'title', 'description', 'category', 'isFavorite',
          'accessCount', 'lastAccessed', 'createdAt', 'updatedAt'
        ]
      });

      res.json({
        success: true,
        data: credentials,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.max(Math.ceil(total / limitNum), 1)
        }
      });
    } catch (error) {
      console.error('Erro ao listar credenciais:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/credentials/{id}:
   *   get:
   *     summary: Obter credencial específica
   *     description: Retorna uma credencial específica descriptografada
   *     tags: [Credentials]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID da credencial
   *     requestBody:
   *       required: true
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - masterPassword
   *             properties:
   *               masterPassword:
   *                 type: string
   *                 description: Senha mestre para descriptografar
   *     responses:
   *       200:
   *         description: Credencial obtida com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     title:
   *                       type: string
   *                     description:
   *                       type: string
   *                     category:
   *                       type: string
   *                     username:
   *                       type: string
   *                     password:
   *                       type: string
   *                     notes:
   *                       type: string
   *                     isFavorite:
   *                       type: boolean
   *                     accessCount:
   *                       type: integer
   *                     lastAccessed:
   *                       type: string
   *                       format: date-time
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         description: Credencial não encontrada
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               message: "Credencial não encontrada"
   *               code: "CREDENTIAL_NOT_FOUND"
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async getCredential(req, res) {
    try {
      const { id } = req.params;
      const { masterPassword } = req.query;
      const userId = req.user.id;

      if (!masterPassword) {
        return res.status(400).json({
          success: false,
          message: 'Senha mestre é obrigatória',
          code: 'MASTER_PASSWORD_REQUIRED'
        });
      }

      // Buscar credencial
      const credential = await Credential.findOne({
        where: { id, userId, isActive: true }
      });

      if (!credential) {
        return res.status(404).json({
          success: false,
          message: 'Credencial não encontrada',
          code: 'CREDENTIAL_NOT_FOUND'
        });
      }

      // Verificar senha mestre
      const isValidPassword = await cryptoService.verifyMasterPassword(
        masterPassword,
        credential.encryptionKey,
        credential.salt
      );

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Senha mestre incorreta',
          code: 'INVALID_MASTER_PASSWORD'
        });
      }

      // Descriptografar credencial
      const decryptedData = await cryptoService.decryptCredential(credential, masterPassword);

      // Incrementar contador de acesso
      await credential.incrementAccess();

      res.json({
        success: true,
        data: {
          id: credential.id,
          title: credential.title,
          description: credential.description,
          category: credential.category,
          username: decryptedData.username,
          password: decryptedData.password,
          notes: decryptedData.notes,
          isFavorite: credential.isFavorite,
          accessCount: credential.accessCount + 1,
          lastAccessed: new Date(),
          createdAt: credential.createdAt,
          updatedAt: credential.updatedAt
        }
      });
    } catch (error) {
      console.error('Erro ao obter credencial:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/credentials:
   *   post:
   *     summary: Criar nova credencial
   *     description: Cria uma nova credencial criptografada
   *     tags: [Credentials]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - title
   *               - password
   *               - masterPassword
   *             properties:
   *               title:
   *                 type: string
   *                 description: Título da credencial
   *               description:
   *                 type: string
   *                 description: Descrição da credencial
   *               category:
   *                 type: string
   *                 description: Categoria da credencial
   *                 default: "Geral"
   *               username:
   *                 type: string
   *                 description: Nome de usuário
   *               password:
   *                 type: string
   *                 description: Senha
   *               notes:
   *                 type: string
   *                 description: Notas adicionais
   *               masterPassword:
   *                 type: string
   *                 description: Senha mestre para criptografia
   *               isFavorite:
   *                 type: boolean
   *                 description: Se é favorita
   *                 default: false
   *     responses:
   *       201:
   *         description: Credencial criada com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     title:
   *                       type: string
   *                     category:
   *                       type: string
   *                     createdAt:
   *                       type: string
   *                       format: date-time
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async createCredential(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados de entrada inválidos',
          code: 'VALIDATION_ERROR',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const {
        title,
        description,
        category = 'Geral',
        username,
        password,
        notes,
        masterPassword,
        isFavorite = false
      } = req.body;

      // Criptografar dados da credencial
      const encryptedData = await cryptoService.encryptCredential({
        username,
        password,
        notes
      }, masterPassword);

      // Criar credencial
      const credential = await Credential.create({
        userId,
        title,
        description,
        category,
        isFavorite,
        ...encryptedData
      });

      // Registrar versão 1
      try {
        await CredentialVersion.create({
          credentialId: credential.id,
          userId,
          version: 1,
          title: credential.title,
          description: credential.description,
          category: credential.category,
          isFavorite: credential.isFavorite,
          isActive: credential.isActive,
          encryptedUsername: credential.encryptedUsername,
          encryptedPassword: credential.encryptedPassword,
          encryptedNotes: credential.encryptedNotes,
          encryptionKey: credential.encryptionKey,
          iv: credential.iv,
          salt: credential.salt
        });
      } catch (e) {
        console.error('Erro ao registrar versão inicial da credencial:', e);
      }

      res.status(201).json({
        success: true,
        message: 'Credencial criada com sucesso',
        data: {
          id: credential.id,
          title: credential.title,
          category: credential.category,
          createdAt: credential.createdAt
        }
      });
    } catch (error) {
      console.error('Erro ao criar credencial:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/credentials/{id}:
   *   put:
   *     summary: Atualizar credencial
   *     description: Atualiza uma credencial existente
   *     tags: [Credentials]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID da credencial
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - masterPassword
   *             properties:
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *               category:
   *                 type: string
   *               username:
   *                 type: string
   *               password:
   *                 type: string
   *               notes:
   *                 type: string
   *               masterPassword:
   *                 type: string
   *               isFavorite:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Credencial atualizada com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     title:
   *                       type: string
   *                     category:
   *                       type: string
   *                     updatedAt:
   *                       type: string
   *                       format: date-time
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         description: Credencial não encontrada
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               message: "Credencial não encontrada"
   *               code: "CREDENTIAL_NOT_FOUND"
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async updateCredential(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const {
        title,
        description,
        category,
        username,
        password,
        notes,
        masterPassword,
        isFavorite
      } = req.body;

      if (!masterPassword) {
        return res.status(400).json({
          success: false,
          message: 'Senha mestre é obrigatória',
          code: 'MASTER_PASSWORD_REQUIRED'
        });
      }

      // Buscar credencial
      const credential = await Credential.findOne({
        where: { id, userId, isActive: true }
      });

      if (!credential) {
        return res.status(404).json({
          success: false,
          message: 'Credencial não encontrada',
          code: 'CREDENTIAL_NOT_FOUND'
        });
      }

      // Verificar senha mestre
      const isValidPassword = await cryptoService.verifyMasterPassword(
        masterPassword,
        credential.encryptionKey,
        credential.salt
      );

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Senha mestre incorreta',
          code: 'INVALID_MASTER_PASSWORD'
        });
      }

      // Preparar dados para atualização
      const updateData = {};
      
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (category !== undefined) updateData.category = category;
      if (isFavorite !== undefined) updateData.isFavorite = isFavorite;

      // Se há dados sensíveis para atualizar, re-criptografar
      if (username !== undefined || password !== undefined || notes !== undefined) {
        const encryptedData = await cryptoService.encryptCredential({
          username: username !== undefined ? username : (await cryptoService.decryptCredential(credential, masterPassword)).username,
          password: password !== undefined ? password : (await cryptoService.decryptCredential(credential, masterPassword)).password,
          notes: notes !== undefined ? notes : (await cryptoService.decryptCredential(credential, masterPassword)).notes
        }, masterPassword);

        Object.assign(updateData, encryptedData);
      }

      // Atualizar credencial
      await credential.update(updateData);

      // Registrar nova versão (snapshot pós-atualização)
      try {
        const versionCount = await CredentialVersion.count({ where: { credentialId: credential.id } });
        const nextVersion = versionCount + 1;
        await CredentialVersion.create({
          credentialId: credential.id,
          userId,
          version: nextVersion,
          title: credential.title,
          description: credential.description,
          category: credential.category,
          isFavorite: credential.isFavorite,
          isActive: credential.isActive,
          encryptedUsername: credential.encryptedUsername,
          encryptedPassword: credential.encryptedPassword,
          encryptedNotes: credential.encryptedNotes,
          encryptionKey: credential.encryptionKey,
          iv: credential.iv,
          salt: credential.salt
        });
      } catch (e) {
        console.error('Erro ao registrar versão da credencial (update):', e);
      }

      res.json({
        success: true,
        message: 'Credencial atualizada com sucesso',
        data: {
          id: credential.id,
          title: credential.title,
          category: credential.category,
          updatedAt: credential.updatedAt
        }
      });
    } catch (error) {
      console.error('Erro ao atualizar credencial:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/credentials/{id}:
   *   delete:
   *     summary: Excluir credencial
   *     description: Exclui uma credencial (soft delete)
   *     tags: [Credentials]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID da credencial
   *     responses:
   *       200:
   *         description: Credencial excluída com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         description: Credencial não encontrada
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               message: "Credencial não encontrada"
   *               code: "CREDENTIAL_NOT_FOUND"
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async deleteCredential(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Buscar credencial
      const credential = await Credential.findOne({
        where: { id, userId, isActive: true }
      });

      if (!credential) {
        return res.status(404).json({
          success: false,
          message: 'Credencial não encontrada',
          code: 'CREDENTIAL_NOT_FOUND'
        });
      }

      // Soft delete
      await credential.update({ isActive: false });

      // Registrar versão pós-exclusão lógica
      try {
        const versionCount = await CredentialVersion.count({ where: { credentialId: credential.id } });
        const nextVersion = versionCount + 1;
        await CredentialVersion.create({
          credentialId: credential.id,
          userId,
          version: nextVersion,
          title: credential.title,
          description: credential.description,
          category: credential.category,
          isFavorite: credential.isFavorite,
          isActive: credential.isActive,
          encryptedUsername: credential.encryptedUsername,
          encryptedPassword: credential.encryptedPassword,
          encryptedNotes: credential.encryptedNotes,
          encryptionKey: credential.encryptionKey,
          iv: credential.iv,
          salt: credential.salt
        });
      } catch (e) {
        console.error('Erro ao registrar versão da credencial (delete):', e);
      }

      res.json({
        success: true,
        message: 'Credencial excluída com sucesso'
      });
    } catch (error) {
      console.error('Erro ao excluir credencial:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/credentials/categories:
   *   get:
   *     summary: Listar categorias
   *     description: Retorna todas as categorias do usuário
   *     tags: [Credentials]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Categorias obtidas com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     type: string
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async getCategories(req, res) {
    try {
      const userId = req.user.id;

      const categories = await Credential.findAll({
        where: { userId, isActive: true },
        attributes: ['category'],
        group: ['category'],
        order: [['category', 'ASC']]
      });

      const categoryList = categories.map(cat => cat.category);

      res.json({
        success: true,
        data: categoryList
      });
    } catch (error) {
      console.error('Erro ao listar categorias:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/credentials/generate-password:
   *   post:
   *     summary: Gerar senha forte
   *     description: Gera uma senha forte aleatória
   *     tags: [Credentials]
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               length:
   *                 type: integer
   *                 minimum: 4
   *                 maximum: 128
   *                 default: 16
   *               includeUppercase:
   *                 type: boolean
   *                 default: true
   *               includeLowercase:
   *                 type: boolean
   *                 default: true
   *               includeNumbers:
   *                 type: boolean
   *                 default: true
   *               includeSymbols:
   *                 type: boolean
   *                 default: true
   *               excludeSimilar:
   *                 type: boolean
   *                 default: true
   *     responses:
   *       200:
   *         description: Senha gerada com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     password:
   *                       type: string
   *                     strength:
   *                       type: object
   *                       properties:
   *                         score:
   *                           type: integer
   *                         strength:
   *                           type: string
   *                         feedback:
   *                           type: array
   *                           items:
   *                             type: string
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async generatePassword(req, res) {
    try {
      const {
        length = 16,
        includeUppercase = true,
        includeLowercase = true,
        includeNumbers = true,
        includeSymbols = true,
        excludeSimilar = true
      } = req.body;

      // Validar parâmetros
      if (length < 4 || length > 128) {
        return res.status(400).json({
          success: false,
          message: 'Comprimento deve estar entre 4 e 128 caracteres',
          code: 'INVALID_LENGTH'
        });
      }

      if (!includeUppercase && !includeLowercase && !includeNumbers && !includeSymbols) {
        return res.status(400).json({
          success: false,
          message: 'Pelo menos um tipo de caractere deve ser incluído',
          code: 'NO_CHARACTER_TYPES'
        });
      }

      // Gerar senha
      const password = cryptoService.generatePassword({
        length,
        includeUppercase,
        includeLowercase,
        includeNumbers,
        includeSymbols,
        excludeSimilar
      });

      // Analisar força da senha
      const strength = cryptoService.analyzePasswordStrength(password);

      res.json({
        success: true,
        data: {
          password,
          strength
        }
      });
    } catch (error) {
      console.error('Erro ao gerar senha:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/credentials/analyze-password:
   *   post:
   *     summary: Analisar força da senha
   *     description: Analisa a força de uma senha fornecida
   *     tags: [Credentials]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - password
   *             properties:
   *               password:
   *                 type: string
   *                 description: Senha a ser analisada
   *     responses:
   *       200:
   *         description: Análise realizada com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     strength:
   *                       type: object
   *                       properties:
   *                         score:
   *                           type: integer
   *                         strength:
   *                           type: string
   *                         feedback:
   *                           type: array
   *                           items:
   *                             type: string
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async analyzePassword(req, res) {
    try {
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Senha é obrigatória',
          code: 'PASSWORD_REQUIRED'
        });
      }

      const strength = cryptoService.analyzePasswordStrength(password);

      res.json({
        success: true,
        data: {
          strength
        }
      });
    } catch (error) {
      console.error('Erro ao analisar senha:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Lista versões de uma credencial
   */
  static async listVersions(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params; // credential id

      const versions = await CredentialVersion.findAll({
        where: { credentialId: id, userId },
        order: [['version', 'DESC']],
        attributes: ['id', 'version', 'title', 'description', 'category', 'isFavorite', 'isActive', 'createdAt']
      });

      return res.json({ success: true, data: versions });
    } catch (error) {
      console.error('Erro ao listar versões:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
    }
  }

  /**
   * Restaurar uma versão específica
   */
  static async restoreVersion(req, res) {
    try {
      const userId = req.user.id;
      const { id, version } = req.params; // credential id e version number
      const { masterPassword } = req.body;

      if (!masterPassword) {
        return res.status(400).json({ success: false, message: 'Senha mestre é obrigatória', code: 'MASTER_PASSWORD_REQUIRED' });
      }

      const credential = await Credential.findOne({ where: { id, userId } });
      if (!credential) {
        return res.status(404).json({ success: false, message: 'Credencial não encontrada', code: 'CREDENTIAL_NOT_FOUND' });
      }

      const snapshot = await CredentialVersion.findOne({ where: { credentialId: id, userId, version: parseInt(version, 10) } });
      if (!snapshot) {
        return res.status(404).json({ success: false, message: 'Versão não encontrada', code: 'VERSION_NOT_FOUND' });
      }

      // Validar senha mestre com snapshot
      const isValidPassword = await cryptoService.verifyMasterPassword(masterPassword, snapshot.encryptionKey, snapshot.salt);
      if (!isValidPassword) {
        return res.status(401).json({ success: false, message: 'Senha mestre incorreta', code: 'INVALID_MASTER_PASSWORD' });
      }

      // Descriptografar dados do snapshot e recriptografar (pode ser com a mesma senha mestre)
      const decrypted = await cryptoService.decryptCredential(snapshot, masterPassword);
      const reEncrypted = await cryptoService.encryptCredential({
        username: decrypted.username,
        password: decrypted.password,
        notes: decrypted.notes
      }, masterPassword);

      // Atualizar credencial com metadados e dados criptografados do snapshot
      await credential.update({
        title: snapshot.title,
        description: snapshot.description,
        category: snapshot.category,
        isFavorite: snapshot.isFavorite,
        isActive: snapshot.isActive,
        ...reEncrypted
      });

      return res.json({ success: true, message: 'Versão restaurada com sucesso' });
    } catch (error) {
      console.error('Erro ao restaurar versão:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
    }
  }
}

module.exports = CredentialController;
