import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import RegisterScreen from '../app/register';
import { register } from '../services/api';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    replace: mockReplace,
    push: jest.fn(),
  },
}));

jest.mock('../services/api', () => ({
  ApiError: class ApiError extends Error {
    code?: string;
    constructor(message: string, _status: number, code?: string) {
      super(message);
      this.code = code;
    }
  },
  register: jest.fn(),
}));

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the registration screen', async () => {
    const { getByText } = await render(<RegisterScreen />);

    expect(getByText('Create Account')).toBeTruthy();
  });

  test('shows validation errors when submitted with empty fields', async () => {
    const { getByText } = await render(<RegisterScreen />);

    await fireEvent.press(getByText('Register'));

    expect(getByText('Name is required.')).toBeTruthy();
    expect(getByText('Email is required.')).toBeTruthy();
    expect(getByText('Password is required.')).toBeTruthy();
    expect(getByText('Please confirm your password.')).toBeTruthy();
    expect(register).not.toHaveBeenCalled();
  });

  test('submits valid registration details to the API', async () => {
    jest.mocked(register).mockResolvedValue({ userId: 1 });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByPlaceholderText, getByText } = await render(<RegisterScreen />);

    await fireEvent.changeText(getByPlaceholderText('Enter your name'), 'Ada Lovelace');
    await fireEvent.changeText(getByPlaceholderText('Enter your email'), 'ada@example.com');
    await fireEvent.changeText(getByPlaceholderText('Enter your password'), 'Password123!');
    await fireEvent.changeText(getByPlaceholderText('Re-enter your password'), 'Password123!');
    await fireEvent.press(getByText('Register'));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith('ada@example.com', 'Password123!', 'Ada Lovelace');
    });
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
