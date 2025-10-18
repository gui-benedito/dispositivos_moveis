import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBackup } from '../hooks/useBackup';
import { CloudProvider } from '../types/backup';
import BackupService from '../services/backupService';

interface CloudBackupScreenProps {
  navigation: any;
}

const CloudBackupScreen: React.FC<CloudBackupScreenProps> = ({ navigation }) => {
  const {
    providers,
    loading,
    error,
    getAuthUrl,
    openAuthUrl,
    processOAuthCallback,
    clearError
  } = useBackup();

  const [showMasterPasswordModal, setShowMasterPasswordModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider | null>(null);
  const [masterPassword, setMasterPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Selecionar provedor e solicitar senha mestra
   */
  const handleProviderSelect = (provider: CloudProvider) => {
    const providerInfo = providers.find(p => p.id === provider);
    
    if (!providerInfo?.configured) {
      Alert.alert(
        'Provedor não configurado',
        'Este provedor não está configurado no servidor. Entre em contato com o administrador.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSelectedProvider(provider);
    setShowMasterPasswordModal(true);
  };

  /**
   * Processar backup com OAuth
   */
  const handleBackupWithOAuth = async () => {
    if (!selectedProvider || !masterPassword) {
      Alert.alert('Erro', 'Provedor e senha mestra são obrigatórios');
      return;
    }

    try {
      setIsProcessing(true);
      setShowMasterPasswordModal(false);

      // 1. Obter URL de autorização
      const authData = await getAuthUrl(selectedProvider);
      
      // 2. Abrir URL no navegador
      await openAuthUrl(authData.authUrl);
      
      // 3. Mostrar instruções para o usuário
      Alert.alert(
        'Autorização necessária',
        'Uma nova janela foi aberta para autorizar o acesso. Após autorizar, você será redirecionado de volta ao app.',
        [
          {
            text: 'Continuar',
            onPress: () => {
              // Aqui seria implementado o listener para o callback
              // Por enquanto, vamos simular o processo
              simulateOAuthCallback(authData.state);
            }
          }
        ]
      );

    } catch (error) {
      console.error('Erro no backup OAuth:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Simular callback OAuth (para demonstração)
   */
  const simulateOAuthCallback = async (state: string) => {
    try {
      // Em um app real, isso seria capturado automaticamente
      // Aqui vamos simular com um código fake
      const fakeCode = 'fake_oauth_code_' + Date.now();
      
      const backupData = await processOAuthCallback(
        fakeCode,
        state,
        selectedProvider!,
        masterPassword
      );

      Alert.alert(
        'Backup criado com sucesso!',
        `Backup "${backupData.fileName}" foi criado com sucesso no ${BackupService.getProviderIcon(selectedProvider!)}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setMasterPassword('');
              setSelectedProvider(null);
            }
          }
        ]
      );

    } catch (error) {
      console.error('Erro no callback simulado:', error);
    }
  };

  /**
   * Renderizar provedor
   */
  const renderProvider = (provider: CloudProvider) => {
    const providerInfo = providers.find(p => p.id === provider);
    const isConfigured = providerInfo?.configured || false;
    const icon = BackupService.getProviderIcon(provider);
    const color = BackupService.getProviderColor(provider);

    return (
      <TouchableOpacity
        key={provider}
        style={[
          styles.providerCard,
          !isConfigured && styles.providerCardDisabled
        ]}
        onPress={() => handleProviderSelect(provider)}
        disabled={!isConfigured || isProcessing}
      >
        <View style={styles.providerHeader}>
          <View style={[styles.providerIcon, { backgroundColor: color }]}>
            <Ionicons name={icon as any} size={32} color="white" />
          </View>
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>
              {BackupService.getProviderIcon(provider) === 'logo-google' ? 'Google Drive' :
               BackupService.getProviderIcon(provider) === 'logo-dropbox' ? 'Dropbox' :
               BackupService.getProviderIcon(provider) === 'logo-microsoft' ? 'OneDrive' : provider}
            </Text>
            <Text style={styles.providerDescription}>
              {isConfigured ? 'Configurado e pronto para uso' : 'Não configurado'}
            </Text>
          </View>
          <View style={styles.providerActions}>
            {isConfigured ? (
              <Ionicons name="chevron-forward" size={24} color="#666" />
            ) : (
              <Ionicons name="warning" size={24} color="#f39c12" />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Backup em Nuvem</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Conteúdo */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Introdução */}
        <View style={styles.introSection}>
          <View style={styles.introIcon}>
            <Ionicons name="cloud-upload" size={48} color="#4ECDC4" />
          </View>
          <Text style={styles.introTitle}>Backup Seguro na Nuvem</Text>
          <Text style={styles.introDescription}>
            Faça backup de suas credenciais e notas de forma segura usando provedores de nuvem confiáveis. 
            Seus dados são criptografados antes do envio.
          </Text>
        </View>

        {/* Provedores */}
        <View style={styles.providersSection}>
          <Text style={styles.sectionTitle}>Escolha um Provedor</Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4ECDC4" />
              <Text style={styles.loadingText}>Carregando provedores...</Text>
            </View>
          ) : (
            <View style={styles.providersList}>
              {renderProvider('google_drive')}
              {renderProvider('dropbox')}
              {renderProvider('one_drive')}
            </View>
          )}
        </View>

        {/* Informações de Segurança */}
        <View style={styles.securitySection}>
          <Text style={styles.sectionTitle}>Segurança</Text>
          <View style={styles.securityItem}>
            <Ionicons name="shield-checkmark" size={20} color="#4ECDC4" />
            <Text style={styles.securityText}>Criptografia AES-256 antes do upload</Text>
          </View>
          <View style={styles.securityItem}>
            <Ionicons name="key" size={20} color="#4ECDC4" />
            <Text style={styles.securityText}>Protegido por senha mestra</Text>
          </View>
          <View style={styles.securityItem}>
            <Ionicons name="checkmark-circle" size={20} color="#4ECDC4" />
            <Text style={styles.securityText}>Verificação de integridade</Text>
          </View>
        </View>
      </ScrollView>

      {/* Modal de Senha Mestra */}
      <Modal
        visible={showMasterPasswordModal}
        animationType="slide"
        onRequestClose={() => setShowMasterPasswordModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowMasterPasswordModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Senha Mestra</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.modalContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed" size={64} color="#4ECDC4" />
            </View>

            <Text style={styles.modalTitle}>Confirmar Senha Mestra</Text>
            <Text style={styles.modalDescription}>
              Digite sua senha mestra para criar o backup criptografado.
            </Text>

            <TextInput
              style={styles.passwordInput}
              placeholder="Senha Mestra"
              placeholderTextColor="#999"
              secureTextEntry
              value={masterPassword}
              onChangeText={setMasterPassword}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleBackupWithOAuth}
            />

            <TouchableOpacity
              style={[styles.confirmButton, (!masterPassword || isProcessing) && styles.confirmButtonDisabled]}
              onPress={handleBackupWithOAuth}
              disabled={!masterPassword || isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>Criar Backup</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowMasterPasswordModal(false)}
              disabled={isProcessing}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  introSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  introIcon: {
    marginBottom: 20,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  introDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  providersSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  providersList: {
    gap: 15,
  },
  providerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  providerCardDisabled: {
    opacity: 0.6,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  providerDescription: {
    fontSize: 14,
    color: '#666',
  },
  providerActions: {
    padding: 5,
  },
  securitySection: {
    marginBottom: 30,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  securityText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  passwordInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  confirmButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CloudBackupScreen;
