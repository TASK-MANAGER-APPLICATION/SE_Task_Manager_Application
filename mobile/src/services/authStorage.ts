import * as Keychain from 'react-native-keychain';

const SERVICE_NAME = 'task-manager-auth';

export type Session = {
  accessToken: string;
  refreshToken?: string;
};

export async function saveSession(session: Session): Promise<void> {
  await Keychain.setGenericPassword(
    'task-manager-user',
    JSON.stringify(session),
    {
      service: SERVICE_NAME,
    }
  );
}

export async function getSession(): Promise<Session | null> {
  const credentials = await Keychain.getGenericPassword({
    service: SERVICE_NAME,
  });

  if (!credentials) {
    return null;
  }

  try {
    return JSON.parse(credentials.password) as Session;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await Keychain.resetGenericPassword({
    service: SERVICE_NAME,
  });
}