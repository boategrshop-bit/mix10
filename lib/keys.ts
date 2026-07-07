import { randomBytes } from "crypto";
import { ensureSchema, getPool } from "./db";

export const LICENSE_KEY_COOKIE_NAME = "mix10_license_key";

export interface LicenseKeyRow {
  id: number;
  code: string;
  durationDays: number;
  createdAt: string;
  activatedAt: string | null;
  expiresAt: string | null;
  revoked: boolean;
}

// Excludes visually ambiguous characters (0/O, 1/I/L).
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function randomSegment(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

function generateKeyCode(): string {
  return `MIX10-${randomSegment(4)}-${randomSegment(4)}`;
}

function mapRow(row: {
  id: number;
  code: string;
  duration_days: number;
  created_at: Date;
  activated_at: Date | null;
  expires_at: Date | null;
  revoked: boolean;
}): LicenseKeyRow {
  return {
    id: row.id,
    code: row.code,
    durationDays: row.duration_days,
    createdAt: row.created_at.toISOString(),
    activatedAt: row.activated_at ? row.activated_at.toISOString() : null,
    expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
    revoked: row.revoked,
  };
}

export async function createLicenseKey(durationDays: number): Promise<LicenseKeyRow> {
  await ensureSchema();
  const code = generateKeyCode();
  const result = await getPool().query(
    `INSERT INTO license_keys (code, duration_days) VALUES ($1, $2) RETURNING *`,
    [code, durationDays]
  );
  return mapRow(result.rows[0]);
}

export async function listLicenseKeys(): Promise<LicenseKeyRow[]> {
  await ensureSchema();
  const result = await getPool().query(`SELECT * FROM license_keys ORDER BY created_at DESC`);
  return result.rows.map(mapRow);
}

export async function revokeLicenseKey(id: number): Promise<void> {
  await ensureSchema();
  await getPool().query(`UPDATE license_keys SET revoked = true WHERE id = $1`, [id]);
}

export interface RedeemResult {
  ok: boolean;
  reason?: string;
  code?: string;
  expiresAt?: string;
}

export async function redeemLicenseKey(rawCode: string): Promise<RedeemResult> {
  await ensureSchema();
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, reason: "กรุณากรอกคีย์" };

  const result = await getPool().query(`SELECT * FROM license_keys WHERE code = $1`, [code]);
  const row = result.rows[0];
  if (!row) return { ok: false, reason: "คีย์ไม่ถูกต้อง" };
  if (row.revoked) return { ok: false, reason: "คีย์นี้ถูกระงับการใช้งาน" };

  if (!row.activated_at) {
    const activated = await getPool().query(
      `UPDATE license_keys
       SET activated_at = now(), expires_at = now() + make_interval(days => $1)
       WHERE id = $2 AND activated_at IS NULL
       RETURNING *`,
      [row.duration_days, row.id]
    );
    // Someone else activated it in a race between our SELECT and UPDATE - re-read and fall through.
    const finalRow = activated.rows[0] ?? (await getPool().query(`SELECT * FROM license_keys WHERE id = $1`, [row.id])).rows[0];
    return { ok: true, code: finalRow.code, expiresAt: mapRow(finalRow).expiresAt ?? undefined };
  }

  const expiresAt: Date = row.expires_at;
  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    return { ok: false, reason: "คีย์หมดอายุแล้ว" };
  }
  return { ok: true, code: row.code, expiresAt: expiresAt ? expiresAt.toISOString() : undefined };
}

export const TRIAL_DURATION_DAYS = 3;

// One free trial per IP: atomically claims the IP via ON CONFLICT DO NOTHING so
// concurrent requests from the same IP can't race their way into two trials.
export async function claimTrial(ip: string): Promise<RedeemResult> {
  await ensureSchema();
  const normalizedIp = ip.trim() || "unknown";

  const claim = await getPool().query(
    `INSERT INTO trial_claims (ip) VALUES ($1) ON CONFLICT (ip) DO NOTHING RETURNING ip`,
    [normalizedIp]
  );
  if (claim.rowCount === 0) {
    return { ok: false, reason: "คุณใช้สิทธิ์ทดลองฟรีไปแล้ว กรุณาติดต่อแอดมินเพื่อขอคีย์เพิ่มเติม" };
  }

  const code = generateKeyCode();
  const result = await getPool().query(
    `INSERT INTO license_keys (code, duration_days, activated_at, expires_at)
     VALUES ($1, $2, now(), now() + make_interval(days => $2))
     RETURNING *`,
    [code, TRIAL_DURATION_DAYS]
  );
  const row = mapRow(result.rows[0]);
  return { ok: true, code: row.code, expiresAt: row.expiresAt ?? undefined };
}

export async function checkKeyValid(rawCode: string): Promise<boolean> {
  await ensureSchema();
  const code = rawCode.trim().toUpperCase();
  if (!code) return false;
  const result = await getPool().query(`SELECT revoked, activated_at, expires_at FROM license_keys WHERE code = $1`, [code]);
  const row = result.rows[0];
  if (!row) return false;
  if (row.revoked) return false;
  if (!row.activated_at) return false;
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return false;
  return true;
}
