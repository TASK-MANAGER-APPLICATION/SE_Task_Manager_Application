import {
  isValidEmail,
  isStrongPassword,
  validateRegistrationForm,
} from '../registrationValidation';

describe('isValidEmail', () => {
  test('accepts a valid email address', () => {
    expect(isValidEmail('shivanand@example.com')).toBe(true);
  });

  test('rejects an invalid email address', () => {
    expect(isValidEmail('shivanand@')).toBe(false);
  });

  test('rejects an email without a domain', () => {
    expect(isValidEmail('shivanand@example')).toBe(false);
  });
});

describe('isStrongPassword', () => {
  test('accepts a strong password', () => {
    expect(isStrongPassword('Password123!')).toBe(true);
  });

  test('rejects a password shorter than 8 characters', () => {
    expect(isStrongPassword('Pass1!')).toBe(false);
  });

  test('rejects a password without uppercase letters', () => {
    expect(isStrongPassword('password123!')).toBe(false);
  });

  test('rejects a password without lowercase letters', () => {
    expect(isStrongPassword('PASSWORD123!')).toBe(false);
  });

  test('rejects a password without a number', () => {
    expect(isStrongPassword('PasswordOnly!')).toBe(false);
  });

  test('rejects a password without a special character', () => {
    expect(isStrongPassword('Password123')).toBe(false);
  });
});

describe('validateRegistrationForm', () => {
  test('returns errors for an empty form', () => {
    const errors = validateRegistrationForm('', '', '', '');

    expect(errors).toEqual({
      name: 'Name is required.',
      email: 'Email is required.',
      password: 'Password is required.',
      confirmPassword: 'Please confirm your password.',
    });
  });

  test('returns an error for an invalid email', () => {
    const errors = validateRegistrationForm(
      'Shivanand',
      'shivanand@',
      'Password123!',
      'Password123!'
    );

    expect(errors.email).toBe('Enter a valid email address.');
  });

  test('returns an error for a weak password', () => {
    const errors = validateRegistrationForm(
      'Shivanand',
      'shivanand@example.com',
      'Password123',
      'Password123'
    );

    expect(errors.password).toBe(
      'Password must contain at least one special character.'
    );
  });

  test('returns an error when passwords do not match', () => {
    const errors = validateRegistrationForm(
      'Shivanand',
      'shivanand@example.com',
      'Password123!',
      'Password456!'
    );

    expect(errors.confirmPassword).toBe('Passwords do not match.');
  });

  test('returns no errors for valid registration data', () => {
    const errors = validateRegistrationForm(
      'Shivanand',
      'shivanand@example.com',
      'Password123!',
      'Password123!'
    );

    expect(errors).toEqual({});
  });
});