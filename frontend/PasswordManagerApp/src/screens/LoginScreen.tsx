import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { authService } from '../services/apiSimple';
import { testConnection } from '../services/testConnection';
import { BiometricService } from '../services/biometricService';
import TwoFactorService from '../services/twoFactorService';
import { LoginRequest, ApiError } from '../types/auth';
import { BiometricType } from '../types/biometric';
import { TwoFactorMethod } from '../types/twoFactor';
import { useLocalSettings } from '../hooks/useLocalSettings';

interface LoginScreenProps {
  onLoginSuccess: (tokens: any, userData: any) => void;
  onNavigateToRegister: () => void;
  onNavigateTo2FA?: (method: TwoFactorMethod, onSuccess: (tokens: any) => void) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onNavigateToRegister, onNavigateTo2FA }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  // Usar configurações locais
  const { settings } = useLocalSettings();

  // Verificar suporte biométrico ao carregar a tela e quando email mudar
  React.useEffect(() => {
    // Debounce para evitar muitas verificações
    const timeoutId = setTimeout(() => {
      if (email.trim() && isEmailValidForCheck(email.trim())) {
        checkBiometricSupport();
      } else {
        setBiometricAvailable(false);
      }
    }, 800); // Aumentar debounce para 800ms

    return () => clearTimeout(timeoutId);
  }, [email]);

  // Função para validar email
  const isValidEmail = (email: string): boolean => {
    return /\S+@\S+\.\S+/.test(email);
  };

  // Função para verificar se email é válido para verificação
  const isEmailValidForCheck = (email: string): boolean => {
    return email.length >= 5 && isValidEmail(email);
  };

  const checkBiometricSupport = async () => {
    try {
      const supported = await BiometricService.isBiometricSupported();
      setBiometricSupported(supported);
      
      if (supported && email.trim() && isEmailValidForCheck(email.trim())) {
        // Verificar se o usuário tem biometria habilitada no backend
        try {
          const userBiometricStatus = await BiometricService.checkUserBiometric(email.trim());
          const hasSession = await BiometricService.hasValidBiometricSession();
          
          // Só disponível se usuário tem biometria habilitada no backend E tem sessão válida
          setBiometricAvailable(userBiometricStatus.success && 
                               userBiometricStatus.data?.biometricEnabled && 
                               hasSession);
        } catch (error: any) {
          // Tratar erros específicos sem logar como erro
          if (error.response?.status === 404) {
            // Usuário não encontrado - normal, não é erro
            setBiometricAvailable(false);
          } else if (error.response?.status === 400) {
            // Email inválido - normal durante digitação
            setBiometricAvailable(false);
          } else {
            // Outros erros - logar apenas se for inesperado
            console.warn('Aviso ao verificar biometria:', error.message);
            setBiometricAvailable(false);
          }
        }
      } else {
        setBiometricAvailable(false);
      }
    } catch (error) {
      // Erro geral - apenas logar se for crítico
      console.warn('Erro ao verificar suporte biométrico:', error);
      setBiometricAvailable(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email deve ter um formato válido';
    }

    if (!password.trim()) {
      newErrors.password = 'Senha é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTestConnection = async () => {
    const result = await testConnection();
    Alert.alert('Teste de Conexão', result.message);
  };

  const handleBiometricLogin = async () => {
    if (!biometricSupported || !biometricAvailable) {
      Alert.alert('Biometria Indisponível', 'Autenticação biométrica não está disponível ou configurada.');
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Obter tipos disponíveis e usar o primeiro
      const availableTypes = await BiometricService.getAvailableBiometricTypes();
      const biometricType = availableTypes[0] as BiometricType;

      const result = await BiometricService.authenticateBiometric(biometricType);
      
      console.log('🔧 Resultado do login biométrico:', result);
      
      // Verificar se resposta indica 2FA necessário
      if (result.data?.requires2FA) {
        console.log('🔧 2FA necessário após login biométrico, navegando para verificação...');
        
        if (onNavigateTo2FA) {
          console.log('🔧 Navegando para 2FA com callback (biométrico)');
          onNavigateTo2FA('email', (tokens) => {
            console.log('🔧 Callback 2FA chamado com tokens (biométrico):', tokens);
            console.log('🔧 UserData do login biométrico:', result.data.user);
            onLoginSuccess(tokens, result.data.user);
          });
          return;
        } else {
          Alert.alert('Erro', 'Navegação para 2FA não configurada');
          return;
        }
      }
      
      // Login biométrico normal sem 2FA
      if (result.success && result.data?.tokens && result.data?.user) {
        Alert.alert('Sucesso', 'Login biométrico realizado com sucesso!');
        onLoginSuccess(result.data.tokens, result.data.user);
      }
    } catch (error: any) {
      const apiError = error as ApiError;
      Alert.alert('Erro', apiError.message || 'Erro na autenticação biométrica');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      const loginData: LoginRequest = { email: email.trim(), password };
      const response = await authService.login(loginData);
      
      console.log('🔧 Resposta do login:', response);
      
      // Verificar se resposta indica 2FA necessário
      if (response.data?.requires2FA) {
        console.log('🔧 2FA necessário, navegando para verificação...');
        
        if (onNavigateTo2FA) {
          console.log('🔧 Navegando para 2FA com callback');
          onNavigateTo2FA('email', (tokens) => {
            console.log('🔧 Callback 2FA chamado com tokens:', tokens);
            console.log('🔧 UserData do login:', response.data.user);
            onLoginSuccess(tokens, response.data.user);
          });
          return;
        } else {
          Alert.alert('Erro', 'Navegação para 2FA não configurada');
          return;
        }
      }
      
      // Login normal sem 2FA
      Alert.alert('Sucesso', 'Login realizado com sucesso!');
      onLoginSuccess(response.data.tokens, response.data.user);
    } catch (error) {
      const apiError = error as ApiError;
      
      if (apiError.errors && apiError.errors.length > 0) {
        const fieldErrors: { [key: string]: string } = {};
        apiError.errors.forEach(err => {
          fieldErrors[err.field] = err.message;
        });
        setErrors(fieldErrors);
      } else {
        Alert.alert('Erro', apiError.message || 'Erro ao fazer login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Login</Text>
        
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={email}
              onChangeText={setEmail}
              placeholder="Digite seu email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              value={password}
              onChangeText={setPassword}
              placeholder="Digite sua senha"
              secureTextEntry
              editable={!loading}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Botão de login com senha - sempre disponível */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Entrar com Senha</Text>
            )}
          </TouchableOpacity>

          {/* Botão de biometria - apenas se disponível */}
          {biometricSupported && biometricAvailable && (
            <TouchableOpacity
              style={[styles.biometricButton, loading && styles.buttonDisabled]}
              onPress={handleBiometricLogin}
              disabled={loading}
            >
              <Text style={styles.biometricButtonText}>🔐 Entrar com Biometria</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.linkButton}
            onPress={onNavigateToRegister}
            disabled={loading}
          >
            <Text style={styles.linkText}>Não tem conta? Cadastre-se</Text>
          </TouchableOpacity>

          {/**
           * Botão de teste de conexão (desativado/oculto por padrão)
           *
           * <TouchableOpacity
           *   style={styles.testButton}
           *   onPress={handleTestConnection}
           *   disabled={loading}
           * >
           *   <Text style={styles.testButtonText}>🔧 Testar Conexão</Text>
           * </TouchableOpacity>
           */}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  form: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginTop: 4,
  },
  button: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  biometricButton: {
    backgroundColor: '#9b59b6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  biometricButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  linkText: {
    color: '#3498db',
    fontSize: 14,
  },
  testButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f39c12',
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default LoginScreen;
