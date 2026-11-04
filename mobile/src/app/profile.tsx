import React, { useEffect, useState } from 'react';
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

import { ApiError, logout, User } from '../services/api';
import { clearSession, getSession, saveSession } from '../services/authStorage';
import { isValidEmail } from '../services/registrationValidation';

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [notice, setNotice] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  useEffect(() => {
    let active = true;
    getSession().then((session) => {
      if (!active) return;
      if (session?.user) {
        setUser(session.user);
        setName(session.user.name);
        setEmail(session.user.email);
      } else {
        setError('Profile information is unavailable. Please log in again.');
      }
    }).catch(() => {
      if (active) setError('Unable to load your profile. Please try again.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function handleSave() {
    if (saving) return;
    const normalizedName = name.trim();
    const normalizedEmail = email.trim();
    if (!normalizedName) {
      setValidationError('Name is required.');
      return;
    }
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      setValidationError('Enter a valid email address.');
      return;
    }

    setValidationError('');
    setError('');
    setNotice('');
    setSaving(true);
    try {
      const session = await getSession();
      if (!session) {
        await clearSession();
        router.replace('/login');
        return;
      }
      const updatedUser = { ...user!, name: normalizedName, email: normalizedEmail };
      await saveSession({ ...session, user: updatedUser });
      setUser(updatedUser);
      setName(updatedUser.name);
      setEmail(updatedUser.email);
      setEditing(false);
      setNotice('Profile updated on this device. Server profile editing is not available yet.');
    } catch {
      setError('Unable to save your profile on this device. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSessionExpired() {
    await clearSession();
    router.replace('/login');
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError('');
    try {
      await logout();
      router.replace('/login');
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'SESSION_EXPIRED') {
        return;
      }
      setLogoutError(cause instanceof ApiError
        ? cause.message
        : 'Unable to log out. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#5968D8" />
            <Text style={styles.muted}>Loading your profile...</Text>
          </View>
        ) : error && !user ? (
          <View style={styles.card}>
            <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
            <Pressable style={styles.secondaryButton} onPress={() => void handleSessionExpired()}>
              <Text style={styles.secondaryText}>Log in</Text>
            </Pressable>
          </View>
        ) : user ? (
          <>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>ID</Text>
              <Text style={styles.value}>{user.id}</Text>
              {editing ? (
                <>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <TextInput accessibilityLabel="Name" style={styles.input} value={name} onChangeText={setName} editable={!saving} />
                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput accessibilityLabel="Email" style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={!saving} />
                </>
              ) : (
                <>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <Text style={styles.value}>{user.name || 'Not provided'}</Text>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <Text style={styles.value}>{user.email || 'Not provided'}</Text>
                </>
              )}
              {validationError ? <Text accessibilityRole="alert" style={styles.error}>{validationError}</Text> : null}
              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
              {notice ? <Text style={styles.notice}>{notice}</Text> : null}
              {editing ? (
                <View style={styles.actions}>
                  <Pressable accessibilityRole="button" style={[styles.primaryButton, saving && styles.disabled]} onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Save Profile</Text>}
                  </Pressable>
                  <Pressable style={styles.secondaryButton} onPress={() => { setName(user.name); setEmail(user.email); setValidationError(''); setEditing(false); }} disabled={saving}>
                    <Text style={styles.secondaryText}>Cancel</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={() => { setNotice(''); setEditing(true); }}>
                  <Text style={styles.primaryText}>Edit Profile</Text>
                </Pressable>
              )}
            </View>
            <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={() => router.replace('/change-password' as never)}>
              <Text style={styles.secondaryText}>Change Password</Text>
            </Pressable>
            {logoutError ? <Text accessibilityRole="alert" style={styles.error}>{logoutError}</Text> : null}
            <Pressable
              accessibilityRole="button"
              style={[styles.logoutButton, loggingOut && styles.disabled]}
              onPress={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.logoutText}>Log out</Text>}
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6F7FB' },
  content: { width: '100%', maxWidth: 700, alignSelf: 'center', padding: 22, paddingBottom: 36 },
  title: { color: '#20243A', fontSize: 30, fontWeight: '800', marginBottom: 18 },
  loading: { alignItems: 'center', padding: 32, gap: 10 },
  muted: { color: '#7B8195', fontSize: 14 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E7E9F2', padding: 18 },
  fieldLabel: { color: '#777D91', fontSize: 12, fontWeight: '700', marginTop: 15, marginBottom: 5 },
  value: { color: '#20243A', fontSize: 16 },
  input: { minHeight: 48, backgroundColor: '#F6F7FB', borderWidth: 1, borderColor: '#DDE1ED', borderRadius: 8, paddingHorizontal: 12, color: '#20243A' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
  primaryButton: { minHeight: 48, minWidth: 130, paddingHorizontal: 15, backgroundColor: '#5968D8', borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  primaryText: { color: '#FFFFFF', fontWeight: '700' },
  secondaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: '#DDE1ED', marginTop: 12, alignSelf: 'flex-start' },
  logoutButton: { minHeight: 48, minWidth: 120, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 9, backgroundColor: '#A52A2A', marginTop: 16 },
  logoutText: { color: '#FFFFFF', fontWeight: '700' },
  secondaryText: { color: '#414966', fontWeight: '700' },
  error: { color: '#B42318', fontSize: 13, marginTop: 10 },
  notice: { color: '#237A4B', fontSize: 13, marginTop: 10 },
  disabled: { opacity: 0.6 },
});
