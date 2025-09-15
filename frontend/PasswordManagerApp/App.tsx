import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthNavigator from './src/navigation/AuthNavigator';
import HomeScreen from './src/screens/HomeScreen';
import { AuthTokens, User } from './src/types/auth';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      // Salvar tokens e dados do usuário
      await AsyncStorage.setItem('authTokens', JSON.stringify(tokens));
      if (userData) {
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        setUser(userData);
      }
      setIsAuthenticated(true);
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
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  if (isLoading) {
    return null; // Ou uma tela de loading
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      {isAuthenticated && user ? (
        <HomeScreen user={user} onLogout={handleLogout} />
      ) : (
        <AuthNavigator onAuthSuccess={handleAuthSuccess} />
      )}
    </NavigationContainer>
  );
}
