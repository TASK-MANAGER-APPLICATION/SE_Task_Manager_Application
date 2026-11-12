jest.mock('../authStorage', () => ({
  clearSession: jest.fn(),
  getSession: jest.fn().mockResolvedValue(null),
}));

jest.mock('../sessionEvents', () => ({
  clearSessionAndNotifyOnce: jest.fn(),
}));

type ApiClient = typeof import('../api');
type ReactNativePlatform = typeof import('react-native').Platform;

let apiClient: ApiClient;
let originalBaseUrl: string | undefined;
let originalLegacyUrl: string | undefined;
let originalPlatformOS: ReactNativePlatform['OS'];
let platformInstances: ReactNativePlatform[];

function loadApiClient(platformOS: ReactNativePlatform['OS'] = 'android') {
  jest.resetModules();

  const platform =
    jest.requireActual<typeof import('react-native')>(
      'react-native'
    ).Platform;
  platformInstances.push(platform);
  Object.defineProperty(platform, 'OS', {
    configurable: true,
    value: platformOS,
  });

  apiClient = jest.requireActual<ApiClient>('../api');
}

function mockSuccessfulResponse() {
  return jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    status: 200,
    ok: true,
    json: async () => ({ token: 'test-token', user: {} }),
  } as Response);
}

describe('API base URL', () => {
  beforeEach(() => {
    originalBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    originalLegacyUrl = process.env.EXPO_PUBLIC_API_URL;
    const originalPlatform =
      jest.requireActual<typeof import('react-native')>(
        'react-native'
      ).Platform;
    originalPlatformOS = originalPlatform.OS;
    platformInstances = [originalPlatform];

    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    delete process.env.EXPO_PUBLIC_API_URL;
    loadApiClient();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    for (const platform of platformInstances) {
      Object.defineProperty(platform, 'OS', {
        configurable: true,
        value: originalPlatformOS,
      });
    }

    if (originalBaseUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_BASE_URL;
    } else {
      process.env.EXPO_PUBLIC_API_BASE_URL = originalBaseUrl;
    }
    if (originalLegacyUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = originalLegacyUrl;
    }
  });

  test('uses the Android emulator host when no URL is configured', async () => {
    const fetch = mockSuccessfulResponse();

    await apiClient.apiRequest('/health');

    expect(fetch).toHaveBeenCalledWith(
      'http://10.0.2.2:3000/health',
      expect.any(Object)
    );
  });

  test('uses localhost on non-Android platforms when no URL is configured', async () => {
    loadApiClient('ios');
    const fetch = mockSuccessfulResponse();

    await apiClient.apiRequest('/health');

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/health',
      expect.any(Object)
    );
  });

  test('prefers EXPO_PUBLIC_API_BASE_URL over EXPO_PUBLIC_API_URL', async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'http://primary.example:3000';
    process.env.EXPO_PUBLIC_API_URL = 'http://fallback.example:3000';
    loadApiClient();
    const fetch = mockSuccessfulResponse();

    await apiClient.apiRequest('/health');

    expect(fetch).toHaveBeenCalledWith(
      'http://primary.example:3000/health',
      expect.any(Object)
    );
  });

  test('uses EXPO_PUBLIC_API_URL when the base URL is not configured', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://fallback.example:3000';
    loadApiClient();
    const fetch = mockSuccessfulResponse();

    await apiClient.apiRequest('/health');

    expect(fetch).toHaveBeenCalledWith(
      'http://fallback.example:3000/health',
      expect.any(Object)
    );
  });

  test('removes trailing slashes from the configured base URL', async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'http://api.example:3000///';
    loadApiClient();
    const fetch = mockSuccessfulResponse();

    await apiClient.apiRequest('/health');

    expect(fetch).toHaveBeenCalledWith(
      'http://api.example:3000/health',
      expect.any(Object)
    );
  });

  test('validates paginated task responses and includes page parameters', async () => {
    loadApiClient();
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        tasks: [{ id: 1, title: 'First task' }],
        hasMore: true,
      }),
    } as Response);

    await expect(apiClient.getTasks({
      limit: 50,
      offset: 100,
      sortBy: 'created_at',
      order: 'desc',
    })).resolves.toEqual({
      tasks: [{ id: 1, title: 'First task' }],
      hasMore: true,
    });

    expect(fetch).toHaveBeenCalledWith(
      'http://10.0.2.2:3000/tasks?sortBy=created_at&order=desc&limit=50&offset=100',
      expect.any(Object)
    );
  });

  test('reports a malformed task response instead of returning success-shaped data', async () => {
    loadApiClient();
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ unexpected: [] }),
    } as Response);

    await expect(apiClient.getTasks()).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
      status: 502,
    });
  });

  test('does not read the session for login requests', async () => {
    loadApiClient();
    const fetch = mockSuccessfulResponse();
    const { getSession } = jest.requireMock<
      typeof import('../authStorage')
    >('../authStorage');

    await apiClient.login('user@example.com', 'password');

    expect(fetch).toHaveBeenCalledWith(
      'http://10.0.2.2:3000/auth/login',
      expect.objectContaining({ method: 'POST' })
    );
    expect(getSession).not.toHaveBeenCalled();
  });
});
