import { apiRequest, login, logout } from '../api';
import { clearSession, getSession, saveSession } from '../authStorage';
import { subscribeToSessionExpired } from '../sessionEvents';

let mockStoredSession: { accessToken: string } | null = null;

jest.mock('../authStorage', () => ({
  getSession: jest.fn(async () => mockStoredSession),
  saveSession: jest.fn(async (session: { accessToken: string }) => {
    mockStoredSession = session;
  }),
  clearSession: jest.fn(async () => {
    mockStoredSession = null;
  }),
}));

describe('logout API client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoredSession = { accessToken: 'test-token' };
    jest.mocked(getSession).mockImplementation(async () => mockStoredSession);
    jest.mocked(saveSession).mockImplementation(async (session) => {
      mockStoredSession = session;
    });
    jest.mocked(clearSession).mockImplementation(async () => {
      mockStoredSession = null;
    });
  });
  afterEach(() => jest.restoreAllMocks());

  test('clears local auth only after the server confirms logout', async () => {
    jest.mocked(getSession).mockResolvedValue({ accessToken: 'test-token' });
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ status: 204, ok: true } as Response);

    await logout();

    expect(clearSession).toHaveBeenCalledTimes(1);
  });

  test('does not clear local auth when the server logout fails', async () => {
    jest.mocked(getSession).mockResolvedValue({ accessToken: 'test-token' });
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: 500,
      ok: false,
      json: async () => ({ code: 'INTERNAL_ERROR', message: 'Unable to log out right now.' }),
    } as Response);

    await expect(logout()).rejects.toMatchObject({ code: 'INTERNAL_ERROR', status: 500 });
    expect(clearSession).not.toHaveBeenCalled();
  });

  test('clears local auth when the backend reports an expired session', async () => {
    jest.mocked(getSession).mockResolvedValue({ accessToken: 'expired-token' });
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: 401,
      ok: false,
      json: async () => ({ code: 'SESSION_EXPIRED', message: 'Session expired.' }),
    } as Response);

    await expect(apiRequest('/tasks')).rejects.toMatchObject({
      code: 'SESSION_EXPIRED',
      status: 401,
    });
    expect(clearSession).toHaveBeenCalledTimes(1);
  });

  test('does not clear an existing session for invalid login credentials', async () => {
    jest.mocked(getSession).mockResolvedValue({ accessToken: 'existing-token' });
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: 401,
      ok: false,
      json: async () => ({
        code: 'INVALID_CREDENTIALS',
      }),
    } as Response);

    await expect(login('ada@example.com', 'incorrect')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      status: 401,
      message: 'Invalid email or password.',
    });

    const requestHeaders = new Headers(fetch.mock.calls[0]?.[1]?.headers);
    expect(requestHeaders.has('Authorization')).toBe(false);
    expect(clearSession).not.toHaveBeenCalled();
  });

  test('does not clear a newer session when an older request expires late', async () => {
    mockStoredSession = { accessToken: 'stale-token' };

    let resolveResponse!: (response: Response) => void;
    let signalFetchStarted!: () => void;
    const responsePromise = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    const fetchStarted = new Promise<void>((resolve) => {
      signalFetchStarted = resolve;
    });
    jest.spyOn(globalThis, 'fetch').mockImplementation(() => {
      signalFetchStarted();
      return responsePromise;
    });
    let expirationNotifications = 0;
    const unsubscribe = subscribeToSessionExpired(() => {
      expirationNotifications += 1;
    });

    const request = apiRequest('/tasks');
    await fetchStarted;
    await saveSession({ accessToken: 'new-session-token' });

    resolveResponse({
      status: 401,
      ok: false,
      json: async () => ({ code: 'SESSION_EXPIRED' }),
    } as Response);

    try {
      await expect(request).rejects.toMatchObject({
        code: 'SESSION_EXPIRED',
        status: 401,
      });

      expect(await getSession()).toEqual({ accessToken: 'new-session-token' });
      expect(clearSession).not.toHaveBeenCalled();
      expect(expirationNotifications).toBe(0);
    } finally {
      unsubscribe();
    }
  });
});
