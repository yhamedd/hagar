# Hagar Lashes & Nails Booking

A Next.js salon booking application with persistent PostgreSQL storage, an authenticated admin dashboard, deposit holds, technician schedules, and a private shared technician calendar.

## Development database

Development must use its own PostgreSQL database. The app does not fall back to memory, JSON files, browser storage, or the deployment filesystem for clients, bookings, services, prices, admin users, or schedules.

1. Install Node.js 20.9 or newer.
2. Create a managed PostgreSQL development database or branch.
3. Copy `.env.example` to `.env.development.local`.
4. Set `APP_ENV=development`, `DATABASE_ENVIRONMENT=development`, and the development-only `DATABASE_URL`.
5. Set unique development admin and technician seed passwords.
6. Load the environment, then run `npm run db:migrate` and `npm run db:seed`.
7. Remove the seed passwords after the accounts exist and run `npm run dev`.

The runtime refuses to connect when its declared application and database environments differ.

## Replit setup

1. Import this project into Replit.
2. Open the Database tool. Replit creates the development PostgreSQL database and supplies `DATABASE_URL` automatically.
3. Open Secrets and add `APP_ENV=development`, `DATABASE_ENVIRONMENT=development`, a random `JWT_SECRET` of at least 32 characters, and the four initial account values shown in `.env.example`.
4. In the Replit Shell, run `npm run replit:setup` once. This applies the migrations and creates the initial admin, technician login, technicians, and service catalogue.
5. Remove `INITIAL_ADMIN_PASSWORD` and `TECHNICIAN_PORTAL_PASSWORD` from development Secrets after the first successful seed. The password hashes remain securely in PostgreSQL.
6. Use Replit's Run button to start the development app.

Do not paste `DATABASE_URL` into source files or chat. Replit exposes it to the app as an encrypted environment variable.

## Production database

When publishing in Replit, open Production database settings and enable **Create production database**. Use **Set up your production database with your current development data** for the first publish so the migrated schema, service catalogue, technicians, and login accounts are copied while future development data stays isolated.

In Replit deployment secrets, set:

- `APP_ENV=production`
- `DATABASE_ENVIRONMENT=production`
- `DATABASE_URL` for the production database
- A unique `JWT_SECRET` of at least 32 characters

Replit supplies the production `DATABASE_URL` when the production database is enabled. Never copy the development connection string into deployment secrets or expose database credentials through `NEXT_PUBLIC_*` variables. The runtime treats `REPLIT_DEPLOYMENT=1` as Production and refuses a development database declaration.

## Data integrity and privacy

- Normalized phone numbers are unique, preventing duplicate client profiles.
- Every booking has required foreign keys to a client, service, and technician.
- Booking prices and service names are stored as historical snapshots.
- Admin APIs verify an HTTP-only signed admin session on the server.
- Technician APIs expose only appointment date, time, duration, and service.
- Customer management links use hashed random tokens and do not reveal phone numbers or private notes.

## Quality checks

Run `npm run check` for TypeScript, ESLint, unit tests, and the production build.
