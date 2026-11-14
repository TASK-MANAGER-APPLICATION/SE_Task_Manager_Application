import React, { useCallback, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFocusEffect, router } from 'expo-router';

import {
  ApiError,
  Category,
  completeTask,
  createTask,
  deleteTask,
  getCategories,
  getTasks,
  getTaskSummary,
  GetTasksParams,
  Task,
  TaskSummary,
  updateTask,
} from '../services/api';

import { CategoryPicker } from '../components/category-picker';
import { filterAndSortTasks, isTaskOverdue } from '../services/taskPresentation';

type StatusFilter = 'All' | 'Pending' | 'Completed';
type PriorityFilter = 'All' | 'Low' | 'Medium' | 'High';
type SortField = 'None' | 'Due Date' | 'Priority' | 'Title' | 'Created Date';
type SortDirection = 'Ascending' | 'Descending';

const TASK_PAGE_SIZE = 50;

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
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const inFlightLoad = useRef<{
    queryKey: string;
    promise: Promise<void>;
    requestSequence: number;
  } | null>(null);
  const listRequestSequence = useRef(0);
  const activeQueryKey = useRef('');
  const loadingMoreRef = useRef(false);
  const inFlightLoadError = useRef({
    title: 'Unable to load tasks',
    message: 'Unable to load your tasks. Please try again.',
  });
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesError, setCategoriesError] = useState('');

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

  const totalCount = summary?.total;
  const completedCount = summary?.completed;
  const pendingCount = summary?.pending;

  const sortedTasks = filterAndSortTasks(
    tasks,
    { status: statusFilter, priority: priorityFilter, categoryId: categoryFilter },
    sortField,
    sortDirection
  );

  const hasActiveFilters =
    statusFilter !== 'All' ||
    priorityFilter !== 'All' ||
    categoryFilter !== 'All';

  const hasActiveSorting =
    sortField !== 'None' || sortDirection !== 'Ascending';

  const buildTaskQuery = useCallback((offset: number): GetTasksParams => {
    const sortBy =
      sortField === 'None'
        ? 'created_at'
        : sortField === 'Due Date'
          ? 'due_at'
          : sortField === 'Created Date'
            ? 'created_at'
            : sortField.toLowerCase() as 'priority' | 'title';

    return {
      ...(statusFilter !== 'All' ? { status: statusFilter } : {}),
      ...(priorityFilter !== 'All' ? { priority: priorityFilter } : {}),
      ...(categoryFilter === 'Uncategorized'
        ? { categoryId: 'uncategorized' }
        : categoryFilter !== 'All'
          ? { categoryId: categoryFilter }
          : {}),
      sortBy,
      order:
        sortField === 'None'
          ? 'desc'
          : sortDirection === 'Ascending'
            ? 'asc'
            : 'desc',
      limit: TASK_PAGE_SIZE,
      offset,
    };
  }, [categoryFilter, priorityFilter, sortDirection, sortField, statusFilter]);

  const loadCategories = useCallback(async () => {
    setCategoriesError('');
    try {
      const result = await getCategories();
      setCategories(result.categories);
      setCategoryFilter((currentFilter) =>
        currentFilter === 'All' ||
        currentFilter === 'Uncategorized' ||
        result.categories.some((category) => String(category.id) === currentFilter)
          ? currentFilter
          : 'All'
      );
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SESSION_EXPIRED') {
        return;
      }
      setCategoriesError(
        err instanceof ApiError
          ? err.message
          : 'Unable to load categories. Please try again.'
      );
    }
  }, []);

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
    onPress: () => void,
    stableKey = label
  ) {
    return (
      <Pressable
        key={stableKey}
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

  const loadTasks = useCallback(async (
    showLoading = true,
    loadErrorTitle = 'Unable to load tasks',
    loadErrorMessage = 'Unable to load your tasks. Please try again.'
  ) => {
    const params = buildTaskQuery(0);
    const queryKey = JSON.stringify(params);
    activeQueryKey.current = queryKey;
    if (inFlightLoad.current?.queryKey === queryKey) {
      inFlightLoadError.current = {
        title: loadErrorTitle,
        message: loadErrorMessage,
      };
      await inFlightLoad.current.promise;
      return;
    }

    const requestSequence = ++listRequestSequence.current;
    inFlightLoadError.current = {
      title: loadErrorTitle,
      message: loadErrorMessage,
    };

    if (showLoading) {
      setLoading(true);
    }

    setHasMore(false);
    setError('');
    setCanRetryError(true);

    const request = (async () => {
      try {
        const result = await getTasks(params);
        if (requestSequence !== listRequestSequence.current) {
          return;
        }

        setTasks(result.tasks);
        setHasMore(result.hasMore ?? result.tasks.length === TASK_PAGE_SIZE);
      } catch (err) {
        if (requestSequence !== listRequestSequence.current) {
          return;
        }

        if (err instanceof ApiError && err.code === 'SESSION_EXPIRED') {
          return;
        }

        if (err instanceof ApiError) {
          setErrorTitle(inFlightLoadError.current.title);
          setError(err.message);
        } else {
          setErrorTitle(inFlightLoadError.current.title);
          setError(inFlightLoadError.current.message);
        }
      } finally {
        if (showLoading && requestSequence === listRequestSequence.current) {
          setLoading(false);
        }
      }
    })();

    const activeLoad = { queryKey, promise: request, requestSequence };
    inFlightLoad.current = activeLoad;

    try {
      await request;
    } finally {
      if (inFlightLoad.current === activeLoad) {
        inFlightLoad.current = null;
      }
    }
  }, [buildTaskQuery]);

  const loadMoreTasks = useCallback(async () => {
    if (
      loadingMoreRef.current ||
      !hasMore
    ) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMore(true);
    const params = buildTaskQuery(tasks.length);
    const queryKey = JSON.stringify({ ...params, offset: 0 });
    if (queryKey !== activeQueryKey.current) {
      loadingMoreRef.current = false;
      setLoadingMore(false);
      return;
    }

    try {
      const result = await getTasks(params);
      if (queryKey !== activeQueryKey.current) {
        return;
      }

      setTasks((current) => [...current, ...result.tasks]);
      setHasMore(result.hasMore ?? result.tasks.length === TASK_PAGE_SIZE);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SESSION_EXPIRED') {
        return;
      }

      setErrorTitle('Unable to load more tasks');
      setCanRetryError(true);
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to load more tasks. Please try again.'
      );
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [buildTaskQuery, hasMore, tasks.length]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError('');

    try {
      setSummary(await getTaskSummary());
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SESSION_EXPIRED') {
        return;
      }

      setSummaryError(
        err instanceof ApiError
          ? err.message
          : 'Unable to load dashboard statistics. Please try again.'
      );
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const refreshDashboard = useCallback(async (showLoading = false) => {
    await Promise.all([loadTasks(showLoading), loadSummary()]);
  }, [loadSummary, loadTasks]);

  function handleTaskError(
    err: unknown,
    title: string,
    fallback: string
  ) {
    if (err instanceof ApiError && err.code === 'SESSION_EXPIRED') {
      return;
    }

    setErrorTitle(title);
    setCanRetryError(false);
    setError(err instanceof ApiError ? err.message : fallback);
  }

  useFocusEffect(
    useCallback(() => {
      loadTasks(true);
      return () => {
        const invalidatedSequence = ++listRequestSequence.current;
        if (
          inFlightLoad.current &&
          inFlightLoad.current.requestSequence < invalidatedSequence
        ) {
          inFlightLoad.current = null;
        }
      };
    }, [loadTasks])
  );

  useFocusEffect(
    useCallback(() => {
      loadSummary();
    }, [loadSummary])
  );

  useFocusEffect(
    useCallback(() => {
      void loadCategories();
    }, [loadCategories])
  );

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    setErrorTitle('Unable to refresh tasks');
    setCanRetryError(true);

    try {
      await Promise.all([
        loadTasks(
          false,
          'Unable to refresh tasks',
          'Unable to refresh your tasks. Please try again.'
        ),
        loadSummary(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleAddTask() {
    if (addingTask) return;
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
      await createTask({
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

      await refreshDashboard();

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
    if (task.status === 'Completed' || completingTaskId === task.id) {
      return;
    }

    setCompletingTaskId(task.id);

    try {
      await completeTask(task.id);
      await refreshDashboard();

      setError('');
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.code === 'ALREADY_COMPLETED'
      ) {
        await refreshDashboard();
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
    if (savingTask) return;
    const title = editingTitle.trim();

    if (!title) {
      setErrorTitle('Task title required');
      setCanRetryError(false);
      setError('Please enter a task title.');
      return;
    }

    setSavingTask(true);

    try {
      await updateTask(task.id, {
        title,
        description: editingDescription.trim() || null,
        due_at: editingDueAt.trim() || null,
        priority: editingPriority,
        category_id: editingCategoryId.trim() || null,
      });

      setEditingTaskId(null);
      await refreshDashboard();
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
    if (deletingTaskId === task.id) return;
    setDeletingTaskId(task.id);

    try {
      await deleteTask(task.id);
      if (editingTaskId === task.id) {
        setEditingTaskId(null);
      }
      await refreshDashboard();
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

  function getCategoryName(categoryId: Task['category_id']) {
    if (categoryId === null || categoryId === undefined) {
      return null;
    }
    return categories.find(
      (category) => String(category.id) === String(categoryId)
    )?.name ?? `Category ${categoryId}`;
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
          accessibilityLabel={`Mark ${item.title} complete`}
          accessibilityHint="Marks this task as completed."
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
              <Text style={styles.formLabel}>Category</Text>
              <CategoryPicker
                categories={categories}
                categoryId={editingCategoryId}
                onChange={setEditingCategoryId}
                disabled={savingTask}
              />
              <View style={styles.taskActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Edit task ${item.title}`}
                  style={styles.taskAction}
                  onPress={() => handleSaveTask(item)}
                  disabled={savingTask}
                >
                  <Text style={styles.taskActionText}>
                    {savingTask ? 'Saving...' : 'Save changes'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete task ${item.title}`}
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View task ${item.title}`}
                style={styles.detailsLink}
                onPress={() => router.push(`/task/${item.id}` as never)}
                disabled={savingTask || deleting}
              >
                <Text style={[styles.taskTitle, completed && styles.completedTitle]}>
                  {item.title}
                </Text>
              </Pressable>

              {item.description ? (
                <Text style={styles.description}>
                  {item.description}
                </Text>
              ) : null}

              <Text style={styles.taskMeta}>
                Due: {formatDueDate(item.due_at)}
              </Text>
              {isTaskOverdue(item) ? (
                <Text accessibilityLabel="Overdue task" style={styles.overdueLabel}>Overdue</Text>
              ) : null}
              {getCategoryName(item.category_id) ? (
                <Text style={styles.taskMeta}>{getCategoryName(item.category_id)}</Text>
              ) : null}

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
    const completedAngle = summary && summary.total > 0
      ? (summary.statusCounts.Completed / summary.total) * 360
      : 0;
    const maximumPriorityCount = summary
      ? Math.max(
          summary.priorityCounts.Low,
          summary.priorityCounts.Medium,
          summary.priorityCounts.High
        )
      : 0;

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
              {summaryLoading ? '…' : totalCount ?? '—'}
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
              {summaryLoading ? '…' : pendingCount ?? '—'}
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
              {summaryLoading ? '…' : completedCount ?? '—'}
            </Text>
          </View>
          <View style={[styles.summaryCard, styles.overdueCard]}>
            <Text style={styles.summaryLabel}>OVERDUE TASKS</Text>
            <Text style={styles.summaryNumber}>
              {summaryLoading ? '…' : summary?.overdue ?? '—'}
            </Text>
          </View>
        </View>

        <View style={styles.distributionCard}>
          <Text style={styles.filtersTitle}>Task distribution</Text>
          {summaryLoading && !summary ? (
            <Text style={styles.emptyDashboardText}>
              Loading dashboard statistics...
            </Text>
          ) : null}
          {summaryError ? (
            <View>
              <Text accessibilityRole="alert" style={styles.emptyDashboardText}>
                {summaryError}
              </Text>
              <Pressable
                accessibilityRole="button"
                style={styles.retryButton}
                onPress={() => void loadSummary()}
              >
                <Text style={styles.retryButtonText}>Retry statistics</Text>
              </Pressable>
            </View>
          ) : null}
          {summary && summary.total === 0 && !summaryLoading ? (
            <Text style={styles.emptyDashboardText}>No task data yet. Create a task to see your summary.</Text>
          ) : null}
          {summary && summary.total > 0 ? (
            <>
              <View style={styles.chartsRow}>
                <View style={styles.chartSection}>
                  <Text style={styles.distributionText}>Tasks by status</Text>
                  <View
                    accessibilityRole="image"
                    accessibilityLabel={`Status pie chart: ${summary.statusCounts.Pending} pending, ${summary.statusCounts.Completed} completed`}
                    style={[
                      styles.statusPie,
                      {
                        experimental_backgroundImage:
                          `conic-gradient(#45A477 0deg ${completedAngle}deg, #E4A23B ${completedAngle}deg 360deg)`,
                      },
                    ]}
                  />
                  <Text style={styles.chartLegend}>
                    Pending {summary.statusCounts.Pending} · Completed {summary.statusCounts.Completed}
                  </Text>
                </View>
                <View style={styles.chartSection}>
                  <Text style={styles.distributionText}>Tasks by priority</Text>
                  <View
                    accessibilityRole="image"
                    accessibilityLabel={`Priority bar chart: Low ${summary.priorityCounts.Low}, Medium ${summary.priorityCounts.Medium}, High ${summary.priorityCounts.High}`}
                    style={styles.priorityChart}
                  >
                    {([
                      ['Low', summary.priorityCounts.Low, styles.lowBar],
                      ['Medium', summary.priorityCounts.Medium, styles.mediumBar],
                      ['High', summary.priorityCounts.High, styles.highBar],
                    ] as const).map(([priority, count, barStyle]) => (
                      <View key={priority} style={styles.priorityColumn}>
                        <Text style={styles.chartCount}>{count}</Text>
                        <View style={styles.priorityBarTrack}>
                          <View
                            style={[
                              styles.priorityColumnBar,
                              barStyle,
                              {
                                height: maximumPriorityCount
                                  ? `${(count / maximumPriorityCount) * 100}%`
                                  : 0,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.chartLegend}>{priority}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.filtersCard}>
          <View style={styles.filtersHeadingRow}>
            <Text style={styles.filtersTitle}>Filter tasks</Text>
            <Pressable
              style={styles.resetControl}
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

          {categoriesError ? (
            <View>
              <Text accessibilityRole="alert" style={styles.categoryError}>{categoriesError}</Text>
              <Pressable accessibilityRole="button" onPress={() => void loadCategories()}>
                <Text style={styles.categoryRetry}>Retry categories</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={styles.filterLabel}>Category</Text>
          <View style={styles.filterOptions}>
            {renderFilterChip(
              'All categories',
              categoryFilter === 'All',
              () => setCategoryFilter('All'),
              'all-categories'
            )}
            {renderFilterChip(
              'Uncategorized',
              categoryFilter === 'Uncategorized',
              () => setCategoryFilter('Uncategorized'),
              'uncategorized'
            )}
            {categories.map((category) =>
              renderFilterChip(
                category.name === 'Uncategorized'
                  ? 'Uncategorized category'
                  : category.name,
                categoryFilter === String(category.id),
                () => setCategoryFilter(String(category.id)),
                String(category.id)
              )
            )}
          </View>
        </View>

        <View style={styles.filtersCard}>
          <View style={styles.filtersHeadingRow}>
            <Text style={styles.filtersTitle}>Sort tasks</Text>
            <Pressable
              style={styles.resetControl}
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

          <View style={styles.headerActions}>
            <Pressable accessibilityRole="button" style={styles.addButton} onPress={() => setShowInput((value) => !value)} disabled={addingTask}>
              <Text style={styles.addButtonText}>{showInput ? 'Cancel' : '+ Quick add'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.fullFormButton} onPress={() => router.push('/create-task' as never)} disabled={addingTask}>
              <Text style={styles.fullFormText}>Full form</Text>
            </Pressable>
          </View>
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

            <Text style={styles.formLabel}>Category</Text>
            <CategoryPicker
              categories={categories}
              categoryId={newCategoryId}
              onChange={setNewCategoryId}
              disabled={addingTask}
            />
            {categoriesError ? (
              <Text accessibilityRole="alert" style={styles.categoryError}>{categoriesError}</Text>
            ) : null}

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
                accessibilityRole="button"
                style={styles.retryButton}
                onPress={() => {
                  if (errorTitle === 'Unable to load more tasks') {
                    void loadMoreTasks();
                  } else {
                    void loadTasks(true);
                  }
                }}
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
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews={Platform.OS !== 'web'}
        onEndReached={() => void loadMoreTasks()}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          loading || summaryLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator
                size="large"
                color="#5968D8"
              />
              <Text style={styles.loadingText}>
                Loading your tasks...
              </Text>
            </View>
          ) : !error ? (
            <View style={styles.emptyCard}>
              {summary?.total === 0 || !hasActiveFilters ? (
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
        ListFooterComponent={sortedTasks.length > 0 ? (
          <View style={styles.listFooter}>
            {loadingMore ? (
              <ActivityIndicator size="small" color="#5968D8" />
            ) : hasMore ? (
              <Pressable
                accessibilityRole="button"
                style={styles.loadMoreButton}
                onPress={() => void loadMoreTasks()}
              >
                <Text style={styles.loadMoreButtonText}>Load more tasks</Text>
              </Pressable>
            ) : null}
            <Text style={styles.footer}>
              Small steps lead to big achievements.
            </Text>
          </View>
        ) : undefined}
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
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 26,
  },

  summaryCard: {
    flexBasis: '47%',
    flexGrow: 1,
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

  overdueCard: {
    backgroundColor: '#FFE8E7',
  },

  distributionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7E9F2',
    padding: 14,
    marginTop: 12,
  },

  distributionText: { color: '#626982', fontSize: 12, marginTop: 12 },
  emptyDashboardText: { color: '#777D91', fontSize: 13, marginTop: 8, lineHeight: 20 },
  chartsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: 6 },
  chartSection: { flex: 1, minWidth: 180 },
  statusPie: { width: 120, height: 120, borderRadius: 60, marginTop: 12 },
  chartLegend: { color: '#626982', fontSize: 12, marginTop: 6 },
  priorityChart: { height: 150, flexDirection: 'row', alignItems: 'stretch', gap: 12, marginTop: 8 },
  priorityColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  chartCount: { color: '#626982', fontSize: 12, fontWeight: '700' },
  priorityBarTrack: { flex: 1, width: '100%', maxWidth: 52, justifyContent: 'flex-end', marginTop: 4, backgroundColor: '#EDF0F6', borderRadius: 5, overflow: 'hidden' },
  priorityColumnBar: { width: '100%', borderRadius: 5 },
  lowBar: { backgroundColor: '#45A477' },
  mediumBar: { backgroundColor: '#E4A23B' },
  highBar: { backgroundColor: '#C75050' },

  headerActions: { alignItems: 'flex-end', gap: 4 },
  fullFormButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 10 },
  fullFormText: { color: '#5968D8', fontSize: 12, fontWeight: '700' },

  summaryLabel: {
    color: '#626982',
    fontSize: 11,
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

  resetControl: {
    minHeight: 48,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  resetFiltersDisabled: {
    opacity: 0.45,
  },

  filterLabel: {
    color: '#626982',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 7,
  },

  formLabel: {
    color: '#626982',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 7,
  },

  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  filterChip: {
    minHeight: 48,
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
    minHeight: 48,
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

  categoryError: {
    color: '#B42318',
    fontSize: 13,
    marginTop: 8,
  },

  categoryRetry: {
    color: '#5968D8',
    fontWeight: '700',
    marginTop: 6,
  },

  priorityPicker: {
    minHeight: 48,
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
    minHeight: 48,
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
    minHeight: 48,
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
    width: 48,
    height: 48,
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

  detailsLink: { minHeight: 48, justifyContent: 'center' },
  overdueLabel: { color: '#B42318', fontSize: 12, fontWeight: '800', marginTop: 3 },

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
    fontSize: 12,
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
    minHeight: 48,
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
    fontSize: 11,
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
    fontSize: 12,
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
    minHeight: 48,
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

  listFooter: {
    alignItems: 'center',
    paddingBottom: 8,
  },

  loadMoreButton: {
    minHeight: 48,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    borderRadius: 9,
    backgroundColor: '#5968D8',
  },

  loadMoreButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  footer: {
    textAlign: 'center',
    color: '#9A9FB0',
    fontSize: 11,
    marginTop: 26,
  },
});
