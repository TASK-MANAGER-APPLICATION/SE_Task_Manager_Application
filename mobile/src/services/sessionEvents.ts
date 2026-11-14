type SessionExpiredListener = () => void;

const sessionExpiredListeners = new Set<SessionExpiredListener>();
let expiredAccessToken: string | null = null;
let expirationInProgress: {
  accessToken: string;
  promise: Promise<void>;
} | null = null;

export function subscribeToSessionExpired(
  listener: SessionExpiredListener
): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

export function notifySessionExpired(): void {
  for (const listener of sessionExpiredListeners) {
    listener();
  }
}

export function clearSessionAndNotifyOnce(
  accessToken: string,
  expireSession: () => Promise<boolean>
): Promise<void> {
  if (expiredAccessToken === accessToken) {
    return Promise.resolve();
  }

  if (expirationInProgress?.accessToken === accessToken) {
    return expirationInProgress.promise;
  }

  const promise = expireSession()
    .then((expired) => {
      if (expired && expirationInProgress?.promise === promise) {
        expiredAccessToken = accessToken;
        notifySessionExpired();
      }
    })
    .finally(() => {
      if (expirationInProgress?.promise === promise) {
        expirationInProgress = null;
      }
    });

  expirationInProgress = { accessToken, promise };
  return promise;
}

export function resetSessionExpired(): void {
  expiredAccessToken = null;
  expirationInProgress = null;
}
