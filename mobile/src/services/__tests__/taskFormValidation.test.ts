import { toCreateTaskInput, validateTaskForm } from '../taskFormValidation';

const valid = {
  title: 'Review sprint plan',
  description: 'Add estimates',
  due_at: '2030-02-03T12:00:00Z',
  priority: 'High',
  category_id: '7',
};

describe('task form validation', () => {
  test('requires a non-empty title', () => {
    expect(validateTaskForm({ ...valid, title: '   ' }).title).toBe('Task title is required.');
  });

  test('rejects an invalid due date and category identifier', () => {
    expect(validateTaskForm({ ...valid, due_at: 'not a date', category_id: '-2' })).toEqual({
      due_at: 'Enter a valid date and time.',
      category_id: 'Category ID must be a positive whole number.',
    });
  });

  test('maps only supported task fields to create input', () => {
    expect(toCreateTaskInput({ ...valid, title: '  Review sprint plan  ', description: '  Add estimates  ' })).toEqual({
      title: 'Review sprint plan',
      description: 'Add estimates',
      due_at: valid.due_at,
      priority: 'High',
      category_id: '7',
    });
  });
});
