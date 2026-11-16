import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import CategoryManager from '../components/category-manager';
import {
  ApiError,
  createCategory,
  deleteCategory,
  getCategories,
  renameCategory,
} from '../services/api';

jest.mock('../services/api', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    code?: string;
    constructor(message: string, status: number, code?: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
  createCategory: jest.fn(),
  deleteCategory: jest.fn(),
  getCategories: jest.fn(),
  renameCategory: jest.fn(),
}));

const categories = [{ id: 1, name: 'Work' }];

describe('CategoryManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getCategories).mockResolvedValue({ categories });
  });

  afterEach(() => jest.restoreAllMocks());

  test('loads categories and creates a trimmed category name', async () => {
    jest.mocked(createCategory).mockResolvedValue({
      category: { id: 2, name: 'Personal' },
    });
    const screen = await render(<CategoryManager />);
    expect(await screen.findByText('Work')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('New category name'), '  Personal  ');
    await fireEvent.press(screen.getByText('Add'));

    await waitFor(() => expect(createCategory).toHaveBeenCalledWith('Personal'));
    expect(await screen.findByText('Personal')).toBeTruthy();
    expect(screen.getByText('Category created.')).toBeTruthy();
  });

  test('allows up to 255 supplementary-plane characters in category names', async () => {
    const validName = '😀'.repeat(255);
    jest.mocked(createCategory).mockResolvedValue({
      category: { id: 2, name: validName },
    });
    const screen = await render(<CategoryManager />);
    await screen.findByText('Work');
    const input = screen.getByLabelText('New category name');

    await fireEvent.changeText(input, `${validName}😀`);
    expect(screen.getByLabelText('New category name').props.value).toBe(validName);
    await fireEvent.press(screen.getByText('Add'));

    await waitFor(() => expect(createCategory).toHaveBeenCalledWith(validName));
    expect(await screen.findByText(validName)).toBeTruthy();
  });

  test('renames a category and reports duplicate-name errors', async () => {
    jest.mocked(renameCategory).mockRejectedValue(
      new ApiError('A category with this name already exists.', 409, 'DUPLICATE_CATEGORY')
    );
    const screen = await render(<CategoryManager />);
    await screen.findByText('Work');
    await fireEvent.press(screen.getByText('Rename'));
    await fireEvent.changeText(screen.getByLabelText('Rename Work'), 'Personal');
    await fireEvent.press(screen.getByText('Save'));

    expect(await screen.findByText('A category with this name already exists.')).toBeTruthy();
    expect(screen.queryByText('Category renamed.')).toBeNull();
    expect(renameCategory).toHaveBeenCalledWith(1, 'Personal');
  });

  test('confirms deletion and keeps task-preservation feedback', async () => {
    jest.mocked(deleteCategory).mockResolvedValue(undefined);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const screen = await render(<CategoryManager />);
    await screen.findByText('Work');

    await fireEvent.press(screen.getByText('Delete'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete category',
      expect.stringContaining('Tasks will be kept'),
      expect.any(Array)
    );
    expect(deleteCategory).not.toHaveBeenCalled();

    const actions = jest.mocked(Alert.alert).mock.calls[0][2] as
      { onPress?: () => void }[];
    await act(async () => {
      actions.find((action) => action.onPress)?.onPress?.();
    });

    await waitFor(() => expect(deleteCategory).toHaveBeenCalledWith(1));
    expect(await screen.findByText('No categories yet.')).toBeTruthy();
    expect(screen.getByText('"Work" deleted. Tasks using it were kept.')).toBeTruthy();
  });

  test('shows a retry action when categories fail to load', async () => {
    jest.mocked(getCategories)
      .mockRejectedValueOnce(new ApiError('Categories unavailable.', 500))
      .mockResolvedValueOnce({ categories });
    const screen = await render(<CategoryManager />);

    expect(await screen.findByText('Categories unavailable.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Retry'));
    expect(await screen.findByText('Work')).toBeTruthy();
    expect(getCategories).toHaveBeenCalledTimes(2);
  });
});
