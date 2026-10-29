import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';

const SERVICE_NAME = 'task-manager-auth';
const WEB_STORAGE_KEY = 'task-manager-auth-session';

export type Session = {
  accessToken: string;
  refreshToken?: string;
};

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
      return session;
    }
  } catch {
    return null;
  }

  return null;
}

export async function saveSession(session: Session): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(session));
    }
    return;
  }

  await Keychain.setGenericPassword(
    'task-manager-user',
    JSON.stringify(session),
    {
      service: SERVICE_NAME,
    }
  );
}

export async function getSession(): Promise<Session | null> {
  if (Platform.OS === 'web') {
    try {
      return typeof localStorage === 'undefined'
        ? null
        : parseSession(localStorage.getItem(WEB_STORAGE_KEY));
    } catch {
      return null;
    }
  }

  const credentials = await Keychain.getGenericPassword({
    service: SERVICE_NAME,
  });

  if (!credentials) {
    return null;
  }

  return parseSession(credentials.password);
}

export async function clearSession(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(WEB_STORAGE_KEY);
    }
    return;
  }

  await Keychain.resetGenericPassword({
    service: SERVICE_NAME,
  });
}
