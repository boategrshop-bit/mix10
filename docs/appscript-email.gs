/**
 * Minimal Tools — email sender (Google Apps Script)
 * ส่งอีเมลผ่าน Gmail ของบัญชีที่ deploy สคริปต์นี้ (เช่น boategrshop@gmail.com)
 *
 * วิธีติดตั้ง:
 *   1) เปิด https://script.google.com  →  New project
 *   2) ลบโค้ดเดิม แล้ววางโค้ดในไฟล์นี้
 *   3) Deploy → New deployment → type = Web app
 *        - Execute as: Me
 *        - Who has access: Anyone
 *   4) ก็อป URL ที่ลงท้ายด้วย /exec  →  ใส่ APPSCRIPT_EMAIL_URL ในเว็บ
 *   5) ครั้งแรกจะมีหน้าขออนุญาตเข้าถึง Gmail — กด Allow
 *
 *   แก้โค้ดภายหลัง: Deploy → Manage deployments → ✏️ (แก้ไข) → Version: New version → Deploy
 *   (วิธีนี้ URL /exec จะ"คงเดิม" ไม่เปลี่ยน)
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (!data.to || !data.subject) {
      return json({ ok: false, error: "missing to/subject" });
    }
    MailApp.sendEmail({
      to: data.to,
      subject: data.subject,
      htmlBody: data.html || "",
      name: data.fromName || "Minimal Tools",
    });
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// (ทางเลือก) ใช้ครั้งเดียวเพื่อกดอนุญาตสิทธิ์ Gmail — แก้อีเมลปลายทางก่อนรัน
function testSend() {
  MailApp.sendEmail({
    to: "your-email@example.com",
    subject: "ทดสอบจาก Minimal Tools",
    htmlBody: "<b>ส่งได้แล้ว 🎉</b>",
    name: "Minimal Tools",
  });
}
