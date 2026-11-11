import { sendPaginated, sendSuccess } from '../../utils/response.js';
import * as tasksService from './tasks.service.js';

export async function list(req, res) {
  const filters = req.validated.query;
  const { tasks, total } = await tasksService.listTasks(req.user.id, filters);
  sendPaginated(res, tasks, { page: filters.page, limit: filters.limit, total });
}

export async function getById(req, res) {
  const task = await tasksService.getTask(req.user.id, req.validated.params.id);
  sendSuccess(res, task);
}

export async function create(req, res) {
  const task = await tasksService.createTask(req.user.id, req.validated.body);
  res.location(`${req.baseUrl}/${task.id}`);
  sendSuccess(res, task, 201);
}

export async function update(req, res) {
  const task = await tasksService.updateTask(
    req.user.id,
    req.validated.params.id,
    req.validated.body,
  );
  sendSuccess(res, task);
}

export async function remove(req, res) {
  await tasksService.deleteTask(req.user.id, req.validated.params.id);
  res.status(204).end();
}
