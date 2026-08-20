/**
 * Rumiland Academy — Students List Page
 * Pixel-perfect recreation based on official specification screenshots.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useStudentStore } from '@/store';
import { studentService, registrationService, courseService, classService } from '@/services';
import { resolveRegistrationTotal, paidAmountForRegistration } from '@/services/finance';
import { Card, EmptyState, Table, Pagination, Modal } from '@/components/Layout';
import { Button, Input, Select, SearchInput, Badge } from '@/components/Basic';
import type { Column } from '@/components/Layout';
import type { Student } from '@/db/schema';
import { v4 as uuid } from 'uuid';

interface StudentsPageProps { onViewProfile?: (studentId: string) => void; }

export const StudentsPage: React.FC<StudentsPageProps> = ({ onViewProfile }) => {
  const { students, totalCount, filters, selectedIds, isLoading } = useStudentStore();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  // Enrichment: class names + payment status per student
  const [studentMeta, setStudentMeta] = useState<Record<string, { classNames: string[]; paymentStatus: 'paid' | 'partial' | 'pending' | 'none' }>>({});

  // Form state
  const [formData, setFormData] = useState<Partial<Student>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSaving, setFormSaving] = useState(false);

  useEffect(() => {
    loadStudents();
  }, [filters]);

  const loadStudents = async () => {
    useStudentStore.getState().setLoading(true);
    const { search, classId, paymentStatus, status, page, perPage, sortBy, sortDirection } = filters;

    const searchFn = (s: any) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (s.first_name?.toLowerCase().includes(q) || s.last_name?.toLowerCase().includes(q) || s.national_id?.includes(q) || s.phone?.includes(q));
    };

    const result = await studentService.getPaginated({
      page, perPage, sortBy, sortDirection,
      searchFn,
      filters: (s: any) => {
        if (status && s.status !== status) return false;
        return true;
      },
    });

    useStudentStore.getState().setStudents(result.data, result.total);
    useStudentStore.getState().setLoading(false);
    loadStudentMeta(result.data);
  };

  const loadStudentMeta = async (studentList: Student[]) => {
    const meta: Record<string, { classNames: string[]; paymentStatus: 'paid' | 'partial' | 'pending' | 'none' }> = {};
    await Promise.all(studentList.map(async (st) => {
      const [classes, payments] = await Promise.all([
        studentService.getStudentClasses(st.id),
        studentService.getStudentPayments(st.id),
      ]);
      const classNames = classes.map((c: any) => `${c.course?.title || ''} - ${c.class?.code || ''}`).filter(Boolean);
      // شهریه‌ی مؤثر هر کلاس (total_amount یا tuition_fee یا شهریه‌ی دوره) — جلوی صفر شدن گرفته می‌شود
      let total = 0;
      for (const c of classes) total += await resolveRegistrationTotal(c.registration);
      // مجموع پرداخت‌های واقعی این شاگرد
      let paidViaPayments = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
      // اگر پرداختی ثبت نشده اما paid_amount روی ثبت‌نام هست، از آن استفاده کن
      if (paidViaPayments <= 0) {
        paidViaPayments = classes.reduce((sum: number, c: any) => sum + (Number(c.registration.paid_amount) || 0), 0);
      }
      const paid = paidViaPayments;
      let paymentStatus: any = 'none';
      if (classes.length === 0) paymentStatus = 'none';
      else if (total > 0 && paid >= total) paymentStatus = 'paid';
      else if (paid > 0) paymentStatus = 'partial';
      else paymentStatus = 'pending';
      meta[st.id] = { classNames, paymentStatus };
    }));
    setStudentMeta(meta);
  };

  const resetForm = () => {
    setFormData({});
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.first_name?.trim()) errors.first_name = 'نام الزامی است';
    if (!formData.last_name?.trim()) errors.last_name = 'نام خانوادگی الزامی است';
    if (!formData.national_id?.trim()) errors.national_id = 'کد ملی الزامی است';
    else if (!/^\d{10}$/.test(formData.national_id)) errors.national_id = 'کد ملی باید ۱۰ رقم باشد';
    if (!formData.phone?.trim()) errors.phone = 'شماره تماس الزامی است';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAdd = async () => {
    if (!validateForm()) return;
    setFormSaving(true);
    const result = await studentService.create({
      ...formData as any,
      status: formData.status || 'active',
      registered_at: new Date().toISOString(),
    });
    setFormSaving(false);
    if (result.success) {
      setShowAddDialog(false);
      resetForm();
      loadStudents();
    }
  };

  const handleEdit = async () => {
    if (!validateForm() || !editingStudent) return;
    setFormSaving(true);
    await studentService.update(editingStudent.id, formData);
    setFormSaving(false);
    setShowEditDialog(false);
    setEditingStudent(null);
    resetForm();
    loadStudents();
  };

  const handleDelete = async () => {
    if (!deletingStudent) return;
    await studentService.delete(deletingStudent.id);
    setShowDeleteConfirm(false);
    setDeletingStudent(null);
    loadStudents();
  };

  const openEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({ ...student });
    setShowEditDialog(true);
  };

  const openDelete = (student: Student) => {
    setDeletingStudent(student);
    setShowDeleteConfirm(true);
  };

  const getPaymentBadge = (student: Student) => {
    const status = studentMeta[student.id]?.paymentStatus;
    if (status === 'paid') return <Badge variant="success">پرداخت شده</Badge>;
    if (status === 'partial') return <Badge variant="info">پرداخت ناقص</Badge>;
    if (status === 'pending') return <Badge variant="warning">در انتظار</Badge>;
    return <Badge variant="neutral">نامشخص</Badge>;
  };

  const columns: Column<Student>[] = [
    { key: 'index', title: '#', width: 50, render: (_, idx) => <span style={{ color: 'var(--color-text-muted)' }}>{(filters.page - 1) * filters.perPage + idx + 1}</span> },
    { key: 'name', title: 'نام و نام خانوادگی', sortable: true, render: (s) => <span style={{ fontWeight: 500 }}>{s.first_name} {s.last_name}</span> },
    { key: 'national_id', title: 'کد ملی', sortable: true },
    { key: 'phone', title: 'شماره تماس', sortable: true },
    { key: 'classes', title: 'کلاس‌ها', render: (s) => {
        const names = studentMeta[s.id]?.classNames || [];
        if (names.length === 0) return <Badge variant="neutral" size="sm">فاقد کلاس</Badge>;
        return <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>{names.join('، ')}</span>;
      } },
    { key: 'payment_status', title: 'وضعیت پرداخت', render: (s) => getPaymentBadge(s) },
    {
      key: 'actions', title: 'عملیات', render: (s) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={(e) => { e.stopPropagation(); onViewProfile?.(s.id); }} style={{ background: 'none', border: 'none', color: 'var(--color-accent-400)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontFamily: 'inherit' }}>مشاهده</button>
          <button onClick={(e) => { e.stopPropagation(); openEdit(s); }} style={{ background: 'none', border: 'none', color: 'var(--color-primary-400)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontFamily: 'inherit' }}>ویرایش</button>
          <button onClick={(e) => { e.stopPropagation(); openDelete(s); }} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontFamily: 'inherit' }}>حذف</button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>لیست شاگردان</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <SearchInput
            placeholder="جستجو در شاگردان..."
            value={filters.search}
            onChange={(v) => useStudentStore.getState().setFilters({ search: v, page: 1 })}
          />
          <Button icon={<AddIcon />} onClick={() => { resetForm(); setShowAddDialog(true); }}>افزودن شاگرد جدید</Button>
        </div>
      </div>

      {/* Table */}
      <Card padding="0">
        <Table
          columns={columns}
          data={students}
          rowKey={(s) => s.id}
          isLoading={isLoading}
          sortBy={filters.sortBy}
          sortDirection={filters.sortDirection}
          onSort={(key) => useStudentStore.getState().setFilters({ sortBy: key, sortDirection: filters.sortBy === key && filters.sortDirection === 'asc' ? 'desc' : 'asc' })}
          emptyState={
            <EmptyState
              title="هیچ شاگردی ثبت نشده است"
              description="برای ثبت اولین شاگرد روی دکمه بالا کلیک کنید"
              action={<Button onClick={() => { resetForm(); setShowAddDialog(true); }}>افزودن شاگرد جدید</Button>}
            />
          }
        />
        <Pagination
          page={filters.page}
          perPage={filters.perPage}
          total={totalCount}
          label="شاگرد"
          onPageChange={(p) => useStudentStore.getState().setFilters({ page: p })}
          onPerPageChange={(p) => useStudentStore.getState().setFilters({ perPage: p, page: 1 })}
        />
      </Card>

      {/* Add Student Dialog */}
      <StudentFormDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        title="افزودن شاگرد جدید"
        formData={formData}
        setFormData={setFormData}
        formErrors={formErrors}
        onSave={handleAdd}
        saving={formSaving}
      />

      {/* Edit Student Dialog */}
      <StudentFormDialog
        isOpen={showEditDialog}
        onClose={() => { setShowEditDialog(false); setEditingStudent(null); }}
        title="ویرایش شاگرد"
        formData={formData}
        setFormData={setFormData}
        formErrors={formErrors}
        onSave={handleEdit}
        saving={formSaving}
      />

      {/* Delete Confirm Dialog */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="حذف شاگرد"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>انصراف</Button>
            <Button variant="danger" onClick={handleDelete}>حذف</Button>
          </>
        }
      >
        <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
          آیا از حذف شاگرد «{deletingStudent?.first_name} {deletingStudent?.last_name}» اطمینان دارید؟ این عملیات قابل بازگشت نیست.
        </p>
      </Modal>
    </div>
  );
};

// ================================================================
// STUDENT FORM DIALOG
// ================================================================

interface StudentFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  formData: Partial<Student>;
  setFormData: (data: Partial<Student>) => void;
  formErrors: Record<string, string>;
  onSave: () => void;
  saving: boolean;
}

const StudentFormDialog: React.FC<StudentFormDialogProps> = ({
  isOpen, onClose, title, formData, setFormData, formErrors, onSave, saving,
}) => {
  const update = (field: string, value: any) => setFormData({ ...formData, [field]: value });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => update('avatar_url', reader.result as string);
    reader.readAsDataURL(f);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>انصراف</Button>
          <Button onClick={onSave} loading={saving}>ثبت</Button>
        </>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: 'var(--color-surface)', border: 'var(--border-default)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {formData.avatar_url
            ? <img src={formData.avatar_url} alt="آواتار" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--color-text-tertiary)' }}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>عکس پروفایل شاگرد (اختیاری)</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarFile} style={{ display: 'none' }} />
            <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>{formData.avatar_url ? 'تغییر عکس' : 'انتخاب عکس'}</Button>
            {formData.avatar_url && <Button size="sm" variant="secondary" onClick={() => update('avatar_url', null)}>حذف عکس</Button>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Input label="نام" value={formData.first_name || ''} onChange={(e) => update('first_name', e.target.value)} error={formErrors.first_name} placeholder="نام" />
        <Input label="نام خانوادگی" value={formData.last_name || ''} onChange={(e) => update('last_name', e.target.value)} error={formErrors.last_name} placeholder="نام خانوادگی" />
        <Input label="کد ملی" value={formData.national_id || ''} onChange={(e) => update('national_id', e.target.value)} error={formErrors.national_id} placeholder="کد ملی ۱۰ رقمی" />
        <Input label="شماره تماس" value={formData.phone || ''} onChange={(e) => update('phone', e.target.value)} error={formErrors.phone} placeholder="۰۹xxxxxxxxx" />
        <Input label="تاریخ تولد" value={formData.birth_date_jalali || ''} onChange={(e) => update('birth_date_jalali', e.target.value)} placeholder="۱۳xx/xx/xx" />
        <Input label="شماره تماس والدین" value={formData.parent_phone || ''} onChange={(e) => update('parent_phone', e.target.value)} placeholder="۰۹xxxxxxxxx" />
      </div>
      <div style={{ marginTop: '1rem' }}>
        <Input label="آدرس" value={formData.address || ''} onChange={(e) => update('address', e.target.value)} placeholder="آدرس کامل" />
      </div>
      <div style={{ marginTop: '1rem' }}>
        <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>یادداشت‌ها</label>
        <textarea
          value={formData.notes || ''}
          onChange={(e) => update('notes', e.target.value)}
          style={{ width: '100%', minHeight: 80, padding: '0.75rem', background: 'var(--color-input)', border: 'var(--border-default)', borderRadius: 'var(--radius-input)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-md)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
          placeholder="یادداشت‌های مربوط به شاگرد..."
        />
      </div>
    </Modal>
  );
};

function AddIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }