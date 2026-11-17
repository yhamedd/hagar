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
3. Open Secrets and add `APP_ENV=development`, `DATABASE_ENVIRONMENT=development`, a random `JWT_SECRET` of at least 32 characters, a random `CRON_SECRET`, and the four initial account values shown in `.env.example`.
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
- A unique `CRON_SECRET` for the scheduled cleanup endpoint

Replit supplies the production `DATABASE_URL` when the production database is enabled. Never copy the development connection string into deployment secrets or expose database credentials through `NEXT_PUBLIC_*` variables. The runtime treats `REPLIT_DEPLOYMENT=1` as Production and refuses a development database declaration.

## Scheduled deposit-hold cleanup

Unpaid `pending_deposit` bookings are released automatically 12 hours after they
are created. Two mechanisms cover this:

- **Opportunistic** – every slot, availability, and booking-list request triggers
  the cleanup at most once per minute per server instance.
- **Scheduled** – `GET`/`POST /api/cron/cleanup-bookings` runs it unconditionally
  and returns `{ ok: true, cancelled: <n> }`. The request must carry the
  `CRON_SECRET`, either as `Authorization: Bearer <CRON_SECRET>` or `?secret=<CRON_SECRET>`.

Schedulers:

- **Vercel** – `vercel.json` registers a Vercel Cron for `/api/cron/cleanup-bookings`.
  Vercel automatically attaches `Authorization: Bearer $CRON_SECRET` when the
  `CRON_SECRET` env var is set on the project. The default schedule is daily
  (Hobby plan limit); tighten it to hourly or `*/15 * * * *` on Pro.
- **GitHub Actions** – `.github/workflows/cleanup-cron.yml` calls the endpoint
  every 15 minutes. Set the repository secrets `APP_URL` (deployed origin, no
  trailing slash) and `CRON_SECRET`. Use this if you are not on Vercel Pro, or
  delete it if Vercel Cron is enough.
- **Anything else** (Replit Scheduled Deployment, cron-job.org, an uptime
  monitor) works the same way — `GET`/`POST` the path with the secret.

## Vercel deployment

1. Link the project: `vercel link` (a Vercel project named `hagar` already
   exists) or connect `github.com/yhamedd/hagar` in the Vercel dashboard.
2. In **Project → Settings → Environment Variables**, add for the **Production**
   environment:
   - `APP_ENV=production`
   - `DATABASE_ENVIRONMENT=production`
   - `DATABASE_URL` – a **pooled** Postgres connection string (Neon pooler,
     Supabase transaction pooler, or Vercel Postgres); serverless functions open
     many short-lived connections.
   - `JWT_SECRET` – ≥ 32 random characters
   - `CRON_SECRET` – long random string (also powers Vercel Cron auth)
3. Deploy: `vercel --prod`, or push to the connected branch.

`bash scripts/vercel-build.sh` is the build command. It runs `npm run db:migrate`
**only** when `VERCEL_ENV=production`, then `next build`, so Preview deployments
never touch the production database. The runtime refuses to start unless
`DATABASE_ENVIRONMENT` matches the resolved environment (`production` on Vercel,
since `REPLIT_DEPLOYMENT` is unset and `NODE_ENV=production`).

## WhatsApp booking reminders

In the admin dashboard, every upcoming booking that is pending or confirmed has a green **Remind** button (Bookings tab and Calendar tab). Clicking it opens WhatsApp on a chat with the client with the reminder already written (date, time, service, technician, location, and a deposit prompt when the booking is still pending) - press send in WhatsApp to deliver it. The message goes out from whichever WhatsApp account is signed in on that device, so no WhatsApp Business API account or credentials are needed.

The dashboard records when a reminder was opened (`bookings.reminder_sent_at`) and shows "Reminded <date>" beside the booking. Local Egyptian numbers are converted to international format automatically; the message text lives in `src/lib/whatsapp.ts` and salon contact details in `src/lib/site.ts`.

## Data integrity and privacy

- Normalized phone numbers are unique, preventing duplicate client profiles.
- Every booking has required foreign keys to a client, service, and technician.
- Booking prices and service names are stored as historical snapshots.
- Admin APIs verify an HTTP-only signed admin session on the server.
- Mutating `/api` requests are rejected when their `Origin` header does not match the serving host (CSRF defense-in-depth on top of `SameSite=Lax` cookies).
- Technician APIs expose only appointment date, time, duration, and service.
- A returning customer (matched by normalized phone) keeps the name and phone already on file; a new booking never overwrites a known client profile.
- Customer management links use hashed random tokens and do not reveal phone numbers or private notes.

## Quality checks

Run `npm run check` for TypeScript, ESLint, unit tests, and the production build.
