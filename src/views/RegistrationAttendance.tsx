/**
 * Rumiland Academy — Registration & Attendance Page (fully resolved + connected)
 */
import React, { useEffect, useState, useCallback } from 'react';
import { registrationService, studentService, courseService, classService } from '@/services';
import { Card, EmptyState, Table, Pagination, Badge, Modal, StatCard } from '@/components/Layout';
import { Button, Select, Input } from '@/components/Basic';
import type { Column } from '@/components/Layout';
import { db } from '@/db/schema';

interface RegRow { registration: any; studentName: string; courseTitle: string; className: string; teacherName: string; }

export const RegistrationAttendancePage: React.FC = () => {
  // Registration state
  const [regRows, setRegRows] = useState<RegRow[]>([]);
  const [regTotal, setRegTotal] = useState(0);
  const [regPage, setRegPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showRegDialog, setShowRegDialog] = useState(false);
  const [showEditRegDialog, setShowEditRegDialog] = useState(false);
  const [showDeleteRegDialog, setShowDeleteRegDialog] = useState(false);
  const [editingReg, setEditingReg] = useState<any>(null);
  const [deletingReg, setDeletingReg] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [allCls, setAllCls] = useState<any[]>([]);
  const [regForm, setRegForm] = useState({
    student_id: '',
    course_id: '',
    class_id: '',
    registration_fee: 0,
    tuition_fee: 0,
    discount: 0,
    installments: 1 as 1 | 2,
    first_payment: 0,
    first_payment_method: 'cash' as 'cash' | 'card' | 'transfer' | 'check',
    first_due_date: '',
    second_due_date: '',
    notes: ''
  });
  const [regSaving, setRegSaving] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSearch, setRegSearch] = useState('');
  const [regStatFilter, setRegStatFilter] = useState('');

  useEffect(() => { loadRegistrations(); loadStudents(); loadCourses(); loadAllClasses(); }, [regPage]);

  const loadRegistrations = async () => {
    setLoading(true);
    const r = await registrationService.getRegistrationsResolved({ page: regPage, perPage: 20 });
    // Enrich with teacher names
    const enriched = await Promise.all(r.data.map(async (item: any) => {
      const cls = await db.classes.get(item.registration.class_id);
      const teacher = cls ? await db.teachers.get(cls.teacher_id) : null;
      return { ...item, teacherName: teacher ? `${teacher.first_name} ${teacher.last_name}` : '--' };
    }));
    setRegRows(enriched);
    setRegTotal(r.total); setLoading(false);
  };
  const loadStudents = async () => { setStudents(await studentService.getAll()); };
  const loadCourses = async () => { setCourses(await courseService.getAll()); };
  const loadAllClasses = async () => {
    const cls = await classService.getAll();
    setAllCls(cls);
  };

  // Cascade: when course changes, filter classes to only those belonging to that course
  const onCourseChange = async (courseId: string) => {
    const course = courseId
      ? await db.courses.get(courseId)
      : null;

    setRegForm(prev => ({
      ...prev,
      course_id: courseId,
      class_id: '',
      tuition_fee: Number(course?.tuition_fee || 0),
      registration_fee: Number(course?.registration_fee || 0)
    }));

    if (!courseId) {
      setClasses([]);
      return;
    }

    try {
      // دریافت مستقیم کلاس‌ها از دیتابیس
      const allClasses = await db.classes
        .filter((c: any) => !c.deleted_at)
        .toArray();

      const matchedClasses = allClasses.filter(
        (c: any) =>
          String(c.course_id).trim() === String(courseId).trim()
      );

      setClasses(matchedClasses);
    } catch (error) {
      console.error('خطا در دریافت کلاس‌های دوره:', error);
      setClasses([]);
    }
  };

  // Registration stats
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

    const totalAmount = Math.max(
      0,
      Number(regForm.tuition_fee || 0) +
      Number(regForm.registration_fee || 0) -
      Number(regForm.discount || 0)
    );

    const firstAmount =
      regForm.installments === 1
        ? totalAmount
        : Math.max(0, Number(regForm.first_payment || 0));

    const secondAmount =
      regForm.installments === 2
        ? Math.max(0, totalAmount - firstAmount)
        : 0;

    if (regForm.installments === 2 && !regForm.second_due_date) {
      setRegError('تاریخ سررسید قسط دوم را وارد کنید');
      return;
    }

    if (firstAmount > totalAmount) {
      setRegError('مبلغ قسط اول نمی‌تواند بیشتر از مبلغ نهایی باشد');
      return;
    }

    setRegSaving(true);
    setRegError('');

    const plan = regForm.installments === 1
      ? [{
          number: 1,
          amount: totalAmount,
          due_date: regForm.first_due_date || new Date().toISOString().split('T')[0],
          title: 'قسط کامل'
        }]
      : [
          {
            number: 1,
            amount: firstAmount,
            due_date: regForm.first_due_date || new Date().toISOString().split('T')[0],
            title: 'قسط اول'
          },
          {
            number: 2,
            amount: secondAmount,
            due_date: regForm.second_due_date,
            title: 'قسط دوم'
          }
        ];

    const result = await registrationService.registerStudent({
      student_id: regForm.student_id,
      course_id: regForm.course_id,
      class_id: regForm.class_id,
      registration_fee: regForm.registration_fee,
      tuition_fee: regForm.tuition_fee,
      discount: regForm.discount,
      installments: regForm.installments,
      installment_plan: plan,
      initial_payment: firstAmount,
      initial_payment_method: regForm.first_payment_method,
      notes: regForm.notes
    });

    setRegSaving(false);

    if (result.success) {
      setShowRegDialog(false);
      setRegForm({
        student_id: '',
        course_id: '',
        class_id: '',
        registration_fee: 0,
        tuition_fee: 0,
        discount: 0,
        installments: 1,
        first_payment: 0,
        first_payment_method: 'cash',
        first_due_date: '',
        second_due_date: '',
        notes: ''
      });
      loadRegistrations();
    } else {
      setRegError(result.error || 'خطا در ثبت‌نام');
    }
  };

  const handleEditReg = async () => {
    if (!editingReg) return;
    setRegSaving(true);
    await db.registrations.update(editingReg.registration.id, {
      registration_fee: regForm.registration_fee, discount: regForm.discount,
      notes: regForm.notes, updated_at: new Date().toISOString(),
    });
    setRegSaving(false); setShowEditRegDialog(false); setEditingReg(null);
    setRegForm({
      student_id: '',
      course_id: '',
      class_id: '',
      registration_fee: 0,
      tuition_fee: 0,
      discount: 0,
      installments: 1,
      first_payment: 0,
      first_payment_method: 'cash',
      first_due_date: '',
      second_due_date: '',
      notes: ''
    });
    loadRegistrations();
  };

  const handleDeleteReg = async () => {
    if (!deletingReg) return;
    await registrationService.delete(deletingReg.registration.id);
    setShowDeleteRegDialog(false); setDeletingReg(null); loadRegistrations();
  };

  const openEditReg = (row: RegRow) => {
    setEditingReg(row);
    setRegForm({
      student_id: row.registration.student_id,
      course_id: row.registration.course_id,
      class_id: row.registration.class_id,
      registration_fee: row.registration.registration_fee || 0,
      tuition_fee: row.registration.tuition_fee || 0,
      discount: row.registration.discount || 0,
      installments: row.registration.installments === 2 ? 2 : 1,
      first_payment: row.registration.paid_amount || 0,
      first_payment_method: 'cash',
      first_due_date: '',
      second_due_date: '',
      notes: row.registration.notes || ''
    });
    setShowEditRegDialog(true);
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
    { key: 'actions', title: 'عملیات', render: (r) => <div style={{ display: 'flex', gap: '0.5rem' }}><button onClick={(e) => { e.stopPropagation(); openEditReg(r); }} style={{ color: 'var(--color-primary-400)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--font-size-sm)' }}>ویرایش</button><button onClick={(e) => { e.stopPropagation(); setDeletingReg(r); setShowDeleteRegDialog(true); }} style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--font-size-sm)' }}>حذف</button></div> },
  ];

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>ثبت‌نام‌ها</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button onClick={async () => {
            const freshClasses = await classService.getAll();
            setAllCls(freshClasses);
            setRegForm({
              student_id: '',
              course_id: '',
              class_id: '',
              registration_fee: 0,
              tuition_fee: 0,
              discount: 0,
              installments: 1,
              first_payment: 0,
              first_payment_method: 'cash',
              first_due_date: '',
              second_due_date: '',
              notes: ''
            });
            setClasses(freshClasses);
            setRegError('');
            setShowRegDialog(true);
          }}>پیش‌ثبت نام جدید</Button>
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
          emptyState={<EmptyState title="هیچ ثبت‌نامی انجام نشده است" description="برای ثبت‌نام دانشجوی جدید کلیک کنید" action={<Button onClick={async () => {
            const freshClasses = await classService.getAll();
            setAllCls(freshClasses);
            setRegForm({
              student_id: '',
              course_id: '',
              class_id: '',
              registration_fee: 0,
              tuition_fee: 0,
              discount: 0,
              installments: 1,
              first_payment: 0,
              first_payment_method: 'cash',
              first_due_date: '',
              second_due_date: '',
              notes: ''
            });
            setClasses(freshClasses);
            setRegError('');
            setShowRegDialog(true);
          }}>پیش‌ثبت نام جدید</Button>} />}
        />
        <Pagination page={regPage} perPage={20} total={regTotal} label="ثبت‌نام" onPageChange={setRegPage} onPerPageChange={() => {}} />
      </Card>

      {/* Registration Dialog */}
      <Modal
        isOpen={showRegDialog}
        onClose={() => setShowRegDialog(false)}
        title="ثبت‌نام جدید و مدیریت شهریه"
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
            <div style={{
              padding: '0.75rem',
              background: 'var(--color-danger-light)',
              color: 'var(--color-danger)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-sm)'
            }}>
              {regError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Select
              label="شاگرد"
              placeholder="انتخاب شاگرد..."
              options={students.map((s: any) => ({
                value: s.id,
                label: `${s.first_name} ${s.last_name}`
              }))}
              value={regForm.student_id}
              onChange={(v) => setRegForm({ ...regForm, student_id: v })}
            />

            <Select
              label="دوره"
              placeholder="انتخاب دوره..."
              options={courses.map((c: any) => ({
                value: c.id,
                label: `${c.title} (${c.code})`
              }))}
              value={regForm.course_id}
              onChange={(v) => onCourseChange(v)}
            />

            <Select
              label="کلاس"
              placeholder="انتخاب کلاس..."
              options={(classes.length
                ? classes
                : allCls.filter((c: any) =>
                    String(c.course_id).trim() === String(regForm.course_id).trim()
                  )
              ).map((c: any) => ({
                value: c.id,
                label: `${c.code} | ${c.capacity} نفر`
              }))}
              value={regForm.class_id}
              onChange={(v) => setRegForm({ ...regForm, class_id: v })}
            />

            <Input
              label="شهریه دوره (تومان)"
              type="number"
              value={String(regForm.tuition_fee)}
              onChange={(e) => setRegForm({
                ...regForm,
                tuition_fee: Number(e.target.value)
              })}
            />

            <Input
              label="هزینه ثبت‌نام (تومان)"
              type="number"
              value={String(regForm.registration_fee)}
              onChange={(e) => setRegForm({
                ...regForm,
                registration_fee: Number(e.target.value)
              })}
            />

            <Input
              label="تخفیف (تومان)"
              type="number"
              value={String(regForm.discount)}
              onChange={(e) => setRegForm({
                ...regForm,
                discount: Number(e.target.value)
              })}
            />
          </div>

          <div style={{
            padding: '1rem',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: 'var(--border-default)'
          }}>
            <div style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-tertiary)',
              marginBottom: '0.35rem'
            }}>
              مبلغ نهایی قابل پرداخت
            </div>

            <div style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 700,
              color: 'var(--color-primary-400)'
            }}>
              {Math.max(
                0,
                Number(regForm.tuition_fee || 0) +
                Number(regForm.registration_fee || 0) -
                Number(regForm.discount || 0)
              ).toLocaleString('fa-IR')} تومان
            </div>
          </div>

          <div>
            <div style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 600,
              marginBottom: '0.75rem'
            }}>
              نحوه پرداخت
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setRegForm({
                  ...regForm,
                  installments: 1,
                  first_payment: Math.max(
                    0,
                    Number(regForm.tuition_fee || 0) +
                    Number(regForm.registration_fee || 0) -
                    Number(regForm.discount || 0)
                  )
                })}
                style={{
                  flex: 1,
                  padding: '0.8rem',
                  borderRadius: 'var(--radius-md)',
                  border: regForm.installments === 1
                    ? '2px solid var(--color-primary)'
                    : 'var(--border-default)',
                  background: regForm.installments === 1
                    ? 'var(--color-sidebar-active)'
                    : 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'inherit',
                  cursor: 'pointer'
                }}
              >
                پرداخت یک‌جا
              </button>

              <button
                type="button"
                onClick={() => {
                  const total = Math.max(
                    0,
                    Number(regForm.tuition_fee || 0) +
                    Number(regForm.registration_fee || 0) -
                    Number(regForm.discount || 0)
                  );
                  setRegForm({
                    ...regForm,
                    installments: 2,
                    first_payment: Math.floor(total / 2)
                  });
                }}
                style={{
                  flex: 1,
                  padding: '0.8rem',
                  borderRadius: 'var(--radius-md)',
                  border: regForm.installments === 2
                    ? '2px solid var(--color-primary)'
                    : 'var(--border-default)',
                  background: regForm.installments === 2
                    ? 'var(--color-sidebar-active)'
                    : 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'inherit',
                  cursor: 'pointer'
                }}
              >
                دو قسط
              </button>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: regForm.installments === 2 ? '1fr 1fr' : '1fr',
            gap: '1rem'
          }}>
            <div style={{
              padding: '0.9rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-secondary)',
              border: 'var(--border-default)'
            }}>
              <div style={{
                fontWeight: 600,
                marginBottom: '0.75rem'
              }}>
                {regForm.installments === 1 ? 'پرداخت کامل' : 'قسط اول'}
              </div>

              {regForm.installments === 2 && (
                <Input
                  label="مبلغ قسط اول"
                  type="number"
                  value={String(regForm.first_payment)}
                  onChange={(e) => setRegForm({
                    ...regForm,
                    first_payment: Number(e.target.value)
                  })}
                />
              )}

              <div style={{ marginTop: '0.75rem' }}>
                <Input
                  label="تاریخ سررسید"
                  value={regForm.first_due_date}
                  placeholder="YYYY-MM-DD"
                  onChange={(e) => setRegForm({
                    ...regForm,
                    first_due_date: e.target.value
                  })}
                />
              </div>

              <div style={{
                marginTop: '0.75rem',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)'
              }}>
                روش پرداخت
              </div>

              <select
                value={regForm.first_payment_method}
                onChange={(e) => setRegForm({
                  ...regForm,
                  first_payment_method: e.target.value as any
                })}
                style={{
                  width: '100%',
                  height: 40,
                  marginTop: '0.35rem',
                  padding: '0 0.75rem',
                  background: 'var(--color-input)',
                  border: 'var(--border-default)',
                  borderRadius: 'var(--radius-input)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'inherit'
                }}
              >
                <option value="cash">نقدی</option>
                <option value="card">کارت</option>
                <option value="transfer">انتقال بانکی</option>
                <option value="check">چک</option>
              </select>
            </div>

            {regForm.installments === 2 && (
              <div style={{
                padding: '0.9rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-secondary)',
                border: 'var(--border-default)'
              }}>
                <div style={{
                  fontWeight: 600,
                  marginBottom: '0.75rem'
                }}>
                  قسط دوم
                </div>

                <div style={{
                  fontSize: 'var(--font-size-lg)',
                  fontWeight: 700,
                  marginBottom: '0.75rem'
                }}>
                  {Math.max(
                    0,
                    (
                      Number(regForm.tuition_fee || 0) +
                      Number(regForm.registration_fee || 0) -
                      Number(regForm.discount || 0)
                    ) - Number(regForm.first_payment || 0)
                  ).toLocaleString('fa-IR')} تومان
                </div>

                <Input
                  label="تاریخ سررسید قسط دوم"
                  value={regForm.second_due_date}
                  placeholder="YYYY-MM-DD"
                  onChange={(e) => setRegForm({
                    ...regForm,
                    second_due_date: e.target.value
                  })}
                />
              </div>
            )}
          </div>

          <div>
            <label style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
              display: 'block',
              marginBottom: '0.375rem'
            }}>
              یادداشت
            </label>

            <textarea
              value={regForm.notes}
              onChange={(e) => setRegForm({
                ...regForm,
                notes: e.target.value
              })}
              style={{
                width: '100%',
                minHeight: 70,
                padding: '0.75rem',
                background: 'var(--color-input)',
                border: 'var(--border-default)',
                borderRadius: 'var(--radius-input)',
                color: 'var(--color-text-primary)',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>
        </div>
      </Modal>

      {/* Edit Registration Dialog */}
      <Modal isOpen={showEditRegDialog} onClose={() => { setShowEditRegDialog(false); setEditingReg(null); }} title="ویرایش ثبت‌نام" size="md"
        footer={<><Button variant="secondary" onClick={() => { setShowEditRegDialog(false); setEditingReg(null); }}>انصراف</Button><Button onClick={handleEditReg} loading={regSaving}>ذخیره</Button></>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '0.5rem 0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            {editingReg?.studentName} | {editingReg?.courseTitle} | {editingReg?.className}
          </div>
          <Input label="هزینه ثبت‌نام (تومان)" type="number" value={String(regForm.registration_fee)} onChange={(e) => setRegForm({ ...regForm, registration_fee: Number(e.target.value) })} />
          <Input label="تخفیف (تومان)" type="number" value={String(regForm.discount)} onChange={(e) => setRegForm({ ...regForm, discount: Number(e.target.value) })} />
          <div><label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>یادداشت</label><textarea value={regForm.notes} onChange={(e) => setRegForm({ ...regForm, notes: e.target.value })} style={{ width: '100%', minHeight: 60, padding: '0.75rem', background: 'var(--color-input)', border: 'var(--border-default)', borderRadius: 'var(--radius-input)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-md)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} /></div>
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