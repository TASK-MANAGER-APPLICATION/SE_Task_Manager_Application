export type RegistrationErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export function validateRegistrationForm(
  name: string,
  email: string,
  password: string,
  confirmPassword: string
): RegistrationErrors {
  const errors: RegistrationErrors = {};

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();

  if (!trimmedName) {
    errors.name = 'Name is required.';
  }

  if (!trimmedEmail) {
    errors.email = 'Email is required.';
  } else if (!isValidEmail(trimmedEmail)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  } else if (!/[A-Z]/.test(password)) {
    errors.password =
      'Password must contain at least one uppercase letter.';
  } else if (!/[a-z]/.test(password)) {
    errors.password =
      'Password must contain at least one lowercase letter.';
  } else if (!/\d/.test(password)) {
    errors.password =
      'Password must contain at least one number.';
  } else if (!/[^A-Za-z0-9]/.test(password)) {
    errors.password =
      'Password must contain at least one special character.';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}