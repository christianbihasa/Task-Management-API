# Task Management API

A RESTful API built with **Express.js** and **PostgreSQL**. It supports full CRUD operations, **JWT** authentication, request validation with **Zod**, and error handling that always returns structured JSON.

![Express.js](https://img.shields.io/badge/Express.js-5-black) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13%2B-336791) ![JWT](https://img.shields.io/badge/Auth-JWT-orange) ![Zod](https://img.shields.io/badge/Validation-Zod-3068b7)

## Features

- **Auth:** register, log in and get the current user. Passwords are hashed with bcrypt; tokens are signed JWTs.
- **Tasks:** create, read, update (PUT and PATCH) and delete. Users can only see and change their own tasks.
- **Listing:** pagination, filtering by status and priority, case-insensitive search, and sorting.
- **Validation:** every body, URL parameter and query string is checked with Zod. Unknown fields are rejected.
- **Errors:** one consistent JSON error format, with field-level details for validation errors.
- **Security:** Helmet headers, CORS, rate limiting on auth routes, a body size limit, and parameterized SQL.
- **Tests:** 41 integration tests using Vitest and Supertest against a real PostgreSQL database.

## Tech stack

| Concern    | Library                                  |
| ---------- | ---------------------------------------- |
| Server     | Express 5                                |
| Database   | PostgreSQL with `pg` (plain SQL, no ORM) |
| Auth       | `jsonwebtoken`, `bcryptjs`               |
| Validation | `zod`                                    |
| Security   | `helmet`, `cors`, `express-rate-limit`   |
| Testing    | `vitest`, `supertest`                    |
| Tooling    | ESLint, Prettier                         |

## Getting started

### 1. Requirements

- Node.js 20 or newer
- A PostgreSQL 13+ database. Either:
  - **Hosted (easiest):** create a free project on [Neon](https://neon.tech) or [Supabase](https://supabase.com) and copy its connection string, or
  - **Local:** install PostgreSQL and create two databases: `task_api` and `task_api_test`.

### 2. Install and configure

```bash
npm install
cp .env.example .env
```

Edit `.env`:

- `DATABASE_URL`: your database connection string. Hosted providers usually need `?sslmode=require` at the end.
- `TEST_DATABASE_URL`: a **separate** database for tests. The tests delete all rows in it.
- `JWT_SECRET`: a random string of at least 32 characters. Generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```

The app checks these values at startup and exits with a clear message if any are missing or invalid.

### 3. Create the tables and run

```bash
npm run migrate   # creates the tables
npm run seed      # optional: demo@example.com / Password123 with 5 tasks
npm run dev       # starts on http://localhost:3000 and restarts on file changes
```

### Scripts

| Command           | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Start with auto-restart on file changes       |
| `npm start`       | Start normally                                |
| `npm run migrate` | Apply any new SQL migrations                  |
| `npm run seed`    | Reset and create the demo user and tasks      |
| `npm test`        | Run the test suite (uses `TEST_DATABASE_URL`) |
| `npm run lint`    | Check code with ESLint                        |
| `npm run format`  | Format code with Prettier                     |

## API reference

Base URL: `/api/v1`. Routes marked 🔒 need an `Authorization: Bearer <token>` header.

| Method | Path             | Description                              |
| ------ | ---------------- | ---------------------------------------- |
| GET    | `/health`        | Server and database status               |
| POST   | `/auth/register` | Create an account. Returns user + token  |
| POST   | `/auth/login`    | Log in. Returns user + token             |
| GET    | `/auth/me` 🔒    | The logged-in user                       |
| GET    | `/tasks` 🔒      | List your tasks (see query options)      |
| POST   | `/tasks` 🔒      | Create a task                            |
| GET    | `/tasks/:id` 🔒  | Get one task                             |
| PUT    | `/tasks/:id` 🔒  | Replace a task                           |
| PATCH  | `/tasks/:id` 🔒  | Update some fields of a task             |
| DELETE | `/tasks/:id` 🔒  | Delete a task (returns `204 No Content`) |

### Task fields

| Field         | Type                               | Default    | Notes                                                |
| ------------- | ---------------------------------- | ---------- | ---------------------------------------------------- |
| `title`       | string, 1–200 chars                | (required) | Trimmed                                              |
| `description` | string up to 5000 chars, or `null` | `null`     |                                                      |
| `status`      | `todo` \| `in_progress` \| `done`  | `todo`     |                                                      |
| `priority`    | `low` \| `medium` \| `high`        | `medium`   |                                                      |
| `dueDate`     | ISO 8601 date-time, or `null`      | `null`     | Must include a timezone, e.g. `2026-12-31T17:00:00Z` |

- **PUT** replaces the whole task. `title` is required and any field you leave out goes back to its default.
- **PATCH** changes only the fields you send (at least one). Send `null` to clear `description` or `dueDate`.
- Requesting another user's task returns `404`, the same as a task that doesn't exist.

### Query options for `GET /tasks`

| Param      | Values                                                   | Default     |
| ---------- | -------------------------------------------------------- | ----------- |
| `page`     | integer ≥ 1                                              | `1`         |
| `limit`    | 1–100                                                    | `10`        |
| `status`   | `todo`, `in_progress`, `done`                            |             |
| `priority` | `low`, `medium`, `high`                                  |             |
| `search`   | text matched against title and description (any case)    |             |
| `sortBy`   | `createdAt`, `updatedAt`, `dueDate`, `priority`, `title` | `createdAt` |
| `order`    | `asc`, `desc`                                            | `desc`      |

Tasks with no due date always sort last.

### Example requests

```bash
# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","password":"Password123"}'

# Create a task (use the token from register/login)
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Write README","priority":"high","dueDate":"2026-12-31T17:00:00Z"}'

# List high-priority tasks that are not done yet, soonest due first
curl "http://localhost:3000/api/v1/tasks?status=todo&priority=high&sortBy=dueDate&order=asc" \
  -H "Authorization: Bearer $TOKEN"

# Mark a task as done
curl -X PATCH http://localhost:3000/api/v1/tasks/<task-id> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}'
```

### Response format

Success:

```json
{
  "success": true,
  "data": {
    "id": "5559dc54-5e6b-4279-b020-d6bc70b9865e",
    "title": "Write README",
    "description": null,
    "status": "todo",
    "priority": "high",
    "dueDate": "2026-12-31T17:00:00.000Z",
    "createdAt": "2026-11-11T07:15:52.302Z",
    "updatedAt": "2026-11-11T07:15:52.302Z"
  }
}
```

Lists add a `meta` object:

```json
{
  "success": true,
  "data": [],
  "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```

Errors:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [{ "location": "body", "field": "title", "message": "Title is required" }]
  }
}
```

### Error codes

| Status | Code                                              | When                                            |
| ------ | ------------------------------------------------- | ----------------------------------------------- |
| 400    | `VALIDATION_ERROR`                                | Body, params or query failed validation         |
| 400    | `INVALID_JSON`                                    | Request body isn't valid JSON                   |
| 401    | `TOKEN_MISSING`, `TOKEN_INVALID`, `TOKEN_EXPIRED` | Problem with the auth token                     |
| 401    | `INVALID_CREDENTIALS`                             | Wrong email or password                         |
| 404    | `NOT_FOUND`                                       | Unknown route, or task not found                |
| 409    | `CONFLICT`                                        | Email is already registered                     |
| 413    | `PAYLOAD_TOO_LARGE`                               | Body is over 10 KB                              |
| 429    | `TOO_MANY_REQUESTS`                               | More than 10 auth requests in 15 minutes        |
| 500    | `INTERNAL_ERROR`                                  | Unexpected error (details hidden in production) |
| 503    | `SERVICE_UNAVAILABLE`                             | Health check can't reach the database           |

## Project structure

```
src/
├── app.js                 # Express app: middleware, routes, error handling
├── server.js              # Starts the server, handles graceful shutdown
├── config/env.js          # Loads and validates environment variables
├── db/
│   ├── pool.js            # PostgreSQL connection pool and transaction helper
│   ├── migrate.js         # Applies SQL migrations in order
│   ├── seed.js            # Demo data
│   └── migrations/        # 001_create_users.sql, 002_create_tasks.sql
├── middleware/            # authenticate, validate, rateLimiter, errorHandler, notFound
├── modules/
│   ├── auth/              # routes → controller → service → repository, plus Zod schemas
│   └── tasks/             # same layout
└── utils/                 # AppError, JWT helpers, response helpers
tests/                     # Integration tests (Vitest + Supertest)
```

Each module is split into layers: **routes** connect URLs to validation and controllers, **controllers** handle HTTP, **services** hold business rules, and **repositories** contain all the SQL.

## Adding a migration

Add a new numbered file such as `src/db/migrations/003_add_task_tags.sql` and run `npm run migrate`. Each file runs once, inside a transaction, and is recorded in the `schema_migrations` table.

## Deployment notes

- Set `NODE_ENV=production` so 500 errors don't include internal messages.
- Set `CORS_ORIGIN` to your frontend's URL(s) instead of `*`.
- If you run behind a reverse proxy or a platform like Render or Railway, add `app.set('trust proxy', 1)` in `src/app.js` so rate limiting sees real client IPs.

## License

MIT
