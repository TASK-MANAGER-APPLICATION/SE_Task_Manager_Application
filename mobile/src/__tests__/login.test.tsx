import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import LoginScreen from '../app/login';
import { ApiError, login } from '../services/api';
import { saveSession } from '../services/authStorage';

jest.mock('expo-router', () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock('../services/authStorage', () => ({ saveSession: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../services/api', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    code?: string;
    constructor(message: string, status: number, code?: string) { super(message); this.status = status; this.code = code; }
  },
  login: jest.fn(),
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  async function fillCredentials(screen: Awaited<ReturnType<typeof render>>) {
    await fireEvent.changeText(screen.getByLabelText('Email'), 'ada@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'Password123!');
  }

  test('shows required and email validation before calling the API', async () => {
    const screen = await render(<LoginScreen />);
    await fireEvent.press(screen.getByText('Login'));
    expect(screen.getByText('Email is required.')).toBeTruthy();
    expect(screen.getByText('Password is required.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Email'), 'invalid');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'anything');
    await fireEvent.press(screen.getByText('Login'));
    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    expect(login).not.toHaveBeenCalled();
  });

  test('shows invalid credentials inline', async () => {
    jest.mocked(login).mockRejectedValue(new ApiError('Invalid email or password.', 401, 'INVALID_CREDENTIALS'));
    const screen = await render(<LoginScreen />);
    await fillCredentials(screen);
    await fireEvent.press(screen.getByText('Login'));
    expect(await screen.findByText('Invalid email or password.')).toBeTruthy();
  });

  test('shows a friendly network error', async () => {
    jest.mocked(login).mockRejectedValue(new ApiError('Connection failed.', 0, 'NETWORK_ERROR'));
    const screen = await render(<LoginScreen />);
    await fillCredentials(screen);
    await fireEvent.press(screen.getByText('Login'));
    expect(Alert.alert).toHaveBeenCalledWith('Server unavailable', expect.any(String));
  });

  test('stores the returned session after a valid login', async () => {
    const onAuthenticated = jest.fn();
    jest.mocked(login).mockResolvedValue({
      token: 'access-token',
      user: { id: 1, name: 'Ada Lovelace', email: 'ada@example.com' },
    });
    const screen = await render(<LoginScreen onAuthenticated={onAuthenticated} />);
    await fillCredentials(screen);
    await fireEvent.press(screen.getByText('Login'));
    await waitFor(() => expect(saveSession).toHaveBeenCalledWith({
      accessToken: 'access-token',
      user: { id: 1, name: 'Ada Lovelace', email: 'ada@example.com' },
    }));
    expect(onAuthenticated).toHaveBeenCalledTimes(1);
  });

  test('prevents duplicate login submissions while the request is pending', async () => {
    let resolveLogin: (result: { token: string; user: { id: number; name: string; email: string } }) => void = () => {};
    jest.mocked(login).mockReturnValue(new Promise((resolve) => { resolveLogin = resolve; }));
    const screen = await render(<LoginScreen onAuthenticated={() => {}} />);
    await fillCredentials(screen);
    const firstPress = fireEvent.press(screen.getByLabelText('Login'));
    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    const secondPress = fireEvent.press(screen.getByLabelText('Login'));
    expect(login).toHaveBeenCalledTimes(1);
    resolveLogin({ token: 'token', user: { id: 1, name: 'Ada', email: 'ada@example.com' } });
    await Promise.all([firstPress, secondPress]);
    await waitFor(() => expect(saveSession).toHaveBeenCalled());
  });
});
