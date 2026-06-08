import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { Platform } from 'react-native';

import { loadSession } from '../utils/session';

import AuctionSpeedDial from '../components/auctions/AuctionSpeedDial';
import AppLayout from '../components/layout/AppLayout';
import AuctionDetailScreen from '../pages/AuctionDetailScreen';
import AllAuctionsScreen from '../pages/AllAuctionsScreen';
import CreateProductScreen from '../pages/CreateProductScreen';
import ForgotPasswordScreen from '../pages/ForgotPasswordScreen';
import ForgotPasswordVerificationScreen from '../pages/ForgotPasswordVerificationScreen';
import HomeScreen from '../pages/HomeScreen';
import LoginScreen from '../pages/LoginScreen';
import MyActivityScreen from '../pages/MyActivityScreen';
import PaymentMethodsScreen from '../pages/PaymentMethodsScreen';
import PenaltyPaymentScreen from '../pages/PenaltyPaymentScreen';
import ProductCatalogScreen from '../pages/ProductCatalogScreen';
import ProfileScreen from '../pages/ProfileScreen';
import ResetPasswordScreen from '../pages/ResetPasswordScreen';
import SignUpAuthorizingScreen from '../pages/SignUpAuthorizingScreen';
import SignUpFinalScreen from '../pages/SignUpFinalScreen';
import SignUpScreen from '../pages/SignUpScreen';
import SignUpVerificationScreen from '../pages/SignUpVerificationScreen';
import SplashScreen from '../pages/SplashScreen';

const ROUTES = {
  auctionDetail: 'auctionDetail',
  auctions: 'auctions',
  createProduct: 'createProduct',
  forgotPassword: 'forgotPassword',
  forgotPasswordVerification: 'forgotPasswordVerification',
  home: 'home',
  login: 'login',
  myActivity: 'myActivity',
  penaltyPayment: 'penaltyPayment',
  productCatalog: 'productCatalog',
  profile: 'profile',
  resetPassword: 'resetPassword',
  signUp: 'signUp',
  signUpAuthorizing: 'signUpAuthorizing',
  signUpFinal: 'signUpFinal',
  signUpVerification: 'signUpVerification',
  paymentMethods: 'paymentMethods',
  splash: 'splash',
};

const ROUTE_PATHS = {
  [ROUTES.auctionDetail]: '/subasta',
  [ROUTES.auctions]: '/auctions',
  [ROUTES.createProduct]: '/products/new',
  [ROUTES.forgotPassword]: '/forgot-password',
  [ROUTES.forgotPasswordVerification]: '/forgot-password/verification',
  [ROUTES.home]: '/home',
  [ROUTES.login]: '/login',
  [ROUTES.myActivity]: '/my-activity',
  [ROUTES.penaltyPayment]: '/penalty-payment',
  [ROUTES.productCatalog]: '/products',
  [ROUTES.profile]: '/profile',
  [ROUTES.resetPassword]: '/reset-password',
  [ROUTES.signUp]: '/sign-up',
  [ROUTES.signUpAuthorizing]: '/sign-up-authorizing',
  [ROUTES.signUpFinal]: '/sign-up-final',
  [ROUTES.signUpVerification]: '/sign-up-verification',
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
  const [routeHistory, setRouteHistory] = useState([]);
  const [registrationEmail, setRegistrationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [selectedAuction, setSelectedAuction] = useState(null);

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
    let cancelled = false;

    async function init() {
      await Promise.all([
        new Promise((resolve) => setTimeout(resolve, 1800)),
        loadSession(),
      ]);

      if (cancelled) return;

      const { getSession } = await import('../utils/session');
      const session = getSession();

      setIsLoading(false);
      setCurrentRoute((prev) =>
        prev === ROUTES.splash
          ? session ? ROUTES.home : ROUTES.login
          : prev
      );
    }

    init();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return undefined;
    }

    const handlePopState = () => {
      const routeInfo = getCurrentRouteInfo();
      setCurrentRoute(routeInfo.route);
      setIsLoading(false);
      setRouteHistory([]);
    };

    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!isLoading && currentRoute !== ROUTES.splash) {
      updateBrowserRoute(currentRoute, true);
    }
  }, [currentRoute, isLoading]);

  useEffect(() => {
    if (
      !isLoading &&
      currentRoute === ROUTES.auctionDetail &&
      !selectedAuction
    ) {
      navigateTo(ROUTES.auctions, { replace: true });
    }
  }, [currentRoute, isLoading, selectedAuction]);

  useEffect(() => {
    if (currentRoute !== ROUTES.auctionDetail && selectedAuction) {
      setSelectedAuction(null);
    }
  }, [currentRoute, selectedAuction]);

  function navigateTo(route, options = {}) {
    if (route === currentRoute) {
      return;
    }

    setIsLoading(false);
    if (!options.replace && currentRoute !== ROUTES.splash) {
      setRouteHistory((currentHistory) => [...currentHistory, currentRoute]);
    }
    setCurrentRoute(route);
    updateBrowserRoute(route, options.replace);
  }

  function getFallbackBackRoute(route) {
    if (route === ROUTES.forgotPassword) {
      return ROUTES.login;
    }

    if (route === ROUTES.forgotPasswordVerification) {
      return ROUTES.forgotPassword;
    }

    if (route === ROUTES.resetPassword) {
      return ROUTES.forgotPasswordVerification;
    }

    if (route === ROUTES.signUp) {
      return ROUTES.login;
    }

    if (route === ROUTES.signUpAuthorizing) {
      return ROUTES.signUp;
    }

    if (route === ROUTES.signUpFinal) {
      return ROUTES.signUpVerification;
    }

    if (route === ROUTES.signUpVerification) {
      return ROUTES.signUpAuthorizing;
    }

    if (route === ROUTES.paymentMethods) {
      return ROUTES.signUpFinal;
    }

    if (route === ROUTES.penaltyPayment) {
      return ROUTES.myActivity;
    }

    if (route === ROUTES.createProduct) {
      return ROUTES.auctions;
    }

    if (route === ROUTES.auctionDetail) {
      return ROUTES.auctions;
    }

    if (
      route === ROUTES.auctions ||
      route === ROUTES.productCatalog ||
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
    updateBrowserRoute(previousRoute, true);
  }

  function handleAuctionPress(auction) {
    setSelectedAuction(auction);
    navigateTo(ROUTES.auctionDetail);
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

    if (itemId === 'catalogo') {
      navigateTo(ROUTES.productCatalog);
    }
  }

  if (isLoading || !fontsLoaded || currentRoute === ROUTES.splash) {
    return <SplashScreen />;
  }

  const layoutVariant =
    currentRoute === ROUTES.login ||
    currentRoute === ROUTES.forgotPassword ||
    currentRoute === ROUTES.forgotPasswordVerification ||
    currentRoute === ROUTES.resetPassword ||
    currentRoute === ROUTES.signUp ||
    currentRoute === ROUTES.signUpAuthorizing ||
    currentRoute === ROUTES.signUpVerification ||
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
          : currentRoute === ROUTES.auctionDetail
          ? 'subastas'
          : currentRoute === ROUTES.createProduct
          ? 'subastas'
          : currentRoute === ROUTES.productCatalog
          ? 'catalogo'
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
        currentRoute === ROUTES.auctions ? (
          <AuctionSpeedDial
            onCreateProduct={() => navigateTo(ROUTES.createProduct)}
          />
        ) : null
      }
      onBackPress={canNavigateBack ? handleBackPress : undefined}
      onNavItemPress={handleNavItemPress}
      showLogo={currentRoute !== ROUTES.home}
      showNotifications={layoutVariant !== 'auth'}
      variant={layoutVariant}
    >
      {currentRoute === ROUTES.auctionDetail ? (
        selectedAuction ? <AuctionDetailScreen /> : null
      ) : currentRoute === ROUTES.auctions ? (
        <AllAuctionsScreen onAuctionPress={handleAuctionPress} />
      ) : currentRoute === ROUTES.createProduct ? (
        <CreateProductScreen
          onSubmitSuccess={() => navigateTo(ROUTES.productCatalog)}
        />
      ) : currentRoute === ROUTES.productCatalog ? (
        <ProductCatalogScreen />
      ) : currentRoute === ROUTES.home ? (
        <HomeScreen
          onAuctionPress={handleAuctionPress}
          onViewAllAuctions={() => navigateTo(ROUTES.auctions)}
        />
      ) : currentRoute === ROUTES.myActivity ? (
        <MyActivityScreen onPayPenalty={() => navigateTo(ROUTES.penaltyPayment)} />
      ) : currentRoute === ROUTES.penaltyPayment ? (
        <PenaltyPaymentScreen onPaid={() => navigateTo(ROUTES.myActivity)} />
      ) : currentRoute === ROUTES.profile ? (
        <ProfileScreen onLogout={() => {
          import('../utils/session').then(({ clearSession }) => clearSession());
          navigateTo(ROUTES.login, { replace: true });
        }} />
      ) : currentRoute === ROUTES.forgotPassword ? (
        <ForgotPasswordScreen
          onCodeSent={({ email }) => {
            setRecoveryEmail(email);
            setRecoveryCode('');
            navigateTo(ROUTES.forgotPasswordVerification);
          }}
        />
      ) : currentRoute === ROUTES.forgotPasswordVerification ? (
        <ForgotPasswordVerificationScreen
          email={recoveryEmail}
          onVerified={({ code }) => {
            setRecoveryCode(code);
            navigateTo(ROUTES.resetPassword);
          }}
        />
      ) : currentRoute === ROUTES.resetPassword ? (
        <ResetPasswordScreen
          code={recoveryCode}
          email={recoveryEmail}
          onFinish={() => navigateTo(ROUTES.login, { replace: true })}
        />
      ) : currentRoute === ROUTES.signUpAuthorizing ? (
        <SignUpAuthorizingScreen
          onAuthorized={() => navigateTo(ROUTES.signUpVerification)}
        />
      ) : currentRoute === ROUTES.signUpVerification ? (
        <SignUpVerificationScreen
          email={registrationEmail}
          onVerified={({ code }) => {
            setVerificationCode(code);
            navigateTo(ROUTES.signUpFinal);
          }}
        />
      ) : currentRoute === ROUTES.signUpFinal ? (
        <SignUpFinalScreen
          code={verificationCode}
          email={registrationEmail}
          onSubmitSuccess={() => navigateTo(ROUTES.paymentMethods)}
        />
      ) : currentRoute === ROUTES.paymentMethods ? (
        <PaymentMethodsScreen onContinue={() => navigateTo(ROUTES.home)} />
      ) : currentRoute === ROUTES.signUp ? (
        <SignUpScreen
          onSubmitSuccess={({ email }) => {
            setRegistrationEmail(email);
            navigateTo(ROUTES.signUpAuthorizing);
          }}
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
