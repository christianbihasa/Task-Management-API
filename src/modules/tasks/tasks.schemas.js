import { z } from 'zod';

export const TASK_STATUSES = ['todo', 'in_progress', 'done'];
export const TASK_PRIORITIES = ['low', 'medium', 'high'];
export const SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'dueDate', 'priority', 'title'];

const status = z.enum(TASK_STATUSES, {
  error: `Status must be one of: ${TASK_STATUSES.join(', ')}`,
});
const priority = z.enum(TASK_PRIORITIES, {
  error: `Priority must be one of: ${TASK_PRIORITIES.join(', ')}`,
});

const fields = {
  title: z
    .string({ error: 'Title is required' })
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  description: z
    .string({ error: 'Description must be a string' })
    .trim()
    .max(5000, 'Description must be at most 5000 characters')
    .nullable(),
  status,
  priority,
  dueDate: z.iso
    .datetime({
      offset: true,
      error: 'Due date must be an ISO 8601 date-time, e.g. 2026-12-31T17:00:00Z',
    })
    .nullable(),
};

/** POST /tasks and PUT /tasks/:id. Omitted optional fields get their defaults. */
export const createTaskSchema = z.strictObject({
  title: fields.title,
  description: fields.description.default(null),
  status: fields.status.default('todo'),
  priority: fields.priority.default('medium'),
  dueDate: fields.dueDate.default(null),
});

// PUT replaces the whole task, so it uses the same rules as create.
export const replaceTaskSchema = createTaskSchema;

/** PATCH /tasks/:id. Every field is optional, but at least one must be sent. */
export const updateTaskSchema = z
  .strictObject({
    title: fields.title.optional(),
    description: fields.description.optional(),
    status: fields.status.optional(),
    priority: fields.priority.optional(),
    dueDate: fields.dueDate.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    error: 'Provide at least one field to update',
  });

export const taskIdParamSchema = z.object({
  id: z.uuid('Task id must be a valid UUID'),
});

export const listTasksQuerySchema = z.strictObject({
  page: z.coerce
    .number({ error: 'Page must be a number' })
    .int('Page must be a whole number')
    .min(1, 'Page must be at least 1')
    .default(1),
  limit: z.coerce
    .number({ error: 'Limit must be a number' })
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be at most 100')
    .default(10),
  status: status.optional(),
  priority: priority.optional(),
  search: z.string().trim().min(1).max(100, 'Search must be at most 100 characters').optional(),
  sortBy: z
    .enum(SORTABLE_FIELDS, { error: `sortBy must be one of: ${SORTABLE_FIELDS.join(', ')}` })
    .default('createdAt'),
  order: z.enum(['asc', 'desc'], { error: 'order must be asc or desc' }).default('desc'),
});
