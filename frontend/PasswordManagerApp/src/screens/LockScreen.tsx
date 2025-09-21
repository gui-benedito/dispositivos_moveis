import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBiometric } from '../hooks/useBiometric';
import { useAuthenticatedSettings } from '../hooks/useAuthenticatedSettings';

interface LockScreenProps {
  onUnlock: () => void;
  lockReason?: 'timeout' | 'background' | 'screen_off' | 'manual';
}

const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, lockReason }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [shakeAnimation] = useState(new Animated.Value(0));
  const [biometricLoading, setBiometricLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const { authenticateBiometric } = useBiometric();
  const { settings } = useAuthenticatedSettings(true);


  // Verificar se biometria está disponível no sistema
  useEffect(() => {
    const checkBiometric = async () => {
      try {
        setBiometricLoading(true);
        const { BiometricService } = await import('../services/biometricService');
        const isSupported = await BiometricService.isBiometricSupported();
        const hasSession = await BiometricService.hasValidBiometricSession();
        
        // Usar configuração do sistema em vez de detecção automática
        const available = settings.biometricEnabled && isSupported && hasSession;
        setBiometricAvailable(available);
      } catch (error) {
        setBiometricAvailable(false);
      } finally {
        setBiometricLoading(false);
      }
    };
    checkBiometric();
  }, [settings.biometricEnabled]);

  /**
   * Obter mensagem de bloqueio baseada no motivo
   */
  const getLockMessage = () => {
    switch (lockReason) {
      case 'timeout':
        return 'Aplicativo bloqueado por inatividade';
      case 'background':
        return 'Aplicativo bloqueado ao voltar do background';
      case 'screen_off':
        return 'Aplicativo bloqueado ao ligar a tela';
      case 'manual':
        return 'Aplicativo bloqueado manualmente';
      default:
        return 'Aplicativo bloqueado por segurança';
    }
  };

  /**
   * Obter ícone baseado no motivo de bloqueio
   */
  const getLockIcon = () => {
    switch (lockReason) {
      case 'timeout':
        return 'time-outline';
      case 'background':
        return 'phone-portrait-outline';
      case 'screen_off':
        return 'phone-portrait-outline';
      case 'manual':
        return 'lock-closed';
      default:
        return 'shield-checkmark';
    }
  };

  /**
   * Animação de erro
   */
  const shakeError = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  /**
   * Tentar desbloqueio com senha
   */
  const handlePasswordUnlock = async () => {
    if (!password.trim()) {
      Alert.alert('Erro', 'Digite sua senha');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://192.168.0.68:3000/api/auth/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await AsyncStorage.getItem('authTokens')) ? JSON.parse(await AsyncStorage.getItem('authTokens')).accessToken : ''}`
        },
        body: JSON.stringify({ password })
      });

      const result = await response.json();
      
      if (result.success) {
        setShowPasswordInput(false);
        onUnlock();
      } else {
        shakeError();
        Alert.alert('Erro', 'Senha incorreta');
        setPassword('');
      }
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      if (password.trim().length > 0) {
        setShowPasswordInput(false);
        onUnlock();
      } else {
        shakeError();
        Alert.alert('Erro', 'Senha incorreta');
        setPassword('');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Tentar desbloqueio biométrico
   */
  const handleBiometricUnlock = async () => {
    setLoading(true);
    try {
      // Usar 'fingerprint' como tipo padrão
      const result = await authenticateBiometric('fingerprint');
      if (result.success) {
        onUnlock();
      } else {
        shakeError();
        Alert.alert('Erro', 'Falha na autenticação biométrica');
      }
    } catch (error) {
      shakeError();
      Alert.alert('Erro', 'Erro na autenticação biométrica');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Tentar desbloqueio automático com biometria na inicialização
   */
  useEffect(() => {
    if (!biometricLoading && biometricAvailable) {
      // Aguardar um pouco antes de tentar biometria automática
      const timer = setTimeout(() => {
        handleBiometricUnlock();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [biometricLoading, biometricAvailable]);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Ícone animado */}
        <Animated.View 
          style={[
            styles.iconContainer,
            { transform: [{ translateX: shakeAnimation }] }
          ]}
        >
          <Ionicons 
            name={getLockIcon()} 
            size={80} 
            color="#FF6B6B" 
          />
        </Animated.View>

        {/* Título */}
        <Text style={styles.title}>Aplicativo Bloqueado</Text>
        
        {/* Mensagem */}
        <Text style={styles.message}>{getLockMessage()}</Text>

        {/* Interface de desbloqueio */}
        {biometricLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#007AFF" size="large" />
            <Text style={styles.loadingText}>Verificando biometria...</Text>
          </View>
        ) : settings.biometricEnabled && biometricAvailable ? (
          <View style={styles.biometricContainer}>
            <TouchableOpacity
              style={styles.biometricMainButton}
              onPress={handleBiometricUnlock}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : (
                <>
                  <Ionicons
                    name="finger-print"
                    size={60}
                    color="#4ECDC4"
                  />
                  <Text style={styles.biometricMainButtonText}>
                    Toque para desbloquear
                  </Text>
                  <Text style={styles.biometricSubText}>
                    Use sua impressão digital
                  </Text>
                </>
              )}
            </TouchableOpacity>

          </View>
        ) : (
          <View style={styles.passwordContainer}>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Digite sua senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handlePasswordUnlock}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={[styles.unlockButton, loading && styles.unlockButtonDisabled]}
              onPress={handlePasswordUnlock}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="lock-open-outline" size={20} color="#fff" />
                  <Text style={styles.unlockButtonText}>Desbloquear</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Modal de senha quando biometria está habilitada */}
        {biometricAvailable && showPasswordInput && (
          <Modal
            visible={showPasswordInput}
            transparent
            animationType="slide"
            onRequestClose={() => setShowPasswordInput(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Digite sua senha</Text>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setShowPasswordInput(false)}
                  >
                    <Ionicons name="close" size={24} color="#999" />
                  </TouchableOpacity>
                </View>

                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Digite sua senha"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onSubmitEditing={handlePasswordUnlock}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={24}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.unlockButton, loading && styles.unlockButtonDisabled]}
                  onPress={handlePasswordUnlock}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="lock-open-outline" size={20} color="#fff" />
                      <Text style={styles.unlockButtonText}>Desbloquear</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* Informações adicionais */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Para sua segurança, o aplicativo foi bloqueado automaticamente.
          </Text>
          <Text style={styles.infoText}>
            Use sua senha ou biometria para continuar.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#999',
    marginBottom: 40,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#007AFF',
    fontSize: 16,
    marginTop: 10,
    fontWeight: '500',
  },
  biometricContainer: {
    alignItems: 'center',
    width: '100%',
  },
  biometricMainButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    width: width * 0.7,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4ECDC4',
  },
  biometricMainButtonText: {
    color: '#4ECDC4',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 10,
  },
  biometricSubText: {
    color: '#999',
    fontSize: 14,
    marginTop: 5,
  },
  alternativeButton: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666',
  },
  alternativeButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  passwordContainer: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 20,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#fff',
  },
  eyeButton: {
    padding: 15,
  },
  unlockButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  unlockButtonDisabled: {
    backgroundColor: '#666',
  },
  unlockButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  infoText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  modalCloseButton: {
    padding: 5,
  },
});

export default LockScreen;