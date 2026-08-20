/**
 * Rumiland Academy — صفحه ثبت‌نام‌ها
 * امکانات:
 *  - ثبت‌نام ساده (شاگرد، دوره، کلاس، استاد، یادداشت) بدون بخش پرداخت
 *  - انتخاب استاد کلاس (پیش‌فرض = استاد فعلی کلاس؛ در صورت تغییر، teacher_id کلاس به‌روزرسانی می‌شود)
 *  - آپلود/ویرایش عکس پروفایل شاگرد (اختیاری، base64 در student.avatar_url)
 *  - شهریه ماهانه برای کلاس خصوصی (تعداد ماه × مبلغ هر ماه)
 *  - عملیات: مشاهده جزئیات، ویرایش، حذف
 */
import React, { useEffect, useState, useRef } from 'react';
import { registrationService, studentService, courseService, classService, teacherService } from '@/services';
import { persistRegistrationFigures } from '@/services/finance';
import { Card, EmptyState, Table, Pagination, Badge, Modal, StatCard } from '@/components/Layout';
import { Button, Select, SearchableSelect } from '@/components/Basic';
import type { Column } from '@/components/Layout';
import { db } from '@/db/schema';

interface RegRow { registration: any; studentName: string; courseTitle: string; className: string; teacherName: string; }

const money = (v: number) => `${Math.max(0, Number(v || 0)).toLocaleString('fa-IR')} تومان`;

interface RegPageProps { onViewProfile?: (studentId: string) => void; }

export const RegistrationAttendancePage: React.FC<RegPageProps> = ({ onViewProfile }) => {
  const [regRows, setRegRows] = useState<RegRow[]>([]);
  const [regTotal, setRegTotal] = useState(0);
  const [regPage, setRegPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showRegDialog, setShowRegDialog] = useState(false);
  const [showEditRegDialog, setShowEditRegDialog] = useState(false);
  const [editingReg, setEditingReg] = useState<RegRow | null>(null);
  const [showDeleteRegDialog, setShowDeleteRegDialog] = useState(false);
  const [deletingReg, setDeletingReg] = useState<RegRow | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [allCls, setAllCls] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  const [regForm, setRegForm] = useState({
    student_id: '',
    course_id: '',
    class_id: '',
    teacher_id: '',
    payment_mode: 'once' as 'once' | 'monthly',
    months: 1,
    monthly_amount: 0,
    notes: ''
  });
  const [avatarPreview, setAvatarPreview] = useState<string>(''); // base64 عکس شاگرد
  const [regSaving, setRegSaving] = useState(false);
  const [regError, setRegError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedClassType, setSelectedClassType] = useState<'group' | 'private' | ''>('');

  useEffect(() => { loadAll(); }, [regPage]);

  const loadAll = () => {
    loadRegistrations();
    loadStudents();
    loadCourses();
    loadAllClasses();
    loadTeachers();
  };

  const loadRegistrations = async () => {
    setLoading(true);
    const r = await registrationService.getRegistrationsResolved({ page: regPage, perPage: 100 });
    const enriched = await Promise.all(r.data.map(async (item: any) => {
      // وضعیت مالی ثبت‌نام را بازمحاسبه کن تا paid/pending/overdue همیشه درست باشد
      let reg = item.registration;
      try {
        const figures = await persistRegistrationFigures(reg.id);
        reg = { ...reg, ...figures, payment_status: figures.payment_status };
      } catch (e) { /* نادیده بگیر؛ مقدار ذخیره‌شده استفاده می‌شود */ }
      const cls = await db.classes.get(reg.class_id);
      const teacher = cls ? await db.teachers.get(cls.teacher_id) : null;
      return { ...item, registration: reg, teacherName: teacher ? `${teacher.first_name} ${teacher.last_name}` : '--' };
    }));
    setRegRows(enriched);
    setRegTotal(r.total);
    setLoading(false);
  };
  const loadStudents = async () => { setStudents(await studentService.getAll()); };
  const loadCourses = async () => { setCourses(await courseService.getAll()); };
  const loadAllClasses = async () => { setAllCls(await classService.getAll()); };
  const loadTeachers = async () => { setTeachers(await teacherService.getAll()); };

  const resetRegForm = (extra: Partial<typeof regForm> = {}) => {
    setRegForm({ student_id: '', course_id: '', class_id: '', teacher_id: '', payment_mode: 'once', months: 1, monthly_amount: 0, notes: '', ...extra });
    setAvatarPreview('');
    setSelectedClassType('');
  };

  const onCourseChange = async (courseId: string) => {
    setRegForm(prev => ({ ...prev, course_id: courseId, class_id: '', teacher_id: '' }));
    setSelectedClassType('');
    if (!courseId) { setClasses([]); return; }
    try {
      const allClasses = await db.classes.filter((c: any) => !c.deleted_at).toArray();
      const matched = allClasses.filter((c: any) => String(c.course_id).trim() === String(courseId).trim());
      setClasses(matched);
    } catch (e) { console.error('خطا در دریافت کلاس‌های دوره:', e); setClasses([]); }
  };

  const onClassChange = async (classId: string) => {
    setRegForm(prev => ({ ...prev, class_id: classId }));
    if (!classId) { setSelectedClassType(''); setRegForm(prev => ({ ...prev, teacher_id: '' })); return; }
    const cls = await db.classes.get(classId);
    const type = (cls?.type as any) || '';
    setSelectedClassType(type);
    // استاد پیش‌فرض = استاد فعلی کلاس
    setRegForm(prev => ({ ...prev, teacher_id: cls?.teacher_id || '' }));
  };

  // آپلود عکس پروفایل شاگرد (base64)
  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(String(reader.result || ''));
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  const handleRegister = async () => {
    if (!regForm.student_id || !regForm.course_id || !regForm.class_id) {
      setRegError('لطفاً شاگرد، دوره و کلاس را انتخاب کنید');
      return;
    }
    let monthlyPlan: Array<{ number: number; amount: number; due_date?: string; title?: string }> | undefined;
    if (selectedClassType === 'private' && regForm.payment_mode === 'monthly') {
      if (regForm.months < 1) { setRegError('تعداد ماه باید حداقل ۱ باشد'); return; }
      if (regForm.monthly_amount <= 0) { setRegError('مبلغ شهریه ماهانه را وارد کنید'); return; }
      const months = Math.floor(regForm.months);
      monthlyPlan = [];
      const base = new Date();
      for (let i = 1; i <= months; i++) {
        const d = new Date(base.getFullYear(), base.getMonth() + (i - 1), 1);
        monthlyPlan.push({ number: i, amount: regForm.monthly_amount, due_date: d.toISOString().split('T')[0], title: `ماه ${i}` });
      }
    }

    setRegSaving(true);
    setRegError('');

    // 1) ذخیره عکس پروفایل شاگرد (اختیاری)
    if (avatarPreview) {
      await studentService.update(regForm.student_id, { avatar_url: avatarPreview } as any);
    }

    // 2) اگر استاد انتخاب شده و با استاد فعلی کلاس فرق دارد، teacher_id کلاس را آپدیت کن
    if (regForm.teacher_id) {
      const cls = await db.classes.get(regForm.class_id);
      if (cls && cls.teacher_id !== regForm.teacher_id) {
        await db.classes.update(regForm.class_id, { teacher_id: regForm.teacher_id, updated_at: new Date().toISOString() } as any);
      }
    }

    const result = await registrationService.registerStudent({
      student_id: regForm.student_id,
      course_id: regForm.course_id,
      class_id: regForm.class_id,
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

  // ===== ویرایش ثبت‌نام =====
  const openEditReg = async (row: RegRow) => {
    setEditingReg(row);
    const cls = await db.classes.get(row.registration.class_id);
    const student = await db.students.get(row.registration.student_id);
    setRegForm({
      student_id: row.registration.student_id,
      course_id: row.registration.course_id,
      class_id: row.registration.class_id,
      teacher_id: cls?.teacher_id || '',
      payment_mode: row.registration.installment_plan_json ? 'monthly' : 'once',
      months: (row.registration.installments || 1) > 1 ? row.registration.installments : 1,
      monthly_amount: 0,
      notes: row.registration.notes || ''
    });
    setAvatarPreview(student?.avatar_url || '');
    setSelectedClassType((cls?.type as any) || '');
    // آماده‌سازی کلاس‌های دوره
    await onCourseChange(row.registration.course_id);
    setShowEditRegDialog(true);
  };

  const handleEditReg = async () => {
    if (!editingReg) return;
    if (!regForm.student_id || !regForm.course_id || !regForm.class_id) {
      setRegError('لطفاً شاگرد، دوره و کلاس را انتخاب کنید');
      return;
    }
    setRegSaving(true);
    setRegError('');

    // عکس پروفایل
    if (avatarPreview) {
      await studentService.update(regForm.student_id, { avatar_url: avatarPreview } as any);
    }
    // استاد کلاس
    if (regForm.teacher_id) {
      const cls = await db.classes.get(regForm.class_id);
      if (cls && cls.teacher_id !== regForm.teacher_id) {
        await db.classes.update(regForm.class_id, { teacher_id: regForm.teacher_id, updated_at: new Date().toISOString() } as any);
      }
    }
    // به‌روزرسانی ثبت‌نام
    await registrationService.update(editingReg.registration.id, {
      student_id: regForm.student_id,
      course_id: regForm.course_id,
      class_id: regForm.class_id,
      notes: regForm.notes
    } as any);

    setRegSaving(false);
    setShowEditRegDialog(false);
    setEditingReg(null);
    resetRegForm();
    loadRegistrations();
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
    { key: 'payment_status', title: 'وضعیت پرداخت', render: (r) => { const st = r.registration.payment_status; return <Badge variant={st === 'paid' ? 'success' : st === 'overdue' ? 'danger' : st === 'partial' ? 'info' : 'warning'}>{st === 'paid' ? 'پرداخت شده' : st === 'overdue' ? 'معوق' : st === 'partial' ? 'پرداخت ناقص' : 'در انتظار'}</Badge>; } },
    {
      key: 'actions', title: 'عملیات', render: (r) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={(e) => { e.stopPropagation(); onViewProfile?.(r.registration.student_id); }} style={{ background: 'none', border: 'none', color: 'var(--color-accent-400)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontFamily: 'inherit' }}>مشاهده</button>
          <button onClick={(e) => { e.stopPropagation(); openEditReg(r); }} style={{ background: 'none', border: 'none', color: 'var(--color-primary-400)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontFamily: 'inherit' }}>ویرایش</button>
          <button onClick={(e) => { e.stopPropagation(); setDeletingReg(r); setShowDeleteRegDialog(true); }} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontFamily: 'inherit' }}>حذف</button>
        </div>
      ),
    },
  ];

  const openNewRegDialog = async () => {
    setAllCls(await classService.getAll());
    setClasses(await classService.getAll());
    resetRegForm();
    setRegError('');
    setShowRegDialog(true);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 40, padding: '0 0.75rem', background: 'var(--color-input)',
    border: 'var(--border-default)', borderRadius: 'var(--radius-input)',
    color: 'var(--color-text-primary)', fontFamily: 'inherit', fontSize: 'var(--font-size-md)', boxSizing: 'border-box'
  };
  const fieldLabel: React.CSSProperties = {
    fontSize: 'var(--font-size-sm)', fontWeight: 500, display: 'block',
    marginBottom: '0.375rem', color: 'var(--color-text-secondary)'
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>ثبت‌نام‌ها</h1>
        <Button onClick={openNewRegDialog}>ثبت‌نام جدید</Button>
      </div>

      <Card padding="0">
        <Table columns={regColumns} data={regRows} rowKey={(r) => r.registration.id} isLoading={loading}
          emptyState={<EmptyState title="هیچ ثبت‌نامی انجام نشده است" description="برای ثبت‌نام شاگرد جدید کلیک کنید" action={<Button onClick={openNewRegDialog}>ثبت‌نام جدید</Button>} />}
        />
        <Pagination page={regPage} perPage={100} total={regTotal} label="ثبت‌نام" onPageChange={setRegPage} onPerPageChange={() => {}} />
      </Card>

      {/* ===== Modal ثبت‌نام جدید ===== */}
      <Modal isOpen={showRegDialog} onClose={() => setShowRegDialog(false)} title="ثبت‌نام جدید" size="lg"
        footer={<><Button variant="secondary" onClick={() => setShowRegDialog(false)}>انصراف</Button><Button onClick={handleRegister} loading={regSaving}>ثبت ثبت‌نام</Button></>}
      >
        <RegistrationFormFields
          regForm={regForm} setRegForm={setRegForm}
          students={students} courses={courses} classes={classes} allCls={allCls} teachers={teachers}
          onCourseChange={onCourseChange} onClassChange={onClassChange}
          selectedClassType={selectedClassType} avatarPreview={avatarPreview}
          handleAvatarFile={handleAvatarFile} fileInputRef={fileInputRef}
          regError={regError}
        />
      </Modal>

      {/* ===== Modal ویرایش ثبت‌نام ===== */}
      <Modal isOpen={showEditRegDialog} onClose={() => setShowEditRegDialog(false)} title="ویرایش ثبت‌نام" size="lg"
        footer={<><Button variant="secondary" onClick={() => setShowEditRegDialog(false)}>انصراف</Button><Button onClick={handleEditReg} loading={regSaving}>ذخیره تغییرات</Button></>}
      >
        <RegistrationFormFields
          regForm={regForm} setRegForm={setRegForm}
          students={students} courses={courses} classes={classes} allCls={allCls} teachers={teachers}
          onCourseChange={onCourseChange} onClassChange={onClassChange}
          selectedClassType={selectedClassType} avatarPreview={avatarPreview}
          handleAvatarFile={handleAvatarFile} fileInputRef={fileInputRef}
          regError={regError}
        />
      </Modal>

      {/* ===== Modal حذف ===== */}
      <Modal isOpen={showDeleteRegDialog} onClose={() => setShowDeleteRegDialog(false)} title="حذف ثبت‌نام" size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowDeleteRegDialog(false)}>انصراف</Button><Button variant="danger" onClick={handleDeleteReg}>حذف</Button></>}
      >
        <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>آیا از حذف ثبت‌نام «{deletingReg?.registration?.registration_number}» ({deletingReg?.studentName}) اطمینان دارید؟</p>
      </Modal>
    </div>
  );
};

// ===== فیلدهای مشترک فرم (برای ثبت‌نام جدید و ویرایش) =====
interface FieldProps {
  regForm: any;
  setRegForm: (f: any) => void;
  students: any[]; courses: any[]; classes: any[]; allCls: any[]; teachers: any[];
  onCourseChange: (id: string) => void;
  onClassChange: (id: string) => void;
  selectedClassType: 'group' | 'private' | '';
  avatarPreview: string;
  handleAvatarFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  regError: string;
}

function RegistrationFormFields(props: FieldProps) {
  const { regForm, setRegForm, students, courses, classes, allCls, teachers, onCourseChange, onClassChange, selectedClassType, avatarPreview, handleAvatarFile, fileInputRef, regError } = props;

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 40, padding: '0 0.75rem', background: 'var(--color-input)',
    border: 'var(--border-default)', borderRadius: 'var(--radius-input)',
    color: 'var(--color-text-primary)', fontFamily: 'inherit', fontSize: 'var(--font-size-md)', boxSizing: 'border-box'
  };
  const fieldLabel: React.CSSProperties = {
    fontSize: 'var(--font-size-sm)', fontWeight: 500, display: 'block',
    marginBottom: '0.375rem', color: 'var(--color-text-secondary)'
  };

  const classOptions = (classes.length ? classes : allCls.filter((c: any) => String(c.course_id).trim() === String(regForm.course_id).trim()))
    .map((c: any) => ({ value: c.id, label: `${c.code}${c.type === 'private' ? ' (خصوصی)' : ''} | ظرفیت ${c.capacity} نفر` }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {regError && (
        <div style={{ padding: '0.75rem', background: 'var(--color-danger-light)', color: 'var(--color-danger)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}>
          {regError}
        </div>
      )}

      {/* عکس پروفایل شاگرد (اختیاری) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', background: 'var(--color-bg-secondary)', border: 'var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {avatarPreview
            ? <img src={avatarPreview} alt="آواتار" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
          }
        </div>
        <div>
          <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '0.25rem' }}>عکس پروفایل شاگرد (اختیاری)</div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarFile} style={{ display: 'none' }} />
          <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>{avatarPreview ? 'تغییر عکس' : 'انتخاب عکس'}</Button>
        </div>
      </div>

      <SearchableSelect label="شاگرد" placeholder="انتخاب شاگرد..." searchPlaceholder="جستجوی نام / کد ملی..."
        value={regForm.student_id}
        options={students.map((s: any) => ({ value: s.id, label: `${s.first_name} ${s.last_name}${s.national_id ? ' — ' + s.national_id : ''}` }))}
        onChange={(v) => setRegForm({ ...regForm, student_id: v })} />

      <Select label="دوره" placeholder="انتخاب دوره..." value={regForm.course_id}
        options={courses.map((c: any) => ({ value: c.id, label: `${c.title} (${c.code})` }))}
        onChange={(v) => onCourseChange(v)} />

      <Select label="کلاس" placeholder="انتخاب کلاس..." value={regForm.class_id}
        options={classOptions}
        onChange={(v) => onClassChange(v)} />

      {/* انتخاب استاد */}
      <Select label="استاد کلاس" placeholder="انتخاب استاد..." value={regForm.teacher_id}
        options={teachers.map((t: any) => ({ value: t.id, label: `${t.first_name} ${t.last_name}` }))}
        onChange={(v) => setRegForm({ ...regForm, teacher_id: v })} />

      {/* شیوه پرداخت — فقط برای کلاس خصوصی */}
      {selectedClassType === 'private' && (
        <div style={{ padding: '0.9rem', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', border: 'var(--border-default)' }}>
          <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '0.75rem' }}>شیوه پرداخت شهریه (کلاس خصوصی)</div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <button type="button" onClick={() => setRegForm({ ...regForm, payment_mode: 'once' })}
              style={{ flex: 1, padding: '0.7rem', borderRadius: 'var(--radius-md)', border: regForm.payment_mode === 'once' ? '2px solid var(--color-primary)' : 'var(--border-default)', background: regForm.payment_mode === 'once' ? 'var(--color-sidebar-active)' : 'var(--color-surface)', color: 'var(--color-text-primary)', fontFamily: 'inherit', cursor: 'pointer' }}>یک‌جا</button>
            <button type="button" onClick={() => setRegForm({ ...regForm, payment_mode: 'monthly' })}
              style={{ flex: 1, padding: '0.7rem', borderRadius: 'var(--radius-md)', border: regForm.payment_mode === 'monthly' ? '2px solid var(--color-primary)' : 'var(--border-default)', background: regForm.payment_mode === 'monthly' ? 'var(--color-sidebar-active)' : 'var(--color-surface)', color: 'var(--color-text-primary)', fontFamily: 'inherit', cursor: 'pointer' }}>ماهانه</button>
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
          placeholder="یادداشت اختیاری..."
          style={{ width: '100%', minHeight: 70, padding: '0.75rem', background: 'var(--color-input)', border: 'var(--border-default)', borderRadius: 'var(--radius-input)', color: 'var(--color-text-primary)', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
      </div>
    </div>
  );
}
