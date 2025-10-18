import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useSimpleBackup } from '../hooks/useSimpleBackup';

interface SimpleBackupScreenProps {
  navigation: any;
}

const SimpleBackupScreen: React.FC<SimpleBackupScreenProps> = ({ navigation }) => {
  const {
    loading,
    error,
    generateBackup,
    restoreBackup,
    restoreBackupFromFile,
    uploadAndRestoreBackup,
    validateBackup,
    downloadBackup,
    readBackupFile,
    clearError
  } = useSimpleBackup();

  const [masterPassword, setMasterPassword] = useState('');
  const [backupData, setBackupData] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'generate' | 'restore'>('generate');
  const [selectedFile, setSelectedFile] = useState<any | null>(null);

  /**
   * Gerar backup automático
   */
  const handleAutoBackup = async () => {
    if (!masterPassword.trim()) {
      Alert.alert('Erro', 'Digite sua senha mestra');
      return;
    }

    try {
      const response = await generateBackup(masterPassword);
      
      if (response?.success) {
        // Verificar se foi enviado automaticamente para Google Drive
            if (response.data.autoUpload?.success) {
              Alert.alert(
                'Backup Enviado!',
                `Backup enviado automaticamente para o Google Drive!\n\n` +
                `📊 Estatísticas:\n` +
                `• ${response.data.metadata.totalCredentials} credenciais\n` +
                `• ${response.data.metadata.totalNotes} notas\n` +
                `• Tamanho: ${(response.data.metadata.backupSize / 1024).toFixed(1)} KB\n\n` +
                `✅ Arquivo .encrypted salvo automaticamente no Google Drive`,
                [{ text: 'OK' }]
              );
        } else {
          // Fallback: compartilhar arquivo
          await downloadBackup(response.data.backupData, response.data.filename, response.data.filePath);
          
          Alert.alert(
            'Backup Gerado!',
            `Backup criado com sucesso!\n\n` +
            `📊 Estatísticas:\n` +
            `• ${response.data.metadata.totalCredentials} credenciais\n` +
            `• ${response.data.metadata.totalNotes} notas\n` +
            `• Tamanho: ${(response.data.metadata.backupSize / 1024).toFixed(1)} KB\n\n` +
            `Conteúdo criptografado compartilhado!\n\nSalve o conteúdo em um arquivo .encrypted para futuras restaurações.`,
            [{ text: 'OK' }]
          );
        }
        
        setMasterPassword('');
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao gerar backup');
    }
  };

  /**
   * Selecionar arquivo de backup
   */
  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        
        if (file.name?.endsWith('.encrypted')) {
          // Criar um objeto File-like para compatibilidade
          const fileObject = {
            name: file.name,
            uri: file.uri,
            type: file.mimeType || 'application/octet-stream',
            size: file.size || 0,
          } as any;
          
          setSelectedFile(fileObject);
          setBackupData(''); // Limpar dados manuais
        } else {
          Alert.alert('Erro', 'Apenas arquivos .encrypted são permitidos');
        }
      }
    } catch (error) {
      console.error('Erro ao selecionar arquivo:', error);
      Alert.alert('Erro', 'Erro ao selecionar arquivo');
    }
  };

  /**
   * Restaurar backup de arquivo
   */
  const handleRestoreFromFile = async () => {
    if (!selectedFile || !masterPassword.trim()) {
      Alert.alert('Erro', 'Selecione um arquivo e digite sua senha mestra');
      return;
    }

    try {
      const response = await uploadAndRestoreBackup(selectedFile, masterPassword);

      if (response?.success) {
        Alert.alert(
          'Backup Restaurado!',
          `Backup restaurado com sucesso!\n\n` +
          `📊 Estatísticas:\n` +
          `• ${response.data.totalCredentials} credenciais restauradas\n` +
          `• ${response.data.totalNotes} notas restauradas\n\n` +
          `✅ Todos os dados foram restaurados com sucesso!`,
          [{ text: 'OK' }]
        );

        setSelectedFile(null);
        setMasterPassword('');
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao restaurar backup');
    }
  };

  /**
   * Restaurar backup
   */
  const handleRestoreBackup = async () => {
    if (!backupData.trim() || !masterPassword.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    try {
      // Primeiro validar o backup
      const validation = await validateBackup(backupData, masterPassword);
      
      if (validation?.success) {
        Alert.alert(
          'Backup Válido',
          `Backup encontrado!\n\n` +
          `👤 Usuário: ${validation.data.user.firstName} ${validation.data.user.lastName}\n` +
          `📅 Data: ${new Date(validation.data.timestamp).toLocaleDateString()}\n` +
          `📊 Conteúdo: ${validation.data.metadata.totalCredentials} credenciais, ${validation.data.metadata.totalNotes} notas\n\n` +
          `Deseja restaurar este backup?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Restaurar', 
              style: 'destructive',
              onPress: async () => {
                try {
                  const response = await restoreBackup(backupData, masterPassword);
                  
                  if (response?.success) {
                    Alert.alert(
                      'Backup Restaurado!',
                      `Backup restaurado com sucesso!\n\n` +
                      `✅ ${response.data.restoredCredentials} credenciais restauradas\n` +
                      `✅ ${response.data.restoredNotes} notas restauradas\n\n` +
                      `Os dados foram importados para sua conta.`,
                      [{ text: 'OK' }]
                    );
                    
                    setBackupData('');
                    setMasterPassword('');
                  }
                } catch (error: any) {
                  Alert.alert('Erro', error.message || 'Erro ao restaurar backup');
                }
              }
            }
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao validar backup');
    }
  };

  /**
   * Selecionar arquivo
   */
  const handleSelectFile = () => {
    // Em React Native, você precisaria usar uma biblioteca como react-native-document-picker
    Alert.alert(
      'Selecionar Arquivo',
      'Para selecionar um arquivo de backup, você pode:\n\n' +
      '1. Copiar o conteúdo do arquivo .encrypted\n' +
      '2. Colar no campo "Dados do Backup"\n\n' +
      'Ou use uma biblioteca de seleção de arquivos.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Backup Simples</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'generate' && styles.activeTab]}
            onPress={() => setActiveTab('generate')}
          >
            <Text style={[styles.tabText, activeTab === 'generate' && styles.activeTabText]}>
              Gerar Backup
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'restore' && styles.activeTab]}
            onPress={() => setActiveTab('restore')}
          >
            <Text style={[styles.tabText, activeTab === 'restore' && styles.activeTabText]}>
              Restaurar Backup
            </Text>
          </TouchableOpacity>
        </View>

        {/* Conteúdo das tabs */}
        {activeTab === 'generate' ? (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📦 Backup Automático</Text>
              <Text style={styles.sectionDescription}>
                Se seu email for do Google (Gmail), um arquivo .encrypted será enviado automaticamente para o Google Drive.
                Caso contrário, apenas o conteúdo criptografado será compartilhado para você salvar em um arquivo .encrypted.
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Senha Mestra</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={masterPassword}
                  onChangeText={setMasterPassword}
                  placeholder="Digite sua senha mestra"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.generateButton]}
              onPress={handleAutoBackup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Gerar Backup Automático</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔄 Restaurar Backup</Text>
              <Text style={styles.sectionDescription}>
                Restaure um backup anterior. Você pode fazer upload do arquivo .encrypted ou colar o conteúdo.
              </Text>
            </View>

            {/* Upload de arquivo */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Arquivo de Backup (.encrypted)</Text>
              <View style={styles.fileUploadContainer}>
                <TouchableOpacity
                  style={styles.fileUploadButton}
                  onPress={handleFileSelect}
                >
                  <Ionicons name="cloud-upload" size={20} color="#007AFF" />
                  <Text style={styles.fileUploadText}>
                    {selectedFile ? selectedFile.name : 'Selecionar Arquivo'}
                  </Text>
                </TouchableOpacity>
                {selectedFile && (
                  <TouchableOpacity
                    style={styles.removeFileButton}
                    onPress={() => setSelectedFile(null)}
                  >
                    <Ionicons name="close-circle" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* OU */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OU</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Entrada manual */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Dados do Backup (Manual)</Text>
              <TextInput
                style={[styles.textArea, styles.backupInput]}
                value={backupData}
                onChangeText={setBackupData}
                placeholder="Cole aqui o conteúdo do arquivo .encrypted"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                editable={!selectedFile}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Senha Mestra</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={masterPassword}
                  onChangeText={setMasterPassword}
                  placeholder="Digite sua senha mestra"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.restoreButton]}
              onPress={selectedFile ? handleRestoreFromFile : handleRestoreBackup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={20} color="#fff" />
                  <Text style={styles.buttonText}>
                    {selectedFile ? 'Restaurar do Arquivo' : 'Restaurar Backup'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Informações */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>ℹ️ Como funciona</Text>
          <Text style={styles.infoText}>
            • O backup é criptografado com sua senha mestra{'\n'}
            • Arquivo gerado com extensão .encrypted{'\n'}
            • Se for Gmail, vai direto para Google Drive{'\n'}
            • Caso contrário, arquivo é compartilhado para salvar{'\n'}
            • Mantenha o arquivo seguro e sua senha mestra{'\n'}
            • O backup inclui todas as credenciais e notas
          </Text>
        </View>
      </ScrollView>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  tabContent: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    padding: 12,
  },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 120,
  },
  backupInput: {
    fontFamily: 'monospace',
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
  },
  fileButtonText: {
    marginLeft: 8,
    color: '#007AFF',
    fontSize: 14,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  generateButton: {
    backgroundColor: '#34C759',
  },
  restoreButton: {
    backgroundColor: '#007AFF',
  },
  instructionsButton: {
    backgroundColor: '#FF9500',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  instructionsScroll: {
    maxHeight: 300,
    marginBottom: 20,
  },
  instructionText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f9f9f9',
    marginBottom: 20,
    minHeight: 80,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  confirmButton: {
    backgroundColor: '#4285F4',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  fileUploadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  fileUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileUploadText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  removeFileButton: {
    marginLeft: 8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});

export default SimpleBackupScreen;
