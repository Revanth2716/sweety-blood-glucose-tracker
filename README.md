# Sweety - Blood Glucose Tracker

A small web app where a diabetes patient records up to **four blood glucose readings a day**
and reads daily and monthly reports.

Built for the Kenpath "Junior Full Stack Developer - JavaScript & AI" assignment.

| Dashboard                                       | Add a reading                                                 | Reports                                                               |
| ----------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| ![Dashboard](docs/screenshots/01-dashboard.png) | ![Validation error](docs/screenshots/02-validation-error.png) | ![Month to date report](docs/screenshots/04-month-to-date-report.png) |

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Database setup](#database-setup)
- [Running the server, the client and the tests](#running-the-server-the-client-and-the-tests)
- [Demo account](#demo-account)
- [API reference](#api-reference)
- [Screenshots](#screenshots)
- [Project structure](#project-structure)
- [Notes: assumptions and what I would improve](#notes-assumptions-and-what-i-would-improve)
- [License](#license)

---

## Features

### Required

- **Sign up and log in** - register with name, email and password, then log in. Passwords are
  stored as bcrypt hashes, never as plain text. After logging in a user only sees their own
  readings.
- **Add, view, edit and delete readings** - every reading has a date, one of the four time slots
  (Morning (fasting), After breakfast, After lunch, After dinner) and a value in mg/dl.
- **Validation with clear messages** - every rule from the assignment is checked in the browser
  and again on the server, and the message is shown exactly as it was specified:

  | Rule                                            | Message                                                  |
  | ----------------------------------------------- | -------------------------------------------------------- |
  | Value is required                               | `Please enter a glucose value.`                          |
  | Value must be a whole number between 40 and 600 | `Value must be between 40 and 600 mg/dl.`                |
  | Only one reading per slot per day               | `You already have an After lunch reading for this date.` |
  | Maximum 4 readings per day                      | `You can add only 4 readings per day.`                   |
  | Date cannot be in the future                    | `Date cannot be in the future.`                          |

- **Reports** - daily, month to date and monthly. Each report shows the highest, the lowest, the
  average (rounded to one decimal place) and the number of readings. The daily report also lists
  the readings with their slot, and a period without readings shows a friendly empty state.

| Daily report                                          | Monthly report                                            |
| ----------------------------------------------------- | --------------------------------------------------------- |
| ![Daily report](docs/screenshots/03-daily-report.png) | ![Monthly report](docs/screenshots/05-monthly-report.png) |

### Bonus

- **Pagination** - `GET /api/readings?page=1&limit=20` returns pagination metadata, and the
  dashboard shows Previous / Next controls.
- **Charts** - a Recharts line chart of the readings over a month.
- **Docker** - `docker-compose.yml` starts PostgreSQL, the API and the web client.
- **Frontend tests** - React Testing Library tests for the reading form.

---

## Tech stack

| Layer    | Choice                                                                  |
| -------- | ----------------------------------------------------------------------- |
| Frontend | React 19, React Router 7, Vite 8, Recharts 3, plain CSS                 |
| Backend  | Node.js, Express 5, zod, bcryptjs, jsonwebtoken                         |
| Database | PostgreSQL 16 (via `pg`) **or** the embedded PGlite build of PostgreSQL |
| Tests    | Vitest, Supertest (API), React Testing Library (UI)                     |
| Tooling  | npm workspaces, ESLint 10 (flat config), Prettier, Docker Compose       |

The backend is plain JavaScript (ESM) with JSDoc types, and it uses parameterised SQL - no ORM,
so every query can be read.

---

## Prerequisites

- **Node.js 20.19+ or 22.12+** (developed and tested on Node 24)
- **npm 10+**
- Docker is **optional** - only needed if you want to run the stack with a real PostgreSQL server.

---

## Setup

```bash
# 1. clone the repository
git clone <your-repository-url>
cd sweety-blood-glucose-tracker

# 2. install the dependencies of both workspaces
npm install

# 3. create your environment file
cp .env.example .env          # Windows PowerShell: copy .env.example .env

# 4. put a real secret into JWT_SECRET inside .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 5. create the demo user and 60 days of sample readings
npm run seed

# 6. start the API and the client
npm run dev
```

The client is then available at **http://localhost:5173** and the API at
**http://localhost:4000/api**.

`npm run dev` starts both processes:

```
api  http://localhost:4000/api   (node --watch, restarts on every change)
web  http://localhost:5173        (Vite dev server)
```

---

## Database setup

The app talks to PostgreSQL through one small adapter, so the same SQL runs on every backend.
Two ways to get a database:

### A. Embedded PGlite (default, nothing to install)

`PGlite` is PostgreSQL 17 compiled to WebAssembly. It runs inside the Node process and stores
its data in the `.pglite/` folder. This is the path the tests and the screenshots use.

```bash
# .env
DB_MODE=pglite
PGLITE_DATA_DIR=./.pglite
```

Use `PGLITE_DATA_DIR=memory://` for a throw-away database that is empty on every restart.

### B. A real PostgreSQL server

```bash
# with Docker
docker compose up -d db

# or with your own server
createdb sweety
```

```bash
# .env
DB_MODE=postgres
DATABASE_URL=postgresql://sweety:sweety@localhost:5432/sweety
```

The migrations in `server/src/db/migrations/` are applied automatically when the server starts,
and `npm run migrate` applies them on their own. The applied migrations are tracked in the
`schema_migrations` table, so running them twice is safe.

---

## Running the server, the client and the tests

| Command                 | What it does                                                  |
| ----------------------- | ------------------------------------------------------------- |
| `npm run dev`           | Runs the API and the client together                          |
| `npm run dev:server`    | Runs only the API (`node --watch src/index.js`)               |
| `npm run dev:client`    | Runs only the Vite dev server                                 |
| `npm run build`         | Builds the client into `client/dist`                          |
| `npm start`             | Runs the API without the file watcher                         |
| `npm run seed`          | Creates the demo user and the sample readings                 |
| `npm run migrate`       | Applies the database migrations only                          |
| `npm test`              | Runs the API tests and the frontend tests                     |
| `npm run test:server`   | Runs only the API tests (Vitest + Supertest)                  |
| `npm run test:client`   | Runs only the frontend tests (Vitest + React Testing Library) |
| `npm run test:coverage` | Runs the API tests with a coverage report                     |
| `npm run lint`          | Runs ESLint over the whole repository                         |
| `npm run format`        | Formats the code with Prettier                                |

### With Docker

```bash
docker compose up --build
```

| Service            | Address                                            |
| ------------------ | -------------------------------------------------- |
| Web client (nginx) | http://localhost:8080                              |
| API                | http://localhost:4000/api                          |
| PostgreSQL         | `postgresql://sweety:sweety@localhost:5432/sweety` |

nginx proxies `/api` to the API container, so the browser only talks to one origin.

---

## Demo account

The seed script creates this account with 60 days of sample readings:

|          |                   |
| -------- | ----------------- |
| Email    | `demo@sweety.app` |
| Password | `demo1234`        |

The seed script can be run as often as you like - it resets the readings of the demo user and
writes the same data again (the random numbers are seeded, so the data is always the same).

---

## API reference

All endpoints live under `/api`. Every endpoint except register and login needs the header
`Authorization: Bearer <token>`.

### Auth

| Method | Endpoint             | Body                        | Success               | Errors                                     |
| ------ | -------------------- | --------------------------- | --------------------- | ------------------------------------------ |
| POST   | `/api/auth/register` | `{ name, email, password }` | `201 { user, token }` | `400` validation, `409` email already used |
| POST   | `/api/auth/login`    | `{ email, password }`       | `200 { user, token }` | `400` validation, `401` wrong credentials  |
| GET    | `/api/auth/me`       | –                           | `200 { user }`        | `401` missing or expired token             |

### Readings

| Method | Endpoint            | Purpose                                 | Success                    |
| ------ | ------------------- | --------------------------------------- | -------------------------- |
| GET    | `/api/readings`     | List the readings of the signed in user | `200 { data, pagination }` |
| GET    | `/api/readings/:id` | One reading                             | `200 { reading }`          |
| POST   | `/api/readings`     | Create a reading                        | `201 { reading }`          |
| PUT    | `/api/readings/:id` | Update a reading                        | `200 { reading }`          |
| DELETE | `/api/readings/:id` | Delete a reading                        | `204`                      |

Query parameters of `GET /api/readings`:

| Parameter     | Default | Meaning                          |
| ------------- | ------- | -------------------------------- |
| `page`        | `1`     | Page number                      |
| `limit`       | `20`    | Readings per page, capped at 100 |
| `date`        | –       | Only this date                   |
| `from` / `to` | –       | Inclusive date range             |

```json
{
  "data": [
    {
      "id": "0f4b...",
      "date": "2026-10-15",
      "slot": "after_lunch",
      "slotLabel": "After lunch",
      "value": 142
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 57, "totalPages": 3 }
}
```

### Reports

| Method | Endpoint                                     | Range for the selected date 15 Oct 2026 |
| ------ | -------------------------------------------- | --------------------------------------- |
| GET    | `/api/reports/daily?date=2026-10-15`         | 15 Oct - 15 Oct 2026                    |
| GET    | `/api/reports/month-to-date?date=2026-10-15` | 1 Oct - 15 Oct 2026                     |
| GET    | `/api/reports/monthly?date=2026-10-15`       | 1 Sep - 30 Sep 2026                     |

The `date` parameter is optional and defaults to today.

```json
{
  "report": "daily",
  "range": { "from": "2026-10-15", "to": "2026-10-15", "label": "15 Oct 2026" },
  "stats": { "highest": 142, "lowest": 88, "average": 115.3, "count": 4 },
  "readings": []
}
```

### Errors

Every error uses the same envelope, so the UI can always show the message of the server:

```json
{
  "error": {
    "message": "Please enter a glucose value.",
    "code": "VALUE_REQUIRED",
    "field": "value"
  }
}
```

---

## Screenshots

| File                                           | What it shows                                                              |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| `docs/screenshots/01-dashboard.png`            | The dashboard: the form, the readings of the day and the paginated history |
| `docs/screenshots/02-validation-error.png`     | The validation message of the reading form                                 |
| `docs/screenshots/03-daily-report.png`         | The daily report                                                           |
| `docs/screenshots/04-month-to-date-report.png` | The month to date report with the chart                                    |
| `docs/screenshots/05-monthly-report.png`       | The monthly report                                                         |
| `docs/screenshots/06-sign-up.png`              | The sign up page                                                           |

---

## Project structure

```
.
├─ docker-compose.yml            # PostgreSQL + API + web
├─ .env.example                  # every environment variable, without secrets
├─ eslint.config.js
├─ server/
│  ├─ src/
│  │  ├─ index.js                # entry point: config -> migrate -> listen
│  │  ├─ app.js                  # the express app
│  │  ├─ config.js               # environment loading and validation
│  │  ├─ db/                     # database adapter, migrations
│  │  ├─ lib/                    # errors, jwt, dates, slots
│  │  ├─ middleware/             # auth, validation, error handler
│  │  ├─ modules/                # auth, readings, reports
│  │  └─ scripts/seed.js
│  └─ tests/                     # Vitest + Supertest
└─ client/
   ├─ src/
   │  ├─ api/client.js           # fetch wrapper for the API
   │  ├─ context/                # authentication state
   │  ├─ components/             # form, tables, report cards, chart
   │  ├─ pages/                  # login, sign up, dashboard, reports
   │  └─ __tests__/              # React Testing Library
   └─ Dockerfile, nginx.conf
```

**The rule of the layers:** a route file only reads the request and writes the response, a
service file owns the business rules and the messages, and a repository file owns the SQL.

---

## Notes: assumptions and what I would improve

### Assumptions I made

1. **"Today" is the server's local date.** A reading for the current day is allowed; a reading
   for a later day is rejected with `Date cannot be in the future.` A user in a time zone ahead
   of the server could therefore be told that today is in the future - the client sends its own
   date, so a follow-up would be to pass the client's time zone offset.
2. **The order of the validation checks.** The assignment lists the rules in a table, but the
   "date cannot be in the future" check runs _before_ the two database checks. Otherwise a
   future date on a day that already holds four readings would be reported as
   `You can add only 4 readings per day.`, which would be confusing.
3. **Both daily-limit messages are reachable.** Because there are exactly four slots, a full day
   always has all of them taken. The implementation checks the number of readings first
   (`You can add only 4 readings per day.`), and the slot afterwards
   (`You already have an After lunch reading for this date.`). The unique index
   `(user_id, reading_date, slot)` in the database is the final guarantee, so two parallel
   requests can never create the same slot twice.
4. **The morning slot keeps its label in the message.** The conflict message for the first slot
   reads `You already have a Morning (fasting) reading for this date.`
5. **The monthly report shows the previous calendar month** relative to the selected date, as in
   the example of the assignment (15 Oct 2026 gives 1 Sep - 30 Sep 2026).
6. **The average is rounded to one decimal place**, the highest, lowest and count are whole
   numbers. The rounding happens in SQL (`ROUND(AVG(value)::numeric, 1)`).
7. **The password policy is 8 to 72 characters.** 72 characters is the limit of bcrypt.
8. **The token is stored in `localStorage`.** That is the simplest approach for a single page
   application, but it exposes the token to XSS. In production I would use a short lived access
   token in memory plus a refresh token in an httpOnly, SameSite cookie.
9. **The four slots and the limit of four readings per day are constants** in
   `server/src/lib/slots.js`, not something a user can configure. The assignment describes them
   as fixed, and making them configurable would need a slot management screen.
10. **The embedded PGlite database is the default for development.** The production setup is a
    real PostgreSQL server; the application code is the same for both, only the driver changes.
    The Docker stack is the reference for the PostgreSQL path.
11. **The Docker stack was written but not run on my machine** - Docker was not installed there.
    The compose file and the Dockerfiles follow the documented format and the YAML was validated,
    but the containers themselves have not been started here.
12. **The email address is unique regardless of case**, so `Alice@example.com` and
    `alice@example.com` are the same account.

### What I would improve with more time

- **A doctor role** with patients assigned to a doctor, so a doctor can read the reports of the
  patients they look after.
- **Redis for the report results**, cleared whenever a reading changes - the reports are read far
  more often than they are written.
- **A daily reminder** with BullMQ: a job that finds the users with fewer than four readings and
  sends them a reminder.
- **Unit conversion** between mg/dl and mmol/L, and the option to show the readings as a table,
  a chart or both.
- **Export** of the readings and the reports as CSV or PDF, so a patient can share them with
  their doctor.
- **Password reset** by email, and refresh tokens with a short lived access token.
- **End to end tests** with Playwright, on top of the API and component tests that are already
  there.
- **A doctor view of a single patient**, which would be the first thing to build on top of the
  current data model.

---

## License

MIT - see [LICENSE](LICENSE).
