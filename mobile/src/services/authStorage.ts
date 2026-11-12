import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';
import { resetSessionExpired } from './sessionEvents';

const SERVICE_NAME = 'task-manager-auth';
const WEB_STORAGE_KEY = 'task-manager-auth-session';

export type Session = {
  accessToken: string;
  refreshToken?: string;
  user?: {
    id: number | string;
    email: string;
    name: string;
  };
};

let cachedSession: Session | null = null;
let hasCachedSession = false;
let pendingSessionRead: Promise<Session | null> | null = null;
let sessionRevision = 0;
let pendingStorageMutation: Promise<void> = Promise.resolve();

function enqueueStorageMutation(
  mutation: () => Promise<void>
): Promise<void> {
  const operation = pendingStorageMutation.then(mutation, mutation);
  pendingStorageMutation = operation.then(
    () => undefined,
    () => undefined
  );
  return operation;
}

function parseSession(value: string | null): Session | null {
  if (!value) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'accessToken' in parsed &&
      typeof parsed.accessToken === 'string'
    ) {
      const session: Session = { accessToken: parsed.accessToken };

      if (
        'refreshToken' in parsed &&
        typeof parsed.refreshToken === 'string'
      ) {
        session.refreshToken = parsed.refreshToken;
      }

      if (
        'user' in parsed &&
        typeof parsed.user === 'object' &&
        parsed.user !== null &&
        'id' in parsed.user &&
        'email' in parsed.user &&
        'name' in parsed.user &&
        (typeof parsed.user.id === 'number' || typeof parsed.user.id === 'string') &&
        typeof parsed.user.email === 'string' &&
        typeof parsed.user.name === 'string'
      ) {
        session.user = {
          id: parsed.user.id,
          email: parsed.user.email,
          name: parsed.user.name,
        };
      }
      return session;
    }
  } catch {
    return null;
  }

  return null;
}

export async function saveSession(session: Session): Promise<void> {
  const revision = ++sessionRevision;
  cachedSession = session;
  hasCachedSession = true;

  if (Platform.OS === 'web') {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(session));
      }
    } catch (error) {
      if (sessionRevision === revision) {
        hasCachedSession = false;
        cachedSession = null;
      }
      throw error;
    }
    resetSessionExpired();
    return;
  }

  try {
    await enqueueStorageMutation(async () => {
      await Keychain.setGenericPassword(
        'task-manager-user',
        JSON.stringify(session),
        {
          service: SERVICE_NAME,
        }
      );
    });
  } catch (error) {
    if (sessionRevision === revision) {
      hasCachedSession = false;
      cachedSession = null;
    }
    throw error;
  }
  resetSessionExpired();
}

export async function getSession(): Promise<Session | null> {
  if (hasCachedSession) {
    return cachedSession;
  }

  if (pendingSessionRead) {
    return pendingSessionRead;
  }

  const revision = sessionRevision;
  const readPromise = (async () => {
    let session: Session | null;

    if (Platform.OS === 'web') {
      try {
        session =
          typeof localStorage === 'undefined'
            ? null
            : parseSession(localStorage.getItem(WEB_STORAGE_KEY));
      } catch {
        session = null;
      }
    } else {
      const credentials = await Keychain.getGenericPassword({
        service: SERVICE_NAME,
      });

      session = credentials
        ? parseSession(credentials.password)
        : null;
    }

    if (sessionRevision !== revision) {
      pendingSessionRead = null;
      return getSession();
    }

    cachedSession = session;
    hasCachedSession = true;
    return session;
  })().finally(() => {
    if (pendingSessionRead === readPromise) {
      pendingSessionRead = null;
    }
  });

  pendingSessionRead = readPromise;
  return readPromise;
}

export async function clearSession(): Promise<void> {
  const revision = ++sessionRevision;
  cachedSession = null;
  hasCachedSession = true;

  if (Platform.OS === 'web') {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(WEB_STORAGE_KEY);
      }
    } catch (error) {
      if (sessionRevision === revision) {
        cachedSession = null;
        hasCachedSession = true;
      }
      throw error;
    }
    return;
  }

  try {
    await enqueueStorageMutation(async () => {
      await Keychain.resetGenericPassword({
        service: SERVICE_NAME,
      });
    });
  } catch (error) {
    if (sessionRevision === revision) {
      cachedSession = null;
      hasCachedSession = true;
    }
    throw error;
  }
}
