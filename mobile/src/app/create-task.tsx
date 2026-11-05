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

import { ApiError, createTask } from '../services/api';
import { TaskFormErrors, TaskFormValues, toCreateTaskInput, validateTaskForm } from '../services/taskFormValidation';

const initialValues: TaskFormValues = {
  title: '', description: '', due_at: '', priority: 'Medium', category_id: '',
};

export default function CreateTaskScreen({ onCreated }: { onCreated?: () => void } = {}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<TaskFormErrors>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  function setField(field: keyof TaskFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError('');
  }

  async function handleCreate() {
    if (saving) return;
    const nextErrors = validateTaskForm(values);
    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      await createTask(toCreateTaskInput(values));
      if (onCreated) onCreated();
      else router.replace('/home');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'SESSION_EXPIRED') {
        return;
      } else if (error instanceof ApiError && error.code === 'INVALID_TITLE') {
        setErrors({ title: error.message });
      } else if (error instanceof ApiError && error.code === 'INVALID_DUE_DATE') {
        setErrors({ due_at: error.message });
      } else if (error instanceof ApiError && error.code === 'INVALID_CATEGORY') {
        setErrors({ category_id: error.message });
      } else {
        setFormError(error instanceof ApiError ? error.message : 'Unable to create the task. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  function field(
    label: string,
    placeholder: string,
    value: string,
    name: keyof TaskFormValues,
    options: { multiline?: boolean; keyboardType?: 'default' | 'numeric'; autoCapitalize?: 'none' | 'sentences' } = {}
  ) {
    const error = name === 'title' || name === 'due_at' || name === 'category_id'
      ? errors[name]
      : undefined;
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          accessibilityLabel={label}
          style={[styles.input, options.multiline && styles.multiline, error && styles.inputError]}
          placeholder={placeholder}
          value={value}
          onChangeText={(text) => setField(name, text)}
          editable={!saving}
          multiline={options.multiline}
          keyboardType={options.keyboardType}
          autoCapitalize={options.autoCapitalize}
          autoCorrect={name === 'title' || name === 'description'}
          returnKeyType={name === 'title' ? 'next' : 'default'}
        />
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" style={styles.back} onPress={() => router.replace('/home')} disabled={saving}>
          <Text style={styles.backText}>Back to tasks</Text>
        </Pressable>
        <Text style={styles.title}>Create Task</Text>
        <Text style={styles.subtitle}>Add a task to your list.</Text>
        {formError ? <Text accessibilityRole="alert" style={styles.formError}>{formError}</Text> : null}
        {field('Task title', 'What do you need to do?', values.title, 'title')}
        {field('Description', 'Optional details', values.description, 'description', { multiline: true })}
        {field('Due date', 'Optional date or time (ISO format)', values.due_at, 'due_at', { autoCapitalize: 'none' })}
        <Text style={styles.label}>Priority</Text>
        <View style={styles.options}>
          {(['Low', 'Medium', 'High'] as const).map((priority) => (
            <Pressable
              key={priority}
              accessibilityRole="radio"
              accessibilityState={{ selected: values.priority === priority, disabled: saving }}
              style={[styles.option, values.priority === priority && styles.optionSelected]}
              onPress={() => setField('priority', priority)}
              disabled={saving}
            >
              <Text style={[styles.optionText, values.priority === priority && styles.optionTextSelected]}>{priority}</Text>
            </Pressable>
          ))}
        </View>
        {field('Category ID', 'Optional positive category ID', values.category_id, 'category_id', { keyboardType: 'numeric' })}
        <Text style={styles.note}>Category management is not available in the current API. Enter an existing category ID if you have one.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Create task submit" style={[styles.submit, saving && styles.disabled]} onPress={handleCreate} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Create Task</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6F7FB' },
  content: { width: '100%', maxWidth: 700, alignSelf: 'center', padding: 22, paddingBottom: 40 },
  back: { minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 6 },
  backText: { color: '#5968D8', fontWeight: '700', fontSize: 14 },
  title: { color: '#20243A', fontSize: 30, fontWeight: '800', marginTop: 4 },
  subtitle: { color: '#7B8195', fontSize: 14, marginTop: 6, marginBottom: 12 },
  field: { marginTop: 14 },
  label: { color: '#34394E', fontSize: 14, fontWeight: '700', marginBottom: 7 },
  input: { minHeight: 48, backgroundColor: '#FFFFFF', borderColor: '#DDE1ED', borderWidth: 1, borderRadius: 9, paddingHorizontal: 13, fontSize: 15, color: '#20243A' },
  multiline: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' },
  inputError: { borderColor: '#B42318' },
  error: { color: '#B42318', fontSize: 13, marginTop: 5 },
  formError: { color: '#B42318', fontSize: 14, padding: 12, backgroundColor: '#FFF1F1', borderRadius: 8, marginTop: 12 },
  options: { flexDirection: 'row', gap: 9 },
  option: { minHeight: 48, minWidth: 82, paddingHorizontal: 15, borderRadius: 9, borderWidth: 1, borderColor: '#DDE1ED', backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  optionSelected: { backgroundColor: '#5968D8', borderColor: '#5968D8' },
  optionText: { color: '#414966', fontWeight: '600' },
  optionTextSelected: { color: '#FFFFFF' },
  note: { color: '#777D91', fontSize: 12, marginTop: 5, lineHeight: 18 },
  submit: { minHeight: 50, marginTop: 24, backgroundColor: '#5968D8', borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.6 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
