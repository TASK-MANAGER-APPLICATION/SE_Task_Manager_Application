import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import CreateTaskScreen from '../app/create-task';
import { ApiError, createTask, getCategories } from '../services/api';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('../services/authStorage', () => ({ clearSession: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../services/api', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    code?: string;
    constructor(message: string, status: number, code?: string) { super(message); this.status = status; this.code = code; }
  },
  createTask: jest.fn(),
  getCategories: jest.fn(),
}));

describe('CreateTaskScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getCategories).mockResolvedValue({
      categories: [{ id: 7, name: 'School' }],
    });
  });

  test('requires a title before calling the API', async () => {
    const screen = await render(<CreateTaskScreen />);
    await fireEvent.press(screen.getByLabelText('Create task submit'));
    expect(screen.getByText('Task title is required.')).toBeTruthy();
    expect(createTask).not.toHaveBeenCalled();
  });

  test('validates the optional due date and offers managed categories', async () => {
    const screen = await render(<CreateTaskScreen />);
    await fireEvent.changeText(screen.getByLabelText('Task title'), 'Plan release');
    await fireEvent.changeText(screen.getByLabelText('Due date'), 'bad date');
    expect(await screen.findByRole('radio', { name: 'School' })).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Create task submit'));
    expect(screen.getByText('Enter a valid date and time.')).toBeTruthy();
    expect(createTask).not.toHaveBeenCalled();
  });

  test('distinguishes categories named All and None from special picker options', async () => {
    jest.mocked(getCategories).mockResolvedValue({
      categories: [
        { id: 1, name: 'All' },
        { id: 2, name: 'None' },
      ],
    });
    const screen = await render(<CreateTaskScreen />);

    expect(await screen.findByRole('radio', { name: 'Uncategorized' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'All' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'None' })).toBeTruthy();
  });

  test('distinguishes a category named Uncategorized from the unassigned option', async () => {
    jest.mocked(getCategories).mockResolvedValue({
      categories: [{ id: 8, name: 'Uncategorized' }],
    });
    const screen = await render(<CreateTaskScreen />);

    expect(await screen.findByRole('radio', { name: 'Uncategorized' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Uncategorized category' })).toBeTruthy();
  });

  test('submits existing task fields and retains values after API failure', async () => {
    jest.mocked(createTask).mockRejectedValue(new ApiError('Unable to create task.', 500, 'INTERNAL_ERROR'));
    const screen = await render(<CreateTaskScreen />);
    await fireEvent.changeText(screen.getByLabelText('Task title'), 'Plan release');
    await fireEvent.changeText(screen.getByLabelText('Description'), 'Write release notes');
    await fireEvent.press(await screen.findByRole('radio', { name: 'School' }));
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
