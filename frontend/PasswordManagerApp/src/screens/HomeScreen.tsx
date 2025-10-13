import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';

interface HomeScreenProps {
  onLogout: () => void;
  onNavigateToSettings: () => void;
  onNavigateToCredentials: () => void;
  onNavigateToNotes: () => void;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onLogout, onNavigateToSettings, onNavigateToCredentials, onNavigateToNotes, user }) => {
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gerenciador de Senhas</Text>
        <Text style={styles.subtitle}>
          Bem-vindo, {user.firstName} {user.lastName}!
        </Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.welcomeText}>
          Suas credenciais estão seguras e criptografadas.
        </Text>
        
        <View style={styles.features}>
          <Text style={styles.featuresTitle}>Funcionalidades disponíveis:</Text>
          <Text style={styles.feature}>• Cofre de senhas criptografado</Text>
          <Text style={styles.feature}>• Gerador de senhas fortes</Text>
          <Text style={styles.feature}>• Categorias personalizadas</Text>
          <Text style={styles.feature}>• Busca rápida</Text>
          <Text style={styles.feature}>• Bloqueio automático</Text>
          <Text style={styles.feature}>• Autenticação biométrica</Text>
        </View>

        <TouchableOpacity style={styles.credentialsButton} onPress={onNavigateToCredentials}>
          <Text style={styles.credentialsButtonText}>🔐 Acessar Cofre de Senhas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.notesButton} onPress={onNavigateToNotes}>
          <Text style={styles.notesButtonText}>📝 Notas Seguras</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsButton} onPress={onNavigateToSettings}>
          <Text style={styles.settingsButtonText}>⚙️ Configurações</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Sair</Text>
      </TouchableOpacity>
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
  content: {
    flex: 1,
    padding: 20,
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
  settingsButton: {
    backgroundColor: '#3498db',
    marginTop: 10,
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
    margin: 20,
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
