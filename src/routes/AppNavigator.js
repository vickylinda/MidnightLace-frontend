import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { Platform } from 'react-native';

import AppLayout from '../components/layout/AppLayout';
import HomeScreen from '../pages/HomeScreen';
import LoginScreen from '../pages/LoginScreen';
import SplashScreen from '../pages/SplashScreen';

const ROUTES = {
  home: 'home',
  login: 'login',
  splash: 'splash',
};

const ROUTE_PATHS = {
  [ROUTES.home]: '/home',
  [ROUTES.login]: '/login',
  [ROUTES.splash]: '/splash',
};

function getCurrentRouteInfo() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return {
      isExplicit: true,
      route: ROUTES.login,
    };
  }

  const normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/';
  const route = Object.keys(ROUTE_PATHS).find(
    (routeName) => ROUTE_PATHS[routeName] === normalizedPath
  );

  return {
    isExplicit: Boolean(route),
    route: route || ROUTES.login,
  };
}

function updateBrowserRoute(route, replace = false) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  const nextPath = ROUTE_PATHS[route];
  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';

  if (!nextPath || currentPath === nextPath) {
    return;
  }

  const method = replace ? 'replaceState' : 'pushState';
  window.history[method]({ route }, '', nextPath);
}

export default function AppNavigator() {
  const [currentRoute, setCurrentRoute] = useState(
    () => getCurrentRouteInfo().route
  );
  const [isLoading, setIsLoading] = useState(
    () => !getCurrentRouteInfo().isExplicit
  );
  const [fontsLoaded] = useFonts({
    GreatVibes_400Regular: require('@expo-google-fonts/great-vibes/400Regular/GreatVibes_400Regular.ttf'),
    Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
    Inter_500Medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
    Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
    Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
    PlayfairDisplay_700Bold: require('@expo-google-fonts/playfair-display/700Bold/PlayfairDisplay_700Bold.ttf'),
  });

  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setIsLoading(false);
    }, 1800);

    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return undefined;
    }

    const handlePopState = () => {
      const routeInfo = getCurrentRouteInfo();
      setCurrentRoute(routeInfo.route);
      setIsLoading(false);
    };

    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!isLoading && currentRoute !== ROUTES.splash) {
      updateBrowserRoute(currentRoute, true);
    }
  }, [currentRoute, isLoading]);

  function navigateTo(route) {
    setIsLoading(false);
    setCurrentRoute(route);
    updateBrowserRoute(route);
  }

  if (isLoading || !fontsLoaded || currentRoute === ROUTES.splash) {
    return <SplashScreen />;
  }

  return (
    <AppLayout showLogo={currentRoute !== ROUTES.home}>
      {currentRoute === ROUTES.home ? (
        <HomeScreen />
      ) : (
        <LoginScreen onLoginSuccess={() => navigateTo(ROUTES.home)} />
      )}
    </AppLayout>
  );
}
