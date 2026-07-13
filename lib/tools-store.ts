import { randomBytes } from "crypto";
import { getPool } from "./db";
import { toolsFileStore } from "./tools-file-store";
import type { ToolProduct } from "./tools-content";

declare global {
  var __toolsSchemaReady: Promise<void> | undefined;
}

export interface CustomerRow {
  id: number;
  email: string;
  password: string;
  createdAt: string;
}

export type OrderStatus = "pending" | "paid";

export interface ToolOrder {
  id: number;
  customerId: number;
  customerEmail: string;
  productId: string;
  productName: string;
  amountThb: number;
  status: OrderStatus;
  downloadToken: string;
  createdAt: string;
  paidAt: string | null;
  emailSentAt: string | null;
  // Payment slip photo the customer uploads at checkout, stored as a data URL
  // (data:image/jpeg;base64,...). Kept as proof for the admin to review.
  slipDataUrl: string | null;
}

// Storage backend: Postgres when DATABASE_URL is set (production), otherwise a
// local JSON file store for development. Mirrors lib/students.ts.
function useDb(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

async function initSchema(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS tool_customers (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS tool_orders (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL REFERENCES tool_customers(id),
      customer_email TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      amount_thb INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      download_token TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      paid_at TIMESTAMPTZ,
      email_sent_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS tool_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    ALTER TABLE tool_orders ADD COLUMN IF NOT EXISTS slip_data_url TEXT;
  `);
}

export function ensureToolsSchema(): Promise<void> {
  if (!useDb()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL is not set. Add a Postgres database and connect it to this service.");
    }
    return Promise.resolve();
  }
  if (!global.__toolsSchemaReady) {
    global.__toolsSchemaReady = initSchema();
  }
  return global.__toolsSchemaReady;
}

function mapCustomer(row: { id: number; email: string; password: string; created_at: Date }): CustomerRow {
  return { id: row.id, email: row.email, password: row.password, createdAt: row.created_at.toISOString() };
}

function mapOrder(row: {
  id: number;
  customer_id: number;
  customer_email: string;
  product_id: string;
  product_name: string;
  amount_thb: number;
  status: string;
  download_token: string;
  created_at: Date;
  paid_at: Date | null;
  email_sent_at: Date | null;
  slip_data_url: string | null;
}): ToolOrder {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerEmail: row.customer_email,
    productId: row.product_id,
    productName: row.product_name,
    amountThb: row.amount_thb,
    status: row.status as OrderStatus,
    downloadToken: row.download_token,
    createdAt: row.created_at.toISOString(),
    paidAt: row.paid_at ? row.paid_at.toISOString() : null,
    emailSentAt: row.email_sent_at ? row.email_sent_at.toISOString() : null,
    slipDataUrl: row.slip_data_url ?? null,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateDownloadToken(): string {
  return randomBytes(24).toString("base64url");
}

export interface RegisterResult {
  ok: boolean;
  reason?: string;
  customer?: CustomerRow;
}

export async function registerCustomer(rawEmail: string, password: string): Promise<RegisterResult> {
  await ensureToolsSchema();
  const email = normalizeEmail(rawEmail);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, reason: "อีเมลไม่ถูกต้อง" };
  if (password.length < 6) return { ok: false, reason: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" };

  if (!useDb()) {
    const customer = await toolsFileStore.registerCustomer(email, password);
    if (!customer) return { ok: false, reason: "อีเมลนี้เคยสมัครไว้แล้ว กรุณาเข้าสู่ระบบ" };
    return { ok: true, customer };
  }

  const result = await getPool().query(
    `INSERT INTO tool_customers (email, password) VALUES ($1, $2)
     ON CONFLICT (email) DO NOTHING RETURNING *`,
    [email, password]
  );
  if (result.rowCount === 0) return { ok: false, reason: "อีเมลนี้เคยสมัครไว้แล้ว กรุณาเข้าสู่ระบบ" };
  return { ok: true, customer: mapCustomer(result.rows[0]) };
}

export async function authenticateCustomer(rawEmail: string, password: string): Promise<CustomerRow | null> {
  await ensureToolsSchema();
  const email = normalizeEmail(rawEmail);
  if (!useDb()) return toolsFileStore.authenticateCustomer(email, password);

  const result = await getPool().query(`SELECT * FROM tool_customers WHERE email = $1`, [email]);
  const row = result.rows[0];
  if (!row || row.password !== password) return null;
  return mapCustomer(row);
}

export async function getCustomerById(id: number): Promise<CustomerRow | null> {
  await ensureToolsSchema();
  if (!useDb()) return toolsFileStore.getCustomerById(id);

  const result = await getPool().query(`SELECT * FROM tool_customers WHERE id = $1`, [id]);
  const row = result.rows[0];
  return row ? mapCustomer(row) : null;
}

// Creates a pending order for a product. The download token is generated up
// front but only becomes usable once the order is marked paid.
export async function createOrder(customer: CustomerRow, product: ToolProduct): Promise<ToolOrder> {
  await ensureToolsSchema();
  const token = generateDownloadToken();

  if (!useDb()) {
    return toolsFileStore.createOrder({
      customerId: customer.id,
      customerEmail: customer.email,
      productId: product.id,
      productName: product.name,
      amountThb: product.priceThb,
      status: "pending",
      downloadToken: token,
      createdAt: new Date().toISOString(),
      paidAt: null,
      emailSentAt: null,
      slipDataUrl: null,
    });
  }

  const result = await getPool().query(
    `INSERT INTO tool_orders (customer_id, customer_email, product_id, product_name, amount_thb, download_token)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [customer.id, customer.email, product.id, product.name, product.priceThb, token]
  );
  return mapOrder(result.rows[0]);
}

export async function getOrderById(id: number): Promise<ToolOrder | null> {
  await ensureToolsSchema();
  if (!useDb()) return toolsFileStore.getOrderById(id);
  const result = await getPool().query(`SELECT * FROM tool_orders WHERE id = $1`, [id]);
  const row = result.rows[0];
  return row ? mapOrder(row) : null;
}

export async function getOrderByToken(token: string): Promise<ToolOrder | null> {
  await ensureToolsSchema();
  if (!useDb()) return toolsFileStore.getOrderByToken(token);
  const result = await getPool().query(`SELECT * FROM tool_orders WHERE download_token = $1`, [token]);
  const row = result.rows[0];
  return row ? mapOrder(row) : null;
}

export async function markOrderPaid(id: number): Promise<ToolOrder | null> {
  await ensureToolsSchema();
  if (!useDb()) {
    const existing = await toolsFileStore.getOrderById(id);
    if (existing && existing.status !== "paid") {
      return toolsFileStore.updateOrder(id, { status: "paid", paidAt: new Date().toISOString() });
    }
    return existing;
  }
  const result = await getPool().query(
    `UPDATE tool_orders SET status = 'paid', paid_at = COALESCE(paid_at, now()) WHERE id = $1 RETURNING *`,
    [id]
  );
  const row = result.rows[0];
  return row ? mapOrder(row) : null;
}

// Saves the payment-slip photo the customer uploaded at checkout, as proof
// for the admin to review — independent of auto-approve status.
export async function attachPaymentSlip(id: number, dataUrl: string): Promise<ToolOrder | null> {
  await ensureToolsSchema();
  if (!useDb()) {
    return toolsFileStore.updateOrder(id, { slipDataUrl: dataUrl });
  }
  const result = await getPool().query(
    `UPDATE tool_orders SET slip_data_url = $1 WHERE id = $2 RETURNING *`,
    [dataUrl, id]
  );
  const row = result.rows[0];
  return row ? mapOrder(row) : null;
}

export async function markOrderEmailSent(id: number): Promise<void> {
  await ensureToolsSchema();
  if (!useDb()) {
    await toolsFileStore.updateOrder(id, { emailSentAt: new Date().toISOString() });
    return;
  }
  await getPool().query(`UPDATE tool_orders SET email_sent_at = now() WHERE id = $1`, [id]);
}

export async function listOrders(): Promise<ToolOrder[]> {
  await ensureToolsSchema();
  if (!useDb()) return toolsFileStore.listOrders();
  const result = await getPool().query(`SELECT * FROM tool_orders ORDER BY created_at DESC`);
  return result.rows.map(mapOrder);
}

export async function listOrdersByCustomer(customerId: number): Promise<ToolOrder[]> {
  await ensureToolsSchema();
  if (!useDb()) return toolsFileStore.listOrdersByCustomer(customerId);
  const result = await getPool().query(
    `SELECT * FROM tool_orders WHERE customer_id = $1 ORDER BY created_at DESC`,
    [customerId]
  );
  return result.rows.map(mapOrder);
}
