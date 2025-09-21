import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  Modal,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthenticatedSettings } from '../hooks/useAuthenticatedSettings';
import { LOCK_TIMEOUT_OPTIONS } from '../types/settings';

interface SecuritySettingsProps {
  onNavigateBack?: () => void;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({ onNavigateBack }) => {
  const { settings, updateSettings, loading } = useAuthenticatedSettings(true); // SecuritySettings só aparece quando autenticado
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);

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
        <TouchableOpacity
          style={styles.backButton}
          onPress={onNavigateBack}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurações de Segurança</Text>
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

          {/* Biometria */}
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Autenticação biométrica</Text>
          <Text style={styles.settingDescription}>
            Usar impressão digital
          </Text>
            </View>
            <Switch
              value={settings.biometricEnabled}
              onValueChange={(value) => handleLockSettingChange('biometricEnabled', value)}
              trackColor={{ false: '#3A3A3A', true: '#4ECDC4' }}
              thumbColor={settings.biometricEnabled ? '#fff' : '#666'}
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
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
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

export default SecuritySettings;
