import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBackup } from '../hooks/useBackup';
import { CloudProvider, BackupInfo } from '../types/backup';
import BackupService from '../services/backupService';

interface BackupManagementScreenProps {
  navigation: any;
}

const BackupManagementScreen: React.FC<BackupManagementScreenProps> = ({ navigation }) => {
  const {
    providers,
    backups,
    stats,
    loading,
    error,
    loadBackups,
    restoreBackup,
    validateBackup,
    clearError
  } = useBackup();

  const [selectedProvider, setSelectedProvider] = useState<CloudProvider | null>(null);
  const [accessToken, setAccessToken] = useState('');
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupInfo | null>(null);
  const [masterPassword, setMasterPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Selecionar provedor e solicitar token
   */
  const handleProviderSelect = (provider: CloudProvider) => {
    setSelectedProvider(provider);
    setShowTokenModal(true);
  };

  /**
   * Carregar backups com token
   */
  const handleLoadBackups = async () => {
    if (!selectedProvider || !accessToken) {
      Alert.alert('Erro', 'Provedor e token são obrigatórios');
      return;
    }

    try {
      await loadBackups(selectedProvider, accessToken);
      setShowTokenModal(false);
    } catch (error) {
      console.error('Erro ao carregar backups:', error);
    }
  };

  /**
   * Validar backup
   */
  const handleValidateBackup = async (backup: BackupInfo) => {
    if (!selectedProvider || !accessToken) {
      Alert.alert('Erro', 'Token de acesso necessário');
      return;
    }

    try {
      setIsProcessing(true);
      
      const validation = await validateBackup(selectedProvider, accessToken, backup.fileId);
      
      Alert.alert(
        'Validação do Backup',
        validation.isValid 
          ? '✅ Backup válido e íntegro' 
          : '❌ Backup inválido ou corrompido',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Erro ao validar backup:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Iniciar restauração
   */
  const handleStartRestore = (backup: BackupInfo) => {
    setSelectedBackup(backup);
    setShowRestoreModal(true);
  };

  /**
   * Confirmar restauração
   */
  const handleConfirmRestore = async () => {
    if (!selectedProvider || !accessToken || !selectedBackup || !masterPassword) {
      Alert.alert('Erro', 'Todos os campos são obrigatórios');
      return;
    }

    try {
      setIsProcessing(true);
      setShowRestoreModal(false);

      const restoreData = await restoreBackup(
        selectedProvider,
        accessToken,
        selectedBackup.fileId,
        masterPassword
      );

      Alert.alert(
        'Backup Restaurado!',
        `Restaurados com sucesso:\n• ${restoreData.itemsRestored.credentials} credenciais\n• ${restoreData.itemsRestored.notes} notas\n• 2FA: ${restoreData.itemsRestored.twoFactor}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setMasterPassword('');
              setSelectedBackup(null);
            }
          }
        ]
      );

    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
    } finally {
      setIsProcessing(false);
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
    const isSelected = selectedProvider === provider;

    return (
      <TouchableOpacity
        key={provider}
        style={[
          styles.providerCard,
          isSelected && styles.providerCardSelected,
          !isConfigured && styles.providerCardDisabled
        ]}
        onPress={() => handleProviderSelect(provider)}
        disabled={!isConfigured}
      >
        <View style={styles.providerHeader}>
          <View style={[styles.providerIcon, { backgroundColor: color }]}>
            <Ionicons name={icon as any} size={24} color="white" />
          </View>
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>
              {provider === 'google_drive' ? 'Google Drive' :
               provider === 'dropbox' ? 'Dropbox' :
               provider === 'one_drive' ? 'OneDrive' : provider}
            </Text>
            <Text style={styles.providerDescription}>
              {isSelected ? 'Selecionado' : isConfigured ? 'Disponível' : 'Não configurado'}
            </Text>
          </View>
          <View style={styles.providerActions}>
            {isSelected ? (
              <Ionicons name="checkmark-circle" size={24} color="#4ECDC4" />
            ) : isConfigured ? (
              <Ionicons name="chevron-forward" size={24} color="#666" />
            ) : (
              <Ionicons name="warning" size={24} color="#f39c12" />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  /**
   * Renderizar item de backup
   */
  const renderBackupItem = ({ item }: { item: BackupInfo }) => (
    <View style={styles.backupItem}>
      <View style={styles.backupHeader}>
        <View style={styles.backupIcon}>
          <Ionicons 
            name={BackupService.getProviderIcon(item.provider) as any} 
            size={24} 
            color={BackupService.getProviderColor(item.provider)} 
          />
        </View>
        <View style={styles.backupInfo}>
          <Text style={styles.backupFileName} numberOfLines={1}>
            {item.fileName}
          </Text>
          <Text style={styles.backupDetails}>
            {BackupService.formatFileSize(item.fileSize)} • {BackupService.formatBackupDate(item.createdAt)}
          </Text>
          <Text style={styles.backupMetadata}>
            {item.metadata.credentialsCount} credenciais • {item.metadata.notesCount} notas
          </Text>
        </View>
        <View style={styles.backupStatus}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: item.status === 'completed' ? '#4ECDC4' : '#f39c12' }
          ]} />
        </View>
      </View>
      
      <View style={styles.backupActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleValidateBackup(item)}
          disabled={isProcessing}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#4ECDC4" />
          <Text style={styles.actionButtonText}>Validar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.restoreButton]}
          onPress={() => handleStartRestore(item)}
          disabled={isProcessing}
        >
          <Ionicons name="download-outline" size={20} color="#fff" />
          <Text style={[styles.actionButtonText, styles.restoreButtonText]}>Restaurar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
        <Text style={styles.headerTitle}>Gerenciar Backups</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Conteúdo */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Estatísticas */}
        {stats && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Estatísticas</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.totalBackups}</Text>
                <Text style={styles.statLabel}>Total de Backups</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{BackupService.formatFileSize(stats.totalSize)}</Text>
                <Text style={styles.statLabel}>Tamanho Total</Text>
              </View>
            </View>
          </View>
        )}

        {/* Seleção de Provedor */}
        <View style={styles.providersSection}>
          <Text style={styles.sectionTitle}>Provedor de Nuvem</Text>
          <View style={styles.providersList}>
            {renderProvider('google_drive')}
            {renderProvider('dropbox')}
            {renderProvider('one_drive')}
          </View>
        </View>

        {/* Lista de Backups */}
        {selectedProvider && (
          <View style={styles.backupsSection}>
            <Text style={styles.sectionTitle}>Backups Disponíveis</Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4ECDC4" />
                <Text style={styles.loadingText}>Carregando backups...</Text>
              </View>
            ) : backups.length > 0 ? (
              <FlatList
                data={backups}
                renderItem={renderBackupItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="cloud-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>Nenhum backup encontrado</Text>
                <Text style={styles.emptySubtext}>
                  Faça backup de seus dados primeiro
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal de Token */}
      <Modal
        visible={showTokenModal}
        animationType="slide"
        onRequestClose={() => setShowTokenModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowTokenModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Token de Acesso</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.modalContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="key" size={64} color="#4ECDC4" />
            </View>

            <Text style={styles.modalTitle}>Token de Acesso</Text>
            <Text style={styles.modalDescription}>
              Cole aqui o token de acesso do {selectedProvider === 'google_drive' ? 'Google Drive' :
               selectedProvider === 'dropbox' ? 'Dropbox' :
               selectedProvider === 'one_drive' ? 'OneDrive' : selectedProvider}.
            </Text>

            <TextInput
              style={styles.tokenInput}
              placeholder="Token de acesso"
              placeholderTextColor="#999"
              value={accessToken}
              onChangeText={setAccessToken}
              autoCapitalize="none"
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.confirmButton, (!accessToken || isProcessing) && styles.confirmButtonDisabled]}
              onPress={handleLoadBackups}
              disabled={!accessToken || isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>Carregar Backups</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowTokenModal(false)}
              disabled={isProcessing}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Restauração */}
      <Modal
        visible={showRestoreModal}
        animationType="slide"
        onRequestClose={() => setShowRestoreModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowRestoreModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Restaurar Backup</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.modalContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="download" size={64} color="#4ECDC4" />
            </View>

            <Text style={styles.modalTitle}>Confirmar Restauração</Text>
            <Text style={styles.modalDescription}>
              Digite sua senha mestra para restaurar o backup "{selectedBackup?.fileName}".
              ⚠️ Esta ação substituirá todos os dados atuais.
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
              onSubmitEditing={handleConfirmRestore}
            />

            <TouchableOpacity
              style={[styles.confirmButton, (!masterPassword || isProcessing) && styles.confirmButtonDisabled]}
              onPress={handleConfirmRestore}
              disabled={!masterPassword || isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>Restaurar Backup</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowRestoreModal(false)}
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
  statsSection: {
    marginTop: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 15,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4ECDC4',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  providersSection: {
    marginBottom: 30,
  },
  providersList: {
    gap: 15,
  },
  providerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  providerCardSelected: {
    borderWidth: 2,
    borderColor: '#4ECDC4',
  },
  providerCardDisabled: {
    opacity: 0.6,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  providerDescription: {
    fontSize: 14,
    color: '#666',
  },
  providerActions: {
    padding: 5,
  },
  backupsSection: {
    marginBottom: 30,
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  backupItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  backupIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  backupInfo: {
    flex: 1,
  },
  backupFileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  backupDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  backupMetadata: {
    fontSize: 12,
    color: '#999',
  },
  backupStatus: {
    padding: 5,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  backupActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4ECDC4',
  },
  restoreButton: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  actionButtonText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  restoreButtonText: {
    color: '#fff',
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
  tokenInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    textAlignVertical: 'top',
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

export default BackupManagementScreen;
