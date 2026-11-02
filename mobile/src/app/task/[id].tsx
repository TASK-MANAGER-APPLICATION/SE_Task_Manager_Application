import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { ApiError, completeTask, deleteTask, getTasks, Task, updateTask } from '../../services/api';
import { clearSession } from '../../services/authStorage';
import { validateTaskForm } from '../../services/taskFormValidation';

function displayDate(value: string | null | undefined) {
  if (!value) return 'Not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function isOverdue(task: Task) {
  return task.status !== 'Completed' && Boolean(task.due_at) &&
    Number.isFinite(Date.parse(task.due_at!)) && Date.parse(task.due_at!) < Date.now();
}

export default function TaskDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [categoryId, setCategoryId] = useState('');
  const [fieldError, setFieldError] = useState('');

  const handleSessionExpired = useCallback(async () => {
    await clearSession();
    router.replace('/login');
  }, []);

  const loadTask = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getTasks();
      const found = result.tasks.find((item) => String(item.id) === String(id));
      if (!found) {
        setTask(null);
        setError('This task could not be found.');
        return;
      }
      setTask(found);
      setTitle(found.title);
      setDescription(found.description ?? '');
      setDueAt(found.due_at ?? '');
      setPriority(found.priority ?? 'Medium');
      setCategoryId(found.category_id == null ? '' : String(found.category_id));
    } catch (cause) {
      if (cause instanceof ApiError && (cause.code === 'SESSION_EXPIRED' || cause.status === 401)) {
        await handleSessionExpired();
      } else {
        setError(cause instanceof ApiError ? cause.message : 'Unable to load this task. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [handleSessionExpired, id]);

  useEffect(() => {
    const timer = setTimeout(() => { void loadTask(); }, 0);
    return () => clearTimeout(timer);
  }, [loadTask]);

  async function saveTask() {
    if (!task || saving) return;
    const values = { title, description, due_at: dueAt, priority, category_id: categoryId };
    const validation = validateTaskForm(values);
    const message = validation.title || validation.due_at || validation.category_id;
    if (message) {
      setFieldError(message);
      return;
    }
    setFieldError('');
    setError('');
    setSaving(true);
    try {
      const result = await updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        due_at: dueAt.trim() || null,
        priority,
        category_id: categoryId.trim() || null,
      });
      setTask(result.task);
      setTitle(result.task.title);
      setDescription(result.task.description ?? '');
      setDueAt(result.task.due_at ?? '');
      setPriority(result.task.priority ?? 'Medium');
      setCategoryId(result.task.category_id == null ? '' : String(result.task.category_id));
      setEditing(false);
    } catch (cause) {
      if (cause instanceof ApiError && (cause.code === 'SESSION_EXPIRED' || cause.status === 401)) {
        await handleSessionExpired();
      } else {
        setError(cause instanceof ApiError ? cause.message : 'Unable to save this task. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function markComplete() {
    if (!task || saving || task.status === 'Completed') return;
    setSaving(true);
    setError('');
    try {
      const result = await completeTask(task.id);
      setTask(result.task);
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'ALREADY_COMPLETED') {
        await loadTask();
      } else if (cause instanceof ApiError && (cause.code === 'SESSION_EXPIRED' || cause.status === 401)) {
        await handleSessionExpired();
      } else {
        setError(cause instanceof ApiError ? cause.message : 'Unable to complete this task. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function removeTask() {
    if (!task || saving) return;
    setSaving(true);
    setError('');
    try {
      await deleteTask(task.id);
      router.replace('/home');
    } catch (cause) {
      if (cause instanceof ApiError && (cause.code === 'SESSION_EXPIRED' || cause.status === 401)) {
        await handleSessionExpired();
      } else {
        setError(cause instanceof ApiError ? cause.message : 'Unable to delete this task. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!task || saving) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Delete "${task.title}"?`)) void removeTask();
      return;
    }
    Alert.alert('Delete task', `Are you sure you want to delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void removeTask() },
    ]);
  }

  if (loading) {
    return <SafeAreaView style={styles.safeArea}><View style={styles.center}><ActivityIndicator size="large" color="#5968D8" /><Text style={styles.muted}>Loading task...</Text></View></SafeAreaView>;
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Text accessibilityRole="alert" style={styles.error}>{error || 'This task could not be found.'}</Text>
          <Pressable accessibilityRole="button" style={styles.button} onPress={() => void loadTask()}><Text style={styles.buttonText}>Retry</Text></Pressable>
          <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={() => router.replace('/home')}><Text style={styles.secondaryText}>Back to tasks</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" accessibilityLabel="Back to tasks" style={styles.back} onPress={() => router.replace('/home')} disabled={saving}><Text style={styles.backText}>Back to tasks</Text></Pressable>
        <Text style={styles.title}>{editing ? 'Edit Task' : task.title}</Text>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {fieldError ? <Text accessibilityRole="alert" style={styles.error}>{fieldError}</Text> : null}
        {editing ? (
          <View style={styles.card}>
            <Text style={styles.label}>Task title</Text>
            <TextInput accessibilityLabel="Task title" style={styles.input} value={title} onChangeText={setTitle} editable={!saving} />
            <Text style={styles.label}>Description</Text>
            <TextInput accessibilityLabel="Description" style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} multiline editable={!saving} />
            <Text style={styles.label}>Due date</Text>
            <TextInput accessibilityLabel="Due date" style={styles.input} value={dueAt} onChangeText={setDueAt} autoCapitalize="none" editable={!saving} />
            <Text style={styles.label}>Priority</Text>
            <View style={styles.options}>{(['Low', 'Medium', 'High'] as const).map((option) => <Pressable key={option} accessibilityRole="radio" accessibilityState={{ selected: priority === option }} style={[styles.option, priority === option && styles.optionSelected]} onPress={() => setPriority(option)} disabled={saving}><Text style={[styles.optionText, priority === option && styles.optionTextSelected]}>{option}</Text></Pressable>)}</View>
            <Text style={styles.label}>Category ID</Text>
            <TextInput accessibilityLabel="Category ID" style={styles.input} value={categoryId} onChangeText={setCategoryId} keyboardType="numeric" editable={!saving} />
            <Text style={styles.muted}>Category ID is supported on tasks; category management is not available in the current API.</Text>
            <Pressable accessibilityRole="button" style={[styles.button, saving && styles.disabled]} onPress={() => void saveTask()} disabled={saving}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Save Changes</Text>}</Pressable>
            <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={() => { setTitle(task.title); setDescription(task.description ?? ''); setDueAt(task.due_at ?? ''); setPriority(task.priority ?? 'Medium'); setCategoryId(task.category_id == null ? '' : String(task.category_id)); setFieldError(''); setEditing(false); }} disabled={saving}><Text style={styles.secondaryText}>Cancel</Text></Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.label}>Task ID</Text><Text style={styles.value}>{task.id}</Text>
            <Text style={styles.label}>Description</Text><Text style={styles.value}>{task.description || 'Not provided'}</Text>
            <Text style={styles.label}>Status</Text><Text style={styles.value}>{task.status || 'Pending'}</Text>
            <Text style={styles.label}>Priority</Text><Text style={[styles.value, task.priority === 'High' && styles.highPriority]}>{task.priority || 'Medium'}</Text>
            <Text style={styles.label}>Due date</Text><Text style={styles.value}>{displayDate(task.due_at)}</Text>
            {isOverdue(task) ? <Text accessibilityLabel="Overdue task" style={styles.overdue}>Overdue</Text> : null}
            <Text style={styles.label}>Category ID</Text><Text style={styles.value}>{task.category_id ?? 'None'}</Text>
            <Text style={styles.label}>Reminder sent</Text><Text style={styles.value}>{task.reminder_sent == null ? 'Unknown' : task.reminder_sent ? 'Yes' : 'No'}</Text>
            <Text style={styles.label}>Created</Text><Text style={styles.value}>{displayDate(task.created_at)}</Text>
            <Text style={styles.label}>Last updated</Text><Text style={styles.value}>{displayDate(task.updated_at)}</Text>
            <Text style={styles.label}>Completed</Text><Text style={styles.value}>{displayDate(task.completed_at)}</Text>
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" style={styles.button} onPress={() => setEditing(true)} disabled={saving}><Text style={styles.buttonText}>Edit Task</Text></Pressable>
              {task.status !== 'Completed' ? <Pressable accessibilityRole="button" style={[styles.button, saving && styles.disabled]} onPress={() => void markComplete()} disabled={saving}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Mark Complete</Text>}</Pressable> : null}
              <Pressable accessibilityRole="button" style={styles.deleteButton} onPress={confirmDelete} disabled={saving}><Text style={styles.deleteText}>Delete Task</Text></Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6F7FB' },
  content: { width: '100%', maxWidth: 740, alignSelf: 'center', padding: 22, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  back: { minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 6 },
  backText: { color: '#5968D8', fontWeight: '700' },
  title: { color: '#20243A', fontSize: 28, fontWeight: '800', marginBottom: 16 },
  card: { backgroundColor: '#FFFFFF', borderColor: '#E7E9F2', borderWidth: 1, borderRadius: 14, padding: 18 },
  label: { color: '#777D91', fontSize: 12, fontWeight: '700', marginTop: 15, marginBottom: 5 },
  value: { color: '#20243A', fontSize: 15, lineHeight: 22 },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#DDE1ED', borderRadius: 8, paddingHorizontal: 12, backgroundColor: '#F6F7FB', color: '#20243A' },
  multiline: { minHeight: 84, textAlignVertical: 'top', paddingTop: 11 },
  options: { flexDirection: 'row', gap: 8 },
  option: { minHeight: 48, minWidth: 78, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: '#DDE1ED', alignItems: 'center', justifyContent: 'center' },
  optionSelected: { backgroundColor: '#5968D8', borderColor: '#5968D8' },
  optionText: { color: '#414966', fontWeight: '600' },
  optionTextSelected: { color: '#FFFFFF' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
  button: { minHeight: 48, minWidth: 120, paddingHorizontal: 15, backgroundColor: '#5968D8', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  secondaryButton: { minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 12, marginTop: 8 },
  secondaryText: { color: '#414966', fontWeight: '700' },
  deleteButton: { minHeight: 48, minWidth: 120, paddingHorizontal: 15, backgroundColor: '#B84040', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: '#FFFFFF', fontWeight: '700' },
  disabled: { opacity: 0.6 },
  muted: { color: '#777D91', fontSize: 12, marginTop: 6 },
  error: { color: '#B42318', fontSize: 14, marginVertical: 8 },
  overdue: { color: '#B42318', fontWeight: '800', marginTop: 7 },
  highPriority: { color: '#B42318', fontWeight: '800' },
});
