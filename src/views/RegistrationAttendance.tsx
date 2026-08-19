/**
 * Rumiland Academy — صفحه ثبت‌نام‌ها
 * (بخش حضور و غیاب و پرداخت شهریه از این صفحه حذف شده است.
 *  پرداخت‌ها در «مدیریت مالی» مدیریت می‌شوند.)
 */
import React, { useEffect, useState } from 'react';
import { registrationService, studentService, courseService, classService } from '@/services';
import { Card, EmptyState, Table, Pagination, Badge, Modal, StatCard } from '@/components/Layout';
import { Button, Select } from '@/components/Basic';
import type { Column } from '@/components/Layout';
import { db } from '@/db/schema';

interface RegRow { registration: any; studentName: string; courseTitle: string; className: string; teacherName: string; }

const money = (v: number) => `${Math.max(0, Number(v || 0)).toLocaleString('fa-IR')} تومان`;

export const RegistrationAttendancePage: React.FC = () => {
  const [regRows, setRegRows] = useState<RegRow[]>([]);
  const [regTotal, setRegTotal] = useState(0);
  const [regPage, setRegPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showRegDialog, setShowRegDialog] = useState(false);
  const [showDeleteRegDialog, setShowDeleteRegDialog] = useState(false);
  const [deletingReg, setDeletingReg] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [allCls, setAllCls] = useState<any[]>([]);

  const [regForm, setRegForm] = useState({
    student_id: '',
    course_id: '',
    class_id: '',
    // شیوه پرداخت (فقط برای کلاس خصوصی معنا دارد)
    payment_mode: 'once' as 'once' | 'monthly',
    months: 1,
    monthly_amount: 0,
    notes: ''
  });
  const [regSaving, setRegSaving] = useState(false);
  const [regError, setRegError] = useState('');

  // نوع کلاس انتخاب‌شده (برای نمایش گزینه شهریه ماهانه)
  const [selectedClassType, setSelectedClassType] = useState<'group' | 'private' | ''>('');

  useEffect(() => { loadRegistrations(); loadStudents(); loadCourses(); loadAllClasses(); }, [regPage]);

  const loadRegistrations = async () => {
    setLoading(true);
    const r = await registrationService.getRegistrationsResolved({ page: regPage, perPage: 20 });
    const enriched = await Promise.all(r.data.map(async (item: any) => {
      const cls = await db.classes.get(item.registration.class_id);
      const teacher = cls ? await db.teachers.get(cls.teacher_id) : null;
      return { ...item, teacherName: teacher ? `${teacher.first_name} ${teacher.last_name}` : '--' };
    }));
    setRegRows(enriched);
    setRegTotal(r.total);
    setLoading(false);
  };
  const loadStudents = async () => { setStudents(await studentService.getAll()); };
  const loadCourses = async () => { setCourses(await courseService.getAll()); };
  const loadAllClasses = async () => { setAllCls(await classService.getAll()); };

  const resetRegForm = (extra: Partial<typeof regForm> = {}) =>
    setRegForm({
      student_id: '', course_id: '', class_id: '',
      payment_mode: 'once', months: 1, monthly_amount: 0, notes: '',
      ...extra
    });

  const onCourseChange = async (courseId: string) => {
    setRegForm(prev => ({ ...prev, course_id: courseId, class_id: '' }));
    setSelectedClassType('');
    if (!courseId) { setClasses([]); return; }
    try {
      const allClasses = await db.classes.filter((c: any) => !c.deleted_at).toArray();
      const matched = allClasses.filter((c: any) => String(c.course_id).trim() === String(courseId).trim());
      setClasses(matched);
    } catch (e) {
      console.error('خطا در دریافت کلاس‌های دوره:', e);
      setClasses([]);
    }
  };

  // وقتی کلاس انتخاب می‌شود، نوع آن را ثبت کن
  const onClassChange = async (classId: string) => {
    setRegForm(prev => ({ ...prev, class_id: classId }));
    if (!classId) { setSelectedClassType(''); return; }
    const cls = await db.classes.get(classId);
    setSelectedClassType((cls?.type as any) || '');
  };

  const regStats = {
    total: regTotal,
    active: regRows.filter((r: any) => r.registration.completion_status === 'in_progress').length,
    completed: regRows.filter((r: any) => r.registration.completion_status === 'completed').length,
    paid: regRows.filter((r: any) => r.registration.payment_status === 'paid').length,
  };

  const handleRegister = async () => {
    if (!regForm.student_id || !regForm.course_id || !regForm.class_id) {
      setRegError('لطفاً شاگرد، دوره و کلاس را انتخاب کنید');
      return;
    }

    // برای شهریه ماهانه، مقادیر را اعتبارسنجی کن
    let monthlyPlan: Array<{ number: number; amount: number; due_date?: string; title?: string }> | undefined;
    if (selectedClassType === 'private' && regForm.payment_mode === 'monthly') {
      if (regForm.months < 1) {
        setRegError('تعداد ماه باید حداقل ۱ باشد');
        return;
      }
      if (regForm.monthly_amount <= 0) {
        setRegError('مبلغ شهریه ماهانه را وارد کنید');
        return;
      }
      const months = Math.floor(regForm.months);
      monthlyPlan = [];
      const base = new Date();
      for (let i = 1; i <= months; i++) {
        const d = new Date(base.getFullYear(), base.getMonth() + (i - 1), 1);
        monthlyPlan.push({
          number: i,
          amount: regForm.monthly_amount,
          due_date: d.toISOString().split('T')[0],
          title: `ماه ${i}`
        });
      }
    }

    setRegSaving(true);
    setRegError('');

    const result = await registrationService.registerStudent({
      student_id: regForm.student_id,
      course_id: regForm.course_id,
      class_id: regForm.class_id,
      // مبالغ به‌صورت خودکار از دوره گرفته می‌شوند (بدون ورود دستی کاربر)
      registration_fee: 0,
      tuition_fee: 0,
      discount: 0,
      installments: monthlyPlan ? monthlyPlan.length : 1,
      installment_plan: monthlyPlan,
      initial_payment: 0,
      notes: regForm.notes
    });

    setRegSaving(false);

    if (result.success) {
      setShowRegDialog(false);
      resetRegForm();
      loadRegistrations();
    } else {
      setRegError(result.error || 'خطا در ثبت‌نام');
    }
  };

  const handleDeleteReg = async () => {
    if (!deletingReg) return;
    await registrationService.delete(deletingReg.registration.id);
    setShowDeleteRegDialog(false);
    setDeletingReg(null);
    loadRegistrations();
  };

  const regColumns: Column<RegRow>[] = [
    { key: 'registration_number', title: 'شماره ثبت‌نام', width: 120, render: (r) => <Badge variant="primary" size="sm">{r.registration.registration_number}</Badge> },
    { key: 'student', title: 'شاگرد', render: (r) => <span style={{ fontWeight: 500 }}>{r.studentName}</span> },
    { key: 'course', title: 'دوره', render: (r) => r.courseTitle },
    { key: 'class', title: 'کلاس', render: (r) => r.className },
    { key: 'teacher', title: 'استاد', render: (r) => r.teacherName },
    { key: 'registration_date', title: 'تاریخ ثبت‌نام', render: (r) => r.registration.registration_date_jalali || new Date(r.registration.registration_date).toLocaleDateString('fa-IR', { timeZone: 'Asia/Tehran' }) },
    { key: 'payment_status', title: 'وضعیت پرداخت', render: (r) => <Badge variant={r.registration.payment_status === 'paid' ? 'success' : r.registration.payment_status === 'overdue' ? 'danger' : 'warning'}>{r.registration.payment_status === 'paid' ? 'پرداخت شده' : r.registration.payment_status === 'overdue' ? 'معوق' : 'در انتظار'}</Badge> },
    { key: 'completion_status', title: 'وضعیت تکمیل', render: (r) => <Badge variant={r.registration.completion_status === 'completed' ? 'success' : 'info'}>{r.registration.completion_status === 'completed' ? 'تکمیل شده' : 'در حال انجام'}</Badge> },
    { key: 'actions', title: 'عملیات', render: (r) => <div style={{ display: 'flex', gap: '0.5rem' }}><button onClick={(e) => { e.stopPropagation(); setDeletingReg(r); setShowDeleteRegDialog(true); }} style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--font-size-sm)' }}>حذف</button></div> },
  ];

  const openNewRegDialog = async () => {
    const freshClasses = await classService.getAll();
    setAllCls(freshClasses);
    setClasses(freshClasses);
    setSelectedClassType('');
    resetRegForm();
    setRegError('');
    setShowRegDialog(true);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 40,
    padding: '0 0.75rem',
    background: 'var(--color-input)',
    border: 'var(--border-default)',
    borderRadius: 'var(--radius-input)',
    color: 'var(--color-text-primary)',
    fontFamily: 'inherit',
    fontSize: 'var(--font-size-md)'
  };

  const fieldLabel: React.CSSProperties = {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 500,
    display: 'block',
    marginBottom: '0.375rem',
    color: 'var(--color-text-secondary)'
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>ثبت‌نام‌ها</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button onClick={openNewRegDialog}>پیش‌ثبت نام جدید</Button>
        </div>
      </div>

      {/* Registration Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <StatCard title="کل ثبت‌نام‌ها" value={regStats.total} change={0} icon={<RegIcon />} color="var(--color-primary-400)" />
        <StatCard title="ثبت‌نام‌های فعال" value={regStats.active} change={0} icon={<ActiveIcon />} color="var(--color-success)" />
        <StatCard title="تکمیل شده" value={regStats.completed} change={0} icon={<CompleteIcon />} color="var(--color-info)" />
        <StatCard title="پرداخت شده" value={regStats.paid} change={0} icon={<PaidIcon />} color="var(--color-warning)" />
      </div>

      <Card padding="0" style={{ marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: 'var(--border-thin)' }}><h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>ثبت‌نام‌ها</h3></div>
        <Table columns={regColumns} data={regRows} rowKey={(r) => r.registration.id} isLoading={loading}
          emptyState={<EmptyState title="هیچ ثبت‌نامی انجام نشده است" description="برای ثبت‌نام دانشجوی جدید کلیک کنید" action={<Button onClick={openNewRegDialog}>پیش‌ثبت نام جدید</Button>} />}
        />
        <Pagination page={regPage} perPage={20} total={regTotal} label="ثبت‌نام" onPageChange={setRegPage} onPerPageChange={() => {}} />
      </Card>

      {/* Registration Dialog */}
      <Modal
        isOpen={showRegDialog}
        onClose={() => setShowRegDialog(false)}
        title="ثبت‌نام جدید"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowRegDialog(false)}>انصراف</Button>
            <Button onClick={handleRegister} loading={regSaving}>ثبت ثبت‌نام</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {regError && (
            <div style={{ padding: '0.75rem', background: 'var(--color-danger-light)', color: 'var(--color-danger)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}>
              {regError}
            </div>
          )}

          <Select
            label="شاگرد"
            placeholder="انتخاب شاگرد..."
            options={students.map((s: any) => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))}
            value={regForm.student_id}
            onChange={(v) => setRegForm({ ...regForm, student_id: v })}
          />

          <Select
            label="دوره"
            placeholder="انتخاب دوره..."
            options={courses.map((c: any) => ({ value: c.id, label: `${c.title} (${c.code})` }))}
            value={regForm.course_id}
            onChange={(v) => onCourseChange(v)}
          />

          <Select
            label="کلاس"
            placeholder="انتخاب کلاس..."
            options={(classes.length ? classes : allCls.filter((c: any) => String(c.course_id).trim() === String(regForm.course_id).trim())).map((c: any) => ({ value: c.id, label: `${c.code}${c.type === 'private' ? ' (خصوصی)' : ''} | ظرفیت ${c.capacity} نفر` }))}
            value={regForm.class_id}
            onChange={(v) => onClassChange(v)}
          />

          {/* شیوه پرداخت شهریه — فقط برای کلاس خصوصی */}
          {selectedClassType === 'private' && (
            <div style={{ padding: '0.9rem', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', border: 'var(--border-default)' }}>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '0.75rem' }}>شیوه پرداخت شهریه (کلاس خصوصی)</div>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                <button type="button" onClick={() => setRegForm({ ...regForm, payment_mode: 'once' })}
                  style={{ flex: 1, padding: '0.7rem', borderRadius: 'var(--radius-md)', border: regForm.payment_mode === 'once' ? '2px solid var(--color-primary)' : 'var(--border-default)', background: regForm.payment_mode === 'once' ? 'var(--color-sidebar-active)' : 'var(--color-surface)', color: 'var(--color-text-primary)', fontFamily: 'inherit', cursor: 'pointer' }}>
                  یک‌جا
                </button>
                <button type="button" onClick={() => setRegForm({ ...regForm, payment_mode: 'monthly' })}
                  style={{ flex: 1, padding: '0.7rem', borderRadius: 'var(--radius-md)', border: regForm.payment_mode === 'monthly' ? '2px solid var(--color-primary)' : 'var(--border-default)', background: regForm.payment_mode === 'monthly' ? 'var(--color-sidebar-active)' : 'var(--color-surface)', color: 'var(--color-text-primary)', fontFamily: 'inherit', cursor: 'pointer' }}>
                  ماهانه
                </button>
              </div>

              {regForm.payment_mode === 'monthly' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={fieldLabel}>تعداد ماه</label>
                    <input type="number" min="1" value={regForm.months} onChange={(e) => setRegForm({ ...regForm, months: Math.max(1, Number(e.target.value)) })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={fieldLabel}>مبلغ هر ماه (تومان)</label>
                    <input type="number" min="0" value={regForm.monthly_amount} onChange={(e) => setRegForm({ ...regForm, monthly_amount: Number(e.target.value) })} style={inputStyle} />
                  </div>
                  <div style={{ gridColumn: '1 / -1', padding: '0.6rem 0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    مجموع: <b style={{ color: 'var(--color-text-primary)' }}>{money((Math.floor(regForm.months) || 0) * (regForm.monthly_amount || 0))}</b> در {Math.floor(regForm.months) || 0} ماه (ماهانه {money(regForm.monthly_amount)})
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label style={fieldLabel}>یادداشت</label>
            <textarea value={regForm.notes} onChange={(e) => setRegForm({ ...regForm, notes: e.target.value })}
              style={{ width: '100%', minHeight: 70, padding: '0.75rem', background: 'var(--color-input)', border: 'var(--border-default)', borderRadius: 'var(--radius-input)', color: 'var(--color-text-primary)', fontFamily: 'inherit', resize: 'vertical' }} />
          </div>
        </div>
      </Modal>

      {/* Delete Registration Confirm */}
      <Modal isOpen={showDeleteRegDialog} onClose={() => setShowDeleteRegDialog(false)} title="حذف ثبت‌نام" size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowDeleteRegDialog(false)}>انصراف</Button><Button variant="danger" onClick={handleDeleteReg}>حذف</Button></>}
      >
        <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>آیا از حذف ثبت‌نام «{deletingReg?.studentName}» از «{deletingReg?.className}» اطمینان دارید؟</p>
      </Modal>
    </div>
  );
};

// Icon components
function RegIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>; }
function ActiveIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function CompleteIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>; }
function PaidIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>; }
