/**
 * Rumiland Academy — Quizzes & Reports Module (fully connected)
 */
import React, { useEffect, useState } from 'react';
import { Card, EmptyState, Table, Pagination, Badge, Modal } from '@/components/Layout';
import { Button, Input, Select, SearchInput, Textarea } from '@/components/Basic';
import type { Column } from '@/components/Layout';
import { db } from '@/db/schema';
import { v4 as uuid } from 'uuid';

// ================================================================
// QUIZZES PAGE
// ================================================================

export const QuizzesPage: React.FC = () => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [showQuizDialog, setShowQuizDialog] = useState(false);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [showGradeDialog, setShowGradeDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [showCertificateDialog, setShowCertificateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<any>(null);
  const [deletingQuiz, setDeletingQuiz] = useState<any>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [resultLoading, setResultLoading] = useState(false);

  const [quizForm, setQuizForm] = useState(emptyQuizForm());
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm());

  function emptyQuizForm() { return { title: '', description: '', course_id: '', class_id: '', teacher_id: '', quiz_type: 'multiple_choice', passing_score: 50, max_score: 100, time_limit_minutes: 60, start_date: '', end_date: '', is_random_questions: false, shuffle_answers: true, auto_grade: true, status: 'draft' }; }
  function emptyQuestionForm() { return { question_text: '', question_type: 'multiple_choice' as const, options: ['', '', '', ''], correct_answer: '', points: 10 }; }

  useEffect(() => { loadData(); }, [page, search]);

  const loadData = async () => {
    setLoading(true);
    const [q, c, cl, t] = await Promise.all([
      db.quizzes.filter((qz: any) => !qz.deleted_at).reverse().sortBy('created_at'),
      db.courses.filter((c: any) => !c.deleted_at).toArray(),
      db.classes.filter((c: any) => !c.deleted_at).toArray(),
      db.teachers.filter((t: any) => !t.deleted_at).toArray(),
    ]);
    const filtered = search ? q.filter((qz: any) => qz.title?.toLowerCase().includes(search.toLowerCase())) : q;
    setQuizzes(filtered.slice((page - 1) * 20, page * 20));
    setCourses(c); setClasses(cl); setTeachers(t);
    setLoading(false);
  };

  const handleSaveQuiz = async () => {
    if (!quizForm.title) return;
    setSaving(true);
    const now = new Date().toISOString();
    if (editingQuiz) await db.quizzes.update(editingQuiz.id, { ...quizForm, updated_at: now } as any);
    else await db.quizzes.put({ ...quizForm, id: uuid(), created_at: now, updated_at: now, deleted_at: null } as any);
    setSaving(false); setShowQuizDialog(false); setEditingQuiz(null); resetQuizForm(); loadData();
  };

  const handleSaveQuestion = async () => {
    if (!selectedQuiz || !questionForm.question_text) return;
    setSaving(true);
    const existingQuestions = await db.quizQuestions.where('quiz_id').equals(selectedQuiz.id).toArray();
    await db.quizQuestions.put({
      id: uuid(), quiz_id: selectedQuiz.id, question_bank_id: null,
      question_text: questionForm.question_text, question_type: questionForm.question_type,
      options_json: JSON.stringify(questionForm.options),
      correct_answer: questionForm.correct_answer, points: questionForm.points,
      order_index: existingQuestions.length + 1, image_url: null, audio_url: null,
    });
    await reloadQuestions(selectedQuiz.id);
    setSaving(false); setShowQuestionDialog(false); resetQuestionForm();
  };

  const reloadQuestions = async (quizId: string) => { setQuestions(await db.quizQuestions.where('quiz_id').equals(quizId).toArray()); };

  const handleDeleteQuiz = async () => {
    if (!deletingQuiz) return;
    await db.quizzes.update(deletingQuiz.id, { deleted_at: new Date().toISOString() } as any);
    setShowDeleteDialog(false); setDeletingQuiz(null); loadData();
  };

  const loadResults = async (quiz: any) => {
    setSelectedQuiz(quiz); setResultLoading(true);
    setResults(await db.quizResults.where('quiz_id').equals(quiz.id).toArray());
    setResultLoading(false); setShowResultsDialog(true);
  };

  const openGrading = async (quiz: any) => {
    setSelectedQuiz(quiz);
    const regs = await db.registrations.where('class_id').equals(quiz.class_id).filter((r: any) => !r.deleted_at).toArray();
    const existing = await db.quizResults.where('quiz_id').equals(quiz.id).toArray();
    const existingIds = new Set(existing.map((r: any) => r.student_id));
    const newResults = regs.filter((r: any) => !existingIds.has(r.student_id)).map((r: any) => ({
      id: uuid(), quiz_id: quiz.id, student_id: r.student_id, registration_id: r.id,
      score: 0, max_score: quiz.max_score, percentage: 0, grade: null,
      status: 'pending', teacher_notes: null, student_feedback: null,
      submitted_at: new Date().toISOString(), graded_at: null, graded_by: null,
    }));
    setResults([...existing, ...newResults]); setShowGradeDialog(true);
  };

  const saveGrades = async () => {
    if (!selectedQuiz) return;
    const now = new Date().toISOString();
    for (const r of results) {
      const existing = await db.quizResults.get(r.id);
      const percentage = r.max_score > 0 ? Math.round((r.score / r.max_score) * 100) : 0;
      const grade = percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : 'F';
      const data = { ...r, percentage, grade, status: 'graded', graded_at: now, graded_by: 'admin' };
      if (existing) await db.quizResults.update(r.id, data);
      else await db.quizResults.put(data);
    }
    await db.quizzes.update(selectedQuiz.id, { status: 'graded', updated_at: now });
    setShowGradeDialog(false); loadData();
  };

  const issueCertificates = async () => {
    if (!selectedQuiz) return;
    const graded = results.filter((r: any) => r.percentage >= (selectedQuiz.passing_score / selectedQuiz.max_score * 100));
    const now = new Date().toISOString();
    const count = await db.certificates.count();
    for (const r of graded) {
      const certNum = `CERT-${String(count + 1).padStart(6, '0')}`;
      const verifyCode = uuid().split('-')[0].toUpperCase();
      await db.certificates.put({
        id: uuid(), certificate_number: certNum, verification_code: verifyCode,
        student_id: r.student_id, course_id: selectedQuiz.course_id, registration_id: r.registration_id,
        issue_date: now, issue_date_jalali: '', final_score: r.score,
        status: 'issued', qr_code_data: JSON.stringify({ cert: certNum, verify: verifyCode }),
        created_at: now, updated_at: now,
      });
    }
    setShowCertificateDialog(false);
  };

  function resetQuizForm() { setQuizForm(emptyQuizForm()); }
  function resetQuestionForm() { setQuestionForm(emptyQuestionForm()); }

  const quizTypeOpts = [
    { value: 'multiple_choice', label: 'چهارگزینه‌ای' }, { value: 'true_false', label: 'صحیح / غلط' },
    { value: 'short_answer', label: 'پاسخ کوتاه' }, { value: 'essay', label: 'تشریحی' },
  ];

  const statusLabel = (s: string) => {
    switch (s) { case 'draft': return 'پیش‌نویس'; case 'published': return 'منتشر شده'; case 'graded': return 'نمره‌دهی شده'; case 'archived': return 'بایگانی'; default: return s; }
  };
  const statusVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary' => {
    switch (s) { case 'published': return 'success'; case 'graded': return 'primary'; case 'draft': return 'neutral'; case 'archived': return 'warning'; default: return 'neutral'; }
  };

  const quizColumns: Column<any>[] = [
    { key: 'title', title: 'عنوان', render: (q: any) => <span style={{ fontWeight: 500 }}>{q.title}</span> },
    { key: 'quiz_type', title: 'نوع', render: (q: any) => <Badge variant="info" size="sm">{quizTypeOpts.find((o) => o.value === q.quiz_type)?.label || q.quiz_type}</Badge> },
    { key: 'course', title: 'دوره', render: (q: any) => courses.find((c: any) => c.id === q.course_id)?.title || '--' },
    { key: 'score', title: 'نمره', render: (q: any) => `${q.passing_score} / ${q.max_score}` },
    { key: 'status', title: 'وضعیت', render: (q: any) => <Badge variant={statusVariant(q.status)}>{statusLabel(q.status)}</Badge> },
    { key: 'actions', title: 'عملیات', render: (q: any) => (
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
        <button onClick={(e) => { e.stopPropagation(); setEditingQuiz(q); setQuizForm({ title: q.title, description: q.description || '', course_id: q.course_id, class_id: q.class_id, teacher_id: q.teacher_id, quiz_type: q.quiz_type, passing_score: q.passing_score, max_score: q.max_score, time_limit_minutes: q.time_limit_minutes || 60, start_date: q.start_date, end_date: q.end_date, is_random_questions: q.is_random_questions, shuffle_answers: q.shuffle_answers, auto_grade: q.auto_grade, status: q.status }); setShowQuizDialog(true); }} style={{ color: 'var(--color-primary-400)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--font-size-xs)' }}>ویرایش</button>
        <button onClick={(e) => { e.stopPropagation(); setSelectedQuiz(q); reloadQuestions(q.id); setShowQuestionDialog(true); }} style={{ color: 'var(--color-accent-400)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--font-size-xs)' }}>سوالات</button>
        <button onClick={(e) => { e.stopPropagation(); openGrading(q); }} style={{ color: 'var(--color-warning)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--font-size-xs)' }}>نمره‌دهی</button>
        <button onClick={(e) => { e.stopPropagation(); loadResults(q); }} style={{ color: 'var(--color-info)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--font-size-xs)' }}>نتایج</button>
        <button onClick={(e) => { e.stopPropagation(); setSelectedQuiz(q); setResults([]); setShowCertificateDialog(true); }} style={{ color: 'var(--color-success)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--font-size-xs)' }}>مدرک</button>
        <button onClick={(e) => { e.stopPropagation(); setDeletingQuiz(q); setShowDeleteDialog(true); }} style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--font-size-xs)' }}>حذف</button>
      </div>
    )},
  ];

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>آزمون‌ها و کوییزها</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <SearchInput placeholder="جستجو در آزمون‌ها..." value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
          <Button variant="secondary">بانک سوالات</Button>
          <Button onClick={() => { setEditingQuiz(null); resetQuizForm(); setShowQuizDialog(true); }}>آزمون جدید</Button>
        </div>
      </div>

      <Card padding="0">
        <Table columns={quizColumns} data={quizzes} rowKey={(q: any) => q.id} isLoading={loading}
          emptyState={<EmptyState title="هیچ آزمونی ثبت نشده است" description="برای ایجاد اولین آزمون جدید کلیک کنید" action={<Button onClick={() => { setEditingQuiz(null); resetQuizForm(); setShowQuizDialog(true); }}>بارگزاری آزمون جدید</Button>} />}
        />
        <Pagination page={page} perPage={20} total={quizzes.length} label="آزمون" onPageChange={setPage} onPerPageChange={() => {}} />
      </Card>

      {/* Quiz Form Dialog */}
      <Modal isOpen={showQuizDialog} onClose={() => { setShowQuizDialog(false); setEditingQuiz(null); }} title={editingQuiz ? 'ویرایش آزمون' : 'آزمون جدید'} size="lg"
        footer={<><Button variant="secondary" onClick={() => { setShowQuizDialog(false); setEditingQuiz(null); }}>انصراف</Button><Button onClick={handleSaveQuiz} loading={saving}>{editingQuiz ? 'ذخیره' : 'ایجاد'}</Button></>}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input label="نام آزمون" value={quizForm.title} onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })} />
          <Select label="نوع آزمون" options={quizTypeOpts} value={quizForm.quiz_type} onChange={(v) => setQuizForm({ ...quizForm, quiz_type: v })} />
          <Select label="دوره" options={courses.map((c: any) => ({ value: c.id, label: c.title }))} value={quizForm.course_id} onChange={(v) => setQuizForm({ ...quizForm, course_id: v })} />
          <Select label="کلاس" options={classes.map((c: any) => ({ value: c.id, label: c.code }))} value={quizForm.class_id} onChange={(v) => setQuizForm({ ...quizForm, class_id: v })} />
          <Select label="استاد" options={teachers.map((t: any) => ({ value: t.id, label: `${t.first_name} ${t.last_name}` }))} value={quizForm.teacher_id} onChange={(v) => setQuizForm({ ...quizForm, teacher_id: v })} />
          <Select label="وضعیت" options={[{ value: 'draft', label: 'پیش‌نویس' }, { value: 'published', label: 'منتشر شده' }, { value: 'in_progress', label: 'در حال برگزاری' }, { value: 'graded', label: 'نمره‌دهی شده' }, { value: 'archived', label: 'بایگانی' }]} value={quizForm.status} onChange={(v) => setQuizForm({ ...quizForm, status: v })} />
          <Input label="نمره قبولی" type="number" value={String(quizForm.passing_score)} onChange={(e) => setQuizForm({ ...quizForm, passing_score: Number(e.target.value) })} />
          <Input label="حداکثر نمره" type="number" value={String(quizForm.max_score)} onChange={(e) => setQuizForm({ ...quizForm, max_score: Number(e.target.value) })} />
          <Input label="مدت زمان (دقیقه)" type="number" value={String(quizForm.time_limit_minutes || 0)} onChange={(e) => setQuizForm({ ...quizForm, time_limit_minutes: Number(e.target.value) })} />
          <Input label="تاریخ شروع" value={quizForm.start_date} onChange={(e) => setQuizForm({ ...quizForm, start_date: e.target.value })} />
          <Input label="تاریخ پایان" value={quizForm.end_date} onChange={(e) => setQuizForm({ ...quizForm, end_date: e.target.value })} />
        </div>
        <div style={{ marginTop: '1rem' }}><Textarea label="توضیحات" value={quizForm.description} onChange={(e: any) => setQuizForm({ ...quizForm, description: e.target.value })} /></div>
      </Modal>

      {/* Question Dialog */}
      <Modal isOpen={showQuestionDialog} onClose={() => setShowQuestionDialog(false)} title={`سوالات: ${selectedQuiz?.title || ''}`} size="md"
        footer={<><Button variant="secondary" onClick={() => setShowQuestionDialog(false)}>بستن</Button><Button onClick={handleSaveQuestion} loading={saving}>افزودن سوال</Button></>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Textarea label="متن سوال" value={questionForm.question_text} onChange={(e: any) => setQuestionForm({ ...questionForm, question_text: e.target.value })} />
          <Select label="نوع سوال" options={[{ value: 'multiple_choice', label: 'چهارگزینه‌ای' }, { value: 'true_false', label: 'صحیح/غلط' }, { value: 'short_answer', label: 'پاسخ کوتاه' }, { value: 'essay', label: 'تشریحی' }]} value={questionForm.question_type} onChange={(v) => setQuestionForm({ ...questionForm, question_type: v as any })} />
          {questionForm.question_type === 'multiple_choice' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>گزینه‌ها</label>
              {questionForm.options.map((opt: string, i: number) => (
                <Input key={i} placeholder={`گزینه ${i + 1}`} value={opt} onChange={(e) => { const opts = [...questionForm.options]; opts[i] = e.target.value; setQuestionForm({ ...questionForm, options: opts }); }} />
              ))}
            </div>
          )}
          <Input label="پاسخ صحیح" value={questionForm.correct_answer} onChange={(e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value })} />
          <Input label="امتیاز" type="number" value={String(questionForm.points)} onChange={(e) => setQuestionForm({ ...questionForm, points: Number(e.target.value) })} />
        </div>
        {questions.length > 0 && (
          <div style={{ marginTop: '1.5rem', borderTop: 'var(--border-default)', paddingTop: '1rem' }}>
            <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '0.75rem' }}>سوالات ثبت شده ({questions.length})</h4>
            {questions.map((q: any, i: number) => (
              <div key={q.id} style={{ padding: '0.5rem 0', borderBottom: 'var(--border-thin)', fontSize: 'var(--font-size-sm)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{i + 1}. {q.question_text}</span><span style={{ color: 'var(--color-text-muted)' }}>{q.points} امتیاز</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Grading Dialog */}
      <Modal isOpen={showGradeDialog} onClose={() => setShowGradeDialog(false)} title={`نمره‌دهی: ${selectedQuiz?.title || ''}`} size="lg"
        footer={<><Button variant="secondary" onClick={() => setShowGradeDialog(false)}>بستن</Button><Button onClick={saveGrades}>ذخیره نمرات</Button></>}
      >
        {resultLoading ? <div style={{ textAlign: 'center', padding: '2rem' }}>در حال بارگذاری...</div> : results.length === 0 ? <EmptyState title="هیچ دانشجویی برای نمره‌دهی یافت نشد" /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: 'var(--border-default)' }}>{['دانشجو', 'نمره', 'درصد', 'وضعیت'].map((h) => <th key={h} style={{ padding: '0.5rem 0.75rem', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)', textAlign: 'right' }}>{h}</th>)}</tr></thead>
            <tbody>{results.map((r: any, i: number) => (
              <tr key={r.id || i} style={{ borderBottom: 'var(--border-thin)' }}><td style={{ padding: '0.5rem 0.75rem', fontSize: 'var(--font-size-sm)' }}>{r.student_id}</td><td style={{ padding: '0.5rem 0.75rem' }}><input type="number" min="0" max={selectedQuiz?.max_score || 100} value={r.score} onChange={(e) => { const u = [...results]; u[i] = { ...u[i], score: Number(e.target.value) }; setResults(u); }} style={{ width: 70, padding: '0.25rem 0.5rem', background: 'var(--color-input)', border: 'var(--border-default)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }} /></td><td style={{ padding: '0.5rem 0.75rem', fontSize: 'var(--font-size-sm)' }}>{Math.round((r.score / (r.max_score || 100)) * 100)}%</td><td style={{ padding: '0.5rem 0.75rem' }}><Badge variant={r.status === 'graded' ? 'success' : 'warning'} size="sm">{r.status === 'graded' ? 'نمره داده شده' : 'در انتظار'}</Badge></td></tr>
            ))}</tbody>
          </table>
        )}
      </Modal>

      {/* Results Dialog */}
      <Modal isOpen={showResultsDialog} onClose={() => setShowResultsDialog(false)} title={`نتایج: ${selectedQuiz?.title || ''}`} size="lg"
        footer={<Button variant="secondary" onClick={() => setShowResultsDialog(false)}>بستن</Button>}
      >
        {resultLoading ? <div style={{ textAlign: 'center', padding: '2rem' }}>در حال بارگذاری...</div> : results.length === 0 ? <EmptyState title="هیچ نتیجه‌ای ثبت نشده است" /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: 'var(--border-default)' }}>{['دانشجو', 'نمره', 'درصد', 'نمره', 'وضعیت'].map((h) => <th key={h} style={{ padding: '0.5rem 0.75rem', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)', textAlign: 'right' }}>{h}</th>)}</tr></thead>
            <tbody>{results.map((r: any) => (<tr key={r.id} style={{ borderBottom: 'var(--border-thin)' }}><td style={{ padding: '0.5rem 0.75rem' }}>{r.student_id}</td><td style={{ padding: '0.5rem 0.75rem' }}>{r.score}/{r.max_score}</td><td style={{ padding: '0.5rem 0.75rem' }}>{r.percentage}%</td><td style={{ padding: '0.5rem 0.75rem' }}>{r.grade || '--'}</td><td style={{ padding: '0.5rem 0.75rem' }}><Badge variant={r.status === 'published' ? 'success' : 'warning'} size="sm">{r.status === 'published' ? 'منتشر شده' : 'نمره داده شده'}</Badge></td></tr>))}</tbody>
          </table>
        )}
      </Modal>

      {/* Certificate Dialog */}
      <Modal isOpen={showCertificateDialog} onClose={() => setShowCertificateDialog(false)} title={`صدور گواهی: ${selectedQuiz?.title || ''}`} size="md"
        footer={<><Button variant="secondary" onClick={() => setShowCertificateDialog(false)}>انصراف</Button><Button onClick={issueCertificates}>صدور گواهی</Button></>}
      >
        <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>برای تمام دانشجویانی که نمره قبولی ({selectedQuiz?.passing_score} از {selectedQuiz?.max_score}) را کسب کرده‌اند، گواهی صادر خواهد شد.</p>
      </Modal>

      {/* Delete Dialog */}
      <Modal isOpen={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} title="حذف آزمون" size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>انصراف</Button><Button variant="danger" onClick={handleDeleteQuiz}>حذف</Button></>}
      >
        <p style={{ color: 'var(--color-text-secondary)' }}>آیا از حذف آزمون «{deletingQuiz?.title}» اطمینان دارید؟</p>
      </Modal>
    </div>
  );
};

// ================================================================
// REPORTS PAGE
// ================================================================

export const ReportsPage: React.FC = () => {
  const [stats, setStats] = useState({ students: 0, classes: 0, attendancePct: 0, revenue: 0, courses: 0, teachers: 0, payments: 0, registrations: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    const [students, classes, teachers, payments, courses, registrations, attendance] = await Promise.all([
      db.students.filter((s: any) => !s.deleted_at).count(),
      db.classes.filter((c: any) => !c.deleted_at).count(),
      db.teachers.filter((t: any) => !t.deleted_at).count(),
      db.payments.filter((p: any) => !p.deleted_at).toArray(),
      db.courses.filter((c: any) => !c.deleted_at).count(),
      db.registrations.filter((r: any) => !r.deleted_at).count(),
      db.attendance.toArray(),
    ]);
    const revenue = payments.reduce((s: number, p: any) => s + p.amount, 0);
    const attPresent = attendance.filter((a: any) => a.status === 'present').length;
    const attPct = Math.round((attPresent / (attendance.length || 1)) * 100);
    setStats({ students, classes, attendancePct: attPct, revenue, courses, teachers, payments: payments.length, registrations });
    setLoading(false);
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: '1.5rem' }}>گزارش‌ها و آمار</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[{ title: 'تعداد هنرجویان', value: stats.students.toLocaleString('fa-IR'), color: 'var(--color-primary-400)' }, { title: 'کلاس‌های فعال', value: stats.classes.toLocaleString('fa-IR'), color: 'var(--color-success)' }, { title: 'درصد حضور', value: `${stats.attendancePct}%`, color: 'var(--color-info)' }, { title: 'درآمد کل', value: `${stats.revenue.toLocaleString('fa-IR')} تومان`, color: 'var(--color-warning)' }].map((c, i) => (
          <Card key={i} padding="1.25rem" style={{ textAlign: 'center' }}><div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>{c.title}</div><div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: c.color }}>{loading ? '...' : c.value}</div></Card>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <Card style={{ minHeight: 320 }}><h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: '1rem' }}>توزیع دانش‌آموزان در کلاس‌ها</h3><EmptyState title="داده‌های نمودار از اطلاعات واقعی محاسبه می‌شود" /></Card>
        <Card style={{ minHeight: 320 }}><h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: '1rem' }}>گزارش‌های مالی</h3><EmptyState title="گزارش‌های مالی پس از ثبت پرداخت‌ها نمایش داده می‌شود" /></Card>
      </div>
      <Card><h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: '1rem' }}>خلاصه آمار کلی</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {[{ l: 'دوره‌ها', v: stats.courses }, { l: 'اساتید', v: stats.teachers }, { l: 'پرداخت‌ها', v: stats.payments }, { l: 'ثبت‌نام‌ها', v: stats.registrations }].map((s, i) => (
            <div key={i} style={{ padding: '0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}><div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{s.l}</div><div style={{ fontSize: 'var(--font-size-md)', fontWeight: 700 }}>{loading ? '...' : s.v.toLocaleString('fa-IR')}</div></div>
          ))}
        </div>
      </Card>
    </div>
  );
};