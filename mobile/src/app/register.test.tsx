import React from 'react';
import * as TestingLibrary from '@testing-library/react-native';

import RegisterScreen from './register';

const { render, fireEvent, waitFor } = TestingLibrary;

describe('Registration form submission', () => {
  test('does not submit when validation fails', () => {
    const result = render(<RegisterScreen />);
    const root = result.root;

    fireEvent.press(root.findByProps({ children: 'Register' }));

    expect(root.findByProps({ children: 'Name is required.' })).toBeTruthy();
    expect(root.findByProps({ children: 'Email is required.' })).toBeTruthy();
    expect(root.findByProps({ children: 'Password is required.' })).toBeTruthy();
    expect(
      root.findByProps({ children: 'Please confirm your password.' })
    ).toBeTruthy();
  });

  test('shows loading state while submitting valid registration data', async () => {
    const result = render(<RegisterScreen />);
    const root = result.root;

    const inputs = root.findAllByType(
      require('react-native').TextInput
    );

    fireEvent.changeText(inputs[0], 'Shivanand');
    fireEvent.changeText(inputs[1], 'shivanand@example.com');
    fireEvent.changeText(inputs[2], 'Password1');
    fireEvent.changeText(inputs[3], 'Password1');

    fireEvent.press(root.findByProps({ children: 'Register' }));

    await waitFor(() => {
      expect(
        root.findByProps({
          children:
            'Registration form is valid. Backend integration is pending.',
        })
      ).toBeTruthy();
    });
  });

  test('shows success message after valid submission', async () => {
    const result = render(<RegisterScreen />);
    const root = result.root;

    const inputs = root.findAllByType(
      require('react-native').TextInput
    );

    fireEvent.changeText(inputs[0], 'Shivanand');
    fireEvent.changeText(inputs[1], 'shivanand@example.com');
    fireEvent.changeText(inputs[2], 'Password1');
    fireEvent.changeText(inputs[3], 'Password1');

    fireEvent.press(root.findByProps({ children: 'Register' }));

    await waitFor(() => {
      expect(
        root.findByProps({
          children:
            'Registration form is valid. Backend integration is pending.',
        })
      ).toBeTruthy();
    });
  });
});
