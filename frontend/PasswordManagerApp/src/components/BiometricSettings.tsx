import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useBiometric } from '../hooks/useBiometric';
import { BiometricType } from '../types/biometric';

interface BiometricSettingsProps {
  onAuthSuccess?: (tokens: any, userData: any) => void;
}

const BiometricSettings: React.FC<BiometricSettingsProps> = ({ onAuthSuccess }) => {
  const {
    isSupported,
    availableTypes,
    status,
    loading,
    error,
    enableBiometric,
    disableBiometric,
    authenticateBiometric,
    getBiometricStatus
  } = useBiometric();

  const [isEnabled, setIsEnabled] = useState(false);
  const [selectedType, setSelectedType] = useState<BiometricType | null>(null);

  useEffect(() => {
    if (status) {
      setIsEnabled(status.biometricEnabled);
      setSelectedType(status.biometricType);
    }
  }, [status]);

  useEffect(() => {
    // Carregar status inicial
    getBiometricStatus();
  }, []);

  const handleToggleBiometric = async (value: boolean) => {
    if (value) {
      // Ativar biometria
      if (!selectedType) {
        Alert.alert('Erro', 'Selecione um tipo de biometria primeiro');
        return;
      }

      try {
        const result = await enableBiometric(selectedType);
        if (result.success) {
          setIsEnabled(true);
          Alert.alert('Sucesso', 'Autenticação biométrica ativada com sucesso!');
        }
      } catch (error: any) {
        Alert.alert('Erro', error.message || 'Erro ao ativar biometria');
      }
    } else {
      // Desativar biometria
      Alert.alert(
        'Desativar Biometria',
        'Tem certeza que deseja desativar a autenticação biométrica?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desativar',
            style: 'destructive',
            onPress: async () => {
              try {
                const result = await disableBiometric();
                if (result.success) {
                  setIsEnabled(false);
                  setSelectedType(null);
                  Alert.alert('Sucesso', 'Autenticação biométrica desativada');
                }
              } catch (error: any) {
                Alert.alert('Erro', error.message || 'Erro ao desativar biometria');
              }
            }
          }
        ]
      );
    }
  };

  const handleTestBiometric = async () => {
    if (!selectedType) {
      Alert.alert('Erro', 'Selecione um tipo de biometria primeiro');
      return;
    }

    try {
      const result = await authenticateBiometric(selectedType);
      if (result.success && onAuthSuccess) {
        onAuthSuccess(result.data?.tokens, result.data?.user);
        Alert.alert('Sucesso', 'Autenticação biométrica realizada com sucesso!');
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro na autenticação biométrica');
    }
  };

  const getBiometricTypeLabel = (type: BiometricType): string => {
    switch (type) {
      case 'fingerprint':
        return 'Impressão Digital';
      default:
        return type;
    }
  };

  if (loading && !status) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Verificando suporte biométrico...</Text>
      </View>
    );
  }

  if (!isSupported) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Autenticação Biométrica</Text>
        <View style={styles.notSupportedContainer}>
          <Text style={styles.notSupportedText}>
            Seu dispositivo não suporta autenticação biométrica ou não há biometria configurada.
          </Text>
          <Text style={styles.notSupportedSubtext}>
            Configure uma impressão digital ou reconhecimento facial nas configurações do seu dispositivo.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Autenticação Biométrica</Text>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tipos Disponíveis</Text>
        {availableTypes.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeButton,
              selectedType === type && styles.typeButtonSelected
            ]}
            onPress={() => setSelectedType(type)}
            disabled={isEnabled}
          >
            <Text style={[
              styles.typeButtonText,
              selectedType === type && styles.typeButtonTextSelected
            ]}>
              {getBiometricTypeLabel(type)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Ativar Biometria</Text>
          <Switch
            value={isEnabled}
            onValueChange={handleToggleBiometric}
            disabled={loading || !selectedType}
            trackColor={{ false: '#bdc3c7', true: '#3498db' }}
            thumbColor={isEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      {isEnabled && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestBiometric}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.testButtonText}>🧪 Testar Biometria</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {status && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>Status Atual</Text>
          <Text style={styles.statusText}>
            Tipo: {status.biometricType ? getBiometricTypeLabel(status.biometricType) : 'Não configurado'}
          </Text>
          <Text style={styles.statusText}>
            Último uso: {status.biometricLastUsed ? new Date(status.biometricLastUsed).toLocaleString() : 'Nunca'}
          </Text>
          <Text style={styles.statusText}>
            Sessões ativas: {status.activeSessions}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 10,
    color: '#666',
  },
  notSupportedContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  notSupportedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  notSupportedSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  errorText: {
    color: '#721c24',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  typeButton: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  typeButtonSelected: {
    borderColor: '#3498db',
    backgroundColor: '#e3f2fd',
  },
  typeButtonText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  typeButtonTextSelected: {
    color: '#3498db',
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 16,
    color: '#333',
  },
  testButton: {
    backgroundColor: '#27ae60',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
});

export default BiometricSettings;
