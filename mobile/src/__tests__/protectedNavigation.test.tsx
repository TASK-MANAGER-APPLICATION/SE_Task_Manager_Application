import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { router, usePathname } from 'expo-router';

import RootLayout from '../app/_layout';
import { clearSession, getSession, saveSession } from '../services/authStorage';
import { getTasks } from '../services/api';
import { notifySessionExpired } from '../services/sessionEvents';

let mockLoadTasksOnMount = false;
let mockStoredSession: { accessToken: string } | null = null;

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
    const React = jest.requireActual<typeof import('react')>('react');
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    const { getTasks } = jest.requireActual<typeof import('../services/api')>(
      '../services/api'
    );

    function ProtectedTabs() {
      React.useEffect(() => {
        if (mockLoadTasksOnMount) {
          void getTasks().catch(() => undefined);
        }
      }, []);

      return <Text>Protected app screen</Text>;
    }

    return <ProtectedTabs />;
  },
}));

jest.mock('../services/authStorage', () => ({
  getSession: jest.fn(async () => mockStoredSession),
  saveSession: jest.fn(async (session: { accessToken: string }) => {
    mockStoredSession = session;
  }),
  clearSession: jest.fn(async () => {
    mockStoredSession = null;
  }),
}));

describe('protected navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadTasksOnMount = false;
    mockStoredSession = null;
    jest.mocked(getSession).mockImplementation(async () => mockStoredSession);
    jest.mocked(saveSession).mockImplementation(async (session) => {
      mockStoredSession = session;
    });
    jest.mocked(clearSession).mockImplementation(async () => {
      mockStoredSession = null;
    });
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

  test('does not render protected tabs at the root for a signed-out user', async () => {
    jest.mocked(usePathname).mockReturnValue('/');
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

  test('redirects an authenticated root user when the session expires', async () => {
    jest.mocked(usePathname).mockReturnValue('/');
    jest.mocked(getSession).mockResolvedValue({ accessToken: 'root-session' });

    const screen = await render(<RootLayout />);
    expect(await screen.findByText('Protected app screen')).toBeTruthy();

    await act(async () => {
      notifySessionExpired();
    });

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/login');
      expect(screen.queryByText('Protected app screen')).toBeNull();
    });
  });

  test('cleans up the root session-expiry subscription on unmount', async () => {
    jest.mocked(usePathname).mockReturnValue('/');
    jest.mocked(getSession).mockResolvedValue({ accessToken: 'root-session' });

    const screen = await render(<RootLayout />);
    expect(await screen.findByText('Protected app screen')).toBeTruthy();
    await screen.unmount();

    await act(async () => {
      notifySessionExpired();
    });

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

  test('expires the session after navigating between protected screens', async () => {
    jest.mocked(usePathname).mockReturnValue('/home');
    jest.mocked(getSession).mockResolvedValue({ accessToken: 'navigation-token' });

    const screen = await render(<RootLayout />);
    expect(await screen.findByText('Protected app screen')).toBeTruthy();

    jest.mocked(usePathname).mockReturnValue('/profile');
    await screen.rerender(<RootLayout />);
    await waitFor(() => expect(getSession).toHaveBeenCalledTimes(2));

    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: 401,
      ok: false,
      json: async () => ({
        code: 'SESSION_EXPIRED',
        message: 'Session expired.',
      }),
    } as Response);

    await act(async () => {
      await expect(getTasks()).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
    });

    await waitFor(() => {
      expect(screen.queryByText('Protected app screen')).toBeNull();
      expect(router.replace).toHaveBeenCalledTimes(1);
      expect(router.replace).toHaveBeenCalledWith('/login');
    });
  });

  test('removes protected content after a stale stored session expires on app restart', async () => {
    jest.mocked(usePathname).mockReturnValue('/home');
    mockStoredSession = { accessToken: 'restart-expired-token' };
    mockLoadTasksOnMount = true;
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: 401,
      ok: false,
      json: async () => ({
        code: 'SESSION_EXPIRED',
        message: 'Session expired.',
      }),
    } as Response);

    const screen = await render(<RootLayout />);

    await waitFor(() => {
      expect(clearSession).toHaveBeenCalledTimes(1);
      expect(router.replace).toHaveBeenCalledTimes(1);
      expect(router.replace).toHaveBeenCalledWith('/login');
      expect(mockStoredSession).toBeNull();
      expect(screen.queryByText('Protected app screen')).toBeNull();
    });
  });

  test('keeps the new session and protected screen when an old request expires late', async () => {
    jest.mocked(usePathname).mockReturnValue('/home');
    mockStoredSession = { accessToken: 'old-startup-token' };

    const screen = await render(<RootLayout />);
    expect(await screen.findByText('Protected app screen')).toBeTruthy();

    let resolveResponse!: (response: Response) => void;
    const responsePromise = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    jest.spyOn(globalThis, 'fetch').mockReturnValue(responsePromise);

    const request = getTasks();
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    await act(async () => {
      await saveSession({ accessToken: 'new-session-token' });
    });

    resolveResponse({
      status: 401,
      ok: false,
      json: async () => ({
        code: 'SESSION_EXPIRED',
        message: 'Session expired.',
      }),
    } as Response);

    await act(async () => {
      await expect(request).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
    });

    expect(await getSession()).toEqual({ accessToken: 'new-session-token' });
    expect(clearSession).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.queryByText('Protected app screen')).toBeTruthy();
  });

  test('cleans up and redirects once for concurrent expired API requests', async () => {
    jest.mocked(usePathname).mockReturnValue('/home');
    jest.mocked(getSession).mockResolvedValue({ accessToken: 'concurrent-token' });
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
      await Promise.all([
        expect(getTasks()).rejects.toMatchObject({ code: 'SESSION_EXPIRED' }),
        expect(getTasks()).rejects.toMatchObject({ code: 'SESSION_EXPIRED' }),
        expect(getTasks()).rejects.toMatchObject({ code: 'SESSION_EXPIRED' }),
      ]);
    });

    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith('/login');
    expect(screen.queryByText('Protected app screen')).toBeNull();
  });

  test('keeps login accessible without reading the session', async () => {
    jest.mocked(usePathname).mockReturnValue('/login');

    await render(<RootLayout />);

    expect(getSession).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
