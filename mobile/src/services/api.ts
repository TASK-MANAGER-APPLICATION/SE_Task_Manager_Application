import { clearSession, getSession } from './authStorage';
import { clearSessionAndNotifyOnce } from './sessionEvents';
import { Platform } from 'react-native';

const DEFAULT_API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000';
const API_BASE_URL =
  (
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    DEFAULT_API_BASE_URL
  ).replace(/\/+$/, '');

export type User = {
  id: number | string;
  email: string;
  name: string;
};

export type Category = {
  id: number | string;
  name: string;
};

export type LoginResponse = {
  token: string;
  user: User;
};

export type Task = {
  id: number | string;
  user_id?: number | string;
  title: string;
  description?: string | null;
  due_at?: string | null;
  priority?: string | null;
  status?: string | null;
  category_id?: number | string | null;
  reminder_sent?: boolean;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
};

export type TaskSummary = {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  statusCounts: Record<'Pending' | 'Completed', number>;
  priorityCounts: Record<'Low' | 'Medium' | 'High', number>;
};

export type GetTasksResponse = {
  tasks: Task[];
  hasMore?: boolean;
};

export type ApiErrorResponse = {
  error?: string;
  code?: string;
  message?: string;
};

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  const isLoginRequest = path === '/auth/login';
  const session = isLoginRequest ? null : await getSession();

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (session?.accessToken && !isLoginRequest) {
    headers.set('Authorization', `Bearer ${session.accessToken}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      'Unable to connect to the server. Please make sure the backend server is running and try again.',
      0,
      'NETWORK_ERROR'
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let data: T | ApiErrorResponse | null = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorData = data as ApiErrorResponse | null;

    const code =
      typeof errorData?.code === 'string'
        ? errorData.code
        : typeof errorData?.error === 'string'
          ? errorData.error
          : undefined;

    const fallbackMessages: Record<number, string> = {
      400: 'Please check the information you entered and try again.',
      401:
        code === 'SESSION_EXPIRED'
          ? 'Your session has expired. Please log in again.'
          : isLoginRequest
            ? 'Invalid email or password.'
            : 'Authentication is required.',
      403: 'You do not have permission to perform this action.',
      404: 'The requested information could not be found.',
      500: 'Something went wrong on the server. Please try again.',
    };
    const message =
      errorData?.message ||
      (errorData?.error && !/^[A-Z0-9_]+$/.test(errorData.error)
        ? errorData.error
        : undefined) ||
      fallbackMessages[response.status] ||
      'The request could not be completed. Please try again.';

    if (
      code === 'SESSION_EXPIRED' &&
      session?.accessToken &&
      !isLoginRequest
    ) {
      await clearSessionAndNotifyOnce(session.accessToken, async () => {
        const currentSession = await getSession();
        if (currentSession?.accessToken !== session.accessToken) {
          return false;
        }

        await clearSession();
        return true;
      });
    }

    throw new ApiError(message, response.status, code);
  }

  return data as T;
}

export async function register(
  email: string,
  password: string,
  name: string
): Promise<{ userId: number | string }> {
  return request<{ userId: number | string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      name,
    }),
  });
}

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
    }),
  });
}

export async function logout(): Promise<void> {
  await request<void>('/auth/logout', {
    method: 'POST',
  });

  await clearSession();
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await request<void>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });
}

export type GetTasksParams = {
  status?: string;
  priority?: string;
  categoryId?: string | number;
  dueBefore?: string;
  dueAfter?: string;
  sortBy?:
    | 'created_at'
    | 'due_at'
    | 'priority'
    | 'title'
    | 'status';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTask(value: unknown): value is Task {
  return (
    isRecord(value) &&
    (typeof value.id === 'number' || typeof value.id === 'string') &&
    typeof value.title === 'string'
  );
}

function isCategory(value: unknown): value is Category {
  return (
    isRecord(value) &&
    (typeof value.id === 'number' || typeof value.id === 'string') &&
    typeof value.name === 'string'
  );
}

function isTaskSummary(value: unknown): value is TaskSummary {
  if (!isRecord(value) || !isRecord(value.statusCounts) ||
      !isRecord(value.priorityCounts)) {
    return false;
  }

  return [
    value.total,
    value.completed,
    value.pending,
    value.overdue,
    value.statusCounts.Pending,
    value.statusCounts.Completed,
    value.priorityCounts.Low,
    value.priorityCounts.Medium,
    value.priorityCounts.High,
  ].every((count) => Number.isInteger(count) && Number(count) >= 0);
}

export async function getTasks(
  params: GetTasksParams = {}
): Promise<GetTasksResponse> {
  const query = new URLSearchParams();

  if (params.status) {
    query.set('status', params.status);
  }

  if (params.priority) {
    query.set('priority', params.priority);
  }

  if (params.categoryId !== undefined) {
    query.set('categoryId', String(params.categoryId));
  }

  if (params.dueBefore) {
    query.set('dueBefore', params.dueBefore);
  }

  if (params.dueAfter) {
    query.set('dueAfter', params.dueAfter);
  }

  if (params.sortBy) {
    query.set('sortBy', params.sortBy);
  }

  if (params.order) {
    query.set('order', params.order);
  }

  if (params.limit !== undefined) {
    query.set('limit', String(params.limit));
  }

  if (params.offset !== undefined) {
    query.set('offset', String(params.offset));
  }

  const queryString = query.toString();
  const result = await request<unknown>(
    `/tasks${queryString ? `?${queryString}` : ''}`
  );

  if (
    !isRecord(result) ||
    !Array.isArray(result.tasks) ||
    !result.tasks.every(isTask) ||
    (result.hasMore !== undefined && typeof result.hasMore !== 'boolean')
  ) {
    throw new ApiError(
      'The server returned an invalid task list. Please try again.',
      502,
      'INVALID_RESPONSE'
    );
  }

  return {
    tasks: result.tasks,
    ...(typeof result.hasMore === 'boolean'
      ? { hasMore: result.hasMore }
      : {}),
  };
}

export async function getTaskSummary(): Promise<TaskSummary> {
  const result = await request<unknown>('/tasks/summary');

  if (!isRecord(result) || !isTaskSummary(result.summary)) {
    throw new ApiError(
      'The server returned invalid dashboard statistics. Please try again.',
      502,
      'INVALID_RESPONSE'
    );
  }

  return result.summary;
}

export async function getTask(
  id: number | string
): Promise<{ task: Task }> {
  const result = await request<unknown>(`/tasks/${id}`);

  if (!isRecord(result) || !isTask(result.task)) {
    throw new ApiError(
      'The server returned an invalid task. Please try again.',
      502,
      'INVALID_RESPONSE'
    );
  }

  return { task: result.task };
}

export type CreateTaskInput = {
  title: string;
  description?: string;
  due_at?: string;
  priority?: string;
  category_id?: number | string;
};

export async function createTask(
  input: CreateTaskInput
): Promise<{ task: Task }> {
  return request<{ task: Task }>('/tasks', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  due_at?: string | null;
  priority?: string;
  category_id?: number | string | null;
  status?: string;
};

export async function updateTask(
  id: number | string,
  input: UpdateTaskInput
): Promise<{ task: Task }> {
  return request<{ task: Task }>(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function completeTask(
  id: number | string
): Promise<{ task: Task }> {
  return request<{ task: Task }>(`/tasks/${id}/complete`, {
    method: 'PATCH',
  });
}

export async function deleteTask(
  id: number | string
): Promise<void> {
  await request<void>(`/tasks/${id}`, {
    method: 'DELETE',
  });
}

export async function getCategories(): Promise<{ categories: Category[] }> {
  const result = await request<unknown>('/categories');

  if (
    !isRecord(result) ||
    !Array.isArray(result.categories) ||
    !result.categories.every(isCategory)
  ) {
    throw new ApiError(
      'The server returned an invalid category list. Please try again.',
      502,
      'INVALID_RESPONSE'
    );
  }

  return { categories: result.categories };
}

export async function createCategory(
  name: string
): Promise<{ category: Category }> {
  const result = await request<unknown>('/categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

  if (!isRecord(result) || !isCategory(result.category)) {
    throw new ApiError(
      'The server returned an invalid category. Please try again.',
      502,
      'INVALID_RESPONSE'
    );
  }

  return { category: result.category };
}

export async function renameCategory(
  id: number | string,
  name: string
): Promise<{ category: Category }> {
  const result = await request<unknown>(`/categories/${encodeURIComponent(String(id))}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });

  if (!isRecord(result) || !isCategory(result.category)) {
    throw new ApiError(
      'The server returned an invalid category. Please try again.',
      502,
      'INVALID_RESPONSE'
    );
  }

  return { category: result.category };
}

export async function deleteCategory(
  id: number | string
): Promise<void> {
  await request<void>(`/categories/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
  });
}

/**
 * Backward-compatible generic API helper.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  return request<T>(path, options);
}
