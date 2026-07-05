import * as ExpoSplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from './src/components/feedback/ToastProvider';
import { WinnerModalProvider } from './src/components/feedback/WinnerModalProvider';
import AppNavigator from './src/routes/AppNavigator';

ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <WinnerModalProvider>
          <AppNavigator />
        </WinnerModalProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
