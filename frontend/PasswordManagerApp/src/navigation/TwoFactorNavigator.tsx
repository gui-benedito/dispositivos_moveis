import React, { useState } from 'react';
import TwoFactorSetupScreen from '../screens/TwoFactorSetupScreen';
import TwoFactorVerificationScreen from '../screens/TwoFactorVerificationScreen';
import RecoveryCodeScreen from '../screens/RecoveryCodeScreen';
import { TwoFactorMethod } from '../types/twoFactor';

interface TwoFactorNavigatorProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type TwoFactorScreen = 'setup' | 'verification' | 'recovery';

const TwoFactorNavigator: React.FC<TwoFactorNavigatorProps> = ({ onSuccess, onCancel }) => {
  const [currentScreen, setCurrentScreen] = useState<TwoFactorScreen>('setup');
  const [method, setMethod] = useState<TwoFactorMethod>('totp');
  const [tokens, setTokens] = useState<any>(null);

  const handleSetupSuccess = () => {
    onSuccess();
  };

  const handleVerificationSuccess = (newTokens: any) => {
    setTokens(newTokens);
    onSuccess();
  };

  const handleRecoverySuccess = (newTokens: any) => {
    setTokens(newTokens);
    onSuccess();
  };

  const handleUseRecoveryCode = () => {
    setCurrentScreen('recovery');
  };

  const handleBackToVerification = () => {
    setCurrentScreen('verification');
  };

  const handleBackToSetup = () => {
    setCurrentScreen('setup');
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <>
      {currentScreen === 'setup' && (
        <TwoFactorSetupScreen
          onSuccess={handleSetupSuccess}
          onCancel={handleCancel}
        />
      )}
      
      {currentScreen === 'verification' && (
        <TwoFactorVerificationScreen
          method={method}
          onSuccess={handleVerificationSuccess}
          onCancel={handleCancel}
          onUseRecoveryCode={handleUseRecoveryCode}
        />
      )}
      
      {currentScreen === 'recovery' && (
        <RecoveryCodeScreen
          method={method}
          onSuccess={handleRecoverySuccess}
          onCancel={handleBackToVerification}
        />
      )}
    </>
  );
};

export default TwoFactorNavigator;
