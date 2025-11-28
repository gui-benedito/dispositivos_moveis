import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { riskPasswordsService, BreachedCredential } from '../services/riskPasswordsService';

interface RiskPasswordsScreenProps {
  onNavigateBack: () => void;
}

const RiskPasswordsScreen: React.FC<RiskPasswordsScreenProps> = ({ onNavigateBack }) => {
  const { colors } = useTheme();
  const [masterPassword, setMasterPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [breached, setBreached] = useState<BreachedCredential[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleCheck = async () => {
    if (!masterPassword.trim()) {
      Alert.alert('Senha mestra necessária', 'Informe sua senha mestra para verificar as senhas em risco.');
      return;
    }

    try {
      setLoading(true);
      const response = await riskPasswordsService.listBreachedCredentials(masterPassword.trim());
      setBreached(response.data || []);
      setHasSearched(true);
    } catch (error: any) {
      console.error('Erro ao buscar senhas em risco:', error);
      Alert.alert('Erro', error?.message || 'Não foi possível verificar as senhas em risco.');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: BreachedCredential }) => (
    <View style={[styles.itemContainer, { backgroundColor: colors.card, borderColor: colors.border }] }>
      <View style={styles.itemHeader}>
        <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.itemCategory, { color: colors.mutedText }]}>{item.category}</Text>
      </View>
      {!!item.username && (
        <Text style={[styles.itemUsername, { color: colors.mutedText }]} numberOfLines={1}>
          Usuário: {item.username}
        </Text>
      )}
      <View style={styles.itemFooter}>
        <View style={styles.pwnBadge}>
          <Ionicons name="warning" size={16} color="#FFFFFF" />
          <Text style={styles.pwnBadgeText}>{item.pwnCount} ocorrências</Text>
        </View>
        <Text style={[styles.itemHint, { color: colors.mutedText }]}>Recomendada troca imediata dessa senha.</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }] }>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }] }>
        <TouchableOpacity style={styles.backButton} onPress={onNavigateBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Senhas em Risco</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }] }>
          <Ionicons name="shield" size={24} color={colors.primary} />
          <View style={styles.infoTextContainer}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>Verificação com Have I Been Pwned</Text>
            <Text style={[styles.infoDescription, { color: colors.mutedText }]}>
              Verificamos suas senhas contra vazamentos públicos sem enviar a senha em texto puro, usando k-anonymity.
            </Text>
          </View>
        </View>

        <Text style={[styles.label, { color: colors.text }]}>Senha Mestra</Text>
        <TextInput
          value={masterPassword}
          onChangeText={setMasterPassword}
          placeholder="Digite sua senha mestra"
          secureTextEntry
          placeholderTextColor={colors.mutedText}
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
        />

        <TouchableOpacity
          style={[styles.checkButton, { backgroundColor: colors.primary } ]}
          onPress={handleCheck}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.checkButtonText}>Verificar Senhas em Risco</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsTitle, { color: colors.text }]}>Resultados</Text>
          {hasSearched && !loading && (
            <Text style={[styles.resultsCount, { color: colors.mutedText }] }>
              {breached.length === 0
                ? 'Nenhuma senha em risco encontrada.'
                : `${breached.length} credencial(is) em risco.`}
            </Text>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedText }]}>Verificando senhas...</Text>
          </View>
        ) : (
          <FlatList
            data={breached}
            keyExtractor={(item) => item.credentialId}
            renderItem={renderItem}
            scrollEnabled={false}
            ListEmptyComponent={
              hasSearched ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="checkmark-circle" size={48} color={colors.primary} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma senha em risco</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.mutedText }]}>Suas senhas não foram encontradas em vazamentos conhecidos.</Text>
                </View>
              ) : null
            }
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 32,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 13,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  checkButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  checkButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultsCount: {
    fontSize: 13,
  },
  loadingContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  itemContainer: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  itemCategory: {
    fontSize: 12,
  },
  itemUsername: {
    fontSize: 13,
    marginBottom: 4,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  pwnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#D32F2F',
  },
  pwnBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  itemHint: {
    fontSize: 11,
  },
  emptyContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
});

export default RiskPasswordsScreen;
