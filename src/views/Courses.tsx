/**
 * Rumiland Academy — Courses & Classes Page (with detail panels + private classes)
 */
import React, { useEffect, useState } from 'react';
import { useCourseClassStore } from '@/store';
import { courseService, classService, teacherService, registrationService, paymentService, attendanceService } from '@/services';
import { Card, EmptyState, Table, Pagination, Badge, Modal, StatCard } from '@/components/Layout';
import { Button, Input, Select, SearchInput, Textarea, IconButton } from '@/components/Basic';
import type { Column } from '@/components/Layout';
import type { Course, Class, Student, Registration, Payment, Attendance } from '@/db/schema';
import { db } from '@/db/schema';

export const CoursesPage: React.FC = () => {
  const { courses, classes, courseTotal, classTotal, courseFilters, classFilters, isLoading } = useCourseClassStore();
  const [activeView, setActiveView] = useState<'courses' | 'classes'>('courses');
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showEditCourse, setShowEditCourse] = useState(false);
  const [showAddClass, setShowAddClass] = useState(false);
  const [showEditClass, setShowEditClass] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingClass, setEditingClass] = useState<Class | null>(null);

  // Detail views
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [courseClasses, setCourseClasses] = useState<Class[]>([]);
  const [courseStudents, setCourseStudents] = useState<Student[]>([]);
  const [courseRevenue, setCourseRevenue] = useState(0);
  const [classStudents, setClassStudents] = useState<Array<{ student: Student; reg: Registration }>>([]);
  const [classSessions, setClassSessions] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [classTypeFilter, setClassTypeFilter] = useState<string>('all');

  const [courseForm, setCourseForm] = useState(emptyCourseForm());
  const [classForm, setClassForm] = useState(emptyClassForm());
  const [courseSaving, setCourseSaving] = useState(false);

  const weekDays = [
    { value: 6, label: 'شنبه' },
    { value: 0, label: 'یکشنبه' },
    { value: 1, label: 'دوشنبه' },
    { value: 2, label: 'سه‌شنبه' },
    { value: 3, label: 'چهارشنبه' },
    { value: 4, label: 'پنجشنبه' },
    { value: 5, label: 'جمعه' },
  ];

  type ScheduleItem = {
    day: number;
    start_time: string;
    end_time: string;
  };

  const getSchedule = (): ScheduleItem[] => {
    try {
      const parsed = JSON.parse(classForm.schedule_json || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const updateSchedule = (schedule: ScheduleItem[]) => {
    setClassForm({
      ...classForm,
      schedule_json: JSON.stringify(schedule),
    });
  };

  const toggleScheduleDay = (day: number) => {
    const schedule = getSchedule();
    const exists = schedule.find((item) => item.day === day);

    if (exists) {
      updateSchedule(schedule.filter((item) => item.day !== day));
    } else {
      updateSchedule([
        ...schedule,
        {
          day,
          start_time: '17:00',
          end_time: '18:30',
        },
      ]);
    }
  };

  const updateScheduleTime = (
    day: number,
    field: 'start_time' | 'end_time',
    value: string
  ) => {
    const schedule = getSchedule().map((item) =>
      item.day === day ? { ...item, [field]: value } : item
    );

    updateSchedule(schedule);
  };
  const [classSaving, setClassSaving] = useState(false);
  const [teachersList, setTeachersList] = useState<any[]>([]);

  function emptyCourseForm() {
    return { code: '', title: '', description: '', category: '', level: '', duration_sessions: 12, session_duration_minutes: 90, tuition_fee: 0, registration_fee: 0, tags: [] as string[], status: 'draft' as Course['status'] };
  }
  function emptyClassForm() {
    return { code: '', course_id: '', teacher_id: '', classroom: '', capacity: 20, type: 'group' as 'group' | 'private', start_date: '', end_date: '', schedule_json: '[]', status: 'registration_open' as Class['status'], notes: '' };
  }

  useEffect(() => { loadData(); loadTeachers(); }, [activeView, courseFilters, classFilters]);

  const loadData = async () => {
    useCourseClassStore.getState().setLoading(true);
    if (activeView === 'courses') {
      const { search, category, level, status, page, perPage } = courseFilters;
      const searchFn = (c: any) => !search || c.title?.toLowerCase().includes(search.toLowerCase()) || c.code?.toLowerCase().includes(search.toLowerCase());
      const f = (c: any) => {
        if (category && c.category !== category) return false; if (level && c.level !== level) return false; if (status && c.status !== status) return false; return true;
      };
      const r = await courseService.getPaginated({ page, perPage, searchFn, filters: f });
      useCourseClassStore.getState().setCourses(r.data, r.total);
    } else {
      const { search, courseId, teacherId, status, type, page, perPage } = classFilters;
      const searchFn = (c: any) => !search || c.code?.toLowerCase().includes(search.toLowerCase());
      const f = (c: any) => {
        if (courseId && c.course_id !== courseId) return false; if (teacherId && c.teacher_id !== teacherId) return false; if (status && c.status !== status) return false; if (type && c.type !== type) return false; return true;
      };
      const r = await classService.getPaginated({ page, perPage, searchFn, filters: f });
      useCourseClassStore.getState().setClasses(r.data, r.total);
    }
    useCourseClassStore.getState().setLoading(false);
  };

  const loadTeachers = async () => { setTeachersList(await teacherService.getAll()); };

  const handleAddCourse = async () => { setCourseSaving(true); await courseService.create(courseForm as any); setCourseSaving(false); setShowAddCourse(false); setCourseForm(emptyCourseForm()); loadData(); };
  const handleEditCourse = async () => { if (!editingCourse) return; setCourseSaving(true); await courseService.update(editingCourse.id, courseForm as any); setCourseSaving(false); setShowEditCourse(false); setEditingCourse(null); loadData(); };
  const handleAddClass = async () => {
    setClassSaving(true);

    const classData = {
      ...classForm,
      course_id: String(classForm.course_id || '').trim(),
      teacher_id: String(classForm.teacher_id || '').trim(),
      schedule_json: JSON.stringify(getSchedule()),
    };

    console.log('ثبت کلاس با course_id:', classData.course_id);

    if (!classData.course_id) {
      alert('ابتدا دوره مربوط به کلاس را انتخاب کنید.');
      setClassSaving(false);
      return;
    }

    const result = await classService.create(classData as any);

    if (!result.success || !result.data) {
      console.error('خطا در ثبت کلاس:', result.error);
      alert(result.error || 'ثبت کلاس انجام نشد');
      setClassSaving(false);
      return;
    }

    const sessionResult = await classService.generateSessions(result.data.id);

    if (!sessionResult.success) {
      console.warn('کلاس ثبت شد ولی ساخت جلسات انجام نشد:', sessionResult.error);
      alert(
        `کلاس ثبت شد، اما جلسات ساخته نشدند.\n${sessionResult.error || ''}`
      );
    }

    setClassSaving(false);
    setShowAddClass(false);
    setClassForm(emptyClassForm());
    await loadData();
  };

  const handleEditClass = async () => {
    if (!editingClass) return;

    setClassSaving(true);
    const result = await classService.update(editingClass.id, {
      ...classForm,
      schedule_json: JSON.stringify(getSchedule()),
    } as any);

    if (!result.success) {
      console.error('خطا در ویرایش کلاس:', result.error);
      alert(result.error || 'ویرایش کلاس انجام نشد');
      setClassSaving(false);
      return;
    }

    const sessionResult = await classService.generateSessions(editingClass.id);

    if (!sessionResult.success) {
      console.warn('کلاس ویرایش شد ولی ساخت جلسات انجام نشد:', sessionResult.error);
      alert(
        `کلاس ویرایش شد، اما جلسات ساخته نشدند.\n${sessionResult.error || ''}`
      );
    }

    setClassSaving(false);
    setShowEditClass(false);
    setEditingClass(null);
    await loadData();
  };

  const openEditCourse = (c: Course) => { setEditingCourse(c); setCourseForm({ code: c.code, title: c.title, description: c.description || '', category: c.category || '', level: c.level || '', duration_sessions: c.duration_sessions, session_duration_minutes: c.session_duration_minutes, tuition_fee: c.tuition_fee, registration_fee: c.registration_fee, tags: c.tags || [], status: c.status }); setShowEditCourse(true); };
  const openEditClass = (c: Class) => { setEditingClass(c); setClassForm({ code: c.code, course_id: c.course_id, teacher_id: c.teacher_id, classroom: c.classroom || '', capacity: c.capacity, type: c.type, start_date: c.start_date, end_date: c.end_date, schedule_json: c.schedule_json, status: c.status, notes: c.notes || '' }); setShowEditClass(true); };

  // Course Detail View
  const openCourseDetail = async (course: Course) => {
    setSelectedCourse(course);
    setDetailLoading(true);
    const [cls, st, payments] = await Promise.all([
      courseService.getCourseClasses(course.id),
      courseService.getCourseStudents(course.id),
      db.payments.where('course_id').equals(course.id).filter((p: any) => !p.deleted_at).toArray(),
    ]);
    setCourseClasses(cls);
    setCourseStudents(st);
    setCourseRevenue(payments.reduce((s: number, p: any) => s + p.amount, 0));
    setDetailLoading(false);
  };

  // Class Detail View
  const openClassDetail = async (cls: Class) => {
    setSelectedClass(cls);
    setDetailLoading(true);
    const [st, sessions] = await Promise.all([
      classService.getClassStudents(cls.id),
      db.sessions.where('class_id').equals(cls.id).toArray(),
    ]);
    setClassStudents(st.map((s: any) => ({ student: s.student, reg: s.registration })));
    setClassSessions(sessions);
    setDetailLoading(false);
  };

  const closeDetail = () => { setSelectedCourse(null); setSelectedClass(null); };

  // Filtered classes by type for detail panel
  const groupClasses = courseClasses.filter((c: any) => c.type === 'group');
  const privateClasses = courseClasses.filter((c: any) => c.type === 'private');

  const statusOptions = [
    { value: 'draft', label: 'پیش‌نویس' }, { value: 'registration_open', label: 'ثبت‌نام باز' }, { value: 'active', label: 'فعال' }, { value: 'full', label: 'تکمیل' }, { value: 'completed', label: 'پایان یافته' }, { value: 'cancelled', label: 'لغو شده' }, { value: 'archived', label: 'بایگانی' },
  ];

  const statusVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary' => {
    switch (s) { case 'active': return 'success'; case 'registration_open': return 'info'; case 'draft': return 'neutral'; case 'full': return 'warning'; case 'completed': return 'primary'; case 'cancelled': return 'danger'; default: return 'neutral'; }
  };

  const courseColumns: Column<Course>[] = [
    { key: 'code', title: 'کد', width: 100, render: (c: any) => <Badge variant="primary" size="sm">{c.code}</Badge> },
    { key: 'title', title: 'نام دوره', sortable: true, render: (c: any) => <span style={{ fontWeight: 500, cursor: 'pointer', color: 'var(--color-primary-400)' }} onClick={(e) => { e.stopPropagation(); openCourseDetail(c); }}>{c.title}</span> },
    { key: 'category', title: 'دسته‌بندی', render: (c: any) => c.category || '--' },
    { key: 'level', title: 'مقطع', render: (c: any) => c.level || '--' },
    { key: 'tuition_fee', title: 'شهریه', render: (c: any) => c.tuition_fee ? `${c.tuition_fee.toLocaleString('fa-IR')} تومان` : '--' },
    { key: 'status', title: 'وضعیت', render: (c: any) => <Badge variant={statusVariant(c.status)}>{statusOptions.find((o) => o.value === c.status)?.label || c.status}</Badge> },
    { key: 'actions', title: 'عملیات', render: (c: any) => <div style={{ display: 'flex', gap: '0.5rem' }}><button onClick={(e) => { e.stopPropagation(); openCourseDetail(c); }} style={{ color: 'var(--color-accent-400)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--font-size-sm)' }}>جزئیات</button><button onClick={(e) => { e.stopPropagation(); openEditCourse(c); }} style={{ color: 'var(--color-primary-400)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--font-size-sm)' }}>ویرایش</button><button onClick={(e) => { e.stopPropagation(); setDeletingItem(c); setShowDelete(true); }} style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--font-size-sm)' }}>حذف</button></div> },
  ];

  const classColumns: Column<any>[] = [
    { key: 'code', title: 'کد', width: 100, render: (c: any) => <Badge variant="info" size="sm">{c.code}</Badge> },
    { key: 'type', title: 'نوع', render: (c: any) => <Badge variant={c.type === 'group' ? 'info' : 'warning'} size="sm">{c.type === 'group' ? 'گروهی' : 'خصوصی'}</Badge> },
    { key: 'capacity', title: 'ظرفیت', render: (c: any) => `${c.capacity} نفر` },
    { key: 'classroom', title: 'کلاس', render: (c: any) => c.classroom || '--' },
    { key: 'status', title: 'وضعیت', render: (c: any) => <Badge variant={statusVariant(c.status)}>{statusOptions.find((o) => o.value === c.status)?.label || c.status}</Badge> },
    { key: 'actions', title: 'عملیات', render: (c: any) => <div style={{ display: 'flex', gap: '0.5rem' }}><button onClick={(e) => { e.stopPropagation(); openClassDetail(c); }} style={{ color: 'var(--color-accent-400)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--font-size-sm)' }}>جزئیات</button><button onClick={(e) => { e.stopPropagation(); openEditClass(c); }} style={{ color: 'var(--color-primary-400)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--font-size-sm)' }}>ویرایش</button><button onClick={(e) => { e.stopPropagation(); setDeletingItem(c); setShowDelete(true); }} style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--font-size-sm)' }}>حذف</button></div> },
  ];

  const CourseFormFields = () => (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Input label="کد دوره" value={courseForm.code} onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })} />
        <Input label="عنوان" value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} />
        <Select label="وضعیت" options={statusOptions} value={courseForm.status} onChange={(v) => setCourseForm({ ...courseForm, status: v as any })} />
        <Input label="مدت (جلسات)" type="number" value={String(courseForm.duration_sessions)} onChange={(e) => setCourseForm({ ...courseForm, duration_sessions: Number(e.target.value) })} />
        <Input label="شهریه (تومان)" type="number" value={String(courseForm.tuition_fee)} onChange={(e) => setCourseForm({ ...courseForm, tuition_fee: Number(e.target.value) })} />
        <Input label="هزینه ثبت‌نام (تومان)" type="number" value={String(courseForm.registration_fee)} onChange={(e) => setCourseForm({ ...courseForm, registration_fee: Number(e.target.value) })} />
        <Input label="دسته‌بندی" value={courseForm.category} onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })} />
        <Input label="مقطع" value={courseForm.level} onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })} />
      </div>
      <div style={{ marginTop: '1rem' }}>
        <Textarea label="توضیحات" value={courseForm.description} onChange={(e: any) => setCourseForm({ ...courseForm, description: e.target.value })} />
      </div>
    </>
  );

  const ClassFormFields = () => {
    const schedule = getSchedule();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            label="کد کلاس"
            value={classForm.code}
            onChange={(e) => setClassForm({ ...classForm, code: e.target.value })}
          />

          <Select
            label="دوره"
            options={courses.map((c: any) => ({ value: c.id, label: c.title }))}
            value={classForm.course_id}
            onChange={(v) => setClassForm({ ...classForm, course_id: v })}
          />

          <Select
            label="استاد"
            options={teachersList.map((t: any) => ({
              value: t.id,
              label: `${t.first_name} ${t.last_name}`,
            }))}
            value={classForm.teacher_id}
            onChange={(v) => setClassForm({ ...classForm, teacher_id: v })}
          />

          <Select
            label="نوع کلاس"
            options={[
              { value: 'group', label: 'گروهی' },
              { value: 'private', label: 'خصوصی' },
            ]}
            value={classForm.type}
            onChange={(v) => setClassForm({ ...classForm, type: v as any })}
          />

          <Input
            label="ظرفیت"
            type="number"
            value={String(classForm.capacity)}
            onChange={(e) =>
              setClassForm({ ...classForm, capacity: Number(e.target.value) })
            }
          />

          <Input
            label="کلاس درس"
            value={classForm.classroom}
            onChange={(e) =>
              setClassForm({ ...classForm, classroom: e.target.value })
            }
          />

          <Input
            label="تاریخ شروع"
            value={classForm.start_date}
            onChange={(e) =>
              setClassForm({ ...classForm, start_date: e.target.value })
            }
          />

          <Input
            label="تاریخ پایان"
            value={classForm.end_date}
            onChange={(e) =>
              setClassForm({ ...classForm, end_date: e.target.value })
            }
          />

          <Select
            label="وضعیت"
            options={statusOptions}
            value={classForm.status}
            onChange={(v) =>
              setClassForm({ ...classForm, status: v as any })
            }
          />
        </div>

        <div
          style={{
            marginTop: '0.5rem',
            padding: '1rem',
            borderRadius: '0.75rem',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-secondary)',
          }}
        >
          <div style={{ marginBottom: '0.75rem', fontWeight: 600 }}>
            برنامه هفتگی کلاس
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: '0.5rem',
            }}
          >
            {weekDays.map((day) => {
              const item = schedule.find((s) => s.day === day.value);
              const active = Boolean(item);

              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleScheduleDay(day.value)}
                  style={{
                    padding: '0.65rem 0.4rem',
                    borderRadius: '0.6rem',
                    border: active
                      ? '1px solid var(--color-primary-400)'
                      : '1px solid var(--color-border)',
                    background: active
                      ? 'var(--color-primary-500)'
                      : 'var(--color-bg-primary)',
                    color: active
                      ? 'white'
                      : 'var(--color-text-primary)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {day.label}
                </button>
              );
            })}
          </div>

          {schedule.length === 0 ? (
            <div
              style={{
                marginTop: '1rem',
                color: 'var(--color-text-tertiary)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              حداقل یک روز برای کلاس انتخاب کنید.
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                marginTop: '1rem',
              }}
            >
              {schedule
                .slice()
                .sort((a, b) => {
                  const ai = weekDays.findIndex((d) => d.value === a.day);
                  const bi = weekDays.findIndex((d) => d.value === b.day);
                  return ai - bi;
                })
                .map((item) => {
                  const day = weekDays.find((d) => d.value === item.day);

                  return (
                    <div
                      key={item.day}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '0.75rem',
                        alignItems: 'center',
                      }}
                    >
                      <strong>{day?.label}</strong>

                      <Input
                        label="ساعت شروع"
                        type="time"
                        value={item.start_time}
                        onChange={(e) =>
                          updateScheduleTime(
                            item.day,
                            'start_time',
                            e.target.value
                          )
                        }
                      />

                      <Input
                        label="ساعت پایان"
                        type="time"
                        value={item.end_time}
                        onChange={(e) =>
                          updateScheduleTime(
                            item.day,
                            'end_time',
                            e.target.value
                          )
                        }
                      />
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {(selectedCourse || selectedClass) && (
            <IconButton onClick={closeDetail}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            </IconButton>
          )}
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>{selectedCourse ? `${selectedCourse.title} (${selectedCourse.code})` : selectedClass ? `کلاس: ${selectedClass.code}` : 'دوره‌ها و کلاس‌ها'}</h1>
        </div>
        {!selectedCourse && !selectedClass && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant={activeView === 'courses' ? 'primary' : 'secondary'} onClick={() => setActiveView('courses')}>دوره‌ها</Button>
            <Button variant={activeView === 'classes' ? 'primary' : 'secondary'} onClick={() => setActiveView('classes')}>کلاس‌ها</Button>
          </div>
        )}
      </div>

      {/* ==== COURSE DETAIL VIEW ==== */}
      {selectedCourse ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <StatCard title="تعداد کلاس‌ها" value={courseClasses.length} icon={detailLoading ? undefined : <ClassIcon />} color="var(--color-primary-400)" loading={detailLoading} />
            <StatCard title="دانشجویان" value={courseStudents.length} icon={<StudentsIcon />} color="var(--color-success)" />
            <StatCard title="درآمد کل" value={courseRevenue.toLocaleString('fa-IR')} suffix=" تومان" icon={<RevenueIcon />} color="var(--color-warning)" />
            <StatCard title="شهریه" value={(selectedCourse.tuition_fee || 0).toLocaleString('fa-IR')} suffix=" تومان" icon={<FeeIcon />} color="var(--color-info)" />
          </div>

          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>اطلاعات دوره</h3>
              <Badge variant={statusVariant(selectedCourse.status)}>{statusOptions.find((o) => o.value === selectedCourse.status)?.label || selectedCourse.status}</Badge>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: 'var(--font-size-sm)' }}>
              <InfoRow label="کد" value={selectedCourse.code} />
              <InfoRow label="مدت" value={`${selectedCourse.duration_sessions} جلسه`} />
              <InfoRow label="مدت هر جلسه" value={`${selectedCourse.session_duration_minutes} دقیقه`} />
              <InfoRow label="دسته‌بندی" value={selectedCourse.category || '--'} />
              <InfoRow label="مقطع" value={selectedCourse.level || '--'} />
              <InfoRow label="هزینه ثبت‌نام" value={selectedCourse.registration_fee ? `${selectedCourse.registration_fee.toLocaleString('fa-IR')} تومان` : '--'} />
            </div>
            {selectedCourse.description && <p style={{ marginTop: '1rem', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', lineHeight: 1.7 }}>{selectedCourse.description}</p>}
          </Card>

          {/* Group Classes */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>کلاس‌های گروهی ({groupClasses.length})</h3>
              <Button size="sm" onClick={() => { setClassForm({ ...emptyClassForm(), course_id: selectedCourse.id, type: 'group' }); setShowAddClass(true); }}>افزودن کلاس گروهی</Button>
            </div>
            {groupClasses.length === 0 ? <EmptyState title="هیچ کلاس گروهی برای این دوره ثبت نشده است" /> : (
              <Table columns={classColumns} data={groupClasses} rowKey={(c: any) => c.id} onRowClick={(c: any) => openClassDetail(c)} />
            )}
          </Card>

          {/* Private Classes */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>کلاس‌های خصوصی ({privateClasses.length})</h3>
              <Button size="sm" variant="secondary" onClick={() => { setClassForm({ ...emptyClassForm(), course_id: selectedCourse.id, type: 'private', capacity: 1 }); setShowAddClass(true); }}>افزودن کلاس خصوصی</Button>
            </div>
            {privateClasses.length === 0 ? <EmptyState title="هیچ کلاس خصوصی برای این دوره ثبت نشده است" /> : (
              <Table columns={classColumns} data={privateClasses} rowKey={(c: any) => c.id} onRowClick={(c: any) => openClassDetail(c)} />
            )}
          </Card>

          {/* Students enrolled */}
          <Card>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: '1rem' }}>دانشجویان ثبت‌نام شده ({courseStudents.length})</h3>
            {courseStudents.length === 0 ? <EmptyState title="هیچ دانشجویی در این دوره ثبت‌نام نشده است" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {courseStudents.map((s) => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <span style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>{s.first_name} {s.last_name}</span>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginRight: '0.75rem' }}>{s.national_id}</span>
                    </div>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{s.phone}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : selectedClass ? (
        /* ==== CLASS DETAIL VIEW ==== */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <StatCard title="دانشجویان" value={classStudents.length} icon={<StudentsIcon />} color="var(--color-primary-400)" />
            <StatCard title="ظرفیت" value={`${classStudents.length} / ${selectedClass.capacity}`} icon={<CapacityIcon />} color={classStudents.length >= selectedClass.capacity ? 'var(--color-danger)' : 'var(--color-success)'} />
            <StatCard title="جلسات" value={classSessions.length} icon={<SessionIcon />} color="var(--color-info)" />
            <StatCard title="نوع" value={selectedClass.type === 'group' ? 'گروهی' : 'خصوصی'} icon={<TypeIcon />} color="var(--color-warning)" />
          </div>

          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>دانشجویان ثبت‌نام شده</h3>
              <Badge variant={statusVariant(selectedClass.status)}>{statusOptions.find((o) => o.value === selectedClass.status)?.label}</Badge>
            </div>
            {classStudents.length === 0 ? <EmptyState title="هیچ دانشجویی در این کلاس ثبت‌نام نشده است" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {classStudents.map(({ student, reg }) => (
                  <div key={student.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <span style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>{student.first_name} {student.last_name}</span>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginRight: '0.75rem' }}>{reg.registration_number}</span>
                    </div>
                    <Badge variant={reg.payment_status === 'paid' ? 'success' : reg.payment_status === 'overdue' ? 'danger' : 'warning'} size="sm">
                      {reg.payment_status === 'paid' ? 'پرداخت شده' : reg.payment_status === 'overdue' ? 'معوق' : 'در انتظار'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: '1rem' }}>جلسات ({classSessions.length})</h3>
            {classSessions.length === 0 ? <EmptyState title="هیچ جلسه‌ای ثبت نشده است" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {classSessions.map((s: any) => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: 'var(--border-thin)' }}>
                    <span style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>جلسه {s.session_number}</span>
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>{s.date_jalali || s.date} | {s.start_time} - {s.end_time}</span>
                    <Badge size="sm" variant={s.status === 'completed' ? 'success' : s.status === 'cancelled' ? 'danger' : 'info'}>
                      {s.status === 'completed' ? 'برگزار شده' : s.status === 'cancelled' ? 'لغو شده' : 'برنامه‌ریزی شده'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : (<>
        {/* ==== LIST VIEWS ==== */}
        {activeView === 'courses' ? (<>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <SearchInput placeholder="جستجو در دوره‌ها..." value={courseFilters.search} onChange={(v) => useCourseClassStore.getState().setCourseFilters({ search: v, page: 1 })} />
            <Select placeholder="همه وضعیت‌ها" options={statusOptions} value={courseFilters.status || ''} onChange={(v) => useCourseClassStore.getState().setCourseFilters({ status: v || null, page: 1 })} />
            <Button icon={<AddIcon />} onClick={() => { setCourseForm(emptyCourseForm()); setShowAddCourse(true); }}>ایجاد دوره جدید</Button>
          </div>
          <Card padding="0">
            <Table columns={courseColumns} data={courses} rowKey={(c) => c.id} isLoading={isLoading} emptyState={<EmptyState title="هیچ دوره‌ای ثبت نشده است" description="برای ایجاد اولین دوره کلیک کنید" action={<Button onClick={() => { setCourseForm(emptyCourseForm()); setShowAddCourse(true); }}>ایجاد دوره جدید</Button>} />} />
            <Pagination page={courseFilters.page} perPage={courseFilters.perPage} total={courseTotal} label="دوره" onPageChange={(p) => useCourseClassStore.getState().setCourseFilters({ page: p })} onPerPageChange={(p) => useCourseClassStore.getState().setCourseFilters({ perPage: p, page: 1 })} />
          </Card>
        </>) : (<>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <SearchInput placeholder="جستجو در کلاس‌ها..." value={classFilters.search} onChange={(v) => useCourseClassStore.getState().setClassFilters({ search: v, page: 1 })} />
            <Select placeholder="همه وضعیت‌ها" options={statusOptions} value={classFilters.status || ''} onChange={(v) => useCourseClassStore.getState().setClassFilters({ status: v || null, page: 1 })} />
            <Select placeholder="نوع کلاس" options={[{ value: 'group', label: 'گروهی' }, { value: 'private', label: 'خصوصی' }]} value={classFilters.type || ''} onChange={(v) => useCourseClassStore.getState().setClassFilters({ type: v || null, page: 1 })} />
            <Button icon={<AddIcon />} onClick={() => { setClassForm(emptyClassForm()); setShowAddClass(true); }}>افزودن کلاس جدید</Button>
          </div>
          <Card padding="0">
            <Table columns={classColumns} data={classes} rowKey={(c: any) => c.id} isLoading={isLoading} emptyState={<EmptyState title="هیچ کلاسی ثبت نشده است" description="برای اضافه کردن یک کلاس جدید کلیک کنید" action={<Button onClick={() => { setClassForm(emptyClassForm()); setShowAddClass(true); }}>افزودن کلاس جدید</Button>} />} />
            <Pagination page={classFilters.page} perPage={classFilters.perPage} total={classTotal} label="کلاس" onPageChange={(p) => useCourseClassStore.getState().setClassFilters({ page: p })} onPerPageChange={(p) => useCourseClassStore.getState().setClassFilters({ perPage: p, page: 1 })} />
          </Card>
        </>)}
      </>)}

      {/* Add Course Dialog */}
      <Modal isOpen={showAddCourse} onClose={() => setShowAddCourse(false)} title="ایجاد دوره جدید" size="lg" footer={<><Button variant="secondary" onClick={() => setShowAddCourse(false)}>انصراف</Button><Button onClick={handleAddCourse} loading={courseSaving}>ایجاد</Button></>}>{CourseFormFields()}</Modal>

      {/* Edit Course Dialog */}
      <Modal isOpen={showEditCourse} onClose={() => { setShowEditCourse(false); setEditingCourse(null); }} title="ویرایش دوره" size="lg" footer={<><Button variant="secondary" onClick={() => { setShowEditCourse(false); setEditingCourse(null); }}>انصراف</Button><Button onClick={handleEditCourse} loading={courseSaving}>ذخیره</Button></>}>{CourseFormFields()}</Modal>

      {/* Add Class Dialog */}
      <Modal isOpen={showAddClass} onClose={() => setShowAddClass(false)} title="افزودن کلاس جدید" size="lg" footer={<><Button variant="secondary" onClick={() => setShowAddClass(false)}>انصراف</Button><Button onClick={handleAddClass} loading={classSaving}>ایجاد</Button></>}>{ClassFormFields()}</Modal>

      {/* Edit Class Dialog */}
      <Modal isOpen={showEditClass} onClose={() => { setShowEditClass(false); setEditingClass(null); }} title="ویرایش کلاس" size="lg" footer={<><Button variant="secondary" onClick={() => { setShowEditClass(false); setEditingClass(null); }}>انصراف</Button><Button onClick={handleEditClass} loading={classSaving}>ذخیره</Button></>}>{ClassFormFields()}</Modal>

      {/* Delete Confirm */}
      <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="حذف" size="sm" footer={<><Button variant="secondary" onClick={() => setShowDelete(false)}>انصراف</Button><Button variant="danger" onClick={async () => { if (deletingItem) { if (activeView === 'courses') await courseService.delete(deletingItem.id); else await classService.delete(deletingItem.id); } setShowDelete(false); loadData(); }}>حذف</Button></>}>
        <p style={{ color: 'var(--color-text-secondary)' }}>آیا از حذف این آیتم اطمینان دارید؟</p>
      </Modal>
    </div>
  );
};

function AddIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function InfoRow({ label, value }: { label: string; value: string }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0' }}><span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>{label}:</span><span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{value}</span></div>;
}
function StudentsIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function ClassIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>; }
function RevenueIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>; }
function FeeIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>; }
function CapacityIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>; }
function SessionIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function TypeIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>; }