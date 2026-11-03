import { logout } from '../api';
import { clearSession, getSession } from '../authStorage';

jest.mock('../authStorage', () => ({
  getSession: jest.fn().mockResolvedValue({ accessToken: 'test-token' }),
  clearSession: jest.fn().mockResolvedValue(undefined),
}));

describe('logout API client', () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

  test('clears local auth only after the server confirms logout', async () => {
    jest.mocked(getSession).mockResolvedValue({ accessToken: 'test-token' });
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ status: 204, ok: true } as Response);

    await logout();

    expect(clearSession).toHaveBeenCalledTimes(1);
  });

  test('does not clear local auth when the server logout fails', async () => {
    jest.mocked(getSession).mockResolvedValue({ accessToken: 'test-token' });
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: 500,
      ok: false,
      json: async () => ({ code: 'INTERNAL_ERROR', message: 'Unable to log out right now.' }),
    } as Response);

    await expect(logout()).rejects.toMatchObject({ code: 'INTERNAL_ERROR', status: 500 });
    expect(clearSession).not.toHaveBeenCalled();
  });
});
