import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ApiError, changePassword } from '../services/api';
import { clearSession } from '../services/authStorage';
import {
  ChangePasswordErrors,
  validateChangePasswordForm,
} from '../services/registrationValidation';

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<ChangePasswordErrors>({});
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (saving) return;
    setFormError('');
    setSuccessMessage('');
    const validationErrors = validateChangePasswordForm(
      currentPassword,
      newPassword,
      confirmPassword
    );
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
      setSuccessMessage('Password changed successfully!');
      await clearSession();
      Alert.alert(
        'Password changed',
        'Your password was changed. Please log in again.',
        [{ text: 'Log in', onPress: () => router.replace('/login') }]
      );
    } catch (error) {
      if (error instanceof ApiError && error.code === 'SESSION_EXPIRED') {
        return;
      } else if (
        error instanceof ApiError &&
        error.code === 'INVALID_CREDENTIALS'
      ) {
        setErrors({ currentPassword: 'Current password is incorrect.' });
      } else if (error instanceof ApiError && error.code === 'WEAK_PASSWORD') {
        setErrors({ newPassword: error.message });
      } else {
        setFormError(
          error instanceof ApiError
            ? error.message
            : 'Unable to change your password. Please try again.'
        );
      }
    } finally {
      setSaving(false);
    }
  }

  function renderPasswordField(
    label: string,
    placeholder: string,
    value: string,
    onChangeText: (value: string) => void,
    field: keyof ChangePasswordErrors
  ) {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={[styles.input, errors[field] && styles.inputError]}
          accessibilityLabel={label}
          placeholder={placeholder}
          value={value}
          onChangeText={(text) => {
            onChangeText(text);
            if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
          }}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!saving}
        />
        {errors[field] ? <Text style={styles.error}>{errors[field]}</Text> : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable
          accessibilityRole="button"
          style={styles.backButton}
          onPress={() => router.replace('/profile' as never)}
          disabled={saving}
        >
          <Text style={styles.backText}>Back to Profile</Text>
        </Pressable>
        <Text style={styles.title}>Change Password</Text>
        <Text style={styles.subtitle}>Choose a strong password for your account.</Text>
        {formError ? <Text accessibilityRole="alert" style={styles.error}>{formError}</Text> : null}
        {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}
        {renderPasswordField('Current Password', 'Enter current password', currentPassword, setCurrentPassword, 'currentPassword')}
        {renderPasswordField('New Password', 'Enter new password', newPassword, setNewPassword, 'newPassword')}
        {renderPasswordField('Confirm New Password', 'Re-enter new password', confirmPassword, setConfirmPassword, 'confirmPassword')}
        <Pressable
          accessibilityRole="button"
          style={[styles.button, saving && styles.disabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Update Password</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6F7FB' },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', padding: 24 },
  title: { color: '#20243A', fontSize: 28, fontWeight: '800', marginBottom: 8 },
  backButton: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center', marginBottom: 8 },
  backText: { color: '#5968D8', fontWeight: '700' },
  subtitle: { color: '#7B8195', fontSize: 14, marginBottom: 18 },
  field: { marginTop: 14 },
  label: { color: '#34394E', fontSize: 14, fontWeight: '700', marginBottom: 7 },
  input: { minHeight: 48, backgroundColor: '#FFFFFF', borderColor: '#DDE1ED', borderWidth: 1, borderRadius: 9, paddingHorizontal: 13, fontSize: 15, color: '#20243A' },
  inputError: { borderColor: '#CC3333' },
  error: { color: '#B42318', fontSize: 13, marginTop: 6 },
  success: { color: '#237A4B', fontSize: 13, marginTop: 6 },
  button: { minHeight: 48, marginTop: 24, backgroundColor: '#5968D8', borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
