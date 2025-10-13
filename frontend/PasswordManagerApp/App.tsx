import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthNavigator from './src/navigation/AuthNavigator';
import TwoFactorNavigator from './src/navigation/TwoFactorNavigator';
import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CredentialsScreen from './src/screens/CredentialsScreen';
import NotesListScreen from './src/screens/NotesListScreen';
import NoteEditorScreen from './src/screens/NoteEditorScreen';
import MasterPasswordScreen from './src/screens/MasterPasswordScreen';
import { AppLockProvider } from './src/components/AppLockProvider';
import { SettingsProvider } from './src/contexts/SettingsContext';
import { AuthTokens, User } from './src/types/auth';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<'home' | 'settings' | 'credentials' | 'notes' | 'noteEditor' | 'masterPassword' | '2fa'>('home');
  const [editingNote, setEditingNote] = useState<any>(null);
  const [pendingNoteAction, setPendingNoteAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Verificar se há tokens salvos
      const tokens = await AsyncStorage.getItem('authTokens');
      const userData = await AsyncStorage.getItem('userData');
      
      if (tokens && userData) {
        const parsedTokens = JSON.parse(tokens);
        const parsedUser = JSON.parse(userData);
        
        // Aqui poderíamos validar se o token ainda é válido
        // Por enquanto, vamos assumir que está válido
        setUser(parsedUser);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = async (tokens: AuthTokens, userData?: User) => {
    try {
      console.log('🔧 App: handleAuthSuccess chamado');
      console.log('🔧 App: Tokens:', tokens);
      console.log('🔧 App: UserData:', userData);
      
      // Salvar tokens e dados do usuário
      await AsyncStorage.setItem('authTokens', JSON.stringify(tokens));
      if (userData) {
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        setUser(userData);
      }
      setIsAuthenticated(true);
      
      console.log('🔧 App: Autenticação definida como true');
    } catch (error) {
      console.error('Erro ao salvar dados de autenticação:', error);
    }
  };

  const handleLogout = async () => {
    try {
      // Limpar dados salvos
      await AsyncStorage.removeItem('authTokens');
      await AsyncStorage.removeItem('userData');
      
      setUser(null);
      setIsAuthenticated(false);
      setCurrentScreen('home');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleNavigateToSettings = () => {
    setCurrentScreen('settings');
  };

  const handleNavigateToHome = () => {
    setCurrentScreen('home');
  };

  const handleNavigateToCredentials = () => {
    setCurrentScreen('credentials');
  };

  const handleNavigateToNotes = () => {
    setCurrentScreen('notes');
  };

  const handleNavigateTo2FA = () => {
    setCurrentScreen('2fa');
  };

  const handle2FASuccess = () => {
    setCurrentScreen('settings');
  };

  const handle2FACancel = () => {
    setCurrentScreen('settings');
  };

  const handleMasterPasswordSuccess = () => {
    if (pendingNoteAction) {
      pendingNoteAction();
      setPendingNoteAction(null);
    }
    setCurrentScreen('notes');
  };

  const handleMasterPasswordCancel = () => {
    setPendingNoteAction(null);
    setCurrentScreen('notes');
  };

  const requestMasterPassword = (action: () => void) => {
    setPendingNoteAction(() => action);
    setCurrentScreen('masterPassword');
  };

  if (isLoading) {
    return null; // Ou uma tela de loading
  }

  return (
    <SettingsProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        {isAuthenticated && user ? (
          <AppLockProvider isAuthenticated={isAuthenticated}>
            {currentScreen === 'home' ? (
              <HomeScreen
                user={user}
                onLogout={handleLogout}
                onNavigateToSettings={handleNavigateToSettings}
                onNavigateToCredentials={handleNavigateToCredentials}
                onNavigateToNotes={handleNavigateToNotes}
              />
            ) : currentScreen === 'settings' ? (
              <SettingsScreen 
                user={user} 
                onLogout={handleLogout}
                onNavigateToHome={handleNavigateToHome}
                onNavigateTo2FASetup={handleNavigateTo2FA}
              />
            ) : currentScreen === 'credentials' ? (
              <CredentialsScreen 
                onNavigateBack={handleNavigateToHome}
              />
            ) : currentScreen === 'notes' ? (
              <NotesListScreen 
                navigation={{ 
                  navigate: (screen: string, params?: any) => {
                    if (screen === 'NoteEditor') {
                      if (params?.note) {
                        // Se for nota segura, pedir senha mestra
                        if (params.note.isSecure) {
                          requestMasterPassword(() => {
                            setEditingNote(params.note);
                            setCurrentScreen('noteEditor');
                          });
                        } else {
                          setEditingNote(params.note);
                          setCurrentScreen('noteEditor');
                        }
                      } else {
                        setEditingNote(null);
                        setCurrentScreen('noteEditor');
                      }
                    }
                  },
                  goBack: () => setCurrentScreen('home')
                }}
              />
            ) : currentScreen === 'noteEditor' ? (
              <NoteEditorScreen 
                navigation={{ goBack: () => {
                  setEditingNote(null);
                  setCurrentScreen('notes');
                }}}
                route={{ params: { note: editingNote } }}
              />
            ) : currentScreen === 'masterPassword' ? (
              <MasterPasswordScreen
                onSuccess={handleMasterPasswordSuccess}
                onCancel={handleMasterPasswordCancel}
                title="Acesso à Nota Segura"
                message="Digite sua senha mestra para acessar esta nota criptografada"
              />
            ) : currentScreen === '2fa' ? (
              <TwoFactorNavigator
                onSuccess={handle2FASuccess}
                onCancel={handle2FACancel}
              />
            ) : (
              <CredentialsScreen 
                onNavigateBack={handleNavigateToHome}
              />
            )}
          </AppLockProvider>
        ) : (
          <AuthNavigator onAuthSuccess={handleAuthSuccess} />
        )}
      </NavigationContainer>
    </SettingsProvider>
  );
}
