import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  usePathname,
} from 'expo-router';

import * as SplashScreen from 'expo-splash-screen';

import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();

  const isAuthScreen =
    pathname === '/login' ||
    pathname === '/register';

  return (
    <ThemeProvider
      value={
        colorScheme === 'dark'
          ? DarkTheme
          : DefaultTheme
      }
    >
      <AnimatedSplashOverlay />

      {isAuthScreen ? (
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
