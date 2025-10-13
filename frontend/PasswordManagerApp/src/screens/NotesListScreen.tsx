import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotes } from '../hooks/useNotes';
import { Note } from '../types/note';
import { Ionicons } from '@expo/vector-icons';

interface NotesListScreenProps {
  navigation: any;
}

const NotesListScreen: React.FC<NotesListScreenProps> = ({ navigation }) => {
  const {
    notes,
    loading,
    error,
    stats,
    loadNotes,
    searchNotes,
    refreshNotes,
    deleteNote,
    toggleFavorite,
    clearError
  } = useNotes();

  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'secure' | 'favorites'>('all');
  const [isSearching, setIsSearching] = useState(false);

  /**
   * Obter parâmetros de filtro atual
   */
  const getCurrentFilterParams = useCallback(() => {
    switch (filter) {
      case 'secure':
        return { isSecure: true };
      case 'favorites':
        return { isFavorite: true };
      default:
        return {};
    }
  }, [filter]);

  /**
   * Buscar notas
   */
  const handleSearch = useCallback(async (term: string) => {
    if (term.trim()) {
      setIsSearching(true);
      await searchNotes(term, getCurrentFilterParams());
      setIsSearching(false);
    } else {
      await loadNotes(getCurrentFilterParams());
    }
  }, [searchNotes, loadNotes, getCurrentFilterParams]);

  /**
   * Aplicar filtro
   */
  const applyFilter = useCallback(async (newFilter: 'all' | 'secure' | 'favorites') => {
    setFilter(newFilter);
    
    // Obter parâmetros do novo filtro
    const filterParams = (() => {
      switch (newFilter) {
        case 'secure':
          return { isSecure: true };
        case 'favorites':
          return { isFavorite: true };
        default:
          return {};
      }
    })();
    
    if (searchTerm.trim()) {
      await searchNotes(searchTerm, filterParams);
    } else {
      await loadNotes(filterParams);
    }
  }, [searchTerm, searchNotes, loadNotes]);

  /**
   * Deletar nota
   */
  const handleDeleteNote = useCallback(async (note: Note) => {
    Alert.alert(
      'Deletar Nota',
      `Tem certeza que deseja deletar "${note.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            await deleteNote(note.id);
          }
        }
      ]
    );
  }, [deleteNote]);

  /**
   * Alternar favorito
   */
  const handleToggleFavorite = useCallback(async (note: Note) => {
    await toggleFavorite(note.id);
  }, [toggleFavorite]);

  /**
   * Renderizar item da lista
   */
  const renderNoteItem = ({ item }: { item: Note }) => (
    <TouchableOpacity
      style={[styles.noteItem, { borderLeftColor: item.color }]}
      onPress={() => {
        // Sempre navegar - a verificação de senha mestra será feita no App.tsx
        navigation.navigate('NoteEditor', { note: item });
      }}
    >
      <View style={styles.noteHeader}>
        <View style={styles.noteTitleContainer}>
          <Text style={[styles.noteTitle, item.isSecure && styles.secureNoteTitle]} numberOfLines={1}>
            {item.title}
          </Text>
          {item.isSecure && (
            <View style={styles.secureIndicator}>
              <Ionicons name="lock-closed" size={16} color="#4ECDC4" />
              <Text style={styles.secureText}>SEGURA</Text>
            </View>
          )}
          {item.isFavorite && (
            <Ionicons name="heart" size={16} color="#e74c3c" />
          )}
        </View>
        <View style={styles.noteActions}>
          <TouchableOpacity
            onPress={() => handleToggleFavorite(item)}
            style={styles.actionButton}
          >
            <Ionicons
              name={item.isFavorite ? "heart" : "heart-outline"}
              size={20}
              color={item.isFavorite ? "#e74c3c" : "#666"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteNote(item)}
            style={styles.actionButton}
          >
            <Ionicons name="trash-outline" size={20} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>
      
      <Text style={styles.noteContent} numberOfLines={2}>
        {item.isSecure ? '🔒 Conteúdo criptografado e protegido' : item.content}
      </Text>
      
      {item.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {item.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
          {item.tags.length > 3 && (
            <Text style={styles.moreTagsText}>+{item.tags.length - 3}</Text>
          )}
        </View>
      )}
      
      <Text style={styles.noteDate}>
        {new Date(item.updatedAt).toLocaleDateString('pt-BR')}
      </Text>
    </TouchableOpacity>
  );

  /**
   * Renderizar filtros
   */
  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <TouchableOpacity
        style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
        onPress={() => applyFilter('all')}
      >
        <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
          Todas ({stats?.total || 0})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.filterButton, filter === 'secure' && styles.filterButtonActive]}
        onPress={() => applyFilter('secure')}
      >
        <Text style={[styles.filterText, filter === 'secure' && styles.filterTextActive]}>
          Seguras ({stats?.secure || 0})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.filterButton, filter === 'favorites' && styles.filterButtonActive]}
        onPress={() => applyFilter('favorites')}
      >
        <Text style={[styles.filterText, filter === 'favorites' && styles.filterTextActive]}>
          Favoritas ({stats?.favorites || 0})
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Notas Seguras</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('NoteEditor')}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Barra de busca */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar notas..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={() => handleSearch(searchTerm)}
          returnKeyType="search"
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchTerm('');
              refreshNotes();
            }}
            style={styles.clearButton}
          >
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros */}
      {renderFilters()}

      {/* Lista de notas */}
      {loading && !isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ECDC4" />
          <Text style={styles.loadingText}>Carregando notas...</Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={renderNoteItem}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refreshNotes}
              colors={['#4ECDC4']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                {searchTerm ? 'Nenhuma nota encontrada' : 'Nenhuma nota criada ainda'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchTerm ? 'Tente uma busca diferente' : 'Toque no + para criar sua primeira nota'}
              </Text>
            </View>
          }
          contentContainerStyle={notes.length === 0 ? styles.emptyListContainer : undefined}
        />
      )}

      {/* Erro */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={clearError} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#4ECDC4',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  filterButtonActive: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: 'white',
  },
  noteItem: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noteTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  secureNoteTitle: {
    color: '#4ECDC4',
    fontWeight: 'bold',
  },
  secureIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  secureText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4ECDC4',
    marginLeft: 4,
  },
  noteActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  noteContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tag: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#666',
  },
  moreTagsText: {
    fontSize: 12,
    color: '#999',
    alignSelf: 'center',
  },
  noteDate: {
    fontSize: 12,
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#fee',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fcc',
  },
  errorText: {
    color: '#c33',
    fontSize: 14,
    marginBottom: 12,
  },
  errorButton: {
    backgroundColor: '#c33',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  errorButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default NotesListScreen;
