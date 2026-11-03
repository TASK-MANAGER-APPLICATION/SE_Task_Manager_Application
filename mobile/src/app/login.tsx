import React, { useRef, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { router } from 'expo-router';

import { ApiError, login } from '../services/api';
import { saveSession } from '../services/authStorage';

export default function LoginScreen({ onAuthenticated }: { onAuthenticated?: () => void } = {}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const submissionInProgress = useRef(false);

  function validateForm(): boolean {
    let valid = true;

    setEmailError('');
    setPasswordError('');
    setFormError(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setEmailError('Email is required.');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Enter a valid email address.');
      valid = false;
    }

    if (!password) {
      setPasswordError('Password is required.');
      valid = false;
    }

    return valid;
  }

  function showLoginError(title: string, message: string) {
    if (Platform.OS === 'web') {
      setFormError({ title, message });
      return;
    }

    Alert.alert(title, message);
  }

  async function handleLogin() {
    if (submissionInProgress.current || loading) return;
    if (!validateForm()) {
      return;
    }

    submissionInProgress.current = true;
    setLoading(true);

    try {
      const response = await login(
        email.trim(),
        password
      );

      await saveSession({
        accessToken: response.token,
        user: response.user,
      });

      if (onAuthenticated) onAuthenticated();
      else router.replace('/home');
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'INVALID_CREDENTIALS') {
          setPasswordError('Invalid email or password.');
        } else if (error.code === 'SESSION_EXPIRED') {
          showLoginError(
            'Session expired',
            'Your session has expired. Please log in again.'
          );
        } else if (error.code === 'NETWORK_ERROR') {
          showLoginError(
            'Server unavailable',
            'Unable to connect to the server. Please make sure the backend server is running and try again.'
          );
        } else {
          showLoginError(
            'Login failed',
            'Something went wrong on the server. Please try again.'
          );
        }
      } else {
        showLoginError(
          'Login failed',
          'Something went wrong on the server. Please try again.'
        );
      }
    } finally {
      submissionInProgress.current = false;
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>

          <Text style={styles.subtitle}>
            Login to continue using Task Manager
          </Text>
        </View>

        {formError ? (
          <View style={styles.formError}>
            <Text style={styles.formErrorTitle}>{formError.title}</Text>
            <Text style={styles.error}>{formError.message}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>

          <TextInput
            accessibilityLabel="Email"
            accessibilityHint={emailError || 'Enter your account email address.'}
            style={[
              styles.input,
              emailError && styles.inputError,
            ]}
            placeholder="Enter your email"
            value={email}
            onChangeText={(value) => {
              setEmail(value);

              if (emailError) {
                setEmailError('');
              }
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            returnKeyType="next"
          />

          {emailError ? (
            <Text style={styles.error}>
              {emailError}
            </Text>
          ) : null}

          <Text style={styles.label}>Password</Text>

          <TextInput
            accessibilityLabel="Password"
            accessibilityHint={passwordError || 'Enter your account password.'}
            style={[
              styles.input,
              passwordError && styles.inputError,
            ]}
            placeholder="Enter your password"
            value={password}
            onChangeText={(value) => {
              setPassword(value);

              if (passwordError) {
                setPasswordError('');
              }
            }}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          {passwordError ? (
            <Text style={styles.error}>
              {passwordError}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Login"
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                Login
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.registerButton}
            onPress={() => router.push('/register')}
            disabled={loading}
          >
            <Text style={styles.registerText}>
              Don&apos;t have an account? Register
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },

  header: {
    marginBottom: 24,
  },

  title: {
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 16,
    color: '#666666',
  },

  formError: {
    marginBottom: 12,
  },

  formErrorTitle: {
    color: '#CC3333',
    fontSize: 14,
    fontWeight: '700',
  },

  form: {
    width: '100%',
  },

  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },

  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },

  inputError: {
    borderColor: '#CC3333',
  },

  error: {
    color: '#CC3333',
    fontSize: 13,
    marginTop: 5,
  },

  button: {
    minHeight: 48,
    marginTop: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222222',
  },

  buttonPressed: {
    opacity: 0.8,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  registerButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },

  registerText: {
    fontSize: 15,
  },
});
