# Sweety - Blood Glucose Tracker

A small web app where a diabetes patient records up to **four blood glucose readings a day**
and reads daily and monthly reports - with the clinical context that turns numbers into insight.

Built for the Kenpath "Junior Full Stack Developer - JavaScript & AI" assignment.

[![CI](https://github.com/Revanth2716/sweety-blood-glucose-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/Revanth2716/sweety-blood-glucose-tracker/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1.svg)](LICENSE)

| The dashboard                                   | The reports                                 |
| ----------------------------------------------- | ------------------------------------------- |
| ![Dashboard](docs/screenshots/01-dashboard.png) | ![Reports](docs/screenshots/03-reports.png) |

---

## Contents

- [Features](#features)
- [What the app tells you](#what-the-app-tells-you)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
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

### Bonus

- **Pagination** - `GET /api/readings?page=1&limit=20` returns pagination metadata, and the
  dashboard shows Previous / Next controls.
- **Charts** - a Recharts line chart of the readings over a month, with the target range drawn
  behind it.
- **Docker** - `docker-compose.yml` starts PostgreSQL, the API and the web client.
- **Frontend tests** - React Testing Library tests for the reading form.
- **Target ranges and status** - every reading is classified as _Low_, _In range_ or _High_
  against the target of its slot, and the interface shows it as a colour coded badge.
- **Time in range** - the percentage of the readings between 70 and 180 mg/dl, drawn as a gauge.
- **Trend** - every report is compared with the period right before it.
- **Estimated A1C** - an estimate of the HbA1c from the average glucose of the period.
- **API documentation** - an OpenAPI document and a Swagger UI at `/api/docs`.
- **Continuous integration** - GitHub Actions runs the formatter, the linter, the tests and the
  build on every push.

---

## What the app tells you

A number on its own is not very useful, so every reading and every report comes with context.

| Signal                    | What it means                                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Low / In range / High** | A reading below 70 mg/dl is _low_, a fasting reading above 130 mg/dl and a reading after a meal above 180 mg/dl is _high_.                            |
| **Time in range**         | The share of the readings between 70 and 180 mg/dl - the measure that is used in diabetes care. Above 70 percent is the usual goal.                   |
| **Trend**                 | The average, the number of readings and the time in range of the period before, with the change in percent.                                           |
| **Estimated A1C**         | `A1C = (average glucose + 46.7) / 28.7`. An estimate for the patient's own information, not a diagnosis. It only appears with three readings or more. |
| **By time slot**          | The average of every slot, so it is visible that the after dinner readings run higher than the morning ones.                                          |

The target ranges live in one file on the server (`server/src/lib/targets.js`) and are mirrored
for the interface in `client/src/lib/targets.js`, so the two always agree.

---

## Tech stack

| Layer    | Choice                                                                            |
| -------- | --------------------------------------------------------------------------------- |
| Frontend | React 19, React Router 7, Vite 8, Recharts 3, plain CSS (no UI framework)         |
| Backend  | Node.js, Express 5, zod, bcryptjs, jsonwebtoken                                   |
| Database | PostgreSQL 16 (via `pg`) **or** the embedded PGlite build of PostgreSQL           |
| API docs | OpenAPI 3 document + Swagger UI (`swagger-ui-dist`)                               |
| Tests    | Vitest, Supertest (API), React Testing Library (UI)                               |
| Tooling  | npm workspaces, ESLint 10 (flat config), Prettier, GitHub Actions, Docker Compose |

The backend is plain JavaScript (ESM) with JSDoc types, and it uses parameterised SQL - no ORM,
so every query can be read.

---

## Architecture

```mermaid
flowchart LR
    subgraph client [React client]
        UI[Pages and components]
        AC[api/client.js]
        UI --> AC
    end

    subgraph server [Express API]
        R[Routes]
        S[Services]
        Q[Repositories]
        M[Middleware]
        R --> S --> Q
        R --> M
        D[OpenAPI and Swagger UI]
    end

    DB[(PostgreSQL<br/>or PGlite)]

    AC -->|fetch + JWT| R
    Q -->|parameterised SQL| DB
```

**The rule of the layers:** a route file only reads the request and writes the response, a service
file owns the business rules and the messages, and a repository file owns the SQL.

```
Browser --> Routes --> Services --> Repositories --> PostgreSQL
           |            |
           |            +-- business rules, validation messages
           +-- authentication, validation, error envelope
```

The database is reached through one small adapter (`server/src/db/index.js`), so the same SQL
runs on the embedded PGlite database used in development and the tests, and on a real PostgreSQL
server used in production.

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
**http://localhost:4000/api**. The interactive API documentation is at
**http://localhost:4000/api/docs**.

---

## Database setup

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
| API documentation  | http://localhost:8080/api/docs                     |
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
`Authorization: Bearer <token>`. The full document is served at `/api/openapi.json` and rendered
by Swagger UI at `/api/docs`.

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
      "value": 142,
      "status": "in-range",
      "statusLabel": "In range",
      "target": { "min": 70, "max": 180, "label": "Post-meal target 70-180 mg/dl" }
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

The `date` parameter is optional and defaults to today. Every report also carries the range right
before it, so the interface can show the trend.

```json
{
  "report": "daily",
  "range": { "from": "2026-10-15", "to": "2026-10-15", "label": "15 Oct 2026" },
  "previousRange": { "from": "2026-10-14", "to": "2026-10-14", "label": "14 Oct 2026" },
  "stats": {
    "highest": 142,
    "lowest": 88,
    "average": 115.3,
    "count": 4,
    "standardDeviation": 21.4,
    "inRange": 3,
    "belowRange": 0,
    "aboveRange": 1,
    "timeInRange": 75,
    "estimatedA1c": 5.6
  },
  "trend": {
    "average": {
      "current": 115.3,
      "previous": 110,
      "change": 5.3,
      "changePercent": 4.8,
      "direction": "up"
    },
    "count": { "current": 4, "previous": 3, "change": 1, "direction": "up" },
    "timeInRange": { "current": 75, "previous": 66.7, "change": 8.3, "direction": "up" }
  },
  "slots": [{ "slot": "after_lunch", "slotLabel": "After lunch", "count": 1, "average": 142 }],
  "readings": []
}
```

### Errors

Every error uses the same envelope, so the interface can always show the message of the server:

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

| File                                       | What it shows                                                     |
| ------------------------------------------ | ----------------------------------------------------------------- |
| `docs/screenshots/01-dashboard.png`        | The dashboard: the form, the four slots and the paginated history |
| `docs/screenshots/02-validation-error.png` | The validation message of the reading form                        |
| `docs/screenshots/03-reports.png`          | The reports with the stat cards and the trend                     |
| `docs/screenshots/04-time-in-range.png`    | The time in range gauge                                           |
| `docs/screenshots/05-chart.png`            | The chart of the readings over the month                          |
| `docs/screenshots/06-sign-up.png`          | The sign up page                                                  |
| `docs/screenshots/07-api-docs.png`         | The Swagger UI of the API                                         |

---

## Project structure

```
.
├─ docker-compose.yml            # PostgreSQL + API + web
├─ .env.example                  # every environment variable, without secrets
├─ .github/workflows/ci.yml      # format, lint, test and build on every push
├─ eslint.config.js
├─ server/
│  ├─ src/
│  │  ├─ index.js                # entry point: config -> migrate -> listen
│  │  ├─ app.js                  # the express app
│  │  ├─ config.js               # environment loading and validation
│  │  ├─ db/                     # database adapter, migrations
│  │  ├─ docs/                   # the OpenAPI document and Swagger UI
│  │  ├─ lib/                    # errors, jwt, dates, slots, targets
│  │  ├─ middleware/             # auth, validation, error handler
│  │  ├─ modules/                # auth, readings, reports
│  │  └─ scripts/seed.js
│  └─ tests/                     # Vitest + Supertest
└─ client/
   ├─ src/
   │  ├─ api/client.js           # fetch wrapper for the API
   │  ├─ context/                 # authentication state and toasts
   │  ├─ components/              # form, slot cards, gauge, chart, tables
   │  ├─ lib/                     # dates, slots, targets, validation
   │  ├─ pages/                   # login, sign up, dashboard, reports
   │  └─ __tests__/               # React Testing Library
   └─ Dockerfile, nginx.conf
```

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
7. **The target ranges are the usual ones.** 70 mg/dl is used as the lower limit (a reading below
   it is a hypo), 130 mg/dl as the upper target of a fasting reading and 180 mg/dl as the upper
   target after a meal. They are constants in `server/src/lib/targets.js`, not something a user
   can configure.
8. **The time in range band (70-180 mg/dl) is not the same as the target of a slot.** A fasting
   reading of 140 is _high_ against the fasting target, but still inside the time in range band.
   That is how the measures are used in diabetes care, and both are shown in the interface.
9. **The estimated A1C is an estimate** from the average glucose, not a diagnosis, and it only
   appears when there are at least three readings.
10. **The password policy is 8 to 72 characters.** 72 characters is the limit of bcrypt.
11. **The token is stored in `localStorage`.** That is the simplest approach for a single page
    application, but it exposes the token to XSS. In production I would use a short lived access
    token in memory plus a refresh token in an httpOnly, SameSite cookie.
12. **The embedded PGlite database is the default for development.** The production setup is a
    real PostgreSQL server; the application code is the same for both, only the driver changes.
    The Docker stack is the reference for the PostgreSQL path.
13. **The Docker stack was written but not run on my machine** - Docker was not installed there.
    The compose file and the Dockerfiles follow the documented format and the YAML was validated,
    but the containers themselves have not been started here.
14. **The email address is unique regardless of case**, so `Alice@example.com` and
    `alice@example.com` are the same account.

### What I would improve with more time

- **A doctor role** with patients assigned to a doctor, so a doctor can read the reports of the
  patients they look after.
- **Redis for the report results**, cleared whenever a reading changes - the reports are read far
  more often than they are written.
- **A daily reminder** with BullMQ: a job that finds the users with fewer than four readings and
  sends them a reminder.
- **Refresh tokens** with a short lived access token, which fixes the `localStorage` trade-off.
- **Email verification and password reset** by email, with single use tokens.
- **Unit conversion** between mg/dl and mmol/L, and a print friendly report that a patient can
  hand to their doctor.
- **Export** of the readings and the reports as CSV or PDF.
- **End to end tests** with Playwright, on top of the API and component tests that are already
  there.
- **A doctor view of a single patient**, which would be the first thing to build on top of the
  current data model.

---

## License

MIT - see [LICENSE](LICENSE).
