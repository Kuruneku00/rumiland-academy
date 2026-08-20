/**
 * Rumiland Academy — مدیریت مالی کامل
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { paymentService, studentService, registrationService, classService, courseService, financeService, financeCategoryLabel } from '@/services';
import { useFinanceStore } from '@/store';
import { Card, EmptyState, Table, Pagination, Badge, Modal } from '@/components/Layout';
import { Button, Input, Select, SearchInput, Textarea } from '@/components/Basic';
import type { Column } from '@/components/Layout';
import { db } from '@/db/schema';
import type { Payment, Registration, FinanceTransaction } from '@/db/schema';

interface StudentOption { id: string; first_name: string; last_name: string; }
interface RegistrationOption {
  id: string; registration_number: string; student_id: string; class_id?: string; course_id?: string;
  tuition_fee: number; registration_fee: number; discount: number; installments?: number;
  total_amount?: number; paid_amount?: number; remaining_amount?: number;
  installment_plan_json?: string | null; payment_status: string; deleted_at?: string | null;
}
interface Installment { number: number; amount: number; due_date?: string; title?: string; }
interface PaymentRow { payment: Payment; studentName: string; className: string; }

const money = (value: number) => `${Math.max(0, Number(value || 0)).toLocaleString('fa-IR')} تومان`;
const formatDate = (d?: string | null) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('fa-IR', { timeZone: 'Asia/Tehran' }); } catch { return d; } };
const getRegistrationTotal = (r: RegistrationOption) => Number(r.total_amount ?? (Number(r.tuition_fee || 0) + Number(r.registration_fee || 0) - Number(r.discount || 0)));
const getFirstInstallmentAmount = (r: RegistrationOption): number => {
  if (!r.installment_plan_json) return Number(r.tuition_fee || 0);
  try {
    const parsed = JSON.parse(r.installment_plan_json);
    if (Array.isArray(parsed) && parsed.length > 0) return Number(parsed[0].amount || 0);
    return Number(r.tuition_fee || 0);
  } catch { return Number(r.tuition_fee || 0); }
};
const getPlan = (r: RegistrationOption): Installment[] => {
  if (!r.installment_plan_json) {
    const total = getRegistrationTotal(r);
    if (r.installments === 2) { const first = Math.floor(total / 2); return [{ number: 1, amount: first, title: 'قسط اول' }, { number: 2, amount: total - first, title: 'قسط دوم' }]; }
    return [{ number: 1, amount: total, title: 'قسط کامل' }];
  }
  try { const parsed = JSON.parse(r.installment_plan_json); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
};
const METHOD_LABELS: Record<string, string> = { cash: 'نقد', card: 'کارت', transfer: 'انتقال', check: 'چک' };
const PAYMENT_STATUS_LABELS: Record<string, string> = { paid: 'پرداخت شده', pending: 'در انتظار', overdue: 'معوق', cancelled: 'لغو شده' };

function SummaryBox({ title, value, color }: { title: string; value: string; color: string }) {
  return <Card padding="1rem" style={{ textAlign: 'center' }}><div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: '0.25rem' }}>{title}</div><div style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color }}>{value}</div></Card>;
}
function FinanceMini({ title, value, danger = false }: { title: string; value: string; danger?: boolean }) {
  return <div style={{ padding: '0.8rem', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)' }}><div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', marginBottom: '0.25rem' }}>{title}</div><div style={{ fontWeight: 700, color: danger ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>{value}</div></div>;
}

export const PaymentsPage: React.FC = () => {
  const { activeTab, setActiveTab } = useFinanceStore();
  const tabs: Array<{ id: string; label: string }> = [
    { id: 'dashboard', label: 'داشبورد مالی' },
    { id: 'payments', label: 'پرداخت‌های دانش‌آموزان' },
    { id: 'income', label: 'درآمدها' },
    { id: 'expenses', label: 'هزینه‌ها' },
    { id: 'debtors', label: 'بدهکاران' },
    { id: 'transactions', label: 'تراکنش‌های مالی' },
    { id: 'reports', label: 'گزارش‌های مالی' },
  ];
  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, margin: 0 }}>مدیریت مالی</h1>
        <div style={{ marginTop: '0.4rem', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>مدیریت یکپارچه شهریه، اقساط، درآمد، هزینه، بدهی و تراکنش‌ها</div>
      </div>
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: 'var(--border-thin)', paddingBottom: '0.25rem' }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{ padding: '0.5rem 1rem', fontSize: 'var(--font-size-sm)', fontWeight: activeTab === tab.id ? 600 : 400, borderRadius: 'var(--radius-md) var(--radius-md) 0 0', background: activeTab === tab.id ? 'var(--color-primary)' : 'transparent', color: activeTab === tab.id ? '#fff' : 'var(--color-text-secondary)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all var(--transition-fast)' }}>{tab.label}</button>
        ))}
      </div>
      {activeTab === 'dashboard' && <FinanceDashboard />}
      {activeTab === 'payments' && <PaymentsTab />}
      {activeTab === 'income' && <IncomeTab />}
      {activeTab === 'expenses' && <ExpensesTab />}
      {activeTab === 'debtors' && <DebtorsTab />}
      {activeTab === 'transactions' && <TransactionsTab />}
      {activeTab === 'reports' && <ReportsTab />}
    </div>
  );
};

// ================================================================
// TAB: DASHBOARD مالی
// ================================================================
function FinanceDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => { setLoading(true); try { setData(await financeService.getFinancialDashboard()); } catch (e) { console.error(e); } setLoading(false); })(); }, []);

  const cards = [
    { title: 'درآمد کل', value: money(data?.totalIncome ?? 0), color: 'var(--color-success)' },
    { title: 'درآمد امروز', value: money(data?.incomeToday ?? 0), color: 'var(--color-primary-400)' },
    { title: 'درآمد این ماه', value: money(data?.incomeThisMonth ?? 0), color: 'var(--color-success)' },
    { title: 'درآمد سال جاری', value: money(data?.incomeThisYear ?? 0), color: 'var(--color-success)' },
    { title: 'مجموع هزینه‌ها', value: money(data?.totalExpense ?? 0), color: 'var(--color-danger)' },
    { title: 'هزینه این ماه', value: money(data?.expenseThisMonth ?? 0), color: 'var(--color-danger)' },
    { title: 'سود خالص', value: money(data?.netProfit ?? 0), color: (data?.netProfit ?? 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' },
    { title: 'بدهی کل دانش‌آموزان', value: money(data?.totalDebt ?? 0), color: 'var(--color-danger)' },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {loading ? cards.map((_, i) => <Card key={i} padding="1rem" style={{ height: 90 }}><div /></Card>) : cards.map((c, i) => (
          <Card key={i} padding="1rem">
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{c.title}</div>
            <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: c.color, marginTop: '0.25rem' }}>{c.value}</div>
          </Card>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
        <SummaryBox title="تعداد بدهکاران" value={String((data?.debtorCount ?? 0).toLocaleString('fa-IR'))} color="var(--color-danger)" />
        <SummaryBox title="پرداخت‌های امروز" value={String((data?.paymentsToday ?? 0).toLocaleString('fa-IR'))} color="var(--color-primary-400)" />
        <SummaryBox title="اقساط سررسیدشده" value={String((data?.overdueInstallments ?? 0).toLocaleString('fa-IR'))} color="var(--color-danger)" />
        <SummaryBox title="اقساط نزدیک به سررسید" value={String((data?.upcomingInstallments ?? 0).toLocaleString('fa-IR'))} color="var(--color-warning)" />
      </div>
    </div>
  );
}

// ================================================================
// TAB: PAYMENTS (شهریه و اقساط)
// ================================================================
function PaymentsTab() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [studentsList, setStudentsList] = useState<StudentOption[]>([]);
  const [registrationsList, setRegistrationsList] = useState<RegistrationOption[]>([]);
  const [classOptions, setClassOptions] = useState<Array<{ id: string; label: string; registrationId: string; tuition: number }>>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classMeta, setClassMeta] = useState<{ type: 'group' | 'private'; label: string } | null>(null);
  const [selectedRegistration, setSelectedRegistration] = useState<RegistrationOption | null>(null);
  const [registrationPayments, setRegistrationPayments] = useState<Payment[]>([]);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSaving, setFormSaving] = useState(false);

  const [formData, setFormData] = useState({ student_id: '', registration_id: '', amount: '', installment_number: '', payment_date_jalali: '', method: 'cash', description: '' });
  const [debtOverride, setDebtOverride] = useState<string>('');
  const [savingTuition, setSavingTuition] = useState(false);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const result = await paymentService.getPaymentsResolved({ page, perPage: 20, sortBy: 'payment_date', sortDirection: 'desc', search: search || undefined, status: statusFilter || undefined });
      setRows(result.data); setTotalCount(result.total);
    } catch (e) { console.error(e); setRows([]); setTotalCount(0); }
    setLoading(false);
  }, [page, search, statusFilter]);

  const loadStudents = useCallback(async () => {
    try { const students = await studentService.getAll(); setStudentsList(students.map((s: any) => ({ id: s.id, first_name: s.first_name || '', last_name: s.last_name || '' }))); } catch (e) { console.error(e); }
  }, []);

  const loadRegistrations = useCallback(async (studentId: string) => {
    if (!studentId) { setRegistrationsList([]); return; }
    try { const all = await registrationService.getAll(); setRegistrationsList(all.filter((r: any) => r.student_id === studentId && !r.deleted_at)); } catch (e) { console.error(e); setRegistrationsList([]); }
  }, []);

  const loadRegistrationPayments = useCallback(async (registrationId: string) => {
    if (!registrationId) { setRegistrationPayments([]); return; }
    try { const all = await paymentService.getPaymentsResolved({ page: 1, perPage: 1000, sortBy: 'payment_date', sortDirection: 'asc' }); setRegistrationPayments(all.data.filter((row) => row.payment.registration_id === registrationId && !row.payment.deleted_at && row.payment.status !== 'cancelled').map((row) => row.payment)); } catch (e) { console.error(e); setRegistrationPayments([]); }
  }, []);

  useEffect(() => { loadPayments(); }, [loadPayments]);
  useEffect(() => { loadStudents(); }, [loadStudents]);

  const handleStudentChange = async (studentId: string) => {
    setFormData((c) => ({ ...c, student_id: studentId, registration_id: '', amount: '', installment_number: '' }));
    setSelectedRegistration(null); setSelectedInstallment(null); setRegistrationPayments([]);
    setDebtOverride(''); setSelectedClassId('');
    await loadRegistrations(studentId);

    // ساخت لیست کلاس‌هایی که این شاگرد در آن‌ها ثبت‌نام دارد + شهریه‌ی دوره
    try {
      const all = await registrationService.getAll();
      const regs = all.filter((r: any) => r.student_id === studentId && !r.deleted_at);
      const opts: Array<{ id: string; label: string; registrationId: string; tuition: number }> = [];
      for (const r of regs) {
        const courseId = r.course_id || (r.class_id ? (await db.classes.get(r.class_id))?.course_id : undefined);
        const course = courseId ? await db.courses.get(courseId) : null;
        const cls = r.class_id ? await db.classes.get(r.class_id) : null;
        const tuition = Number(r.total_amount || r.tuition_fee || course?.tuition_fee || 0);
        const clsLabel = cls ? (cls.code || 'کلاس') : (course?.title || 'دوره');
        opts.push({ id: r.class_id || r.id, label: `${clsLabel} — شهریه ${money(tuition)}`, registrationId: r.id, tuition });
      }
      setClassOptions(opts);
    } catch (e) { console.error(e); setClassOptions([]); }
  };

  /** انتخاب کلاس: ثبت‌نام و شهریه‌ی آن کلاس را خودکار اعمال کن */
  const handleClassChange = async (classKey: string) => {
    const opt = classOptions.find((c) => c.id === classKey);
    if (!opt) return;
    setSelectedClassId(classKey);
    const registration = registrationsList.find((r) => r.id === opt.registrationId) || null;
    setSelectedRegistration(registration); setSelectedInstallment(null); setRegistrationPayments([]);
    setDebtOverride(opt.tuition > 0 ? String(opt.tuition) : '');
    setFormData((c) => ({ ...c, registration_id: opt.registrationId, amount: '', installment_number: '' }));
    if (opt.registrationId) await loadRegistrationPayments(opt.registrationId);
    await loadClassMeta(registration);
  };
  const handleRegistrationChange = async (registrationId: string) => {
    const registration = registrationsList.find((r) => r.id === registrationId) || null;
    setSelectedRegistration(registration); setSelectedInstallment(null);
    let total = registration ? getRegistrationTotal(registration) : 0;
    // اگر شهریه در ثبت‌نام صفر است، از دوره‌ی مربوطه بخوانیم
    if (total <= 0 && registration) {
      const cls = registration.class_id ? await db.classes.get(registration.class_id) : null;
      const courseId = cls?.course_id || registration.course_id;
      const course = courseId ? await db.courses.get(courseId) : null;
      total = course ? Number(course.tuition_fee || 0) : 0;
    }
    setDebtOverride(total > 0 ? String(total) : ''); // اگر شهریه تعیین نشده، خالی باشد تا کاربر تعیین کند
    setFormData((c) => ({ ...c, registration_id: registrationId, amount: '', installment_number: '' }));
    await loadRegistrationPayments(registrationId);
    await loadClassMeta(registration);
  };

  /** ذخیره شهریه کل در دیتابیس، تا پرداخت‌ها بر اساس آن محاسبه شوند */
  const handleSaveTuition = async () => {
    if (!selectedRegistration) return;
    const total = Number(debtOverride);
    if (!isFinite(total) || total <= 0) { setFormErrors((e) => ({ ...e, tuition: 'مبلغ شهریه معتبر وارد کنید' })); return; }
    setSavingTuition(true);
    try {
      const res = await paymentService.setRegistrationTotal(selectedRegistration.id, total);
      if (res.success && res.data) {
        setSelectedRegistration(res.data as any);
        await loadRegistrationPayments(selectedRegistration.id);
        await loadPayments();
        await loadRegistrations(res.data.student_id);
      } else {
        setFormErrors((e) => ({ ...e, tuition: res.error || 'خطا در ذخیره شهریه' }));
      }
    } finally { setSavingTuition(false); }
  };

  /** تعیین سریع مبلغ پرداخت = کل مانده */
  const setPayFull = () => {
    if (registrationRemaining > 0) setFormData((c) => ({ ...c, amount: String(registrationRemaining) }));
  };

  const loadClassMeta = useCallback(async (reg: RegistrationOption | null) => {
    if (!reg || !reg.class_id) { setClassMeta(null); return; }
    try {
      const cls = await db.classes.get(reg.class_id);
      if (cls) setClassMeta({ type: cls.type, label: cls.code || '' });
      else setClassMeta(null);
    } catch { setClassMeta(null); }
  }, []);

  const registrationPaid = useMemo(() => registrationPayments.reduce((s, p) => s + Number(p.amount || 0), 0), [registrationPayments]);
  const registrationTotal = selectedRegistration
    ? (debtOverride !== '' && !isNaN(Number(debtOverride)) && Number(debtOverride) > 0
        ? Number(debtOverride)
        : getRegistrationTotal(selectedRegistration))
    : 0;
  const registrationRemaining = Math.max(0, registrationTotal - registrationPaid);
  const plan = selectedRegistration ? getPlan(selectedRegistration) : [];

  const installmentPaid = (number: number) => registrationPayments.filter((p) => Number(p.installment_number || 0) === number).reduce((s, p) => s + Number(p.amount || 0), 0);
  const installmentRemaining = (item: Installment) => Math.max(0, Number(item.amount || 0) - installmentPaid(item.number));

  const openInstallmentPayment = (item: Installment) => {
    if (!selectedRegistration) return;
    const remaining = installmentRemaining(item);
    if (remaining <= 0) return;
    setSelectedInstallment(item);
    setFormData((c) => ({ ...c, amount: String(remaining), installment_number: String(item.number) }));
    setShowAddDialog(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.student_id) errors.student_id = 'انتخاب شاگرد الزامی است';
    if (!formData.registration_id) errors.registration_id = 'انتخاب ثبت‌نام الزامی است';
    if (!formData.amount || Number(formData.amount) <= 0) errors.amount = 'مبلغ نامعتبر است';
    // اگر مبلغ کل (شهریه) تعیین شده باشد، مانده بدهی محاسبه و محدود می‌شود.
    // اگر شهریه هنوز صفر است (ثبت‌نام بدون شهریه)، مبلغ آزادانه وارد می‌شود.
    if (selectedRegistration && registrationTotal > 0 && Number(formData.amount) > registrationRemaining) errors.amount = `مبلغ بیشتر از مانده بدهی است: ${money(registrationRemaining)}`;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAdd = async () => {
    if (!validateForm() || !selectedRegistration) return;
    setFormSaving(true);
    try {
      const result = await paymentService.recordPayment({
        student_id: selectedRegistration.student_id, registration_id: selectedRegistration.id,
        class_id: selectedRegistration.class_id, course_id: selectedRegistration.course_id,
        amount: Number(formData.amount),
        installment_number: formData.installment_number ? Number(formData.installment_number) : undefined,
        installment_title: selectedInstallment?.title || (formData.installment_number ? `قسط ${formData.installment_number}` : undefined),
        due_date: selectedInstallment?.due_date, payment_date_jalali: formData.payment_date_jalali,
        status: 'paid', method: formData.method as Payment['method'], description: formData.description, recorded_by: 'admin',
      });
      if (!result.success) { setFormErrors({ general: result.error || 'خطا در ثبت پرداخت' }); return; }
      setShowAddDialog(false);
      await loadPayments(); await loadRegistrations(selectedRegistration.student_id); await loadRegistrationPayments(selectedRegistration.id);
      const fresh = (await registrationService.getAll()).find((r: any) => r.id === selectedRegistration.id) || null;
      setSelectedRegistration(fresh as any);
    } finally { setFormSaving(false); }
  };

  const handleDelete = async () => {
    if (!deletingPayment) return;
    const result = await paymentService.deletePayment(deletingPayment.id);
    if (!result.success) { console.error(result.error); return; }
    setShowDeleteConfirm(false); setDeletingPayment(null);
    await loadPayments();
    if (selectedRegistration) await loadRegistrationPayments(selectedRegistration.id);
  };

  const columns: Column<PaymentRow>[] = [
    { key: 'payment_date', title: 'تاریخ پرداخت', sortable: true, render: (row) => row.payment.payment_date_jalali || formatDate(row.payment.payment_date) },
    { key: 'student', title: 'شاگرد', render: (row) => <span style={{ fontWeight: 600 }}>{row.studentName}</span> },
    { key: 'class', title: 'کلاس', render: (row) => row.className },
    { key: 'installment', title: 'قسط', render: (row) => row.payment.installment_title || (row.payment.installment_number ? `قسط ${row.payment.installment_number}` : '—') },
    { key: 'amount', title: 'مبلغ', sortable: true, render: (row) => <strong>{money(row.payment.amount)}</strong> },
    { key: 'method', title: 'روش', render: (row) => METHOD_LABELS[row.payment.method] || row.payment.method },
    { key: 'status', title: 'وضعیت', render: (row) => <Badge variant={row.payment.status === 'paid' ? 'success' : row.payment.status === 'overdue' ? 'danger' : 'warning'}>{PAYMENT_STATUS_LABELS[row.payment.status] || row.payment.status}</Badge> },
    { key: 'actions', title: 'عملیات', render: (row) => <button onClick={(e) => { e.stopPropagation(); setDeletingPayment(row.payment); setShowDeleteConfirm(true); }} style={{ background: 'none', border: 0, color: 'var(--color-danger)', cursor: 'pointer', fontFamily: 'inherit' }}>حذف</button> },
  ];

  const paidTotal = rows.filter((r) => r.payment.status === 'paid').reduce((s, r) => s + r.payment.amount, 0);
  const debtorCount = rows.filter((r) => r.payment.status === 'pending' || r.payment.status === 'overdue').length;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <SummaryBox title="مجموع دریافتی" value={money(paidTotal)} color="var(--color-success)" />
        <SummaryBox title="تعداد پرداخت‌ها" value={totalCount.toLocaleString('fa-IR')} color="var(--color-primary-400)" />
        <SummaryBox title="نیازمند پیگیری" value={debtorCount.toLocaleString('fa-IR')} color="var(--color-warning)" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
          <SearchInput placeholder="جستجو..." value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
          <Select placeholder="همه وضعیت‌ها" value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} options={[{ value: 'paid', label: 'پرداخت شده' }, { value: 'pending', label: 'در انتظار' }, { value: 'overdue', label: 'معوق' }, { value: 'cancelled', label: 'لغو شده' }]} />
        </div>
        <Button onClick={() => { setSelectedRegistration(null); setSelectedInstallment(null); setFormData({ student_id: '', registration_id: '', amount: '', installment_number: '', payment_date_jalali: '', method: 'cash', description: '' }); setFormErrors({}); setShowAddDialog(true); }}>ثبت پرداخت جدید</Button>
      </div>

      {selectedRegistration && (
        <Card padding="1.25rem" style={{ marginBottom: '1.5rem', border: '1px solid var(--color-primary-500)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>پرونده مالی ثبت‌نام</div>
              <h2 style={{ margin: '0.25rem 0', fontSize: 'var(--font-size-lg)' }}>{selectedRegistration.registration_number}</h2>
              {classMeta && (
                <Badge variant={classMeta.type === 'private' ? 'info' : 'neutral'}>{classMeta.type === 'private' ? 'کلاس خصوصی' : 'کلاس گروهی'}{classMeta.label ? ` — ${classMeta.label}` : ''}</Badge>
              )}
            </div>
            <Badge variant={registrationRemaining <= 0 ? 'success' : registrationPaid > 0 ? 'warning' : 'danger'}>{registrationRemaining <= 0 ? 'تسویه کامل' : registrationPaid > 0 ? 'پرداخت ناقص' : 'بدهکار'}</Badge>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <FinanceMini title={classMeta?.type === 'private' ? 'شهریه ماهانه تکی' : 'شهریه'} value={money(classMeta?.type === 'private' ? getFirstInstallmentAmount(selectedRegistration) : selectedRegistration.tuition_fee)} />
            <FinanceMini title="هزینه ثبت‌نام" value={money(selectedRegistration.registration_fee)} />
            <FinanceMini title="تخفیف" value={money(selectedRegistration.discount)} />
            <FinanceMini title={classMeta?.type === 'private' ? 'شهریه کل امسال' : 'مبلغ نهایی'} value={money(registrationTotal)} />
            <FinanceMini title="پرداخت‌شده" value={money(registrationPaid)} />
            <FinanceMini title="مانده بدهی" value={money(registrationRemaining)} danger={registrationRemaining > 0} />
          </div>
          <div>
            <h3 style={{ fontSize: 'var(--font-size-md)', margin: '0 0 0.75rem' }}>برنامه اقساط</h3>
            <div style={{ display: 'grid', gridTemplateColumns: plan.length > 1 ? 'repeat(auto-fit, minmax(240px, 1fr))' : '1fr', gap: '0.75rem' }}>
              {plan.map((item) => {
                const paid = installmentPaid(item.number);
                const remaining = installmentRemaining(item);
                const isPaid = remaining <= 0;
                return (
                  <div key={item.number} style={{ padding: '1rem', borderRadius: 'var(--radius-md)', border: 'var(--border-default)', background: 'var(--color-bg-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <strong>{item.title || `قسط ${item.number}`}</strong>
                      <Badge variant={isPaid ? 'success' : 'warning'}>{isPaid ? 'تسویه' : 'باز'}</Badge>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: 'var(--font-size-sm)' }}>
                      <div>مبلغ قسط: <strong>{money(item.amount)}</strong></div>
                      <div>پرداخت: <strong>{money(paid)}</strong></div>
                      <div>مانده: <strong style={{ color: remaining > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>{money(remaining)}</strong></div>
                      <div>سررسید: <strong>{item.due_date ? formatDate(item.due_date) : 'تعیین نشده'}</strong></div>
                    </div>
                    {!isPaid && <Button style={{ width: '100%', marginTop: '0.85rem' }} onClick={() => openInstallmentPayment(item)}>ثبت پرداخت این قسط</Button>}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      <Table columns={columns} data={rows} rowKey={(row) => row.payment.id} isLoading={loading} emptyState={<EmptyState title="هیچ پرداختی ثبت نشده است" description="برای ثبت اولین پرداخت از دکمه ثبت پرداخت استفاده کنید" action={<Button onClick={() => setShowAddDialog(true)}>ثبت پرداخت جدید</Button>} />} />

      <Pagination page={page} perPage={20} total={totalCount} label="پرداخت" onPageChange={setPage} onPerPageChange={() => {}} />

      <Modal isOpen={showAddDialog} onClose={() => { if (!formSaving) setShowAddDialog(false); }} title={selectedInstallment ? `ثبت پرداخت ${selectedInstallment.title || `قسط ${selectedInstallment.number}`}` : 'ثبت پرداخت جدید'} size="md" footer={<><Button variant="secondary" onClick={() => setShowAddDialog(false)} disabled={formSaving}>انصراف</Button><Button onClick={handleAdd} disabled={formSaving}>{formSaving ? 'در حال ثبت...' : 'ثبت پرداخت'}</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {formErrors.general && <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>{formErrors.general}</div>}
          {!selectedRegistration && (<>
            <Select label="شاگرد" placeholder="انتخاب شاگرد..." value={formData.student_id} onChange={handleStudentChange} error={formErrors.student_id} options={studentsList.map((s) => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))} />
            {classOptions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <Select label="کلاس (خودکار شهریه را می‌آورد)" placeholder="انتخاب کلاس..." value={selectedClassId} onChange={handleClassChange} options={classOptions.map((c) => ({ value: c.id, label: c.label }))} />
                <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>با انتخاب کلاس، شهریه‌ی آن دوره به‌طور خودکار در فرم قرار می‌گیرد.</div>
              </div>
            )}
            <Select label="ثبت‌نام" placeholder={formData.student_id ? 'انتخاب ثبت‌نام...' : 'ابتدا شاگرد را انتخاب کنید'} value={formData.registration_id} onChange={handleRegistrationChange} disabled={!formData.student_id} error={formErrors.registration_id} options={registrationsList.map((r) => ({ value: r.id, label: `${r.registration_number} — ${money(getRegistrationTotal(r))}` }))} />
          </>)}
          {selectedRegistration && (
            <>
              {/* خلاصه مالی شفاف */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', textAlign: 'center' }}>
                  <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>شهریه کل</div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-size-md)' }}>{money(registrationTotal)}</div>
                </div>
                <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', textAlign: 'center' }}>
                  <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>پرداخت‌شده</div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-size-md)', color: 'var(--color-success)' }}>{money(registrationPaid)}</div>
                </div>
                <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', textAlign: 'center' }}>
                  <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>باقی‌مانده</div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-size-md)', color: registrationRemaining > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>{money(registrationRemaining)}</div>
                </div>
              </div>

              {/* تعیین شهریه کل — قابل ویرایش و ذخیره */}
              <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', border: 'var(--border-default)', background: 'var(--color-bg-tertiary)' }}>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '0.5rem' }}>💰 اگر شهریه کامل این شاگرد را هنوز تعیین نکرده‌اید، اینجا وارد و ثبت کنید</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Input type="number" value={debtOverride} onChange={(e) => setDebtOverride(e.target.value)} placeholder="مبلغ کل شهریه (تومان)" style={{ flex: 1 }} />
                  <Button variant="secondary" onClick={handleSaveTuition} disabled={savingTuition}>{savingTuition ? 'در حال ذخیره...' : 'ثبت شهریه'}</Button>
                </div>
                {formErrors.tuition && <div style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)', marginTop: '0.4rem' }}>{formErrors.tuition}</div>}
              </div>
            </>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Input label="مبلغ پرداخت (تومان)" type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} error={formErrors.amount} />
            {selectedRegistration && !selectedInstallment && registrationRemaining > 0 && (
              <Button variant="ghost" onClick={setPayFull} style={{ alignSelf: 'flex-start', fontSize: 'var(--font-size-xs)' }}>⚡ پرداخت کامل مانده ({money(registrationRemaining)})</Button>
            )}
            {selectedInstallment && (
              <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>در حال ثبت پرداخت برای: <strong>{selectedInstallment.title || `قسط ${selectedInstallment.number}`}</strong> — مبلغ قابل پرداخت: {money(installmentRemaining(selectedInstallment))}</div>
            )}
          </div>
          <Input label="تاریخ پرداخت (جلالی)" value={formData.payment_date_jalali} onChange={(e) => setFormData({ ...formData, payment_date_jalali: e.target.value })} placeholder="۱۴۰۵/۰۵/۲۸" />
          <Select label="روش پرداخت" value={formData.method} onChange={(v) => setFormData({ ...formData, method: v })} options={[{ value: 'cash', label: 'نقد' }, { value: 'card', label: 'کارت' }, { value: 'transfer', label: 'انتقال بانکی' }, { value: 'check', label: 'چک' }]} />
          <Textarea label="توضیحات" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
        </div>
      </Modal>

      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="حذف پرداخت" size="sm" footer={<><Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>انصراف</Button><Button onClick={handleDelete} variant="danger">حذف پرداخت</Button></>}>
        <p style={{ color: 'var(--color-text-secondary)' }}>آیا از حذف این پرداخت اطمینان دارید؟ تراکنش مالی مرتبط نیز حذف می‌شود و وضعیت مالی ثبت‌نام به‌روزرسانی می‌گردد.</p>
      </Modal>
    </div>
  );
}

// ================================================================
// مشترک: فرم تراکنش (درآمد/هزینه)
// ================================================================
function TransactionForm({ type, onSaved, onCancel }: { type: 'income' | 'expense'; onSaved: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ title: '', amount: '', category: type === 'income' ? 'tuition' : 'salary', method: 'cash', description: '', date_jalali: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const categories = type === 'income'
    ? [{ value: 'tuition', label: 'شهریه' }, { value: 'registration', label: 'هزینه ثبت‌نام' }, { value: 'other', label: 'سایر درآمد' }]
    : [
      { value: 'salary', label: 'حقوق مدرس' }, { value: 'rent', label: 'اجاره' }, { value: 'internet', label: 'اینترنت' },
      { value: 'advertising', label: 'تبلیغات' }, { value: 'software', label: 'نرم‌افزار' }, { value: 'equipment', label: 'تجهیزات' },
      { value: 'maintenance', label: 'تعمیرات' }, { value: 'transport', label: 'حمل‌ونقل' }, { value: 'utilities', label: 'قبوض' }, { value: 'other', label: 'سایر' },
    ];

  const handleSave = async () => {
    if (!form.title.trim()) { setError('عنوان الزامی است'); return; }
    if (!form.amount || Number(form.amount) <= 0) { setError('مبلغ معتبر الزامی است'); return; }
    setSaving(true); setError('');
    try {
      await financeService.createTransaction({
        type, category: form.category, title: form.title, amount: Number(form.amount),
        method: form.method as any, description: form.description || null, transaction_date_jalali: form.date_jalali || null,
      });
      onSaved();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>{error}</div>}
      <Input label="عنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={type === 'income' ? 'مثلاً درآمد متفرقه' : 'مثلاً اجاره ماه'} />
      <Input label="مبلغ (تومان)" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
      <Select label="دسته‌بندی" value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={categories} />
      <Select label="روش پرداخت" value={form.method} onChange={(v) => setForm({ ...form, method: v })} options={[{ value: 'cash', label: 'نقد' }, { value: 'card', label: 'کارت' }, { value: 'transfer', label: 'انتقال' }, { value: 'check', label: 'چک' }]} />
      <Input label="تاریخ (جلالی - اختیاری)" value={form.date_jalali} onChange={(e) => setForm({ ...form, date_jalali: e.target.value })} placeholder="۱۴۰۵/۰۵/۲۸" />
      <Textarea label="توضیحات" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>انصراف</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'در حال ثبت...' : 'ثبت'}</Button>
      </div>
    </div>
  );
}

// ================================================================
// TAB: INCOME (درآمدها)
// ================================================================
function IncomeTab() {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const txs = await financeService.getTransactions(); setTransactions(txs.filter((t) => t.type === 'income')); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const total = transactions.reduce((s, t) => s + Number(t.amount || 0), 0);

  const columns: Column<FinanceTransaction>[] = [
    { key: 'date', title: 'تاریخ', render: (t) => t.transaction_date_jalali || formatDate(t.transaction_date) },
    { key: 'title', title: 'عنوان', render: (t) => <span style={{ fontWeight: 600 }}>{t.title}</span> },
    { key: 'category', title: 'دسته‌بندی', render: (t) => financeCategoryLabel(t.category) },
    { key: 'amount', title: 'مبلغ', render: (t) => <strong style={{ color: 'var(--color-success)' }}>{money(t.amount)}</strong> },
    { key: 'method', title: 'روش', render: (t) => METHOD_LABELS[t.method] || '—' },
    { key: 'desc', title: 'توضیحات', render: (t) => t.description || '—' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <SummaryBox title="مجموع درآمدها" value={money(total)} color="var(--color-success)" />
        <Button onClick={() => setShowModal(true)}>ثبت درآمد جدید</Button>
      </div>
      <Table columns={columns} data={transactions} rowKey={(t) => t.id} isLoading={loading} emptyState={<EmptyState title="هیچ درآمدی ثبت نشده است" />} />
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="ثبت درآمد جدید" size="md">
        <TransactionForm type="income" onSaved={() => { setShowModal(false); load(); }} onCancel={() => setShowModal(false)} />
      </Modal>
    </div>
  );
}

// ================================================================
// TAB: EXPENSES (هزینه‌ها)
// ================================================================
function ExpensesTab() {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState<FinanceTransaction | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const txs = await financeService.getTransactions(); setTransactions(txs.filter((t) => t.type === 'expense')); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const total = transactions.reduce((s, t) => s + Number(t.amount || 0), 0);

  const handleDelete = async () => {
    if (!deleting) return;
    await financeService.deleteTransaction(deleting.id);
    setDeleting(null);
    await load();
  };

  const columns: Column<FinanceTransaction>[] = [
    { key: 'date', title: 'تاریخ', render: (t) => t.transaction_date_jalali || formatDate(t.transaction_date) },
    { key: 'title', title: 'عنوان', render: (t) => <span style={{ fontWeight: 600 }}>{t.title}</span> },
    { key: 'category', title: 'دسته‌بندی', render: (t) => financeCategoryLabel(t.category) },
    { key: 'amount', title: 'مبلغ', render: (t) => <strong style={{ color: 'var(--color-danger)' }}>{money(t.amount)}</strong> },
    { key: 'method', title: 'روش', render: (t) => METHOD_LABELS[t.method] || '—' },
    { key: 'actions', title: 'عملیات', render: (t) => <button onClick={() => setDeleting(t)} style={{ background: 'none', border: 0, color: 'var(--color-danger)', cursor: 'pointer', fontFamily: 'inherit' }}>حذف</button> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <SummaryBox title="مجموع هزینه‌ها" value={money(total)} color="var(--color-danger)" />
        <Button onClick={() => setShowModal(true)}>ثبت هزینه جدید</Button>
      </div>
      <Table columns={columns} data={transactions} rowKey={(t) => t.id} isLoading={loading} emptyState={<EmptyState title="هیچ هزینه‌ای ثبت نشده است" />} />
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="ثبت هزینه جدید" size="md">
        <TransactionForm type="expense" onSaved={() => { setShowModal(false); load(); }} onCancel={() => setShowModal(false)} />
      </Modal>
      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="حذف هزینه" size="sm" footer={<><Button variant="secondary" onClick={() => setDeleting(null)}>انصراف</Button><Button variant="danger" onClick={handleDelete}>حذف</Button></>}>
        <p style={{ color: 'var(--color-text-secondary)' }}>آیا از حذف این هزینه اطمینان دارید؟</p>
      </Modal>
    </div>
  );
}

// ================================================================
// TAB: DEBTORS (بدهکاران)
// ================================================================
function DebtorsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await financeService.getDebtors()); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => r.studentName.toLowerCase().includes(q) || r.courseTitle.toLowerCase().includes(q) || r.className.toLowerCase().includes(q));
  }, [rows, search]);

  const totalDebt = filtered.reduce((s, r) => s + r.remaining, 0);

  const columns: Column<any>[] = [
    { key: 'student', title: 'نام دانش‌آموز', render: (r) => <span style={{ fontWeight: 600 }}>{r.studentName}</span> },
    { key: 'course', title: 'دوره', render: (r) => r.courseTitle },
    { key: 'class', title: 'کلاس', render: (r) => r.className },
    { key: 'total', title: 'شهریه کل', render: (r) => money(r.total) },
    { key: 'paid', title: 'پرداخت‌شده', render: (r) => <span style={{ color: 'var(--color-success)' }}>{money(r.paid)}</span> },
    { key: 'remaining', title: 'مانده', render: (r) => <strong style={{ color: 'var(--color-danger)' }}>{money(r.remaining)}</strong> },
    { key: 'count', title: 'تعداد اقساط', render: (r) => r.installmentCount.toLocaleString('fa-IR') },
    { key: 'next', title: 'قسط بعدی', render: (r) => r.nextInstallment ? `${r.nextInstallment.title || `قسط ${r.nextInstallment.number}`} — ${money(r.nextInstallment.amount)}` : '—' },
    { key: 'due', title: 'سررسید', render: (r) => r.nextInstallment?.due_date ? formatDate(r.nextInstallment.due_date) : '—' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <SummaryBox title="مجموع بدهی" value={money(totalDebt)} color="var(--color-danger)" />
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <SearchInput placeholder="جستجوی بدهکار..." value={search} onChange={setSearch} />
        </div>
      </div>
      <Table columns={columns} data={filtered} rowKey={(r) => r.registration.id} isLoading={loading} emptyState={<EmptyState title="هیچ بدهکاری وجود ندارد" description="همه دانش‌آموزان تسویه شده‌اند" />} />
    </div>
  );
}

// ================================================================
// TAB: TRANSACTIONS (دفتر تراکنش‌های مالی)
// ================================================================
function TransactionsTab() {
  const [rows, setRows] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await financeService.getTransactions()); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let r = rows;
    if (typeFilter) r = r.filter((t) => t.type === typeFilter);
    if (search) { const q = search.toLowerCase(); r = r.filter((t) => t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)); }
    return r;
  }, [rows, typeFilter, search]);

  const income = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
  const expense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);

  const [deleting, setDeleting] = useState<FinanceTransaction | null>(null);
  const handleDelete = async () => {
    if (!deleting) return;
    await financeService.deleteTransaction(deleting.id);
    setDeleting(null);
    await load();
  };

  const columns: Column<FinanceTransaction>[] = [
    { key: 'date', title: 'تاریخ', render: (t) => t.transaction_date_jalali || formatDate(t.transaction_date) },
    { key: 'type', title: 'نوع', render: (t) => <Badge variant={t.type === 'income' ? 'success' : 'danger'}>{t.type === 'income' ? 'درآمد' : 'هزینه'}</Badge> },
    { key: 'title', title: 'عنوان', render: (t) => <span style={{ fontWeight: 600 }}>{t.title}</span> },
    { key: 'category', title: 'دسته‌بندی', render: (t) => financeCategoryLabel(t.category) },
    { key: 'amount', title: 'مبلغ', render: (t) => <strong style={{ color: t.type === 'income' ? 'var(--color-success)' : 'var(--color-danger)' }}>{t.type === 'income' ? '+' : '−'} {money(t.amount)}</strong> },
    { key: 'method', title: 'روش', render: (t) => METHOD_LABELS[t.method] || '—' },
    { key: 'actions', title: 'عملیات', render: (t) => <button onClick={() => setDeleting(t)} style={{ background: 'none', border: 0, color: 'var(--color-danger)', cursor: 'pointer', fontFamily: 'inherit' }}>حذف</button> },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <SummaryBox title="جمع درآمد" value={money(income)} color="var(--color-success)" />
        <SummaryBox title="جمع هزینه" value={money(expense)} color="var(--color-danger)" />
        <SummaryBox title="سود خالص" value={money(income - expense)} color={(income - expense) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'} />
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <SearchInput placeholder="جستجو..." value={search} onChange={setSearch} />
        <Select placeholder="همه انواع" value={typeFilter} onChange={setTypeFilter} options={[{ value: 'income', label: 'درآمد' }, { value: 'expense', label: 'هزینه' }]} />
      </div>
      <Table columns={columns} data={filtered} rowKey={(t) => t.id} isLoading={loading} emptyState={<EmptyState title="هیچ تراکنشی ثبت نشده است" />} />
      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="حذف تراکنش" size="sm" footer={<><Button variant="secondary" onClick={() => setDeleting(null)}>انصراف</Button><Button variant="danger" onClick={handleDelete}>حذف</Button></>}>
        <p style={{ color: 'var(--color-text-secondary)' }}>آیا از حذف این تراکنش مالی اطمینان دارید؟</p>
      </Modal>
    </div>
  );
}

// ================================================================
// TAB: REPORTS (گزارش‌های مالی)
// ================================================================
function ReportsTab() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('month');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setReport(await financeService.getReport(period)); } catch (e) { console.error(e); }
    setLoading(false);
  }, [period]);
  useEffect(() => { load(); }, [load]);

  const periodLabel: Record<string, string> = { today: 'امروز', week: 'این هفته', month: 'این ماه', year: 'امسال', all: 'کل دوره' };

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {(['today', 'week', 'month', 'year', 'all'] as const).map((p) => (
          <button key={p} onClick={() => setPeriod(p)} style={{ padding: '0.4rem 1rem', fontSize: 'var(--font-size-sm)', fontWeight: period === p ? 600 : 400, borderRadius: 'var(--radius-md)', background: period === p ? 'var(--color-primary)' : 'var(--color-surface)', color: period === p ? '#fff' : 'var(--color-text-secondary)', border: 'var(--border-default)', cursor: 'pointer', fontFamily: 'inherit' }}>{periodLabel[p]}</button>
        ))}
      </div>

      {loading || !report ? <EmptyState title="در حال بارگذاری گزارش..." /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <SummaryBox title="درآمد" value={money(report.income)} color="var(--color-success)" />
            <SummaryBox title="هزینه" value={money(report.expense)} color="var(--color-danger)" />
            <SummaryBox title="سود خالص" value={money(report.profit)} color={report.profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'} />
            <SummaryBox title="تعداد تراکنش درآمد" value={(report.incomeCount ?? 0).toLocaleString('fa-IR')} color="var(--color-primary-400)" />
            <SummaryBox title="تعداد تراکنش هزینه" value={(report.expenseCount ?? 0).toLocaleString('fa-IR')} color="var(--color-primary-400)" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', flexWrap: 'wrap' }}>
            <Card padding="1.25rem">
              <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: '1rem' }}>درآمد بر اساس دسته‌بندی</h3>
              {Object.keys(report.incomeByCategory || {}).length === 0 ? <div style={{ color: 'var(--color-text-muted)' }}>داده‌ای وجود ندارد</div> : Object.entries(report.incomeByCategory).map(([cat, val]: any) => (
                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: 'var(--border-thin)' }}>
                  <span>{financeCategoryLabel(cat)}</span>
                  <strong style={{ color: 'var(--color-success)' }}>{money(val)}</strong>
                </div>
              ))}
            </Card>
            <Card padding="1.25rem">
              <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: '1rem' }}>هزینه بر اساس دسته‌بندی</h3>
              {Object.keys(report.expenseByCategory || {}).length === 0 ? <div style={{ color: 'var(--color-text-muted)' }}>داده‌ای وجود ندارد</div> : Object.entries(report.expenseByCategory).map(([cat, val]: any) => (
                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: 'var(--border-thin)' }}>
                  <span>{financeCategoryLabel(cat)}</span>
                  <strong style={{ color: 'var(--color-danger)' }}>{money(val)}</strong>
                </div>
              ))}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
