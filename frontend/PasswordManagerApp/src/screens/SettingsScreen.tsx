import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  TextInput,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthenticatedSettings } from '../hooks/useAuthenticatedSettings';
import { useTwoFactor } from '../hooks/useTwoFactor';
import { LOCK_TIMEOUT_OPTIONS } from '../types/settings';
import { ExportService } from '../services/exportService';
import { SecurityService } from '../services/securityService';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

interface SettingsScreenProps {
  onLogout: () => void;
  onNavigateToHome: () => void;
  onNavigateTo2FASetup?: () => void;
  onNavigateToRiskPasswords?: () => void;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onLogout, onNavigateToHome, onNavigateTo2FASetup, onNavigateToRiskPasswords, user }) => {
  const { settings, updateSettings, loading } = useAuthenticatedSettings(true);
  const { colors } = useTheme();
  const { status: twoFactorStatus, loadStatus, disable2FA } = useTwoFactor();
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showMasterPasswordModal, setShowMasterPasswordModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [exporting, setExporting] = useState(false);
  const [currentMasterPassword, setCurrentMasterPassword] = useState('');
  const [newMasterPassword, setNewMasterPassword] = useState('');
  const [confirmMasterPassword, setConfirmMasterPassword] = useState('');
  const [savingMasterPassword, setSavingMasterPassword] = useState(false);

  /**
   * Definir ou alterar senha mestra unificada
   */
  const handleSaveMasterPassword = async () => {
    if (!newMasterPassword.trim() || newMasterPassword.length < 8) {
      Alert.alert('Senha fraca', 'A nova senha mestra deve ter pelo menos 8 caracteres.');
      return;
    }

    if (newMasterPassword !== confirmMasterPassword) {
      Alert.alert('Atenção', 'A confirmação da senha mestra não confere.');
      return;
    }

    try {
      setSavingMasterPassword(true);
      const resp = await SecurityService.setMasterPassword({
        currentPassword: currentMasterPassword || undefined,
        newPassword: newMasterPassword,
        confirmPassword: confirmMasterPassword
      });

      if (!resp.success) {
        Alert.alert('Erro', resp.message || 'Falha ao salvar senha mestra');
        return;
      }

      Alert.alert('Sucesso', resp.message || 'Senha mestra atualizada com sucesso');
      setShowMasterPasswordModal(false);
      setCurrentMasterPassword('');
      setNewMasterPassword('');
      setConfirmMasterPassword('');
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Erro ao salvar senha mestra');
    } finally {
      setSavingMasterPassword(false);
    }
  };

  /**
   * Exportar dados (JSON) com senha mestra para arquivo e compartilhar
   */
  const handleExport = async () => {
    if (!exportPassword.trim()) {
      Alert.alert('Senha necessária', 'Informe a senha mestra para exportar.');
      return;
    }
    try {
      setExporting(true);
      const resp = await ExportService.exportJson(exportPassword.trim());
      if (!resp?.success) {
        throw new Error(resp?.message || 'Falha na exportação');
      }
      const payload = resp.data || {};
      const json = JSON.stringify(payload, null, 2);
      const stamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
      const safeEmail = (user?.email || 'user').replace(/[^a-zA-Z0-9_.-]/g, '_');
      const fileName = `PasswordManager-Export-${safeEmail}-${stamp}.json`;
      const uri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(uri, json);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Exportação Password Manager' });
      } else {
        await Share.share({ title: fileName, url: uri, message: json });
      }

      setShowExportModal(false);
      setExportPassword('');
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Erro ao exportar dados');
    } finally {
      setExporting(false);
    }
  };

  // Carregar status do 2FA ao montar o componente
  React.useEffect(() => {
    loadStatus().catch((error) => {
      console.warn('Erro ao carregar status do 2FA:', error);
      // Não mostrar erro para o usuário, apenas logar
    });
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', onPress: onLogout, style: 'destructive' },
      ]
    );
  };

  /**
   * Atualizar timeout de bloqueio automático
   */
  const handleTimeoutChange = async (timeout: number) => {
    try {
      const success = await updateSettings({ autoLockTimeout: timeout });
      if (success) {
        setShowTimeoutModal(false);
        Alert.alert('Sucesso', 'Timeout de bloqueio atualizado com sucesso');
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro ao atualizar configurações');
    }
  };

  /**
   * Atualizar configuração de bloqueio
   */
  const handleLockSettingChange = async (setting: string, value: boolean) => {
    try {
      const success = await updateSettings({ [setting]: value });
      if (!success) {
        Alert.alert('Erro', 'Erro ao atualizar configurações');
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro ao atualizar configurações');
    }
  };

  /**
   * Desativar 2FA
   */
  const handleDisable2FA = async () => {
    try {
      const result = await disable2FA('email', '');
      
      if (result.success) {
        Alert.alert('Sucesso', '2FA desativado com sucesso');
        setShow2FAModal(false);
        // Recarregar status
        await loadStatus();
      } else {
        Alert.alert('Erro', result.message || 'Erro ao desativar 2FA');
      }
    } catch (error: any) {
      console.error('Erro ao desativar 2FA:', error);
      Alert.alert('Erro', error.message || 'Erro ao desativar 2FA');
    }
  };

  /**
   * Atualizar configuração de biometria
   */
  const handleBiometricSettingChange = async (value: boolean) => {
    try {
      if (value) {
        // Ativar biometria - verificar se dispositivo suporta
        const { BiometricService } = await import('../services/biometricService');
        const isSupported = await BiometricService.isBiometricSupported();
        
        if (!isSupported) {
          Alert.alert('Biometria Indisponível', 'Seu dispositivo não suporta autenticação biométrica ou não há biometria configurada.');
          return;
        }

        // Obter tipos disponíveis
        const availableTypes = await BiometricService.getAvailableBiometricTypes();
        if (availableTypes.length === 0) {
          Alert.alert('Biometria Indisponível', 'Nenhum tipo de biometria está disponível no seu dispositivo.');
          return;
        }

        // Usar o primeiro tipo disponível (fingerprint)
        const biometricType = availableTypes[0];
        
        // Ativar biometria no backend
        const result = await BiometricService.enableBiometric(biometricType);
        if (result.success) {
          // Atualizar configurações locais
          await updateSettings({ 
            biometricEnabled: true, 
            biometricType: biometricType 
          });
          Alert.alert('Sucesso', 'Autenticação biométrica ativada com sucesso!');
        } else {
          Alert.alert('Erro', 'Falha ao ativar biometria no servidor');
        }
      } else {
        // Desativar biometria
        const { BiometricService } = await import('../services/biometricService');
        const result = await BiometricService.disableBiometric();
        if (result.success) {
          // Atualizar configurações locais
          await updateSettings({ 
            biometricEnabled: false, 
            biometricType: undefined 
          });
          Alert.alert('Sucesso', 'Autenticação biométrica desativada com sucesso!');
        } else {
          Alert.alert('Erro', 'Falha ao desativar biometria no servidor');
        }
      }
    } catch (error: any) {
      console.error('Erro ao configurar biometria:', error);
      Alert.alert('Erro', error.message || 'Erro ao configurar biometria');
    }
  };

  /**
   * Obter label do timeout atual
   */
  const getCurrentTimeoutLabel = () => {
    const option = LOCK_TIMEOUT_OPTIONS.find(opt => opt.value === settings.autoLockTimeout);
    return option ? option.label : '5 minutos';
  };

  /**
   * Renderizar item da lista de timeout
   */
  const renderTimeoutItem = ({ item }: { item: typeof LOCK_TIMEOUT_OPTIONS[0] }) => (
    <TouchableOpacity
      style={[
        styles.timeoutItem,
        item.value === settings.autoLockTimeout && styles.timeoutItemSelected
      ]}
      onPress={() => handleTimeoutChange(item.value)}
    >
      <Text style={[
        styles.timeoutItemText,
        item.value === settings.autoLockTimeout && styles.timeoutItemTextSelected
      ]}>
        {item.label}
      </Text>
      {item.value === settings.autoLockTimeout && (
        <Ionicons name="checkmark" size={20} color="#4ECDC4" />
      )}
    </TouchableOpacity>
  );

  const isDarkTheme = (settings as any).theme !== 'light';

  const switchTrackColor = {
    false: isDarkTheme ? '#3A3A3A' : '#E0E0E0',
    true: '#6200EE',
  };
  const switchThumbColorOn = isDarkTheme ? '#B0B0B0' : '#FFFFFF';
  const switchThumbColorOff = isDarkTheme ? '#757575' : '#FFFFFF';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={onNavigateToHome} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Configurações</Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>
            {user.firstName} {user.lastName}
          </Text>
          <Text style={[styles.email, { color: colors.mutedText }]}>{user.email}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Seção de Bloqueio Automático */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>🔒 Bloqueio Automático</Text>
          
          {/* Timeout de bloqueio */}
          <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Tempo de bloqueio</Text>
              <Text style={[styles.settingDescription, { color: colors.mutedText }]}>
                Tempo de inatividade antes do bloqueio automático
              </Text>
            </View>
            <TouchableOpacity
              style={styles.settingValue}
              onPress={() => setShowTimeoutModal(true)}
            >
              <Text style={[styles.settingValueText, { color: colors.primary }]}>{getCurrentTimeoutLabel()}</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Bloquear ao sair do foco */}
          <View style={[styles.settingItem, { backgroundColor: colors.card }] }>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Bloquear ao sair do foco</Text>
              <Text style={[styles.settingDescription, { color: colors.mutedText }] }>
                Bloquear automaticamente quando o app sair do foco
              </Text>
            </View>
            <Switch
              value={settings.lockOnBackground}
              onValueChange={(value) => handleLockSettingChange('lockOnBackground', value)}
              trackColor={switchTrackColor}
              thumbColor={settings.lockOnBackground ? switchThumbColorOn : switchThumbColorOff}
            />
          </View>

          {/* Bloquear ao desligar tela */}
          <View style={[styles.settingItem, { backgroundColor: colors.card }] }>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Bloquear ao desligar tela</Text>
              <Text style={[styles.settingDescription, { color: colors.mutedText }]}>
                Bloquear automaticamente quando a tela for desligada
              </Text>
            </View>
            <Switch
              value={settings.lockOnScreenOff}
              onValueChange={(value) => handleLockSettingChange('lockOnScreenOff', value)}
              trackColor={switchTrackColor}
              thumbColor={settings.lockOnScreenOff ? switchThumbColorOn : switchThumbColorOff}
            />
          </View>
        </View>

        {/* Seção de Autenticação */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>🔐 Autenticação</Text>
          
          {/* Biometria */}
          <View style={[styles.settingItem, { backgroundColor: colors.card }] }>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Autenticação biométrica</Text>
              <Text style={[styles.settingDescription, { color: colors.mutedText }]}>
                Usar impressão digital para TODOS os logins e desbloqueios
              </Text>
            </View>
            <Switch
              value={settings.biometricEnabled}
              onValueChange={handleBiometricSettingChange}
              trackColor={switchTrackColor}
              thumbColor={settings.biometricEnabled ? switchThumbColorOn : switchThumbColorOff}
            />
          </View>

          {/* Requer senha no desbloqueio */}
          <View style={[styles.settingItem, { backgroundColor: colors.card }] }>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Requer senha no desbloqueio</Text>
              <Text style={[styles.settingDescription, { color: colors.mutedText }]}>
                Sempre exigir senha para desbloquear o aplicativo
              </Text>
            </View>
            <Switch
              value={settings.requirePasswordOnLock}
              onValueChange={(value) => handleLockSettingChange('requirePasswordOnLock', value)}
              trackColor={switchTrackColor}
              thumbColor={settings.requirePasswordOnLock ? switchThumbColorOn : switchThumbColorOff}
            />
          </View>

          {/* Senha Mestra */}
          <TouchableOpacity 
            style={[styles.settingItem, { backgroundColor: colors.card }] }
            onPress={() => setShowMasterPasswordModal(true)}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Senha Mestra</Text>
              <Text style={[styles.settingDescription, { color: colors.mutedText }]}>
                Configurar senha para acessar notas seguras
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          {/* 2FA - Autenticação em Dois Fatores */}
          <View style={[styles.settingItem, { backgroundColor: colors.card }] }>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Autenticação em Dois Fatores (2FA)</Text>
              <Text style={[styles.settingDescription, { color: colors.mutedText }]}>
                {twoFactorStatus?.email?.enabled 
                  ? '2FA ativado - Proteção adicional ativa'
                  : 'Adicione uma camada extra de segurança'
                }
              </Text>
            </View>
            <TouchableOpacity
              style={styles.twoFactorButton}
              onPress={() => setShow2FAModal(true)}
            >
              <Text style={styles.twoFactorButtonText}>
                {twoFactorStatus?.email?.enabled 
                  ? 'Gerenciar 2FA' 
                  : 'Configurar 2FA'
                }
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Informações de Segurança */}
        <View style={styles.infoSection}>
          <View style={[styles.infoCard, { backgroundColor: colors.card }] }>
            <Ionicons name="shield-checkmark" size={24} color="#4ECDC4" />
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>Segurança Ativa</Text>
              <Text style={[styles.infoDescription, { color: colors.mutedText }]}>
                Seu aplicativo está protegido com bloqueio automático e criptografia AES-256.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: colors.card, marginTop: 16 }]}
            onPress={() => {
              if (onNavigateToRiskPasswords) {
                onNavigateToRiskPasswords();
              } else {
                Alert.alert('Info', 'Tela de senhas em risco não está disponível.');
              }
            }}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Senhas em Risco (HIBP)</Text>
              <Text style={[styles.settingDescription, { color: colors.mutedText }]}>Verificar se alguma senha do seu cofre apareceu em vazamentos públicos.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Tema (Claro/Escuro) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>🎨 Aparência</Text>
          <View style={[styles.settingItem, { backgroundColor: colors.card }] }>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Tema escuro</Text>
              <Text style={[styles.settingDescription, { color: colors.mutedText }] }>
                Alternar entre tema claro e escuro (salvo por usuário)
              </Text>
            </View>
            <Switch
              value={isDarkTheme}
              onValueChange={async (value) => {
                await updateSettings({ theme: value ? 'dark' : 'light' });
              }}
              trackColor={switchTrackColor}
              thumbColor={isDarkTheme ? switchThumbColorOn : switchThumbColorOff}
            />
          </View>
        </View>

        {/* Informações do App */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📱 Sobre o App</Text>
          <View style={[styles.infoContainer, { backgroundColor: colors.card }] }>
            <Text style={[styles.infoText, { color: colors.mutedText }]}>Versão: 1.0.0</Text>
            <Text style={[styles.infoText, { color: colors.mutedText }]}>Desenvolvido com React Native</Text>
            <Text style={[styles.infoText, { color: colors.mutedText }]}>Backend: Node.js + PostgreSQL</Text>
          </View>
        </View>

        {/* Exportação de Dados */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>⬇️ Exportação</Text>
          <TouchableOpacity style={[styles.settingItem, { backgroundColor: colors.card }] } onPress={() => setShowExportModal(true)}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Exportar dados (JSON)</Text>
              <Text style={[styles.settingDescription, { color: colors.mutedText }]}>Requer senha mestra para descriptografar e exportar</Text>
            </View>
            <Ionicons name="download" size={20} color="#4ECDC4" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sair da Conta</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de 2FA */}
      <Modal
        visible={show2FAModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShow2FAModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Autenticação em Dois Fatores</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShow2FAModal(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Status atual do 2FA */}
            <View style={styles.statusContainer}>
              <Text style={styles.statusTitle}>Status Atual</Text>
              

              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Email:</Text>
                <Text style={[
                  styles.statusValue,
                  { color: twoFactorStatus?.email?.enabled ? '#27ae60' : '#e74c3c' }
                ]}>
                  {twoFactorStatus?.email?.enabled ? 'Ativado' : 'Desativado'}
                </Text>
              </View>
            </View>

            {/* Ações disponíveis */}
            <View style={styles.actionsContainer}>
              <Text style={styles.actionsTitle}>Ações Disponíveis</Text>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setShow2FAModal(false);
                  if (onNavigateTo2FASetup) {
                    onNavigateTo2FASetup();
                  } else {
                    Alert.alert('Info', 'Navegação para configuração de 2FA não implementada');
                  }
                }}
              >
                <Text style={styles.actionButtonText}>
                  {twoFactorStatus?.email?.enabled 
                    ? 'Gerenciar 2FA' 
                    : 'Configurar 2FA'
                  }
                </Text>
              </TouchableOpacity>

              {twoFactorStatus?.email?.enabled && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.dangerButton]}
                  onPress={() => {
                    Alert.alert(
                      'Desativar 2FA',
                      'Tem certeza que deseja desativar a autenticação em dois fatores? Isso reduzirá a segurança da sua conta.',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Desativar', style: 'destructive', onPress: () => {
                          handleDisable2FA();
                        }}
                      ]
                    );
                  }}
                >
                  <Text style={styles.dangerButtonText}>Desativar 2FA</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal de seleção de timeout */}
      <Modal
        visible={showTimeoutModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimeoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tempo de Bloqueio</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowTimeoutModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={LOCK_TIMEOUT_OPTIONS}
              renderItem={renderTimeoutItem}
              keyExtractor={(item) => item.value.toString()}
              style={styles.timeoutList}
            />
          </View>
        </View>
      </Modal>

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
              <Ionicons name="shield-checkmark" size={64} color="#4ECDC4" />
            </View>

            <Text style={styles.modalTitle}>Configurar Senha Mestra</Text>
            <Text style={styles.modalDescription}>
              A senha mestra será usada para proteger e acessar seus dados sensíveis, backups e exportações.
            </Text>

            <Text style={{ marginTop: 12, marginBottom: 4, color: '#333', fontWeight: '500' }}>Senha Mestra Atual (opcional)</Text>
            <TextInput
              value={currentMasterPassword}
              onChangeText={setCurrentMasterPassword}
              placeholder="Digite a senha mestra atual (se já tiver uma)"
              secureTextEntry
              style={{
                backgroundColor: '#fff',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: '#e0e0e0',
                marginBottom: 12
              }}
            />

            <Text style={{ marginBottom: 4, color: '#333', fontWeight: '500' }}>Nova Senha Mestra</Text>
            <TextInput
              value={newMasterPassword}
              onChangeText={setNewMasterPassword}
              placeholder="Digite a nova senha mestra"
              secureTextEntry
              style={{
                backgroundColor: '#fff',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: '#e0e0e0',
                marginBottom: 12
              }}
            />

            <Text style={{ marginBottom: 4, color: '#333', fontWeight: '500' }}>Confirmar Nova Senha Mestra</Text>
            <TextInput
              value={confirmMasterPassword}
              onChangeText={setConfirmMasterPassword}
              placeholder="Confirme a nova senha mestra"
              secureTextEntry
              style={{
                backgroundColor: '#fff',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: '#e0e0e0',
                marginBottom: 20
              }}
            />

            <TouchableOpacity
              style={[styles.actionButton, savingMasterPassword && { opacity: 0.7 }]}
              onPress={handleSaveMasterPassword}
              disabled={savingMasterPassword}
            >
              <Text style={styles.actionButtonText}>
                {savingMasterPassword ? 'Salvando...' : 'Salvar Senha Mestra'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Exportação JSON */}
      <Modal
        visible={showExportModal}
        animationType="slide"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowExportModal(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Exportar Dados (JSON)</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.modalContent}>
            <Text style={{ fontSize: 16, color: '#333', marginBottom: 12 }}>
              Informe sua senha mestra para gerar o JSON com suas credenciais e notas.
            </Text>
            <Text style={{ color: '#666', marginBottom: 8 }}>Senha Mestra</Text>
            <TextInput
              value={exportPassword}
              onChangeText={setExportPassword}
              placeholder="Digite sua senha mestra"
              secureTextEntry
              style={{
                backgroundColor: '#fff',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: '#e0e0e0',
                marginBottom: 16
              }}
            />

            <TouchableOpacity
              style={[styles.actionButton, exporting && { opacity: 0.7 }]}
              onPress={handleExport}
              disabled={exporting}
            >
              <Text style={styles.actionButtonText}>
                {exporting ? 'Exportando...' : 'Gerar e Compartilhar JSON'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#2A2A2A',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#ecf0f1',
  },
  content: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2A2A2A',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: '#999',
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValueText: {
    fontSize: 14,
    color: '#4ECDC4',
    marginRight: 5,
  },
  infoSection: {
    marginBottom: 30,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#2A2A2A',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: 15,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 12,
    color: '#999',
  },
  infoContainer: {
    backgroundColor: '#2A2A2A',
    padding: 15,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
    lineHeight: 20,
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    margin: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#2A2A2A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3A',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  modalCloseButton: {
    padding: 5,
  },
  timeoutList: {
    maxHeight: 300,
  },
  timeoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3A',
  },
  timeoutItemSelected: {
    backgroundColor: '#1A3A3A',
  },
  timeoutItemText: {
    fontSize: 16,
    color: '#fff',
  },
  timeoutItemTextSelected: {
    color: '#4ECDC4',
    fontWeight: '600',
  },
  // Estilos para 2FA
  twoFactorButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  twoFactorButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Estilos do modal 2FA
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusLabel: {
    fontSize: 16,
    color: '#666',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionsContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: '#4ECDC4',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerButton: {
    backgroundColor: '#e74c3c',
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  featureList: {
    marginVertical: 20,
  },
  featureItem: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    paddingLeft: 10,
  },
  placeholder: {
    width: 24,
  },
});

export default SettingsScreen;
