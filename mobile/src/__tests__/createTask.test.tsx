import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import CreateTaskScreen from '../app/create-task';
import { ApiError, createTask } from '../services/api';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('../services/authStorage', () => ({ clearSession: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../services/api', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    code?: string;
    constructor(message: string, status: number, code?: string) { super(message); this.status = status; this.code = code; }
  },
  createTask: jest.fn(),
}));

describe('CreateTaskScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  test('requires a title before calling the API', async () => {
    const screen = await render(<CreateTaskScreen />);
    await fireEvent.press(screen.getByLabelText('Create task submit'));
    expect(screen.getByText('Task title is required.')).toBeTruthy();
    expect(createTask).not.toHaveBeenCalled();
  });

  test('validates optional due date and category id', async () => {
    const screen = await render(<CreateTaskScreen />);
    await fireEvent.changeText(screen.getByLabelText('Task title'), 'Plan release');
    await fireEvent.changeText(screen.getByLabelText('Due date'), 'bad date');
    await fireEvent.changeText(screen.getByLabelText('Category ID'), '-1');
    await fireEvent.press(screen.getByLabelText('Create task submit'));
    expect(screen.getByText('Enter a valid date and time.')).toBeTruthy();
    expect(screen.getByText('Category ID must be a positive whole number.')).toBeTruthy();
    expect(createTask).not.toHaveBeenCalled();
  });

  test('submits existing task fields and retains values after API failure', async () => {
    jest.mocked(createTask).mockRejectedValue(new ApiError('Unable to create task.', 500, 'INTERNAL_ERROR'));
    const screen = await render(<CreateTaskScreen />);
    await fireEvent.changeText(screen.getByLabelText('Task title'), 'Plan release');
    await fireEvent.changeText(screen.getByLabelText('Description'), 'Write release notes');
    await fireEvent.changeText(screen.getByLabelText('Category ID'), '7');
    await fireEvent.press(screen.getByText('High'));
    await fireEvent.press(screen.getByLabelText('Create task submit'));
    await waitFor(() => expect(createTask).toHaveBeenCalledWith({
      title: 'Plan release', description: 'Write release notes', priority: 'High', category_id: '7',
    }));
    expect(await screen.findByText('Unable to create task.')).toBeTruthy();
    expect(screen.getByLabelText('Task title').props.value).toBe('Plan release');
  });

  test('calls the success callback after successful task creation', async () => {
    const onCreated = jest.fn();
    jest.mocked(createTask).mockResolvedValue({ task: { id: 1, title: 'Plan release' } });
    const screen = await render(<CreateTaskScreen onCreated={onCreated} />);
    await fireEvent.changeText(screen.getByLabelText('Task title'), 'Plan release');
    await fireEvent.press(screen.getByLabelText('Create task submit'));
    await waitFor(() => expect(createTask).toHaveBeenCalledWith({ title: 'Plan release', priority: 'Medium' }));
    expect(onCreated).toHaveBeenCalledTimes(1);
  });
});
