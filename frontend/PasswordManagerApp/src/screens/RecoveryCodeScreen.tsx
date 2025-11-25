import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Clipboard
} from 'react-native';
import { useTwoFactor } from '../hooks/useTwoFactor';
import { TwoFactorMethod } from '../types/twoFactor';
import { useTheme } from '../contexts/ThemeContext';

interface RecoveryCodeScreenProps {
  method: TwoFactorMethod;
  onSuccess: (tokens: { accessToken: string; refreshToken: string }) => void;
  onCancel: () => void;
}

const RecoveryCodeScreen: React.FC<RecoveryCodeScreenProps> = ({
  method,
  onSuccess,
  onCancel
}) => {
  const {
    loading,
    error,
    verify2FA,
    clearError
  } = useTwoFactor();
  const { colors } = useTheme();

  const [recoveryCode, setRecoveryCode] = useState('');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (error) {
      Alert.alert('Erro', error);
      clearError();
    }
  }, [error, clearError]);

  const handleRecoveryCode = async () => {
    if (!recoveryCode.trim()) {
      Alert.alert('Erro', 'Código de recuperação é obrigatório');
      return;
    }

    // Validar formato do código de recuperação
    if (!/^[A-Z0-9]{8}$/.test(recoveryCode.toUpperCase())) {
      Alert.alert('Erro', 'Formato de código de recuperação inválido');
      return;
    }

    try {
      // Para códigos de recuperação, usamos o mesmo endpoint de verificação
      // mas com um código especial que o backend reconhece
      const result = await verify2FA(method, recoveryCode.toUpperCase(), false);
      
      if (result.success && result.data?.tokens) {
        Alert.alert(
          'Sucesso',
          'Código de recuperação aceito. Recomendamos reconfigurar o 2FA para maior segurança.',
          [{ text: 'OK', onPress: () => onSuccess(result.data.tokens) }]
        );
      }
    } catch (err: any) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      if (newAttempts >= 3) {
        Alert.alert(
          'Muitas tentativas',
          'Você excedeu o número de tentativas. Entre em contato com o suporte.',
          [{ text: 'OK', onPress: onCancel }]
        );
      } else {
        Alert.alert('Erro', err.message || 'Código de recuperação inválido');
      }
    }
  };

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('Copiado', 'Texto copiado para a área de transferência');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }] }>
      <View style={styles.content}>
        <Text style={styles.icon}>🔑</Text>
        <Text style={[styles.title, { color: colors.text }]}>Código de Recuperação</Text>
        <Text style={[styles.subtitle, { color: colors.mutedText }]}>
          Digite um dos seus códigos de recuperação para acessar sua conta
        </Text>

        <View style={[styles.instructionContainer, { backgroundColor: colors.card }] }>
          <Text style={[styles.instructionTitle, { color: colors.text }]}>Como usar:</Text>
          <Text style={[styles.instructionText, { color: colors.mutedText }] }>
            1. Encontre seus códigos de recuperação salvos
          </Text>
          <Text style={styles.instructionText}>
            2. Digite um código de 8 caracteres
          </Text>
          <Text style={styles.instructionText}>
            3. O código será usado e não poderá ser reutilizado
          </Text>
        </View>

        <TextInput
          style={[styles.codeInput, { backgroundColor: colors.card, borderColor: colors.primary, color: colors.text }]}
          placeholder="ABCD1234"
          value={recoveryCode}
          onChangeText={(text) => setRecoveryCode(text.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8}
          autoFocus
        />

        {attempts > 0 && (
          <Text style={[styles.attemptsText, { color: colors.danger }] }>
            Tentativas: {attempts}/3
          </Text>
        )}

        <TouchableOpacity
          style={[styles.verifyButton, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
          onPress={handleRecoveryCode}
          disabled={loading || recoveryCode.length !== 8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.verifyButtonText}>Usar Código</Text>
          )}
        </TouchableOpacity>

        <View style={[styles.helpContainer, { backgroundColor: colors.card }] }>
          <Text style={[styles.helpTitle, { color: colors.text }]}>Não tem seus códigos?</Text>
          <Text style={[styles.helpText, { color: colors.mutedText }] }>
            Se você perdeu seus códigos de recuperação, entre em contato com o suporte para recuperar o acesso à sua conta.
          </Text>
          <TouchableOpacity 
            style={[styles.supportButton, { backgroundColor: '#03A9F4' }]}
            onPress={() => {
              Alert.alert(
                'Suporte',
                'Entre em contato através do email: suporte@passwordmanager.com',
                [{ text: 'OK' }]
              );
            }}
          >
            <Text style={styles.supportButtonText}>Contatar Suporte</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.card }]} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  content: {
    padding: 20
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
  instructionContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20
  },
  codeInput: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4ECDC4',
    borderRadius: 12,
    padding: 20,
    fontSize: 20,
    textAlign: 'center',
    marginVertical: 20,
    letterSpacing: 2,
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
  helpContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginVertical: 20
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15
  },
  supportButton: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  supportButtonText: {
    color: '#fff',
    fontSize: 14,
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
  }
});

export default RecoveryCodeScreen;
