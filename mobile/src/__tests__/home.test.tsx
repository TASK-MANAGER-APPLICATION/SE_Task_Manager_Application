import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import HomeScreen from '../app/home';
import {
  completeTask,
  getCategories,
  deleteTask,
  getTasks,
  getTaskSummary,
  Task,
  TaskSummary,
  updateTask,
} from '../services/api';

const sample: Task = {
  id: 4, title: 'Ship update', description: 'Prepare release', priority: 'High',
  status: 'Pending', due_at: '2030-03-10T12:00:00Z', category_id: 2,
};
const refreshedSample: Task = {
  ...sample,
  id: 5,
  title: 'Updated task list',
};
const sampleSummary: TaskSummary = {
  total: 1,
  completed: 0,
  pending: 1,
  overdue: 0,
  statusCounts: { Pending: 1, Completed: 0 },
  priorityCounts: { Low: 0, Medium: 0, High: 1 },
};

let mockHomeFocused = true;
const mockHomeFocusListeners = new Set<() => void>();

function setMockHomeFocused(focused: boolean) {
  mockHomeFocused = focused;
  mockHomeFocusListeners.forEach((listener) => listener());
}

function mockSubscribeToHomeFocus(listener: () => void) {
  mockHomeFocusListeners.add(listener);
  return () => mockHomeFocusListeners.delete(listener);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useFocusEffect: (callback: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    const focused = React.useSyncExternalStore(
      mockSubscribeToHomeFocus,
      () => mockHomeFocused,
      () => mockHomeFocused
    );
    React.useEffect(() => {
      if (!focused) {
        return;
      }

      return callback();
    }, [callback, focused]);
  },
}));
jest.mock(
  'react-native/Libraries/Components/RefreshControl/RefreshControl',
  () => {
    const React = jest.requireActual<typeof import('react')>('react');
    const ReactNative =
      jest.requireActual<typeof import('react-native')>('react-native');

    return {
      __esModule: true,
      default: ({
        refreshing,
        onRefresh,
      }: {
        refreshing: boolean;
        onRefresh: () => void;
      }) =>
        React.createElement(ReactNative.View, {
          testID: 'home-refresh-control',
          accessibilityLabel: `refreshing-${refreshing}`,
          onTouchEnd: onRefresh,
        }),
    };
  }
);
jest.mock('../services/api', () => ({
  ApiError: class ApiError extends Error { status = 500; code?: string; },
  getTasks: jest.fn(),
  getCategories: jest.fn(),
  getTaskSummary: jest.fn(),
  createTask: jest.fn(),
  completeTask: jest.fn(),
  deleteTask: jest.fn(),
  updateTask: jest.fn(),
}));

describe('HomeScreen task list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHomeFocused = true;
    mockHomeFocusListeners.clear();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(getTasks).mockResolvedValue({ tasks: [] });
    jest.mocked(getTaskSummary).mockResolvedValue(sampleSummary);
    jest.mocked(getCategories).mockResolvedValue({
      categories: [
        { id: 2, name: 'School' },
        { id: 3, name: 'Personal' },
      ],
    });
  });
  afterEach(() => {
    mockHomeFocused = true;
    mockHomeFocusListeners.clear();
    jest.restoreAllMocks();
  });
  
  test('shows loading followed by the empty state', async () => {
  jest.mocked(getTasks).mockResolvedValue({ tasks: [] });

  const screen = await render(<HomeScreen />);

  expect(await screen.findByText('No tasks yet')).toBeTruthy();
});

  test('renders the dashboard while the initial task request is pending', async () => {
    const initialRequest = deferred<{ tasks: Task[] }>();
    jest.mocked(getTasks).mockReturnValue(initialRequest.promise);

    const screen = await render(<HomeScreen />);

    expect(screen.getByText('Task Manager')).toBeTruthy();
    expect(screen.getByText('Loading your tasks...')).toBeTruthy();
    expect(getTasks).toHaveBeenCalledTimes(1);

    await act(async () => {
      initialRequest.resolve({ tasks: [sample] });
    });

    expect(await screen.findByText('Ship update')).toBeTruthy();
  });

  test('starts a new task request after losing and regaining focus', async () => {
    const staleTask = { ...sample, id: 8, title: 'Stale task response' };
    const freshTask = { ...sample, id: 9, title: 'Fresh task response' };
    const staleRequest = deferred<{ tasks: Task[] }>();
    const freshRequest = deferred<{ tasks: Task[] }>();
    jest.mocked(getTasks)
      .mockReturnValueOnce(staleRequest.promise)
      .mockReturnValueOnce(freshRequest.promise);

    const screen = await render(<HomeScreen />);
    expect(screen.getByText('Loading your tasks...')).toBeTruthy();
    expect(getTasks).toHaveBeenCalledTimes(1);

    await act(async () => {
      setMockHomeFocused(false);
    });
    await act(async () => {
      setMockHomeFocused(true);
    });

    expect(getTasks).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Loading your tasks...')).toBeTruthy();

    await act(async () => {
      staleRequest.resolve({ tasks: [staleTask] });
    });

    expect(screen.queryByText('Stale task response')).toBeNull();
    expect(screen.getByText('Loading your tasks...')).toBeTruthy();

    await act(async () => {
      freshRequest.resolve({ tasks: [freshTask] });
    });

    expect(await screen.findByText('Fresh task response')).toBeTruthy();
    expect(screen.queryByText('Stale task response')).toBeNull();
    expect(screen.queryByText('Loading your tasks...')).toBeNull();
  });

  test('pull-to-refresh loads updated data after initial loading', async () => {
    const initialRequest = deferred<{ tasks: Task[] }>();
    const refreshRequest = deferred<{ tasks: Task[] }>();
    jest
      .mocked(getTasks)
      .mockReturnValueOnce(initialRequest.promise)
      .mockReturnValueOnce(refreshRequest.promise);

    const screen = await render(<HomeScreen />);
    expect(screen.getByText('Task Manager')).toBeTruthy();

    await act(async () => {
      initialRequest.resolve({ tasks: [sample] });
    });
    expect(await screen.findByText('Ship update')).toBeTruthy();

    let refreshControl = screen.getByTestId('home-refresh-control');
    let refreshPromise!: Promise<void>;
    await act(async () => {
      refreshPromise = refreshControl.props.onTouchEnd();
    });

    expect(refreshControl.props.accessibilityLabel).toBe('refreshing-true');
    expect(getTasks).toHaveBeenCalledTimes(2);

    await act(async () => {
      refreshRequest.resolve({ tasks: [refreshedSample] });
      await refreshPromise;
    });

    expect(await screen.findByText('Updated task list')).toBeTruthy();
    expect(screen.queryByText('Ship update')).toBeNull();
    refreshControl = screen.getByTestId('home-refresh-control');
    expect(refreshControl.props.accessibilityLabel).toBe('refreshing-false');
  });

  test('coalesces multiple refreshes while the initial task load is pending', async () => {
    const initialRequest = deferred<{ tasks: Task[] }>();
    jest.mocked(getTasks).mockReturnValue(initialRequest.promise);

    const screen = await render(<HomeScreen />);
    let refreshControl = screen.getByTestId('home-refresh-control');
    let firstRefresh!: Promise<void>;
    let secondRefresh!: Promise<void>;

    await act(async () => {
      firstRefresh = refreshControl.props.onTouchEnd();
      secondRefresh = refreshControl.props.onTouchEnd();
    });

    expect(refreshControl.props.accessibilityLabel).toBe('refreshing-true');
    expect(getTasks).toHaveBeenCalledTimes(1);

    await act(async () => {
      initialRequest.resolve({ tasks: [refreshedSample] });
      await Promise.all([firstRefresh, secondRefresh]);
    });

    expect(await screen.findByText('Updated task list')).toBeTruthy();
    expect(screen.queryByText('Ship update')).toBeNull();
    refreshControl = screen.getByTestId('home-refresh-control');
    expect(refreshControl.props.accessibilityLabel).toBe('refreshing-false');
    expect(getTasks).toHaveBeenCalledTimes(1);
  });

  test('resets the refresh indicator after a failed request', async () => {
    jest.mocked(getTasks).mockResolvedValueOnce({ tasks: [sample] });
    const screen = await render(<HomeScreen />);
    await screen.findByText('Ship update');
    const refreshRequest = deferred<{ tasks: Task[] }>();
    jest.mocked(getTasks).mockReturnValueOnce(refreshRequest.promise);

    let refreshControl = screen.getByTestId('home-refresh-control');
    let refreshPromise!: Promise<void>;
    await act(async () => {
      refreshPromise = refreshControl.props.onTouchEnd();
    });
    expect(refreshControl.props.accessibilityLabel).toBe('refreshing-true');
    await act(async () => {
      refreshRequest.reject(new Error('Service unavailable'));
      await refreshPromise;
    });

    expect(await screen.findByText(
      'Unable to refresh your tasks. Please try again.'
    )).toBeTruthy();
    refreshControl = screen.getByTestId('home-refresh-control');
    expect(refreshControl.props.accessibilityLabel).toBe('refreshing-false');
  });

  test('keeps refresh error context when the shared initial request fails', async () => {
    const initialRequest = deferred<{ tasks: Task[] }>();
    jest.mocked(getTasks).mockReturnValue(initialRequest.promise);

    const screen = await render(<HomeScreen />);
    const refreshControl = screen.getByTestId('home-refresh-control');
    let refreshPromise!: Promise<void>;

    await act(async () => {
      refreshPromise = refreshControl.props.onTouchEnd();
    });

    expect(refreshControl.props.accessibilityLabel).toBe('refreshing-true');
    expect(getTasks).toHaveBeenCalledTimes(1);

    await act(async () => {
      initialRequest.reject(new Error('Service unavailable'));
      await refreshPromise;
    });

    expect(await screen.findByText('Unable to refresh tasks')).toBeTruthy();
    expect(
      screen.getByText('Unable to refresh your tasks. Please try again.')
    ).toBeTruthy();
    expect(screen.queryByText(
      'Unable to load your tasks. Please try again.'
    )).toBeNull();
    expect(screen.getByTestId('home-refresh-control')
      .props.accessibilityLabel).toBe('refreshing-false');
  });

  test('shows a retry action for loading errors', async () => {
    jest.mocked(getTasks).mockRejectedValueOnce(new Error('Service unavailable'));
    const screen = await render(<HomeScreen />);
    expect(await screen.findByText('Unable to load your tasks. Please try again.')).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();
    jest.mocked(getTasks).mockResolvedValue({ tasks: [sample] });
    await fireEvent.press(screen.getByText('Retry'));
    expect(await screen.findByText('Ship update')).toBeTruthy();
  });

  test('keeps task content visible and retries a failed summary request', async () => {
    jest.mocked(getTasks).mockResolvedValue({ tasks: [sample] });
    jest.mocked(getTaskSummary)
      .mockRejectedValueOnce(new Error('Summary unavailable'))
      .mockResolvedValueOnce(sampleSummary);

    const screen = await render(<HomeScreen />);

    expect(await screen.findByText('Ship update')).toBeTruthy();
    expect(await screen.findByText(
      'Unable to load dashboard statistics. Please try again.'
    )).toBeTruthy();
    await fireEvent.press(screen.getByText('Retry statistics'));

    expect(await screen.findByText('Tasks by status')).toBeTruthy();
    expect(screen.queryByText(
      'Unable to load dashboard statistics. Please try again.'
    )).toBeNull();
    expect(getTaskSummary).toHaveBeenCalledTimes(2);
  });

  test('renders task data and completes a task through the existing API', async () => {
    jest.mocked(getTasks)
      .mockResolvedValueOnce({ tasks: [sample] })
      .mockResolvedValue({ tasks: [{ ...sample, status: 'Completed' }] });
    jest.mocked(completeTask).mockResolvedValue({ task: { ...sample, status: 'Completed' } });
    const screen = await render(<HomeScreen />);
    expect(await screen.findByText('Ship update')).toBeTruthy();
    expect(screen.getByText('High priority')).toBeTruthy();
    expect(screen.getAllByText('School').length).toBeGreaterThan(0);
    const checkbox = screen.getByRole('checkbox');
    await fireEvent.press(checkbox);
    await waitFor(() => expect(completeTask).toHaveBeenCalledWith(sample.id));
    await waitFor(() => expect(screen.queryByText('In progress')).toBeNull());
  });

  test('shows and clears the empty filtered state', async () => {
    jest.mocked(getTasks).mockResolvedValue({ tasks: [sample] });
    const screen = await render(<HomeScreen />);
    await screen.findByText('Ship update');
    await fireEvent.press(screen.getByText('Completed'));
    expect(await screen.findByText('No matching tasks')).toBeTruthy();
    await fireEvent.press(screen.getAllByText('Reset filters')[0]);
    expect(await screen.findByText('Ship update')).toBeTruthy();
  });

  test('filters tasks by category and assigns a category during inline editing', async () => {
    jest.mocked(getTasks).mockResolvedValue({ tasks: [sample] });
    const screen = await render(<HomeScreen />);
    await screen.findByText('Ship update');

    await fireEvent.press(screen.getByText('Personal'));
    await waitFor(() => expect(getTasks).toHaveBeenLastCalledWith(
      expect.objectContaining({ categoryId: '3' })
    ));

    jest.mocked(updateTask).mockResolvedValue({
      task: { ...sample, category_id: 3 },
    });
    await fireEvent.press(screen.getAllByText('Reset filters')[0]);
    await screen.findByText('Ship update');
    await fireEvent.press(screen.getByText('Edit'));
    await fireEvent.press(screen.getByRole('radio', { name: 'Personal' }));
    await fireEvent.press(screen.getByText('Save changes'));
    await waitFor(() => expect(updateTask).toHaveBeenCalledWith(
      sample.id,
      expect.objectContaining({ category_id: '3' })
    ));
  });

  test('distinguishes a category named All from the all-categories filter', async () => {
    jest.mocked(getCategories).mockResolvedValue({
      categories: [{ id: 20, name: 'All' }],
    });
    jest.mocked(getTasks).mockResolvedValue({ tasks: [sample] });
    const screen = await render(<HomeScreen />);
    await screen.findByText('Ship update');

    expect(screen.getByText('All categories')).toBeTruthy();
    const allLabels = screen.getAllByText('All');
    await fireEvent.press(allLabels[allLabels.length - 1]);
    await waitFor(() => expect(getTasks).toHaveBeenLastCalledWith(
      expect.objectContaining({ categoryId: '20' })
    ));
  });

  test('filters only tasks with no category assigned', async () => {
    const uncategorizedTask: Task = {
      ...sample,
      id: 15,
      title: 'Uncategorized task',
      category_id: null,
    };
    jest.mocked(getTasks).mockResolvedValue({
      tasks: [sample, uncategorizedTask],
    });
    const screen = await render(<HomeScreen />);
    await screen.findByText('Ship update');

    await fireEvent.press(screen.getByRole('button', { name: 'Uncategorized' }));

    await waitFor(() => expect(getTasks).toHaveBeenLastCalledWith(
      expect.objectContaining({ categoryId: 'uncategorized' })
    ));
    expect(screen.getByText('Uncategorized task')).toBeTruthy();
    expect(screen.queryByText('Ship update')).toBeNull();
  });

  test('confirms before deleting and removes task after confirmation', async () => {
    jest.mocked(getTasks)
      .mockResolvedValueOnce({ tasks: [sample] })
      .mockResolvedValue({ tasks: [] });
    jest.mocked(deleteTask).mockResolvedValue(undefined);
    const screen = await render(<HomeScreen />);
    await fireEvent.press(await screen.findByText('Delete'));
    expect(Alert.alert).toHaveBeenCalled();
    expect(deleteTask).not.toHaveBeenCalled();
    const actions = jest.mocked(Alert.alert).mock.calls[0][2] as { onPress?: () => void }[];
    await act(async () => { actions.find((action) => action.onPress)?.onPress?.(); });
    await waitFor(() => expect(deleteTask).toHaveBeenCalledWith(sample.id));
    await waitFor(() => expect(screen.queryByText('Ship update')).toBeNull());
  });

  test('loads dashboard statistics separately and pages task rows', async () => {
    const firstPage = Array.from({ length: 50 }, (_, index) => ({
      ...sample,
      id: index + 1,
      title: `Task ${index + 1}`,
    }));
    jest.mocked(getTasks)
      .mockResolvedValueOnce({ tasks: firstPage, hasMore: true })
      .mockResolvedValueOnce({
        tasks: [{ ...sample, id: 51, title: 'Task 51' }],
        hasMore: false,
      });
    jest.mocked(getTaskSummary).mockResolvedValue({
      ...sampleSummary,
      total: 1000,
      pending: 1000,
      statusCounts: { Pending: 1000, Completed: 0 },
    });

    const screen = await render(<HomeScreen />);

    expect(await screen.findByText('Task 1')).toBeTruthy();
    expect(screen.getAllByText('1000').length).toBeGreaterThan(0);
    expect(getTasks).toHaveBeenCalledWith(expect.objectContaining({
      limit: 50,
      offset: 0,
    }));
    expect(getTaskSummary).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByText('Load more tasks'));

    await waitFor(() => expect(getTasks).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 50 })
    ));
    expect(jest.mocked(getTasks).mock.calls.map(([params]) => params?.offset))
      .toEqual([0, 50]);
    await waitFor(() => {
      expect(screen.queryByText('Load more tasks')).toBeNull();
    });
    expect(getTasks).toHaveBeenLastCalledWith(expect.objectContaining({
      limit: 50,
      offset: 50,
    }));
  });
});
