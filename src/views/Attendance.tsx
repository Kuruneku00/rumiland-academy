/**
 * Rumiland Academy — Attendance Page (جدا شده از ثبت‌نام‌ها)
 */
import React, { useEffect, useState } from 'react';
import { courseService, classService } from '@/services';
import { Card, EmptyState, Modal } from '@/components/Layout';
import { Button, Select, Input } from '@/components/Basic';
import { db } from '@/db/schema';
import { v4 as uuid } from 'uuid';

interface AttRow { attendance: any; studentName: string; }

export const AttendancePage: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [allCls, setAllCls] = useState<any[]>([]);
  const [showAttDialog, setShowAttDialog] = useState(false);
  const [attCourseId, setAttCourseId] = useState('');
  const [attClassId, setAttClassId] = useState('');
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attRows, setAttRows] = useState<AttRow[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [attFilteredClasses, setAttFilteredClasses] = useState<any[]>([]);
  const [attSessions, setAttSessions] = useState<any[]>([]);
  const [attSessionId, setAttSessionId] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setCourses(await courseService.getAll());
      const cls = await classService.getAll();
      setAllCls(cls);
      setAttFilteredClasses(cls);
    })();
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setHistoryLoading(true);
    const att = await db.attendance.orderBy('date').reverse().limit(100).toArray();
    const enriched = await Promise.all(att.map(async (a: any) => {
      const st = await db.students.get(a.student_id);
      const cls = await db.classes.get(a.class_id);
      return { ...a, studentName: st ? `${st.first_name} ${st.last_name}` : a.student_id, className: cls?.code || '' };
    }));
    setHistory(enriched);
    setHistoryLoading(false);
  };

  const onAttCourseChange = async (courseId: string) => {
    setAttCourseId(courseId);
    setAttClassId('');
    setAttSessionId('');
    if (courseId) setAttFilteredClasses(allCls.filter((c: any) => c.course_id === courseId));
    else setAttFilteredClasses(allCls);
  };

  const onAttClassChange = async (classId: string) => {
    setAttClassId(classId);
    setAttSessionId('');
    if (classId) {
      const sessions = await db.sessions.where('class_id').equals(classId).toArray();
      setAttSessions(sessions);
    } else setAttSessions([]);
  };

  const loadAttendanceForClass = async () => {
    if (!attClassId) return;
    setAttLoading(true);
    const students = await classService.getClassStudents(attClassId);
    const todayDate = attDate || new Date().toISOString().split('T')[0];
    const existingAtt = await db.attendance.where('class_id').equals(attClassId).toArray();
    const sessionId = attSessionId || uuid();
    const rows: AttRow[] = students.map((s: any) => {
      const att = existingAtt.find((a: any) => a.student_id === s.student.id && a.date === todayDate);
      return { attendance: att || { student_id: s.student.id, registration_id: s.registration.id, class_id: attClassId, date: todayDate, status: 'present', late_minutes: 0, session_id: sessionId }, studentName: `${s.student.first_name} ${s.student.last_name}` };
    });
    setAttRows(rows);
    setAttLoading(false);
  };

  const saveAttendance = async () => {
    const now = new Date().toISOString();
    for (const row of attRows) {
      const existing = await db.attendance.where('class_id').equals(attClassId).and((a: any) => a.student_id === row.attendance.student_id && a.date === row.attendance.date).first();
      if (!existing) {
        await db.attendance.put({
          id: uuid(), session_id: row.attendance.session_id || uuid(), student_id: row.attendance.student_id,
          registration_id: row.attendance.registration_id, class_id: attClassId,
          date: row.attendance.date, status: row.attendance.status,
          late_minutes: row.attendance.late_minutes || 0, notes: null,
          recorded_by: 'admin', created_at: now, updated_at: now,
        });
      } else {
        await db.attendance.update(existing.id, { status: row.attendance.status, late_minutes: row.attendance.late_minutes, updated_at: now });
      }
    }
    setShowAttDialog(false);
    setAttRows([]);
    loadHistory();
  };

  const statusLabel = (s: string) => {
    switch (s) { case 'present': return 'حاضر'; case 'absent': return 'غایب'; case 'late': return 'تاخیر'; case 'excused': return 'موجه'; case 'online': return 'آنلاین'; case 'offline': return 'آفلاین'; default: return s; }
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>حضور و غیاب</h1>
        <Button onClick={() => { setAttClassId(''); setAttCourseId(''); setAttDate(new Date().toISOString().split('T')[0]); setAttSessionId(''); setAttRows([]); setShowAttDialog(true); }}>افزودن حضور و غیاب</Button>
      </div>

      <Card padding="0">
        <div style={{ padding: '1rem 1.25rem', borderBottom: 'var(--border-thin)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>سوابق حضور و غیاب</h3>
          <Button variant="secondary" size="sm" onClick={loadHistory}>تازه‌سازی</Button>
        </div>
        {historyLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-tertiary)' }}>در حال بارگذاری...</div>
        ) : history.length === 0 ? (
          <EmptyState title="هیچ سابقه‌ای ثبت نشده است" description="برای اولین بار روی «افزودن حضور و غیاب» کلیک کنید" />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: 'var(--border-default)' }}>
                {['دانشجو', 'کلاس', 'تاریخ', 'وضعیت', 'دقایق تاخیر'].map((h) => (
                  <th key={h} style={{ padding: '0.75rem 1rem', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)', textAlign: 'right' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((r: any) => (
                <tr key={r.id} style={{ borderBottom: 'var(--border-thin)' }}>
                  <td style={{ padding: '0.6rem 1rem', fontSize: 'var(--font-size-sm)' }}>{r.studentName}</td>
                  <td style={{ padding: '0.6rem 1rem', fontSize: 'var(--font-size-sm)' }}>{r.className || '--'}</td>
                  <td style={{ padding: '0.6rem 1rem', fontSize: 'var(--font-size-sm)' }}>{new Date(r.date).toLocaleDateString('fa-IR', { timeZone: 'Asia/Tehran' })}</td>
                  <td style={{ padding: '0.6rem 1rem' }}><span style={{ fontSize: 'var(--font-size-xs)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', background: r.status === 'absent' ? 'var(--color-danger-light)' : r.status === 'present' ? 'var(--color-success-light)' : 'var(--color-warning-light)', color: r.status === 'absent' ? 'var(--color-danger)' : r.status === 'present' ? 'var(--color-success)' : 'var(--color-warning)' }}>{statusLabel(r.status)}</span></td>
                  <td style={{ padding: '0.6rem 1rem', fontSize: 'var(--font-size-sm)' }}>{r.late_minutes || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal isOpen={showAttDialog} onClose={() => setShowAttDialog(false)} title="افزودن حضور و غیاب" size="lg"
        footer={<><Button variant="secondary" onClick={() => setShowAttDialog(false)}>انصراف</Button><Button onClick={saveAttendance}>ثبت حضور و غیاب</Button></>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Select label="دوره" placeholder="فیلتر بر اساس دوره..." options={courses.map((c: any) => ({ value: c.id, label: c.title }))} value={attCourseId} onChange={(v) => onAttCourseChange(v)} />
          <Select label="کلاس" placeholder="انتخاب کلاس..." options={attFilteredClasses.map((c: any) => ({ value: c.id, label: `${c.code} (${c.type === 'group' ? 'گروهی' : 'خصوصی'})` }))} value={attClassId} onChange={(v) => onAttClassChange(v)} />
          {attSessions.length > 0 && (
            <Select label="جلسه" placeholder="انتخاب جلسه..." options={attSessions.map((s: any) => ({ value: s.id, label: `جلسه ${s.session_number} - ${s.date_jalali || s.date}` }))} value={attSessionId} onChange={(v) => { setAttSessionId(v); const s = attSessions.find((x: any) => x.id === v); if (s) setAttDate(s.date); }} />
          )}
          <Input label="تاریخ" value={attDate} onChange={(e) => setAttDate(e.target.value)} placeholder="YYYY-MM-DD" />
          <Button variant="secondary" onClick={loadAttendanceForClass} disabled={!attClassId}>بارگذاری لیست دانشجویان</Button>
          {attLoading ? <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)' }}>در حال بارگذاری...</div> : attRows.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: 'var(--border-default)' }}>
                {['نام دانشجو', 'وضعیت', 'دقایق تاخیر'].map((h) => <th key={h} style={{ padding: '0.5rem 0.75rem', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)', textAlign: 'right' }}>{h}</th>)}
              </tr></thead>
              <tbody>{attRows.map((row, i) => (
                <tr key={i} style={{ borderBottom: 'var(--border-thin)' }}>
                  <td style={{ padding: '0.5rem 0.75rem' }}>{row.studentName}</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>
                    <select value={row.attendance.status} onChange={(e) => {
                      const updated = [...attRows];
                      updated[i] = { ...updated[i], attendance: { ...updated[i].attendance, status: e.target.value } };
                      setAttRows(updated);
                    }} style={{ padding: '0.25rem 0.5rem', background: 'var(--color-input)', border: 'var(--border-default)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
                      {[{ value: 'present', label: 'حاضر' }, { value: 'absent', label: 'غایب' }, { value: 'late', label: 'تاخیر' }, { value: 'excused', label: 'موجه' }, { value: 'online', label: 'آنلاین' }, { value: 'offline', label: 'آفلاین' }].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>
                    <input type="number" min="0" value={row.attendance.late_minutes || 0} onChange={(e) => {
                      const updated = [...attRows];
                      updated[i] = { ...updated[i], attendance: { ...updated[i].attendance, late_minutes: Number(e.target.value) } };
                      setAttRows(updated);
                    }} style={{ width: 60, padding: '0.25rem 0.5rem', background: 'var(--color-input)', border: 'var(--border-default)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }} />
                  </td>
                </tr>
              ))}</tbody>
            </table>
          ) : attClassId && !attLoading ? <EmptyState title="ابتدا کلاس را انتخاب کنید و روی بارگذاری کلیک کنید" /> : null}
        </div>
      </Modal>
    </div>
  );
};
