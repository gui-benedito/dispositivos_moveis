import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import BiometricSettings from '../components/BiometricSettings';

interface SettingsScreenProps {
  onLogout: () => void;
  onNavigateToHome: () => void;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onLogout, onNavigateToHome, user }) => {
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

  const handleBiometricAuthSuccess = (tokens: any, userData: any) => {
    // Aqui você pode atualizar o estado do usuário ou navegar
    console.log('Autenticação biométrica bem-sucedida:', userData);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onNavigateToHome}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Configurações</Text>
        <Text style={styles.subtitle}>
          {user.firstName} {user.lastName}
        </Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔐 Segurança</Text>
        <BiometricSettings onAuthSuccess={handleBiometricAuthSuccess} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ Informações</Text>
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            • Suas credenciais são criptografadas com AES-256
          </Text>
          <Text style={styles.infoText}>
            • A biometria é processada localmente no seu dispositivo
          </Text>
          <Text style={styles.infoText}>
            • Nenhum dado biométrico é armazenado nos nossos servidores
          </Text>
          <Text style={styles.infoText}>
            • Você pode desativar a biometria a qualquer momento
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 Sobre o App</Text>
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>Versão: 1.0.0</Text>
          <Text style={styles.infoText}>Desenvolvido com React Native</Text>
          <Text style={styles.infoText}>Backend: Node.js + PostgreSQL</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Sair da Conta</Text>
      </TouchableOpacity>
    </ScrollView>
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
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    padding: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  section: {
    margin: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  infoContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
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

export default SettingsScreen;
