import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import * as tasksController from './tasks.controller.js';
import {
  createTaskSchema,
  listTasksQuerySchema,
  replaceTaskSchema,
  taskIdParamSchema,
  updateTaskSchema,
} from './tasks.schemas.js';

export const tasksRouter = Router();

// Every task route requires a logged-in user.
tasksRouter.use(authenticate);

tasksRouter
  .route('/')
  .get(validate({ query: listTasksQuerySchema }), tasksController.list)
  .post(validate({ body: createTaskSchema }), tasksController.create);

tasksRouter
  .route('/:id')
  .get(validate({ params: taskIdParamSchema }), tasksController.getById)
  .put(validate({ params: taskIdParamSchema, body: replaceTaskSchema }), tasksController.update)
  .patch(validate({ params: taskIdParamSchema, body: updateTaskSchema }), tasksController.update)
  .delete(validate({ params: taskIdParamSchema }), tasksController.remove);
