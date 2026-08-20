/**
 * Rumiland Academy — Finance Core Engine
 *
 * این ماژول قلب سیستم مالی است. مسئول هماهنگ‌سازی کامل بین:
 *   - Payment          (پرداخت واقعی دانش‌آموز)
 *   - FinanceTransaction (دفتر تراکنش‌های مالی)
 *   - Registration     (وضعیت مالی ثبت‌نام: paid / remaining / status)
 *
 * قوانین اصلی (بر اساس MASTER PLAN):
 *   1. هر پرداخت ثبت‌شده → یک تراکنش درآمدی (income) در دفتر مالی ایجاد می‌کند.
 *   2. ویرایش پرداخت   → تراکنش مالی متناظر نیز اصلاح می‌شود.
 *   3. حذف پرداخت      → تراکنش مالی مرتبط حذف/غیرفعال شده و وضعیت ثبت‌نام
 *                         دوباره محاسبه می‌شود.
 *   4. هیچ تراکنش مالی بدون پرداخت مرتبط ایجاد نمی‌شود، مگر تراکنش مستقل.
 *   5. مانده بدهی هرگز دستی محاسبه نمی‌شود.
 */

import { db } from '@/db/schema';
import type {
  Payment,
  Registration,
  FinanceTransaction,
  FinanceCategory,
} from '@/db/schema';
import { v4 as uuid } from 'uuid';

// ================================================================
// HELPERS
// ================================================================

/** مبلغ کل قابل پرداخت یک ثبت‌نام */
export function registrationTotal(r: Registration): number {
  // مبلغ پایه‌ی قابل پرداخت: اگر total_amount ثبت شده باشد (شهریه‌ی ناخالص) از آن استفاده می‌کنیم،
  // وگرنه شهریه + هزینه‌ی ثبت‌نام.
  const base =
    Number(r.total_amount) > 0
      ? Number(r.total_amount)
      : Number(r.tuition_fee || 0) + Number(r.registration_fee || 0);
  // تخفیف باید همیشه از مبلغ پایه کم شود.
  return Math.max(0, base - Number(r.discount || 0));
}

/**
 * کل مبلغ قابل پرداخت، با fallback به شهریه‌ی دوره.
 * اگر total_amount و tuition_fee هر دو صفر باشند، شهریه‌ی دوره (course.tuition_fee) خوانده می‌شود.
 * برای کلاس خصوصی ماهانه، total_amount معمولاً مجموع اقساط است و همین مقدار بازمی‌گردد.
 */
export async function resolveRegistrationTotal(r: Registration): Promise<number> {
  const direct = registrationTotal(r);
  if (direct > 0) return direct;

  const courseId = r.course_id || (r.class_id ? (await db.classes.get(r.class_id))?.course_id : undefined);
  if (courseId) {
    const course = await db.courses.get(courseId);
    if (course && Number(course.tuition_fee || 0) > 0) {
      // تخفیف ثبت‌نام باید از شهریه دوره کم شود
      return Math.max(0, Number(course.tuition_fee) - Number(r.discount || 0));
    }
  }
  return 0;
}

/** جمع پرداخت‌های فعال (غیرحذف‌شده و غیرلغو) یک ثبت‌نام */
export async function paidAmountForRegistration(
  registrationId: string
): Promise<number> {
  const payments = await db.payments
    .where('registration_id')
    .equals(registrationId)
    .filter((p) => !p.deleted_at && p.status !== 'cancelled')
    .toArray();

  return payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
}

/** تعیین وضعیت پرداخت بر اساس مبلغ پرداخت‌شده و کل */
export function computePaymentStatus(
  paid: number,
  total: number
): Registration['payment_status'] {
  if (total <= 0) return 'pending';
  if (paid >= total) return 'paid';
  if (paid > 0) return 'partial';
  return 'pending';
}

/**
 * محاسبه مجدد کامل وضعیت مالی یک ثبت‌نام و بازگرداندن مقادیر به‌روز.
 * این تابع هیچ‌چیز را نمی‌نویسد؛ فقط مقادیر را محاسبه می‌کند.
 */
export async function recalcRegistrationFigures(
  registrationId: string
): Promise<{
  total: number;
  paid: number;
  remaining: number;
  payment_status: Registration['payment_status'];
}> {
  const reg = await db.registrations.get(registrationId);
  if (!reg) throw new Error('ثبت‌نام یافت نشد');

  const total = await resolveRegistrationTotal(reg);
  const paid = await paidAmountForRegistration(registrationId);
  const remaining = Math.max(0, total - paid);

  // اگر سررسید گذشته و مانده باقی است → overdue
  let payment_status = computePaymentStatus(paid, total);

  if (payment_status !== 'paid' && remaining > 0) {
    const plan = parseInstallmentPlan(reg);
    const now = new Date().toISOString().split('T')[0];
    // پرداخت‌های فعال این ثبت‌نام را بخوان تا بدانیم هر قسط چقدر پرداخت شده است
    const payments = await db.payments
      .where('registration_id')
      .equals(registrationId)
      .filter((p) => !p.deleted_at && p.status !== 'cancelled')
      .toArray();

    // «معوق» فقط وقتی است که قسطی که سررسیدش گذشته هنوز به‌طور کامل پرداخت نشده باشد.
    // پرداختِ قسط‌های آینده یا قسطِ تسویه‌شده نباید معوق حساب شود.
    const hasUnpaidOverdue = plan.some((item) => {
      if (!item.due_date || item.due_date >= now) return false; // سررسید نرسیده
      const paidForInstallment = payments
        .filter((p) => Number(p.installment_number || 0) === Number(item.number))
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      return paidForInstallment < Number(item.amount || 0);
    });
    if (hasUnpaidOverdue) payment_status = 'overdue';
  }

  return { total, paid, remaining, payment_status };
}

/** بازگرداندن و نوشتن وضعیت مالی ثبت‌نام به دیتابیس */
export async function persistRegistrationFigures(
  registrationId: string
): Promise<{
  total: number;
  paid: number;
  remaining: number;
  payment_status: Registration['payment_status'];
}> {
  const figures = await recalcRegistrationFigures(registrationId);
  await db.registrations.update(registrationId, {
    total_amount: figures.total,
    paid_amount: figures.paid,
    remaining_amount: figures.remaining,
    payment_status: figures.payment_status,
    updated_at: new Date().toISOString(),
  } as any);
  return figures;
}

/** پارس برنامه اقساط ثبت‌نام */
export function parseInstallmentPlan(
  r: Registration
): Array<{ number: number; amount: number; due_date?: string; title?: string }> {
  if (!r.installment_plan_json) return [];
  try {
    const parsed = JSON.parse(r.installment_plan_json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ================================================================
// PAYMENT <-> FINANCE TRANSACTION SYNC
// ================================================================

/**
 * ساخت تراکنش مالی درآمدی مرتبط با یک پرداخت.
 * این تابع id پرداخت را در تراکنش ذخیره می‌کند تا بعداً قابل هماهنگی باشد.
 */
export async function createIncomeTransactionForPayment(
  payment: Payment,
  opts: { category?: FinanceCategory | string } = {}
): Promise<FinanceTransaction> {
  const now = new Date().toISOString();

  const reg = payment.registration_id
    ? await db.registrations.get(payment.registration_id)
    : undefined;

  const transaction: FinanceTransaction = {
    id: uuid(),
    type: 'income',
    category: opts.category || 'tuition',
    title: `پرداخت ${payment.installment_title || 'شهریه'}`,
    amount: Number(payment.amount || 0),
    transaction_date: payment.payment_date || now,
    transaction_date_jalali: payment.payment_date_jalali || null,
    method: payment.method,
    student_id: payment.student_id || null,
    registration_id: payment.registration_id || null,
    payment_id: payment.id,
    description: payment.description || null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  await db.financeTransactions.put(transaction);
  return transaction;
}

/**
 * به‌روزرسانی تراکنش مالی مرتبط با یک پرداخت (پس از ویرایش پرداخت).
 */
export async function syncTransactionForPayment(payment: Payment) {
  if (!payment.id) return;

  const existing = await db.financeTransactions
    .where('payment_id')
    .equals(payment.id)
    .first();

  if (!existing) {
    // تراکنشی وجود ندارد → بساز
    return createIncomeTransactionForPayment(payment);
  }

  // به‌روزرسانی (فقط اگر پرداخت حذف نشده و لغو نشده باشد)
  if (payment.deleted_at || payment.status === 'cancelled') {
    await db.financeTransactions.put({
      ...existing,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as FinanceTransaction);
    return;
  }

  await db.financeTransactions.put({
    ...existing,
    type: 'income',
    category: existing.category || 'tuition',
    title: `پرداخت ${payment.installment_title || 'شهریه'}`,
    amount: Number(payment.amount || 0),
    transaction_date: payment.payment_date || existing.transaction_date,
    transaction_date_jalali:
      payment.payment_date_jalali || existing.transaction_date_jalali,
    method: payment.method,
    student_id: payment.student_id || null,
    registration_id: payment.registration_id || null,
    description: payment.description || null,
    updated_at: new Date().toISOString(),
  } as FinanceTransaction);
}

/**
 * حذف تراکنش‌های مالی مرتبط با یک پرداخت (soft delete).
 */
export async function removeTransactionForPayment(paymentId: string) {
  const txs = await db.financeTransactions
    .where('payment_id')
    .equals(paymentId)
    .toArray();

  for (const tx of txs) {
    await db.financeTransactions.put({
      ...tx,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as FinanceTransaction);
  }
}
