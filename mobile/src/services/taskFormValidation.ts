import { CreateTaskInput } from './api';

export type TaskFormErrors = {
  title?: string;
  due_at?: string;
  category_id?: string;
};

export type TaskFormValues = {
  title: string;
  description: string;
  due_at: string;
  priority: string;
  category_id: string;
};

export function validateTaskForm(values: TaskFormValues): TaskFormErrors {
  const errors: TaskFormErrors = {};
  if (!values.title.trim()) errors.title = 'Task title is required.';
  if (values.due_at.trim() && !Number.isFinite(Date.parse(values.due_at.trim()))) {
    errors.due_at = 'Enter a valid date and time.';
  }
  if (values.category_id.trim() && !/^[1-9]\d*$/.test(values.category_id.trim())) {
    errors.category_id = 'Category ID must be a positive whole number.';
  }
  return errors;
}

export function toCreateTaskInput(values: TaskFormValues): CreateTaskInput {
  return {
    title: values.title.trim(),
    ...(values.description.trim() ? { description: values.description.trim() } : {}),
    ...(values.due_at.trim() ? { due_at: values.due_at.trim() } : {}),
    priority: values.priority,
    ...(values.category_id.trim() ? { category_id: values.category_id.trim() } : {}),
  };
}
