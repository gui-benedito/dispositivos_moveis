import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CredentialPublic, CredentialFilters } from '../types/credential';
import { CredentialService } from '../services/credentialService';

interface CredentialListProps {
  credentials: CredentialPublic[];
  loading: boolean;
  onCredentialPress: (credential: CredentialPublic) => void;
  onEditCredential: (credential: CredentialPublic) => void;
  onDeleteCredential: (credential: CredentialPublic) => void;
  onRefresh: () => void;
  filters?: CredentialFilters;
  onFiltersChange?: (filters: CredentialFilters) => void;
}

const CredentialList: React.FC<CredentialListProps> = ({
  credentials,
  loading,
  onCredentialPress,
  onEditCredential,
  onDeleteCredential,
  onRefresh,
  filters = {},
  onFiltersChange
}) => {
  const [searchText, setSearchText] = useState(filters.search || '');
  const [selectedCategory, setSelectedCategory] = useState(filters.category || '');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(filters.favorite || false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sortBy, setSortBy] = useState<'title' | 'category' | 'lastAccessed' | 'accessCount'>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Aplicar filtros
  const applyFilters = () => {
    const newFilters: CredentialFilters = {
      search: searchText.trim() || undefined,
      category: selectedCategory || undefined,
      favorite: showFavoritesOnly || undefined
    };
    
    onFiltersChange?.(newFilters);
    setShowFilterModal(false);
  };

  // Limpar filtros
  const clearFilters = () => {
    setSearchText('');
    setSelectedCategory('');
    setShowFavoritesOnly(false);
    onFiltersChange?.({});
    setShowFilterModal(false);
  };

  // Ordenar credenciais
  const sortedCredentials = CredentialService.sortCredentials(credentials, sortBy, sortOrder);

  // Confirmar exclusão
  const confirmDelete = (credential: CredentialPublic) => {
    Alert.alert(
      'Excluir Credencial',
      `Tem certeza que deseja excluir "${credential.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: () => onDeleteCredential(credential)
        }
      ]
    );
  };

  // Renderizar item da lista
  const renderCredentialItem = ({ item }: { item: CredentialPublic }) => (
    <TouchableOpacity
      style={styles.credentialItem}
      onPress={() => onCredentialPress(item)}
      onLongPress={() => {
        Alert.alert(
          'Opções',
          `O que deseja fazer com "${item.title}"?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Visualizar', onPress: () => onCredentialPress(item) },
            { text: 'Editar', onPress: () => onEditCredential(item) },
            { text: 'Excluir', style: 'destructive', onPress: () => confirmDelete(item) }
          ]
        );
      }}
    >
      <View style={styles.credentialHeader}>
        <View style={styles.credentialTitleContainer}>
          <Text style={styles.credentialTitle}>{item.title}</Text>
          {item.isFavorite && <Text style={styles.favoriteIcon}>⭐</Text>}
        </View>
        <TouchableOpacity
          onPress={() => confirmDelete(item)}
          style={styles.actionButton}
        >
          <Ionicons name="trash-outline" size={20} color="#e74c3c" />
        </TouchableOpacity>
      </View>

      <Text style={styles.credentialCategory}>{item.category}</Text>

      {item.description && (
        <Text style={styles.credentialDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <View style={styles.credentialFooter}>
        <View style={styles.credentialStats}>
          <Text style={styles.statText}>
            👁️ {item.accessCount} acesso{item.accessCount !== 1 ? 's' : ''}
          </Text>
          {item.lastAccessed && (
            <Text style={styles.statText}>
              📅 {new Date(item.lastAccessed).toLocaleDateString('pt-BR')}
            </Text>
          )}
        </View>
        <Text style={styles.credentialDate}>
          {new Date(item.createdAt).toLocaleDateString('pt-BR')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Renderizar lista vazia
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🔐</Text>
      <Text style={styles.emptyTitle}>Nenhuma credencial encontrada</Text>
      <Text style={styles.emptySubtitle}>
        {Object.keys(filters).length > 0 
          ? 'Tente ajustar os filtros de busca'
          : 'Crie sua primeira credencial para começar'
        }
      </Text>
    </View>
  );

  // Renderizar header da lista
  const renderListHeader = () => (
    <View style={styles.header}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Buscar credenciais..."
          placeholderTextColor="#999"
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={styles.filterButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          {credentials.length} credencial{credentials.length !== 1 ? 'is' : ''}
        </Text>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => {
            const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
            setSortOrder(newOrder);
          }}
        >
          <Text style={styles.sortButtonText}>
            {sortBy === 'title' ? '📝' : 
             sortBy === 'category' ? '📁' : 
             sortBy === 'lastAccessed' ? '📅' : '👁️'} 
            {sortOrder === 'asc' ? '↑' : '↓'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedCredentials}
        renderItem={renderCredentialItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmptyList}
        refreshing={loading}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />

      {/* Modal de filtros */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtros</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {/* Busca */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Buscar</Text>
              <TextInput
                style={styles.filterInput}
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Digite para buscar..."
                placeholderTextColor="#999"
              />
            </View>

            {/* Categoria */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Categoria</Text>
              <TextInput
                style={styles.filterInput}
                value={selectedCategory}
                onChangeText={setSelectedCategory}
                placeholder="Digite a categoria..."
                placeholderTextColor="#999"
              />
            </View>

            {/* Favoritos */}
            <View style={styles.filterSection}>
              <View style={styles.switchContainer}>
                <Text style={styles.filterLabel}>Apenas favoritos</Text>
                <TouchableOpacity
                  style={[styles.switch, showFavoritesOnly && styles.switchActive]}
                  onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
                >
                  <Text style={styles.switchText}>
                    {showFavoritesOnly ? '⭐' : '☆'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Ordenação */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Ordenar por</Text>
              <View style={styles.sortOptions}>
                {[
                  { key: 'title', label: 'Título', icon: '📝' },
                  { key: 'category', label: 'Categoria', icon: '📁' },
                  { key: 'lastAccessed', label: 'Último acesso', icon: '📅' },
                  { key: 'accessCount', label: 'Acessos', icon: '👁️' }
                ].map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.sortOption,
                      sortBy === option.key && styles.sortOptionActive
                    ]}
                    onPress={() => setSortBy(option.key as any)}
                  >
                    <Text style={styles.sortOptionText}>
                      {option.icon} {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={clearFilters}
            >
              <Text style={styles.modalButtonText}>Limpar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={applyFilters}
            >
              <Text style={styles.modalButtonPrimaryText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginRight: 10,
  },
  filterButton: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
    color: '#666',
  },
  sortButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  sortButtonText: {
    fontSize: 14,
    color: '#333',
  },
  credentialItem: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginVertical: 5,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  credentialActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
  },
  credentialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    width: '100%',
  },
  credentialTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  credentialTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  favoriteIcon: {
    fontSize: 16,
    marginLeft: 5,
  },
  credentialCategory: {
    fontSize: 12,
    color: '#3498db',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  credentialDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  credentialFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  credentialStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#999',
    marginRight: 15,
  },
  credentialDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  filterSection: {
    marginBottom: 25,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#bdc3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchActive: {
    backgroundColor: '#3498db',
  },
  switchText: {
    fontSize: 16,
    color: '#fff',
  },
  sortOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sortOption: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sortOptionActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#333',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
    backgroundColor: '#95a5a6',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonPrimary: {
    backgroundColor: '#3498db',
  },
  modalButtonPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CredentialList;
