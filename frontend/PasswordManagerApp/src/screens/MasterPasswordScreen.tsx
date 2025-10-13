import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface MasterPasswordScreenProps {
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
}

const MasterPasswordScreen: React.FC<MasterPasswordScreenProps> = ({
  onSuccess,
  onCancel,
  title = "Senha Mestra",
  message = "Digite sua senha mestra para acessar esta nota segura"
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shakeAnimation] = useState(new Animated.Value(0));
  
  const passwordInputRef = useRef<TextInput>(null);

  /**
   * Verificar senha mestra
   */
  const handleVerifyPassword = async () => {
    if (!password.trim()) {
      Alert.alert('Erro', 'Digite sua senha mestra');
      return;
    }

    setIsLoading(true);

    try {
      // Simular verificação da senha mestra
      // Em um app real, isso seria verificado com o backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Por enquanto, aceitar qualquer senha não vazia
      // TODO: Implementar verificação real com backend
      if (password.trim().length >= 4) {
        console.log('✅ Senha mestra verificada com sucesso');
        onSuccess();
      } else {
        throw new Error('Senha mestra incorreta');
      }
    } catch (error) {
      console.error('❌ Erro ao verificar senha mestra:', error);
      
      // Animação de erro
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

      Alert.alert('Erro', 'Senha mestra incorreta. Tente novamente.');
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Alternar visibilidade da senha
   */
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onCancel}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Acesso Seguro</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Conteúdo */}
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={64} color="#4ECDC4" />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <Animated.View 
            style={[
              styles.passwordContainer,
              { transform: [{ translateX: shakeAnimation }] }
            ]}
          >
            <View style={styles.inputContainer}>
              <Ionicons 
                name="lock-closed" 
                size={20} 
                color="#666" 
                style={styles.inputIcon} 
              />
              <TextInput
                ref={passwordInputRef}
                style={styles.passwordInput}
                placeholder="Digite sua senha mestra"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleVerifyPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={togglePasswordVisibility}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
          </Animated.View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.cancelButton, isLoading && styles.buttonDisabled]}
              onPress={onCancel}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.verifyButton,
                (!password.trim() || isLoading) && styles.buttonDisabled
              ]}
              onPress={handleVerifyPassword}
              disabled={!password.trim() || isLoading}
            >
              {isLoading ? (
                <Text style={styles.verifyButtonText}>Verificando...</Text>
              ) : (
                <Text style={styles.verifyButtonText}>Verificar</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.securityInfo}>
            <Ionicons name="information-circle" size={16} color="#666" />
            <Text style={styles.securityInfoText}>
              Sua senha mestra é usada para proteger notas seguras
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  passwordContainer: {
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 16,
  },
  eyeButton: {
    padding: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#e9ecef',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
  },
  verifyButton: {
    flex: 1,
    backgroundColor: '#4ECDC4',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginLeft: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityInfoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    textAlign: 'center',
  },
});

export default MasterPasswordScreen;
