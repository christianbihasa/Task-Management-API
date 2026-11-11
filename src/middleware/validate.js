import { AppError } from '../utils/AppError.js';
import { formatZodIssues } from '../utils/zod.js';

const LOCATIONS = ['params', 'query', 'body'];

/**
 * Validates request parts with Zod schemas and stores the parsed values
 * (coerced, trimmed, with defaults applied) on `req.validated`.
 *
 *   router.post('/', validate({ body: createTaskSchema }), handler)
 *
 * Express 5 makes `req.query` read-only, which is why results go on `req.validated`.
 */
export function validate(schemas) {
  return (req, _res, next) => {
    const validated = {};
    const details = [];

    for (const location of LOCATIONS) {
      const schema = schemas[location];
      if (!schema) continue;

      const result = schema.safeParse(req[location] ?? {});
      if (result.success) {
        validated[location] = result.data;
      } else {
        details.push(...formatZodIssues(result.error, location));
      }
    }

    if (details.length > 0) {
      throw AppError.validation(details);
    }

    req.validated = validated;
    next();
  };
}
