import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { Platform } from 'react-native';

import AppLayout from '../components/layout/AppLayout';
import HomeScreen from '../pages/HomeScreen';
import LoginScreen from '../pages/LoginScreen';
import PaymentMethodsScreen from '../pages/PaymentMethodsScreen';
import ProfileScreen from '../pages/ProfileScreen';
import SignUpAuthorizingScreen from '../pages/SignUpAuthorizingScreen';
import SignUpFinalScreen from '../pages/SignUpFinalScreen';
import SignUpScreen from '../pages/SignUpScreen';
import SplashScreen from '../pages/SplashScreen';

const ROUTES = {
  home: 'home',
  login: 'login',
  profile: 'profile',
  signUp: 'signUp',
  signUpAuthorizing: 'signUpAuthorizing',
  signUpFinal: 'signUpFinal',
  paymentMethods: 'paymentMethods',
  splash: 'splash',
};

const ROUTE_PATHS = {
  [ROUTES.home]: '/home',
  [ROUTES.login]: '/login',
  [ROUTES.profile]: '/profile',
  [ROUTES.signUp]: '/sign-up',
  [ROUTES.signUpAuthorizing]: '/sign-up-authorizing',
  [ROUTES.signUpFinal]: '/sign-up-final',
  [ROUTES.paymentMethods]: '/payment-methods',
  [ROUTES.splash]: '/splash',
};

function getCurrentRouteInfo() {
  // On web, infer route from the URL. On native platforms default to
  // showing the splash screen so the app has a consistent startup flow.
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const normalizedPath = window.location.pathname.replace(/\/\/+$/, '') || '/';
    const route = Object.keys(ROUTE_PATHS).find(
      (routeName) => ROUTE_PATHS[routeName] === normalizedPath
    );

    return {
      isExplicit: Boolean(route),
      route: route || ROUTES.login,
    };
  }

  // Native (iOS/Android): start with the splash route and mark as not explicit
  return {
    isExplicit: false,
    route: ROUTES.splash,
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

  // Always show the splash screen briefly on startup across platforms.
  const [isLoading, setIsLoading] = useState(true);
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
      // Hide splash and, if we were still on the `splash` route (native),
      // navigate to the login route so the app continues startup.
      setIsLoading(false);
      setCurrentRoute((prev) => (prev === ROUTES.splash ? ROUTES.login : prev));
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

  function handleNavItemPress(itemId) {
    if (itemId === 'inicio') {
      navigateTo(ROUTES.home);
    }

    if (itemId === 'perfil') {
      navigateTo(ROUTES.profile);
    }
  }

  if (isLoading || !fontsLoaded || currentRoute === ROUTES.splash) {
    return <SplashScreen />;
  }

  const layoutVariant =
    currentRoute === ROUTES.login ||
    currentRoute === ROUTES.signUp ||
    currentRoute === ROUTES.signUpAuthorizing ||
    currentRoute === ROUTES.signUpFinal ||
    currentRoute === ROUTES.paymentMethods
      ? 'auth'
      : 'app';

  return (
    <AppLayout
      activeNavItem={
        currentRoute === ROUTES.home ? 'inicio' : currentRoute === ROUTES.profile ? 'perfil' : ''
      }
      onNavItemPress={handleNavItemPress}
      showLogo={currentRoute !== ROUTES.home}
      variant={layoutVariant}
    >
      {currentRoute === ROUTES.home ? (
        <HomeScreen />
      ) : currentRoute === ROUTES.profile ? (
        <ProfileScreen onLogout={() => navigateTo(ROUTES.login)} />
      ) : currentRoute === ROUTES.signUpAuthorizing ? (
        <SignUpAuthorizingScreen
          onAuthorized={() => navigateTo(ROUTES.signUpFinal)}
        />
      ) : currentRoute === ROUTES.signUpFinal ? (
        <SignUpFinalScreen
          onSubmitSuccess={() => navigateTo(ROUTES.paymentMethods)}
        />
      ) : currentRoute === ROUTES.paymentMethods ? (
        <PaymentMethodsScreen onContinue={() => navigateTo(ROUTES.home)} />
      ) : currentRoute === ROUTES.signUp ? (
        <SignUpScreen
          onSubmitSuccess={() => navigateTo(ROUTES.signUpAuthorizing)}
        />
      ) : (
        <LoginScreen
          onLoginSuccess={() => navigateTo(ROUTES.home)}
          onRegisterPress={() => navigateTo(ROUTES.signUp)}
        />
      )}
    </AppLayout>
  );
}
