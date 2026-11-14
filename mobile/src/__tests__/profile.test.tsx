import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import ProfileScreen from '../app/profile';
import { getSession, saveSession } from '../services/authStorage';
import { ApiError, getCategories, logout } from '../services/api';


jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
}));

jest.mock('../services/authStorage', () => ({
  getSession: jest.fn(),
  saveSession: jest.fn().mockResolvedValue(undefined),
  clearSession: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/api', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    code?: string;
    constructor(message: string, status: number, code?: string) { super(message); this.status = status; this.code = code; }
  },
  getCategories: jest.fn(),
  createCategory: jest.fn(),
  renameCategory: jest.fn(),
  deleteCategory: jest.fn(),
  logout: jest.fn(),
}));

const user = { id: 42, name: 'Ada Lovelace', email: 'ada@example.com' };

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getSession).mockResolvedValue({ accessToken: 'token', user });
    jest.mocked(getCategories).mockResolvedValue({ categories: [] });
  });

  test('loads and displays the available profile data', async () => {
    const screen = await render(<ProfileScreen />);
    expect(await screen.findByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('ada@example.com')).toBeTruthy();
    expect(await screen.findByText('Categories')).toBeTruthy();
  });

  test('shows a loading state while the stored profile is being read', async () => {
    let resolveSession: (value: { accessToken: string; user: typeof user }) => void = () => {};
    jest.mocked(getSession).mockReturnValue(new Promise((resolve) => { resolveSession = resolve; }));
    const screen = await render(<ProfileScreen />);
    expect(screen.getByText('Loading your profile...')).toBeTruthy();
    resolveSession({ accessToken: 'token', user });
    expect(await screen.findByText('Ada Lovelace')).toBeTruthy();
  });

  test('shows an unavailable state if no user profile is stored', async () => {
    jest.mocked(getSession).mockResolvedValue({ accessToken: 'token' });
    const screen = await render(<ProfileScreen />);
    expect(await screen.findByText('Profile information is unavailable. Please log in again.')).toBeTruthy();
  });

  test('shows a loading error if local session storage fails', async () => {
    jest.mocked(getSession).mockRejectedValue(new Error('storage unavailable'));
    const screen = await render(<ProfileScreen />);
    expect(await screen.findByText('Unable to load your profile. Please try again.')).toBeTruthy();
  });

  test('validates profile fields and does not save invalid values', async () => {
    const screen = await render(<ProfileScreen />);
    await fireEvent.press(await screen.findByText('Edit Profile'));
    await fireEvent.changeText(screen.getByLabelText('Name'), '   ');
    await fireEvent.press(screen.getByText('Save Profile'));
    expect(screen.getByText('Name is required.')).toBeTruthy();
    expect(saveSession).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Ada Lovelace');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'bad-email');
    await fireEvent.press(screen.getByText('Save Profile'));
    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    expect(saveSession).not.toHaveBeenCalled();
  });

  test('saves valid edits locally and displays updated profile information', async () => {
    const screen = await render(<ProfileScreen />);
    await fireEvent.press(await screen.findByText('Edit Profile'));
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Ada Byron');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'ada.byron@example.com');
    await fireEvent.press(screen.getByText('Save Profile'));
    await waitFor(() => expect(saveSession).toHaveBeenCalledWith({
      accessToken: 'token',
      user: { id: 42, name: 'Ada Byron', email: 'ada.byron@example.com' },
    }));
    expect(await screen.findByText('Ada Byron')).toBeTruthy();
    expect(screen.getByText('ada.byron@example.com')).toBeTruthy();
    expect(screen.getByText(/Profile updated on this device/)).toBeTruthy();
  });

  test('keeps the user signed in and displays an error if logout fails', async () => {
    jest.mocked(logout).mockRejectedValue(new ApiError('Unable to log out right now.', 500, 'INTERNAL_ERROR'));
    const screen = await render(<ProfileScreen />);
    await fireEvent.press(await screen.findByText('Log out'));
    expect(await screen.findByText('Unable to log out right now.')).toBeTruthy();
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
  });
});
