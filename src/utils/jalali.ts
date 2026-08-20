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
 * محاسبه‌ی موعد بعدی بر اساس «روز ماه» در تقویم شمسی.
 */
export function nextDueInfo(dayOfMonth: number, now: Date = new Date()): NextDueInfo {
  const today = gregorianToJalali(now);
  const dueDay = Math.min(Math.max(1, Math.round(dayOfMonth)), 31);

  const monthLen = jalaliMonthLength(today.jy, today.jm);
  const clampedDay = Math.min(dueDay, monthLen);

  let targetJ = { ...today };
  if (clampedDay >= today.jd) {
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
