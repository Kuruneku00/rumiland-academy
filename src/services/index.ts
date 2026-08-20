/**
 * Rumiland Academy — Full Service Layer with resolved lookups
 */
import { BaseService } from './base';
import { createIncomeTransactionForPayment, syncTransactionForPayment, removeTransactionForPayment, persistRegistrationFigures, registrationTotal, resolveRegistrationTotal, paidAmountForRegistration, parseInstallmentPlan } from './finance';
import { db } from '@/db/schema';
import type { Student, Teacher, Course, Class, Registration, Session, Attendance, Payment, FinanceTransaction, FinanceCategory, RecurringExpense, Quiz, QuizQuestion, QuizResult, Certificate, Announcement, Notification, QuestionBank, AcademySettings, AuditLog, User, Role } from '@/db/schema';
import { v4 as uuid } from 'uuid';

// ================================================================
// RESOLVER UTILITIES
// ================================================================
async function resolveStudentName(id: string): Promise<string> {
  const s = await db.students.get(id);
  return s ? `${s.first_name} ${s.last_name}` : id;
}
async function resolveCourseTitle(id: string): Promise<string> {
  const c = await db.courses.get(id);
  return c?.title || id;
}
async function resolveClassName(id: string): Promise<string> {
  const c = await db.classes.get(id);
  return c?.code || id;
}
async function resolveTeacherName(id: string): Promise<string> {
  const t = await db.teachers.get(id);
  return t ? `${t.first_name} ${t.last_name}` : id;
}

// ================================================================
// STUDENT SERVICE
// ================================================================
export class StudentService extends BaseService<Student> {
  constructor() { super(db.students, 'students'); }

  async searchStudents(query: string): Promise<Student[]> {
    if (!query) return this.getAll();
    const q = query.toLowerCase();
    return db.students.filter((s: any) => !s.deleted_at && (s.first_name?.toLowerCase().includes(q) || s.last_name?.toLowerCase().includes(q) || s.national_id?.includes(q) || s.phone?.includes(q))).toArray();
  }

  async getStudentClasses(studentId: string): Promise<{ registration: Registration; class: Class; course: Course; teacher: Teacher | null }[]> {
    const regs = await db.registrations.where('student_id').equals(studentId).filter((r: any) => !r.deleted_at).toArray();
    const results = [];
    for (const reg of regs) {
      const cls = await db.classes.get(reg.class_id);
      const course = cls ? await db.courses.get(cls.course_id) : null;
      const teacher = cls ? await db.teachers.get(cls.teacher_id) : null;
      if (cls && course) results.push({ registration: reg, class: cls, course, teacher: teacher || null });
    }
    return results;
  }

  async getStudentPayments(studentId: string): Promise<Payment[]> {
    return db.payments.where('student_id').equals(studentId).filter((p: any) => !p.deleted_at).toArray();
  }
  async getStudentAttendance(studentId: string): Promise<Attendance[]> {
    return db.attendance.where('student_id').equals(studentId).toArray();
  }
  async getStudentQuizResults(studentId: string): Promise<QuizResult[]> {
    return db.quizResults.where('student_id').equals(studentId).toArray();
  }
}

// ================================================================
// TEACHER SERVICE
// ================================================================
export class TeacherService extends BaseService<Teacher> {
  constructor() { super(db.teachers, 'teachers'); }
}

// ================================================================
// COURSE SERVICE
// ================================================================
export class CourseService extends BaseService<Course> {
  constructor() { super(db.courses, 'courses'); }
  async getCourseClasses(courseId: string): Promise<Class[]> {
    return db.classes.where('course_id').equals(courseId).filter((c: any) => !c.deleted_at).toArray();
  }
  async getCourseStudents(courseId: string): Promise<Student[]> {
    const regs = await db.registrations.where('course_id').equals(courseId).filter((r: any) => !r.deleted_at).toArray();
    const studentIds = [...new Set(regs.map((r: any) => r.student_id))];
    const students: Student[] = [];
    for (const sid of studentIds) { const s = await db.students.get(sid); if (s && !s.deleted_at) students.push(s); }
    return students;
  }
}

// ================================================================
// CLASS SERVICE
// ================================================================
export class ClassService extends BaseService<Class> {
  constructor() {
    super(db.classes, 'classes');
  }

  // ------------------------------------------------------------
  // Get students registered in a class
  // ------------------------------------------------------------
  async getClassStudents(
    classId: string
  ): Promise<{ student: Student; registration: Registration }[]> {
    const regs = await db.registrations
      .where('class_id')
      .equals(classId)
      .filter((r: any) => !r.deleted_at)
      .toArray();

    const results: {
      student: Student;
      registration: Registration;
    }[] = [];

    for (const reg of regs) {
      const student = await db.students.get(reg.student_id);

      if (student && !student.deleted_at) {
        results.push({
          student,
          registration: reg,
        });
      }
    }

    return results;
  }

  // ------------------------------------------------------------
  // Get all sessions of a class
  // ------------------------------------------------------------
  async getClassSessions(classId: string): Promise<Session[]> {
    return db.sessions
      .where('class_id')
      .equals(classId)
      .toArray();
  }

  // ------------------------------------------------------------
  // Get class + course + teacher
  // ------------------------------------------------------------
  async getClassWithDetails(
    classId: string
  ): Promise<{
    cls: Class;
    course: Course | null;
    teacher: Teacher | null;
  } | null> {
    const cls = await db.classes.get(classId);

    if (!cls) {
      return null;
    }

    const course =
      (await db.courses.get(cls.course_id)) || null;

    const teacher =
      (await db.teachers.get(cls.teacher_id)) || null;

    return {
      cls,
      course,
      teacher,
    };
  }

  // ------------------------------------------------------------
  // Convert Date to YYYY-MM-DD
  // ------------------------------------------------------------
  private formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // ------------------------------------------------------------
  // Generate class sessions from schedule
  // ------------------------------------------------------------
  async generateSessions(
    classId: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // ----------------------------------------------------------
      // Get class
      // ----------------------------------------------------------
      const cls = await db.classes.get(classId);

      if (!cls) {
        return {
          success: false,
          error: 'کلاس موردنظر پیدا نشد',
        };
      }

      // ----------------------------------------------------------
      // Get course
      // ----------------------------------------------------------
      const course = await db.courses.get(cls.course_id);

      if (!course) {
        return {
          success: false,
          error: 'دوره مربوط به کلاس پیدا نشد',
        };
      }

      // ----------------------------------------------------------
      // Parse schedule
      // ----------------------------------------------------------
      let schedule: Array<{
        day: number;
        start_time: string;
        end_time: string;
      }> = [];

      try {
        const parsed = JSON.parse(
          cls.schedule_json || '[]'
        );

        if (Array.isArray(parsed)) {
          schedule = parsed;
        }
      } catch {
        return {
          success: false,
          error: 'برنامه زمانی کلاس نامعتبر است',
        };
      }

      if (schedule.length === 0) {
        return {
          success: false,
          error: 'برای این کلاس هیچ روز و ساعتی ثبت نشده است',
        };
      }

      // ----------------------------------------------------------
      // Number of sessions
      // ----------------------------------------------------------
      const totalSessions = Number(
        course.duration_sessions || 0
      );

      if (totalSessions <= 0) {
        return {
          success: false,
          error: 'تعداد جلسات دوره معتبر نیست',
        };
      }

      // ----------------------------------------------------------
      // Validate start date
      // ----------------------------------------------------------
      const startDate = new Date(cls.start_date);

      if (Number.isNaN(startDate.getTime())) {
        return {
          success: false,
          error: 'تاریخ شروع کلاس معتبر نیست',
        };
      }

      startDate.setHours(0, 0, 0, 0);

      // ----------------------------------------------------------
      // Remove old sessions
      //
      // This is important when editing a class.
      // Otherwise old sessions would remain in the calendar.
      // ----------------------------------------------------------
      await db.sessions
        .where('class_id')
        .equals(classId)
        .delete();

      // ----------------------------------------------------------
      // Generate new sessions
      // ----------------------------------------------------------
      const sessions: Session[] = [];

      let currentDate = new Date(startDate);
      let sessionNumber = 1;

      /*
       * Maximum number of days we are willing to inspect.
       *
       * Normally a class with one or two weekly sessions
       * needs much less than this.
       *
       * This prevents an accidental infinite loop if the
       * schedule is malformed.
       */
      const maxDays = totalSessions * 14 + 30;

      let checkedDays = 0;

      while (
        sessionNumber <= totalSessions &&
        checkedDays < maxDays
      ) {
        const jsDay = currentDate.getDay();

        /*
         * Schedule format:
         *
         * شنبه      = 6
         * یکشنبه    = 0
         * دوشنبه    = 1
         * سه‌شنبه   = 2
         * چهارشنبه  = 3
         * پنجشنبه   = 4
         * جمعه      = 5
         */
        const scheduleItem = schedule.find(
          (item) => Number(item.day) === jsDay
        );

        if (scheduleItem) {
          const now = new Date().toISOString();

          const session: Session = {
            id: uuid(),

            class_id: classId,

            session_number: sessionNumber,

            date: this.formatDateKey(currentDate),

            date_jalali: '',

            start_time:
              scheduleItem.start_time || '17:00',

            end_time:
              scheduleItem.end_time || '18:30',

            teacher_id: cls.teacher_id,

            classroom:
              cls.classroom || null,

            status: 'scheduled',

            notes: null,

            created_at: now,

            updated_at: now,
          };

          sessions.push(session);

          sessionNumber++;
        }

        currentDate.setDate(
          currentDate.getDate() + 1
        );

        checkedDays++;
      }

      // ----------------------------------------------------------
      // No sessions generated
      // ----------------------------------------------------------
      if (sessions.length === 0) {
        return {
          success: false,
          error: 'هیچ جلسه‌ای بر اساس برنامه زمانی ساخته نشد',
        };
      }

      // ----------------------------------------------------------
      // Not enough sessions generated
      // ----------------------------------------------------------
      if (sessions.length < totalSessions) {
        return {
          success: false,
          error:
            `فقط ${sessions.length} جلسه از ` +
            `${totalSessions} جلسه ساخته شد`,
        };
      }

      // ----------------------------------------------------------
      // Save all sessions
      // ----------------------------------------------------------
      await db.sessions.bulkPut(sessions);

      return {
        success: true,
      };
    } catch (err: any) {
      console.error(
        'generateSessions error:',
        err
      );

      return {
        success: false,
        error:
          err?.message ||
          'خطا در ساخت جلسات کلاس',
      };
    }
  }
}

 

   
     
// ================================================================
// REGISTRATION SERVICE
// ================================================================
export class RegistrationService extends BaseService<Registration> {
  constructor() { super(db.registrations, 'registrations'); }
  private async notify(title: string, message: string, type: Notification['type'] = 'success', category: Notification['category'] = 'class') {
    try { await new NotificationService().send('system', title, message, type, category); } catch {}
  }

  async getRegistrationsResolved(options: { page?: number; perPage?: number } = {}): Promise<{ data: Array<{ registration: Registration; studentName: string; courseTitle: string; className: string }>; total: number }> {
    const { page = 1, perPage = 20 } = options;
    let all = await db.registrations.filter((r: any) => !r.deleted_at).reverse().sortBy('created_at');
    const total = all.length;
    const start = (page - 1) * perPage;
    const slice = all.slice(start, start + perPage);
    const data = await Promise.all(slice.map(async (reg) => ({
      registration: reg,
      studentName: await resolveStudentName(reg.student_id),
      courseTitle: await resolveCourseTitle(reg.course_id),
      className: await resolveClassName(reg.class_id),
    })));
    return { data, total };
  }

  async registerStudent(data: {
    student_id: string;
    course_id: string;
    class_id: string;
    registration_fee?: number;
    tuition_fee?: number;
    discount?: number;
    installments?: number;
    installment_plan?: Array<{
      number: number;
      amount: number;
      due_date?: string;
      title?: string;
    }>;
    initial_payment?: number;
    initial_payment_method?: Payment['method'];
    registration_date_jalali?: string;
    notes?: string;
  }): Promise<{ success: boolean; data?: Registration; error?: string }> {
    try {
      const cls = await db.classes.get(data.class_id);
      if (!cls) return { success: false, error: 'کلاس یافت نشد' };

      const existingRegs = await db.registrations
        .where('class_id')
        .equals(data.class_id)
        .filter((r: any) => !r.deleted_at)
        .count();

      if (cls.capacity > 0 && existingRegs >= cls.capacity) {
        return { success: false, error: 'ظرفیت کلاس تکمیل است' };
      }

      const dups = await db.registrations
        .where('student_id')
        .equals(data.student_id)
        .and((r: any) => r.class_id === data.class_id && !r.deleted_at)
        .count();

      if (dups > 0) {
        return { success: false, error: 'دانشجو قبلاً در این کلاس ثبت‌نام شده است' };
      }

      const tuition = Math.max(0, Number(data.tuition_fee || 0));
      const registrationFee = Math.max(0, Number(data.registration_fee || 0));
      const discount = Math.max(0, Number(data.discount || 0));

      let plan = data.installment_plan || [];

      // اگر برنامه اقساط صریح داده شده (مثلاً شهریه ماهانه)، مجموع مبلغ از خود اقساط محاسبه می‌شود،
      // وگرنه از شهریه دوره + هزینه ثبت‌نام − تخفیف.
      const hasExplicitPlan = plan.length > 0;
      const totalAmount = hasExplicitPlan
        ? plan.reduce((sum, item) => sum + Math.max(0, Number(item.amount || 0)), 0)
        : Math.max(0, tuition + registrationFee - discount);

      const installments = hasExplicitPlan
        ? plan.length
        : (data.installments === 2 ? 2 : 1);

      if (!plan.length) {
        if (installments === 1) {
          plan = [{
            number: 1,
            amount: totalAmount,
            due_date: new Date().toISOString().split('T')[0],
            title: 'قسط کامل'
          }];
        } else {
          const first = Math.floor(totalAmount / 2);
          plan = [
            {
              number: 1,
              amount: first,
              due_date: new Date().toISOString().split('T')[0],
              title: 'قسط اول'
            },
            {
              number: 2,
              amount: totalAmount - first,
              due_date: '',
              title: 'قسط دوم'
            }
          ];
        }
      }

      const planTotal = plan.reduce((sum, item) => sum + Math.max(0, Number(item.amount || 0)), 0);

      // این اعتبارسنجی فقط وقتی معنا دارد که برنامه اقساط را خود سیستم ساخته باشد؛
      // وقتی کاربر صریحاً اقساط (مثلاً ماهانه) داده، totalAmount خودش از همان اقساط است.
      if (!hasExplicitPlan && planTotal !== totalAmount) {
        return {
          success: false,
          error: `مجموع اقساط باید دقیقاً ${totalAmount.toLocaleString('fa-IR')} تومان باشد`
        };
      }

      const count = await db.registrations.filter((r: any) => !r.deleted_at).count();
      const regNum = `REG-${String(count + 1).padStart(6, '0')}`;
      const now = new Date().toISOString();

      const initialPayment = Math.min(
        totalAmount,
        Math.max(0, Number(data.initial_payment || 0))
      );

      const paymentStatus: Registration['payment_status'] =
        initialPayment >= totalAmount && totalAmount > 0
          ? 'paid'
          : initialPayment > 0
            ? 'partial'
            : 'pending';

      const registration: Registration = {
        id: uuid(),
        registration_number: regNum,
        student_id: data.student_id,
        course_id: data.course_id,
        class_id: data.class_id,
        registration_date: now,
        registration_date_jalali: data.registration_date_jalali || '',
        start_date: cls.start_date,
        expected_end_date: cls.end_date,
        registration_fee: registrationFee,
        tuition_fee: tuition,
        discount,
        installments,
        total_amount: totalAmount,
        paid_amount: initialPayment,
        remaining_amount: Math.max(0, totalAmount - initialPayment),
        installment_plan_json: JSON.stringify(plan),
        payment_status: paymentStatus,
        attendance_status: 'active',
        completion_status: 'in_progress',
        notes: data.notes || null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };

      await db.registrations.put(registration);

      if (initialPayment > 0) {
        const firstInstallment = plan.find((p) => p.number === 1);

        const payment: Payment = {
          id: uuid(),
          student_id: data.student_id,
          registration_id: registration.id,
          class_id: data.class_id,
          course_id: data.course_id,
          amount: initialPayment,
          installment_number: firstInstallment?.number || 1,
          installment_title: firstInstallment?.title || 'قسط اول',
          due_date: firstInstallment?.due_date || null,
          payment_date: now,
          payment_date_jalali: data.registration_date_jalali || '',
          status: 'paid',
          method: data.initial_payment_method || 'cash',
          receipt_url: null,
          description: 'پرداخت هنگام ثبت‌نام',
          recorded_by: 'admin',
          created_at: now,
          updated_at: now,
          deleted_at: null,
        };

        await db.payments.put(payment);

        // همگام‌سازی با دفتر تراکنش‌های مالی (پرداخت اولیه هنگام ثبت‌نام)
        await createIncomeTransactionForPayment(payment, { category: 'tuition' });
      }

      if (cls.capacity > 0 && existingRegs + 1 >= cls.capacity) {
        await db.classes.update(data.class_id, {
          status: 'full',
          updated_at: now
        } as any);
      }

      await this.logAudit(
        'registration_created',
        'registration',
        registration.id,
        'ثبت‌نام جدید همراه با مدیریت مالی'
      );

      const student = await db.students.get(data.student_id);

      if (student) {
        await this.notify(
          'ثبت‌نام جدید',
          `${student.first_name} ${student.last_name} در کلاس ثبت‌نام شد`,
          'success',
          'class'
        );
      }

      return { success: true, data: registration };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }


  private async logAudit(action: string, entityType: string, entityId: string, details: string) {
    await db.auditLogs.put({ id: uuid(), user_id: 'system', action, entity_type: entityType, entity_id: entityId, details_json: JSON.stringify({ details }), ip_address: null, created_at: new Date().toISOString() });
  }
}

// ================================================================
// ATTENDANCE SERVICE
// ================================================================
export class AttendanceService extends BaseService<Attendance> {
  constructor() { super(db.attendance, 'attendance'); }

  async recordAttendance(data: { session_id: string; student_id: string; registration_id: string; class_id: string; date: string; status: Attendance['status']; late_minutes?: number; notes?: string; recorded_by: string }): Promise<{ success: boolean; data?: Attendance; error?: string }> {
    try {
      const existing = await db.attendance.where('session_id').equals(data.session_id).and((a: any) => a.student_id === data.student_id).first();
      if (existing) return { success: false, error: 'حضور قبلاً ثبت شده است' };
      const now = new Date().toISOString();
      const record: Attendance = { id: uuid(), ...data, late_minutes: data.late_minutes || 0, notes: data.notes || null, created_at: now, updated_at: now };
      await db.attendance.put(record);
      return { success: true, data: record };
    } catch (err: any) { return { success: false, error: err.message }; }
  }

  async getAttendanceForClass(classId: string): Promise<Array<{ attendance: Attendance; studentName: string }>> {
    const records = await db.attendance.where('class_id').equals(classId).toArray();
    return Promise.all(records.map(async (a) => ({ attendance: a, studentName: await resolveStudentName(a.student_id) })));
  }

  async getAttendanceForSession(sessionId: string): Promise<Array<{ attendance: Attendance; studentName: string }>> {
    const records = await db.attendance.where('session_id').equals(sessionId).toArray();
    return Promise.all(records.map(async (a) => ({ attendance: a, studentName: await resolveStudentName(a.student_id) })));
  }
}

// ================================================================
// PAYMENT SERVICE
// ================================================================
export class PaymentService extends BaseService<Payment> {
  constructor() { super(db.payments, 'payments'); }

  async recordPayment(data: {
    student_id: string;
    registration_id: string;
    class_id?: string;
    course_id?: string;
    amount: number;
    installment_number?: number;
    installment_title?: string;
    due_date?: string;
    payment_date_jalali?: string;
    status?: Payment['status'];
    method?: Payment['method'];
    description?: string;
    recorded_by: string;
  }): Promise<{ success: boolean; data?: Payment; error?: string }> {
    try {
      const reg = await db.registrations.get(data.registration_id);

      if (!reg) {
        return { success: false, error: 'ثبت‌نام مربوط به این پرداخت یافت نشد' };
      }

      const now = new Date().toISOString();
      const amount = Math.max(0, Number(data.amount || 0));

      if (amount <= 0) {
        return { success: false, error: 'مبلغ پرداخت باید بیشتر از صفر باشد' };
      }

      let expectedTotal =
        Number(reg.total_amount ?? (reg.tuition_fee + reg.registration_fee - reg.discount));

      // اگر شهریه/بدهی کل تعیین نشده بود (۰)، آن را از دوره‌ی مرتبط بخوانیم.
      if (expectedTotal <= 0 && (reg.class_id || reg.course_id)) {
        const courseId = reg.course_id || (reg.class_id ? (await db.classes.get(reg.class_id))?.course_id : undefined);
        if (courseId) {
          const course = await db.courses.get(courseId);
          if (course && Number(course.tuition_fee || 0) > 0) {
            expectedTotal = Number(course.tuition_fee);
          }
        }
      }

      const currentPayments = await db.payments
        .where('registration_id')
        .equals(data.registration_id)
        .filter((p: any) => !p.deleted_at && p.status !== 'cancelled')
        .toArray();

      const currentPaid = currentPayments.reduce(
        (sum: number, p: any) => sum + Number(p.amount || 0),
        0
      );

      if (currentPaid + amount > expectedTotal) {
        return {
          success: false,
          error: `مبلغ پرداختی بیشتر از مانده بدهی است. مانده فعلی: ${(expectedTotal - currentPaid).toLocaleString('fa-IR')} تومان`
        };
      }

      // اگر شهریه کل هنوز در ثبت‌نام ذخیره نشده بود ولی از دوره خوانده شد، آن را ذخیره کن
      // تا وضعیت پرداخت (در انتظار → پرداخت شده) به‌درستی محاسبه شود.
      if (expectedTotal > 0 && Number(reg.total_amount || 0) <= 0) {
        await db.registrations.update(reg.id, { total_amount: expectedTotal } as any);
      }

      const payment: Payment = {
        id: uuid(),
        student_id: data.student_id,
        registration_id: data.registration_id,
        class_id: data.class_id || reg.class_id || null,
        course_id: data.course_id || reg.course_id || null,
        amount,
        installment_number: data.installment_number,
        installment_title: data.installment_title || null,
        due_date: data.due_date || null,
        payment_date: now,
        payment_date_jalali: data.payment_date_jalali || '',
        status: data.status || 'paid',
        method: data.method || 'cash',
        receipt_url: null,
        description: data.description || null,
        recorded_by: data.recorded_by,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };

      await db.payments.put(payment);

      // محاسبه مجدد کامل وضعیت مالی ثبت‌نام (تک‌منبع حقیقت)
      const figures = await persistRegistrationFigures(data.registration_id);

      // همگام‌سازی با دفتر تراکنش‌های مالی
      await createIncomeTransactionForPayment(payment, { category: 'tuition' });

      return { success: true, data: payment };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }


  async getPaymentsResolved(options: { page?: number; perPage?: number; sortBy?: string; sortDirection?: 'asc' | 'desc'; search?: string; status?: string; classId?: string } = {}): Promise<{ data: Array<{ payment: Payment; studentName: string; className: string }>; total: number }> {
    const { page = 1, perPage = 20, sortBy = 'payment_date', sortDirection = 'desc', search, status, classId } = options;
    let all = await db.payments.filter((p: any) => !p.deleted_at).toArray();
    if (search) { const q = search.toLowerCase(); all = all.filter((p: any) => p.amount?.toString().includes(q) || p.description?.toLowerCase().includes(q)); }
    if (status) all = all.filter((p: any) => p.status === status);
    if (classId) all = all.filter((p: any) => p.class_id === classId);
    all.sort((a: any, b: any) => { const av = a[sortBy]; const bv = b[sortBy]; if (av == null && bv == null) return 0; if (av == null) return 1; if (bv == null) return -1; const cmp = av < bv ? -1 : av > bv ? 1 : 0; return sortDirection === 'asc' ? cmp : -cmp; });
    const total = all.length;
    const start = (page - 1) * perPage;
    const slice = all.slice(start, start + perPage);
    const data = await Promise.all(slice.map(async (p) => ({ payment: p, studentName: await resolveStudentName(p.student_id), className: p.class_id ? await resolveClassName(p.class_id) : '--' })));
    return { data, total };
  }

  async getPaymentsByStudent(studentId: string): Promise<Payment[]> {
    return db.payments.where('student_id').equals(studentId).filter((p: any) => !p.deleted_at).toArray();
  }

  /**
   * حذف امن یک پرداخت:
   *   1) حذف نرم پرداخت
   *   2) حذف تراکنش مالی مرتبط
   *   3) محاسبه مجدد وضعیت مالی ثبت‌نام
   */
  async deletePayment(paymentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const payment = await db.payments.get(paymentId);
      if (!payment) return { success: false, error: 'پرداخت یافت نشد' };

      const registrationId = payment.registration_id;

      // حذف نرم پرداخت
      await db.payments.put({
        ...payment,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Payment);

      // حذف تراکنش مالی مرتبط
      await removeTransactionForPayment(paymentId);

      // محاسبه مجدد وضعیت مالی ثبت‌نام
      if (registrationId) {
        await persistRegistrationFigures(registrationId);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * ویرایش پرداخت با همگام‌سازی تراکنش مالی.
   */
  async updatePayment(paymentId: string, data: Partial<Payment>): Promise<{ success: boolean; data?: Payment; error?: string }> {
    try {
      const existing = await db.payments.get(paymentId);
      if (!existing) return { success: false, error: 'پرداخت یافت نشد' };

      const updated = { ...existing, ...data, id: paymentId, updated_at: new Date().toISOString() } as Payment;
      await db.payments.put(updated);

      // همگام‌سازی تراکنش مالی
      await syncTransactionForPayment(updated);

      // محاسبه مجدد وضعیت مالی ثبت‌نام
      if (updated.registration_id) {
        await persistRegistrationFigures(updated.registration_id);
      }

      return { success: true, data: updated };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * تنظیم صریح شهریه/بدهی کل یک ثبت‌نام.
   * این مقدار مستقیماً در total_amount ذخیره می‌شود و برنامه اقساط
   * در صورت تک‌قسطی بودن، به‌روزرسانی می‌گردد. برای ثبت‌نام‌هایی که
   * در زمان ثبت‌نام شهریه‌ای تعیین نشده بود (شهریه ۰) کاربرد دارد.
   */
  async setRegistrationTotal(
    registrationId: string,
    total: number
  ): Promise<{ success: boolean; data?: Registration; error?: string }> {
    try {
      const reg = await db.registrations.get(registrationId);
      if (!reg) return { success: false, error: 'ثبت‌نام یافت نشد' };

      const newTotal = Math.max(0, Number(total || 0));

      let installments = reg.installments || 1;
      let planJson = reg.installment_plan_json;
      try {
        const plan = planJson ? JSON.parse(planJson) : [];
        const hasExplicitPlan = Array.isArray(plan) && plan.length > 0 && plan.some((p: any) => p.title && !/قسط کامل|قسط اول|قسط دوم/.test(p.title || ''));
        if (!hasExplicitPlan) {
          let newPlan: Array<{ number: number; amount: number; due_date?: string; title: string }> = [];
          if (installments === 2) {
            const first = Math.floor(newTotal / 2);
            newPlan = [
              { number: 1, amount: first, due_date: new Date().toISOString().split('T')[0], title: 'قسط اول' },
              { number: 2, amount: newTotal - first, due_date: '', title: 'قسط دوم' },
            ];
          } else {
            newPlan = [{ number: 1, amount: newTotal, due_date: new Date().toISOString().split('T')[0], title: 'قسط کامل' }];
          }
          planJson = JSON.stringify(newPlan);
        }
      } catch {
        planJson = JSON.stringify([{ number: 1, amount: newTotal, due_date: new Date().toISOString().split('T')[0], title: 'قسط کامل' }]);
      }

      await db.registrations.update(registrationId, {
        total_amount: newTotal,
        tuition_fee: newTotal,
        registration_fee: 0,
        discount: 0,
        installment_plan_json: planJson,
        updated_at: new Date().toISOString(),
      } as any);

      await persistRegistrationFigures(registrationId);
      const updated = await db.registrations.get(registrationId);

      return { success: true, data: updated || undefined };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

// ================================================================
// QUIZ SERVICE
// ================================================================
export class QuizService extends BaseService<Quiz> {
  constructor() { super(db.quizzes, 'quizzes'); }
}

// ================================================================
// ANNOUNCEMENT SERVICE
// ================================================================
export class AnnouncementService extends BaseService<Announcement> {
  constructor() { super(db.announcements, 'announcements'); }
  async getActive(): Promise<Announcement[]> {
    const now = new Date().toISOString();
    return db.announcements.filter((a: any) => !a.deleted_at && (!a.expires_at || a.expires_at > now)).toArray();
  }
}

// ================================================================
// NOTIFICATION SERVICE
// ================================================================
export class NotificationService {
  async send(userId: string, title: string, message: string, type: Notification['type'] = 'info', category: Notification['category'] = 'system', link?: string) {
    await db.notifications.put({ id: uuid(), user_id: userId, title, message, type, category, is_read: false, link: link || null, created_at: new Date().toISOString() });
  }
  async getUnreadCount(userId: string): Promise<number> {
    return db.notifications.where('user_id').equals(userId).and((n: any) => !n.is_read).count();
  }
  async getForUser(userId: string): Promise<Notification[]> {
    return db.notifications.where('user_id').equals(userId).reverse().sortBy('created_at');
  }
  async markRead(id: string): Promise<void> { await db.notifications.update(id, { is_read: true }); }
  async markAllRead(userId: string): Promise<void> {
    const unread = await db.notifications.where('user_id').equals(userId).and((n: any) => !n.is_read).toArray();
    for (const n of unread) await db.notifications.update(n.id, { is_read: true });
  }
}

// ================================================================
// DASHBOARD SERVICE
// ================================================================
export class DashboardService {

  private dateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private monthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  async getStats() {
    const [students, classes, teachers, payments] = await Promise.all([
      db.students.filter((s: any) => !s.deleted_at).toArray(),
      db.classes.filter((c: any) => !c.deleted_at).toArray(),
      db.teachers.filter((t: any) => !t.deleted_at).toArray(),
      db.financeTransactions.filter((p: any) => !p.deleted_at && p.type === 'income').toArray(),
    ]);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const previous = new Date(currentYear, currentMonth - 1, 1);

    const isMonth = (value: any, month: number, year: number) => {
      const d = new Date(value);
      return d.getMonth() === month && d.getFullYear() === year;
    };

    const activeClasses = classes.filter((c: any) =>
      ['active', 'registration_open', 'full'].includes(c.status)
    ).length;

    const monthlyRevenue = payments
      .filter((p: any) =>
        isMonth(p.transaction_date, currentMonth, currentYear)
      )
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

    const previousRevenue = payments
      .filter((p: any) =>
        isMonth(p.transaction_date, previous.getMonth(), previous.getFullYear())
      )
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

    const growth = (current: number, old: number) =>
      old === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - old) / old) * 100);

    const studentsThisMonth = students.filter((s: any) =>
      isMonth(s.created_at, currentMonth, currentYear)
    ).length;

    const studentsPreviousMonth = students.filter((s: any) =>
      isMonth(s.created_at, previous.getMonth(), previous.getFullYear())
    ).length;

    const classesThisMonth = classes.filter((c: any) =>
      ['active', 'registration_open', 'full'].includes(c.status) &&
      isMonth(c.created_at, currentMonth, currentYear)
    ).length;

    const classesPreviousMonth = classes.filter((c: any) =>
      ['active', 'registration_open', 'full'].includes(c.status) &&
      isMonth(c.created_at, previous.getMonth(), previous.getFullYear())
    ).length;

    // تعداد بدهکاران = ثبت‌نام‌های با مانده بدهی مثبت
    const regs = await db.registrations.filter((r: any) => !r.deleted_at).toArray();
    let overdueCount = 0;
    for (const reg of regs) {
      const total = registrationTotal(reg);
      const paid = await paidAmountForRegistration(reg.id);
      if (paid < total) overdueCount++;
    }

    return {
      totalStudents: students.length,
      activeClasses,
      monthlyRevenue,
      totalTeachers: teachers.length,
      overdueCount,
      studentGrowth: growth(studentsThisMonth, studentsPreviousMonth),
      classGrowth: growth(classesThisMonth, classesPreviousMonth),
      revenueGrowth: growth(monthlyRevenue, previousRevenue),
      teacherGrowth: 0,
    };
  }

  async getTodayClasses() {
    const today = this.dateKey(new Date());

    const sessions = await db.sessions
      .where('date')
      .equals(today)
      .toArray();

    const results = [];

    for (const session of sessions) {
      const result = await classService.getClassWithDetails(session.class_id);

      if (result) {
        results.push({
          ...result,
          session,
        });
      }
    }

    return results;
  }

  async getLatestTeachers(limit: number = 5) {
    return db.teachers
      .filter((t: any) => !t.deleted_at)
      .reverse()
      .sortBy('created_at')
      .then((arr: any) => arr.slice(0, limit));
  }

  async getFinancialSummary() {
    const transactions = await db.financeTransactions
      .filter((t: any) => !t.deleted_at)
      .toArray();

    const incomes = transactions.filter((t: any) => t.type === 'income');
    const expenses = transactions.filter((t: any) => t.type === 'expense');

    const total = incomes.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    const expenseTotal = expenses.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

    return {
      total,
      expense: expenseTotal,
      profit: total - expenseTotal,
      average: incomes.length ? total / incomes.length : 0,
      count: transactions.length,
    };
  }

  async getRevenueChartData(
    mode: number | 'six_months' | 'weekly' | 'monthly' | 'yearly' = 'six_months'
  ) {
    const payments = await db.financeTransactions
      .filter((p: any) => !p.deleted_at && p.type === 'income')
      .toArray();

    const now = new Date();

    const dayAmount = (date: Date) => {
      const key = this.dateKey(date);

      return payments
        .filter((p: any) => this.dateKey(new Date(p.transaction_date)) === key)
        .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    };

    const monthAmount = (date: Date) => {
      const key = this.monthKey(date);

      return payments
        .filter((p: any) => this.monthKey(new Date(p.transaction_date)) === key)
        .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    };

    const result: Array<{ name: string; value: number }> = [];

    if (typeof mode === 'number' || mode === 'six_months') {
      const count = typeof mode === 'number' ? mode : 6;

      for (let i = count - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);

        result.push({
          name: d.toLocaleDateString('fa-IR-u-ca-persian', {
            month: 'short',
          }),
          value: monthAmount(d),
        });
      }

      return result;
    }

    if (mode === 'weekly') {
      const start = new Date(now);
      const daysSinceSaturday = (now.getDay() + 1) % 7;
      start.setDate(now.getDate() - daysSinceSaturday);

      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);

        result.push({
          name: d.toLocaleDateString('fa-IR-u-ca-persian', {
            weekday: 'short',
          }),
          value: dayAmount(d),
        });
      }

      return result;
    }

    if (mode === 'monthly') {
      const days = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      ).getDate();

      for (let i = 1; i <= days; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), i);

        result.push({
          name: d.toLocaleDateString('fa-IR-u-ca-persian', {
            day: 'numeric',
          }),
          value: dayAmount(d),
        });
      }

      return result;
    }

    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), i, 1);

      result.push({
        name: d.toLocaleDateString('fa-IR-u-ca-persian', {
          month: 'short',
        }),
        value: monthAmount(d),
      });
    }

    return result;
  }

  async getStudentDistribution() {
    const classes = await db.classes
      .filter((c: any) =>
        !c.deleted_at &&
        ['active', 'registration_open', 'full'].includes(c.status)
      )
      .toArray();

    const colors = [
      '#6366f1', '#8b5cf6', '#06b6d4', '#22c55e',
      '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'
    ];

    const result = [];

    for (let i = 0; i < classes.length; i++) {
      const c: any = classes[i];

      const count = await db.registrations
        .where('class_id')
        .equals(c.id)
        .filter((r: any) => !r.deleted_at)
        .count();

      const course = await db.courses.get(c.course_id);

      result.push({
        name: course ? `${course.title} - ${c.code}` : c.code,
        value: count,
        color: colors[i % colors.length],
      });
    }

    return result.filter((x) => x.value > 0);
  }
}
// ================================================================
// AUTH SERVICE
// ================================================================
export class AuthService {
  async login(username: string, password: string): Promise<{ success: boolean; user?: User; permissions?: string[]; error?: string }> {
    const user = await db.users.where('username').equals(username).first();
    if (!user) return { success: false, error: 'نام کاربری یا رمز عبور اشتباه است' };
    const encoder = new TextEncoder(); const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    if (user.password_hash !== passwordHash) return { success: false, error: 'نام کاربری یا رمز عبور اشتباه است' };
    if (!user.is_active) return { success: false, error: 'حساب کاربری غیرفعال است' };
    const role = await db.roles.get(user.role_id);
    const permissions = role?.permissions || [];
    await db.users.update(user.id, { last_login_at: new Date().toISOString() });
    return { success: true, user, permissions };
  }
}

// ================================================================
// SETTINGS SERVICE
// ================================================================
export class SettingsService {
  async get(): Promise<AcademySettings | undefined> { return db.academySettings.get('settings-default'); }
  async update(data: Partial<AcademySettings>): Promise<void> {
    const existing = await db.academySettings.get('settings-default');
    if (existing) await db.academySettings.put({ ...existing, ...data, updated_at: new Date().toISOString() });
  }
}

// ================================================================
// USER MANAGEMENT SERVICE
// ================================================================
export class UserManagementService extends BaseService<User> {
  constructor() { super(db.users, 'users'); }
  async createUser(data: { username: string; password: string; display_name: string; email: string; phone: string; role_id: string }): Promise<{ success: boolean; error?: string }> {
    const existing = await db.users.where('username').equals(data.username).first();
    if (existing) return { success: false, error: 'این نام کاربری قبلاً ثبت شده است' };
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data.password));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const now = new Date().toISOString();
    await db.users.put({
      id: uuid(), username: data.username, password_hash: passwordHash,
      display_name: data.display_name, email: data.email, phone: data.phone,
      avatar_url: null, role_id: data.role_id, is_active: true,
      last_login_at: null, created_at: now, updated_at: now, deleted_at: null,
    });
    return { success: true };
  }
}

// Singletons
export const studentService = new StudentService();
export const teacherService = new TeacherService();
export const courseService = new CourseService();
export const classService = new ClassService();
export const registrationService = new RegistrationService();
export const attendanceService = new AttendanceService();
export const paymentService = new PaymentService();
export const quizService = new QuizService();
export const announcementService = new AnnouncementService();
export const notificationService = new NotificationService();
export const dashboardService = new DashboardService();
export const authService = new AuthService();
export const settingsService = new SettingsService();
export const userManagementService = new UserManagementService();

/* =========================================================
 * Rumiland Academy — Finance Service
 * ========================================================= */

/* =========================================================
 * Rumiland Academy — Finance Service (نسخه کامل)
 * ========================================================= */

const FINANCE_CATEGORY_LABELS: Record<string, string> = {
  tuition: 'شهریه',
  registration: 'هزینه ثبت‌نام',
  salary: 'حقوق مدرس',
  rent: 'اجاره',
  utilities: 'قبوض',
  internet: 'اینترنت',
  advertising: 'تبلیغات',
  software: 'نرم‌افزار',
  equipment: 'تجهیزات',
  maintenance: 'تعمیرات',
  transport: 'حمل‌ونقل',
  other: 'سایر',
};

export function financeCategoryLabel(cat: string): string {
  return FINANCE_CATEGORY_LABELS[cat] || cat;
}

export const FINANCE_EXPENSE_CATEGORIES = [
  'salary',
  'rent',
  'internet',
  'advertising',
  'software',
  'equipment',
  'maintenance',
  'transport',
  'other',
] as const;

export const FINANCE_INCOME_CATEGORIES = [
  'tuition',
  'registration',
  'other',
] as const;

export const financeService = {
  async getTransactions() {
    return db.financeTransactions
      .filter((item) => !item.deleted_at)
      .reverse()
      .sortBy('transaction_date');
  },

  async getTransaction(id: string) {
    return db.financeTransactions.get(id);
  },

  /**
   * ثبت تراکنش مالی مستقل (درآمد یا هزینه).
   * این برای تراکنش‌هایی است که به پرداخت/ثبت‌نام وابسته نیستند،
   * مثل هزینه اجاره، حقوق، یا درآمد متفرقه.
   */
  async createTransaction(data: {
    type: FinanceTransaction['type'];
    category: FinanceCategory | string;
    title: string;
    amount: number;
    transaction_date?: string;
    transaction_date_jalali?: string | null;
    method?: FinanceTransaction['method'];
    student_id?: string | null;
    registration_id?: string | null;
    payment_id?: string | null;
    description?: string | null;
  }) {
    const now = new Date().toISOString();

    const transaction: FinanceTransaction = {
      id: uuid(),
      type: data.type,
      category: data.category,
      title: data.title,
      amount: Number(data.amount || 0),
      transaction_date: data.transaction_date || now,
      transaction_date_jalali: data.transaction_date_jalali || null,
      method: data.method || 'cash',
      student_id: data.student_id || null,
      registration_id: data.registration_id || null,
      payment_id: data.payment_id || null,
      description: data.description || null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    await db.financeTransactions.put(transaction);
    return transaction;
  },

  async updateTransaction(id: string, data: Partial<FinanceTransaction>) {
    const existing = await db.financeTransactions.get(id);
    if (!existing) throw new Error('تراکنش مالی پیدا نشد');
    const updated = { ...existing, ...data, id, updated_at: new Date().toISOString() };
    await db.financeTransactions.put(updated);
    return updated;
  },

  async deleteTransaction(id: string) {
    const existing = await db.financeTransactions.get(id);
    if (!existing) return;
    await db.financeTransactions.put({
      ...existing,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as FinanceTransaction);
  },

  // ------------------------------------------------------------
  // RECURRING EXPENSES
  // ------------------------------------------------------------
  async getRecurringExpenses() {
    return db.recurringExpenses.filter((item) => !item.deleted_at).toArray();
  },
  async createRecurringExpense(data: Omit<RecurringExpense, 'id' | 'created_at' | 'updated_at'>) {
    const now = new Date().toISOString();
    const expense: RecurringExpense = { ...data, id: uuid(), created_at: now, updated_at: now };
    await db.recurringExpenses.add(expense);
    return expense;
  },
  async updateRecurringExpense(id: string, data: Partial<RecurringExpense>) {
    const existing = await db.recurringExpenses.get(id);
    if (!existing) throw new Error('هزینه ثابت پیدا نشد');
    const updated = { ...existing, ...data, id, updated_at: new Date().toISOString() };
    await db.recurringExpenses.put(updated);
    return updated;
  },
  async deleteRecurringExpense(id: string) {
    const existing = await db.recurringExpenses.get(id);
    if (!existing) return;
    await db.recurringExpenses.put({
      ...existing,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as RecurringExpense);
  },

  // ------------------------------------------------------------
  // SUMMARY & DASHBOARD (داشبورد مالی)
  // ------------------------------------------------------------
  async getSummary() {
    const transactions = await db.financeTransactions
      .filter((t) => !t.deleted_at)
      .toArray();

    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const expense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    return {
      income,
      expense,
      profit: income - expense,
      transactionCount: transactions.length,
    };
  },

  /**
   * داشبورد مالی کامل — تمام شاخص‌های موردنیاز MASTER PLAN.
   */
  async getFinancialDashboard() {
    const now = new Date();
    const todayKey = now.toISOString().split('T')[0].slice(0, 10);
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const yearKey = String(now.getFullYear());

    const transactions = await db.financeTransactions
      .filter((t) => !t.deleted_at)
      .toArray();

    const isDay = (d: string) => (d || '').slice(0, 10) === todayKey;
    const isMonth = (d: string) => (d || '').slice(0, 7) === monthKey;
    const isYear = (d: string) => (d || '').slice(0, 4) === yearKey;

    const incomes = transactions.filter((t) => t.type === 'income');
    const expenses = transactions.filter((t) => t.type === 'expense');

    const sum = (arr: FinanceTransaction[]) =>
      arr.reduce((s, t) => s + Number(t.amount || 0), 0);

    const totalIncome = sum(incomes);
    const totalExpense = sum(expenses);
    const incomeToday = sum(incomes.filter((t) => isDay(t.transaction_date)));
    const incomeThisMonth = sum(incomes.filter((t) => isMonth(t.transaction_date)));
    const incomeThisYear = sum(incomes.filter((t) => isYear(t.transaction_date)));
    const expenseThisMonth = sum(expenses.filter((t) => isMonth(t.transaction_date)));

    // بدهی دانش‌آموزان
    const registrations = await db.registrations
      .filter((r) => !r.deleted_at)
      .toArray();

    let totalDebt = 0;
    let debtorCount = 0;
    for (const reg of registrations) {
      const paid = await paidAmountForRegistration(reg.id);
      const total = await resolveRegistrationTotal(reg);
      const remaining = Math.max(0, total - paid);
      if (remaining > 0) {
        totalDebt += remaining;
        debtorCount++;
      }
    }

    // پرداخت‌های امروز
    const paymentsToday = await db.payments
      .filter((p) => !p.deleted_at && p.status === 'paid' && isDay(p.payment_date))
      .count();

    // اقساط سررسیدشده و نزدیک به سررسید
    const today = todayKey;
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);
    const nextWeekKey = nextWeek.toISOString().split('T')[0];

    let overdueInstallments = 0;
    let upcomingInstallments = 0;

    for (const reg of registrations) {
      const plan = parseInstallmentPlan(reg);
      for (const item of plan) {
        if (!item.due_date) continue;
        // قسطی که هنوز تسویه نشده
        const paidForInstallment = await db.payments
          .where('registration_id')
          .equals(reg.id)
          .filter(
            (p) =>
              !p.deleted_at &&
              p.status === 'paid' &&
              Number(p.installment_number) === Number(item.number)
          )
          .toArray();
        const installmentPaid = paidForInstallment.reduce(
          (s, p) => s + Number(p.amount || 0),
          0
        );
        if (installmentPaid >= Number(item.amount)) continue;

        if (item.due_date < today) overdueInstallments++;
        else if (item.due_date <= nextWeekKey) upcomingInstallments++;
      }
    }

    return {
      totalIncome,
      incomeToday,
      incomeThisMonth,
      incomeThisYear,
      totalExpense,
      expenseThisMonth,
      netProfit: totalIncome - totalExpense,
      profitThisMonth: incomeThisMonth - expenseThisMonth,
      totalDebt,
      debtorCount,
      paymentsToday,
      overdueInstallments,
      upcomingInstallments,
    };
  },

  // ------------------------------------------------------------
  // DEBTORS (بدهکاران)
  // ------------------------------------------------------------
  async getDebtors() {
    const registrations = await db.registrations
      .filter((r) => !r.deleted_at)
      .toArray();

    const result: Array<{
      registration: Registration;
      studentName: string;
      courseTitle: string;
      className: string;
      total: number;
      paid: number;
      remaining: number;
      installmentCount: number;
      nextInstallment: { number: number; amount: number; due_date?: string; title?: string } | null;
    }> = [];

    for (const reg of registrations) {
      const paid = await paidAmountForRegistration(reg.id);
      const total = await resolveRegistrationTotal(reg);
      const remaining = Math.max(0, total - paid);
      if (remaining <= 0) continue; // فقط بدهکاران

      const plan = parseInstallmentPlan(reg);
      // قسط بعدی (نخستین قسط ناتمام)
      let nextInstallment: { number: number; amount: number; due_date?: string; title?: string } | null = null;
      for (const item of plan) {
        const paidForInstallment = await db.payments
          .where('registration_id')
          .equals(reg.id)
          .filter(
            (p) =>
              !p.deleted_at &&
              p.status === 'paid' &&
              Number(p.installment_number) === Number(item.number)
          )
          .toArray();
        const installmentPaid = paidForInstallment.reduce(
          (s, p) => s + Number(p.amount || 0),
          0
        );
        if (installmentPaid >= Number(item.amount)) continue;
        nextInstallment = item;
        break;
      }

      result.push({
        registration: reg,
        studentName: await resolveStudentName(reg.student_id),
        courseTitle: await resolveCourseTitle(reg.course_id),
        className: await resolveClassName(reg.class_id),
        total,
        paid,
        remaining,
        installmentCount: plan.length,
        nextInstallment,
      });
    }

    return result.sort((a, b) => b.remaining - a.remaining);
  },

  // ------------------------------------------------------------
  // REPORTS (گزارش‌های مالی)
  // ------------------------------------------------------------
  /**
   * گزارش مالی برای بازه زمانی مشخص.
   * period: 'today' | 'week' | 'month' | 'year' | {from,to}
   */
  async getReport(period: 'today' | 'week' | 'month' | 'year' | 'all' = 'month') {
    const transactions = await db.financeTransactions
      .filter((t) => !t.deleted_at)
      .toArray();

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - ((startOfDay.getDay() + 1) % 7));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    let start: Date | null = null;
    if (period === 'today') start = startOfDay;
    else if (period === 'week') start = startOfWeek;
    else if (period === 'month') start = startOfMonth;
    else if (period === 'year') start = startOfYear;
    else start = null;

    const filtered = start
      ? transactions.filter((t) => new Date(t.transaction_date) >= start)
      : transactions;

    const byType = (type: FinanceTransaction['type']) =>
      filtered.filter((t) => t.type === type);

    const byCategory = (type: FinanceTransaction['type']) => {
      const map: Record<string, number> = {};
      for (const t of byType(type)) {
        map[t.category] = (map[t.category] || 0) + Number(t.amount || 0);
      }
      return map;
    };

    const income = byType('income').reduce((s, t) => s + Number(t.amount || 0), 0);
    const expense = byType('expense').reduce((s, t) => s + Number(t.amount || 0), 0);

    return {
      period,
      income,
      expense,
      profit: income - expense,
      incomeCount: byType('income').length,
      expenseCount: byType('expense').length,
      incomeByCategory: byCategory('income'),
      expenseByCategory: byCategory('expense'),
      transactions: filtered,
    };
  },
};
