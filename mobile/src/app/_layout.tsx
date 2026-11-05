import {
  DarkTheme,
  DefaultTheme,
  router,
  Stack,
  ThemeProvider,
  usePathname,
} from 'expo-router';
import { useEffect, useState } from 'react';

import * as SplashScreen from 'expo-splash-screen';

import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { getSession } from '@/services/authStorage';
import { subscribeToSessionExpired } from '@/services/sessionEvents';

SplashScreen.preventAutoHideAsync();

type RouteAuthCheck = {
  pathname: string;
  authenticated: boolean;
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const [routeAuthCheck, setRouteAuthCheck] =
    useState<RouteAuthCheck | null>(null);

  const isPublicScreen =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register';

  useEffect(() => {
    if (isPublicScreen) {
      return;
    }

    return subscribeToSessionExpired(() => {
      setRouteAuthCheck({ pathname, authenticated: false });
      router.replace('/login');
    });
  }, [isPublicScreen, pathname]);

  useEffect(() => {
    let active = true;

    if (isPublicScreen) {
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
  }, [isPublicScreen, pathname]);

  const isStackScreen =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/change-password' ||
    pathname === '/create-task' ||
    pathname.startsWith('/task/');

  const canRenderScreen =
    isPublicScreen ||
    (routeAuthCheck?.pathname === pathname &&
      routeAuthCheck.authenticated);

  return (
    <ThemeProvider
      value={
        colorScheme === 'dark'
          ? DarkTheme
          : DefaultTheme
      }
    >
      <AnimatedSplashOverlay />

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
