import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthenticatedSettings } from '../hooks/useAuthenticatedSettings';
import { LOCK_TIMEOUT_OPTIONS } from '../types/settings';

interface SettingsScreenProps {
  onLogout: () => void;
  onNavigateToHome: () => void;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onLogout, onNavigateToHome, user }) => {
  const { settings, updateSettings, loading } = useAuthenticatedSettings(true);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);

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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onNavigateToHome}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Configurações</Text>
        <Text style={styles.subtitle}>
          {user.firstName} {user.lastName}
        </Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <View style={styles.content}>
        {/* Seção de Bloqueio Automático */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔒 Bloqueio Automático</Text>
          
          {/* Timeout de bloqueio */}
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Tempo de bloqueio</Text>
              <Text style={styles.settingDescription}>
                Tempo de inatividade antes do bloqueio automático
              </Text>
            </View>
            <TouchableOpacity
              style={styles.settingValue}
              onPress={() => setShowTimeoutModal(true)}
            >
              <Text style={styles.settingValueText}>{getCurrentTimeoutLabel()}</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Bloquear ao sair do foco */}
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Bloquear ao sair do foco</Text>
              <Text style={styles.settingDescription}>
                Bloquear automaticamente quando o app sair do foco
              </Text>
            </View>
            <Switch
              value={settings.lockOnBackground}
              onValueChange={(value) => handleLockSettingChange('lockOnBackground', value)}
              trackColor={{ false: '#3A3A3A', true: '#4ECDC4' }}
              thumbColor={settings.lockOnBackground ? '#fff' : '#666'}
            />
          </View>

          {/* Bloquear ao desligar tela */}
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Bloquear ao desligar tela</Text>
              <Text style={styles.settingDescription}>
                Bloquear automaticamente quando a tela for desligada
              </Text>
            </View>
            <Switch
              value={settings.lockOnScreenOff}
              onValueChange={(value) => handleLockSettingChange('lockOnScreenOff', value)}
              trackColor={{ false: '#3A3A3A', true: '#4ECDC4' }}
              thumbColor={settings.lockOnScreenOff ? '#fff' : '#666'}
            />
          </View>
        </View>

        {/* Seção de Autenticação */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔐 Autenticação</Text>
          
          {/* Biometria */}
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Autenticação biométrica</Text>
              <Text style={styles.settingDescription}>
                Usar impressão digital para TODOS os logins e desbloqueios
              </Text>
            </View>
            <Switch
              value={settings.biometricEnabled}
              onValueChange={handleBiometricSettingChange}
              trackColor={{ false: '#3A3A3A', true: '#4ECDC4' }}
              thumbColor={settings.biometricEnabled ? '#fff' : '#666'}
            />
          </View>

          {/* Requer senha no desbloqueio */}
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Requer senha no desbloqueio</Text>
              <Text style={styles.settingDescription}>
                Sempre exigir senha para desbloquear o aplicativo
              </Text>
            </View>
            <Switch
              value={settings.requirePasswordOnLock}
              onValueChange={(value) => handleLockSettingChange('requirePasswordOnLock', value)}
              trackColor={{ false: '#3A3A3A', true: '#4ECDC4' }}
              thumbColor={settings.requirePasswordOnLock ? '#fff' : '#666'}
            />
          </View>
        </View>

        {/* Informações de Segurança */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark" size={24} color="#4ECDC4" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Segurança Ativa</Text>
              <Text style={styles.infoDescription}>
                Seu aplicativo está protegido com bloqueio automático e criptografia AES-256.
              </Text>
            </View>
          </View>
        </View>

        {/* Informações do App */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 Sobre o App</Text>
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>Versão: 1.0.0</Text>
            <Text style={styles.infoText}>Desenvolvido com React Native</Text>
            <Text style={styles.infoText}>Backend: Node.js + PostgreSQL</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sair da Conta</Text>
        </TouchableOpacity>
      </View>

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
});

export default SettingsScreen;
