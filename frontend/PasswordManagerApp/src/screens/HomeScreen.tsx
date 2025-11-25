import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface HomeScreenProps {
  onLogout: () => void;
  onNavigateToSettings: () => void;
  onNavigateToCredentials: () => void;
  onNavigateToNotes: () => void;
  onNavigateToSimpleBackup: () => void;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onLogout, onNavigateToSettings, onNavigateToCredentials, onNavigateToNotes, onNavigateToSimpleBackup, user }) => {
  const { colors } = useTheme();
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', onPress: onLogout, style: 'destructive' },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }] }>
      <View style={[styles.header, { backgroundColor: colors.primary }] }>
        <Text style={[styles.title, { color: '#FFFFFF' }]}>Gerenciador de Senhas</Text>
        <Text style={[styles.subtitle, { color: '#FFFFFF' }]}>
          Bem-vindo, {user.firstName} {user.lastName}!
        </Text>
        <Text style={[styles.email, { color: '#E0E0E0' }]}>{user.email}</Text>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
        <Text style={[styles.welcomeText, { color: colors.text }]}>
          Suas credenciais estão seguras e criptografadas.
        </Text>
        
        <View style={[styles.features, { backgroundColor: colors.card }] }>
          <Text style={[styles.featuresTitle, { color: colors.text }]}>Funcionalidades disponíveis:</Text>
          <Text style={[styles.feature, { color: colors.mutedText }]}>• Cofre de senhas criptografado</Text>
          <Text style={[styles.feature, { color: colors.mutedText }]}>• Gerador de senhas fortes</Text>
          <Text style={[styles.feature, { color: colors.mutedText }]}>• Categorias personalizadas</Text>
          <Text style={[styles.feature, { color: colors.mutedText }]}>• Busca rápida</Text>
          <Text style={[styles.feature, { color: colors.mutedText }]}>• Bloqueio automático</Text>
          <Text style={[styles.feature, { color: colors.mutedText }]}>• Autenticação biométrica</Text>
        </View>

        <TouchableOpacity style={[styles.credentialsButton, { backgroundColor: colors.primary }]} onPress={onNavigateToCredentials}>
          <Text style={styles.credentialsButtonText}>🔐 Acessar Cofre de Senhas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.notesButton, { backgroundColor: colors.primary }]} onPress={onNavigateToNotes}>
          <Text style={styles.notesButtonText}>📝 Notas Seguras</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.simpleBackupButton, { backgroundColor: colors.primary }]} onPress={onNavigateToSimpleBackup}>
          <Text style={styles.simpleBackupButtonText}>💾 Backup em Nuvem</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.settingsButton, { backgroundColor: colors.primary }]} onPress={onNavigateToSettings}>
          <Text style={styles.settingsButtonText}>⚙️ Configurações</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.danger }]} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sair</Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#ecf0f1',
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  welcomeText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  features: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  feature: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    lineHeight: 22,
  },
  credentialsButton: {
    backgroundColor: '#27ae60',
    marginTop: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  credentialsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  notesButton: {
    backgroundColor: '#4ECDC4',
    marginTop: 15,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  notesButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backupButton: {
    backgroundColor: '#9b59b6',
    marginTop: 15,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  backupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  managementButton: {
    backgroundColor: '#f39c12',
    marginTop: 15,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  managementButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  simpleBackupButton: {
    backgroundColor: '#27ae60',
    marginTop: 15,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  simpleBackupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsButton: {
    backgroundColor: '#3498db',
    marginTop: 15,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    marginTop: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;
