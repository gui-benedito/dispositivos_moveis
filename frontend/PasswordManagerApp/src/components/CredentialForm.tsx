import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useCredentialForm, usePasswordGenerator } from '../hooks/useCredentials';
import { CredentialService } from '../services/credentialService';
import {
  CreateCredentialRequest,
  UpdateCredentialRequest,
  DEFAULT_CATEGORIES,
  PASSWORD_STRENGTH_COLORS,
  PASSWORD_STRENGTH_ICONS
} from '../types/credential';

interface CredentialFormProps {
  initialData?: Partial<CreateCredentialRequest>;
  onSave: (data: CreateCredentialRequest | UpdateCredentialRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  title?: string;
}

const CredentialForm: React.FC<CredentialFormProps> = ({
  initialData,
  onSave,
  onCancel,
  loading = false,
  title = 'Nova Credencial'
}) => {
  const {
    formData,
    errors,
    touched,
    isValid,
    updateField,
    touchField,
    validateForm,
    resetForm
  } = useCredentialForm(initialData);

  const {
    generatedPassword,
    passwordStrength,
    generatePassword,
    analyzePassword,
    clearGeneratedPassword,
    loading: generatorLoading
  } = usePasswordGenerator();

  const [showPassword, setShowPassword] = useState(false);
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false);
  const [generatorOptions, setGeneratorOptions] = useState({
    length: 16,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeSimilar: true
  });

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Erro', 'Por favor, corrija os erros no formulário');
      return;
    }

    try {
      await onSave(formData);
      resetForm();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao salvar credencial');
    }
  };

  const handleGeneratePassword = async () => {
    try {
      await generatePassword(generatorOptions);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao gerar senha');
    }
  };

  const handleUseGeneratedPassword = () => {
    updateField('password', generatedPassword);
    setShowPasswordGenerator(false);
    clearGeneratedPassword();
  };

  const handlePasswordChange = async (password: string) => {
    updateField('password', password);
    
    if (password.length > 0) {
      try {
        await analyzePassword(password);
      } catch (error) {
        // Ignorar erros de análise de senha
      }
    }
  };

  const getPasswordStrengthColor = () => {
    if (!passwordStrength) return '#bdc3c7';
    return PASSWORD_STRENGTH_COLORS[passwordStrength.strength] || '#bdc3c7';
  };

  const getPasswordStrengthIcon = () => {
    if (!passwordStrength) return '⚪';
    return PASSWORD_STRENGTH_ICONS[passwordStrength.strength] || '⚪';
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>

        <View style={styles.form}>
          {/* Título */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Título *</Text>
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              value={formData.title}
              onChangeText={(value) => updateField('title', value)}
              onBlur={() => touchField('title')}
              placeholder="Ex: Gmail, Facebook, Banco..."
              editable={!loading}
            />
            {errors.title && touched.title && (
              <Text style={styles.errorText}>{errors.title}</Text>
            )}
          </View>

          {/* Descrição */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.description && styles.inputError]}
              value={formData.description}
              onChangeText={(value) => updateField('description', value)}
              onBlur={() => touchField('description')}
              placeholder="Descrição opcional da credencial"
              multiline
              numberOfLines={3}
              editable={!loading}
            />
            {errors.description && touched.description && (
              <Text style={styles.errorText}>{errors.description}</Text>
            )}
          </View>

          {/* Categoria */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Categoria *</Text>
            <TextInput
              style={[styles.input, errors.category && styles.inputError]}
              value={formData.category}
              onChangeText={(value) => updateField('category', value)}
              onBlur={() => touchField('category')}
              placeholder="Ex: Redes Sociais, E-mail..."
              editable={!loading}
            />
            {errors.category && touched.category && (
              <Text style={styles.errorText}>{errors.category}</Text>
            )}
          </View>

          {/* Username */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nome de usuário</Text>
            <TextInput
              style={[styles.input, errors.username && styles.inputError]}
              value={formData.username}
              onChangeText={(value) => updateField('username', value)}
              onBlur={() => touchField('username')}
              placeholder="Seu nome de usuário"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            {errors.username && touched.username && (
              <Text style={styles.errorText}>{errors.username}</Text>
            )}
          </View>

          {/* Senha */}
          <View style={styles.inputContainer}>
            <View style={styles.passwordHeader}>
              <Text style={styles.label}>Senha *</Text>
              <TouchableOpacity
                style={styles.generateButton}
                onPress={() => setShowPasswordGenerator(!showPasswordGenerator)}
                disabled={loading}
              >
                <Text style={styles.generateButtonText}>🎲 Gerar</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                value={formData.password}
                onChangeText={handlePasswordChange}
                onBlur={() => touchField('password')}
                placeholder="Sua senha"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <Text style={styles.toggleButtonText}>
                  {showPassword ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Indicador de força da senha */}
            {passwordStrength && formData.password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBar}>
                  <View 
                    style={[
                      styles.strengthFill, 
                      { 
                        width: `${(passwordStrength.score / 8) * 100}%`,
                        backgroundColor: getPasswordStrengthColor()
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.strengthText, { color: getPasswordStrengthColor() }]}>
                  {getPasswordStrengthIcon()} {passwordStrength.strength}
                </Text>
              </View>
            )}

            {errors.password && touched.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>

          {/* Gerador de senha */}
          {showPasswordGenerator && (
            <View style={styles.generatorContainer}>
              <Text style={styles.generatorTitle}>Gerador de Senha</Text>
              
              {/* Opções do gerador */}
              <View style={styles.generatorOptions}>
                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Comprimento: {generatorOptions.length}</Text>
                  <View style={styles.sliderContainer}>
                    <TouchableOpacity
                      style={styles.sliderButton}
                      onPress={() => setGeneratorOptions(prev => ({ ...prev, length: Math.max(4, prev.length - 1) }))}
                    >
                      <Text style={styles.sliderButtonText}>-</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.sliderButton}
                      onPress={() => setGeneratorOptions(prev => ({ ...prev, length: Math.min(128, prev.length + 1) }))}
                    >
                      <Text style={styles.sliderButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.checkboxRow}>
                  <Text style={styles.checkboxLabel}>Maiúsculas</Text>
                  <Switch
                    value={generatorOptions.includeUppercase}
                    onValueChange={(value) => setGeneratorOptions(prev => ({ ...prev, includeUppercase: value }))}
                  />
                </View>

                <View style={styles.checkboxRow}>
                  <Text style={styles.checkboxLabel}>Minúsculas</Text>
                  <Switch
                    value={generatorOptions.includeLowercase}
                    onValueChange={(value) => setGeneratorOptions(prev => ({ ...prev, includeLowercase: value }))}
                  />
                </View>

                <View style={styles.checkboxRow}>
                  <Text style={styles.checkboxLabel}>Números</Text>
                  <Switch
                    value={generatorOptions.includeNumbers}
                    onValueChange={(value) => setGeneratorOptions(prev => ({ ...prev, includeNumbers: value }))}
                  />
                </View>

                <View style={styles.checkboxRow}>
                  <Text style={styles.checkboxLabel}>Símbolos</Text>
                  <Switch
                    value={generatorOptions.includeSymbols}
                    onValueChange={(value) => setGeneratorOptions(prev => ({ ...prev, includeSymbols: value }))}
                  />
                </View>
              </View>

              {/* Botões do gerador */}
              <View style={styles.generatorButtons}>
                <TouchableOpacity
                  style={styles.generateActionButton}
                  onPress={handleGeneratePassword}
                  disabled={loading || generatorLoading}
                >
                  {generatorLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.generateActionButtonText}>Gerar Senha</Text>
                  )}
                </TouchableOpacity>

                {generatedPassword && (
                  <TouchableOpacity
                    style={styles.useButton}
                    onPress={handleUseGeneratedPassword}
                    disabled={loading}
                  >
                    <Text style={styles.useButtonText}>Usar Senha</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Senha gerada */}
              {generatedPassword && (
                <View style={styles.generatedPasswordContainer}>
                  <Text style={styles.generatedPasswordLabel}>Senha gerada:</Text>
                  <Text style={styles.generatedPassword}>{generatedPassword}</Text>
                </View>
              )}
            </View>
          )}

          {/* URL */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>URL</Text>
            <TextInput
              style={[styles.input, errors.url && styles.inputError]}
              value={formData.url}
              onChangeText={(value) => updateField('url', value)}
              onBlur={() => touchField('url')}
              placeholder="https://exemplo.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!loading}
            />
            {errors.url && touched.url && (
              <Text style={styles.errorText}>{errors.url}</Text>
            )}
          </View>

          {/* Notas */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Notas</Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.notes && styles.inputError]}
              value={formData.notes}
              onChangeText={(value) => updateField('notes', value)}
              onBlur={() => touchField('notes')}
              placeholder="Notas adicionais..."
              multiline
              numberOfLines={3}
              editable={!loading}
            />
            {errors.notes && touched.notes && (
              <Text style={styles.errorText}>{errors.notes}</Text>
            )}
          </View>

          {/* Senha mestre */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Senha Mestre *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, errors.masterPassword && styles.inputError]}
                value={formData.masterPassword}
                onChangeText={(value) => updateField('masterPassword', value)}
                onBlur={() => touchField('masterPassword')}
                placeholder="Sua senha mestre"
                secureTextEntry={!showMasterPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setShowMasterPassword(!showMasterPassword)}
                disabled={loading}
              >
                <Text style={styles.toggleButtonText}>
                  {showMasterPassword ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>
            {errors.masterPassword && touched.masterPassword && (
              <Text style={styles.errorText}>{errors.masterPassword}</Text>
            )}
          </View>

          {/* Favorito */}
          <View style={styles.inputContainer}>
            <View style={styles.favoriteContainer}>
              <Text style={styles.label}>Marcar como favorito</Text>
              <Switch
                value={formData.isFavorite}
                onValueChange={(value) => updateField('isFavorite', value)}
                disabled={loading}
                trackColor={{ false: '#bdc3c7', true: '#3498db' }}
                thumbColor={formData.isFavorite ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Botões */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton, (!isValid || loading) && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={!isValid || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Salvar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#3498db',
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  form: {
    backgroundColor: '#fff',
    margin: 20,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginTop: 4,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  generateButton: {
    backgroundColor: '#9b59b6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    marginRight: 8,
  },
  toggleButton: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  toggleButtonText: {
    fontSize: 16,
  },
  strengthContainer: {
    marginTop: 8,
  },
  strengthBar: {
    height: 4,
    backgroundColor: '#ecf0f1',
    borderRadius: 2,
    marginBottom: 4,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  generatorContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  generatorTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  generatorOptions: {
    marginBottom: 15,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  optionLabel: {
    fontSize: 14,
    color: '#333',
  },
  sliderContainer: {
    flexDirection: 'row',
  },
  sliderButton: {
    backgroundColor: '#3498db',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  sliderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  generatorButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  generateActionButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  generateActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  useButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  useButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  generatedPasswordContainer: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  generatedPasswordLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  generatedPassword: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#333',
  },
  favoriteContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#27ae60',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
  },
});

export default CredentialForm;
