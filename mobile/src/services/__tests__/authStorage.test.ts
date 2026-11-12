import type * as KeychainTypes from 'react-native-keychain';

jest.mock('react-native-keychain', () => ({
  STORAGE_TYPE: { AES_GCM_NO_AUTH: 'KeystoreAESGCM_NoAuth' },
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
  setGenericPassword: jest.fn(),
}));

type AuthStorage = typeof import('../authStorage');
type KeychainModule = typeof import('react-native-keychain');

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

let authStorage: AuthStorage;
let keychain: KeychainModule;
let platform: typeof import('react-native').Platform;
let originalPlatformOS: string;
let originalLocalStorageDescriptor: PropertyDescriptor | undefined;

describe('auth session cache', () => {
  beforeEach(() => {
    jest.resetModules();
    keychain = jest.requireMock<KeychainModule>('react-native-keychain');
    platform =
      jest.requireActual<typeof import('react-native')>(
        'react-native'
      ).Platform;
    authStorage = jest.requireActual<AuthStorage>('../authStorage');
    originalPlatformOS = platform.OS;
    originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      'localStorage'
    );
    Object.defineProperty(platform, 'OS', {
      configurable: true,
      value: 'android',
    });
    jest.mocked(keychain.getGenericPassword).mockResolvedValue(false);
    jest.mocked(keychain.resetGenericPassword).mockResolvedValue(false);
    jest.mocked(keychain.setGenericPassword).mockResolvedValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(platform, 'OS', {
      configurable: true,
      value: originalPlatformOS,
    });

    if (originalLocalStorageDescriptor) {
      Object.defineProperty(
        globalThis,
        'localStorage',
        originalLocalStorageDescriptor
      );
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });

  test('coalesces concurrent secure-storage reads and caches the result', async () => {
    jest.mocked(keychain.getGenericPassword).mockResolvedValue({
      username: 'task-manager-user',
      password: JSON.stringify({ accessToken: 'cached-token' }),
      service: 'task-manager-auth',
      storage: keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    });

    await expect(
      Promise.all([
        authStorage.getSession(),
        authStorage.getSession(),
      ])
    ).resolves.toEqual([
      { accessToken: 'cached-token' },
      { accessToken: 'cached-token' },
    ]);
    await expect(authStorage.getSession()).resolves.toEqual({
      accessToken: 'cached-token',
    });
    expect(keychain.getGenericPassword).toHaveBeenCalledTimes(1);
  });

  test('uses the saved and cleared session without rereading storage', async () => {
    const session = { accessToken: 'replacement-token' };

    await authStorage.saveSession(session);
    await expect(authStorage.getSession()).resolves.toEqual(session);
    await authStorage.clearSession();
    await expect(authStorage.getSession()).resolves.toBeNull();
    expect(keychain.getGenericPassword).not.toHaveBeenCalled();
  });

  test('does not restore a persisted native session after clearing fails', async () => {
    const persistedSession = { accessToken: 'persisted-token' };
    const storageError = new Error('Keychain clear failed');
    jest.mocked(keychain.getGenericPassword).mockResolvedValue({
      username: 'task-manager-user',
      password: JSON.stringify(persistedSession),
      service: 'task-manager-auth',
      storage: keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    });
    jest.mocked(keychain.resetGenericPassword).mockRejectedValue(storageError);

    await expect(authStorage.getSession()).resolves.toEqual(persistedSession);
    await expect(authStorage.clearSession()).rejects.toBe(storageError);

    await expect(authStorage.getSession()).resolves.toBeNull();
    expect(keychain.getGenericPassword).toHaveBeenCalledTimes(1);
  });

  test('does not restore a persisted web session after clearing fails', async () => {
    const persistedSession = { accessToken: 'persisted-web-token' };
    const storageError = new Error('Web storage clear failed');
    const localStorageMock = {
      getItem: jest.fn().mockReturnValue(JSON.stringify(persistedSession)),
      removeItem: jest.fn().mockImplementation(() => {
        throw storageError;
      }),
      setItem: jest.fn(),
    };
    Object.defineProperty(platform, 'OS', {
      configurable: true,
      value: 'web',
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: localStorageMock,
    });

    await expect(authStorage.getSession()).resolves.toEqual(persistedSession);
    await expect(authStorage.clearSession()).rejects.toBe(storageError);

    await expect(authStorage.getSession()).resolves.toBeNull();
    expect(localStorageMock.getItem).toHaveBeenCalledTimes(1);
    expect(localStorageMock.removeItem).toHaveBeenCalledTimes(1);
  });

  test('does not replace a newer session with a stale in-flight read', async () => {
    let resolveRead!: (
      credentials: KeychainTypes.UserCredentials | false
    ) => void;
    jest.mocked(keychain.getGenericPassword).mockReturnValue(
      new Promise((resolve) => {
        resolveRead = resolve;
      })
    );

    const pendingSession = authStorage.getSession();
    await authStorage.saveSession({ accessToken: 'new-token' });
    resolveRead({
      username: 'task-manager-user',
      password: JSON.stringify({ accessToken: 'old-token' }),
      service: 'task-manager-auth',
      storage: keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    });

    await expect(pendingSession).resolves.toEqual({
      accessToken: 'new-token',
    });
    await expect(authStorage.getSession()).resolves.toEqual({
      accessToken: 'new-token',
    });
    expect(keychain.getGenericPassword).toHaveBeenCalledTimes(1);
  });

  test('persists concurrent saves in invocation order', async () => {
    let persistedPassword: string | null = null;
    const firstStarted = deferred<void>();
    const secondStarted = deferred<void>();
    const firstWrite = deferred<KeychainTypes.UserCredentials | false>();
    const secondWrite = deferred<KeychainTypes.UserCredentials | false>();

    jest.mocked(keychain.setGenericPassword)
      .mockImplementationOnce((_username, password) => {
        firstStarted.resolve();
        return firstWrite.promise.then((result) => {
          persistedPassword = password;
          return result;
        });
      })
      .mockImplementationOnce((_username, password) => {
        secondStarted.resolve();
        return secondWrite.promise.then((result) => {
          persistedPassword = password;
          return result;
        });
      });

    const firstSave = authStorage.saveSession({ accessToken: 'first' });
    await firstStarted.promise;
    const secondSave = authStorage.saveSession({ accessToken: 'second' });

    expect(keychain.setGenericPassword).toHaveBeenCalledTimes(1);
    await expect(authStorage.getSession()).resolves.toEqual({
      accessToken: 'second',
    });

    firstWrite.resolve(false);
    await secondStarted.promise;
    secondWrite.resolve(false);
    await Promise.all([firstSave, secondSave]);

    expect(JSON.parse(persistedPassword!).accessToken).toBe('second');
    await expect(authStorage.getSession()).resolves.toEqual({
      accessToken: 'second',
    });
  });

  test('persists a clear requested after a save', async () => {
    let persistedPassword: string | null = null;
    const saveStarted = deferred<void>();
    const clearStarted = deferred<void>();
    const saveWrite = deferred<KeychainTypes.UserCredentials | false>();
    const clearWrite = deferred<boolean>();

    jest.mocked(keychain.setGenericPassword).mockImplementation(
      (_username, password) => {
        saveStarted.resolve();
        return saveWrite.promise.then((result) => {
          persistedPassword = password;
          return result;
        });
      }
    );
    jest.mocked(keychain.resetGenericPassword).mockImplementation(() => {
      clearStarted.resolve();
      return clearWrite.promise.then((result) => {
        persistedPassword = null;
        return result;
      });
    });

    const save = authStorage.saveSession({ accessToken: 'saved' });
    await saveStarted.promise;
    const clear = authStorage.clearSession();

    expect(keychain.resetGenericPassword).not.toHaveBeenCalled();
    await expect(authStorage.getSession()).resolves.toBeNull();

    saveWrite.resolve(false);
    await clearStarted.promise;
    clearWrite.resolve(true);
    await Promise.all([save, clear]);

    expect(persistedPassword).toBeNull();
    await expect(authStorage.getSession()).resolves.toBeNull();
  });

  test('persists a save requested after a clear', async () => {
    let persistedPassword: string | null = JSON.stringify({
      accessToken: 'previous',
    });
    const clearStarted = deferred<void>();
    const saveStarted = deferred<void>();
    const clearWrite = deferred<boolean>();
    const saveWrite = deferred<KeychainTypes.UserCredentials | false>();

    jest.mocked(keychain.resetGenericPassword).mockImplementation(() => {
      clearStarted.resolve();
      return clearWrite.promise.then((result) => {
        persistedPassword = null;
        return result;
      });
    });
    jest.mocked(keychain.setGenericPassword).mockImplementation(
      (_username, password) => {
        saveStarted.resolve();
        return saveWrite.promise.then((result) => {
          persistedPassword = password;
          return result;
        });
      }
    );

    const clear = authStorage.clearSession();
    await clearStarted.promise;
    const save = authStorage.saveSession({ accessToken: 'new' });

    expect(keychain.setGenericPassword).not.toHaveBeenCalled();
    await expect(authStorage.getSession()).resolves.toEqual({
      accessToken: 'new',
    });

    clearWrite.resolve(true);
    await saveStarted.promise;
    saveWrite.resolve(false);
    await Promise.all([clear, save]);

    expect(JSON.parse(persistedPassword!).accessToken).toBe('new');
    await expect(authStorage.getSession()).resolves.toEqual({
      accessToken: 'new',
    });
  });

  test('continues with a newer mutation after an older write fails', async () => {
    let persistedPassword: string | null = null;
    const firstStarted = deferred<void>();
    const secondStarted = deferred<void>();
    const firstWrite = deferred<KeychainTypes.UserCredentials | false>();
    const secondWrite = deferred<KeychainTypes.UserCredentials | false>();

    jest.mocked(keychain.setGenericPassword)
      .mockImplementationOnce((_username, password) => {
        firstStarted.resolve();
        return firstWrite.promise.then((result) => {
          persistedPassword = password;
          return result;
        });
      })
      .mockImplementationOnce((_username, password) => {
        secondStarted.resolve();
        return secondWrite.promise.then((result) => {
          persistedPassword = password;
          return result;
        });
      });

    const failedSave = authStorage.saveSession({ accessToken: 'old' });
    const failedSaveExpectation = expect(failedSave).rejects.toThrow(
      'storage failure'
    );
    await firstStarted.promise;
    const successfulSave = authStorage.saveSession({
      accessToken: 'current',
    });

    firstWrite.reject(new Error('storage failure'));
    await failedSaveExpectation;
    await secondStarted.promise;
    secondWrite.resolve(false);
    await successfulSave;

    expect(JSON.parse(persistedPassword!).accessToken).toBe('current');
    await expect(authStorage.getSession()).resolves.toEqual({
      accessToken: 'current',
    });
  });
});
