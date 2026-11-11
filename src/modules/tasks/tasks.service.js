import { AppError } from '../../utils/AppError.js';
import * as tasksRepository from './tasks.repository.js';

// Another user's task is reported as "not found" (not "forbidden"),
// so the API never reveals which task ids exist.
const taskNotFound = () => AppError.notFound('Task not found');

export function listTasks(userId, filters) {
  return tasksRepository.findTasks({ userId, ...filters });
}

export async function getTask(userId, taskId) {
  const task = await tasksRepository.findTaskById(userId, taskId);
  if (!task) throw taskNotFound();
  return task;
}

export function createTask(userId, data) {
  return tasksRepository.createTask(userId, data);
}

/** Used by both PUT (full data) and PATCH (partial data). */
export async function updateTask(userId, taskId, changes) {
  const task = await tasksRepository.updateTask(userId, taskId, changes);
  if (!task) throw taskNotFound();
  return task;
}

export async function deleteTask(userId, taskId) {
  const deleted = await tasksRepository.deleteTask(userId, taskId);
  if (!deleted) throw taskNotFound();
}
