import { clearSession, getSession } from './authStorage';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export type User = {
  id: number | string;
  email: string;
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

export type ApiErrorResponse = {
  error?: string;
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
  const session = await getSession();

  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (session?.accessToken) {
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

    const message =
      errorData?.message ||
      errorData?.error ||
      `Request failed with status ${response.status}.`;

    const code =
      typeof errorData?.error === 'string'
        ? errorData.error
        : undefined;

    if (code === 'SESSION_EXPIRED') {
      await clearSession();
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
};

export async function getTasks(
  params: GetTasksParams = {}
): Promise<{ tasks: Task[] }> {
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

  const queryString = query.toString();

  return request<{ tasks: Task[] }>(
    `/tasks${queryString ? `?${queryString}` : ''}`
  );
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

/**
 * Backward-compatible generic API helper.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  return request<T>(path, options);
}
