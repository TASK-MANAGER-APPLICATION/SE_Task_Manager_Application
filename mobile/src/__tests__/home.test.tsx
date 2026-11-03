import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import HomeScreen from '../app/home';
import { ApiError, completeTask, deleteTask, getTasks, Task } from '../services/api';
import { clearSession } from '../services/authStorage';

const sample: Task = {
  id: 4, title: 'Ship update', description: 'Prepare release', priority: 'High',
  status: 'Pending', due_at: '2030-03-10T12:00:00Z', category_id: 2,
};

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useFocusEffect: (callback: () => void) => jest.requireActual<typeof import('react')>('react').useEffect(callback, [callback]),
}));
jest.mock('../services/authStorage', () => ({ clearSession: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../services/api', () => ({
  ApiError: class ApiError extends Error { status = 500; code?: string; },
  getTasks: jest.fn(),
  completeTask: jest.fn(),
  deleteTask: jest.fn(),
  updateTask: jest.fn(),
}));

describe('HomeScreen task list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(getTasks).mockResolvedValue({ tasks: [] });
  });
  afterEach(() => jest.restoreAllMocks());
  
  test('shows loading followed by the empty state', async () => {
  jest.mocked(getTasks).mockResolvedValue({ tasks: [] });

  const screen = await render(<HomeScreen />);

  expect(await screen.findByText('No tasks yet')).toBeTruthy();
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

  test('clears the local session when task loading returns 401', async () => {
    const expired = Object.assign(new ApiError('Session expired.', 401, 'SESSION_EXPIRED'), { status: 401, code: 'SESSION_EXPIRED' });
    jest.mocked(getTasks).mockRejectedValue(expired);
    await render(<HomeScreen />);
    await waitFor(() => expect(clearSession).toHaveBeenCalled());
    expect(Alert.alert).toHaveBeenCalledWith('Session expired', expect.any(String), expect.any(Array));
  });

  test('renders task data and completes a task through the existing API', async () => {
    jest.mocked(getTasks).mockResolvedValue({ tasks: [sample] });
    jest.mocked(completeTask).mockResolvedValue({ task: { ...sample, status: 'Completed' } });
    const screen = await render(<HomeScreen />);
    expect(await screen.findByText('Ship update')).toBeTruthy();
    expect(screen.getByText('High priority')).toBeTruthy();
    expect(screen.getByText('Category ID: 2')).toBeTruthy();
    const checkbox = screen.getByRole('checkbox');
    await fireEvent.press(checkbox);
    await waitFor(() => expect(completeTask).toHaveBeenCalledWith(sample.id));
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
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

  test('confirms before deleting and removes task after confirmation', async () => {
    jest.mocked(getTasks).mockResolvedValue({ tasks: [sample] });
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
});
