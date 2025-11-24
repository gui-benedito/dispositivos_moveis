import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useTwoFactor } from '../hooks/useTwoFactor';
import { TwoFactorMethod } from '../types/twoFactor';

interface TwoFactorVerificationScreenProps {
  method: TwoFactorMethod;
  onSuccess: (tokens: { accessToken: string; refreshToken: string }) => void;
  onCancel: () => void;
  onUseRecoveryCode: () => void;
}

const TwoFactorVerificationScreen: React.FC<TwoFactorVerificationScreenProps> = ({
  method,
  onSuccess,
  onCancel,
  onUseRecoveryCode
}) => {
  const {
    loading,
    error,
    verify2FA,
    validateCode,
    clearError
  } = useTwoFactor();

  const [code, setCode] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTime, setLockTime] = useState(0);

  useEffect(() => {
    if (error) {
      if (error.includes('bloqueado') || error.includes('lock')) {
        setIsLocked(true);
        setLockTime(15 * 60); // 15 minutos
      } else {
        Alert.alert('Erro', error);
      }
      clearError();
    }
  }, [error, clearError]);

  useEffect(() => {
    if (isLocked && lockTime > 0) {
      const timer = setTimeout(() => {
        setLockTime(lockTime - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (lockTime === 0 && isLocked) {
      setIsLocked(false);
    }
  }, [isLocked, lockTime]);

  const handleVerification = async () => {
    if (!code.trim()) {
      Alert.alert('Erro', 'Código de verificação é obrigatório');
      return;
    }

    if (!validateCode(code, method)) {
      Alert.alert('Erro', 'Formato de código inválido');
      return;
    }

    try {
      const result = await verify2FA(method, code, false);
      
      console.log('🔧 Resultado da verificação 2FA:', result);
      
      if (result.success && result.data?.tokens) {
        console.log('🔧 Tokens recebidos, chamando onSuccess');
        onSuccess(result.data.tokens);
      } else {
        console.log('🔧 Resultado sem tokens:', result);
        Alert.alert('Erro', 'Código inválido');
      }
    } catch (err: any) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      if (newAttempts >= 3) {
        Alert.alert(
          'Muitas tentativas',
          'Você excedeu o número de tentativas. Use um código de recuperação ou tente novamente mais tarde.',
          [
            { text: 'Código de Recuperação', onPress: onUseRecoveryCode },
            { text: 'Cancelar', onPress: onCancel, style: 'cancel' }
          ]
        );
      } else {
        Alert.alert('Erro', err.message || 'Código inválido');
      }
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getMethodLabel = () => {
    switch (method) {
      case 'totp':
        return 'aplicativo autenticador';
      case 'sms':
        return 'SMS';
      case 'email':
        return 'Email';
      default:
        return '2FA';
    }
  };

  const getMethodIcon = () => {
    switch (method) {
      case 'totp':
        return '📱';
      case 'sms':
        return '📱';
      case 'email':
        return '📧';
      default:
        return '🔐';
    }
  };

  if (isLocked) {
    return (
      <View style={styles.container}>
        <View style={styles.lockedContainer}>
          <Text style={styles.lockedIcon}>🔒</Text>
          <Text style={styles.lockedTitle}>2FA Temporariamente Bloqueado</Text>
          <Text style={styles.lockedDescription}>
            Muitas tentativas falhadas. Tente novamente em:
          </Text>
          <Text style={styles.lockedTimer}>{formatTime(lockTime)}</Text>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Voltar ao Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>{getMethodIcon()}</Text>
        <Text style={styles.title}>Verificação em Dois Fatores</Text>
        <Text style={styles.subtitle}>
          Digite o código de 6 dígitos enviado para seu {getMethodLabel()}
        </Text>

        <TextInput
          style={styles.codeInput}
          placeholder="000000"
          value={code}
          onChangeText={setCode}
          keyboardType="numeric"
          maxLength={6}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
        />

        {attempts > 0 && (
          <Text style={styles.attemptsText}>
            Tentativas: {attempts}/3
          </Text>
        )}

        <TouchableOpacity
          style={[styles.verifyButton, loading && styles.buttonDisabled]}
          onPress={handleVerification}
          disabled={loading || code.length !== 6}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.verifyButtonText}>Verificar</Text>
          )}
        </TouchableOpacity>

        {/* <TouchableOpacity 
          style={styles.recoveryButton} 
          onPress={onUseRecoveryCode}
        >
          <Text style={styles.recoveryButtonText}>
            Usar código de recuperação
          </Text>
        </TouchableOpacity> */}

        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center'
  },
  icon: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24
  },
  codeInput: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4ECDC4',
    borderRadius: 12,
    padding: 20,
    fontSize: 24,
    textAlign: 'center',
    marginVertical: 20,
    letterSpacing: 4,
    fontFamily: 'monospace'
  },
  attemptsText: {
    fontSize: 14,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 10
  },
  verifyButton: {
    backgroundColor: '#4ECDC4',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 15
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  recoveryButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10
  },
  recoveryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  buttonDisabled: {
    opacity: 0.6
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  lockedIcon: {
    fontSize: 64,
    marginBottom: 20
  },
  lockedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 15
  },
  lockedDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24
  },
  lockedTimer: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: 'monospace'
  }
});

export default TwoFactorVerificationScreen;
