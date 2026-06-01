import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { Platform } from 'react-native';

import AuctionSpeedDial from '../components/auctions/AuctionSpeedDial';
import AppLayout from '../components/layout/AppLayout';
import AllAuctionsScreen from '../pages/AllAuctionsScreen';
import ForgotPasswordScreen from '../pages/ForgotPasswordScreen';
import HomeScreen from '../pages/HomeScreen';
import LoginScreen from '../pages/LoginScreen';
import MyActivityScreen from '../pages/MyActivityScreen';
import PaymentMethodsScreen from '../pages/PaymentMethodsScreen';
import PenaltyPaymentScreen from '../pages/PenaltyPaymentScreen';
import ProfileScreen from '../pages/ProfileScreen';
import ResetPasswordScreen from '../pages/ResetPasswordScreen';
import SignUpAuthorizingScreen from '../pages/SignUpAuthorizingScreen';
import SignUpFinalScreen from '../pages/SignUpFinalScreen';
import SignUpScreen from '../pages/SignUpScreen';
import SplashScreen from '../pages/SplashScreen';

const ROUTES = {
  auctions: 'auctions',
  forgotPassword: 'forgotPassword',
  home: 'home',
  login: 'login',
  myActivity: 'myActivity',
  penaltyPayment: 'penaltyPayment',
  profile: 'profile',
  resetPassword: 'resetPassword',
  signUp: 'signUp',
  signUpAuthorizing: 'signUpAuthorizing',
  signUpFinal: 'signUpFinal',
  paymentMethods: 'paymentMethods',
  splash: 'splash',
};

const ROUTE_PATHS = {
  [ROUTES.auctions]: '/auctions',
  [ROUTES.forgotPassword]: '/forgot-password',
  [ROUTES.home]: '/home',
  [ROUTES.login]: '/login',
  [ROUTES.myActivity]: '/my-activity',
  [ROUTES.penaltyPayment]: '/penalty-payment',
  [ROUTES.profile]: '/profile',
  [ROUTES.resetPassword]: '/reset-password',
  [ROUTES.signUp]: '/sign-up',
  [ROUTES.signUpAuthorizing]: '/sign-up-authorizing',
  [ROUTES.signUpFinal]: '/sign-up-final',
  [ROUTES.paymentMethods]: '/payment-methods',
  [ROUTES.splash]: '/splash',
};

const ROUTE_PATH_ALIASES = {
  '/confirmar': ROUTES.signUpFinal,
  '/recuperar-clave': ROUTES.resetPassword,
};

function getCurrentRouteInfo() {
  // On web, infer route from the URL. On native platforms default to
  // showing the splash screen so the app has a consistent startup flow.
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const normalizedPath = window.location.pathname.replace(/\/\/+$/, '') || '/';
    const matchedRoute = Object.keys(ROUTE_PATHS).find(
      (routeName) => ROUTE_PATHS[routeName] === normalizedPath
    );
    const route = matchedRoute || ROUTE_PATH_ALIASES[normalizedPath];

    return {
      isExplicit: Boolean(route),
      params: Object.fromEntries(new URLSearchParams(window.location.search)),
      route: route || ROUTES.login,
    };
  }

  // Native (iOS/Android): start with the splash route and mark as not explicit
  return {
    isExplicit: false,
    params: {},
    route: ROUTES.splash,
  };
}

function updateBrowserRoute(route, replace = false, params = {}) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  const nextPath = ROUTE_PATHS[route];
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ).toString();
  const nextUrl = query ? `${nextPath}?${query}` : nextPath;
  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
  const currentUrl = `${currentPath}${window.location.search}`;

  if (!nextPath || currentUrl === nextUrl) {
    return;
  }

  const method = replace ? 'replaceState' : 'pushState';
  window.history[method]({ params, route }, '', nextUrl);
}

export default function AppNavigator() {
  const [currentRoute, setCurrentRoute] = useState(
    () => getCurrentRouteInfo().route
  );
  const [routeParams, setRouteParams] = useState(
    () => getCurrentRouteInfo().params
  );
  const [routeHistory, setRouteHistory] = useState([]);

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
      setRouteParams(routeInfo.params);
      setIsLoading(false);
      setRouteHistory([]);
    };

    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!isLoading && currentRoute !== ROUTES.splash) {
      updateBrowserRoute(currentRoute, true, routeParams);
    }
  }, [currentRoute, isLoading, routeParams]);

  function navigateTo(route, options = {}) {
    if (route === currentRoute) {
      return;
    }

    setIsLoading(false);
    if (!options.replace && currentRoute !== ROUTES.splash) {
      setRouteHistory((currentHistory) => [...currentHistory, currentRoute]);
    }
    setCurrentRoute(route);
    setRouteParams(options.params || {});
    updateBrowserRoute(route, options.replace, options.params || {});
  }

  function getFallbackBackRoute(route) {
    if (route === ROUTES.forgotPassword) {
      return ROUTES.login;
    }

    if (route === ROUTES.resetPassword) {
      return ROUTES.forgotPassword;
    }

    if (route === ROUTES.signUp) {
      return ROUTES.login;
    }

    if (route === ROUTES.signUpAuthorizing) {
      return ROUTES.signUp;
    }

    if (route === ROUTES.signUpFinal) {
      return ROUTES.signUpAuthorizing;
    }

    if (route === ROUTES.paymentMethods) {
      return ROUTES.signUpFinal;
    }

    if (route === ROUTES.penaltyPayment) {
      return ROUTES.myActivity;
    }

    if (
      route === ROUTES.auctions ||
      route === ROUTES.profile ||
      route === ROUTES.myActivity
    ) {
      return ROUTES.home;
    }

    return null;
  }

  function handleBackPress() {
    const previousRoute =
      routeHistory[routeHistory.length - 1] || getFallbackBackRoute(currentRoute);

    if (!previousRoute || previousRoute === currentRoute) {
      return;
    }

    setIsLoading(false);
    setRouteHistory((currentHistory) =>
      currentHistory.length > 0 ? currentHistory.slice(0, -1) : currentHistory
    );
    setCurrentRoute(previousRoute);
    setRouteParams({});
    updateBrowserRoute(previousRoute, true);
  }

  function handleNavItemPress(itemId) {
    if (itemId === 'inicio') {
      navigateTo(ROUTES.home);
    }

    if (itemId === 'perfil') {
      navigateTo(ROUTES.profile);
    }

    if (itemId === 'subastas') {
      navigateTo(ROUTES.auctions);
    }

    if (itemId === 'actividad') {
      navigateTo(ROUTES.myActivity);
    }
  }

  if (isLoading || !fontsLoaded || currentRoute === ROUTES.splash) {
    return <SplashScreen />;
  }

  const layoutVariant =
    currentRoute === ROUTES.login ||
    currentRoute === ROUTES.forgotPassword ||
    currentRoute === ROUTES.resetPassword ||
    currentRoute === ROUTES.signUp ||
    currentRoute === ROUTES.signUpAuthorizing ||
    currentRoute === ROUTES.signUpFinal ||
    currentRoute === ROUTES.paymentMethods
      ? 'auth'
      : 'app';
  const canNavigateBack =
    currentRoute !== ROUTES.login &&
    (
      routeHistory.length > 0 ||
      Boolean(getFallbackBackRoute(currentRoute))
    );

  return (
    <AppLayout
      activeNavItem={
        currentRoute === ROUTES.auctions
          ? 'subastas'
          : currentRoute === ROUTES.home
          ? 'inicio'
          : currentRoute === ROUTES.profile
          ? 'perfil'
          : currentRoute === ROUTES.myActivity ||
            currentRoute === ROUTES.penaltyPayment
          ? 'actividad'
          : ''
      }
      enableSwipeBack={canNavigateBack}
      floatingAction={
        currentRoute === ROUTES.auctions ? <AuctionSpeedDial /> : null
      }
      onBackPress={canNavigateBack ? handleBackPress : undefined}
      onNavItemPress={handleNavItemPress}
      showLogo={currentRoute !== ROUTES.home}
      showNotifications={layoutVariant !== 'auth'}
      variant={layoutVariant}
    >
      {currentRoute === ROUTES.auctions ? (
        <AllAuctionsScreen />
      ) : currentRoute === ROUTES.home ? (
        <HomeScreen onViewAllAuctions={() => navigateTo(ROUTES.auctions)} />
      ) : currentRoute === ROUTES.myActivity ? (
        <MyActivityScreen onPayPenalty={() => navigateTo(ROUTES.penaltyPayment)} />
      ) : currentRoute === ROUTES.penaltyPayment ? (
        <PenaltyPaymentScreen onPaid={() => navigateTo(ROUTES.myActivity)} />
      ) : currentRoute === ROUTES.profile ? (
        <ProfileScreen onLogout={() => navigateTo(ROUTES.login)} />
      ) : currentRoute === ROUTES.forgotPassword ? (
        <ForgotPasswordScreen />
      ) : currentRoute === ROUTES.resetPassword ? (
        <ResetPasswordScreen
          token={routeParams.token}
          onFinish={() => navigateTo(ROUTES.login, { replace: true })}
        />
      ) : currentRoute === ROUTES.signUpAuthorizing ? (
        <SignUpAuthorizingScreen
          onAuthorized={() => navigateTo(ROUTES.login, { replace: true })}
        />
      ) : currentRoute === ROUTES.signUpFinal ? (
        <SignUpFinalScreen
          token={routeParams.token}
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
          onForgotPasswordPress={() => navigateTo(ROUTES.forgotPassword)}
          onLoginSuccess={() => navigateTo(ROUTES.home)}
          onRegisterPress={() => navigateTo(ROUTES.signUp)}
        />
      )}
    </AppLayout>
  );
}
