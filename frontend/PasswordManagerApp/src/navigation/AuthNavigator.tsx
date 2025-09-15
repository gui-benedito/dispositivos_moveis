import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import { AuthTokens } from '../types/auth';

export type AuthStackParamList = {
  Login: {
    onLoginSuccess: (tokens: AuthTokens) => void;
    onNavigateToRegister: () => void;
  };
  Register: {
    onRegisterSuccess: (tokens: AuthTokens) => void;
    onNavigateToLogin: () => void;
  };
};

const Stack = createStackNavigator<AuthStackParamList>();

interface AuthNavigatorProps {
  onAuthSuccess: (tokens: AuthTokens, userData: any) => void;
}

const AuthNavigator: React.FC<AuthNavigatorProps> = ({ onAuthSuccess }) => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login">
        {(props) => (
          <LoginScreen
            {...props}
            onLoginSuccess={(tokens, userData) => onAuthSuccess(tokens, userData)}
            onNavigateToRegister={() => props.navigation.navigate('Register')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Register">
        {(props) => (
          <RegisterScreen
            {...props}
            onRegisterSuccess={(tokens, userData) => onAuthSuccess(tokens, userData)}
            onNavigateToLogin={() => props.navigation.navigate('Login')}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default AuthNavigator;
