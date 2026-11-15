import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import ForgotPasswordScreen from '../app/forgot-password';
import ResetPasswordScreen from '../app/reset-password';
import { requestPasswordReset, resetPassword } from '../services/api';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ token: 'a'.repeat(64) }),
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
  requestPasswordReset: jest.fn(),
  resetPassword: jest.fn(),
}));

describe('password reset screens', () => {
  beforeEach(() => jest.clearAllMocks());

  test('submits forgot-password email and shows the generic response', async () => {
    jest.mocked(requestPasswordReset).mockResolvedValue(undefined);
    const screen = await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'ada@example.com');
    await fireEvent.press(screen.getByText('Send Reset Link'));

    await waitFor(() => expect(requestPasswordReset).toHaveBeenCalledWith('ada@example.com'));
    expect(await screen.findByText('If an account matches that email, a password reset link will be sent.')).toBeTruthy();
  });

  test('validates matching strong passwords before the API call', async () => {
    const screen = await render(<ResetPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText('New Password'), 'Password123!');
    await fireEvent.changeText(screen.getByLabelText('Confirm Password'), 'Password456!');
    await fireEvent.press(screen.getByRole('button', { name: 'Reset Password' }));

    expect(await screen.findByText('Passwords do not match.')).toBeTruthy();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  test('resets password and reports success', async () => {
    jest.mocked(resetPassword).mockResolvedValue(undefined);
    const screen = await render(<ResetPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText('New Password'), 'Password123!');
    await fireEvent.changeText(screen.getByLabelText('Confirm Password'), 'Password123!');
    await fireEvent.press(screen.getByRole('button', { name: 'Reset Password' }));

    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith('a'.repeat(64), 'Password123!'));
    expect(await screen.findByText('Your password has been reset. Log in with your new password.')).toBeTruthy();
  });
});
