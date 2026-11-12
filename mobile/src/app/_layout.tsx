import {
  DarkTheme,
  DefaultTheme,
  router,
  Stack,
  ThemeProvider,
  usePathname,
} from 'expo-router';
import { useEffect, useState, useSyncExternalStore } from 'react';

import * as SplashScreen from 'expo-splash-screen';

import { Platform, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { getSession } from '@/services/authStorage';
import { subscribeToSessionExpired } from '@/services/sessionEvents';

SplashScreen.preventAutoHideAsync();

const subscribeToHydration = () => () => {};
const getHydratedSnapshot = () => true;
const getServerHydratedSnapshot = () => Platform.OS !== 'web';

type RouteAuthCheck = {
  pathname: string;
  authenticated: boolean;
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const webHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot
  );
  const [routeAuthCheck, setRouteAuthCheck] =
    useState<RouteAuthCheck | null>(null);

  const themeColorScheme =
    Platform.OS === 'web' && !webHydrated ? 'light' : colorScheme;
  const isAuthEntryScreen =
    pathname === '/login' || pathname === '/register';

  useEffect(() => {
    if (isAuthEntryScreen) {
      return;
    }

    return subscribeToSessionExpired(() => {
      setRouteAuthCheck({ pathname, authenticated: false });
      router.replace('/login');
    });
  }, [isAuthEntryScreen, pathname]);

  useEffect(() => {
    let active = true;

    if (isAuthEntryScreen) {
      return () => {
        active = false;
      };
    }

    getSession()
      .then((session) => {
        if (!active) {
          return;
        }

        const authenticated = Boolean(session?.accessToken);
        setRouteAuthCheck({ pathname, authenticated });

        if (!authenticated) {
          router.replace('/login');
        }
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setRouteAuthCheck({ pathname, authenticated: false });
        router.replace('/login');
      });

    return () => {
      active = false;
    };
  }, [isAuthEntryScreen, pathname]);

  const isStackScreen =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/change-password' ||
    pathname === '/create-task' ||
    pathname.startsWith('/task/');

  const routeInitializationComplete =
    routeAuthCheck?.pathname === pathname;
  const splashReady =
    isAuthEntryScreen || routeInitializationComplete;
  const canRenderScreen =
    isAuthEntryScreen ||
    (routeAuthCheck?.pathname === pathname &&
      routeAuthCheck.authenticated);

  return (
    <ThemeProvider
      value={
        themeColorScheme === 'dark'
          ? DarkTheme
          : DefaultTheme
      }
    >
      <AnimatedSplashOverlay ready={splashReady} />

      {!canRenderScreen ? null : isStackScreen ? (
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      ) : (
        <AppTabs />
      )}
    </ThemeProvider>
  );
}
