import * as ExpoSplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NotificationsProvider } from './src/context/NotificationsContext';
import AppNavigator from './src/routes/AppNavigator';

ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  return (
    <SafeAreaProvider>
      <NotificationsProvider>
        <AppNavigator />
      </NotificationsProvider>
    </SafeAreaProvider>
  );
}
