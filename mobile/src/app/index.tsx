import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { getSession } from '../services/authStorage';

export default function Index() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        const session = await getSession();

        setAuthenticated(
          Boolean(session?.accessToken)
        );
      } catch {
        setAuthenticated(false);
      } finally {
        setCheckingSession(false);
      }
    }

    checkSession();
  }, []);

  if (checkingSession) {
    return null;
  }

  if (authenticated) {
    return <Redirect href="/home" />;
  }

  return <Redirect href="/login" />;
}
