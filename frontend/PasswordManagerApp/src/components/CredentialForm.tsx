import React, { useEffect, useState } from 'react';
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
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useCredentialForm, usePasswordGenerator } from '../hooks/useCredentials';
import { Ionicons } from '@expo/vector-icons';
import { CredentialService } from '../services/credentialService';
import { CategoryService } from '../services/categoryService';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../types/category';
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
  isEdit?: boolean;
  categories?: string[];
  onReloadCategories?: () => void;
}

const CredentialForm: React.FC<CredentialFormProps> = ({
  initialData,
  onSave,
  onCancel,
  loading = false,
  title = 'Nova Credencial',
  isEdit = false,
  categories,
  onReloadCategories
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
  } = useCredentialForm(initialData, { requirePassword: !isEdit });

  const {
    generatedPassword,
    passwordStrength,
    generatePassword,
    analyzePassword,
    clearGeneratedPassword,
    loading: generatorLoading
  } = usePasswordGenerator();
  const { colors } = useTheme();

  const [showPassword, setShowPassword] = useState(false);
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showCategorySelect, setShowCategorySelect] = useState(false);
  const [userCategories, setUserCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  const CATEGORY_META_CACHE_KEY = 'credentialCategoryMetaCache';
  const CREDENTIAL_CATEGORIES_CACHE_KEY = 'credentialCategoriesCache';

  const ICONS: string[] = [
    'briefcase-outline', 'mail-outline', 'logo-github', 'logo-google',
    'key-outline', 'lock-closed-outline', 'cash-outline',
    'game-controller-outline', 'airplane-outline'
  ];
  const COLORS: string[] = ['#3498db', '#e74c3c', '#27ae60', '#8e44ad', '#f1c40f', '#2ecc71', '#e67e22', '#1abc9c'];
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
      // Montar payload: em edição, enviar apenas campos definidos/alterados; senha pode ser omitida
      let payload: CreateCredentialRequest | UpdateCredentialRequest;
      if (isEdit) {
        const updateData: UpdateCredentialRequest = {
          masterPassword: formData.masterPassword
        } as UpdateCredentialRequest;

        if (formData.title?.trim()) updateData.title = formData.title.trim();
        if (formData.description !== undefined) updateData.description = formData.description;
        if (formData.category?.trim()) updateData.category = formData.category.trim();
        if (formData.username && formData.username.length > 0) updateData.username = formData.username;
        if (formData.password && formData.password.length > 0) updateData.password = formData.password;
        if (formData.notes !== undefined) updateData.notes = formData.notes;
        if (typeof formData.isFavorite === 'boolean') updateData.isFavorite = formData.isFavorite;

        payload = updateData;
      } else {
        payload = formData as CreateCredentialRequest;
      }

      await onSave(payload);
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

  const getErrorCode = (err: any): string | undefined => {
    return err?.code || err?.data?.code || err?.response?.data?.code;
  };

  // Carregar categorias do usuário
  const loadUserCategories = async () => {
    try {
      setCatLoading(true);
      setCatError(null);

      // Tenta carregar do backend
      const res = await CategoryService.list();
      if (res.success) {
        setUserCategories(res.data);
        try {
          await AsyncStorage.setItem(CATEGORY_META_CACHE_KEY, JSON.stringify(res.data));
        } catch {}
        return;
      }
    } catch (e: any) {
      setCatError(e.message || 'Erro ao carregar categorias');

      // Fallback 1: tentar ler cache local de metadados de categoria
      try {
        const raw = await AsyncStorage.getItem(CATEGORY_META_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Category[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setUserCategories(parsed);
            return;
          }
        }
      } catch {}

      // Fallback 2: montar categorias locais a partir das categorias conhecidas
      const sourceNames: string[] = Array.from(
        new Set(
          [
            ...(categories || []),
            ...DEFAULT_CATEGORIES,
          ].filter((name) => !!name && typeof name === 'string') as string[]
        )
      );

      if (sourceNames.length > 0) {
        const now = new Date().toISOString();
        const localCats: Category[] = sourceNames.map((name, index) => ({
          id: `local-${index}-${name}`,
          name,
          icon: null,
          color: undefined,
          createdAt: now,
          updatedAt: now,
        }));
        setUserCategories(localCats);
      }
    } finally {
      setCatLoading(false);
    }
  };

  useEffect(() => {
    loadUserCategories();
  }, []);

  const handleCreateCategory = async (payload: CreateCategoryRequest) => {
    try {
      await CategoryService.create(payload);
      await loadUserCategories();
      onReloadCategories?.();
    } catch (e: any) {
      const code = getErrorCode(e);

      if (code === 'NETWORK_ERROR' || code === 'CONNECTION_REFUSED') {
        const now = new Date().toISOString();
        const localCat: Category = {
          id: `local-${Date.now()}`,
          name: payload.name,
          icon: payload.icon ?? null,
          color: payload.color,
          createdAt: now,
          updatedAt: now,
        };

        setUserCategories(prev => {
          const next = [...prev, localCat];
          AsyncStorage.setItem(CATEGORY_META_CACHE_KEY, JSON.stringify(next)).catch(() => {});
          return next;
        });

        try {
          const raw = await AsyncStorage.getItem(CREDENTIAL_CATEGORIES_CACHE_KEY);
          let cachedNames: string[] = [];
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.categories)) {
              cachedNames = parsed.categories as string[];
            }
          }
          if (!cachedNames.includes(payload.name)) {
            const updated = [...cachedNames, payload.name];
            await AsyncStorage.setItem(
              CREDENTIAL_CATEGORIES_CACHE_KEY,
              JSON.stringify({ categories: updated })
            );
          }
        } catch {}

        Alert.alert(
          'Categoria criada offline',
          'Você está sem conexão. A categoria foi criada apenas localmente e continuará disponível para seleção.'
        );
        return;
      }

      Alert.alert('Erro', e.message || 'Falha ao criar categoria');
    }
  };

  const handleUpdateCategory = async (id: string, payload: UpdateCategoryRequest) => {
    try {
      await CategoryService.update(id, payload);
      await loadUserCategories();
      if (payload.cascadeUpdate && payload.name) {
        onReloadCategories?.();
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Falha ao atualizar categoria');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await CategoryService.remove(id);
      await loadUserCategories();
      onReloadCategories?.();
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Falha ao excluir categoria');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: colors.primary }] }>
          <Text style={styles.title}>{title}</Text>
        </View>

        <View style={[styles.form, { backgroundColor: colors.card }]}>
          {/* Título */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Título *</Text>
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
            <Text style={[styles.label, { color: colors.text }]}>Descrição</Text>
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
            <Text style={[styles.label, { color: colors.text }]}>Categoria *</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                style={[styles.input, { flex: 1, justifyContent: 'center' }, errors.category && styles.inputError]}
                onPress={() => setShowCategorySelect(true)}
                disabled={loading}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {(() => {
                    const meta = userCategories.find(c => c.name === formData.category);
                    return (
                      <>
                        {meta?.icon ? (
                          <Ionicons name={meta.icon as any} size={16} color={meta?.color || colors.mutedText} style={{ marginRight: 6 }} />
                        ) : null}
                        <Text style={{ color: formData.category ? colors.text : colors.mutedText }}>
                          {formData.category || 'Selecionar categoria cadastrada'}
                        </Text>
                      </>
                    );
                  })()}
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.generateButton, { marginLeft: 8 }]}
                onPress={() => setShowCategoryManager(true)}
              >
                <Text style={styles.generateButtonText}>⚙️</Text>
              </TouchableOpacity>
            </View>
            {errors.category && touched.category && (
              <Text style={styles.errorText}>{errors.category}</Text>
            )}
            {!!categories && categories.length > 0 && (
              <Text style={{ marginTop: 6, color: colors.mutedText, fontSize: 12 }}>
                {`Você tem ${categories.length} categorias cadastradas`}
              </Text>
            )}
            {userCategories.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                {userCategories.slice(0, 6).map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 16,
                      backgroundColor: colors.card,
                      marginRight: 8,
                      marginBottom: 8
                    }}
                    onPress={() => updateField('category', c.name)}
                  >
                    <Text style={{ color: colors.text }}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Username */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Nome de usuário</Text>
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
              <Text style={[styles.label, { color: colors.text }]}>Senha *</Text>
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

          {/* URL removida */}

          {/* Notas */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Notas</Text>
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
            <Text style={[styles.label, { color: colors.text }]}>Senha Mestre *</Text>
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
              <Text style={[styles.label, { color: colors.text }]}>Marcar como favorito</Text>
              <Switch
                value={formData.isFavorite}
                onValueChange={(value) => updateField('isFavorite', value)}
                disabled={loading}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={formData.isFavorite ? '#FFFFFF' : colors.card}
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

      {/* Category Manager Modal */}
      <Modal
        visible={showCategoryManager}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCategoryManager(false)}
      >
        <View style={[styles.categoryModalContainer, { backgroundColor: colors.background }] }>
          <View style={[styles.modalHeader, { backgroundColor: colors.card }] }>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Gerenciar Categorias</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowCategoryManager(false)}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalContentContainer}>
            {catLoading && <ActivityIndicator style={{ margin: 16 }} />}
            {catError && <Text style={[styles.errorText, { margin: 16 }]}>{catError}</Text>}

            {/* Criar nova categoria */}
            <CategoryCreate
              onCreate={handleCreateCategory}
              icons={ICONS}
              colors={COLORS}
            />

            {/* Lista de categorias */}
            <View style={{ marginTop: 16 }}>
              {userCategories.map((c) => (
                <CategoryRow
                  key={c.id}
                  category={c}
                  icons={ICONS}
                  colors={COLORS}
                  onUpdate={(payload) => handleUpdateCategory(c.id, payload)}
                  onDelete={() => handleDeleteCategory(c.id)}
                />
              ))}
              {userCategories.length === 0 && !catLoading && (
                <Text style={{ color: colors.mutedText }}>Nenhuma categoria criada ainda.</Text>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Category Select Modal */}
      <Modal
        visible={showCategorySelect}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCategorySelect(false)}
      >
        <View style={[styles.categoryModalContainer, { backgroundColor: colors.background }] }>
          <View style={[styles.modalHeader, { backgroundColor: colors.card }] }>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Selecionar Categoria</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowCategorySelect(false)}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalContentContainer}>
            {userCategories.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
                onPress={() => { updateField('category', c.name); setShowCategorySelect(false); }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {c.icon ? <Ionicons name={c.icon as any} size={18} color={c.color || colors.mutedText} style={{ marginRight: 8 }} /> : null}
                  <Text style={{ fontSize: 16, color: colors.text }}>{c.name}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {userCategories.length === 0 && (
              <Text style={{ color: colors.mutedText }}>Nenhuma categoria cadastrada.</Text>
            )}
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

// Componentes auxiliares (inline para simplicidade)
const CategoryCreate: React.FC<{ onCreate: (p: CreateCategoryRequest) => void; icons: string[]; colors: string[]; }> = ({ onCreate, icons, colors }) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string | undefined>(undefined);
  const [color, setColor] = useState<string | undefined>(undefined);
  return (
    <View style={{ backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e9ecef' }}>
      <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Nova categoria</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nome" />
      <TextInput style={[styles.input, { marginTop: 8 }]} value={color} onChangeText={setColor} placeholder="Cor (ex: #3498db)" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
        {colors.map((col: string) => (
          <TouchableOpacity key={col} onPress={() => setColor(col)} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: col, marginRight: 8, marginBottom: 8, borderWidth: 2, borderColor: color === col ? '#333' : 'transparent' }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
        {colors.map((col: string) => (
          <TouchableOpacity key={col} onPress={() => setColor(col)} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: col, marginRight: 8, marginBottom: 8, borderWidth: 2, borderColor: color === col ? '#333' : 'transparent' }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
        {icons.map(i => (
          <TouchableOpacity key={i} onPress={() => setIcon(i)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: icon === i ? '#3498db' : '#ecf0f1', marginRight: 8, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name={i as any} size={16} color={icon === i ? '#fff' : '#333'} />
            <Text style={{ color: icon === i ? '#fff' : '#333', marginLeft: 6 }}>{i}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#27ae60', marginTop: 8 }]}
        onPress={() => {
          const payload: CreateCategoryRequest = { name: name.trim() };
          if (icon) payload.icon = icon;
          if (color) payload.color = color;
          onCreate(payload);
          setName(''); setIcon(undefined); setColor(undefined);
        }}
      >
        <Text style={styles.saveButtonText}>Criar</Text>
      </TouchableOpacity>
    </View>
  );
};

const CategoryRow: React.FC<{ category: Category; icons: string[]; colors: string[]; onUpdate: (p: UpdateCategoryRequest) => void; onDelete: () => void; }> = ({ category, icons, colors, onUpdate, onDelete }) => {
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState<string | undefined>(category.icon || undefined);
  const [color, setColor] = useState<string | undefined>(category.color || undefined);
  const [cascade, setCascade] = useState(false);

  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 12 }}>
      <Text style={{ fontWeight: '600', marginBottom: 6 }}>{category.name}</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nome" />
      <TextInput style={[styles.input, { marginTop: 8 }]} value={color} onChangeText={setColor} placeholder="Cor (ex: #3498db)" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
        {icons.map(i => (
          <TouchableOpacity key={i} onPress={() => setIcon(i)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: icon === i ? '#3498db' : '#ecf0f1', marginRight: 8, marginBottom: 8 }}>
            <Text style={{ color: icon === i ? '#fff' : '#333' }}>{i}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#3498db', marginRight: 6 }]}
          onPress={() => onUpdate({ name: name.trim(), icon, color, cascadeUpdate: cascade })}
        >
          <Text style={styles.saveButtonText}>Salvar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#e74c3c', marginLeft: 6 }]}
          onPress={onDelete}
        >
          <Text style={styles.saveButtonText}>Excluir</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
        <Text style={{ marginRight: 8 }}>Atualizar credenciais existentes</Text>
        <Switch value={cascade} onValueChange={setCascade} />
      </View>
    </View>
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
  categoryModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    backgroundColor: '#3498db',
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  modalContentContainer: {
    padding: 20,
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
