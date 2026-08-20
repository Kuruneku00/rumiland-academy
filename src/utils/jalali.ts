/**
 * ابزارهای تاریخ شمسی (جلالی) — خودکفا، بدون وابستگی خارجی.
 * برای محاسبه‌ی صحیح موعد هزینه‌های ماهانه و نمایش تاریخ شمسی کامل.
 */

export interface JalaliDate {
  jy: number; // سال شمسی
  jm: number; // ماه شمسی (1-12)
  jd: number; // روز شمسی (1-31)
}

function mod(a: number, b: number): number {
  return ((a % b) + b) % b;
}

/** سال کبیسه‌ی شمسی؟ (الگوریتم استاندارد ۳۳ ساله) */
export function isJalaliLeap(jy: number): boolean {
  return mod(jy * 31 + 266, 128) < 31;
}

/** تعداد روزهای هر ماه شمسی */
export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeap(jy) ? 30 : 29;
}

/** تبدیل تاریخ شمسی به میلادی (به‌صورت Date) */
export function jalaliToGregorian(jy: number, jm: number, jd: number): Date {
  const gDayToMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const jy1 = jy - 979;
  const jm1 = jm - 1;
  const jd1 = jd - 1;
  let jDayNo = 365 * jy1 + Math.floor(jy1 / 33) * 8 + Math.floor(((jy1 % 33) + 3) / 4) + jd1;
  if (jm1 < 7) jDayNo += jm1 * 31;
  else jDayNo += 186 + (jm1 - 6) * 30;

  const gDayNo = jDayNo + 79;
  let gy = 1600 + 400 * Math.floor(gDayNo / 146097);
  let gDayNo2 = gDayNo % 146097;
  let leap = true;
  if (gDayNo2 >= 36525) {
    gDayNo2--;
    gy += 100 * Math.floor(gDayNo2 / 36524);
    gDayNo2 = gDayNo2 % 36524;
    if (gDayNo2 >= 365) gDayNo2++;
    else leap = false;
  }
  gy += 4 * Math.floor(gDayNo2 / 1461);
  gDayNo2 = gDayNo2 % 1461;
  if (gDayNo2 >= 366) {
    leap = false;
    gDayNo2--;
    gy += Math.floor(gDayNo2 / 365);
    gDayNo2 = gDayNo2 % 365;
  }

  let gm = 0, gd = 0;
  for (let i = 0; i < 12; i++) {
    const dim = gDayToMonth[i] + (i === 1 && leap ? 1 : 0);
    if (gDayNo2 >= dim) { gm = i; gd = gDayNo2 - dim; }
  }
  return new Date(gy, gm, gd + 1);
}

/** تبدیل تاریخ میلادی به شمسی */
export function gregorianToJalali(date: Date): JalaliDate {
  const gy = date.getFullYear();
  const gm = date.getMonth() + 1;
  const gd = date.getDate();

  const gDayNo =
    365 * (gy - 1600) +
    Math.floor((gy - 1600 + 3) / 4) -
    Math.floor((gy - 1600 + 99) / 100) +
    Math.floor((gy - 1600 + 399) / 400);
  const gd1 = (() => {
    const m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let r = m[gm - 1] + gd;
    if (gm > 2 && isGregorianLeap(gy)) r += 1;
    return r - 1;
  })();
  const jDayNo = gDayNo + gd1 - 79;

  const jNp = Math.floor(jDayNo / 12053);
  const jDayNo2 = jDayNo % 12053;
  const jy1 = 979 + 33 * jNp + 4 * Math.floor(jDayNo2 / 1461);
  const jDayNo3 = jDayNo2 % 1461;

  let jy = jy1;
  if (jDayNo3 >= 366) {
    jy += Math.floor((jDayNo3 - 1) / 365);
  }

  const jDayNo4 = jDayNo3 >= 366 ? (jDayNo3 - 1) % 365 : jDayNo3;
  let jm = 0, jd = 0;
  if (jDayNo4 < 186) {
    jm = 1 + Math.floor(jDayNo4 / 31);
    jd = (jDayNo4 % 31) + 1;
  } else {
    jm = 7 + Math.floor((jDayNo4 - 186) / 30);
    jd = ((jDayNo4 - 186) % 30) + 1;
  }

  return { jy, jm, jd };
}

function isGregorianLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** نام فارسی ماه شمسی */
export function jalaliMonthName(jm: number): string {
  const names = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
  ];
  return names[jm - 1] || '';
}

/** قالب‌بندی عدد به فارسی */
export function toFa(n: number | string): string {
  return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

export interface NextDueInfo {
  days_until_due: number;
  due_label: string;
  is_today: boolean;
}

/**
 * مقایسه‌ی دو ماه شمسی به صورت «year*12 + month». مقدار بزرگ‌تر یعنی دیرتر.
 */
function jMonthIndex(jy: number, jm: number): number {
  return jy * 12 + jm;
}

/**
 * تبدیل رشته‌ی «paid_through» (مثل «1405-05») به { jy, jm } یا null.
 */
export function parsePaidThroughMonth(value?: string | null): { jy: number; jm: number } | null {
  if (!value) return null;
  const s = String(value).trim();
  const m = s.match(/^(\d+)[-\/](\d+)$/);
  if (!m) return null;
  const jy = parseInt(m[1], 10);
  const jm = parseInt(m[2], 10);
  if (!Number.isFinite(jy) || !Number.isFinite(jm)) return null;
  if (jm < 1 || jm > 12) return null;
  if (jy < 100) return { jy: jy + 1400, jm };
  return { jy, jm };
}

/** رشته‌ی «paid_through» از روی تاریخ شمسی جاری (سال-ماه). */
export function currentMonthKey(now: Date = new Date()): string {
  const j = gregorianToJalali(now);
  return `${j.jy}-${String(j.jm).padStart(2, '0')}`;
}

/**
 * تبدیل «paid_through» (مثل «1405-05») به برچسب فارسی مانند «مرداد ۱۴۰۵».
 */
export function paidThroughLabel(value?: string | null): string {
  const p = parsePaidThroughMonth(value);
  if (!p) return '';
  return `${jalaliMonthName(p.jm)} ${toFa(p.jy)}`;
}

/**
 * محاسبه‌ی موعد بعدی بر اساس «روز ماه» در تقویم شمسی.
 * اگر paid_through داده شده باشد (یعنی هزینه تا آن ماه پرداخت شده)،
 * موعد بعدی از ماهِ بعد از آن محاسبه می‌شود تا یادآوریِ ماهِ پرداخت‌شده تکرار نشود.
 */
export function nextDueInfo(
  dayOfMonth: number,
  now: Date = new Date(),
  paidThrough?: string | null
): NextDueInfo {
  const today = gregorianToJalali(now);
  const dueDay = Math.min(Math.max(1, Math.round(dayOfMonth)), 31);

  // کمترین ماهی که باید موعد برایش محاسبه شود.
  let baseJ = { ...today };
  const paid = parsePaidThroughMonth(paidThrough);
  if (paid && jMonthIndex(paid.jy, paid.jm) >= jMonthIndex(today.jy, today.jm)) {
    // هزینه تا «paid» پرداخت شده، پس قسط بعدی از ماهِ بعد از paid است.
    baseJ = { jy: paid.jy, jm: paid.jm, jd: 1 };
    // اگر ماه پایه دقیقاً ماه جاری نبود یا روز موعدِ این ماه گذشته، جلو برو.
    if (paid.jy === today.jy && paid.jm === today.jm) {
      // از روزِ بعدِ این ماه شروع کن
      baseJ.jm += 1;
      if (baseJ.jm > 12) { baseJ.jm = 1; baseJ.jy += 1; }
    }
  }

  const monthLen = jalaliMonthLength(baseJ.jy, baseJ.jm);
  const clampedDay = Math.min(dueDay, monthLen);

  let targetJ = { ...baseJ };
  if (clampedDay >= baseJ.jd) {
    targetJ.jd = clampedDay;
  } else {
    targetJ.jm += 1;
    if (targetJ.jm > 12) { targetJ.jm = 1; targetJ.jy += 1; }
    targetJ.jd = Math.min(dueDay, jalaliMonthLength(targetJ.jy, targetJ.jm));
  }

  const targetG = jalaliToGregorian(targetJ.jy, targetJ.jm, targetJ.jd);
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetMidnight = new Date(targetG.getFullYear(), targetG.getMonth(), targetG.getDate());
  const diffDays = Math.round((targetMidnight.getTime() - todayMidnight.getTime()) / 86400000);

  return {
    days_until_due: Math.max(0, diffDays),
    is_today: diffDays === 0,
    due_label: `${toFa(targetJ.jd)} ${jalaliMonthName(targetJ.jm)} ${toFa(targetJ.jy)}`,
  };
}


/** تبدیل ارقام فارسی/عربی به لاتین */
export function faToEnDigit(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

/**
 * تجزیه‌ی ورودی تاریخ شمسی کاربر (مانند «۱۴۰۵/۰۵/۲۹»، «1405/05/29»، «1405-5-29»).
 * خروجی: { jy, jm, jd } یا null اگر نامعتبر بود.
 */
export function parseJalaliInput(input: string): JalaliDate | null {
  if (!input) return null;
  const s = faToEnDigit(String(input)).trim();
  // جداکننده‌های رایج: / ، - ، . و فاصله
  const parts = s.split(/[/\-.,\s]+/).filter(Boolean);
  if (parts.length !== 3) {
    // اگر کاربر فقط «روز» یا «روز/ماه» داد، نمی‌توانیم سال را حدس بزنیم
    return null;
  }
  let jy = parseInt(parts[0], 10);
  let jm = parseInt(parts[1], 10);
  let jd = parseInt(parts[2], 10);
  if (!Number.isFinite(jy) || !Number.isFinite(jm) || !Number.isFinite(jd)) return null;
  // سال دو رقمی → 1400+
  if (jy < 100) jy += 1400;
  if (jm < 1 || jm > 12 || jd < 1) return null;
  if (jd > jalaliMonthLength(jy, jm)) return null;
  return { jy, jm, jd };
}

/** نمایش تاریخ شمسی به‌صورت خوشخوان (با ارقام فارسی): «۱۴۰۵/۵/۲۹» */
export function formatJalaliShort(j: JalaliDate): string {
  return `${toFa(j.jy)}/${toFa(j.jm)}/${toFa(j.jd)}`;
}

/** نمایش تاریخ شمسی کامل: «۲۹ مرداد ۱۴۰۵» */
export function formatJalaliFull(j: JalaliDate): string {
  return `${toFa(j.jd)} ${jalaliMonthName(j.jm)} ${toFa(j.jy)}`;
}
