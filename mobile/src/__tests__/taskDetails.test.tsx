import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import TaskDetailsScreen from '../app/task/[id]';
import { completeTask, getTask, Task, updateTask } from '../services/api';

const task: Task = {
  id: 12,
  title: 'Prepare demo',
  description: 'Slides and walkthrough',
  due_at: '2030-04-01T12:00:00Z',
  priority: 'High',
  status: 'Pending',
  category_id: 5,
  reminder_sent: false,
  created_at: '2029-12-01T00:00:00Z',
  updated_at: '2029-12-02T00:00:00Z',
};

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: () => ({ id: '12' }),
}));
jest.mock('../services/authStorage', () => ({ clearSession: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../services/api', () => ({
  ApiError: class ApiError extends Error { status = 500; code?: string; },
  getTask: jest.fn(),
  completeTask: jest.fn(),
  deleteTask: jest.fn(),
  updateTask: jest.fn(),
}));

describe('TaskDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(getTask).mockResolvedValue({ task });
  });
  afterEach(() => jest.restoreAllMocks());

  test('loads task details and supported metadata', async () => {
    const screen = await render(<TaskDetailsScreen />);
    expect(await screen.findByText('Prepare demo')).toBeTruthy();
    expect(screen.getByText('Slides and walkthrough')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('No')).toBeTruthy();
  });

  test('shows loading and retryable error states', async () => {
    let rejectTasks: (reason: Error) => void = () => {};
    jest.mocked(getTask).mockReturnValue(new Promise((_, reject) => { rejectTasks = reject; }));
    const screen = await render(<TaskDetailsScreen />);
    expect(screen.getByText('Loading task...')).toBeTruthy();
    rejectTasks(new Error('Server unavailable'));
    expect(await screen.findByText('Unable to load this task. Please try again.')).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();
  });

  test('marks task complete using the existing endpoint', async () => {
    jest.mocked(completeTask).mockResolvedValue({ task: { ...task, status: 'Completed' } });
    const screen = await render(<TaskDetailsScreen />);
    await fireEvent.press(await screen.findByText('Mark Complete'));
    await waitFor(() => expect(completeTask).toHaveBeenCalledWith(task.id));
    expect(screen.queryByText('Mark Complete')).toBeNull();
  });

  test('edits a task through PUT and displays the returned task', async () => {
    jest.mocked(updateTask).mockResolvedValue({ task: { ...task, title: 'Updated demo' } });
    const screen = await render(<TaskDetailsScreen />);
    await fireEvent.press(await screen.findByText('Edit Task'));
    await fireEvent.changeText(screen.getByLabelText('Task title'), 'Updated demo');
    await fireEvent.press(screen.getByText('Save Changes'));
    await waitFor(() => expect(updateTask).toHaveBeenCalledWith(task.id, expect.objectContaining({
      title: 'Updated demo', priority: 'High', category_id: '5',
    })));
    expect(await screen.findByText('Updated demo')).toBeTruthy();
  });

  test('preserves edits and displays API errors when save fails', async () => {
    jest.mocked(updateTask).mockRejectedValue(new Error('Save unavailable'));
    const screen = await render(<TaskDetailsScreen />);
    await fireEvent.press(await screen.findByText('Edit Task'));
    await fireEvent.changeText(screen.getByLabelText('Task title'), 'Unsaved title');
    await fireEvent.press(screen.getByText('Save Changes'));
    expect(await screen.findByText('Unable to save this task. Please try again.')).toBeTruthy();
    expect(screen.getByLabelText('Task title').props.value).toBe('Unsaved title');
  });

  test('asks for confirmation before deletion', async () => {
    const screen = await render(<TaskDetailsScreen />);
    await fireEvent.press(await screen.findByText('Delete Task'));
    expect(Alert.alert).toHaveBeenCalledWith('Delete task', expect.stringContaining('Prepare demo'), expect.any(Array));
  });
});
