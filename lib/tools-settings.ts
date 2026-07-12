import { getPool } from "./db";
import { ensureToolsSchema } from "./tools-store";
import { toolsFileStore } from "./tools-file-store";

// Store-wide settings for the /tools shop. Currently just the auto-approve flag:
//   auto_approve = true  → paying customer instantly gets the download link
//   auto_approve = false → order stays pending until an admin approves it,
//                          then the link is emailed on approval (storypro-style)
// Backed by Postgres in production, a JSON file in local dev.

const AUTO_APPROVE_KEY = "auto_approve";
const AUTO_APPROVE_DEFAULT = true;

function useDb(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function getAutoApprove(): Promise<boolean> {
  await ensureToolsSchema();
  if (!useDb()) {
    const v = await toolsFileStore.getSetting(AUTO_APPROVE_KEY, String(AUTO_APPROVE_DEFAULT));
    return v === "true";
  }
  const res = await getPool().query(`SELECT value FROM tool_settings WHERE key = $1`, [AUTO_APPROVE_KEY]);
  if (res.rows.length === 0) return AUTO_APPROVE_DEFAULT;
  return res.rows[0].value === "true";
}

export async function setAutoApprove(value: boolean): Promise<void> {
  await ensureToolsSchema();
  if (!useDb()) {
    await toolsFileStore.setSetting(AUTO_APPROVE_KEY, String(value));
    return;
  }
  await getPool().query(
    `INSERT INTO tool_settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [AUTO_APPROVE_KEY, String(value)]
  );
}
