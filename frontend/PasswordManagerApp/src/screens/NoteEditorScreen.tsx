import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNotes } from '../hooks/useNotes';
import { Note, CreateNoteRequest, UpdateNoteRequest } from '../types/note';

interface NoteEditorScreenProps {
  navigation: any;
  route?: {
    params?: {
      note?: Note;
    };
  };
}

const NoteEditorScreen: React.FC<NoteEditorScreenProps> = ({ navigation, route }) => {
  const { createNote, updateNote, loading } = useNotes();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSecure, setIsSecure] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [color, setColor] = useState('#4ECDC4');
  const [isFavorite, setIsFavorite] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  const isEditing = route?.params?.note;
  const note = route?.params?.note;

  // Cores disponíveis
  const availableColors = [
    '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE',
    '#85C1E9', '#F8C471', '#82E0AA', '#F1948A'
  ];

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setIsSecure(note.isSecure);
      setTags(note.tags);
      setColor(note.color);
      setIsFavorite(note.isFavorite);
      
      // // Se for uma nota segura, mostrar aviso (temporariamente desativado)
      // if (note.isSecure) {
      //   Alert.alert(
      //     'Nota Segura',
      //     'Você está editando uma nota criptografada. As alterações serão salvas com segurança.',
      //     [{ text: 'Entendi', style: 'default' }]
      //   );
      // }
    }
  }, [note]);

  /**
   * Adicionar tag
   */
  const handleAddTag = useCallback(() => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags(prev => [...prev, trimmedTag]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  /**
   * Remover tag
   */
  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  }, []);

  /**
   * Salvar nota
   */
  const handleSave = useCallback(async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Erro', 'Título e conteúdo são obrigatórios');
      return;
    }

    setSaving(true);

    try {
      const noteData: CreateNoteRequest | UpdateNoteRequest = {
        title: title.trim(),
        content: content.trim(),
        isSecure,
        tags,
        color,
        ...(isEditing && { isFavorite })
      };

      let savedNote: Note | null = null;

      if (isEditing && note) {
        savedNote = await updateNote(note.id, noteData);
      } else {
        savedNote = await createNote(noteData);
      }

      if (savedNote) {
        Alert.alert(
          'Sucesso',
          isEditing ? 'Nota atualizada com sucesso!' : 'Nota criada com sucesso!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      }
    } catch (error) {
      console.error('Erro ao salvar nota:', error);
    } finally {
      setSaving(false);
    }
  }, [title, content, isSecure, tags, color, isFavorite, isEditing, note, createNote, updateNote, navigation]);

  /**
   * Renderizar tags
   */
  const renderTags = () => (
    <View style={styles.tagsContainer}>
      <Text style={styles.sectionTitle}>Tags</Text>
      <View style={styles.tagsList}>
        {tags.map((tag, index) => (
          <TouchableOpacity
            key={index}
            style={styles.tag}
            onPress={() => handleRemoveTag(tag)}
          >
            <Text style={styles.tagText}>#{tag}</Text>
            <Ionicons name="close" size={14} color="#666" />
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.tagInputContainer}>
        <TextInput
          style={styles.tagInput}
          placeholder="Adicionar tag..."
          value={tagInput}
          onChangeText={setTagInput}
          onSubmitEditing={handleAddTag}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={styles.addTagButton}
          onPress={handleAddTag}
          disabled={!tagInput.trim()}
        >
          <Ionicons name="add" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  /**
   * Renderizar cores
   */
  const renderColors = () => (
    <View style={styles.colorsContainer}>
      <Text style={styles.sectionTitle}>Cor</Text>
      <View style={styles.colorsList}>
        {availableColors.map((colorOption) => (
          <TouchableOpacity
            key={colorOption}
            style={[
              styles.colorOption,
              { backgroundColor: colorOption },
              color === colorOption && styles.colorOptionSelected
            ]}
            onPress={() => setColor(colorOption)}
          >
            {color === colorOption && (
              <Ionicons name="checkmark" size={16} color="white" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>
            {isEditing ? 'Editar Nota' : 'Nova Nota'}
          </Text>
          
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            disabled={saving || !title.trim() || !content.trim()}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="checkmark" size={24} color="white" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Título */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Título *</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="Digite o título da nota..."
              value={title}
              onChangeText={setTitle}
              maxLength={255}
            />
          </View>

          {/* Conteúdo */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Conteúdo *</Text>
            <TextInput
              style={styles.contentInput}
              placeholder="Digite o conteúdo da nota..."
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              maxLength={10000}
            />
          </View>

          {/* Opções de segurança */}
          {/* <View style={styles.optionsContainer}> */}
            {/**
             * Temporariamente desabilitado: seleção de "Nota Segura" no cadastro/edição
             *
             * <TouchableOpacity
             *   style={styles.optionRow}
             *   onPress={() => setIsSecure(!isSecure)}
             * >
             *   <View style={styles.optionLeft}>
             *     <Ionicons
             *       name={isSecure ? "lock-closed" : "lock-open"}
             *       size={20}
             *       color={isSecure ? "#4ECDC4" : "#666"}
             *     />
             *     <Text style={styles.optionText}>Nota Segura</Text>
             *   </View>
             *   <View style={[styles.toggle, isSecure && styles.toggleActive]}>
             *     <View style={[styles.toggleThumb, isSecure && styles.toggleThumbActive]} />
             *   </View>
             * </TouchableOpacity>
             */}
{/* 
            {isEditing && (
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => setIsFavorite(!isFavorite)}
              >
                <View style={styles.optionLeft}>
                  <Ionicons
                    name={isFavorite ? "heart" : "heart-outline"}
                    size={20}
                    color={isFavorite ? "#e74c3c" : "#666"}
                  />
                  <Text style={styles.optionText}>Favorita</Text>
                </View>
                <View style={[styles.toggle, isFavorite && styles.toggleActive]}>
                  <View style={[styles.toggleThumb, isFavorite && styles.toggleThumbActive]} />
                </View>
              </TouchableOpacity>
            )}
          </View> */}

          {/* Tags */}
          {renderTags()}

          {/* Cores */}
          {renderColors()}

          {/* Informações de segurança (temporariamente desativado) */}
          {/**
           * {isSecure && (
           *   <View style={styles.securityInfo}>
           *     <Ionicons name="shield-checkmark" size={20} color="#4ECDC4" />
           *     <Text style={styles.securityText}>
           *       Esta nota será criptografada e protegida com segurança adicional.
           *     </Text>
           *   </View>
           * )}
           */}
        </ScrollView>
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
  saveButton: {
    backgroundColor: '#4ECDC4',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  contentInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e9ecef',
    minHeight: 200,
  },
  optionsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#4ECDC4',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  tagsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#666',
    marginRight: 6,
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#333',
    marginRight: 8,
  },
  addTagButton: {
    backgroundColor: '#4ECDC4',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  colorsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#333',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4ECDC4',
  },
  securityText: {
    fontSize: 14,
    color: '#4ECDC4',
    marginLeft: 12,
    flex: 1,
  },
});

export default NoteEditorScreen;
