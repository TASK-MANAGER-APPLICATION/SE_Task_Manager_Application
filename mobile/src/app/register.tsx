import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type FormErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
}

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  function validateForm(): boolean {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required.';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!isValidEmail(email.trim())) {
      newErrors.email = 'Enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (!isStrongPassword(password)) {
      newErrors.password =
        'Password must be at least 8 characters with uppercase, lowercase, and a number.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  }

  async function handleRegister() {
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      /*
       * Backend registration endpoint will be connected
       * after the backend/API contract is finalized.
       */
      await new Promise((resolve) => setTimeout(resolve, 500));

      setSuccessMessage(
        'Registration form is valid. Backend integration is pending.'
      );
    } catch {
      setSuccessMessage('');
      setErrors({
        email: 'Unable to complete registration. Please try again.',
      });
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

        <View style={styles.form}>
          <Text style={styles.label}>Name</Text>

          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            placeholder="Enter your name"
            value={name}
            onChangeText={(value) => {
              setName(value);
              setSuccessMessage('');
            }}
            autoCapitalize="words"
          />

          {errors.name && <Text style={styles.error}>{errors.name}</Text>}

          <Text style={styles.label}>Email</Text>

          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            placeholder="Enter your email"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setSuccessMessage('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {errors.email && <Text style={styles.error}>{errors.email}</Text>}

          <Text style={styles.label}>Password</Text>

          <TextInput
            style={[styles.input, errors.password && styles.inputError]}
            placeholder="Enter your password"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setSuccessMessage('');
            }}
            secureTextEntry
            autoCapitalize="none"
          />

          {errors.password && (
            <Text style={styles.error}>{errors.password}</Text>
          )}

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
              setSuccessMessage('');
            }}
            secureTextEntry
            autoCapitalize="none"
          />

          {errors.confirmPassword && (
            <Text style={styles.error}>{errors.confirmPassword}</Text>
          )}

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
              <Text style={styles.buttonText}>Register</Text>
            )}
          </Pressable>

          {successMessage ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}
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
    marginBottom: 32,
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
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
  button: {
    marginTop: 28,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
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
  successBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#e8f7ee',
    borderWidth: 1,
    borderColor: '#9ed5b2',
  },
  successText: {
    color: '#176b35',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});