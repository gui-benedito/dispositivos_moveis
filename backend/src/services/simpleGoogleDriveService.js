const fs = require('fs');
const path = require('path');

class SimpleGoogleDriveService {
  /**
   * Gerar link de upload direto para Google Drive
   */
  static generateUploadLink(filename, fileContent) {
    try {
      // Criar um arquivo temporário
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFile = path.join(tempDir, filename);
      fs.writeFileSync(tempFile, fileContent);
      
      // Gerar link de upload para Google Drive
      const uploadUrl = `https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs?usp=sharing`;
      
      console.log('📁 Arquivo temporário criado:', tempFile);
      console.log('🔗 Link de upload gerado');
      
      return {
        tempFile,
        uploadUrl,
        filename,
        instructions: [
          '1. Abra o link do Google Drive',
          '2. Faça upload do arquivo de backup',
          '3. Mantenha o arquivo seguro'
        ]
      };
      
    } catch (error) {
      console.error('❌ Erro ao gerar link de upload:', error);
      throw error;
    }
  }

  /**
   * Limpar arquivos temporários
   */
  static cleanupTempFiles() {
    try {
      const tempDir = path.join(__dirname, '../../temp');
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        files.forEach(file => {
          const filePath = path.join(tempDir, file);
          fs.unlinkSync(filePath);
        });
        console.log('🧹 Arquivos temporários limpos');
      }
    } catch (error) {
      console.error('❌ Erro ao limpar arquivos temporários:', error);
    }
  }

  /**
   * Gerar instruções de backup
   */
  static generateBackupInstructions(filename, fileContent) {
    return {
      filename,
      fileSize: Buffer.byteLength(fileContent, 'utf8'),
      instructions: [
        '📁 Seu backup foi gerado com sucesso!',
        '💾 Arquivo: ' + filename,
        '🔒 Criptografado com sua senha mestra',
        '',
        '📤 Para salvar no Google Drive:',
        '1. Abra o Google Drive no seu navegador',
        '2. Clique em "Novo" → "Upload de arquivo"',
        '3. Selecione o arquivo de backup',
        '4. Mantenha o arquivo seguro!',
        '',
        '🔄 Para restaurar:',
        '1. Baixe o arquivo do Google Drive',
        '2. Use a opção "Restaurar Backup"',
        '3. Cole o conteúdo do arquivo'
      ]
    };
  }
}

module.exports = SimpleGoogleDriveService;
