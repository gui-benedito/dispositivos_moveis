const { Category, Credential } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

class CategoryController {
  static async list(req, res) {
    try {
      const userId = req.user.id;
      const categories = await Category.findAll({
        where: { userId },
        order: [['name', 'ASC']],
        attributes: ['id', 'name', 'icon', 'color', 'createdAt', 'updatedAt']
      });
      res.json({ success: true, data: categories });
    } catch (error) {
      console.error('Erro ao listar categorias:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
    }
  }

  static async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Dados inválidos', code: 'VALIDATION_ERROR', errors: errors.array() });
      }
      const userId = req.user.id;
      const { name, icon, color } = req.body;
      const normalized = String(name).trim();

      // Unicidade por usuário (case-insensitive)
      const exists = await Category.findOne({ where: { userId, name: { [Op.iLike]: normalized } } });
      if (exists) {
        return res.status(409).json({ success: false, message: 'Categoria já existe', code: 'CATEGORY_DUPLICATE' });
      }

      const category = await Category.create({ userId, name: normalized, icon: icon || null, color: color || null });
      res.status(201).json({ success: true, message: 'Categoria criada com sucesso', data: category });
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
    }
  }

  static async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Dados inválidos', code: 'VALIDATION_ERROR', errors: errors.array() });
      }
      const userId = req.user.id;
      const { id } = req.params;
      const { name, icon, color, cascadeUpdate } = req.body;

      const category = await Category.findOne({ where: { id, userId } });
      if (!category) return res.status(404).json({ success: false, message: 'Categoria não encontrada', code: 'CATEGORY_NOT_FOUND' });

      const prevName = category.name;
      const updateData = {};
      if (name !== undefined) {
        const normalized = String(name).trim();
        // Unicidade (case-insensitive), ignorando a própria categoria
        const exists = await Category.findOne({ where: { userId, id: { [Op.ne]: id }, name: { [Op.iLike]: normalized } } });
        if (exists) {
          return res.status(409).json({ success: false, message: 'Categoria já existe', code: 'CATEGORY_DUPLICATE' });
        }
        updateData.name = normalized;
      }
      if (icon !== undefined) updateData.icon = icon || null;
      if (color !== undefined) updateData.color = color || null;

      await category.update(updateData);

      // Atualizar credenciais existentes para refletir novo nome, se solicitado
      if (updateData.name && cascadeUpdate === true) {
        await Credential.update(
          { category: updateData.name },
          { where: { userId, category: prevName } }
        );
      }

      res.json({ success: true, message: 'Categoria atualizada', data: category });
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
    }
  }

  static async remove(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const category = await Category.findOne({ where: { id, userId } });
      if (!category) return res.status(404).json({ success: false, message: 'Categoria não encontrada', code: 'CATEGORY_NOT_FOUND' });
      // Impedir exclusão se houver credenciais usando a categoria
      const inUseCount = await Credential.count({ where: { userId, category: category.name, isActive: true } });
      if (inUseCount > 0) {
        return res.status(409).json({
          success: false,
          message: 'Categoria em uso por credenciais',
          code: 'CATEGORY_IN_USE',
          data: { count: inUseCount }
        });
      }

      await category.destroy();
      res.json({ success: true, message: 'Categoria excluída' });
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
    }
  }
}

module.exports = CategoryController;
