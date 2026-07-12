import { promises as fs } from "fs";
import path from "path";
import type { CustomerRow, ToolOrder } from "./tools-store";

// Dev-only fallback store used when DATABASE_URL is not configured (local
// development). Persists customers and orders to JSON files so the full
// sign-up → pay → download flow works without a Postgres instance. Never used
// in production — see tools-store.ts, which only routes here when
// NODE_ENV !== "production".

const DATA_DIR = path.join(process.cwd(), ".dev-data");
const CUSTOMERS_FILE = path.join(DATA_DIR, "tool-customers.json");
const ORDERS_FILE = path.join(DATA_DIR, "tool-orders.json");
const SETTINGS_FILE = path.join(DATA_DIR, "tool-settings.json");

declare global {
  var __toolsFileStoreLock: Promise<unknown> | undefined;
}

async function readJson<T>(file: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

async function writeJson<T>(file: string, rows: T[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(rows, null, 2), "utf8");
  await fs.rename(tmp, file);
}

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = Promise.resolve(global.__toolsFileStoreLock).then(fn, fn);
  global.__toolsFileStoreLock = run.catch(() => undefined);
  return run;
}

export const toolsFileStore = {
  async registerCustomer(email: string, password: string): Promise<CustomerRow | null> {
    return withLock(async () => {
      const rows = await readJson<CustomerRow>(CUSTOMERS_FILE);
      if (rows.some((r) => r.email === email)) return null;
      const id = rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
      const customer: CustomerRow = { id, email, password, createdAt: new Date().toISOString() };
      rows.push(customer);
      await writeJson(CUSTOMERS_FILE, rows);
      return customer;
    });
  },

  async authenticateCustomer(email: string, password: string): Promise<CustomerRow | null> {
    const rows = await readJson<CustomerRow>(CUSTOMERS_FILE);
    const row = rows.find((r) => r.email === email);
    if (!row || row.password !== password) return null;
    return row;
  },

  async getCustomerById(id: number): Promise<CustomerRow | null> {
    const rows = await readJson<CustomerRow>(CUSTOMERS_FILE);
    return rows.find((r) => r.id === id) ?? null;
  },

  async createOrder(order: Omit<ToolOrder, "id">): Promise<ToolOrder> {
    return withLock(async () => {
      const rows = await readJson<ToolOrder>(ORDERS_FILE);
      const id = rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
      const created: ToolOrder = { ...order, id };
      rows.push(created);
      await writeJson(ORDERS_FILE, rows);
      return created;
    });
  },

  async getOrderById(id: number): Promise<ToolOrder | null> {
    const rows = await readJson<ToolOrder>(ORDERS_FILE);
    return rows.find((r) => r.id === id) ?? null;
  },

  async getOrderByToken(token: string): Promise<ToolOrder | null> {
    const rows = await readJson<ToolOrder>(ORDERS_FILE);
    return rows.find((r) => r.downloadToken === token) ?? null;
  },

  async updateOrder(id: number, patch: Partial<ToolOrder>): Promise<ToolOrder | null> {
    return withLock(async () => {
      const rows = await readJson<ToolOrder>(ORDERS_FILE);
      const row = rows.find((r) => r.id === id);
      if (!row) return null;
      Object.assign(row, patch);
      await writeJson(ORDERS_FILE, rows);
      return row;
    });
  },

  async listOrders(): Promise<ToolOrder[]> {
    const rows = await readJson<ToolOrder>(ORDERS_FILE);
    return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  async listOrdersByCustomer(customerId: number): Promise<ToolOrder[]> {
    const rows = await readJson<ToolOrder>(ORDERS_FILE);
    return rows.filter((r) => r.customerId === customerId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  async getSetting(key: string, fallback: string): Promise<string> {
    try {
      const raw = await fs.readFile(SETTINGS_FILE, "utf8");
      const parsed = JSON.parse(raw) as Record<string, string>;
      return typeof parsed[key] === "string" ? parsed[key] : fallback;
    } catch {
      return fallback;
    }
  },

  async setSetting(key: string, value: string): Promise<void> {
    await withLock(async () => {
      let parsed: Record<string, string> = {};
      try {
        parsed = JSON.parse(await fs.readFile(SETTINGS_FILE, "utf8")) as Record<string, string>;
      } catch {
        parsed = {};
      }
      parsed[key] = value;
      await fs.mkdir(DATA_DIR, { recursive: true });
      const tmp = `${SETTINGS_FILE}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(parsed, null, 2), "utf8");
      await fs.rename(tmp, SETTINGS_FILE);
    });
  },
};
