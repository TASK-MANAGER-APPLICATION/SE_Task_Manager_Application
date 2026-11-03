import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import RegisterScreen from '../app/register';
import { ApiError, register } from '../services/api';

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

  test('labels registration fields and masks both password fields', async () => {
    const screen = await render(<RegisterScreen />);
    expect(screen.getByLabelText('Name')).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
    expect(screen.getByLabelText('Confirm Password').props.secureTextEntry).toBe(true);
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

  test('prevents duplicate registration requests while submission is pending', async () => {
    let resolveRegister: (result: { userId: number }) => void = () => {};
    jest.mocked(register).mockReturnValue(new Promise((resolve) => { resolveRegister = resolve; }));
    const screen = await render(<RegisterScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('Enter your name'), 'Ada Lovelace');
    await fireEvent.changeText(screen.getByPlaceholderText('Enter your email'), 'ada@example.com');
    await fireEvent.changeText(screen.getByPlaceholderText('Enter your password'), 'Password123!');
    await fireEvent.changeText(screen.getByPlaceholderText('Re-enter your password'), 'Password123!');
    const firstPress = fireEvent.press(screen.getByLabelText('Register'));
    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    const secondPress = fireEvent.press(screen.getByLabelText('Register'));
    expect(register).toHaveBeenCalledTimes(1);
    resolveRegister({ userId: 1 });
    await Promise.all([firstPress, secondPress]);
  });

  test('reports a network failure without showing registration success', async () => {
    jest.mocked(register).mockRejectedValue(new ApiError('Connection failed.', 0, 'NETWORK_ERROR'));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const screen = await render(<RegisterScreen />);
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Ada Lovelace');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'ada@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'Password123!');
    await fireEvent.changeText(screen.getByLabelText('Confirm Password'), 'Password123!');
    await fireEvent.press(screen.getByLabelText('Register'));
    expect(alertSpy).toHaveBeenCalledWith('Server unavailable', expect.any(String));
    expect(screen.queryByText('Registration successful')).toBeNull();
  });
});
