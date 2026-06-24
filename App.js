import * as ExpoSplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NotificationsProvider } from './src/context/NotificationsContext';
import { ToastProvider } from './src/components/feedback/ToastProvider';
import AppNavigator from './src/routes/AppNavigator';

ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <NotificationsProvider>
          <AppNavigator />
        </NotificationsProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
