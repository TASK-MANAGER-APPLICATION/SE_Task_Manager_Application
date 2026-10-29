import React, { useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { router } from 'expo-router';

import {
  RegistrationErrors,
  validateRegistrationForm,
} from '../services/registrationValidation';

import { ApiError, register } from '../services/api';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [formError, setFormError] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  function validateForm(): boolean {
    const newErrors = validateRegistrationForm(
      name,
      email,
      password,
      confirmPassword
    );

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  }

  function showRegistrationError(title: string, message: string) {
    if (Platform.OS === 'web') {
      setFormError({ title, message });
      return;
    }

    Alert.alert(title, message);
  }

  async function handleRegister() {
    if (loading) {
      return;
    }

    setFormError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await register(
        email.trim(),
        password,
        name.trim()
      );

      Alert.alert(
        'Registration successful',
        'Your account has been created. Please log in.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/login'),
          },
        ]
      );
    } catch (error: unknown) {
      const code = error instanceof ApiError ? error.code : undefined;

      if (code === 'EMAIL_EXISTS') {
        setErrors({
          email: 'An account with this email already exists.',
        });
      } else if (code === 'WEAK_PASSWORD') {
        setErrors({
          password: 'Password does not meet the requirements.',
        });
      } else if (code === 'INVALID_EMAIL') {
        setErrors({
          email: 'Please enter a valid email address.',
        });
      } else if (code === 'NETWORK_ERROR') {
        showRegistrationError(
          'Server unavailable',
          'Unable to connect to the server. Please make sure the backend server is running and try again.'
        );
      } else {
        showRegistrationError(
          'Registration failed',
          'Something went wrong on the server. Please try again.'
        );
      }
    } finally {
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
          <Text style={styles.title}>Create Account</Text>

          <Text style={styles.subtitle}>
            Register to start using Task Manager
          </Text>
        </View>

        {formError ? (
          <View style={styles.backendError}>
            <Text style={styles.backendErrorTitle}>{formError.title}</Text>
            <Text style={styles.backendErrorMessage}>{formError.message}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          {/* Name */}
          <Text style={styles.label}>Name</Text>

          <TextInput
            style={[
              styles.input,
              errors.name && styles.inputError,
            ]}
            placeholder="Enter your name"
            value={name}
            onChangeText={(value) => {
              setName(value);

              if (errors.name) {
                setErrors((previous) => ({
                  ...previous,
                  name: undefined,
                }));
              }
            }}
            autoCapitalize="words"
            editable={!loading}
          />

          {errors.name ? (
            <Text style={styles.error}>{errors.name}</Text>
          ) : null}

          {/* Email */}
          <Text style={styles.label}>Email</Text>

          <TextInput
            style={[
              styles.input,
              errors.email && styles.inputError,
            ]}
            placeholder="Enter your email"
            value={email}
            onChangeText={(value) => {
              setEmail(value);

              if (errors.email) {
                setErrors((previous) => ({
                  ...previous,
                  email: undefined,
                }));
              }
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          {errors.email ? (
            <Text style={styles.error}>{errors.email}</Text>
          ) : null}

          {/* Password */}
          <Text style={styles.label}>Password</Text>

          <TextInput
            style={[
              styles.input,
              errors.password && styles.inputError,
            ]}
            placeholder="Enter your password"
            value={password}
            onChangeText={(value) => {
              setPassword(value);

              if (errors.password) {
                setErrors((previous) => ({
                  ...previous,
                  password: undefined,
                }));
              }
            }}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <Text style={styles.passwordHint}>
            Minimum 8 characters with uppercase, lowercase, number,
            and special character.
          </Text>

          {errors.password ? (
            <Text style={styles.error}>{errors.password}</Text>
          ) : null}

          {/* Confirm Password */}
          <Text style={styles.label}>Confirm Password</Text>

          <TextInput
            style={[
              styles.input,
              errors.confirmPassword && styles.inputError,
            ]}
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChangeText={(value) => {
              setConfirmPassword(value);

              if (errors.confirmPassword) {
                setErrors((previous) => ({
                  ...previous,
                  confirmPassword: undefined,
                }));
              }
            }}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          {errors.confirmPassword ? (
            <Text style={styles.error}>
              {errors.confirmPassword}
            </Text>
          ) : null}

          {/* Register */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>
                Register
              </Text>
            )}
          </Pressable>

          {/* Login link */}
          <Pressable
            style={styles.loginButton}
            onPress={() => router.push('/login')}
            disabled={loading}
          >
            <Text style={styles.loginText}>
              Already have an account? Login
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
    backgroundColor: '#ffffff',
  },

  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
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

  backendError: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFF1F1',
    borderWidth: 1,
    borderColor: '#F1C5C5',
  },

  backendErrorTitle: {
    color: '#A52A2A',
    fontSize: 14,
    fontWeight: '700',
  },

  backendErrorMessage: {
    color: '#8A4444',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 19,
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
    borderColor: '#cccccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },

  inputError: {
    borderColor: '#cc3333',
  },

  error: {
    color: '#cc3333',
    fontSize: 13,
    marginTop: 5,
  },

  passwordHint: {
    color: '#666666',
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
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
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  loginButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },

  loginText: {
    fontSize: 15,
  },
});
