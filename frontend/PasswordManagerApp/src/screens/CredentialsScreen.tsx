import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { useCredentials } from '../hooks/useCredentials';
import CredentialList from '../components/CredentialList';
import CredentialForm from '../components/CredentialForm';
import {
  CredentialPublic,
  CreateCredentialRequest,
  UpdateCredentialRequest,
  CredentialFilters,
  Credential as CredentialDetail
} from '../types/credential';

interface CredentialsScreenProps {
  onNavigateBack: () => void;
}

const CredentialsScreen: React.FC<CredentialsScreenProps> = ({ onNavigateBack }) => {
  const {
    credentials,
    categories,
    loading,
    error,
    filters,
    loadCredentials,
    createCredential,
    updateCredential,
    deleteCredential,
    getCredential,
    applyFilters,
    setError
  } = useCredentials();

  const [showForm, setShowForm] = useState(false);
  const [editingCredential, setEditingCredential] = useState<CredentialPublic | null>(null);
  const [viewingCredential, setViewingCredential] = useState<CredentialPublic | null>(null);
  const [decryptedCredential, setDecryptedCredential] = useState<CredentialDetail | null>(null);
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [showMasterPasswordInput, setShowMasterPasswordInput] = useState(false);

  // Abrir formulário para nova credencial
  const handleCreateCredential = () => {
    setEditingCredential(null);
    setShowForm(true);
  };

  // Abrir formulário para editar credencial
  const handleEditCredential = (credential: CredentialPublic) => {
    setEditingCredential(credential);
    setShowForm(true);
  };

  // Visualizar credencial
  const handleViewCredential = (credential: CredentialPublic) => {
    setViewingCredential(credential);
    setShowMasterPasswordInput(true);
  };

  // Confirmar visualização com senha mestre
  const handleConfirmViewCredential = async () => {
    if (!masterPassword.trim()) {
      Alert.alert('Erro', 'Digite sua senha mestre');
      return;
    }

    if (!viewingCredential) return;

    try {
      const credential = await getCredential(viewingCredential.id, masterPassword);
      setDecryptedCredential(credential); // Armazenar dados descriptografados diretamente
      setShowMasterPasswordInput(false);
      setShowCredentialModal(true);
      setMasterPassword('');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao obter credencial');
      setMasterPassword('');
    }
  };

  // Salvar credencial (criar ou atualizar)
  const handleSaveCredential = async (data: CreateCredentialRequest | UpdateCredentialRequest) => {
    try {
      if (editingCredential) {
        // Atualizar credencial existente
        await updateCredential(editingCredential.id, data as UpdateCredentialRequest);
        Alert.alert('Sucesso', 'Credencial atualizada com sucesso!');
      } else {
        // Criar nova credencial
        await createCredential(data as CreateCredentialRequest);
        Alert.alert('Sucesso', 'Credencial criada com sucesso!');
      }
      setShowForm(false);
      setEditingCredential(null);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao salvar credencial');
    }
  };

  // Excluir credencial
  const handleDeleteCredential = async (credential: CredentialPublic) => {
    try {
      await deleteCredential(credential.id);
      Alert.alert('Sucesso', 'Credencial excluída com sucesso!');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao excluir credencial');
    }
  };


  // Aplicar filtros
  const handleApplyFilters = (newFilters: CredentialFilters) => {
    applyFilters(newFilters);
  };

  // Renderizar modal de visualização da credencial
  const renderCredentialModal = () => {
    if (!viewingCredential) return null;

    return (
      <Modal
        visible={showCredentialModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{viewingCredential.title}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowCredentialModal(false);
                setViewingCredential(null);
                setDecryptedCredential(null);
              }}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
            showsVerticalScrollIndicator
          >
            <View style={styles.credentialField}>
              <Text style={styles.fieldLabel}>Categoria</Text>
              <Text style={styles.fieldValue}>{viewingCredential.category}</Text>
            </View>

            {viewingCredential.description && (
              <View style={styles.credentialField}>
                <Text style={styles.fieldLabel}>Descrição</Text>
                <Text style={styles.fieldValue}>{viewingCredential.description}</Text>
              </View>
            )}

            <View style={styles.credentialField}>
              <Text style={styles.fieldLabel}>Nome de usuário / Email</Text>
              <Text style={styles.fieldValue}>{decryptedCredential?.username || 'Não informado'}</Text>
            </View>

            <View style={styles.credentialField}>
              <Text style={styles.fieldLabel}>Senha</Text>
              <Text style={styles.fieldValue}>{decryptedCredential?.password || 'Não informado'}</Text>
            </View>

            <View style={styles.credentialField}>
              <Text style={styles.fieldLabel}>Notas</Text>
              <Text style={styles.fieldValue}>{decryptedCredential?.notes || 'Não informado'}</Text>
            </View>

            <View style={styles.credentialStats}>
              <Text style={styles.statsTitle}>Estatísticas</Text>
              <Text style={styles.statsText}>
                Acessos: {viewingCredential.accessCount}
              </Text>
              <Text style={styles.statsText}>
                Último acesso: {viewingCredential.lastAccessed 
                  ? new Date(viewingCredential.lastAccessed).toLocaleString('pt-BR')
                  : 'Nunca'
                }
              </Text>
              <Text style={styles.statsText}>
                Criado em: {new Date(viewingCredential.createdAt).toLocaleString('pt-BR')}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowCredentialModal(false);
                setViewingCredential(null);
                setDecryptedCredential(null);
              }}
            >
              <Text style={styles.modalButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Renderizar modal de senha mestre
  const renderMasterPasswordModal = () => (
    <Modal
      visible={showMasterPasswordInput}
      animationType="fade"
      transparent
    >
      <View style={styles.passwordModalOverlay}>
        <View style={styles.passwordModalContainer}>
          <Text style={styles.passwordModalTitle}>Senha Mestre</Text>
          <Text style={styles.passwordModalSubtitle}>
            Digite sua senha mestre para visualizar a credencial
          </Text>
          
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              value={masterPassword}
              onChangeText={setMasterPassword}
              placeholder="Sua senha mestre"
              secureTextEntry
              autoFocus
            />
          </View>

          <View style={styles.passwordModalButtons}>
            <TouchableOpacity
              style={styles.passwordModalButton}
              onPress={() => {
                setShowMasterPasswordInput(false);
                setViewingCredential(null);
                setDecryptedCredential(null);
                setMasterPassword('');
              }}
            >
              <Text style={styles.passwordModalButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.passwordModalButton, styles.passwordModalButtonPrimary]}
              onPress={handleConfirmViewCredential}
            >
              <Text style={styles.passwordModalButtonPrimaryText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onNavigateBack}
        >
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>Cofre de Senhas</Text>
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateCredential}
          disabled={loading}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de credenciais */}
      <CredentialList
        credentials={credentials}
        loading={loading}
        onCredentialPress={handleViewCredential}
        onEditCredential={handleEditCredential}
        onDeleteCredential={handleDeleteCredential}
        onRefresh={loadCredentials}
        filters={filters}
        onFiltersChange={handleApplyFilters}
      />

      {/* Formulário de credencial */}
      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <CredentialForm
          initialData={editingCredential ? {
            title: editingCredential.title,
            description: editingCredential.description,
            category: editingCredential.category,
            isFavorite: editingCredential.isFavorite
          } : undefined}
          onSave={handleSaveCredential}
          onCancel={() => {
            setShowForm(false);
            setEditingCredential(null);
          }}
          loading={loading}
          title={editingCredential ? 'Editar Credencial' : 'Nova Credencial'}
        />
      </Modal>

      {/* Modal de senha mestre */}
      {renderMasterPasswordModal()}

      {/* Modal de visualização da credencial */}
      {renderCredentialModal()}

      {/* Indicador de erro */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.errorCloseButton}
            onPress={() => setError(null)}
          >
            <Text style={styles.errorCloseButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#3498db',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#27ae60',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  credentialField: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 5,
  },
  fieldValue: {
    fontSize: 16,
    color: '#333',
    marginTop: 5,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  credentialStats: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  statsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  modalButton: {
    backgroundColor: '#95a5a6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  passwordModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  passwordModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  passwordModalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  passwordInputContainer: {
    marginBottom: 20,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  passwordModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  passwordModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
    backgroundColor: '#95a5a6',
  },
  passwordModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  passwordModalButtonPrimary: {
    backgroundColor: '#3498db',
  },
  passwordModalButtonPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#e74c3c',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  errorCloseButton: {
    padding: 5,
  },
  errorCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CredentialsScreen;
