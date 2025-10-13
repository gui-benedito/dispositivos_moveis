const { Note, User } = require('../models');
const NoteCryptoService = require('../services/noteCryptoService');

class NoteController {
  /**
   * Criar nova nota
   */
  static async createNote(req, res) {
    try {
      const { title, content, isSecure = false, tags = [], color = '#4ECDC4' } = req.body;
      const userId = req.user.id;

      console.log('📝 Criando nova nota:', { title: title?.substring(0, 50), isSecure, userId });

      // Validar dados obrigatórios
      if (!title || !content) {
        return res.status(400).json({
          success: false,
          message: 'Título e conteúdo são obrigatórios',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      // Criptografar dados se for nota segura
      let encryptedTitle = title;
      let encryptedContent = content;
      
      if (isSecure) {
        console.log('🔐 Criptografando nota segura...');
        encryptedTitle = NoteCryptoService.encryptText(title, userId);
        encryptedContent = NoteCryptoService.encryptText(content, userId);
      }

      // Criar nota
      const note = await Note.create({
        userId,
        title: encryptedTitle,
        content: encryptedContent,
        isSecure,
        tags,
        color
      });

      console.log('✅ Nota criada com sucesso:', note.id);

      res.status(201).json({
        success: true,
        message: 'Nota criada com sucesso',
        data: {
          note: note.toSafeJSON()
        }
      });
    } catch (error) {
      console.error('❌ Erro ao criar nota:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Listar notas do usuário
   */
  static async getNotes(req, res) {
    try {
      const userId = req.user.id;
      const { search, isSecure, isFavorite, page = 1, limit = 20 } = req.query;

      console.log('📝 Listando notas:', { userId, search, isSecure, isFavorite });

      // Construir filtros
      const where = { userId };
      
      if (isSecure !== undefined) {
        where.isSecure = isSecure === 'true';
      }
      
      if (isFavorite !== undefined) {
        where.isFavorite = isFavorite === 'true';
      }

      // Busca por texto (título e conteúdo)
      if (search) {
        const { Op } = require('sequelize');
        where[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { content: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const offset = (page - 1) * limit;

      const { count, rows: notes } = await Note.findAndCountAll({
        where,
        order: [['updatedAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName']
        }]
      });

      // Descriptografar notas seguras
      const decryptedNotes = notes.map(note => {
        if (note.isSecure) {
          return {
            ...note.toSafeJSON(),
            title: NoteCryptoService.decryptText(note.getDataValue('title'), userId),
            content: NoteCryptoService.decryptText(note.getDataValue('content'), userId)
          };
        }
        return note.toSafeJSON();
      });

      console.log(`✅ ${decryptedNotes.length} notas encontradas`);

      res.json({
        success: true,
        message: 'Notas listadas com sucesso',
        data: {
          notes: decryptedNotes,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('❌ Erro ao listar notas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Obter nota específica
   */
  static async getNote(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      console.log('📝 Obtendo nota:', { id, userId });

      const note = await Note.findOne({
        where: { id, userId },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName']
        }]
      });

      if (!note) {
        return res.status(404).json({
          success: false,
          message: 'Nota não encontrada',
          code: 'NOTE_NOT_FOUND'
        });
      }

      // Descriptografar se for segura
      let noteData = note.toSafeJSON();
      if (note.isSecure) {
        noteData.title = NoteCryptoService.decryptText(note.getDataValue('title'), userId);
        noteData.content = NoteCryptoService.decryptText(note.getDataValue('content'), userId);
      }

      console.log('✅ Nota obtida com sucesso');

      res.json({
        success: true,
        message: 'Nota obtida com sucesso',
        data: { note: noteData }
      });
    } catch (error) {
      console.error('❌ Erro ao obter nota:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Atualizar nota
   */
  static async updateNote(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { title, content, isSecure, tags, color, isFavorite } = req.body;

      console.log('📝 Atualizando nota:', { id, userId, isSecure });

      const note = await Note.findOne({
        where: { id, userId }
      });

      if (!note) {
        return res.status(404).json({
          success: false,
          message: 'Nota não encontrada',
          code: 'NOTE_NOT_FOUND'
        });
      }

      // Atualizar campos
      if (title !== undefined) {
        note.title = note.isSecure ? NoteCryptoService.encryptText(title, userId) : title;
      }
      if (content !== undefined) {
        note.content = note.isSecure ? NoteCryptoService.encryptText(content, userId) : content;
      }
      if (isSecure !== undefined) note.isSecure = isSecure;
      if (tags !== undefined) note.tags = tags;
      if (color !== undefined) note.color = color;
      if (isFavorite !== undefined) note.isFavorite = isFavorite;

      await note.save();

      console.log('✅ Nota atualizada com sucesso');

      res.json({
        success: true,
        message: 'Nota atualizada com sucesso',
        data: {
          note: note.toSafeJSON()
        }
      });
    } catch (error) {
      console.error('❌ Erro ao atualizar nota:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Deletar nota
   */
  static async deleteNote(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      console.log('📝 Deletando nota:', { id, userId });

      const note = await Note.findOne({
        where: { id, userId }
      });

      if (!note) {
        return res.status(404).json({
          success: false,
          message: 'Nota não encontrada',
          code: 'NOTE_NOT_FOUND'
        });
      }

      await note.destroy();

      console.log('✅ Nota deletada com sucesso');

      res.json({
        success: true,
        message: 'Nota deletada com sucesso'
      });
    } catch (error) {
      console.error('❌ Erro ao deletar nota:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Alternar favorito
   */
  static async toggleFavorite(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      console.log('📝 Alternando favorito:', { id, userId });

      const note = await Note.findOne({
        where: { id, userId }
      });

      if (!note) {
        return res.status(404).json({
          success: false,
          message: 'Nota não encontrada',
          code: 'NOTE_NOT_FOUND'
        });
      }

      note.isFavorite = !note.isFavorite;
      await note.save();

      console.log('✅ Favorito alterado:', note.isFavorite);

      res.json({
        success: true,
        message: `Nota ${note.isFavorite ? 'adicionada aos' : 'removida dos'} favoritos`,
        data: {
          note: note.toSafeJSON()
        }
      });
    } catch (error) {
      console.error('❌ Erro ao alternar favorito:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Estatísticas das notas
   */
  static async getNoteStats(req, res) {
    try {
      const userId = req.user.id;

      console.log('📝 Obtendo estatísticas:', { userId });

      const [total, secure, favorites] = await Promise.all([
        Note.count({ where: { userId } }),
        Note.count({ where: { userId, isSecure: true } }),
        Note.count({ where: { userId, isFavorite: true } })
      ]);

      const stats = {
        total,
        secure,
        favorites,
        normal: total - secure
      };

      console.log('✅ Estatísticas obtidas:', stats);

      res.json({
        success: true,
        message: 'Estatísticas obtidas com sucesso',
        data: { stats }
      });
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}

module.exports = NoteController;