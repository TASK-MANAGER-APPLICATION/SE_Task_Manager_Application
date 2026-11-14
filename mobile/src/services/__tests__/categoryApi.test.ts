import {
  createCategory,
  deleteCategory,
  getCategories,
  renameCategory,
} from '../api';
import { getSession } from '../authStorage';

jest.mock('../authStorage', () => ({
  clearSession: jest.fn(),
  getSession: jest.fn().mockResolvedValue({ accessToken: 'category-token' }),
}));

jest.mock('../sessionEvents', () => ({
  clearSessionAndNotifyOnce: jest.fn(),
}));

const category = { id: 7, name: 'Work' };

describe('category API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getSession).mockResolvedValue({ accessToken: 'category-token' });
  });

  afterEach(() => jest.restoreAllMocks());

  test('lists categories through the authenticated API helper', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ categories: [category] }),
    } as Response);

    await expect(getCategories()).resolves.toEqual({ categories: [category] });
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/categories',
      expect.any(Object)
    );
    expect(new Headers(fetch.mock.calls[0][1]?.headers).get('Authorization'))
      .toBe('Bearer category-token');
  });

  test('creates and renames categories with trimmed names supplied by the caller', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        status: 201,
        ok: true,
        json: async () => ({ category }),
      } as Response)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ category: { ...category, name: 'Personal' } }),
      } as Response);

    await expect(createCategory('Work')).resolves.toEqual({ category });
    await expect(renameCategory(7, 'Personal')).resolves.toEqual({
      category: { ...category, name: 'Personal' },
    });

    expect(fetch.mock.calls[0][1]).toEqual(expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'Work' }),
    }));
    expect(fetch.mock.calls[1][0]).toBe('http://localhost:3000/categories/7');
    expect(fetch.mock.calls[1][1]).toEqual(expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ name: 'Personal' }),
    }));
  });

  test('deletes a category and validates malformed category responses', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ status: 204, ok: true } as Response)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ categories: [{ id: 7, name: 9 }] }),
      } as Response);

    await expect(deleteCategory(7)).resolves.toBeUndefined();
    expect(fetch.mock.calls[0][0]).toBe('http://localhost:3000/categories/7');
    expect(fetch.mock.calls[0][1]).toEqual(expect.objectContaining({ method: 'DELETE' }));

    await expect(getCategories()).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
      status: 502,
    });
  });
});
