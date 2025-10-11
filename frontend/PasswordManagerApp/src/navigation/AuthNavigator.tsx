import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import TwoFactorVerificationScreen from '../screens/TwoFactorVerificationScreen';
import RecoveryCodeScreen from '../screens/RecoveryCodeScreen';
import { AuthTokens } from '../types/auth';
import { TwoFactorMethod } from '../types/twoFactor';

export type AuthStackParamList = {
  Login: {
    onLoginSuccess: (tokens: AuthTokens) => void;
    onNavigateToRegister: () => void;
    onNavigateTo2FA?: (method: TwoFactorMethod, onSuccess: (tokens: any) => void) => void;
  };
  Register: {
    onRegisterSuccess: (tokens: AuthTokens) => void;
    onNavigateToLogin: () => void;
  };
  TwoFactorVerification: {
    method: TwoFactorMethod;
    onSuccess: (tokens: any) => void;
    onCancel: () => void;
    onUseRecoveryCode: () => void;
  };
  RecoveryCode: {
    method: TwoFactorMethod;
    onSuccess: (tokens: any) => void;
    onCancel: () => void;
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
            onLoginSuccess={(tokens, userData) => {
              console.log('🔧 AuthNavigator: onLoginSuccess chamado');
              console.log('🔧 AuthNavigator: Tokens:', tokens);
              console.log('🔧 AuthNavigator: UserData:', userData);
              onAuthSuccess(tokens, userData);
            }}
            onNavigateToRegister={() => props.navigation.navigate('Register')}
            onNavigateTo2FA={(method, onSuccess) => {
              console.log('🔧 AuthNavigator: Navegando para 2FA com método:', method);
              props.navigation.navigate('TwoFactorVerification', {
                method,
                onSuccess: (tokens) => {
                  console.log('🔧 AuthNavigator: Callback 2FA recebido:', tokens);
                  onSuccess(tokens);
                },
                onCancel: () => props.navigation.navigate('Login'),
                onUseRecoveryCode: () => props.navigation.navigate('RecoveryCode', {
                  method,
                  onSuccess,
                  onCancel: () => props.navigation.navigate('Login')
                })
              });
            }}
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
      <Stack.Screen name="TwoFactorVerification">
        {(props) => (
          <TwoFactorVerificationScreen
            method={props.route.params.method}
            onSuccess={props.route.params.onSuccess}
            onCancel={props.route.params.onCancel}
            onUseRecoveryCode={props.route.params.onUseRecoveryCode}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="RecoveryCode">
        {(props) => (
          <RecoveryCodeScreen
            method={props.route.params.method}
            onSuccess={props.route.params.onSuccess}
            onCancel={props.route.params.onCancel}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default AuthNavigator;
