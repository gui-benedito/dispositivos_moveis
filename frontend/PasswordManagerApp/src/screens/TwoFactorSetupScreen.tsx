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
  Image,
  Clipboard
} from 'react-native';
import { useTwoFactor } from '../hooks/useTwoFactor';
import { TwoFactorMethod } from '../types/twoFactor';
import { useTheme } from '../contexts/ThemeContext';
// Removido QRCode - usando apenas app autenticador ou SMS

interface TwoFactorSetupScreenProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const TwoFactorSetupScreen: React.FC<TwoFactorSetupScreenProps> = ({
  onSuccess,
  onCancel
}) => {
  const {
    loading,
    error,
    setup2FA,
    verify2FA,
    validateCode,
    validatePhoneNumber,
    formatPhoneNumber,
    clearError
  } = useTwoFactor();
  const { colors } = useTheme();

  const [step, setStep] = useState<'method' | 'setup' | 'verify'>('setup');
  const [selectedMethod, setSelectedMethod] = useState<TwoFactorMethod>('email');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [setupData, setSetupData] = useState<any>(null);

  useEffect(() => {
    if (error) {
      Alert.alert('Erro', error);
      clearError();
    }
  }, [error, clearError]);


  const handleSetup = async () => {
    try {
      const result = await setup2FA(selectedMethod);
      
      if (result.success) {
        setSetupData(result.data);
        setStep('verify');
      }
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Erro ao configurar 2FA');
    }
  };

  const handleVerification = async () => {
    if (!verificationCode.trim()) {
      Alert.alert('Erro', 'Código de verificação é obrigatório');
      return;
    }

    console.log('🔧 Validando código:', verificationCode);
    console.log('🔧 Método selecionado:', selectedMethod);
    console.log('🔧 Resultado da validação:', validateCode(verificationCode, selectedMethod));
    
    // Bypass temporário para email
    if (selectedMethod === 'email' && verificationCode.length === 6 && /^\d{6}$/.test(verificationCode)) {
      console.log('🔧 Bypass para email - código válido');
    } else if (!validateCode(verificationCode, selectedMethod)) {
      Alert.alert('Erro', 'Formato de código inválido');
      return;
    }

    try {
      const result = await verify2FA(selectedMethod, verificationCode, true);
      
      if (result.success) {
        Alert.alert(
          'Sucesso',
          '2FA configurado com sucesso!',
          [{ text: 'OK', onPress: onSuccess }]
        );
      }
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Erro ao verificar código');
    }
  };

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('Copiado', 'Texto copiado para a área de transferência');
  };


  const renderSetup = () => (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }] }>
      <Text style={[styles.title, { color: colors.text }] }>
        Configurar Email
      </Text>


      {selectedMethod === 'email' && (
        <View style={styles.emailSetup}>
          <Text style={[styles.instructionText, { color: colors.mutedText }] }>
            Códigos de verificação serão enviados para seu email
          </Text>

          {setupData?.email && (
            <View style={styles.emailConfirmation}>
              <Text style={[styles.emailConfirmationText, { color: colors.mutedText }] }>
                📧 Códigos serão enviados para: {setupData.email}
              </Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.continueButton, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
        onPress={handleSetup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.continueButtonText}>Continuar</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.card }]} onPress={onCancel}>
        <Text style={styles.backButtonText}>Cancelar</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderVerification = () => (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Verificar Código</Text>
      <Text style={[styles.subtitle, { color: colors.mutedText }]}>
        Digite o código de 6 dígitos do seu Email
      </Text>

      <TextInput
        style={[styles.codeInput, { backgroundColor: colors.card, borderColor: colors.primary, color: colors.text }]}
        placeholder="000000"
        value={verificationCode}
        onChangeText={setVerificationCode}
        keyboardType="numeric"
        maxLength={6}
        autoFocus
      />

      <TouchableOpacity
        style={[styles.verifyButton, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
        onPress={handleVerification}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.verifyButtonText}>Verificar e Ativar</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.card }]} onPress={() => setStep('setup')}>
        <Text style={styles.backButtonText}>Voltar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {step === 'setup' && renderSetup()}
      {step === 'verify' && renderVerification()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5'
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
    marginBottom: 30
  },
  methodContainer: {
    marginBottom: 30
  },
  methodButton: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#e0e0e0'
  },
  totpButton: {
    borderColor: '#4ECDC4'
  },
  smsButton: {
    borderColor: '#3498db'
  },
  methodIcon: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 10
  },
  methodTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5
  },
  methodDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  instructionText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
    lineHeight: 24
  },
  appsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginVertical: 15
  },
  appsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  appText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5
  },
  secretContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginVertical: 15
  },
  secretLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  secretButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  secretText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#333',
    flex: 1
  },
  copyText: {
    fontSize: 12,
    color: '#4ECDC4',
    fontWeight: 'bold'
  },
  recoveryContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginVertical: 15
  },
  recoveryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  recoveryDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20
  },
  recoveryCodesContainer: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 6,
    marginBottom: 15
  },
  recoveryCode: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#333',
    marginBottom: 5
  },
  copyRecoveryButton: {
    backgroundColor: '#4ECDC4',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center'
  },
  copyRecoveryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  phoneInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginVertical: 15
  },
  phoneConfirmation: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 8,
    marginVertical: 15
  },
  phoneConfirmationText: {
    fontSize: 14,
    color: '#2e7d32',
    textAlign: 'center'
  },
  codeInput: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4ECDC4',
    borderRadius: 8,
    padding: 15,
    fontSize: 24,
    textAlign: 'center',
    marginVertical: 20,
    letterSpacing: 4
  },
  continueButton: {
    backgroundColor: '#4ECDC4',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 15
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  verifyButton: {
    backgroundColor: '#4ECDC4',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 15
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  backButton: {
    backgroundColor: '#95a5a6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  buttonDisabled: {
    opacity: 0.6
  }
});

export default TwoFactorSetupScreen;
