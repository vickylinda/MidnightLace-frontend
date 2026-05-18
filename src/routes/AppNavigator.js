import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';

import AppLayout from '../components/layout/AppLayout';
import LoginScreen from '../pages/LoginScreen';
import SplashScreen from '../pages/SplashScreen';

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [fontsLoaded] = useFonts({
    Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
    Inter_500Medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
    Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
    Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
  });

  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setIsLoading(false);
    }, 1800);

    return () => clearTimeout(splashTimer);
  }, []);

  if (isLoading || !fontsLoaded) {
    return <SplashScreen />;
  }

  return (
    <AppLayout>
      <LoginScreen />
    </AppLayout>
  );
}
