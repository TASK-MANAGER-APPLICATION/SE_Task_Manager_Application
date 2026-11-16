import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ApiError, requestPasswordReset } from '../services/api';
import { isValidEmail } from '../services/registrationValidation';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    const normalizedEmail = email.trim();
    if (!isValidEmail(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await requestPasswordReset(normalizedEmail);
      setSent(true);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to send the request. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>Enter your account email and we’ll send a reset link if an account matches.</Text>
        {sent ? (
          <Text accessibilityRole="status" style={styles.success}>
            If an account matches that email, a password reset link will be sent.
          </Text>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              accessibilityLabel="Email"
              style={styles.input}
              value={email}
              onChangeText={(value) => { setEmail(value); setError(''); }}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={() => void handleSubmit()}
            />
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <Pressable accessibilityRole="button" style={[styles.button, loading && styles.disabled]} onPress={() => void handleSubmit()} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Send Reset Link</Text>}
            </Pressable>
          </View>
        )}
        <Pressable accessibilityRole="button" style={styles.linkButton} onPress={() => router.replace('/login')}>
          <Text style={styles.linkText}>Back to Login</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { color: '#20243A', fontSize: 30, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#666666', fontSize: 15, lineHeight: 22, marginBottom: 24 },
  form: { width: '100%' },
  label: { color: '#20243A', fontSize: 15, fontWeight: '600', marginBottom: 8 },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#CCCCCC', borderRadius: 8, paddingHorizontal: 14, fontSize: 16 },
  error: { color: '#B42318', fontSize: 13, marginTop: 8 },
  success: { color: '#237A4B', fontSize: 15, lineHeight: 22 },
  button: { minHeight: 48, marginTop: 22, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#222222' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  linkButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  linkText: { color: '#414966', fontSize: 15, fontWeight: '600' },
});
