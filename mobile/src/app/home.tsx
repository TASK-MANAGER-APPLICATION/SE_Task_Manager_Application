import React, { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useFocusEffect, router } from 'expo-router';

import {
  ApiError,
  completeTask,
  createTask,
  deleteTask,
  getTasks,
  Task,
  updateTask,
} from '../services/api';

import { clearSession } from '../services/authStorage';

type StatusFilter = 'All' | 'Pending' | 'Completed';
type PriorityFilter = 'All' | 'Low' | 'Medium' | 'High';
type SortField = 'None' | 'Due Date' | 'Priority' | 'Title' | 'Created Date';
type SortDirection = 'Ascending' | 'Descending';

export default function HomeScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [priorityFilter, setPriorityFilter] =
    useState<PriorityFilter>('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortField, setSortField] = useState<SortField>('None');
  const [sortDirection, setSortDirection] =
    useState<SortDirection>('Ascending');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState('');
  const [errorTitle, setErrorTitle] = useState('Unable to load tasks');
  const [canRetryError, setCanRetryError] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueAt, setNewDueAt] = useState('');
  const [newPriority, setNewPriority] = useState('Medium');
  const [newCategoryId, setNewCategoryId] = useState('');

  const [showInput, setShowInput] = useState(false);
  const [addingTask, setAddingTask] = useState(false);

  const [completingTaskId, setCompletingTaskId] =
    useState<number | string | null>(null);
  const [editingTaskId, setEditingTaskId] =
    useState<number | string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [editingDueAt, setEditingDueAt] = useState('');
  const [editingPriority, setEditingPriority] = useState('Medium');
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [savingTask, setSavingTask] = useState(false);
  const [deletingTaskId, setDeletingTaskId] =
    useState<number | string | null>(null);

  const totalCount = tasks.length;
  const completedCount = tasks.filter(
    (task) => task.status === 'Completed'
  ).length;

  const pendingCount = totalCount - completedCount;

  const categoryOptions = Array.from(
    new Set(
      tasks.flatMap((task) =>
        task.category_id === null || task.category_id === undefined
          ? []
          : [String(task.category_id)]
      )
    )
  );

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Completed'
        ? task.status === 'Completed'
        : task.status !== 'Completed');
    const matchesPriority =
      priorityFilter === 'All' || task.priority === priorityFilter;
    const matchesCategory =
      categoryFilter === 'All' ||
      String(task.category_id) === categoryFilter;

    return matchesStatus && matchesPriority && matchesCategory;
  });

  const hasActiveFilters =
    statusFilter !== 'All' ||
    priorityFilter !== 'All' ||
    categoryFilter !== 'All';

  const sortedTasks = [...filteredTasks];
  if (sortField !== 'None') {
    const direction = sortDirection === 'Ascending' ? 1 : -1;
    const getTimestamp = (value: string | null | undefined) => {
      if (!value) {
        return null;
      }

      const timestamp = Date.parse(value);
      return Number.isNaN(timestamp) ? null : timestamp;
    };
    const compareDates = (
      left: string | null | undefined,
      right: string | null | undefined
    ) => {
      const leftTimestamp = getTimestamp(left);
      const rightTimestamp = getTimestamp(right);

      if (leftTimestamp === null) {
        return rightTimestamp === null ? 0 : 1;
      }
      if (rightTimestamp === null) {
        return -1;
      }

      return (leftTimestamp - rightTimestamp) * direction;
    };
    const getPriorityRank = (priority: Task['priority']) => {
      if (priority === 'Low') return 1;
      if (priority === 'Medium') return 2;
      if (priority === 'High') return 3;
      return null;
    };

    sortedTasks.sort((left, right) => {
      if (sortField === 'Due Date') {
        return compareDates(left.due_at, right.due_at);
      }
      if (sortField === 'Created Date') {
        return compareDates(left.created_at, right.created_at);
      }
      if (sortField === 'Priority') {
        const leftRank = getPriorityRank(left.priority);
        const rightRank = getPriorityRank(right.priority);

        if (leftRank === null) return rightRank === null ? 0 : 1;
        if (rightRank === null) return -1;
        return (leftRank - rightRank) * direction;
      }

      const leftTitle = typeof left.title === 'string' ? left.title : '';
      const rightTitle = typeof right.title === 'string' ? right.title : '';
      return leftTitle.localeCompare(rightTitle) * direction;
    });
  }

  const hasActiveSorting =
    sortField !== 'None' || sortDirection !== 'Ascending';

  function resetFilters() {
    setStatusFilter('All');
    setPriorityFilter('All');
    setCategoryFilter('All');
  }

  function resetSorting() {
    setSortField('None');
    setSortDirection('Ascending');
  }

  function renderFilterChip(
    label: string,
    selected: boolean,
    onPress: () => void
  ) {
    return (
      <Pressable
        key={label}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        style={[
          styles.filterChip,
          selected && styles.filterChipSelected,
        ]}
        onPress={onPress}
      >
        <Text
          style={[
            styles.filterChipText,
            selected && styles.filterChipTextSelected,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  const handleSessionExpired = useCallback(() => {
    clearSession().finally(() => {
      if (Platform.OS === 'web') {
        router.replace('/login');
        return;
      }

      Alert.alert(
        'Session expired',
        'Your session has expired. Please log in again.',
        [
          {
            text: 'Login',
            onPress: () => router.replace('/login'),
          },
        ]
      );
    });
  }, []);

  const loadTasks = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    setError('');
    setCanRetryError(true);

    try {
      const result = await getTasks({
        sortBy: 'created_at',
        order: 'desc',
      });

      setTasks(result.tasks);
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.code === 'SESSION_EXPIRED' || err.status === 401)
      ) {
        handleSessionExpired();
        return;
      }

      if (err instanceof ApiError) {
        setErrorTitle('Unable to load tasks');
        setError(err.message);
      } else {
        setErrorTitle('Unable to load tasks');
        setError(
          'Unable to load your tasks. Please try again.'
        );
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [handleSessionExpired]);

  function handleTaskError(
    err: unknown,
    title: string,
    fallback: string
  ) {
    if (
      err instanceof ApiError &&
      (err.code === 'SESSION_EXPIRED' || err.status === 401)
    ) {
      handleSessionExpired();
      return;
    }

    setErrorTitle(title);
    setCanRetryError(false);
    setError(err instanceof ApiError ? err.message : fallback);
  }

  useFocusEffect(
    useCallback(() => {
      loadTasks(true);
    }, [loadTasks])
  );

  async function handleRefresh() {
    setRefreshing(true);
    setErrorTitle('Unable to refresh tasks');
    setCanRetryError(true);

    try {
      const result = await getTasks({
        sortBy: 'created_at',
        order: 'desc',
      });

      setTasks(result.tasks);
      setError('');
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.code === 'SESSION_EXPIRED' || err.status === 401)
      ) {
        handleSessionExpired();
        return;
      }

      if (err instanceof ApiError) {
        setErrorTitle('Unable to refresh tasks');
        setError(err.message);
      } else {
        setErrorTitle('Unable to refresh tasks');
        setError(
          'Unable to refresh your tasks. Please try again.'
        );
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function handleAddTask() {
    const title = newTitle.trim();

    if (!title) {
      setErrorTitle('Task title required');
      setCanRetryError(false);
      setError('Please enter a task title.');
      return;
    }

    setAddingTask(true);
    setError('');

    try {
      const response = await createTask({
        title,
        ...(newDescription.trim()
          ? { description: newDescription.trim() }
          : {}),
        ...(newDueAt.trim()
          ? { due_at: newDueAt.trim() }
          : {}),
        priority: newPriority,
        ...(newCategoryId.trim()
          ? { category_id: newCategoryId.trim() }
          : {}),
      });

      setTasks((current) => [response.task, ...current]);

      setNewTitle('');
      setNewDescription('');
      setNewDueAt('');
      setNewPriority('Medium');
      setNewCategoryId('');
      setShowInput(false);
      setError('');
    } catch (err) {
      handleTaskError(
        err,
        'Unable to add task',
        'Unable to add your task. Please try again.'
      );
    } finally {
      setAddingTask(false);
    }
  }

  async function handleCompleteTask(task: Task) {
    if (task.status === 'Completed') {
      return;
    }

    setCompletingTaskId(task.id);

    try {
      const updatedTask = await completeTask(task.id);

      setTasks((current) =>
        current.map((currentTask) =>
          currentTask.id === updatedTask.task.id
            ? updatedTask.task
            : currentTask
        )
      );

      setError('');
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.code === 'ALREADY_COMPLETED'
      ) {
        await loadTasks(false);
        return;
      }

      handleTaskError(
        err,
        'Unable to complete task',
        'Unable to complete your task. Please try again.'
      );
    } finally {
      setCompletingTaskId(null);
    }
  }

  function startEditingTask(task: Task) {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
    setEditingDescription(task.description ?? '');
    setEditingDueAt(task.due_at?.slice(0, 10) ?? '');
    setEditingPriority(task.priority ?? 'Medium');
    setEditingCategoryId(
      task.category_id === null || task.category_id === undefined
        ? ''
        : String(task.category_id)
    );
  }

  function cyclePriority(priority: string): string {
    const priorities = ['Low', 'Medium', 'High'];
    const currentIndex = priorities.indexOf(priority);
    return priorities[(currentIndex + 1) % priorities.length];
  }

  async function handleSaveTask(task: Task) {
    const title = editingTitle.trim();

    if (!title) {
      setErrorTitle('Task title required');
      setCanRetryError(false);
      setError('Please enter a task title.');
      return;
    }

    setSavingTask(true);

    try {
      const result = await updateTask(task.id, {
        title,
        description: editingDescription.trim() || null,
        due_at: editingDueAt.trim() || null,
        priority: editingPriority,
        category_id: editingCategoryId.trim() || null,
      });

      setTasks((current) =>
        current.map((currentTask) =>
          currentTask.id === result.task.id ? result.task : currentTask
        )
      );
      setEditingTaskId(null);
      setError('');
    } catch (err) {
      handleTaskError(
        err,
        'Unable to save task',
        'Unable to save your task. Please try again.'
      );
    } finally {
      setSavingTask(false);
    }
  }

  async function handleDeleteTask(task: Task) {
    setDeletingTaskId(task.id);

    try {
      await deleteTask(task.id);
      setTasks((current) =>
        current.filter((currentTask) => currentTask.id !== task.id)
      );
      if (editingTaskId === task.id) {
        setEditingTaskId(null);
      }
      setError('');
    } catch (err) {
      handleTaskError(
        err,
        'Unable to delete task',
        'Unable to delete your task. Please try again.'
      );
    } finally {
      setDeletingTaskId(null);
    }
  }

  function confirmDeleteTask(task: Task) {
    const deleteConfirmed = () => {
      void handleDeleteTask(task);
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Delete "${task.title}"?`)) {
        deleteConfirmed();
      }
      return;
    }

    Alert.alert(
      'Delete task',
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteConfirmed },
      ]
    );
  }

  function formatDueDate(
    dueAt: string | null | undefined
  ): string {
    if (!dueAt) {
      return 'No date';
    }

    const date = new Date(dueAt);

    if (Number.isNaN(date.getTime())) {
      return dueAt;
    }

    return date.toLocaleDateString();
  }

  function getPriorityStyle(
    priority: Task['priority']
  ) {
    if (priority === 'High') {
      return styles.highPriority;
    }

    if (priority === 'Low') {
      return styles.lowPriority;
    }

    return styles.mediumPriority;
  }

  function renderTask({
    item,
  }: {
    item: Task;
  }) {
    const completed =
      item.status === 'Completed';

    const completing =
      completingTaskId === item.id;
    const editing = editingTaskId === item.id;
    const deleting = deletingTaskId === item.id;

    return (
      <View
        style={[
          styles.taskCard,
          completed && styles.doneCard,
        ]}
      >
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{
            checked: completed,
            disabled: completed || completing,
          }}
          style={[
            styles.checkbox,
            completed && styles.checkedBox,
          ]}
          onPress={() => handleCompleteTask(item)}
            disabled={completed || completing || editing || savingTask || deleting}
        >
          {completing ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Text style={styles.checkmark}>
              {completed ? '✓' : ''}
            </Text>
          )}
        </Pressable>

        <View style={styles.taskDetails}>
          {editing ? (
            <View>
              <TextInput
                style={styles.input}
                placeholder="Task title"
                value={editingTitle}
                onChangeText={setEditingTitle}
                editable={!savingTask}
              />
              <TextInput
                style={[styles.input, styles.formField]}
                placeholder="Description (optional)"
                value={editingDescription}
                onChangeText={setEditingDescription}
                editable={!savingTask}
                multiline
              />
              <TextInput
                style={[styles.input, styles.formField]}
                placeholder="Due date (YYYY-MM-DD)"
                value={editingDueAt}
                onChangeText={setEditingDueAt}
                editable={!savingTask}
                autoCapitalize="none"
              />
              <Pressable
                style={[styles.priorityPicker, styles.formField]}
                onPress={() =>
                  setEditingPriority(cyclePriority(editingPriority))
                }
                disabled={savingTask}
              >
                <Text style={styles.priorityPickerText}>
                  Priority: {editingPriority} (tap to change)
                </Text>
              </Pressable>
              <TextInput
                style={[styles.input, styles.formField]}
                placeholder="Category ID (optional)"
                value={editingCategoryId}
                onChangeText={setEditingCategoryId}
                editable={!savingTask}
                autoCapitalize="none"
              />
              <View style={styles.taskActions}>
                <Pressable
                  style={styles.taskAction}
                  onPress={() => handleSaveTask(item)}
                  disabled={savingTask}
                >
                  <Text style={styles.taskActionText}>
                    {savingTask ? 'Saving...' : 'Save changes'}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.taskAction}
                  onPress={() => setEditingTaskId(null)}
                  disabled={savingTask}
                >
                  <Text style={styles.taskActionText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <Text
                style={[
                  styles.taskTitle,
                  completed && styles.completedTitle,
                ]}
              >
                {item.title}
              </Text>

              {item.description ? (
                <Text style={styles.description}>
                  {item.description}
                </Text>
              ) : null}

              <Text style={styles.taskMeta}>
                Due: {formatDueDate(item.due_at)}
              </Text>

              <View style={styles.taskFooter}>
                <Text
                  style={[
                    styles.priority,
                    getPriorityStyle(item.priority),
                  ]}
                >
                  {item.priority ?? 'Medium'} priority
                </Text>

                <Text style={styles.status}>
                  {completed ? 'Completed' : 'In progress'}
                </Text>
              </View>

              <View style={styles.taskActions}>
                <Pressable
                  style={styles.taskAction}
                  onPress={() => startEditingTask(item)}
                  disabled={savingTask || deleting}
                >
                  <Text style={styles.taskActionText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={styles.taskAction}
                  onPress={() => confirmDeleteTask(item)}
                  disabled={savingTask || deleting}
                >
                  <Text style={styles.deleteActionText}>
                    {deleting ? 'Deleting...' : 'Delete'}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    );
  }

  function renderHeader() {
    return (
      <View>
        <Text style={styles.eyebrow}>
          YOUR PERSONAL WORKSPACE
        </Text>

        <Text style={styles.heading}>
          Task Manager
        </Text>

        <Text style={styles.subtitle}>
          Stay organized. Get things done.
        </Text>

        <View style={styles.summaryRow}>
          <View
            style={[
              styles.summaryCard,
              styles.totalCard,
            ]}
          >
            <Text style={styles.summaryLabel}>
              TOTAL TASKS
            </Text>

            <Text style={styles.summaryNumber}>
              {totalCount}
            </Text>
          </View>

          <View
            style={[
              styles.summaryCard,
              styles.pendingCard,
            ]}
          >
            <Text style={styles.summaryLabel}>
              PENDING TASKS
            </Text>

            <Text style={styles.summaryNumber}>
              {pendingCount}
            </Text>
          </View>

          <View
            style={[
              styles.summaryCard,
              styles.completedCard,
            ]}
          >
            <Text style={styles.summaryLabel}>
              COMPLETED TASKS
            </Text>

            <Text style={styles.summaryNumber}>
              {completedCount}
            </Text>
          </View>
        </View>

        <View style={styles.filtersCard}>
          <View style={styles.filtersHeadingRow}>
            <Text style={styles.filtersTitle}>Filter tasks</Text>
            <Pressable
              onPress={resetFilters}
              disabled={!hasActiveFilters}
            >
              <Text
                style={[
                  styles.resetFiltersText,
                  !hasActiveFilters && styles.resetFiltersDisabled,
                ]}
              >
                Reset filters
              </Text>
            </Pressable>
          </View>

          <Text style={styles.filterLabel}>Status</Text>
          <View style={styles.filterOptions}>
            {(['All', 'Pending', 'Completed'] as const).map((filter) =>
              renderFilterChip(
                filter,
                statusFilter === filter,
                () => setStatusFilter(filter)
              )
            )}
          </View>

          <Text style={styles.filterLabel}>Priority</Text>
          <View style={styles.filterOptions}>
            {(['All', 'Low', 'Medium', 'High'] as const).map((filter) =>
              renderFilterChip(
                filter,
                priorityFilter === filter,
                () => setPriorityFilter(filter)
              )
            )}
          </View>

          {categoryOptions.length > 0 ? (
            <>
              <Text style={styles.filterLabel}>Category</Text>
              <View style={styles.filterOptions}>
                {renderFilterChip(
                  'All',
                  categoryFilter === 'All',
                  () => setCategoryFilter('All')
                )}
                {categoryOptions.map((categoryId) =>
                  renderFilterChip(
                    `Category ${categoryId}`,
                    categoryFilter === categoryId,
                    () => setCategoryFilter(categoryId)
                  )
                )}
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.filtersCard}>
          <View style={styles.filtersHeadingRow}>
            <Text style={styles.filtersTitle}>Sort tasks</Text>
            <Pressable
              onPress={resetSorting}
              disabled={!hasActiveSorting}
            >
              <Text
                style={[
                  styles.resetFiltersText,
                  !hasActiveSorting && styles.resetFiltersDisabled,
                ]}
              >
                Reset sorting
              </Text>
            </Pressable>
          </View>

          <Text style={styles.filterLabel}>Sort by</Text>
          <View style={styles.filterOptions}>
            {(
              ['Due Date', 'Priority', 'Title', 'Created Date'] as const
            ).map((field) =>
              renderFilterChip(
                field,
                sortField === field,
                () => setSortField(field)
              )
            )}
          </View>

          <Text style={styles.filterLabel}>Direction</Text>
          <View style={styles.filterOptions}>
            {(['Ascending', 'Descending'] as const).map((direction) =>
              renderFilterChip(
                direction,
                sortDirection === direction,
                () => setSortDirection(direction)
              )
            )}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              My tasks
            </Text>

            <Text style={styles.sectionSubtitle}>
              Your tasks at a glance
            </Text>
          </View>

          <Pressable
            style={styles.addButton}
            onPress={() =>
              setShowInput((value) => !value)
            }
            disabled={addingTask}
          >
            <Text style={styles.addButtonText}>
              {showInput ? 'Cancel' : '+ Add task'}
            </Text>
          </Pressable>
        </View>

        {showInput ? (
          <View style={styles.inputCard}>
            <TextInput
              style={styles.input}
              placeholder="What do you need to do?"
              placeholderTextColor="#8991A5"
              value={newTitle}
              onChangeText={setNewTitle}
              editable={!addingTask}
              returnKeyType="done"
              onSubmitEditing={handleAddTask}
            />

            <TextInput
              style={[styles.input, styles.formField]}
              placeholder="Description (optional)"
              placeholderTextColor="#8991A5"
              value={newDescription}
              onChangeText={setNewDescription}
              editable={!addingTask}
              multiline
            />

            <TextInput
              style={[styles.input, styles.formField]}
              placeholder="Due date (YYYY-MM-DD, optional)"
              placeholderTextColor="#8991A5"
              value={newDueAt}
              onChangeText={setNewDueAt}
              editable={!addingTask}
              autoCapitalize="none"
            />

            <Pressable
              style={[styles.priorityPicker, styles.formField]}
              onPress={() => setNewPriority(cyclePriority(newPriority))}
              disabled={addingTask}
            >
              <Text style={styles.priorityPickerText}>
                Priority: {newPriority} (tap to change)
              </Text>
            </Pressable>

            <TextInput
              style={[styles.input, styles.formField]}
              placeholder="Category ID (optional)"
              placeholderTextColor="#8991A5"
              value={newCategoryId}
              onChangeText={setNewCategoryId}
              editable={!addingTask}
              autoCapitalize="none"
            />

            <Pressable
              style={[
                styles.saveButton,
                addingTask &&
                  styles.saveButtonDisabled,
              ]}
              onPress={handleAddTask}
              disabled={addingTask}
            >
              {addingTask ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>
                  Save task
                </Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              {errorTitle}
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>

            {canRetryError ? (
              <Pressable
                style={styles.retryButton}
                onPress={() => loadTasks(true)}
              >
                <Text style={styles.retryButtonText}>
                  Retry
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="dark-content"
        />

        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color="#5968D8"
          />

          <Text style={styles.loadingText}>
            Loading your tasks...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
      />

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={sortedTasks}
        keyExtractor={(item) =>
          String(item.id)
        }
        renderItem={renderTask}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        ListEmptyComponent={
          !error ? (
            <View style={styles.emptyCard}>
              {tasks.length === 0 ? (
                <>
                  <Text style={styles.emptyTitle}>No tasks yet</Text>
                  <Text style={styles.emptyText}>
                    Add a task to get started.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.emptyTitle}>No matching tasks</Text>
                  <Text style={styles.emptyText}>
                    Try changing your filters or reset them to see all tasks.
                  </Text>
                  <Pressable
                    style={styles.resetEmptyButton}
                    onPress={resetFilters}
                  >
                    <Text style={styles.resetEmptyButtonText}>
                      Reset filters
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          ) : undefined
        }
        ListFooterComponent={
          tasks.length > 0 ? (
            <Text style={styles.footer}>
              Small steps lead to big achievements.
            </Text>
          ) : undefined
        }
        ItemSeparatorComponent={() => (
          <View style={styles.separator} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },

  list: {
    flex: 1,
  },

  content: {
    width: '100%',
    maxWidth: 850,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 32,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    color: '#666666',
    fontSize: 15,
  },

  eyebrow: {
    color: '#6474D9',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  heading: {
    color: '#20243A',
    fontSize: 32,
    fontWeight: '800',
    marginTop: 8,
  },

  subtitle: {
    color: '#7B8195',
    fontSize: 15,
    marginTop: 7,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 26,
  },

  summaryCard: {
    flex: 1,
    minHeight: 100,
    padding: 13,
    borderRadius: 15,
    justifyContent: 'space-between',
  },

  totalCard: {
    backgroundColor: '#E8EBFF',
  },

  pendingCard: {
    backgroundColor: '#FFF0D9',
  },

  completedCard: {
    backgroundColor: '#DDF7EA',
  },

  summaryLabel: {
    color: '#626982',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  filtersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7E9F2',
    padding: 14,
    marginTop: 18,
  },

  filtersHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  filtersTitle: {
    color: '#20243A',
    fontSize: 15,
    fontWeight: '700',
  },

  resetFiltersText: {
    color: '#5968D8',
    fontSize: 12,
    fontWeight: '700',
  },

  resetFiltersDisabled: {
    opacity: 0.45,
  },

  filterLabel: {
    color: '#626982',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 7,
  },

  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  filterChip: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#DDE1ED',
    backgroundColor: '#FFFFFF',
  },

  filterChipSelected: {
    backgroundColor: '#5968D8',
    borderColor: '#5968D8',
  },

  filterChipText: {
    color: '#626982',
    fontSize: 12,
    fontWeight: '600',
  },

  filterChipTextSelected: {
    color: '#FFFFFF',
  },

  summaryNumber: {
    color: '#20243A',
    fontSize: 28,
    fontWeight: '800',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 16,
    gap: 12,
  },

  sectionTitle: {
    color: '#20243A',
    fontSize: 21,
    fontWeight: '800',
  },

  sectionSubtitle: {
    color: '#858BA0',
    fontSize: 12,
    marginTop: 5,
  },

  addButton: {
    minHeight: 44,
    backgroundColor: '#5968D8',
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  inputCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E7E9F2',
  },

  input: {
    minHeight: 48,
    color: '#20243A',
    backgroundColor: '#F6F7FB',
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
  },

  formField: {
    marginTop: 10,
  },

  priorityPicker: {
    minHeight: 44,
    paddingHorizontal: 13,
    borderRadius: 9,
    backgroundColor: '#F6F7FB',
    justifyContent: 'center',
  },

  priorityPickerText: {
    color: '#20243A',
    fontSize: 13,
    fontWeight: '600',
  },

  saveButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    backgroundColor: '#20243A',
    paddingHorizontal: 16,
    borderRadius: 9,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  errorCard: {
    backgroundColor: '#FFF1F1',
    borderWidth: 1,
    borderColor: '#F1C5C5',
    borderRadius: 12,
    padding: 15,
    marginBottom: 16,
  },

  errorTitle: {
    color: '#A52A2A',
    fontSize: 15,
    fontWeight: '700',
  },

  errorText: {
    color: '#8A4444',
    fontSize: 13,
    marginTop: 5,
    lineHeight: 19,
  },

  retryButton: {
    minHeight: 40,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#A52A2A',
    borderRadius: 8,
    marginTop: 10,
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9EBF3',
  },

  doneCard: {
    backgroundColor: '#FBFCFE',
  },

  checkbox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#C6CBDA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
    marginTop: 2,
  },

  checkedBox: {
    backgroundColor: '#5968D8',
    borderColor: '#5968D8',
  },

  checkmark: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  taskDetails: {
    flex: 1,
  },

  taskTitle: {
    color: '#292D43',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },

  completedTitle: {
    color: '#9096A8',
    textDecorationLine: 'line-through',
  },

  description: {
    color: '#777D91',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  taskMeta: {
    color: '#858BA0',
    fontSize: 11,
    marginTop: 6,
  },

  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },

  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 12,
  },

  taskAction: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

  taskActionText: {
    color: '#5968D8',
    fontSize: 12,
    fontWeight: '700',
  },

  deleteActionText: {
    color: '#B84040',
    fontSize: 12,
    fontWeight: '700',
  },

  priority: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    overflow: 'hidden',
  },

  highPriority: {
    color: '#B84040',
    backgroundColor: '#FFE8E7',
  },

  mediumPriority: {
    color: '#9A690E',
    backgroundColor: '#FFF0D2',
  },

  lowPriority: {
    color: '#27835B',
    backgroundColor: '#DDF7EA',
  },

  status: {
    color: '#858BA0',
    fontSize: 10,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginTop: 4,
  },

  emptyTitle: {
    color: '#292D43',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 5,
  },

  emptyText: {
    color: '#858BA0',
    fontSize: 13,
  },

  resetEmptyButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: '#5968D8',
  },

  resetEmptyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  separator: {
    height: 11,
  },

  footer: {
    textAlign: 'center',
    color: '#9A9FB0',
    fontSize: 11,
    marginTop: 26,
  },
});
