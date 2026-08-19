/**
 * Rumiland Academy — Weekly Calendar Page (resolved class names + session generation)
 */

import React, { useEffect, useState } from 'react';
import { useCalendarStore } from '@/store';
import { Card, EmptyState, Modal } from '@/components/Layout';
import { Button, IconButton } from '@/components/Basic';
import { db } from '@/db/schema';

const WEEKDAYS_FA = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

const CLASS_TYPE_COLORS: Record<string, string> = {
  'group': '#6366f1', 'private': '#f97316', 'default': '#3b82f6',
};

export const CalendarPage: React.FC = () => {
  const { currentWeekStart, sessions, isLoading } = useCalendarStore();
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [resolvedSessions, setResolvedSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [showSessionDetail, setShowSessionDetail] = useState(false);

  useEffect(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    setWeekDays(days);
  }, [currentWeekStart]);

  useEffect(() => { loadSessions(); }, [currentWeekStart]);

  const loadSessions = async () => {
    useCalendarStore.getState().setLoading(true);
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const startStr = currentWeekStart.toISOString().split('T')[0];
    const endStr = weekEnd.toISOString().split('T')[0];

    const allSessions = await db.sessions.toArray();
    const weekSessions = allSessions.filter((s: any) => s.date >= startStr && s.date < endStr);

    // Resolve class and teacher names
    const resolved = await Promise.all(weekSessions.map(async (s: any) => {
      const cls = await db.classes.get(s.class_id);
      const course = cls ? await db.courses.get(cls.course_id) : null;
      const teacher = cls ? await db.teachers.get(cls.teacher_id) : null;
      return {
        ...s,
        className: course?.title || cls?.code || s.class_id,
        classCode: cls?.code || '',
        teacherName: teacher ? `${teacher.first_name} ${teacher.last_name}` : '',
        classroom: cls?.classroom || '',
        classType: cls?.type || 'default',
      };
    }));

    setResolvedSessions(resolved);
    useCalendarStore.getState().setSessions(weekSessions);
    useCalendarStore.getState().setLoading(false);
  };

  const formatWeekRange = () => {
    const start = currentWeekStart;
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    try {
      return `${start.toLocaleDateString('fa-IR', { month: 'long', day: 'numeric', timeZone: 'Asia/Tehran' })} - ${end.toLocaleDateString('fa-IR', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Tehran' })}`;
    } catch {
      return `${start.getDate()} - ${end.getDate()}`;
    }
  };

  const getDaySessions = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return resolvedSessions.filter((s: any) => s.date === dateStr);
  };

  // Generate sessions from class schedules
  const handleGenerateSessions = async () => {
    const allClasses = await db.classes.filter((c: any) => !c.deleted_at && (c.status === 'active' || c.status === 'registration_open')).toArray();
    const existingSessions = await db.sessions.toArray();
    const existingKeys = new Set(existingSessions.map((s: any) => `${s.class_id}_${s.date}`));
    const now = new Date().toISOString();
    let added = 0;

    for (const cls of allClasses) {
      try {
        const schedule = JSON.parse(cls.schedule_json || '[]');
        if (!schedule.length) continue;
        const sessionDuration = 90; // default 90 min
        for (let i = 0; i < 12; i++) { // Generate next 12 weeks
          for (const day of schedule) {
            const date = getNextDateForDay(day.day, i);
            const key = `${cls.id}_${date}`;
            if (existingKeys.has(key)) continue;
            const sessionNum = existingSessions.filter((s: any) => s.class_id === cls.id).length + 1;
            await db.sessions.put({
              id: crypto.randomUUID(), class_id: cls.id, session_number: sessionNum,
              date, date_jalali: '', start_time: day.start || '08:00', end_time: day.end || '09:30',
              teacher_id: cls.teacher_id, classroom: cls.classroom || null,
              status: 'scheduled', notes: null,
              created_at: now, updated_at: now,
            });
            existingKeys.add(key);
            added++;
          }
        }
      } catch { continue; }
    }
    loadSessions();
  };

  const getNextDateForDay = (dayName: string, weekOffset: number): string => {
    const dayMap: Record<string, number> = { 'saturday': 6, 'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5 };
    const targetDay = dayMap[dayName] ?? 0;
    const today = new Date();
    const currentDay = today.getDay();
    let diff = targetDay - currentDay;
    if (diff < 0) diff += 7;
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + diff + weekOffset * 7);
    return nextDate.toISOString().split('T')[0];
  };

  const openSessionDetail = (session: any) => {
    setSelectedSession(session);
    setShowSessionDetail(true);
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>تقویم هفتگی کلاس‌ها</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Button variant="secondary" size="sm" onClick={handleGenerateSessions}>تولید جلسات</Button>
          <IconButton onClick={() => useCalendarStore.getState().goToPreviousWeek()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </IconButton>
          <span style={{ fontWeight: 500, fontSize: 'var(--font-size-md)', minWidth: 200, textAlign: 'center' }}>{formatWeekRange()}</span>
          <IconButton onClick={() => useCalendarStore.getState().goToNextWeek()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </IconButton>
          <Button variant="secondary" size="sm" onClick={() => useCalendarStore.getState().goToToday()}>امروز</Button>
        </div>
      </div>

      {/* Week Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
        {weekDays.map((day, idx) => {
          const daySessions = getDaySessions(day);
          const isToday = new Date().toDateString() === day.toDateString();
          const isFriday = idx === 6;
          return (
            <Card key={idx} padding="0.75rem" style={{ minHeight: 300, background: isToday ? 'var(--color-sidebar-active)' : isFriday ? 'var(--color-bg-tertiary)' : undefined, borderColor: isToday ? 'var(--color-primary-600)' : undefined }}>
              <div style={{ textAlign: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: 'var(--border-thin)' }}>
                <div style={{ fontSize: 'var(--font-size-xs)', color: isFriday ? 'var(--color-danger)' : 'var(--color-text-tertiary)', fontWeight: 500 }}>{WEEKDAYS_FA[idx]}</div>
                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: isToday ? 700 : 500, marginTop: '0.25rem' }}>{day.toLocaleDateString('fa-IR', { day: 'numeric', timeZone: 'Asia/Tehran' })}</div>
              </div>
              {daySessions.length === 0 ? (
                <div style={{ padding: '1rem 0', textAlign: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>کلاسی در این بازه زمانی ثبت نشده است</div>
              ) : ( daySessions.map((s: any) => (
                  <div key={s.id} onClick={() => openSessionDetail(s)} style={{ padding: '0.5rem 0.625rem', borderRadius: 'var(--radius-md)', background: CLASS_TYPE_COLORS[s.classType] || CLASS_TYPE_COLORS.default, color: '#fff', fontSize: 'var(--font-size-xs)', marginBottom: '0.375rem', cursor: 'pointer', transition: 'all var(--transition-fast)' }}>
                    <div style={{ fontWeight: 600 }}>{s.className}</div>
                    <div style={{ opacity: 0.75, marginTop: '0.125rem' }}>{s.start_time} - {s.end_time}{s.teacherName ? ` | ${s.teacherName}` : ''}</div>
                  </div>
                ))
              )}
            </Card>
          );
        })}
      </div>

      {/* Session Detail Modal */}
      <Modal isOpen={showSessionDetail} onClose={() => setShowSessionDetail(false)} title="جزئیات جلسه" size="sm"
        footer={<Button variant="secondary" onClick={() => setShowSessionDetail(false)}>بستن</Button>}
      >
        {selectedSession && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>دوره:</span><span style={{ fontWeight: 500 }}>{selectedSession.className}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>کد کلاس:</span><span>{selectedSession.classCode}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>استاد:</span><span>{selectedSession.teacherName || '--'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>زمان:</span><span>{selectedSession.start_time} - {selectedSession.end_time}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>تاریخ:</span><span>{selectedSession.date}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>کلاس:</span><span>{selectedSession.classroom || '--'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>جلسه:</span><span>#{selectedSession.session_number}</span></div>
          </div>
        )}
      </Modal>
    </div>
  );
};