import { changePassword } from '../api';
import { getSession } from '../authStorage';

jest.mock('../authStorage', () => ({
  getSession: jest.fn().mockResolvedValue({ accessToken: 'test-token' }),
  clearSession: jest.fn().mockResolvedValue(undefined),
}));

describe('changePassword API client', () => {
  afterEach(() => jest.restoreAllMocks());

  test('posts current and new passwords to the existing endpoint', async () => {
    jest.mocked(getSession).mockResolvedValue({ accessToken: 'test-token' });
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: 204,
      ok: true,
    } as Response);

    await changePassword('Current123!', 'NewPassword123!');

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3000/auth/change-password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          currentPassword: 'Current123!',
          newPassword: 'NewPassword123!',
        }),
      })
    );
    const options = fetchSpy.mock.calls[0][1];
    const headers = options?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer test-token');
    expect(headers.get('Content-Type')).toBe('application/json');
  });
});
