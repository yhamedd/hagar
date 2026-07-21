import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/node-postgres";
import { newDb, DataType } from "pg-mem";
import { Pool } from "pg";

type Database = ReturnType<typeof drizzle>;

const globalForDb = globalThis as typeof globalThis & {
  __hagarPostgresqlPool?: Pool;
  __hagarPostgresqlDb?: Database;
  __hagarDbMode?: "local-v3" | "postgres";
};

type AppEnvironment = "development" | "production";

function expectedEnvironment(): AppEnvironment {
  return process.env.REPLIT_DEPLOYMENT === "1"
    ? "production"
    : process.env.NODE_ENV === "development" || process.env.APP_ENV === "development"
      ? "development"
      : "production";
}

function databaseConfig() {
  const expected = expectedEnvironment();
  const databaseUrl = process.env.DATABASE_URL?.trim();

  // Local preview deliberately uses disposable demo data. Deployed Replit instances
  // must always have a real database so bookings are retained.
  if (!databaseUrl) {
    if (expected === "development" && process.env.REPLIT_DEPLOYMENT !== "1") return null;
    throw new Error("DATABASE_URL is required for deployed environments.");
  }

  const declared = process.env.DATABASE_ENVIRONMENT;
  if (declared !== expected) {
    throw new Error(`DATABASE_ENVIRONMENT must be ${expected}; refusing to connect to a differently scoped database.`);
  }
  return { databaseUrl, expected };
}

function quote(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function createLocalPreviewDatabase(): Database {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  memory.public.registerFunction({ name: "hashtext", args: [DataType.text], returns: DataType.integer, implementation: (value: string) => {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
    return hash;
  } });
  memory.public.registerFunction({ name: "pg_advisory_xact_lock", args: [DataType.integer], returns: DataType.bool, implementation: () => true });

  memory.public.none(`
    CREATE TABLE clients (id serial PRIMARY KEY, name varchar(200) NOT NULL, phone varchar(50) NOT NULL, phone_normalized varchar(30) NOT NULL UNIQUE, notes text, created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now());
    CREATE TABLE services (id serial PRIMARY KEY, name varchar(200) NOT NULL UNIQUE, category varchar(20) NOT NULL, price integer, price_max integer, price_label varchar(100) NOT NULL, duration integer NOT NULL, active boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0, created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now());
    CREATE TABLE technicians (id serial PRIMARY KEY, name varchar(100) NOT NULL, category varchar(20) NOT NULL, slot_type varchar(10) NOT NULL DEFAULT 'range', available_days jsonb NOT NULL DEFAULT '[]', start_time time, end_time time, slot_interval integer DEFAULT 60, fixed_slots jsonb, active boolean NOT NULL DEFAULT true, created_at timestamp NOT NULL DEFAULT now());
    CREATE TABLE blocked_dates (id serial PRIMARY KEY, technician_id integer NOT NULL REFERENCES technicians(id), blocked_date date NOT NULL, reason varchar(255), created_at timestamp NOT NULL DEFAULT now(), UNIQUE (technician_id, blocked_date));
    CREATE TABLE bookings (id serial PRIMARY KEY, client_id integer NOT NULL REFERENCES clients(id), service_id integer NOT NULL REFERENCES services(id), technician_id integer NOT NULL REFERENCES technicians(id), client_name varchar(200) NOT NULL, client_phone varchar(50) NOT NULL, service varchar(200) NOT NULL, extras jsonb DEFAULT '[]', price integer, price_is_estimate boolean NOT NULL DEFAULT false, booking_date date NOT NULL, booking_time time NOT NULL, duration integer DEFAULT 60, status varchar(30) NOT NULL DEFAULT 'pending_deposit', policy_acknowledged boolean NOT NULL DEFAULT false, notes text, admin_notes text, management_token_hash varchar(64) UNIQUE, created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now());
    CREATE TABLE admin_users (id serial PRIMARY KEY, username varchar(100) NOT NULL UNIQUE, password_hash text NOT NULL, active boolean NOT NULL DEFAULT true, session_version integer NOT NULL DEFAULT 1, created_at timestamp NOT NULL DEFAULT now());
    CREATE TABLE technician_portal_users (id serial PRIMARY KEY, username varchar(100) NOT NULL UNIQUE, password_hash text NOT NULL, active boolean NOT NULL DEFAULT true, session_version integer NOT NULL DEFAULT 1, updated_at timestamp NOT NULL DEFAULT now(), created_at timestamp NOT NULL DEFAULT now());
    CREATE TABLE rate_limits (key varchar(255) PRIMARY KEY, count integer NOT NULL DEFAULT 0, reset_at timestamp with time zone NOT NULL);
  `);

  const services = [
    ["Classic", "lashes", 1200, null, "1,200 EGP", 120], ["Classic Refill", "lashes", 800, null, "800 EGP", 90], ["Volume", "lashes", 1300, null, "1,300 EGP", 120], ["Volume Refill", "lashes", 900, null, "900 EGP", 90], ["Volume 3D", "lashes", 1500, null, "1,500 EGP", 150], ["Volume 3D Refill", "lashes", 1000, null, "1,000 EGP", 120], ["Silk Lashes", "lashes", 1500, 2000, "1,500–2,000 EGP", 150], ["Silk Lashes Refill", "lashes", 1000, 1500, "1,000–1,500 EGP", 120], ["Brow Lamination", "lashes", 1200, null, "1,200 EGP", 60], ["Lash Lifting", "lashes", 1200, null, "1,200 EGP", 60],
    ["Pedicure & Manicure", "nails", 500, null, "500 EGP", 90], ["Special Pedicure & Manicure", "nails", 700, null, "700 EGP", 120], ["Pedicure Hand", "nails", 200, null, "200 EGP", 45], ["Pedicure Feet", "nails", 300, null, "300 EGP", 60], ["New Set", "nails", 750, null, "750 EGP", 90], ["New Set + Gel Color", "nails", 1250, null, "1,250 EGP", 120], ["Gel Color", "nails", 500, null, "500 EGP", 60], ["Refill (Hard or Acrylic)", "nails", 550, null, "550 EGP", 90], ["Fake Nails + Gel Color", "nails", 800, null, "800 EGP", 90], ["Fix without Extension", "nails", 50, null, "50 EGP", 30], ["French or Ombre", "nails", 150, null, "150 EGP", 30], ["Moroccan", "nails", 150, null, "150 EGP", 30], ["Full Set of Nails (Toes)", "nails", 150, null, "150 EGP", 45], ["Design", "nails", 200, null, "from 200 EGP", 30], ["Remove Gel", "nails", 200, null, "200 EGP", 30], ["Eyebrows & Moustache", "extras", 150, null, "150 EGP", 30],
  ] as const;
  memory.public.none(`INSERT INTO services (name, category, price, price_max, price_label, duration, sort_order) VALUES ${services.map(([name, category, price, priceMax, priceLabel, duration], index) => `(${quote(name)}, ${quote(category)}, ${price}, ${priceMax ?? "NULL"}, ${quote(priceLabel)}, ${duration}, ${(index + 1) * 10})`).join(", ")};`);

  const technicians = [
    ["Hagar", "lashes", "range", "[0,1,2,3,4]", "13:00", "19:00", 60, null], ["Nada", "lashes", "fixed", "[2,4,6]", null, null, 60, '["11:30","13:00","14:30","16:00","17:30"]'], ["Caroline", "lashes", "range", "[0,1,2,3,4,5]", "13:00", "19:00", 60, null], ["Jennifer", "lashes", "range", "[1,5]", "13:00", "19:00", 60, null], ["Marwa", "nails", "range", "[1,2,3,4,5,6]", "13:00", "21:00", 60, null], ["Habiba", "nails", "range", "[0,1,2,3,4,6]", "13:00", "21:00", 60, null], ["Doaa", "nails", "range", "[0,1,2,3,4,6]", "13:00", "21:00", 60, null],
  ] as const;
  memory.public.none(`INSERT INTO technicians (name, category, slot_type, available_days, start_time, end_time, slot_interval, fixed_slots) VALUES ${technicians.map(([name, category, slotType, days, start, end, interval, slots]) => `(${quote(name)}, ${quote(category)}, ${quote(slotType)}, ${quote(days)}, ${start ? quote(start) : "NULL"}, ${end ? quote(end) : "NULL"}, ${interval}, ${slots ? quote(slots) : "NULL"})`).join(", ")};`);

  memory.public.none(`INSERT INTO admin_users (username, password_hash) VALUES ('admin', ${quote(bcrypt.hashSync("HagarAdmin2026", 10))});`);
  memory.public.none(`INSERT INTO technician_portal_users (username, password_hash) VALUES ('technicians', ${quote(bcrypt.hashSync("HagarTeam2026", 10))});`);

  const adapter = memory.adapters.createPg();
  // Drizzle attaches its optional node-postgres type parser to parameterised
  // queries. pg-mem does not implement that hook, so remove it for local demo
  // queries; all values use the schema's plain database representation.
  for (const Driver of [adapter.Pool, adapter.Client]) {
    const query = Driver.prototype.query;
    Driver.prototype.query = function (statement: unknown, ...args: unknown[]) {
      if (typeof statement === "object" && statement !== null) {
        const { types: _types, rowMode: _rowMode, ...compatibleStatement } = statement as Record<string, unknown>;
        const result = query.call(this, compatibleStatement, ...args);
        if (_rowMode === "array") {
          return Promise.resolve(result).then((response: { rows: Record<string, unknown>[] }) => ({
            ...response,
            rows: response.rows.map((row) => Object.values(row)),
          }));
        }
        return result;
      }
      return query.call(this, statement, ...args);
    };
  }
  console.warn("Using disposable local demo data. It is reset whenever the local server restarts.");
  return drizzle(new adapter.Pool());
}

function getDb() {
  const config = databaseConfig();
  const desiredMode = config ? "postgres" : "local-v3";
  if (globalForDb.__hagarPostgresqlDb && globalForDb.__hagarDbMode === desiredMode) return globalForDb.__hagarPostgresqlDb;
  if (!config) {
    const database = createLocalPreviewDatabase();
    globalForDb.__hagarPostgresqlDb = database;
    globalForDb.__hagarDbMode = "local-v3";
    return database;
  }
  const pool = globalForDb.__hagarPostgresqlPool ?? new Pool({ connectionString: config.databaseUrl, max: 5, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 10_000, application_name: `hagar-booking-${config.expected}` });
  const database = drizzle(pool);
  globalForDb.__hagarPostgresqlPool = pool;
  globalForDb.__hagarPostgresqlDb = database;
  globalForDb.__hagarDbMode = "postgres";
  return database;
}

// Lazy initialization keeps builds safe before deployment variables are injected.
export const db = new Proxy({} as Database, {
  get(_target, property) {
    const database = getDb();
    const value = Reflect.get(database, property, database);
    return typeof value === "function" ? value.bind(database) : value;
  },
});
