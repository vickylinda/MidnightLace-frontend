import * as ExpoSplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NotificationsProvider } from './src/context/NotificationsContext';
import { ToastProvider } from './src/components/feedback/ToastProvider';
import { WinnerModalProvider } from './src/components/feedback/WinnerModalProvider';
import AppNavigator from './src/routes/AppNavigator';

ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <NotificationsProvider>
          <WinnerModalProvider>
          <AppNavigator />
        </NotificationsProvider>
        </WinnerModalProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
