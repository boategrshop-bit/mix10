// Product catalog + store copy for the /tools digital store.
// Everything a non-developer needs to change lives in this file: store name,
// payment details, and the list of tools for sale. Edit here to update the site.

export interface ToolProduct {
  id: string;
  name: string;
  tagline: string;
  description: string;
  priceThb: number;
  // Optional highlight ribbon on the card, e.g. "แนะนำ" or "คุ้มสุด".
  badge?: string;
  // The actual downloadable asset. Either a path to a file in /public
  // (e.g. "/my-tool.zip") or an external URL (e.g. a Google Drive share link).
  // Customers never see this directly — it is served behind a one-time token.
  downloadUrl: string;
  // Short human label for what they get, shown on the product + email.
  fileLabel: string;
  features: string[];
  // Optional LINE group invite link included in the confirmation email for
  // packages that come with community access. Leave unset for none.
  lineGroupUrl?: string;
}

export const STORE_NAME = "Toolkit";
export const STORE_TAGLINE = "เครื่องมือ AI ทุ่นแรง — ซื้อครั้งเดียว ดาวน์โหลดได้เลย";
export const STORE_DESCRIPTION =
  "รวมเครื่องมือและไฟล์สำเร็จรูปที่ช่วยให้งานของคุณเร็วขึ้น จ่ายเงินแล้วรับลิงก์ดาวน์โหลดทางอีเมลทันที";

// Payment / bank-transfer details shown on the checkout step.
// The QR image lives at public/payment-qr.jpg — replace that file to update the QR.
export const PAYMENT = {
  qrSrc: "/payment-qr.jpg",
  bank: "ธนาคารกสิกรไทย (KBank)",
  accountName: "พงศ์ปณต โกมลกนก",
  accountNo: "5732303024",
};

// ⚠️ แก้ชื่อโปรแกรม (PROGRAM_NAME) และไฟล์ดาวน์โหลด (downloadUrl) ให้เป็นของจริง
const PROGRAM_NAME = "Minimal Tools";
// ลิงก์เข้าใช้งานโปรแกรมจริง (Google Flow shared tool) หรือไฟล์ใน /public ก็ได้
const PROGRAM_FILE =
  "https://labs.google/fx/tools/flow/shared/tool/91efa968-656b-44ca-9073-db3e3f1dace5";
// ลิงก์เชิญเข้าไลน์กลุ่ม สำหรับแพ็กเกจโปร — จะถูกแนบไปในอีเมลยืนยันหลังชำระเงิน
const LINE_GROUP_URL =
  "https://line.me/ti/g2/axAKlAUpnDFhbFgZ5Kn14U4B7NU4Zx39VXA07Q?utm_source=invitation&utm_medium=link_copy&utm_campaign=default";

export const TOOLS: ToolProduct[] = [
  {
    id: "standard",
    name: `${PROGRAM_NAME} — แพ็กเกจมาตรฐาน`,
    tagline: "ได้โปรแกรมตัวเต็ม จ่ายครั้งเดียว ใช้ได้เลย",
    description:
      "รับโปรแกรมตัวเต็ม พร้อมใช้งานทันทีหลังชำระเงิน จ่ายครั้งเดียวเป็นเจ้าของถาวร เหมาะสำหรับคนที่อยากได้โปรแกรมไปใช้เลย",
    priceThb: 349,
    downloadUrl: PROGRAM_FILE,
    fileLabel: "ลิงก์เข้าใช้งานโปรแกรม (Google Flow) · เข้าได้ทันที",
    features: [
      "โปรแกรมตัวเต็ม ใช้ได้ทุกฟีเจอร์",
      "จ่ายครั้งเดียว เป็นเจ้าของถาวร",
      "รับลิงก์ดาวน์โหลดทางอีเมลทันที",
    ],
  },
  {
    id: "pro",
    name: `${PROGRAM_NAME} + ไลน์กลุ่ม — แพ็กเกจโปร`,
    tagline: "โปรแกรม + ไลน์กลุ่ม + อัพเดตฟรีตลอด",
    description:
      "ได้ทุกอย่างในแพ็กเกจมาตรฐาน บวกเข้าไลน์กลุ่มสำหรับถามตอบและอัพเดตความรู้ พร้อมอัพเดตเวอร์ชันใหม่ฟรีตลอด ดาวน์โหลดซ้ำได้เมื่อมีเวอร์ชันใหม่",
    priceThb: 599,
    badge: "แนะนำ",
    downloadUrl: PROGRAM_FILE,
    lineGroupUrl: LINE_GROUP_URL,
    fileLabel: "ลิงก์เข้าใช้งานโปรแกรม + ลิงก์ไลน์กลุ่ม (ส่งทางอีเมล)",
    features: [
      "ได้ทุกอย่างในแพ็กเกจมาตรฐาน",
      "เข้าไลน์กลุ่ม ถามตอบ + อัพเดตความรู้",
      "อัพเดตฟรีทุกเวอร์ชันใหม่ ตลอดชีพ",
      "ดาวน์โหลดซ้ำได้เมื่อมีเวอร์ชันใหม่",
    ],
  },
];

export function getToolById(id: string): ToolProduct | undefined {
  return TOOLS.find((t) => t.id === id);
}

export function minPrice(): number {
  return TOOLS.reduce((min, t) => Math.min(min, t.priceThb), Infinity);
}

// ── Landing-page content (edit freely) ─────────────────────────────────────

export interface Step {
  icon: string;
  title: string;
  description: string;
}

export const STEPS: Step[] = [
  { icon: "🛍️", title: "เลือกเครื่องมือ", description: "เลือกเครื่องมือที่ต้องการ ดูรายละเอียดและราคาได้ทันที" },
  { icon: "💳", title: "ชำระเงิน", description: "โอนเงินหรือสแกน QR แล้วกดยืนยัน ใช้เวลาไม่ถึงนาที" },
  { icon: "📩", title: "รับลิงก์ทางอีเมล", description: "ระบบส่งลิงก์ดาวน์โหลดเข้าอีเมลทันที ดาวน์โหลดได้เลย" },
];

export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export const FEATURES: Feature[] = [
  { icon: "⚡", title: "ดาวน์โหลดทันที", description: "จ่ายเงินเสร็จรับลิงก์ในอีเมลทันที ไม่ต้องรอแอดมิน" },
  { icon: "💛", title: "จ่ายครั้งเดียว", description: "ซื้อขาด ไม่มีค่ารายเดือน เป็นเจ้าของถาวร" },
  { icon: "🔄", title: "อัพเดตฟรีตลอด", description: "มีเวอร์ชันใหม่เมื่อไหร่ ดาวน์โหลดซ้ำได้ฟรีในบัญชี" },
  { icon: "🇹🇭", title: "รองรับภาษาไทย", description: "เครื่องมือและคำแนะนำเป็นภาษาไทย ใช้งานง่าย" },
  { icon: "🧾", title: "มีใบยืนยันทุกออเดอร์", description: "ทุกการสั่งซื้อมีอีเมลยืนยันและประวัติในบัญชีของคุณ" },
  { icon: "💬", title: "ซัพพอร์ตจริง", description: "มีปัญหาทักได้ ตอบไว ไม่ทิ้งลูกค้า" },
];

export interface Review {
  initial: string;
  name: string;
  role: string;
  text: string;
}

export const REVIEWS: Review[] = [
  {
    initial: "น",
    name: "นุ่น วรรณิษา",
    role: "ขายครีมออนไลน์ • TikTok",
    text: "จ่ายเงินปุ๊บได้ลิงก์ในเมลปั๊บ ดาวน์โหลดใช้ได้เลย ไม่ต้องรอนาน ประทับใจมากค่ะ",
  },
  {
    initial: "ก",
    name: "กอล์ฟ ธนพล",
    role: "ร้านเสื้อผ้า • Shopee",
    text: "หน้าเว็บสะอาดตา หาเครื่องมือง่าย ราคาชัดเจน ซื้อครั้งเดียวใช้ได้ตลอด คุ้มมากครับ",
  },
  {
    initial: "ม",
    name: "มิ้นท์ พัชรินทร์",
    role: "ขายของใน TikTok Shop",
    text: "ตอนแรกกลัวจ่ายแล้วเงียบ แต่มีอีเมลยืนยันมาให้ครบ ดูมืออาชีพ เชื่อใจได้เลย",
  },
  {
    initial: "อ",
    name: "อ้อม สุภาพร",
    role: "แม่บ้านขายของออนไลน์",
    text: "ไม่เก่งเทคโนโลยีเลย แต่ขั้นตอนซื้อง่ายมาก แค่ 3 ขั้นตอนก็ได้ไฟล์แล้ว",
  },
  {
    initial: "ต",
    name: "ต้น ณัฐพล",
    role: "คอนเทนต์ครีเอเตอร์",
    text: "เครื่องมือใช้ได้จริง อัพเดตเวอร์ชันใหม่ก็โหลดซ้ำในบัญชีได้ฟรี ไม่ต้องจ่ายเพิ่ม",
  },
  {
    initial: "ป",
    name: "ปุ้ม ปิยะนุช",
    role: "เจ้าของร้านขนมออนไลน์",
    text: "ถามอะไรไปตอบไวมาก ดูแลดีจริง รู้สึกว่าซื้อแล้วไม่ถูกทิ้ง แนะนำเลยค่ะ",
  },
];

export interface Faq {
  q: string;
  a: string;
}

export const FAQS: Faq[] = [
  { q: "จ่ายเงินแล้วได้ของยังไง?", a: "หลังยืนยันการชำระเงิน ระบบจะส่งลิงก์ดาวน์โหลดไปที่อีเมลของคุณทันที และดูได้ในหน้าบัญชีของฉันด้วย" },
  { q: "จ่ายครั้งเดียวใช่ไหม?", a: "ใช่ครับ ซื้อครั้งเดียวเป็นเจ้าของถาวร ไม่มีค่ารายเดือน และดาวน์โหลดซ้ำได้เมื่อมีอัพเดต" },
  { q: "ถ้าไม่ได้รับอีเมลต้องทำยังไง?", a: "ลองตรวจในกล่องสแปมก่อน หากยังไม่พบ เข้าไปที่หน้าบัญชีของฉันเพื่อดาวน์โหลด หรือติดต่อแอดมินได้เลย" },
  { q: "ชำระเงินยังไงได้บ้าง?", a: "โอนเงินเข้าบัญชีธนาคารหรือสแกน QR พร้อมเพย์ตามที่แสดงในหน้าชำระเงิน แล้วกดยืนยัน" },
  { q: "ซื้อได้กี่ครั้ง?", a: "ซื้อได้ไม่จำกัด ทุกออเดอร์จะเก็บไว้ในบัญชีของคุณ ดาวน์โหลดย้อนหลังได้ตลอด" },
];

// ── วิดีโอ: คลิปสาธิต + คลิปตัวอย่างผลงาน ───────────────────────────────────
// แต่ละคลิปใส่ได้ 2 แบบ:
//   1) ลิงก์ YouTube เช่น "https://youtu.be/xxxx" หรือ "https://www.youtube.com/watch?v=xxxx"
//   2) ไฟล์วิดีโอใน /public เช่น "/demo.mp4"
export interface VideoItem {
  src: string;
  title: string;
  caption?: string;
}

// คลิปสาธิตการใช้งาน (คลิปเดียว) — ตั้ง src เป็น "" เพื่อซ่อน section นี้
export const DEMO_VIDEO: VideoItem = {
  src: "/demo.mp4",
  title: "ดูวิธีใช้งานแบบเห็นภาพ",
  caption: "สาธิตตั้งแต่เริ่มจนได้งาน ภายในไม่กี่นาที",
};

// คลิปตัวอย่างผลงาน — เพิ่ม/ลบได้ตามต้องการ (ปล่อยเป็น [] เพื่อซ่อน section นี้)
export const SHOWCASE_VIDEOS: VideoItem[] = [
  { src: "/work-1.mp4", title: "ตัวอย่างผลงาน #1" },
  { src: "/work-2.mp4", title: "ตัวอย่างผลงาน #2" },
  { src: "/work-3.mp4", title: "ตัวอย่างผลงาน #3" },
  { src: "/work-4.mp4", title: "ตัวอย่างผลงาน #4" },
  { src: "/work-5.mp4", title: "ตัวอย่างผลงาน #5" },
];

// แปลงลิงก์ YouTube เป็น video id (คืน null ถ้าไม่ใช่ลิงก์ YouTube — จะถือเป็นไฟล์วิดีโอ)
export function youTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
}
