import { Task } from '../api';
import { calculateDashboardSummary, filterAndSortTasks } from '../taskPresentation';

const tasks: Task[] = [
  { id: 1, title: 'Alpha', priority: 'High', status: 'Pending', category_id: 2, due_at: '2020-01-01T00:00:00Z', created_at: '2024-01-01' },
  { id: 2, title: 'Bravo', priority: 'Low', status: 'Completed', category_id: 2, due_at: '2030-01-01T00:00:00Z', created_at: '2024-02-01' },
  { id: 3, title: 'Charlie', priority: 'Medium', status: 'Pending', category_id: 4, created_at: '2024-03-01' },
];

describe('task filtering and sorting', () => {
  test('filters without mutating original tasks', () => {
    const result = filterAndSortTasks(tasks, { status: 'Pending', categoryId: '2' });
    expect(result.map((task) => task.id)).toEqual([1]);
    expect(tasks.map((task) => task.id)).toEqual([1, 2, 3]);
  });

  test('filters uncategorized tasks with null or missing category IDs', () => {
    const uncategorizedTasks: Task[] = [
      { id: 4, title: 'No category', category_id: null },
      { id: 5, title: 'Missing category' },
      { id: 6, title: 'Has category', category_id: 2 },
    ];

    expect(
      filterAndSortTasks(uncategorizedTasks, { categoryId: 'Uncategorized' })
        .map((task) => task.id)
    ).toEqual([4, 5]);
  });

  test('sorts by title and priority in either direction', () => {
    expect(filterAndSortTasks(tasks, {}, 'Title', 'Ascending').map((task) => task.title)).toEqual(['Alpha', 'Bravo', 'Charlie']);
    expect(filterAndSortTasks(tasks, {}, 'Priority', 'Descending').map((task) => task.priority)).toEqual(['High', 'Medium', 'Low']);
  });

  test('sorts invalid or missing due dates last in either direction', () => {
    expect(filterAndSortTasks(tasks, {}, 'Due Date', 'Ascending').map((task) => task.id)).toEqual([1, 2, 3]);
  });
});

describe('dashboard summary', () => {
  test('counts totals, status, priority, and pending overdue tasks', () => {
    expect(calculateDashboardSummary(tasks, Date.parse('2025-01-01'))).toEqual({
      total: 3,
      completed: 1,
      pending: 2,
      overdue: 1,
      statusCounts: { Pending: 2, Completed: 1 },
      priorityCounts: { Low: 1, Medium: 1, High: 1 },
    });
  });
});
