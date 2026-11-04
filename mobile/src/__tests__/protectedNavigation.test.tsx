import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { router, usePathname } from 'expo-router';

import RootLayout from '../app/_layout';
import { clearSession, getSession } from '../services/authStorage';
import { getTasks } from '../services/api';

jest.mock('expo-router', () => ({
  DarkTheme: {},
  DefaultTheme: {},
  router: { replace: jest.fn() },
  Stack: () => null,
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  usePathname: jest.fn(),
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
}));

jest.mock('@/components/animated-icon', () => ({
  AnimatedSplashOverlay: () => null,
}));

jest.mock('@/components/app-tabs', () => ({
  __esModule: true,
  default: () => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>Protected app screen</Text>;
  },
}));

jest.mock('../services/authStorage', () => ({
  getSession: jest.fn(),
  clearSession: jest.fn().mockResolvedValue(undefined),
}));

describe('protected navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('redirects an unauthenticated user away from a protected screen', async () => {
    jest.mocked(usePathname).mockReturnValue('/home');
    jest.mocked(getSession).mockResolvedValue(null);

    const screen = await render(<RootLayout />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/login');
    });
    expect(screen.queryByText('Protected app screen')).toBeNull();
  });

  test('renders a protected screen when the stored session exists', async () => {
    jest.mocked(usePathname).mockReturnValue('/home');
    jest.mocked(getSession).mockResolvedValue({ accessToken: 'valid-session' });

    const screen = await render(<RootLayout />);

    expect(await screen.findByText('Protected app screen')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });

  test('redirects from an already-mounted protected screen when the API expires the session', async () => {
    jest.mocked(usePathname).mockReturnValue('/home');
    jest.mocked(getSession).mockResolvedValue({ accessToken: 'expired-session' });
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: 401,
      ok: false,
      json: async () => ({
        code: 'SESSION_EXPIRED',
        message: 'Session expired.',
      }),
    } as Response);

    const screen = await render(<RootLayout />);
    expect(await screen.findByText('Protected app screen')).toBeTruthy();

    await act(async () => {
      await expect(getTasks()).rejects.toMatchObject({
        code: 'SESSION_EXPIRED',
        status: 401,
      });
    });

    await waitFor(() => {
      expect(clearSession).toHaveBeenCalledTimes(1);
      expect(router.replace).toHaveBeenCalledWith('/login');
      expect(screen.queryByText('Protected app screen')).toBeNull();
    });
  });

  test('keeps login accessible without reading the session', async () => {
    jest.mocked(usePathname).mockReturnValue('/login');

    await render(<RootLayout />);

    expect(getSession).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
