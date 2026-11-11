/**
 * Turns Zod issues into a flat, client-friendly list:
 *   [{ location: 'body', field: 'title', message: 'Title is required' }]
 */
export function formatZodIssues(error, location) {
  return error.issues.map((issue) => {
    const detail = {
      field: issue.path.length > 0 ? issue.path.join('.') : null,
      message: issue.message,
    };
    return location ? { location, ...detail } : detail;
  });
}
