import React, { useState, useEffect } from 'react';

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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useCredentials } from '../hooks/useCredentials';
import CredentialList from '../components/CredentialList';
import CredentialForm from '../components/CredentialForm';
import { CredentialService } from '../services/credentialService';

import {
  CredentialPublic,
  CreateCredentialRequest,
  UpdateCredentialRequest,
  CredentialFilters,
  Credential as CredentialDetail,
  CredentialVersionItem
} from '../types/credential';

interface CredentialsScreenProps {
  onNavigateBack: () => void;
}

const CredentialsScreen: React.FC<CredentialsScreenProps> = ({ onNavigateBack }) => {
  const { colors } = useTheme();
  const {
    credentials,
    categories,
    loading,
    error,
    filters,
    pagination,
    isLoadingMore,
    isOffline,
    loadCredentials,
    loadCategories,
    createCredential,
    updateCredential,
    deleteCredential,
    getCredential,
    applyFilters,
    setError,
    loadMore
  } = useCredentials();

  const [showForm, setShowForm] = useState(false);
  const [editingCredential, setEditingCredential] = useState<CredentialPublic | null>(null);
  const [viewingCredential, setViewingCredential] = useState<CredentialPublic | null>(null);
  const [decryptedCredential, setDecryptedCredential] = useState<CredentialDetail | null>(null);
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [showMasterPasswordInput, setShowMasterPasswordInput] = useState(false);
  const [isEditFlow, setIsEditFlow] = useState(false);
  const [isSecurityCheckFlow, setIsSecurityCheckFlow] = useState(false);
  const [editInitialData, setEditInitialData] = useState<Partial<CreateCredentialRequest> | undefined>(undefined);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [versions, setVersions] = useState<CredentialVersionItem[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState<string | null>(null);
  const [restoreMasterPassword, setRestoreMasterPassword] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  // Abrir formulário para nova credencial
  const handleCreateCredential = () => {
    setEditingCredential(null);
    setShowForm(true);
  };

  // Abrir histórico direto da lista
  const handleOpenHistory = async (credential: CredentialPublic) => {
    setViewingCredential(credential);
    try {
      setVersionsLoading(true);
      setVersionsError(null);
      const res = await CredentialService.listVersions(credential.id);
      if (res.success) setVersions(res.data);
      setShowVersionsModal(true);
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Erro ao carregar versões');
    } finally {
      setVersionsLoading(false);
    }
  };

  // Abrir formulário para editar credencial
  const handleEditCredential = (credential: CredentialPublic) => {
    setEditingCredential(credential);
    setIsEditFlow(true);
    setShowMasterPasswordInput(true);
  };

  // Verificar segurança (HIBP) direto do card
  const handleCheckCredentialSecurity = (credential: CredentialPublic) => {
    setViewingCredential(credential);
    setIsEditFlow(false);
    setIsSecurityCheckFlow(true);
    setShowMasterPasswordInput(true);
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

    // Se for fluxo de edição
    if (isEditFlow && editingCredential) {
      try {
        const credential = await getCredential(editingCredential.id, masterPassword);
        // Preencher dados para edição
        setEditInitialData({
          title: editingCredential.title,
          description: editingCredential.description,
          category: editingCredential.category,
          isFavorite: editingCredential.isFavorite,
          username: credential.username,
          password: credential.password,
          notes: credential.notes,
        } as Partial<CreateCredentialRequest>);
        setShowMasterPasswordInput(false);
        setShowForm(true);
        setMasterPassword('');
        setIsEditFlow(false);
        return;
      } catch (error: any) {
        Alert.alert('Erro', error.message || 'Erro ao obter credencial');
        setMasterPassword('');
        setIsEditFlow(false);
        return;
      }
    }

    // Fluxo de verificação de segurança (análise/HIBP) direto da lista
    if (isSecurityCheckFlow && viewingCredential) {
      try {
        const credential = await getCredential(viewingCredential.id, masterPassword);

        setShowMasterPasswordInput(false);
        setMasterPassword('');
        setIsSecurityCheckFlow(false);

        const response = await CredentialService.analyzePassword(credential.password);
        if (response.success) {
          const strength = response.data.strength;
          const hibp = (response.data as any).hibp;

          const hibpMsg = hibp && hibp.found
            ? `⚠️ Esta senha apareceu em vazamentos públicos ${hibp.count} vez(es). Recomenda-se alterá-la.`
            : '✅ Esta senha não foi encontrada em vazamentos públicos conhecidos.';

          Alert.alert(
            'Análise de Segurança',
            `Força: ${strength.strength} (score ${strength.score})\n\n${hibpMsg}`
          );
        } else {
          Alert.alert('Análise de Segurança', 'Não foi possível analisar a senha.');
        }
      } catch (error: any) {
        Alert.alert('Erro', error.message || 'Erro ao analisar segurança da credencial');
      } finally {
        setMasterPassword('');
        setIsSecurityCheckFlow(false);
        setViewingCredential(null);
      }
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
  const handleDeleteCredential = (credential: CredentialPublic) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Tem certeza que deseja excluir a credencial "${credential.title}"?\n\nEsta ação não pode ser desfeita.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCredential(credential.id);
              Alert.alert('Sucesso', 'Credencial excluída com sucesso!');
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Erro ao excluir credencial');
            }
          }
        }
      ]
    );
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
        <View style={[styles.modalContainer, { backgroundColor: colors.background }] }>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }] }>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{viewingCredential.title}</Text>
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
              <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>Categoria</Text>
              <Text style={[styles.fieldValue, { backgroundColor: colors.card, color: colors.text }] }>{viewingCredential.category}</Text>
            </View>

            {viewingCredential.description && (
              <View style={styles.credentialField}>
                <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>Descrição</Text>
                <Text style={[styles.fieldValue, { backgroundColor: colors.card, color: colors.text }]}>{viewingCredential.description}</Text>
              </View>
            )}

            <View style={styles.credentialField}>
              <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>Nome de usuário / Email</Text>
              <Text style={[styles.fieldValue, { backgroundColor: colors.card, color: colors.text }] }>{decryptedCredential?.username || 'Não informado'}</Text>
            </View>

            <View style={styles.credentialField}>
              <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>Senha</Text>
              <Text style={[styles.fieldValue, { backgroundColor: colors.card, color: colors.text }]}>{decryptedCredential?.password || 'Não informado'}</Text>
            </View>

            <View style={styles.credentialField}>
              <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>Notas</Text>
              <Text style={[styles.fieldValue, { backgroundColor: colors.card, color: colors.text }]}>{decryptedCredential?.notes || 'Não informado'}</Text>
            </View>

            <View style={[styles.credentialStats, { backgroundColor: colors.card }] }>
              <Text style={[styles.statsTitle, { color: colors.text }]}>Estatísticas</Text>
              <Text style={[styles.statsText, { color: colors.mutedText }] }>
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

          <View style={[styles.modalFooter, { borderTopColor: colors.border }] }>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
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
        <View style={[styles.passwordModalContainer, { backgroundColor: colors.card }] }>
          <Text style={[styles.passwordModalTitle, { color: colors.text }]}>Senha Mestre</Text>
          <Text style={[styles.passwordModalSubtitle, { color: colors.mutedText }] }>
            Digite sua senha mestre para visualizar a credencial
          </Text>
          
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={[styles.passwordInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
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
                setIsEditFlow(false);
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onNavigateBack}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]}>Suas Credenciais</Text>

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={handleCreateCredential}
          disabled={loading}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {isOffline && (
        <View style={[styles.offlineBanner, { backgroundColor: '#f39c12' }]}> 
          <Text style={styles.offlineBannerText}>
            Modo offline: exibindo dados do último sincronismo.
          </Text>
        </View>
      )}

      {/* Lista de credenciais */}
      <CredentialList
        credentials={credentials}
        loading={loading}
        onCredentialPress={handleViewCredential}
        onEditCredential={handleEditCredential}
        onOpenHistory={handleOpenHistory}
        onDeleteCredential={handleDeleteCredential}
        onRefresh={loadCredentials}
        filters={filters}
        onFiltersChange={handleApplyFilters}
        onLoadMore={loadMore}
        isLoadingMore={isLoadingMore}
        onCheckSecurity={handleCheckCredentialSecurity}
      />

      {/* Formulário de credencial */}
      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <CredentialForm
          initialData={editingCredential ? (editInitialData || {
            title: editingCredential.title,
            description: editingCredential.description,
            category: editingCredential.category,
            isFavorite: editingCredential.isFavorite
          }) : undefined}
          onSave={handleSaveCredential}
          onCancel={() => {
            setShowForm(false);
            setEditingCredential(null);
            setEditInitialData(undefined);
          }}
          loading={loading}
          title={editingCredential ? 'Editar Credencial' : 'Nova Credencial'}
          isEdit={!!editingCredential}
          categories={categories}
          onReloadCategories={loadCategories}
        />
      </Modal>

      {/* Modal de senha mestre */}
      {renderMasterPasswordModal()}

      {/* Modal de visualização da credencial */}
      {renderCredentialModal()}

      {/* Modal de versões (timeline) */}
      <Modal
        visible={showVersionsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowVersionsModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }] }>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }] }>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Histórico de Versões</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowVersionsModal(false)}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {versionsLoading && (
              <ActivityIndicator style={{ margin: 20 }} />
            )}
            {versionsError && (
              <Text style={[styles.errorText, { margin: 16 }]}>{versionsError}</Text>
            )}
            {!versionsLoading && versions.length === 0 && (
              <Text style={{ margin: 16, color: colors.mutedText }}>Nenhuma versão encontrada.</Text>
            )}
            {!versionsLoading && versions.length > 0 && (
              <ScrollView contentContainerStyle={styles.modalContentContainer}>
                {versions.map(v => (
                  <View key={v.id} style={styles.versionItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.versionTitle, { color: colors.text }]}>Versão {v.version} • {new Date(v.createdAt).toLocaleString('pt-BR')}</Text>
                      <Text style={[styles.versionMeta, { color: colors.mutedText }]}>Título: {v.title} • Categoria: {v.category} {v.isFavorite ? '• ⭐' : ''}</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        setSelectedVersion(v.version);
                      }}
                    >
                        <Text style={[styles.modalButtonPrimaryText, { color: colors.text }]}>Restaurar</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {selectedVersion !== null && (
                  <View style={[styles.restoreBox, { backgroundColor: colors.card }] }>
                    <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>Senha Mestre</Text>
                    <TextInput
                      style={[styles.passwordInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                      value={restoreMasterPassword}
                      onChangeText={setRestoreMasterPassword}
                      placeholder="Informe sua senha mestre"
                      secureTextEntry
                    />
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                      <TouchableOpacity
                        style={[styles.modalButton, { flex: 1 }]}
                        onPress={() => { setSelectedVersion(null); setRestoreMasterPassword(''); }}
                      >
                        <Text style={styles.modalButtonText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.modalButtonPrimary, { flex: 1 }]}
                        onPress={async () => {
                          if (!viewingCredential || !selectedVersion) return;
                          if (!restoreMasterPassword.trim()) {
                            Alert.alert('Erro', 'Informe a senha mestre');
                            return;
                          }
                          try {
                            const res = await CredentialService.restoreVersion(viewingCredential.id, selectedVersion, restoreMasterPassword);
                            if (res.success) {
                              Alert.alert('Sucesso', 'Versão restaurada com sucesso');
                              setRestoreMasterPassword('');
                              setSelectedVersion(null);
                              setShowVersionsModal(false);
                              // Recarregar lista
                              await loadCredentials();
                            }
                          } catch (e: any) {
                            Alert.alert('Erro', e.message || 'Falha ao restaurar versão');
                          }
                        }}
                      >
                        <Text style={styles.modalButtonPrimaryText}>Confirmar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Indicador de erro (somente quando não está offline) */}
      {error && !isOffline && (
        <View style={[styles.errorContainer, { backgroundColor: colors.danger }] }>
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
  modalButtonPrimary: {
    backgroundColor: '#3498db',
    marginLeft: 10,
  },
  modalButtonPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  versionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  versionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  versionMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  restoreBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
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
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  offlineBanner: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineBannerText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default CredentialsScreen;
