import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import ChangePasswordScreen from '../app/change-password';
import { ApiError, changePassword } from '../services/api';
import { clearSession } from '../services/authStorage';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  router: { replace: mockReplace, push: jest.fn() },
}));

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
  changePassword: jest.fn(),
}));

jest.mock('../services/authStorage', () => ({
  clearSession: jest.fn().mockResolvedValue(undefined),
}));

const strongPassword = 'Password123!';

describe('ChangePasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders all password fields with secure entry', async () => {
    const screen = await render(<ChangePasswordScreen />);
    for (const label of ['Current Password', 'New Password', 'Confirm New Password']) {
      expect(screen.getByLabelText(label).props.secureTextEntry).toBe(true);
    }
  });

  test.each([
    ['', strongPassword, strongPassword, 'Current password is required.'],
    ['Current123!', '', '', 'New password is required.'],
    ['Current123!', strongPassword, '', 'Please confirm your new password.'],
    ['Current123!', 'weak', 'weak', 'Password must be at least 8 characters'],
    ['Current123!', strongPassword, 'Different123!', 'Passwords do not match.'],
  ])('rejects invalid values without calling the API', async (current, next, confirm, message) => {
    const screen = await render(<ChangePasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText('Current Password'), current);
    await fireEvent.changeText(screen.getByLabelText('New Password'), next);
    await fireEvent.changeText(screen.getByLabelText('Confirm New Password'), confirm);
    await fireEvent.press(screen.getByText('Update Password'));
    expect(screen.getByText(new RegExp(message))).toBeTruthy();
    expect(changePassword).not.toHaveBeenCalled();
  });

  test('submits current and new passwords, clears session, and reports success', async () => {
    jest.mocked(changePassword).mockResolvedValue(undefined);
    const screen = await render(<ChangePasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText('Current Password'), 'Current123!');
    await fireEvent.changeText(screen.getByLabelText('New Password'), strongPassword);
    await fireEvent.changeText(screen.getByLabelText('Confirm New Password'), strongPassword);
    await fireEvent.press(screen.getByText('Update Password'));
    await waitFor(() => expect(changePassword).toHaveBeenCalledWith('Current123!', strongPassword));
    await waitFor(() => expect(clearSession).toHaveBeenCalled());
    expect(Alert.alert).toHaveBeenCalledWith('Password changed', expect.any(String), expect.any(Array));
  });

  test('shows incorrect current password as an inline error', async () => {
    jest.mocked(changePassword).mockRejectedValue(new ApiError('Current password is incorrect.', 401, 'INVALID_CREDENTIALS'));
    const screen = await render(<ChangePasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText('Current Password'), 'Wrong123!');
    await fireEvent.changeText(screen.getByLabelText('New Password'), strongPassword);
    await fireEvent.changeText(screen.getByLabelText('Confirm New Password'), strongPassword);
    await fireEvent.press(screen.getByText('Update Password'));
    expect(await screen.findByText('Current password is incorrect.')).toBeTruthy();
    expect(clearSession).not.toHaveBeenCalled();
  });

  test.each([
    new ApiError('Session expired.', 401, 'SESSION_EXPIRED'),
    new ApiError('Unauthorized.', 401, 'UNAUTHORIZED'),
  ])('clears session on expired or unauthorized response', async (apiError) => {
    jest.mocked(changePassword).mockRejectedValue(apiError);
    const screen = await render(<ChangePasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText('Current Password'), 'Current123!');
    await fireEvent.changeText(screen.getByLabelText('New Password'), strongPassword);
    await fireEvent.changeText(screen.getByLabelText('Confirm New Password'), strongPassword);
    await fireEvent.press(screen.getByText('Update Password'));
    await waitFor(() => expect(clearSession).toHaveBeenCalled());
    expect(Alert.alert).toHaveBeenCalledWith('Session expired', expect.any(String), expect.any(Array));
  });

  test('shows weak-password API errors', async () => {
    jest.mocked(changePassword).mockRejectedValue(new ApiError('The new password does not meet the requirements.', 400, 'WEAK_PASSWORD'));
    const screen = await render(<ChangePasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText('Current Password'), 'Current123!');
    await fireEvent.changeText(screen.getByLabelText('New Password'), strongPassword);
    await fireEvent.changeText(screen.getByLabelText('Confirm New Password'), strongPassword);
    await fireEvent.press(screen.getByText('Update Password'));
    expect(await screen.findByText('The new password does not meet the requirements.')).toBeTruthy();
  });

  test('shows generic API errors', async () => {
    jest.mocked(changePassword).mockRejectedValue(new ApiError('Network failed.', 500, 'INTERNAL_ERROR'));
    const screen = await render(<ChangePasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText('Current Password'), 'Current123!');
    await fireEvent.changeText(screen.getByLabelText('New Password'), strongPassword);
    await fireEvent.changeText(screen.getByLabelText('Confirm New Password'), strongPassword);
    await fireEvent.press(screen.getByText('Update Password'));
    expect(await screen.findByText('Network failed.')).toBeTruthy();
  });
});
