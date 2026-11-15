import { Task } from './api';

export type TaskFilters = {
  status?: 'All' | 'Pending' | 'Completed';
  priority?: 'All' | 'Low' | 'Medium' | 'High';
  categoryId?: string;
};

export type TaskSortField =
  | 'None'
  | 'Due Date'
  | 'Priority'
  | 'Title'
  | 'Created Date';

export type TaskSortDirection = 'Ascending' | 'Descending';

export function filterAndSortTasks(
  tasks: Task[],
  filters: TaskFilters,
  sortField: TaskSortField = 'None',
  sortDirection: TaskSortDirection = 'Ascending'
): Task[] {
  const filtered = tasks.filter((task) => {
    const statusMatch =
      !filters.status ||
      filters.status === 'All' ||
      (filters.status === 'Completed'
        ? task.status === 'Completed'
        : task.status !== 'Completed');
    const priorityMatch =
      !filters.priority ||
      filters.priority === 'All' ||
      task.priority === filters.priority;
    const categoryMatch =
      !filters.categoryId ||
      filters.categoryId === 'All' ||
      (filters.categoryId === 'Uncategorized'
        ? task.category_id === null || task.category_id === undefined
        : String(task.category_id) === filters.categoryId);
    return statusMatch && priorityMatch && categoryMatch;
  });

  if (sortField === 'None') return filtered;

  const direction = sortDirection === 'Ascending' ? 1 : -1;
  const dateValue = (value: string | null | undefined) => {
    if (!value) return null;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  };
  const compareDates = (
    left: string | null | undefined,
    right: string | null | undefined
  ) => {
    const leftDate = dateValue(left);
    const rightDate = dateValue(right);
    if (leftDate === null) return rightDate === null ? 0 : 1;
    if (rightDate === null) return -1;
    return (leftDate - rightDate) * direction;
  };
  const priorityRank = (priority: Task['priority']) =>
    priority === 'Low' ? 1 : priority === 'Medium' ? 2 : priority === 'High' ? 3 : null;

  return [...filtered].sort((left, right) => {
    if (sortField === 'Due Date') return compareDates(left.due_at, right.due_at);
    if (sortField === 'Created Date') return compareDates(left.created_at, right.created_at);
    if (sortField === 'Priority') {
      const leftRank = priorityRank(left.priority);
      const rightRank = priorityRank(right.priority);
      if (leftRank === null) return rightRank === null ? 0 : 1;
      if (rightRank === null) return -1;
      return (leftRank - rightRank) * direction;
    }
    return (left.title ?? '').localeCompare(right.title ?? '') * direction;
  });
}

export type DashboardSummary = {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  statusCounts: Record<'Pending' | 'Completed', number>;
  priorityCounts: Record<'Low' | 'Medium' | 'High', number>;
};

export function calculateDashboardSummary(
  tasks: Task[],
  now = Date.now()
): DashboardSummary {
  const statusCounts = { Pending: 0, Completed: 0 };
  const priorityCounts = { Low: 0, Medium: 0, High: 0 };
  let overdue = 0;

  tasks.forEach((task) => {
    if (task.status === 'Completed') statusCounts.Completed += 1;
    else statusCounts.Pending += 1;

    if (task.priority === 'Low' || task.priority === 'Medium' || task.priority === 'High') {
      priorityCounts[task.priority] += 1;
    }

    const dueAt = task.due_at ? Date.parse(task.due_at) : Number.NaN;
    if (task.status !== 'Completed' && Number.isFinite(dueAt) && dueAt < now) {
      overdue += 1;
    }
  });

  return {
    total: tasks.length,
    completed: statusCounts.Completed,
    pending: statusCounts.Pending,
    overdue,
    statusCounts,
    priorityCounts,
  };
}

export function isTaskOverdue(task: Task, now = Date.now()): boolean {
  if (task.status === 'Completed' || !task.due_at) return false;
  const dueAt = Date.parse(task.due_at);
  return Number.isFinite(dueAt) && dueAt < now;
}
