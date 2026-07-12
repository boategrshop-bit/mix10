"use client";

export default function LogoutButton() {
  async function handleLogout() {
    await fetch("/api/tools/logout", { method: "POST" });
    window.location.href = "/tools";
  }
  return (
    <button
      onClick={handleLogout}
      className="rounded-full border border-[#DED6C6] px-4 py-1.5 text-sm font-medium text-[#6B6252] transition hover:border-[#1C1A17] hover:text-[#1C1A17]"
    >
      ออกจากระบบ
    </button>
  );
}
