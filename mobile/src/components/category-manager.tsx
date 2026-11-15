import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  ApiError,
  Category,
  createCategory,
  deleteCategory,
  getCategories,
  renameCategory,
} from '../services/api';

function categoryNameError(name: string) {
  const normalizedName = name.trim();
  if (!normalizedName) {
    return 'Category name is required.';
  }
  if (Array.from(normalizedName).length > 255) {
    return 'Category names must be 255 characters or fewer.';
  }
  return '';
}

function limitCategoryName(value: string) {
  return Array.from(value).slice(0, 255).join('');
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.code === 'SESSION_EXPIRED') {
    return '';
  }
  return error instanceof ApiError ? error.message : fallback;
}

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await getCategories();
      setCategories(result.categories);
    } catch (cause) {
      setLoadError(errorMessage(cause, 'Unable to load categories. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCategories();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadCategories]);

  async function handleCreate() {
    if (saving || loading) return;
    const validationError = categoryNameError(newName);
    if (validationError) {
      setError(validationError);
      setNotice('');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await createCategory(newName.trim());
      setCategories((current) =>
        [...current, result.category].sort((a, b) => a.name.localeCompare(b.name))
      );
      setNewName('');
      setNotice('Category created.');
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to create category. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  function startEditing(category: Category) {
    setError('');
    setNotice('');
    setEditingId(String(category.id));
    setEditingName(category.name);
  }

  async function handleRename(category: Category) {
    if (saving) return;
    const validationError = categoryNameError(editingName);
    if (validationError) {
      setError(validationError);
      setNotice('');
      return;
    }

    const name = editingName.trim();
    if (name === category.name) {
      setEditingId(null);
      setEditingName('');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await renameCategory(category.id, name);
      setCategories((current) =>
        current
          .map((item) => item.id === category.id ? result.category : item)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingId(null);
      setEditingName('');
      setNotice('Category renamed.');
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to rename category. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  async function removeCategory(category: Category) {
    if (deletingId !== null) return;
    setDeletingId(String(category.id));
    setError('');
    setNotice('');
    try {
      await deleteCategory(category.id);
      setCategories((current) => current.filter((item) => item.id !== category.id));
      setNotice(`"${category.name}" deleted. Tasks using it were kept.`);
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to delete category. Please try again.'));
    } finally {
      setDeletingId(null);
    }
  }

  function confirmDelete(category: Category) {
    if (saving || deletingId !== null) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Delete "${category.name}"? Tasks will be kept without a category.`)) {
        void removeCategory(category);
      }
      return;
    }

    Alert.alert(
      'Delete category',
      `Delete "${category.name}"? Tasks will be kept without a category.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void removeCategory(category) },
      ]
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Categories</Text>
      <Text style={styles.description}>
        Create and organize categories for your tasks.
      </Text>

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {notice ? <Text accessibilityRole="status" style={styles.notice}>{notice}</Text> : null}

      <View style={styles.createRow}>
        <TextInput
          accessibilityLabel="New category name"
          style={styles.input}
          value={newName}
          onChangeText={(value) => {
            setNewName(limitCategoryName(value));
            setError('');
          }}
          placeholder="Category name"
          editable={!saving && !loading}
          returnKeyType="done"
          onSubmitEditing={() => void handleCreate()}
        />
        <Pressable
          accessibilityRole="button"
          style={[styles.button, (saving || loading) && styles.disabled]}
          onPress={() => void handleCreate()}
          disabled={saving || loading}
        >
          {saving && editingId === null
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.buttonText}>Add</Text>}
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#5968D8" />
          <Text style={styles.muted}>Loading categories...</Text>
        </View>
      ) : loadError ? (
        <View>
          <Text accessibilityRole="alert" style={styles.error}>{loadError}</Text>
          <Pressable accessibilityRole="button" style={styles.retry} onPress={() => void loadCategories()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : categories.length === 0 ? (
        <Text style={styles.muted}>No categories yet.</Text>
      ) : (
        <View style={styles.list}>
          {categories.map((category) => {
            const isEditing = editingId === String(category.id);
            const isDeleting = deletingId === String(category.id);
            return (
              <View key={category.id} style={styles.categoryRow}>
                {isEditing ? (
                  <>
                    <TextInput
                      accessibilityLabel={`Rename ${category.name}`}
                      style={[styles.input, styles.renameInput]}
                      value={editingName}
                      onChangeText={(value) => {
                        setEditingName(limitCategoryName(value));
                        setError('');
                      }}
                      editable={!saving}
                      returnKeyType="done"
                      onSubmitEditing={() => void handleRename(category)}
                    />
                    <Pressable
                      accessibilityRole="button"
                      style={[styles.rowButton, saving && styles.disabled]}
                      onPress={() => void handleRename(category)}
                      disabled={saving}
                    >
                      <Text style={styles.rowButtonText}>Save</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      style={styles.cancelButton}
                      onPress={() => {
                        setEditingId(null);
                        setEditingName('');
                        setError('');
                      }}
                      disabled={saving}
                    >
                      <Text style={styles.cancelText}>Cancel</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Pressable
                      accessibilityRole="button"
                      style={styles.rowButton}
                      onPress={() => startEditing(category)}
                      disabled={saving || deletingId !== null}
                    >
                      <Text style={styles.rowButtonText}>Rename</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      style={[styles.deleteButton, isDeleting && styles.disabled]}
                      onPress={() => confirmDelete(category)}
                      disabled={saving || deletingId !== null}
                    >
                      {isDeleting
                        ? <ActivityIndicator color="#FFFFFF" />
                        : <Text style={styles.deleteText}>Delete</Text>}
                    </Pressable>
                  </>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7E9F2', borderRadius: 14, padding: 18, marginTop: 22 },
  title: { color: '#20243A', fontSize: 20, fontWeight: '800' },
  description: { color: '#7B8195', fontSize: 14, marginTop: 5 },
  createRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  input: { flex: 1, minHeight: 46, borderWidth: 1, borderColor: '#DDE1ED', borderRadius: 8, paddingHorizontal: 12, color: '#20243A', backgroundColor: '#F6F7FB' },
  renameInput: { minWidth: 100 },
  button: { minWidth: 66, minHeight: 46, paddingHorizontal: 14, backgroundColor: '#5968D8', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  list: { gap: 9, marginTop: 14 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderTopColor: '#E7E9F2', paddingTop: 10 },
  categoryName: { flex: 1, minWidth: 100, color: '#20243A', fontSize: 15, fontWeight: '600' },
  rowButton: { minHeight: 40, paddingHorizontal: 12, borderWidth: 1, borderColor: '#DDE1ED', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowButtonText: { color: '#414966', fontWeight: '700' },
  cancelButton: { minHeight: 40, paddingHorizontal: 10, justifyContent: 'center' },
  cancelText: { color: '#414966', fontWeight: '600' },
  deleteButton: { minHeight: 40, minWidth: 72, paddingHorizontal: 12, backgroundColor: '#B84040', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: '#FFFFFF', fontWeight: '700' },
  disabled: { opacity: 0.6 },
  loading: { flexDirection: 'row', gap: 9, alignItems: 'center', marginTop: 14 },
  muted: { color: '#7B8195', fontSize: 13, marginTop: 12 },
  error: { color: '#B42318', fontSize: 13, marginTop: 10 },
  notice: { color: '#237A4B', fontSize: 13, marginTop: 10 },
  retry: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 4 },
  retryText: { color: '#5968D8', fontWeight: '700' },
});
