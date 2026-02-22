# UNILAG Campus Queue Management Information System

Queue management for University of Lagos: sessions, student sign-up, live queue, waitlist, and notifications.

## Stack

- **Backend:** TypeScript, Express, Prisma (PostgreSQL)
- **Frontend:** React, Vite, React Router

## Setup

### 1. Database

**Option A — PostgreSQL with Docker (recommended)**

From the project root:

```bash
create a docker-compose.yml using this:

services:
  postgres:
    image: postgres:16-alpine
    container_name: unilag-queue-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: unilag
      POSTGRES_PASSWORD: your_secret
      POSTGRES_DB: unilag_queue
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:

then

docker compose up -d
```
Use this in `server/.env`:

```env
DATABASE_URL=postgresql://unilag:unilag_secret@localhost:5433/unilag_queue
```

**Option B — Local PostgreSQL**

Create a database (e.g. `unilag_queue`) and set `DATABASE_URL` in `server/.env` accordingly.

**Env (copy `server/.env.example` to `server/.env`):**

```bash
DATABASE_URL=postgresql://unilag:unilag_secret@localhost:5433/unilag_queue   # if using Docker
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
CLIENT_URL=http://localhost:3000
PORT=5000
```

### 2. Backend

```bash
cd server
npm install
npx prisma migrate dev    # create DB tables
npm run seed               # seed superadmin, departments, admins, lecturer, students
npm run dev                # run API on http://localhost:5000
```

### 3. Frontend

```bash
cd client
npm install
npm run dev                # run app on http://localhost:3000
```

## Seed accounts (after `npm run seed`)

| Role        | Email                    | Password      |
|------------|--------------------------|---------------|
| superadmin | superadmin@unilag.edu.ng | SuperAdmin123! |
| dept_admin | medical@unilag.edu.ng    | DeptAdmin123! |
| dept_admin | cits@unilag.edu.ng       | DeptAdmin123! |
| lecturer   | lecturer@unilag.edu.ng   | Lecturer123!  |
| student    | student1@unilag.edu.ng   | Student123!  |

Students can also register via the app (matric number required).