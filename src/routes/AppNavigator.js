import { useEffect, useRef, useState } from 'react';
import { useFonts } from 'expo-font';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';

import { useNotifications } from '../context/NotificationsContext';
import { hasRole, loadSession } from '../utils/session';

import AuctionSpeedDial from '../components/auctions/AuctionSpeedDial';
import AppLayout from '../components/layout/AppLayout';
import { ProfileIcon, VerifyIcon } from '../components/layout/BottomNavigation';
import AuctionDetailScreen from '../pages/auctions/AuctionDetailScreen';
import AuctionProductScreen from '../pages/auctions/AuctionProductScreen';
import AllAuctionsScreen from '../pages/auctions/AllAuctionsScreen';
import CreateAuctionScreen from '../pages/CreateAuctionScreen';
import CreateProductScreen from '../pages/products/CreateProductScreen';
import EmployeeDashboardScreen from '../pages/admin/EmployeeDashboardScreen';
import ForgotPasswordScreen from '../pages/auth/ForgotPasswordScreen';
import ForgotPasswordVerificationScreen from '../pages/auth/ForgotPasswordVerificationScreen';
import HomeScreen from '../pages/home/HomeScreen';
import LoginScreen from '../pages/auth/LoginScreen';
import MyActivityScreen from '../pages/activity/MyActivityScreen';
import PaymentMethodsScreen from '../pages/signup/PaymentMethodsScreen';
import PenaltyPaymentScreen from '../pages/activity/PenaltyPaymentScreen';
import ProductCatalogScreen from '../pages/products/ProductCatalogScreen';
import ProfileScreen from '../pages/profile/ProfileScreen';
import ResetPasswordScreen from '../pages/auth/ResetPasswordScreen';
import SignUpAuthorizingScreen from '../pages/signup/SignUpAuthorizingScreen';
import SignUpFinalScreen from '../pages/signup/SignUpFinalScreen';
import SignUpScreen from '../pages/signup/SignUpScreen';
import SignUpVerificationScreen from '../pages/signup/SignUpVerificationScreen';
import SplashScreen from '../pages/splash/SplashScreen';
const ROUTES = {
  auctionDetail: 'auctionDetail',
  auctionProduct: 'auctionProduct',
  auctions: 'auctions',
  createAuction: 'createAuction',
  createProduct: 'createProduct',
  employeeDashboard: 'employeeDashboard',
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
  [ROUTES.auctionProduct]: '/subasta/producto',
  [ROUTES.auctions]: '/auctions',
  [ROUTES.createAuction]: '/auctions/new',
  [ROUTES.createProduct]: '/products/new',
  [ROUTES.employeeDashboard]: '/empleados',
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

const EMPLOYEE_NAV_ITEMS = [
  { id: 'employeeVerify', icon: VerifyIcon, label: 'Verificar' },
  { id: 'employeeProfile', icon: ProfileIcon, label: 'Perfil' },
];

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
  const [registrationCategory, setRegistrationCategory] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [selectedAuctionProduct, setSelectedAuctionProduct] = useState(null);
  const [employeeActiveTab, setEmployeeActiveTab] = useState('verify');

  const { connect, disconnect } = useNotifications();
  const connectRef = useRef(connect);
  const disconnectRef = useRef(disconnect);
  connectRef.current = connect;
  disconnectRef.current = disconnect;
  const isSubastador = hasRole('subastador');
  const isEmployee = hasRole('empleado');
  const canCreateProduct = !isSubastador;
  const hiddenBottomNavItemIds = isSubastador ? ['actividad'] : [];

  const [selectedPenalty, setSelectedPenalty] = useState(null);
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
    if (!fontsLoaded) {
      return undefined;
    }

    const frame = requestAnimationFrame(() => {
      ExpoSplashScreen.hideAsync().catch(() => {});
    });

    return () => cancelAnimationFrame(frame);
  }, [fontsLoaded]);

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
          ? session ? (session.roles?.includes('empleado') ? ROUTES.employeeDashboard : ROUTES.home) : ROUTES.login
          : prev
      );
      if (session) {
        connectRef.current();
      }
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
    if (
      currentRoute !== ROUTES.auctionDetail &&
      currentRoute !== ROUTES.auctionProduct &&
      selectedAuction
    ) {
      setSelectedAuction(null);
    }
  }, [currentRoute, selectedAuction]);

  useEffect(() => {
    if (currentRoute !== ROUTES.penaltyPayment && selectedPenalty) {
      setSelectedPenalty(null);
    }
  }, [currentRoute, selectedPenalty]);

  useEffect(() => {
    if (
      !isLoading &&
      currentRoute === ROUTES.auctionProduct &&
      !selectedAuctionProduct
    ) {
      navigateTo(
        selectedAuction ? ROUTES.auctionDetail : ROUTES.auctions,
        { replace: true }
      );
    }
  }, [currentRoute, isLoading, selectedAuction, selectedAuctionProduct]);

  useEffect(() => {
    if (currentRoute !== ROUTES.auctionProduct && selectedAuctionProduct) {
      setSelectedAuctionProduct(null);
    }
  }, [currentRoute, selectedAuctionProduct]);

  useEffect(() => {
    if (!isLoading && currentRoute === ROUTES.createAuction && !isSubastador) {
      navigateTo(ROUTES.auctions, { replace: true });
    }

    if (
      !isLoading &&
      isEmployee &&
      currentRoute !== ROUTES.employeeDashboard &&
      currentRoute !== ROUTES.login &&
      currentRoute !== ROUTES.forgotPassword &&
      currentRoute !== ROUTES.forgotPasswordVerification &&
      currentRoute !== ROUTES.resetPassword
    ) {
      navigateTo(ROUTES.employeeDashboard, { replace: true });
    }

    if (!isLoading && currentRoute === ROUTES.createProduct && !canCreateProduct) {
      navigateTo(ROUTES.productCatalog, { replace: true });
    }

    if (
      !isLoading &&
      isSubastador &&
      (currentRoute === ROUTES.myActivity ||
        currentRoute === ROUTES.penaltyPayment)
    ) {
      navigateTo(ROUTES.home, { replace: true });
    }
  }, [canCreateProduct, currentRoute, isEmployee, isLoading, isSubastador]);

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

    if (route === ROUTES.createAuction) {
      return ROUTES.auctions;
    }

    if (route === ROUTES.createProduct) {
      return ROUTES.productCatalog;
    }

    if (route === ROUTES.auctionDetail) {
      return ROUTES.auctions;
    }

    if (route === ROUTES.auctionProduct) {
      return ROUTES.auctionDetail;
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

  function handleAuctionProductPress(product) {
    setSelectedAuctionProduct(product);
    navigateTo(ROUTES.auctionProduct);
  }

  function handleNavItemPress(itemId) {
    if (itemId === 'employeeVerify') {
      setEmployeeActiveTab('verify');
      return;
    }

    if (itemId === 'employeeProfile') {
      setEmployeeActiveTab('profile');
      return;
    }

    if (itemId === 'inicio') {
      navigateTo(ROUTES.home);
    }

    if (itemId === 'perfil') {
      navigateTo(ROUTES.profile);
    }

    if (itemId === 'subastas') {
      navigateTo(ROUTES.auctions);
    }

    if (itemId === 'actividad' && !isSubastador) {
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
      : currentRoute === ROUTES.employeeDashboard
      ? 'admin'
      : 'app';
  const canNavigateBack =
    currentRoute !== ROUTES.login &&
    (
      routeHistory.length > 0 ||
      Boolean(getFallbackBackRoute(currentRoute))
    );

  return (
    <AppLayout
      activeItem={
        currentRoute === ROUTES.employeeDashboard
          ? employeeActiveTab === 'profile'
            ? 'employeeProfile'
            : 'employeeVerify'
          : currentRoute === ROUTES.auctions ||
        currentRoute === ROUTES.createAuction ||
        currentRoute === ROUTES.auctionDetail ||
        currentRoute === ROUTES.auctionProduct
          ? 'subastas'
          : currentRoute === ROUTES.createProduct ||
            currentRoute === ROUTES.productCatalog
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
      bottomNavigationItems={
        currentRoute === ROUTES.employeeDashboard ? EMPLOYEE_NAV_ITEMS : undefined
      }
      hiddenBottomNavItemIds={hiddenBottomNavItemIds}
      floatingAction={
        (currentRoute === ROUTES.auctions && isSubastador) ||
        (currentRoute === ROUTES.productCatalog && canCreateProduct) ? (
          <AuctionSpeedDial
            onCreateAuction={
              currentRoute === ROUTES.auctions && isSubastador
                ? () => navigateTo(ROUTES.createAuction)
                : undefined
            }
            onCreateProduct={
              currentRoute === ROUTES.productCatalog && canCreateProduct
                ? () => navigateTo(ROUTES.createProduct)
                : undefined
            }
          />
        ) : null
      }
      onBackPress={canNavigateBack ? handleBackPress : undefined}
      onNavItemPress={handleNavItemPress}
      showLogo={currentRoute !== ROUTES.home}
      showNotifications={layoutVariant !== 'auth'}
      variant={layoutVariant}
    >
      {currentRoute === ROUTES.auctionProduct ? (
        selectedAuctionProduct ? (
          <AuctionProductScreen product={selectedAuctionProduct} />
        ) : null
      ) : currentRoute === ROUTES.auctionDetail ? (
        selectedAuction ? (
          <AuctionDetailScreen
            auction={selectedAuction}
            onProductPress={handleAuctionProductPress}
          />
        ) : null
      ) : currentRoute === ROUTES.auctions ? (
        <AllAuctionsScreen isSubastador={isSubastador} onAuctionPress={handleAuctionPress} />
      ) : currentRoute === ROUTES.createAuction ? (
        <CreateAuctionScreen onSubmitSuccess={() => navigateTo(ROUTES.auctions)} />
      ) : currentRoute === ROUTES.createProduct ? (
        <CreateProductScreen
          onSubmitSuccess={() => navigateTo(ROUTES.productCatalog)}
        />
      ) : currentRoute === ROUTES.productCatalog ? (
        <ProductCatalogScreen
          canCreateProduct={canCreateProduct}
          isSubastador={isSubastador}
          onCreateProduct={() => navigateTo(ROUTES.createProduct)}
          onGoAuctions={() => navigateTo(ROUTES.auctions)}
          onGoHome={() => navigateTo(ROUTES.home)}
        />
      ) : currentRoute === ROUTES.home ? (
        <HomeScreen
          onAuctionPress={handleAuctionPress}
          onViewAllAuctions={() => navigateTo(ROUTES.auctions)}
        />
      ) : currentRoute === ROUTES.myActivity ? (
        <MyActivityScreen onPayPenalty={(multa) => { setSelectedPenalty(multa); navigateTo(ROUTES.penaltyPayment); }} />
      ) : currentRoute === ROUTES.penaltyPayment ? (
        <PenaltyPaymentScreen multa={selectedPenalty} onPaid={() => navigateTo(ROUTES.myActivity)} />
      ) : currentRoute === ROUTES.profile ? (
        <ProfileScreen onLogout={() => {
          disconnect();
          import('../utils/session').then(({ clearSession }) => clearSession());
          navigateTo(ROUTES.login, { replace: true });
        }} />
      ) : currentRoute === ROUTES.employeeDashboard ? (
        <EmployeeDashboardScreen
          activeTab={employeeActiveTab}
          onLogout={() => {
            disconnect();
            navigateTo(ROUTES.login, { replace: true });
          }}
        />
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
          category={registrationCategory}
          onAuthorized={() => navigateTo(ROUTES.signUpVerification)}
        />
      ) : currentRoute === ROUTES.signUpVerification ? (
        <SignUpVerificationScreen
          email={registrationEmail}
          onVerified={({ category, code, email }) => {
            if (email) {
              setRegistrationEmail(email);
            }
            if (category) {
              setRegistrationCategory(category);
            }
            setVerificationCode(code);
            navigateTo(ROUTES.signUpFinal);
          }}
        />
      ) : currentRoute === ROUTES.signUpFinal ? (
        <SignUpFinalScreen
          code={verificationCode}
          email={registrationEmail}
          onSubmitSuccess={() => navigateTo(ROUTES.login, { replace: true })}
        />
      ) : currentRoute === ROUTES.paymentMethods ? (
        <PaymentMethodsScreen onContinue={() => navigateTo(ROUTES.home)} />
      ) : currentRoute === ROUTES.signUp ? (
        <SignUpScreen
          onSubmitSuccess={({ email, categoria, pendingApproval }) => {
            setRegistrationEmail(email);
            setRegistrationCategory(categoria || '');
            navigateTo(pendingApproval ? ROUTES.login : ROUTES.signUpAuthorizing, { replace: Boolean(pendingApproval) });
          }}
        />
      ) : (
        <LoginScreen
          onForgotPasswordPress={() => navigateTo(ROUTES.forgotPassword)}
          onLoginSuccess={() => {
            if (hasRole('empleado')) {
              connect();
              navigateTo(ROUTES.employeeDashboard, { replace: true });
            } else {
              connect();
              navigateTo(ROUTES.home);
            }
          }}
          onRegisterPress={() => navigateTo(ROUTES.signUp)}
          onSetPasswordPress={() => {
            setRegistrationEmail('');
            setVerificationCode('');
            navigateTo(ROUTES.signUpVerification);
          }}
        />
      )}
    </AppLayout>
  );
}
