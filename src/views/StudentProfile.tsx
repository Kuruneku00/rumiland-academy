/**
 * Rumiland Academy — Student Profile Page
 */

import React, { useEffect, useState, useRef } from 'react';
import { studentService, registrationService, courseService, classService, paymentService, attendanceService } from '@/services';
import { Card, EmptyState, Badge, Modal } from '@/components/Layout';
import { Button, IconButton, Input, Textarea } from '@/components/Basic';
import type { Student, Registration, Course, Class, Payment, Attendance, QuizResult, Teacher } from '@/db/schema';

interface StudentProfileProps {
  studentId: string;
  onBack: () => void;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({ studentId, onBack }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [registrations, setRegistrations] = useState<Array<{ registration: Registration; class: Class; course: Course; teacher: Teacher | null }>>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [activeTab, setActiveTab] = useState('classes');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Student>>({});
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, [studentId]);

  const loadProfile = async () => {
    setLoading(true);
    const s = await studentService.getById(studentId);
    if (s) {
      setStudent(s);
      setEditData({ ...s });
      setAvatarPreview(s.avatar_url || '');
      const classes = await studentService.getStudentClasses(studentId);
      setRegistrations(classes);
      const p = await studentService.getStudentPayments(studentId);
      setPayments(p);
      const a = await studentService.getStudentAttendance(studentId);
      setAttendance(a);
      const q = await studentService.getStudentQuizResults(studentId);
      setQuizResults(q);
    }
    setLoading(false);
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result || '');
      setAvatarPreview(data);
      setEditData((prev) => ({ ...prev, avatar_url: data }));
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!student) return;
    setSaving(true);
    await studentService.update(student.id, editData);
    setStudent({ ...student, ...editData });
    setEditing(false);
    setSaving(false);
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>در حال بارگذاری...</div>;
  }

  if (!student) {
    return (
      <div style={{ padding: '2rem' }}>
        <EmptyState title="شاگرد یافت نشد" action={<Button onClick={onBack}>بازگشت به لیست</Button>} />
      </div>
    );
  }

  // Calculate stats
  const totalPaid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const attendancePresent = attendance.filter((a) => a.status === 'present').length;
  const attendanceTotal = attendance.length || 1;
  const attendancePercent = Math.round((attendancePresent / attendanceTotal) * 100);
  const totalDebt = payments.filter((p) => p.status === 'overdue' || p.status === 'pending').reduce((s, p) => s + p.amount, 0);

  const tabs = [
    { id: 'classes', label: 'کلاس‌ها' },
    { id: 'payments', label: 'پرداخت‌ها' },
    { id: 'attendance', label: 'حضور و غیاب' },
    { id: 'quizzes', label: 'نتایج کوئیزها' },
  ];

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <IconButton onClick={onBack}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </IconButton>
          <div style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', background: 'var(--color-bg-secondary)', border: 'var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {avatarPreview
              ? <img src={avatarPreview} alt="آواتار" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
            }
          </div>
          <div>
            <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>پروفایل شاگرد</h1>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
              {student.first_name} {student.last_name}
            </p>
          </div>
        </div>
        <Button onClick={() => setEditing(!editing)}>{editing ? 'انصراف' : 'ویرایش پروفایل'}</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem' }}>
        {/* Left: Personal Info */}
        <Card>
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: '1rem' }}>اطلاعات شخصی</h3>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarFile} style={{ display: 'none' }} />
                <Button size="sm" variant="secondary" onClick={() => avatarInputRef.current?.click()}>تغییر عکس پروفایل</Button>
              </div>
              <Input label="نام" value={editData.first_name || ''} onChange={(e) => setEditData({ ...editData, first_name: e.target.value })} />
              <Input label="نام خانوادگی" value={editData.last_name || ''} onChange={(e) => setEditData({ ...editData, last_name: e.target.value })} />
              <Input label="کد ملی" value={editData.national_id || ''} onChange={(e) => setEditData({ ...editData, national_id: e.target.value })} />
              <Input label="شماره تماس" value={editData.phone || ''} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} />
              <Input label="آدرس" value={editData.address || ''} onChange={(e) => setEditData({ ...editData, address: e.target.value })} />
              <Textarea label="یادداشت‌ها" value={editData.notes || ''} onChange={(e: any) => setEditData({ ...editData, notes: e.target.value })} />
              <Button onClick={handleSave} loading={saving} fullWidth>ذخیره تغییرات</Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <InfoRow label="نام" value={student.first_name} />
              <InfoRow label="نام خانوادگی" value={student.last_name} />
              <InfoRow label="کد ملی" value={student.national_id} />
              <InfoRow label="شماره تماس" value={student.phone} />
              <InfoRow label="سن" value={student.birth_date_jalali ? '--' : 'نامشخص'} />
              <InfoRow label="آدرس" value={student.address || '--'} />
              <InfoRow label="تاریخ ثبت‌نام" value={student.registered_at ? new Date(student.registered_at).toLocaleDateString('fa-IR', { timeZone: 'Asia/Tehran' }) : '--'} />
              <InfoRow label="یادداشت‌ها" value={student.notes || '--'} />
            </div>
          )}
        </Card>

        {/* Right: Tabs & Content */}
        <div>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <SummaryCard title="کلاس‌های ثبت‌نام شده" value={registrations.length.toLocaleString('fa-IR')} color="var(--color-primary-400)" />
            <SummaryCard title="کل پرداخت‌ها" value={`${totalPaid.toLocaleString('fa-IR')} تومان`} color="var(--color-success)" />
            <SummaryCard title="درصد حضور" value={`${attendancePercent}%`} color="var(--color-info)" />
            <SummaryCard title="میزان بدهی" value={`${totalDebt.toLocaleString('fa-IR')} تومان`} color="var(--color-danger)" />
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0', borderBottom: 'var(--border-default)', marginBottom: '1.25rem' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.625rem 1.25rem', fontSize: 'var(--font-size-sm)', fontWeight: activeTab === tab.id ? 600 : 400,
                  color: activeTab === tab.id ? 'var(--color-primary-300)' : 'var(--color-text-tertiary)',
                  background: 'transparent', border: 'none', borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all var(--transition-fast)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'classes' && (
            registrations.length === 0 ? (
              <EmptyState title="هیچ کلاسی ثبت نشده است" description="این دانشجو در هیچ کلاسی ثبت‌نام نشده است" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {registrations.map((r) => (
                  <Card key={r.registration.id} padding="1rem">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-md)' }}>{r.course.title}</div>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
                          کلاس: {r.class.code}{r.teacher ? ` | استاد: ${r.teacher.first_name} ${r.teacher.last_name}` : ''}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
                          {r.class.classroom ? `کلاس درس: ${r.class.classroom}` : ''} | ظرفیت: {r.class.capacity} نفر
                        </div>
                      </div>
                      <Badge variant={r.registration.completion_status === 'completed' ? 'success' : 'info'}>
                        {r.registration.completion_status === 'completed' ? 'تکمیل شده' : 'در حال انجام'}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )
          )}

          {activeTab === 'payments' && (
            payments.length === 0 ? (
              <EmptyState title="هیچ پرداختی ثبت نشده است" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {payments.map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: 'var(--border-thin)' }}>
                    <div>
                      <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{p.amount.toLocaleString('fa-IR')} تومان</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{new Date(p.payment_date).toLocaleDateString('fa-IR', { timeZone: 'Asia/Tehran' })}</div>
                    </div>
                    <Badge variant={p.status === 'paid' ? 'success' : p.status === 'overdue' ? 'danger' : 'warning'}>
                      {p.status === 'paid' ? 'پرداخت شده' : p.status === 'overdue' ? 'معوق' : 'در انتظار'}
                    </Badge>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'attendance' && (
            attendance.length === 0 ? (
              <EmptyState title="اطلاعات حضور و غیاب ثبت نشده است" description="حضور این دانشجو در جلسات در این بخش نمایش داده می‌شود" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <MiniStat label="کل جلسات" value={attendance.length.toLocaleString('fa-IR')} color="var(--color-info)" />
                  <MiniStat label="حاضر" value={attendance.filter((a) => a.status === 'present').length.toLocaleString('fa-IR')} color="var(--color-success)" />
                  <MiniStat label="غایب" value={attendance.filter((a) => a.status === 'absent').length.toLocaleString('fa-IR')} color="var(--color-danger)" />
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: 'var(--border-default)' }}>
                    {['تاریخ', 'وضعیت', 'دقایق تاخیر'].map((h) => <th key={h} style={{ padding: '0.5rem 0.75rem', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)', textAlign: 'right' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {attendance.map((a) => (
                      <tr key={a.id} style={{ borderBottom: 'var(--border-thin)' }}>
                        <td style={{ padding: '0.5rem 0.75rem', fontSize: 'var(--font-size-sm)' }}>{a.date}</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <Badge variant={a.status === 'present' ? 'success' : a.status === 'absent' ? 'danger' : a.status === 'late' ? 'warning' : 'info'} size="sm">
                            {a.status === 'present' ? 'حاضر' : a.status === 'absent' ? 'غایب' : a.status === 'late' ? 'تاخیر' : a.status === 'excused' ? 'موجه' : a.status === 'online' ? 'آنلاین' : 'آفلاین'}
                          </Badge>
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', fontSize: 'var(--font-size-sm)' }}>{a.late_minutes > 0 ? `${a.late_minutes} دقیقه` : '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {activeTab === 'quizzes' && (
            quizResults.length === 0 ? (
              <EmptyState title="نتیجه آزمونی ثبت نشده است" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {quizResults.map((q: any) => (
                  <Card key={q.id} padding="1rem" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{q.quiz_id}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
                        نمره: {q.score} از {q.max_score} ({q.percentage}%)
                      </div>
                    </div>
                    <Badge variant={q.percentage >= 70 ? 'success' : q.percentage >= 50 ? 'warning' : 'danger'}>
                      {q.grade || (q.percentage >= 70 ? 'قبول' : 'مردود')}
                    </Badge>
                  </Card>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0' }}>
      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>{label}:</span>
      <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function SummaryCard({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <Card padding="1rem" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>{title}</div>
      <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color }}>{value}</div>
    </Card>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '0.5rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{label}</div>
      <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}