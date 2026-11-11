import { sendSuccess } from '../../utils/response.js';
import * as authService from './auth.service.js';

export async function register(req, res) {
  const result = await authService.register(req.validated.body);
  sendSuccess(res, result, 201);
}

export async function login(req, res) {
  const result = await authService.login(req.validated.body);
  sendSuccess(res, result);
}

export async function me(req, res) {
  const user = await authService.getCurrentUser(req.user.id);
  sendSuccess(res, { user });
}
