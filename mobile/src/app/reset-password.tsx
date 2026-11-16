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
import { router, useLocalSearchParams } from 'expo-router';

import { ApiError, resetPassword } from '../services/api';
import { validateResetPasswordForm } from '../services/registrationValidation';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
      setError('This password reset link is invalid or has expired.');
      return;
    }
    const errors = validateResetPasswordForm(password, confirmation);
    if (errors.password || errors.confirmPassword) {
      setValidationError(errors.password || errors.confirmPassword || '');
      return;
    }
    setValidationError('');
    setError('');
    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to reset your password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Reset Password</Text>
        {success ? (
          <>
            <Text accessibilityRole="status" style={styles.success}>Your password has been reset. Log in with your new password.</Text>
            <Pressable accessibilityRole="button" style={styles.button} onPress={() => router.replace('/login')}>
              <Text style={styles.buttonText}>Go to Login</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.form}>
            <Text style={styles.subtitle}>Choose a strong new password for your account.</Text>
            <Text style={styles.label}>New Password</Text>
            <TextInput accessibilityLabel="New Password" style={styles.input} value={password} onChangeText={(value) => { setPassword(value); setValidationError(''); }} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!loading} />
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput accessibilityLabel="Confirm Password" style={styles.input} value={confirmation} onChangeText={(value) => { setConfirmation(value); setValidationError(''); }} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!loading} returnKeyType="done" onSubmitEditing={() => void handleSubmit()} />
            {validationError ? <Text accessibilityRole="alert" style={styles.error}>{validationError}</Text> : null}
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <Pressable accessibilityRole="button" style={[styles.button, loading && styles.disabled]} onPress={() => void handleSubmit()} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Reset Password</Text>}
            </Pressable>
          </View>
        )}
        {!success ? <Pressable accessibilityRole="button" style={styles.linkButton} onPress={() => router.replace('/login')}><Text style={styles.linkText}>Back to Login</Text></Pressable> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { color: '#20243A', fontSize: 30, fontWeight: '700', marginBottom: 20 },
  subtitle: { color: '#666666', fontSize: 15, lineHeight: 22, marginBottom: 12 },
  form: { width: '100%' },
  label: { color: '#20243A', fontSize: 15, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#CCCCCC', borderRadius: 8, paddingHorizontal: 14, fontSize: 16 },
  error: { color: '#B42318', fontSize: 13, marginTop: 8 },
  success: { color: '#237A4B', fontSize: 15, lineHeight: 22 },
  button: { minHeight: 48, marginTop: 22, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#222222' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  linkButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  linkText: { color: '#414966', fontSize: 15, fontWeight: '600' },
});
